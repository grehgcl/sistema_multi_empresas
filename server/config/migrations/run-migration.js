const { db } = require('../database');
const fs = require('fs');
const path = require('path');

function runMigration() {
    const sql = fs.readFileSync(path.join(__dirname, 'ads_stats.sql'), 'utf8');
    
    // Divide as instruções SQL (separadas por ;)
    const statements = sql.split(';').filter(s => s.trim());
    
    statements.forEach((stmt, index) => {
        if (stmt.trim()) {
            db.run(stmt, (err) => {
                if (err) {
                    // Ignora erros de índice já existente
                    if (err.message.includes('already exists')) {
                        console.log(`ℹ️ Migration ${index + 1} ignorada (já existe)`);
                    } else {
                        console.error(`❌ Erro na migration ${index + 1}:`, err.message);
                    }
                } else {
                    console.log(`✅ Migration ${index + 1} executada com sucesso`);
                }
            });
        }
    });
}

// Executar se chamado diretamente
if (require.main === module) {
    runMigration();
}

module.exports = { runMigration };