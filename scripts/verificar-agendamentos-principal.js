// ============================================
// SCRIPT: verificar-agendamentos-principal.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/barbearia.db');
console.log(`🔍 Verificando agendamentos no banco principal...`);

const db = new sqlite3.Database(dbPath);

// Verificar se a tabela agendamentos existe
db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'`, (err, row) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    if (!row) {
        console.log('ℹ️ Tabela agendamentos não existe no banco principal');
        db.close();
        return;
    }

    // Contar agendamentos
    db.get(`SELECT COUNT(*) as total FROM agendamentos`, (err, row) => {
        if (err) {
            console.error('❌ Erro ao contar:', err.message);
        } else {
            console.log(`📊 ${row.total} agendamentos no banco principal`);
        }
        db.close();
    });
});