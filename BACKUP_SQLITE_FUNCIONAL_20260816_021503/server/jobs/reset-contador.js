// server/jobs/reset-contador.js
// Job para resetar contadores de agendamentos no início de cada mês

const cron = require('node-cron');
const { db } = require('../config/database');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

console.log(`📅 Job de reset de contadores agendado (verificação a cada hora)`);

// Função para resetar contadores
function resetarContadores() {
    const agora = new Date();
    const mesAtual = agora.toISOString().slice(0, 7); // YYYY-MM

    console.log(`🔄 [${new Date().toISOString()}] Verificando contadores para o mês ${mesAtual}...`);

    // 🔥 CORRIGIDO: Query para PostgreSQL
    const sqlSelect = isProduction
        ? `SELECT id, mes_referencia FROM empresas WHERE mes_referencia IS NOT NULL AND mes_referencia != $1`
        : `SELECT id, mes_referencia FROM empresas WHERE mes_referencia IS NOT NULL AND mes_referencia != ?`;

    db.all(sqlSelect, [mesAtual], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao buscar empresas para reset:', err.message);
            return;
        }

        if (!empresas || empresas.length === 0) {
            console.log(`✅ Nenhuma empresa precisa resetar contadores para ${mesAtual}`);
            return;
        }

        console.log(`📝 Resetando contadores para ${empresas.length} empresa(s)...`);

        // 🔥 CORRIGIDO: Query para PostgreSQL
        const sqlUpdate = isProduction
            ? `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = $1 WHERE id = $2`
            : `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = ? WHERE id = ?`;

        empresas.forEach((empresa, index) => {
            db.run(sqlUpdate, [mesAtual, empresa.id], function (err) {
                if (err) {
                    console.error(`❌ Erro ao resetar empresa ${empresa.id}:`, err.message);
                } else {
                    console.log(`✅ Empresa ${empresa.id} resetada (anterior: ${empresa.mes_referencia})`);
                }

                // Última empresa
                if (index === empresas.length - 1) {
                    console.log(`✅ Reset de contadores concluído!`);
                }
            });
        });
    });
}

// Executar a cada hora
const job = cron.schedule('0 * * * *', () => {
    resetarContadores();
});

// Executar imediatamente ao iniciar
setTimeout(() => {
    resetarContadores();
}, 5000);

module.exports = {
    start: () => {
        console.log('✅ Job de reset de contadores iniciado');
        resetarContadores();
        return job;
    },
    stop: () => {
        job.stop();
        console.log('⏹️ Job de reset de contadores parado');
    }
};