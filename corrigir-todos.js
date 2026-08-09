const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 CORRIGINDO TODOS OS PENDENTES...');

db.run("UPDATE agendamentos SET status = 'concluido' WHERE forma_pagamento IS NOT NULL AND forma_pagamento != '' AND status = 'pendente'", function(err) {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }
    console.log('✅ ' + this.changes + ' agendamentos corrigidos para CONCLUIDO');
    
    db.all("SELECT id, servico, status, forma_pagamento FROM agendamentos WHERE status = 'concluido' ORDER BY id DESC", function(err, rows) {
        if (err) {
            console.error(err);
            db.close();
            return;
        }
        console.log('\\n📋 AGENDAMENTOS CONCLUIDOS:');
        rows.forEach(function(r) {
            console.log('  #' + r.id + ' - ' + r.servico + ' - Status: ' + r.status + ' - Pag: ' + (r.forma_pagamento || 'N/A'));
        });
        db.close();
    });
});
