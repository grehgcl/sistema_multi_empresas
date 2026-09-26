// check-bloqueios.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

const dir = path.join(__dirname, 'database');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.db'));

console.log(`\n🔍 Verificando ${files.length} banco(s)...\n`);

if (files.length === 0) {
    console.log('⚠️ Nenhum .db encontrado');
    process.exit(0);
}

let ok = 0;
let semTabela = 0;
let i = 0;

files.forEach(f => {
    const db = new sqlite3.Database(path.join(dir, f));
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='bloqueios_agenda'", (err, row) => {
        if (err || !row) {
            console.log(`❌ ${f} — SEM tabela bloqueios_agenda`);
            semTabela++;
        } else {
            console.log(`✅ ${f}`);
            ok++;
        }
        db.close();

        i++;
        if (i === files.length) {
            console.log(`\n📊 Resumo: ${ok} OK · ${semTabela} sem tabela · ${files.length} total\n`);
            process.exit(0);
        }
    });
});