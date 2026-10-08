require('dotenv').config();
const { enviarConclusao } = require('./server/services/whatsapp');

enviarConclusao({
    cliente: { nome: 'Teste Conclusao', telefone: '41999003903' },
    servico: { nome: 'Corte', valor: 50 },
    data: '2026-09-30',
    hora: '14:00',
    profissional: { nome: 'João' },
    empresa: {
        id: 14,
        nome: 'Salão da Sandra',
        endereco: 'Rua X, 123',
        telefone_dono: '(41) 997391855',
        instagram: '',
        whatsapp_instance: 'emp-14-salao-da-sandra'
    }
})
.then(r => console.log('✅ RESULTADO:', r))
.catch(e => console.error('❌ ERRO:', e));