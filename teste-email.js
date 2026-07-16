// teste-email.js
const nodemailer = require('nodemailer');
console.log('✅ Nodemailer carregado!');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'digregorioleal@gmail.com',
        pass: 'ctty uthm xxul xgig'
    }
});

console.log('✅ Transporter criado!');

transporter.sendMail({
    from: '"See&Agende" <digregorioleal@gmail.com>',
    to: 'digregorioleal@gmail.com',
    subject: 'Teste Nodemailer',
    text: 'Teste de email funcionando!'
})
    .then(() => console.log('✅ Email enviado com sucesso!'))
    .catch(err => console.error('❌ Erro:', err.message));