// scripts/corrigir-clientes-null-empresa15.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function corrigirClientesNull(dbPath, nomeBanco) {
    return new Promise((resolve) => {
        console.log(`🔧 Corrigindo: ${nomeBanco}`);
        const db = new sqlite3.Database(dbPath);

        // Verificar clientes com ID null
        db.all('SELECT rowid, * FROM clientes WHERE id IS NULL OR id = 0', (err, rows) => {
            if (err) {
                console.error(`   ❌ Erro: ${err.message}`);
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

            let count = 0;
            rows.forEach(r => {
                count++;
                const novoId = 1000 + count;
                db.run(`UPDATE clientes SET id = ? WHERE rowid = ?`, [novoId, r.rowid], function (err) {
                    if (err) {
                        console.error(`   ❌ Erro ao atualizar ${r.nome}: ${err.message}`);
                    } else {
                        console.log(`   ✅ ${r.nome} atualizado para ID ${novoId}`);
                    }
                });
            });

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
                    db.close();
                    resolve();
                });
            }, 500);
        });
    });
}

async function main() {
    console.log('🚀 CORRIGINDO CLIENTES COM ID NULL...\n');

    const bancos = [
        { path: path.join(__dirname, '../database/empresa_15_barbearia-do-ze.db'), nome: 'empresa_15_barbearia-do-ze.db' },
        { path: path.join(__dirname, '../database/barbearia.db'), nome: 'barbearia.db' }
    ];

    for (const banco of bancos) {
        await corrigirClientesNull(banco.path, banco.nome);
        console.log('');
    }

    console.log('✅ CORREÇÃO CONCLUÍDA!');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);