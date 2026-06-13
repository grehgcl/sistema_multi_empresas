const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/jonat/Documents/app_salao_na_regua/src/database/barbearia.db');

db.get('SELECT id, email, senha FROM usuarios WHERE email = ?', ['grehgcl@hotmail.com'], (err, user) => {
    if (err) {
        console.error('Erro:', err);
    } else if (user) {
        console.log('Email:', user.email);
        console.log('Hash da senha:', user.senha);
        console.log('\n⚠️ Esta é a senha criptografada. Para usar a mesma senha,');
        console.log('é necessário copiar este hash para o novo banco.');
    } else {
        console.log('Usuário não encontrado no banco antigo');
    }
    db.close();
});