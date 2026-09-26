// server/utils/helpers.js
// ✅ IMPORTAR CORRETAMENTE O DB
const { db, getEmpresaDb } = require('../config/database');

console.log('📊 DB disponível?', typeof db);
console.log('📊 DB.run é função?', typeof db.run === 'function');
console.log('📊 DB.get é função?', typeof db.get === 'function');

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

// ✅ FUNÇÃO PARA INCREMENTAR CONTADOR - CORRIGIDA
function incrementarContadorAgendamentos(empresaId, callback) {
    console.log(`📊 Incrementando contador para empresa ${empresaId}`);

    const sql = `
        UPDATE empresas 
        SET agendamentos_mes = agendamentos_mes + 1 
        WHERE id = ?
    `;

    db.run(sql, [empresaId], function (err) {
        if (err) {
            console.error('❌ Erro ao incrementar contador:', err);
            return callback(err);
        }
        console.log(`✅ Contador incrementado para empresa ${empresaId}`);
        callback(null);
    });
}

// ✅ FUNÇÃO PARA RESETAR CONTADOR - CORRIGIDA PARA POSTGRESQL
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
            console.error('❌ Erro ao resetar contador:', err);
            return callback(err);
        }
        console.log(`✅ Contador resetado para empresa ${empresaId}`);
        callback(null);
    });
}

// ✅ FUNÇÃO PARA VERIFICAR LIMITE DE AGENDAMENTOS - CORRIGIDA
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

// ✅ FUNÇÃO PARA VERIFICAR DISPONIBILIDADE - CORRIGIDA PARA SQLITE
function verificarDisponibilidadeHorario(empresaId, profissionalId, data, hora, duracao) {
    return new Promise((resolve, reject) => {
        const empresaDb = getEmpresaDb(empresaId);
        if (!empresaDb) {
            return reject(new Error('Banco da empresa não encontrado'));
        }

        const [horaStr, minutoStr] = hora.split(':').map(Number);
        const duracaoMin = parseInt(duracao) || 30;
        const horaFim = new Date(2000, 0, 1, horaStr, (minutoStr || 0) + duracaoMin);
        const horaFimStr = horaFim.toTimeString().slice(0, 5);

        // ✅ SQLite puro — sem ::time, sem ::interval
        const sql = `
            SELECT id FROM agendamentos 
            WHERE profissional_id = ? 
            AND data = ? 
            AND status != 'cancelado'
            AND (
                hora < ? 
                AND datetime(
                    substr(hora, 1, 5) || ':' || printf('%02d', CAST(duracao AS INTEGER) % 60),
                    '+' || CAST(duracao AS INTEGER) || ' minutes'
                ) > ?
            )
        `;

        empresaDb.get(sql, [profissionalId, data, hora, horaFimStr], (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar disponibilidade:', err.message);
                // fail-safe: se der erro na query, deixa passar (não bloqueia)
                resolve(true);
            } else {
                resolve(!row);
            }
        });
    });
}

// ============================================
// 🚫 NOVAS FUNÇÕES - BLOQUEIOS DE AGENDA
// ============================================

/**
 * Verifica se uma data+hora está bloqueada para um profissional.
 * @param {number} empresaId
 * @param {number|null} profissionalId - null = checa também bloqueios globais
 * @param {string} data - 'YYYY-MM-DD'
 * @param {string} hora - 'HH:MM'
 * @returns {Promise<{bloqueado: boolean, motivo: string|null}>}
 */
function estaBloqueado(empresaId, profissionalId, data, hora) {
    return new Promise((resolve) => {
        const empresaDb = getEmpresaDb(empresaId);
        if (!empresaDb) {
            console.error(`❌ [estaBloqueado] Banco da empresa ${empresaId} não encontrado`);
            return resolve({ bloqueado: false, motivo: null });
        }

        // 🔥 LOG de entrada — o mais importante pra debug
        console.log(`\n🔍 [estaBloqueado] INÍCIO`);
        console.log(`   empresaId=${empresaId} profissionalId=${profissionalId || 'NULL'} data=${data} hora=${hora || 'NULL'}`);

        let sql = `
            SELECT id, motivo, dia_inteiro, hora_inicio, hora_fim, profissional_id, tipo, data_inicio, data_fim
            FROM bloqueios_agenda
            WHERE empresa_id = ?
              AND ativo = 1
              AND (
                    (tipo = 'periodo' AND data_inicio <= ? AND data_fim >= ?)
                    OR
                    (tipo = 'datas' AND datas_especificas LIKE ?)
                  )
        `;
        
        const dataLike = `%"${data}"%`;
        const params = [empresaId, data, data, dataLike];

        if (profissionalId) {
            sql += ` AND (profissional_id = ? OR profissional_id IS NULL)`;
            params.push(parseInt(profissionalId));
        } else {
            sql += ` AND profissional_id IS NULL`;
        }

        console.log(`   SQL params:`, JSON.stringify(params));

        empresaDb.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ [estaBloqueado] Erro SQL:', err.message);
                return resolve({ bloqueado: false, motivo: null });
            }

            console.log(`   📋 ${rows?.length || 0} bloqueio(s) encontrado(s) no banco`);

            if (!rows || rows.length === 0) {
                console.log(`   ✅ SEM bloqueios → LIBERADO\n`);
                return resolve({ bloqueado: false, motivo: null });
            }

            // Mostra cada linha
            rows.forEach((b, i) => {
                console.log(`   [${i+1}] ID=${b.id} dia_inteiro=${JSON.stringify(b.dia_inteiro)} hora=${b.hora_inicio}-${b.hora_fim} motivo="${b.motivo}"`);
            });

            for (const b of rows) {
                const diaInteiro = Number(b.dia_inteiro) === 1;

                if (diaInteiro) {
                    console.log(`   🚫 DIA INTEIRO (id=${b.id}) → BLOQUEADO\n`);
                    return resolve({ bloqueado: true, motivo: b.motivo || 'Indisponível' });
                }

                if (hora && b.hora_inicio && b.hora_fim) {
                    const hInicio = String(b.hora_inicio).substring(0, 5);
                    const hFim = String(b.hora_fim).substring(0, 5);
                    const hHora = String(hora).substring(0, 5);

                    const dentro = (hHora >= hInicio && hHora < hFim);
                    console.log(`   🔎 Testando ${hHora} em ${hInicio}-${hFim}: ${dentro ? 'DENTRO' : 'fora'}`);

                    if (dentro) {
                        console.log(`   🚫 BLOQUEADO (id=${b.id})\n`);
                        return resolve({ bloqueado: true, motivo: b.motivo || 'Indisponível' });
                    }
                }
            }

            console.log(`   ✅ Nenhum bloqueio aplicável → LIBERADO\n`);
            resolve({ bloqueado: false, motivo: null });
        });
    });
}
/**
 * Retorna lista de datas bloqueadas (dia inteiro) de um mês.
 * Útil para o chatbot remover dias do calendário.
 * @param {number} empresaId
 * @param {number|null} profissionalId
 * @param {number} ano
 * @param {number} mes - 1..12
 * @returns {Promise<string[]>} - array de 'YYYY-MM-DD'
 */
function datasBloqueadasMes(empresaId, profissionalId, ano, mes) {
    return new Promise((resolve) => {
        const empresaDb = getEmpresaDb(empresaId);
        if (!empresaDb) {
            console.error(`❌ Banco da empresa ${empresaId} não encontrado`);
            return resolve([]);
        }

        const mesStr = String(mes).padStart(2, '0');
        const primeiroDia = `${ano}-${mesStr}-01`;
        const ultimoDia = `${ano}-${mesStr}-31`;
        const mesLike = `%"${ano}-${mesStr}-%`;

        let sql = `
            SELECT tipo, data_inicio, data_fim, datas_especificas
            FROM bloqueios_agenda
            WHERE empresa_id = ?
              AND ativo = 1
              AND dia_inteiro = 1
              AND (
                    (tipo = 'periodo' AND data_inicio <= ? AND data_fim >= ?)
                    OR
                    (tipo = 'datas' AND datas_especificas LIKE ?)
                  )
        `;
        
        const params = [empresaId, ultimoDia, primeiroDia, mesLike];

        if (profissionalId) {
            sql += ` AND (profissional_id = ? OR profissional_id IS NULL)`;
            params.push(parseInt(profissionalId));
        } else {
            sql += ` AND profissional_id IS NULL`;
        }

        empresaDb.all(sql, params, (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar datas bloqueadas:', err.message);
                return resolve([]);
            }

            const bloqueadas = new Set();

            for (const b of rows || []) {
                if (b.tipo === 'periodo' && b.data_fim) {
                    // Expande o intervalo em dias
                    let atual = new Date(b.data_inicio + 'T00:00:00');
                    const fim = new Date(b.data_fim + 'T00:00:00');
                    
                    while (atual <= fim) {
                        const iso = atual.toISOString().slice(0, 10);
                        if (iso.startsWith(`${ano}-${mesStr}`)) {
                            bloqueadas.add(iso);
                        }
                        atual.setDate(atual.getDate() + 1);
                    }
                } else if (b.tipo === 'datas' && b.datas_especificas) {
                    try {
                        const arr = JSON.parse(b.datas_especificas || '[]');
                        arr.forEach(dt => {
                            if (dt.startsWith(`${ano}-${mesStr}`)) {
                                bloqueadas.add(dt);
                            }
                        });
                    } catch (e) {
                        console.error('❌ Erro ao parsear datas_especificas:', e.message);
                    }
                }
            }

            resolve(Array.from(bloqueadas).sort());
        });
    });
}

// ✅ EXPORTAR TODAS AS FUNÇÕES
module.exports = {
    formatarDataBr,
    incrementarContadorAgendamentos,
    resetarContadorAgendamentos,
    verificarDisponibilidadeHorario,
    verificarLimiteAgendamentos,
    estaBloqueado,
    datasBloqueadasMes
};