const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

// Verificar empresas
db.all("SELECT id, nome FROM empresas", function(err, empresas) {
    if (err) {
        console.log('Erro:', err.message);
        db.close();
        return;
    }
    
    console.log('Empresas encontradas:');
    for (var i = 0; i < empresas.length; i++) {
        console.log('  ID: ' + empresas[i].id + ' - ' + empresas[i].nome);
    }
    
    // Verificar horários para cada empresa
    for (var i = 0; i < empresas.length; i++) {
        var empresaId = empresas[i].id;
        db.all("SELECT * FROM horarios_funcionamento WHERE empresa_id = " + empresaId + " ORDER BY dia_semana", function(err2, horarios) {
            if (err2) {
                console.log('Erro empresa ' + empresaId + ':', err2.message);
            } else if (horarios.length === 0) {
                console.log('⚠️ Empresa ' + empresaId + ' não tem horários cadastrados!');
                // Inserir horários padrão
                var sql = "INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) VALUES ";
                var valores = [];
                for (var d = 0; d <= 6; d++) {
                    var aberto = (d === 0) ? 0 : 1;
                    valores.push("(" + empresaId + ", " + d + ", " + aberto + ", '09:00', '18:00', '12:00', '13:00', 30)");
                }
                sql += valores.join(",");
                db.run(sql, function(err3) {
                    if (err3) console.log('Erro ao inserir:', err3.message);
                    else console.log('✅ Horários inseridos para empresa ' + empresaId);
                });
            } else {
                console.log('✅ Empresa ' + empresaId + ' tem ' + horarios.length + ' horários');
            }
        });
    }
    
    setTimeout(function() { db.close(); }, 2000);
});
