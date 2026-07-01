// scripts/fix-render-postgres.js
const { db, isProduction } = require('../server/config/database');

console.log('?? Corrigindo banco de dados no RENDER...');
console.log('?? Ambiente:', isProduction ? 'PRODU??O (PostgreSQL)' : 'DESENVOLVIMENTO (SQLite)');

if (!isProduction) {
    console.log('?? Este script deve ser executado apenas no Render!');
    process.exit(0);
}

const sqlCheck = "SELECT column_name FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'dias_bloqueio'";

db.all(sqlCheck, [], (err, rows) => {
    if (err) {
        console.error('? Erro:', err.message);
        return;
    }

    const existe = rows && rows.length > 0;
    console.log('?? Coluna existe?', existe);

    if (!existe) {
        console.log('?? Adicionando coluna dias_bloqueio...');
        const sqlAdd = "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_bloqueio INTEGER DEFAULT 1";
        db.run(sqlAdd, [], (err) => {
            if (err) {
                console.error('? Erro:', err.message);
                return;
            }
            console.log('? Coluna adicionada!');
            atualizarClientes();
        });
    } else {
        console.log('? Coluna j? existe!');
        atualizarClientes();
    }
});

function atualizarClientes() {
    console.log('?? Atualizando clientes...');
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
                    console.log('  - ID: ' + row.id + ', Nome: ' + row.nome + ', Dias: ' + row.dias_bloqueio);
                });
            }
            console.log('? Corre??o conclu?da!');
        });
    });
}
