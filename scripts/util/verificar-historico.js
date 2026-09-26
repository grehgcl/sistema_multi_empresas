// ============================================
// 🔍 SCRIPT DE INSPEÇÃO — Histórico do Cliente
// Uso: node verificar-historico.js [empresaId]
// Ex:  node verificar-historico.js 14
// ============================================

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Pega o empresaId do argumento ou usa 14 por padrão
const empresaId = process.argv[2] || '14';

// Tenta achar o arquivo do banco da empresa
const dbDir = path.join(__dirname, 'database');

let dbFile = null;
const fs = require('fs');

try {
    const files = fs.readdirSync(dbDir);
    // Procura arquivo que termina com _${empresaId}.db
    const match = files.find(f => f.endsWith(`_${empresaId}.db`));
    if (match) {
        dbFile = path.join(dbDir, match);
    } else {
        // Fallback: procura qualquer arquivo que contenha o ID
        const fallback = files.find(f => f.includes(`_${empresaId}`) && f.endsWith('.db'));
        if (fallback) dbFile = path.join(dbDir, fallback);
    }
} catch (e) {
    console.error('❌ Erro ao ler diretório database/:', e.message);
    process.exit(1);
}

if (!dbFile) {
    console.error(`❌ Nenhum banco encontrado para empresa ${empresaId} em ${dbDir}`);
    console.log('\n📋 Bancos disponíveis:');
    try {
        fs.readdirSync(dbDir).filter(f => f.endsWith('.db')).forEach(f => console.log('   -', f));
    } catch (e) {}
    process.exit(1);
}

console.log('🔍 ============================================');
console.log('🔍 INSPEÇÃO DO BANCO');
console.log('🔍 ============================================');
console.log('📁 Arquivo:', dbFile);
console.log('🏢 Empresa ID:', empresaId);
console.log('');

const db = new sqlite3.Database(dbFile);

// ============================================
// 1. Verificar estrutura da tabela
// ============================================
function inspecionarTabela() {
    return new Promise((resolve) => {
        console.log('📋 [1/4] Estrutura da tabela agendamentos...\n');
        
        db.all(`PRAGMA table_info(agendamentos)`, (err, cols) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                return resolve();
            }
            
            if (!cols || cols.length === 0) {
                console.log('   ⚠️ Tabela agendamentos NÃO EXISTE neste banco!');
                return resolve();
            }
            
            cols.forEach(c => {
                console.log(`   ${c.name.padEnd(30)} ${c.type.padEnd(15)} ${c.notnull ? 'NOT NULL' : ''}`);
            });
            console.log('');
            resolve();
        });
    });
}

// ============================================
// 2. Verificar status distintos
// ============================================
function verificarStatus() {
    return new Promise((resolve) => {
        console.log('📊 [2/4] Status distintos na tabela...\n');
        
        db.all(`SELECT status, COUNT(*) as total FROM agendamentos GROUP BY status ORDER BY total DESC`, (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                return resolve();
            }
            
            if (!rows || rows.length === 0) {
                console.log('   ⚠️ Nenhum agendamento na tabela!');
                return resolve();
            }
            
            rows.forEach(r => {
                console.log(`   ${String(r.status || '(vazio)').padEnd(20)} → ${r.total} agendamento(s)`);
            });
            console.log('');
            resolve();
        });
    });
}

// ============================================
// 3. Top 5 clientes com mais agendamentos
// ============================================
function topClientes() {
    return new Promise((resolve) => {
        console.log('👥 [3/4] Top 5 clientes com mais agendamentos...\n');
        
        db.all(
            `SELECT cliente_id, COUNT(*) as total FROM agendamentos GROUP BY cliente_id ORDER BY total DESC LIMIT 5`,
            (err, rows) => {
                if (err) {
                    console.error('❌ Erro:', err.message);
                    return resolve();
                }
                
                if (!rows || rows.length === 0) {
                    console.log('   ⚠️ Nenhum agendamento!');
                    return resolve();
                }
                
                rows.forEach(r => {
                    console.log(`   Cliente ID ${String(r.cliente_id).padEnd(6)} → ${r.total} agendamento(s)`);
                });
                console.log('');
                resolve();
            }
        );
    });
}

// ============================================
// 4. Testar a QUERY do histórico com o cliente top
// ============================================
function testarQueryHistorico() {
    return new Promise((resolve) => {
        console.log('🧪 [4/4] Testando a query do histórico...\n');
        
        db.get(
            `SELECT cliente_id, COUNT(*) as total 
             FROM agendamentos 
             WHERE status IN ('concluido', 'confirmado', 'concluído')
             GROUP BY cliente_id 
             ORDER BY total DESC 
             LIMIT 1`,
            (err, row) => {
                if (err) {
                    console.error('❌ Erro:', err.message);
                    return resolve();
                }
                
                if (!row) {
                    console.log('   ⚠️ Nenhum cliente com status concluido/confirmado!');
                    console.log('   💡 Dica: veja os status reais no passo 2 acima.\n');
                    return resolve();
                }
                
                const clienteId = row.cliente_id;
                console.log(`   ✅ Cliente com histórico: ID ${clienteId} (${row.total} agendamentos)\n`);
                
                // Rodar exatamente a mesma query da rota
                db.all(
                    `SELECT 
                        a.id,
                        a.data,
                        a.hora,
                        a.servico,
                        a.servico_id,
                        a.profissional_id,
                        a.valor,
                        a.status,
                        p.nome AS profissional_nome
                    FROM agendamentos a
                    LEFT JOIN profissionais p ON p.id = a.profissional_id
                    WHERE a.cliente_id = ?
                      AND a.status IN ('concluido', 'confirmado', 'concluído')
                      AND a.data IS NOT NULL
                    ORDER BY a.data DESC, a.hora DESC
                    LIMIT 5`,
                    [clienteId],
                    (err, rows) => {
                        if (err) {
                            console.error('❌ Erro na query:', err.message);
                            return resolve();
                        }
                        
                        console.log(`   📋 Histórico do cliente ${clienteId}:\n`);
                        if (!rows || rows.length === 0) {
                            console.log('   ⚠️ Query não retornou nada');
                        } else {
                            rows.forEach(r => {
                                console.log(`   📅 ${r.data} às ${r.hora}`);
                                console.log(`      ✂️ ${r.servico || '(sem nome)'} — R$ ${r.valor}`);
                                console.log(`      👨‍💼 ${r.profissional_nome || '(sem profissional)'}`);
                                console.log(`      📌 Status: ${r.status}`);
                                console.log('');
                            });
                        }
                        
                        // Mostrar o que a API retornaria
                        const sugestoes = {
                            ultimoAtendimento: rows[0] ? {
                                data: rows[0].data,
                                hora: rows[0].hora,
                                servico: rows[0].servico,
                                profissional: rows[0].profissional_nome
                            } : null
                        };
                        
                        console.log('   🎯 O que a API `/cliente/' + clienteId + '/historico?empresaId=' + empresaId + '` retornaria:');
                        console.log('   ' + JSON.stringify({
                            success: true,
                            total: rows.length,
                            sugestoes
                        }, null, 2).replace(/\n/g, '\n   '));
                        
                        resolve();
                    }
                );
            }
        );
    });
}

// ============================================
// EXECUTAR TUDO EM SEQUÊNCIA
// ============================================
(async () => {
    await inspecionarTabela();
    await verificarStatus();
    await topClientes();
    await testarQueryHistorico();
    
    console.log('\n✅ Inspeção concluída!');
    db.close();
})();