const { Client } = require('pg');

const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔍 TESTANDO ROTA DE DESPESAS...');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log('✅ Conectado!\n');

        // Testar a query de despesas
        return client.query(`
            SELECT d.*
            FROM despesas d
            WHERE d.empresa_id = $1
            ORDER BY d.data DESC, d.created_at DESC
        `, [3]);
    })
    .then((result) => {
        console.log('📋 DESPESAS ENCONTRADAS:');
        console.log('='.repeat(60));
        if (result.rows.length === 0) {
            console.log('   Nenhuma despesa encontrada');
        } else {
            result.rows.forEach(row => {
                console.log(`   ${row.descricao}: R$ ${row.valor} (${row.pago ? 'Pago' : 'Pendente'})`);
            });
        }
        console.log('='.repeat(60));
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });