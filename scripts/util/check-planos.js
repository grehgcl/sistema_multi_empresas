// check-planos.js
// Mostra o estado dos planos de todas as empresas

const { db } = require('./server/config/database');

db.all(
    'SELECT id, nome, plano, trial_expira, assinatura_ativa, assinatura_valida_ate FROM empresas ORDER BY id',
    [],
    (err, rows) => {
        if (err) {
            console.error('❌ Erro:', err.message);
            process.exit(1);
        }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('📋 PLANOS E ASSINATURAS DAS EMPRESAS');
        console.log('═══════════════════════════════════════════════════════════\n');

        if (!rows || rows.length === 0) {
            console.log('⚠️ Nenhuma empresa encontrada.');
            process.exit(0);
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let ativas = 0;
        let trialValido = 0;
        let trialExpirado = 0;
        let assinaturaExpirada = 0;

        rows.forEach(e => {
            const status = [];

            if (e.plano === 'trial') {
                if (!e.trial_expira) {
                    status.push('❌ SEM DATA');
                    trialExpirado++;
                } else {
                    const expira = new Date(e.trial_expira);
                    if (expira < hoje) {
                        status.push('❌ TRIAL EXPIRADO');
                        trialExpirado++;
                    } else {
                        const dias = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
                        status.push(`⏳ Trial (${dias}d restantes)`);
                        trialValido++;
                    }
                }
            } else {
                if (!e.assinatura_ativa) {
                    status.push('❌ INATIVA');
                    assinaturaExpirada++;
                } else if (e.assinatura_valida_ate) {
                    const valida = new Date(e.assinatura_valida_ate);
                    if (valida < hoje) {
                        status.push('❌ ASSINATURA VENCIDA');
                        assinaturaExpirada++;
                    } else {
                        const dias = Math.ceil((valida - hoje) / (1000 * 60 * 60 * 24));
                        status.push(`✅ Ativa (${dias}d restantes)`);
                        ativas++;
                    }
                } else {
                    status.push('✅ Ativa');
                    ativas++;
                }
            }

            console.log(`[${e.id}] ${e.nome}`);
            console.log(`     Plano: ${e.plano}`);
            console.log(`     Trial expira: ${e.trial_expira || 'n/a'}`);
            console.log(`     Assinatura ativa: ${e.assinatura_ativa ? 'Sim' : 'Não'}`);
            console.log(`     Assinatura válida até: ${e.assinatura_valida_ate || 'n/a'}`);
            console.log(`     Status: ${status.join(' · ')}`);
            console.log('');
        });

        console.log('═══════════════════════════════════════════════════════════');
        console.log('📊 RESUMO');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`✅ Assinaturas ativas:    ${ativas}`);
        console.log(`⏳ Trials válidos:        ${trialValido}`);
        console.log(`❌ Trials expirados:      ${trialExpirado}`);
        console.log(`❌ Assinaturas vencidas:  ${assinaturaExpirada}`);
        console.log(`📊 Total:                 ${rows.length}`);
        console.log('');

        process.exit(0);
    }
);