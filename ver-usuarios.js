const { Client } = require('pg');

const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔍 VERIFICANDO USUÁRIOS NO RENDER...');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

client.connect()
    .then(() => {
        console.log('✅ Conectado!\n');
        return client.query(`
            SELECT id, nome, email, role, empresa_id, 
                   CASE WHEN senha LIKE '$2a$%' THEN '✅ Hash válido' ELSE '❌ Hash inválido' END as status_senha,
                   LEFT(senha, 20) || '...' as senha_preview
            FROM usuarios 
            ORDER BY id
        `);
    })
    .then((result) => {
        console.log('📋 USUÁRIOS NO RENDER:');
        console.log('='.repeat(70));
        result.rows.forEach(row => {
            console.log(`  ID: ${row.id} | ${row.nome} | ${row.email} | Role: ${row.role} | ${row.status_senha}`);
        });
        console.log('='.repeat(70));
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });