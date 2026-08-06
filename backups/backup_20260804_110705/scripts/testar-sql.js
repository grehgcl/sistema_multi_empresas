const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak';

console.log('🔍 TESTANDO SQL...');

const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

// Ler o arquivo SQL
const sqlPath = path.join(__dirname, '../exportacao/migracao_postgresql.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Separar os comandos
const commands = sql.split(';').filter(c => c.trim().length > 0);

console.log(`📝 ${commands.length} comandos encontrados`);

client.connect()
    .then(() => {
        console.log('✅ Conectado!\n');
        return executarComandos(client, commands, 0);
    })
    .then(() => {
        console.log('\n✅ TODOS OS COMANDOS EXECUTADOS COM SUCESSO!');
        client.end();
    })
    .catch((err) => {
        console.error('\n❌ Erro no comando:', err.message);
        if (err.message.includes('DEFAULT')) {
            console.log('\n📋 O erro está relacionado a DEFAULT expression.');
            console.log('🔧 Verifique se algum DEFAULT faz referência a outra coluna.');
        }
        client.end();
    });

async function executarComandos(client, commands, index) {
    if (index >= commands.length) return;

    const cmd = commands[index].trim() + ';';
    console.log(`\n📌 Comando ${index + 1}/${commands.length}:`);
    console.log(cmd.substring(0, 100) + '...');

    try {
        await client.query(cmd);
        console.log(`✅ Comando ${index + 1} executado`);
    } catch (err) {
        console.error(`❌ Erro no comando ${index + 1}:`, err.message);
        console.log('\n📋 Comando completo:');
        console.log(cmd);
        throw err;
    }

    await executarComandos(client, commands, index + 1);
}