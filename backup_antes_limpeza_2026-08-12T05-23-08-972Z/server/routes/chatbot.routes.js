// ============================================
// ROTAS DE CHATBOT
// ============================================
const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Converter hora (HH:MM) para minutos
function horaParaMinutos(hora) {
    if (!hora) return 0;
    const partes = hora.split(':');
    return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

// Converter minutos para hora (HH:MM)
function minutosParaHora(minutos) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    return `${h}:${m}`;
}

// Gerar horários do dia (excluindo almoço)
function gerarHorariosDoDia(inicio, fim, almocoInicio, almocoFim) {
    const horarios = [];
    const inicioMin = horaParaMinutos(inicio);
    const fimMin = horaParaMinutos(fim);
    const almocoInicioMin = horaParaMinutos(almocoInicio || '12:00');
    const almocoFimMin = horaParaMinutos(almocoFim || '13:00');

    for (let min = inicioMin; min <= fimMin; min += 30) {
        if (min >= almocoInicioMin && min < almocoFimMin) continue;
        horarios.push(minutosParaHora(min));
    }
    return horarios;
}

// ============================================
// GET /api/chatbot/link/:empresaId
// ============================================
router.get('/link/:empresaId', auth, verificarDono, (req, res) => {
    const { empresaId } = req.params;
    const baseUrl = process.env.BASE_URL || 'https://seeagende.com.br';
    const link = `${baseUrl}/chatbot.html?empresa=${empresaId}`;

    console.log(`🔗 Link do chatbot gerado para empresa ${empresaId}: ${link}`);
    res.json({ success: true, link });
});

// ============================================
// GET /api/chatbot/empresa/:id
// ============================================
router.get('/empresa/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT id, nome FROM empresas WHERE id = ?', [id], (err, empresa) => {
        if (err || !empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }
        res.json({ success: true, empresa });
    });
});

// ============================================
// GET /api/chatbot/servicos/:empresaId
// ============================================
router.get('/servicos/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    let sql;
    if (isProduction) {
        sql = `SELECT id, nome, descricao, valor, duracao 
               FROM servicos 
               WHERE empresa_id = $1 
               AND (ativo IS NULL OR ativo = true OR ativo = 't')
               ORDER BY nome`;
    } else {
        sql = `SELECT id, nome, descricao, valor, duracao 
               FROM servicos 
               WHERE empresa_id = ? 
               AND (ativo IS NULL OR ativo = 1 OR ativo = 'true')
               ORDER BY nome`;
    }

    console.log(`🔍 Buscando serviços para empresa ${empresaId} (${isProduction ? 'PostgreSQL' : 'SQLite'})`);
    console.log(`📝 SQL: ${sql}`);

    db.all(sql, [empresaId], (err, servicos) => {
        if (err) {
            console.error('❌ db.all error:', err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log(`✅ ${servicos.length} serviços encontrados para empresa ${empresaId}`);
        servicos.forEach(s => {
            console.log(`  - ${s.nome}: R$ ${s.valor} (${s.duracao}min)`);
        });

        res.json({ success: true, servicos });
    });
});

// ============================================
// GET /api/chatbot/profissionais/:empresaId
// ============================================
router.get('/profissionais/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    const sql = isProduction
        ? 'SELECT id, nome FROM profissionais WHERE empresa_id = $1 AND ativo = true ORDER BY nome'
        : 'SELECT id, nome FROM profissionais WHERE empresa_id = ? AND ativo = 1 ORDER BY nome';

    db.all(sql, [empresaId], (err, profissionais) => {
        if (err) {
            console.error('❌ db.all error:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, profissionais });
    });
});

// ============================================
// GET /api/chatbot/dono/:empresaId
// ============================================
router.get('/dono/:empresaId', (req, res) => {
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
// POST /api/chatbot/cliente/buscar
// ============================================
router.post('/cliente/buscar', (req, res) => {
    const { telefone, empresaId } = req.body;

    if (!telefone) {
        return res.json({ success: false, message: 'Telefone não informado' });
    }

    const telefoneLimpo = String(telefone).replace(/\D/g, '');
    console.log(`🔍 Buscando cliente com telefone: ${telefoneLimpo} (empresa: ${empresaId})`);

    db.all(`SELECT id, nome, telefone, email, COALESCE(bloqueado_chatbot, false) as bloqueado_chatbot 
            FROM clientes 
            WHERE empresa_id = ?`,
        [empresaId],
        (err, clientes) => {
            if (err) {
                console.error('❌ Erro ao buscar clientes:', err);
                return res.json({ success: false, message: err.message });
            }

            if (!clientes || clientes.length === 0) {
                return res.json({ success: true, cliente: null });
            }

            const clienteEncontrado = clientes.find(c => {
                const telefoneCliente = String(c.telefone || '').replace(/\D/g, '');

                if (telefoneCliente === telefoneLimpo) return true;
                if (telefoneCliente === '55' + telefoneLimpo) return true;
                if ('55' + telefoneCliente === telefoneLimpo) return true;

                if (telefoneCliente.length === 11 && telefoneLimpo.length === 10) {
                    const sem9 = telefoneCliente.substring(0, 2) + telefoneCliente.substring(3);
                    if (sem9 === telefoneLimpo) return true;
                }
                if (telefoneCliente.length === 10 && telefoneLimpo.length === 11) {
                    const com9 = telefoneCliente.substring(0, 2) + '9' + telefoneCliente.substring(2);
                    if (com9 === telefoneLimpo) return true;
                }
                if (telefoneLimpo.startsWith('55') && telefoneLimpo.substring(2) === telefoneCliente) return true;
                if (telefoneCliente.startsWith('55') && telefoneCliente.substring(2) === telefoneLimpo) return true;

                return false;
            });

            console.log(`🔍 Resultado: ${clienteEncontrado ? '✅ Encontrado' : '❌ Não encontrado'}`);

            if (clienteEncontrado) {
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 20);
                const dataLimiteStr = dataLimite.toISOString().split('T')[0];

                db.get(`SELECT id FROM agendamentos 
                        WHERE cliente_id = ? AND data >= ? AND status != 'cancelado' 
                        LIMIT 1`,
                    [clienteEncontrado.id, dataLimiteStr], (err, agendamento) => {
                        res.json({
                            success: true,
                            cliente: {
                                id: clienteEncontrado.id,
                                nome: clienteEncontrado.nome,
                                telefone: clienteEncontrado.telefone,
                                email: clienteEncontrado.email,
                                bloqueado_chatbot: clienteEncontrado.bloqueado_chatbot || 0
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
// POST /api/chatbot/cliente/criar
// ============================================
router.post('/cliente/criar', (req, res) => {
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
// POST /api/chatbot/datas-disponiveis-mes
// ============================================
router.post('/datas-disponiveis-mes', (req, res) => {
    const { empresaId, mes, ano, profissionalId } = req.body;

    const mesSolicitado = parseInt(mes) || new Date().getMonth() + 1;
    const anoSolicitado = parseInt(ano) || new Date().getFullYear();

    console.log(`📅 Buscando datas para ${mesSolicitado}/${anoSolicitado} - Profissional: ${profissionalId || 'todos'}`);

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

    let params = [empresaId, anoSolicitado.toString(), mesSolicitado.toString().padStart(2, '0')];

    if (profissionalIdNum && profissionalIdNum > 0) {
        sqlAgendamentos += isProduction ? ` AND profissional_id = $4` : ` AND profissional_id = ?`;
        params.push(profissionalIdNum);
    }

    db.all(sqlAgendamentos, params, (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos:', err);
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
             WHERE empresa_id = ? AND aberto = true`,
            [empresaId],
            (err, horariosFuncionamento) => {
                if (err) {
                    console.error('❌ Erro ao buscar horários de funcionamento:', err);
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

                console.log(`📅 ${datasDisponiveis.length} datas disponíveis em ${mesSolicitado}/${anoSolicitado}`);

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
// POST /api/chatbot/horarios-disponiveis - CORRIGIDO
// ============================================
router.post('/horarios-disponiveis', async (req, res) => {
    try {
        const { empresaId, profissionalId, data, duracao } = req.body;

        console.log(`🔍 Buscando horários para ${data} - Profissional: ${profissionalId || 'todos'} - Duração: ${duracao || 30}min`);

        if (!empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Data é obrigatória'
            });
        }

        const empresaIdNum = parseInt(empresaId);
        if (isNaN(empresaIdNum)) {
            return res.status(400).json({
                success: false,
                message: 'ID da empresa inválido'
            });
        }

        let profissionalIdNum = null;
        if (profissionalId && profissionalId !== 'null' && profissionalId !== 'undefined' && profissionalId !== '') {
            if (typeof profissionalId === 'string') {
                if (!isNaN(profissionalId) && !profissionalId.includes('dono')) {
                    profissionalIdNum = parseInt(profissionalId);
                }
            } else if (typeof profissionalId === 'number') {
                profissionalIdNum = profissionalId;
            }
        }

        const duracaoMin = parseInt(duracao) || 30;

        // 🔥 USAR BANCO DA EMPRESA
        const empresaDb = getEmpresaDb(empresaIdNum);

        // 🔥 VERIFICAR SE A EMPRESA EXISTE
        const sqlCheckEmpresa = `SELECT id FROM empresas WHERE id = ?`;
        db.get(sqlCheckEmpresa, [empresaIdNum], (err, empresa) => {
            if (err) {
                console.error('❌ Erro ao verificar empresa:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao verificar empresa'
                });
            }

            if (!empresa) {
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            // 🔥 BUSCAR AGENDAMENTOS EXISTENTES NO BANCO DA EMPRESA
            let sqlAgendamentos = `
                SELECT a.hora, a.profissional_id, COALESCE(s.duracao, 30) as servico_duracao
                FROM agendamentos a
                LEFT JOIN servicos s ON a.servico_id = s.id
                WHERE a.empresa_id = ? 
                AND a.data = ? 
                AND a.status != 'cancelado'
            `;

            let params = [empresaIdNum, data];

            if (profissionalIdNum && profissionalIdNum > 0) {
                sqlAgendamentos += ` AND a.profissional_id = ?`;
                params.push(profissionalIdNum);
            }

            empresaDb.all(sqlAgendamentos, params, (err, agendamentos) => {
                if (err) {
                    console.error('❌ Erro ao buscar agendamentos:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro ao buscar agendamentos: ' + err.message
                    });
                }

                // MAPEAR HORÁRIOS OCUPADOS
                const ocupados = [];
                for (let ag of agendamentos) {
                    if (!ag.hora) continue;
                    const inicioMin = horaParaMinutos(ag.hora);
                    const duracaoAg = ag.servico_duracao || 30;
                    const fimMin = inicioMin + duracaoAg;
                    ocupados.push({ inicio: inicioMin, fim: fimMin });
                }

                // BUSCAR HORÁRIO DE FUNCIONAMENTO
                const dataObj = new Date(data + 'T00:00:00');
                const diaSemana = dataObj.getDay();

                const sqlHorario = `
                    SELECT hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos
                    FROM horarios_funcionamento 
                    WHERE empresa_id = ? AND dia_semana = ? AND aberto = 1
                `;

                empresaDb.get(sqlHorario, [empresaIdNum, diaSemana], (err, horario) => {
                    if (err) {
                        console.error('❌ Erro ao buscar horário:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Erro ao buscar horário de funcionamento: ' + err.message
                        });
                    }

                    if (!horario) {
                        return res.json({
                            success: true,
                            horarios: [],
                            message: 'Estabelecimento fechado neste dia'
                        });
                    }

                    // GERAR HORÁRIOS DISPONÍVEIS
                    const inicioMin = horaParaMinutos(horario.hora_inicio);
                    const fimMin = horaParaMinutos(horario.hora_fim);
                    const almocoInicioMin = horaParaMinutos(horario.almoco_inicio || '12:00');
                    const almocoFimMin = horaParaMinutos(horario.almoco_fim || '13:00');
                    const intervalo = horario.intervalo_minutos || 30;

                    const horariosDisponiveis = [];

                    const hoje = new Date();
                    const hojeStr = hoje.toISOString().split('T')[0];
                    const horaAtual = hoje.getHours();
                    const minutoAtual = hoje.getMinutes();

                    for (let minutos = inicioMin; minutos < fimMin; minutos += intervalo) {
                        if (minutos >= almocoInicioMin && minutos < almocoFimMin) {
                            continue;
                        }

                        if (data === hojeStr) {
                            const horaMinutoAtual = horaAtual * 60 + minutoAtual;
                            if (minutos < horaMinutoAtual) {
                                continue;
                            }
                        }

                        if (minutos + duracaoMin > fimMin) {
                            continue;
                        }

                        let conflito = false;
                        for (let ocupado of ocupados) {
                            if (minutos < ocupado.fim && (minutos + duracaoMin) > ocupado.inicio) {
                                conflito = true;
                                break;
                            }
                        }

                        if (!conflito) {
                            horariosDisponiveis.push(minutosParaHora(minutos));
                        }
                    }

                    horariosDisponiveis.sort();

                    console.log(`✅ ${horariosDisponiveis.length} horários disponíveis para ${data}:`, horariosDisponiveis);

                    res.json({
                        success: true,
                        horarios: horariosDisponiveis,
                        duracao: duracaoMin,
                        total: horariosDisponiveis.length
                    });
                });
            });
        });
    } catch (error) {
        console.error('❌ Erro ao buscar horários disponíveis:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar horários disponíveis'
        });
    }
});
// ============================================
// POST /api/chatbot/agendar
// ============================================
router.post('/agendar', async (req, res) => {
    try {
        const { clienteId, servicoId, profissionalId, data, hora, empresaId, valor, servicoNome } = req.body;

        console.log('📥 Recebendo agendamento do chatbot:', {
            clienteId, servicoId, profissionalId, data, hora, empresaId, valor, servicoNome
        });

        let valorFinal = parseFloat(valor) || 0;
        let nomeFinal = servicoNome || '';
        let duracaoFinal = 30;

        console.log(`💰 Valor recebido: R$ ${valorFinal}`);

        if (valorFinal === 0 && servicoId) {
            console.log(`🔍 Buscando valor do serviço ID ${servicoId} para empresa ${empresaId}`);

            const sqlServico = isProduction
                ? 'SELECT nome, valor, duracao FROM servicos WHERE id = $1 AND empresa_id = $2'
                : 'SELECT nome, valor, duracao FROM servicos WHERE id = ? AND empresa_id = ?';

            try {
                const servico = await new Promise((resolve, reject) => {
                    db.get(sqlServico, [servicoId, empresaId], (err, row) => {
                        if (err) {
                            console.error('❌ Erro ao buscar serviço:', err);
                            reject(err);
                        } else {
                            resolve(row);
                        }
                    });
                });

                if (servico) {
                    valorFinal = parseFloat(servico.valor) || 0;
                    nomeFinal = servico.nome || nomeFinal;
                    duracaoFinal = servico.duracao || 30;
                    console.log(`💰 Valor encontrado no banco: R$ ${valorFinal}`);
                    console.log(`📝 Nome do serviço: ${nomeFinal}`);
                    console.log(`⏱️ Duração: ${duracaoFinal}min`);
                } else {
                    console.warn(`⚠️ Serviço ID ${servicoId} não encontrado no banco`);
                }
            } catch (error) {
                console.error('❌ Erro ao buscar serviço no banco:', error);
            }
        }

        if (!nomeFinal || nomeFinal === '') {
            nomeFinal = servicoNome || 'Serviço não identificado';
        }

        let novoAgendamentoId;

        if (isProduction) {
            const sqlInsert = `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, duracao, status, empresa_id, profissional_id) 
                               VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente', $8, $9) RETURNING id`;
            const params = [clienteId, data, hora, servicoId, nomeFinal, valorFinal, duracaoFinal, empresaId, profissionalId];

            console.log('📝 SQL (PostgreSQL):', sqlInsert);
            console.log('📝 Params:', params);

            if (typeof db.query === 'function') {
                const result = await db.query(sqlInsert, params);
                novoAgendamentoId = result.rows[0].id;
            } else {
                const result = await new Promise((resolve, reject) => {
                    db.get(sqlInsert.replace(/\$[0-9]+/g, '?'), params, (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                novoAgendamentoId = result?.id;
            }
        } else {
            const sqlInsert = `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, duracao, status, empresa_id, profissional_id) 
                               VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`;
            const params = [clienteId, data, hora, servicoId, nomeFinal, valorFinal, duracaoFinal, empresaId, profissionalId];

            console.log('📝 SQL (SQLite):', sqlInsert);
            console.log('📝 Params:', params);

            await new Promise((resolve, reject) => {
                db.run(sqlInsert, params, function (err) {
                    if (err) {
                        console.error('❌ Erro no db.run:', err);
                        reject(err);
                    } else {
                        novoAgendamentoId = this.lastID;
                        console.log(`✅ Agendamento inserido com ID: ${novoAgendamentoId}`);
                        resolve();
                    }
                });
            });
        }

        console.log(`✅ CHATBOT - Agendamento criado! ID: ${novoAgendamentoId}, Valor: R$ ${valorFinal}`);

        // Buscar dados da empresa
        let empresa;
        if (isProduction) {
            const sqlEmp = 'SELECT id, nome, telefone_dono, endereco FROM empresas WHERE id = $1';
            if (typeof db.query === 'function') {
                const resEmp = await db.query(sqlEmp, [empresaId]);
                empresa = resEmp.rows[0];
            } else {
                empresa = await new Promise((resolve, reject) => {
                    db.get(sqlEmp.replace('$1', '?'), [empresaId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
            }
        } else {
            empresa = await new Promise((resolve, reject) => {
                db.get('SELECT id, nome, telefone_dono, endereco FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        console.log('🏢 Empresa encontrada:', empresa?.nome || 'Não encontrada');

        // Buscar dados do cliente
        let cliente;
        if (isProduction) {
            const sqlCli = 'SELECT nome, telefone FROM clientes WHERE id = $1';
            if (typeof db.query === 'function') {
                const resCli = await db.query(sqlCli, [clienteId]);
                cliente = resCli.rows[0];
            } else {
                cliente = await new Promise((resolve, reject) => {
                    db.get(sqlCli.replace('$1', '?'), [clienteId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
            }
        } else {
            cliente = await new Promise((resolve, reject) => {
                db.get('SELECT nome, telefone FROM clientes WHERE id = ?', [clienteId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        }

        console.log('👤 Cliente encontrado:', cliente?.nome || 'Não encontrado');

        // Enviar WhatsApp
        if (cliente && cliente.telefone) {
            try {
                const { enviarConfirmacao } = require('../../services/whatsapp');

                await enviarConfirmacao({
                    cliente: cliente,
                    servico: { nome: nomeFinal, valor: valorFinal },
                    data: data,
                    hora: hora,
                    profissional: profissionalId ? { nome: 'Profissional' } : null,
                    empresa: empresa
                });
                console.log('📱 WhatsApp enviado com sucesso!');
            } catch (whatsError) {
                console.error('❌ Erro ao enviar WhatsApp:', whatsError);
            }
        } else {
            console.warn('⚠️ Cliente sem telefone, WhatsApp não enviado');
        }

        res.json({
            success: true,
            message: 'Agendamento confirmado!',
            agendamentoId: novoAgendamentoId,
            valor: valorFinal
        });

    } catch (error) {
        console.error('❌ Erro no agendamento do chatbot:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// ============================================
// GET /api/chatbot/servico/:id
// ============================================
router.get('/servico/:id', (req, res) => {
    const { id } = req.params;

    const sql = isProduction
        ? 'SELECT id, nome, valor, duracao FROM servicos WHERE id = $1'
        : 'SELECT id, nome, valor, duracao FROM servicos WHERE id = ?';

    console.log(`🔍 Buscando serviço ID ${id}`);

    db.get(sql, [id], (err, servico) => {
        if (err) {
            console.error('❌ Erro ao buscar serviço:', err);
            return res.json({ success: false, message: err.message });
        }
        if (!servico) {
            console.warn(`⚠️ Serviço ID ${id} não encontrado`);
            return res.json({ success: false, message: 'Serviço não encontrado' });
        }
        console.log(`✅ Serviço encontrado: ${servico.nome} - R$ ${servico.valor}`);
        res.json({ success: true, servico });
    });
});

module.exports = router;