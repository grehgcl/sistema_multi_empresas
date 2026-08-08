// scripts/verificar-sqlite.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, '../database/barbearia.db'));

db.all("SELECT id, nome, plano FROM empresas ORDER BY id", (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
    } else {
        console.log('📊 Empresas no SQLite:');
        console.table(rows);
    }
});

db.all("SELECT COUNT(*) as total FROM clientes", (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
    } else {
        console.log('📊 Total de clientes:', rows[0].total);
    }
});

db.all("SELECT COUNT(*) as total FROM agendamentos", (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
    } else {
        console.log('📊 Total de agendamentos:', rows[0].total);
    }
    db.close();
});