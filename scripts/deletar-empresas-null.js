// deletar-empresa-null.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database/barbearia.db');

console.log('🗑️ DELETANDO EMPRESA COM ID NULL...\n');

// Verificar quantas existem
db.get('SELECT COUNT(*) as total FROM empresas WHERE id IS NULL OR id = "null"', (err, row) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    if (row.total === 0) {
        console.log('✅ Nenhuma empresa com ID NULL encontrada!');
        db.close();
        return;
    }

    console.log(`⚠️ Encontradas ${row.total} empresa(s) com ID NULL`);

    // Mostrar quais são
    db.all('SELECT id, nome FROM empresas WHERE id IS NULL OR id = "null"', (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err);
            db.close();
            return;
        }

        for (const r of rows) {
            console.log(`   - ${r.nome} (ID: ${r.id})`);
        }

        console.log('\n🗑️ Deletando...');

        db.run('DELETE FROM empresas WHERE id IS NULL OR id = "null"', function(err) {
            if (err) {
                console.error('❌ Erro:', err);
                db.close();
                return;
            }

            console.log(`✅ ${this.changes} empresa(s) deletada(s)!`);
            db.close();
        });
    });
});