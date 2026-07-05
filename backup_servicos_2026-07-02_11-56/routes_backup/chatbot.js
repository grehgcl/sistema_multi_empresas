// ============================================================
// ARQUIVO: server/routes/chatbot.js
// ROTAS DO CHATBOT - EXTRAÍDAS AUTOMATICAMENTE
// ============================================================

module.exports = (app, db, isProduction, auth, verificarDono, verificarLimiteAgendamentos, whatsappService, formatarDataBr, horaParaMinutos, minutosParaHora, gerarHorariosDoDia) => {

    // ============================================
    app.get('/api/chatbot/link/:empresaId', auth, verificarDono, (req, res) => {
    const { empresaId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/chatbot.html?empresa=${empresaId}`;

    console.log(`?? Link do chatbot gerado para empresa ${empresaId}: ${link}`);
    res.json({ success: true, link });
});


    // ============================================
    app.get('/api/chatbot/empresa/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT id, nome FROM empresas WHERE id = ?', [id], (err, empresa) => {
        if (err || !empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }
        res.json({ success: true, empresa });
    });
});


    // ============================================
    app.get('/api/chatbot/servicos/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    db.all('SELECT id, nome, valor, duracao FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome',
        [empresaId], (err, servicos) => {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, servicos });
        });
});


    // ============================================
    app.get('/api/chatbot/profissionais/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    db.all('SELECT id, nome FROM profissionais WHERE empresa_id = ? AND ativo = 1 ORDER BY nome',
        [empresaId], (err, profissionais) => {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, profissionais });
        });
});


    // ============================================
    app.get('/api/chatbot/dono/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    db.get('SELECT id, nome FROM usuarios WHERE empresa_id = ? AND role = "dono" LIMIT 1',
        [empresaId], (err, dono) => {
            if (err || !dono) {
                return res.json({ success: false });
            }
            res.json({ success: true, dono });
        });
});


    // ============================================
    app.post('/api/chatbot/cliente/buscar', (req, res) => {
    const { telefone, empresaId } = req.body;

    const telefoneLimpo = telefone.replace(/\D/g, '');

    db.get(`SELECT id, nome, telefone, email, COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot 
            FROM clientes 
            WHERE empresa_id = ? AND (telefone = ? OR telefone = ?)`,
        [empresaId, telefoneLimpo, telefone],
        (err, cliente) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }

            if (cliente) {
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 20);
                const dataLimiteStr = dataLimite.toISOString().split('T')[0];

                db.get(`SELECT id FROM agendamentos 
                        WHERE cliente_id = ? AND data >= ? AND status != 'cancelado' 
                        LIMIT 1`,
                    [cliente.id, dataLimiteStr], (err, agendamento) => {
                        res.json({
                            success: true,
                            cliente: {
                                id: cliente.id,
                                nome: cliente.nome,
                                telefone: cliente.telefone,
                                email: cliente.email,
                                bloqueado_chatbot: cliente.bloqueado_chatbot || 0
                            },
                            temAgendamentoRecente: !!agendamento
                        });
                    });
            } else {
                res.json({ success: true, cliente: null });
            }
        });
});


    // ============================================
    app.post('/api/chatbot/cliente/criar', (req, res) => {
    const { nome, telefone, email, empresaId } = req.body;

    const telefonePadrao = telefone.replace(/\D/g, '');

    db.get('SELECT id FROM clientes WHERE telefone = ? AND empresa_id = ?',
        [telefonePadrao, empresaId], (err, clienteExistente) => {
            if (err) return res.json({ success: false, message: err.message });

            if (clienteExistente) {
                return res.json({
                    success: true,
                    clienteId: clienteExistente.id,
                    bloqueado: false,
                    temAgendamentoRecente: false
                });
            }

            db.run('INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)',
                [nome, telefonePadrao, email || null, empresaId], function (err) {
                    if (err) return res.json({ success: false, message: err.message });
                    res.json({
                        success: true,
                        clienteId: this.lastID,
                        bloqueado: false,
                        temAgendamentoRecente: false
                    });
                });
        });
});


    // ============================================
    app.post('/api/chatbot/datas-disponiveis-mes', (req, res) => {
    const { empresaId, mes, ano, profissionalId } = req.body;

    const mesSolicitado = parseInt(mes) || new Date().getMonth() + 1;
    const anoSolicitado = parseInt(ano) || new Date().getFullYear();

    console.log(`?? Buscando datas para ${mesSolicitado}/${anoSolicitado} - Profissional: ${profissionalId || 'todos'}`);

    let profissionalIdNum = null;

    if (profissionalId &&
        profissionalId !== 'null' &&
        profissionalId !== 'undefined' &&
        profissionalId !== '') {

        if (typeof profissionalId === 'string') {
            if (!isNaN(profissionalId) && !profissionalId.includes('dono')) {
                profissionalIdNum = parseInt(profissionalId);
            }
        } else if (typeof profissionalId === 'number') {
            profissionalIdNum = profissionalId;
        }
    }

    let sqlAgendamentos = isProduction
        ? `SELECT data, profissional_id, hora 
           FROM agendamentos 
           WHERE empresa_id = $1 
           AND status != 'cancelado'
           AND EXTRACT(YEAR FROM data) = $2 
           AND EXTRACT(MONTH FROM data) = $3`
        : `SELECT data, profissional_id, hora 
           FROM agendamentos 
           WHERE empresa_id = ? 
           AND status != 'cancelado'
           AND strftime('%Y', data) = ? 
           AND strftime('%m', data) = ?`;

    let params = isProduction
        ? [empresaId, anoSolicitado.toString(), mesSolicitado.toString().padStart(2, '0')]
        : [empresaId, anoSolicitado.toString(), mesSolicitado.toString().padStart(2, '0')];

    if (profissionalIdNum && profissionalIdNum > 0) {
        sqlAgendamentos += isProduction ? ` AND profissional_id = $4` : ` AND profissional_id = ?`;
        params.push(profissionalIdNum);
    }

    db.all(sqlAgendamentos, params, (err, agendamentos) => {
        if (err) {
            console.error('? Erro ao buscar agendamentos:', err);
            return res.json({ success: false, message: err.message });
        }

        const horariosPorDia = {};
        for (let ag of agendamentos) {
            const dataStr = ag.data;
            if (!horariosPorDia[dataStr]) {
                horariosPorDia[dataStr] = [];
            }
            if (ag.hora) {
                horariosPorDia[dataStr].push(ag.hora);
            }
        }

        db.all(
            `SELECT dia_semana, hora_inicio, hora_fim, almoco_inicio, almoco_fim 
             FROM horarios_funcionamento 
             WHERE empresa_id = ? AND aberto = 1`,
            [empresaId],
            (err, horariosFuncionamento) => {
                if (err) {
                    console.error('? Erro ao buscar horários de funcionamento:', err);
                    return res.json({ success: false, message: err.message });
                }

                const horariosFuncMap = {};
                for (let h of horariosFuncionamento) {
                    horariosFuncMap[h.dia_semana] = h;
                }

                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const primeiroDia = new Date(anoSolicitado, mesSolicitado - 1, 1);
                const ultimoDia = new Date(anoSolicitado, mesSolicitado, 0);
                const diasNoMes = ultimoDia.getDate();

                const datasDisponiveis = [];

                for (let dia = 1; dia <= diasNoMes; dia++) {
                    const dataAtual = new Date(anoSolicitado, mesSolicitado - 1, dia);
                    const diaSemana = dataAtual.getDay();

                    const dataStr = `${anoSolicitado}-${String(mesSolicitado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

                    if (dataAtual < hoje) continue;
                    if (!horariosFuncMap[diaSemana]) continue;

                    const horarioDia = horariosFuncMap[diaSemana];
                    const horariosOcupados = horariosPorDia[dataStr] || [];

                    const todosHorarios = gerarHorariosDoDia(
                        horarioDia.hora_inicio,
                        horarioDia.hora_fim,
                        horarioDia.almoco_inicio,
                        horarioDia.almoco_fim
                    );

                    const temHorarioLivre = todosHorarios.some(h => !horariosOcupados.includes(h));

                    if (temHorarioLivre) {
                        datasDisponiveis.push(dataStr);
                    }
                }

                console.log(`? ${datasDisponiveis.length} datas disponíveis em ${mesSolicitado}/${anoSolicitado}`);

                res.json({
                    success: true,
                    diasDisponiveis: datasDisponiveis,
                    mes: mesSolicitado,
                    ano: anoSolicitado
                });
            }
        );
    });
});


    // ============================================
    app.post('/api/chatbot/horarios-disponiveis', (req, res) => {
    const { empresaId, profissionalId, data, duracao } = req.body;

    console.log(`?? Buscando horários para ${data} - Profissional: ${profissionalId || 'todos'} - Duração: ${duracao || 30}min`);

    let profissionalIdNum = null;

    if (profissionalId &&
        profissionalId !== 'null' &&
        profissionalId !== 'undefined' &&
        profissionalId !== '') {

        if (typeof profissionalId === 'string') {
            if (!isNaN(profissionalId) && !profissionalId.includes('dono')) {
                profissionalIdNum = parseInt(profissionalId);
            }
        } else if (typeof profissionalId === 'number') {
            profissionalIdNum = profissionalId;
        }
    }

    const duracaoMin = duracao || 30;

    // Buscar agendamentos do dia com duração dos serviços
    let sqlAgendamentos = `
        SELECT a.hora, a.profissional_id, COALESCE(s.duracao, 30) as servico_duracao
        FROM agendamentos a
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.empresa_id = ? 
        AND a.data = ? 
        AND a.status != 'cancelado'
    `;
    let params = [empresaId, data];

    if (profissionalIdNum && profissionalIdNum > 0) {
        sqlAgendamentos += ` AND a.profissional_id = ?`;
        params.push(profissionalIdNum);
    }

    db.all(sqlAgendamentos, params, (err, agendamentos) => {
        if (err) {
            console.error('? Erro ao buscar agendamentos:', err);
            return res.json({ success: false, message: err.message });
        }

        // Converter agendamentos para intervalos ocupados
        const ocupados = [];
        for (let ag of agendamentos) {
            if (!ag.hora) continue;
            const inicioMin = horaParaMinutos(ag.hora);
            const duracaoAg = ag.servico_duracao || 30;
            const fimMin = inicioMin + duracaoAg;
            ocupados.push({ inicio: inicioMin, fim: fimMin });
        }

        // Buscar horário de funcionamento do dia
        const dataObj = new Date(data + 'T00:00:00');
        const diaSemana = dataObj.getDay();

        db.get(
            `SELECT hora_inicio, hora_fim, almoco_inicio, almoco_fim 
             FROM horarios_funcionamento 
             WHERE empresa_id = ? AND dia_semana = ? AND aberto = 1`,
            [empresaId, diaSemana],
            (err, horario) => {
                if (err) {
                    console.error('? Erro ao buscar horário:', err);
                    return res.json({ success: false, message: err.message });
                }

                if (!horario) {
                    return res.json({ success: true, horarios: [] });
                }

                const inicioMin = horaParaMinutos(horario.hora_inicio);
                const fimMin = horaParaMinutos(horario.hora_fim);
                const almocoInicioMin = horaParaMinutos(horario.almoco_inicio || '12:00');
                const almocoFimMin = horaParaMinutos(horario.almoco_fim || '13:00');
                const intervalo = 30;

                const horariosDisponiveis = [];

                for (let minutos = inicioMin; minutos + duracaoMin <= fimMin; minutos += intervalo) {
                    // Pular almoço
                    if (minutos >= almocoInicioMin && minutos < almocoFimMin) {
                        continue;
                    }

                    // Verificar se o horário + duração não conflita com agendamentos
                    const fimProposto = minutos + duracaoMin;
                    let conflito = false;

                    for (let ocupado of ocupados) {
                        if (minutos < ocupado.fim && fimProposto > ocupado.inicio) {
                            conflito = true;
                            break;
                        }
                    }

                    if (!conflito) {
                        horariosDisponiveis.push(minutosParaHora(minutos));
                    }
                }

                console.log(`? ${horariosDisponiveis.length} horários disponíveis para ${data} (duração: ${duracaoMin}min)`);

                res.json({
                    success: true,
                    horarios: horariosDisponiveis,
                    duracao: duracaoMin
                });
            }
        );
    });
});


    // ============================================
    app.post('/api/chatbot/agendar', async (req, res) => {
    try {
        const { clienteId, servicoId, profissionalId, data, hora, empresaId } = req.body;

        console.log('?? CHATBOT - Agendamento:', { clienteId, servicoId, profissionalId, data, hora, empresaId });

        if (!clienteId || !servicoId || !data || !hora || !empresaId) {
            return res.json({ success: false, message: 'Dados incompletos' });
        }

        // ============================================
        // ?????? VALIDAÇÃO: DATA/HORA NÃO PODE SER NO PASSADO (CHATBOT) ??????
        // ============================================
        const agora = new Date();
        const [ano, mes, dia] = data.split('-').map(Number);
        const [horaStr, minutoStr] = hora.split(':').map(Number);
        const dataHoraAgendamento = new Date(ano, mes - 1, dia, horaStr, minutoStr, 0, 0);

        console.log('?? Chatbot - Data/Hora agendamento:', dataHoraAgendamento);
        console.log('?? Chatbot - Agora:', agora);

        // VALIDAÇÃO PRINCIPAL: Data/hora já passou?
        if (dataHoraAgendamento < agora) {
            console.log('? Chatbot - Tentativa de agendar em data/hora passada');
            return res.json({
                success: false,
                message: '? Não é possível agendar em datas ou horários que já passaram. Selecione uma data/hora futura.'
            });
        }

        // VALIDAÇÃO EXTRA: Se for hoje, verificar se o horário já passou
        const hojeStr = agora.toISOString().split('T')[0];
        if (data === hojeStr) {
            const horaAtual = agora.getHours();
            const minutoAtual = agora.getMinutes();
            const horaAgendamento = parseInt(horaStr);
            const minutoAgendamento = parseInt(minutoStr);

            if (horaAgendamento < horaAtual || (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual)) {
                console.log('? Chatbot - Tentativa de agendar em horário que já passou hoje');
                return res.json({
                    success: false,
                    message: `? Não é possível agendar no horário ${hora} pois já passou. Escolha um horário futuro.`
                });
            }
        }

        const clienteIdNum = parseInt(clienteId);
        const servicoIdNum = parseInt(servicoId);
        const empresaIdNum = parseInt(empresaId);
        const profissionalIdNum = profissionalId ? parseInt(profissionalId) : null;

        // 1. VERIFICAR LIMITE DE AGENDAMENTOS/MÊS
        const empresa = await new Promise((resolve) => {
            const sql = isProduction
                ? `SELECT plano, agendamentos_mes, mes_referencia FROM empresas WHERE id = $1`
                : `SELECT plano, agendamentos_mes, mes_referencia FROM empresas WHERE id = ?`;
            db.get(sql, [empresaIdNum], (err, row) => resolve(row));
        });

        if (!empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }

        const planoLower = (empresa.plano || '').toLowerCase();
        const temLimite = (planoLower === 'starter' || planoLower === 'trial');

        if (temLimite) {
            const LIMITE_MAXIMO = 100;
            const mesAtual = new Date().toISOString().slice(0, 7);

            if (empresa.mes_referencia !== mesAtual) {
                const sqlUpdate = isProduction
                    ? `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = $1 WHERE id = $2`
                    : `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = ? WHERE id = ?`;
                db.run(sqlUpdate, [mesAtual, empresaIdNum]);
                empresa.agendamentos_mes = 0;
            }

            const total = empresa.agendamentos_mes || 0;
            if (total >= LIMITE_MAXIMO) {
                return res.json({
                    success: false,
                    message: `Limite de ${LIMITE_MAXIMO} agendamentos/mês atingido.`,
                    limit_reached: true
                });
            }
        }

        // ============================================
        // ?? CHATBOT: VALIDAÇÃO - CLIENTE JÁ TEM AGENDAMENTO NESTE DIA?
        // ============================================
        const sqlAgendamentoHojeChat = isProduction
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

        const agendamentoHojeChat = await new Promise((resolve) => {
            db.get(sqlAgendamentoHojeChat, [clienteIdNum, data, empresaIdNum], (err, row) => {
                if (err) {
                    console.error('? Erro ao verificar agendamento no mesmo dia (chatbot):', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (agendamentoHojeChat) {
            console.log(`? Chatbot: Cliente ${clienteIdNum} já tem agendamento no dia ${data}`);
            return res.json({
                success: false,
                message: `Você já possui um agendamento para o dia ${formatarDataBr(data)}. Cada cliente só pode fazer UM agendamento por dia.`
            });
        }

        // ============================================
        // ?? CHATBOT: VALIDAÇÃO - DIAS_BLOQUEIO_GERAL
        // ============================================
        const sqlDiasBloqueioEmpresaChat = isProduction
            ? `SELECT COALESCE(dias_bloqueio_geral, 0) as dias_bloqueio_geral FROM empresas WHERE id = $1`
            : `SELECT COALESCE(dias_bloqueio_geral, 0) as dias_bloqueio_geral FROM empresas WHERE id = ?`;

        const empresaInfoChat = await new Promise((resolve) => {
            db.get(sqlDiasBloqueioEmpresaChat, [empresaIdNum], (err, row) => {
                if (err) {
                    console.error('? Erro ao buscar dias_bloqueio_geral (chatbot):', err);
                    resolve({ dias_bloqueio_geral: 0 });
                } else {
                    resolve(row || { dias_bloqueio_geral: 0 });
                }
            });
        });

        const diasBloqueioGeralChat = empresaInfoChat?.dias_bloqueio_geral || 0;
        console.log(`?? Chatbot - Dias de bloqueio geral: ${diasBloqueioGeralChat}`);

        // ============================================
        // ?? CHATBOT: VALIDAR - BUSCAR ÚLTIMO AGENDAMENTO
        // ============================================
        if (diasBloqueioGeralChat > 0) {
            console.log(`?? Chatbot - Bloqueio geral ATIVO (${diasBloqueioGeralChat} dias) - Validando...`);

            const sqlUltimoAgendamentoChat = isProduction
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

            const ultimoAgendamentoChat = await new Promise((resolve) => {
                db.get(sqlUltimoAgendamentoChat, [clienteIdNum, empresaIdNum], (err, row) => {
                    if (err) {
                        console.error('? Erro ao buscar último agendamento no chatbot:', err);
                        resolve(null);
                    } else {
                        console.log(`?? Chatbot - Último agendamento encontrado (raw):`, row);
                        resolve(row);
                    }
                });
            });

            if (ultimoAgendamentoChat && ultimoAgendamentoChat.data) {
                try {
                    // ?? CORRIGIDO: Converter corretamente a data
                    let dataUltimo;

                    if (typeof ultimoAgendamentoChat.data === 'string') {
                        dataUltimo = new Date(ultimoAgendamentoChat.data + 'T00:00:00');
                    } else if (ultimoAgendamentoChat.data instanceof Date) {
                        dataUltimo = new Date(ultimoAgendamentoChat.data);
                        dataUltimo.setHours(0, 0, 0, 0);
                    } else {
                        dataUltimo = new Date(ultimoAgendamentoChat.data);
                        dataUltimo.setHours(0, 0, 0, 0);
                    }

                    console.log(`?? Chatbot - Data do último agendamento convertida:`, dataUltimo);

                    if (isNaN(dataUltimo.getTime())) {
                        console.log(`?? Chatbot - Data inválida no último agendamento: ${ultimoAgendamentoChat.data}`);
                    } else {
                        const dataMinima = new Date(dataUltimo);
                        dataMinima.setDate(dataMinima.getDate() + diasBloqueioGeralChat);
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

                        console.log(`?? Chatbot - Último agendamento: ${dataUltimo.toISOString().split('T')[0]}`);
                        console.log(`?? Chatbot - Data mínima permitida (${diasBloqueioGeralChat} dias): ${dataMinimaStr}`);
                        console.log(`?? Chatbot - Data do novo agendamento: ${dataAgendamento.toISOString().split('T')[0]}`);

                        if (dataAgendamento < dataMinima) {
                            console.log(`? Chatbot - BLOQUEIO GERAL ATIVADO! Cliente ${clienteIdNum} não pode agendar antes de ${dataMinimaStr}`);
                            return res.json({
                                success: false,
                                message: `Você só pode fazer um novo agendamento a partir de ${formatarDataBr(dataMinimaStr)} (${diasBloqueioGeralChat} dias após o último agendamento).`
                            });
                        } else {
                            console.log(`? Chatbot - Cliente ${clienteIdNum} pode agendar em ${data} - Dentro do prazo permitido`);
                        }
                    }
                } catch (error) {
                    console.error('? Chatbot - Erro ao processar data do último agendamento:', error);
                }
            } else {
                console.log(`? Chatbot - Cliente ${clienteIdNum} não tem agendamentos anteriores`);
            }
        }

        // ============================================
        // 4. VERIFICAR HORÁRIO
        // ============================================
        const sqlCheck = isProduction
            ? `SELECT id FROM agendamentos WHERE empresa_id = $1 AND data = $2 AND hora = $3 AND status != 'cancelado'`
            : `SELECT id FROM agendamentos WHERE empresa_id = ? AND data = ? AND hora = ? AND status != 'cancelado'`;

        const ocupado = await new Promise((resolve) => {
            db.get(sqlCheck, [empresaIdNum, data, hora], (err, row) => resolve(row));
        });

        if (ocupado) {
            return res.json({ success: false, message: 'Horário indisponível' });
        }

        // ============================================
        // 5. VERIFICAR CLIENTE BLOQUEADO
        // ============================================
        const sqlCliente = isProduction
            ? `SELECT bloqueado_chatbot FROM clientes WHERE id = $1`
            : `SELECT bloqueado_chatbot FROM clientes WHERE id = ?`;

        const cliente = await new Promise((resolve) => {
            db.get(sqlCliente, [clienteIdNum], (err, row) => resolve(row));
        });

        if (cliente?.bloqueado_chatbot === 1) {
            return res.json({ success: false, message: 'Cliente bloqueado' });
        }

        // ============================================
        // 6. BUSCAR SERVIÇO
        // ============================================
        const sqlServico = isProduction
            ? `SELECT nome, valor FROM servicos WHERE id = $1 AND empresa_id = $2 AND ativo = 1`
            : `SELECT nome, valor FROM servicos WHERE id = ? AND empresa_id = ? AND ativo = 1`;

        const servico = await new Promise((resolve) => {
            db.get(sqlServico, [servicoIdNum, empresaIdNum], (err, row) => resolve(row));
        });

        if (!servico) {
            return res.json({ success: false, message: 'Serviço não encontrado' });
        }

        // ============================================
        // 7. CRIAR AGENDAMENTO
        // ============================================
        const sqlInsert = isProduction
            ? `INSERT INTO agendamentos (cliente_id, servico_id, servico, valor, profissional_id, data, hora, status, empresa_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, 'agendado', $8) RETURNING id`
            : `INSERT INTO agendamentos (cliente_id, servico_id, servico, valor, profissional_id, data, hora, status, empresa_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'agendado', ?)`;

        const result = await new Promise((resolve, reject) => {
            const params = [clienteIdNum, servicoIdNum, servico.nome, servico.valor, profissionalIdNum, data, hora, empresaIdNum];
            db.get(sqlInsert, params, function (err, row) {
                if (err) reject(err);
                else resolve({ lastID: row?.id || this?.lastID });
            });
        });

        // ============================================
        // 8. INCREMENTAR CONTADOR
        // ============================================
        const mesAtual = new Date().toISOString().slice(0, 7);
        const sqlInc = isProduction
            ? `UPDATE empresas SET agendamentos_mes = COALESCE(agendamentos_mes, 0) + 1, mes_referencia = $1 WHERE id = $2`
            : `UPDATE empresas SET agendamentos_mes = COALESCE(agendamentos_mes, 0) + 1, mes_referencia = ? WHERE id = ?`;
        db.run(sqlInc, [mesAtual, empresaIdNum]);

        // ============================================
        // 9. BUSCAR PROFISSIONAL
        // ============================================
        const sqlProf = isProduction
            ? `SELECT nome FROM profissionais WHERE id = $1`
            : `SELECT nome FROM profissionais WHERE id = ?`;

        const profissional = await new Promise((resolve) => {
            db.get(sqlProf, [profissionalIdNum], (err, row) => resolve(row));
        });

        console.log('? CHATBOT - Agendamento criado! ID:', result.lastID);

        try {
            const sqlCliente = isProduction ? `SELECT nome, telefone FROM clientes WHERE id = $1` : `SELECT nome, telefone FROM clientes WHERE id = ?`;
            const clienteData = await new Promise((resolve) => { db.get(sqlCliente, [clienteIdNum], (err, row) => resolve(row)); });
            const sqlEmpresa = isProduction ? `SELECT nome, endereco FROM empresas WHERE id = $1` : `SELECT nome, endereco FROM empresas WHERE id = ?`;
            const empresaData = await new Promise((resolve) => { db.get(sqlEmpresa, [empresaIdNum], (err, row) => resolve(row)); });
            const sqlProfFull = isProduction ? `SELECT nome, telefone FROM profissionais WHERE id = $1` : `SELECT nome, telefone FROM profissionais WHERE id = ?`;
            const profissionalFull = await new Promise((resolve) => { db.get(sqlProfFull, [profissionalIdNum], (err, row) => resolve(row)); });
            const dadosNotificacao = { cliente: { nome: clienteData?.nome || 'Cliente', telefone: clienteData?.telefone || null }, servico: { nome: servico.nome, valor: servico.valor }, profissional: profissionalFull ? { nome: profissionalFull.nome, telefone: profissionalFull.telefone || null } : null, data: data, hora: hora, empresa: { nome: empresaData?.nome || 'Estabelecimento', endereco: empresaData?.endereco || '' } };
            if (dadosNotificacao.cliente.telefone) { await whatsappService.enviarConfirmacao(dadosNotificacao); console.log('? CHATBOT WPP confirmação enviada'); }
            if (profissionalFull?.telefone) { await whatsappService.enviarNovoAgendamentoProfissional(dadosNotificacao); console.log('? CHATBOT WPP profissional notificado'); }
        } catch (wpErr) { console.error('? CHATBOT WhatsApp erro:', wpErr.message); }
        res.json({
            success: true,
            agendamentoId: result.lastID,
            profissionalNome: profissional?.nome || 'Profissional',
            servicoNome: servico.nome,
            valor: servico.valor
        });

    } catch (error) {
        console.error('? CHATBOT - Erro:', error);
        res.json({ success: false, message: 'Erro interno. Tente novamente.' });
    }
});


};
