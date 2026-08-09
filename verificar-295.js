const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔍 VERIFICANDO AGENDAMENTO #295...');
db.get("SELECT id, servico, status, forma_pagamento, valor FROM agendamentos WHERE id = 295", function(err, row) {
    if (err) {
        console.error(err);
        db.close();
        return;
    }
    console.log('📋 Agendamento #295:');
    console.log('  Serviço: ' + row.servico);
    console.log('  Status: ' + row.status);
    console.log('  Forma Pagamento: "' + row.forma_pagamento + '"');
    console.log('  Valor: ' + row.valor);
    db.close();
});
