const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔑 ATUALIZANDO SENHAS NO RENDER...');
console.log('='.repeat(60));

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// ============================================
// LISTA DE USUÁRIOS COM SUAS SENHAS
// ============================================
const usuarios = [
    { email: 'admin@teste.com', senha: '123456' },
    { email: 'super@admin.com', senha: 'super123' },
    { email: 'grehgcl@hotmail.com', senha: '123456' },
    { email: 'digregorioleal@gmail.com', senha: '123456' },
    { email: 'edson@gmail.com', senha: '123456' },
    { email: 'luziasandraleal@hotmail.com', senha: '123456' },
    { email: 'luisfelipe@gmail.com', senha: '123456' }
];

client.connect()
    .then(() => {
        console.log('✅ Conectado ao banco do Render!\n');

        let atualizados = 0;
        let naoEncontrados = 0;
        const promises = usuarios.map((user) => {
            const senhaHash = bcrypt.hashSync(user.senha, 10);
            console.log(`📝 Atualizando: ${user.email}`);
            console.log(`   Nova hash: ${senhaHash.substring(0, 30)}...`);

            return client.query(
                `UPDATE usuarios SET senha = $1 WHERE email = $2 RETURNING id, nome, email`,
                [senhaHash, user.email]
            ).then((result) => {
                if (result.rows.length > 0) {
                    console.log(`   ✅ ${user.email} atualizado! (${result.rows[0].nome})`);
                    atualizados++;
                } else {
                    console.log(`   ⚠️ Usuário não encontrado: ${user.email}`);
                    naoEncontrados++;
                }
                console.log('');
            });
        });

        return Promise.all(promises).then(() => {
            console.log('='.repeat(60));
            console.log(`✅ ${atualizados} senhas atualizadas`);
            if (naoEncontrados > 0) {
                console.log(`⚠️ ${naoEncontrados} usuários não encontrados`);
            }

            // Verificar novamente
            return client.query(`
                SELECT id, nome, email, role, empresa_id,
                       CASE WHEN senha LIKE '$2a$%' THEN '✅ Válido' ELSE '❌ Inválido' END as status_senha
                FROM usuarios 
                ORDER BY id
            `);
        });
    })
    .then((result) => {
        console.log('\n📋 USUÁRIOS NO RENDER (APÓS ATUALIZAÇÃO):');
        console.log('='.repeat(70));
        result.rows.forEach(row => {
            console.log(`  ID: ${row.id} | ${row.email} | Role: ${row.role} | ${row.status_senha}`);
        });
        console.log('='.repeat(70));
        console.log('\n✅ Processo concluído! Agora teste o login.');
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });