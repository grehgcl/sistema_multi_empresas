// scripts/fix-bloqueio-geral.js
const { db, initDatabase } = require('../server/config/database');

async function fixBloqueioGeral() {
    console.log('🔧 Iniciando correção do bloqueio geral...');

    await initDatabase();

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (isProduction) {
        // PostgreSQL
        console.log('📝 Verificando coluna no PostgreSQL...');

        db.get(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_name = 'empresas' 
             AND column_name = 'dias_bloqueio_geral'`,
            [],
            (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar:', err.message);
                    process.exit(1);
                }

                if (!row) {
                    console.log('📝 Criando coluna...');
                    db.run(
                        `ALTER TABLE empresas ADD COLUMN dias_bloqueio_geral INTEGER DEFAULT 0`,
                        [],
                        (err) => {
                            if (err) {
                                console.error('❌ Erro ao criar coluna:', err.message);
                                process.exit(1);
                            }
                            console.log('✅ Coluna criada!');
                            atualizarEmpresas();
                        }
                    );
                } else {
                    console.log('✅ Coluna já existe!');
                    atualizarEmpresas();
                }
            }
        );
    } else {
        // SQLite
        console.log('📝 Verificando coluna no SQLite...');

        db.all(`PRAGMA table_info(empresas)`, [], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao verificar:', err.message);
                process.exit(1);
            }

            const existe = rows.some(r => r.name === 'dias_bloqueio_geral');

            if (!existe) {
                console.log('📝 Criando coluna...');
                db.run(
                    `ALTER TABLE empresas ADD COLUMN dias_bloqueio_geral INTEGER DEFAULT 0`,
                    [],
                    (err) => {
                        if (err) {
                            console.error('❌ Erro ao criar coluna:', err.message);
                            process.exit(1);
                        }
                        console.log('✅ Coluna criada!');
                        atualizarEmpresas();
                    }
                );
            } else {
                console.log('✅ Coluna já existe!');
                atualizarEmpresas();
            }
        });
    }

    function atualizarEmpresas() {
        console.log('📝 Atualizando empresas existentes...');

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET dias_bloqueio_geral = 0 WHERE dias_bloqueio_geral IS NULL`
            : `UPDATE empresas SET dias_bloqueio_geral = 0 WHERE dias_bloqueio_geral IS NULL`;

        db.run(sqlUpdate, [], (err) => {
            if (err) {
                console.error('❌ Erro ao atualizar empresas:', err.message);
                process.exit(1);
            }

            console.log('✅ Empresas atualizadas!');

            // Verificar
            const sqlCheck = isProduction
                ? `SELECT id, nome, dias_bloqueio_geral FROM empresas`
                : `SELECT id, nome, dias_bloqueio_geral FROM empresas`;

            db.all(sqlCheck, [], (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao verificar:', err.message);
                } else {
                    console.log('📋 Empresas:', rows);
                }
                process.exit(0);
            });
        });
    }
}

fixBloqueioGeral();