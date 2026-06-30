const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database/barbearia.db");

console.log("Verificando e corrigindo horarios...");

// Primeiro, ver o que est? cadastrado para empresa_id=1
db.all("SELECT * FROM horarios_funcionamento WHERE empresa_id = 1 ORDER BY dia_semana", (err, rows) => {
    if (err) {
        console.log("Erro:", err.message);
    } else {
        console.log("\n?? HORARIOS ATUAIS (Empresa 1):");
        rows.forEach((r) => {
            const status = r.aberto === 1 ? "ABERTO" : "FECHADO";
            console.log(`   Dia ${r.dia_semana}: ${status} | ${r.hora_inicio}-${r.hora_fim}`);
        });
    }
    
    // For?ar corre??o para empresa 1
    db.run("UPDATE horarios_funcionamento SET aberto = 1 WHERE empresa_id = 1 AND dia_semana = 1", function(err2) {
        if (err2) {
            console.log("Erro ao corrigir:", err2.message);
        } else {
            console.log("\n? Segunda-feira (dia 1) corrigido para ABERTO");
        }
        
        // Verificar novamente
        db.all("SELECT * FROM horarios_funcionamento WHERE empresa_id = 1 ORDER BY dia_semana", (err3, rows2) => {
            console.log("\n?? HORARIOS CORRIGIDOS (Empresa 1):");
            rows2.forEach((r) => {
                const status = r.aberto === 1 ? "?? ABERTO" : "?? FECHADO";
                console.log(`   Dia ${r.dia_semana}: ${status} | ${r.hora_inicio}-${r.hora_fim}`);
            });
            db.close();
        });
    });
});
