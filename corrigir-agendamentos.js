const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 CORRIGINDO AGENDAMENTOS...');

// 1. Ver todos os agendamentos
db.all('SELECT id, servico, status, forma_pagamento FROM agendamentos ORDER BY id DESC', (err, rows) => {
    if (err) { console.error(err); db.close(); return; }
    
    console.log('📋 Agendamentos encontrados:');
    rows.forEach(r => {
        console.log(  # -  - Status: "" - Pagamento: "");
    });
    
    // 2. Corrigir: se tem forma_pagamento, deve ser concluido
    db.run(
        "UPDATE agendamentos SET status = 'concluido' WHERE forma_pagamento IS NOT NULL AND forma_pagamento != '' AND status != 'concluido'",
        function(err) {
            if (err) { console.error(err); db.close(); return; }
            console.log(✅  agendamentos corrigidos para CONCLUIDO);
            
            // 3. Verificar resultado final
            db.all("SELECT id, servico, status, forma_pagamento FROM agendamentos WHERE status = 'concluido'", (err, rows) => {
                if (err) { console.error(err); db.close(); return; }
                console.log('\n📋 Agendamentos CONCLUIDOS:');
                rows.forEach(r => {
                    console.log(  # -  - Pagamento: );
                });
                
                // 4. Total faturado
                db.get("SELECT SUM(valor) as total FROM agendamentos WHERE status = 'concluido'", (err, row) => {
                    if (err) { console.error(err); db.close(); return; }
                    console.log(\n💰 Total faturado: R$ );
                    db.close();
                });
            });
        }
    );
});
