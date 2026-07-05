// ============================================================
// ARQUIVO: server/routes/agendamentos.js
// ROTAS DE AGENDAMENTOS - EXTRAÍDAS AUTOMATICAMENTE
// ============================================================

module.exports = (app, db, isProduction, auth, verificarDono, verificarLimiteAgendamentos, verificarAcessoAgendamentos, whatsappService, formatarDataBr, horaParaMinutos, minutosParaHora, gerarHorariosDoDia, verificarDisponibilidadeHorario, incrementarContadorAgendamentos) => {

    // ============================================
    app.get('/api/agendamentos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    if (!empresa_id) return res.json({ success: true, data: [] });

    const sql = isProduction
        ? `SELECT a.*, 
           to_char(a.data, 'YYYY-MM-DD') as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = $1 
           AND (a.status IN ('agendado', 'pendente', 'concluido') OR a.status IS NULL OR a.status = '')
           ORDER BY a.data DESC, a.hora ASC`
        : `SELECT a.*, 
           date(a.data) as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = ? 
           AND (a.status IN ('agendado', 'pendente', 'concluido') OR a.status IS NULL OR a.status = '')
           ORDER BY a.data DESC, a.hora ASC`;

    db.all(sql, [empresa_id], (err, agendamentos) => {
        if (err) {
            console.error('? Erro ao buscar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        const dadosFormatados = agendamentos.map(a => ({
            ...a,
            data: a.data_formatada || a.data,
            data_formatada: undefined
        }));

        res.json({ success: true, data: dadosFormatados });
    });
});


    // ============================================
    app.post('/api/agendamentos',
    auth,
    verificarAcessoAgendamentos,
    verificarLimiteAgendamentos,
    async (req, res) => {
        const { cliente_id, data, hora, servico_id, profissional_id } = req.body;
        const empresa_id = req.usuario.empresa_id;

        console.log('?? Criando agendamento:', JSON.stringify({ cliente_id, data, hora, servico_id, profissional_id, empresa_id }, null, 2));

        if (!cliente_id || !data) {
            console.log('? Cliente ou data faltando');
            return res.json({ success: false, message: 'Cliente e data são obrigatórios' });
        }

        if (!hora) {
            console.log('? Horário faltando');
            return res.json({ success: false, message: 'Horário é obrigatório' });
        }

        // ============================================
        // ?????? VALIDAÇÃO: DATA/HORA NÃO PODE SER NO PASSADO ??????
        // ============================================
        const agora = new Date();
        const [ano, mes, dia] = data.split('-').map(Number);
        const [horaStr, minutoStr] = hora.split(':').map(Number);
        const dataHoraAgendamento = new Date(ano, mes - 1, dia, horaStr, minutoStr, 0, 0);

        console.log('?? Data/Hora agendamento:', dataHoraAgendamento);
        console.log('?? Agora:', agora);

        if (dataHoraAgendamento < agora) {
            console.log('? Tentativa de agendar em data/hora passada');
            return res.json({
                success: false,
                message: '? Não é possível agendar em datas ou horários que já passaram. Selecione uma data/hora futura.'
            });
        }

        const hojeStr = agora.toISOString().split('T')[0];
        if (data === hojeStr) {
            const horaAtual = agora.getHours();
            const minutoAtual = agora.getMinutes();
            const horaAgendamento = parseInt(horaStr);
            const minutoAgendamento = parseInt(minutoStr);

            if (horaAgendamento < horaAtual || (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual)) {
                console.log('? Tentativa de agendar em horário que já passou hoje');
                return res.json({
                    success: false,
                    message: `? Não é possível agendar no horário ${hora} pois já passou. Escolha um horário futuro.`
                });
            }
        }

        // ============================================
        // ?? VALIDAÇÃO: CLIENTE JÁ TEM AGENDAMENTO NESTE DIA? (REGRRA FIXA)
        // ============================================
        const sqlAgendamentoHoje = isProduction
            ? `SELECT id FROM agendamentos 
               WHERE cliente_id = $1 
               AND data = $2 
               AND empresa_id = $3 
               AND status != 'cancelado'
               LIMIT 1`
            : `SELECT id FROM agendamentos 
               WHERE cliente_id = ? 
               AND data = ? 
               AND empresa_id = ? 
               AND status != 'cancelado'
               LIMIT 1`;

        const agendamentoHoje = await new Promise((resolve) => {
            db.get(sqlAgendamentoHoje, [parseInt(cliente_id), data, parseInt(empresa_id)], (err, row) => {
                if (err) {
                    console.error('? Erro ao verificar agendamento no mesmo dia:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (agendamentoHoje) {
            console.log(`? Cliente ${cliente_id} já tem agendamento no dia ${data}`);
            return res.json({
                success: false,
                message: `Você já possui um agendamento para o dia ${formatarDataBr(data)}. Cada cliente só pode fazer UM agendamento por dia.`
            });
        }

        // ============================================
        // ?? VALIDAÇÃO: BUSCAR DIAS_BLOQUEIO_GERAL DA EMPRESA
        // ============================================
        const sqlDiasBloqueioEmpresa = isProduction
            ? `SELECT COALESCE(dias_bloqueio_geral, 0) as dias_bloqueio_geral FROM empresas WHERE id = $1`
            : `SELECT COALESCE(dias_bloqueio_geral, 0) as dias_bloqueio_geral FROM empresas WHERE id = ?`;

        const empresaInfo = await new Promise((resolve) => {
            db.get(sqlDiasBloqueioEmpresa, [parseInt(empresa_id)], (err, row) => {
                if (err) {
                    console.error('? Erro ao buscar dias_bloqueio_geral:', err);
                    resolve({ dias_bloqueio_geral: 0 });
                } else {
                    console.log(`?? Empresa ${empresa_id} - dias_bloqueio_geral:`, row?.dias_bloqueio_geral || 0);
                    resolve(row || { dias_bloqueio_geral: 0 });
                }
            });
        });

        const diasBloqueioGeral = empresaInfo?.dias_bloqueio_geral || 0;
        console.log(`?? Empresa ${empresa_id} - Dias de bloqueio geral: ${diasBloqueioGeral}`);

        if (diasBloqueioGeral > 0) {
            console.log(`?? Bloqueio geral ATIVO (${diasBloqueioGeral} dias) - Validando...`);

            const sqlUltimoAgendamento = isProduction
                ? `SELECT data FROM agendamentos 
                   WHERE cliente_id = $1 
                   AND empresa_id = $2 
                   AND status != 'cancelado'
                   ORDER BY data DESC
                   LIMIT 1`
                : `SELECT data FROM agendamentos 
                   WHERE cliente_id = ? 
                   AND empresa_id = ? 
                   AND status != 'cancelado'
                   ORDER BY data DESC
                   LIMIT 1`;

            const ultimoAgendamento = await new Promise((resolve) => {
                db.get(sqlUltimoAgendamento, [parseInt(cliente_id), parseInt(empresa_id)], (err, row) => {
                    if (err) {
                        console.error('? Erro ao buscar último agendamento:', err);
                        resolve(null);
                    } else {
                        console.log(`?? Último agendamento encontrado (raw):`, row);
                        resolve(row);
                    }
                });
            });

            if (ultimoAgendamento && ultimoAgendamento.data) {
                try {
                    let dataUltimo;

                    if (typeof ultimoAgendamento.data === 'string') {
                        dataUltimo = new Date(ultimoAgendamento.data + 'T00:00:00');
                    } else if (ultimoAgendamento.data instanceof Date) {
                        dataUltimo = new Date(ultimoAgendamento.data);
                        dataUltimo.setHours(0, 0, 0, 0);
                    } else {
                        dataUltimo = new Date(ultimoAgendamento.data);
                        dataUltimo.setHours(0, 0, 0, 0);
                    }

                    console.log(`?? Data do último agendamento convertida:`, dataUltimo);

                    if (!isNaN(dataUltimo.getTime())) {
                        const dataMinima = new Date(dataUltimo);
                        dataMinima.setDate(dataMinima.getDate() + diasBloqueioGeral);
                        dataMinima.setHours(0, 0, 0, 0);

                        const dataMinimaStr = dataMinima.toISOString().split('T')[0];

                        let dataAgendamento;
                        if (typeof data === 'string') {
                            dataAgendamento = new Date(data + 'T00:00:00');
                        } else if (data instanceof Date) {
                            dataAgendamento = new Date(data);
                            dataAgendamento.setHours(0, 0, 0, 0);
                        } else {
                            dataAgendamento = new Date(data);
                            dataAgendamento.setHours(0, 0, 0, 0);
                        }

                        console.log(`?? Último agendamento: ${dataUltimo.toISOString().split('T')[0]}`);
                        console.log(`?? Data mínima permitida (${diasBloqueioGeral} dias): ${dataMinimaStr}`);
                        console.log(`?? Data do novo agendamento: ${dataAgendamento.toISOString().split('T')[0]}`);

                        if (dataAgendamento < dataMinima) {
                            console.log(`? BLOQUEIO GERAL ATIVADO! Cliente ${cliente_id} não pode agendar antes de ${dataMinimaStr}`);
                            return res.json({
                                success: false,
                                message: `Você só pode fazer um novo agendamento a partir de ${formatarDataBr(dataMinimaStr)} (${diasBloqueioGeral} dias após o último agendamento).`
                            });
                        } else {
                            console.log(`? Cliente ${cliente_id} pode agendar em ${data} - Dentro do prazo permitido`);
                        }
                    }
                } catch (error) {
                    console.error('? Erro ao processar data do último agendamento:', error);
                }
            } else {
                console.log(`? Cliente ${cliente_id} não tem agendamentos anteriores - pode agendar livremente`);
            }
        } else {
            console.log(`?? Bloqueio geral DESATIVADO (0 dias) - Sem validação extra`);
        }

        // ============================================
        // ?? VALIDAÇÃO: BUSCAR DURAÇÃO DO SERVIÇO
        // ============================================
        let duracaoServico = 30;
        let nomeServico = '';
        let valorServico = 0;

        if (servico_id && servico_id !== '' && servico_id !== 'null') {
            const sqlServico = isProduction
                ? `SELECT duracao, nome, valor FROM servicos WHERE id = $1 AND empresa_id = $2`
                : `SELECT duracao, nome, valor FROM servicos WHERE id = ? AND empresa_id = ?`;

            const servicoInfo = await new Promise((resolve) => {
                db.get(sqlServico, [parseInt(servico_id), empresa_id], (err, row) => {
                    if (err) {
                        console.error('? Erro ao buscar serviço:', err);
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
                console.log(`?? Serviço encontrado: ${nomeServico} - ${duracaoServico}min - R$ ${valorServico}`);
            } else {
                console.log(`?? Serviço ${servico_id} não encontrado, usando padrão 30min`);
            }
        } else {
            nomeServico = req.body.servico || 'Serviço';
            valorServico = parseFloat(req.body.valor) || 0;
            duracaoServico = 30;
        }

        // ============================================
        // ?? VERIFICAR PROFISSIONAL - CORRIGIDO
        // ============================================
        let profissionalIdFinal = null;

        // Verificar se o usuário especificou um profissional
        if (profissional_id && profissional_id !== '' && profissional_id !== 'null') {
            profissionalIdFinal = parseInt(profissional_id);
            console.log(`?? Profissional especificado: ${profissionalIdFinal}`);

            // Verificar se o profissional está disponível
            const disponivel = await verificarDisponibilidadeHorario(
                empresa_id,
                profissionalIdFinal,
                data,
                hora,
                duracaoServico
            );

            if (!disponivel) {
                console.log(`? Horário ${hora} ocupado para o profissional ${profissionalIdFinal}`);
                return res.json({
                    success: false,
                    message: `Este horário já está ocupado para este profissional. O serviço dura ${duracaoServico}min.`
                });
            }
        } else {
            // ?? QUANDO É DONO (sem profissional), NÃO ATRIBUI A NINGUÉM
            profissionalIdFinal = null;
            console.log(`?? Agendamento como Dono (sem profissional)`);
        }

        // ============================================
        // FUNÇÃO PARA CRIAR O AGENDAMENTO
        // ============================================
        async function criarAgendamento(servicoNome, servicoValor, servicoId) {
            const sqlInsert = isProduction
                ? `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, duracao, status, empresa_id, profissional_id) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente', $8, $9) RETURNING id`
                : `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, duracao, status, empresa_id, profissional_id) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`;

            const params = [
                parseInt(cliente_id),
                data,
                hora,
                servicoId || null,
                servicoNome || '',
                parseFloat(servicoValor) || 0,
                duracaoServico,
                parseInt(empresa_id),
                profissionalIdFinal
            ];

            console.log('?? SQL Insert:', sqlInsert);
            console.log('?? Parâmetros:', params);

            db.run(sqlInsert, params, async function (err) {
                if (err) {
                    console.error('? Erro ao criar agendamento:', err.message);
                    return res.json({ success: false, message: 'Erro ao criar agendamento: ' + err.message });
                }

                let id = this?.lastID || this?.id || null;
                console.log('? Agendamento criado com ID:', id);

                incrementarContadorAgendamentos(empresa_id, (err) => {
                    if (err) {
                        console.error('?? Erro ao incrementar contador:', err);
                    } else {
                        console.log('? Contador de agendamentos incrementado');
                    }
                });

                // ============================================
                // ENVIA NOTIFICAÇÕES WHATSAPP
                // ============================================
                try {
                    const cliente = await new Promise((resolve, reject) => {
                        db.get('SELECT * FROM clientes WHERE id = ?', [parseInt(cliente_id)], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    const servico = await new Promise((resolve, reject) => {
                        db.get('SELECT * FROM servicos WHERE id = ?', [servicoId || null], (err, row) => {
                            if (err) reject(err);
                            else resolve(row || { nome: servicoNome, valor: servicoValor });
                        });
                    });

                    let profissional = null;
                    if (profissionalIdFinal) {
                        profissional = await new Promise((resolve, reject) => {
                            db.get('SELECT * FROM profissionais WHERE id = ?', [profissionalIdFinal], (err, row) => {
                                if (err) reject(err);
                                else resolve(row);
                            });
                        });
                    }

                    const empresa = await new Promise((resolve, reject) => {
                        db.get('SELECT * FROM empresas WHERE id = ?', [parseInt(empresa_id)], (err, row) => {
                            if (err) reject(err);
                            else resolve(row);
                        });
                    });

                    const dadosNotificacao = {
                        cliente: { nome: cliente?.nome || 'Cliente', telefone: cliente?.telefone || null },
                        servico: { nome: servico?.nome || servicoNome, valor: servico?.valor || servicoValor },
                        profissional: profissional ? { nome: profissional.nome, telefone: profissional.telefone || null } : null,
                        data: data,
                        hora: hora,
                        empresa: {
                            nome: empresa?.nome || 'Barbearia',
                            endereco: empresa?.endereco || '',
                            telefone_dono: empresa?.telefone_dono || ''  // ?? ADICIONE ESTA LINHA!
                        },
                    };
                    console.log('?? Dados do WhatsApp:', {
                        cliente: dadosNotificacao.cliente.telefone,
                        empresa: dadosNotificacao.empresa.nome,
                        telefone_dono: dadosNotificacao.empresa.telefone_dono,
                        endereco: dadosNotificacao.empresa.endereco
                    });

                    if (dadosNotificacao.cliente.telefone) {
                        await whatsappService.enviarConfirmacao(dadosNotificacao);
                        console.log(`?? WhatsApp: Confirmação enviada para ${dadosNotificacao.cliente.telefone}`);
                    }

                    if (profissional?.telefone) {
                        await whatsappService.enviarNovoAgendamentoProfissional(dadosNotificacao);
                        console.log(`?? WhatsApp: Notificação enviada para profissional ${profissional.telefone}`);
                    }

                } catch (whatsappError) {
                    console.error('?? Erro ao enviar WhatsApp:', whatsappError.message);
                }

                res.json({
                    success: true,
                    data: { id: id, profissional_id: profissionalIdFinal },
                    message: 'Agendamento criado com sucesso!'
                });
            });
        }

        // Chamar a função de criação
        if (servico_id && servico_id !== '' && servico_id !== 'null') {
            criarAgendamento(nomeServico, valorServico, parseInt(servico_id));
        } else {
            criarAgendamento(nomeServico, valorServico, null);
        }
    }
);


    // ============================================
    app.put('/api/agendamentos/:id/concluir', auth, verificarDono, async (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    db.get(
        `SELECT a.*, p.comissao_percent, p.nome as profissional_nome, c.nome as cliente_nome, c.telefone, s.nome as servico_nome
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
                            await whatsappService.send(
                                agendamento.telefone,
                                `? *Atendimento Concluído!*\n\n` +
                                `Olá *${agendamento.cliente_nome || 'Cliente'}*! Seu atendimento foi concluído com sucesso. ?\n\n` +
                                `Agradecemos pela preferência! ??\n\n` +
                                `Já pensou em agendar seu próximo corte? Agende pelo nosso chatbot! ??\n\n` +
                                `_Esta é uma mensagem automática._`
                            );
                            console.log(`?? WhatsApp: Agradecimento enviado para ${agendamento.telefone}`);
                        } catch (whatsappError) {
                            console.error('?? Erro ao enviar WhatsApp:', whatsappError.message);
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
    app.put('/api/agendamentos/:id/cancelar', auth, verificarDono, async (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    try {
        const agendamento = await new Promise((resolve, reject) => {
            db.get(
                `SELECT a.*, c.nome as cliente_nome, c.telefone, s.nome as servico_nome 
                 FROM agendamentos a
                 LEFT JOIN clientes c ON a.cliente_id = c.id
                 LEFT JOIN servicos s ON a.servico_id = s.id
                 WHERE a.id = ? AND a.empresa_id = ?`,
                [id, empresa_id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!agendamento) {
            return res.status(404).json({ success: false, message: 'Agendamento não encontrado' });
        }

        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE agendamentos SET status = 'cancelado' WHERE id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        if (agendamento.telefone) {
            try {
                await whatsappService.enviarCancelamento({
                    cliente: { nome: agendamento.cliente_nome || 'Cliente' },
                    servico: { nome: agendamento.servico_nome || 'Serviço' },
                    data: agendamento.data,
                    hora: agendamento.hora,
                    empresa: { nome: 'Barbearia' }
                });
                console.log(`?? WhatsApp: Cancelamento notificado para ${agendamento.telefone}`);
            } catch (whatsappError) {
                console.error('?? Erro ao enviar WhatsApp:', whatsappError.message);
            }
        }

        res.json({ success: true, message: 'Agendamento cancelado' });

    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao cancelar agendamento' });
    }
});


    // ============================================
    app.put('/api/agendamentos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const sqlSelect = isProduction
        ? `SELECT * FROM agendamentos WHERE id = $1 AND empresa_id = $2`
        : `SELECT * FROM agendamentos WHERE id = ? AND empresa_id = ?`;

    db.get(sqlSelect, [id, empresa_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamentos concluídos não podem ser editados' });
        }

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
            return res.json({ success: false, message: 'Nenhum campo para atualizar' });
        }

        query += updates.join(', ');
        query += isProduction ? ` WHERE id = $${counter++} AND empresa_id = $${counter++}` : ` WHERE id = ? AND empresa_id = ?`;
        params.push(id, empresa_id);

        db.run(query, params, function (err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
        });
    });
});


    // ============================================
    app.delete('/api/agendamentos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `DELETE FROM agendamentos WHERE id = $1 AND empresa_id = $2`
        : `DELETE FROM agendamentos WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [id, empresa_id], function (err) {
        if (err) {
            console.error('? Erro ao excluir agendamento:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Agendamento removido' });
    });
});


    // ============================================
    app.get('/api/agendamentos/periodo', auth, (req, res) => {
    const { data_inicio, data_fim } = req.query;
    const empresa_id = req.usuario.empresa_id;

    if (!data_inicio || !data_fim) {
        return res.json({ success: false, message: 'Data início e fim são obrigatórias' });
    }

    const sql = isProduction
        ? `SELECT a.*, 
           to_char(a.data, 'YYYY-MM-DD') as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = $1 
           AND a.data BETWEEN $2 AND $3
           AND a.status != 'cancelado'
           ORDER BY a.data ASC, a.hora ASC`
        : `SELECT a.*, 
           date(a.data) as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = ? 
           AND a.data BETWEEN ? AND ?
           AND a.status != 'cancelado'
           ORDER BY a.data ASC, a.hora ASC`;

    db.all(sql, [empresa_id, data_inicio, data_fim], (err, agendamentos) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }

        const dadosFormatados = agendamentos.map(a => ({
            ...a,
            data: a.data_formatada || a.data,
            data_formatada: undefined
        }));

        res.json({ success: true, data: dadosFormatados });
    });
});


    // ============================================
    app.get('/api/profissional/agendamentos', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const profissional_id = req.usuario.id;

    const sql = isProduction
        ? `SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.profissional_id = $1
           ORDER BY a.data DESC`
        : `SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.profissional_id = ?
           ORDER BY a.data DESC`;

    db.all(sql, [profissional_id], (err, agendamentos) => {
        if (err) {
            console.error('? Erro ao buscar agendamentos do profissional:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: agendamentos });
    });
});


    // ============================================
    app.put('/api/profissional/agendamentos/:id', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const { id } = req.params;
    const { data, hora, cliente_id } = req.body;
    const profissional_id = req.usuario.id;

    const sqlSelect = isProduction
        ? `SELECT * FROM agendamentos WHERE id = $1 AND profissional_id = $2`
        : `SELECT * FROM agendamentos WHERE id = ? AND profissional_id = ?`;

    db.get(sqlSelect, [id, profissional_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamentos concluídos não podem ser editados' });
        }

        let query = isProduction ? `UPDATE agendamentos SET ` : `UPDATE agendamentos SET `;
        let params = [];
        let updates = [];
        let counter = 1;

        if (data !== undefined) {
            updates.push(isProduction ? `data = $${counter++}` : `data = ?`);
            params.push(data);
        }
        if (hora !== undefined) {
            updates.push(isProduction ? `hora = $${counter++}` : `hora = ?`);
            params.push(hora);
        }
        if (cliente_id !== undefined) {
            updates.push(isProduction ? `cliente_id = $${counter++}` : `cliente_id = ?`);
            params.push(cliente_id);
        }

        if (updates.length === 0) {
            return res.json({ success: false, message: 'Nenhum campo para atualizar' });
        }

        query += updates.join(', ');
        query += isProduction ? ` WHERE id = $${counter++} AND profissional_id = $${counter++}` : ` WHERE id = ? AND profissional_id = ?`;
        params.push(id, profissional_id);

        db.run(query, params, function (err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
        });
    });
});


    // ============================================
    app.put('/api/profissional/agendamentos/:id/concluir', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const { id } = req.params;
    const profissional_id = req.usuario.id;
    const comissao_percent = req.usuario.comissao_percent || 30;

    const sqlSelect = isProduction
        ? `SELECT * FROM agendamentos WHERE id = $1 AND profissional_id = $2`
        : `SELECT * FROM agendamentos WHERE id = ? AND profissional_id = ?`;

    db.get(sqlSelect, [id, profissional_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamento já foi concluído' });
        }

        const comissao = (agendamento.valor || 0) * (comissao_percent / 100);

        const sqlUpdate = isProduction
            ? `UPDATE agendamentos SET status = 'concluido', comissao = $1 WHERE id = $2`
            : `UPDATE agendamentos SET status = 'concluido', comissao = ? WHERE id = ?`;

        db.run(sqlUpdate, [comissao, id], (err) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                message: `Agendamento concluído! Sua comissão: R$ ${comissao.toFixed(2)}`,
                data: { comissao: comissao }
            });
        });
    });
});


    // ============================================
    app.get('/api/agenda/profissionais-disponiveis', auth, (req, res) => {
    const { data, hora } = req.query;
    const empresa_id = req.usuario.empresa_id;

    if (!data || !hora) {
        return res.json({ success: false, message: 'Data e hora são obrigatórias' });
    }

    const sqlProfissionais = isProduction
        ? `SELECT id, nome, comissao_percent FROM profissionais WHERE empresa_id = $1 AND ativo = 1`
        : `SELECT id, nome, comissao_percent FROM profissionais WHERE empresa_id = ? AND ativo = 1`;

    db.all(sqlProfissionais, [empresa_id], (err, profissionais) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }

        if (profissionais.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const sqlAgendamentos = isProduction
            ? `SELECT profissional_id FROM agendamentos 
               WHERE empresa_id = $1 AND data = $2 AND hora = $3 AND status != 'cancelado'`
            : `SELECT profissional_id FROM agendamentos 
               WHERE empresa_id = ? AND data = ? AND hora = ? AND status != 'cancelado'`;

        db.all(sqlAgendamentos, [empresa_id, data, hora], (err, agendamentos) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }

            const ocupados = agendamentos.map(a => a.profissional_id).filter(id => id);

            const profissionaisComStatus = profissionais.map(p => ({
                ...p,
                ocupado: ocupados.includes(p.id)
            }));

            const sqlEmpresa = isProduction
                ? `SELECT limite_profissionais FROM empresas WHERE id = $1`
                : `SELECT limite_profissionais FROM empresas WHERE id = ?`;

            db.get(sqlEmpresa, [empresa_id], (err, empresa) => {
                if (err) {
                    return res.json({ success: false, message: err.message });
                }

                const limite = empresa?.limite_profissionais || 1;
                const disponiveis = profissionaisComStatus.filter(p => !p.ocupado);
                const totalOcupados = profissionaisComStatus.filter(p => p.ocupado).length;

                res.json({
                    success: true,
                    data: profissionaisComStatus,
                    meta: {
                        limite: limite,
                        disponiveis: disponiveis.length,
                        ocupados: totalOcupados,
                        total: profissionaisComStatus.length
                    }
                });
            });
        });
    });
});


    // ============================================
    app.get('/api/agendamentos/periodo', auth, (req, res) => {
    const { data_inicio, data_fim } = req.query;
    const empresa_id = req.usuario.empresa_id;

    if (!data_inicio || !data_fim) {
        return res.json({ success: false, message: 'Data início e fim são obrigatórias' });
    }

    const sql = isProduction
        ? `SELECT a.*, 
           to_char(a.data, 'YYYY-MM-DD') as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = $1 
           AND a.data BETWEEN $2 AND $3
           AND a.status != 'cancelado'
           ORDER BY a.data ASC, a.hora ASC`
        : `SELECT a.*, 
           date(a.data) as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = ? 
           AND a.data BETWEEN ? AND ?
           AND a.status != 'cancelado'
           ORDER BY a.data ASC, a.hora ASC`;

    db.all(sql, [empresa_id, data_inicio, data_fim], (err, agendamentos) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }

        const dadosFormatados = agendamentos.map(a => ({
            ...a,
            data: a.data_formatada || a.data,
            data_formatada: undefined
        }));

        res.json({ success: true, data: dadosFormatados });
    });
});


};
