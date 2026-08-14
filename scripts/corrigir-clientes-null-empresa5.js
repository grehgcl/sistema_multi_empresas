// scripts/corrigir-clientes-null-empresa5.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function corrigirClientesNull(dbPath, nomeBanco) {
    return new Promise((resolve) => {
        console.log(`\n🔧 Corrigindo: ${nomeBanco}`);

        if (!fs.existsSync(dbPath)) {
            console.log(`   ⚠️ Banco não encontrado: ${dbPath}`);
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);

        // 1. Verificar clientes com ID null
        db.all('SELECT rowid, * FROM clientes WHERE id IS NULL OR id = 0', (err, rows) => {
            if (err) {
                console.error(`   ❌ Erro ao verificar: ${err.message}`);
                db.close();
                resolve();
                return;
            }

            if (rows.length === 0) {
                console.log(`   ✅ Nenhum cliente com ID null`);
                db.close();
                resolve();
                return;
            }

            console.log(`   📋 ${rows.length} cliente(s) com ID null encontrado(s)`);

            // 2. Pegar o maior ID atual para começar a sequência
            db.get('SELECT MAX(id) as maxId FROM clientes', (err, result) => {
                let nextId = (result?.maxId || 0) + 1;
                console.log(`   📌 Próximo ID disponível: ${nextId}`);

                let atualizados = 0;
                let erros = 0;

                rows.forEach((r, index) => {
                    const novoId = nextId + index;

                    // 🔥 ATUALIZAR O CLIENTE COM O NOVO ID
                    db.run(`UPDATE clientes SET id = ? WHERE rowid = ?`, [novoId, r.rowid], function (err) {
                        if (err) {
                            console.error(`   ❌ Erro ao atualizar ${r.nome}: ${err.message}`);
                            erros++;
                        } else {
                            atualizados++;
                            console.log(`   ✅ ${r.nome} atualizado para ID ${novoId}`);

                            // 🔥 ATUALIZAR AGENDAMENTOS QUE REFERENCIAM ESTE CLIENTE
                            db.run(`UPDATE agendamentos SET cliente_id = ? WHERE cliente_id IS NULL AND rowid IN (SELECT rowid FROM agendamentos WHERE cliente_id IS NULL)`, [novoId], function (err) {
                                if (err) {
                                    console.error(`   ❌ Erro ao atualizar agendamentos para ${r.nome}: ${err.message}`);
                                } else {
                                    console.log(`   ✅ ${this.changes || 0} agendamentos atualizados para cliente ${novoId}`);
                                }
                            });
                        }
                    });
                });

                // 3. Verificar o resultado
                setTimeout(() => {
                    db.all('SELECT id, nome FROM clientes ORDER BY id', (err, rows) => {
                        if (err) {
                            console.error(`   ❌ Erro: ${err.message}`);
                        } else {
                            console.log(`   📋 Clientes atualizados:`);
                            rows.forEach(r => {
                                console.log(`      ID: ${r.id}, Nome: ${r.nome}`);
                            });
                        }

                        // 4. Verificar se ainda tem IDs null
                        db.get('SELECT COUNT(*) as total FROM clientes WHERE id IS NULL OR id = 0', (err, result) => {
                            if (err) {
                                console.error(`   ❌ Erro: ${err.message}`);
                            } else if (result.total > 0) {
                                console.log(`   ⚠️ Ainda existem ${result.total} clientes com ID null`);
                            } else {
                                console.log(`   ✅ Todos os clientes têm ID válido!`);
                            }
                            db.close();
                            resolve();
                        });
                    });
                }, 1000);
            });
        });
    });
}

async function main() {
    console.log('🚀 CORRIGINDO CLIENTES COM ID NULL...\n');

    const databaseDir = path.join(__dirname, '../database');
    const files = fs.readdirSync(databaseDir).filter(f => f.startsWith('empresa_') && f.endsWith('.db'));

    console.log(`📋 ${files.length} bancos de empresa encontrados\n`);

    for (const file of files) {
        const dbPath = path.join(databaseDir, file);
        await corrigirClientesNull(dbPath, file);
    }

    console.log('\n✅ CORREÇÃO CONCLUÍDA!');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);