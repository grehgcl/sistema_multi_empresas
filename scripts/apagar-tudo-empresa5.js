// scripts/apagar-tudo-empresa5.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('🗑️ APAGANDO TODOS OS AGENDAMENTOS DA EMPRESA 5');
console.log('============================================================\n');

const databaseDir = path.join(__dirname, '../database');
const files = fs.readdirSync(databaseDir).filter(f => f.endsWith('.db'));

console.log(`📋 ${files.length} bancos encontrados\n`);

let totalRemovidos = 0;

files.forEach(file => {
    const dbPath = path.join(databaseDir, file);
    const db = new sqlite3.Database(dbPath);

    // Verificar se a tabela existe
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='agendamentos'", (err, tableExists) => {
        if (err || !tableExists) {
            db.close();
            return;
        }

        db.run('DELETE FROM agendamentos WHERE empresa_id = 5', function (err) {
            if (err) {
                console.log(`❌ ${file}: Erro - ${err.message}`);
                db.close();
                return;
            }

            if (this.changes > 0) {
                console.log(`✅ ${file}: ${this.changes} agendamentos removidos`);
                totalRemovidos += this.changes;
            }
            db.close();
        });
    });
});

setTimeout(() => {
    console.log('\n============================================================');
    console.log(`📊 Total removido: ${totalRemovidos} agendamentos`);
    console.log('✅ LIMPEZA CONCLUÍDA!');
    console.log('============================================================');
    console.log('📝 Reinicie o servidor: npm start');
}, 3000);