// server/jobs/reset-contador.js
// Job para resetar contadores de agendamentos no inÃ­cio de cada mÃªs

const cron = require('node-cron');
const { db } = require('../config/database');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

console.log(`ðŸ“… Job de reset de contadores agendado (verificaÃ§Ã£o a cada hora)`);

// FunÃ§Ã£o para resetar contadores
function resetarContadores() {
    const agora = new Date();
    const mesAtual = agora.toISOString().slice(0, 7); // YYYY-MM

    console.log(`ðŸ”„ [${new Date().toISOString()}] Verificando contadores para o mÃªs ${mesAtual}...`);

    // ðŸ”¥ CORRIGIDO: Query para PostgreSQL
    const sqlSelect = isProduction
        ? `SELECT id, mes_referencia FROM empresas WHERE mes_referencia IS NOT NULL AND mes_referencia != $1`
        : `SELECT id, mes_referencia FROM empresas WHERE mes_referencia IS NOT NULL AND mes_referencia != ?`;

    db.all(sqlSelect, [mesAtual], (err, empresas) => {
        if (err) {
            console.error('âŒ Erro ao buscar empresas para reset:', err.message);
            return;
        }

        if (!empresas || empresas.length === 0) {
            console.log(`âœ… Nenhuma empresa precisa resetar contadores para ${mesAtual}`);
            return;
        }

        console.log(`ðŸ“ Resetando contadores para ${empresas.length} empresa(s)...`);

        // ðŸ”¥ CORRIGIDO: Query para PostgreSQL
        const sqlUpdate = isProduction
            ? `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = $1 WHERE id = $2`
            : `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = ? WHERE id = ?`;

        empresas.forEach((empresa, index) => {
            db.run(sqlUpdate, [mesAtual, empresa.id], function (err) {
                if (err) {
                    console.error(`âŒ Erro ao resetar empresa ${empresa.id}:`, err.message);
                } else {
                    console.log(`âœ… Empresa ${empresa.id} resetada (anterior: ${empresa.mes_referencia})`);
                }

                // Ãšltima empresa
                if (index === empresas.length - 1) {
                    console.log(`âœ… Reset de contadores concluÃ­do!`);
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
        console.log('âœ… Job de reset de contadores iniciado');
        resetarContadores();
        return job;
    },
    stop: () => {
        job.stop();
        console.log('â¹ï¸ Job de reset de contadores parado');
    }
};