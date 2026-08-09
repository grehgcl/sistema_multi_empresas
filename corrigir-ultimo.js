const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

// Buscar o último agendamento pendente com pagamento
db.get("SELECT id, servico, status, forma_pagamento FROM agendamentos WHERE status = 'pendente' AND forma_pagamento IS NOT NULL AND forma_pagamento != '' ORDER BY id DESC LIMIT 1", function(err, row) {
    if (err) {
        console.error(err);
        db.close();
        return;
    }
    
    if (!row) {
        console.log('❌ Nenhum agendamento pendente com pagamento encontrado');
        db.close();
        return;
    }
    
    console.log('📋 Encontrado: #' + row.id + ' - ' + row.servico + ' - Pagamento: ' + row.forma_pagamento);
    
    // Corrigir
    db.run("UPDATE agendamentos SET status = 'concluido' WHERE id = " + row.id, function(err) {
        if (err) {
            console.error(err);
            db.close();
            return;
        }
        console.log('✅ Agendamento #' + row.id + ' corrigido para CONCLUIDO');
        
        // Verificar
        db.get("SELECT id, servico, status, forma_pagamento FROM agendamentos WHERE id = " + row.id, function(err, row2) {
            if (err) {
                console.error(err);
                db.close();
                return;
            }
            console.log('📋 Agora: #' + row2.id + ' - ' + row2.servico + ' - Status: ' + row2.status);
            db.close();
        });
    });
});
