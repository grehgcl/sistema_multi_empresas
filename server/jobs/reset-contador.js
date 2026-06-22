// server/jobs/reset-contador.js
// Job para resetar o contador de agendamentos todo mês

const { db } = require('../config/database');
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

async function resetarContadorMensal() {
    const mesAtual = new Date().toISOString().slice(0, 7);

    console.log(`🔄 [${new Date().toISOString()}] Verificando contadores para o mês ${mesAtual}...`);

    const sql = isProduction
        ? `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = $1 WHERE mes_referencia != $1 OR mes_referencia IS NULL`
        : `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = ? WHERE mes_referencia != ? OR mes_referencia IS NULL`;

    db.run(sql, [mesAtual, mesAtual], function (err) {
        if (err) {
            console.error('❌ Erro ao resetar contadores:', err);
        } else {
            console.log(`✅ [${new Date().toISOString()}] Contadores resetados para ${this.changes || 0} empresas`);
        }
    });
}

function start() {
    // Executar imediatamente ao iniciar
    resetarContadorMensal();

    // Verificar a cada hora se é dia 1º
    setInterval(() => {
        const hoje = new Date();
        if (hoje.getDate() === 1) {
            resetarContadorMensal();
        }
    }, 60 * 60 * 1000); // 1 hora

    console.log('📅 Job de reset de contadores agendado (verificação a cada hora)');
}

module.exports = { start, resetarContadorMensal };