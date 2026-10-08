const { getEmpresaDb } = require('./server/config/database');
const db = getEmpresaDb(14);

db.all(`
    SELECT id, servicos_extras 
    FROM agendamentos 
    WHERE servicos_extras IS NOT NULL 
      AND servicos_extras != '[]' 
      AND servicos_extras != '[object Object]'
    LIMIT 10
`, [], (e, r) => {
    if (e) console.error('Erro:', e);
    else {
        console.log(`Encontrados: ${r.length}`);
        r.forEach(row => {
            console.log(`\n--- ID ${row.id} ---`);
            console.log(row.servicos_extras);
        });
    }
});