// ============================================
// ROTAS DE AGENDAMENTOS - SEE&AGENDE
// ============================================

const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database');
const { 
    auth, 
    verificarDono, 
    verificarAcessoAgendamentos, 
    verificarLimiteAgendamentos 
} = require('../middlewares/auth');
const axios = require('axios');

const { formatarDataBr, incrementarContadorAgendamentos, verificarDisponibilidadeHorario, estaBloqueado } = require('../utils/helpers');
const { INSTAGRAM_SISTEMA } = require('../utils/constants');

// ============================================
// Helper: monta rodapé com Instagram do dono + sistema
// ============================================
function montarRodapeInstagram(empresa) {
    let txt = '';
    
    if (empresa && empresa.instagram) {
        const instaDono = String(empresa.instagram).replace(/^@/, '').trim();
        const instaSistema = INSTAGRAM_SISTEMA ? String(INSTAGRAM_SISTEMA).replace(/^@/, '').trim() : null;
        
        if (instaDono && instaDono.toLowerCase() !== instaSistema?.toLowerCase()) {
            txt += `\n📸 https://instagram.com/${instaDono}`;
        }
    }
    
    if (INSTAGRAM_SISTEMA) {
        txt += `\n💜 https://instagram.com/${INSTAGRAM_SISTEMA}`;
    }
    
    return txt;
}

// ============================================
// COMPATIBILIDADE SQLite / PostgreSQL
// ============================================

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

function extractMonth(field) {
    return isProduction ? `EXTRACT(MONTH FROM ${field})` : `strftime('%m', ${field})`;
}

function extractYear(field) {
    return isProduction ? `EXTRACT(YEAR FROM ${field})` : `strftime('%Y', ${field})`;
}

function extractDay(field) {
    return isProduction ? `EXTRACT(DAY FROM ${field})` : `strftime('%d', ${field})`;
}

function formatDate(field) {
    return isProduction ? `to_char(${field}, 'YYYY-MM-DD')` : `date(${field})`;
}

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================
// ⚡ ROTAS ESPECÍFICAS (DEVEM VIR ANTES DE /:id)
// ============================================

// ============================================
// GET /api/agendamentos/periodo - BUSCAR POR PERÍODO
// ============================================

router.get('/periodo', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { inicio, fim, status } = req.query;

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    let sql = `
        SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, s.nome as servico_nome 
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN profissionais p ON a.profissional_id = p.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.empresa_id = ?
    `;
    let params = [empresaId];

    if (inicio && fim) {
        sql += ` AND a.data BETWEEN ? AND ?`;
        params.push(inicio, fim);
    }

    if (status) {
        sql += ` AND a.status = ?`;
        params.push(status);
    }

    sql += ` ORDER BY a.data ASC, a.hora ASC`;

    empresaDb.all(sql, params, (err, agendamentos) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            data: agendamentos || []
        });
    });
});

// ============================================
// GET /api/agendamentos/horarios-disponiveis
// ============================================

router.get('/horarios-disponiveis', auth, async (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { data, profissional_id } = req.query;

    console.log(`📊 Buscando horários disponíveis para ${data}`);

    if (!data) {
        return res.status(400).json({
            success: false,
            message: 'Data é obrigatória'
        });
    }

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const diaSemana = new Date(data + 'T00:00:00').getDay();

    empresaDb.get(
        `SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?`,
        [empresaId, diaSemana],
        (err, horario) => {
            if (err) {
                console.error("❌ Erro ao buscar horário de funcionamento:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            const abertoNum = Number(horario?.aberto);
            if (!horario || abertoNum !== 1) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Estabelecimento fechado neste dia'
                });
            }

            let sqlAgendamentos = `
                SELECT hora, duracao FROM agendamentos 
                WHERE empresa_id = ? AND data = ? AND status NOT IN ('cancelado')
            `;
            let params = [empresaId, data];

            if (profissional_id) {
                sqlAgendamentos += ` AND profissional_id = ?`;
                params.push(profissional_id);
            }

            empresaDb.all(sqlAgendamentos, params, async (err, agendamentos) => {
                if (err) {
                    console.error("❌ Erro ao buscar agendamentos:", err);
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                const horaInicio = horario.hora_inicio || '08:00';
                const horaFim = horario.hora_fim || '18:00';
                const almocoInicio = horario.almoco_inicio || '12:00';
                const almocoFim = horario.almoco_fim || '13:00';
                const intervalo = horario.intervalo_minutos || 30;

                let horariosDisponiveis = [];
                const agendados = agendamentos.map(a => a.hora);

                let horaAtual = horaInicio;
                while (horaAtual < horaFim) {
                    if (horaAtual >= almocoInicio && horaAtual < almocoFim) {
                        horaAtual = almocoFim;
                        continue;
                    }

                    if (!agendados.includes(horaAtual)) {
                        horariosDisponiveis.push(horaAtual);
                    }

                    const [h, m] = horaAtual.split(':').map(Number);
                    let novaHora = h;
                    let novoMinuto = m + intervalo;
                    if (novoMinuto >= 60) {
                        novaHora++;
                        novoMinuto -= 60;
                    }
                    horaAtual = `${String(novaHora).padStart(2, '0')}:${String(novoMinuto).padStart(2, '0')}`;
                }

                // 🚫 FILTRAR HORÁRIOS BLOQUEADOS
                const profIdParaChecar = profissional_id ? parseInt(profissional_id) : null;

                if (horariosDisponiveis.length > 0) {
                    const checks = await Promise.all(
                        horariosDisponiveis.map(async (h) => {
                            const r = await estaBloqueado(empresaId, profIdParaChecar, data, h);
                            return r.bloqueado ? null : h;
                        })
                    );
                    horariosDisponiveis = checks.filter(h => h !== null);
                }

                console.log(`✅ ${horariosDisponiveis.length} horários disponíveis (pós-bloqueios)`);

                res.json({
                    success: true,
                    data: horariosDisponiveis
                });
            });
        }
    );
});

// ============================================
// GET /api/agendamentos/profissionais-disponiveis
// ============================================

router.get('/profissionais-disponiveis', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { data, hora, duracao } = req.query;

    if (!data || !hora) {
        return res.status(400).json({
            success: false,
            message: 'Data e hora são obrigatórios'
        });
    }

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const duracaoMin = parseInt(duracao) || 30;
    const horaFim = new Date(`2000-01-01T${hora}`);
    horaFim.setMinutes(horaFim.getMinutes() + duracaoMin);
    const horaFimStr = horaFim.toTimeString().slice(0, 5);

    const sql = `
        SELECT p.* FROM profissionais p
        WHERE p.empresa_id = ? AND p.ativo = 1
        AND NOT EXISTS (
            SELECT 1 FROM agendamentos a
            WHERE a.profissional_id = p.id
            AND a.data = ?
            AND a.status != 'cancelado'
            AND (a.hora < ? AND datetime(a.hora || '+' || a.duracao || ' minutes') > ?)
        )
        ORDER BY p.nome
    `;

    empresaDb.all(sql, [empresaId, data, hora, horaFimStr], (err, profissionais) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            data: profissionais || []
        });
    });
});

// ============================================
// ⚡ ROTAS GENÉRICAS
// ============================================

// ============================================
// GET /api/agendamentos - LISTAR AGENDAMENTOS
// ============================================

router.get('/', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        console.log(`📊 Buscando agendamentos para empresa ${empresaId}`);

        const empresaDb = getEmpresaDb(empresaId);
        if (!empresaDb) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        const sql = `
            SELECT a.*, 
                   c.nome as cliente_nome,
                   p.nome as profissional_nome,
                   s.nome as servico_nome,
                   date(a.data) as data_padrao,
                   time(a.hora) as hora_padrao
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = ?
            ORDER BY a.data DESC, a.hora ASC
        `;

        empresaDb.all(sql, [empresaId], (err, agendamentos) => {
            if (err) {
                console.error("❌ Erro ao buscar agendamentos:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            const dadosFormatados = agendamentos.map(a => ({
                ...a,
                data: a.data_padrao || a.data,
                hora: a.hora_padrao || a.hora
            }));

            console.log(`✅ ${dadosFormatados.length} agendamentos encontrados`);
            res.json({
                success: true,
                data: dadosFormatados || []
            });
        });
    } catch (error) {
        console.error('❌ Erro na rota /api/agendamentos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// ============================================
// GET /api/agendamentos/:id - BUSCAR UM AGENDAMENTO
// ============================================

router.get('/:id', auth, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    console.log(`🔍 Buscando agendamento ID: ${id}`);

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = `
        SELECT a.*, 
               c.nome as cliente_nome, 
               p.nome as profissional_nome,
               s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN profissionais p ON a.profissional_id = p.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.id = ? AND a.empresa_id = ?
    `;

    empresaDb.get(sql, [id, empresaId], (err, agendamento) => {
        if (err) {
            console.error("❌ Erro ao buscar agendamento:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Agendamento não encontrado'
            });
        }

        res.json({
            success: true,
            data: agendamento
        });
    });
});

// ============================================
// POST /api/agendamentos - CRIAR AGENDAMENTO
// ============================================

router.post('/', 
    auth, 
    verificarAcessoAgendamentos, 
    verificarLimiteAgendamentos, 
    async (req, res) => {
    const { 
        cliente_id, 
        data, 
        hora, 
        servico_id, 
        profissional_id,
        origem = 'painel'
    } = req.body;
    const empresa_id = req.usuario.empresa_id;
        // 🔒 SEGURANÇA: Profissional só pode agendar pra si mesmo
    if (req.usuario.role === 'profissional') {
        const meuId = req.usuario.id;
        if (profissional_id && parseInt(profissional_id) !== parseInt(meuId)) {
            console.warn(`🚫 Profissional ${meuId} tentou agendar pra ${profissional_id}`);
            return res.status(403).json({
                success: false,
                message: 'Você só pode criar agendamentos para si mesmo'
            });
        }
        // Força que o profissional_id seja o dele
        req.body.profissional_id = meuId;
    }

    console.log('📝 Criando agendamento:', JSON.stringify({ 
        cliente_id, data, hora, servico_id, profissional_id, empresa_id, origem 
    }, null, 2));

    if (!cliente_id || !data) {
        return res.json({ success: false, message: 'Cliente e data são obrigatórios' });
    }

    if (!hora) {
        return res.json({ success: false, message: 'Horário é obrigatório' });
    }

    if (origem === 'chatbot') {
        const agora = new Date();
        const [ano, mes, dia] = data.split('-').map(Number);
        const [horaStr, minutoStr] = hora.split(':').map(Number);
        const dataHoraAgendamento = new Date(ano, mes - 1, dia, horaStr, minutoStr, 0, 0);

        if (dataHoraAgendamento < agora) {
            return res.json({
                success: false,
                message: '⛔ Não é possível agendar em datas ou horários que já passaram.'
            });
        }
    }

    console.log(`📅 Data recebida: ${data}`);

    const empresaDb = getEmpresaDb(empresa_id);

    // 🔥 CHECAGEM DE HORÁRIO OCUPADO — POR PROFISSIONAL
    // - profissional_id válido (número)  → checa só agendamentos dele
    // - null/''/'null'/'undefined'       → checa só agendamentos do DONO
    const profIdChecagem = profissional_id
        && profissional_id !== ''
        && profissional_id !== 'null'
        && profissional_id !== 'undefined'
        && !String(profissional_id).includes('dono')
        ? parseInt(profissional_id)
        : null;

    let sqlCheckHorario = `
        SELECT id FROM agendamentos 
        WHERE empresa_id = ? 
        AND data = ? 
        AND hora = ? 
        AND status != 'cancelado'
    `;
    let paramsCheck = [empresa_id, data, hora];

    if (profIdChecagem && !isNaN(profIdChecagem)) {
        sqlCheckHorario += ` AND profissional_id = ?`;
        paramsCheck.push(profIdChecagem);
    } else {
        // Dono → só agendamentos SEM profissional atribuído
        sqlCheckHorario += ` AND (profissional_id IS NULL OR profissional_id = '' OR profissional_id = 0)`;
    }

    sqlCheckHorario += ` LIMIT 1`;

    const horarioOcupado = await new Promise((resolve) => {
        empresaDb.get(sqlCheckHorario, paramsCheck, (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar horário:', err);
                resolve(null);
            } else {
                resolve(row);
            }
        });
    });

    if (horarioOcupado) {
        console.log(`⚠️ Horário ${hora} do dia ${data} já está ocupado para o profissional ${profIdChecagem || 'dono'}`);
        return res.json({
            success: false,
            message: `⛔ O horário ${hora} já está ocupado. Escolha outro horário.`
        });
    }
    // ============================================
    // 🚫 VERIFICAR BLOQUEIO DE AGENDA
    // ============================================
    const profIdParaBloqueio = profissional_id
    && profissional_id !== ''
    && profissional_id !== 'null'
    && profissional_id !== 'undefined'
    && !String(profissional_id).includes('dono')
    ? parseInt(profissional_id)
    : null;

    try {
        const checkBloqueio = await estaBloqueado(empresa_id, profIdParaBloqueio, data, hora);
        if (checkBloqueio.bloqueado) {
            console.log(`🚫 Horário ${hora} do dia ${data} bloqueado: ${checkBloqueio.motivo}`);
            return res.json({
                success: false,
                message: `⛔ Horário indisponível: ${checkBloqueio.motivo || 'Bloqueado pelo estabelecimento'}`
            });
        }
    } catch (errBloq) {
        console.error('⚠️ Erro ao checar bloqueio:', errBloq.message);
    }

    if (origem === 'chatbot') {
        const sqlAgendamentoHoje = `
            SELECT id FROM agendamentos 
            WHERE cliente_id = ? 
            AND date(data) = date(?)
            AND empresa_id = ? 
            AND status != 'cancelado'
            LIMIT 1
        `;

        const agendamentoHoje = await new Promise((resolve) => {
            empresaDb.get(sqlAgendamentoHoje, [parseInt(cliente_id), data, parseInt(empresa_id)], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar agendamento no mesmo dia:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (agendamentoHoje) {
            const sqlExistente = `SELECT id, data, hora FROM agendamentos WHERE id = ?`;
            const existente = await new Promise((resolve) => {
                empresaDb.get(sqlExistente, [agendamentoHoje.id], (err, row) => {
                    if (err) {
                        console.error('❌ Erro ao buscar agendamento existente:', err);
                        resolve(null);
                    } else {
                        resolve(row);
                    }
                });
            });

            const dataFormatada = formatarDataBr(data);
            const msg = existente
                ? `Você já possui um agendamento para o dia ${dataFormatada} às ${existente.hora}. Cada cliente só pode fazer UM agendamento por dia.`
                : `Você já possui um agendamento para o dia ${dataFormatada}. Cada cliente só pode fazer UM agendamento por dia.`;

            console.log(`⚠️ Cliente ${cliente_id} já tem agendamento no dia ${data}:`, existente);

            return res.json({
                success: false,
                message: msg
            });
        }
    }

    let duracaoServico = 30;
    let nomeServico = '';
    let valorServico = 0;

    if (servico_id && servico_id !== '' && servico_id !== 'null') {
        const sqlServico = `SELECT nome, valor, duracao FROM servicos WHERE id = ? AND empresa_id = ? AND ativo = 1`;
        const servicoInfo = await new Promise((resolve) => {
            empresaDb.get(sqlServico, [parseInt(servico_id), empresa_id], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar serviço:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (servicoInfo) {
            duracaoServico = servicoInfo.duracao || 30;
            nomeServico = servicoInfo.nome;
            valorServico = servicoInfo.valor || 0;
        }
    } else {
        nomeServico = req.body.servico || 'Serviço';
        valorServico = parseFloat(req.body.valor) || 0;
        duracaoServico = 30;
    }

    let profissionalIdFinal = null;
    if (profissional_id && profissional_id !== '' && profissional_id !== 'null') {
        profissionalIdFinal = parseInt(profissional_id);
        const disponivel = await verificarDisponibilidadeHorario(
            empresa_id,
            profissionalIdFinal,
            data,
            hora,
            duracaoServico
        );
        if (!disponivel) {
            return res.json({
                success: false,
                message: `Este horário já está ocupado para este profissional.`
            });
        }
    }

    const sqlInsert = `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, valor_total, duracao, status, empresa_id, profissional_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`;

    const valor = parseFloat(valorServico) || 0;
    const params = [
        parseInt(cliente_id),
        data,
        hora,
        servico_id || null,
        nomeServico || '',
        valor,
        valor,
        duracaoServico,
        parseInt(empresa_id),
        profissionalIdFinal
    ];

    console.log('📊 Parâmetros:', params);

    empresaDb.run(sqlInsert, params, async function (err) {
        if (err) {
            console.error('❌ Erro ao criar agendamento:', err.message);
            return res.json({ success: false, message: 'Erro ao criar agendamento: ' + err.message });
        }

        let id = this.lastID || null;

        if (!id) {
            console.log('⚠️ lastID veio nulo, buscando fallback...');
            empresaDb.get(
                `SELECT id FROM agendamentos WHERE cliente_id = ? AND data = ? AND hora = ? ORDER BY id DESC LIMIT 1`,
                [cliente_id, data, hora],
                (err, row) => {
                    if (!err && row) {
                        id = row.id;
                        console.log('✅ ID recuperado via fallback:', id);
                        finalizarResposta(id);
                    } else {
                        console.error('❌ Fallback também falhou');
                        finalizarResposta(null);
                    }
                }
            );
            return;
        }

        console.log('✅ Agendamento criado com ID:', id);
        finalizarResposta(id);
    });

    async function finalizarResposta(agendamentoId) {
        if (!agendamentoId) {
            return res.json({
                success: false,
                message: 'Erro ao criar agendamento: ID não gerado'
            });
        }

        try {
            await new Promise((resolve, reject) => {
                incrementarContadorAgendamentos(empresa_id, (err) => {
                    if (err) {
                        console.error('⚠️ Erro ao incrementar contador:', err);
                        reject(err);
                    } else {
                        console.log('✅ Contador incrementado com sucesso');
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('❌ Erro no contador:', error);
        }

        try {
            console.log('📱 Tentando enviar WhatsApp...');

            const empresaDb2 = getEmpresaDb(empresa_id);
            if (!empresaDb2) {
                console.log('⚠️ Erro ao conectar ao banco da empresa');
                return res.json({
                    success: true,
                    data: { id: agendamentoId },
                    message: 'Agendamento criado, mas WhatsApp não enviado'
                });
            }

            const cliente = await new Promise((resolve) => {
                empresaDb2.get(
                    `SELECT nome, telefone FROM clientes WHERE id = ? AND empresa_id = ?`,
                    [cliente_id, empresa_id],
                    (err, row) => {
                        if (err) {
                            console.error('❌ Erro ao buscar cliente:', err);
                            resolve(null);
                        } else {
                            console.log('✅ Cliente encontrado:', row?.nome);
                            resolve(row);
                        }
                    }
                );
            });

            if (!cliente) {
                console.log(`⚠️ Cliente ID ${cliente_id} não encontrado no banco da empresa ${empresa_id}`);
            } else if (!cliente.telefone || cliente.telefone.length < 10) {
                console.log('⚠️ Cliente sem telefone válido:', cliente.telefone);
            } else {
                const empresa = await new Promise((resolve) => {
                    db.get(
                        `SELECT id, nome, endereco, telefone_dono, whatsapp_instance, instagram FROM empresas WHERE id = ?`,
                        [empresa_id],
                        (err, row) => {
                            if (err) {
                                console.error('❌ Erro ao buscar empresa:', err);
                                resolve(null);
                            } else {
                                resolve(row);
                            }
                        }
                    );
                });

                if (empresa && empresa.whatsapp_instance) {
                    const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
                    const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                    console.log(`📱 Enviando para: ${numeroFormatado}`);
                    console.log(`📱 Instância: ${empresa.whatsapp_instance}`);

                    const valorFormatado = (parseFloat(valorServico) || 0).toFixed(2).replace('.', ',');
                    const valorExibicao = `a partir de R$ ${valorFormatado}`;
                    const nomeEmpresa = empresa.nome || 'See&Agende';
                    const endereco = empresa.endereco || '';
                    const telefoneDono = empresa.telefone_dono || '';

                    const mensagem = `🌟 *${nomeEmpresa.toUpperCase()}* 🌟\n\n` +
                        `Olá *${cliente.nome}*! Seu agendamento foi confirmado! ✅\n\n` +
                        `📋 *DETALHES DO AGENDAMENTO:*\n` +
                        `✂️ Serviço: *${nomeServico || 'Serviço'}*\n` +
                        `📅 Data: *${formatarDataBr(data)}*\n` +
                        `⏰ Hora: *${hora}*\n` +
                        `💰 Valor: *${valorExibicao}*\n\n` +
                        `📍 *Endereço:* ${endereco || 'N/A'}\n\n` +
                        `📞 *Contato:* ${telefoneDono || 'N/A'}\n` +
                        montarRodapeInstagram(empresa) + `\n\n` +
                        `🔗 *Agende novamente:*\n` +
                        `${process.env.BASE_URL || 'https://seeagende.tech'}/chatbot.html?empresa=${empresa_id}\n\n` +
                        `---\n_Mensagem automática do See&Agende_`;

                    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://179.199.134.127:8080';
                    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

                    await axios.post(
                        `${EVOLUTION_API_URL}/message/sendText/${empresa.whatsapp_instance}`,
                        {
                            number: numeroFormatado,
                            text: mensagem,
                            delay: 1200
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': EVOLUTION_API_KEY
                            },
                            timeout: 30000
                        }
                    );

                    console.log(`✅ WhatsApp enviado para ${numeroFormatado}`);
                } else {
                    console.log('⚠️ Empresa sem instância WhatsApp:', empresa?.whatsapp_instance);
                }
            }
        } catch (whatsError) {
            console.error('❌ Erro ao enviar WhatsApp:', whatsError.message);
        }

        res.json({
            success: true,
            data: {
                id: agendamentoId,
                profissional_id: profissionalIdFinal
            },
            message: 'Agendamento criado com sucesso!'
        });
    }
});

// ============================================
// PUT /api/agendamentos/:id - ATUALIZAR AGENDAMENTO
// ============================================

router.put('/:id', auth, verificarDono, verificarAcessoAgendamentos, (req, res) => {
    const { id } = req.params;
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const empresaDb = getEmpresaDb(empresa_id);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sqlSelect = `
        SELECT a.*, 
               date(a.data) as data_formatada,
               c.nome as cliente_nome, 
               p.nome as profissional_nome, 
               s.nome as servico_nome 
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN profissionais p ON a.profissional_id = p.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.id = ? AND a.empresa_id = ?
        ORDER BY a.data DESC
    `;

    empresaDb.get(sqlSelect, [id, empresa_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Agendamento não encontrado'
            });
        }

        if (agendamento.status === 'concluido' || agendamento.status === 'cancelado') {
            return res.status(400).json({
                success: false,
                message: 'Agendamentos concluídos ou cancelados não podem ser editados'
            });
        }

        // ============================================
        // 🔒 SEGURANÇA: Profissional só edita os dele
        // ============================================
        if (req.usuario.role === 'profissional') {
            const meuId = req.usuario.id;

            // 1) O agendamento precisa ser dele
            if (String(agendamento.profissional_id) !== String(meuId)) {
                console.warn(`🚫 Profissional ${meuId} tentou editar agendamento ${id} do profissional ${agendamento.profissional_id}`);
                return res.status(403).json({
                    success: false,
                    message: 'Você só pode editar seus próprios agendamentos'
                });
            }

            // 2) Não pode transferir pra outro profissional
            if (profissional_id !== undefined && profissional_id !== null && profissional_id !== '') {
                if (parseInt(profissional_id) !== parseInt(meuId)) {
                    console.warn(`🚫 Profissional ${meuId} tentou transferir para ${profissional_id}`);
                    return res.status(403).json({
                        success: false,
                        message: 'Você não pode transferir agendamentos para outro profissional'
                    });
                }
            }
        }

        if (cliente_id) {
            empresaDb.get(
                `SELECT id FROM clientes WHERE id = ? AND empresa_id = ?`,
                [cliente_id, empresa_id],
                (err, cliente) => {
                    if (err || !cliente) {
                        return res.status(404).json({
                            success: false,
                            message: 'Cliente não encontrado'
                        });
                    }
                    continuarUpdate();
                }
            );
        } else {
            continuarUpdate();
        }

        function continuarUpdate() {
            let query = `UPDATE agendamentos SET `;
            let params = [];
            let updates = [];

            if (cliente_id !== undefined) {
                updates.push(`cliente_id = ?`);
                params.push(cliente_id);
            }
            if (data !== undefined) {
                updates.push(`data = ?`);
                params.push(data);
            }
            if (hora !== undefined) {
                updates.push(`hora = ?`);
                params.push(hora);
            }
            if (servico_id !== undefined) {
                updates.push(`servico_id = ?`);
                params.push(servico_id || null);
            }
            if (servico !== undefined) {
                updates.push(`servico = ?`);
                params.push(servico);
            }
            if (valor !== undefined) {
                updates.push(`valor = ?`);
                params.push(valor);
            }

            // 🔥 Profissional_id — trata diferente por role
            if (req.usuario.role === 'profissional') {
                // Profissional NUNCA altera profissional_id (sempre mantém o dele)
                // Não adiciona ao UPDATE — mantém o que está no banco
            } else if (profissional_id !== undefined) {
                // Dono pode alterar
                updates.push(`profissional_id = ?`);
                params.push(profissional_id || null);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum campo para atualizar'
                });
            }

            query += updates.join(', ');
            query += ` WHERE id = ? AND empresa_id = ?`;
            params.push(id);
            params.push(empresa_id);

            empresaDb.run(query, params, function (err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                if (this.changes === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Agendamento não encontrado ou não alterado'
                    });
                }

                const sqlSelect2 = `
                    SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, s.nome as servico_nome 
                    FROM agendamentos a
                    LEFT JOIN clientes c ON a.cliente_id = c.id
                    LEFT JOIN profissionais p ON a.profissional_id = p.id
                    LEFT JOIN servicos s ON a.servico_id = s.id
                    WHERE a.id = ? AND a.empresa_id = ?
                `;

                empresaDb.get(sqlSelect2, [id, empresa_id], (err, agendamentoAtualizado) => {
                    if (err) {
                        return res.json({
                            success: true,
                            message: 'Agendamento atualizado com sucesso'
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Agendamento atualizado com sucesso',
                        data: agendamentoAtualizado
                    });
                });
            });
        }
    });
});
// ============================================
// PUT /api/agendamentos/:id/concluir - CONCLUIR AGENDAMENTO
// ============================================

router.put('/:id/concluir', auth, verificarDono, verificarAcessoAgendamentos, async (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    // 🔍 Busca agendamento + joins
    const agendamento = await new Promise((resolve) => {
        empresaDb.get(
            `SELECT a.*, 
                    p.comissao_percent, p.nome as profissional_nome,
                    c.nome as cliente_nome, c.telefone,
                    s.nome as servico_nome, s.valor as servico_valor
             FROM agendamentos a
             LEFT JOIN profissionais p ON a.profissional_id = p.id
             LEFT JOIN clientes c ON a.cliente_id = c.id
             LEFT JOIN servicos s ON a.servico_id = s.id
             WHERE a.id = ? AND a.empresa_id = ?`,
            [id, empresaId],
            (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar agendamento:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            }
        );
    });

    if (!agendamento) {
        return res.status(404).json({
            success: false,
            message: 'Agendamento não encontrado'
        });
    }

    // ============================================
    // 💰 CALCULAR COMISSÃO (valor base + extras)
    // ============================================
    let valorBaseComissao = parseFloat(agendamento.valor) || 0;
    if (agendamento.servicos_extras) {
        try {
            const extras = typeof agendamento.servicos_extras === 'string'
                ? JSON.parse(agendamento.servicos_extras)
                : agendamento.servicos_extras;
            if (Array.isArray(extras)) {
                for (let e of extras) {
                    valorBaseComissao += parseFloat(e.valor) || 0;
                }
            }
        } catch (e) {
            console.error('⚠️ Erro ao somar extras pra comissão:', e.message);
        }
    }

    let comissao = 0;
    if (agendamento.profissional_id) {
        const percentual = parseFloat(agendamento.comissao_percent) || 30;
        comissao = valorBaseComissao * (percentual / 100);
    }

    // ============================================
    // 💾 ATUALIZAR STATUS
    // ============================================
    empresaDb.run(
        `UPDATE agendamentos SET status = 'concluido', comissao = ? WHERE id = ? AND empresa_id = ?`,
        [comissao, id, empresaId],
        async function (err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            // ============================================
            // 📱 ENVIAR WHATSAPP DE CONCLUSÃO
            // ============================================
            try {
                console.log(`📱 Enviando WhatsApp de conclusão para agendamento ${id}...`);

                const cliente = await new Promise((resolve) => {
                    empresaDb.get(
                        `SELECT nome, telefone FROM clientes WHERE id = ? AND empresa_id = ?`,
                        [agendamento.cliente_id, empresaId],
                        (err, row) => {
                            if (err) {
                                console.error('❌ Erro ao buscar cliente:', err);
                                resolve(null);
                            } else {
                                resolve(row);
                            }
                        }
                    );
                });

                if (!cliente || !cliente.telefone || cliente.telefone.length < 10) {
                    console.log('⚠️ Cliente sem telefone válido — pulando WhatsApp');
                } else {
                    const empresa = await new Promise((resolve) => {
                        db.get(
                            `SELECT id, nome, endereco, telefone_dono, whatsapp_instance, instagram 
                             FROM empresas WHERE id = ?`,
                            [empresaId],
                            (err, row) => {
                                if (err) {
                                    console.error('❌ Erro ao buscar empresa:', err);
                                    resolve(null);
                                } else {
                                    resolve(row);
                                }
                            }
                        );
                    });

                    if (!empresa || !empresa.whatsapp_instance) {
                        console.log('⚠️ Empresa sem instância WhatsApp — pulando envio');
                    } else {
                        // ============================================
                        // 🎯 MONTA ARRAY DE SERVIÇOS (principal + extras)
                        // ============================================
                        const servicosArray = [];

                        // Principal
                        const nomePrincipal = agendamento.servico_nome || agendamento.servico || 'Serviço';
                        const valorPrincipal = parseFloat(agendamento.valor) || 0;
                        servicosArray.push({ nome: nomePrincipal, valor: valorPrincipal });

                        // Extras
                        if (agendamento.servicos_extras) {
                            try {
                                const extras = typeof agendamento.servicos_extras === 'string'
                                    ? JSON.parse(agendamento.servicos_extras)
                                    : agendamento.servicos_extras;

                                if (Array.isArray(extras)) {
                                    for (const e of extras) {
                                        if (e && (e.nome || e.valor)) {
                                            servicosArray.push({
                                                nome: e.nome || `Extra - R$ ${(parseFloat(e.valor) || 0).toFixed(2).replace('.', ',')}`,
                                                valor: parseFloat(e.valor) || 0
                                            });
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error('⚠️ Erro ao parsear extras:', e.message);
                            }
                        }

                        // ============================================
                        // 🎯 CALCULA VALORES
                        // ============================================
                        const subtotal = servicosArray.reduce((s, x) => s + (parseFloat(x.valor) || 0), 0);

                        // ⚠️ Sem desconto na rota /concluir (não tem esse dado)
                        const desconto = 0;
                        const valorFinal = subtotal;

                        // ============================================
                        // 🚀 CHAMA A FUNÇÃO UNIFICADA
                        // ============================================
                        const { enviarConclusao } = require('../services/whatsapp');

                        const resultado = await enviarConclusao({
                            cliente: {
                                nome: cliente.nome,
                                telefone: cliente.telefone
                            },
                            servicos: servicosArray,
                            subtotal,
                            desconto,
                            valorFinal,
                            data: agendamento.data,
                            hora: agendamento.hora,
                            profissional: agendamento.profissional_nome
                                ? { nome: agendamento.profissional_nome }
                                : null,
                            empresa: {
                                id: empresa.id,
                                nome: empresa.nome,
                                endereco: empresa.endereco,
                                telefone_dono: empresa.telefone_dono,
                                instagram: empresa.instagram,
                                whatsapp_instance: empresa.whatsapp_instance
                            }
                        });

                        if (resultado?.success) {
                            console.log(`✅ WhatsApp de conclusão enviado com sucesso`);
                        } else {
                            console.log(`⚠️ Falha ao enviar WhatsApp: ${resultado?.error || 'erro desconhecido'}`);
                        }
                    }
                }
            } catch (whatsError) {
                console.error('❌ Erro ao enviar WhatsApp de conclusão:', whatsError.message);
            }

            res.json({
                success: true,
                message: 'Agendamento concluído com sucesso!',
                comissao: comissao
            });
        }
    );
});
// ============================================
// PUT /api/agendamentos/:id/confirmar - CONFIRMAR AGENDAMENTO
// ============================================

router.put('/:id/confirmar', auth, verificarDono, verificarAcessoAgendamentos, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    console.log(`✅ Confirmando agendamento ${id}`);

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    empresaDb.get(
        `SELECT id FROM agendamentos WHERE id = ? AND empresa_id = ?`,
        [id, empresaId],
        (err, row) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!row) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }

            const sql = `UPDATE agendamentos SET status = 'confirmado' WHERE id = ? AND empresa_id = ?`;

            empresaDb.run(sql, [id, empresaId], function (err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                res.json({
                    success: true,
                    message: 'Agendamento confirmado com sucesso!'
                });
            });
        }
    );
});

// ============================================
// PUT /api/agendamentos/:id/cancelar - CANCELAR AGENDAMENTO
// ============================================

router.put('/:id/cancelar', auth, verificarDono, verificarAcessoAgendamentos, async (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { motivo } = req.body;

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    empresaDb.get(
        `SELECT a.*, c.nome as cliente_nome, c.telefone, s.nome as servico_nome
         FROM agendamentos a
         LEFT JOIN clientes c ON a.cliente_id = c.id
         LEFT JOIN servicos s ON a.servico_id = s.id
         WHERE a.id = ? AND a.empresa_id = ?`,
        [id, empresaId],
        async (err, agendamento) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            if (!agendamento) {
                return res.json({ success: false, message: 'Agendamento não encontrado' });
            }

            if (agendamento.status === 'concluido') {
                return res.json({ success: false, message: 'Agendamentos concluídos não podem ser cancelados' });
            }

            empresaDb.run(
                `UPDATE agendamentos SET status = 'cancelado', motivo_cancelamento = ? WHERE id = ? AND empresa_id = ?`,
                [motivo || 'Cancelado pelo dono', id, empresaId],
                async function (err) {
                    if (err) {
                        return res.json({ success: false, message: err.message });
                    }

                    if (agendamento.telefone) {
                        try {
                            const empresa = await new Promise((resolve) => {
                                db.get(
                                    'SELECT id, nome, telefone_dono, whatsapp_instance, instagram FROM empresas WHERE id = ?',
                                    [empresaId],
                                    (err, row) => {
                                        resolve(row || {});
                                    }
                                );
                            });

                            if (empresa && empresa.whatsapp_instance) {
                                const telefoneLimpo = agendamento.telefone.replace(/\D/g, '');
                                const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                                const nomeEmpresa = empresa.nome || 'See&Agende';
                                const nomeServico = agendamento.servico_nome || agendamento.servico || 'Serviço';
                                const motivoCancelamento = motivo || 'Não informado';

                                const mensagem = `❌ *Agendamento Cancelado*\n\n` +
                                    `Olá *${agendamento.cliente_nome}*,\n` +
                                    `Infelizmente seu agendamento na *${nomeEmpresa}* foi cancelado.\n\n` +
                                    `📋 *DETALHES:*\n` +
                                    `✂️ Serviço: *${nomeServico}*\n` +
                                    `📅 Data: *${formatarDataBr(agendamento.data)}*\n` +
                                    `⏰ Hora: *${agendamento.hora}*\n` +
                                    `⚠️ Motivo: ${motivoCancelamento}\n\n` +
                                    `📞 Entre em contato para remarcar:\n` +
                                    `${empresa.telefone_dono || 'N/A'}\n` +
                                    montarRodapeInstagram(empresa) + `\n\n` +
                                    `---\n_Mensagem automática do See&Agende_`;

                                const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://179.199.134.127:8080';
                                const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

                                await axios.post(
                                    `${EVOLUTION_API_URL}/message/sendText/${empresa.whatsapp_instance}`,
                                    {
                                        number: numeroFormatado,
                                        text: mensagem,
                                        delay: 1200
                                    },
                                    {
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'apikey': EVOLUTION_API_KEY
                                        },
                                        timeout: 30000
                                    }
                                );
                            }
                        } catch (whatsappError) {
                            console.error('❌ Erro ao enviar WhatsApp de cancelamento:', whatsappError.message);
                        }
                    }

                    res.json({
                        success: true,
                        message: 'Agendamento cancelado com sucesso!'
                    });
                }
            );
        }
    );
});

// ============================================
// DELETE /api/agendamentos/:id - EXCLUIR AGENDAMENTO
// ============================================

router.delete('/:id', auth, verificarAcessoAgendamentos, (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;

        console.log(`🗑️ Deletando agendamento ID: ${id} da empresa ${empresaId}`);

        const empresaDb = getEmpresaDb(empresaId);
        if (!empresaDb) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        const sqlCheck = "SELECT id, status FROM agendamentos WHERE id = ? AND empresa_id = ?";
        empresaDb.get(sqlCheck, [id, empresaId], (err, agendamento) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!agendamento) {
                return res.status(404).json({
                    success: false,
                    message: 'Agendamento não encontrado'
                });
            }

            const sqlDelete = "DELETE FROM agendamentos WHERE id = ? AND empresa_id = ?";
            empresaDb.run(sqlDelete, [id, empresaId], function (err) {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                console.log(`✅ Agendamento ${id} deletado com sucesso`);
                res.json({
                    success: true,
                    message: 'Agendamento deletado com sucesso!'
                });
            });
        });
    } catch (error) {
        console.error('❌ Erro na rota DELETE /api/agendamentos/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// ============================================
// PUT /api/agendamentos/:id/extras - ADICIONAR/ATUALIZAR EXTRAS
// ============================================
// 💡 Melhorado: recalcula valor_extras no servidor (não confia só no front)

router.put('/:id/extras', auth, verificarDono, verificarAcessoAgendamentos, (req, res) => {
    const { id } = req.params;
    const { servicos_extras } = req.body;
    const empresaId = req.usuario.empresa_id;

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    // ✅ Garante que é array
    let extrasArray = [];
    if (Array.isArray(servicos_extras)) {
        extrasArray = servicos_extras;
    } else if (typeof servicos_extras === 'string') {
        try {
            extrasArray = JSON.parse(servicos_extras);
            if (!Array.isArray(extrasArray)) extrasArray = [];
        } catch {
            extrasArray = [];
        }
    }

    // ✅ Recalcula valor_extras no servidor (fonte da verdade)
    const valorExtrasCalculado = extrasArray.reduce(
        (soma, e) => soma + (parseFloat(e?.valor) || 0), 0
    );

    const sql = "UPDATE agendamentos SET servicos_extras = ?, valor_extras = ? WHERE id = ? AND empresa_id = ?";

    empresaDb.run(sql, [
        JSON.stringify(extrasArray),
        valorExtrasCalculado,
        id,
        empresaId
    ], function (err) {
        if (err) {
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Agendamento não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Extras atualizados com sucesso!',
            data: {
                servicos_extras: extrasArray,
                valor_extras: valorExtrasCalculado
            }
        });
    });
});

// ============================================
// PUT /api/agendamentos/:id/pagamento - REGISTRAR PAGAMENTO
// ============================================

router.put('/:id/pagamento', auth, verificarAcessoAgendamentos, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { 
        forma_pagamento, 
        prazo_dias, 
        data_vencimento, 
        descricao_pagamento,
        desconto,
        valor_final
    } = req.body;

    console.log(`📝 Registrando pagamento para agendamento ${id}`);
    console.log(`📝 Forma: ${forma_pagamento}, Prazo: ${prazo_dias}, Desconto: R$ ${desconto || 0}`);

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sqlCheck = `
        SELECT id, status, cliente_id, servico, servico_id, valor, valor_total, 
               servicos_extras, valor_extras, data, hora, profissional_id
        FROM agendamentos 
        WHERE id = ? AND empresa_id = ?
    `;
    
    empresaDb.get(sqlCheck, [id, empresaId], (err, agendamento) => {
        if (err) {
            console.error('❌ Erro ao verificar agendamento:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        if (!agendamento) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.status(400).json({ success: false, message: 'Agendamento já foi concluído' });
        }

        // ============================================
        // 💰 CALCULA VALORES
        // ============================================
        let valorPrincipal = parseFloat(agendamento.valor) || 0;
        let valorExtras = 0;

        if (agendamento.servicos_extras) {
            try {
                const extras = typeof agendamento.servicos_extras === 'string' 
                    ? JSON.parse(agendamento.servicos_extras) 
                    : agendamento.servicos_extras;
                if (Array.isArray(extras)) {
                    for (let extra of extras) {
                        valorExtras += parseFloat(extra.valor) || 0;
                    }
                }
            } catch (e) {
                console.error('❌ Erro ao calcular extras:', e);
            }
        }

        const valorBruto = valorPrincipal + valorExtras;

        const descontoAplicado = Math.max(parseFloat(desconto) || 0, 0);
        const valorFinal = valor_final !== undefined && valor_final !== null
            ? Math.max(parseFloat(valor_final) || 0, 0)
            : Math.max(valorBruto - descontoAplicado, 0);

        console.log(`💰 Bruto: R$ ${valorBruto}, Desconto: R$ ${descontoAplicado}, Final: R$ ${valorFinal}`);

        let dataVencimentoFinal = data_vencimento || null;
        
        if (forma_pagamento === 'prazo' && prazo_dias && !dataVencimentoFinal) {
            const hoje = new Date();
            hoje.setDate(hoje.getDate() + parseInt(prazo_dias));
            dataVencimentoFinal = hoje.toISOString().split('T')[0];
        }

        // ============================================
        // 💾 GRAVA NO BANCO
        // ============================================
        const sqlUpdate = `
            UPDATE agendamentos 
            SET status = 'concluido',
                forma_pagamento = ?,
                prazo_dias = ?,
                data_vencimento = ?,
                descricao_pagamento = ?,
                valor_bruto = ?,
                desconto_valor = ?,
                valor_total = ?,
                valor_extras = ?
            WHERE id = ? AND empresa_id = ?
        `;

        empresaDb.run(sqlUpdate, [
            forma_pagamento || 'dinheiro',
            prazo_dias || 0,
            dataVencimentoFinal,
            descricao_pagamento || '',
            valorBruto,
            descontoAplicado,
            valorFinal,
            valorExtras,
            id,
            empresaId
        ], function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar agendamento:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            console.log(`✅ Agendamento ${id} concluído. Pago: R$ ${valorFinal}`);

            // ============================================
            // 📊 INSERIR RECEITA
            // ============================================
            const hoje = new Date().toISOString().split('T')[0];
            const descricao = `Agendamento #${id} - ${agendamento.servico || 'Serviço'}`;

            empresaDb.get(
                `SELECT name FROM sqlite_master WHERE type='table' AND name='receitas'`,
                [],
                (err, tableExists) => {
                    if (!tableExists) {
                        empresaDb.run(
                            `CREATE TABLE IF NOT EXISTS receitas (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                empresa_id INTEGER NOT NULL,
                                descricao TEXT NOT NULL,
                                valor REAL NOT NULL,
                                data TEXT NOT NULL,
                                forma_pagamento TEXT NOT NULL,
                                agendamento_id INTEGER,
                                status TEXT DEFAULT 'recebido',
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                            )`,
                            (err) => {
                                if (!err) inserirReceita();
                            }
                        );
                    } else {
                        inserirReceita();
                    }
                }
            );

            function inserirReceita() {
                empresaDb.run(
                    `INSERT INTO receitas 
                     (empresa_id, descricao, valor, data, forma_pagamento, agendamento_id, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, 'recebido', datetime('now'))`,
                    [
                        empresaId,
                        descricao,
                        valorFinal,
                        hoje,
                        forma_pagamento || 'dinheiro',
                        id
                    ],
                    function (err) {
                        if (err) {
                            console.error('❌ Erro ao inserir receita:', err.message);
                        } else {
                            console.log(`✅ Receita inserida: R$ ${valorFinal}`);
                        }
                    }
                );
            }

            // ============================================
            // 📱 WHATSAPP
            // ============================================
            // Regra:
            //   - Fiado (prazo) → mensagem de FIADO
            //   - Outros        → mensagem de CONCLUSÃO
            // ============================================
            const enviarWhats = async () => {
                try {
                    // Buscar cliente
                    const cliente = await new Promise((resolve) => {
                        empresaDb.get(
                            `SELECT nome, telefone FROM clientes WHERE id = ? AND empresa_id = ?`,
                            [agendamento.cliente_id, empresaId],
                            (err, row) => {
                                if (err) {
                                    console.error('❌ Erro ao buscar cliente:', err);
                                    resolve(null);
                                } else {
                                    resolve(row);
                                }
                            }
                        );
                    });

                    if (!cliente || !cliente.telefone || cliente.telefone.length < 10) {
                        console.log('⚠️ Cliente sem telefone válido — pulando WhatsApp');
                        return;
                    }

                    // Buscar empresa
                    const empresa = await new Promise((resolve) => {
                        db.get(
                            `SELECT id, nome, endereco, telefone_dono, whatsapp_instance, instagram 
                             FROM empresas WHERE id = ?`,
                            [empresaId],
                            (err, row) => {
                                if (err) {
                                    console.error('❌ Erro ao buscar empresa:', err);
                                    resolve(null);
                                } else {
                                    resolve(row);
                                }
                            }
                        );
                    });

                    if (!empresa || !empresa.whatsapp_instance) {
                        console.log('⚠️ Empresa sem instância WhatsApp — pulando envio');
                        return;
                    }

                    // ============================================
                    // FIADO → mensagem de fiado (comportamento atual)
                    // ============================================
                    if (forma_pagamento === 'prazo' && dataVencimentoFinal) {
                        const valorFormatado = valorFinal.toFixed(2).replace('.', ',');
                        const diffDays = parseInt(prazo_dias) || 0;
                        const dataServico = agendamento.data || new Date().toISOString().split('T')[0];

                        let mensagem = `📝 *Pagamento a Prazo (Fiado)*\n\n`;
                        mensagem += `Olá *${cliente.nome || 'Cliente'}*!\n\n`;
                        mensagem += `Seu agendamento na *${empresa.nome || 'See&Agende'}* foi registrado como *FIADO*.\n\n`;
                        mensagem += `📋 *DETALHES:*\n`;
                        mensagem += `✂️ Serviço: *${agendamento.servico || 'Serviço'}*\n`;
                        mensagem += `📅 Data: *${formatarDataBr(dataServico)}*\n`;
                        mensagem += `💰 Valor: *R$ ${valorFormatado}*\n`;
                        mensagem += `📅 Vencimento: *${formatarDataBr(dataVencimentoFinal)}*\n`;
                        mensagem += `⏳ Prazo: *${diffDays} dias*\n\n`;
                        mensagem += `📞 *Contato:* ${empresa.telefone_dono || 'N/A'}\n`;
                        mensagem += montarRodapeInstagram(empresa) + `\n\n`;
                        mensagem += `---\n_Mensagem automática do See&Agende_`;

                        const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
                        const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://179.199.134.127:8080';
                        const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

                        await axios.post(
                            `${EVOLUTION_API_URL}/message/sendText/${empresa.whatsapp_instance}`,
                            { number: numeroFormatado, text: mensagem, delay: 1200 },
                            { headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY }, timeout: 30000 }
                        );

                        console.log(`✅ WhatsApp de FIADO enviado`);
                        return;
                    }

                    // ============================================
                    // OUTROS → mensagem de conclusão
                    // ============================================
                    const servicosArray = [];

                    // Principal
                    const nomePrincipal = agendamento.servico || 'Serviço';
                    servicosArray.push({ nome: nomePrincipal, valor: valorPrincipal });

                    // Extras
                    if (agendamento.servicos_extras) {
                        try {
                            const extras = typeof agendamento.servicos_extras === 'string'
                                ? JSON.parse(agendamento.servicos_extras)
                                : agendamento.servicos_extras;
                            if (Array.isArray(extras)) {
                                for (const e of extras) {
                                    if (e && (e.nome || e.valor)) {
                                        servicosArray.push({
                                            nome: e.nome || `Extra - R$ ${(parseFloat(e.valor) || 0).toFixed(2).replace('.', ',')}`,
                                            valor: parseFloat(e.valor) || 0
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('⚠️ Erro ao parsear extras:', e.message);
                        }
                    }

                    // Busca nome do profissional
                    let profissionalNome = null;
                    if (agendamento.profissional_id) {
                        const prof = await new Promise((resolve) => {
                            empresaDb.get(
                                `SELECT nome FROM profissionais WHERE id = ?`,
                                [agendamento.profissional_id],
                                (err, row) => resolve(row || null)
                            );
                        });
                        if (prof) profissionalNome = prof.nome;
                    }

                    const { enviarConclusao } = require('../services/whatsapp');

                    const resultado = await enviarConclusao({
                        cliente: {
                            nome: cliente.nome,
                            telefone: cliente.telefone
                        },
                        servicos: servicosArray,
                        subtotal: valorBruto,
                        desconto: descontoAplicado,
                        valorFinal: valorFinal,
                        data: agendamento.data,
                        hora: agendamento.hora,
                        profissional: profissionalNome ? { nome: profissionalNome } : null,
                        empresa: {
                            id: empresa.id,
                            nome: empresa.nome,
                            endereco: empresa.endereco,
                            telefone_dono: empresa.telefone_dono,
                            instagram: empresa.instagram,
                            whatsapp_instance: empresa.whatsapp_instance
                        }
                    });

                    if (resultado?.success) {
                        console.log(`✅ WhatsApp de conclusão enviado com sucesso`);
                    } else {
                        console.log(`⚠️ Falha ao enviar WhatsApp: ${resultado?.error || 'erro desconhecido'}`);
                    }
                } catch (whatsError) {
                    console.error('❌ Erro ao enviar WhatsApp:', whatsError.message);
                }
            };

            // Dispara o envio (não bloqueia a resposta)
            enviarWhats();

            // ============================================
            // ✅ RESPONDER
            // ============================================
            res.json({
                success: true,
                message: forma_pagamento === 'prazo' 
                    ? 'Pagamento registrado como FIADO!' 
                    : 'Pagamento registrado com sucesso!',
                data: {
                    forma_pagamento: forma_pagamento,
                    data_vencimento: dataVencimentoFinal,
                    prazo_dias: prazo_dias || 0,
                    valor_bruto: valorBruto,
                    desconto: descontoAplicado,
                    valor_total: valorFinal
                }
            });
        });
    });
});
// ============================================
// POST /api/agendamentos/:id/enviar-cobranca - ENVIAR COBRANÇA MANUAL
// ============================================

router.post('/:id/enviar-cobranca', auth, verificarDono, verificarAcessoAgendamentos, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;

        console.log(`📤 Enviando cobrança manual para agendamento ${id}`);

        const empresaDb = getEmpresaDb(empresaId);

        if (!empresaDb) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        const agendamento = await new Promise((resolve, reject) => {
            empresaDb.get(
                `SELECT a.*, c.nome as cliente_nome, c.telefone, s.nome as servico_nome
                 FROM agendamentos a
                 LEFT JOIN clientes c ON a.cliente_id = c.id
                 LEFT JOIN servicos s ON a.servico_id = s.id
                 WHERE a.id = ? AND a.empresa_id = ?`,
                [id, empresaId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Agendamento não encontrado'
            });
        }

        const empresa = await new Promise((resolve) => {
            db.get(
                `SELECT id, nome, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?`,
                [empresaId],
                (err, row) => {
                    if (err) {
                        console.error('❌ Erro ao buscar empresa:', err);
                        resolve(null);
                    } else {
                        resolve(row);
                    }
                }
            );
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        if (agendamento.forma_pagamento !== 'prazo') {
            return res.status(400).json({
                success: false,
                message: 'Este agendamento não é fiado'
            });
        }

        if (!agendamento.telefone) {
            return res.status(400).json({
                success: false,
                message: 'Cliente não tem telefone cadastrado'
            });
        }

        if (!empresa.whatsapp_instance) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não tem WhatsApp configurado'
            });
        }

        const dataVencimento = new Date(agendamento.data_vencimento);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dataVencimento.setHours(0, 0, 0, 0);

        const diffTime = hoje - dataVencimento;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const { enviarMensagemCobranca, gerarMensagemCobrança } = require('../jobs/lembretes-pagamento');

        const mensagem = gerarMensagemCobrança({
            cliente_nome: agendamento.cliente_nome,
            servico_nome: agendamento.servico_nome || agendamento.servico || 'Serviço',
            valor: agendamento.valor_total || agendamento.valor || 0,
            data_servico: agendamento.data,
            data_vencimento: agendamento.data_vencimento,
            empresa_nome: empresa.nome,
            telefone_dono: empresa.telefone_dono,
            dias_atraso: diffDays > 0 ? diffDays : 0,
            empresa_id: agendamento.empresa_id
        });

        const resultado = await enviarMensagemCobranca(
            empresa.whatsapp_instance,
            agendamento.telefone,
            mensagem
        );

        if (resultado.success) {
            empresaDb.run(
                `UPDATE agendamentos 
                 SET lembrete_cobranca_enviado = 1,
                     lembrete_cobranca_enviado_em = CURRENT_TIMESTAMP,
                     ultimo_lembrete_cobranca_tipo = 'manual'
                 WHERE id = ?`,
                [id]
            );

            res.json({
                success: true,
                message: 'Cobrança enviada com sucesso!',
                data: {
                    cliente: agendamento.cliente_nome,
                    telefone: agendamento.telefone,
                    mensagem: mensagem
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erro ao enviar cobrança: ' + resultado.error
            });
        }

    } catch (error) {
        console.error('❌ Erro ao enviar cobrança manual:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;