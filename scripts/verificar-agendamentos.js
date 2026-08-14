// scripts/verificar-agendamentos.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function verificarAgendamentos(dbPath, nomeBanco) {
    return new Promise((resolve) => {
        console.log(`\n📂 Verificando: ${nomeBanco}`);

        if (!fs.existsSync(dbPath)) {
            console.log(`   ⚠️ Banco não encontrado`);
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);

        // 1. Verificar se a tabela agendamentos existe
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'", (err, tableExists) => {
            if (err) {
                console.error(`   ❌ Erro: ${err.message}`);
                db.close();
                resolve();
                return;
            }

            if (!tableExists) {
                console.log(`   ⚠️ Tabela agendamentos não existe`);
                db.close();
                resolve();
                return;
            }

            // 2. Contar agendamentos
            db.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
                if (err) {
                    console.error(`   ❌ Erro ao contar: ${err.message}`);
                    db.close();
                    resolve();
                    return;
                }

                const total = row.total || 0;
                console.log(`   📊 Total de agendamentos: ${total}`);

                if (total === 0) {
                    console.log(`   📭 Nenhum agendamento encontrado`);
                    db.close();
                    resolve();
                    return;
                }

                // 3. Listar os últimos 5 agendamentos
                db.all('SELECT id, cliente_id, data, hora, servico, status FROM agendamentos ORDER BY id DESC LIMIT 5', (err, rows) => {
                    if (err) {
                        console.error(`   ❌ Erro ao listar: ${err.message}`);
                        db.close();
                        resolve();
                        return;
                    }

                    console.log(`   📋 Últimos 5 agendamentos:`);
                    rows.forEach(r => {
                        const clienteId = r.cliente_id || 'N/A';
                        const data = r.data || 'N/A';
                        const hora = r.hora || 'N/A';
                        const servico = r.servico || 'N/A';
                        const status = r.status || 'N/A';
                        console.log(`      ID: ${r.id} | Cliente: ${clienteId} | ${data} ${hora} | ${servico} | ${status}`);
                    });

                    // 4. Verificar clientes relacionados
                    db.all('SELECT DISTINCT cliente_id FROM agendamentos', (err, clientes) => {
                        if (err) {
                            console.error(`   ❌ Erro ao buscar clientes: ${err.message}`);
                            db.close();
                            resolve();
                            return;
                        }

                        const ids = clientes.map(c => c.cliente_id).filter(id => id !== null);
                        console.log(`   👤 Clientes com agendamentos: ${ids.length}`);

                        if (ids.length > 0) {
                            // Verificar quantos desses clientes existem
                            const placeholders = ids.map(() => '?').join(',');
                            db.all(`SELECT id, nome FROM clientes WHERE id IN (${placeholders})`, ids, (err, clientesExistentes) => {
                                if (err) {
                                    console.error(`   ❌ Erro: ${err.message}`);
                                } else {
                                    const existentes = clientesExistentes.length;
                                    const faltantes = ids.length - existentes;
                                    console.log(`   ✅ ${existentes} clientes existem`);
                                    if (faltantes > 0) {
                                        console.log(`   ⚠️ ${faltantes} clientes NÃO existem (IDs: ${ids.filter(id => !clientesExistentes.some(c => c.id === id)).join(', ')})`);
                                    }
                                }
                                db.close();
                                resolve();
                            });
                        } else {
                            db.close();
                            resolve();
                        }
                    });
                });
            });
        });
    });
}

async function main() {
    console.log('============================================================');
    console.log('🔍 VERIFICANDO AGENDAMENTOS EM TODAS AS EMPRESAS');
    console.log('============================================================\n');

    const databaseDir = path.join(__dirname, '../database');
    if (!fs.existsSync(databaseDir)) {
        console.log('❌ Pasta database não encontrada');
        return;
    }

    // Buscar apenas bancos de empresa (empresa_*.db)
    const files = fs.readdirSync(databaseDir)
        .filter(f => f.startsWith('empresa_') && f.endsWith('.db'))
        .sort();

    if (files.length === 0) {
        console.log('⚠️ Nenhum banco de empresa encontrado');
        return;
    }

    console.log(`📋 ${files.length} bancos de empresa encontrados\n`);

    let totalAgendamentos = 0;
    let empresasComAgendamentos = 0;

    for (const file of files) {
        const dbPath = path.join(databaseDir, file);
        await verificarAgendamentos(dbPath, file);

        // Extrair ID da empresa do nome do arquivo
        const match = file.match(/empresa_(\d+)/);
        if (match) {
            // Contar agendamentos
            const db = new sqlite3.Database(dbPath);
            db.get('SELECT COUNT(*) as total FROM agendamentos', (err, row) => {
                if (!err && row && row.total > 0) {
                    totalAgendamentos += row.total;
                    empresasComAgendamentos++;
                }
                db.close();
            });
        }
    }

    // Aguardar um pouco para contar
    setTimeout(() => {
        console.log('\n============================================================');
        console.log('📊 RESUMO');
        console.log('============================================================');
        console.log(`📋 Total de bancos verificados: ${files.length}`);
        console.log(`📋 Empresas com agendamentos: ${empresasComAgendamentos}`);
        console.log(`📋 Total de agendamentos: ${totalAgendamentos}`);
        console.log('============================================================\n');
    }, 2000);
}

main().catch(console.error);