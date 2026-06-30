const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/barbearia.db');

// Usar a mesma senha que estava no sistema antigo ou definir uma nova
// Vou definir como 'admin123' para teste
const senhaHash = bcrypt.hashSync('admin123', 10);

console.log('🔧 Adicionando usuário grehgcl...');

db.run(`
    INSERT OR REPLACE INTO usuarios (id, nome, email, senha, role, comissao_percentual, empresa_id, ativo)
    VALUES (5, 'Gregorio Costa Leal', 'grehgcl@hotmail.com', ?, 'admin', 0, 2, 1)
`, [senhaHash], function(err) {
    if (err) {
        console.error('❌ Erro:', err.message);
    } else {
        console.log('✅ Usuário grehgcl adicionado com sucesso!');
        console.log('📧 Email: grehgcl@hotmail.com');
        console.log('🔑 Senha: admin123');
    }
    
    // Verificar se foi adicionado
    db.get('SELECT id, nome, email, role FROM usuarios WHERE email = ?', ['grehgcl@hotmail.com'], (err, user) => {
        if (err) {
            console.error('Erro na verificação:', err);
        } else if (user) {
            console.log('✅ Verificado:', user.nome, '- Role:', user.role, '- ID:', user.id);
        } else {
            console.log('❌ Usuário não encontrado');
        }
        
        // Listar todos os usuários
        db.all('SELECT id, nome, email, role FROM usuarios', (err, users) => {
            console.log('\n📋 Todos os usuários no sistema:');
            users.forEach(u => {
                console.log(`   ${u.id} - ${u.nome} (${u.email}) - ${u.role}`);
            });
            db.close();
        });
    });
});