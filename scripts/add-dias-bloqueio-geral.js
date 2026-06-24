// scripts/add-dias-bloqueio-geral.js
const { db, isProduction } = require('../server/config/database');

console.log('🔄 Adicionando coluna dias_bloqueio_geral no banco...');
console.log('📌 Ambiente:', isProduction ? 'PRODUÇÃO (PostgreSQL)' : 'DESENVOLVIMENTO (SQLite)');

const sql = isProduction
    ? `ALTER TABLE empresas ADD COLUMN IF NOT EXISTS dias_bloqueio_geral INTEGER DEFAULT 0`
    : `ALTER TABLE empresas ADD COLUMN dias_bloqueio_geral INTEGER DEFAULT 0`;

db.run(sql, [], (err) => {
    if (err) {
        console.error('❌ Erro ao adicionar coluna:', err.message);

        // Tentar sem IF NOT EXISTS (PostgreSQL mais antigo)
        if (isProduction) {
            console.log('🔄 Tentando sem IF NOT EXISTS...');
            const sql2 = `ALTER TABLE empresas ADD COLUMN dias_bloqueio_geral INTEGER DEFAULT 0`;
            db.run(sql2, [], (err2) => {
                if (err2 && !err2.message.includes('already exists')) {
                    console.error('❌ Erro novamente:', err2.message);
                } else {
                    console.log('✅ Coluna adicionada!');
                    verificar();
                }
            });
        }
        return;
    }
    console.log('✅ Coluna adicionada!');
    verificar();
});

function verificar() {
    const sqlCheck = isProduction
        ? `SELECT column_name FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'dias_bloqueio_geral'`
        : `PRAGMA table_info(empresas)`;

    db.all(sqlCheck, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao verificar:', err.message);
        } else {
            const existe = rows && rows.length > 0;
            console.log('📋 Coluna existe?', existe);
            if (existe) {
                console.log('✅ dias_bloqueio_geral adicionada com sucesso!');
            }
        }
        console.log('✅ Migração concluída!');
    });
}

