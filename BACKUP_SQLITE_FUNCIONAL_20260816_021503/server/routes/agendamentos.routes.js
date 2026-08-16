// ============================================
// ROTAS DE AGENDAMENTOS - VERSÃO CORRIGIDA
// ============================================
const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database'); // 🔥 USAR db
const { auth, verificarDono } = require('../middlewares/auth');
const axios = require('axios');

const {
    formatarDataBr,
    incrementarContadorAgendamentos,
    verificarDisponibilidadeHorario
} = require('../utils/helpers');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// GET /api/agendamentos - COM FORMATAÇÃO
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

        // 🔥 USAR date() e time() PARA PADRONIZAR
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

            // 🔥 FORMATAR OS DADOS ANTES DE ENVIAR
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
// POST /api/agendamentos (CRIAR)
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
        // 🔥 ENVIAR WHATSAPP
        // ============================================
        // ============================================
        // ENVIAR WHATSAPP - USANDO db DIRETAMENTE
        // ============================================
        // ============================================
        // ENVIAR WHATSAPP - BUSCANDO CLIENTE NO BANCO DA EMPRESA
        // ============================================
        try {
            console.log('📱 Tentando enviar WhatsApp...');

            // 🔥 USAR BANCO DA EMPRESA PARA BUSCAR O CLIENTE
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
// PUT /api/agendamentos/:id
// ============================================
router.put('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const sqlSelect = isProduction
        ? `SELECT a.*, 
       TO_CHAR(a.data, 'YYYY-MM-DD') as data_formatada,
       c.nome as cliente_nome, 
       p.nome as profissional_nome, 
       s.nome as servico_nome 
       FROM agendamentos a
       LEFT JOIN clientes c ON a.cliente_id = c.id
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       LEFT JOIN servicos s ON a.servico_id = s.id
       WHERE a.id = $1 AND a.empresa_id = $2
       ORDER BY a.data DESC`
        : `SELECT a.*, 
       date(a.data) as data_formatada,
       c.nome as cliente_nome, 
       p.nome as profissional_nome, 
       s.nome as servico_nome 
       FROM agendamentos a
       LEFT JOIN clientes c ON a.cliente_id = c.id
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       LEFT JOIN servicos s ON a.servico_id = s.id
       WHERE a.id = ? AND a.empresa_id = ?
       ORDER BY a.data DESC`;

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
                isProduction ? `SELECT id FROM clientes WHERE id = $1 AND empresa_id = $2` : `SELECT id FROM clientes WHERE id = ? AND empresa_id = ?`,
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
            let counter = 1;

            if (cliente_id !== undefined) {
                updates.push(isProduction ? `cliente_id = $${counter++}` : `cliente_id = ?`);
                params.push(cliente_id);
            }
            if (data !== undefined) {
                updates.push(isProduction ? `data = $${counter++}` : `data = ?`);
                params.push(data);
            }
            if (hora !== undefined) {
                updates.push(isProduction ? `hora = $${counter++}` : `hora = ?`);
                params.push(hora);
            }
            if (servico_id !== undefined) {
                updates.push(isProduction ? `servico_id = $${counter++}` : `servico_id = ?`);
                params.push(servico_id || null);
            }
            if (servico !== undefined) {
                updates.push(isProduction ? `servico = $${counter++}` : `servico = ?`);
                params.push(servico);
            }
            if (valor !== undefined) {
                updates.push(isProduction ? `valor = $${counter++}` : `valor = ?`);
                params.push(valor);
            }
            if (profissional_id !== undefined) {
                updates.push(isProduction ? `profissional_id = $${counter++}` : `profissional_id = ?`);
                params.push(profissional_id || null);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nenhum campo para atualizar'
                });
            }

            query += updates.join(', ');
            query += isProduction
                ? ` WHERE id = $${counter++} AND empresa_id = $${counter++}`
                : ` WHERE id = ? AND empresa_id = ?`;
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

                const sqlSelect2 = isProduction
                    ? `SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, s.nome as servico_nome 
                       FROM agendamentos a
                       LEFT JOIN clientes c ON a.cliente_id = c.id
                       LEFT JOIN profissionais p ON a.profissional_id = p.id
                       LEFT JOIN servicos s ON a.servico_id = s.id
                       WHERE a.id = $1 AND a.empresa_id = $2`
                    : `SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, s.nome as servico_nome 
                       FROM agendamentos a
                       LEFT JOIN clientes c ON a.cliente_id = c.id
                       LEFT JOIN profissionais p ON a.profissional_id = p.id
                       LEFT JOIN servicos s ON a.servico_id = s.id
                       WHERE a.id = ? AND a.empresa_id = ?`;

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
// PUT /api/agendamentos/:id/concluir - CORRIGIDO
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
            // 🔥 ENVIAR WHATSAPP DE CONCLUSÃO DIRETAMENTE
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

                        // Valor do serviço
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
// PUT /api/agendamentos/:id/cancelar
// ============================================
router.put('/:id/cancelar', auth, verificarDono, async (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { motivo } = req.body;

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
                `UPDATE agendamentos SET status = 'cancelado' WHERE id = ? AND empresa_id = ?`,
                [id, empresaId],
                async function (err) {
                    if (err) {
                        return res.json({ success: false, message: err.message });
                    }

                    if (agendamento.telefone) {
                        try {
                            const empresa = await new Promise((resolve) => {
                                db.get('SELECT id, nome, telefone_dono FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                                    resolve(row || {});
                                });
                            });

                            const dadosCancelamento = {
                                cliente: {
                                    nome: agendamento.cliente_nome || 'Cliente',
                                    telefone: agendamento.telefone
                                },
                                servico: {
                                    nome: agendamento.servico_nome || agendamento.servico || 'Serviço'
                                },
                                data: agendamento.data,
                                hora: agendamento.hora,
                                empresa: {
                                    id: empresaId,
                                    nome: empresa?.nome || 'Barbearia',
                                    telefone_dono: empresa?.telefone_dono || ''
                                }
                            };

                            const whatsapp = require('../services/whatsapp');
                            await whatsapp.enviarCancelamento(dadosCancelamento);
                            console.log(`✅ WhatsApp: Cancelamento enviado para ${agendamento.telefone}`);
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
// DELETE /api/agendamentos/:id
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
// PUT /api/agendamentos/:id/extras
// ============================================
router.put('/:id/extras', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { servicos_extras, valor_extras } = req.body;
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "UPDATE agendamentos SET servicos_extras = $1, valor_extras = $2 WHERE id = $3 AND empresa_id = $4"
        : "UPDATE agendamentos SET servicos_extras = ?, valor_extras = ? WHERE id = ? AND empresa_id = ?";

    db.run(sql, [
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
// GET /api/agendamentos/periodo
// ============================================
router.get('/periodo', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { inicio, fim, status } = req.query;

    let sql = isProduction
        ? "SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, s.nome as servico_nome FROM agendamentos a LEFT JOIN clientes c ON a.cliente_id = c.id LEFT JOIN profissionais p ON a.profissional_id = p.id LEFT JOIN servicos s ON a.servico_id = s.id WHERE a.empresa_id = $1"
        : "SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, s.nome as servico_nome FROM agendamentos a LEFT JOIN clientes c ON a.cliente_id = c.id LEFT JOIN profissionais p ON a.profissional_id = p.id LEFT JOIN servicos s ON a.servico_id = s.id WHERE a.empresa_id = ?";
    let params = [empresaId];
    let counter = 2;

    if (inicio && fim) {
        sql += isProduction
            ? ` AND a.data BETWEEN $${counter} AND $${counter + 1}`
            : " AND a.data BETWEEN ? AND ?";
        params.push(inicio, fim);
        counter += 2;
    }

    if (status) {
        sql += isProduction ? ` AND a.status = $${counter}` : " AND a.status = ?";
        params.push(status);
    }

    sql += isProduction ? " ORDER BY a.data ASC, a.hora ASC" : " ORDER BY a.data ASC, a.hora ASC";

    db.all(sql, params, (err, agendamentos) => {
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

    const duracaoMin = parseInt(duracao) || 30;
    const horaFim = new Date(`2000-01-01T${hora}`);
    horaFim.setMinutes(horaFim.getMinutes() + duracaoMin);
    const horaFimStr = horaFim.toTimeString().slice(0, 5);

    const sql = isProduction
        ? `SELECT p.* FROM profissionais p
           WHERE p.empresa_id = $1 AND p.ativo = true
           AND NOT EXISTS (
               SELECT 1 FROM agendamentos a
               WHERE a.profissional_id = p.id
               AND a.data = $2
               AND a.status != 'cancelado'
               AND (a.hora < $4 AND a.hora + INTERVAL a.duracao MINUTE > $3)
           )
           ORDER BY p.nome`
        : `SELECT p.* FROM profissionais p
           WHERE p.empresa_id = ? AND p.ativo = 1
           AND NOT EXISTS (
               SELECT 1 FROM agendamentos a
               WHERE a.profissional_id = p.id
               AND a.data = ?
               AND a.status != 'cancelado'
               AND (a.hora < ? AND datetime(a.hora || '+' || a.duracao || ' minutes') > ?)
           )
           ORDER BY p.nome`;

    db.all(sql, [empresaId, data, hora, horaFimStr], (err, profissionais) => {
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
// PUT /api/agendamentos/:id/pagamento
// ============================================
router.put('/:id/pagamento', auth, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { forma_pagamento, prazo_dias, data_vencimento, descricao_pagamento } = req.body;

    console.log(`📝 Registrando pagamento para agendamento ${id}`);

    const empresaDb = getEmpresaDb(empresaId);

    const sqlCheck = `SELECT id, status FROM agendamentos WHERE id = ? AND empresa_id = ?`;
    empresaDb.get(sqlCheck, [id, empresaId], (err, agendamento) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        if (!agendamento) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.status(400).json({ success: false, message: 'Agendamento já foi concluído' });
        }

        const sqlUpdate = `
            UPDATE agendamentos 
            SET status = 'concluido',
                forma_pagamento = ?,
                prazo_dias = ?,
                data_vencimento = ?,
                descricao_pagamento = ?
            WHERE id = ? AND empresa_id = ?
        `;

        empresaDb.run(sqlUpdate, [forma_pagamento || 'dinheiro', prazo_dias || 0, data_vencimento || null, descricao_pagamento || '', id, empresaId], function (err) {
            if (err) {
                return res.status(500).json({ success: false, message: err.message });
            }

            console.log(`✅ Agendamento ${id} concluído com pagamento ${forma_pagamento}`);
            res.json({ success: true, message: 'Pagamento registrado com sucesso!' });
        });
    });
});

module.exports = router;