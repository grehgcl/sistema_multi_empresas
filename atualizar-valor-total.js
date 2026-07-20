const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database/barbearia.db');

console.log('📝 Atualizando valor_total dos agendamentos...');

db.run(
    "UPDATE agendamentos SET valor_total = COALESCE(valor, 0) + COALESCE(valor_extras, 0) WHERE valor_total IS NULL OR valor_total = 0",
    function(err) {
        if (err) {
            console.error('❌ Erro:', err.message);
        } else {
            console.log('✅ ' + this.changes + ' agendamentos atualizados com valor_total!');
        }
        db.close();
    }
);
