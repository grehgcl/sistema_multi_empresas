// scripts/corrigir-status.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('📋 Verificando agendamentos...');

// Verificar status
db.all("SELECT id, status FROM agendamentos WHERE status LIKE '%conclu%'", (err, rows) => {
    if (err) {
        console.error('Erro:', err);
        db.close();
        return;
    }
    
    console.log('📋 Agendamentos encontrados:');
    rows.forEach(r => {
        console.log(`  #${r.id} - Status: "${r.status}"`);
    });
    
    // Corrigir status
    db.run("UPDATE agendamentos SET status = 'concluido' WHERE status = 'concluído' OR status = 'Concluído'", function(err) {
        if (err) {
            console.error('Erro ao atualizar:', err);
            db.close();
            return;
        }
        console.log(`✅ ${this.changes} agendamentos corrigidos para 'concluido'`);
        
        // Verificar resultado
        db.all("SELECT id, servico, status, forma_pagamento, valor FROM agendamentos WHERE status = 'concluido' ORDER BY id DESC", (err, rows) => {
            if (err) {
                console.error(err);
                db.close();
                return;
            }
            console.log('📋 Agendamentos CONCLUIDOS:');
            if (rows.length === 0) {
                console.log('  Nenhum agendamento concluído encontrado');
            } else {
                rows.forEach(r => {
                    console.log(`  #${r.id} - ${r.servico} - R$ ${r.valor} - ${r.forma_pagamento || 'N/A'}`);
                });
            }
            db.close();
        });
    });
});