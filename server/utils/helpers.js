// server/utils/helpers.js
// ✅ IMPORTAR CORRETAMENTE O DB
const { db } = require('../config/database');
// ✅ TESTE - verificar se db está disponível
console.log('📊 DB disponível?', typeof db);
console.log('📊 DB.run é função?', typeof db.run === 'function');
console.log('📊 DB.get é função?', typeof db.get === 'function')

// ✅ FUNÇÃO PARA FORMATAR DATA BR
function formatarDataBr(data) {
    if (!data) return '';
    try {
        const partes = data.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        return data;
    } catch (e) {
        return data;
    }
}

// ✅ FUNÇÃO PARA INCREMENTAR CONTADOR - CORRIGIDA
function incrementarContadorAgendamentos(empresaId, callback) {
    console.log(`📊 Incrementando contador para empresa ${empresaId}`);

    const sql = `
        UPDATE empresas 
        SET agendamentos_mes = agendamentos_mes + 1 
        WHERE id = ?
    `;

    // ✅ USAR db.run CORRETAMENTE
    db.run(sql, [empresaId], function (err) {
        if (err) {
            console.error('❌ Erro ao incrementar contador:', err);
            return callback(err);
        }
        console.log(`✅ Contador incrementado para empresa ${empresaId}`);
        callback(null);
    });
}

// ✅ FUNÇÃO PARA RESETAR CONTADOR
function resetarContadorAgendamentos(empresaId, callback) {
    const sql = `
        UPDATE empresas 
        SET agendamentos_mes = 0, mes_referencia = strftime('%Y-%m', 'now')
        WHERE id = ?
    `;

    db.run(sql, [empresaId], function (err) {
        if (err) {
            console.error('❌ Erro ao resetar contador:', err);
            return callback(err);
        }
        console.log(`✅ Contador resetado para empresa ${empresaId}`);
        callback(null);
    });
}

// ✅ FUNÇÃO PARA VERIFICAR DISPONIBILIDADE DE HORÁRIO
function verificarDisponibilidadeHorario(empresaId, profissionalId, data, hora, duracao) {
    return new Promise((resolve, reject) => {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        // Calcular hora fim
        const [horaStr, minutoStr] = hora.split(':').map(Number);
        const duracaoMin = parseInt(duracao) || 30;
        const horaFim = new Date(2000, 0, 1, horaStr, (minutoStr || 0) + duracaoMin);
        const horaFimStr = horaFim.toTimeString().slice(0, 5);

        const sql = isProduction
            ? `SELECT id FROM agendamentos 
               WHERE profissional_id = $1 
               AND data = $2 
               AND status != 'cancelado'
               AND (hora < $4 AND datetime(hora || '+' || duracao || ' minutes') > $3)`
            : `SELECT id FROM agendamentos 
               WHERE profissional_id = ? 
               AND data = ? 
               AND status != 'cancelado'
               AND (hora < ? AND datetime(hora || '+' || duracao || ' minutes') > ?)`;

        // ✅ USAR db.get CORRETAMENTE
        db.get(sql, [profissionalId, data, hora, horaFimStr], (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar disponibilidade:', err);
                reject(err);
            } else {
                resolve(!row); // Se não encontrou, está disponível
            }
        });
    });
}

// ✅ FUNÇÃO PARA VERIFICAR LIMITE DE AGENDAMENTOS
function verificarLimiteAgendamentos(empresaId, callback) {
    const sql = `
        SELECT plano, agendamentos_mes, mes_referencia 
        FROM empresas 
        WHERE id = ?
    `;

    // ✅ USAR db.get CORRETAMENTE
    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            return callback(err);
        }

        if (!empresa) {
            return callback(new Error('Empresa não encontrada'));
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

// ✅ EXPORTAR TODAS AS FUNÇÕES
module.exports = {
    formatarDataBr,
    incrementarContadorAgendamentos,
    resetarContadorAgendamentos,
    verificarDisponibilidadeHorario,
    verificarLimiteAgendamentos
};