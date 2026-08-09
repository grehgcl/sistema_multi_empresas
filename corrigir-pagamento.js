const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

// 1. Ver o #298
db.get('SELECT id, servico, forma_pagamento, status FROM agendamentos WHERE id = 298', (err, row) => {
    console.log('📋 Antes:', row);
    
    // 2. Forçar atualização
    db.run("UPDATE agendamentos SET forma_pagamento = 'dinheiro', status = 'concluido' WHERE id = 298", function(err) {
        if (err) { console.error(err); db.close(); return; }
        
        // 3. Ver depois
        db.get('SELECT id, servico, forma_pagamento, status FROM agendamentos WHERE id = 298', (err, row) => {
            console.log('📋 Depois:', row);
            
            // 4. Ver todos os concluídos
            db.all("SELECT id, servico, forma_pagamento FROM agendamentos WHERE status = 'concluido' ORDER BY id DESC LIMIT 5", (err, rows) => {
                console.log('\n📋 ÚLTIMOS CONCLUIDOS:');
                rows.forEach(r => {
                    console.log('  #' + r.id + ' - ' + r.servico + ' - Pagamento: ' + (r.forma_pagamento || 'N/A'));
                });
                db.close();
            });
        });
    });
});
