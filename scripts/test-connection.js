const { Client } = require('pg');

// 🔥 CONEXÃO COMPLETA - HOST CORRETO
const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔍 Testando conexão com o PostgreSQL do Render...');
console.log(`📡 Host: dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com`);

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log('✅ Conectado com sucesso!');
        return client.query('SELECT version() as versao, NOW() as horario');
    })
    .then((result) => {
        console.log('📊 Versão do PostgreSQL:', result.rows[0].versao);
        console.log('🕐 Horário do servidor:', result.rows[0].horario);

        // Listar tabelas
        return client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
    })
    .then((result) => {
        console.log('\n📋 TABELAS EXISTENTES:');
        if (result.rows.length === 0) {
            console.log('   ⚠️ Nenhuma tabela encontrada. Banco vazio!');
        } else {
            result.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
        }
        console.log(`\n📊 Total: ${result.rows.length} tabelas`);
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        console.error('Detalhes:', err.stack);
        client.end();
    });