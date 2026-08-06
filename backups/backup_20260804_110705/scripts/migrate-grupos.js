const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'barbearia.db');
const db = new sqlite3.Database(dbPath);

console.log('📦 Adicionando coluna grupos na tabela clientes...');

db.run("ALTER TABLE clientes ADD COLUMN grupos TEXT DEFAULT '[]'", function (err) {
    if (err) {
        if (err.message.includes('duplicate column name')) {
            console.log('✅ Coluna grupos já existe!');
        } else {
            console.error('❌ Erro ao adicionar coluna:', err.message);
        }
    } else {
        console.log('✅ Coluna grupos adicionada com sucesso!');
    }

    db.close();
});