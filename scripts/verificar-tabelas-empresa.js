// ============================================
// SCRIPT: verificar-tabelas-empresa.js
// Executar: node verificar-tabelas-empresa.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const empresaId = 3;
const dbPath = path.join(__dirname, `database/empresa_${empresaId}.db`);

console.log(`🔍 Verificando tabelas da empresa ${empresaId}...`);

const db = new sqlite3.Database(dbPath);

// Listar todas as tabelas
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    console.log(`📊 Tabelas encontradas:`);
    for (const table of tables) {
        console.log(`   ✅ ${table.name}`);
    }

    // Verificar horários
    db.get("SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?", [empresaId], (err, row) => {
        if (err) {
            console.log(`   ⚠️ Nenhum horário encontrado`);
        } else {
            console.log(`   📅 ${row.total} horários cadastrados`);
        }
        db.close();
    });
});