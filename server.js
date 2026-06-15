const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./database/barbearia.db');

// ============================================
// MIDDLEWARES
// ============================================

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }
    try {
        const decoded = jwt.verify(token, 'secret_key');
        req.usuario = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token inválido' });
    }
}

function verificarSuperAdmin(req, res, next) {
    if (req.usuario.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Super Admin.' });
    }
    next();
}

function verificarDono(req, res, next) {
    if (req.usuario.role !== 'dono') {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Dono.' });
    }
    next();
}

// Middleware para verificar limite de profissionais
function verificarLimiteProfissionais(req, res, next) {
    const empresaId = req.usuario.empresa_id;

    db.get(`SELECT plano, limite_profissionais, 
            (SELECT COUNT(*) FROM profissionais WHERE empresa_id = ? AND ativo = 1) as total_profs 
            FROM empresas WHERE id = ?`,
        [empresaId, empresaId], (err, empresa) => {
            if (err) return res.status(500).json({ success: false, message: 'Erro interno' });

            if (!empresa) {
                return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
            }

            if (empresa.total_profs >= empresa.limite_profissionais) {
                return res.status(403).json({
                    success: false,
                    message: `Seu plano (${empresa.plano}) permite apenas ${empresa.limite_profissionais} profissional(is). Faça upgrade para adicionar mais.`,
                    needs_upgrade: true
                });
            }
            next();
        });
}

// Middleware para verificar se pode criar agendamentos (trial expirado ou assinatura vencida)
function verificarAcessoAgendamentos(req, res, next) {
    const empresaId = req.usuario.empresa_id;

    db.get(`SELECT plano, trial_expira, assinatura_ativa, assinatura_valida_ate 
            FROM empresas WHERE id = ?`, [empresaId], (err, empresa) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro interno' });

        if (!empresa) {
            return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let acessoLiberado = false;
        let mensagem = '';

        if (empresa.plano === 'trial' && empresa.trial_expira) {
            const trialExpira = new Date(empresa.trial_expira);
            if (hoje <= trialExpira) {
                acessoLiberado = true;
            } else {
                mensagem = 'Seu período de teste expirou. Faça upgrade para continuar agendando.';
            }
        } else if (empresa.plano !== 'trial') {
            if (empresa.assinatura_ativa === 1) {
                if (empresa.assinatura_valida_ate) {
                    const validaAte = new Date(empresa.assinatura_valida_ate);
                    if (hoje <= validaAte) {
                        acessoLiberado = true;
                    } else {
                        mensagem = 'Sua assinatura expirou. Renove para continuar usando o sistema.';
                    }
                } else {
                    acessoLiberado = true;
                }
            } else {
                mensagem = 'Sua assinatura está inativa. Entre em contato com o suporte.';
            }
        }

        if (!acessoLiberado) {
            return res.status(403).json({
                success: false,
                message: mensagem || 'Acesso bloqueado. Verifique seu plano.',
                requires_upgrade: true
            });
        }

        next();
    });
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getDiaSemanaFromDate(dataStr) {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));
    return dataUTC.getUTCDay();
}

function validarHorarioFuncionamento(empresa_id, data, hora, callback) {
    const diaSemana = getDiaSemanaFromDate(data);

    db.get('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?',
        [empresa_id, diaSemana], (err, horario) => {
            if (err) return callback(err);
            if (!horario || horario.aberto === 0) {
                return callback(null, { valido: false, mensagem: 'Estabelecimento fechado neste dia' });
            }

            if (hora < horario.hora_inicio || hora > horario.hora_fim) {
                return callback(null, { valido: false, mensagem: 'Horario fora do expediente. Funcionamos das ' + horario.hora_inicio + ' as ' + horario.hora_fim });
            }

            if (horario.almoco_inicio && horario.almoco_fim) {
                if (hora >= horario.almoco_inicio && hora < horario.almoco_fim) {
                    return callback(null, { valido: false, mensagem: 'Horario de almoco das ' + horario.almoco_inicio + ' as ' + horario.almoco_fim });
                }
            }

            callback(null, { valido: true });
        });
}

// ============================================
// AUTENTICAÇÃO
// ============================================

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    db.get(`SELECT p.*, e.nome as empresa_nome, e.trial_expira, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
            FROM profissionais p 
            LEFT JOIN empresas e ON p.empresa_id = e.id 
            WHERE p.email = ? AND p.ativo = 1`, [email], (err, profissional) => {
        if (!err && profissional && bcrypt.compareSync(senha, profissional.senha)) {
            const token = jwt.sign(
                { id: profissional.id, email: profissional.email, role: 'profissional', empresa_id: profissional.empresa_id, nome: profissional.nome, comissao_percent: profissional.comissao_percent },
                'secret_key',
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                data: {
                    token,
                    usuario: {
                        id: profissional.id,
                        nome: profissional.nome,
                        email: profissional.email,
                        role: 'profissional',
                        empresa_id: profissional.empresa_id,
                        empresa_nome: profissional.empresa_nome,
                        comissao_percent: profissional.comissao_percent
                    }
                }
            });
        }

        db.get(`SELECT u.*, e.trial_expira, e.nome as empresa_nome, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
                FROM usuarios u 
                LEFT JOIN empresas e ON u.empresa_id = e.id 
                WHERE u.email = ?`, [email], (err, user) => {
            if (err || !user) {
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            if (!bcrypt.compareSync(senha, user.senha)) {
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            let diasRestantes = 0;
            let planoStatus = user.plano;

            if (user.role === 'dono') {
                if (user.plano === 'trial' && user.trial_expira) {
                    const hoje = new Date();
                    const trialExpira = new Date(user.trial_expira);
                    if (hoje > trialExpira) {
                        return res.json({ success: false, message: 'Seu período de teste expirou. Faça upgrade para continuar usando o sistema.' });
                    }
                    diasRestantes = Math.ceil((trialExpira - hoje) / (1000 * 60 * 60 * 24));
                } else if (user.plano !== 'trial' && user.assinatura_ativa === 1 && user.assinatura_valida_ate) {
                    const hoje = new Date();
                    const validaAte = new Date(user.assinatura_valida_ate);
                    if (hoje > validaAte) {
                        return res.json({ success: false, message: 'Sua assinatura expirou. Renove para continuar usando o sistema.' });
                    }
                    diasRestantes = Math.ceil((validaAte - hoje) / (1000 * 60 * 60 * 24));
                }
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, empresa_id: user.empresa_id, nome: user.nome },
                'secret_key',
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                data: {
                    token,
                    usuario: {
                        id: user.id,
                        nome: user.nome,
                        email: user.email,
                        role: user.role,
                        empresa_id: user.empresa_id,
                        empresa_nome: user.empresa_nome,
                        dias_restantes: diasRestantes,
                        plano: user.plano,
                        limite_profissionais: user.limite_profissionais
                    }
                }
            });
        });
    });
});

app.post('/api/cadastro', (req, res) => {
    const { nome, email, senha, empresa_nome } = req.body;

    if (!nome || !email || !senha || !empresa_nome) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios' });
    }

    db.get(`SELECT id FROM usuarios WHERE email = ?`, [email], (err, user) => {
        if (user) {
            return res.json({ success: false, message: 'Email já cadastrado' });
        }

        const trialExpira = new Date();
        trialExpira.setDate(trialExpira.getDate() + 45);
        const trialData = trialExpira.toISOString().split('T')[0];

        db.run(`INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
                VALUES (?, 'trial', 1, ?, 1)`,
            [empresa_nome, trialData], function (err) {
                if (err) {
                    return res.json({ success: false, message: 'Erro ao criar empresa' });
                }

                const empresa_id = this.lastID;
                const senhaHash = bcrypt.hashSync(senha, 10);

                db.run(`INSERT INTO usuarios (nome, email, senha, role, empresa_id) VALUES (?, ?, ?, 'dono', ?)`,
                    [nome, email, senhaHash, empresa_id], (err) => {
                        if (err) {
                            return res.json({ success: false, message: 'Erro ao criar usuário' });
                        }
                        res.json({ success: true, message: 'Cadastro realizado! Você tem 45 dias de teste.' });
                    });
            });
    });
});

// ============================================
// ROTAS DE PLANOS
// ============================================

// Adicione esta rota no server.js se não existir
app.get('/api/empresa/plano', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const planosNomes = {
        'trial': 'Trial',
        'starter': 'Starter',
        'pro': 'Pro',
        'business': 'Business',
        'enterprise': 'Enterprise'
    };

    db.get(`SELECT plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate 
            FROM empresas WHERE id = ?`, [empresaId], (err, empresa) => {
        if (err || !empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }

        let diasRestantes = 0;
        let validaAte = null;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (empresa.plano === 'trial' && empresa.trial_expira) {
            const trialExpira = new Date(empresa.trial_expira);
            diasRestantes = Math.max(0, Math.ceil((trialExpira - hoje) / (1000 * 60 * 60 * 24)));
            validaAte = empresa.trial_expira;
        } else if (empresa.plano !== 'trial' && empresa.assinatura_valida_ate) {
            const validaAteDate = new Date(empresa.assinatura_valida_ate);
            diasRestantes = Math.max(0, Math.ceil((validaAteDate - hoje) / (1000 * 60 * 60 * 24)));
            validaAte = empresa.assinatura_valida_ate;
        }

        res.json({
            success: true,
            data: {
                plano: empresa.plano,
                plano_nome: planosNomes[empresa.plano] || empresa.plano,
                limite_profissionais: empresa.limite_profissionais,
                assinatura_ativa: empresa.assinatura_ativa,
                dias_restantes: diasRestantes,
                valida_ate: validaAte,
                is_trial: empresa.plano === 'trial'
            }
        });
    });
});

// Fazer upgrade de plano
app.post('/api/upgrade', auth, verificarDono, (req, res) => {
    const { plano, metodo_pagamento, comprovante } = req.body;
    const empresaId = req.usuario.empresa_id;

    const planosConfig = {
        'starter': { limite: 1, valor: 24.90, dias_acesso: 30, nome: 'Starter' },
        'pro': { limite: 5, valor: 49.90, dias_acesso: 30, nome: 'Pro' },
        'business': { limite: 12, valor: 99.90, dias_acesso: 30, nome: 'Business' },
        'enterprise': { limite: 999, valor: 199.90, dias_acesso: 30, nome: 'Enterprise' }
    };

    if (!planosConfig[plano]) {
        return res.status(400).json({ success: false, message: 'Plano inválido' });
    }

    const config = planosConfig[plano];
    const agora = new Date();
    const validaAte = new Date();
    validaAte.setDate(validaAte.getDate() + config.dias_acesso);
    const validaAteStr = validaAte.toISOString().split('T')[0];

    // Buscar plano atual para histórico
    db.get('SELECT plano FROM empresas WHERE id = ?', [empresaId], (err, empresaAtual) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        // Verificar se já existe tabela de histórico, se não, criar
        db.run(`CREATE TABLE IF NOT EXISTS planos_historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            plano_antigo TEXT,
            plano_novo TEXT,
            valor_pago REAL,
            metodo_pagamento TEXT,
            comprovante TEXT,
            data_mudanca DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) console.error('Erro ao criar tabela historico:', err);
        });

        // Atualizar empresa
        db.run(`UPDATE empresas SET 
                plano = ?, 
                limite_profissionais = ?,
                assinatura_ativa = 1,
                assinatura_valida_ate = ?,
                trial_expira = NULL
                WHERE id = ?`,
            [plano, config.limite, validaAteStr, empresaId],
            function (err) {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ success: false, message: err.message });
                }

                // Registrar no histórico
                db.run(`INSERT INTO planos_historico 
                        (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                    [empresaId, empresaAtual?.plano || 'trial', plano, config.valor, metodo_pagamento || 'manual', comprovante || null],
                    (err) => {
                        if (err) console.error('Erro ao salvar histórico:', err);
                    }
                );

                res.json({
                    success: true,
                    message: `Parabéns! Seu plano ${config.nome} foi ativado com sucesso.`,
                    data: {
                        plano: plano,
                        plano_nome: config.nome,
                        limite: config.limite,
                        valida_ate: validaAteStr,
                        valor: config.valor
                    }
                });
            }
        );
    });
});

// ============================================
// SUPER ADMIN
// ============================================

app.get('/api/admin/stats', auth, verificarSuperAdmin, (req, res) => {
    db.get("SELECT COUNT(*) as total FROM empresas", (err, empresas) => {
        db.get("SELECT COUNT(*) as total FROM usuarios WHERE role = 'dono'", (err2, donos) => {
            db.get("SELECT COUNT(*) as total FROM clientes", (err3, clientes) => {
                db.get("SELECT COUNT(*) as total FROM agendamentos", (err4, agendamentos) => {
                    res.json({
                        success: true,
                        data: {
                            empresas: empresas?.total || 0,
                            donos: donos?.total || 0,
                            clientes: clientes?.total || 0,
                            agendamentos: agendamentos?.total || 0
                        }
                    });
                });
            });
        });
    });
});

app.get('/api/admin/empresas', auth, verificarSuperAdmin, (req, res) => {
    db.all(`
        SELECT e.*, 
               COUNT(DISTINCT u.id) as total_usuarios,
               COUNT(DISTINCT c.id) as total_clientes,
               COUNT(DISTINCT a.id) as total_agendamentos
        FROM empresas e
        LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
        LEFT JOIN clientes c ON c.empresa_id = e.id
        LEFT JOIN agendamentos a ON a.empresa_id = e.id
        GROUP BY e.id
        ORDER BY e.created_at DESC
    `, (err, empresas) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: empresas });
    });
});

app.get('/api/admin/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;

    db.get(`SELECT * FROM empresas WHERE id = ?`, [id], (err, empresa) => {
        if (err) return res.json({ success: false, message: err.message });

        db.all(`SELECT id, nome, email, created_at FROM usuarios WHERE empresa_id = ? AND role = 'dono'`, [id], (err, donos) => {
            db.get(`SELECT COUNT(*) as total FROM clientes WHERE empresa_id = ?`, [id], (err, clientes) => {
                db.get(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END) as concluidos FROM agendamentos WHERE empresa_id = ?`, [id], (err, agendamentos) => {
                    res.json({
                        success: true,
                        data: {
                            empresa,
                            donos,
                            total_clientes: clientes?.total || 0,
                            total_agendamentos: agendamentos?.total || 0,
                            agendamentos_concluidos: agendamentos?.concluidos || 0
                        }
                    });
                });
            });
        });
    });
});

app.put('/api/admin/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, plano } = req.body;

    db.run(`UPDATE empresas SET nome = COALESCE(?, nome), plano = COALESCE(?, plano) WHERE id = ?`,
        [nome, plano, id], function (err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: 'Empresa atualizada' });
        });
});

app.post('/api/admin/empresas/:id/extender-trial', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { dias } = req.body;

    db.get(`SELECT trial_expira FROM empresas WHERE id = ?`, [id], (err, empresa) => {
        let novaData = new Date();
        if (empresa?.trial_expira) {
            novaData = new Date(empresa.trial_expira);
        }
        novaData.setDate(novaData.getDate() + (dias || 30));
        const dataStr = novaData.toISOString().split('T')[0];

        db.run(`UPDATE empresas SET trial_expira = ? WHERE id = ?`, [dataStr, id], (err) => {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: `Trial estendido até ${dataStr}` });
        });
    });
});

// ============================================
// SERVIÇOS
// ============================================

app.get('/api/servicos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    if (!empresa_id) return res.json({ success: true, data: [] });

    db.all(`SELECT * FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome`, [empresa_id], (err, servicos) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: servicos });
    });
});

app.get('/api/servicos/todos', auth, verificarDono, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    db.all(`SELECT * FROM servicos WHERE empresa_id = ? ORDER BY nome`, [empresa_id], (err, servicos) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: servicos });
    });
});

app.post('/api/servicos', auth, verificarDono, (req, res) => {
    const { nome, descricao, valor, duracao } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome || !valor) {
        return res.json({ success: false, message: 'Nome e valor são obrigatórios' });
    }

    db.run(`INSERT INTO servicos (nome, descricao, valor, duracao, empresa_id, ativo) VALUES (?, ?, ?, ?, ?, 1)`,
        [nome, descricao || '', valor, duracao || 30, empresa_id], function (err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, data: { id: this.lastID }, message: 'Serviço cadastrado' });
        });
});

app.put('/api/servicos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, descricao, valor, duracao, ativo } = req.body;
    const empresa_id = req.usuario.empresa_id;

    db.run(`UPDATE servicos SET nome = COALESCE(?, nome), descricao = COALESCE(?, descricao), valor = COALESCE(?, valor), duracao = COALESCE(?, duracao), ativo = COALESCE(?, ativo) WHERE id = ? AND empresa_id = ?`,
        [nome, descricao, valor, duracao, ativo, id, empresa_id], function (err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: 'Serviço atualizado' });
        });
});

app.delete('/api/servicos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    db.get(`SELECT COUNT(*) as total FROM agendamentos WHERE servico_id = ?`, [id], (err, result) => {
        if (result?.total > 0) {
            db.run(`UPDATE servicos SET ativo = 0 WHERE id = ? AND empresa_id = ?`, [id, empresa_id], (err) => {
                if (err) return res.json({ success: false, message: err.message });
                res.json({ success: true, message: 'Serviço desativado (possui agendamentos)' });
            });
        } else {
            db.run(`DELETE FROM servicos WHERE id = ? AND empresa_id = ?`, [id, empresa_id], (err) => {
                if (err) return res.json({ success: false, message: err.message });
                res.json({ success: true, message: 'Serviço removido' });
            });
        }
    });
});

// ============================================
// PROFISSIONAIS (COM VERIFICAÇÃO DE LIMITE)
// ============================================

app.get('/api/profissionais', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    if (!empresa_id || req.usuario.role === 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    db.all(`SELECT id, nome, email, comissao_percent, ativo, created_at FROM profissionais WHERE empresa_id = ? ORDER BY nome`, [empresa_id], (err, profissionais) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: profissionais });
    });
});

app.post('/api/profissionais', auth, verificarDono, verificarLimiteProfissionais, (req, res) => {
    const { nome, email, comissao_percent, senha } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome || !email) {
        return res.json({ success: false, message: 'Nome e email são obrigatórios' });
    }

    let senhaFinal = senha;
    let senhaGerada = false;

    if (!senhaFinal) {
        senhaFinal = Math.random().toString(36).slice(-8);
        senhaGerada = true;
    }

    const senhaHash = bcrypt.hashSync(senhaFinal, 10);

    db.run(`INSERT INTO profissionais (nome, email, senha, comissao_percent, empresa_id, ativo) VALUES (?, ?, ?, ?, ?, 1)`,
        [nome, email, senhaHash, comissao_percent || 30, empresa_id], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.json({ success: false, message: 'Email já cadastrado' });
                }
                return res.json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                data: { id: this.lastID, senha_temp: senhaFinal },
                message: `Profissional criado! ${senhaGerada ? `Senha temporária: ${senhaFinal}` : 'Senha definida pelo dono.'}`
            });
        });
});

app.put('/api/profissionais/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, email, comissao_percent, ativo, senha } = req.body;
    const empresa_id = req.usuario.empresa_id;

    let query = `UPDATE profissionais SET nome = COALESCE(?, nome), email = COALESCE(?, email), comissao_percent = COALESCE(?, comissao_percent), ativo = COALESCE(?, ativo)`;
    let params = [nome, email, comissao_percent, ativo];

    if (senha && senha.trim() !== '') {
        const senhaHash = bcrypt.hashSync(senha, 10);
        query += `, senha = ?`;
        params.push(senhaHash);
    }

    query += ` WHERE id = ? AND empresa_id = ?`;
    params.push(id, empresa_id);

    db.run(query, params, function (err) {
        if (err) return res.json({ success: false, message: err.message });

        if (senha && senha.trim() !== '') {
            res.json({ success: true, message: 'Profissional atualizado com nova senha', senha: senha });
        } else {
            res.json({ success: true, message: 'Profissional atualizado' });
        }
    });
});

app.post('/api/profissionais/:id/reset-senha', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const novaSenha = Math.random().toString(36).slice(-8);
    const senhaHash = bcrypt.hashSync(novaSenha, 10);

    db.run(`UPDATE profissionais SET senha = ? WHERE id = ? AND empresa_id = ?`,
        [senhaHash, id, empresa_id], function (err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: `Nova senha: ${novaSenha}`, senha: novaSenha });
        });
});

app.delete('/api/profissionais/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    db.get(`SELECT COUNT(*) as total FROM agendamentos WHERE profissional_id = ?`, [id], (err, result) => {
        if (result?.total > 0) {
            db.run(`UPDATE profissionais SET ativo = 0 WHERE id = ? AND empresa_id = ?`, [id, empresa_id], (err) => {
                if (err) return res.json({ success: false, message: err.message });
                res.json({ success: true, message: 'Profissional desativado (possui agendamentos)' });
            });
        } else {
            db.run(`DELETE FROM profissionais WHERE id = ? AND empresa_id = ?`, [id, empresa_id], (err) => {
                if (err) return res.json({ success: false, message: err.message });
                res.json({ success: true, message: 'Profissional removido' });
            });
        }
    });
});

// ============================================
// AGENDAMENTOS (COM VERIFICAÇÃO DE ACESSO)
// ============================================

app.get('/api/agendamentos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    if (!empresa_id) return res.json({ success: true, data: [] });

    let query = `
        SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN profissionais p ON a.profissional_id = p.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.empresa_id = ?
        ORDER BY a.data DESC
    `;

    db.all(query, [empresa_id], (err, agendamentos) => {
        res.json({ success: true, data: agendamentos });
    });
});

app.post('/api/agendamentos', auth, verificarAcessoAgendamentos, (req, res) => {
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!cliente_id || !data) {
        return res.json({ success: false, message: 'Cliente e data são obrigatórios' });
    }

    if (!hora) {
        return res.json({ success: false, message: 'Horário é obrigatório' });
    }

    validarHorarioFuncionamento(empresa_id, data, hora, (err, validacao) => {
        if (err) return res.json({ success: false, message: err.message });
        if (!validacao.valido) {
            return res.json({ success: false, message: validacao.mensagem });
        }

        if (servico_id) {
            db.get(`SELECT valor, nome FROM servicos WHERE id = ? AND empresa_id = ?`, [servico_id, empresa_id], (err, servicoData) => {
                if (servicoData) {
                    db.run(`INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, status, empresa_id, profissional_id) 
                            VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`,
                        [cliente_id, data, hora, servico_id, servicoData.nome, servicoData.valor, empresa_id, profissional_id || null], function (err) {
                            if (err) return res.json({ success: false, message: err.message });
                            res.json({ success: true, data: { id: this.lastID }, message: 'Agendamento criado' });
                        });
                } else {
                    res.json({ success: false, message: 'Serviço não encontrado' });
                }
            });
        } else {
            db.run(`INSERT INTO agendamentos (cliente_id, data, hora, servico, valor, status, empresa_id, profissional_id) 
                    VALUES (?, ?, ?, ?, ?, 'pendente', ?, ?)`,
                [cliente_id, data, hora, servico || '', valor || 0, empresa_id, profissional_id || null], function (err) {
                    if (err) return res.json({ success: false, message: err.message });
                    res.json({ success: true, data: { id: this.lastID }, message: 'Agendamento criado' });
                });
        }
    });
});

// Rotas de agendamento para profissional
app.get('/api/profissional/agendamentos', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const profissional_id = req.usuario.id;

    db.all(`
        SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.profissional_id = ?
        ORDER BY a.data DESC
    `, [profissional_id], (err, agendamentos) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: agendamentos });
    });
});

app.put('/api/profissional/agendamentos/:id', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const { id } = req.params;
    const { data, hora, cliente_id } = req.body;
    const profissional_id = req.usuario.id;

    db.get(`SELECT * FROM agendamentos WHERE id = ? AND profissional_id = ?`, [id, profissional_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamentos concluídos não podem ser editados' });
        }

        let query = `UPDATE agendamentos SET `;
        let params = [];
        let updates = [];

        if (data !== undefined) {
            updates.push(`data = ?`);
            params.push(data);
        }
        if (hora !== undefined) {
            updates.push(`hora = ?`);
            params.push(hora);
        }
        if (cliente_id !== undefined) {
            updates.push(`cliente_id = ?`);
            params.push(cliente_id);
        }

        if (updates.length === 0) {
            return res.json({ success: false, message: 'Nenhum campo para atualizar' });
        }

        query += updates.join(', ');
        query += ` WHERE id = ? AND profissional_id = ?`;
        params.push(id, profissional_id);

        db.run(query, params, function (err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
        });
    });
});

app.put('/api/profissional/agendamentos/:id/concluir', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const { id } = req.params;
    const profissional_id = req.usuario.id;
    const comissao_percent = req.usuario.comissao_percent || 30;

    db.get(`SELECT * FROM agendamentos WHERE id = ? AND profissional_id = ?`, [id, profissional_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamento já foi concluído' });
        }

        const comissao = (agendamento.valor || 0) * (comissao_percent / 100);

        db.run(`UPDATE agendamentos SET status = 'concluido', comissao = ? WHERE id = ?`,
            [comissao, id], (err) => {
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

app.put('/api/agendamentos/:id/concluir', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sql = `SELECT a.*, p.comissao_percent FROM agendamentos a LEFT JOIN profissionais p ON a.profissional_id = p.id WHERE a.id = ? AND a.empresa_id = ?`;

    db.get(sql, [id, empresa_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamento já foi concluído' });
        }

        let comissao = 0;
        let mensagemComissao = '';

        if (agendamento.profissional_id) {
            const comissaoPercent = agendamento.comissao_percent || 30;
            comissao = (agendamento.valor || 0) * (comissaoPercent / 100);
            mensagemComissao = ` Comissão do profissional: R$ ${comissao.toFixed(2)}`;
        } else {
            mensagemComissao = ' Sem comissão (serviço sem profissional)';
        }

        db.run(`UPDATE agendamentos SET status = 'concluido', comissao = ? WHERE id = ? AND empresa_id = ?`,
            [comissao, id, empresa_id], (err) => {
                if (err) {
                    return res.json({ success: false, message: err.message });
                }

                res.json({
                    success: true,
                    message: `Agendamento concluído!${mensagemComissao}`,
                    data: { comissao: comissao }
                });
            });
    });
});

app.put('/api/agendamentos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    db.get(`SELECT * FROM agendamentos WHERE id = ? AND empresa_id = ?`, [id, empresa_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamentos concluídos não podem ser editados' });
        }

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
            return res.json({ success: false, message: 'Nenhum campo para atualizar' });
        }

        query += updates.join(', ');
        query += ` WHERE id = ? AND empresa_id = ?`;
        params.push(id, empresa_id);

        db.run(query, params, function (err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
        });
    });
});

app.delete('/api/agendamentos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    db.run(`DELETE FROM agendamentos WHERE id = ? AND empresa_id = ?`, [id, empresa_id], function (err) {
        res.json({ success: true, message: 'Agendamento removido' });
    });
});

// ============================================
// CLIENTES
// ============================================

app.get('/api/clientes', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    console.log('GET /api/clientes - Empresa ID:', empresa_id);

    if (!empresa_id) {
        return res.json({ success: true, data: [] });
    }

    // Garantir que a coluna bloqueado_chatbot existe
    db.run(`ALTER TABLE clientes ADD COLUMN bloqueado_chatbot INTEGER DEFAULT 0`, (err) => {
        // Ignorar erro se já existe
    });

    db.all(`SELECT id, nome, telefone, email, created_at, COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot 
            FROM clientes 
            WHERE empresa_id = ? 
            ORDER BY nome`,
        [empresa_id],
        (err, clientes) => {
            if (err) {
                console.error('Erro ao buscar clientes:', err);
                return res.json({ success: false, message: err.message });
            }

            console.log(`Clientes encontrados para empresa ${empresa_id}:`, clientes.length);
            res.json({ success: true, data: clientes });
        });
});

app.post('/api/clientes', auth, (req, res) => {
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome) return res.json({ success: false, message: 'Nome é obrigatório' });

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    db.run(`INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)`,
        [nome, telefonePadrao, email, empresa_id], function (err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, data: { id: this.lastID }, message: 'Cliente cadastrado' });
        });
});

app.put('/api/clientes/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    db.run(`UPDATE clientes SET nome = COALESCE(?, nome), telefone = COALESCE(?, telefone), email = COALESCE(?, email) WHERE id = ? AND empresa_id = ?`,
        [nome, telefonePadrao, email, id, empresa_id], function (err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: 'Cliente atualizado com sucesso' });
        });
});

app.delete('/api/clientes/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    db.run(`DELETE FROM clientes WHERE id = ? AND empresa_id = ?`, [id, empresa_id], function (err) {
        res.json({ success: true, message: 'Cliente removido' });
    });
});

// Bloquear/desbloquear cliente do chatbot
app.put('/api/clientes/:id/bloquear-chatbot', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { bloquear } = req.body;
    const empresa_id = req.usuario.empresa_id;

    // Garantir que a coluna existe
    db.run(`ALTER TABLE clientes ADD COLUMN bloqueado_chatbot INTEGER DEFAULT 0`, (err) => {
        // Ignorar erro se já existe
    });

    db.run(`UPDATE clientes SET bloqueado_chatbot = ? WHERE id = ? AND empresa_id = ?`,
        [bloquear ? 1 : 0, id, empresa_id], function (err) {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, message: bloquear ? 'Cliente bloqueado do chatbot' : 'Cliente desbloqueado do chatbot' });
        });
});

// ============================================
// HORÁRIOS
// ============================================

app.get('/api/horarios', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    db.all('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana', [empresa_id], (err, horarios) => {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, data: horarios });
    });
});

app.put('/api/horarios/:dia', auth, verificarDono, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    const { dia } = req.params;
    const { aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos } = req.body;

    const sql = "UPDATE horarios_funcionamento SET aberto = COALESCE(?, aberto), hora_inicio = COALESCE(?, hora_inicio), hora_fim = COALESCE(?, hora_fim), almoco_inicio = COALESCE(?, almoco_inicio), almoco_fim = COALESCE(?, almoco_fim), intervalo_minutos = COALESCE(?, intervalo_minutos), updated_at = CURRENT_TIMESTAMP WHERE empresa_id = ? AND dia_semana = ?";

    db.run(sql, [aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos, empresa_id, dia], function (err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, message: 'Horario atualizado com sucesso' });
    });
});

app.post('/api/horarios/disponiveis', auth, (req, res) => {
    const { data, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const [ano, mes, dia] = data.split('-').map(Number);
    const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));
    const diaSemana = dataUTC.getUTCDay();

    db.get('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?', [empresa_id, diaSemana], (err, horario) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }

        if (!horario || horario.aberto !== 1) {
            return res.json({ success: true, data: { disponivel: false, horarios: [] } });
        }

        const horariosDisponiveis = [];

        function horaParaMinutos(horaStr) {
            if (!horaStr) return 0;
            const partes = horaStr.split(':');
            return parseInt(partes[0]) * 60 + parseInt(partes[1]);
        }

        function minutosParaHora(minutos) {
            const h = Math.floor(minutos / 60);
            const m = minutos % 60;
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }

        const abertura = horario.hora_inicio || '09:00';
        const fechamento = horario.hora_fim || '18:00';
        const intervalo = 30;

        const almocoInicio = horario.almoco_inicio || '12:00';
        const almocoFim = horario.almoco_fim || '13:00';

        const inicioMinutos = horaParaMinutos(abertura);
        const fimMinutos = horaParaMinutos(fechamento);
        const almocoInicioMinutos = horaParaMinutos(almocoInicio);
        const almocoFimMinutos = horaParaMinutos(almocoFim);

        for (let minutos = inicioMinutos; minutos < fimMinutos; minutos += intervalo) {
            if (minutos >= almocoInicioMinutos && minutos < almocoFimMinutos) {
                continue;
            }
            horariosDisponiveis.push(minutosParaHora(minutos));
        }

        let query = `SELECT hora FROM agendamentos WHERE data = ? AND status != 'cancelado' AND empresa_id = ?`;
        let params = [data, empresa_id];

        if (profissional_id) {
            query += ` AND profissional_id = ?`;
            params.push(profissional_id);
        }

        db.all(query, params, (err, agendamentos) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }

            const ocupados = new Set(agendamentos.map(a => a.hora));
            const disponiveis = horariosDisponiveis.filter(h => !ocupados.has(h));

            res.json({
                success: true,
                data: {
                    disponivel: disponiveis.length > 0,
                    horarios: disponiveis,
                    intervalo: intervalo
                }
            });
        });
    });
});

// ============================================
// FINANCEIRO
// ============================================

app.get('/api/financeiro', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    const role = req.usuario.role;

    if (role === 'superadmin') {
        db.all(`
            SELECT a.*, c.nome as cliente_nome, e.nome as empresa_nome, p.nome as profissional_nome, s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN empresas e ON a.empresa_id = e.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.status = 'concluido'
            ORDER BY a.data DESC
        `, (err, comissoes) => {
            if (err) return res.json({ success: false, message: err.message });

            const totalComissoes = comissoes.reduce((s, c) => s + (c.comissao || 0), 0);
            const faturamentoBruto = comissoes.reduce((s, c) => s + (c.valor || 0), 0);

            res.json({
                success: true,
                data: {
                    comissoes: comissoes,
                    totais: {
                        total_comissoes: totalComissoes,
                        total_servicos: comissoes.length,
                        faturamento_bruto: faturamentoBruto,
                        faturamento_liquido: faturamentoBruto - totalComissoes
                    }
                }
            });
        });
    } else if (role === 'profissional') {
        const profissional_id = req.usuario.id;
        db.all(`
            SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.profissional_id = ? AND a.status = 'concluido'
            ORDER BY a.data DESC
        `, [profissional_id], (err, comissoes) => {
            if (err) return res.json({ success: false, message: err.message });

            const totalComissoes = comissoes.reduce((s, c) => s + (c.comissao || 0), 0);

            res.json({
                success: true,
                data: {
                    comissoes: comissoes,
                    totais: {
                        total_comissoes: totalComissoes,
                        total_servicos: comissoes.length,
                        faturamento_bruto: 0,
                        faturamento_liquido: 0
                    }
                }
            });
        });
    } else {
        db.all(`
            SELECT a.*, c.nome as cliente_nome, p.nome as profissional_nome, p.id as profissional_id, s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = ? AND a.status = 'concluido'
            ORDER BY a.data DESC
        `, [empresa_id], (err, agendamentos) => {
            if (err) return res.json({ success: false, message: err.message });

            let faturamentoBruto = 0;
            let totalComissoes = 0;
            let comissoesPorProfissional = {};

            agendamentos.forEach(a => {
                faturamentoBruto += (a.valor || 0);
                totalComissoes += (a.comissao || 0);

                if (a.profissional_id && a.profissional_nome) {
                    if (!comissoesPorProfissional[a.profissional_id]) {
                        comissoesPorProfissional[a.profissional_id] = {
                            id: a.profissional_id,
                            nome: a.profissional_nome,
                            total_comissao: 0,
                            total_servicos: 0
                        };
                    }
                    comissoesPorProfissional[a.profissional_id].total_comissao += (a.comissao || 0);
                    comissoesPorProfissional[a.profissional_id].total_servicos += 1;
                }
            });

            const faturamentoLiquido = faturamentoBruto - totalComissoes;
            const comissoesPorProfissionalArray = Object.values(comissoesPorProfissional);
            comissoesPorProfissionalArray.sort((a, b) => b.total_comissao - a.total_comissao);

            res.json({
                success: true,
                data: {
                    comissoes: agendamentos,
                    comissoes_por_profissional: comissoesPorProfissionalArray,
                    totais: {
                        total_comissoes: totalComissoes,
                        total_servicos: agendamentos.length,
                        faturamento_bruto: faturamentoBruto,
                        faturamento_liquido: faturamentoLiquido
                    }
                }
            });
        });
    }
});

app.get('/api/profissional/financeiro', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const profissional_id = req.usuario.id;

    db.all(`
        SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.profissional_id = ? AND a.status = 'concluido' AND a.comissao > 0
        ORDER BY a.data DESC
    `, [profissional_id], (err, comissoes) => {
        if (err) return res.json({ success: false, message: err.message });

        const totalComissoes = comissoes.reduce((s, c) => s + (c.comissao || 0), 0);

        res.json({
            success: true,
            data: {
                comissoes: comissoes,
                totais: {
                    total_comissoes: totalComissoes,
                    total_servicos: comissoes.length
                }
            }
        });
    });
});

app.get('/api/empresa/info', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    if (!empresa_id) return res.json({ success: false, message: 'Empresa não encontrada' });

    db.get(`SELECT nome, plano, trial_expira, limite_profissionais, assinatura_ativa, assinatura_valida_ate 
            FROM empresas WHERE id = ?`, [empresa_id], (err, empresa) => {
        if (err) return res.json({ success: false, message: err.message });

        let dias_restantes = 0;
        if (empresa.plano === 'trial' && empresa.trial_expira) {
            dias_restantes = Math.ceil((new Date(empresa.trial_expira) - new Date()) / (1000 * 60 * 60 * 24));
        } else if (empresa.plano !== 'trial' && empresa.assinatura_valida_ate) {
            dias_restantes = Math.ceil((new Date(empresa.assinatura_valida_ate) - new Date()) / (1000 * 60 * 60 * 24));
        }

        res.json({
            success: true,
            data: {
                ...empresa,
                dias_restantes: dias_restantes > 0 ? dias_restantes : 0
            }
        });
    });
});

// ============================================
// ROTAS DO CHATBOT (PÚBLICAS)
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

app.get('/api/chatbot/servicos/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    db.all('SELECT id, nome, valor, duracao FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome',
        [empresaId], (err, servicos) => {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, servicos });
        });
});

app.get('/api/chatbot/profissionais/:empresaId', (req, res) => {
    const { empresaId } = req.params;

    db.all('SELECT id, nome FROM profissionais WHERE empresa_id = ? AND ativo = 1 ORDER BY nome',
        [empresaId], (err, profissionais) => {
            if (err) return res.json({ success: false, message: err.message });
            res.json({ success: true, profissionais });
        });
});

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

app.post('/api/chatbot/cliente/buscar', (req, res) => {
    const { telefone, empresaId } = req.body;

    const telefoneLimpo = telefone.replace(/\D/g, '');

    // Garantir que a coluna bloqueado_chatbot existe
    db.run(`ALTER TABLE clientes ADD COLUMN bloqueado_chatbot INTEGER DEFAULT 0`, (err) => { });

    db.get(`SELECT id, nome, telefone, email, bloqueado_chatbot 
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

app.post('/api/chatbot/datas-disponiveis-mes', (req, res) => {
    const { empresaId, mes, ano } = req.body;

    const datasDisponiveis = [];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ultimoDia = new Date(ano, mes + 1, 0).getDate();

    const verificacoes = [];

    for (let dia = 1; dia <= ultimoDia; dia++) {
        const data = new Date(ano, mes, dia);
        const dataStr = `${ano}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

        if (data < hoje) continue;

        const diaSemana = data.getDay();

        verificacoes.push(new Promise((resolve) => {
            db.get('SELECT aberto FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?',
                [empresaId, diaSemana], (err, horario) => {
                    if (!err && horario && horario.aberto === 1) {
                        datasDisponiveis.push(dataStr);
                    }
                    resolve();
                });
        }));
    }

    Promise.all(verificacoes).then(() => {
        res.json({ success: true, diasDisponiveis: datasDisponiveis });
    });
});

app.post('/api/chatbot/horarios-disponiveis', (req, res) => {
    const { empresaId, profissionalId, data } = req.body;

    const [ano, mes, dia] = data.split('-').map(Number);
    const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));
    const diaSemana = dataUTC.getUTCDay();

    db.get('SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?',
        [empresaId, diaSemana], (err, horario) => {
            if (err || !horario || horario.aberto !== 1) {
                return res.json({ success: true, horarios: [] });
            }

            const horariosDisponiveis = [];

            function horaParaMinutos(horaStr) {
                const partes = horaStr.split(':');
                return parseInt(partes[0]) * 60 + parseInt(partes[1]);
            }

            function minutosParaHora(minutos) {
                const h = Math.floor(minutos / 60);
                const m = minutos % 60;
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            }

            const inicioMinutos = horaParaMinutos(horario.hora_inicio || '09:00');
            const fimMinutos = horaParaMinutos(horario.hora_fim || '18:00');
            const almocoInicio = horaParaMinutos(horario.almoco_inicio || '12:00');
            const almocoFim = horaParaMinutos(horario.almoco_fim || '13:00');
            const intervalo = 30;

            for (let minutos = inicioMinutos; minutos < fimMinutos; minutos += intervalo) {
                if (minutos >= almocoInicio && minutos < almocoFim) continue;
                horariosDisponiveis.push(minutosParaHora(minutos));
            }

            let query = `SELECT hora FROM agendamentos WHERE data = ? AND status != 'cancelado' AND empresa_id = ?`;
            let params = [data, empresaId];

            if (profissionalId && profissionalId !== 'null') {
                query += ` AND profissional_id = ?`;
                params.push(profissionalId);
            }

            db.all(query, params, (err, ocupados) => {
                const horasOcupadas = new Set(ocupados.map(o => o.hora));
                const disponiveis = horariosDisponiveis.filter(h => !horasOcupadas.has(h));
                res.json({ success: true, horarios: disponiveis });
            });
        });
});

app.post('/api/chatbot/agendar', (req, res) => {
    const { clienteId, servicoId, profissionalId, data, hora, empresaId } = req.body;

    // Verificar se o cliente está bloqueado
    db.get(`SELECT bloqueado_chatbot FROM clientes WHERE id = ?`, [clienteId], (err, cliente) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }

        if (cliente && cliente.bloqueado_chatbot === 1) {
            return res.json({ success: false, message: 'Você está bloqueado para agendamentos via chatbot. Entre em contato com a barbearia.' });
        }

        // Verificar limite de 20 dias
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 20);
        const dataLimiteStr = dataLimite.toISOString().split('T')[0];

        db.get(`SELECT id FROM agendamentos 
                WHERE cliente_id = ? AND data >= ? AND status != 'cancelado' 
                LIMIT 1`,
            [clienteId, dataLimiteStr], (err, agendamentoRecente) => {
                if (agendamentoRecente) {
                    return res.json({ success: false, message: 'Você já possui um agendamento nos últimos 20 dias. Aguarde para fazer outro.' });
                }

                db.get('SELECT nome, valor FROM servicos WHERE id = ?', [servicoId], (err, servico) => {
                    if (err || !servico) {
                        return res.json({ success: false, message: 'Serviço não encontrado' });
                    }

                    let profissionalNome = 'Não atribuído';
                    let profissionalIdReal = null;

                    if (profissionalId && profissionalId !== 'null' && !profissionalId.toString().startsWith('dono_')) {
                        profissionalIdReal = profissionalId;
                        db.get('SELECT nome FROM profissionais WHERE id = ?', [profissionalId], (err, profissional) => {
                            if (profissional) profissionalNome = profissional.nome;
                        });
                    }

                    db.get(`SELECT id FROM agendamentos 
                            WHERE data = ? AND hora = ? AND profissional_id = ? AND status != 'cancelado'`,
                        [data, hora, profissionalIdReal], (err, existente) => {
                            if (existente) {
                                return res.json({ success: false, message: 'Este horário já foi reservado' });
                            }

                            db.run(`INSERT INTO agendamentos 
                                    (cliente_id, servico_id, servico, valor, data, hora, profissional_id, status, empresa_id) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?)`,
                                [clienteId, servicoId, servico.nome, servico.valor, data, hora, profissionalIdReal, empresaId],
                                function (err) {
                                    if (err) {
                                        return res.json({ success: false, message: err.message });
                                    }

                                    res.json({
                                        success: true,
                                        message: `Seu agendamento foi confirmado para ${data} às ${hora}`,
                                        profissionalNome: profissionalNome,
                                        servicoNome: servico.nome,
                                        valor: servico.valor,
                                        agendamentoId: this.lastID
                                    });
                                });
                        });
                });
            });
    });
});

app.get('/api/chatbot/link/:empresaId', auth, verificarDono, (req, res) => {
    const { empresaId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/chatbot.html?empresa=${empresaId}`;

    res.json({ success: true, link });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`📧 Super Admin: super@admin.com / super123`);
    console.log(`📧 Dono: admin@teste.com / 123456`);
    console.log(`\n💰 PLANOS DISPONÍVEIS:`);
    console.log(`   Starter: R$ 24,90/mês - 1 profissional`);
    console.log(`   Pro: R$ 49,90/mês - 5 profissionais`);
    console.log(`   Business: R$ 99,90/mês - 12 profissionais`);
    console.log(`   Enterprise: R$ 199,90/mês - Profissionais ilimitados`);
});