// ============================================
// SCRIPT: verificar-horarios-empresas.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔍 Verificando horarios_funcionamento em todas as empresas...');

const dbDir = path.join(__dirname, 'database');
const files = fs.readdirSync(dbDir);

for (const file of files) {
    if (file.startsWith('empresa_') && file.endsWith('.db')) {
        const id = parseInt(file.replace('empresa_', '').replace('.db', ''));
        const dbPath = path.join(dbDir, file);

        console.log(`\n📊 Empresa ${id}:`);

        const db = new sqlite3.Database(dbPath);

        // Verificar se a tabela existe
        db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='horarios_funcionamento'`, (err, row) => {
            if (err) {
                console.log(`   ❌ Erro: ${err.message}`);
                db.close();
                return;
            }

            if (!row) {
                console.log(`   ❌ Tabela NÃO existe`);
                db.close();
                return;
            }

            // Contar registros
            db.get(`SELECT COUNT(*) as total FROM horarios_funcionamento`, (err, row) => {
                if (err) {
                    console.log(`   ❌ Erro ao contar: ${err.message}`);
                } else {
                    console.log(`   ✅ Tabela existe - ${row.total} registros`);
                }
                db.close();
            });
        });
    }
}