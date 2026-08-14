// ============================================
// SCRIPT: limpar-usuarios-duplicados.js
// Executar: node limpar-usuarios-duplicados.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🧹 LIMPANDO USUÁRIOS DUPLICADOS...\n');

const db = new sqlite3.Database(dbPath);

// 1. Ver usuários com email duplicado
db.all(`
    SELECT email, COUNT(*) as total 
    FROM usuarios 
    GROUP BY email 
    HAVING COUNT(*) > 1
`, (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    if (rows.length === 0) {
        console.log('✅ Nenhum email duplicado encontrado');
        db.close();
        return;
    }

    console.log(`📊 Encontrados ${rows.length} emails duplicados:`);
    for (const row of rows) {
        console.log(`   ${row.email} - ${row.total} registros`);
    }

    // 2. Deletar usuários com emails duplicados (mantendo apenas 1)
    db.run(`
        DELETE FROM usuarios 
        WHERE email IN (
            SELECT email 
            FROM usuarios 
            GROUP BY email 
            HAVING COUNT(*) > 1
        )
        AND id NOT IN (
            SELECT MIN(id) 
            FROM usuarios 
            GROUP BY email 
            HAVING COUNT(*) > 1
        )
    `, function(err) {
        if (err) {
            console.error('❌ Erro ao deletar:', err.message);
            db.close();
            return;
        }

        console.log(`\n✅ ${this.changes} usuários duplicados deletados`);

        // 3. Listar usuários restantes
        db.all('SELECT id, email, nome, empresa_id FROM usuarios ORDER BY id', (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                db.close();
                return;
            }

            console.log('\n📋 USUÁRIOS ATUAIS:');
            for (const row of rows) {
                console.log(`   ${row.id} - ${row.nome} (${row.email}) - Empresa: ${row.empresa_id}`);
            }

            db.close();
            console.log('\n✅ LIMPEZA CONCLUÍDA!');
        });
    });
});