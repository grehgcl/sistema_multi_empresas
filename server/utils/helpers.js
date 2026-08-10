// server/utils/helpers.js
// âœ… IMPORTAR CORRETAMENTE O DB
const { db } = require('../config/database');
// âœ… TESTE - verificar se db estÃ¡ disponÃ­vel
console.log('ðŸ“Š DB disponÃ­vel?', typeof db);
console.log('ðŸ“Š DB.run Ã© funÃ§Ã£o?', typeof db.run === 'function');
console.log('ðŸ“Š DB.get Ã© funÃ§Ã£o?', typeof db.get === 'function')

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

// âœ… FUNÃ‡ÃƒO PARA INCREMENTAR CONTADOR - CORRIGIDA
function incrementarContadorAgendamentos(empresaId, callback) {
    console.log(`ðŸ“Š Incrementando contador para empresa ${empresaId}`);

    const sql = `
        UPDATE empresas 
        SET agendamentos_mes = agendamentos_mes + 1 
        WHERE id = ?
    `;

    // âœ… USAR db.run CORRETAMENTE
    db.run(sql, [empresaId], function (err) {
        if (err) {
            console.error('âŒ Erro ao incrementar contador:', err);
            return callback(err);
        }
        console.log(`âœ… Contador incrementado para empresa ${empresaId}`);
        callback(null);
    });
}

// server/utils/helpers.js

// âœ… FUNÃ‡ÃƒO PARA RESETAR CONTADOR - CORRIGIDA PARA POSTGRESQL
function resetarContadorAgendamentos(empresaId, callback) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    const sql = isProduction
        ? `UPDATE empresas 
           SET agendamentos_mes = 0, 
               mes_referencia = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
           WHERE id = $1`
        : `UPDATE empresas 
           SET agendamentos_mes = 0, 
               mes_referencia = strftime('%Y-%m', 'now')
           WHERE id = ?`;

    db.run(sql, [empresaId], function (err) {
        if (err) {
            console.error('âŒ Erro ao resetar contador:', err);
            return callback(err);
        }
        console.log(`âœ… Contador resetado para empresa ${empresaId}`);
        callback(null);
    });
}

// âœ… FUNÃ‡ÃƒO PARA VERIFICAR LIMITE DE AGENDAMENTOS - CORRIGIDA
function verificarLimiteAgendamentos(empresaId, callback) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    const sql = isProduction
        ? `SELECT plano, agendamentos_mes, mes_referencia 
           FROM empresas 
           WHERE id = $1`
        : `SELECT plano, agendamentos_mes, mes_referencia 
           FROM empresas 
           WHERE id = ?`;

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            return callback(err);
        }

        if (!empresa) {
            return callback(new Error('Empresa nÃ£o encontrada'));
        }

        const planosLimitados = ['Trial', 'Starter', 'trial', 'starter'];
        if (planosLimitados.includes(empresa.plano)) {
            const mesAtual = new Date().toISOString().slice(0, 7);
            const mesReferencia = empresa.mes_referencia || '';

            if (mesReferencia !== mesAtual) {
                resetarContadorAgendamentos(empresaId, () => {
                    callback(null, { podeAgendar: true, limite: 100, usado: 0 });
                });
                return;
            }

            const usado = empresa.agendamentos_mes || 0;
            const limite = 100;
            const podeAgendar = usado < limite;

            callback(null, { podeAgendar, limite, usado });
        } else {
            callback(null, { podeAgendar: true, limite: 'Ilimitado', usado: 0 });
        }
    });
}

// âœ… FUNÃ‡ÃƒO PARA VERIFICAR DISPONIBILIDADE - CORRIGIDA
function verificarDisponibilidadeHorario(empresaId, profissionalId, data, hora, duracao) {
    return new Promise((resolve, reject) => {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        const [horaStr, minutoStr] = hora.split(':').map(Number);
        const duracaoMin = parseInt(duracao) || 30;
        const horaFim = new Date(2000, 0, 1, horaStr, (minutoStr || 0) + duracaoMin);
        const horaFimStr = horaFim.toTimeString().slice(0, 5);

        // ðŸ”¥ PostgreSQL: usar INTERVAL
        const sql = isProduction
            ? `SELECT id FROM agendamentos 
               WHERE profissional_id = $1 
               AND data = $2 
               AND status != 'cancelado'
               AND (hora < $4 AND (hora::time + (duracao || ' minutes')::interval) > $3::time)`
            : `SELECT id FROM agendamentos 
               WHERE profissional_id = ? 
               AND data = ? 
               AND status != 'cancelado'
               AND (hora < ? AND datetime(hora || '+' || duracao || ' minutes') > ?)`;

        db.get(sql, [profissionalId, data, hora, horaFimStr], (err, row) => {
            if (err) {
                console.error('âŒ Erro ao verificar disponibilidade:', err);
                reject(err);
            } else {
                resolve(!row);
            }
        });
    });
}

// âœ… EXPORTAR TODAS AS FUNÃ‡Ã•ES
module.exports = {
    formatarDataBr,
    incrementarContadorAgendamentos,
    resetarContadorAgendamentos,
    verificarDisponibilidadeHorario,
    verificarLimiteAgendamentos
};