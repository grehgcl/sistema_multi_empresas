// scripts/create-column.js
const { db, isProduction } = require('../server/config/database');

console.log('?? Criando coluna dias_bloqueio...');
console.log('Ambiente:', isProduction ? 'PRODU??O' : 'DESENVOLVIMENTO');

const sql = isProduction
    ? "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_bloqueio INTEGER DEFAULT 1"
    : "ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1";

db.run(sql, [], (err) => {
    if (err) {
        console.error('? Erro:', err.message);
        if (isProduction) {
            console.log('?? Tentando sem IF NOT EXISTS...');
            const sql2 = "ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1";
            db.run(sql2, [], (err2) => {
                if (err2 && !err2.message.includes('already exists')) {
                    console.error('? Erro:', err2.message);
                } else {
                    console.log('? Coluna criada!');
                    atualizar();
                }
            });
        }
        return;
    }
    console.log('? Coluna criada!');
    atualizar();
});

function atualizar() {
    const sqlUpdate = "UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL";
    db.run(sqlUpdate, [], (err) => {
        if (err) {
            console.error('? Erro:', err.message);
        } else {
            console.log('? Clientes atualizados!');
        }
        const sqlSelect = "SELECT id, nome, dias_bloqueio FROM clientes LIMIT 5";
        db.all(sqlSelect, [], (err, rows) => {
            if (!err && rows) {
                console.log('?? Clientes:');
                rows.forEach(row => {
                    console.log('  ' + row.id + ': ' + row.nome + ' - ' + row.dias_bloqueio + ' dias');
                });
            }
            console.log('? Conclu?do!');
        });
    });
}
