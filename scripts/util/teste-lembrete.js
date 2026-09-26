require('dotenv').config();

// 1. Verifica se a função foi exportada
const whatsapp = require('./server/services/whatsapp');
console.log('🧪 Funções exportadas:', Object.keys(whatsapp));
console.log('🧪 enviarLembrete existe?', typeof whatsapp.enviarLembrete === 'function');

// 2. Se existir, testa chamando com dados fake
if (typeof whatsapp.enviarLembrete === 'function') {
    console.log('\n🧪 Testando enviarLembrete com dados fake...\n');

whatsapp.enviarLembrete({
    cliente: { nome: 'Jonathan Teste', telefone: '41999003903' },
    servico: { nome: 'Corte de Cabelo' },
    profissional: { nome: 'João' },
    data: '2026-09-13',
    hora: '14:00',
    empresa: { nome: 'Salão da Sandra', id: 14 }
}).then(r => {
    console.log('\n🧪 Resultado:', r);
});
} else {
    console.log('\n❌ enviarLembrete NÃO foi exportada — falta adicionar no module.exports');
}