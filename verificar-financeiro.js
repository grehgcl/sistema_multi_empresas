const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

db.all("SELECT id, servico, status, forma_pagamento, valor FROM agendamentos WHERE status = 'concluido' ORDER BY id DESC", function(err, rows) {
    if (err) {
        console.error(err);
        db.close();
        return;
    }
    console.log('📋 AGENDAMENTOS CONCLUIDOS:');
    if (rows.length === 0) {
        console.log('  Nenhum agendamento concluído');
    } else {
        rows.forEach(function(r) {
            console.log('  #' + r.id + ' - ' + r.servico + ' - R$ ' + r.valor + ' - Pag: ' + (r.forma_pagamento || 'N/A'));
        });
    }
    
    db.get("SELECT SUM(valor) as total FROM agendamentos WHERE status = 'concluido'", function(err, row) {
        if (err) {
            console.error(err);
            db.close();
            return;
        }
        console.log('\\n💰 Total faturado: R$ ' + (row.total || 0).toFixed(2));
        db.close();
    });
});
