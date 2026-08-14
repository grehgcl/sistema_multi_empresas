// ============================================
// SCRIPT: limpar-usuarios-null.js
// Executar: node limpar-usuarios-null.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🧹 LIMPANDO USUÁRIOS COM EMPRESA NULL...\n');

const db = new sqlite3.Database(dbPath);

db.get('SELECT COUNT(*) as total FROM usuarios WHERE empresa_id IS NULL', (err, row) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    console.log(`📊 Encontrados ${row.total} usuários com empresa NULL`);

    if (row.total === 0) {
        console.log('✅ Nenhum usuário com empresa NULL');
        db.close();
        return;
    }

    db.run('DELETE FROM usuarios WHERE empresa_id IS NULL', function(err) {
        if (err) {
            console.error('❌ Erro ao deletar:', err.message);
            db.close();
            return;
        }

        console.log(`✅ ${this.changes} usuários deletados`);

        db.all('SELECT id, email, nome, empresa_id FROM usuarios ORDER BY id', (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                db.close();
                return;
            }

            console.log('\n📋 USUÁRIOS RESTANTES:');
            for (const row of rows) {
                console.log(`   ${row.id} - ${row.nome} (${row.email}) - Empresa: ${row.empresa_id}`);
            }

            db.close();
            console.log('\n✅ LIMPEZA CONCLUÍDA!');
        });
    });
});