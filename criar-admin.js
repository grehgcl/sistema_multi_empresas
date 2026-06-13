const bcrypt = require('bcryptjs');
const db = require('./database/db');

const senhaHash = bcrypt.hashSync('admin123', 10);

// Primeiro, criar uma empresa padrão se não existir
db.run(`INSERT OR IGNORE INTO empresas (id, nome, plano) VALUES (1, 'Barbearia Principal', 'gratuito')`, (err) => {
    if (err) console.error('Erro ao criar empresa:', err);
    
    // Criar usuário admin
    db.run(`
        INSERT OR IGNORE INTO usuarios (nome, email, senha, role, empresa_id) 
        VALUES (?, ?, ?, ?, ?)
    `, ['Admin', 'admin@barbearia.com', senhaHash, 'admin', 1], (err) => {
        if (err) {
            console.error('Erro ao criar admin:', err);
        } else {
            console.log('✅ Usuário admin criado com sucesso!');
            console.log('📧 Email: admin@barbearia.com');
            console.log('🔑 Senha: admin123');
        }
        
        // Verificar se criou
        db.get(`SELECT * FROM usuarios WHERE email = 'admin@barbearia.com'`, (err, user) => {
            if (user) {
                console.log('✅ Usuário encontrado no banco:', user.nome);
            }
            db.close();
        });
    });
});