const { createClient } = require('@libsql/client');

const client = createClient({
    url: 'libsql://seeagende-grehgcl.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODY5NDA5MjAsImlkIjoiMDFhMDBkZjUtMzAwMS03Zjc2LWE2OWYtODczNjhhNTg3MDJjIiwia2lkIjoiTTZQbng0ZkJ2UmFmakJmY0lGSFlEbXZXSFQxcmFlRmZWSUl3NUFYQ2dFMCIsInJpZCI6IjdhNjAxNzMxLWQwMWEtNDRlYS05NDdmLWNjYTg1MTg0MDU4NyJ9.bq_lxtwb5FjBjCLh-JADppzlT361geSMo0-Ti0gWOXlZgQCpPGf_F-q-cSUhRK_6r11sD5R_-yKt4xluh9LVAQ'
});

console.log('🔄 Conectando ao Turso...');

client.execute('SELECT 1')
    .then(() => {
        console.log('✅ Turso conectado com sucesso!');
        console.log('📡 URL:', client.url);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Erro:', err.message);
        if (err.message.includes('401')) {
            console.log('⚠️ Token inválido. Gere um novo token no painel.');
        }
        if (err.message.includes('404')) {
            console.log('⚠️ Banco não encontrado. Verifique a URL.');
        }
        process.exit(1);
    });