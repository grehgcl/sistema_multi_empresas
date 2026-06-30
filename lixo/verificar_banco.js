const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database/barbearia.db");

console.log("Verificando dados do usuario admin...");

db.get('SELECT empresa_id FROM usuarios WHERE email = "admin@teste.com"', (err, user) => {
    if (err) {
        console.log("Erro:", err.message);
        db.close();
        return;
    }
    
    if (!user) {
        console.log("Usuario admin nao encontrado!");
        db.close();
        return;
    }
    
    console.log("Empresa ID do admin:", user.empresa_id);
    
    db.all("SELECT * FROM horarios_funcionamento WHERE empresa_id = " + user.empresa_id + " ORDER BY dia_semana", (err2, rows) => {
        if (err2) {
            console.log("Erro ao buscar horarios:", err2.message);
        } else {
            console.log("\n?? HORARIOS DA EMPRESA " + user.empresa_id + ":");
            if (rows.length === 0) {
                console.log("   Nenhum horario cadastrado!");
            } else {
                rows.forEach((r) => {
                    const status = r.aberto === 1 ? "ABERTO" : "FECHADO";
                    console.log(`   Dia ${r.dia_semana}: ${status} | ${r.hora_inicio} - ${r.hora_fim} | Almoco: ${r.almoco_inicio} - ${r.almoco_fim}`);
                });
            }
        }
        db.close();
    });
});
