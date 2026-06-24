// scripts/create-column.js
// Execute: node scripts/create-column.js

const { db, isProduction } = require('../server/config/database');

console.log('🔄 Criando coluna dias_bloqueio...');

const sql = isProduction
    ? `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_bloqueio INTEGER DEFAULT 1`
    : `ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1`;

db.run(sql, [], (err) => {
    if (err) {
        console.error('❌ Erro:', err.message);

        // Tentar sem IF NOT EXISTS (PostgreSQL mais antigo)
        if (isProduction) {
            console.log('🔄 Tentando sem IF NOT EXISTS...');
            const sql2 = `ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1`;
            db.run(sql2, [], (err2) => {
                if (err2 && !err2.message.includes('already exists')) {
                    console.error('❌ Erro novamente:', err2.message);
                } else {
                    console.log('✅ Coluna criada!');
                    atualizar();
                }
            });
        }
        return;
    }
    console.log('✅ Coluna criada!');
    atualizar();
});

function atualizar() {
    const sqlUpdate = isProduction
        ? `UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL`
        : `UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL`;

    db.run(sqlUpdate, [], (err) => {
        if (err) {
            console.error('❌ Erro ao atualizar:', err.message);
        } else {
            console.log('✅ Clientes atualizados!');
        }

        const sqlSelect = `SELECT id, nome, dias_bloqueio FROM clientes LIMIT 5`;
        db.all(sqlSelect, [], (err, rows) => {
            if (!err && rows) {
                console.log('📋 Clientes:');
                rows.forEach(row => {
                    console.log(`  ${row.id}: ${row.nome} - ${row.dias_bloqueio} dias`);
                });
            }
            console.log('✅ Concluído!');
        });
    });
}