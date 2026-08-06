// scripts/migrate-pagamento-pg.js
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('🔵 Conectando ao PostgreSQL...');
        await pool.connect();

        // Verificar se a coluna existe
        const checkResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'transacoes_pagamento' 
            AND column_name = 'external_reference'
        `);

        if (checkResult.rows.length === 0) {
            console.log('📝 Adicionando coluna external_reference...');
            await pool.query(`
                ALTER TABLE transacoes_pagamento 
                ADD COLUMN external_reference VARCHAR(100)
            `);
            console.log('✅ Coluna external_reference adicionada com sucesso!');
        } else {
            console.log('✅ Coluna external_reference já existe!');
        }

        // Verificar a estrutura da tabela
        const tableResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'transacoes_pagamento' 
            ORDER BY ordinal_position
        `);
        console.log('📋 Estrutura da tabela:');
        tableResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

migrate();