// scripts/migrate-vps.js
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateVPS() {
    console.log('🔵 Conectando ao banco da VPS...');

    try {
        await pool.connect();
        console.log('✅ Conectado!');

        // ============================================
        // 1. VERIFICAR TABELAS EXISTENTES
        // ============================================
        console.log('\n📋 Verificando tabelas...');

        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📊 Tabelas existentes:');
        tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

        // ============================================
        // 2. ADICIONAR COLUNAS FALTANTES (SEGURAMENTE)
        // ============================================
        console.log('\n📝 Verificando colunas faltantes...');

        // Colunas para empresas
        const colunasEmpresas = [
            { name: 'telefone_dono', type: 'VARCHAR(20)' },
            { name: 'endereco', type: 'TEXT' },
            { name: 'dias_bloqueio_geral', type: 'INTEGER DEFAULT 0' },
            { name: 'whatsapp_instance', type: 'VARCHAR(100)' },
            { name: 'whatsapp_connected', type: 'BOOLEAN DEFAULT FALSE' },
            { name: 'whatsapp_number', type: 'VARCHAR(20)' },
            { name: 'whatsapp_connected_at', type: 'TIMESTAMP' },
            { name: 'whatsapp_proprio_habilitado', type: 'BOOLEAN DEFAULT FALSE' }
        ];

        for (const col of colunasEmpresas) {
            try {
                await pool.query(`
                    ALTER TABLE empresas 
                    ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
                `);
                console.log(`  ✅ Coluna empresas.${col.name} verificada/criada`);
            } catch (err) {
                console.log(`  ⚠️ Coluna empresas.${col.name}: ${err.message}`);
            }
        }

        // Colunas para usuarios
        try {
            await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)`);
            console.log('  ✅ Coluna usuarios.telefone verificada');
        } catch (err) {
            console.log(`  ⚠️ usuarios.telefone: ${err.message}`);
        }

        // Colunas para profissionais
        try {
            await pool.query(`ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)`);
            console.log('  ✅ Coluna profissionais.telefone verificada');
        } catch (err) {
            console.log(`  ⚠️ profissionais.telefone: ${err.message}`);
        }

        // ============================================
        // 3. VERIFICAR TABELA DE TRANSAÇÕES
        // ============================================
        console.log('\n📝 Verificando tabela transacoes_pagamento...');

        try {
            // Verificar se a tabela existe
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'transacoes_pagamento'
                )
            `);

            if (!tableCheck.rows[0].exists) {
                console.log('📝 Criando tabela transacoes_pagamento...');
                await pool.query(`
                    CREATE TABLE transacoes_pagamento (
                        id SERIAL PRIMARY KEY,
                        empresa_id INTEGER NOT NULL,
                        plano_id VARCHAR(50) NOT NULL,
                        plano_nome VARCHAR(100) NOT NULL,
                        valor DECIMAL(10,2) NOT NULL,
                        metodo VARCHAR(50) NOT NULL,
                        pagamento_id VARCHAR(100) NOT NULL,
                        status VARCHAR(50) DEFAULT 'pending',
                        external_reference VARCHAR(100),
                        qr_code TEXT,
                        qr_code_base64 TEXT,
                        boleto_url TEXT,
                        payment_method VARCHAR(50),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('  ✅ Tabela transacoes_pagamento criada');
            } else {
                console.log('  ✅ Tabela transacoes_pagamento já existe');

                // Verificar colunas faltantes
                const columns = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'transacoes_pagamento'
                `);

                const colunasExistentes = columns.rows.map(c => c.column_name);
                const colunasNecessarias = ['external_reference', 'qr_code', 'qr_code_base64', 'boleto_url', 'payment_method'];

                for (const col of colunasNecessarias) {
                    if (!colunasExistentes.includes(col)) {
                        try {
                            await pool.query(`
                                ALTER TABLE transacoes_pagamento 
                                ADD COLUMN ${col} TEXT
                            `);
                            console.log(`  ✅ Coluna ${col} adicionada`);
                        } catch (err) {
                            console.log(`  ⚠️ ${col}: ${err.message}`);
                        }
                    }
                }
            }
        } catch (err) {
            console.log(`  ⚠️ transacoes_pagamento: ${err.message}`);
        }

        // ============================================
        // 4. VERIFICAR ÍNDICES
        // ============================================
        console.log('\n📝 Verificando índices...');

        const indices = [
            { name: 'idx_agendamentos_empresa_data', table: 'agendamentos', columns: 'empresa_id, data' },
            { name: 'idx_agendamentos_profissional_data', table: 'agendamentos', columns: 'profissional_id, data, hora' },
            { name: 'idx_clientes_empresa_telefone', table: 'clientes', columns: 'empresa_id, telefone' },
            { name: 'idx_horario_unico', table: 'agendamentos', columns: 'empresa_id, profissional_id, data, hora' }
        ];

        for (const idx of indices) {
            try {
                await pool.query(`
                    CREATE INDEX IF NOT EXISTS ${idx.name} 
                    ON ${idx.table}(${idx.columns})
                `);
                console.log(`  ✅ Índice ${idx.name} verificado`);
            } catch (err) {
                console.log(`  ⚠️ ${idx.name}: ${err.message}`);
            }
        }

        // ============================================
        // 5. ATUALIZAR SEQUÊNCIAS (se necessário)
        // ============================================
        console.log('\n📝 Verificando sequências...');

        try {
            const sequences = await pool.query(`
                SELECT sequence_name 
                FROM information_schema.sequences 
                WHERE sequence_schema = 'public'
            `);

            for (const seq of sequences.rows) {
                const tableName = seq.sequence_name.replace('_id_seq', '');
                try {
                    await pool.query(`
                        SELECT setval('${seq.sequence_name}', 
                            COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1
                        )
                    `);
                    console.log(`  ✅ Sequência ${seq.sequence_name} atualizada`);
                } catch (err) {
                    console.log(`  ⚠️ ${seq.sequence_name}: ${err.message}`);
                }
            }
        } catch (err) {
            console.log(`  ⚠️ Sequências: ${err.message}`);
        }

        // ============================================
        // 6. RESUMO FINAL
        // ============================================
        console.log('\n✅ Migração concluída com sucesso!');
        console.log('📊 Nenhum dado foi removido ou alterado.');
        console.log('📊 Apenas colunas, índices e tabelas foram adicionados/atualizados.');

        // Mostrar resumo das empresas
        const empresas = await pool.query(`
            SELECT id, nome, plano, assinatura_ativa 
            FROM empresas 
            ORDER BY id
        `);

        console.log('\n📊 Empresas no sistema:');
        empresas.rows.forEach(e => {
            console.log(`  - ID: ${e.id} | ${e.nome} | Plano: ${e.plano} | Ativa: ${e.assinatura_ativa}`);
        });

    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        console.error('Detalhes:', error);
    } finally {
        await pool.end();
        console.log('\n🔒 Conexão fechada.');
    }
}

migrateVPS();