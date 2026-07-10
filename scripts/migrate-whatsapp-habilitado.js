const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

console.log('🔄 Adicionando campo whatsapp_proprio_habilitado...');

async function migrar() {
    try {
        // Adicionar coluna de controle do Super Admin
        await pool.query(`
      ALTER TABLE empresas 
      ADD COLUMN IF NOT EXISTS whatsapp_proprio_habilitado BOOLEAN DEFAULT FALSE
    `);
        console.log('✅ whatsapp_proprio_habilitado adicionado');

        // Habilitar automaticamente para Business e Enterprise
        const { rowCount } = await pool.query(`
      UPDATE empresas 
      SET whatsapp_proprio_habilitado = TRUE 
      WHERE plano IN ('Business', 'Enterprise')
    `);
        console.log(`✅ ${rowCount} empresas Business/Enterprise habilitadas automaticamente`);

        await pool.end();
        console.log('\n✨ Migração concluída!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
        process.exit(1);
    }
}

migrar();