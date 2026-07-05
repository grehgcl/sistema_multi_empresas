const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔑 TESTANDO LOGIN NO RENDER...');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Email e senha para testar
const testEmail = 'digregorioleal@gmail.com';
const testSenha = '123456';

client.connect()
    .then(() => {
        console.log('✅ Conectado!\n');
        console.log(`📝 Testando login para: ${testEmail}`);

        return client.query(`
            SELECT id, nome, email, senha, role, empresa_id
            FROM usuarios 
            WHERE email = $1
        `, [testEmail]);
    })
    .then((result) => {
        if (result.rows.length === 0) {
            console.log('❌ Usuário não encontrado!');
            client.end();
            return;
        }

        const user = result.rows[0];
        console.log(`✅ Usuário encontrado: ${user.nome} (ID: ${user.id})`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Empresa ID: ${user.empresa_id}`);
        console.log(`   Hash da senha: ${user.senha.substring(0, 30)}...`);

        // Verificar a senha
        const senhaCorreta = bcrypt.compareSync(testSenha, user.senha);
        if (senhaCorreta) {
            console.log('✅ SENHA CORRETA! Login funcionaria.');
        } else {
            console.log('❌ SENHA INCORRETA!');
        }

        // Verificar se a empresa existe
        if (user.empresa_id) {
            return client.query(`SELECT id, nome FROM empresas WHERE id = $1`, [user.empresa_id]);
        } else {
            return Promise.resolve(null);
        }
    })
    .then((empresaResult) => {
        if (empresaResult && empresaResult.rows.length > 0) {
            console.log(`✅ Empresa encontrada: ${empresaResult.rows[0].nome} (ID: ${empresaResult.rows[0].id})`);
        } else if (empresaResult) {
            console.log('❌ Empresa NÃO encontrada!');
        }
        console.log('\n✅ Teste concluído!');
        client.end();
    })
    .catch((err) => {
        console.error('❌ Erro:', err.message);
        client.end();
    });