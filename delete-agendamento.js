// delete-agendamento.js
const { db } = require('./server/config/database');

console.log('🗑️ Deletando agendamentos para 2026-09-01 13:30...');

db.run(
    `DELETE FROM agendamentos WHERE data = '2026-09-01' AND hora = '13:30'`,
    [],
    function(err) {
        if (err) {
            console.error('❌ Erro ao deletar:', err.message);
        } else {
            console.log(`✅ ${this.changes} agendamentos deletados`);
        }
        process.exit();
    }
);