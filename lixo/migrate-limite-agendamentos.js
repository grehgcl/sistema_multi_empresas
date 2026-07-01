// scripts/migrate-limite-agendamentos.js
// Migração para adicionar colunas de limite de agendamentos

const { db } = require('../server/config/database');
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

async function migrate() {
    console.log('📝 Adicionando colunas de limite de agendamentos...');
    console.log(`📌 Ambiente: ${isProduction ? 'POSTGRESQL (Render)' : 'SQLITE (Local)'}`);

    try {
        // Adicionar coluna agendamentos_mes
        try {
            const sql1 = isProduction
                ? `ALTER TABLE empresas ADD COLUMN agendamentos_mes INTEGER DEFAULT 0`
                : `ALTER TABLE empresas ADD COLUMN agendamentos_mes INTEGER DEFAULT 0`;

            await new Promise((resolve, reject) => {
                db.run(sql1, [], (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('❌ Erro ao adicionar agendamentos_mes:', err.message);
                    } else if (err && err.message.includes('duplicate column name')) {
                        console.log('✅ Coluna agendamentos_mes já existe');
                    } else {
                        console.log('✅ Coluna agendamentos_mes adicionada');
                    }
                    resolve();
                });
            });
        } catch (e) {
            console.log('⚠️ Coluna agendamentos_mes já existe ou erro:', e.message);
        }

        // Adicionar coluna mes_referencia
        try {
            const sql2 = isProduction
                ? `ALTER TABLE empresas ADD COLUMN mes_referencia VARCHAR(7)`
                : `ALTER TABLE empresas ADD COLUMN mes_referencia TEXT`;

            await new Promise((resolve, reject) => {
                db.run(sql2, [], (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('❌ Erro ao adicionar mes_referencia:', err.message);
                    } else if (err && err.message.includes('duplicate column name')) {
                        console.log('✅ Coluna mes_referencia já existe');
                    } else {
                        console.log('✅ Coluna mes_referencia adicionada');
                    }
                    resolve();
                });
            });
        } catch (e) {
            console.log('⚠️ Coluna mes_referencia já existe ou erro:', e.message);
        }

        // Inicializar mês atual para todas as empresas
        const mesAtual = new Date().toISOString().slice(0, 7);
        const sqlInit = isProduction
            ? `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = $1 WHERE mes_referencia IS NULL`
            : `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = ? WHERE mes_referencia IS NULL`;

        await new Promise((resolve, reject) => {
            db.run(sqlInit, [mesAtual], (err) => {
                if (err) {
                    console.error('❌ Erro ao inicializar contadores:', err.message);
                } else {
                    console.log(`✅ Contadores inicializados para o mês ${mesAtual}`);
                }
                resolve();
            });
        });

        console.log('✅ Migração concluída com sucesso!');
        console.log('📊 Limite de 100 agendamentos/mês para Starter ativado!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    }
}

// Executar se for chamado diretamente
if (require.main === module) {
    migrate();
}

module.exports = { migrate };