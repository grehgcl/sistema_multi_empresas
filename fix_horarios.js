const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database/barbearia.db");

console.log("Corrigindo horarios...");

db.serialize(() => {
    // Corrigir horarios para formato correto
    db.run("UPDATE horarios_funcionamento SET hora_inicio = '09:00', hora_fim = '18:00', almoco_inicio = '12:00', almoco_fim = '13:00'");
    
    // Domingo fechado
    db.run("UPDATE horarios_funcionamento SET aberto = 0 WHERE dia_semana = 0");
    
    // Dias de semana abertos
    db.run("UPDATE horarios_funcionamento SET aberto = 1 WHERE dia_semana IN (1,2,3,4,5,6)");
    
    // Verificar resultado
    db.all("SELECT * FROM horarios_funcionamento ORDER BY dia_semana", (err, rows) => {
        if (err) {
            console.log("Erro:", err.message);
        } else {
            console.log("\nHORARIOS ATUALIZADOS:");
            rows.forEach((r) => {
                const status = r.aberto === 1 ? "ABERTO" : "FECHADO";
                console.log(`Dia ${r.dia_semana}: ${status} | ${r.hora_inicio} - ${r.hora_fim} | Almoco: ${r.almoco_inicio} - ${r.almoco_fim} | Intervalo: ${r.intervalo_minutos}min`);
            });
        }
        db.close();
    });
});
