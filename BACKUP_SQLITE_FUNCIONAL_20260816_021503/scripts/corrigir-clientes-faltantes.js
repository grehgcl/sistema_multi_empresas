// scripts/corrigir-clientes-faltantes.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function corrigirClientesFaltantes(dbPath, nomeBanco) {
    return new Promise((resolve) => {
        console.log(`\n🔧 Corrigindo: ${nomeBanco}`);

        if (!fs.existsSync(dbPath)) {
            console.log(`   ⚠️ Banco não encontrado`);
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);

        // Verificar se a tabela agendamentos existe
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

            // Buscar IDs de clientes que estão nos agendamentos mas não existem
            db.all(`
                SELECT DISTINCT a.cliente_id 
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                WHERE a.cliente_id IS NOT NULL AND c.id IS NULL
            `, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Erro ao buscar clientes faltantes: ${err.message}`);
                    db.close();
                    resolve();
                    return;
                }

                if (rows.length === 0) {
                    console.log(`   ✅ Todos os clientes existem`);
                    db.close();
                    resolve();
                    return;
                }

                const ids = rows.map(r => r.cliente_id);
                console.log(`   📋 ${ids.length} clientes faltantes: ${ids.join(', ')}`);

                // Buscar o empresa_id
                db.get('SELECT empresa_id FROM agendamentos LIMIT 1', (err, empresaRow) => {
                    const empresaId = empresaRow?.empresa_id || 0;

                    // Criar os clientes faltantes
                    let count = 0;
                    ids.forEach(id => {
                        db.run(`
                            INSERT OR IGNORE INTO clientes (id, nome, telefone, empresa_id, created_at)
                            VALUES (?, ?, ?, ?, datetime('now'))
                        `, [id, `Cliente ${id}`, '', empresaId], function (err) {
                            if (err) {
                                console.error(`   ❌ Erro ao criar cliente ${id}: ${err.message}`);
                            } else {
                                count++;
                                console.log(`   ✅ Cliente ${id} criado`);
                            }
                        });
                    });

                    setTimeout(() => {
                        db.all('SELECT id, nome FROM clientes WHERE id IN (' + ids.join(',') + ')', (err, rows) => {
                            if (err) {
                                console.error(`   ❌ Erro: ${err.message}`);
                            } else {
                                console.log(`   ✅ ${rows.length} clientes criados com sucesso`);
                            }
                            db.close();
                            resolve();
                        });
                    }, 1000);
                });
            });
        });
    });
}

async function main() {
    console.log('============================================================');
    console.log('🔧 CORRIGINDO CLIENTES FALTANTES EM TODAS AS EMPRESAS');
    console.log('============================================================\n');

    const databaseDir = path.join(__dirname, '../database');
    if (!fs.existsSync(databaseDir)) {
        console.log('❌ Pasta database não encontrada');
        return;
    }

    const files = fs.readdirSync(databaseDir)
        .filter(f => f.startsWith('empresa_') && f.endsWith('.db'))
        .sort();

    console.log(`📋 ${files.length} bancos de empresa encontrados\n`);

    for (const file of files) {
        const dbPath = path.join(databaseDir, file);
        await corrigirClientesFaltantes(dbPath, file);
    }

    console.log('\n============================================================');
    console.log('✅ CORREÇÃO CONCLUÍDA!');
    console.log('============================================================');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);