// scripts/limpar-cliente-9078.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('============================================================');
console.log('🗑️ REMOVENDO TODOS OS AGENDAMENTOS DO CLIENTE 9078');
console.log('============================================================\n');

const databaseDir = path.join(__dirname, '../database');

const files = fs.readdirSync(databaseDir)
    .filter(f => f.startsWith('empresa_5') && f.endsWith('.db'));

console.log(`📋 ${files.length} bancos da empresa 5 encontrados\n`);

files.forEach(file => {
    const dbPath = path.join(databaseDir, file);
    console.log(`🔧 Processando: ${file}`);

    const db = new sqlite3.Database(dbPath);

    // Verificar agendamentos do cliente 9078
    db.all('SELECT * FROM agendamentos WHERE cliente_id = 9078', (err, rows) => {
        if (err) {
            console.log(`   ❌ Erro: ${err.message}`);
            db.close();
            return;
        }

        if (rows.length === 0) {
            console.log(`   ✅ Nenhum agendamento do cliente 9078`);
            db.close();
            return;
        }

        console.log(`   📋 ${rows.length} agendamentos encontrados para cliente 9078`);
        rows.forEach(r => {
            console.log(`      ID: ${r.id}, ${r.data} ${r.hora}`);
        });

        // Remover todos
        db.run('DELETE FROM agendamentos WHERE cliente_id = 9078', function (err) {
            if (err) {
                console.error(`   ❌ Erro ao remover: ${err.message}`);
            } else {
                console.log(`   ✅ ${this.changes} agendamento(s) removido(s)`);
            }
            db.close();
        });
    });
});

setTimeout(() => {
    console.log('\n============================================================');
    console.log('✅ LIMPEZA CONCLUÍDA!');
    console.log('============================================================');
    console.log('📝 Reinicie o servidor: npm start');
    console.log('============================================================\n');
}, 2000);