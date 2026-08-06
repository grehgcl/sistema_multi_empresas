const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

// Atualizar todos os agendamentos concluídos
db.serialize(() => {
    // 1. Ver os dados atuais
    db.all(`SELECT id, data, servico, valor, valor_total, status FROM agendamentos WHERE status LIKE '%conclu%'`, (err, rows) => {
        console.log('📊 Antes:');
        console.table(rows);

        // 2. Atualizar valor_total = valor
        db.run(`UPDATE agendamentos SET valor_total = valor WHERE status LIKE '%conclu%' AND valor IS NOT NULL`, function (err) {
            if (err) {
                console.error('❌ Erro:', err);
            } else {
                console.log(`\n✅ ${this.changes} agendamentos atualizados!`);

                // 3. Verificar depois
                db.all(`SELECT id, data, servico, valor, valor_total, status FROM agendamentos WHERE status LIKE '%conclu%'`, (err, rows) => {
                    console.log('\n📊 Depois:');
                    console.table(rows);
                    db.close();
                });
            }
        });
    });
});