// ============================================================
// 🚀 SEE&AGENDE - SERVIDOR PRINCIPAL
// ============================================================
// 
// ATENÇÃO: Todas as rotas foram extraídas para server/routes/
// 
// Este arquivo contém apenas:
// - Configuração do servidor
// - Middlewares
// - Conexão com banco
// - Jobs (lembretes, reset contadores)
// - Importação das rotas
//
// ============================================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

// ============================================
// CARREGAR JOBS
// ============================================

// Job de lembretes de pagamento (fiado)
try {
    require('./server/jobs/lembretes-pagamento');
    console.log('✅ Job de lembretes de pagamento carregado');
} catch (error) {
    console.error('❌ Erro ao carregar job de lembretes de pagamento:', error.message);
}
// ============================================
// IMPORTS DAS PARTES EXTRATÍDAS
// ============================================

const { db, getEmpresaDb, initDatabase, inserirHorariosPadrao } = require('./server/config/database');
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

// ============================================
// COMPATIBILIDADE SQLite + PostgreSQL
// ============================================
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

function formatDate(coluna) {
    return isProduction ? `TO_CHAR(${coluna}, 'YYYY-MM-DD')` : `date(${coluna})`;
}

function formatMonthYear(coluna) {
    return isProduction ? `TO_CHAR(${coluna}, 'YYYY-MM')` : `strftime('%Y-%m', ${coluna})`;
}

function coalesceSum(valor) {
    return isProduction ? `COALESCE(SUM(${valor}), 0)` : `IFNULL(SUM(${valor}), 0)`;
}

function dateInterval(intervalo) {
    return isProduction ? `CURRENT_DATE - INTERVAL '${intervalo}'` : `date('now', '-${intervalo}')`;
}

function extractMonth(coluna) {
    return isProduction ? `EXTRACT(MONTH FROM ${coluna})` : `strftime('%m', ${coluna})`;
}

function extractYear(coluna) {
    return isProduction ? `EXTRACT(YEAR FROM ${coluna})` : `strftime('%Y', ${coluna})`;
}

function extractDay(coluna) {
    return isProduction ? `EXTRACT(DAY FROM ${coluna})` : `strftime('%d', ${coluna})`;
}

function lower(coluna) {
    return `LOWER(${coluna})`;
}

// ============================================================
// MERCADO PAGO
// ============================================================
const mercadopago = require('./server/services/mercadopago');

// ============================================================
// SERVIÇO WHATSAPP
// ============================================================
const whatsappService = require('./server/services/whatsapp');

// ============================================================
// APLICAÇÃO
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// 🚀 PWA - ARQUIVOS ESTÁTICOS DA RAIZ
// ============================================================
app.use(express.static(__dirname));

app.get('/manifest.json', (req, res) => {
    res.sendFile(__dirname + '/manifest.json');
});

app.get('/sw.js', (req, res) => {
    res.sendFile(__dirname + '/sw.js');
});

app.get('/icons/:file', (req, res) => {
    const fs = require('fs');
    const filePath = __dirname + '/public/icons/' + req.params.file;
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Icon not found' });
    }
});

console.log('✅ PWA configurado: manifest.json e sw.js servidos da raiz');

// 🔥 MIDDLEWARE PARA DISPONIBILIZAR DB NAS ROTAS
app.use((req, res, next) => {
    req.db = db;
    req.getEmpresaDb = getEmpresaDb;
    next();
});

// ============================================================
// ROTAS (TUDO EXTRAÍDO!) - APENAS UMA VEZ!
// ============================================================

// 🔥 ROTAS PRINCIPAIS (via index.js)
const routes = require('./server/routes');
app.use('/api', routes);

// 🔥 ROTAS INDIVIDUAIS (PARA GARANTIR QUE FUNCIONAM)
const empresasRoutes = require('./server/routes/empresas.routes');
app.use('/api/empresa', empresasRoutes);

const chatbotRoutes = require('./server/routes/chatbot.routes');
app.use('/api/chatbot', chatbotRoutes);

const adminRoutes = require('./server/routes/admin.routes');
app.use('/api/admin', adminRoutes);

const clientesRoutes = require('./server/routes/clientes.routes');
app.use('/api/clientes', clientesRoutes);

const servicosRoutes = require('./server/routes/servicos.routes');
app.use('/api/servicos', servicosRoutes);

const agendamentosRoutes = require('./server/routes/agendamentos.routes');
app.use('/api/agendamentos', agendamentosRoutes);

const profissionaisRoutes = require('./server/routes/profissionais.routes');
app.use('/api/profissionais', profissionaisRoutes);

const financeiroRoutes = require('./server/routes/financeiro.routes');
app.use('/api/financeiro', financeiroRoutes);

const despesasRoutes = require('./server/routes/despesas.routes');
app.use('/api/despesas', despesasRoutes);

const horariosRoutes = require('./server/routes/horarios.routes');
app.use('/api/horarios', horariosRoutes);

// WhatsApp
const whatsappRoutes = require('./server/routes/whatsapp.routes');
app.use('/api/empresa/whatsapp', whatsappRoutes);
app.use('/api/whatsapp', whatsappRoutes);
// ============================================
// ROTAS DE FIADOS
// ============================================
const fiadosRoutes = require('./server/routes/fiados.routes');
app.use('/api/fiados', fiadosRoutes);

// ============================================
// FUNÇÃO AUXILIAR
// ============================================

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

async function verificarDisponibilidadeHorario(empresa_id, profissional_id, data, hora, duracao) {
    let sqlAgendamentos;
    let paramsAgendamentos;

    if (profissional_id) {
        sqlAgendamentos = isProduction
            ? `SELECT a.hora, a.id, s.duracao as servico_duracao
               FROM agendamentos a
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.empresa_id = ? 
               AND a.data = ? 
               AND a.profissional_id = ? 
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
        sqlAgendamentos = isProduction
            ? `SELECT a.hora, a.id, a.profissional_id, s.duracao as servico_duracao
               FROM agendamentos a
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.empresa_id = ? 
               AND a.data = ? 
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
                console.error('❌ Erro ao buscar agendamentos:', err);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });

    const horaInicioMin = horaParaMinutos(hora);
    const horaFimMin = horaInicioMin + duracao;

    for (let ag of agendamentos) {
        if (!ag.hora) continue;

        const agHoraMin = horaParaMinutos(ag.hora);
        const agDuracao = ag.servico_duracao || 30;
        const agFimMin = agHoraMin + agDuracao;

        if (horaInicioMin < agFimMin && horaFimMin > agHoraMin) {
            console.log(`⚠️ Conflito: ${hora} (${duracao}min) com ${ag.hora} (${agDuracao}min)`);
            return false;
        }
    }

    return true;
}

// ============================================================
// INICIALIZAÇÃO DO BANCO
// ============================================================

initDatabase();

// ============================================
// CRIAR TABELA DE CONFIGURAÇÕES (HÍBRIDO)
// ============================================
setTimeout(() => {
    console.log('🔧 Verificando tabela configuracoes...');

    const sql = isProduction
        ? `CREATE TABLE IF NOT EXISTS configuracoes (
            id SERIAL PRIMARY KEY,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
        : `CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    db.run(sql, [], (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela configuracoes:', err);
            return;
        }

        console.log('✅ Tabela configuracoes verificada/criada');

        // Inserir valor padrão se não existir
        const sqlInsert = isProduction
            ? `INSERT INTO configuracoes (chave, valor) VALUES ('payment_mode', 'simulation') ON CONFLICT (chave) DO NOTHING`
            : `INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('payment_mode', 'simulation')`;

        db.run(sqlInsert, [], (err) => {
            if (err) {
                console.error('❌ Erro ao inserir configuração padrão:', err);
            } else {
                console.log('✅ Configuração payment_mode = simulation');
            }
        });
    });
}, 1000);

// ============================================================
// CRIAR SUPER ADMIN E EMPRESA TESTE
// ============================================================

console.log('🔍 Verificando/Criando Super Admin...');

const superAdminSenha = bcrypt.hashSync('super123', 10);

db.get(`SELECT id FROM usuarios WHERE email = 'super@admin.com'`, [], (err, existing) => {
    if (err) {
        console.error('❌ Erro ao verificar Super Admin:', err.message);
    } else if (existing) {
        console.log('🔄 Atualizando senha do Super Admin...');
        const sqlUpdate = isProduction
            ? `UPDATE usuarios SET senha = ? WHERE email = 'super@admin.com'`
            : `UPDATE usuarios SET senha = ? WHERE email = 'super@admin.com'`;

        db.run(sqlUpdate, [superAdminSenha], function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar Super Admin:', err.message);
            } else {
                console.log('✅ Super Admin atualizado: super@admin.com / super123');
            }
        });
    } else {
        console.log('🔍 Criando Super Admin...');
        const sqlInsert = isProduction
            ? `INSERT INTO usuarios (nome, email, senha, role) 
               VALUES (?, ?, ?, 'superadmin')`
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
// ROTAS (TUDO EXTRAÍDO!) - VERSÃO CORRIGIDA
// ============================================================

console.log('📋 REGISTRANDO ROTAS...');

// 1. ROTAS PRINCIPAIS (via index.js)
try {
    const routes = require('./server/routes');
    app.use('/api', routes);
    console.log('✅ /api registrado via index.js');
} catch (err) {
    console.error('❌ Erro ao carregar /api:', err.message);
}

// 2. CHATBOT - FORÇADO DIRETAMENTE (IGNORANDO O INDEX)
try {
    const chatbotRoutes = require('./server/routes/chatbot.routes');
    app.use('/api/chatbot', chatbotRoutes);
    console.log('✅ /api/chatbot registrado DIRETAMENTE');
    
    // 🔥 VERIFICAR SE A ROTA /horarios-disponiveis EXISTE
    let hasHorarios = false;
    if (chatbotRoutes.stack) {
        chatbotRoutes.stack.forEach(layer => {
            if (layer.route && layer.route.path === '/horarios-disponiveis') {
                hasHorarios = true;
                console.log('   ✅ Rota /horarios-disponiveis ENCONTRADA');
            }
        });
    }
    if (!hasHorarios) {
        console.log('   ⚠️ Rota /horarios-disponiveis NÃO encontrada no chatbot.routes.js');
    }
} catch (err) {
    console.error('❌ Erro ao carregar chatbot:', err.message);
}

// 3. EMPRESAS
try {
    const empresasRoutes = require('./server/routes/empresas.routes');
    app.use('/api/empresa', empresasRoutes);
    console.log('✅ /api/empresa registrado');
} catch (err) {
    console.error('❌ Erro em empresas:', err.message);
}

// 4. ADMIN
try {
    const adminRoutes = require('./server/routes/admin.routes');
    app.use('/api/admin', adminRoutes);
    console.log('✅ /api/admin registrado');
} catch (err) {
    console.error('❌ Erro em admin:', err.message);
}

// 5. CLIENTES
try {
    const clientesRoutes = require('./server/routes/clientes.routes');
    app.use('/api/clientes', clientesRoutes);
    console.log('✅ /api/clientes registrado');
} catch (err) {
    console.error('❌ Erro em clientes:', err.message);
}

// 6. SERVIÇOS
try {
    const servicosRoutes = require('./server/routes/servicos.routes');
    app.use('/api/servicos', servicosRoutes);
    console.log('✅ /api/servicos registrado');
} catch (err) {
    console.error('❌ Erro em servicos:', err.message);
}

// 7. AGENDAMENTOS
try {
    const agendamentosRoutes = require('./server/routes/agendamentos.routes');
    app.use('/api/agendamentos', agendamentosRoutes);
    console.log('✅ /api/agendamentos registrado');
} catch (err) {
    console.error('❌ Erro em agendamentos:', err.message);
}

// 8. PROFISSIONAIS
try {
    const profissionaisRoutes = require('./server/routes/profissionais.routes');
    app.use('/api/profissionais', profissionaisRoutes);
    console.log('✅ /api/profissionais registrado');
} catch (err) {
    console.error('❌ Erro em profissionais:', err.message);
}

// 9. FINANCEIRO
try {
    const financeiroRoutes = require('./server/routes/financeiro.routes');
    app.use('/api/financeiro', financeiroRoutes);
    console.log('✅ /api/financeiro registrado');
} catch (err) {
    console.error('❌ Erro em financeiro:', err.message);
}

// 10. DESPESAS
try {
    const despesasRoutes = require('./server/routes/despesas.routes');
    app.use('/api/despesas', despesasRoutes);
    console.log('✅ /api/despesas registrado');
} catch (err) {
    console.error('❌ Erro em despesas:', err.message);
}

// 11. HORÁRIOS
try {
    const horariosRoutes = require('./server/routes/horarios.routes');
    app.use('/api/horarios', horariosRoutes);
    console.log('✅ /api/horarios registrado');
} catch (err) {
    console.error('❌ Erro em horarios:', err.message);
}

// 12. WHATSAPP
try {
    const whatsappRoutes = require('./server/routes/whatsapp.routes');
    app.use('/api/empresa/whatsapp', whatsappRoutes);
    app.use('/api/whatsapp', whatsappRoutes);
    console.log('✅ /api/whatsapp registrado');
} catch (err) {
    console.error('❌ Erro em whatsapp:', err.message);
}

console.log('✅ TODAS AS ROTAS REGISTRADAS!');
// ============================================================
// CRIAR EMPRESA DE TESTE
// ============================================================

console.log('🔍 Verificando/Criando empresa de teste...');

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
                               VALUES (?, ?, ?, 'dono', ?)`
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
// JOB DE RESET DE CONTADORES
// ============================================================

try {
    const resetJob = require('./server/jobs/reset-contador');
    resetJob.start();
    console.log('✅ Job de reset de contadores iniciado');
} catch (error) {
    console.log('⚠️ Erro ao iniciar job de reset:', error.message);
}

// ============================================================
// JOB DE LEMBRETES WHATSAPP
// ============================================================

const lembreteJob = require('./server/jobs/lembretes');

if (process.env.WHATSAPP_ENABLED === 'true') {
    lembreteJob.start();
    console.log('✅ Job de lembretes WhatsApp iniciado');
} else {
    console.log('📌 WhatsApp desabilitado (WHATSAPP_ENABLED=false)');
}

// ============================================================
// JOB DE LEMBRETES DE PAGAMENTO
// ============================================================

try {
    const lembretePagamentoJob = require('./server/jobs/lembretes-pagamento');
    lembretePagamentoJob.start();
    console.log('✅ Job de lembretes de pagamento iniciado! (executa a cada hora)');
} catch (error) {
    console.log('⚠️ Erro ao iniciar job de lembretes de pagamento:', error.message);
}

// ============================================================
// KEEP ALIVE (Render)
// ============================================================

if (process.env.RENDER === 'true') {
    try {
        const { keepAlive } = require('./keep_alive');
        keepAlive();
        console.log('✅ Keep Alive ativado para o Render!');
    } catch (error) {
        console.log('⚠️ Erro ao carregar keep_alive:', error.message);
        const http = require('http');
        setInterval(() => {
            http.get(`http://localhost:${PORT}`, (res) => {
                console.log(`📊 Keep Alive ping - Status: ${res.statusCode}`);
            }).on('error', () => { });
        }, 4 * 60 * 1000);
        console.log('✅ Keep Alive fallback ativado!');
    }
}

// ============================================================
// ROTA DE TESTE PARA VERIFICAR SE O SERVIDOR ESTÁ RODANDO
// ============================================================

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================================
// TRATAMENTO DE ERROS GLOBAL
// ============================================================

app.use((err, req, res, next) => {
    console.error('❌ Erro global:', err);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});
// Adicionar antes do app.listen
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
// ============================================================
// INICIAR SERVIDOR
// ============================================================

const HOST = process.env.RENDER === 'true' ? '0.0.0.0' : 'localhost';

app.listen(PORT, HOST, () => {
    console.log(`\n🚀 Servidor rodando em http://${HOST}:${PORT}`);
    console.log(`👑 Super Admin: super@admin.com / super123`);
    console.log(`👤 Dono: admin@teste.com / 123456`);
    console.log(`\n📋 PLANOS DISPONÍVEIS:`);
    console.log(`   Starter: R$ 24,90/mês - 1 profesional`);
    console.log(`   Pro: R$ 49,90/mês - 5 profissionais`);
    console.log(`   Business: R$ 99,90/mês - 12 profissionais`);
    console.log(`   Enterprise: R$ 199,90/mês - Profissionais ilimitados`);
    console.log(`\n📱 WhatsApp: ${process.env.WHATSAPP_ENABLED === 'true' ? '✅ ATIVADO' : '❌ DESABILITADO'}`);
    console.log(`\n✅ Todas as rotas foram extraídas para server/routes/`);
    console.log(`📁 Total de arquivos de rotas: 13\n`);
});

// ============================================================
// EXPORTAR PARA TESTES
// ============================================================

module.exports = app;