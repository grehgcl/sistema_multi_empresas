// forcar-bloqueios.js
// Força a criação da tabela bloqueios_agenda em TODOS os bancos
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const dir = path.join(__dirname, 'database');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.db'));

console.log(`\n🚀 Forçando criação em ${files.length} banco(s)...\n`);

const SQL = `
CREATE TABLE IF NOT EXISTS bloqueios_agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    profissional_id INTEGER,
    tipo TEXT NOT NULL DEFAULT 'periodo',
    data_inicio TEXT NOT NULL,
    data_fim TEXT,
    datas_especificas TEXT DEFAULT '[]',
    dia_inteiro INTEGER DEFAULT 1,
    hora_inicio TEXT,
    hora_fim TEXT,
    motivo TEXT,
    criado_por INTEGER,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`;

let ok = 0;
let erro = 0;
let i = 0;

if (files.length === 0) {
    console.log('⚠️ Nenhum .db encontrado');
    process.exit(0);
}

files.forEach(f => {
    const db = new sqlite3.Database(path.join(dir, f));

    db.run(SQL, (err) => {
        if (err) {
            console.log(`❌ ${f} — ${err.message}`);
            erro++;
        } else {
            // Cria índices também
            db.run(`CREATE INDEX IF NOT EXISTS idx_bloqueios_empresa ON bloqueios_agenda(empresa_id, data_inicio, data_fim, ativo)`, () => {});
            db.run(`CREATE INDEX IF NOT EXISTS idx_bloqueios_profissional ON bloqueios_agenda(empresa_id, profissional_id, ativo)`, () => {});
            console.log(`✅ ${f}`);
            ok++;
        }

        db.close();
        i++;

        if (i === files.length) {
            console.log(`\n📊 Resumo: ${ok} OK · ${erro} erro(s) · ${files.length} total\n`);
            process.exit(0);
        }
    });
});