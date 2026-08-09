const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 CORRIGINDO AGENDAMENTO #294...');

// Forçar atualização
db.run("UPDATE agendamentos SET status = 'concluido' WHERE id = 294", function(err) {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }
    console.log('✅ ' + this.changes + ' linha(s) atualizada(s)');
    
    // Verificar
    db.get("SELECT id, servico, status, forma_pagamento FROM agendamentos WHERE id = 294", function(err, row) {
        if (err) {
            console.error(err);
            db.close();
            return;
        }
        console.log('📋 Agendamento #294:');
        console.log('  Status: ' + row.status);
        console.log('  Pagamento: ' + row.forma_pagamento);
        db.close();
    });
});
