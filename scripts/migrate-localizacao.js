// scripts/migrate-localizacao.js
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateLocalizacao() {
    console.log('🔵 Iniciando migração da tabela localizacoes...');

    try {
        await pool.connect();
        console.log('✅ Conectado ao banco');

        // Criar tabela
        const sqlCreate = `
            CREATE TABLE IF NOT EXISTS localizacoes (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL,
                empresa_id INTEGER,
                ip VARCHAR(45),
                cidade VARCHAR(100),
                estado VARCHAR(50),
                pais VARCHAR(50),
                isp VARCHAR(100),
                latitude DECIMAL(10,8),
                longitude DECIMAL(11,8),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await pool.query(sqlCreate);
        console.log('✅ Tabela localizacoes criada/verificada');

        // Criar índices
        const indices = [
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_empresa ON localizacoes(empresa_id)',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_usuario ON localizacoes(usuario_id)',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_created ON localizacoes(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_cidade ON localizacoes(cidade)',
            'CREATE INDEX IF NOT EXISTS idx_localizacoes_estado ON localizacoes(estado)'
        ];

        for (const sql of indices) {
            await pool.query(sql);
            console.log(`✅ Índice criado: ${sql.split(' ')[4]}`);
        }

        console.log('✅ Migração concluída com sucesso!');
        console.log('📊 Tabela localizacoes pronta para uso.');

    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        console.error('Detalhes:', error);
    } finally {
        await pool.end();
        console.log('🔒 Conexão fechada.');
    }
}

migrateLocalizacao();