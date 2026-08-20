// ============================================
// ROTAS DE AGENDAMENTOS - SEE&AGENDE
// ============================================

const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');
const axios = require('axios');

const {
    formatarDataBr,
    incrementarContadorAgendamentos,
    verificarDisponibilidadeHorario
} = require('../utils/helpers');

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

router.post('/', auth, async (req, res) => {
    const { cliente_id, data, hora, servico_id, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('📝 Criando agendamento:', JSON.stringify({ cliente_id, data, hora, servico_id, profissional_id, empresa_id }, null, 2));

    if (!cliente_id || !data) {
        return res.json({ success: false, message: 'Cliente e data são obrigatórios' });
    }

    if (!hora) {
        return res.json({ success: false, message: 'Horário é obrigatório' });
    }

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

    console.log(`📅 Data recebida: ${data}`);

    const empresaDb = getEmpresaDb(empresa_id);

    // VERIFICAR SE JÁ EXISTE AGENDAMENTO NO MESMO HORÁRIO
    const sqlCheckHorario = `
        SELECT id FROM agendamentos 
        WHERE empresa_id = ? 
        AND data = ? 
        AND hora = ? 
        AND status != 'cancelado'
        LIMIT 1
    `;

    const horarioOcupado = await new Promise((resolve) => {
        empresaDb.get(sqlCheckHorario, [empresa_id, data, hora], (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar horário:', err);
                resolve(null);
            } else {
                resolve(row);
            }
        });
    });

    if (horarioOcupado) {
        console.log(`⚠️ Horário ${hora} do dia ${data} já está ocupado`);
        return res.json({
            success: false,
            message: `⛔ O horário ${hora} já está ocupado. Escolha outro horário.`
        });
    }

    // Verificar agendamento do cliente no mesmo dia
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

    // ============================================
    // FUNÇÃO FINALIZAR RESPOSTA
    // ============================================
    async function finalizarResposta(agendamentoId) {
        if (!agendamentoId) {
            return res.json({
                success: false,
                message: 'Erro ao criar agendamento: ID não gerado'
            });
        }

        // Incrementar contador
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

        // ============================================
        // ENVIAR WHATSAPP
        // ============================================
        try {
            console.log('📱 Tentando enviar WhatsApp...');

            const empresaDb = getEmpresaDb(empresa_id);
            if (!empresaDb) {
                console.log('⚠️ Erro ao conectar ao banco da empresa');
                return res.json({
                    success: true,
                    data: { id: agendamentoId },
                    message: 'Agendamento criado, mas WhatsApp não enviado'
                });
            }

            // Buscar cliente no banco da empresa
            const cliente = await new Promise((resolve) => {
                empresaDb.get(
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
                // Buscar empresa no banco principal
                const empresa = await new Promise((resolve) => {
                    db.get(
                        `SELECT id, nome, endereco, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?`,
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
                    const nomeEmpresa = empresa.nome || 'See&Agende';
                    const endereco = empresa.endereco || '';
                    const telefoneDono = empresa.telefone_dono || '';

                    const mensagem = `🌟 *${nomeEmpresa.toUpperCase()}* 🌟\n\n` +
                        `Olá *${cliente.nome}*! Seu agendamento foi confirmado! ✅\n\n` +
                        `📋 *DETALHES DO AGENDAMENTO:*\n` +
                        `✂️ Serviço: *${nomeServico || 'Serviço'}*\n` +
                        `📅 Data: *${formatarDataBr(data)}*\n` +
                        `⏰ Hora: *${hora}*\n` +
                        `💰 Valor: *R$ ${valorFormatado}*\n\n` +
                        `📍 *Endereço:* ${endereco || 'N/A'}\n\n` +
                        `📞 *Contato:* ${telefoneDono || 'N/A'}\n\n` +
                        `🔗 *Agende novamente:*\n` +
                        `https://seeagende.com.br/chatbot.html?empresa=${empresa_id}\n\n` +
                        `---\n_Mensagem automática do See&Agende_`;

                    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
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

router.put('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

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

    db.get(sqlSelect, [id, empresa_id], (err, agendamento) => {
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

        if (data && data !== agendamento.data) {
            const agora = new Date();
            const [ano, mes, dia] = data.split('-').map(Number);
            const dataSelecionada = new Date(ano, mes - 1, dia);

            if (dataSelecionada < agora) {
                return res.status(400).json({
                    success: false,
                    message: 'Não é possível agendar em datas que já passaram!'
                });
            }
        }

        if (cliente_id) {
            db.get(
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
            if (profissional_id !== undefined) {
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

            db.run(query, params, function (err) {
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

                db.get(sqlSelect2, [id, empresa_id], (err, agendamentoAtualizado) => {
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

router.put('/:id/concluir', auth, verificarDono, async (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    // Buscar dados do agendamento
    const agendamento = await new Promise((resolve) => {
        db.get(
            `SELECT a.*, p.comissao_percent, p.nome as profissional_nome, 
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

    // Calcular comissão
    let comissao = 0;
    if (agendamento.profissional_id) {
        const valor = parseFloat(agendamento.valor) || 0;
        const percentual = parseFloat(agendamento.comissao_percent) || 30;
        comissao = valor * (percentual / 100);
    }

    // Atualizar status
    db.run(
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
            // ENVIAR WHATSAPP DE CONCLUSÃO
            // ============================================
            try {
                console.log(`📱 Enviando WhatsApp de conclusão para agendamento ${id}...`);

                // Buscar dados do cliente
                const cliente = await new Promise((resolve) => {
                    const empresaDb = getEmpresaDb(empresaId);
                    if (!empresaDb) {
                        resolve(null);
                        return;
                    }
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

                if (cliente && cliente.telefone && cliente.telefone.length >= 10) {
                    // Buscar dados da empresa
                    const empresa = await new Promise((resolve) => {
                        db.get(
                            `SELECT id, nome, endereco, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?`,
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

                    if (empresa && empresa.whatsapp_instance) {
                        const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
                        const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                        console.log(`📱 Enviando conclusão para: ${numeroFormatado}`);
                        console.log(`📱 Instância: ${empresa.whatsapp_instance}`);

                        let valorServico = 0;
                        if (agendamento.valor_total && parseFloat(agendamento.valor_total) > 0) {
                            valorServico = parseFloat(agendamento.valor_total);
                        } else if (agendamento.valor && parseFloat(agendamento.valor) > 0) {
                            valorServico = parseFloat(agendamento.valor);
                        } else if (agendamento.servico_valor && parseFloat(agendamento.servico_valor) > 0) {
                            valorServico = parseFloat(agendamento.servico_valor);
                        }

                        const valorFormatado = valorServico.toFixed(2).replace('.', ',');
                        const nomeServico = agendamento.servico_nome || agendamento.servico || 'Serviço';
                        const nomeEmpresa = empresa.nome || 'See&Agende';
                        const endereco = empresa.endereco || '';
                        const telefoneDono = empresa.telefone_dono || '';

                        const mensagem = `✅ *Atendimento Concluído!* 🎉\n\n` +
                            `Olá *${cliente.nome}*!\n` +
                            `Obrigado por escolher a *${nomeEmpresa}*!\n\n` +
                            `📋 *RESUMO DO SERVIÇO:*\n` +
                            `✂️ Serviço: *${nomeServico}*\n` +
                            `💰 Valor: *R$ ${valorFormatado}*\n` +
                            `📅 Data: *${formatarDataBr(agendamento.data)}* às *${agendamento.hora}*\n\n` +
                            `📍 *Endereço:* ${endereco || 'N/A'}\n\n` +
                            `📞 *Contato:* ${telefoneDono || 'N/A'}\n\n` +
                            `⭐ *Gostou do atendimento?* ⭐\n\n` +
                            `🔗 *Agende seu próximo horário:*\n` +
                            `https://seeagende.com.br/chatbot.html?empresa=${empresaId}\n\n` +
                            `---\n_Mensagem automática do See&Agende_`;

                        const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
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

                        console.log(`✅ WhatsApp de conclusão enviado para ${numeroFormatado}`);
                    } else {
                        console.log('⚠️ Empresa sem instância WhatsApp');
                    }
                } else {
                    console.log('⚠️ Cliente sem telefone válido para conclusão');
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

router.put('/:id/confirmar', auth, verificarDono, (req, res) => {
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

    db.get(
        `SELECT id FROM agendamentos WHERE id = ? AND empresa_id = ?`,
        [id, empresaId],
        (err, row) => {
            if (err) {
                console.error("❌ Erro ao verificar agendamento:", err);
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

            db.run(sql, [id, empresaId], function (err) {
                if (err) {
                    console.error("❌ Erro ao confirmar agendamento:", err);
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

router.put('/:id/cancelar', auth, verificarDono, async (req, res) => {
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

    db.get(
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

            db.run(
                `UPDATE agendamentos SET status = 'cancelado', motivo_cancelamento = ? WHERE id = ? AND empresa_id = ?`,
                [motivo || 'Cancelado pelo dono', id, empresaId],
                async function (err) {
                    if (err) {
                        return res.json({ success: false, message: err.message });
                    }

                    // ============================================
                    // ENVIAR WHATSAPP DE CANCELAMENTO
                    // ============================================
                    if (agendamento.telefone) {
                        try {
                            const empresa = await new Promise((resolve) => {
                                db.get('SELECT id, nome, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                                    resolve(row || {});
                                });
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
                                    `${empresa.telefone_dono || 'N/A'}\n\n` +
                                    `---\n_Mensagem automática do See&Agende_`;

                                const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://163.176.218.131:8080';
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

                                console.log(`✅ WhatsApp de cancelamento enviado para ${numeroFormatado}`);
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

router.delete('/:id', auth, (req, res) => {
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
// PUT /api/agendamentos/:id/extras - ADICIONAR EXTRAS
// ============================================

router.put('/:id/extras', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { servicos_extras, valor_extras } = req.body;
    const empresaId = req.usuario.empresa_id;

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = "UPDATE agendamentos SET servicos_extras = ?, valor_extras = ? WHERE id = ? AND empresa_id = ?";

    empresaDb.run(sql, [
        JSON.stringify(servicos_extras || []),
        parseFloat(valor_extras) || 0,
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
            message: 'Extras atualizados com sucesso!'
        });
    });
});

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
// GET /api/agendamentos/horarios-disponiveis - HORÁRIOS DISPONÍVEIS
// ============================================

router.get('/horarios-disponiveis', auth, (req, res) => {
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

    // Buscar horários de funcionamento
    const diaSemana = new Date(data).getDay();

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

            if (!horario || !horario.aberto) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Estabelecimento fechado neste dia'
                });
            }

            // Buscar agendamentos do dia
            let sqlAgendamentos = `
                SELECT hora, duracao FROM agendamentos 
                WHERE empresa_id = ? AND data = ? AND status NOT IN ('cancelado')
            `;
            let params = [empresaId, data];

            if (profissional_id) {
                sqlAgendamentos += ` AND profissional_id = ?`;
                params.push(profissional_id);
            }

            empresaDb.all(sqlAgendamentos, params, (err, agendamentos) => {
                if (err) {
                    console.error("❌ Erro ao buscar agendamentos:", err);
                    return res.status(500).json({
                        success: false,
                        message: err.message
                    });
                }

                // Gerar horários disponíveis (30 em 30 minutos)
                const horaInicio = horario.hora_inicio || '08:00';
                const horaFim = horario.hora_fim || '18:00';
                const almocoInicio = horario.almoco_inicio || '12:00';
                const almocoFim = horario.almoco_fim || '13:00';
                const intervalo = horario.intervalo_minutos || 30;

                const horariosDisponiveis = [];
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

                res.json({
                    success: true,
                    data: horariosDisponiveis
                });
            });
        }
    );
});

// ============================================
// GET /api/agenda/profissionais-disponiveis
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
// PUT /api/agendamentos/:id/pagamento - REGISTRAR PAGAMENTO (CORRIGIDO)
// ============================================

router.put('/:id/pagamento', auth, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { forma_pagamento, prazo_dias, data_vencimento, descricao_pagamento } = req.body;

    console.log(`📝 Registrando pagamento para agendamento ${id}`);
    console.log(`📝 Forma: ${forma_pagamento}, Prazo: ${prazo_dias} dias`);

    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sqlCheck = `SELECT id, status, cliente_id FROM agendamentos WHERE id = ? AND empresa_id = ?`;
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

        // 🔥 CORREÇÃO: DECLARAR dataVencimentoFinal
        let dataVencimentoFinal = data_vencimento || null;
        
        if (forma_pagamento === 'prazo' && prazo_dias && !dataVencimentoFinal) {
            const hoje = new Date();
            hoje.setDate(hoje.getDate() + parseInt(prazo_dias));
            dataVencimentoFinal = hoje.toISOString().split('T')[0];
            console.log(`📅 Data de vencimento calculada: ${dataVencimentoFinal}`);
        }

        // Atualizar agendamento
        const sqlUpdate = `
            UPDATE agendamentos 
            SET status = 'concluido',
                forma_pagamento = ?,
                prazo_dias = ?,
                data_vencimento = ?,
                descricao_pagamento = ?
            WHERE id = ? AND empresa_id = ?
        `;

        empresaDb.run(sqlUpdate, [
            forma_pagamento || 'dinheiro',
            prazo_dias || 0,
            dataVencimentoFinal,
            descricao_pagamento || '',
            id,
            empresaId
        ], function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar agendamento:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            console.log(`✅ Agendamento ${id} concluído com pagamento ${forma_pagamento}`);

            // ============================================
            // 🔥 SE FOR FIADO, ENVIAR MENSAGEM
            // ============================================
            if (forma_pagamento === 'prazo' && dataVencimentoFinal) {
                // 🔥 CORREÇÃO: Buscar dados separadamente (NÃO FAZER JOIN COM EMPRESAS NO BANCO DA EMPRESA)
                
                // 1. Buscar dados do agendamento e cliente no banco da empresa
                empresaDb.get(
                    `SELECT a.servico, a.valor, a.valor_total, a.data, a.cliente_id,
                            c.nome as cliente_nome, c.telefone
                     FROM agendamentos a
                     LEFT JOIN clientes c ON a.cliente_id = c.id
                     WHERE a.id = ? AND a.empresa_id = ?`,
                    [id, empresaId],
                    async (err, dados) => {
                        if (err) {
                            console.error('❌ Erro ao buscar dados:', err);
                            return;
                        }

                        if (!dados || !dados.telefone) {
                            console.log('⚠️ Cliente sem telefone, mensagem não enviada');
                            return;
                        }

                        // 2. Buscar dados da empresa no banco PRINCIPAL
                        const { db: mainDb } = require('../config/database');
                        mainDb.get(
                            `SELECT nome, telefone_dono, whatsapp_instance FROM empresas WHERE id = ?`,
                            [empresaId],
                            async (err, empresa) => {
                                if (err) {
                                    console.error('❌ Erro ao buscar empresa:', err);
                                    return;
                                }

                                if (!empresa || !empresa.whatsapp_instance) {
                                    console.log('⚠️ Empresa sem WhatsApp configurado');
                                    return;
                                }

                                // 3. Enviar mensagem
                                try {
                                    const valor = dados.valor_total || dados.valor || 0;
                                    const valorFormatado = valor.toFixed(2).replace('.', ',');
                                    const diffDays = parseInt(prazo_dias) || 0;

                                    function formatarDataBr(dataStr) {
                                        if (!dataStr) return '-';
                                        try {
                                            if (typeof dataStr === 'string' && dataStr.includes('-')) {
                                                const partes = dataStr.split('-');
                                                if (partes.length === 3) {
                                                    return partes[2] + '/' + partes[1] + '/' + partes[0];
                                                }
                                            }
                                            return dataStr;
                                        } catch {
                                            return dataStr;
                                        }
                                    }

                                    let mensagem = `📝 *Pagamento a Prazo (Fiado)*\n\n`;
                                    mensagem += `Olá *${dados.cliente_nome || 'Cliente'}*!\n\n`;
                                    mensagem += `Seu agendamento na *${empresa.nome || 'See&Agende'}* foi registrado como *FIADO*.\n\n`;
                                    mensagem += `📋 *DETALHES:*\n`;
                                    mensagem += `✂️ Serviço: *${dados.servico || 'Serviço'}*\n`;
                                    mensagem += `📅 Data: *${formatarDataBr(dados.data)}*\n`;
                                    mensagem += `💰 Valor: *R$ ${valorFormatado}*\n`;
                                    mensagem += `📅 Vencimento: *${formatarDataBr(dataVencimentoFinal)}*\n`;
                                    mensagem += `⏳ Prazo: *${diffDays} dias*\n\n`;
                                    mensagem += `💡 *Lembre-se de pagar até a data de vencimento!*\n\n`;
                                    mensagem += `📞 *Contato:* ${empresa.telefone_dono || 'N/A'}\n\n`;
                                    mensagem += `---\n_Mensagem automática do See&Agende_`;

                                    const telefoneLimpo = dados.telefone.replace(/\D/g, '');
                                    const numeroFormatado = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;

                                    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
                                    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'seeagende2024';

                                    const axios = require('axios');
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

                                    console.log(`✅ Mensagem de fiado enviada para ${dados.cliente_nome}`);
                                } catch (error) {
                                    console.error('❌ Erro ao enviar mensagem de fiado:', error.message);
                                }
                            }
                        );
                    }
                );
            }

            res.json({
                success: true,
                message: forma_pagamento === 'prazo' 
                    ? 'Pagamento registrado como FIADO! O cliente receberá a mensagem de confirmação.' 
                    : 'Pagamento registrado com sucesso!',
                data: {
                    forma_pagamento: forma_pagamento,
                    data_vencimento: dataVencimentoFinal,
                    prazo_dias: prazo_dias || 0
                }
            });
        });
    });
});

// ============================================
// POST /api/agendamentos/:id/enviar-cobranca - ENVIAR COBRANÇA MANUAL
// ============================================

router.post('/:id/enviar-cobranca', auth, verificarDono, async (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;

        console.log(`📤 Enviando cobrança manual para agendamento ${id}`);

        // Buscar dados do agendamento
        const agendamento = await new Promise((resolve, reject) => {
            db.get(
                `SELECT a.*, c.nome as cliente_nome, c.telefone, 
                        e.nome as empresa_nome, e.telefone_dono, e.whatsapp_instance,
                        s.nome as servico_nome
                 FROM agendamentos a
                 LEFT JOIN clientes c ON a.cliente_id = c.id
                 LEFT JOIN empresas e ON a.empresa_id = e.id
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

        if (!agendamento.whatsapp_instance) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não tem WhatsApp configurado'
            });
        }

        // Calcular dias em atraso
        const dataVencimento = new Date(agendamento.data_vencimento);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dataVencimento.setHours(0, 0, 0, 0);

        const diffTime = hoje - dataVencimento;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Importar função de envio
        const { enviarMensagemCobranca, gerarMensagemCobrança } = require('../jobs/lembretes-pagamento');

        // Gerar mensagem
        const mensagem = gerarMensagemCobrança({
            cliente_nome: agendamento.cliente_nome,
            servico_nome: agendamento.servico_nome || agendamento.servico || 'Serviço',
            valor: agendamento.valor_total || agendamento.valor || 0,
            data_servico: agendamento.data,
            data_vencimento: agendamento.data_vencimento,
            empresa_nome: agendamento.empresa_nome,
            telefone_dono: agendamento.telefone_dono,
            dias_atraso: diffDays > 0 ? diffDays : 0,
            empresa_id: agendamento.empresa_id
        });

        // Enviar mensagem
        const resultado = await enviarMensagemCobranca(
            agendamento.whatsapp_instance,
            agendamento.telefone,
            mensagem
        );

        if (resultado.success) {
            // Marcar como enviado
            db.run(
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