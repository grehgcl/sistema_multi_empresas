const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

// Atualizar todos os agendamentos concluídos que não têm valor
db.run(`
    UPDATE agendamentos 
    SET valor = 45, valor_total = 45 
    WHERE status LIKE '%conclu%' 
      AND (valor IS NULL OR valor = 0)
`, function (err) {
    if (err) {
        console.error('❌ Erro:', err);
    } else {
        console.log(`✅ ${this.changes} agendamentos atualizados para R$ 45`);
    }

    // Verificar
    db.all(`SELECT id, data, servico, valor, valor_total, status FROM agendamentos WHERE status LIKE '%conclu%'`, (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err);
        } else {
            console.log('📊 Resultado:');
            console.table(rows);
        }
        db.close();
    });
});