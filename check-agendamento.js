// check-agendamento.js
const { db } = require('./server/config/database');

console.log('🔍 Verificando agendamentos para 2026-09-01 13:30...');

db.all(
    `SELECT * FROM agendamentos WHERE data = '2026-09-01' AND hora = '13:30'`,
    [],
    (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err.message);
            return;
        }
        
        console.log(`📋 ${rows.length} agendamentos encontrados:`);
        console.log(JSON.stringify(rows, null, 2));
        
        process.exit();
    }
);