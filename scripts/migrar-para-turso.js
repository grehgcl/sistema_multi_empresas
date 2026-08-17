// scripts/migrar-para-turso.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');

console.log('Migrando dados do SQLite para Turso...');
console.log('');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Erro: Variaveis do Turso nao configuradas');
    process.exit(1);
}

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

const db = new sqlite3.Database('./database/barbearia.db');

// Estrutura MANUAL das tabelas (com TODAS as colunas)
const estruturaTabelas = {
    empresas: [
        'id INTEGER PRIMARY KEY', 'nome TEXT', 'plano TEXT', 'trial_expira TEXT',
        'created_at TEXT', 'limite_profissionais INTEGER', 'assinatura_ativa INTEGER',
        'assinatura_valida_ate TEXT', 'ultima_cobranca TEXT', 'agendamentos_mes INTEGER',
        'mes_referencia TEXT', 'dias_bloqueio_geral TEXT', 'telefone_dono TEXT',
        'endereco TEXT', 'whatsapp_instance TEXT', 'whatsapp_connected INTEGER',
        'whatsapp_number TEXT', 'whatsapp_connected_at TEXT', 'whatsapp_proprio_habilitado INTEGER'
    ],
    usuarios: [
        'id INTEGER PRIMARY KEY', 'nome TEXT', 'email TEXT', 'senha TEXT',
        'role TEXT', 'empresa_id INTEGER', 'ativo INTEGER', 'created_at TEXT',
        'telefone TEXT', 'profissional_id INTEGER'
    ],
    clientes: [
        'id INTEGER PRIMARY KEY', 'nome TEXT', 'telefone TEXT', 'email TEXT',
        'empresa_id INTEGER', 'bloqueado_chatbot INTEGER', 'created_at TEXT',
        'dias_bloqueio TEXT', 'grupos TEXT'
    ],
    servicos: [
        'id INTEGER PRIMARY KEY', 'nome TEXT', 'descricao TEXT', 'valor REAL',
        'duracao INTEGER', 'ativo INTEGER', 'empresa_id INTEGER', 'created_at TEXT'
    ],
    profissionais: [
        'id INTEGER PRIMARY KEY', 'nome TEXT', 'email TEXT', 'senha TEXT',
        'comissao_percent INTEGER', 'empresa_id INTEGER', 'ativo INTEGER',
        'created_at TEXT', 'telefone TEXT'
    ],
    agendamentos: [
        'id INTEGER PRIMARY KEY', 'cliente_id INTEGER', 'data TEXT', 'hora TEXT',
        'servico_id INTEGER', 'servico TEXT', 'valor REAL', 'duracao INTEGER',
        'status TEXT', 'comissao REAL', 'empresa_id INTEGER', 'profissional_id INTEGER',
        'lembrete_enviado INTEGER', 'valor_total REAL', 'servicos_extras TEXT',
        'valor_extras REAL', 'forma_pagamento TEXT', 'prazo_dias INTEGER',
        'data_vencimento TEXT', 'descricao_pagamento TEXT', 'created_at TEXT'
    ],
    despesas: [
        'id INTEGER PRIMARY KEY', 'empresa_id INTEGER', 'descricao TEXT',
        'categoria TEXT', 'valor REAL', 'data TEXT', 'data_vencimento TEXT',
        'pago INTEGER', 'forma_pagamento TEXT', 'observacao TEXT',
        'anexo TEXT', 'created_at TEXT', 'updated_at TEXT'
    ],
    horarios_funcionamento: [
        'id INTEGER PRIMARY KEY', 'empresa_id INTEGER', 'dia_semana INTEGER',
        'aberto INTEGER', 'hora_inicio TEXT', 'hora_fim TEXT',
        'almoco_inicio TEXT', 'almoco_fim TEXT', 'intervalo_minutos INTEGER',
        'created_at TEXT', 'updated_at TEXT'
    ],
    configuracoes: [
        'id INTEGER PRIMARY KEY', 'chave TEXT', 'valor TEXT',
        'created_at TEXT', 'updated_at TEXT'
    ],
    acessos: [
        'id INTEGER PRIMARY KEY', 'usuario_id INTEGER', 'empresa_id INTEGER',
        'data_acesso TEXT', 'ip TEXT', 'user_agent TEXT'
    ]
};

// Função para criar tabela
async function criarTabela(nomeTabela) {
    const colunas = estruturaTabelas[nomeTabela];
    if (!colunas) return false;
    const sql = 'CREATE TABLE IF NOT EXISTS ' + nomeTabela + ' (' + colunas.join(', ') + ')';
    try {
        await turso.execute(sql);
        console.log('   Tabela ' + nomeTabela + ' criada');
        return true;
    } catch (error) {
        console.log('   Erro ao criar ' + nomeTabela + ':', error.message);
        return false;
    }
}

// Função para migrar dados - tentando colunas uma por uma
async function migrarTabela(nomeTabela) {
    return new Promise((resolve) => {
        console.log('Migrando:', nomeTabela);
        
        db.all('SELECT * FROM ' + nomeTabela, [], async (err, rows) => {
            if (err) {
                console.log('   Tabela nao existe:', err.message);
                resolve();
                return;
            }
            
            if (rows.length === 0) {
                console.log('   Vazia');
                resolve();
                return;
            }
            
            console.log('   ' + rows.length + ' registros');
            
            const colunasNomes = estruturaTabelas[nomeTabela].map(c => c.split(' ')[0]);
            
            try {
                let count = 0;
                for (const row of rows) {
                    // Tentar inserir com todas as colunas
                    let colunasExistentes = [];
                    let valores = [];
                    
                    for (const col of colunasNomes) {
                        if (row[col] !== undefined && row[col] !== null) {
                            colunasExistentes.push(col);
                            valores.push(row[col]);
                        }
                    }
                    
                    if (colunasExistentes.length === 0) {
                        // Tentar com as que têm valor
                        for (const col of colunasNomes) {
                            if (row[col] !== undefined) {
                                colunasExistentes.push(col);
                                valores.push(row[col]);
                            }
                        }
                    }
                    
                    if (colunasExistentes.length === 0) {
                        continue;
                    }
                    
                    const placeholders = colunasExistentes.map(() => '?').join(', ');
                    let sql = 'INSERT OR REPLACE INTO ' + nomeTabela + ' (' + colunasExistentes.join(', ') + ') VALUES (' + placeholders + ')';
                    
                    try {
                        await turso.execute({ sql: sql, args: valores });
                        count++;
                    } catch (insertError) {
                        // Se falhar, tentar sem a coluna que deu erro
                        const errorMsg = insertError.message;
                        if (errorMsg.includes('has no column named')) {
                            // Extrair o nome da coluna que falta
                            const match = errorMsg.match(/has no column named (\w+)/);
                            if (match) {
                                const colunaFaltando = match[1];
                                // Remover essa coluna e tentar novamente
                                const index = colunasExistentes.indexOf(colunaFaltando);
                                if (index !== -1) {
                                    colunasExistentes.splice(index, 1);
                                    valores.splice(index, 1);
                                    if (colunasExistentes.length > 0) {
                                        const placeholders2 = colunasExistentes.map(() => '?').join(', ');
                                        const sql2 = 'INSERT OR REPLACE INTO ' + nomeTabela + ' (' + colunasExistentes.join(', ') + ') VALUES (' + placeholders2 + ')';
                                        try {
                                            await turso.execute({ sql: sql2, args: valores });
                                            count++;
                                        } catch (e2) {
                                            // Ignorar
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    if (count % 50 === 0 && count > 0) {
                        console.log('   ' + count + '/' + rows.length + ' ...');
                    }
                }
                
                console.log('   ' + count + ' registros migrados');
                resolve();
            } catch (error) {
                console.error('   Erro:', error.message);
                resolve();
            }
        });
    });
}

async function main() {
    console.log('Criando tabelas no Turso...');
    
    const tabelas = Object.keys(estruturaTabelas);
    for (const tabela of tabelas) {
        await criarTabela(tabela);
    }
    
    console.log('');
    console.log('Migrando dados...');
    for (const tabela of tabelas) {
        await migrarTabela(tabela);
    }
    
    console.log('');
    console.log('MIGRACAO CONCLUIDA!');
    db.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Erro:', err);
    db.close();
    process.exit(1);
});
