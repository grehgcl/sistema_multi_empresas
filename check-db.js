// check-db.js - Verificar dados do banco
const { db } = require('./server/config/database');

console.log('📊 VERIFICANDO AGENDAMENTOS');
console.log('====================================');

// Ver os últimos 5 agendamentos
db.all('SELECT id, data, hora, cliente_id FROM agendamentos ORDER BY id DESC LIMIT 5', (err, rows) => {
    if (err) {
        console.error('❌ Erro:', err);
        return;
    }

    if (rows.length === 0) {
        console.log('❌ Nenhum agendamento encontrado');
    } else {
        console.log('✅ Últimos agendamentos:');
        rows.forEach(row => {
            console.log(`  ID: ${row.id} | Data: ${row.data} | Hora: ${row.hora} | Cliente: ${row.cliente_id}`);
        });
    }

    console.log('\n====================================');

    // Ver a estrutura da tabela
    db.all('PRAGMA table_info(agendamentos)', (err, columns) => {
        if (err) {
            console.error('❌ Erro:', err);
            return;
        }
        console.log('📋 Estrutura da tabela agendamentos:');
        columns.forEach(col => {
            console.log(`  ${col.name} (${col.type})`);
        });

        console.log('\n✅ Verificação concluída!');
        process.exit(0);
    });
});