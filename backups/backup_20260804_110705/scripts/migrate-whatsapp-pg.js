const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

console.log('🔄 Migrando campos WhatsApp para PostgreSQL...');
console.log('🔗 Conectando ao PostgreSQL com SSL...');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Necessário para Render
    }
});

async function migrar() {
    try {
        // Testar conexão
        await pool.query('SELECT NOW()');
        console.log('✅ Conexão com PostgreSQL estabelecida!');

        // Verificar se as colunas já existem
        const { rows } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'empresas'
    `);

        const colunasExistentes = rows.map(r => r.column_name);
        console.log(`📊 Colunas atuais na tabela empresas: ${colunasExistentes.length}`);

        const colunas = [
            { nome: 'whatsapp_instance', tipo: 'VARCHAR(100)' },
            { nome: 'whatsapp_connected', tipo: 'BOOLEAN DEFAULT FALSE' },
            { nome: 'whatsapp_number', tipo: 'VARCHAR(20)' },
            { nome: 'whatsapp_connected_at', tipo: 'TIMESTAMP' }
        ];

        let adicionadas = 0;
        let existentes = 0;

        for (const coluna of colunas) {
            if (colunasExistentes.includes(coluna.nome)) {
                console.log(`⚠️  ${coluna.nome} já existe`);
                existentes++;
                continue;
            }

            const sql = `ALTER TABLE empresas ADD COLUMN ${coluna.nome} ${coluna.tipo}`;
            await pool.query(sql);
            console.log(`✅ ${coluna.nome} adicionado`);
            adicionadas++;
        }

        console.log('\n✨ Migração PostgreSQL concluída!');
        console.log(`📊 Resumo: ${adicionadas} adicionadas, ${existentes} já existiam`);

        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.code === '28P01') {
            console.error('💡 Erro de autenticação. Verifique o DATABASE_URL no .env.local');
        } else if (error.code === 'ENOTFOUND') {
            console.error('💡 Host não encontrado. Verifique o DATABASE_URL no .env.local');
        }
        await pool.end();
        process.exit(1);
    }
}

migrar();