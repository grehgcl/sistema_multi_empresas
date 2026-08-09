// ============================================
// ROTAS DE AGENDAMENTOS
// ============================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');
// server/routes/agendamentos.routes.js - No início do arquivo


// ✅ IMPORTAR FUNÇÕES DO HELPERS
const {
    formatarDataBr,
    incrementarContadorAgendamentos,
    verificarDisponibilidadeHorario
} = require('../utils/helpers');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// GET /api/agendamentos
// ============================================
router.get('/', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { data, status, cliente_id, profissional_id, mes, ano } = req.query;

    // 🔥 CORREÇÃO: Usar TO_CHAR no PostgreSQL para formatar a data
    let sql = isProduction
        ? `SELECT a.*, 
           TO_CHAR(a.data, 'YYYY-MM-DD') as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome 
           FROM agendamentos a 
           LEFT JOIN clientes c ON a.cliente_id = c.id 
           LEFT JOIN profissionais p ON a.profissional_id = p.id 
           LEFT JOIN servicos s ON a.servico_id = s.id 
           WHERE a.empresa_id = $1`
        : `SELECT a.*, 
           date(a.data) as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome 
           FROM agendamentos a 
           LEFT JOIN clientes c ON a.cliente_id = c.id 
           LEFT JOIN profissionais p ON a.profissional_id = p.id 
           LEFT JOIN servicos s ON a.servico_id = s.id 
           WHERE a.empresa_id = ?`;

    let params = [empresaId];
    let counter = 2;

    if (data) {
        sql += isProduction
            ? ` AND DATE(a.data) = DATE($${counter})`
            : " AND date(a.data) = date(?)";
        params.push(data);
        counter++;
    }

    if (status) {
        sql += isProduction ? ` AND a.status = $${counter}` : " AND a.status = ?";
        params.push(status);
        counter++;
    }

    if (cliente_id) {
        sql += isProduction ? ` AND a.cliente_id = $${counter}` : " AND a.cliente_id = ?";
        params.push(cliente_id);
        counter++;
    }

    if (profissional_id) {
        sql += isProduction ? ` AND a.profissional_id = $${counter}` : " AND a.profissional_id = ?";
        params.push(profissional_id);
        counter++;
    }

    if (mes && ano) {
        sql += isProduction
            ? ` AND EXTRACT(MONTH FROM a.data) = $${counter} AND EXTRACT(YEAR FROM a.data) = $${counter + 1}`
            : " AND strftime('%m', a.data) = ? AND strftime('%Y', a.data) = ?";
        params.push(mes, ano);
        counter += 2;
    }

    sql += isProduction ? " ORDER BY a.data DESC, a.hora ASC" : " ORDER BY a.data DESC, a.hora ASC";

    db.all(sql, params, (err, agendamentos) => {
        if (err) {
            console.error("❌ Erro ao buscar agendamentos:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        // 🔥 CORREÇÃO: Substituir o campo data pelo formatado
        const dados = agendamentos.map(ag => {
            // Se tiver data_formatada do PostgreSQL, usa ela
            if (ag.data_formatada) {
                // Mantém a data original para compatibilidade
                ag.data_original = ag.data;
                ag.data = ag.data_formatada;
            }
            // Remove o campo extra
            delete ag.data_formatada;
            return ag;
        });

        res.json({
            success: true,
            data: dados || []
        });
    });
});

// ============================================
// POST /api/agendamentos (CRIAR) - CORRIGIDO
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
    console.log(`📅 Data a salvar: ${data}`);

    // 🔥 CORREÇÃO: Verificar agendamento do cliente no mesmo dia usando DATE()
    const sqlAgendamentoHoje = isProduction
        ? `SELECT id FROM agendamentos 
           WHERE cliente_id = $1 
           AND DATE(data) = DATE($2)
           AND empresa_id = $3 
           AND status != 'cancelado'
           LIMIT 1`
        : `SELECT id FROM agendamentos 
           WHERE cliente_id = ? 
           AND date(data) = date(?)
           AND empresa_id = ? 
           AND status != 'cancelado'
           LIMIT 1`;

    const agendamentoHoje = await new Promise((resolve) => {
        db.get(sqlAgendamentoHoje, [parseInt(cliente_id), data, parseInt(empresa_id)], (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar agendamento no mesmo dia:', err);
                resolve(null);
            } else {
                resolve(row);
            }
        });
    });

    if (agendamentoHoje) {
        // Buscar o agendamento existente para mostrar detalhes
        const sqlExistente = isProduction
            ? `SELECT id, data, hora FROM agendamentos WHERE id = $1`
            : `SELECT id, data, hora FROM agendamentos WHERE id = ?`;

        const existente = await new Promise((resolve) => {
            db.get(sqlExistente, [agendamentoHoje.id], (err, row) => {
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
        const sqlServico = isProduction
            ? `SELECT nome, valor, duracao FROM servicos WHERE id = $1 AND empresa_id = $2 AND ativo = true`
            : `SELECT nome, valor, duracao FROM servicos WHERE id = ? AND empresa_id = ? AND ativo = 1`;

        const servicoInfo = await new Promise((resolve) => {
            db.get(sqlServico, [parseInt(servico_id), empresa_id], (err, row) => {
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

    const sqlInsert = isProduction
        ? `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, valor_total, duracao, status, empresa_id, profissional_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente', $9, $10) RETURNING id`
        : `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, valor_total, duracao, status, empresa_id, profissional_id) 
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

    db.run(sqlInsert, params, async function (err) {
        if (err) {
            console.error('❌ Erro ao criar agendamento:', err.message);
            return res.json({ success: false, message: 'Erro ao criar agendamento: ' + err.message });
        }

        // 🔥 CORRIGIDO: O ID vem do this.lastID (que o database.js retorna)
        let id = this?.lastID || null;

        // 🔥 SE AINDA FOR NULL, tenta pegar do result.rows
        if (!id) {
            // Fallback: buscar o último agendamento criado
            db.get(
                `SELECT id FROM agendamentos WHERE cliente_id = $1 AND data = $2 AND hora = $3 ORDER BY id DESC LIMIT 1`,
                [cliente_id, data, hora],
                (err, row) => {
                    if (!err && row) {
                        id = row.id;
                        console.log('✅ ID recuperado via fallback:', id);
                    }
                }
            );
        }

        console.log('✅ Agendamento criado com ID:', id, 'Data:', data);

        // ✅ INCREMENTAR CONTADOR - CORRIGIDO
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

        // 🔥 ENVIAR WHATSAPP
        try {
            console.log('📱 Tentando enviar WhatsApp...');

            const whatsapp = require('../services/whatsapp');

            const cliente = await new Promise((resolve) => {
                db.get(
                    'SELECT nome, telefone FROM clientes WHERE id = ? AND empresa_id = ?',
                    [cliente_id, empresa_id],
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

            const empresa = await new Promise((resolve) => {
                db.get(
                    'SELECT id, nome, endereco, telefone_dono FROM empresas WHERE id = ?',
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

            let profissionalData = null;
            if (profissionalIdFinal) {
                profissionalData = await new Promise((resolve) => {
                    db.get(
                        'SELECT nome FROM profissionais WHERE id = ?',
                        [profissionalIdFinal],
                        (err, row) => {
                            if (err) {
                                console.error('❌ Erro ao buscar profissional:', err);
                                resolve(null);
                            } else {
                                resolve(row);
                            }
                        }
                    );
                });
            }

            if (cliente && empresa) {
                console.log(`📱 Cliente: ${cliente.nome}, Telefone: ${cliente.telefone}`);
                console.log(`📱 Empresa: ${empresa.nome}`);

                if (cliente.telefone) {
                    await whatsapp.enviarConfirmacao({
                        cliente: {
                            nome: cliente.nome,
                            telefone: cliente.telefone
                        },
                        servico: {
                            nome: nomeServico || 'Serviço',
                            valor: valorServico || 0
                        },
                        data: data,
                        hora: hora,
                        profissional: profissionalData ? { nome: profissionalData.nome } : null,
                        empresa: {
                            id: empresa_id,
                            nome: empresa.nome,
                            endereco: empresa.endereco || '',
                            telefone_dono: empresa.telefone_dono || ''
                        }
                    });

                    console.log(`✅ WhatsApp: Confirmação enviada para ${cliente.telefone}`);
                } else {
                    console.log(`⚠️ Cliente ${cliente.nome} não tem telefone cadastrado`);
                }
            } else {
                console.log('⚠️ Dados do cliente ou empresa não encontrados');
            }
        } catch (whatsappError) {
            console.error('❌ Erro ao enviar WhatsApp:', whatsappError.message);
        }

        res.json({
            success: true,
            data: { id: id, profissional_id: profissionalIdFinal },
            message: 'Agendamento criado com sucesso!'
        });
    });
});

// ============================================
// PUT /api/agendamentos/:id
// ============================================
router.put('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;
    const hojeStr = new Date().toISOString().split('T')[0];

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

            const hojeStr = new Date().toISOString().split('T')[0];
            if (data === hojeStr && hora) {
                const [horaNum, minutoNum] = hora.split(':').map(Number);
                const dataHoraSelecionada = new Date(ano, mes - 1, dia, horaNum || 0, minutoNum || 0, 0, 0);
                if (dataHoraSelecionada < agora) {
                    return res.status(400).json({
                        success: false,
                        message: 'Não é possível agendar em horários que já passaram!'
                    });
                }
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
            let query = isProduction ? `UPDATE agendamentos SET ` : `UPDATE agendamentos SET `;
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

            console.log('📝 Atualizando agendamento:', query, params);

            db.run(query, params, function (err) {
                if (err) {
                    console.error('❌ Erro ao atualizar:', err);
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
                        console.error('❌ Erro ao buscar agendamento atualizado:', err);
                        return res.json({
                            success: true,
                            message: 'Agendamento atualizado com sucesso'
                        });
                    }

                    console.log(`✅ Agendamento ${id} atualizado com sucesso`);
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
// PUT /api/agendamentos/:id/concluir
// ============================================
router.put('/:id/concluir', auth, verificarDono, async (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    db.get(
        `SELECT a.*, p.comissao_percent, p.nome as profissional_nome, c.nome as cliente_nome, c.telefone, s.nome as servico_nome, s.valor as servico_valor
         FROM agendamentos a
         LEFT JOIN profissionais p ON a.profissional_id = p.id
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

            let comissao = 0;

            if (agendamento.profissional_id) {
                const valor = parseFloat(agendamento.valor) || 0;
                const percentual = parseFloat(agendamento.comissao_percent) || 30;
                comissao = valor * (percentual / 100);
            }

            db.run(
                `UPDATE agendamentos 
                 SET status = 'concluido', comissao = ? 
                 WHERE id = ? AND empresa_id = ?`,
                [comissao, id, empresaId],
                async function (err) {
                    if (err) {
                        return res.json({ success: false, message: err.message });
                    }

                    if (agendamento.telefone) {
                        try {
                            const empresa = await new Promise((resolve) => {
                                db.get('SELECT id, nome, telefone_dono, endereco FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                                    resolve(row || {});
                                });
                            });

                            let valorServico = 0;
                            if (agendamento.valor_total && parseFloat(agendamento.valor_total) > 0) {
                                valorServico = parseFloat(agendamento.valor_total);
                            } else if (agendamento.valor && parseFloat(agendamento.valor) > 0) {
                                valorServico = parseFloat(agendamento.valor);
                            } else if (agendamento.servico_valor && parseFloat(agendamento.servico_valor) > 0) {
                                valorServico = parseFloat(agendamento.servico_valor);
                            }

                            const dadosConclusao = {
                                cliente: {
                                    nome: agendamento.cliente_nome || 'Cliente',
                                    telefone: agendamento.telefone
                                },
                                servico: {
                                    nome: agendamento.servico_nome || agendamento.servico || 'Serviço',
                                    valor: valorServico
                                },
                                data: agendamento.data,
                                hora: agendamento.hora,
                                profissional: {
                                    nome: agendamento.profissional_nome || ''
                                },
                                empresa: {
                                    id: empresaId,
                                    nome: empresa?.nome || 'Barbearia',
                                    telefone_dono: empresa?.telefone_dono || '',
                                    endereco: empresa?.endereco || ''
                                },
                                agendamento_id: parseInt(id)
                            };

                            const whatsapp = require('../services/whatsapp');
                            await whatsapp.enviarConclusao(dadosConclusao);
                            console.log(`✅ WhatsApp: Conclusão enviada para ${agendamento.telefone}`);
                        } catch (whatsappError) {
                            console.error('❌ Erro ao enviar WhatsApp de conclusão:', whatsappError.message);
                        }
                    }

                    res.json({
                        success: true,
                        message: 'Agendamento concluído com sucesso!',
                        comissao: comissao
                    });
                }
            );
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
                `UPDATE agendamentos 
                 SET status = 'cancelado' 
                 WHERE id = ? AND empresa_id = ?`,
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
router.delete('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "DELETE FROM agendamentos WHERE id = $1 AND empresa_id = $2"
        : "DELETE FROM agendamentos WHERE id = ? AND empresa_id = ?";

    db.run(sql, [id, empresaId], function (err) {
        if (err) {
            console.error("Erro ao deletar agendamento:", err);
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
            message: 'Agendamento deletado com sucesso!'
        });
    });
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
            console.error("Erro ao atualizar extras:", err);
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
            console.error("Erro ao buscar agendamentos por período:", err);
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
            console.error("Erro ao buscar profissionais disponíveis:", err);
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
// ROTA: AGENDAR LEMBRETES
// ============================================

router.post('/agendar-lembretes', auth, async (req, res) => {
    try {
        const { agendamento_id, data_vencimento } = req.body;
        const empresa_id = req.user.empresa_id;

        if (!agendamento_id || !data_vencimento) {
            return res.status(400).json({
                success: false,
                message: 'Agendamento e data de vencimento são obrigatórios'
            });
        }

        // Buscar dados do agendamento
        const agendamento = await db.get(
            `SELECT a.*, c.nome as cliente_nome, c.telefone as cliente_telefone, e.nome as empresa_nome
             FROM agendamentos a
             LEFT JOIN clientes c ON a.cliente_id = c.id
             LEFT JOIN empresas e ON a.empresa_id = e.id
             WHERE a.id = ? AND a.empresa_id = ?`,
            [agendamento_id, empresa_id]
        );

        if (!agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Agendamento não encontrado'
            });
        }

        // Calcular datas dos lembretes
        const vencimento = new Date(data_vencimento);
        const data2DiasAntes = new Date(vencimento);
        data2DiasAntes.setDate(data2DiasAntes.getDate() - 2);

        const data1DiaAntes = new Date(vencimento);
        data1DiaAntes.setDate(data1DiaAntes.getDate() - 1);

        // Salvar os lembretes na tabela de lembretes (se existir)
        // Ou criar uma tabela para isso

        // Exemplo: salvar em uma tabela 'lembretes_pagamento'
        await db.run(
            `INSERT OR REPLACE INTO lembretes_pagamento 
             (agendamento_id, empresa_id, data_vencimento, lembrete_2dias, lembrete_1dia, lembrete_dia, enviado_2dias, enviado_1dia, enviado_dia)
             VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0)`,
            [
                agendamento_id,
                empresa_id,
                data_vencimento,
                data2DiasAntes.toISOString().split('T')[0],
                data1DiaAntes.toISOString().split('T')[0],
                data_vencimento
            ]
        );

        // Agendar job para enviar lembretes
        // Isso pode ser feito com node-cron ou agendando na tabela

        res.json({
            success: true,
            message: 'Lembretes agendados com sucesso!',
            data: {
                lembrete_2dias: data2DiasAntes.toISOString().split('T')[0],
                lembrete_1dia: data1DiaAntes.toISOString().split('T')[0],
                lembrete_dia: data_vencimento
            }
        });

    } catch (error) {
        console.error('❌ Erro ao agendar lembretes:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// ROTA: ATUALIZAR FORMA DE PAGAMENTO
// ============================================

router.put('/:id/pagamento', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            forma_pagamento,
            prazo_dias,
            data_vencimento,
            descricao_pagamento
        } = req.body;

        // 🔥 CORREÇÃO: Pegar empresa_id do token
        const empresa_id = req.user?.empresa_id || req.headers['x-empresa-id'];

        if (!empresa_id) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        console.log('📝 Atualizando pagamento:', { id, empresa_id, forma_pagamento, prazo_dias });

        // Verificar se o agendamento existe
        const agendamento = await db.get(
            'SELECT * FROM agendamentos WHERE id = ? AND empresa_id = ?',
            [id, empresa_id]
        );

        if (!agendamento) {
            return res.status(404).json({
                success: false,
                message: 'Agendamento não encontrado'
            });
        }

        // Atualizar com forma de pagamento e status
        await db.run(
            `UPDATE agendamentos 
             SET forma_pagamento = ?,
                 prazo_dias = ?,
                 data_vencimento = ?,
                 descricao_pagamento = ?,
                 status = 'concluido',
                 updated_at = datetime('now')
             WHERE id = ? AND empresa_id = ?`,
            [
                forma_pagamento || 'dinheiro',
                prazo_dias || 0,
                data_vencimento || null,
                descricao_pagamento || '',
                id,
                empresa_id
            ]
        );

        // Se for a prazo, agendar lembretes
        if (forma_pagamento === 'prazo' && data_vencimento) {
            // Salvar na tabela de lembretes
            await db.run(
                `INSERT OR REPLACE INTO lembretes_pagamento 
                 (agendamento_id, empresa_id, data_vencimento)
                 VALUES (?, ?, ?)`,
                [id, empresa_id, data_vencimento]
            );
        }

        res.json({
            success: true,
            message: '✅ Pagamento registrado com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro ao registrar pagamento:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;