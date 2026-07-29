const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

console.log('🔧 Corrigindo valor_total dos agendamentos...\n');

// Atualizar valor_total = valor
db.run(`UPDATE agendamentos SET valor_total = valor WHERE status LIKE '%conclu%' AND valor IS NOT NULL AND valor > 0`, function (err) {
    if (err) {
        console.error('❌ Erro:', err.message);
        db.close();
        return;
    }

    console.log(`✅ ${this.changes} agendamentos atualizados!\n`);

    // Verificar resultado
    db.all(`SELECT id, data, servico, valor, valor_total, status FROM agendamentos WHERE status LIKE '%conclu%' ORDER BY data DESC`, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar:', err.message);
            db.close();
            return;
        }

        console.log('📊 Agendamentos concluídos:');
        console.table(rows);

        // Calcular total
        let total = 0;
        rows.forEach(r => { total += parseFloat(r.valor_total) || 0; });
        console.log(`\n💰 Total de faturamento: R$ ${total.toFixed(2)}`);

        db.close();
    });
});