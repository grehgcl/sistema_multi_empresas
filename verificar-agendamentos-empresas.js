// ============================================
// SCRIPT: verificar-agendamentos-empresas.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔍 Verificando agendamentos em todas as empresas...');

const dbDir = path.join(__dirname, 'database');
const files = fs.readdirSync(dbDir);

for (const file of files) {
    if (file.startsWith('empresa_') && file.endsWith('.db')) {
        const id = parseInt(file.replace('empresa_', '').replace('.db', ''));
        const dbPath = path.join(dbDir, file);

        const db = new sqlite3.Database(dbPath);

        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'`, (err, row) => {
            if (err) {
                console.log(`❌ Empresa ${id}: Erro`, err.message);
                db.close();
                return;
            }

            if (!row) {
                console.log(`⚠️ Empresa ${id}: Tabela NÃO existe`);
                db.close();
                return;
            }

            db.get(`SELECT COUNT(*) as total FROM agendamentos`, (err, row) => {
                if (err) {
                    console.log(`❌ Empresa ${id}: Erro ao contar`, err.message);
                } else {
                    console.log(`✅ Empresa ${id}: ${row.total} agendamentos`);
                }
                db.close();
            });
        });
    }
}