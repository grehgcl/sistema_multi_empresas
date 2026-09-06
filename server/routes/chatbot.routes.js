// server/routes/chatbot.routes.js
// ============================================
// ROTAS DE CHATBOT - SEE&AGENDE (COM ADS INTEGRADO)
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const fs = require('fs');
const path = require('path');

// ============================================
// 📊 REGISTRAR EVENTO NO ADS (CORRIGIDO)
// ============================================
function registrarEventoAds(empresaId, tipo, campanha, origem, clienteId = null, agendamentoId = null, valor = 0, custo = 0) {
    const db = require('../config/database').db;
    
    // 🔥 VALIDAR EMPRESA_ID
    if (!empresaId || empresaId === 'null' || empresaId === 'undefined') {
        console.warn('⚠️ empresa_id inválido (null/undefined), pulando registro');
        return;
    }
    
    const empresaIdInt = parseInt(empresaId);
    if (isNaN(empresaIdInt) || empresaIdInt <= 0) {
        console.warn('⚠️ empresa_id inválido (NaN ou <= 0):', empresaId);
        return;
    }
    
    // Tipos válidos
    const tiposValidos = ['visualizacao', 'clique', 'conversao', 'lead'];
    if (!tiposValidos.includes(tipo)) {
        console.warn(`⚠️ Tipo inválido para ADS: ${tipo}`);
        return;
    }
    
    // Origens válidas
    const origensValidas = ['chatbot', 'whatsapp', 'facebook', 'instagram', 'google', 'organico', 'link_direto', 'chatbot_anuncio'];
    const origemFinal = origensValidas.includes(origem) ? origem : 'chatbot';
    const campanhaFinal = campanha || 'chatbot_acesso';
    
    // 🔥 VERIFICAR SE A TABELA EXISTE
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='ads_stats'", (err, tableExists) => {
        if (err || !tableExists) {
            console.warn('⚠️ Tabela ads_stats não existe, pulando registro');
            return;
        }
        
        const query = `
            INSERT INTO ads_stats (
                empresa_id, campanha, origem, tipo, cliente_id, 
                agendamento_id, valor, custo, data_interacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
            empresaIdInt,
            campanhaFinal,
            origemFinal,
            tipo,
            clienteId ? parseInt(clienteId) : null,
            agendamentoId ? parseInt(agendamentoId) : null,
            parseFloat(valor) || 0,
            parseFloat(custo) || 0,
            new Date().toISOString()
        ];
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('❌ Erro ao registrar evento ADS:', err.message);
            } else {
                console.log(`✅ ADS Registrado: ${tipo} | Empresa: ${empresaIdInt} | Cliente: ${clienteId || 'anonimo'}`);
            }
        });
    });
}
// ============================================
// CONFIGURAÇÕES
// ============================================
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
console.log(`[CHATBOT] 🌐 BASE_URL: ${BASE_URL}`);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function horaParaMinutos(hora) {
    if (!hora) return 0;
    const partes = hora.split(':');
    return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

function minutosParaHora(minutos) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    return `${h}:${m}`;
}

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
            return partes[2] + '/' + partes[1] + '/' + partes[0];
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

function gerarHorariosDoDia(inicio, fim, almocoInicio, almocoFim) {
    const horarios = [];
    if (!inicio || !fim) return horarios;

    const inicioMin = horaParaMinutos(inicio);
    const fimMin = horaParaMinutos(fim);
    const almocoInicioMin = horaParaMinutos(almocoInicio || '12:00');
    const almocoFimMin = horaParaMinutos(almocoFim || '13:00');

    for (let min = inicioMin; min < fimMin; min += 30) {
        if (min >= almocoInicioMin && min < almocoFimMin) continue;
        horarios.push(minutosParaHora(min));
    }
    return horarios;
}

function gerarDatasFallback(ano, mes) {
    const datas = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const mesStr = String(mes).padStart(2, '0');
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataAtual = new Date(ano, mes - 1, dia);
        const dataStr = `${ano}-${mesStr}-${String(dia).padStart(2, '0')}`;
        
        if (dataAtual < hoje) continue;
        const diaSemana = dataAtual.getDay();
        if (diaSemana === 0) continue;
        
        datas.push(dataStr);
    }
    return datas;
}

// ============================================
// 1. GET /api/chatbot/link/:empresaId
// ============================================
router.get('/link/:empresaId', (req, res) => {
    const { empresaId } = req.params;
    const baseUrl = BASE_URL;
    const link = `${baseUrl}/chatbot.html?empresa=${empresaId}`;

    console.log(`🔗 Link do chatbot gerado para empresa ${empresaId}: ${link}`);
    res.json({ success: true, link: link, empresaId: empresaId });
});

// ============================================
// 2. GET /api/chatbot/empresa/:id - COM ADS
// ============================================
router.get('/empresa/:id', (req, res) => {
    const { id } = req.params;

    console.log(`🔍 Buscando dados da empresa ${id}`);

    // 🔥 REGISTRAR ACESSO (visualizacao)
    const origem = req.query.utm_source || req.query.origem || 'chatbot';
    const campanha = req.query.utm_campaign || req.query.campanha || 'chatbot_acesso';
    registrarEventoAds(id, 'visualizacao', campanha, origem);

    db.get(
        `SELECT id, nome, endereco, plano, 
                created_at, trial_expira, limite_profissionais,
                telefone_dono
         FROM empresas WHERE id = ?`,
        [id],
        (err, empresa) => {
            if (err) {
                console.error('❌ Erro ao buscar empresa:', err.message);
                return res.json({ success: false, message: err.message });
            }
            
            if (!empresa) {
                console.warn(`⚠️ Empresa ${id} não encontrada`);
                return res.json({ success: false, message: 'Empresa não encontrada' });
            }
            
            console.log(`✅ Empresa encontrada: ${empresa.nome}`);
            
            db.get(
                `SELECT id, nome, telefone, email FROM usuarios 
                 WHERE empresa_id = ? AND role = 'dono' LIMIT 1`,
                [id],
                (err, dono) => {
                    if (err) {
                        console.error('❌ Erro ao buscar dono:', err.message);
                    }
                    
                    db.get(
                        `SELECT COUNT(*) as total FROM profissionais WHERE empresa_id = ? AND ativo = 1`,
                        [id],
                        (err, profCount) => {
                            if (err) {
                                console.error('❌ Erro ao contar profissionais:', err.message);
                            }
                            
                            const empresaData = {
                                id: empresa.id,
                                nome: empresa.nome || 'See&Agende',
                                telefone: empresa.telefone_dono || '',
                                email: dono?.email || '',
                                endereco: empresa.endereco || '',
                                plano: empresa.plano || 'trial',
                                whatsapp_proprio: 0,
                                created_at: empresa.created_at,
                                trial_expira: empresa.trial_expira,
                                limite_profissionais: empresa.limite_profissionais || 1,
                                total_profs: profCount?.total || 0,
                                nome_dono: dono?.nome || 'Dono',
                                telefone_dono: dono?.telefone || empresa.telefone_dono || '',
                                dias_bloqueio_geral: 0
                            };
                            
                            console.log(`✅ Dados da empresa montados`);
                            res.json({ success: true, data: empresaData });
                        }
                    );
                }
            );
        }
    );
});

// ============================================
// 3. GET /api/chatbot/servicos/:empresaId - COM ADS
// ============================================
router.get('/servicos/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    console.log(`🔍 Buscando serviços para empresa ${empresaId}`);

    // 🔥 REGISTRAR LEAD (interesse em serviços)
    const origem = req.query.origem || 'chatbot';
    registrarEventoAds(empresaId, 'lead', 'chatbot_servicos', origem);

    const { getEmpresaDb } = require('../config/database');
    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        console.error('❌ Banco da empresa não encontrado:', empresaId);
        return res.json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    const sql = `
        SELECT id, nome, descricao, valor, duracao 
        FROM servicos 
        WHERE (ativo IS NULL OR ativo = 1 OR ativo = 'true')
        ORDER BY nome
    `;

    empresaDb.all(sql, [], (err, servicos) => {
        if (err) {
            console.error('❌ Erro:', err.message);
            return res.json({ success: false, message: err.message });
        }
        console.log(`✅ ${servicos?.length || 0} serviços encontrados`);
        res.json({ success: true, servicos: servicos || [] });
    });
});

// ============================================
// 4. GET /api/chatbot/profissionais/:empresaId - COM ADS
// ============================================
router.get('/profissionais/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    console.log(`🔍 Buscando profissionais para empresa ${empresaId}`);

    // 🔥 REGISTRAR LEAD (interesse em profissionais)
    const origem = req.query.origem || 'chatbot';
    registrarEventoAds(empresaId, 'lead', 'chatbot_profissionais', origem);

    const { getEmpresaDb } = require('../config/database');
    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        console.error('❌ Banco da empresa não encontrado:', empresaId);
        return res.json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    const sql = `
        SELECT id, nome, comissao_percent, ativo
        FROM profissionais 
        WHERE ativo = 1 
        ORDER BY nome
    `;

    empresaDb.all(sql, [], (err, profissionais) => {
        if (err) {
            console.error('❌ Erro:', err.message);
            return res.json({ success: false, message: err.message });
        }
        console.log(`✅ ${profissionais?.length || 0} profissionais encontrados`);
        res.json({ success: true, profissionais: profissionais || [] });
    });
});

// ============================================
// 5. POST /api/chatbot/cliente/buscar
// ============================================
router.post('/cliente/buscar', (req, res) => {
    const { telefone, empresaId } = req.body;

    if (!telefone) {
        return res.json({ success: false, message: 'Telefone não informado' });
    }

    const telefoneLimpo = String(telefone).replace(/\D/g, '');
    console.log(`🔍 Buscando cliente: ${telefoneLimpo} (empresa: ${empresaId})`);

    db.all(
        `SELECT id, nome, telefone, email, COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot 
         FROM clientes 
         WHERE empresa_id = ?`,
        [empresaId],
        (err, clientes) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                return res.json({ success: false, message: err.message });
            }

            if (!clientes || clientes.length === 0) {
                return res.json({ success: true, cliente: null });
            }

            console.log(`📋 ${clientes.length} clientes encontrados`);

            const clienteEncontrado = clientes.find(c => {
                const telCliente = String(c.telefone || '').replace(/\D/g, '');
                
                if (telCliente === telefoneLimpo) return true;
                if (telCliente === '55' + telefoneLimpo) return true;
                if ('55' + telCliente === telefoneLimpo) return true;
                
                if (telCliente.length === 11 && telefoneLimpo.length === 10) {
                    const sem9 = telCliente.substring(0, 2) + telCliente.substring(3);
                    if (sem9 === telefoneLimpo) return true;
                }
                if (telCliente.length === 10 && telefoneLimpo.length === 11) {
                    const com9 = telCliente.substring(0, 2) + '9' + telCliente.substring(2);
                    if (com9 === telefoneLimpo) return true;
                }
                
                const ultimos10Cliente = telCliente.slice(-10);
                const ultimos10Busca = telefoneLimpo.slice(-10);
                if (ultimos10Cliente === ultimos10Busca) return true;
                
                return false;
            });

            if (clienteEncontrado) {
                console.log(`✅ Cliente encontrado: ${clienteEncontrado.nome}`);
                res.json({
                    success: true,
                    cliente: {
                        id: clienteEncontrado.id,
                        nome: clienteEncontrado.nome,
                        telefone: clienteEncontrado.telefone,
                        email: clienteEncontrado.email,
                        bloqueado_chatbot: clienteEncontrado.bloqueado_chatbot || 0
                    }
                });
            } else {
                console.log('❌ Cliente não encontrado');
                res.json({ success: true, cliente: null });
            }
        }
    );
});

// ============================================
// 6. POST /api/chatbot/cliente/criar
// ============================================
router.post('/cliente/criar', (req, res) => {
    const { nome, telefone, email, empresaId } = req.body;

    const telefonePadrao = String(telefone).replace(/\D/g, '');
    console.log(`📝 Criando cliente: ${nome}, ${telefonePadrao}`);

    db.get(
        'SELECT id FROM clientes WHERE telefone = ? AND empresa_id = ?',
        [telefonePadrao, empresaId],
        (err, existente) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            if (existente) {
                // 🔥 REGISTRAR LEAD (cliente existente)
                registrarEventoAds(empresaId, 'lead', 'chatbot_cliente_existente', 'chatbot', existente.id);
                return res.json({ success: true, clienteId: existente.id });
            }

            db.run(
                'INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)',
                [nome, telefonePadrao, email || null, empresaId],
                function (err) {
                    if (err) {
                        return res.json({ success: false, message: err.message });
                    }
                    // 🔥 REGISTRAR LEAD (novo cliente)
                    registrarEventoAds(empresaId, 'lead', 'chatbot_novo_cliente', 'chatbot', this.lastID);
                    res.json({ success: true, clienteId: this.lastID });
                }
            );
        }
    );
});

// ============================================
// 7. POST /api/chatbot/datas-disponiveis-mes
// ============================================
router.post('/datas-disponiveis-mes', (req, res) => {
    const { empresaId, mes, ano } = req.body;

    const mesSolicitado = parseInt(mes) || new Date().getMonth() + 1;
    const anoSolicitado = parseInt(ano) || new Date().getFullYear();

    console.log(`📅 Buscando datas para ${mesSolicitado}/${anoSolicitado}`);

    db.all(
        `SELECT data, hora 
         FROM agendamentos 
         WHERE empresa_id = ? 
         AND status != 'cancelado'
         AND strftime('%Y', data) = ? 
         AND strftime('%m', data) = ?`,
        [empresaId, anoSolicitado.toString(), String(mesSolicitado).padStart(2, '0')],
        (err, agendamentos) => {
            if (err) {
                console.error('❌ Erro:', err.message);
                return res.json({ success: false, message: err.message });
            }

            const horariosPorDia = {};
            for (let ag of agendamentos || []) {
                if (!horariosPorDia[ag.data]) {
                    horariosPorDia[ag.data] = [];
                }
                if (ag.hora) {
                    horariosPorDia[ag.data].push(ag.hora);
                }
            }

            db.all(
                `SELECT dia_semana, hora_inicio, hora_fim, almoco_inicio, almoco_fim 
                 FROM horarios_funcionamento 
                 WHERE empresa_id = ? AND aberto = 1`,
                [empresaId],
                (err, horarios) => {
                    if (err) {
                        console.error('❌ Erro:', err.message);
                        return res.json({ success: false, message: err.message });
                    }

                    const horariosMap = {};
                    for (let h of horarios || []) {
                        horariosMap[h.dia_semana] = h;
                    }

                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const diasNoMes = new Date(anoSolicitado, mesSolicitado, 0).getDate();
                    const datasDisponiveis = [];

                    for (let dia = 1; dia <= diasNoMes; dia++) {
                        const dataAtual = new Date(anoSolicitado, mesSolicitado - 1, dia);
                        const diaSemana = dataAtual.getDay();
                        const dataStr = `${anoSolicitado}-${String(mesSolicitado).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

                        if (dataAtual < hoje) continue;
                        if (!horariosMap[diaSemana]) continue;

                        const hDia = horariosMap[diaSemana];
                        const ocupados = horariosPorDia[dataStr] || [];

                        const todosHorarios = gerarHorariosDoDia(
                            hDia.hora_inicio,
                            hDia.hora_fim,
                            hDia.almoco_inicio,
                            hDia.almoco_fim
                        );

                        const temLivre = todosHorarios.some(h => !ocupados.includes(h));
                        if (temLivre) {
                            datasDisponiveis.push(dataStr);
                        }
                    }

                    if (datasDisponiveis.length === 0) {
                        console.log('⚠️ Nenhuma data disponível, usando fallback');
                        const datasFallback = gerarDatasFallback(anoSolicitado, mesSolicitado);
                        return res.json({
                            success: true,
                            diasDisponiveis: datasFallback,
                            mes: mesSolicitado,
                            ano: anoSolicitado,
                            fallback: true
                        });
                    }

                    console.log(`📅 ${datasDisponiveis.length} datas disponíveis`);
                    res.json({
                        success: true,
                        diasDisponiveis: datasDisponiveis,
                        mes: mesSolicitado,
                        ano: anoSolicitado
                    });
                }
            );
        }
    );
});

// ============================================
// 8. POST /api/chatbot/horarios-disponiveis
// ============================================
router.post('/horarios-disponiveis', (req, res) => {
    const { empresaId, profissionalId, data } = req.body;

    console.log(`🔍 Buscando horários para ${data} - Empresa ${empresaId} - Profissional: ${profissionalId || 'todos'}`);

    const { getEmpresaDb } = require('../config/database');
    const empresaDb = getEmpresaDb(empresaId);

    if (!empresaDb) {
        console.error('❌ Banco da empresa não encontrado:', empresaId);
        return res.json({ success: false, message: 'Banco da empresa não encontrado' });
    }

    // ============================================
    // 1. BUSCAR AGENDAMENTOS (FILTRANDO POR PROFISSIONAL)
    // ============================================
    let sqlAgendamentos = `
        SELECT a.hora, s.duracao
        FROM agendamentos a
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.data = ? AND a.status != 'cancelado'
    `;
    let paramsAgendamentos = [data];

    if (profissionalId && profissionalId !== 'null' && profissionalId !== 'undefined' && !String(profissionalId).includes('dono')) {
        sqlAgendamentos += ` AND a.profissional_id = ?`;
        paramsAgendamentos.push(profissionalId);
    }

    console.log(`📝 SQL: ${sqlAgendamentos}`);
    console.log(`📝 Params: ${paramsAgendamentos}`);

    empresaDb.all(sqlAgendamentos, paramsAgendamentos, (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        const ocupados = new Set();

        for (let ag of agendamentos || []) {
            if (!ag.hora) continue;
            
            const horaInicio = ag.hora.length > 5 ? ag.hora.substring(0, 5) : ag.hora;
            const duracao = ag.duracao || 30;
            
            const [h, m] = horaInicio.split(':').map(Number);
            const inicioMin = h * 60 + m;
            const fimMin = inicioMin + duracao;
            
            for (let min = inicioMin; min < fimMin; min += 30) {
                const horaOcupada = Math.floor(min / 60);
                const minOcupado = min % 60;
                const horaStr = `${String(horaOcupada).padStart(2, '0')}:${String(minOcupado).padStart(2, '0')}`;
                ocupados.add(horaStr);
            }
        }

        const ocupadosList = Array.from(ocupados).sort();
        console.log(`📋 ${ocupadosList.length} horários OCUPADOS:`, ocupadosList);

        const dataObj = new Date(data + 'T00:00:00');
        const diaSemana = dataObj.getDay();

        empresaDb.get(
            `SELECT hora_inicio, hora_fim, almoco_inicio, almoco_fim
             FROM horarios_funcionamento 
             WHERE dia_semana = ? AND aberto = 1`,
            [diaSemana],
            (err, horario) => {
                if (err) {
                    console.error('❌ Erro ao buscar horário:', err.message);
                    return res.json({ success: false, message: err.message });
                }

                if (!horario) {
                    console.log('⚠️ Sem horário de funcionamento');
                    return res.json({ success: true, horarios: [] });
                }

                console.log(`📋 Horário de funcionamento: ${horario.hora_inicio} - ${horario.hora_fim}`);

                const todosHorarios = gerarHorariosDoDia(
                    horario.hora_inicio,
                    horario.hora_fim,
                    horario.almoco_inicio,
                    horario.almoco_fim
                );

                let disponiveis = todosHorarios.filter(h => !ocupados.has(h));
                console.log(`📋 Disponíveis (após remover ocupados): ${disponiveis.length}`);

                const hoje = new Date();
                const hojeStr = hoje.toISOString().split('T')[0];
                
                if (data === hojeStr) {
                    const horaAtual = hoje.getHours();
                    const minutoAtual = hoje.getMinutes();
                    
                    let minutosRedondo = 0;
                    let horaRedonda = horaAtual;
                    
                    if (minutoAtual >= 0 && minutoAtual <= 30) {
                        minutosRedondo = 30;
                        horaRedonda = horaAtual;
                    } else {
                        minutosRedondo = 0;
                        horaRedonda = horaAtual + 1;
                    }
                    
                    if (minutoAtual === 30) {
                        minutosRedondo = 30;
                        horaRedonda = horaAtual;
                    }
                    
                    if (minutoAtual === 0) {
                        minutosRedondo = 0;
                        horaRedonda = horaAtual;
                    }
                    
                    disponiveis = disponiveis.filter(h => {
                        const [hNum, mNum] = h.split(':').map(Number);
                        if (hNum > horaRedonda) return true;
                        if (hNum === horaRedonda && mNum >= minutosRedondo) return true;
                        return false;
                    });
                    
                    console.log(`🕐 ${disponiveis.length} horários disponíveis para hoje`);
                }

                console.log(`✅ ${disponiveis.length} horários disponíveis FINAL:`, disponiveis);
                res.json({ success: true, horarios: disponiveis });
            }
        );
    });
});

// ============================================
// 9. POST /api/chatbot/agendar - COM ADS (CONVERSÃO)
// ============================================
router.post('/agendar', async (req, res) => {
    try {
        const { 
            clienteId, 
            servicoId, 
            profissionalId, 
            data, 
            hora, 
            empresaId,
            valor,
            servicoNome,
            origem,
            campanha
        } = req.body;

        console.log('📝 Agendamento via chatbot:', { 
            clienteId, servicoId, profissionalId, data, hora, empresaId, valor, servicoNome,
            origem, campanha
        });

        if (!clienteId || !servicoId || !data || !hora || !empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Dados incompletos para agendamento'
            });
        }

        const { getEmpresaDb } = require('../config/database');
        const empresaDb = getEmpresaDb(empresaId);

        if (!empresaDb) {
            console.error('❌ Banco da empresa não encontrado:', empresaId);
            return res.status(500).json({
                success: false,
                message: 'Banco da empresa não encontrado'
            });
        }

        // Buscar cliente
        const cliente = await new Promise((resolve, reject) => {
            empresaDb.get(
                'SELECT id, nome, telefone FROM clientes WHERE id = ?',
                [clienteId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (!cliente) {
            console.error('❌ Cliente não encontrado:', clienteId);
            return res.status(404).json({ 
                success: false, 
                message: 'Cliente não encontrado' 
            });
        }

        console.log(`👤 Cliente: ${cliente.nome} (${cliente.telefone})`);

        // Buscar serviço
        const servico = await new Promise((resolve, reject) => {
            empresaDb.get(
                'SELECT id, nome, valor, duracao FROM servicos WHERE id = ?',
                [servicoId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        const nomeFinal = servico?.nome || servicoNome || 'Serviço';
        const valorFinal = parseFloat(servico?.valor || valor || 0);
        const duracaoFinal = servico?.duracao || 30;

        console.log(`✂️ Serviço: ${nomeFinal} - R$ ${valorFinal}`);

        // Buscar profissional
        let profissionalNome = 'Não atribuído';
        let profissionalIdFinal = null;
        
        if (profissionalId && profissionalId !== 'null' && profissionalId !== 'undefined' && profissionalId !== '') {
            const prof = await new Promise((resolve, reject) => {
                empresaDb.get(
                    'SELECT id, nome FROM profissionais WHERE id = ?',
                    [profissionalId],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            if (prof) {
                profissionalNome = prof.nome;
                profissionalIdFinal = prof.id;
                console.log(`👨‍💼 Profissional selecionado: ${profissionalNome} (ID: ${profissionalIdFinal})`);
            }
        } else {
            console.log('👨‍💼 Nenhum profissional selecionado');
        }

        // Verificar conflito
        const conflito = await new Promise((resolve, reject) => {
            empresaDb.get(
                `SELECT id FROM agendamentos 
                 WHERE data = ? AND hora = ? 
                 AND (profissional_id = ? OR (? IS NULL AND profissional_id IS NULL))
                 AND status != 'cancelado'
                 AND empresa_id = ?`,
                [data, hora, profissionalIdFinal || null, profissionalIdFinal || null, empresaId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        if (conflito) {
            console.error('❌ Conflito de horário:', data, hora);
            return res.status(409).json({
                success: false,
                message: 'Este horário já está ocupado'
            });
        }

        // Salvar agendamento
        console.log('📝 Inserindo agendamento...');

        const result = await new Promise((resolve, reject) => {
            empresaDb.run(
                `INSERT INTO agendamentos 
                 (cliente_id, data, hora, servico_id, servico, valor, duracao, 
                  status, empresa_id, profissional_id, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?, datetime('now'))`,
                [
                    clienteId, 
                    data, 
                    hora, 
                    servicoId, 
                    nomeFinal, 
                    valorFinal, 
                    duracaoFinal,
                    empresaId, 
                    profissionalIdFinal
                ],
                function (err) {
                    if (err) {
                        console.error('❌ Erro no INSERT:', err.message);
                        reject(err);
                    } else {
                        console.log(`✅ Agendamento inserido com ID: ${this.lastID}`);
                        resolve({ id: this.lastID });
                    }
                }
            );
        });

        console.log(`✅ AGENDAMENTO CRIADO! ID: ${result.id}`);

        // 🔥 REGISTRAR CONVERSÃO NO ADS
        const origemFinal = origem || 'chatbot';
        const campanhaFinal = campanha || 'chatbot_agendamento';
        
        registrarEventoAds(
            empresaId,
            'conversao',
            campanhaFinal,
            origemFinal,
            clienteId,
            result.id,
            valorFinal,
            0
        );

        // Buscar empresa
        const empresa = await new Promise((resolve, reject) => {
            db.get(
                'SELECT nome, telefone_dono FROM empresas WHERE id = ?',
                [empresaId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });

        // ============================================
        // ENVIAR WHATSAPP
        // ============================================
        if (cliente.telefone) {
            try {
                console.log(`📱 Enviando WhatsApp para ${cliente.telefone}...`);
                
                const whatsapp = require('../services/whatsapp');
                const dataFormatada = formatarDataBr(data);
                const valorFormatado = valorFinal.toFixed(2).replace('.', ',');

                const mensagem = `✅ *AGENDAMENTO CONFIRMADO!*\n\n` +
                    `Olá *${cliente.nome}*, seu agendamento foi confirmado!\n\n` +
                    `📋 *Resumo:*\n` +
                    `📅 Data: ${dataFormatada}\n` +
                    `⏰ Horário: ${hora}\n` +
                    `👨‍💼 Profissional: ${profissionalNome}\n` +
                    `✂️ Serviço: ${nomeFinal}\n` +
                    `💰 Valor: R$ ${valorFormatado}\n\n` +
                    `📍 ${empresa?.nome || 'See&Agende'}\n` +
                    `📞 ${empresa?.telefone_dono || '(11) 99999-9999'}\n\n` +
                    `🔔 Você receberá um lembrete próximo ao horário.\n` +
                    `Obrigado por escolher a ${empresa?.nome || 'See&Agende'}! ✨`;

                const enviado = await whatsapp.send(
                    empresaId,
                    cliente.telefone,
                    mensagem
                );

                if (enviado && enviado.success) {
                    console.log('✅ WhatsApp enviado com sucesso!');
                } else {
                    console.log('⚠️ WhatsApp não foi enviado:', enviado?.error || 'Erro desconhecido');
                }
            } catch (e) {
                console.error('❌ Erro WhatsApp:', e.message);
            }
        } else {
            console.warn('⚠️ Cliente sem telefone, WhatsApp não enviado');
        }

        // Resposta
        res.json({
            success: true,
            message: 'Agendamento confirmado!',
            agendamentoId: result.id,
            valor: valorFinal,
            profissional: profissionalNome,
            status: 'pendente'
        });

    } catch (error) {
        console.error('❌ ERRO NO AGENDAMENTO:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao realizar agendamento'
        });
    }
});

// ============================================
// 10. GET /api/chatbot/link-personalizado/:empresaId
// ============================================
router.get('/link-personalizado/:empresaId', (req, res) => {
    const { empresaId } = req.params;
    const baseUrl = process.env.BASE_URL || 'https://seeagende.tech';
    
    console.log(`🔗 Gerando link personalizado para empresa ${empresaId}`);
    
    const dbDir = path.join(__dirname, '../../database');
    
    let nomeEmpresa = `Empresa ${empresaId}`;
    let slug = empresaId;
    
    try {
        const files = fs.readdirSync(dbDir);
        
        for (let file of files) {
            if (!file.endsWith('.db')) continue;
            
            const matchId = file.match(/_(\d+)\.db$/) || file.match(/(\d+)_/);
            if (matchId && parseInt(matchId[1]) === parseInt(empresaId)) {
                nomeEmpresa = file.replace(/\.db$/, '').replace(/_\d+$/, '').replace(/_/g, ' ');
                console.log(`✅ Arquivo encontrado: ${file} -> ${nomeEmpresa}`);
                
                slug = nomeEmpresa
                    .toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                break;
            }
        }
    } catch (err) {
        console.error('❌ Erro ao escanear diretório:', err.message);
    }
    
    res.json({
        success: true,
        link: `${baseUrl}/chatbot.html?empresa=${empresaId}`,
        linkPersonalizado: `${baseUrl}/chatbot/${slug}`,
        slug: slug,
        empresa: nomeEmpresa
    });
});

// ============================================
// 11. GET /chatbot/:slug - REDIRECIONAR
// ============================================
router.get('/:slug', (req, res) => {
    const { slug } = req.params;
    
    console.log(`🔍 Buscando empresa pelo slug: ${slug}`);
    
    if (!isNaN(slug)) {
        // 🔥 Registrar acesso via link personalizado
        registrarEventoAds(slug, 'visualizacao', 'chatbot_link_personalizado', 'link_direto');
        return res.redirect(`/chatbot.html?empresa=${slug}`);
    }
    
    const dbDir = path.join(__dirname, '../../database');
    
    try {
        const files = fs.readdirSync(dbDir);
        console.log(`📋 ${files.length} arquivos encontrados em database/`);
        
        const buscaNormalizada = slug
            .toLowerCase()
            .replace(/-/g, ' ')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .trim();
        
        console.log(`🔍 Buscando: "${buscaNormalizada}"`);
        
        let matches = [];
        
        for (let file of files) {
            if (!file.endsWith('.db')) continue;
            
            const nomeArquivo = file
                .replace(/\.db$/, '')
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/_/g, ' ')
                .replace(/\d+/g, '')
                .trim();
            
            const matchId = file.match(/_(\d+)\.db$/) || file.match(/(\d+)_/);
            const id = matchId ? parseInt(matchId[1]) : null;
            
            if (!id) continue;
            
            let score = 0;
            let tipo = 'parcial';
            
            if (nomeArquivo === buscaNormalizada) {
                score = 100;
                tipo = 'exato';
            } else if (nomeArquivo.includes(buscaNormalizada)) {
                score = 90 - (nomeArquivo.length - buscaNormalizada.length) * 0.5;
                tipo = 'contem';
            } else if (buscaNormalizada.includes(nomeArquivo) && nomeArquivo.length > 3) {
                score = 80 - (buscaNormalizada.length - nomeArquivo.length) * 0.5;
                tipo = 'contido';
            } else {
                const palavrasBusca = buscaNormalizada.split(' ');
                const palavrasArquivo = nomeArquivo.split(' ');
                let matchesPalavras = 0;
                for (let pb of palavrasBusca) {
                    if (pb.length < 3) continue;
                    for (let pa of palavrasArquivo) {
                        if (pa.length < 3) continue;
                        if (pa === pb || pa.includes(pb) || pb.includes(pa)) {
                            matchesPalavras++;
                            break;
                        }
                    }
                }
                if (matchesPalavras > 0) {
                    score = 50 + (matchesPalavras / Math.max(palavrasBusca.length, palavrasArquivo.length)) * 30;
                    tipo = 'palavras';
                }
            }
            
            if (score > 0) {
                matches.push({ id, nome: file, nomeArquivo, score, tipo });
                console.log(`   📄 ${file} -> Score: ${score.toFixed(2)} - ${tipo}`);
            }
        }
        
        matches.sort((a, b) => b.score - a.score);
        const matchesFiltrados = matches.filter(m => m.score > 60);
        
        if (matchesFiltrados.length > 0) {
            const melhor = matchesFiltrados[0];
            console.log(`✅ Empresa encontrada: ${melhor.nome} -> ID ${melhor.id}`);
            // 🔥 Registrar acesso via link personalizado
            registrarEventoAds(melhor.id, 'visualizacao', 'chatbot_slug', 'link_direto');
            return res.redirect(`/chatbot.html?empresa=${melhor.id}`);
        }
        
        for (let file of files) {
            if (!file.endsWith('.db')) continue;
            const fileLower = file.toLowerCase();
            const slugLower = slug.toLowerCase();
            
            if (fileLower.includes(slugLower) || slugLower.includes(fileLower.replace(/\d/g, '').replace(/_/g, ''))) {
                const matchId = file.match(/_(\d+)\.db$/);
                if (matchId) {
                    const id = parseInt(matchId[1]);
                    console.log(`✅ Empresa encontrada pelo nome do arquivo: ${file} -> ID ${id}`);
                    registrarEventoAds(id, 'visualizacao', 'chatbot_slug_fallback', 'link_direto');
                    return res.redirect(`/chatbot.html?empresa=${id}`);
                }
            }
        }
        
    } catch (err) {
        console.error('❌ Erro ao escanear diretório:', err.message);
    }
    
    console.log(`❌ Empresa não encontrada para o slug: ${slug}`);
    res.redirect(`/chatbot.html?empresa=1`);
});
// POST /api/chatbot/registrar-anuncio
router.post('/registrar-anuncio', (req, res) => {
    const { empresa_id, campanha, origem, tipo, cliente_id, valor, custo } = req.body;

    console.log('📢 [BACKEND] Registro de anúncio recebido:');
    console.log('📦 Dados:', JSON.stringify(req.body, null, 2));

    // 🔥 VALIDAÇÃO FORTE
    const empresaIdInt = parseInt(empresa_id);
    if (!empresa_id || isNaN(empresaIdInt) || empresaIdInt <= 0) {
        console.error('❌ [BACKEND] empresa_id INVÁLIDO:', empresa_id);
        return res.status(400).json({
            success: false,
            error: 'empresa_id inválido ou não informado'
        });
    }

    // 🔥 VERIFICAR SE A EMPRESA EXISTE
    db.get('SELECT id, nome FROM empresas WHERE id = ?', [empresaIdInt], (err, empresa) => {
        if (err) {
            console.error('❌ [BACKEND] Erro ao verificar empresa:', err);
            return res.status(500).json({ success: false, error: 'Erro interno' });
        }

        if (!empresa) {
            console.error('❌ [BACKEND] Empresa NÃO encontrada:', empresaIdInt);
            return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
        }

        console.log(`✅ [BACKEND] Empresa encontrada: ${empresa.nome} (ID: ${empresaIdInt})`);

        // 🔥 VERIFICAR SE A TABELA ADS_STATS EXISTE
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='ads_stats'", (err, tableExists) => {
            if (err || !tableExists) {
                console.error('❌ [BACKEND] Tabela ads_stats não existe!');
                return res.status(500).json({ success: false, error: 'Tabela não encontrada' });
            }

            const query = `
                INSERT INTO ads_stats (
                    empresa_id, campanha, origem, tipo, cliente_id,
                    valor, custo, data_interacao
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                empresaIdInt,
                campanha || 'anuncio_desconhecido',
                origem || 'chatbot_anuncio',
                tipo || 'visualizacao',
                cliente_id ? parseInt(cliente_id) : null,
                parseFloat(valor) || 0,
                parseFloat(custo) || 0,
                new Date().toISOString()
            ];

            db.run(query, params, function(err) {
                if (err) {
                    console.error('❌ [BACKEND] Erro ao inserir:', err.message);
                    return res.status(500).json({ success: false, error: err.message });
                }

                console.log(`✅ [BACKEND] Anúncio SALVO! ID: ${this.lastID} | Empresa: ${empresa.nome} (${empresaIdInt}) | Tipo: ${tipo}`);
                res.json({
                    success: true,
                    id: this.lastID,
                    message: 'Evento registrado com sucesso!'
                });
            });
        });
    });
});
module.exports = router;