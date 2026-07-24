// ============================================================
// ?? ATEN��O: PARTES EXTRAT�DAS PARA OUTROS ARQUIVOS ??
// ============================================================
// 
// As seguintes partes N�O EST�O MAIS AQUI e N�O DEVEM SER MEXIDAS:
//
// ?? server\config\database.js - Cria��o das tabelas
// ?? server\middlewares\auth.js - Middlewares de autentica��o
// ?? server\utils\constants.js - Constantes dos planos
// ?? server\utils\helpers.js - Fun��es auxiliares
//
// ============================================================
// O C�DIGO ABAIXO S�O AS ROTAS - AQUI VOC�S MEXEM!
// ============================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// ============================================================
// MERCADO PAGO
// ============================================================
const mercadopago = require('./server/services/mercadopago');


// Função para converter valores booleanos entre SQLite e PostgreSQL
function converterBooleano(valor) {
    if (isProduction) {
        // PostgreSQL: true/false
        if (typeof valor === 'boolean') return valor;
        if (typeof valor === 'number') return valor === 1;
        if (typeof valor === 'string') return valor === '1' || valor === 'true';
        return false;
    } else {
        // SQLite: 1/0
        if (typeof valor === 'boolean') return valor ? 1 : 0;
        if (typeof valor === 'number') return valor;
        if (typeof valor === 'string') return (valor === '1' || valor === 'true') ? 1 : 0;
        return 0;
    }
}
// ============================================================
// IMPORTS DAS PARTES EXTRAT�DAS
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
// NOVO: IMPORT DO SERVI�O WHATSAPP
// ============================================================
const whatsappService = require('./server/services/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));


// ============================================================
// FUN��O AUXILIAR: FORMATAR DATA (BACKEND)
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
// FUN��O AUXILIAR: GERAR HOR�RIOS DO DIA
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
// FUN��O AUXILIAR: VERIFICAR DISPONIBILIDADE COM DURA��O
// ============================================================
async function verificarDisponibilidadeHorario(empresa_id, profissional_id, data, hora, duracao) {
    // Se n�o tiver profissional definido, considerar todos os profissionais
    let sqlAgendamentos;
    let paramsAgendamentos;

    if (profissional_id) {
        sqlAgendamentos = isProduction
            ? `SELECT a.hora, a.id, s.duracao as servico_duracao
               FROM agendamentos a
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.empresa_id = $1 
               AND a.data = $2 
               AND a.profissional_id = $3 
               AND a.status != 'cancelado'`
            : `SELECT a.hora, a.id, s.duracao as servico_duracao
               FROM agendamentos a
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.empresa_id = ? 
               AND a.data = ? 
               AND a.profissional_id = ? 
               AND a.status != 'cancelado'`;
        paramsAgendamentos = [empresa_id, data, profissional_id];
    } else {
        // Se n�o tem profissional espec�fico, verificar todos os profissionais
        sqlAgendamentos = isProduction
            ? `SELECT a.hora, a.id, a.profissional_id, s.duracao as servico_duracao
               FROM agendamentos a
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.empresa_id = $1 
               AND a.data = $2 
               AND a.status != 'cancelado'`
            : `SELECT a.hora, a.id, a.profissional_id, s.duracao as servico_duracao
               FROM agendamentos a
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.empresa_id = ? 
               AND a.data = ? 
               AND a.status != 'cancelado'`;
        paramsAgendamentos = [empresa_id, data];
    }

    const agendamentos = await new Promise((resolve) => {
        db.all(sqlAgendamentos, paramsAgendamentos, (err, rows) => {
            if (err) {
                console.error('? Erro ao buscar agendamentos:', err);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });

    // Converter hora para minutos
    const horaInicioMin = horaParaMinutos(hora);
    const horaFimMin = horaInicioMin + duracao;

    // Verificar conflitos
    for (let ag of agendamentos) {
        if (!ag.hora) continue;

        const agHoraMin = horaParaMinutos(ag.hora);
        const agDuracao = ag.servico_duracao || 30;
        const agFimMin = agHoraMin + agDuracao;

        // Verificar sobreposi��o
        if (horaInicioMin < agFimMin && horaFimMin > agHoraMin) {
            console.log(`? Conflito: ${hora} (${duracao}min) com ${ag.hora} (${agDuracao}min)`);
            return false; // Conflito
        }
    }

    return true; // Dispon�vel
}

// ============================================================
// INICIALIZA��O DO BANCO E USU�RIOS PADR�O
// ============================================================

initDatabase();

// ============================================
// ============================================
// ?? MIGRA��O AUTOM�TICA PARA POSTGRESQL (RENDER)
// ============================================
// ============================================

setTimeout(() => {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (!isProduction) {
        console.log('?? Ambiente local - Migra��es PostgreSQL ignoradas');
        return;
    }

    console.log('?? [RENDER] Verificando colunas no PostgreSQL...');

    const colunas = [
        { tabela: 'empresas', coluna: 'telefone_dono', tipo: 'VARCHAR(20)' },
        { tabela: 'empresas', coluna: 'endereco', tipo: 'TEXT' },
        { tabela: 'empresas', coluna: 'dias_bloqueio_geral', tipo: 'INTEGER DEFAULT 0' },
        { tabela: 'usuarios', coluna: 'telefone', tipo: 'VARCHAR(20)' },
        { tabela: 'profissionais', coluna: 'telefone', tipo: 'VARCHAR(20)' }
    ];

    let executadas = 0;

    colunas.forEach(({ tabela, coluna, tipo }) => {
        const sql = `ALTER TABLE ${tabela} ADD COLUMN IF NOT EXISTS ${coluna} ${tipo}`;
        db.run(sql, [], (err) => {
            if (err) {
                // Ignora erro - o usu�rio pode n�o ter permiss�o
                console.log(`?? N�o foi poss�vel criar ${coluna} em ${tabela}: ${err.message}`);
            } else {
                console.log(`? ${coluna} criada em ${tabela}!`);
            }
            executadas++;

            if (executadas === colunas.length) {
                console.log('? Todas as migra��es verificadas!');
            }
        });
    });
}, 5000);

// ============================================================
// ?? MIGRA��ES AUTOM�TICAS
// ============================================================

// 1. Verificar e criar coluna dias_bloqueio na tabela clientes
setTimeout(() => {
    try {
        const { verificarColunaDiasBloqueio } = require('./server/config/database');
        verificarColunaDiasBloqueio();
    } catch (error) {
        console.log('?? Erro ao verificar dias_bloqueio:', error.message);
    }
}, 2000);

// ============================================================
// ?? MIGRA��O: dias_bloqueio_geral (DESATIVADA - TABELAS J� EXISTEM)
// ============================================================
setTimeout(() => {
    console.log('?? Verificando coluna dias_bloqueio_geral em empresas...');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (isProduction) {
        const sqlCheck = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'empresas' 
            AND column_name = 'dias_bloqueio_geral'
        `;

        db.get(sqlCheck, [], (err, row) => {
            if (err) {
                console.log('?? Erro ao verificar dias_bloqueio_geral:', err.message);
                return;
            }

            if (row) {
                console.log('? Coluna dias_bloqueio_geral j� existe!');
                return;
            }

            console.log('?? Criando coluna dias_bloqueio_geral no PostgreSQL...');

            const sqlAdd = `ALTER TABLE empresas ADD COLUMN dias_bloqueio_geral INTEGER DEFAULT 0`;

            db.run(sqlAdd, [], (err) => {
                if (err) {
                    console.log('?? N�o foi poss�vel criar dias_bloqueio_geral:', err.message);
                    return;
                }
                console.log('? Coluna dias_bloqueio_geral criada com sucesso!');
            });
        });
    } else {
        const sqlCheck = `PRAGMA table_info(empresas)`;

        db.all(sqlCheck, [], (err, rows) => {
            if (err) {
                console.error('? Erro ao verificar dias_bloqueio_geral:', err.message);
                return;
            }

            const existe = rows && rows.some(r => r.name === 'dias_bloqueio_geral');

            if (existe) {
                console.log('? Coluna dias_bloqueio_geral j� existe!');
                return;
            }

            console.log('?? Criando coluna dias_bloqueio_geral no SQLite...');

            const sqlAdd = `ALTER TABLE empresas ADD COLUMN dias_bloqueio_geral INTEGER DEFAULT 0`;

            db.run(sqlAdd, [], (err) => {
                if (err) {
                    console.error('? Erro ao criar dias_bloqueio_geral:', err.message);
                    return;
                }
                console.log('? Coluna dias_bloqueio_geral criada com sucesso!');
            });
        });
    }
}, 2500);

// ============================================================
// ?? MIGRA��O: TABELA DESPESAS (POSTGRESQL) - USANDO db.run
// ============================================================
setTimeout(() => {
    console.log('?? Verificando tabela despesas no PostgreSQL...');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (!isProduction) {
        console.log('?? Ambiente local - Migra��o despesas ignorada');
        return;
    }

    // Verificar se a tabela existe no PostgreSQL
    const sqlCheck = `
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'despesas'
        );
    `;

    db.get(sqlCheck, [], (err, result) => {
        if (err) {
            console.log('?? Erro ao verificar tabela despesas:', err.message);
            return;
        }

        const existe = result?.exists || false;

        if (existe) {
            console.log('? Tabela despesas j� existe!');
            return;
        }

        console.log('?? Criando tabela despesas no PostgreSQL...');

        // ?? USAR db.run para cada comando separadamente
        const commands = [
            `CREATE TABLE IF NOT EXISTS despesas (
                id SERIAL PRIMARY KEY,
                empresa_id INTEGER NOT NULL,
                descricao TEXT NOT NULL,
                categoria TEXT NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                data DATE NOT NULL,
                data_vencimento DATE,
                pago BOOLEAN DEFAULT FALSE,
                forma_pagamento TEXT,
                observacao TEXT,
                anexo TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE INDEX IF NOT EXISTS idx_despesas_empresa ON despesas(empresa_id)`,
            `CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(data)`,
            `CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria)`,
            `CREATE INDEX IF NOT EXISTS idx_despesas_pago ON despesas(pago)`
        ];

        let executados = 0;
        const totalComandos = commands.length;

        commands.forEach((cmd, index) => {
            db.run(cmd, [], (err) => {
                if (err) {
                    console.log(`?? Erro no comando ${index + 1}: ${err.message}`);
                } else {
                    console.log(`? Comando ${index + 1}/${totalComandos} executado`);
                }
                executados++;

                if (executados === totalComandos) {
                    console.log('? Tabela despesas criada com sucesso!');
                    // Verificar
                    db.get("SELECT COUNT(*) as total FROM despesas", [], (err, count) => {
                        if (err) {
                            console.log('?? Erro ao verificar tabela:', err.message);
                        } else {
                            console.log(`?? Tabela despesas pronta! (${count?.total || 0} registros)`);
                        }
                    });
                }
            });
        });
    });
}, 15000);

// ============================================================
// ?? MIGRA��O: TABELA METAS (POSTGRESQL) - USANDO db.run
// ============================================================
setTimeout(() => {
    console.log('?? Verificando tabela metas no PostgreSQL...');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (!isProduction) {
        console.log('?? Ambiente local - Migra��o metas ignorada');
        return;
    }

    const sqlCheck = `
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'metas'
        );
    `;

    db.get(sqlCheck, [], (err, result) => {
        if (err) {
            console.log('?? Erro ao verificar tabela metas:', err.message);
            return;
        }

        const existe = result?.exists || false;

        if (existe) {
            console.log('? Tabela metas j� existe!');
            return;
        }

        console.log('?? Criando tabela metas no PostgreSQL...');

        // ?? USAR db.run para cada comando separadamente
        const commands = [
            `CREATE TABLE IF NOT EXISTS metas (
                id SERIAL PRIMARY KEY,
                empresa_id INTEGER NOT NULL,
                mes INTEGER NOT NULL,
                ano INTEGER NOT NULL,
                meta_faturamento DECIMAL(10,2) DEFAULT 0,
                meta_clientes INTEGER DEFAULT 0,
                meta_atendimentos INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE INDEX IF NOT EXISTS idx_metas_empresa ON metas(empresa_id)`,
            `CREATE INDEX IF NOT EXISTS idx_metas_data ON metas(mes, ano)`
        ];

        let executados = 0;
        const totalComandos = commands.length;

        commands.forEach((cmd, index) => {
            db.run(cmd, [], (err) => {
                if (err) {
                    console.log(`?? Erro no comando ${index + 1}: ${err.message}`);
                } else {
                    console.log(`? Comando ${index + 1}/${totalComandos} executado`);
                }
                executados++;

                if (executados === totalComandos) {
                    console.log('? Tabela metas criada com sucesso!');
                }
            });
        });
    });
}, 17000);

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================================
// 1. CRIAR/ATUALIZAR SUPER ADMIN (SEM FOR�AR ID)
// ============================================================
console.log('?? Verificando/Criando Super Admin...');

const superAdminSenha = bcrypt.hashSync('super123', 10);

db.get(`SELECT id FROM usuarios WHERE email = 'super@admin.com'`, [], (err, existing) => {
    if (err) {
        console.error('? Erro ao verificar Super Admin:', err.message);
    } else if (existing) {
        console.log('?? Atualizando senha do Super Admin...');
        const sqlUpdate = isProduction
            ? `UPDATE usuarios SET senha = $1 WHERE email = 'super@admin.com'`
            : `UPDATE usuarios SET senha = ? WHERE email = 'super@admin.com'`;

        db.run(sqlUpdate, [superAdminSenha], function (err) {
            if (err) {
                console.error('? Erro ao atualizar Super Admin:', err.message);
            } else {
                console.log('? Super Admin atualizado: super@admin.com / super123');
            }
        });
    } else {
        console.log('?? Criando Super Admin...');
        const sqlInsert = isProduction
            ? `INSERT INTO usuarios (nome, email, senha, role) 
               VALUES ($1, $2, $3, 'superadmin')`
            : `INSERT INTO usuarios (nome, email, senha, role) 
               VALUES (?, ?, ?, 'superadmin')`;

        db.run(sqlInsert, ['Super Admin', 'super@admin.com', superAdminSenha], function (err) {
            if (err) {
                console.error('? Erro ao criar Super Admin:', err.message);
            } else {
                console.log('? Super Admin criado: super@admin.com / super123');
            }
        });
    }
});

// ============================================================
// 2. CRIAR/ATUALIZAR EMPRESA DE TESTE E DONO
// ============================================================
console.log('?? Verificando/Criando empresa de teste...');

db.get(`SELECT id FROM empresas WHERE nome = 'Barbearia Teste'`, (err, empresa) => {
    if (err) {
        console.error('? Erro ao verificar empresa teste:', err.message);
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
                console.error('? Erro ao criar empresa teste:', err.message);
                return;
            }

            const sqlFind = isProduction
                ? `SELECT id FROM empresas WHERE nome = 'Barbearia Teste' ORDER BY id DESC LIMIT 1`
                : `SELECT id FROM empresas WHERE nome = 'Barbearia Teste' ORDER BY id DESC LIMIT 1`;

            db.get(sqlFind, [], (err, row) => {
                if (err || !row) {
                    console.error('? Erro ao buscar ID da empresa:', err?.message);
                    return;
                }

                const empresaId = row.id;
                console.log(`? Empresa teste criada (ID: ${empresaId})`);
                inserirHorariosPadrao(empresaId);

                const donoSenha = bcrypt.hashSync('123456', 10);

                db.get(`SELECT id FROM usuarios WHERE email = 'admin@teste.com'`, [], (err, existingDono) => {
                    if (err) {
                        console.error('? Erro ao verificar dono:', err.message);
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
                                console.error('? Erro ao criar dono:', err.message);
                            } else {
                                console.log('? Dono criado: admin@teste.com / 123456');
                            }
                        });
                    } else {
                        console.log('? Dono j� existe');
                    }
                });
            });
        });
    } else {
        console.log('? Empresa teste j� existe');
    }
});

// ============================================================
// AUTENTICA��O - COM REGISTRO DE ACESSOS
// ============================================================

app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    console.log('?? Tentando login:', { email });

    // Query para profissionais (adaptada para PostgreSQL)
    const sqlProfissional = isProduction
        ? `SELECT p.*, e.nome as empresa_nome, e.trial_expira, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
           FROM profissionais p 
           LEFT JOIN empresas e ON p.empresa_id = e.id 
           WHERE p.email = $1 AND p.ativo = true`
        : `SELECT p.*, e.nome as empresa_nome, e.trial_expira, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
           FROM profissionais p 
           LEFT JOIN empresas e ON p.empresa_id = e.id 
           WHERE p.email = ? AND p.ativo = true`;

    db.get(sqlProfissional, [email], (err, profissional) => {
        if (err) {
            console.error('? Erro ao buscar profissional:', err.message);
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

            // ?? REGISTRAR ACESSO DO PROFISSIONAL
            const ip = req.ip || req.connection.remoteAddress || null;
            const user_agent = req.headers['user-agent'] || null;

            const sqlAcesso = isProduction
                ? `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES ($1, $2, $3, $4)`
                : `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES (?, ?, ?, ?)`;

            db.run(sqlAcesso, [profissional.empresa_id, profissional.id, ip, user_agent], (err) => {
                if (err) {
                    console.error('?? Erro ao registrar acesso do profissional:', err.message);
                } else {
                    console.log(`?? Acesso registrado para profissional ${profissional.nome} (empresa ${profissional.empresa_id})`);
                }
            });

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

        // Query para usu�rios (adaptada para PostgreSQL)
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
                console.error('? Erro ao buscar usu�rio:', err.message);
                return res.json({ success: false, message: 'Erro ao buscar usu�rio' });
            }

            if (!user) {
                console.log('? Usu�rio n�o encontrado:', email);
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            if (!bcrypt.compareSync(senha, user.senha)) {
                console.log('? Senha incorreta para:', email);
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            let diasRestantes = 0;

            if (user.role === 'dono') {
                if (user.plano === 'trial' && user.trial_expira) {
                    const hoje = new Date();
                    const trialExpira = new Date(user.trial_expira);
                    if (hoje > trialExpira) {
                        return res.json({ success: false, message: 'Seu per�odo de teste expirou. Fa�a upgrade para continuar usando o sistema.' });
                    }
                    diasRestantes = Math.ceil((trialExpira - hoje) / (1000 * 60 * 60 * 24));
                } else if (user.plano !== 'trial' && user.assinatura_ativa === true && user.assinatura_valida_ate) {
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

            // ?? REGISTRAR ACESSO DO USU�RIO
            const ip = req.ip || req.connection.remoteAddress || null;
            const user_agent = req.headers['user-agent'] || null;

            const sqlAcesso = isProduction
                ? `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES ($1, $2, $3, $4)`
                : `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES (?, ?, ?, ?)`;

            db.run(sqlAcesso, [user.empresa_id, user.id, ip, user_agent], (err) => {
                if (err) {
                    console.error('?? Erro ao registrar acesso do usu�rio:', err.message);
                } else {
                    console.log(`?? Acesso registrado para ${user.nome} (empresa ${user.empresa_id})`);
                }
            });

            console.log('? Login bem sucedido:', email);

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

// ============================================
// CADASTRO - COM LOCALIZAÇÃO (CORRIGIDO)
// ============================================
app.post('/api/cadastro', async (req, res) => {
    const { nome, email, senha, empresa_nome, telefone } = req.body;

    if (!nome || !email || !senha || !empresa_nome) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios' });
    }

    console.log('📝 Tentando cadastrar:', { nome, email, empresa_nome, telefone });

    // ✅ VERIFICAR SE EMAIL JÁ EXISTE
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

        // ✅ LIMPAR O TELEFONE (APENAS NÚMEROS)
        const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;
        console.log('📱 Telefone limpo:', telefoneLimpo);

        // 🔥 CORREÇÃO: Criar empresa com valor booleano correto
        const sqlEmpresa = isProduction
            ? `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa, telefone_dono) 
               VALUES ($1, 'trial', 1, (CURRENT_TIMESTAMP + INTERVAL '45 days'), TRUE, $2) RETURNING id`
            : `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa, telefone_dono) 
               VALUES (?, 'trial', 1, datetime('now', '+45 days'), 1, ?)`;

        db.run(sqlEmpresa, [empresa_nome, telefoneLimpo], function (err) {
            if (err) {
                console.error('❌ Erro ao criar empresa:', err.message);
                return res.json({ success: false, message: 'Erro ao criar empresa' });
            }

            // ✅ BUSCAR ID DA EMPRESA
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

                // ✅ CRIAR USUÁRIO (COM TELEFONE)
                const senhaHash = bcrypt.hashSync(senha, 10);
                const sqlUsuario = isProduction
                    ? `INSERT INTO usuarios (nome, email, senha, role, empresa_id, telefone) 
                       VALUES ($1, $2, $3, 'dono', $4, $5)`
                    : `INSERT INTO usuarios (nome, email, senha, role, empresa_id, telefone) 
                       VALUES (?, ?, ?, 'dono', ?, ?)`;

                db.run(sqlUsuario, [nome, email, senhaHash, empresa_id, telefoneLimpo], function (err) {
                    if (err) {
                        console.error('❌ Erro ao criar usuário:', err.message);
                        return res.json({ success: false, message: 'Erro ao criar usuário' });
                    }

                    // ============================================================
                    // 🔥 CORREÇÃO: BUSCAR O ID DO USUÁRIO
                    // ============================================================
                    let usuarioId = this?.lastID || this?.id || null;
                    console.log('✅ Usuário criado com sucesso! ID obtido:', usuarioId);

                    // Função para salvar localização
                    function salvarLocalizacao(id) {
                        const ipCliente = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || null;
                        const userAgent = req.headers['user-agent'] || null;

                        async function getLocationByIP(ipAddress) {
                            try {
                                if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1') {
                                    return { cidade: 'Localhost', estado: 'Local', pais: 'Brasil' };
                                }
                                const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,country,regionName,city,isp,lat,lon`);
                                const data = await response.json();
                                if (data.status === 'success') {
                                    return {
                                        cidade: data.city || 'Desconhecida',
                                        estado: data.regionName || 'Desconhecido',
                                        pais: data.country || 'Desconhecido',
                                        isp: data.isp || 'Desconhecido',
                                        lat: data.lat || null,
                                        lon: data.lon || null
                                    };
                                }
                                return null;
                            } catch (error) {
                                console.error('❌ Erro ao buscar localização:', error.message);
                                return null;
                            }
                        }

                        getLocationByIP(ipCliente).then(locationData => {
                            if (locationData) {
                                const sqlLocation = isProduction
                                    ? `INSERT INTO localizacoes (usuario_id, empresa_id, ip, cidade, estado, pais, isp, latitude, longitude, user_agent, created_at) 
                                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`
                                    : `INSERT INTO localizacoes (usuario_id, empresa_id, ip, cidade, estado, pais, isp, latitude, longitude, user_agent, created_at) 
                                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;

                                db.run(sqlLocation, [
                                    id,
                                    empresa_id,
                                    ipCliente,
                                    locationData.cidade || 'Desconhecida',
                                    locationData.estado || 'Desconhecido',
                                    locationData.pais || 'Desconhecido',
                                    locationData.isp || 'Desconhecido',
                                    locationData.lat || null,
                                    locationData.lon || null,
                                    userAgent
                                ], (err) => {
                                    if (err) {
                                        console.error('❌ Erro ao salvar localização:', err.message);
                                    } else {
                                        console.log(`✅ Localização salva: ${locationData.cidade}/${locationData.estado}`);
                                    }
                                });
                            }
                        });
                    }

                    // 🔥 SE O ID VEIO NULL, BUSCAR MANUALMENTE
                    if (!usuarioId) {
                        const sqlBuscarId = isProduction
                            ? `SELECT id FROM usuarios WHERE email = $1 AND empresa_id = $2 ORDER BY id DESC LIMIT 1`
                            : `SELECT id FROM usuarios WHERE email = ? AND empresa_id = ? ORDER BY id DESC LIMIT 1`;

                        db.get(sqlBuscarId, [email, empresa_id], (err, row) => {
                            if (err || !row) {
                                console.error('❌ Erro ao buscar ID do usuário:', err?.message);
                            } else {
                                usuarioId = row.id;
                                console.log('✅ ID do usuário encontrado manualmente:', usuarioId);
                                salvarLocalizacao(usuarioId);
                            }
                            // CONTINUAR O CADASTRO
                            continuarCadastro();
                        });
                    } else {
                        // SALVAR LOCALIZAÇÃO COM O ID OBTIDO
                        salvarLocalizacao(usuarioId);
                        continuarCadastro();
                    }

                    // ============================================================
                    // CONTINUAR COM O RESTANTE DO CADASTRO (HORÁRIOS, EMAILS, ETC)
                    // ============================================================
                    function continuarCadastro() {
                        console.log('📅 Inserindo horários padrão para empresa:', empresa_id);

                        const sqlDelete = isProduction
                            ? `DELETE FROM horarios_funcionamento WHERE empresa_id = $1`
                            : `DELETE FROM horarios_funcionamento WHERE empresa_id = ?`;

                        db.run(sqlDelete, [empresa_id], function (err) {
                            if (err) {
                                console.warn('⚠️ Erro ao limpar horários antigos:', err.message);
                            }

                            const diasSemana = [0, 1, 2, 3, 4, 5, 6];
                            let horariosInseridos = 0;
                            let totalErros = 0;

                            for (const dia of diasSemana) {
                                const sqlHorario = isProduction
                                    ? `
                                    INSERT INTO horarios_funcionamento 
                                    (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                                    VALUES ($1, $2, TRUE, '09:00', '18:00', '12:00', '13:00', 30)
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

                                    if (horariosInseridos + totalErros === 7) {
                                        const sqlCheck = isProduction
                                            ? `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1`
                                            : `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?`;

                                        db.get(sqlCheck, [empresa_id], (err, result) => {
                                            if (!err && result) {
                                                console.log(`📊 ${result.total} horários confirmados no banco`);
                                            }

                                            // ============================================================
                                            // 🔥 ENVIAR EMAIL DE BOAS-VINDAS
                                            // ============================================================
                                            try {
                                                const emailService = require('./server/services/email');
                                                emailService.enviarBoasVindas(email, nome, empresa_nome)
                                                    .then(result => {
                                                        if (result.success) {
                                                            console.log(`✅ Email de boas-vindas enviado para ${email}`);
                                                        } else {
                                                            console.error(`❌ Falha ao enviar email:`, result.error);
                                                        }
                                                    })
                                                    .catch(err => {
                                                        console.error('❌ Erro ao enviar email:', err.message);
                                                    });
                                            } catch (emailErr) {
                                                console.error('❌ Erro ao carregar serviço de email:', emailErr.message);
                                            }

                                            // ============================================================
                                            // 🔥 ENVIAR NOTIFICAÇÃO DE NOVO CADASTRO
                                            // ============================================================
                                            try {
                                                const emailService = require('./server/services/email');
                                                emailService.notificarNovoCadastro(
                                                    'digregorioleal@gmail.com',
                                                    nome,
                                                    empresa_nome,
                                                    telefoneLimpo,
                                                    email
                                                )
                                                    .then(result => {
                                                        if (result.success) {
                                                            console.log(`✅ Notificação de cadastro enviada para digregorioleal@gmail.com`);
                                                        } else {
                                                            console.error(`❌ Falha ao enviar notificação:`, result.error);
                                                        }
                                                    })
                                                    .catch(err => {
                                                        console.error('❌ Erro ao enviar notificação:', err.message);
                                                    });
                                            } catch (notifErr) {
                                                console.error('❌ Erro ao carregar serviço de notificação:', notifErr.message);
                                            }

                                            // ============================================================
                                            // RESPOSTA DO CADASTRO
                                            // ============================================================
                                            res.json({
                                                success: true,
                                                message: 'Cadastro realizado! Você tem 45 dias de teste.',
                                                data: {
                                                    empresa_id: empresa_id,
                                                    horarios_inseridos: horariosInseridos,
                                                    telefone_dono: telefoneLimpo
                                                }
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    }
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
            return res.json({ success: false, message: 'Empresa n�o encontrada' });
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
// ============================================
// ROTA: DADOS DA EMPRESA (CORRIGIDA)
// ============================================

app.get('/api/empresa/dados', auth, async (req, res) => {
    try {
        // 🔥 CORRIGIDO: usar req.usuario (não req.user)
        const empresaId = req.usuario.empresa_id;

        console.log(`📊 Buscando dados da empresa ${empresaId}`);
        console.log(`👤 Usuário: ${req.usuario.email}`);

        if (!empresaId) {
            console.error('❌ empresa_id não encontrado no token!');
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada no token'
            });
        }

        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        const sql = isProduction
            ? `SELECT 
                id, nome, plano, limite_profissionais, 
                trial_expira, assinatura_ativa, assinatura_valida_ate,
                agendamentos_mes, mes_referencia, 
                dias_bloqueio_geral, telefone_dono, endereco,
                whatsapp_instance, 
                whatsapp_connected, 
                whatsapp_number, 
                whatsapp_connected_at, 
                whatsapp_proprio_habilitado,
                created_at
               FROM empresas WHERE id = $1`
            : `SELECT 
                id, nome, plano, limite_profissionais, 
                trial_expira, assinatura_ativa, assinatura_valida_ate,
                agendamentos_mes, mes_referencia, 
                dias_bloqueio_geral, telefone_dono, endereco,
                whatsapp_instance, 
                whatsapp_connected, 
                whatsapp_number, 
                whatsapp_connected_at, 
                whatsapp_proprio_habilitado,
                created_at
               FROM empresas WHERE id = ?`;

        db.get(sql, [empresaId], (err, empresa) => {
            if (err) {
                console.error('❌ Erro ao buscar empresa:', err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (!empresa) {
                console.error('❌ Empresa não encontrada:', empresaId);
                return res.status(404).json({
                    success: false,
                    message: 'Empresa não encontrada'
                });
            }

            console.log(`✅ Empresa encontrada: ${empresa.nome}`);
            console.log(`📱 WhatsApp conectado: ${empresa.whatsapp_connected}`);
            console.log(`📱 Instância: ${empresa.whatsapp_instance}`);
            console.log(`📱 WhatsApp próprio habilitado: ${empresa.whatsapp_proprio_habilitado}`);

            res.json({
                success: true,
                data: empresa
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar dados da empresa:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar dados da empresa'
        });
    }
});
// ============================================================
// ?? ROTA: ATUALIZAR ENDERECO DA EMPRESA
// ============================================================
app.put('/api/empresa/endereco', auth, verificarDono, (req, res) => {
    const { endereco } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log('?? Atualizando endere�o:', { empresaId, endereco });

    const sql = isProduction
        ? `UPDATE empresas SET endereco = $1 WHERE id = $2`
        : `UPDATE empresas SET endereco = ? WHERE id = ?`;

    db.run(sql, [endereco || '', empresaId], function (err) {
        if (err) {
            console.error('? Erro ao atualizar endere�o:', err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log('? Endere�o atualizado:', endereco);
        res.json({
            success: true,
            message: '?? Endere�o atualizado com sucesso!',
            data: { endereco: endereco }
        });
    });
});

// ============================================================
// ?? ROTA: ATUALIZAR TELEFONE DO DONO
// ============================================================
app.put('/api/empresa/telefone-dono', auth, verificarDono, (req, res) => {
    const { telefone_dono } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log('?? Atualizando telefone do dono:', { empresaId, telefone_dono });

    // Remover tudo que n�o � n�mero
    const telefoneLimpo = telefone_dono ? telefone_dono.replace(/\D/g, '') : '';

    const sql = isProduction
        ? `UPDATE empresas SET telefone_dono = $1 WHERE id = $2`
        : `UPDATE empresas SET telefone_dono = ? WHERE id = ?`;

    db.run(sql, [telefoneLimpo, empresaId], function (err) {
        if (err) {
            console.error('? Erro ao atualizar telefone do dono:', err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log('? Telefone do dono atualizado:', telefoneLimpo);
        res.json({
            success: true,
            message: '?? Telefone do dono atualizado com sucesso!',
            data: { telefone_dono: telefoneLimpo }
        });
    });
});

// ============================================================
// ?? ROTA: ATUALIZAR BLOQUEIO GERAL (COM LOGS)
// ============================================================
app.put('/api/empresa/bloqueio-geral', auth, verificarDono, (req, res) => {
    const { dias_bloqueio } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log('?? ===== BLOQUEIO GERAL =====');
    console.log('?? Usu�rio:', req.usuario);
    console.log('?? Empresa ID:', empresaId);
    console.log('?? Dias bloqueio recebido:', dias_bloqueio);
    console.log('?? Body completo:', req.body);

    const diasBloqueioFinal = parseInt(dias_bloqueio) || 0;

    const sql = isProduction
        ? `UPDATE empresas SET dias_bloqueio_geral = $1 WHERE id = $2 RETURNING id`
        : `UPDATE empresas SET dias_bloqueio_geral = ? WHERE id = ?`;

    console.log('?? SQL:', sql);
    console.log('?? Par�metros:', [diasBloqueioFinal, empresaId]);

    db.run(sql, [diasBloqueioFinal, empresaId], function (err) {
        if (err) {
            console.error('? Erro ao atualizar bloqueio geral:', err.message);
            console.error('? Stack:', err.stack);
            return res.json({ success: false, message: err.message });
        }

        console.log('? Bloqueio geral atualizado para:', diasBloqueioFinal);
        console.log('? Changes:', this?.changes || 'N/A');

        // VERIFICAR SE FOI ATUALIZADO
        const sqlCheck = isProduction
            ? `SELECT dias_bloqueio_geral FROM empresas WHERE id = $1`
            : `SELECT dias_bloqueio_geral FROM empresas WHERE id = ?`;

        db.get(sqlCheck, [empresaId], (err, row) => {
            if (err) {
                console.error('? Erro ao verificar atualiza��o:', err.message);
            } else {
                console.log('?? Valor no banco ap�s update:', row);
            }
        });

        res.json({
            success: true,
            message: `Bloqueio geral atualizado para ${diasBloqueioFinal} dias!`,
            data: { dias_bloqueio: diasBloqueioFinal }
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

            // 🔥 HABILITAR AUTOMATICAMENTE WHATSAPP PRÓPRIO PARA BUSINESS/ENTERPRISE
            if (['Business', 'Enterprise', 'business', 'enterprise'].includes(plano)) {
                const sqlWhats = isProduction
                    ? 'UPDATE empresas SET whatsapp_proprio_habilitado = TRUE WHERE id = $1'
                    : 'UPDATE empresas SET whatsapp_proprio_habilitado = 1 WHERE id = ?';
                db.run(sqlWhats, [empresaId], (err) => {
                    if (err) console.error('Erro ao habilitar WhatsApp:', err);
                    else console.log(`✅ WhatsApp próprio habilitado automaticamente para empresa ${empresaId} (plano: ${plano})`);
                });
            } else {
                // Se fez downgrade, desabilitar WhatsApp próprio
                const sqlWhats = isProduction
                    ? 'UPDATE empresas SET whatsapp_proprio_habilitado = FALSE WHERE id = $1'
                    : 'UPDATE empresas SET whatsapp_proprio_habilitado = 0 WHERE id = ?';
                db.run(sqlWhats, [empresaId], (err) => {
                    if (err) console.error('Erro ao desabilitar WhatsApp:', err);
                    else console.log(`⚠️ WhatsApp próprio desabilitado para empresa ${empresaId} (plano: ${plano})`);
                });
            }

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
            return res.json({ success: false, message: 'Empresa n�o encontrada' });
        }

        if (empresa.plano === 'trial') {
            return res.json({ success: false, message: 'Voc� j� est� no plano Trial' });
        }

        const sqlHistorico = isProduction
            ? `INSERT INTO planos_historico 
               (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca)
               VALUES ($1, $2, 'cancelado', 0, 'cancelamento', $3, CURRENT_TIMESTAMP)`
            : `INSERT INTO planos_historico 
               (empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca)
               VALUES (?, ?, 'cancelado', 0, 'cancelamento', ?, CURRENT_TIMESTAMP)`;

        db.run(sqlHistorico, [empresaId, empresa.plano, motivo || 'Usu�rio cancelou assinatura'], (err) => {
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
                message: `Assinatura cancelada! Voc� tem 7 dias de acesso ao plano Trial at� ${dataTrialExpira.toLocaleDateString('pt-BR')}.`,
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
        res.json({ success: true, message: `Voltou para o plano Trial com 45 dias! V�lido at� ${dataTrialExpira.toLocaleDateString('pt-BR')}` });
    });
});
// ============================================
// 🔥 WHATSAPP PRÓPRIO - CONTROLE DO SUPER ADMIN
// ============================================

// 🔹 Habilitar/Desabilitar WhatsApp próprio de uma empresa
app.put('/api/admin/empresas/:id/whatsapp-proprio', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { habilitado } = req.body; // true ou false

    console.log(`🔧 Super Admin - ${habilitado ? 'Habilitando' : 'Desabilitando'} WhatsApp próprio da empresa ${id}`);

    const sql = isProduction
        ? 'UPDATE empresas SET whatsapp_proprio_habilitado = $1 WHERE id = $2'
        : 'UPDATE empresas SET whatsapp_proprio_habilitado = ? WHERE id = ?';

    const valor = isProduction ? habilitado : (habilitado ? 1 : 0);

    db.run(sql, [valor, id], function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log(`✅ WhatsApp próprio ${habilitado ? 'HABILITADO' : 'DESABILITADO'} para empresa ${id}`);
        res.json({
            success: true,
            message: `WhatsApp próprio ${habilitado ? 'habilitado' : 'desabilitado'} com sucesso!`
        });
    });
});

// 🔹 Listar status do WhatsApp de todas as empresas (para o Super Admin)
app.get('/api/admin/empresas/whatsapp-status', auth, verificarSuperAdmin, (req, res) => {
    const sql = isProduction
        ? `SELECT id, nome, plano, whatsapp_instance, whatsapp_connected, whatsapp_number, 
              whatsapp_proprio_habilitado, created_at
       FROM empresas 
       ORDER BY created_at DESC`
        : `SELECT id, nome, plano, whatsapp_instance, whatsapp_connected, whatsapp_number, 
              whatsapp_proprio_habilitado, created_at
       FROM empresas 
       ORDER BY created_at DESC`;

    db.all(sql, [], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao buscar status WhatsApp:', err);
            return res.json({ success: false, message: err.message });
        }

        // Formatar dados
        const dados = empresas.map(e => {
            const habilitado = e.whatsapp_proprio_habilitado === true ||
                e.whatsapp_proprio_habilitado === 1 ||
                e.whatsapp_proprio_habilitado === 't';
            const conectado = e.whatsapp_connected === true ||
                e.whatsapp_connected === 1 ||
                e.whatsapp_connected === 't';

            return {
                id: e.id,
                nome: e.nome,
                plano: e.plano,
                whatsapp_habilitado: habilitado,
                whatsapp_conectado: conectado,
                whatsapp_instancia: e.whatsapp_instance || null,
                whatsapp_numero: e.whatsapp_number || null,
                pode_habilitar: ['Business', 'Enterprise'].includes(e.plano)
            };
        });

        res.json({ success: true, data: dados });
    });
});
// ============================================
// PUT /api/admin/profissionais/:id - ATUALIZAR PROFISSIONAL
// ============================================
app.put('/api/admin/profissionais/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, comissao_percent, telefone, ativo } = req.body;

    console.log(`🔍 Super Admin - Atualizando profissional ${id}:`, { nome, email, comissao_percent, telefone });

    // Verificar se o profissional existe
    const sqlCheck = isProduction
        ? `SELECT id, empresa_id FROM profissionais WHERE id = $1`
        : `SELECT id, empresa_id FROM profissionais WHERE id = ?`;

    db.get(sqlCheck, [id], (err, profissional) => {
        if (err) {
            console.error('❌ Erro ao verificar profissional:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!profissional) {
            console.log(`❌ Profissional ID ${id} não encontrado`);
            return res.json({ success: false, message: 'Profissional não encontrado' });
        }

        // Construir query de atualização
        let query = isProduction
            ? `UPDATE profissionais SET 
               nome = COALESCE($1, nome), 
               email = COALESCE($2, email)`
            : `UPDATE profissionais SET 
               nome = COALESCE(?, nome), 
               email = COALESCE(?, email)`;

        let params = [nome || null, email || null];
        let counter = 3;

        if (comissao_percent !== undefined && comissao_percent !== null && comissao_percent !== '') {
            query += isProduction ? `, comissao_percent = $${counter++}` : `, comissao_percent = ?`;
            params.push(parseFloat(comissao_percent));
        }

        if (telefone !== undefined) {
            const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;
            query += isProduction ? `, telefone = $${counter++}` : `, telefone = ?`;
            params.push(telefoneLimpo);
        }

        if (ativo !== undefined && ativo !== null) {
            const ativoValor = isProduction ? (ativo ? 'TRUE' : 'FALSE') : (ativo ? 1 : 0);
            query += isProduction ? `, ativo = $${counter++}` : `, ativo = ?`;
            params.push(ativoValor);
        }

        if (senha && senha.trim() !== '') {
            const senhaHash = bcrypt.hashSync(senha, 10);
            query += isProduction ? `, senha = $${counter++}` : `, senha = ?`;
            params.push(senhaHash);
        }

        query += isProduction ? ` WHERE id = $${counter}` : ` WHERE id = ?`;
        params.push(id);

        console.log('📝 SQL:', query);
        console.log('📝 Params:', params);

        db.run(query, params, function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar profissional:', err);
                return res.json({ success: false, message: err.message });
            }

            console.log(`✅ Profissional ${id} atualizado com sucesso!`);
            res.json({
                success: true,
                message: 'Profissional atualizado com sucesso!'
            });
        });
    });
});

// ============================================================
// ?? ROTA: BUSCAR PROFISSIONAL (VIA SUPER ADMIN)
// ============================================================
app.get('/api/admin/profissionais/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;

    console.log(`?? Super Admin - Buscando profissional ${id}...`);

    const sql = isProduction
        ? `SELECT id, nome, email, comissao_percent, telefone, ativo, empresa_id, created_at 
           FROM profissionais 
           WHERE id = $1`
        : `SELECT id, nome, email, comissao_percent, telefone, ativo, empresa_id, created_at 
           FROM profissionais 
           WHERE id = ?`;

    db.get(sql, [id], (err, profissional) => {
        if (err) {
            console.error('? Erro ao buscar profissional:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!profissional) {
            return res.json({ success: false, message: 'Profissional n�o encontrado' });
        }

        console.log('? Profissional encontrado:', profissional.nome);
        res.json({ success: true, data: profissional });
    });
});
// ============================================
// 1. ESTAT�STICAS GERAIS (MELHORADA)
// ============================================
app.get('/api/admin/stats', auth, verificarSuperAdmin, (req, res) => {
    console.log('?? Super Admin - Buscando estat�sticas gerais...');

    // Total de empresas
    db.get(`SELECT COUNT(*) as total FROM empresas`, (err, empresas) => {
        if (err) {
            console.error('? Erro ao contar empresas:', err);
            return res.json({ success: false, message: err.message });
        }

        // Total de donos
        db.get(`SELECT COUNT(*) as total FROM usuarios WHERE role = 'dono'`, (err2, donos) => {
            if (err2) {
                console.error('? Erro ao contar donos:', err2);
                return res.json({ success: false, message: err2.message });
            }

            // Total de profissionais
            db.get(`SELECT COUNT(*) as total FROM usuarios WHERE role = 'profissional'`, (err3, profissionais) => {
                if (err3) {
                    console.error('? Erro ao contar profissionais:', err3);
                    return res.json({ success: false, message: err3.message });
                }

                // Total de clientes
                db.get(`SELECT COUNT(*) as total FROM clientes`, (err4, clientes) => {
                    if (err4) {
                        console.error('? Erro ao contar clientes:', err4);
                        return res.json({ success: false, message: err4.message });
                    }

                    // Total de agendamentos
                    db.get(`SELECT COUNT(*) as total FROM agendamentos`, (err5, agendamentos) => {
                        if (err5) {
                            console.error('? Erro ao contar agendamentos:', err5);
                            return res.json({ success: false, message: err5.message });
                        }

                        // Agendamentos do m�s
                        const mesAtual = new Date().toISOString().slice(0, 7);
                        const sqlMes = isProduction
                            ? `SELECT COUNT(*) as total FROM agendamentos WHERE TO_CHAR(data, 'YYYY-MM') = $1`
                            : `SELECT COUNT(*) as total FROM agendamentos WHERE strftime('%Y-%m', data) = ?`;

                        db.get(sqlMes, [mesAtual], (err6, agendamentosMes) => {
                            if (err6) {
                                console.error('? Erro ao contar agendamentos do m�s:', err6);
                                return res.json({ success: false, message: err6.message });
                            }

                            // Faturamento do m�s
                            const sqlFaturamento = isProduction
                                ? `SELECT SUM(valor) as total FROM agendamentos WHERE status = 'concluido' AND TO_CHAR(data, 'YYYY-MM') = $1`
                                : `SELECT SUM(valor) as total FROM agendamentos WHERE status = 'concluido' AND strftime('%Y-%m', data) = ?`;

                            db.get(sqlFaturamento, [mesAtual], (err7, faturamento) => {
                                if (err7) {
                                    console.error('? Erro ao calcular faturamento:', err7);
                                    return res.json({ success: false, message: err7.message });
                                }

                                console.log('? Estat�sticas carregadas com sucesso!');
                                res.json({
                                    success: true,
                                    data: {
                                        empresas: empresas?.total || 0,
                                        donos: donos?.total || 0,
                                        profissionais: profissionais?.total || 0,
                                        total_clientes: clientes?.total || 0,
                                        total_agendamentos: agendamentos?.total || 0,
                                        agendamentos_mes: agendamentosMes?.total || 0,
                                        faturamento_mes: faturamento?.total || 0
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

// ============================================
// 2. LISTAR EMPRESAS COM MÉTRICAS (CORRIGIDO - POSTGRESQL)
// ============================================
app.get('/api/admin/empresas', auth, verificarSuperAdmin, (req, res) => {
    console.log('🔍 Super Admin - Listando todas as empresas...');
    const ativoCond = isProduction ? 'TRUE' : '1';
    const sql = isProduction
        ? `SELECT e.*,
           u.nome as dono_nome,
           u.email as dono_email,
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'dono') as total_donos,
           (SELECT COUNT(*) FROM profissionais WHERE empresa_id = e.id AND ativo = ${ativoCond}) as total_profissionais,
           (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'concluido') as total_concluidos,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'pendente') as total_pendentes,
           COALESCE(e.whatsapp_proprio_habilitado, FALSE) as whatsapp_proprio_habilitado,
           COALESCE(e.whatsapp_connected, FALSE) as whatsapp_connected,
           e.whatsapp_instance,
           e.whatsapp_number
           FROM empresas e
           LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
           ORDER BY e.created_at DESC`
        : `SELECT e.*,
           u.nome as dono_nome,
           u.email as dono_email,
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'dono') as total_donos,
           (SELECT COUNT(*) FROM profissionais WHERE empresa_id = e.id AND ativo = 1) as total_profissionais,
           (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'concluido') as total_concluidos,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'pendente') as total_pendentes,
           COALESCE(e.whatsapp_proprio_habilitado, 0) as whatsapp_proprio_habilitado,
           COALESCE(e.whatsapp_connected, 0) as whatsapp_connected,
           e.whatsapp_instance,
           e.whatsapp_number
           FROM empresas e
           LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
           ORDER BY e.created_at DESC`;

    db.all(sql, [], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao listar empresas:', err);
            return res.json({ success: false, message: err.message });
        }
        console.log(`✅ ${empresas.length} empresas encontradas`);
        res.json({ success: true, data: empresas });
    });
});

// ============================================
// 3. LISTAR TODOS OS USUÁRIOS E PROFISSIONAIS (CORRIGIDO)
// ============================================
app.get('/api/admin/usuarios', auth, verificarSuperAdmin, (req, res) => {
    console.log('🔍 Super Admin - Listando todos os usuários e profissionais...');

    const sql = isProduction
        ? `SELECT 
            u.id, 
            u.nome, 
            u.email, 
            u.role, 
            u.empresa_id, 
            u.created_at as data_cadastro, 
            e.nome as empresa_nome,
            u.telefone,
            NULL as comissao_percent,
            'usuario' as tipo
           FROM usuarios u
           LEFT JOIN empresas e ON u.empresa_id = e.id
           
           UNION ALL
           
           SELECT 
            p.id, 
            p.nome, 
            p.email, 
            'profissional' as role,
            p.empresa_id, 
            p.created_at as data_cadastro, 
            e.nome as empresa_nome,
            p.telefone,
            p.comissao_percent,
            'profissional' as tipo
           FROM profissionais p
           LEFT JOIN empresas e ON p.empresa_id = e.id
           WHERE p.ativo = true
           
           ORDER BY data_cadastro DESC`
        : `SELECT 
            u.id, 
            u.nome, 
            u.email, 
            u.role, 
            u.empresa_id, 
            u.created_at as data_cadastro, 
            e.nome as empresa_nome,
            u.telefone,
            NULL as comissao_percent,
            'usuario' as tipo
           FROM usuarios u
           LEFT JOIN empresas e ON u.empresa_id = e.id
           
           UNION ALL
           
           SELECT 
            p.id, 
            p.nome, 
            p.email, 
            'profissional' as role,
            p.empresa_id, 
            p.created_at as data_cadastro, 
            e.nome as empresa_nome,
            p.telefone,
            p.comissao_percent,
            'profissional' as tipo
           FROM profissionais p
           LEFT JOIN empresas e ON p.empresa_id = e.id
           WHERE p.ativo = true
           
           ORDER BY data_cadastro DESC`;

    db.all(sql, [], (err, usuarios) => {
        if (err) {
            console.error('❌ Erro ao listar usuários:', err);
            return res.json({ success: false, message: err.message });
        }

        // Adicionar created_at para compatibilidade com o frontend
        const dadosFormatados = usuarios.map(u => ({
            ...u,
            created_at: u.data_cadastro
        }));

        console.log(`✅ ${dadosFormatados.length} usuários/profissionais encontrados`);
        res.json({ success: true, data: dadosFormatados });
    });
});
// ============================================
// ROTAS DO SUPER ADMIN - MÉTRICAS
// ============================================

// GET /api/admin/faturamento-mensal - Faturamento mensal dos últimos 6 meses
app.get('/api/admin/faturamento-mensal', auth, verificarSuperAdmin, (req, res) => {
    const sql = isProduction
        ? `SELECT 
            TO_CHAR(data, 'YYYY-MM') as mes,
            COALESCE(SUM(valor), 0) as total
           FROM agendamentos
           WHERE status = 'concluido'
           AND data >= CURRENT_DATE - INTERVAL '6 months'
           GROUP BY TO_CHAR(data, 'YYYY-MM')
           ORDER BY mes ASC`
        : `SELECT 
            strftime('%Y-%m', data) as mes,
            COALESCE(SUM(valor), 0) as total
           FROM agendamentos
           WHERE status = 'concluido'
           AND data >= date('now', '-6 months')
           GROUP BY strftime('%Y-%m', data)
           ORDER BY mes ASC`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar faturamento mensal:', err);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// GET /api/admin/crescimento-empresas - Crescimento de empresas por mês
app.get('/api/admin/crescimento-empresas', auth, verificarSuperAdmin, (req, res) => {
    const sql = isProduction
        ? `SELECT 
            TO_CHAR(created_at, 'YYYY-MM') as mes,
            COUNT(*) as total
           FROM empresas
           WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
           GROUP BY TO_CHAR(created_at, 'YYYY-MM')
           ORDER BY mes ASC`
        : `SELECT 
            strftime('%Y-%m', created_at) as mes,
            COUNT(*) as total
           FROM empresas
           WHERE created_at >= date('now', '-6 months')
           GROUP BY strftime('%Y-%m', created_at)
           ORDER BY mes ASC`;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar crescimento de empresas:', err);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
});
// ============================================
// 4. DETALHES DE UMA EMPRESA (CORRIGIDO)
// ============================================
app.get('/api/admin/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`?? Super Admin - Buscando empresa ${id}...`);

    // ?? CORRIGIDO: Remover u.telefone se n�o existir
    const sql = isProduction
        ? `SELECT e.*, 
           u.nome as dono_nome,
           u.email as dono_email,
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'profissional') as total_profissionais,
           (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos
           FROM empresas e
           LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
           WHERE e.id = $1`
        : `SELECT e.*, 
           u.nome as dono_nome,
           u.email as dono_email,
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'profissional') as total_profissionais,
           (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos
           FROM empresas e
           LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
           WHERE e.id = ?`;

    db.get(sql, [id], (err, empresa) => {
        if (err) {
            console.error('? Erro ao buscar empresa:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!empresa) {
            return res.json({ success: false, message: 'Empresa n�o encontrada' });
        }

        res.json({ success: true, data: empresa });
    });
});

// ============================================
// 5. USUÁRIOS E PROFISSIONAIS DE UMA EMPRESA (CORRIGIDO - POSTGRESQL)
// ============================================
app.get('/api/admin/empresas/:id/usuarios', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando usuários e profissionais da empresa ${id}...`);

    // 🔥 CORREÇÃO: PostgreSQL usa TRUE/FALSE, SQLite usa 1/0
    const ativoCond = isProduction ? 'TRUE' : '1';

    const sql = isProduction
        ? `SELECT 
            'dono' as tipo,
            u.id, 
            u.nome, 
            u.email, 
            u.role, 
            u.created_at,
            u.telefone,
            NULL as comissao_percent,
            u.empresa_id
           FROM usuarios u
           WHERE u.empresa_id = $1 AND u.role = 'dono'
           
           UNION ALL
           
           SELECT 
            'profissional' as tipo,
            p.id, 
            p.nome, 
            p.email, 
            'profissional' as role,
            p.created_at,
            p.telefone,
            p.comissao_percent,
            p.empresa_id
           FROM profissionais p
           WHERE p.empresa_id = $2 AND p.ativo = ${ativoCond}
           
           ORDER BY tipo, nome`
        : `SELECT 
            'dono' as tipo,
            u.id, 
            u.nome, 
            u.email, 
            u.role, 
            u.created_at,
            u.telefone,
            NULL as comissao_percent,
            u.empresa_id
           FROM usuarios u
           WHERE u.empresa_id = ? AND u.role = 'dono'
           
           UNION ALL
           
           SELECT 
            'profissional' as tipo,
            p.id, 
            p.nome, 
            p.email, 
            'profissional' as role,
            p.created_at,
            p.telefone,
            p.comissao_percent,
            p.empresa_id
           FROM profissionais p
           WHERE p.empresa_id = ? AND p.ativo = true
           
           ORDER BY tipo, nome`;

    db.all(sql, [id, id], (err, usuarios) => {
        if (err) {
            console.error('❌ Erro ao buscar usuários e profissionais:', err);
            return res.json({ success: false, message: err.message });
        }

        // Formatar dados
        const dadosFormatados = usuarios.map(u => {
            const { senha, ...rest } = u;
            return {
                ...rest,
                telefone: u.telefone || '-',
                comissao_percent: u.tipo === 'dono' ? null : (u.comissao_percent || 0)
            };
        });

        console.log(`✅ ${dadosFormatados.length} usuários/profissionais encontrados`);
        console.log(`   - Donos: ${dadosFormatados.filter(u => u.tipo === 'dono').length}`);
        console.log(`   - Profissionais: ${dadosFormatados.filter(u => u.tipo === 'profissional').length}`);

        res.json({ success: true, data: dadosFormatados });
    });
});
// ============================================
// ROTA: ACESSOS DE UMA EMPRESA
// ============================================
app.get('/api/admin/empresas/:id/acessos', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`?? Super Admin - Buscando acessos da empresa ${id}...`);

    const sql = isProduction
        ? `SELECT a.*, u.nome as usuario_nome
           FROM acessos a
           LEFT JOIN usuarios u ON a.usuario_id = u.id
           WHERE a.empresa_id = $1
           ORDER BY a.data_acesso DESC
           LIMIT 50`
        : `SELECT a.*, u.nome as usuario_nome
           FROM acessos a
           LEFT JOIN usuarios u ON a.usuario_id = u.id
           WHERE a.empresa_id = ?
           ORDER BY a.data_acesso DESC
           LIMIT 50`;

    db.all(sql, [id], (err, acessos) => {
        if (err) {
            console.error('? Erro ao buscar acessos:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log(`? ${acessos.length} acessos encontrados`);
        res.json({ success: true, data: acessos });
    });
});
// ============================================
// ROTA: ESTAT�STICAS DAS EMPRESAS (SIMPLES E CONFI�VEL)
// ============================================
app.get('/api/admin/empresas/estatisticas', auth, verificarSuperAdmin, (req, res) => {
    console.log('?? Super Admin - Buscando empresas com estat�sticas...');

    // Primeiro, buscar todas as empresas
    const sqlEmpresas = isProduction
        ? `SELECT * FROM empresas ORDER BY created_at DESC`
        : `SELECT * FROM empresas ORDER BY created_at DESC`;

    db.all(sqlEmpresas, [], (err, empresas) => {
        if (err) {
            console.error('? Erro ao buscar empresas:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log(`?? ${empresas.length} empresas encontradas`);

        // Para cada empresa, buscar as m�tricas separadamente
        const promises = empresas.map((e) => {
            return new Promise((resolve) => {
                // Buscar total de usu�rios
                const sqlUsuarios = isProduction
                    ? `SELECT COUNT(*) as total FROM usuarios WHERE empresa_id = $1`
                    : `SELECT COUNT(*) as total FROM usuarios WHERE empresa_id = ?`;

                db.get(sqlUsuarios, [e.id], (err, usuarios) => {
                    // Buscar total de profissionais
                    const sqlProfissionais = isProduction
                        ? `SELECT COUNT(*) as total FROM profissionais WHERE empresa_id = $1 AND ativo = true`
                        : `SELECT COUNT(*) as total FROM profissionais WHERE empresa_id = ? AND ativo = true`;

                    db.get(sqlProfissionais, [e.id], (err, profissionais) => {
                        // Buscar total de clientes
                        const sqlClientes = isProduction
                            ? `SELECT COUNT(*) as total FROM clientes WHERE empresa_id = $1`
                            : `SELECT COUNT(*) as total FROM clientes WHERE empresa_id = ?`;

                        db.get(sqlClientes, [e.id], (err, clientes) => {
                            // Buscar total de agendamentos
                            const sqlAgendamentos = isProduction
                                ? `SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = $1`
                                : `SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?`;

                            db.get(sqlAgendamentos, [e.id], (err, agendamentos) => {
                                // Buscar total de acessos
                                const sqlAcessos = isProduction
                                    ? `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = $1`
                                    : `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = ?`;

                                db.get(sqlAcessos, [e.id], (err, acessos) => {
                                    // Buscar �ltimo acesso
                                    const sqlUltimoAcesso = isProduction
                                        ? `SELECT data_acesso FROM acessos WHERE empresa_id = $1 ORDER BY data_acesso DESC LIMIT 1`
                                        : `SELECT data_acesso FROM acessos WHERE empresa_id = ? ORDER BY data_acesso DESC LIMIT 1`;

                                    db.get(sqlUltimoAcesso, [e.id], (err, ultimoAcesso) => {
                                        // Buscar acessos hoje
                                        const sqlAcessosHoje = isProduction
                                            ? `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = $1 AND DATE(data_acesso) = CURRENT_DATE`
                                            : `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = ? AND DATE(data_acesso) = DATE('now')`;

                                        db.get(sqlAcessosHoje, [e.id], (err, acessosHoje) => {
                                            // Calcular dias restantes do trial
                                            let diasRestantes = null;
                                            if (e.plano === 'trial' && e.trial_expira) {
                                                const hoje = new Date();
                                                const expira = new Date(e.trial_expira);
                                                diasRestantes = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
                                            }

                                            resolve({
                                                ...e,
                                                total_usuarios: usuarios?.total || 0,
                                                total_profissionais: profissionais?.total || 0,
                                                total_clientes: clientes?.total || 0,
                                                total_agendamentos: agendamentos?.total || 0,
                                                total_acessos: acessos?.total || 0,
                                                ultimo_acesso: ultimoAcesso?.data_acesso || null,
                                                acessos_hoje: acessosHoje?.total || 0,
                                                dias_restantes_trial: diasRestantes,
                                                ultimo_acesso_formatado: ultimoAcesso?.data_acesso ?
                                                    new Date(ultimoAcesso.data_acesso).toLocaleString('pt-BR') : 'Nunca'
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        Promise.all(promises).then((empresasCompletas) => {
            console.log(`? ${empresasCompletas.length} empresas com estat�sticas carregadas`);
            res.json({ success: true, data: empresasCompletas });
        });
    });
});


// Fun��o auxiliar para formatar data/hora
function formatarDataHora(dataStr) {
    if (!dataStr) return 'Nunca';
    try {
        const data = new Date(dataStr);
        if (isNaN(data.getTime())) return 'Nunca';
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dataStr;
    }
}

// ============================================
// 6. CLIENTES DE UMA EMPRESA
// ============================================
app.get('/api/admin/empresas/:id/clientes', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`?? Super Admin - Buscando clientes da empresa ${id}...`);

    const sql = isProduction
        ? `SELECT id, nome, telefone, email, created_at, bloqueado_chatbot 
           FROM clientes 
           WHERE empresa_id = $1 
           ORDER BY created_at DESC`
        : `SELECT id, nome, telefone, email, created_at, bloqueado_chatbot 
           FROM clientes 
           WHERE empresa_id = ? 
           ORDER BY created_at DESC`;

    db.all(sql, [id], (err, clientes) => {
        if (err) {
            console.error('? Erro ao buscar clientes:', err);
            return res.json({ success: false, message: err.message });
        }

        res.json({ success: true, data: clientes });
    });
});

// ============================================
// 7. AGENDAMENTOS DE UMA EMPRESA
// ============================================
app.get('/api/admin/empresas/:id/agendamentos', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`?? Super Admin - Buscando agendamentos da empresa ${id}...`);

    const sql = isProduction
        ? `SELECT a.*, 
           c.nome as cliente_nome,
           p.nome as profissional_nome,
           s.nome as servico_nome,
           to_char(a.data, 'YYYY-MM-DD') as data_formatada
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = $1 
           ORDER BY a.data DESC, a.hora DESC
           LIMIT 50`
        : `SELECT a.*, 
           c.nome as cliente_nome,
           p.nome as profissional_nome,
           s.nome as servico_nome,
           date(a.data) as data_formatada
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = ? 
           ORDER BY a.data DESC, a.hora DESC
           LIMIT 50`;

    db.all(sql, [id], (err, agendamentos) => {
        if (err) {
            console.error('? Erro ao buscar agendamentos:', err);
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
// 8. ATUALIZAR EMPRESA
// ============================================
app.put('/api/admin/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, plano } = req.body;
    console.log(`?? Super Admin - Atualizando empresa ${id}:`, { nome, plano });

    if (!nome) {
        return res.json({ success: false, message: 'Nome da empresa � obrigat�rio' });
    }

    const sql = isProduction
        ? `UPDATE empresas SET nome = $1, plano = $2 WHERE id = $3`
        : `UPDATE empresas SET nome = ?, plano = ? WHERE id = ?`;

    db.run(sql, [nome, plano || 'trial', id], function (err) {
        if (err) {
            console.error('? Erro ao atualizar empresa:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log('? Empresa atualizada com sucesso!');
        res.json({ success: true, message: 'Empresa atualizada com sucesso' });
    });
});

// ============================================
// 🗑️ DELETE /api/admin/empresas/:id - EXCLUIR EMPRESA (SUPER ADMIN)
// ============================================
app.delete('/api/admin/empresas/:id', auth, verificarSuperAdmin, async (req, res) => {
    const { id } = req.params;

    console.log(`🗑️ Super Admin - Deletando empresa ID: ${id}...`);

    try {
        // 1. VERIFICAR SE A EMPRESA EXISTE
        const sqlCheck = isProduction
            ? `SELECT id, nome FROM empresas WHERE id = $1`
            : `SELECT id, nome FROM empresas WHERE id = ?`;

        const empresa = await new Promise((resolve, reject) => {
            db.get(sqlCheck, [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        console.log(`📌 Empresa encontrada: "${empresa.nome}" (ID: ${id})`);

        // 2. EXCLUIR EM CASCATA (TUDO RELACIONADO)
        const queries = [];

        if (isProduction) {
            // PostgreSQL
            queries.push(
                `DELETE FROM agendamentos WHERE empresa_id = $1`,
                `DELETE FROM clientes WHERE empresa_id = $1`,
                `DELETE FROM profissionais WHERE empresa_id = $1`,
                `DELETE FROM servicos WHERE empresa_id = $1`,
                `DELETE FROM horarios_funcionamento WHERE empresa_id = $1`,
                `DELETE FROM despesas WHERE empresa_id = $1`,
                `DELETE FROM acessos WHERE empresa_id = $1`,
                `DELETE FROM planos_historico WHERE empresa_id = $1`,
                `DELETE FROM transacoes_pagamento WHERE empresa_id = $1`,
                `DELETE FROM usuarios WHERE empresa_id = $1`,
                `DELETE FROM empresas WHERE id = $1`
            );
        } else {
            // SQLite
            queries.push(
                `DELETE FROM agendamentos WHERE empresa_id = ?`,
                `DELETE FROM clientes WHERE empresa_id = ?`,
                `DELETE FROM profissionais WHERE empresa_id = ?`,
                `DELETE FROM servicos WHERE empresa_id = ?`,
                `DELETE FROM horarios_funcionamento WHERE empresa_id = ?`,
                `DELETE FROM despesas WHERE empresa_id = ?`,
                `DELETE FROM acessos WHERE empresa_id = ?`,
                `DELETE FROM planos_historico WHERE empresa_id = ?`,
                `DELETE FROM transacoes_pagamento WHERE empresa_id = ?`,
                `DELETE FROM usuarios WHERE empresa_id = ?`,
                `DELETE FROM empresas WHERE id = ?`
            );
        }

        // Executar todas as queries em sequência
        for (const sql of queries) {
            await new Promise((resolve, reject) => {
                db.run(sql, [id], (err) => {
                    if (err) {
                        console.error('❌ Erro ao deletar dados:', err.message);
                        reject(err);
                    }
                    resolve();
                });
            });
        }

        console.log(`✅ Empresa "${empresa.nome}" (ID: ${id}) deletada com sucesso!`);

        res.json({
            success: true,
            message: `Empresa "${empresa.nome}" deletada com sucesso!`
        });

    } catch (error) {
        console.error('❌ Erro ao deletar empresa:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar empresa: ' + error.message
        });
    }
});
// ============================================
// GET /api/admin/empresas/:id/localizacao - BUSCAR LOCALIZAÇÃO
// ============================================
app.get('/api/admin/empresas/:id/localizacao', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;

    console.log(`📍 Buscando localização da empresa ${id}...`);

    // Verificar se a tabela localizacoes existe
    const sqlCheck = isProduction
        ? `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'localizacoes'
        )`
        : `SELECT name FROM sqlite_master WHERE type='table' AND name='localizacoes'`;

    db.get(sqlCheck, [], (err, tableExists) => {
        if (err) {
            console.error('❌ Erro ao verificar tabela localizacoes:', err.message);
            // Se a tabela não existir, retornar dados vazios
            return res.json({ success: true, data: {} });
        }

        // Verificar se a tabela existe
        let existe = false;
        if (isProduction) {
            existe = tableExists?.exists || false;
        } else {
            existe = !!tableExists;
        }

        if (!existe) {
            console.log('⚠️ Tabela localizacoes não encontrada');
            return res.json({ success: true, data: {} });
        }

        // Buscar a localização da empresa
        const sqlLocation = isProduction
            ? `SELECT * FROM localizacoes WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT 1`
            : `SELECT * FROM localizacoes WHERE empresa_id = ? ORDER BY created_at DESC LIMIT 1`;

        db.get(sqlLocation, [id], (err, localizacao) => {
            if (err) {
                console.error('❌ Erro ao buscar localização:', err.message);
                return res.json({ success: true, data: {} });
            }

            if (!localizacao) {
                console.log(`📍 Nenhuma localização encontrada para empresa ${id}`);
                return res.json({ success: true, data: {} });
            }

            console.log(`📍 Localização encontrada: ${localizacao.cidade}/${localizacao.estado}`);
            res.json({ success: true, data: localizacao });
        });
    });
});
// ============================================
// 9. BUSCAR USUÁRIO PARA EDIÇÃO (CORRIGIDO)
// ============================================
app.get('/api/admin/usuarios/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando usuário ${id}...`);

    // Primeiro, buscar na tabela usuarios
    const sqlUsuario = isProduction
        ? `SELECT id, nome, email, role, empresa_id, created_at, telefone 
           FROM usuarios 
           WHERE id = $1`
        : `SELECT id, nome, email, role, empresa_id, created_at, telefone 
           FROM usuarios 
           WHERE id = ?`;

    db.get(sqlUsuario, [id], (err, usuario) => {
        if (err) {
            console.error('❌ Erro ao buscar usuário:', err);
            return res.json({ success: false, message: err.message });
        }

        // Se encontrou na tabela usuarios, retorna
        if (usuario) {
            delete usuario.senha;

            // Se for profissional, buscar comissão
            if (usuario.role === 'profissional') {
                const sqlProf = isProduction
                    ? `SELECT comissao_percent FROM profissionais WHERE email = $1`
                    : `SELECT comissao_percent FROM profissionais WHERE email = ?`;

                db.get(sqlProf, [usuario.email], (err, prof) => {
                    usuario.comissao_percent = (prof?.comissao_percent || 30);
                    console.log('✅ Usuário encontrado:', usuario.nome);
                    res.json({ success: true, data: usuario });
                });
            } else {
                usuario.comissao_percent = null;
                console.log('✅ Usuário encontrado:', usuario.nome);
                res.json({ success: true, data: usuario });
            }
            return;
        }

        // Se não encontrou na tabela usuarios, buscar na tabela profissionais
        console.log(`🔍 Usuário ${id} não encontrado em usuarios, buscando em profissionais...`);

        const sqlProfissional = isProduction
            ? `SELECT id, nome, email, 'profissional' as role, empresa_id, created_at, telefone, comissao_percent
               FROM profissionais 
               WHERE id = $1 AND ativo = TRUE`
            : `SELECT id, nome, email, 'profissional' as role, empresa_id, created_at, telefone, comissao_percent
               FROM profissionais 
               WHERE id = ? AND ativo = true`;

        db.get(sqlProfissional, [id], (err, profissional) => {
            if (err) {
                console.error('❌ Erro ao buscar profissional:', err);
                return res.json({ success: false, message: err.message });
            }

            if (!profissional) {
                console.log(`❌ Usuário ${id} não encontrado em nenhuma tabela`);
                return res.json({ success: false, message: 'Usuário não encontrado' });
            }

            console.log('✅ Profissional encontrado:', profissional.nome);
            res.json({ success: true, data: profissional });
        });
    });
});
// ============================================
// PUT /api/admin/usuarios/:id - ATUALIZAR USU�RIO (COM TELEFONE DA EMPRESA)
// ============================================
app.put('/api/admin/usuarios/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, email, role, senha, telefone } = req.body;

    console.log(`?? Super Admin - Atualizando usu�rio ${id}:`, { nome, email, role, telefone });

    // ?? BUSCAR O USU�RIO ATUAL
    const sqlCheck = isProduction
        ? `SELECT id, empresa_id, role FROM usuarios WHERE id = $1`
        : `SELECT id, empresa_id, role FROM usuarios WHERE id = ?`;

    db.get(sqlCheck, [id], (err, usuario) => {
        if (err) {
            console.error('? Erro ao verificar usu�rio:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!usuario) {
            return res.json({ success: false, message: 'Usu�rio n�o encontrado' });
        }

        // ============================================
        // ATUALIZAR USU�RIO
        // ============================================
        let query = isProduction
            ? `UPDATE usuarios SET 
               nome = COALESCE($1, nome), 
               email = COALESCE($2, email),
               role = COALESCE($3, role)`
            : `UPDATE usuarios SET 
               nome = COALESCE(?, nome), 
               email = COALESCE(?, email),
               role = COALESCE(?, role)`;

        let params = [nome || null, email || null, role || null];
        let counter = 4;

        // ?? SALVAR TELEFONE DO USU�RIO
        if (telefone !== undefined) {
            const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;
            query += isProduction ? `, telefone = $${counter++}` : `, telefone = ?`;
            params.push(telefoneLimpo);
        }

        if (senha && senha.trim() !== '') {
            const senhaHash = bcrypt.hashSync(senha, 10);
            query += isProduction ? `, senha = $${counter++}` : `, senha = ?`;
            params.push(senhaHash);
        }

        query += isProduction ? ` WHERE id = $${counter++}` : ` WHERE id = ?`;
        params.push(id);

        db.run(query, params, function (err) {
            if (err) {
                console.error('? Erro ao atualizar usu�rio:', err);
                return res.json({ success: false, message: err.message });
            }

            // ============================================
            // ?????? CORRE��O: SE FOR DONO, ATUALIZAR O TELEFONE NA EMPRESA
            // ============================================
            const novaRole = role || usuario.role;
            const empresaId = usuario.empresa_id;
            const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

            if (novaRole === 'dono' && telefoneLimpo && empresaId) {
                console.log(`?? Atualizando telefone do dono na empresa ${empresaId}: ${telefoneLimpo}`);

                const sqlEmpresa = isProduction
                    ? `UPDATE empresas SET telefone_dono = $1 WHERE id = $2`
                    : `UPDATE empresas SET telefone_dono = ? WHERE id = ?`;

                db.run(sqlEmpresa, [telefoneLimpo, empresaId], function (err) {
                    if (err) {
                        console.error('? Erro ao atualizar telefone da empresa:', err);
                    } else {
                        console.log(`? Telefone do dono atualizado na empresa ${empresaId}: ${telefoneLimpo}`);
                    }
                });
            }

            console.log('? Usu�rio atualizado com sucesso!');
            res.json({
                success: true,
                message: 'Usu�rio atualizado com sucesso!'
            });
        });
    });
});
// ============================================
// EDITAR USU�RIO (COM TELEFONE - ATUALIZADO)
// ============================================

async function editarUsuario(id) {
    console.log('?? Editando usu�rio ID:', id);

    if (!id) {
        showToast('ID do usu�rio n�o informado', 'error');
        return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
        showToast('Token n�o encontrado. Fa�a login novamente.', 'error');
        return;
    }

    showLoading();

    try {
        // ?? PRIMEIRO, BUSCAR O USU�RIO PARA SABER O ROLE
        const resUser = await fetch(`/api/admin/usuarios/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!resUser.ok) {
            throw new Error(`HTTP ${resUser.status}: ${resUser.statusText}`);
        }

        const userData = await resUser.json();
        console.log('?? Dados do usu�rio:', userData);

        hideLoading();

        if (!userData.success || !userData.data) {
            showToast('Usu�rio n�o encontrado', 'error');
            return;
        }

        const usuario = userData.data;
        console.log('?? Usu�rio carregado:', usuario.nome, 'Role:', usuario.role);

        // ?? DECIDIR A ROTA BASEADA NO ROLE, N�O NO ID!
        let url;
        if (usuario.role === 'profissional') {
            url = `/api/admin/profissionais/${id}`;  // ? ROTA PARA PROFISSIONAL
        } else {
            url = `/api/admin/usuarios/${id}`;       // ? ROTA PARA DONO/SUPERADMIN
        }

        console.log(`?? Buscando ${url}...`);

        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log('?? Dados recebidos:', data);

        if (!data.success) {
            showToast(data.message || 'Erro ao carregar usu�rio', 'error');
            return;
        }

        if (!data.data) {
            showToast('Usu�rio n�o encontrado', 'error');
            return;
        }

        const usuarioCompleto = data.data;
        console.log('?? Usu�rio carregado:', usuarioCompleto.nome);

        // ?? DETECTAR SE � PROFISSIONAL OU USU�RIO
        const isProfissional = usuarioCompleto.role === 'profissional';

        // ?? PEGAR O TELEFONE (se existir)
        const telefone = usuarioCompleto.telefone || '';

        const modalContent = `
            <div style="padding: 10px 0;">
                <form id="formEditarUsuario" style="display:flex;flex-direction:column;gap:12px;">
                    <input type="hidden" id="editUsuarioId" value="${usuarioCompleto.id}">
                    <input type="hidden" id="editUsuarioTipo" value="${isProfissional ? 'profissional' : 'usuario'}">
                    
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="editUsuarioNome" class="form-control" value="${escapeHtml(usuarioCompleto.nome || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="editUsuarioEmail" class="form-control" value="${escapeHtml(usuarioCompleto.email || '')}" required>
                    </div>
                    
                    <!-- ?? CAMPO TELEFONE PARA TODOS OS USU�RIOS -->
                    <div class="form-group">
                        <label>?? Telefone</label>
                        <input type="text" id="editUsuarioTelefone" class="form-control" value="${escapeHtml(telefone)}" placeholder="(11) 99999-9999">
                        <small style="color:var(--text-muted);font-size:11px;">Este n�mero aparecer� nas mensagens do WhatsApp</small>
                    </div>
                    
                    ${isProfissional ? `
                        <div class="form-group">
                            <label>Comiss�o (%)</label>
                            <input type="number" id="editUsuarioComissao" class="form-control" value="${usuarioCompleto.comissao_percent || 30}" min="0" max="100">
                            <small style="color:var(--text-muted);font-size:11px;">Percentual de comiss�o para profissionais</small>
                        </div>
                    ` : `
                        <div class="form-group">
                            <label>Role (Fun��o)</label>
                            <select id="editUsuarioRole" class="form-control">
                                <option value="dono" ${usuarioCompleto.role === 'dono' ? 'selected' : ''}>?? Dono</option>
                                <option value="profissional" ${usuarioCompleto.role === 'profissional' ? 'selected' : ''}>?? Profissional</option>
                                <option value="superadmin" ${usuarioCompleto.role === 'superadmin' ? 'selected' : ''}>?? Super Admin</option>
                            </select>
                            <small style="color:var(--text-muted);font-size:11px;">Alterar role pode afetar permiss�es do usu�rio</small>
                        </div>
                    `}
                    
                    <div class="form-group">
                        <label>Nova Senha (opcional)</label>
                        <input type="text" id="editUsuarioSenha" class="form-control" placeholder="Digite nova senha (m�nimo 6 caracteres)">
                        <small style="color:var(--text-muted);font-size:11px;">Deixe em branco para manter a senha atual</small>
                    </div>
                    
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <button type="submit" class="btn-3d" style="flex:1;">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button type="button" onclick="fecharModalEditarUsuario()" class="btn-secondary">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        showModal('?? Editar Usu�rio', modalContent, null);

        setTimeout(() => {
            const form = document.getElementById('formEditarUsuario');
            if (form) {
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);

                newForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    salvarUsuario();
                });

                console.log('? Formul�rio de usu�rio conectado!');
            }
        }, 200);

    } catch (error) {
        hideLoading();
        console.error('? Erro ao editar usu�rio:', error);
        showToast('Erro ao carregar dados do usu�rio: ' + error.message, 'error');
    }
}

// ============================================
// 11. ESTENDER TRIAL (MANTIDO)
// ============================================
app.post('/api/admin/empresas/:id/extender-trial', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`?? Super Admin - Estendendo trial da empresa ${id}...`);

    const dataTrialExpira = new Date();
    dataTrialExpira.setDate(dataTrialExpira.getDate() + 45);
    const dataStr = dataTrialExpira.toISOString().split('T')[0];

    const sql = isProduction
        ? `UPDATE empresas SET trial_expira = $1, assinatura_ativa = 0, plano = 'trial' WHERE id = $2`
        : `UPDATE empresas SET trial_expira = ?, assinatura_ativa = 0, plano = 'trial' WHERE id = ?`;

    db.run(sql, [dataStr, id], function (err) {
        if (err) {
            console.error('? Erro ao estender trial:', err);
            return res.json({ success: false, message: 'Erro ao estender trial' });
        }

        console.log(`? Trial estendido at� ${dataStr}`);
        res.json({
            success: true,
            message: `Trial estendido por mais 45 dias! Nova data: ${dataTrialExpira.toLocaleDateString('pt-BR')}`,
            data: { nova_data: dataStr }
        });
    });
});
// ============================================
// ROTA: BUSCAR PROFISSIONAL (VIA SUPER ADMIN)
// ============================================
app.get('/api/admin/profissionais/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;

    console.log(`🔍 Super Admin - Buscando profissional ${id}...`);

    const ativoCond = isProduction ? 'TRUE' : '1';

    const sql = isProduction
        ? `SELECT id, nome, email, comissao_percent, telefone, ativo, empresa_id, created_at 
           FROM profissionais 
           WHERE id = $1 AND ativo = ${ativoCond}`
        : `SELECT id, nome, email, comissao_percent, telefone, ativo, empresa_id, created_at 
           FROM profissionais 
           WHERE id = ? AND ativo = true`;

    db.get(sql, [id], (err, profissional) => {
        if (err) {
            console.error('❌ Erro ao buscar profissional:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!profissional) {
            console.log(`❌ Profissional ID ${id} não encontrado`);
            return res.json({ success: false, message: 'Profissional não encontrado' });
        }

        // Adicionar role para compatibilidade com o frontend
        profissional.role = 'profissional';

        console.log(`✅ Profissional encontrado: ${profissional.nome} (ID: ${profissional.id})`);
        res.json({ success: true, data: profissional });
    });
});

// ============================================================
// ?? ROTA: ATUALIZAR PROFISSIONAL (VIA SUPER ADMIN)
// ============================================================
app.put('/api/admin/profissionais/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, comissao_percent, telefone, ativo } = req.body;

    console.log(`?? Super Admin - Atualizando profissional ${id}:`, { nome, email, comissao_percent });

    // Verificar se o profissional existe
    const sqlCheck = isProduction
        ? `SELECT id, empresa_id FROM profissionais WHERE id = $1`
        : `SELECT id, empresa_id FROM profissionais WHERE id = ?`;

    db.get(sqlCheck, [id], (err, profissional) => {
        if (err) {
            console.error('? Erro ao verificar profissional:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!profissional) {
            console.log(`? Profissional ID ${id} n�o encontrado para atualizar`);
            return res.json({ success: false, message: 'Profissional n�o encontrado' });
        }

        // Construir query de atualiza��o
        let query = isProduction
            ? `UPDATE profissionais SET 
               nome = COALESCE($1, nome), 
               email = COALESCE($2, email)`
            : `UPDATE profissionais SET 
               nome = COALESCE(?, nome), 
               email = COALESCE(?, email)`;

        let params = [nome || null, email || null];
        let counter = 3;

        if (comissao_percent !== undefined && comissao_percent !== null && comissao_percent !== '') {
            query += isProduction ? `, comissao_percent = $${counter++}` : `, comissao_percent = ?`;
            params.push(parseFloat(comissao_percent));
        }

        if (telefone !== undefined) {
            const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;
            query += isProduction ? `, telefone = $${counter++}` : `, telefone = ?`;
            params.push(telefoneLimpo);
        }

        if (ativo !== undefined && ativo !== null) {
            query += isProduction ? `, ativo = $${counter++}` : `, ativo = ?`;
            params.push(ativo ? 1 : 0);
        }

        if (senha && senha.trim() !== '') {
            const senhaHash = bcrypt.hashSync(senha, 10);
            query += isProduction ? `, senha = $${counter++}` : `, senha = ?`;
            params.push(senhaHash);
        }

        query += isProduction ? ` WHERE id = $${counter++}` : ` WHERE id = ?`;
        params.push(id);

        db.run(query, params, function (err) {
            if (err) {
                console.error('? Erro ao atualizar profissional:', err);
                return res.json({ success: false, message: err.message });
            }

            console.log(`? Profissional ${id} atualizado com sucesso!`);
            res.json({
                success: true,
                message: 'Profissional atualizado com sucesso!'
            });
        });
    });
});
// ============================================
// 12. CONTAGEM DE ACESSOS (OPCIONAL)
// ============================================
// Criar tabela de acessos se n�o existir
const sqlCriarAcessos = isProduction
    ? `CREATE TABLE IF NOT EXISTS acessos (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        empresa_id INTEGER,
        data_acesso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip VARCHAR(45),
        user_agent TEXT
    )`
    : `CREATE TABLE IF NOT EXISTS acessos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        empresa_id INTEGER,
        data_acesso DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip VARCHAR(45),
        user_agent TEXT
    )`;

db.run(sqlCriarAcessos, [], (err) => {
    if (err) {
        console.error('? Erro ao criar tabela acessos:', err);
    } else {
        console.log('? Tabela acessos verificada/criada');
    }
});

// Rota para registrar acesso (chamada no login)
app.post('/api/admin/registrar-acesso', auth, (req, res) => {
    const usuario_id = req.usuario.id;
    const empresa_id = req.usuario.empresa_id || null;
    const ip = req.ip || req.connection.remoteAddress || null;
    const user_agent = req.headers['user-agent'] || null;

    const sql = isProduction
        ? `INSERT INTO acessos (usuario_id, empresa_id, ip, user_agent) VALUES ($1, $2, $3, $4)`
        : `INSERT INTO acessos (usuario_id, empresa_id, ip, user_agent) VALUES (?, ?, ?, ?)`;

    db.run(sql, [usuario_id, empresa_id, ip, user_agent], (err) => {
        if (err) {
            console.error('? Erro ao registrar acesso:', err);
        }
        res.json({ success: true });
    });
});

// Rota para estat�sticas de acessos
app.get('/api/admin/acessos', auth, verificarSuperAdmin, (req, res) => {
    const sql = isProduction
        ? `SELECT 
            COUNT(*) as total_acessos,
            COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
            COUNT(DISTINCT empresa_id) as total_empresas_ativas,
            date(data_acesso) as data
           FROM acessos
           WHERE data_acesso >= datetime('now', '-30 days')
           GROUP BY date(data_acesso)
           ORDER BY data DESC`
        : `SELECT 
            COUNT(*) as total_acessos,
            COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
            COUNT(DISTINCT empresa_id) as total_empresas_ativas,
            date(data_acesso) as data
           FROM acessos
           WHERE data_acesso >= datetime('now', '-30 days')
           GROUP BY date(data_acesso)
           ORDER BY data DESC`;

    db.all(sql, [], (err, acessos) => {
        if (err) {
            console.error('? Erro ao buscar acessos:', err);
            return res.json({ success: false, message: err.message });
        }

        // Totais gerais
        const sqlTotais = isProduction
            ? `SELECT 
                COUNT(*) as total_acessos,
                COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
                COUNT(DISTINCT empresa_id) as total_empresas_ativas
               FROM acessos
               WHERE data_acesso >= datetime('now', '-30 days')`
            : `SELECT 
                COUNT(*) as total_acessos,
                COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
                COUNT(DISTINCT empresa_id) as total_empresas_ativas
               FROM acessos
               WHERE data_acesso >= datetime('now', '-30 days')`;

        db.get(sqlTotais, [], (err, totais) => {
            if (err) {
                console.error('? Erro ao buscar totais de acessos:', err);
                return res.json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                data: {
                    ultimos_30_dias: acessos || [],
                    totais: totais || { total_acessos: 0, total_usuarios_ativos: 0, total_empresas_ativas: 0 }
                }
            });
        });
    });
});
// ============================================
// PLANOS - GESTÃO (SUPER ADMIN)
// ============================================

// GET /api/admin/planos-config - Buscar configuração dos planos
app.get('/api/admin/planos-config', auth, verificarSuperAdmin, (req, res) => {
    try {
        const planos = require('./server/utils/constants').PLANOS;
        res.json({ success: true, data: planos });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// PUT /api/admin/planos-config - Atualizar plano
app.put('/api/admin/planos-config', auth, verificarSuperAdmin, (req, res) => {
    try {
        const plano = req.body;
        // Validar dados
        if (!plano.id || !plano.nome || !plano.valor_mensal) {
            return res.json({ success: false, message: 'Dados incompletos' });
        }
        // Atualizar no arquivo de constantes
        const fs = require('fs');
        const path = require('path');
        const constantsPath = path.join(__dirname, 'server/utils/constants.js');
        // ... lógica para atualizar o arquivo
        res.json({ success: true, message: 'Plano atualizado!' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});
console.log('? Super Admin - Todas as rotas carregadas com sucesso!');
// ============================================================
// SERVI�OS
// ============================================================

app.get('/api/servicos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id) return res.json({ success: true, data: [] });

    const sql = isProduction
        ? `SELECT * FROM servicos WHERE empresa_id = $1 AND ativo = true ORDER BY nome`
        : `SELECT * FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome`;

    db.all(sql, [empresa_id], (err, servicos) => {
        if (err) {
            console.error('? Erro ao buscar servi�os:', err.message);
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
            console.error('? Erro ao buscar todos servi�os:', err.message);
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

    // 🔥 CONVERTER para o formato correto
    const ativoValue = isProduction ? true : 1;

    const sql = isProduction
        ? `INSERT INTO servicos (nome, descricao, valor, duracao, empresa_id, ativo) 
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
        : `INSERT INTO servicos (nome, descricao, valor, duracao, empresa_id, ativo) 
           VALUES (?, ?, ?, ?, ?, ?)`;

    const params = [nome, descricao || '', valor, duracao || 30, empresa_id, ativoValue];

    db.run(sql, params, function (err) {
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

    // 🔥 CONVERTER ativo para o formato correto
    let ativoValue = ativo;
    if (isProduction) {
        // PostgreSQL espera true/false
        if (typeof ativo === 'boolean') ativoValue = ativo;
        else if (typeof ativo === 'number') ativoValue = ativo === 1;
        else if (typeof ativo === 'string') ativoValue = ativo === '1' || ativo === 'true';
        else ativoValue = false;
    } else {
        // SQLite espera 1/0
        if (typeof ativo === 'boolean') ativoValue = ativo ? 1 : 0;
        else if (typeof ativo === 'number') ativoValue = ativo;
        else if (typeof ativo === 'string') ativoValue = (ativo === '1' || ativo === 'true') ? 1 : 0;
        else ativoValue = 0;
    }

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

    db.run(sql, [nome, descricao, valor, duracao, ativoValue, id, empresa_id], function (err) {
        if (err) {
            console.error('❌ Erro ao editar serviço:', err.message);
            return res.json({ success: false, message: err.message });
        }

        if (this.changes === 0) {
            return res.json({ success: false, message: 'Serviço não encontrado' });
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
            // 🔥 CONVERTER para booleano no PostgreSQL
            const ativoValue = isProduction ? false : 0;

            const sqlUpdate = isProduction
                ? `UPDATE servicos SET ativo = $1 WHERE id = $2 AND empresa_id = $3`
                : `UPDATE servicos SET ativo = ? WHERE id = ? AND empresa_id = ?`;

            db.run(sqlUpdate, [ativoValue, id, empresa_id], (err) => {
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
            console.error('? Erro ao buscar profissionais:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: profissionais });
    });
});

app.post('/api/profissionais', auth, verificarDono, verificarLimiteProfissionais, (req, res) => {
    const { nome, email, comissao_percent, senha, telefone } = req.body;
    const empresa_id = req.usuario.empresa_id;

    if (!nome || !email) {
        return res.json({ success: false, message: 'Nome e email s�o obrigat�rios' });
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
           VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING id`
        : `INSERT INTO profissionais (nome, email, senha, comissao_percent, empresa_id, ativo, telefone) 
           VALUES (?, ?, ?, ?, ?, 1, ?)`;

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    db.run(sql, [nome, email, senhaHash, comissao_percent || 30, empresa_id, telefonePadrao], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.json({ success: false, message: 'Email j� cadastrado' });
            }
            return res.json({ success: false, message: err.message });
        }

        let id = this?.lastID || this?.id || null;
        res.json({
            success: true,
            data: { id: id, senha_temp: senhaFinal },
            message: `Profissional criado! ${senhaGerada ? `Senha tempor�ria: ${senhaFinal}` : 'Senha definida pelo dono.'}`
        });
    });
});

app.put('/api/profissionais/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, email, comissao_percent, ativo, senha, telefone } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    let query = isProduction
        ? `UPDATE profissionais SET 
           nome = COALESCE($1, nome), 
           email = COALESCE($2, email), 
           comissao_percent = COALESCE($3, comissao_percent), 
           ativo = COALESCE($4, ativo), 
           telefone = COALESCE($5, telefone)`
        : `UPDATE profissionais SET 
           nome = COALESCE(?, nome), 
           email = COALESCE(?, email), 
           comissao_percent = COALESCE(?, comissao_percent), 
           ativo = COALESCE(?, ativo), 
           telefone = COALESCE(?, telefone)`;

    let params = [nome, email, comissao_percent, ativo, telefonePadrao];
    let counter = 6;

    if (senha && senha.trim() !== '') {
        const senhaHash = bcrypt.hashSync(senha, 10);
        if (isProduction) {
            query += `, senha = $${counter}`;
        } else {
            query += `, senha = ?`;
        }
        params.push(senhaHash);
        counter++;
    }

    if (isProduction) {
        query += ` WHERE id = $${counter} AND empresa_id = $${counter + 1}`;
    } else {
        query += ` WHERE id = ? AND empresa_id = ?`;
    }
    params.push(id, empresa_id);

    db.run(query, params, function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar profissional:', err);
            return res.json({ success: false, message: err.message });
        }

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
            console.error('? Erro ao verificar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        if (result?.total > 0) {
            const sqlUpdate = isProduction
                ? `UPDATE profissionais SET ativo = 0 WHERE id = $1 AND empresa_id = $2`
                : `UPDATE profissionais SET ativo = 0 WHERE id = ? AND empresa_id = ?`;

            db.run(sqlUpdate, [id, empresa_id], (err) => {
                if (err) {
                    console.error('? Erro ao desativar profissional:', err.message);
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
                    console.error('? Erro ao excluir profissional:', err.message);
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
// ROTA: CRIAR AGENDAMENTO (COM BLOQUEIO GERAL E DURA��O)
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
            return res.json({ success: false, message: 'Cliente e data s�o obrigat�rios' });
        }

        if (!hora) {
            console.log('? Hor�rio faltando');
            return res.json({ success: false, message: 'Hor�rio � obrigat�rio' });
        }

        // ============================================
        // ?????? VALIDA��O: DATA/HORA N�O PODE SER NO PASSADO ??????
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
                message: '? N�o � poss�vel agendar em datas ou hor�rios que j� passaram. Selecione uma data/hora futura.'
            });
        }

        const hojeStr = agora.toISOString().split('T')[0];
        if (data === hojeStr) {
            const horaAtual = agora.getHours();
            const minutoAtual = agora.getMinutes();
            const horaAgendamento = parseInt(horaStr);
            const minutoAgendamento = parseInt(minutoStr);

            if (horaAgendamento < horaAtual || (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual)) {
                console.log('? Tentativa de agendar em hor�rio que j� passou hoje');
                return res.json({
                    success: false,
                    message: `? N�o � poss�vel agendar no hor�rio ${hora} pois j� passou. Escolha um hor�rio futuro.`
                });
            }
        }

        // ============================================
        // ?? VALIDA��O: CLIENTE J� TEM AGENDAMENTO NESTE DIA? (REGRRA FIXA)
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
            console.log(`? Cliente ${cliente_id} j� tem agendamento no dia ${data}`);
            return res.json({
                success: false,
                message: `Voc� j� possui um agendamento para o dia ${formatarDataBr(data)}. Cada cliente s� pode fazer UM agendamento por dia.`
            });
        }

        // ============================================
        // ?? VALIDA��O: BUSCAR DIAS_BLOQUEIO_GERAL DA EMPRESA
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
                        console.error('? Erro ao buscar �ltimo agendamento:', err);
                        resolve(null);
                    } else {
                        console.log(`?? �ltimo agendamento encontrado (raw):`, row);
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

                    console.log(`?? Data do �ltimo agendamento convertida:`, dataUltimo);

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

                        console.log(`?? �ltimo agendamento: ${dataUltimo.toISOString().split('T')[0]}`);
                        console.log(`?? Data m�nima permitida (${diasBloqueioGeral} dias): ${dataMinimaStr}`);
                        console.log(`?? Data do novo agendamento: ${dataAgendamento.toISOString().split('T')[0]}`);

                        if (dataAgendamento < dataMinima) {
                            console.log(`? BLOQUEIO GERAL ATIVADO! Cliente ${cliente_id} n�o pode agendar antes de ${dataMinimaStr}`);
                            return res.json({
                                success: false,
                                message: `Voc� s� pode fazer um novo agendamento a partir de ${formatarDataBr(dataMinimaStr)} (${diasBloqueioGeral} dias ap�s o �ltimo agendamento).`
                            });
                        } else {
                            console.log(`? Cliente ${cliente_id} pode agendar em ${data} - Dentro do prazo permitido`);
                        }
                    }
                } catch (error) {
                    console.error('? Erro ao processar data do �ltimo agendamento:', error);
                }
            } else {
                console.log(`? Cliente ${cliente_id} n�o tem agendamentos anteriores - pode agendar livremente`);
            }
        } else {
            console.log(`?? Bloqueio geral DESATIVADO (0 dias) - Sem valida��o extra`);
        }

        // ============================================
        // ?? VALIDA��O: BUSCAR DURA��O DO SERVI�O
        // ============================================
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
                        console.error('? Erro ao buscar servi�o:', err);
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
                console.log(`?? Servi�o encontrado: ${nomeServico} - ${duracaoServico}min - R$ ${valorServico}`);
            } else {
                console.log(`?? Servi�o ${servico_id} n�o encontrado, usando padr�o 30min`);
            }
        } else {
            nomeServico = req.body.servico || 'Servi�o';
            valorServico = parseFloat(req.body.valor) || 0;
            duracaoServico = 30;
        }

        // ============================================
        // ?? VERIFICAR PROFISSIONAL - CORRIGIDO
        // ============================================
        let profissionalIdFinal = null;

        // Verificar se o usu�rio especificou um profissional
        if (profissional_id && profissional_id !== '' && profissional_id !== 'null') {
            profissionalIdFinal = parseInt(profissional_id);
            console.log(`?? Profissional especificado: ${profissionalIdFinal}`);

            // Verificar se o profissional est� dispon�vel
            const disponivel = await verificarDisponibilidadeHorario(
                empresa_id,
                profissionalIdFinal,
                data,
                hora,
                duracaoServico
            );

            if (!disponivel) {
                console.log(`? Hor�rio ${hora} ocupado para o profissional ${profissionalIdFinal}`);
                return res.json({
                    success: false,
                    message: `Este hor�rio j� est� ocupado para este profissional. O servi�o dura ${duracaoServico}min.`
                });
            }
        } else {
            // ?? QUANDO � DONO (sem profissional), N�O ATRIBUI A NINGU�M
            profissionalIdFinal = null;
            console.log(`?? Agendamento como Dono (sem profissional)`);
        }

        // ============================================
        // FUN��O PARA CRIAR O AGENDAMENTO
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
            console.log('?? Par�metros:', params);

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
                // ENVIA NOTIFICA��ES WHATSAPP
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
                        cliente: {
                            nome: cliente?.nome || 'Cliente',
                            telefone: cliente?.telefone || null
                        },
                        servico: {
                            nome: servico?.nome || servicoNome,
                            valor: parseFloat(servico?.valor || servicoValor || 0)  // 🔥 CONVERTER PARA NÚMERO
                        },
                        profissional: profissional ? {
                            nome: profissional.nome,
                            telefone: profissional.telefone || null
                        } : null,
                        data: data,
                        hora: hora,
                        empresa: {
                            id: empresa?.id,
                            nome: empresa?.nome || 'Barbearia',
                            endereco: empresa?.endereco || '',
                            telefone_dono: empresa?.telefone_dono || ''
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
                        console.log(`?? WhatsApp: Confirma��o enviada para ${dadosNotificacao.cliente.telefone}`);
                    }

                    if (profissional?.telefone) {
                        await whatsappService.enviarNovoAgendamentoProfissional(dadosNotificacao);
                        console.log(`?? WhatsApp: Notifica��o enviada para profissional ${profissional.telefone}`);
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

        // Chamar a fun��o de cria��o
        if (servico_id && servico_id !== '' && servico_id !== 'null') {
            criarAgendamento(nomeServico, valorServico, parseInt(servico_id));
        } else {
            criarAgendamento(nomeServico, valorServico, null);
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
            console.error('? Erro ao buscar agendamentos do profissional:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: agendamentos });
    });
});

// ============================================================
// ROTA: FINANCEIRO DO PROFISSIONAL
// ============================================================
app.get('/api/profissional/financeiro', auth, (req, res) => {
    // Verificar se � profissional
    if (req.usuario.role !== 'profissional') {
        return res.json({
            success: false,
            message: 'Acesso negado. Apenas profissionais podem acessar.'
        });
    }

    const profissional_id = req.usuario.id;
    const empresa_id = req.usuario.empresa_id;

    console.log(`?? Buscando financeiro do profissional ${profissional_id} (${req.usuario.nome})`);

    // Buscar agendamentos conclu�dos do profissional
    const sql = isProduction
        ? `SELECT 
            a.id,
            a.data,
            to_char(a.data, 'YYYY-MM-DD') as data_formatada,
            a.valor_total,
            a.servico,
            a.comissao,
            a.cliente_id,
            a.status,
            c.nome as cliente_nome,
            s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.profissional_id = $1 
        AND a.empresa_id = $2
        AND a.status = 'concluido'
        ORDER BY a.data DESC
        LIMIT 50`
        : `SELECT 
            a.id,
            a.data,
            date(a.data) as data_formatada,
            a.valor_total,
            a.servico,
            a.comissao,
            a.cliente_id,
            a.status,
            c.nome as cliente_nome,
            s.nome as servico_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE a.profissional_id = ? 
        AND a.empresa_id = ?
        AND a.status = 'concluido'
        ORDER BY a.data DESC
        LIMIT 50`;

    db.all(sql, [profissional_id, empresa_id], (err, agendamentos) => {
        if (err) {
            console.error('? Erro ao buscar financeiro do profissional:', err.message);
            return res.json({ success: false, message: err.message });
        }

        // Calcular totais
        let totalComissoes = 0;
        let totalServicos = 0;
        let totalValor = 0;

        const dadosFormatados = agendamentos.map(a => {
            const comissao = parseFloat(a.comissao) || 0;
            const valor = parseFloat(a.valor) || 0;

            totalComissoes += comissao;
            totalServicos += 1;
            totalValor += valor;

            // Formatar a data
            let dataFormatada = a.data_formatada || a.data;
            if (dataFormatada && typeof dataFormatada === 'string') {
                // J� est� formatada
            } else if (a.data) {
                try {
                    const dataObj = new Date(a.data);
                    dataFormatada = dataObj.toISOString().split('T')[0];
                } catch (e) {
                    dataFormatada = String(a.data);
                }
            }

            return {
                id: a.id,
                data: dataFormatada,
                valor: valor,
                servico: a.servico || a.servico_nome || 'N/A',
                servico_nome: a.servico_nome || a.servico || 'N/A',
                comissao: comissao,
                cliente_id: a.cliente_id,
                cliente_nome: a.cliente_nome || 'N/A',
                status: a.status
            };
        });

        console.log(`? Financeiro do profissional ${profissional_id}: ${totalServicos} servi�os, R$ ${totalComissoes.toFixed(2)} em comiss�es`);

        res.json({
            success: true,
            data: {
                comissoes: dadosFormatados,
                totais: {
                    total_comissoes: totalComissoes,
                    total_servicos: totalServicos,
                    total_valor: totalValor
                }
            }
        });
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
            return res.json({ success: false, message: 'Agendamento n�o encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamentos conclu�dos n�o podem ser editados' });
        }

        let query = isProduction ? `UPDATE agendamentos SET ` : `UPDATE agendamentos SET `;
        let params = [];
        params.push(empresaId);
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
            return res.json({ success: false, message: 'Agendamento n�o encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamento j� foi conclu�do' });
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
                message: `Agendamento conclu�do! Sua comiss�o: R$ ${comissao.toFixed(2)}`,
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

                    // 🔥 ENVIAR MENSAGEM DE CONCLUSÃO COM LINK DO CHATBOT
                    if (agendamento.telefone) {
                        try {
                            // Buscar dados da empresa para o link
                            const empresa = await new Promise((resolve) => {
                                db.get('SELECT id, nome, telefone_dono FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                                    resolve(row || {});
                                });
                            });

                            const dadosConclusao = {
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

                            // Usar a nova função enviarConclusao
                            await whatsappService.enviarConclusao(dadosConclusao);
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
            return res.status(404).json({ success: false, message: 'Agendamento n�o encontrado' });
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
                    servico: { nome: agendamento.servico_nome || 'Servi�o' },
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

app.put('/api/agendamentos/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { cliente_id, data, hora, servico_id, servico, valor, profissional_id } = req.body;
    const empresa_id = req.usuario.empresa_id;

    const sqlSelect = isProduction
        ? `SELECT * FROM agendamentos WHERE id = $1 AND empresa_id = $2`
        : `SELECT * FROM agendamentos WHERE id = ? AND empresa_id = ?`;

    db.get(sqlSelect, [id, empresa_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento n�o encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamentos conclu�dos n�o podem ser editados' });
        }

        let query = isProduction ? `UPDATE agendamentos SET ` : `UPDATE agendamentos SET `;
        let params = [];
        params.push(empresaId);
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
            console.error('? Erro ao excluir agendamento:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: 'Agendamento removido' });
    });
});

// ============================================
// GET /api/clientes - BUSCAR CLIENTES
// ============================================
app.get('/api/clientes', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id) {
        return res.json({ success: true, data: [] });
    }

    const sql = isProduction
        ? `SELECT id, nome, telefone, email, created_at, COALESCE(bloqueado_chatbot, false) as bloqueado_chatbot 
           FROM clientes 
           WHERE empresa_id = $1 
           ORDER BY nome`
        : `SELECT id, nome, telefone, email, created_at, COALESCE(bloqueado_chatbot, false) as bloqueado_chatbot 
           FROM clientes 
           WHERE empresa_id = ? 
           ORDER BY nome`;

    db.all(sql, [empresa_id], (err, clientes) => {
        if (err) {
            console.error('? Erro ao buscar clientes:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: clientes });
    });
});

// ============================================
// POST /api/clientes - CRIAR CLIENTE
// ============================================
app.post('/api/clientes', auth, (req, res) => {
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('?? Criando cliente:', { nome, telefone, email, empresa_id });

    if (!nome) {
        return res.json({ success: false, message: 'Nome � obrigat�rio' });
    }

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    const sql = isProduction
        ? `INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES ($1, $2, $3, $4) RETURNING id`
        : `INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)`;

    db.run(sql, [nome, telefonePadrao, email, empresa_id], function (err) {
        if (err) {
            console.error('? Erro ao criar cliente:', err.message);
            return res.json({ success: false, message: 'Erro ao criar cliente: ' + err.message });
        }

        let id = this?.lastID || this?.id || null;
        console.log('? Cliente criado com ID:', id);
        res.json({ success: true, data: { id: id }, message: 'Cliente cadastrado com sucesso!' });
    });
});

// ============================================
// PUT /api/clientes/:id - ATUALIZAR CLIENTE
// ============================================
app.put('/api/clientes/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('?? Atualizando cliente:', { id, nome, telefone, email, empresa_id });

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    const sql = isProduction
        ? `UPDATE clientes SET 
           nome = COALESCE($1, nome), 
           telefone = COALESCE($2, telefone), 
           email = COALESCE($3, email)
           WHERE id = $4 AND empresa_id = $5`
        : `UPDATE clientes SET 
           nome = COALESCE(?, nome), 
           telefone = COALESCE(?, telefone), 
           email = COALESCE(?, email)
           WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [nome, telefonePadrao, email, id, empresa_id], function (err) {
        if (err) {
            console.error('? Erro ao editar cliente:', err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log('? Cliente atualizado! Changes:', this.changes);
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
            console.error('? Erro ao excluir cliente:', err.message);
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
            console.error('? Erro ao bloquear/desbloquear cliente:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, message: bloquear ? 'Cliente bloqueado do chatbot' : 'Cliente desbloqueado do chatbot' });
    });
});

// ============================================================
// PUT /api/empresa/bloqueio-geral - ATUALIZAR BLOQUEIO COLETIVO
// ============================================================
app.put('/api/empresa/bloqueio-geral', auth, verificarDono, (req, res) => {
    const { dias_bloqueio } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log('?? Atualizando bloqueio geral:', { empresaId, dias_bloqueio });

    const diasBloqueioFinal = parseInt(dias_bloqueio) || 0;

    const sql = isProduction
        ? `UPDATE empresas SET dias_bloqueio_geral = $1 WHERE id = $2`
        : `UPDATE empresas SET dias_bloqueio_geral = ? WHERE id = ?`;

    db.run(sql, [diasBloqueioFinal, empresaId], function (err) {
        if (err) {
            console.error('? Erro ao atualizar bloqueio geral:', err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log('? Bloqueio geral atualizado para:', diasBloqueioFinal);
        res.json({ success: true, message: `Bloqueio geral atualizado para ${diasBloqueioFinal} dias!` });
    });
});

// ============================================================
// HOR�RIOS
// ============================================================

app.get('/api/horarios', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT * FROM horarios_funcionamento WHERE empresa_id = $1 ORDER BY dia_semana`
        : `SELECT * FROM horarios_funcionamento WHERE empresa_id = ? ORDER BY dia_semana`;

    db.all(sql, [empresa_id], (err, horarios) => {
        if (err) {
            console.error('? Erro ao buscar hor�rios:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: horarios });
    });
});

app.put('/api/horarios/:dia', auth, verificarDono, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    const { dia } = req.params;
    const { aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos } = req.body;

    console.log('?? Atualizando hor�rio:', { empresa_id, dia, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim });

    const sqlSelect = isProduction
        ? `SELECT * FROM horarios_funcionamento WHERE empresa_id = $1 AND dia_semana = $2`
        : `SELECT * FROM horarios_funcionamento WHERE empresa_id = ? AND dia_semana = ?`;

    db.get(sqlSelect, [empresa_id, dia], (err, horarioAtual) => {
        if (err) {
            console.error('? Erro ao buscar hor�rio atual:', err.message);
            return res.json({ success: false, message: 'Erro ao buscar hor�rio atual' });
        }

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
                console.error('? Erro ao atualizar hor�rio:', err.message);
                return res.json({ success: false, message: 'Erro ao atualizar hor�rio: ' + err.message });
            }

            if (this && this.changes === 0) {
                const sqlInsert = isProduction
                    ? `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
                    : `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                db.run(sqlInsert, [empresa_id, dia, finalAberto, finalHoraInicio, finalHoraFim, finalAlmocoInicio, finalAlmocoFim, finalIntervalo], function (err) {
                    if (err) {
                        console.error('? Erro ao inserir hor�rio:', err.message);
                        return res.json({ success: false, message: 'Erro ao inserir hor�rio: ' + err.message });
                    }
                    res.json({ success: true, message: 'Hor�rio salvo com sucesso!' });
                });
            } else {
                res.json({ success: true, message: 'Hor�rio atualizado com sucesso!' });
            }
        });
    });
});
// ============================================================
// ROTAS DE GRUPOS/TAGS PARA CLIENTES
// ============================================================

// Buscar todos os grupos de todos os clientes da empresa
app.get('/api/clientes/grupos', auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        // Busca todos os clientes da empresa
        const sql = isProduction
            ? 'SELECT id, grupos FROM clientes WHERE empresa_id = $1'
            : 'SELECT id, grupos FROM clientes WHERE empresa_id = ?';

        const clientes = await new Promise((resolve, reject) => {
            db.all(sql, [empresaId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Monta um objeto com os grupos de cada cliente
        const gruposMap = {};
        for (let cliente of clientes) {
            if (cliente.grupos) {
                try {
                    gruposMap[cliente.id] = JSON.parse(cliente.grupos);
                } catch (e) {
                    gruposMap[cliente.id] = [];
                }
            } else {
                gruposMap[cliente.id] = [];
            }
        }

        res.json({ success: true, data: gruposMap });
    } catch (error) {
        console.error('❌ Erro ao buscar grupos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Buscar grupos de um cliente específico
app.get('/api/clientes/:id/grupos', auth, async (req, res) => {
    try {
        const clienteId = req.params.id;
        const empresaId = req.usuario.empresa_id;
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        const sql = isProduction
            ? 'SELECT id, grupos FROM clientes WHERE id = $1 AND empresa_id = $2'
            : 'SELECT id, grupos FROM clientes WHERE id = ? AND empresa_id = ?';

        const cliente = await new Promise((resolve, reject) => {
            db.get(sql, [clienteId, empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
        }

        let grupos = [];
        if (cliente.grupos) {
            try {
                grupos = JSON.parse(cliente.grupos);
            } catch (e) {
                grupos = [];
            }
        }

        res.json({ success: true, data: grupos });
    } catch (error) {
        console.error('❌ Erro ao buscar grupos do cliente:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Salvar grupos de um cliente
app.put('/api/clientes/:id/grupos', auth, async (req, res) => {
    try {
        const clienteId = req.params.id;
        const empresaId = req.usuario.empresa_id;
        const { grupos } = req.body;
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        if (!grupos || !Array.isArray(grupos)) {
            return res.status(400).json({ success: false, message: 'Grupos deve ser um array' });
        }

        // Verifica se o cliente pertence à empresa
        const sqlCheck = isProduction
            ? 'SELECT id FROM clientes WHERE id = $1 AND empresa_id = $2'
            : 'SELECT id FROM clientes WHERE id = ? AND empresa_id = ?';

        const cliente = await new Promise((resolve, reject) => {
            db.get(sqlCheck, [clienteId, empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!cliente) {
            return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
        }

        // Salva os grupos como JSON
        const sqlUpdate = isProduction
            ? 'UPDATE clientes SET grupos = $1 WHERE id = $2'
            : 'UPDATE clientes SET grupos = ? WHERE id = ?';

        await new Promise((resolve, reject) => {
            db.run(sqlUpdate, [JSON.stringify(grupos), clienteId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ success: true, message: 'Grupos atualizados com sucesso!' });
    } catch (error) {
        console.error('❌ Erro ao salvar grupos:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Buscar todos os grupos disponíveis (para o filtro na promoção)
app.get('/api/clientes/grupos/todos', auth, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        const sql = isProduction
            ? 'SELECT grupos FROM clientes WHERE empresa_id = $1 AND grupos IS NOT NULL AND grupos != "[]"'
            : 'SELECT grupos FROM clientes WHERE empresa_id = ? AND grupos IS NOT NULL AND grupos != "[]"';

        const clientes = await new Promise((resolve, reject) => {
            db.all(sql, [empresaId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        const gruposSet = new Set();
        for (let cliente of clientes) {
            if (cliente.grupos) {
                try {
                    const grupos = JSON.parse(cliente.grupos);
                    grupos.forEach(g => gruposSet.add(g));
                } catch (e) { }
            }
        }

        res.json({ success: true, data: Array.from(gruposSet) });
    } catch (error) {
        console.error('❌ Erro ao buscar grupos disponíveis:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});
// ============================================
// ROTA: /api/financeiro
// ============================================
app.get('/api/financeiro', auth, (req, res) => {
    const role = req.usuario.role;
    const empresa_id = req.usuario.empresa_id;

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

    if (role === 'dono') {
        // 🔥 CORRIGIDO: Usar valor_total em vez de valor
        const sql = isProduction
            ? `SELECT 
                a.id,
                to_char(a.data, 'YYYY-MM-DD') as data_formatada,
                a.valor_total,
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
                a.valor_total,
                a.valor_total,
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

            let faturamentoBruto = 0;
            let totalComissoes = 0;
            let totalServicos = comissoes.length;
            const comissoesPorProfissional = {};

            for (let item of comissoes) {
                const dataFinal = item.data_formatada || item.data;
                item.data = dataFinal;
                delete item.data_formatada;

                // 🔥 CORRIGIDO: Usar valor_total primeiro, se não existir usa valor
                const valor = parseFloat(item.valor_total) || parseFloat(item.valor) || 0;
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

    if (role === 'superadmin') {
        // ... superadmin financeiro
    }

    res.status(403).json({
        success: false,
        message: 'Acesso negado'
    });
});
// ============================================================
// ?? ROTAS DE DESPESAS
// ============================================================

// ============================================
// GET /api/despesas - LISTAR DESPESAS (CORRIGIDO)
// ============================================
app.get('/api/despesas', auth, (req, res) => {
    const usuario = req.usuario;

    if (usuario.role === 'profissional') {
        return res.json({
            success: true,
            data: {
                despesas: [],
                totais: { total: 0, pago: 0, pendente: 0, quantidade: 0 }
            }
        });
    }

    const empresaId = usuario.empresa_id;
    const { mes, ano, categoria, pago } = req.query;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    let params = [];
    let sql = `
        SELECT d.*
        FROM despesas d
        WHERE d.empresa_id = $1
    `;
    params.push(empresaId);

    if (isProduction) {
        // PostgreSQL - usar placeholders com contador
        let counter = 2;

        if (mes && ano) {
            sql += ` AND EXTRACT(MONTH FROM d.data) = $${counter}::int AND EXTRACT(YEAR FROM d.data) = $${counter + 1}::int`;
            params.push(parseInt(mes), parseInt(ano));
            counter += 2;
        }

        if (categoria) {
            sql += ` AND d.categoria = $${counter}`;
            params.push(categoria);
            counter++;
        }

        if (pago !== undefined && pago !== '') {
            const pagoBool = pago === 'true';
            sql += ` AND d.pago = $${counter}`;
            params.push(pagoBool);
            counter++;
        }
    } else {
        // SQLite
        if (mes && ano) {
            if (isProduction) {
                // PostgreSQL - usar placeholders com contador
                sql += ` AND EXTRACT(MONTH FROM d.data) = $${params.length + 1}::int AND EXTRACT(YEAR FROM d.data) = $${params.length + 2}::int`;
                params.push(parseInt(mes), parseInt(ano));
            } else {
                // SQLite
                sql += ` AND strftime('%m', d.data) = ? AND strftime('%Y', d.data) = ?`;
                params.push(mes.padStart(2, '0'), ano);
            }
        }

        if (categoria) {
            sql += ` AND d.categoria = ?`;
            params.push(categoria);
        }

        if (pago !== undefined && pago !== '') {
            const pagoBool = pago === 'true' ? 1 : 0;
            sql += ` AND d.pago = ?`;
            params.push(pagoBool);
        }
    }

    sql += ` ORDER BY d.data DESC, d.created_at DESC`;

    console.log('📊 SQL:', sql);
    console.log('📊 Params:', params);

    db.all(sql, params, (err, despesas) => {
        if (err) {
            console.error('❌ Erro ao buscar despesas:', err);
            console.error('❌ SQL:', sql);
            console.error('❌ Params:', params);
            return res.status(500).json({ success: false, message: err.message });
        }

        const totalDespesas = despesas.reduce((acc, d) => acc + (d.valor || 0), 0);
        const totalPago = despesas.filter(d => d.pago === true || d.pago === 1).reduce((acc, d) => acc + (d.valor || 0), 0);
        const totalPendente = despesas.filter(d => d.pago === false || d.pago === 0).reduce((acc, d) => acc + (d.valor || 0), 0);

        const despesasFormatadas = despesas.map(d => ({
            ...d,
            pago: d.pago === true || d.pago === 1 ? 1 : 0
        }));

        res.json({
            success: true,
            data: {
                despesas: despesasFormatadas,
                totais: {
                    total: totalDespesas,
                    pago: totalPago,
                    pendente: totalPendente,
                    quantidade: despesas.length
                }
            }
        });
    });
});

// ============================================
// GET /api/despesas/categorias - LISTAR CATEGORIAS
// ============================================
app.get('/api/despesas/categorias', auth, (req, res) => {
    const usuario = req.usuario;

    if (usuario.role === 'profissional') {
        return res.json({ success: true, data: [] });
    }

    const empresaId = usuario.empresa_id;

    const defaultCategorias = [
        'Aluguel', '�gua', 'Energia El�trica', 'Internet', 'Telefone',
        'Material de Consumo', 'Equipamentos', 'Manuten��o', 'Impostos',
        'Sal�rios', 'Comiss�es', 'Marketing', 'Limpeza', 'Alimenta��o',
        'Transporte', 'Outros'
    ];

    db.all(
        `SELECT DISTINCT categoria FROM despesas WHERE empresa_id = ? ORDER BY categoria`,
        [empresaId],
        (err, categorias) => {
            if (err) {
                console.error('? Erro ao buscar categorias:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            const categoriasExistentes = categorias.map(c => c.categoria);
            const todasCategorias = [...new Set([...defaultCategorias, ...categoriasExistentes])].sort();

            res.json({ success: true, data: todasCategorias });
        }
    );
});
// ============================================
// NOVAS ROTAS FINANCEIRO - RECEITAS E COMPARATIVO
// ============================================

// GET /api/financeiro/receitas - Listar receitas filtradas
app.get('/api/financeiro/receitas', auth, (req, res) => {
    const { mes, ano } = req.query;
    const empresaId = req.usuario.empresa_id;

    console.log('📊 Receitas - Parâmetros:', { mes, ano, empresaId });

    if (!mes || !ano) {
        return res.json({ success: false, message: 'Mês e ano são obrigatórios' });
    }

    const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
    console.log('📊 Receitas - Ambiente:', isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO');

    let sql;
    let params;

    if (isProduction) {
        // ✅ POSTGRESQL - Usa EXTRACT
        sql = `
            SELECT 
                a.id,
                a.data,
                a.cliente_id,
                a.servico,
                a.valor_total,
                a.comissao,
                a.profissional_id,
                a.status,
                c.nome as cliente_nome,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.empresa_id = $1
                AND a.status = 'concluido'
                AND EXTRACT(MONTH FROM a.data) = $2
                AND EXTRACT(YEAR FROM a.data) = $3
            ORDER BY a.data DESC
        `;
        params = [empresaId, parseInt(mes), parseInt(ano)];
    } else {
        // ✅ SQLITE - Usa strftime
        sql = `
            SELECT 
                a.id,
                a.data,
                a.cliente_id,
                a.servico,
                a.valor_total,
                a.comissao,
                a.profissional_id,
                a.status,
                c.nome as cliente_nome,
                s.nome as servico_nome,
                p.nome as profissional_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            WHERE a.empresa_id = ?
                AND a.status = 'concluido'
                AND strftime('%m', a.data) = ?
                AND strftime('%Y', a.data) = ?
            ORDER BY a.data DESC
        `;
        params = [empresaId, mes.padStart(2, '0'), ano];
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar receitas:', err);
            console.error('❌ SQL:', sql);
            console.error('❌ Params:', params);
            return res.json({ success: false, message: 'Erro ao buscar receitas' });
        }

        // 🔥 CORRIGIDO: Usar valor_total
        let total = 0;
        rows.forEach(row => {
            total += parseFloat(row.valor_total) || parseFloat(row.valor) || 0;
        });

        res.json({
            success: true,
            data: {
                receitas: rows,
                total: total,
                quantidade: rows.length
            }
        });
    });
});

// GET /api/financeiro/comparativo - Comparativo mês atual vs mês anterior
app.get('/api/financeiro/comparativo', auth, (req, res) => {
    const { mes_atual, ano_atual, mes_anterior, ano_anterior } = req.query;
    const empresaId = req.usuario.empresa_id;

    if (!mes_atual || !ano_atual || !mes_anterior || !ano_anterior) {
        return res.json({ success: false, message: 'Parâmetros incompletos' });
    }

    const isProduction = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';

    async function getDados(mes, ano) {
        return new Promise((resolve, reject) => {
            // Faturamento do mês
            let sqlFat, paramsFat;
            if (isProduction) {
                // ✅ POSTGRESQL - CORRIGIDO
                sqlFat = `
                SELECT COALESCE(SUM(valor_total), 0) as total
                FROM agendamentos
                WHERE empresa_id = $1
                    AND status = 'concluido'
                    AND EXTRACT(MONTH FROM data) = $2
                    AND EXTRACT(YEAR FROM data) = $3
            `;
                paramsFat = [empresaId, parseInt(mes), parseInt(ano)];
            } else {
                // ✅ SQLITE - CORRIGIDO
                sqlFat = `
                SELECT COALESCE(SUM(valor_total), 0) as total
                FROM agendamentos
                WHERE empresa_id = ?
                    AND status = 'concluido'
                    AND strftime('%m', data) = ?
                    AND strftime('%Y', data) = ?
            `;
                paramsFat = [empresaId, mes.padStart(2, '0'), ano];
            }

            db.get(sqlFat, paramsFat, (err, fatRow) => {
                if (err) {
                    reject(err);
                    return;
                }

                // Despesas do mês (mantém SUM(valor) porque despesas não têm valor_total)
                let sqlDesp, paramsDesp;
                if (isProduction) {
                    sqlDesp = `
                    SELECT COALESCE(SUM(valor), 0) as total
                    FROM despesas
                    WHERE empresa_id = $1
                        AND EXTRACT(MONTH FROM data) = $2
                        AND EXTRACT(YEAR FROM data) = $3
                `;
                    paramsDesp = [empresaId, parseInt(mes), parseInt(ano)];
                } else {
                    sqlDesp = `
                    SELECT COALESCE(SUM(valor), 0) as total
                    FROM despesas
                    WHERE empresa_id = ?
                        AND strftime('%m', data) = ?
                        AND strftime('%Y', data) = ?
                `;
                    paramsDesp = [empresaId, mes.padStart(2, '0'), ano];
                }

                db.get(sqlDesp, paramsDesp, (err, despRow) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const faturamento = parseFloat(fatRow?.total || 0);
                    const despesas = parseFloat(despRow?.total || 0);
                    const lucro = faturamento - despesas;

                    resolve({ faturamento, despesas, lucro });
                });
            });
        });
    }

    Promise.all([
        getDados(mes_atual, ano_atual),
        getDados(mes_anterior, ano_anterior)
    ])
        .then(([mesAtual, mesAnterior]) => {
            res.json({
                success: true,
                data: {
                    mes_atual: mesAtual,
                    mes_anterior: mesAnterior
                }
            });
        })
        .catch(err => {
            console.error('Erro no comparativo:', err);
            res.json({ success: false, message: 'Erro ao gerar comparativo' });
        });
});
// ============================================
// POST /api/despesas - CRIAR DESPESA
// ============================================
app.post('/api/despesas', auth, (req, res) => {
    const usuario = req.usuario;

    if (usuario.role === 'profissional') {
        return res.status(403).json({
            success: false,
            message: 'Profissionais n�o podem criar despesas'
        });
    }

    const empresaId = usuario.empresa_id;
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;

    if (!descricao || !categoria || !valor || !data) {
        return res.status(400).json({
            success: false,
            message: 'Descri��o, categoria, valor e data s�o obrigat�rios'
        });
    }

    if (valor <= 0) {
        return res.status(400).json({
            success: false,
            message: 'O valor deve ser maior que zero'
        });
    }

    const sql = `
        INSERT INTO despesas (
            empresa_id, descricao, categoria, valor, data,
            data_vencimento, pago, forma_pagamento, observacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        empresaId,
        descricao.trim(),
        categoria.trim(),
        valor,
        data,
        data_vencimento || null,
        pago ? true : false,
        forma_pagamento || null,
        observacao || null
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('? Erro ao criar despesa:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        db.get(`SELECT * FROM despesas WHERE id = ?`, [this.lastID], (err, despesa) => {
            if (err) {
                console.error('? Erro ao buscar despesa:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                data: despesa,
                message: 'Despesa criada com sucesso!'
            });
        });
    });
});

// ============================================
// PUT /api/despesas/:id - ATUALIZAR DESPESA
// ============================================
app.put('/api/despesas/:id', auth, (req, res) => {
    const usuario = req.usuario;
    const { id } = req.params;

    if (usuario.role === 'profissional') {
        return res.status(403).json({
            success: false,
            message: 'Profissionais n�o podem editar despesas'
        });
    }

    const empresaId = usuario.empresa_id;
    const { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao } = req.body;

    db.get(`SELECT * FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], (err, existing) => {
        if (err) {
            console.error('? Erro ao verificar despesa:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Despesa n�o encontrada' });
        }

        if (!descricao || !categoria || !valor || !data) {
            return res.status(400).json({
                success: false,
                message: 'Descri��o, categoria, valor e data s�o obrigat�rios'
            });
        }

        if (valor <= 0) {
            return res.status(400).json({
                success: false,
                message: 'O valor deve ser maior que zero'
            });
        }

        const sql = `
            UPDATE despesas 
            SET descricao = ?, categoria = ?, valor = ?, data = ?,
                data_vencimento = ?, pago = ?, forma_pagamento = ?,
                observacao = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND empresa_id = ?
        `;

        const params = [
            descricao.trim(),
            categoria.trim(),
            valor,
            data,
            data_vencimento || null,
            pago ? true : false,
            forma_pagamento || null,
            observacao || null,
            id,
            empresaId
        ];

        db.run(sql, params, function (err) {
            if (err) {
                console.error('? Erro ao atualizar despesa:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            db.get(`SELECT * FROM despesas WHERE id = ?`, [id], (err, despesa) => {
                if (err) {
                    console.error('? Erro ao buscar despesa:', err);
                    return res.status(500).json({ success: false, message: err.message });
                }

                res.json({
                    success: true,
                    data: despesa,
                    message: 'Despesa atualizada com sucesso!'
                });
            });
        });
    });
});

// ============================================
// DELETE /api/despesas/:id - EXCLUIR DESPESA
// ============================================
app.delete('/api/despesas/:id', auth, (req, res) => {
    const usuario = req.usuario;
    const { id } = req.params;

    if (usuario.role === 'profissional') {
        return res.status(403).json({
            success: false,
            message: 'Profissionais n�o podem excluir despesas'
        });
    }

    const empresaId = usuario.empresa_id;

    db.get(`SELECT * FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], (err, existing) => {
        if (err) {
            console.error('? Erro ao verificar despesa:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        if (!existing) {
            return res.status(404).json({ success: false, message: 'Despesa n�o encontrada' });
        }

        db.run(`DELETE FROM despesas WHERE id = ? AND empresa_id = ?`, [id, empresaId], function (err) {
            if (err) {
                console.error('? Erro ao excluir despesa:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({ success: true, message: 'Despesa exclu�da com sucesso!' });
        });
    });
});

// ============================================
// GET /api/despesas/resumo - RESUMO DO M�S (CORRIGIDO PARA POSTGRESQL)
// ============================================
app.get('/api/despesas/resumo', auth, (req, res) => {
    const usuario = req.usuario;

    if (usuario.role === 'profissional') {
        return res.json({
            success: true,
            data: {
                total_despesas: 0,
                total_pago: 0,
                total_pendente: 0,
                por_categoria: []
            }
        });
    }

    const empresaId = usuario.empresa_id;
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = String(hoje.getFullYear());

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    let sql;
    let params = [empresaId, mes, ano];

    if (isProduction) {
        // PostgreSQL
        let counter = 2; // usar TRUE / FALSE e EXTRACT
        sql = `
            SELECT 
                COALESCE(SUM(CASE WHEN pago = true THEN valor ELSE 0 END), 0) as total_pago,
                COALESCE(SUM(CASE WHEN pago = false THEN valor ELSE 0 END), 0) as total_pendente,
                COALESCE(SUM(valor), 0) as total_despesas,
                COUNT(*) as total_quantidade
            FROM despesas
            WHERE empresa_id = $1
            AND EXTRACT(MONTH FROM data) = $2::int
            AND EXTRACT(YEAR FROM data) = $3::int
        `;
    } else {
        // SQLite
        sql = `
            SELECT 
                COALESCE(SUM(CASE WHEN pago = 1 THEN valor ELSE 0 END), 0) as total_pago,
                COALESCE(SUM(CASE WHEN pago = 0 THEN valor ELSE 0 END), 0) as total_pendente,
                COALESCE(SUM(valor), 0) as total_despesas,
                COUNT(*) as total_quantidade
            FROM despesas
            WHERE empresa_id = ?
                        ${isProduction
                ? `AND EXTRACT(MONTH FROM data) = $${params.length + 1}::int AND EXTRACT(YEAR FROM data) = $${params.length + 2}::int`
                : `AND strftime('%m', data) = ? AND strftime('%Y', data) = ?`
            }
        `;
    }

    db.get(sql, params, (err, resumo) => {
        if (err) {
            console.error('? Erro ao buscar resumo:', err);
            return res.status(500).json({ success: false, message: err.message });
        }

        // Buscar por categoria
        let catSql;
        let catParams = [empresaId, mes, ano];

        if (isProduction) {
            catSql = `
                SELECT categoria, COUNT(*) as total, SUM(valor) as total_valor
                FROM despesas
                WHERE empresa_id = $1
                AND EXTRACT(MONTH FROM data) = $2::int
                AND EXTRACT(YEAR FROM data) = $3::int
                GROUP BY categoria
                ORDER BY total_valor DESC
            `;
        } else {
            catSql = `
                SELECT categoria, COUNT(*) as total, SUM(valor) as total_valor
                FROM despesas
                WHERE empresa_id = ?
                                ${isProduction
                    ? `AND EXTRACT(MONTH FROM data) = $${params.length + 1}::int AND EXTRACT(YEAR FROM data) = $${params.length + 2}::int`
                    : `AND strftime('%m', data) = ? AND strftime('%Y', data) = ?`
                }
                GROUP BY categoria
                ORDER BY total_valor DESC
            `;
        }

        db.all(catSql, catParams, (err, categorias) => {
            if (err) {
                console.error('? Erro ao buscar categorias:', err);
                return res.status(500).json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                data: {
                    ...resumo,
                    por_categoria: categorias || []
                }
            });
        });
    });
});


// ============================================================
// ROTA: LINK DO CHATBOT (PROTEGIDA - APENAS DONO)
// ============================================================
app.get('/api/chatbot/link/:empresaId', auth, verificarDono, (req, res) => {
    const { empresaId } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const link = `${baseUrl}/chatbot.html?empresa=${empresaId}`;

    console.log(`?? Link do chatbot gerado para empresa ${empresaId}: ${link}`);
    res.json({ success: true, link });
});

app.get('/api/chatbot/empresa/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT id, nome FROM empresas WHERE id = ?', [id], (err, empresa) => {
        if (err || !empresa) {
            return res.json({ success: false, message: 'Empresa n�o encontrada' });
        }
        res.json({ success: true, empresa });
    });
});

app.get('/api/chatbot/servicos/:empresaId', (req, res) => {
    const { empresaId } = req.params;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    const sql = isProduction
        ? 'SELECT id, nome, valor, duracao FROM servicos WHERE empresa_id = $1 AND ativo = true ORDER BY nome'
        : 'SELECT id, nome, valor, duracao FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome';

    db.all(sql, [empresaId], (err, servicos) => {
        if (err) {
            console.error('❌ db.all error:', err.message);
            console.error('❌ SQL:', sql);
            console.error('❌ Params:', [empresaId]);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, servicos });
    });
});

app.get('/api/chatbot/profissionais/:empresaId', (req, res) => {
    const { empresaId } = req.params;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

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

    db.get(`SELECT id, nome, telefone, email, COALESCE(bloqueado_chatbot, false) as bloqueado_chatbot 
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
// ROTA: /api/chatbot/datas-disponiveis-mes
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
                      ${isProduction
            ? `AND EXTRACT(YEAR FROM data) = $${params.length + 1}::int AND EXTRACT(MONTH FROM data) = $${params.length + 2}::int`
            : `AND strftime('%Y', data) = ? AND strftime('%m', data) = ?`
        }`;

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
             WHERE empresa_id = ? AND aberto = true`,
            [empresaId],
            (err, horariosFuncionamento) => {
                if (err) {
                    console.error('? Erro ao buscar hor�rios de funcionamento:', err);
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

                console.log(`? ${datasDisponiveis.length} datas dispon�veis em ${mesSolicitado}/${anoSolicitado}`);

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
// ROTA: /api/chatbot/horarios-disponiveis (COM DURA��O)
// ============================================
app.post('/api/chatbot/horarios-disponiveis', (req, res) => {
    const { empresaId, profissionalId, data, duracao } = req.body;

    console.log(`?? Buscando hor�rios para ${data} - Profissional: ${profissionalId || 'todos'} - Dura��o: ${duracao || 30}min`);

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

    // Buscar agendamentos do dia com dura��o dos servi�os
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

        // Buscar hor�rio de funcionamento do dia
        const dataObj = new Date(data + 'T00:00:00');
        const diaSemana = dataObj.getDay();

        db.get(
            `SELECT hora_inicio, hora_fim, almoco_inicio, almoco_fim 
             FROM horarios_funcionamento 
             WHERE empresa_id = ? AND dia_semana = ? AND aberto = true`,
            [empresaId, diaSemana],
            (err, horario) => {
                if (err) {
                    console.error('? Erro ao buscar hor�rio:', err);
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
                    // Pular almo�o
                    if (minutos >= almocoInicioMin && minutos < almocoFimMin) {
                        continue;
                    }

                    // Verificar se o hor�rio + dura��o n�o conflita com agendamentos
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

                console.log(`? ${horariosDisponiveis.length} hor�rios dispon�veis para ${data} (dura��o: ${duracaoMin}min)`);

                res.json({
                    success: true,
                    horarios: horariosDisponiveis,
                    duracao: duracaoMin
                });
            }
        );
    });
});

app.post('/api/chatbot/agendar', async (req, res) => {
    try {
        const { clienteId, servicoId, profissionalId, data, hora, empresaId, valor, servicoNome } = req.body;

        // Verifica se é produção (VPS/PostgreSQL) ou local (SQLite)
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

        let novoAgendamentoId;

        // ============================================
        // 1. INSERIR AGENDAMENTO
        // ============================================
        if (isProduction) {
            // PostgreSQL
            const sqlInsert = `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, duracao, status, empresa_id, profissional_id) 
                               VALUES ($1, $2, $3, $4, $5, $6, 30, 'pendente', $7, $8) RETURNING id`;
            const params = [clienteId, data, hora, servicoId, servicoNome, valor, empresaId, profissionalId];

            // Tenta usar db.query, se não existir, usa db.get (alguns wrappers usam get para tudo)
            if (typeof db.query === 'function') {
                const result = await db.query(sqlInsert, params);
                novoAgendamentoId = result.rows[0].id;
            } else {
                // Fallback para wrappers que não expõem .query diretamente
                const result = await new Promise((resolve, reject) => {
                    db.get(sqlInsert.replace(/\$[0-9]+/g, '?'), params, (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                novoAgendamentoId = result?.id;
            }
        } else {
            // SQLite
            const sqlInsert = `INSERT INTO agendamentos (cliente_id, data, hora, servico_id, servico, valor, duracao, status, empresa_id, profissional_id) 
                               VALUES (?, ?, ?, ?, ?, ?, 30, 'pendente', ?, ?)`;
            const params = [clienteId, data, hora, servicoId, servicoNome, valor, empresaId, profissionalId];

            await new Promise((resolve, reject) => {
                db.run(sqlInsert, params, function (err) {
                    if (err) reject(err);
                    else {
                        novoAgendamentoId = this.lastID;
                        resolve();
                    }
                });
            });
        }

        console.log(`✅ CHATBOT - Agendamento criado! ID: ${novoAgendamentoId}`);

        // ============================================
        // 2. BUSCAR DADOS DA EMPRESA
        // ============================================
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

        // ============================================
        // 3. BUSCAR DADOS DO CLIENTE
        // ============================================
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

        // ============================================
        // 4. ENVIAR WHATSAPP
        // ============================================
        const { enviarConfirmacao } = require('./server/services/whatsapp');

        await enviarConfirmacao({
            cliente: cliente,
            servico: { nome: servicoNome, valor: valor },
            data: data,
            hora: hora,
            profissional: profissionalId ? { nome: 'Profissional' } : null,
            empresa: empresa
        });

        res.json({ success: true, message: 'Agendamento confirmado!' });

    } catch (error) {
        console.error('❌ Erro no agendamento do chatbot:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Função auxiliar para organizar o envio do WhatsApp
async function processarWhatsApp(agendamentoId, empresaId, body, empresaDados = null) {
    console.log('🔍 [DEBUG] processarWhatsApp iniciado. body.clienteId:', body.clienteId);

    // 1. Buscar dados da empresa (com Promise para compatibilidade)
    let empresa = empresaDados;
    if (!empresa) {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        const sqlEmpresa = isProduction
            ? 'SELECT id, nome, telefone_dono, endereco FROM empresas WHERE id = $1'
            : 'SELECT id, nome, telefone_dono, endereco FROM empresas WHERE id = ?';

        empresa = await new Promise((resolve, reject) => {
            db.get(sqlEmpresa, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        console.log('🔍 [DEBUG] Empresa buscada:', empresa);
    }

    // 2. Buscar dados do cliente (CORRIGIDO COM PROMISE)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const sqlCliente = isProduction
        ? 'SELECT id, nome, telefone FROM clientes WHERE id = $1'
        : 'SELECT id, nome, telefone FROM clientes WHERE id = ?';

    const cliente = await new Promise((resolve, reject) => {
        db.get(sqlCliente, [body.clienteId], (err, row) => {
            if (err) {
                console.error('❌ Erro ao buscar cliente no banco:', err);
                reject(err);
            } else {
                resolve(row); // Agora isso vai retornar o cliente de verdade!
            }
        });
    });

    console.log('🔍 [DEBUG] Cliente retornado do banco:', cliente);

    // 3. Fallback de segurança: Tenta pegar do banco, se não tiver, tenta do body
    const telefoneFinal = cliente?.telefone || body.telefone;
    console.log('🔍 [DEBUG] Telefone final que será usado:', telefoneFinal);

    // 4. Validação final
    if (!telefoneFinal) {
        console.error('❌ [WHATSAPP] Abortando envio: Cliente realmente não possui telefone cadastrado.');
        return; // Interrompe sem quebrar o sistema
    }

    // 5. Chamar o serviço de WhatsApp
    // Ajuste o caminho './server/services/whatsapp' se o seu arquivo estiver em outro lugar
    const { enviarConfirmacao } = require('./server/services/whatsapp');

    await enviarConfirmacao({
        cliente: {
            ...cliente,
            telefone: telefoneFinal // Garante que o telefone esteja no objeto
        },
        servico: { nome: body.servicoNome, valor: body.valor },
        data: body.data,
        hora: body.hora,
        profissional: body.profissionalId ? { nome: 'Profissional' } : null,
        empresa: empresa // <--- A MÁGICA: empresa_id agora estará correto
    });

    console.log('✅ [DEBUG] Chamada para enviarConfirmacao realizada com sucesso!');
}

// ============================================================
// SIMULA��O DE PAGAMENTO
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
        if (err) console.error('Erro ao salvar simula��o:', err);
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
        if (err) console.error('Erro ao salvar simula��o:', err);
    });

    const plano = PLANOS[plano_id];
    if (plano) {
        const dataValidade = new Date();
        dataValidade.setMonth(dataValidade.getMonth() + 1);

        const sqlUpdate = isProduction
            ? `UPDATE empresas SET 
               plano = $1,
               limite_profissionais = $2,
               assinatura_ativa = true,
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
        if (err) console.error('Erro ao salvar simula��o:', err);
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
            return res.json({ success: false, message: 'Transa��o n�o encontrada' });
        }

        const plano = PLANOS[transacao.plano_id];
        if (plano) {
            const dataValidade = new Date();
            dataValidade.setMonth(dataValidade.getMonth() + 1);

            const sqlUpdate = isProduction
                ? `UPDATE empresas SET 
                   plano = $1,
                   limite_profissionais = $2,
                   assinatura_ativa = true,
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
            res.json({ success: false, message: 'Plano n�o encontrado' });
        }
    });
});

// ============================================
// 💳 CONFIGURAÇÃO DE PAGAMENTOS
// ============================================

// Variável global para controlar o modo de pagamento
let PAYMENT_MODE = process.env.PAYMENT_MODE || 'simulation';
console.log(`💳 Modo de pagamento inicial: ${PAYMENT_MODE === 'real' ? '🔴 REAL' : '🟡 SIMULAÇÃO'}`);

// 🔹 Rota para consultar o modo de pagamento atual
app.get('/api/payment/config', auth, (req, res) => {
    const isReal = PAYMENT_MODE === 'real';
    const label = isReal ? '🔴 Pagamentos Reais' : '🟡 Modo Simulação';

    console.log(`📊 GET /api/payment/config - Modo atual: ${PAYMENT_MODE}`);

    res.json({
        success: true,
        data: {
            mode: PAYMENT_MODE,
            isReal: isReal,
            isSimulation: !isReal,
            label: label
        }
    });
});

// 🔹 Rota para alternar o modo de pagamento (APENAS SUPER ADMIN)
app.put('/api/payment/config', auth, verificarSuperAdmin, (req, res) => {
    const { mode } = req.body;

    console.log(`🔄 PUT /api/payment/config - Tentando alterar para: ${mode}`);
    console.log(`🔄 Modo atual antes da mudança: ${PAYMENT_MODE}`);

    if (mode !== 'simulation' && mode !== 'real') {
        return res.status(400).json({
            success: false,
            message: 'Modo inválido. Use "simulation" ou "real"'
        });
    }

    // Atualizar a variável global
    PAYMENT_MODE = mode;

    console.log(`✅ Modo de pagamento alterado para: ${mode === 'real' ? '🔴 REAL' : '🟡 SIMULAÇÃO'}`);
    console.log(`✅ Novo valor de PAYMENT_MODE: ${PAYMENT_MODE}`);

    res.json({
        success: true,
        message: `Modo de pagamento alterado para: ${mode === 'real' ? '🔴 REAL' : '🟡 SIMULAÇÃO'}`,
        data: {
            mode: mode,
            isReal: mode === 'real',
            isSimulation: mode !== 'real'
        }
    });
});

// 🔹 Rota para verificar se a rota está funcionando
app.get('/api/payment/status', (req, res) => {
    res.json({
        success: true,
        message: 'Rota de pagamento funcionando',
        mode: PAYMENT_MODE
    });
});

// ============================================================
// JOBS E SERVI�OS
// ============================================================

// Inicia o job de lembretes WhatsApp
const lembreteJob = require('./server/jobs/lembretes');

if (process.env.WHATSAPP_ENABLED === 'true') {
    lembreteJob.start();
    console.log('? Job de lembretes WhatsApp iniciado');
} else {
    console.log('?? WhatsApp desabilitado (WHATSAPP_ENABLED=false)');
}

// ============================================================
// INICIAR WPPCONNECT LOCAL (SE HABILITADO)
// ============================================================
if (process.env.WHATSAPP_ENABLED === 'true' && process.env.WHATSAPP_PROVIDER === 'wppconnect') {
    try {
        const { getClient } = require('./server/services/wppconnect-local');
        setTimeout(async () => {
            try {
                await getClient();
                console.log('? WhatsApp WPPConnect iniciado com sucesso!');
            } catch (err) {
                console.error('? Erro ao iniciar WPPConnect:', err.message);
            }
        }, 2000);
    } catch (error) {
        console.error('? Erro ao carregar wppconnect-local:', error.message);
    }
}

// ============================================
// ROTA: PROFISSIONAIS DISPON�VEIS POR HOR�RIO
// ============================================

app.get('/api/agenda/profissionais-disponiveis', auth, (req, res) => {
    const { data, hora } = req.query;
    const empresa_id = req.usuario.empresa_id;

    if (!data || !hora) {
        return res.json({ success: false, message: 'Data e hora s�o obrigat�rias' });
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
// ROTA: AGENDAMENTOS POR PER�ODO (PARA AGENDA)
// ============================================

app.get('/api/agendamentos/periodo', auth, (req, res) => {
    const { data_inicio, data_fim } = req.query;
    const empresa_id = req.usuario.empresa_id;

    if (!data_inicio || !data_fim) {
        return res.json({ success: false, message: 'Data in�cio e fim s�o obrigat�rias' });
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

const EvolutionInstances = require('./server/services/evolution-instances');

// ============================================
// 🔥 WHATSAPP PRÓPRIO - CONTROLE DO SUPER ADMIN
// ============================================

// 🔹 Habilitar/Desabilitar WhatsApp próprio de uma empresa
app.put('/api/admin/empresas/:id/whatsapp-proprio', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { habilitado } = req.body;

    console.log(`🔧 Super Admin - ${habilitado ? 'Habilitando' : 'Desabilitando'} WhatsApp próprio da empresa ${id}`);

    const sql = isProduction
        ? 'UPDATE empresas SET whatsapp_proprio_habilitado = $1 WHERE id = $2'
        : 'UPDATE empresas SET whatsapp_proprio_habilitado = ? WHERE id = ?';

    const valor = isProduction ? habilitado : (habilitado ? 1 : 0);

    db.run(sql, [valor, id], function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log(`✅ WhatsApp próprio ${habilitado ? 'HABILITADO' : 'DESABILITADO'} para empresa ${id}`);
        res.json({
            success: true,
            message: `WhatsApp próprio ${habilitado ? 'habilitado' : 'desabilitado'} com sucesso!`
        });
    });
});

// 🔹 Listar status do WhatsApp de todas as empresas (para o Super Admin)
app.get('/api/admin/empresas/whatsapp-status', auth, verificarSuperAdmin, (req, res) => {
    const sql = isProduction
        ? `SELECT id, nome, plano, whatsapp_instance, whatsapp_connected, whatsapp_number, 
                  whatsapp_proprio_habilitado, created_at
           FROM empresas 
           ORDER BY created_at DESC`
        : `SELECT id, nome, plano, whatsapp_instance, whatsapp_connected, whatsapp_number, 
                  whatsapp_proprio_habilitado, created_at
           FROM empresas 
           ORDER BY created_at DESC`;

    db.all(sql, [], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao buscar status WhatsApp:', err);
            return res.json({ success: false, message: err.message });
        }

        const dados = empresas.map(e => {
            const habilitado = e.whatsapp_proprio_habilitado === true ||
                e.whatsapp_proprio_habilitado === 1 ||
                e.whatsapp_proprio_habilitado === 't';
            const conectado = e.whatsapp_connected === true ||
                e.whatsapp_connected === 1 ||
                e.whatsapp_connected === 't';

            return {
                id: e.id,
                nome: e.nome,
                plano: e.plano,
                whatsapp_habilitado: habilitado,
                whatsapp_conectado: conectado,
                whatsapp_instancia: e.whatsapp_instance || null,
                whatsapp_numero: e.whatsapp_number || null,
                pode_habilitar: ['Business', 'Enterprise', 'business', 'enterprise'].includes(e.plano)
            };
        });

        res.json({ success: true, data: dados });
    });
});

// 🔹 Buscar info do WhatsApp da empresa (considerando plano e permissão)
app.get('/api/empresa/whatsapp/info', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const sql = isProduction
        ? 'SELECT plano, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_proprio_habilitado FROM empresas WHERE id = $1'
        : 'SELECT plano, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_proprio_habilitado FROM empresas WHERE id = ?';

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar info' });
        }

        if (!empresa) {
            return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        }

        // 🔥 SUPER ADMIN HABILITOU? (override manual)
        const superAdminHabilitou = empresa.whatsapp_proprio_habilitado === true ||
            empresa.whatsapp_proprio_habilitado === 1 ||
            empresa.whatsapp_proprio_habilitado === 't';

        // Plano permite automaticamente? (Business/Enterprise)
        const planoPermitido = ['Business', 'Enterprise', 'business', 'enterprise'].includes(empresa.plano);

        // Empresa pode usar WhatsApp próprio? (override OU plano permitido)
        const podeUsarProprio = superAdminHabilitou || planoPermitido;

        res.json({
            success: true,
            data: {
                plano: empresa.plano,
                planoPermitido: planoPermitido,
                superAdminHabilitou: superAdminHabilitou,
                podeUsarProprio: podeUsarProprio,
                instanceName: empresa.whatsapp_instance || null,
                connected: Boolean(empresa.whatsapp_connected),
                number: empresa.whatsapp_number || null
            }
        });
    });
});

// 🔹 Criar instância
app.post('/api/empresa/whatsapp/criar-instancia', auth, async (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const sqlSelect = isProduction
        ? 'SELECT nome, whatsapp_instance FROM empresas WHERE id = $1'
        : 'SELECT nome, whatsapp_instance FROM empresas WHERE id = ?';

    db.get(sqlSelect, [empresaId], async (err, empresa) => {
        if (err || !empresa) {
            return res.status(400).json({ success: false, message: 'Empresa não encontrada' });
        }

        if (empresa.whatsapp_instance) {
            return res.json({
                success: true,
                message: 'Instância já existe',
                instanceName: empresa.whatsapp_instance
            });
        }

        const resultado = await EvolutionInstances.criarInstancia(empresaId, empresa.nome);

        if (!resultado.success) {
            return res.status(400).json({ success: false, message: resultado.message });
        }

        const sqlUpdate = isProduction
            ? 'UPDATE empresas SET whatsapp_instance = $1 WHERE id = $2'
            : 'UPDATE empresas SET whatsapp_instance = ? WHERE id = ?';

        db.run(sqlUpdate, [resultado.instanceName, empresaId], (err) => {
            if (err) {
                console.error('❌ Erro ao salvar instância:', err);
                return res.status(500).json({ success: false, message: 'Erro ao salvar' });
            }

            res.json({
                success: true,
                instanceName: resultado.instanceName,
                message: 'Instância criada!'
            });
        });
    });
});

// 🔹 Buscar QR Code
app.get('/api/empresa/whatsapp/qrcode', auth, async (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const sql = isProduction
        ? 'SELECT whatsapp_instance, whatsapp_connected FROM empresas WHERE id = $1'
        : 'SELECT whatsapp_instance, whatsapp_connected FROM empresas WHERE id = ?';

    db.get(sql, [empresaId], async (err, empresa) => {
        if (err || !empresa?.whatsapp_instance) {
            return res.status(400).json({
                success: false,
                message: 'Crie uma instância primeiro'
            });
        }

        // 🔥 Se já está conectado, não tenta gerar QR Code
        const isConnected = empresa.whatsapp_connected === true ||
            empresa.whatsapp_connected === 1 ||
            empresa.whatsapp_connected === 't';

        if (isConnected) {
            return res.json({
                success: false,
                message: 'WhatsApp já está conectado!',
                alreadyConnected: true
            });
        }

        const resultado = await EvolutionInstances.getQrCode(empresa.whatsapp_instance);

        if (resultado.success && resultado.qrCode) {
            res.json({
                success: true,
                qrCode: resultado.qrCode,
                pairingCode: resultado.pairingCode || null
            });
        } else {
            res.json({
                success: false,
                message: resultado.message || 'Erro ao gerar QR Code'
            });
        }
    });
});

// 🔹 Verificar status
app.get('/api/empresa/whatsapp/status', auth, async (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const sql = isProduction
        ? 'SELECT whatsapp_instance, whatsapp_connected, whatsapp_number FROM empresas WHERE id = $1'
        : 'SELECT whatsapp_instance, whatsapp_connected, whatsapp_number FROM empresas WHERE id = ?';

    db.get(sql, [empresaId], async (err, empresa) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao verificar' });
        }

        if (!empresa?.whatsapp_instance) {
            return res.json({ success: true, data: { connected: false, status: 'no_instance' } });
        }

        const status = await EvolutionInstances.getStatus(empresa.whatsapp_instance);
        const isConnected = status.state === 'open';

        if (isConnected !== Boolean(empresa.whatsapp_connected)) {
            const sqlUpdate = isProduction
                ? 'UPDATE empresas SET whatsapp_connected = $1 WHERE id = $2'
                : 'UPDATE empresas SET whatsapp_connected = ? WHERE id = ?';

            db.run(sqlUpdate, [isConnected, empresaId], () => { });
        }

        res.json({
            success: true,
            data: {
                connected: isConnected,
                status: status.state,
                instanceName: empresa.whatsapp_instance,
                number: empresa.whatsapp_number
            }
        });
    });
});

// 🔹 Desconectar
app.post('/api/empresa/whatsapp/disconnect', auth, async (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const sql = isProduction
        ? 'SELECT whatsapp_instance FROM empresas WHERE id = $1'
        : 'SELECT whatsapp_instance FROM empresas WHERE id = ?';

    db.get(sql, [empresaId], async (err, empresa) => {
        if (err || !empresa?.whatsapp_instance) {
            return res.status(400).json({ success: false, message: 'Sem instância' });
        }

        await EvolutionInstances.logout(empresa.whatsapp_instance);

        const sqlUpdate = isProduction
            ? 'UPDATE empresas SET whatsapp_connected = FALSE, whatsapp_number = NULL WHERE id = $1'
            : 'UPDATE empresas SET whatsapp_connected = 0, whatsapp_number = NULL WHERE id = ?';

        db.run(sqlUpdate, [empresaId], (err) => {
            if (err) {
                console.error('❌ Erro ao desconectar:', err);
                return res.status(500).json({ success: false, message: 'Erro ao desconectar' });
            }

            res.json({ success: true, message: 'WhatsApp desconectado' });
        });
    });
});

// ============================================================
// 💳 MERCADO PAGO - PAGAMENTOS REAIS
// ============================================================

// 🔹 Boleto Real - COM NOME COMPLETO + EMAIL
app.post('/api/create-boleto', auth, async (req, res) => {
    const { plano_id, plano_nome, valor, cpf, periodo } = req.body;
    const empresaId = req.usuario.empresa_id;
    const emailUsuario = req.usuario.email;
    const nomeUsuario = req.usuario.nome || 'Cliente Teste';

    console.log('💳 Criando boleto:', { empresaId, plano_id, valor, cpf });

    if (!cpf) {
        return res.status(400).json({
            success: false,
            message: 'CPF é obrigatório para boleto'
        });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length < 11) {
        return res.status(400).json({
            success: false,
            message: 'CPF inválido. Digite 11 números.'
        });
    }

    const resultado = await mercadopago.criarBoleto(
        empresaId,
        plano_id,
        plano_nome,
        valor,
        cpfLimpo,
        nomeUsuario,
        emailUsuario
    );

    if (resultado.success) {
        // 🔥 ENVIAR EMAIL DO BOLETO
        try {
            const emailService = require('./server/services/email');
            await emailService.enviarBoleto(
                emailUsuario,
                nomeUsuario,
                plano_nome,
                valor,
                resultado.boleto_url
            );
            console.log(`✅ Email do boleto enviado para ${emailUsuario}`);
        } catch (emailErr) {
            console.error('❌ Erro ao enviar email do boleto:', emailErr.message);
        }

        res.json({ success: true, ...resultado });
    } else {
        console.error('❌ Erro ao criar boleto:', resultado);
        res.status(400).json(resultado);
    }
});

// 🔹 PIX Real + EMAIL
app.post('/api/create-pix', auth, async (req, res) => {
    const { plano_id, plano_nome, valor, periodo } = req.body;
    const empresaId = req.usuario.empresa_id;
    const emailUsuario = req.usuario.email;
    const nomeUsuario = req.usuario.nome || 'Cliente';

    console.log('💳 Criando PIX:', { empresaId, plano_id, valor, email: emailUsuario });

    const resultado = await mercadopago.criarPix(empresaId, plano_id, plano_nome, valor, periodo, emailUsuario);

    if (resultado.success) {
        const sql = isProduction
            ? `INSERT INTO transacoes_pagamento (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at) VALUES ($1,$2,$3,$4,'pix',$5,'pending',$6,$7,CURRENT_TIMESTAMP)`
            : `INSERT INTO transacoes_pagamento (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, qr_code, qr_code_base64, created_at) VALUES (?,?,?,?, 'pix',?,'pending',?,?,CURRENT_TIMESTAMP)`;

        db.run(sql, [empresaId, plano_id, plano_nome, valor, resultado.payment_id, resultado.qr_code, resultado.qr_code_base64]);

        // 🔥 ENVIAR EMAIL DO PIX
        try {
            const emailService = require('./server/services/email');
            await emailService.enviarPix(
                emailUsuario,
                nomeUsuario,
                plano_nome,
                valor,
                resultado.qr_code,
                resultado.qr_code_base64
            );
            console.log(`✅ Email do PIX enviado para ${emailUsuario}`);
        } catch (emailErr) {
            console.error('❌ Erro ao enviar email do PIX:', emailErr.message);
        }

        res.json({ success: true, ...resultado });
    } else {
        console.error('❌ Erro ao criar PIX:', resultado);
        res.status(400).json(resultado);
    }
});

// 🔹 Criar preferência de pagamento (Checkout Pro)
app.post('/api/create-payment', auth, async (req, res) => {
    const { plano_id, plano_nome, valor, metodo_pagamento, periodo } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log('💳 Criando pagamento:', { empresaId, plano_id, valor });

    if (!plano_id || !valor) {
        return res.status(400).json({
            success: false,
            message: 'Plano e valor são obrigatórios'
        });
    }

    try {
        const emailTeste = 'test_user_1689549456@testuser.com';

        const preference = {
            items: [{
                title: `Plano ${plano_nome} - ${periodo === 'anual' ? 'Anual' : 'Mensal'}`,
                quantity: 1,
                unit_price: parseFloat(valor),
                currency_id: 'BRL'
            }],
            payer: {
                email: emailTeste,
                name: 'Test',
                surname: 'User'
            },
            external_reference: `emp_${empresaId}_${plano_id}_${Date.now()}`,
            notification_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/webhook/mercadopago`,
            back_urls: {
                success: `${process.env.BASE_URL || 'http://localhost:3000'}/?payment=success`,
                failure: `${process.env.BASE_URL || 'http://localhost:3000'}/?payment=failure`,
                pending: `${process.env.BASE_URL || 'http://localhost:3000'}/?payment=pending`
            }
        };

        const resultado = await mercadopago.criarPreferencia(preference);

        if (resultado.success) {
            const sql = isProduction
                ? `INSERT INTO transacoes_pagamento (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, external_reference, created_at) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,CURRENT_TIMESTAMP)`
                : `INSERT INTO transacoes_pagamento (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, external_reference, created_at) VALUES (?,?,?,?,?,?, 'pending',?,CURRENT_TIMESTAMP)`;

            db.run(sql, [
                empresaId,
                plano_id,
                plano_nome,
                valor,
                metodo_pagamento || 'checkout',
                resultado.preference_id,
                resultado.external_reference
            ]);

            // 🔥 FORÇAR LINK DE PRODUÇÃO
            const url = resultado.init_point || resultado.sandbox_init_point;

            console.log('🔗 Link gerado:', url);
            console.log('🔗 É sandbox?', url?.includes('sandbox') ? '✅ SIM' : '❌ NÃO');

            res.json({
                success: true,
                init_point: url,
                preference_id: resultado.preference_id
            });
        } else {
            console.error('❌ Erro do Mercado Pago:', resultado);
            res.status(400).json({
                success: false,
                message: resultado.message || 'Erro ao criar pagamento'
            });
        }
    } catch (error) {
        console.error('❌ Erro ao criar pagamento:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno ao processar pagamento'
        });
    }
});
// 🔹 Consultar status do pagamento
app.get('/api/check-payment/:paymentId', auth, async (req, res) => {
    const { paymentId } = req.params;

    // Se for pagamento simulado
    if (paymentId.startsWith('sim_')) {
        return res.json({ success: true, status: 'pending' });
    }

    const resultado = await mercadopago.consultarPagamento(paymentId);

    if (resultado.success && resultado.status === 'approved') {
        db.get('SELECT * FROM transacoes_pagamento WHERE pagamento_id = ?', [paymentId], (err, transacao) => {
            if (transacao) {
                const plano = PLANOS[transacao.plano_id];
                if (plano) {
                    const dataValidade = new Date();
                    dataValidade.setMonth(dataValidade.getMonth() + 1);

                    const sqlUpdate = isProduction
                        ? `UPDATE empresas SET plano=$1, limite_profissionais=$2, assinatura_ativa=TRUE, assinatura_valida_ate=$3 WHERE id=$4`
                        : `UPDATE empresas SET plano=?, limite_profissionais=?, assinatura_ativa=1, assinatura_valida_ate=? WHERE id=?`;

                    db.run(sqlUpdate, [plano.nome, plano.limite, dataValidade.toISOString(), transacao.empresa_id]);
                }
            }
        });
    }

    res.json(resultado);
});

// 🔹 Webhook do Mercado Pago
app.post('/api/webhook/mercadopago', async (req, res) => {
    console.log('📩 Webhook Mercado Pago:', req.body);

    if (req.body.type === 'payment') {
        const resultado = await mercadopago.consultarPagamento(req.body.data.id);

        if (resultado.success && resultado.status === 'approved') {
            db.get('SELECT * FROM transacoes_pagamento WHERE pagamento_id = ?', [req.body.data.id], (err, transacao) => {
                if (transacao) {
                    const plano = PLANOS[transacao.plano_id];
                    if (plano) {
                        const dataValidade = new Date();
                        dataValidade.setMonth(dataValidade.getMonth() + 1);

                        const sqlUpdate = isProduction
                            ? `UPDATE empresas SET plano=$1, limite_profissionais=$2, assinatura_ativa=TRUE, assinatura_valida_ate=$3 WHERE id=$4`
                            : `UPDATE empresas SET plano=?, limite_profissionais=?, assinatura_ativa=1, assinatura_valida_ate=? WHERE id=?`;

                        db.run(sqlUpdate, [plano.nome, plano.limite, dataValidade.toISOString(), transacao.empresa_id]);
                        console.log(`✅ Empresa ${transacao.empresa_id} atualizada para plano ${plano.nome}`);
                    }
                }
            });
        }
    }

    res.sendStatus(200);
});

// ============================================
// CONFIRMAR PAGAMENTO SIMULADO (TESTE)
// ============================================
app.post('/api/confirm-simulated-payment/:paymentId', auth, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const usuario = req.usuario;
        const { plano, status } = req.body;

        console.log('🔄 Simulando pagamento:', { paymentId, plano, status });

        // Verificar se é um ID simulado
        if (!paymentId.startsWith('sim_')) {
            return res.status(400).json({
                success: false,
                message: 'ID de pagamento inválido para simulação'
            });
        }

        // Se o status for 'approved', ativar o plano
        if (status === 'approved') {
            // Define o plano conforme o ID
            const planoId = plano || 'starter';
            const planos = {
                // 'teste': { nome: 'Teste R$ 1,00', limite: 1, valor: 1.00 },  // ← JÁ ESTÁ COMENTADO! ✅
                'starter': { nome: 'Starter', limite: 1 },
                'pro': { nome: 'Pro', limite: 5 },
                'business': { nome: 'Business', limite: 15 },
                'enterprise': { nome: 'Enterprise', limite: 9999 }
            };

            const planoInfo = planos[planoId] || planos['starter'];
            const dataValidade = new Date();
            dataValidade.setMonth(dataValidade.getMonth() + 1);

            const isProduction = process.env.RENDER === 'true';

            // Atualizar a empresa
            const sqlUpdate = isProduction
                ? `UPDATE empresas SET plano=$1, limite_profissionais=$2, assinatura_ativa=TRUE, assinatura_valida_ate=$3 WHERE id=$4`
                : `UPDATE empresas SET plano=?, limite_profissionais=?, assinatura_ativa=1, assinatura_valida_ate=? WHERE id=?`;

            await new Promise((resolve, reject) => {
                db.run(sqlUpdate, [planoInfo.nome, planoInfo.limite, dataValidade.toISOString(), usuario.empresa_id], function (err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Salvar transação simulada
            const sqlTransacao = isProduction
                ? `INSERT INTO transacoes_pagamento (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at) VALUES ($1,$2,$3,$4,'simulacao',$5,'approved',CURRENT_TIMESTAMP)`
                : `INSERT INTO transacoes_pagamento (empresa_id, plano_id, plano_nome, valor, metodo, pagamento_id, status, created_at) VALUES (?,?,?,?,'simulacao',?,'approved',CURRENT_TIMESTAMP)`;

            await new Promise((resolve, reject) => {
                db.run(sqlTransacao, [usuario.empresa_id, planoId, planoInfo.nome, 0, paymentId], function (err) {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log(`✅ Plano ${planoInfo.nome} ativado para empresa ${usuario.empresa_id}`);

            return res.json({
                success: true,
                message: `Plano ${planoInfo.nome} ativado com sucesso!`,
                data: {
                    plano: planoInfo.nome,
                    limite: planoInfo.limite,
                    valida_ate: dataValidade.toISOString()
                }
            });
        }

        return res.json({
            success: true,
            status: 'pending',
            message: 'Pagamento pendente'
        });

    } catch (error) {
        console.error('❌ Erro ao simular pagamento:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro ao simular pagamento'
        });
    }
});
// ============================================
// ROTA: ATUALIZAR SERVIÇOS EXTRAS
// ============================================
app.put('/api/agendamentos/:id/extras', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { servicos_extras } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('📝 Atualizando extras:', { id, empresa_id, servicos_extras });

    // Calcular valor total dos extras
    let valorExtras = 0;
    if (Array.isArray(servicos_extras)) {
        for (let extra of servicos_extras) {
            valorExtras += parseFloat(extra.valor) || 0;
        }
    }

    // Buscar valor principal do agendamento
    const sqlSelect = isProduction
        ? `SELECT valor FROM agendamentos WHERE id = $1 AND empresa_id = $2`
        : `SELECT valor FROM agendamentos WHERE id = ? AND empresa_id = ?`;

    db.get(sqlSelect, [id, empresa_id], (err, row) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamento:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar agendamento: ' + err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Agendamento não encontrado'
            });
        }

        const valorPrincipal = parseFloat(row.valor) || 0;
        const valorTotal = valorPrincipal + valorExtras;

        // Converter para JSON (funciona no SQLite e PostgreSQL)
        const extrasValue = JSON.stringify(servicos_extras || []);

        // Atualizar
        const sqlUpdate = isProduction
            ? `UPDATE agendamentos 
               SET servicos_extras = $1::jsonb, 
                   valor_extras = $2, 
                   valor_total = $3 
               WHERE id = $4 AND empresa_id = $5`
            : `UPDATE agendamentos 
               SET servicos_extras = ?, 
                   valor_extras = ?, 
                   valor_total = ? 
               WHERE id = ? AND empresa_id = ?`;

        const params = [extrasValue, valorExtras, valorTotal, id, empresa_id];

        console.log('📝 SQL:', sqlUpdate);
        console.log('📝 Params:', params);

        db.run(sqlUpdate, params, function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar extras:', err);
                console.error('❌ SQL:', sqlUpdate);
                console.error('❌ Params:', params);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao atualizar extras: ' + err.message
                });
            }

            console.log('✅ Extras atualizados com sucesso!');
            res.json({
                success: true,
                message: 'Extras atualizados!',
                data: {
                    servicos_extras: servicos_extras,
                    valor_extras: valorExtras,
                    valor_total: valorTotal
                }
            });
        });
    });
});

// ============================================
// ROTA: BUSCAR CONTATOS DO WHATSAPP
// ============================================

app.post('/api/whatsapp/contatos', auth, async (req, res) => {
    try {
        const { instanceName } = req.body;

        if (!instanceName) {
            return res.status(400).json({
                success: false,
                message: 'Nome da instância é obrigatório'
            });
        }

        console.log(`📱 Buscando contatos da instância: ${instanceName}`);

        const EvolutionInstances = require('./server/services/evolution-instances');

        // Buscar contatos usando o novo método
        const contatos = await EvolutionInstances.getContatos(instanceName);

        console.log(`✅ ${contatos.length} contatos encontrados`);

        res.json({
            success: true,
            contatos: contatos,
            total: contatos.length
        });

    } catch (error) {
        console.error('❌ Erro ao buscar contatos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao buscar contatos do WhatsApp'
        });
    }
});
// ============================================
// WEBHOOK DO WHATSAPP - RECEBER MENSAGENS
// ============================================

app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
        console.log('📩 Webhook recebido!');
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));

        const { instance, data } = req.body;

        // Verificar se é uma mensagem
        if (data?.message?.conversation || data?.message?.text) {
            const numero = data.sender?.id || data.sender?.number || '';
            const nome = data.sender?.pushname || data.sender?.name || 'Cliente WhatsApp';
            const mensagem = data.message?.conversation || data.message?.text || '';

            // Limpar número
            const numeroLimpo = numero.replace(/@.*$/, '').replace(/\D/g, '');

            console.log(`📱 Mensagem de ${nome} (${numeroLimpo}): ${mensagem.substring(0, 50)}`);

            // Buscar empresa pela instância
            const empresa = await db.get(
                'SELECT id FROM empresas WHERE whatsapp_instance = ?',
                [instance]
            );

            if (!empresa) {
                console.log(`⚠️ Empresa não encontrada para instância: ${instance}`);
                return res.sendStatus(200);
            }

            // Verificar se cliente já existe
            const clienteExistente = await db.get(
                'SELECT id FROM clientes WHERE empresa_id = ? AND telefone LIKE ?',
                [empresa.id, `%${numeroLimpo}%`]
            );

            if (!clienteExistente) {
                // Cadastrar cliente automaticamente
                const nomeCliente = nome || 'Cliente WhatsApp';
                await db.run(
                    `INSERT INTO clientes (nome, telefone, empresa_id, created_at) 
                     VALUES (?, ?, ?, datetime('now'))`,
                    [nomeCliente, numeroLimpo, empresa.id]
                );

                console.log(`✅ Novo cliente cadastrado automaticamente: ${nomeCliente} (${numeroLimpo})`);
            } else {
                console.log(`✅ Cliente já existe: ${nome} (${numeroLimpo})`);
            }
        }

        res.sendStatus(200);

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        res.sendStatus(200); // Sempre retornar 200 para não bloquear
    }
});

// Rota GET para testar se o webhook está acessível
app.get('/api/whatsapp/webhook', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Webhook está funcionando!',
        timestamp: new Date().toISOString()
    });
});
// ============================================
// ROTA: ENVIAR MENSAGEM WHATSAPP
// ============================================

app.post('/api/whatsapp/enviar', auth, async (req, res) => {
    try {
        const { numero, mensagem } = req.body;
        const empresaId = req.usuario.empresa_id;

        console.log(`📱 Enviando mensagem para ${numero} (empresa ${empresaId})`);

        if (!numero || !mensagem) {
            return res.status(400).json({
                success: false,
                message: 'Número e mensagem são obrigatórios'
            });
        }

        // Limpar número
        const numeroLimpo = numero.replace(/\D/g, '');
        if (!numeroLimpo) {
            return res.status(400).json({
                success: false,
                message: 'Número inválido'
            });
        }

        // Verificar se o WhatsApp está ativo
        if (process.env.WHATSAPP_ENABLED !== 'true') {
            console.log(`📱 [MODO LOG] Mensagem para ${numeroLimpo}: ${mensagem}`);
            return res.json({
                success: true,
                message: 'Mensagem registrada (modo log)',
                modo_log: true
            });
        }

        // Buscar dados da empresa para saber qual instância usar
        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? `SELECT id, whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado 
                   FROM empresas WHERE id = $1`
                : `SELECT id, whatsapp_instance, whatsapp_connected, whatsapp_proprio_habilitado 
                   FROM empresas WHERE id = ?`;

            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        // 🔥 LÓGICA DE FALLBACK - usar instância própria se conectada, senão usar padrão
        let instanceName = 'seeagende'; // instância padrão

        const proprioHabilitado = empresa.whatsapp_proprio_habilitado === true ||
            empresa.whatsapp_proprio_habilitado === 1 ||
            empresa.whatsapp_proprio_habilitado === 't';

        if (proprioHabilitado && empresa.whatsapp_instance) {
            const conectado = empresa.whatsapp_connected === true ||
                empresa.whatsapp_connected === 1 ||
                empresa.whatsapp_connected === 't';

            if (conectado) {
                instanceName = empresa.whatsapp_instance;
                console.log(`📱 Usando instância própria: ${instanceName}`);
            } else {
                console.log(`⚠️ Instância própria ${empresa.whatsapp_instance} não está conectada, usando padrão seeagende`);
                instanceName = 'seeagende';
            }
        } else {
            console.log(`📱 Usando instância padrão: ${instanceName}`);
        }

        // Enviar via Evolution API
        try {
            const EvolutionInstances = require('./server/services/evolution-instances');
            const resultado = await EvolutionInstances.enviarMensagem(instanceName, numeroLimpo, mensagem);

            if (resultado.success) {
                console.log(`✅ Mensagem enviada para ${numeroLimpo} via ${instanceName}`);
                res.json({
                    success: true,
                    message: 'Mensagem enviada com sucesso!'
                });
            } else {
                console.error(`❌ Erro ao enviar: ${resultado.message}`);
                res.status(500).json({
                    success: false,
                    message: resultado.message || 'Erro ao enviar mensagem'
                });
            }
        } catch (error) {
            console.error('❌ Erro ao enviar via Evolution:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Erro ao enviar mensagem'
            });
        }

    } catch (error) {
        console.error('❌ Erro ao enviar mensagem:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno ao enviar mensagem'
        });
    }
});

// ============================================================
// INICIALIZA��O DO SERVIDOR
// ============================================================

const HOST = process.env.RENDER === 'true' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
    console.log(`?? Servidor rodando em http://${HOST}:${PORT}`);
    console.log(`?? Super Admin: super@admin.com / super123`);
    console.log(`?? Dono: admin@teste.com / 123456`);
    console.log(`\n?? PLANOS DISPON�VEIS:`);
    console.log(`   Starter: R$ 24,90/m�s - 1 profissional`);
    console.log(`   Pro: R$ 49,90/m�s - 5 profissionais`);
    console.log(`   Business: R$ 99,90/m�s - 12 profissionais`);
    console.log(`   Enterprise: R$ 199,90/m�s - Profissionais ilimitados`);
    console.log(`\n?? WhatsApp: ${process.env.WHATSAPP_ENABLED === 'true' ? '? ATIVADO' : '? DESABILITADO'}`);
});

// ============================================================
// KEEP ALIVE (Evita dormir no Render)
// ============================================================

if (process.env.RENDER === 'true') {
    try {
        const { keepAlive } = require('./keep_alive');
        keepAlive();
        console.log('?? Keep Alive ativado para o Render!');
    } catch (error) {
        console.log('?? Erro ao carregar keep_alive:', error.message);
        // Fallback: ping simples
        const http = require('http');
        setInterval(() => {
            http.get(`http://localhost:${PORT}`, (res) => {
                console.log(`?? Keep Alive ping - Status: ${res.statusCode}`);
            }).on('error', () => { });
        }, 4 * 60 * 1000);
        console.log('?? Keep Alive fallback ativado!');
    }
}

// Tamb�m criar um cron job separado para garantir
if (process.env.RENDER === 'true') {
    try {
        require('./cron');
        console.log('?? Cron job ativado!');
    } catch (error) {
        console.log('?? Cron job n�o encontrado, continuando...');
    }
}

// ============================================
// JOB DE RESET DE CONTADORES
// ============================================

try {
    const resetJob = require('./server/jobs/reset-contador');
    resetJob.start();
    console.log('? Job de reset de contadores iniciado');
} catch (error) {
    console.log('?? Erro ao iniciar job de reset:', error.message);
}

