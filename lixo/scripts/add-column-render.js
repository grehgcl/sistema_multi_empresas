// scripts/add-column-render.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://barbearia_user:ONbH4P88z6wV6QdJOW5ZfAcdxgZafnCq@dpg-d8omuac8aovs7384fbo0-a.oregon-postgres.render.com/barbearia_noak',
    ssl: { rejectUnauthorized: false }
});

async function addColumn() {
    try {
        console.log('🔄 Conectando ao banco do Render...');

        // Verificar se a coluna existe
        const check = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'clientes' 
            AND column_name = 'dias_bloqueio'
        `);

        if (check.rows.length > 0) {
            console.log('✅ Coluna dias_bloqueio já existe!');
        } else {
            console.log('📝 Criando coluna dias_bloqueio...');
            await pool.query(`
                ALTER TABLE clientes ADD COLUMN dias_bloqueio INTEGER DEFAULT 1
            `);
            console.log('✅ Coluna criada!');
        }

        // Atualizar
        await pool.query(`
            UPDATE clientes SET dias_bloqueio = 1 WHERE dias_bloqueio IS NULL
        `);
        console.log('✅ Clientes atualizados!');

        // Verificar
        const result = await pool.query(`
            SELECT id, nome, dias_bloqueio FROM clientes LIMIT 5
        `);
        console.log('📋 Clientes:');
        result.rows.forEach(row => {
            console.log(`  - ID: ${row.id}, Nome: ${row.nome}, Dias: ${row.dias_bloqueio}`);
        });

        console.log('✅ Correção concluída!');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await pool.end();
    }
}

addColumn();