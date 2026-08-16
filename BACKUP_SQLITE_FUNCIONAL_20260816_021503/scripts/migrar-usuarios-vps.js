const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function migrarUsuarios() {
    try {
        console.log('🔄 Verificando usuários...');

        // 1. Verificar se tem empresas
        const empresas = await pool.query('SELECT id, nome FROM empresas');
        console.log('📊 Empresas encontradas:', empresas.rows.length);
        if (empresas.rows.length === 0) {
            console.log('❌ Nenhuma empresa cadastrada!');
            return;
        }

        // 2. Verificar usuários
        const usuarios = await pool.query('SELECT id, email, empresa_id FROM usuarios');
        console.log('👤 Usuários encontrados:', usuarios.rows.length);

        if (usuarios.rows.length > 0) {
            console.log('✅ Usuários já existem, pulando...');
            return;
        }

        // 3. Criar usuário para a empresa 14
        const senhaHash = bcrypt.hashSync('123456', 10);
        await pool.query(`
      INSERT INTO usuarios (nome, email, senha, role, empresa_id, telefone)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['Admin Salão Sandra', 'luziasandraleal@hotmail.com', senhaHash, 'dono', 14, '4199003903']);

        console.log('✅ Usuário criado: luziasandraleal@hotmail.com / 123456');

        // 4. Criar Super Admin
        const superHash = bcrypt.hashSync('super123', 10);
        await pool.query(`
      INSERT INTO usuarios (nome, email, senha, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Super Admin', 'super@admin.com', superHash, 'superadmin']);

        console.log('✅ Super Admin: super@admin.com / super123');

        console.log('✅ MIGRAÇÃO CONCLUÍDA!');
        console.log('   👤 dono: luziasandraleal@hotmail.com / 123456');
        console.log('   👑 super: super@admin.com / super123');

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        pool.end();
    }
}

migrarUsuarios();