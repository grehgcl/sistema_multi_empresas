// carencia-planos.js
const { db } = require('./server/config/database');

console.log('\n🚀 Aplicando carência de 30 dias...\n');

// 1. PRIMEIRO: mostrar quais empresas seriam afetadas
db.all(
    `SELECT id, nome, plano, trial_expira, assinatura_valida_ate 
     FROM empresas 
     WHERE (plano IN ('trial', 'Trial') AND (trial_expira IS NULL OR date(trial_expira) < date('now')))
        OR (plano NOT IN ('trial', 'Trial') AND (assinatura_valida_ate IS NULL OR date(assinatura_valida_ate) < date('now')))
     ORDER BY id`,
    [],
    (err, afetadas) => {
        if (err) {
            console.error('❌ Erro:', err.message);
            process.exit(1);
        }

        console.log(`📋 Empresas que serão atualizadas: ${afetadas.length}`);
        afetadas.forEach(e => {
            console.log(`   [${e.id}] ${e.nome} (plano: ${e.plano})`);
        });
        console.log('');

        // 2. UPDATE trials
        db.run(
            `UPDATE empresas 
             SET trial_expira = date('now', '+30 days')
             WHERE plano IN ('trial', 'Trial') 
               AND (trial_expira IS NULL OR date(trial_expira) < date('now'))`,
            [],
            (err, result) => {
                if (err) console.error('❌ Erro trial:', err.message);
                else console.log(`✅ Trials atualizados: ${result?.changes || 0} empresa(s)`);

                // 3. UPDATE assinaturas
                db.run(
                    `UPDATE empresas 
                     SET assinatura_valida_ate = date('now', '+30 days')
                     WHERE plano NOT IN ('trial', 'Trial')
                       AND (assinatura_valida_ate IS NULL OR date(assinatura_valida_ate) < date('now'))`,
                    [],
                    (err2, result2) => {
                        if (err2) console.error('❌ Erro assinatura:', err2.message);
                        else console.log(`✅ Assinaturas atualizadas: ${result2?.changes || 0} empresa(s)`);

                        // 4. Estado final
                        db.all(
                            `SELECT id, nome, plano, trial_expira, assinatura_valida_ate 
                             FROM empresas ORDER BY id`,
                            [],
                            (err3, rows) => {
                                if (err3) return console.error(err3);
                                
                                console.log('\n═══════════════════════════════════');
                                console.log('📊 ESTADO APÓS CARÊNCIA');
                                console.log('═══════════════════════════════════\n');
                                
                                rows.forEach(e => {
                                    console.log(`[${e.id}] ${e.nome}`);
                                    console.log(`     Plano: ${e.plano}`);
                                    console.log(`     Trial expira: ${e.trial_expira || 'n/a'}`);
                                    console.log(`     Assin. válida: ${e.assinatura_valida_ate || 'n/a'}`);
                                    console.log('');
                                });
                                
                                process.exit(0);
                            }
                        );
                    }
                );
            }
        );
    }
);
