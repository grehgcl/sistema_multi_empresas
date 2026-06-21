// test-whatsapp.js
const whatsapp = require('./server/services/whatsapp');

async function test() {
    console.log('🧪 Testando WhatsApp...');

    const result = await whatsapp.send(
        '41997391855',
        '🧪 Teste do WhatsApp via Node!'
    );

    console.log('📨 Resultado:', result);
}

test();