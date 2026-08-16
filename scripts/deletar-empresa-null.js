// deletar-empresa-null.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database/barbearia.db');

console.log('🗑️ Deletando empresa com ID NULL...');

db.run('DELETE FROM empresas WHERE id IS NULL', function(err) {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }
    
    console.log(`✅ ${this.changes} empresa(s) deletada(s)`);
    
    // Verificar empresas restantes
    db.all('SELECT id, nome FROM empresas ORDER BY id', (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err);
            db.close();
            return;
        }
        
        console.log(`\n📋 Empresas restantes (${rows.length}):`);
        rows.forEach(e => {
            console.log(`   ${e.id} - ${e.nome}`);
        });
        
        db.close();
    });
});