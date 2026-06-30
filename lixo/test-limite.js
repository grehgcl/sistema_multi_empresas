// test-limite.js - VERSÃO CORRIGIDA
const { db } = require('./server/config/database');

console.log('🔍 VERIFICANDO LIMITE DE AGENDAMENTOS');
console.log('='.repeat(50));

db.all('SELECT id, nome, plano, agendamentos_mes, mes_referencia FROM empresas', [], (err, empresas) => {
    if (err) {
        console.error('❌ Erro:', err);
        return;
    }

    console.log(`📊 ${empresas.length} empresas encontradas:\n`);

    for (const empresa of empresas) {
        // 🔥 CORREÇÃO: Usar toLowerCase() para comparar
        const planoLower = (empresa.plano || '').toLowerCase();
        const temLimite = (planoLower === 'starter' || planoLower === 'trial');
        const limite = temLimite ? 100 : 'Ilimitado';
        const status = empresa.agendamentos_mes || 0;

        console.log(`📌 ${empresa.nome}`);
        console.log(`   📋 Plano: ${empresa.plano}`);
        console.log(`   📅 Mês: ${empresa.mes_referencia || 'N/A'}`);
        console.log(`   📊 Agendamentos: ${status}${limite !== 'Ilimitado' ? `/${limite}` : ' (Ilimitado)'}`);

        if (temLimite) {
            const restantes = Math.max(0, 100 - status);
            if (restantes === 0) {
                console.log(`   ⚠️ LIMITE ATINGIDO! (${status}/100)`);
            } else {
                console.log(`   ✅ ${restantes} restantes`);
            }
        } else {
            console.log(`   ✅ Ilimitado`);
        }
        console.log('');
    }

    console.log('='.repeat(50));
});