const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./database/barbearia.db');

const senhaHash = bcrypt.hashSync('super123', 10);

db.run("INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, empresa_id) VALUES (999, 'Super Admin', 'super@admin.com', ?, 'superadmin', NULL)", 
    [senhaHash], (err) => {
    if (err) console.log('Erro:', err.message);
    else console.log('✅ Super Admin criado!');
    console.log('📧 Email: super@admin.com');
    console.log('🔑 Senha: super123');
    db.close();
});
