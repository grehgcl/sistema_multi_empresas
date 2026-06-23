// ============================================================
// 🚨 ATENÇÃO: PARTES EXTRATÍDAS PARA OUTROS ARQUIVOS 🚨
// ============================================================
// 
// As seguintes partes NÃO ESTÃO MAIS AQUI e NÃO DEVEM SER MEXIDAS:
//
// 📁 server\config\database.js - Criação das tabelas
// 📁 server\middlewares\auth.js - Middlewares de autenticação
// 📁 server\utils\constants.js - Constantes dos planos
// 📁 server\utils\helpers.js - Funções auxiliares
//
// ============================================================
// O CÓDIGO ABAIXO SÃO AS ROTAS - AQUI VOCÊS MEXEM!
// ============================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ============================================================
// IMPORTS DAS PARTES EXTRATÍDAS
// ============================================================

const { db, initDatabase, inserirHorariosPadrao } = require('./server/config/database');
const {
    auth,
    verificarSuperAdmin,
    verificarDono,
    verificarLimiteProfissionais,
    verificarAcessoAgendamentos,
    verificarLimiteAgendamentos,
    incrementarContadorAgendamentos,
} = require('./server/middlewares/auth');
const { PLANOS, PLANOS_NOMES, JWT_SECRET } = require('./server/utils/constants');
const {
    horaParaMinutos,
    minutosParaHora,
    getDiaSemanaFromDate,
    gerarSenhaTemporaria
} = require('./server/utils/helpers');

// ============================================================
// NOVO: IMPORT DO SERVIÇO WHATSAPP
// ============================================================
const whatsappService = require('./server/services/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// FUNÇÃO AUXILIAR: FORMATAR DATA (BACKEND)
// ============================================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        const data = new Date(dataStr + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataStr;
    }
}

// ============================================================
// FUNÇÃO AUXILIAR: GERAR HORÁRIOS DO DIA
// ============================================================
function gerarHorariosDoDia(horaInicio, horaFim, almocoInicio, almocoFim) {
    const horarios = [];
    if (!horaInicio || !horaFim) return horarios;

    const inicioMin = horaParaMinutos(horaInicio);
    const fimMin = horaParaMinutos(horaFim);
    const almocoInicioMin = horaParaMinutos(almocoInicio || '12:00');
    const almocoFimMin = horaParaMinutos(almocoFim || '13:00');
    const intervalo = 30;

    for (let minutos = inicioMin; minutos < fimMin; minutos += intervalo) {
        if (minutos >= almocoInicioMin && minutos < almocoFimMin) {
            continue;
        }
        horarios.push(minutosParaHora(minutos));
    }
    return horarios;
}

// ============================================================
// INICIALIZAÇÃO DO BANCO E USUÁRIOS PADRÃO
// ============================================================

initDatabase();

// 🔥 ADICIONE ISSO AQUI (após o initDatabase)
// Verificar e criar coluna dias_bloqueio automaticamente
setTimeout(() => {
    const { verificarColunaDiasBloqueio } = require('./server/config/database');
    verificarColunaDiasBloqueio();
}, 2000);

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================================
// 1. CRIAR/ATUALIZAR SUPER ADMIN (SEM FORÇAR ID)
// ============================================================
console.log('📝 Verificando/Criando Super Admin...');

const superAdminSenha = bcrypt.hashSync('super123', 10);

db.get(`SELECT id FROM usuarios WHERE email = 'super@admin.com'`, [], (err, existing) => {
    if (err) {
        console.error('❌ Erro ao verificar Super Admin:', err.message);
    } else if (existing) {
        console.log('📝 Atualizando senha do Super Admin...');
        const sqlUpdate = isProduction
            ? `UPDATE usuarios SET senha = $1 WHERE email = 'super@admin.com'`
            : `UPDATE usuarios SET senha = ? WHERE email = 'super@admin.com'`;

        db.run(sqlUpdate, [superAdminSenha], function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar Super Admin:', err.message);
            } else {
                console.log('✅ Super Admin atualizado: super@admin.com / super123');
            }
        });
    } else {
        console.log('📝 Criando Super Admin...');
        const sqlInsert = isProduction
            ? `INSERT INTO usuarios (nome, email, senha, role) 
               VALUES ($1, $2, $3, 'superadmin')`
            : `INSERT INTO usuarios (nome, email, senha, role) 
               VALUES (?, ?, ?, 'superadmin')`;

        db.run(sqlInsert, ['Super Admin', 'super@admin.com', superAdminSenha], function (err) {
            if (err) {
                console.error('❌ Erro ao criar Super Admin:', err.message);
            } else {
                console.log('✅ Super Admin criado: super@admin.com / super123');
            }
        });
    }
});

// ============================================================
// 2. CRIAR/ATUALIZAR EMPRESA DE TESTE E DONO
// ============================================================
console.log('📝 Verificando/Criando empresa de teste...');

db.get(`SELECT id FROM empresas WHERE nome = 'Barbearia Teste'`, (err, empresa) => {
    if (err) {
        console.error('❌ Erro ao verificar empresa teste:', err.message);
        return;
    }

    if (!empresa) {
        const sqlEmpresa = isProduction
            ? `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira) 
               VALUES ('Barbearia Teste', 'trial', 1, datetime('now', '+45 days')) RETURNING id`
            : `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira) 
               VALUES ('Barbearia Teste', 'trial', 1, datetime('now', '+45 days'))`;

        db.run(sqlEmpresa, [], function (err) {
            if (err) {
                console.error('❌ Erro ao criar empresa teste:', err.message);
                return;
            }

            const sqlFind = isProduction
                ? `SELECT id FROM empresas WHERE nome = 'Barbearia Teste' ORDER BY id DESC LIMIT 1`
                : `SELECT id FROM empresas WHERE nome = 'Barbearia Teste' ORDER BY id DESC LIMIT 1`;

            db.get(sqlFind, [], (err, row) => {
                if (err || !row) {
                    console.error('❌ Erro ao buscar ID da empresa:', err?.message);
                    return;
                }

                const empresaId = row.id;
                console.log(`✅ Empresa teste criada (ID: ${empresaId})`);
                inserirHorariosPadrao(empresaId);

                const donoSenha = bcrypt.hashSync('123456', 10);

                db.get(`SELECT id FROM usuarios WHERE email = 'admin@teste.com'`, [], (err, existingDono) => {
                    if (err) {
                        console.error('❌ Erro ao verificar dono:', err.message);
                        return;
                    }

                    if (!existingDono) {
                        const sqlInsertDono = isProduction
                            ? `INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
                               VALUES ($1, $2, $3, 'dono', $4)`
                            : `INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
                               VALUES (?, ?, ?, 'dono', ?)`;

                        db.run(sqlInsertDono, ['Admin Teste', 'admin@teste.com', donoSenha, empresaId], function (err) {
                            if (err) {
                                console.error('❌ Erro ao criar dono:', err.message);
                            } else {
                                console.log('✅ Dono criado: admin@teste.com / 123456');
                            }
                        });
                    } else {
                        console.log('✅ Dono já existe');
                    }
                });
            });
        });
    } else {
        console.log('✅ Empresa teste já existe');
    }
});

// ============================================================
// AUTENTICAÇÃO
// ============================================================

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    console.log('🔍 Tentando login:', { email });

    // Query para profissionais (adaptada para PostgreSQL)
    const sqlProfissional = isProduction
        ? `SELECT p.*, e.nome as empresa_nome, e.trial_expira, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
           FROM profissionais p 
           LEFT JOIN empresas e ON p.empresa_id = e.id 
           WHERE p.email = $1 AND p.ativo = 1`
        : `SELECT p.*, e.nome as empresa_nome, e.trial_expira, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
           FROM profissionais p 
           LEFT JOIN empresas e ON p.empresa_id = e.id 
           WHERE p.email = ? AND p.ativo = 1`;

    db.get(sqlProfissional, [email], (err, profissional) => {
        if (err) {
            console.error('❌ Erro ao buscar profissional:', err.message);
            return res.json({ success: false, message: 'Erro ao buscar profissional' });
        }

        if (profissional && bcrypt.compareSync(senha, profissional.senha)) {
            const token = jwt.sign(
                {
                    id: profissional.id,
                    email: profissional.email,
                    role: 'profissional',
                    empresa_id: profissional.empresa_id,
                    nome: profissional.nome,
                    comissao_percent: profissional.comissao_percent
                },
                JWT_SECRET,
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

        // Query para usuários (adaptada para PostgreSQL)
        const sqlUsuario = isProduction
            ? `SELECT u.*, e.trial_expira, e.nome as empresa_nome, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
               FROM usuarios u 
               LEFT JOIN empresas e ON u.empresa_id = e.id 
               WHERE u.email = $1`
            : `SELECT u.*, e.trial_expira, e.nome as empresa_nome, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
               FROM usuarios u 
               LEFT JOIN empresas e ON u.empresa_id = e.id 
               WHERE u.email = ?`;

        db.get(sqlUsuario, [email], (err, user) => {
            if (err) {
                console.error('❌ Erro ao buscar usuário:', err.message);
                return res.json({ success: false, message: 'Erro ao buscar usuário' });
            }

            if (!user) {
                console.log('❌ Usuário não encontrado:', email);
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            if (!bcrypt.compareSync(senha, user.senha)) {
                console.log('❌ Senha incorreta para:', email);
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            let diasRestantes = 0;

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
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log('✅ Login bem sucedido:', email);

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

    console.log('📝 Tentando cadastrar no Render:', { nome, email, empresa_nome });

    // 🔥 VERIFICAR SE EMAIL JÁ EXISTE (adaptado para PostgreSQL)
    const sqlCheck = isProduction
        ? 'SELECT id FROM usuarios WHERE email = $1'
        : 'SELECT id FROM usuarios WHERE email = ?';

    db.get(sqlCheck, [email], (err, user) => {
        if (err) {
            console.error('❌ Erro ao verificar email:', err.message);
            return res.json({ success: false, message: 'Erro ao verificar email' });
        }

        if (user) {
            return res.json({ success: false, message: 'Email já cadastrado' });
        }

        // 🔥 CRIAR EMPRESA (adaptado para PostgreSQL)
        const sqlEmpresa = isProduction
            ? `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
               VALUES ($1, 'trial', 1, (CURRENT_TIMESTAMP + INTERVAL '45 days'), 1) RETURNING id`
            : `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
               VALUES (?, 'trial', 1, datetime('now', '+45 days'), 1)`;

        db.run(sqlEmpresa, [empresa_nome], function (err) {
            if (err) {
                console.error('❌ Erro ao criar empresa:', err.message);
                return res.json({ success: false, message: 'Erro ao criar empresa' });
            }

            // 🔥 BUSCAR ID DA EMPRESA (adaptado para PostgreSQL)
            let sqlFind;
            let paramsFind;

            if (isProduction) {
                sqlFind = `SELECT id FROM empresas WHERE nome = $1 ORDER BY id DESC LIMIT 1`;
                paramsFind = [empresa_nome];
            } else {
                sqlFind = `SELECT id FROM empresas WHERE nome = ? ORDER BY id DESC LIMIT 1`;
                paramsFind = [empresa_nome];
            }

            db.get(sqlFind, paramsFind, (err, row) => {
                if (err || !row) {
                    console.error('❌ Erro ao buscar ID da empresa:', err?.message);
                    return res.json({ success: false, message: 'Erro ao buscar ID da empresa' });
                }

                const empresa_id = row.id;
                console.log('✅ Empresa criada com ID:', empresa_id);

                // 🔥 CRIAR USUÁRIO (adaptado para PostgreSQL)
                const senhaHash = bcrypt.hashSync(senha, 10);
                const sqlUsuario = isProduction
                    ? `INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
                       VALUES ($1, $2, $3, 'dono', $4)`
                    : `INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
                       VALUES (?, ?, ?, 'dono', ?)`;

                db.run(sqlUsuario, [nome, email, senhaHash, empresa_id], function (err) {
                    if (err) {
                        console.error('❌ Erro ao criar usuário:', err.message);
                        return res.json({ success: false, message: 'Erro ao criar usuário' });
                    }

                    console.log('✅ Usuário criado com sucesso!');

                    // 🔥🔥🔥 INSERIR HORÁRIOS (ADAPTADO PARA POSTGRESQL) 🔥🔥🔥
                    // Na rota POST /api/cadastro, após criar a empresa e o usuário:

                    console.log('📝 Inserindo horários padrão para empresa:', empresa_id);

                    const diasSemana = [0, 1, 2, 3, 4, 5, 6];
                    let horariosInseridos = 0;
                    let totalErros = 0;

                    for (const dia of diasSemana) {
                        const sqlHorario = isProduction
                            ? `
            INSERT INTO horarios_funcionamento 
            (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
            VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00', 30)
            ON CONFLICT (empresa_id, dia_semana) DO NOTHING
        `
                            : `
            INSERT OR IGNORE INTO horarios_funcionamento 
            (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
            VALUES (?, ?, 1, '09:00', '18:00', '12:00', '13:00', 30)
        `;

                        db.run(sqlHorario, isProduction ? [empresa_id, dia] : [empresa_id, dia], function (err) {
                            if (err) {
                                console.error(`❌ Erro ao inserir horário dia ${dia}:`, err.message);
                                totalErros++;
                            } else {
                                horariosInseridos++;
                                console.log(`✅ Horário dia ${dia} inserido (${horariosInseridos}/7)`);
                            }

                            // Quando todos os 7 dias forem processados OU houver erro
                            if (horariosInseridos + totalErros === 7 || horariosInseridos === 7) {
                                // Verificar se realmente foram inseridos
                                const sqlCheck = isProduction
                                    ? `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1`
                                    : `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?`;

                                db.get(sqlCheck, [empresa_id], (err, result) => {
                                    if (!err && result) {
                                        console.log(`✅ ${result.total} horários confirmados no banco`);
                                    }

                                    // RESPOSTA FINAL
                                    res.json({
                                        success: true,
                                        message: 'Cadastro realizado! Você tem 45 dias de teste.',
                                        data: {
                                            empresa_id: empresa_id,
                                            horarios_inseridos: horariosInseridos
                                        }
                                    });
                                });
                            }
                        });
                    }

                    // TIMEOUT DE SEGURANÇA
                    setTimeout(() => {
                        console.log('⏰ Verificando horários após timeout...');
                        const sqlCheck = isProduction
                            ? `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1`
                            : `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?`;

                        db.get(sqlCheck, [empresa_id], (err, result) => {
                            if (!err && result && result.total > 0) {
                                console.log(`✅ ${result.total} horários encontrados`);
                            } else {
                                console.warn('⚠️ Inserindo horários manualmente...');
                                // Inserir manualmente se não tiver nenhum
                                for (const dia of [0, 1, 2, 3, 4, 5, 6]) {
                                    const sqlManual = isProduction
                                        ? `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                       VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00', 30) ON CONFLICT DO NOTHING`
                                        : `INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                       VALUES (?, ?, 1, '09:00', '18:00', '12:00', '13:00', 30)`;

                                    db.run(sqlManual, isProduction ? [empresa_id, dia] : [empresa_id, dia]);
                                }
                            }
                        });
                    }, 5000);
                });
            });
        });
    });
});

// ============================================================
// ROTAS DE PLANOS
// ============================================================

app.get('/api/empresa/plano', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate 
           FROM empresas WHERE id = $1`
        : `SELECT plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate 
           FROM empresas WHERE id = ?`;

    db.get(sql, [empresaId], (err, empresa) => {
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
                plano_nome: PLANOS_NOMES[empresa.plano] || empresa.plano,
                limite_profissionais: empresa.limite_profissionais,
                assinatura_ativa: empresa.assinatura_ativa,
                dias_restantes: diasRestantes,
                valida_ate: validaAte,
                is_trial: empresa.plano === 'trial'
            }
        });
    });
});

app.post('/api/upgrade', auth, verificarDono, (req, res) => {
    const { plano, metodo_pagamento, comprovante } = req.body;
    const empresaId = req.usuario.empresa_id;

    if (!PLANOS[plano]) {
        return res.status(400).json({ success: false, message: 'Plano inválido' });
    }

    const config = PLANOS[plano];
    const validaAte = new Date();
    validaAte.setDate(validaAte.getDate() + config.dias_acesso);
    const validaAteStr = validaAte.toISOString().split('T')[0];

    const sqlSelect = isProduction
        ? 'SELECT plano FROM empresas WHERE id = $1'
        : 'SELECT plano FROM empresas WHERE id = ?';

    db.get(sqlSelect, [empresaId], (err, empresaAtual) => {
        if (err) {
            return res.status(500).json({ success: false, message: err.message });
        }

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = $1, 
               limite_profissionais = $2,
               assinatura_ativa = 1,
               assinatura_valida_ate = $3,
               trial_expira = NULL
               WHERE id = $4`
            : `UPDATE empresas SET 
               plano = ?, 
               limite_profissionais = ?,
               assinatura_ativa = 1,
               assinatura_valida_ate = ?,
               trial_expira = NULL
               WHERE id = ?`;

        db.run(sqlUpdate, [plano, config.limite, validaAteStr, empresaId], function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: err.message });
            }

            const sqlHistorico = isProduction
                ? `INSERT INTO planos_historico 
                   (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante)
                   VALUES ($1, $2, $3, $4, $5, $6)`
                : `INSERT INTO planos_historico 
                   (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante)
                   VALUES (?, ?, ?, ?, ?, ?)`;

            db.run(sqlHistorico, [empresaId, empresaAtual?.plano || 'trial', plano, config.valor, metodo_pagamento || 'manual', comprovante || null], (err) => {
                if (err) console.error('Erro ao salvar histórico:', err);
            });

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
        });
    });
});

app.post('/api/cancel-subscription', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { motivo } = req.body;

    console.log('Cancelando assinatura da empresa:', empresaId);

    const sqlSelect = isProduction
        ? 'SELECT plano, assinatura_valida_ate FROM empresas WHERE id = $1'
        : 'SELECT plano, assinatura_valida_ate FROM empresas WHERE id = ?';

    db.get(sqlSelect, [empresaId], (err, empresa) => {
        if (err) {
            console.error('Erro ao buscar empresa:', err);
            return res.json({ success: false, message: 'Erro ao buscar dados da empresa' });
        }

        if (!empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }

        if (empresa.plano === 'trial') {
            return res.json({ success: false, message: 'Você já está no plano Trial' });
        }

        const sqlHistorico = isProduction
            ? `INSERT INTO planos_historico 
               (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca)
               VALUES ($1, $2, 'cancelado', 0, 'cancelamento', $3, CURRENT_TIMESTAMP)`
            : `INSERT INTO planos_historico 
               (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca)
               VALUES (?, ?, 'cancelado', 0, 'cancelamento', ?, CURRENT_TIMESTAMP)`;

        db.run(sqlHistorico, [empresaId, empresa.plano, motivo || 'Usuário cancelou assinatura'], (err) => {
            if (err) console.error('Erro ao registrar cancelamento:', err);
        });

        const dataTrialExpira = new Date();
        dataTrialExpira.setDate(dataTrialExpira.getDate() + 7);

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = 'trial',
               limite_profissionais = 1,
               assinatura_ativa = 0,
               assinatura_valida_ate = NULL,
               trial_expira = $1
               WHERE id = $2`
            : `UPDATE empresas SET 
               plano = 'trial',
               limite_profissionais = 1,
               assinatura_ativa = 0,
               assinatura_valida_ate = NULL,
               trial_expira = ?
               WHERE id = ?`;

        db.run(sqlUpdate, [dataTrialExpira.toISOString(), empresaId], function (err) {
            if (err) {
                console.error('Erro ao cancelar assinatura:', err);
                return res.json({ success: false, message: 'Erro ao cancelar assinatura' });
            }

            res.json({
                success: true,
                message: `Assinatura cancelada! Você tem 7 dias de acesso ao plano Trial até ${dataTrialExpira.toLocaleDateString('pt-BR')}.`,
                dias_trial: 7
            });
        });
    });
});

app.get('/api/can-return-trial', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT plano, assinatura_ativa, assinatura_valida_ate,
           (SELECT COUNT(*) FROM planos_historico WHERE empresa_id = $1 AND plano_novo = 'cancelado' AND data_mudanca > datetime('now', '-30 days')) as cancelamentos_recentes
           FROM empresas WHERE id = $1`
        : `SELECT plano, assinatura_ativa, assinatura_valida_ate,
           (SELECT COUNT(*) FROM planos_historico WHERE empresa_id = ? AND plano_novo = 'cancelado' AND data_mudanca > datetime('now', '-30 days')) as cancelamentos_recentes
           FROM empresas WHERE id = ?`;

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            return res.json({ success: false, message: 'Erro ao verificar' });
        }

        const podeVoltarTrial = empresa.plano !== 'trial' && (empresa.cancelamentos_recentes || 0) < 2;

        res.json({
            success: true,
            pode_voltar_trial: podeVoltarTrial,
            plano_atual: empresa.plano,
            cancelamentos_recentes: empresa.cancelamentos_recentes || 0
        });
    });
});

app.post('/api/simulate-downgrade', auth, verificarDono, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const dataTrialExpira = new Date();
    dataTrialExpira.setDate(dataTrialExpira.getDate() + 45);

    const sql = isProduction
        ? `UPDATE empresas SET 
           plano = 'trial',
           limite_profissionais = 1,
           assinatura_ativa = 0,
           assinatura_valida_ate = NULL,
           trial_expira = $1
           WHERE id = $2`
        : `UPDATE empresas SET 
           plano = 'trial',
           limite_profissionais = 1,
           assinatura_ativa = 0,
           assinatura_valida_ate = NULL,
           trial_expira = ?
           WHERE id = ?`;

    db.run(sql, [dataTrialExpira.toISOString(), empresaId], function (err) {
        if (err) {
            return res.json({ success: false, message: 'Erro ao voltar para trial' });
        }
        res.json({ success: true, message: `Voltou para o plano Trial com 45 dias! Válido até ${dataTrialExpira.toLocaleDateString('pt-BR')}` });
    });
});

// ============================================================
// SUPER ADMIN
// ============================================================

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

app.post('/api/admin/empresas/:id/extender-trial', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;

    const dataTrialExpira = new Date();
    dataTrialExpira.setDate(dataTrialExpira.getDate() + 45);

    const sql = isProduction
        ? `UPDATE empresas SET trial_expira = $1 WHERE id = $2`
        : `UPDATE empresas SET trial_expira = ? WHERE id = ?`;

    db.run(sql, [dataTrialExpira.toISOString(), id], function (err) {
        if (err) {
            return res.json({ success: false, message: 'Erro ao estender trial' });
        }
        res.json({ success: true, message: `Trial estendido por mais 45 dias! Nova data: ${dataTrialExpira.toLocaleDateString('pt-BR')}` });
    });
});

// ============================================================
// SERVIÇOS
// ============================================================

app.get('/api/servicos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id) return res.json({ success: true, data: [] });

    const sql = isProduction
        ? `SELECT * FROM servicos WHERE empresa_id = $1 AND ativo = 1 ORDER BY nome`
        : `SELECT * FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome`;

    db.all(sql, [empresa_id], (err, servicos) => {
        if (err) {
            console.error('❌ Erro ao buscar serviços:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: servicos });
    });
});

app.get('/api/servicos/todos', auth, verificarDono, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT * FROM servicos WHERE empresa_id = $1 ORDER BY nome`
        : `SELECT * FROM servicos WHERE empresa_id = ? ORDER BY nome`;

    db.all(sql, [empresa_id], (err, servicos) => {
        if (err) {
            console.error('❌ Erro ao buscar todos serviços:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: servicos });
    });
});

app.post('/api/servicos', auth, verificarDono, (req, res) => {
    const { nome, descricao, valor, duracao } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome || !valor) {
        return res.json({ success: false, message: 'Nome e valor são obrigatórios' });
    }

    const sql = isProduction
        ? `INSERT INTO servicos (nome, descricao, valor, duracao, empresa_id, ativo) 
           VALUES ($1, $2, $3, $4, $5, 1) RETURNING id`
        : `INSERT INTO servicos (nome, descricao, valor, duracao, empresa_id, ativo) 
           VALUES (?, ?, ?, ?, ?, 1)`;

    db.run(sql, [nome, descricao || '', valor, duracao || 30, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao criar serviço:', err.message);
            return res.json({ success: false, message: err.message });
        }

        let id = this?.lastID || this?.id || null;
        res.json({ success: true, data: { id: id }, message: 'Serviço cadastrado' });
    });
});

app.put('/api/servicos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, descricao, valor, duracao, ativo } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `UPDATE servicos SET 
           nome = COALESCE($1, nome), 
           descricao = COALESCE($2, descricao), 
           valor = COALESCE($3, valor), 
           duracao = COALESCE($4, duracao), 
           ativo = COALESCE($5, ativo) 
           WHERE id = $6 AND empresa_id = $7`
        : `UPDATE servicos SET 
           nome = COALESCE(?, nome), 
           descricao = COALESCE(?, descricao), 
           valor = COALESCE(?, valor), 
           duracao = COALESCE(?, duracao), 
           ativo = COALESCE(?, ativo) 
           WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [nome, descricao, valor, duracao, ativo, id, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao editar serviço:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Serviço atualizado' });
    });
});

app.delete('/api/servicos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sqlCheck = isProduction
        ? `SELECT COUNT(*) as total FROM agendamentos WHERE servico_id = $1`
        : `SELECT COUNT(*) as total FROM agendamentos WHERE servico_id = ?`;

    db.get(sqlCheck, [id], (err, result) => {
        if (err) {
            console.error('❌ Erro ao verificar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        if (result?.total > 0) {
            const sqlUpdate = isProduction
                ? `UPDATE servicos SET ativo = 0 WHERE id = $1 AND empresa_id = $2`
                : `UPDATE servicos SET ativo = 0 WHERE id = ? AND empresa_id = ?`;

            db.run(sqlUpdate, [id, empresa_id], (err) => {
                if (err) {
                    console.error('❌ Erro ao desativar serviço:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Serviço desativado (possui agendamentos)' });
            });
        } else {
            const sqlDelete = isProduction
                ? `DELETE FROM servicos WHERE id = $1 AND empresa_id = $2`
                : `DELETE FROM servicos WHERE id = ? AND empresa_id = ?`;

            db.run(sqlDelete, [id, empresa_id], (err) => {
                if (err) {
                    console.error('❌ Erro ao excluir serviço:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Serviço removido' });
            });
        }
    });
});

// ============================================================
// PROFISSIONAIS
// ============================================================

app.get('/api/profissionais', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id || req.usuario.role === 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const sql = isProduction
        ? `SELECT id, nome, email, comissao_percent, ativo, created_at, telefone
           FROM profissionais WHERE empresa_id = $1 ORDER BY nome`
        : `SELECT id, nome, email, comissao_percent, ativo, created_at, telefone
           FROM profissionais WHERE empresa_id = ? ORDER BY nome`;

    db.all(sql, [empresa_id], (err, profissionais) => {
        if (err) {
            console.error('❌ Erro ao buscar profissionais:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: profissionais });
    });
});

app.post('/api/profissionais', auth, verificarDono, verificarLimiteProfissionais, (req, res) => {
    const { nome, email, comissao_percent, senha, telefone } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome || !email) {
        return res.json({ success: false, message: 'Nome e email são obrigatórios' });
    }

    let senhaFinal = senha;
    let senhaGerada = false;

    if (!senhaFinal) {
        senhaFinal = gerarSenhaTemporaria();
        senhaGerada = true;
    }

    const senhaHash = bcrypt.hashSync(senhaFinal, 10);

    const sql = isProduction
        ? `INSERT INTO profissionais (nome, email, senha, comissao_percent, empresa_id, ativo, telefone) 
           VALUES ($1, $2, $3, $4, $5, 1, $6) RETURNING id`
        : `INSERT INTO profissionais (nome, email, senha, comissao_percent, empresa_id, ativo, telefone) 
           VALUES (?, ?, ?, ?, ?, 1, ?)`;

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    db.run(sql, [nome, email, senhaHash, comissao_percent || 30, empresa_id, telefonePadrao], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.json({ success: false, message: 'Email já cadastrado' });
            }
            return res.json({ success: false, message: err.message });
        }

        let id = this?.lastID || this?.id || null;
        res.json({
            success: true,
            data: { id: id, senha_temp: senhaFinal },
            message: `Profissional criado! ${senhaGerada ? `Senha temporária: ${senhaFinal}` : 'Senha definida pelo dono.'}`
        });
    });
});

app.put('/api/profissionais/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, email, comissao_percent, ativo, senha, telefone } = req.body;
    const empresa_id = req.usuario.empresa_id;

    let query = isProduction
        ? `UPDATE profissionais SET nome = COALESCE($1, nome), email = COALESCE($2, email), comissao_percent = COALESCE($3, comissao_percent), ativo = COALESCE($4, ativo), telefone = COALESCE($5, telefone)`
        : `UPDATE profissionais SET nome = COALESCE(?, nome), email = COALESCE(?, email), comissao_percent = COALESCE(?, comissao_percent), ativo = COALESCE(?, ativo), telefone = COALESCE(?, telefone)`;

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;
    let params = [nome, email, comissao_percent, ativo, telefonePadrao];

    if (senha && senha.trim() !== '') {
        const senhaHash = bcrypt.hashSync(senha, 10);
        query += isProduction ? `, senha = $6` : `, senha = ?`;
        params.push(senhaHash);
    }

    query += isProduction ? ` WHERE id = $${params.length + 1} AND empresa_id = $${params.length + 2}` : ` WHERE id = ? AND empresa_id = ?`;
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

    const novaSenha = gerarSenhaTemporaria();
    const senhaHash = bcrypt.hashSync(novaSenha, 10);

    const sql = isProduction
        ? `UPDATE profissionais SET senha = $1 WHERE id = $2 AND empresa_id = $3`
        : `UPDATE profissionais SET senha = ? WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [senhaHash, id, empresa_id], function (err) {
        if (err) return res.json({ success: false, message: err.message });
        res.json({ success: true, message: `Nova senha: ${novaSenha}`, senha: novaSenha });
    });
});

app.delete('/api/profissionais/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sqlCheck = isProduction
        ? `SELECT COUNT(*) as total FROM agendamentos WHERE profissional_id = $1`
        : `SELECT COUNT(*) as total FROM agendamentos WHERE profissional_id = ?`;

    db.get(sqlCheck, [id], (err, result) => {
        if (err) {
            console.error('❌ Erro ao verificar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        if (result?.total > 0) {
            const sqlUpdate = isProduction
                ? `UPDATE profissionais SET ativo = 0 WHERE id = $1 AND empresa_id = $2`
                : `UPDATE profissionais SET ativo = 0 WHERE id = ? AND empresa_id = ?`;

            db.run(sqlUpdate, [id, empresa_id], (err) => {
                if (err) {
                    console.error('❌ Erro ao desativar profissional:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Profissional desativado (possui agendamentos)' });
            });
        } else {
            const sqlDelete = isProduction
                ? `DELETE FROM profissionais WHERE id = $1 AND empresa_id = $2`
                : `DELETE FROM profissionais WHERE id = ? AND empresa_id = ?`;

            db.run(sqlDelete, [id, empresa_id], (err) => {
                if (err) {
                    console.error('❌ Erro ao excluir profissional:', err.message);
                    return res.json({ success: false, message: err.message });
                }
                res.json({ success: true, message: 'Profissional removido' });
            });
        }
    });
});

// ============================================================
// AGENDAMENTOS
// ============================================================

// ============================================
// ROTA: /api/agendamentos - CORRIGIDA (POSTGRESQL)
// ============================================
app.get('/api/agendamentos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    if (!empresa_id) return res.json({ success: true, data: [] });

    // ============================================
    // FORMATAR DATA COMO STRING PARA EVITAR PROBLEMAS
    // ============================================
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
            console.error('❌ Erro ao buscar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        // ============================================
        // GARANTIR QUE DATA ESTEJA NO FORMATO CORRETO
        // ============================================
        const dadosFormatados = agendamentos.map(a => ({
            ...a,
            data: a.data_formatada || a.data,
            data_formatada: undefined // remover campo extra
        }));

        res.json({ success: true, data: dadosFormatados });
    });
});

// ============================================
// ROTA: CRIAR AGENDAMENTO (COM DIAS_BLOQUEIO CORRIGIDO)
// ============================================
app.post('/api/agendamentos',
    auth,
    verificarAcessoAgendamentos,
    verificarLimiteAgendamentos,
    async (req, res) => {
        const { cliente_id, data, hora, servico_id, profissional_id } = req.body;
        const empresa_id = req.usuario.empresa_id;

        console.log('📝 Criando agendamento:', JSON.stringify({ cliente_id, data, hora, servico_id, profissional_id, empresa_id }, null, 2));

        if (!cliente_id || !data) {
            console.log('❌ Cliente ou data faltando');
            return res.json({ success: false, message: 'Cliente e data são obrigatórios' });
        }

        if (!hora) {
            console.log('❌ Horário faltando');
            return res.json({ success: false, message: 'Horário é obrigatório' });
        }

        // ============================================
        // 🔥 VALIDAÇÃO: BUSCAR DIAS_BLOQUEIO DO CLIENTE
        // ============================================
        const sqlDiasBloqueio = isProduction
            ? `SELECT dias_bloqueio FROM clientes WHERE id = $1 AND empresa_id = $2`
            : `SELECT dias_bloqueio FROM clientes WHERE id = ? AND empresa_id = ?`;

        const clienteInfo = await new Promise((resolve) => {
            db.get(sqlDiasBloqueio, [parseInt(cliente_id), parseInt(empresa_id)], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar dias_bloqueio:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        const diasBloqueio = clienteInfo?.dias_bloqueio || 1;
        console.log(`📋 Cliente ${cliente_id} - Dias de bloqueio: ${diasBloqueio}`);

        // ============================================
        // 🔥 VALIDAÇÃO CORRIGIDA: BUSCAR ÚLTIMO AGENDAMENTO
        // ============================================
        if (diasBloqueio > 0) {
            // Buscar o último agendamento do cliente
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
                        console.error('❌ Erro ao buscar último agendamento:', err);
                        resolve(null);
                    } else {
                        resolve(row);
                    }
                });
            });

            if (ultimoAgendamento) {
                const dataUltimo = new Date(ultimoAgendamento.data + 'T00:00:00');
                const dataMinima = new Date(dataUltimo);
                dataMinima.setDate(dataMinima.getDate() + diasBloqueio);
                const dataMinimaStr = dataMinima.toISOString().split('T')[0];
                const dataAgendamento = new Date(data + 'T00:00:00');

                console.log(`📅 Último agendamento: ${ultimoAgendamento.data}`);
                console.log(`📅 Data mínima permitida: ${dataMinimaStr}`);
                console.log(`📅 Data do novo agendamento: ${data}`);

                if (dataAgendamento < dataMinima) {
                    console.log(`❌ Cliente ${cliente_id} não pode agendar antes de ${dataMinimaStr}`);
                    return res.json({
                        success: false,
                        message: `Este cliente só pode fazer um novo agendamento a partir de ${formatarDataBr(dataMinimaStr)} (${diasBloqueio} dias após o último agendamento).`
                    });
                } else {
                    console.log(`✅ Cliente ${cliente_id} pode agendar em ${data}`);
                }
            } else {
                console.log(`✅ Cliente ${cliente_id} não tem agendamentos anteriores`);
            }
        }

        // ============================================
        // VERIFICAR SE HORÁRIO ESTÁ OCUPADO (PROFISSIONAL)
        // ============================================
        let sqlCheckHorario = isProduction
            ? `SELECT id FROM agendamentos 
               WHERE empresa_id = $1 
               AND data = $2 
               AND hora = $3 
               AND status != 'cancelado'`
            : `SELECT id FROM agendamentos 
               WHERE empresa_id = ? 
               AND data = ? 
               AND hora = ? 
               AND status != 'cancelado'`;

        let paramsCheck = [parseInt(empresa_id), data, hora];

        if (profissional_id) {
            sqlCheckHorario += isProduction ? ` AND profissional_id = $4` : ` AND profissional_id = ?`;
            paramsCheck.push(parseInt(profissional_id));
        }

        const horarioOcupado = await new Promise((resolve) => {
            db.get(sqlCheckHorario, paramsCheck, (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar horário:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (horarioOcupado) {
            console.log(`❌ Horário ${hora} já está ocupado`);
            return res.json({
                success: false,
                message: 'Este horário já está ocupado. Escolha outro horário.'
            });
        }

        // ============================================
        // FUNÇÃO PARA CRIAR O AGENDAMENTO
        // ============================================
        async function criarAgendamento(servicoNome, servicoValor, servicoId) {
            const sqlInsert = isProduction
                ? `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, status, empresa_id, profissional_id) 
                   VALUES ($1, $2, $3, $4, $5, $6, 'pendente', $7, $8) RETURNING id`
                : `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, status, empresa_id, profissional_id) 
                   VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`;

            const params = [
                parseInt(cliente_id),
                data,
                hora,
                servicoId || null,
                servicoNome || '',
                parseFloat(servicoValor) || 0,
                parseInt(empresa_id),
                profissional_id ? parseInt(profissional_id) : null
            ];

            console.log('📝 SQL Insert:', sqlInsert);
            console.log('📝 Parâmetros:', params);

            db.run(sqlInsert, params, async function (err) {
                if (err) {
                    console.error('❌ Erro ao criar agendamento:', err.message);
                    return res.json({ success: false, message: 'Erro ao criar agendamento: ' + err.message });
                }

                let id = this?.lastID || this?.id || null;
                console.log('✅ Agendamento criado com ID:', id);

                incrementarContadorAgendamentos(empresa_id, (err) => {
                    if (err) {
                        console.error('⚠️ Erro ao incrementar contador:', err);
                    } else {
                        console.log('✅ Contador de agendamentos incrementado');
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
                    if (profissional_id) {
                        profissional = await new Promise((resolve, reject) => {
                            db.get('SELECT * FROM profissionais WHERE id = ?', [parseInt(profissional_id)], (err, row) => {
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
                        empresa: { nome: empresa?.nome || 'Barbearia', endereco: empresa?.endereco || '' },
                    };

                    if (dadosNotificacao.cliente.telefone) {
                        await whatsappService.enviarConfirmacao(dadosNotificacao);
                        console.log(`📱 WhatsApp: Confirmação enviada para ${dadosNotificacao.cliente.telefone}`);
                    }

                    if (profissional?.telefone) {
                        await whatsappService.enviarNovoAgendamentoProfissional(dadosNotificacao);
                        console.log(`📱 WhatsApp: Notificação enviada para profissional ${profissional.telefone}`);
                    }

                } catch (whatsappError) {
                    console.error('⚠️ Erro ao enviar WhatsApp:', whatsappError.message);
                }

                res.json({ success: true, data: { id: id }, message: 'Agendamento criado com sucesso!' });
            });
        }

        if (servico_id && servico_id !== '' && servico_id !== 'null') {
            const sqlServico = isProduction
                ? `SELECT valor, nome FROM servicos WHERE id = $1 AND empresa_id = $2`
                : `SELECT valor, nome FROM servicos WHERE id = ? AND empresa_id = ?`;

            console.log('📝 Buscando serviço:', { servico_id, empresa_id });

            db.get(sqlServico, [parseInt(servico_id), empresa_id], (err, servicoData) => {
                if (err) {
                    console.error('❌ Erro ao buscar serviço:', err.message);
                    return res.json({ success: false, message: 'Erro ao buscar serviço: ' + err.message });
                }

                if (!servicoData) {
                    console.log('❌ Serviço não encontrado:', servico_id);
                    return res.json({ success: false, message: 'Serviço não encontrado' });
                }

                console.log('📝 Serviço encontrado:', servicoData);
                criarAgendamento(servicoData.nome, servicoData.valor, parseInt(servico_id));
            });
        } else {
            console.log('📝 Criando agendamento sem serviço_id (manual)');
            const servicoNome = req.body.servico || '';
            const servicoValor = parseFloat(req.body.valor) || 0;
            criarAgendamento(servicoNome, servicoValor, null);
        }
    }
);

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
            console.error('❌ Erro ao buscar agendamentos do profissional:', err.message);
            return res.json({ success: false, message: err.message });
        }
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
// ROTA: /api/agendamentos/:id/concluir - COM WHATSAPP
// ============================================

app.put('/api/agendamentos/:id/concluir', auth, verificarDono, async (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    // Buscar o agendamento com o profissional
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

            // SÓ CALCULAR COMISSÃO SE TIVER PROFISSIONAL
            if (agendamento.profissional_id) {
                const valor = parseFloat(agendamento.valor) || 0;
                const percentual = parseFloat(agendamento.comissao_percent) || 30;
                comissao = valor * (percentual / 100);
            }

            // Atualizar status e comissão
            db.run(
                `UPDATE agendamentos 
                 SET status = 'concluido', comissao = ? 
                 WHERE id = ? AND empresa_id = ?`,
                [comissao, id, empresaId],
                async function (err) {
                    if (err) {
                        return res.json({ success: false, message: err.message });
                    }

                    // ============================================
                    // ENVIA AGRADECIMENTO PARA O CLIENTE
                    // ============================================
                    if (agendamento.telefone) {
                        try {
                            await whatsappService.send(
                                agendamento.telefone,
                                `✨ *Atendimento Concluído!*\n\n` +
                                `Olá *${agendamento.cliente_nome || 'Cliente'}*! Seu atendimento foi concluído com sucesso. ✅\n\n` +
                                `Agradecemos pela preferência! 🙏\n\n` +
                                `Já pensou em agendar seu próximo corte? Agende pelo nosso chatbot! 🤖\n\n` +
                                `_Esta é uma mensagem automática._`
                            );
                            console.log(`📱 WhatsApp: Agradecimento enviado para ${agendamento.telefone}`);
                        } catch (whatsappError) {
                            console.error('⚠️ Erro ao enviar WhatsApp:', whatsappError.message);
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
// ROTA: CANCELAR AGENDAMENTO (COM WHATSAPP)
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

        // ============================================
        // NOTIFICA CANCELAMENTO
        // ============================================
        if (agendamento.telefone) {
            try {
                await whatsappService.enviarCancelamento({
                    cliente: { nome: agendamento.cliente_nome || 'Cliente' },
                    servico: { nome: agendamento.servico_nome || 'Serviço' },
                    data: agendamento.data,
                    hora: agendamento.hora,
                    empresa: { nome: 'Barbearia' }
                });
                console.log(`📱 WhatsApp: Cancelamento notificado para ${agendamento.telefone}`);
            } catch (whatsappError) {
                console.error('⚠️ Erro ao enviar WhatsApp:', whatsappError.message);
            }
        }

        res.json({ success: true, message: 'Agendamento cancelado' });

    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        res.status(500).json({ success: false, message: 'Erro ao cancelar agendamento' });
    }
});

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

app.delete('/api/agendamentos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `DELETE FROM agendamentos WHERE id = $1 AND empresa_id = $2`
        : `DELETE FROM agendamentos WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [id, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao excluir agendamento:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Agendamento removido' });
    });
});

// ============================================
// GET /api/clientes - BUSCAR CLIENTES (COM DIAS_BLOQUEIO)
// ============================================
app.get('/api/clientes', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id) {
        return res.json({ success: true, data: [] });
    }

    const sql = isProduction
        ? `SELECT id, nome, telefone, email, created_at, 
           COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot, 
           COALESCE(dias_bloqueio, 1) as dias_bloqueio 
           FROM clientes 
           WHERE empresa_id = $1 
           ORDER BY nome`
        : `SELECT id, nome, telefone, email, created_at, 
           COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot, 
           COALESCE(dias_bloqueio, 1) as dias_bloqueio 
           FROM clientes 
           WHERE empresa_id = ? 
           ORDER BY nome`;

    db.all(sql, [empresa_id], (err, clientes) => {
        if (err) {
            console.error('❌ Erro ao buscar clientes:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: clientes });
    });
});

// ============================================
// POST /api/clientes - CRIAR CLIENTE (VERSÃO SIMPLIFICADA)
// ============================================
app.post('/api/clientes', auth, (req, res) => {
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('📝 Criando cliente:', { nome, telefone, email, empresa_id });

    if (!nome) {
        return res.json({ success: false, message: 'Nome é obrigatório' });
    }

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    const sql = isProduction
        ? `INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES ($1, $2, $3, $4) RETURNING id`
        : `INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)`;

    db.run(sql, [nome, telefonePadrao, email, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao criar cliente:', err.message);
            return res.json({ success: false, message: 'Erro ao criar cliente: ' + err.message });
        }

        let id = this?.lastID || this?.id || null;
        console.log('✅ Cliente criado com ID:', id);
        res.json({ success: true, data: { id: id }, message: 'Cliente cadastrado com sucesso!' });
    });
});
// ============================================
// PUT /api/clientes/:id - ATUALIZAR CLIENTE (COM DIAS_BLOQUEIO)
// ============================================
app.put('/api/clientes/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email, dias_bloqueio } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('📝 Atualizando cliente:', { id, nome, telefone, email, dias_bloqueio, empresa_id });

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    const sql = isProduction
        ? `UPDATE clientes SET 
           nome = COALESCE($1, nome), 
           telefone = COALESCE($2, telefone), 
           email = COALESCE($3, email),
           dias_bloqueio = COALESCE($4, dias_bloqueio, 1)
           WHERE id = $5 AND empresa_id = $6`
        : `UPDATE clientes SET 
           nome = COALESCE(?, nome), 
           telefone = COALESCE(?, telefone), 
           email = COALESCE(?, email),
           dias_bloqueio = COALESCE(?, dias_bloqueio, 1)
           WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [nome, telefonePadrao, email, dias_bloqueio || 1, id, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao editar cliente:', err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log('✅ Cliente atualizado! Changes:', this.changes);
        res.json({ success: true, message: 'Cliente atualizado com sucesso' });
    });
});

app.delete('/api/clientes/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `DELETE FROM clientes WHERE id = $1 AND empresa_id = $2`
        : `DELETE FROM clientes WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [id, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao excluir cliente:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Cliente removido' });
    });
});

app.put('/api/clientes/:id/bloquear-chatbot', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { bloquear } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `UPDATE clientes SET bloqueado_chatbot = $1 WHERE id = $2 AND empresa_id = $3`
        : `UPDATE clientes SET bloqueado_chatbot = ? WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [bloquear ? 1 : 0, id, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao bloquear/desbloquear cliente:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: bloquear ? 'Cliente bloqueado do chatbot' : 'Cliente desbloqueado do chatbot' });
    });
});

// ============================================================
// HORÁRIOS
// ============================================================

app.get('/api/horarios', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT * FROM horarios_funcionamento WHERE empresa_id = $1 ORDER BY dia_semana`
        : `SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana`;

    db.all(sql, [empresa_id], (err, horarios) => {
        if (err) {
            console.error('❌ Erro ao buscar horários:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: horarios });
    });
});

app.put('/api/horarios/:dia', auth, verificarDono, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    const { dia } = req.params;
    const { aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos } = req.body;

    console.log('📝 Atualizando horário:', { empresa_id, dia, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim });

    // Se os valores forem undefined, usar os valores atuais do banco
    // Para isso, primeiro buscamos os valores atuais
    const sqlSelect = isProduction
        ? `SELECT * FROM horarios_funcionamento WHERE empresa_id = $1 AND dia_semana = $2`
        : `SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?`;

    db.get(sqlSelect, [empresa_id, dia], (err, horarioAtual) => {
        if (err) {
            console.error('❌ Erro ao buscar horário atual:', err.message);
            return res.json({ success: false, message: 'Erro ao buscar horário atual' });
        }

        // Usar valores atuais se não foram enviados
        const finalAberto = aberto !== undefined ? aberto : (horarioAtual?.aberto || 1);
        const finalHoraInicio = hora_inicio || horarioAtual?.hora_inicio || '09:00';
        const finalHoraFim = hora_fim || horarioAtual?.hora_fim || '18:00';
        const finalAlmocoInicio = almoco_inicio || horarioAtual?.almoco_inicio || '12:00';
        const finalAlmocoFim = almoco_fim || horarioAtual?.almoco_fim || '13:00';
        const finalIntervalo = intervalo_minutos || horarioAtual?.intervalo_minutos || 30;

        const sql = isProduction
            ? `UPDATE horarios_funcionamento 
               SET aberto = $1, 
                   hora_inicio = $2, 
                   hora_fim = $3, 
                   almoco_inicio = $4, 
                   almoco_fim = $5, 
                   intervalo_minutos = $6
               WHERE empresa_id = $7 AND dia_semana = $8`
            : `UPDATE horarios_funcionamento 
               SET aberto = ?, 
                   hora_inicio = ?, 
                   hora_fim = ?, 
                   almoco_inicio = ?, 
                   almoco_fim = ?, 
                   intervalo_minutos = ?
               WHERE empresa_id = ? AND dia_semana = ?`;

        db.run(sql, [finalAberto, finalHoraInicio, finalHoraFim, finalAlmocoInicio, finalAlmocoFim, finalIntervalo, empresa_id, dia], function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar horário:', err.message);
                return res.json({ success: false, message: 'Erro ao atualizar horário: ' + err.message });
            }

            // Verificar se atualizou alguma linha
            if (this && this.changes === 0) {
                // Se não atualizou, tentar inserir
                const sqlInsert = isProduction
                    ? `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
                    : `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                db.run(sqlInsert, [empresa_id, dia, finalAberto, finalHoraInicio, finalHoraFim, finalAlmocoInicio, finalAlmocoFim, finalIntervalo], function (err) {
                    if (err) {
                        console.error('❌ Erro ao inserir horário:', err.message);
                        return res.json({ success: false, message: 'Erro ao inserir horário: ' + err.message });
                    }
                    res.json({ success: true, message: 'Horário salvo com sucesso!' });
                });
            } else {
                res.json({ success: true, message: 'Horário atualizado com sucesso!' });
            }
        });
    });
});

// ============================================
// ROTA: /api/financeiro - CORRIGIDA (POSTGRESQL)
// ============================================

app.get('/api/financeiro', auth, (req, res) => {
    const role = req.usuario.role;
    const empresa_id = req.usuario.empresa_id;

    // ============================================
    // PROFISSIONAL
    // ============================================
    if (role === 'profissional') {
        const profissional_id = req.usuario.id;

        const sql = isProduction
            ? `SELECT a.*, 
               to_char(a.data, 'YYYY-MM-DD') as data_formatada,
               c.nome as cliente_nome, 
               s.nome as servico_nome
               FROM agendamentos a
               LEFT JOIN clientes c ON a.cliente_id = c.id
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.profissional_id = $1 AND a.status = 'concluido'
               ORDER BY a.data DESC`
            : `SELECT a.*, 
               date(a.data) as data_formatada,
               c.nome as cliente_nome, 
               s.nome as servico_nome
               FROM agendamentos a
               LEFT JOIN clientes c ON a.cliente_id = c.id
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.profissional_id = ? AND a.status = 'concluido'
               ORDER BY a.data DESC`;

        db.all(sql, [profissional_id], (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro profissional:', err.message);
                return res.json({ success: false, message: err.message });
            }

            // Formatando a data para cada item
            const dadosFormatados = comissoes.map(a => ({
                ...a,
                data: a.data_formatada || a.data,
                data_formatada: undefined
            }));

            const totalComissoes = dadosFormatados.reduce((s, c) => s + (parseFloat(c.comissao) || 0), 0);

            res.json({
                success: true,
                data: {
                    comissoes: dadosFormatados,
                    totais: {
                        total_comissoes: totalComissoes,
                        total_servicos: dadosFormatados.length
                    }
                }
            });
        });
        return;
    }

    // ============================================
    // DONO - CORRIGIDO
    // ============================================
    if (role === 'dono') {
        const sql = isProduction
            ? `SELECT 
                a.id,
                to_char(a.data, 'YYYY-MM-DD') as data_formatada,
                a.valor,
                a.servico,
                a.comissao,
                a.profissional_id,
                a.cliente_id,
                c.nome as cliente_nome,
                p.nome as profissional_nome,
                s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = $1 
            AND a.status = 'concluido'
            ORDER BY a.data DESC`
            : `SELECT 
                a.id,
                date(a.data) as data_formatada,
                a.valor,
                a.servico,
                a.comissao,
                a.profissional_id,
                a.cliente_id,
                c.nome as cliente_nome,
                p.nome as profissional_nome,
                s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = ? 
            AND a.status = 'concluido'
            ORDER BY a.data DESC`;

        db.all(sql, [empresa_id], (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro dono:', err.message);
                return res.json({ success: false, message: err.message });
            }

            // ============================================
            // CALCULAR TOTAIS E FORMATAR DATAS
            // ============================================
            let faturamentoBruto = 0;
            let totalComissoes = 0;
            let totalServicos = comissoes.length;
            const comissoesPorProfissional = {};

            for (let item of comissoes) {
                // CORRIGIR A DATA
                const dataFinal = item.data_formatada || item.data;
                item.data = dataFinal;
                delete item.data_formatada;

                const valor = parseFloat(item.valor) || 0;
                faturamentoBruto += valor;

                if (!item.profissional_id) {
                    item.comissao = 0;
                } else {
                    const comissao = parseFloat(item.comissao) || 0;
                    totalComissoes += comissao;

                    const profId = item.profissional_id;
                    const profNome = item.profissional_nome || 'Profissional';

                    if (!comissoesPorProfissional[profId]) {
                        comissoesPorProfissional[profId] = {
                            id: profId,
                            nome: profNome,
                            total_comissao: 0,
                            total_servicos: 0
                        };
                    }
                    comissoesPorProfissional[profId].total_comissao += comissao;
                    comissoesPorProfissional[profId].total_servicos += 1;
                }
            }

            const faturamentoLiquido = faturamentoBruto - totalComissoes;
            const comissoesPorProfissionalArray = Object.values(comissoesPorProfissional);
            comissoesPorProfissionalArray.sort((a, b) => b.total_comissao - a.total_comissao);

            res.json({
                success: true,
                data: {
                    totais: {
                        faturamento_bruto: faturamentoBruto,
                        total_comissoes: totalComissoes,
                        faturamento_liquido: faturamentoLiquido,
                        total_servicos: totalServicos
                    },
                    comissoes: comissoes,
                    comissoes_por_profissional: comissoesPorProfissionalArray
                }
            });
        });
        return;
    }

    // ============================================
    // SUPER ADMIN - CORRIGIDO
    // ============================================
    if (role === 'superadmin') {
        const sql = isProduction
            ? `SELECT 
                a.id,
                to_char(a.data, 'YYYY-MM-DD') as data_formatada,
                a.valor,
                a.servico,
                a.comissao,
                a.profissional_id,
                a.cliente_id,
                a.empresa_id,
                c.nome as cliente_nome,
                p.nome as profissional_nome,
                s.nome as servico_nome,
                e.nome as empresa_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN empresas e ON a.empresa_id = e.id
            WHERE a.status = 'concluido'
            ORDER BY a.data DESC`
            : `SELECT 
                a.id,
                date(a.data) as data_formatada,
                a.valor,
                a.servico,
                a.comissao,
                a.profissional_id,
                a.cliente_id,
                a.empresa_id,
                c.nome as cliente_nome,
                p.nome as profissional_nome,
                s.nome as servico_nome,
                e.nome as empresa_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN empresas e ON a.empresa_id = e.id
            WHERE a.status = 'concluido'
            ORDER BY a.data DESC`;

        db.all(sql, [], (err, comissoes) => {
            if (err) {
                console.error('❌ Erro no financeiro superadmin:', err.message);
                return res.json({ success: false, message: err.message });
            }

            // FORMATAR DATAS
            const dadosFormatados = comissoes.map(a => ({
                ...a,
                data: a.data_formatada || a.data,
                data_formatada: undefined
            }));

            let faturamentoBruto = 0;
            let totalComissoes = 0;
            let totalServicos = dadosFormatados.length;
            const comissoesPorEmpresa = {};

            for (let item of dadosFormatados) {
                const valor = parseFloat(item.valor) || 0;
                faturamentoBruto += valor;

                if (item.profissional_id) {
                    const comissao = parseFloat(item.comissao) || 0;
                    totalComissoes += comissao;

                    const empId = item.empresa_id;
                    const empNome = item.empresa_nome || 'Empresa';

                    if (!comissoesPorEmpresa[empId]) {
                        comissoesPorEmpresa[empId] = {
                            id: empId,
                            nome: empNome,
                            total_comissao: 0,
                            total_servicos: 0,
                            faturamento: 0
                        };
                    }
                    comissoesPorEmpresa[empId].total_comissao += comissao;
                    comissoesPorEmpresa[empId].total_servicos += 1;
                    comissoesPorEmpresa[empId].faturamento += valor;
                }
            }

            const faturamentoLiquido = faturamentoBruto - totalComissoes;

            res.json({
                success: true,
                data: {
                    totais: {
                        faturamento_bruto: faturamentoBruto,
                        total_comissoes: totalComissoes,
                        faturamento_liquido: faturamentoLiquido,
                        total_servicos: totalServicos
                    },
                    comissoes: dadosFormatados,
                    comissoes_por_empresa: Object.values(comissoesPorEmpresa)
                }
            });
        });
        return;
    }

    res.status(403).json({
        success: false,
        message: 'Acesso negado'
    });
});

app.get('/api/profissional/financeiro', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const profissional_id = req.usuario.id;

    const sql = isProduction
        ? `SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.profissional_id = $1 AND a.status = 'concluido'
           ORDER BY a.data DESC`
        : `SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.profissional_id = ? AND a.status = 'concluido'
           ORDER BY a.data DESC`;

    db.all(sql, [profissional_id], (err, comissoes) => {
        if (err) {
            console.error('Erro ao buscar comissões:', err);
            return res.json({ success: false, message: err.message });
        }

        const totalComissoes = comissoes.reduce((s, c) => s + (c.comissao || 0), 0);
        const totalServicos = comissoes.length;

        res.json({
            success: true,
            data: {
                comissoes: comissoes,
                totais: {
                    total_comissoes: totalComissoes,
                    total_servicos: totalServicos
                }
            }
        });
    });
});

app.get('/api/empresa/dados', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    if (!empresaId) {
        return res.json({ success: false, message: 'Empresa não identificada' });
    }

    const sql = isProduction
        ? `SELECT id, nome, plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate, ultima_cobranca, created_at 
           FROM empresas WHERE id = $1`
        : `SELECT id, nome, plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate, ultima_cobranca, created_at 
           FROM empresas WHERE id = ?`;

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar empresa:', err.message);
            return res.json({ success: false, message: 'Erro ao buscar dados da empresa' });
        }
        if (!empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }
        res.json({ success: true, data: empresa });
    });
});

// ============================================================
// ROTAS DO CHATBOT (PÚBLICAS) - MANTIDAS INTACTAS
// ============================================================

// ============================================================
// ROTA: LINK DO CHATBOT (PROTEGIDA - APENAS DONO)
// ============================================================
app.get('/api/chatbot/link/:empresaId', auth, verificarDono, (req, res) => {
    const { empresaId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/chatbot.html?empresa=${empresaId}`;

    console.log(`🔗 Link do chatbot gerado para empresa ${empresaId}: ${link}`);
    res.json({ success: true, link });
});

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
// ROTA: /api/chatbot/datas-disponiveis-mes - CORRIGIDA
// ============================================
app.post('/api/chatbot/datas-disponiveis-mes', (req, res) => {
    const { empresaId, mes, ano, profissionalId } = req.body;

    const mesSolicitado = parseInt(mes) || new Date().getMonth() + 1;
    const anoSolicitado = parseInt(ano) || new Date().getFullYear();

    console.log(`📅 Buscando datas para ${mesSolicitado}/${anoSolicitado} - Profissional: ${profissionalId || 'todos'}`);

    // ============================================
    // VALIDAR E NORMALIZAR O profissionalId
    // ============================================
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

    // ============================================
    // BUSCAR TODOS OS AGENDAMENTOS DO MÊS
    // ============================================
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

    // Se tiver profissional específico (apenas se for número válido)
    if (profissionalIdNum && profissionalIdNum > 0) {
        sqlAgendamentos += isProduction ? ` AND profissional_id = $4` : ` AND profissional_id = ?`;
        params.push(profissionalIdNum);
    }

    db.all(sqlAgendamentos, params, (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos:', err);
            return res.json({ success: false, message: err.message });
        }

        // ============================================
        // MAPEAR HORÁRIOS OCUPADOS POR DIA
        // ============================================
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

        // ============================================
        // BUSCAR HORÁRIOS DE FUNCIONAMENTO
        // ============================================
        db.all(
            `SELECT dia_semana, hora_inicio, hora_fim, almoco_inicio, almoco_fim 
             FROM horarios_funcionamento 
             WHERE empresa_id = ? AND aberto = 1`,
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

                // ============================================
                // GERAR DATAS DISPONÍVEIS
                // ============================================
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

                console.log(`✅ ${datasDisponiveis.length} datas disponíveis em ${mesSolicitado}/${anoSolicitado}`);

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
// ROTA: /api/chatbot/horarios-disponiveis - CORRIGIDA
// ============================================
app.post('/api/chatbot/horarios-disponiveis', (req, res) => {
    const { empresaId, profissionalId, data } = req.body;

    console.log(`🔍 Buscando horários para ${data} - Profissional: ${profissionalId || 'todos'}`);

    // ============================================
    // VALIDAR E NORMALIZAR O profissionalId
    // ============================================
    let profissionalIdNum = null;

    // Verificar se profissionalId existe e não é 'null', 'undefined' ou string vazia
    if (profissionalId &&
        profissionalId !== 'null' &&
        profissionalId !== 'undefined' &&
        profissionalId !== '') {

        // Se for string, tentar converter para número
        if (typeof profissionalId === 'string') {
            // Verificar se é um número (ex: "1", "2", etc)
            if (!isNaN(profissionalId) && !profissionalId.includes('dono')) {
                profissionalIdNum = parseInt(profissionalId);
            }
        } else if (typeof profissionalId === 'number') {
            profissionalIdNum = profissionalId;
        }
    }

    console.log(`📝 profissionalId normalizado: ${profissionalIdNum}`);

    // ============================================
    // BUSCAR AGENDAMENTOS DO DIA
    // ============================================
    let sqlAgendamentos = `
        SELECT hora 
        FROM agendamentos 
        WHERE empresa_id = ? 
        AND data = ? 
        AND status != 'cancelado'
    `;
    let params = [empresaId, data];

    // Se tiver profissional específico (apenas se for número válido)
    if (profissionalIdNum && profissionalIdNum > 0) {
        sqlAgendamentos += ` AND profissional_id = ?`;
        params.push(profissionalIdNum);
    }

    db.all(sqlAgendamentos, params, (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos:', err);
            return res.json({ success: false, message: err.message });
        }

        const horariosOcupados = agendamentos.map(a => a.hora).filter(h => h);

        // ============================================
        // BUSCAR HORÁRIOS DE FUNCIONAMENTO
        // ============================================
        const dataObj = new Date(data + 'T00:00:00');
        const diaSemana = dataObj.getDay();

        db.get(
            `SELECT hora_inicio, hora_fim, almoco_inicio, almoco_fim 
             FROM horarios_funcionamento 
             WHERE empresa_id = ? AND dia_semana = ? AND aberto = 1`,
            [empresaId, diaSemana],
            (err, horario) => {
                if (err) {
                    console.error('❌ Erro ao buscar horário de funcionamento:', err);
                    return res.json({ success: false, message: err.message });
                }

                if (!horario) {
                    return res.json({ success: true, horarios: [] });
                }

                // ============================================
                // GERAR TODOS OS HORÁRIOS DO DIA
                // ============================================
                const todosHorarios = gerarHorariosDoDia(
                    horario.hora_inicio,
                    horario.hora_fim,
                    horario.almoco_inicio,
                    horario.almoco_fim
                );

                // ============================================
                // FILTRAR HORÁRIOS LIVRES
                // ============================================
                const horariosLivres = todosHorarios.filter(h => !horariosOcupados.includes(h));

                console.log(`✅ ${horariosLivres.length} horários disponíveis para ${data}`);

                res.json({
                    success: true,
                    horarios: horariosLivres
                });
            }
        );
    });
});

// ============================================
// CHATBOT - AGENDAR (COM DIAS_BLOQUEIO CORRIGIDO)
// ============================================
app.post('/api/chatbot/agendar', async (req, res) => {
    try {
        const { clienteId, servicoId, profissionalId, data, hora, empresaId } = req.body;

        console.log('📝 CHATBOT - Agendamento:', { clienteId, servicoId, profissionalId, data, hora, empresaId });

        if (!clienteId || !servicoId || !data || !hora || !empresaId) {
            return res.json({ success: false, message: 'Dados incompletos' });
        }

        const clienteIdNum = parseInt(clienteId);
        const servicoIdNum = parseInt(servicoId);
        const empresaIdNum = parseInt(empresaId);
        const profissionalIdNum = profissionalId ? parseInt(profissionalId) : null;

        // ============================================
        // 1. VERIFICAR LIMITE DE AGENDAMENTOS/MÊS
        // ============================================
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
        // 2. BUSCAR DIAS_BLOQUEIO DO CLIENTE
        // ============================================
        const sqlDiasBloqueio = isProduction
            ? `SELECT dias_bloqueio FROM clientes WHERE id = $1 AND empresa_id = $2`
            : `SELECT dias_bloqueio FROM clientes WHERE id = ? AND empresa_id = ?`;

        const clienteInfo = await new Promise((resolve) => {
            db.get(sqlDiasBloqueio, [clienteIdNum, empresaIdNum], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar dias_bloqueio:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        const diasBloqueio = clienteInfo?.dias_bloqueio || 1;
        console.log(`📋 Cliente ${clienteIdNum} - Dias de bloqueio: ${diasBloqueio}`);

        // ============================================
        // 3. VALIDAR: BUSCAR ÚLTIMO AGENDAMENTO
        // ============================================
        if (diasBloqueio > 0) {
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
                db.get(sqlUltimoAgendamento, [clienteIdNum, empresaIdNum], (err, row) => {
                    if (err) {
                        console.error('❌ Erro ao buscar último agendamento no chatbot:', err);
                        resolve(null);
                    } else {
                        resolve(row);
                    }
                });
            });

            if (ultimoAgendamento) {
                const dataUltimo = new Date(ultimoAgendamento.data + 'T00:00:00');
                const dataMinima = new Date(dataUltimo);
                dataMinima.setDate(dataMinima.getDate() + diasBloqueio);
                const dataMinimaStr = dataMinima.toISOString().split('T')[0];
                const dataAgendamento = new Date(data + 'T00:00:00');

                console.log(`📅 Chatbot - Último agendamento: ${ultimoAgendamento.data}`);
                console.log(`📅 Chatbot - Data mínima permitida: ${dataMinimaStr}`);
                console.log(`📅 Chatbot - Data do novo agendamento: ${data}`);

                if (dataAgendamento < dataMinima) {
                    console.log(`❌ Chatbot: Cliente ${clienteIdNum} não pode agendar antes de ${dataMinimaStr}`);
                    return res.json({
                        success: false,
                        message: `Você só pode fazer um novo agendamento a partir de ${formatarDataBr(dataMinimaStr)} (${diasBloqueio} dias após o último agendamento).`
                    });
                } else {
                    console.log(`✅ Chatbot: Cliente ${clienteIdNum} pode agendar em ${data}`);
                }
            } else {
                console.log(`✅ Chatbot: Cliente ${clienteIdNum} não tem agendamentos anteriores`);
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
            db.run(sqlInsert, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID });
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

        console.log('✅ CHATBOT - Agendamento criado! ID:', result.lastID);
        res.json({
            success: true,
            agendamentoId: result.lastID,
            profissionalNome: profissional?.nome || 'Profissional',
            servicoNome: servico.nome,
            valor: servico.valor
        });

    } catch (error) {
        console.error('❌ CHATBOT - Erro:', error);
        res.json({ success: false, message: 'Erro interno. Tente novamente.' });
    }
});

// ============================================================
// SIMULAÇÃO DE PAGAMENTO
// ============================================================

app.post('/api/simulate-pix', auth, (req, res) => {
    const { plano_id, plano_nome, valor } = req.body;
    const empresaId = req.usuario.empresa_id;

    const qrCodeSimulado = `00020126580014BR.GOV.BCB.PIX0136b9f5e0-4b1e-4b3e-8a6e-8a5e4b3e2a1e5204000053039865404${Math.floor(valor * 100)}.005802BR5925See&Agende6009SAO PAULO62070503***6304E2C9`;
    const qrCodeBase64Simulado = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const paymentId = "sim_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at)
           VALUES ($1, $2, $3, $4, 'pix_simulado', $5, 'pending', $6, $7, CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at)
           VALUES (?, ?, ?, ?, 'pix_simulado', ?, 'pending', ?, ?, CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId, qrCodeSimulado, qrCodeBase64Simulado], (err) => {
        if (err) console.error('Erro ao salvar simulação:', err);
    });

    res.json({
        success: true,
        qr_code: qrCodeSimulado,
        qr_code_base64: qrCodeBase64Simulado,
        payment_id: paymentId,
        simulado: true
    });
});

app.post('/api/simulate-card', auth, (req, res) => {
    const { plano_id, plano_nome, valor } = req.body;
    const empresaId = req.usuario.empresa_id;

    const paymentId = "sim_card_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
           VALUES ($1, $2, $3, $4, 'cartao_simulado', $5, 'approved', CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at)
           VALUES (?, ?, ?, ?, 'cartao_simulado', ?, 'approved', CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId], (err) => {
        if (err) console.error('Erro ao salvar simulação:', err);
    });

    const plano = PLANOS[plano_id];
    if (plano) {
        const dataValidade = new Date();
        dataValidade.setMonth(dataValidade.getMonth() + 1);

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = $1,
               limite_profissionais = $2,
               assinatura_ativa = 1,
               assinatura_valida_ate = $3,
               ultima_cobranca = CURRENT_TIMESTAMP
               WHERE id = $4`
            : `UPDATE empresas SET 
               plano = ?,
               limite_profissionais = ?,
               assinatura_ativa = 1,
               assinatura_valida_ate = ?,
               ultima_cobranca = CURRENT_TIMESTAMP
               WHERE id = ?`;

        db.run(sqlUpdate, [plano.nome, plano.limite, dataValidade.toISOString(), empresaId]);
    }

    res.json({
        success: true,
        payment_id: paymentId,
        status: 'approved',
        simulado: true,
        message: 'Pagamento simulado aprovado!'
    });
});

app.post('/api/simulate-boleto', auth, (req, res) => {
    const { plano_id, plano_nome, valor, cpf } = req.body;
    const empresaId = req.usuario.empresa_id;

    const paymentId = "sim_boleto_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const boletoUrl = "https://www.mercadopago.com.br/boleto/simulado/" + paymentId;

    const sql = isProduction
        ? `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, boleto_url, created_at)
           VALUES ($1, $2, $3, $4, 'boleto_simulado', $5, 'pending', $6, CURRENT_TIMESTAMP)`
        : `INSERT INTO transacoes_pagamento 
           (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, boleto_url, created_at)
           VALUES (?, ?, ?, ?, 'boleto_simulado', ?, 'pending', ?, CURRENT_TIMESTAMP)`;

    db.run(sql, [empresaId, plano_id, plano_nome, valor, paymentId, boletoUrl], (err) => {
        if (err) console.error('Erro ao salvar simulação:', err);
    });

    res.json({
        success: true,
        boleto_url: boletoUrl,
        payment_id: paymentId,
        simulado: true
    });
});

app.post('/api/confirm-simulated-payment/:paymentId', auth, (req, res) => {
    const { paymentId } = req.params;

    const sqlSelect = isProduction
        ? 'SELECT empresa_id, plano_id FROM transacoes_pagamento WHERE pagamento_id = $1'
        : 'SELECT empresa_id, plano_id FROM transacoes_pagamento WHERE pagamento_id = ?';

    db.get(sqlSelect, [paymentId], (err, transacao) => {
        if (err || !transacao) {
            return res.json({ success: false, message: 'Transação não encontrada' });
        }

        const plano = PLANOS[transacao.plano_id];
        if (plano) {
            const dataValidade = new Date();
            dataValidade.setMonth(dataValidade.getMonth() + 1);

            const sqlUpdate = isProduction
                ? `UPDATE empresas SET 
                   plano = $1,
                   limite_profissionais = $2,
                   assinatura_ativa = 1,
                   assinatura_valida_ate = $3,
                   ultima_cobranca = CURRENT_TIMESTAMP
                   WHERE id = $4`
                : `UPDATE empresas SET 
                   plano = ?,
                   limite_profissionais = ?,
                   assinatura_ativa = 1,
                   assinatura_valida_ate = ?,
                   ultima_cobranca = CURRENT_TIMESTAMP
                   WHERE id = ?`;

            db.run(sqlUpdate, [plano.nome, plano.limite, dataValidade.toISOString(), transacao.empresa_id]);

            const sqlUpdateTransacao = isProduction
                ? `UPDATE transacoes_pagamento 
                   SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                   WHERE pagamento_id = $1`
                : `UPDATE transacoes_pagamento 
                   SET status = 'approved', updated_at = CURRENT_TIMESTAMP
                   WHERE pagamento_id = ?`;

            db.run(sqlUpdateTransacao, [paymentId]);

            res.json({ success: true, message: 'Pagamento confirmado!' });
        } else {
            res.json({ success: false, message: 'Plano não encontrado' });
        }
    });
});

// ============================================================
// JOBS E SERVIÇOS
// ============================================================

// Inicia o job de lembretes WhatsApp
const lembreteJob = require('./server/jobs/lembretes');

if (process.env.WHATSAPP_ENABLED === 'true') {
    lembreteJob.start();
    console.log('✅ Job de lembretes WhatsApp iniciado');
} else {
    console.log('ℹ️ WhatsApp desabilitado (WHATSAPP_ENABLED=false)');
}

// ============================================================
// INICIAR WPPCONNECT LOCAL (SE HABILITADO) - CORRIGIDO
// ============================================================
if (process.env.WHATSAPP_ENABLED === 'true' && process.env.WHATSAPP_PROVIDER === 'wppconnect') {
    try {
        const { getClient } = require('./server/services/wppconnect-local');
        // Inicia em background sem bloquear o servidor
        setTimeout(async () => {
            try {
                await getClient();
                console.log('✅ WhatsApp WPPConnect iniciado com sucesso!');
            } catch (err) {
                console.error('❌ Erro ao iniciar WPPConnect:', err.message);
            }
        }, 2000);
    } catch (error) {
        console.error('❌ Erro ao carregar wppconnect-local:', error.message);
    }
}

// ============================================
// ROTA: PROFISSIONAIS DISPONÍVEIS POR HORÁRIO
// ============================================

app.get('/api/agenda/profissionais-disponiveis', auth, (req, res) => {
    const { data, hora } = req.query;
    const empresa_id = req.usuario.empresa_id;

    if (!data || !hora) {
        return res.json({ success: false, message: 'Data e hora são obrigatórias' });
    }

    // Buscar todos os profissionais ativos
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

        // Buscar agendamentos no horário
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

            // Buscar limite de profissionais do plano
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
// ROTA: AGENDAMENTOS POR PERÍODO (PARA AGENDA)
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

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================

const HOST = process.env.RENDER === 'true' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
    console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
    console.log(`📧 Super Admin: super@admin.com / super123`);
    console.log(`📧 Dono: admin@teste.com / 123456`);
    console.log(`\n💰 PLANOS DISPONÍVEIS:`);
    console.log(`   Starter: R$ 24,90/mês - 1 profissional`);
    console.log(`   Pro: R$ 49,90/mês - 5 profissionais`);
    console.log(`   Business: R$ 99,90/mês - 12 profissionais`);
    console.log(`   Enterprise: R$ 199,90/mês - Profissionais ilimitados`);
    console.log(`\n📱 WhatsApp: ${process.env.WHATSAPP_ENABLED === 'true' ? '✅ ATIVADO' : '❌ DESABILITADO'}`);
});

// ============================================================
// KEEP ALIVE (Evita dormir no Render)
// ============================================================

if (process.env.RENDER === 'true') {
    try {
        const { keepAlive } = require('./keep_alive');
        keepAlive();
        console.log('🔄 Keep Alive ativado para o Render!');
    } catch (error) {
        console.log('⚠️ Erro ao carregar keep_alive:', error.message);
        // Fallback: ping simples
        const http = require('http');
        setInterval(() => {
            http.get(`http://localhost:${PORT}`, (res) => {
                console.log(`💓 Keep Alive ping - Status: ${res.statusCode}`);
            }).on('error', () => { });
        }, 4 * 60 * 1000);
        console.log('🔄 Keep Alive fallback ativado!');
    }
}

// Também criar um cron job separado para garantir
if (process.env.RENDER === 'true') {
    try {
        require('./cron');
        console.log('🔄 Cron job ativado!');
    } catch (error) {
        console.log('⚠️ Cron job não encontrado, continuando...');
    }
}

// ============================================
// JOB DE RESET DE CONTADORES
// ============================================

try {
    const resetJob = require('./server/jobs/reset-contador');
    resetJob.start();
    console.log('✅ Job de reset de contadores iniciado');
} catch (error) {
    console.log('⚠️ Erro ao iniciar job de reset:', error.message);
}