const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔄 Removendo duplicatas e corrigindo horários...');

// Remover duplicatas mantendo apenas uma por empresa/dia
db.run(\
    DELETE FROM horarios_funcionamento 
    WHERE id NOT IN (
        SELECT MIN(id) 
        FROM horarios_funcionamento 
        GROUP BY empresa_id, dia_semana
    )
\, function(err) {
    if (err) {
        console.log('Erro ao remover duplicatas:', err.message);
    } else {
        console.log('✅ Duplicatas removidas, ' + this.changes + ' registros eliminados');
    }
    
    // Corrigir Domingo (dia_semana=0) como fechado para todas empresas
    db.run("UPDATE horarios_funcionamento SET aberto = 0 WHERE dia_semana = 0", function(err2) {
        if (err2) console.log('Erro:', err2.message);
        else console.log('✅ Domingo fechado para todas empresas');
        
        // Corrigir dias de semana (1-6) como abertos
        db.run("UPDATE horarios_funcionamento SET aberto = 1 WHERE dia_semana IN (1,2,3,4,5,6)", function(err3) {
            if (err3) console.log('Erro:', err3.message);
            else console.log('✅ Dias de semana abertos');
            
            // Mostrar resultado final
            db.all("SELECT * FROM horarios_funcionamento ORDER BY empresa_id, dia_semana", function(err4, rows) {
                if (err4) {
                    console.log('Erro:', err4.message);
                } else {
                    console.log('\n📋 HORÁRIOS FINAIS:');
                    var ultimaEmpresa = null;
                    for (var i = 0; i < rows.length; i++) {
                        var r = rows[i];
                        if (ultimaEmpresa !== r.empresa_id) {
                            ultimaEmpresa = r.empresa_id;
                            console.log('\n🏢 Empresa ID: ' + r.empresa_id);
                        }
                        var status = r.aberto === 1 ? '🟢 ABERTO' : '🔴 FECHADO';
                        console.log('   Dia ' + r.dia_semana + ': ' + status + ' | ' + r.hora_inicio + ' - ' + r.hora_fim + ' | Almoço: ' + (r.almoco_inicio || '-') + ' - ' + (r.almoco_fim || '-') + ' | Intervalo: ' + r.intervalo_minutos + 'min');
                    }
                }
                db.close();
            });
        });
    });
});
