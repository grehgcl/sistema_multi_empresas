const { Client } = require('pg');

const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('📊 VERIFICANDO DADOS NO BANCO DO RENDER...');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log('✅ Conectado!\n');
        return client.query(`
            SELECT 'empresas' as tabela, COUNT(*) as total FROM empresas
            UNION ALL
            SELECT 'usuarios', COUNT(*) FROM usuarios
            UNION ALL
            SELECT 'profissionais', COUNT(*) FROM profissionais
            UNION ALL
            SELECT 'clientes', COUNT(*) FROM clientes
            UNION ALL
            SELECT 'servicos', COUNT(*) FROM servicos
            UNION ALL
            SELECT 'agendamentos', COUNT(*) FROM agendamentos
            UNION ALL
            SELECT 'despesas', COUNT(*) FROM despesas
            UNION ALL
            SELECT 'horarios_funcionamento', COUNT(*) FROM horarios_funcionamento
            UNION ALL
            SELECT 'planos_historico', COUNT(*) FROM planos_historico
            UNION ALL
            SELECT 'transacoes_pagamento', COUNT(*) FROM transacoes_pagamento
            UNION ALL
            SELECT 'acessos', COUNT(*) FROM acessos
            ORDER BY tabela;
        `);
    })
    .then((result) => {
        console.log('📋 QUANTIDADE DE REGISTROS:');
        console.log('='.repeat(40));
        result.rows.forEach(row => {
            console.log(`  ${row.tabela.padEnd(25)} ${String(row.total).padStart(6)} registros`);
        });
        console.log('='.repeat(40));
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });