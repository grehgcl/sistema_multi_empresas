// ============================================
// SCRIPT PARA CRIAR SUPER ADMIN - EXECUTAR UMA VEZ
// ============================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./server/config/database');

console.log('🔄 Criando Super Admin...');

// Inicializar banco
initDatabase();

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const senhaHash = bcrypt.hashSync('super123', 10);

// 1. Deletar todos os Super Admins existentes
db.run(`DELETE FROM usuarios WHERE email = 'super@admin.com'`, [], (err) => {
    if (err) {
        console.error('❌ Erro ao deletar:', err.message);
        process.exit(1);
    }

    // 2. Verificar se o ID 1 está disponível
    db.get(`SELECT id FROM usuarios WHERE id = 1`, [], (err, existing) => {
        if (err) {
            console.error('❌ Erro ao verificar ID:', err.message);
            process.exit(1);
        }

        if (existing) {
            console.log('⚠️ ID 1 já está ocupado por:', existing);
            console.log('📝 Usando ID 9999...');

            // Inserir com ID 9999
            const sql = isProduction
                ? `INSERT INTO usuarios (nome, email, senha, role) 
                   VALUES ('Super Admin', 'super@admin.com', $1, 'superadmin')`
                : `INSERT INTO usuarios (nome, email, senha, role) 
                   VALUES ('Super Admin', 'super@admin.com', ?, 'superadmin')`;

            db.run(sql, [senhaHash], function (err) {
                if (err) {
                    console.error('❌ Erro ao criar Super Admin:', err.message);
                    process.exit(1);
                }
                console.log('✅ Super Admin criado com sucesso!');
                console.log('📧 super@admin.com');
                console.log('🔑 super123');
                process.exit(0);
            });
        } else {
            // Inserir com ID 1
            const sql = isProduction
                ? `INSERT INTO usuarios (id, nome, email, senha, role) 
                   VALUES (1, 'Super Admin', 'super@admin.com', $1, 'superadmin')`
                : `INSERT INTO usuarios (id, nome, email, senha, role) 
                   VALUES (1, 'Super Admin', 'super@admin.com', ?, 'superadmin')`;

            db.run(sql, [senhaHash], function (err) {
                if (err) {
                    console.error('❌ Erro ao criar Super Admin:', err.message);
                    process.exit(1);
                }
                console.log('✅ Super Admin criado com sucesso!');
                console.log('📧 super@admin.com');
                console.log('🔑 super123');
                process.exit(0);
            });
        }
    });
});