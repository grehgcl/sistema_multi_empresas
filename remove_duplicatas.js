const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database/barbearia.db");

console.log("Removendo duplicatas...");

// Remover duplicatas mantendo apenas a primeira ocorr?ncia
db.run("DELETE FROM horarios_funcionamento WHERE id NOT IN (SELECT MIN(id) FROM horarios_funcionamento GROUP BY empresa_id, dia_semana)", function(err) {
    if (err) {
        console.log("Erro:", err.message);
    } else {
        console.log("Duplicatas removidas. Registros restantes:", this.changes);
    }
    
    // Agora corrigir os hor?rios
    db.run("UPDATE horarios_funcionamento SET hora_inicio = '09:00', hora_fim = '18:00', almoco_inicio = '12:00', almoco_fim = '13:00'");
    db.run("UPDATE horarios_funcionamento SET aberto = 0 WHERE dia_semana = 0");
    db.run("UPDATE horarios_funcionamento SET aberto = 1 WHERE dia_semana IN (1,2,3,4,5,6)");
    
    // Verificar resultado final
    db.all("SELECT * FROM horarios_funcionamento ORDER BY empresa_id, dia_semana", (err, rows) => {
        if (err) {
            console.log("Erro:", err.message);
        } else {
            console.log("\n? HORARIOS FINAIS (SEM DUPLICATAS):");
            rows.forEach((r) => {
                const status = r.aberto === 1 ? "?? ABERTO" : "?? FECHADO";
                console.log(`   Empresa ${r.empresa_id} - Dia ${r.dia_semana}: ${status} | ${r.hora_inicio}-${r.hora_fim} | Almoco: ${r.almoco_inicio}-${r.almoco_fim} | Intervalo: ${r.intervalo_minutos}min`);
            });
        }
        db.close();
    });
});
