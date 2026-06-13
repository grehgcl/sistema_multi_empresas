const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./database/barbearia.db");

console.log("🔄 Criando tabela horarios_funcionamento...");

const createTable = "CREATE TABLE IF NOT EXISTS horarios_funcionamento (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "empresa_id INTEGER NOT NULL," +
    "dia_semana INTEGER NOT NULL," +
    "aberto INTEGER DEFAULT 1," +
    "hora_inicio TEXT DEFAULT \"09:00\"," +
    "hora_fim TEXT DEFAULT \"18:00\"," +
    "almoco_inicio TEXT DEFAULT \"12:00\"," +
    "almoco_fim TEXT DEFAULT \"13:00\"," +
    "intervalo_minutos INTEGER DEFAULT 30," +
    "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
    "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
    "FOREIGN KEY (empresa_id) REFERENCES empresas(id)," +
    "UNIQUE(empresa_id, dia_semana)" +
    ")";

db.run(createTable, function(err) {
    if (err) {
        console.log("❌ Erro ao criar tabela:", err.message);
        db.close();
    } else {
        console.log("✅ Tabela horarios_funcionamento criada!");
        
        const insertSql = "INSERT OR IGNORE INTO horarios_funcionamento " +
            "(empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) " +
            "SELECT id, 1, 1, \"09:00\", \"18:00\", \"12:00\", \"13:00\", 30 FROM empresas UNION " +
            "SELECT id, 2, 1, \"09:00\", \"18:00\", \"12:00\", \"13:00\", 30 FROM empresas UNION " +
            "SELECT id, 3, 1, \"09:00\", \"18:00\", \"12:00\", \"13:00\", 30 FROM empresas UNION " +
            "SELECT id, 4, 1, \"09:00\", \"18:00\", \"12:00\", \"13:00\", 30 FROM empresas UNION " +
            "SELECT id, 5, 1, \"09:00\", \"18:00\", \"12:00\", \"13:00\", 30 FROM empresas UNION " +
            "SELECT id, 6, 1, \"09:00\", \"18:00\", \"12:00\", \"13:00\", 30 FROM empresas UNION " +
            "SELECT id, 0, 0, \"09:00\", \"18:00\", \"12:00\", \"13:00\", 30 FROM empresas";
        
        db.run(insertSql, function(err2) {
            if (err2) {
                console.log("❌ Erro ao inserir horarios:", err2.message);
            } else {
                console.log("✅ Horarios padrao inseridos!");
            }
            db.close();
        });
    }
});