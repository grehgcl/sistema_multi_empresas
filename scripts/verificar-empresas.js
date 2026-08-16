// verificar-empresas.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('database/barbearia.db');

console.log('========================================');
console.log('📋 EMPRESAS CADASTRADAS');
console.log('========================================\n');

db.all('SELECT id, nome FROM empresas ORDER BY id', (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    console.log('ID | NOME');
    console.log('----------------------------------------');
    rows.forEach(r => {
        console.log(`  ${r.id} | ${r.nome}`);
    });
    
    console.log('\n========================================');
    console.log(`Total: ${rows.length} empresas`);
    db.close();
});