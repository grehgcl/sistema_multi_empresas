// migrar-vps-para-sqlite.js
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

console.log('========================================');
console.log('🔄 MIGRANDO VPS (POSTGRESQL) → SQLITE');
console.log('========================================\n');

// ============================================
// 1. CONECTAR AO POSTGRESQL DA VPS
// ============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://usuario:senha@163.176.218.131:5432/seeagende',
    ssl: false
});

// ============================================
// 2. FUNÇÕES AUXILIARES
// ============================================
function limparData(dataStr) {
    if (!dataStr) return null;
    try {
        if (dataStr instanceof Date) {
            return dataStr.toISOString().split('T')[0];
        }
        if (typeof dataStr === 'string' && dataStr.includes('GMT')) {
            const match = dataStr.match(/([A-Za-z]{3}\s+[A-Za-z]{3}\s+\d{1,2}\s+\d{4})/);
            if (match) {
                const dataObj = new Date(match[1]);
                return dataObj.toISOString().split('T')[0];
            }
        }
        if (typeof dataStr === 'string' && dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
            return dataStr.split('T')[0];
        }
        const dataObj = new Date(dataStr);
        if (!isNaN(dataObj)) {
            return dataObj.toISOString().split('T')[0];
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

function limparHora(horaStr) {
    if (!horaStr) return null;
    try {
        if (typeof horaStr === 'string' && horaStr.includes(':')) {
            const partes = horaStr.split(':');
            if (partes.length >= 2) {
                return `${partes[0]}:${partes[1]}`;
            }
        }
        return horaStr;
    } catch {
        return horaStr;
    }
}

function gerarNomeBanco(nomeEmpresa, empresaId) {
    let nome = nomeEmpresa
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    
    if (!nome || nome.length < 2) {
        nome = `empresa`;
    }
    return `${nome}_${empresaId}.db`;
}

// ============================================
// 3. BUSCAR EMPRESAS DO POSTGRESQL
// ============================================
console.log('📡 Buscando empresas do PostgreSQL...');

pool.query('SELECT id, nome FROM empresas ORDER BY id')
    .then(result => {
        const empresas = result.rows;
        console.log(`✅ ${empresas.length} empresas encontradas\n`);

        // Criar pasta database se não existir
        const dbDir = path.join(__dirname, 'database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // ============================================
        // 4. PROCESSAR CADA EMPRESA
        // ============================================
        let processadas = 0;

        for (const empresa of empresas) {
            const empresaId = empresa.id;
            const nomeEmpresa = empresa.nome;
            const nomeBanco = gerarNomeBanco(nomeEmpresa, empresaId);
            const dbPath = path.join(dbDir, nomeBanco);

            console.log(`📁 Processando: ${nomeEmpresa} (ID: ${empresaId})`);
            console.log(`   Banco: ${nomeBanco}`);

            // Criar banco SQLite
            const db = new sqlite3.Database(dbPath);

            // ============================================
            // 5. CRIAR TABELAS
            // ============================================
            db.serialize(() => {
                // Clientes
                db.run(`CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    telefone TEXT,
                    email TEXT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    bloqueado_chatbot INTEGER DEFAULT 0,
                    dias_bloqueio INTEGER DEFAULT 0,
                    grupos TEXT DEFAULT '[]',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                // Serviços
                db.run(`CREATE TABLE IF NOT EXISTS servicos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    descricao TEXT,
                    valor REAL DEFAULT 0,
                    duracao INTEGER DEFAULT 30,
                    ativo INTEGER DEFAULT 1,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                // Profissionais
                db.run(`CREATE TABLE IF NOT EXISTS profissionais (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    senha TEXT NOT NULL,
                    comissao_percent INTEGER DEFAULT 30,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    ativo INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    telefone TEXT
                )`);

                // Agendamentos
                db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER,
                    data TEXT,
                    hora TEXT,
                    servico_id INTEGER,
                    servico TEXT,
                    valor REAL DEFAULT 0,
                    duracao INTEGER DEFAULT 30,
                    status TEXT DEFAULT 'pendente',
                    comissao REAL DEFAULT 0,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    profissional_id INTEGER,
                    lembrete_enviado INTEGER DEFAULT 0,
                    valor_total REAL DEFAULT 0,
                    servicos_extras TEXT DEFAULT '[]',
                    valor_extras REAL DEFAULT 0,
                    forma_pagamento TEXT,
                    prazo_dias INTEGER,
                    data_vencimento TEXT,
                    descricao_pagamento TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                    FOREIGN KEY (servico_id) REFERENCES servicos(id),
                    FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
                )`);

                // Despesas
                db.run(`CREATE TABLE IF NOT EXISTS despesas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    descricao TEXT NOT NULL,
                    categoria TEXT,
                    valor REAL DEFAULT 0,
                    data TEXT,
                    data_vencimento TEXT,
                    pago INTEGER DEFAULT 0,
                    forma_pagamento TEXT,
                    observacao TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                // Horários
                db.run(`CREATE TABLE IF NOT EXISTS horarios_funcionamento (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    dia_semana INTEGER,
                    aberto INTEGER DEFAULT 1,
                    hora_inicio TEXT DEFAULT '08:00',
                    hora_fim TEXT DEFAULT '18:00',
                    almoco_inicio TEXT DEFAULT '12:00',
                    almoco_fim TEXT DEFAULT '13:00',
                    intervalo_minutos INTEGER DEFAULT 30
                )`);

                // Configurações
                db.run(`CREATE TABLE IF NOT EXISTS configuracoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chave TEXT UNIQUE,
                    valor TEXT,
                    payment_mode TEXT DEFAULT 'simulation',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                console.log('   ✅ Tabelas criadas');
            });

            // ============================================
            // 6. IMPORTAR DADOS DO POSTGRESQL
            // ============================================
            const tabelas = [
                { nome: 'clientes', colunas: 'id, nome, telefone, email, empresa_id, bloqueado_chatbot, dias_bloqueio, grupos, created_at' },
                { nome: 'servicos', colunas: 'id, nome, descricao, valor, duracao, ativo, empresa_id, created_at' },
                { nome: 'profissionais', colunas: 'id, nome, email, senha, comissao_percent, empresa_id, ativo, created_at, telefone' },
                { nome: 'agendamentos', colunas: 'id, cliente_id, data, hora, servico_id, servico, valor, duracao, status, comissao, empresa_id, profissional_id, lembrete_enviado, valor_total, servicos_extras, valor_extras, forma_pagamento, prazo_dias, data_vencimento, descricao_pagamento, created_at' },
                { nome: 'despesas', colunas: 'id, empresa_id, descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao, created_at' },
                { nome: 'horarios_funcionamento', colunas: 'id, empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos' }
            ];

            // Buscar dados do PostgreSQL
            for (const tabela of tabelas) {
                pool.query(`SELECT * FROM ${tabela.nome} WHERE empresa_id = $1 OR empresa_id IS NULL`, [empresaId])
                    .then(result => {
                        const rows = result.rows;
                        if (rows.length === 0) return;

                        console.log(`   📊 ${tabela.nome}: ${rows.length} registros`);

                        for (const row of rows) {
                            // Limpar data e hora para agendamentos
                            let dados = { ...row };
                            if (tabela.nome === 'agendamentos') {
                                dados.data = limparData(row.data);
                                dados.hora = limparHora(row.hora);
                            }

                            const placeholders = Object.keys(dados).map((_, i) => `?`).join(', ');
                            const colunas = Object.keys(dados).join(', ');
                            const valores = Object.values(dados);

                            db.run(
                                `INSERT OR IGNORE INTO ${tabela.nome} (${colunas}) VALUES (${placeholders})`,
                                valores,
                                (err) => {
                                    if (err) {
                                        console.error(`   ❌ Erro ao inserir ${tabela.nome}:`, err.message);
                                    }
                                }
                            );
                        }
                    })
                    .catch(err => {
                        console.error(`   ❌ Erro ao buscar ${tabela.nome}:`, err.message);
                    });
            }

            // Aguardar e fechar
            setTimeout(() => {
                db.close();
                processadas++;
                console.log(`   ✅ Banco ${nomeBanco} criado com sucesso!\n`);
                
                if (processadas === empresas.length) {
                    console.log('========================================');
                    console.log('✅ MIGRAÇÃO CONCLUÍDA!');
                    console.log(`   ${processadas} bancos criados`);
                    console.log('========================================');
                    pool.end();
                }
            }, 2000);
        }
    })
    .catch(err => {
        console.error('❌ Erro ao buscar empresas:', err);
        pool.end();
    });