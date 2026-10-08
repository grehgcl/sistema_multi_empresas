// teste-lembrete.js
require('dotenv').config();
const job = require('./server/jobs/lembretes');

console.log('Rodando job manualmente...\n');

job.enviarLembretes()
    .then(() => {
        console.log('\n✅ Fim.');
        process.exit(0);
    })
    .catch(e => {
        console.error('\n❌ Erro:', e);
        process.exit(1);
    });