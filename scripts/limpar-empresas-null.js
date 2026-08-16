// ============================================
// SCRIPT: limpar-empresas-null.js
// Executar: node limpar-empresas-null.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database/barbearia.db');

console.log('🧹 LIMPANDO EMPRESAS COM ID NULL...\n');

const db = new sqlite3.Database(dbPath);

// 1. Ver quantas empresas com ID null existem
db.get('SELECT COUNT(*) as total FROM empresas WHERE id IS NULL', (err, row) => {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    console.log(`📊 Encontradas ${row.total} empresas com ID null`);

    if (row.total === 0) {
        console.log('✅ Nenhuma empresa com ID null encontrada');
        db.close();
        return;
    }

    // 2. Deletar empresas com ID null
    db.run('DELETE FROM empresas WHERE id IS NULL', function(err) {
        if (err) {
            console.error('❌ Erro ao deletar:', err.message);
            db.close();
            return;
        }

        console.log(`✅ ${this.changes} empresas deletadas`);

        // 3. Verificar se os IDs foram corrigidos
        db.all('SELECT id, nome FROM empresas ORDER BY id', (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                db.close();
                return;
            }

            console.log('\n📋 EMPRESAS ATUAIS:');
            for (const row of rows) {
                console.log(`   ${row.id} - ${row.nome}`);
            }

            db.close();
            console.log('\n✅ LIMPEZA CONCLUÍDA!');
        });
    });
});