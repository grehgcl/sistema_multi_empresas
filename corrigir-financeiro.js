const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 CORRIGINDO FINANCEIRO...');
console.log('========================================');

// 1. Atualizar status dos agendamentos
console.log('\n📝 Atualizando agendamentos...');
db.run(
    "UPDATE agendamentos SET status = 'concluido' WHERE forma_pagamento IS NOT NULL AND forma_pagamento != '' AND status != 'concluido'",
    function(err) {
        if (err) {
            console.error('❌ Erro:', err);
            db.close();
            return;
        }
        console.log('✅ ' + this.changes + ' agendamentos atualizados para CONCLUIDO');

        // 2. Verificar agendamentos concluídos
        console.log('\n📋 Agendamentos CONCLUIDOS:');
        db.all(
            "SELECT id, servico, status, forma_pagamento, valor FROM agendamentos WHERE status = 'concluido' ORDER BY id DESC LIMIT 10",
            function(err, rows) {
                if (err) {
                    console.error('❌ Erro:', err);
                    db.close();
                    return;
                }
                if (rows.length === 0) {
                    console.log('  Nenhum agendamento concluído encontrado');
                } else {
                    rows.forEach(function(r) {
                        console.log('  #' + r.id + ' - ' + r.servico + ' - R$ ' + r.valor + ' - ' + (r.forma_pagamento || 'N/A'));
                    });
                }

                // 3. Verificar total no financeiro
                console.log('\n💰 TOTAL FINANCEIRO:');
                db.get(
                    "SELECT SUM(valor) as total FROM agendamentos WHERE status = 'concluido' AND empresa_id = 7",
                    function(err, row) {
                        if (err) {
                            console.error('❌ Erro:', err);
                            db.close();
                            return;
                        }
                        console.log('  Total faturado: R$ ' + (row.total || 0).toFixed(2));
                        db.close();
                        console.log('\n✅ CORREÇÃO CONCLUÍDA!');
                    }
                );
            }
        );
    }
);
