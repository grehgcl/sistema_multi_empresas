// scripts/corrigir-clientes-null.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

function corrigirClientes(dbPath, nomeBanco) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔧 Corrigindo: ${nomeBanco}`);
        const db = new sqlite3.Database(dbPath);

        // Verificar clientes com ID null
        db.all('SELECT * FROM clientes WHERE id IS NULL OR id = 0', (err, rows) => {
            if (err) {
                console.error(`   ❌ Erro:`, err.message);
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

            console.log(`   📋 ${rows.length} clientes com ID null encontrados`);

            // Corrigir: atribuir IDs sequenciais
            let count = 0;
            for (let row of rows) {
                // Buscar o próximo ID disponível
                db.get('SELECT MAX(id) as maxId FROM clientes', (err, result) => {
                    const nextId = (result?.maxId || 0) + 1 + count;
                    count++;

                    db.run(`UPDATE clientes SET id = ? WHERE rowid = ? AND id IS NULL`, [nextId, row.rowid], (err) => {
                        if (err) {
                            console.error(`   ❌ Erro ao corrigir ${row.nome}:`, err.message);
                        } else {
                            console.log(`   ✅ ${row.nome} corrigido com ID ${nextId}`);
                        }

                        if (count === rows.length) {
                            console.log(`   ✅ ${count} clientes corrigidos`);
                            db.close();
                            resolve();
                        }
                    });
                });
            }
        });
    });
}

async function main() {
    console.log('🚀 CORRIGINDO CLIENTES COM ID NULL...\n');

    const bancos = [
        { path: path.join(__dirname, '../database/barbearia.db'), nome: 'barbearia.db' },
        { path: path.join(__dirname, '../database/empresa_5.db'), nome: 'empresa_5.db' },
        { path: path.join(__dirname, '../database/empresa_14.db'), nome: 'empresa_14.db' }
    ];

    for (const banco of bancos) {
        await corrigirClientes(banco.path, banco.nome);
    }

    console.log('\n✅ CORREÇÃO CONCLUÍDA!');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);