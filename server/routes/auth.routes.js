// ============================================
// ROTAS DE AUTENTICAÇÃO - SEE&AGENDE
// COMPATÍVEL SQLite e PostgreSQL
// ULTIMA ATUALIZACAO: 19/08/2026
// ============================================

const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/constants');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// ============================================
// COMPATIBILIDADE SQLite / PostgreSQL
// ============================================

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ✅ Banco real é SQLite — datetime('now') é o correto (NOW() é PostgreSQL)
function getCurrentTimestamp() {
    return "datetime('now')";
}

function extractMonth(field) {
    return isProduction ? `EXTRACT(MONTH FROM ${field})` : `strftime('%m', ${field})`;
}

function extractYear(field) {
    return isProduction ? `EXTRACT(YEAR FROM ${field})` : `strftime('%Y', ${field})`;
}

function extractDay(field) {
    return isProduction ? `EXTRACT(DAY FROM ${field})` : `strftime('%d', ${field})`;
}

function formatDate(field) {
    return isProduction ? `to_char(${field}, 'YYYY-MM-DD')` : `date(${field})`;
}

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================
// FUNÇÃO: GERAR NOME DO ARQUIVO DO BANCO
// ============================================

function gerarNomeBanco(nomeEmpresa, empresaId) {
    let nome = nomeEmpresa
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    if (!nome || nome.length < 2) {
        nome = `empresa`;
    }

    return `${nome}_${empresaId}.db`;
}

// ============================================
// POST /api/auth/login
// ============================================

router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    console.log(`🔑 Tentando login: ${email}`);

    if (!email || !senha) {
        return res.status(400).json({
            success: false,
            message: 'Email e senha são obrigatórios'
        });
    }

    // Super Admin (hardcoded)
    if (email === 'super@admin.com' && senha === 'super123') {
        const token = jwt.sign(
            { id: 1, email: 'super@admin.com', role: 'super_admin' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        return res.json({
            success: true,
            data: {
                id: 1,
                nome: 'Super Admin',
                email: 'super@admin.com',
                role: 'super_admin',
                empresa_id: null
            },
            token: token
        });
    }

    // Buscar usuário no banco
    const sql = isProduction
        ? `SELECT u.*, e.nome as empresa_nome, e.whatsapp_instance, e.whatsapp_connected
           FROM usuarios u
           LEFT JOIN empresas e ON u.empresa_id = e.id
           WHERE u.email = $1`
        : `SELECT u.*, e.nome as empresa_nome, e.whatsapp_instance, e.whatsapp_connected
           FROM usuarios u
           LEFT JOIN empresas e ON u.empresa_id = e.id
           WHERE u.email = ?`;

    db.get(sql, [email], async (err, user) => {
        if (err) {
            console.error('❌ Erro ao buscar usuário:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        try {
            const senhaValida = await bcrypt.compare(senha, user.senha);
            if (!senhaValida) {
                return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
            }

            // Remover senha
            const { senha: _, ...usuarioSemSenha } = user;

            // Gerar token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    empresa_id: user.empresa_id
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Registrar acesso
            const ip = req.ip || req.connection?.remoteAddress || null;
            const userAgent = req.headers['user-agent'] || null;

            if (user.empresa_id) {
                const sqlAcesso = isProduction
                    ? `INSERT INTO acessos (usuario_id, empresa_id, ip, user_agent, created_at) 
                       VALUES ($1, $2, $3, $4, ${getCurrentTimestamp()})`
                    : `INSERT INTO acessos (usuario_id, empresa_id, ip, user_agent, created_at) 
                       VALUES (?, ?, ?, ?, datetime('now'))`;
                db.run(sqlAcesso, [user.id, user.empresa_id, ip, userAgent], (err) => {
                    if (err) console.error('❌ Erro ao registrar acesso:', err);
                });
            }

            console.log(`✅ Login realizado: ${user.nome} (${user.role})`);

            res.json({
                success: true,
                data: usuarioSemSenha,
                token: token
            });

        } catch (error) {
            console.error('❌ Erro no login:', error);
            res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        }
    });
});

// ============================================
// POST /api/auth/cadastro - UNIFICADO (SQLite)
// ============================================

router.post('/cadastro', async (req, res) => {
    const { nome, email, senha, empresa_nome, telefone } = req.body;

    console.log('========================================');
    console.log('📝 NOVO CADASTRO');
    console.log(`   Empresa: ${empresa_nome}`);
    console.log(`   Usuário: ${nome} (${email})`);
    console.log('========================================');

    // Validação
    if (!nome || !email || !senha || !empresa_nome || !telefone) {
        return res.status(400).json({
            success: false,
            message: 'Todos os campos são obrigatórios'
        });
    }

    if (senha.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'A senha deve ter pelo menos 6 caracteres'
        });
    }

    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
        return res.status(400).json({
            success: false,
            message: 'Telefone inválido (mínimo 10 dígitos)'
        });
    }

    try {
        // 1. Verificar se email já existe
        const usuarioExistente = await new Promise((resolve) => {
            db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar email:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (usuarioExistente) {
            return res.status(400).json({
                success: false,
                message: 'Este email já está cadastrado'
            });
        }

        // 2. Criar empresa
        console.log('📝 Criando empresa...');

        const trialExpira = new Date();
        trialExpira.setDate(trialExpira.getDate() + 45);
        const trialExpiraStr = trialExpira.toISOString().split('T')[0];

        // ✅ SQLite real — lastID retorna o ID direto (sem $1, sem NOW(), sem RETURNING)
        const empresaId = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, telefone_dono, whatsapp_proprio_habilitado, created_at) 
                    VALUES (?, 'trial', 1, ?, ?, 0, datetime('now'))`,
                [empresa_nome, trialExpiraStr, telefoneLimpo],
                function(err) {
                    if (err) {
                        console.error('❌ Erro ao criar empresa:', err);
                        reject(err);
                    } else {
                        console.log(`   📊 Empresa ID (lastID): ${this.lastID}`);
                        resolve(this.lastID);
                    }
                }
            );
        });

        if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
            throw new Error(`Não foi possível obter o ID da empresa: ${empresaId}`);
        }

        console.log(`   ✅ Empresa criada com ID: ${empresaId}`);

        // 3. Verificar empresa
        const empresaVerificada = await new Promise((resolve) => {
            db.get('SELECT id, nome FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar empresa:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (!empresaVerificada) {
            throw new Error(`Empresa não encontrada! ID: ${empresaId}`);
        }

        console.log(`   ✅ Empresa verificada: ${empresaVerificada.nome} (ID: ${empresaVerificada.id})`);

        // 4. Criar banco individual (SQLite)
        const dbDir = path.join(__dirname, '../../database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const nomeBanco = gerarNomeBanco(empresa_nome, empresaId);
        const empresaDbPath = path.join(dbDir, nomeBanco);

        console.log(`📁 Criando banco: ${nomeBanco}`);

        if (fs.existsSync(empresaDbPath)) {
            console.log('   🗑️ Deletando banco antigo...');
            fs.unlinkSync(empresaDbPath);
        }

        const empresaDb = new sqlite3.Database(empresaDbPath);

        // 5. Criar tabelas
        await new Promise((resolve, reject) => {
            empresaDb.serialize(() => {
                console.log('📋 Criando tabelas...');

                empresaDb.run(`CREATE TABLE IF NOT EXISTS clientes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    telefone TEXT,
                    email TEXT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    bloqueado_chatbot INTEGER DEFAULT 0,
                    dias_bloqueio INTEGER DEFAULT 0,
                    grupos TEXT DEFAULT '[]',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                empresaDb.run(`CREATE TABLE IF NOT EXISTS servicos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    descricao TEXT,
                    valor REAL DEFAULT 0,
                    duracao INTEGER DEFAULT 30,
                    ativo INTEGER DEFAULT 1,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                empresaDb.run(`CREATE TABLE IF NOT EXISTS profissionais (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    senha TEXT NOT NULL,
                    comissao_percent INTEGER DEFAULT 30,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    ativo INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    telefone TEXT
                )`);

                empresaDb.run(`CREATE TABLE IF NOT EXISTS agendamentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente_id INTEGER,
                    data TEXT,
                    hora TEXT,
                    servico_id INTEGER,
                    servico TEXT,
                    valor REAL DEFAULT 0,
                    duracao INTEGER DEFAULT 30,
                    status TEXT DEFAULT 'pendente',
                    comissao REAL DEFAULT 0,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    profissional_id INTEGER,
                    lembrete_enviado INTEGER DEFAULT 0,
                    valor_total REAL DEFAULT 0,
                    servicos_extras TEXT DEFAULT '[]',
                    valor_extras REAL DEFAULT 0,
                    forma_pagamento TEXT,
                    prazo_dias INTEGER,
                    data_vencimento TEXT,
                    descricao_pagamento TEXT,
                    lembrete_cobranca_enviado INTEGER DEFAULT 0,
                    lembrete_cobranca_enviado_em TEXT,
                    ultimo_lembrete_cobranca_tipo TEXT,
                    motivo_cancelamento TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
                    FOREIGN KEY (servico_id) REFERENCES servicos(id),
                    FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
                )`);

                empresaDb.run(`CREATE TABLE IF NOT EXISTS despesas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    descricao TEXT NOT NULL,
                    categoria TEXT,
                    valor REAL DEFAULT 0,
                    data TEXT,
                    data_vencimento TEXT,
                    pago INTEGER DEFAULT 0,
                    forma_pagamento TEXT,
                    observacao TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                empresaDb.run(`CREATE TABLE IF NOT EXISTS horarios_funcionamento (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id INTEGER DEFAULT ${empresaId},
                    dia_semana INTEGER,
                    aberto INTEGER DEFAULT 1,
                    hora_inicio TEXT DEFAULT '08:00',
                    hora_fim TEXT DEFAULT '18:00',
                    almoco_inicio TEXT DEFAULT '12:00',
                    almoco_fim TEXT DEFAULT '13:00',
                    intervalo_minutos INTEGER DEFAULT 30
                )`);

                empresaDb.run(`CREATE TABLE IF NOT EXISTS configuracoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chave TEXT UNIQUE,
                    valor TEXT,
                    payment_mode TEXT DEFAULT 'simulation',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                // Dados padrão
                const dias = [
                    { dia: 0, aberto: 0 },
                    { dia: 1, aberto: 1 },
                    { dia: 2, aberto: 1 },
                    { dia: 3, aberto: 1 },
                    { dia: 4, aberto: 1 },
                    { dia: 5, aberto: 1 },
                    { dia: 6, aberto: 1 }
                ];

                for (const d of dias) {
                    empresaDb.run(`INSERT OR IGNORE INTO horarios_funcionamento 
                        (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [empresaId, d.dia, d.aberto, 
                         d.aberto === 1 ? '08:00' : '00:00',
                         d.aberto === 1 ? '18:00' : '00:00',
                         d.aberto === 1 ? '12:00' : '00:00',
                         d.aberto === 1 ? '13:00' : '00:00',
                         30]
                    );
                }

                empresaDb.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('payment_mode', 'simulation')`);
                empresaDb.run(`INSERT OR IGNORE INTO servicos (nome, descricao, valor, duracao, empresa_id) 
                    VALUES ('Corte de Cabelo', 'Corte tradicional', 40.00, 30, ${empresaId})`);

                console.log(`   ✅ Banco ${nomeBanco} criado com sucesso!`);
                empresaDb.close();
                resolve();
            });
        });

        // 6. Criar usuário (DONO)
        console.log('📝 Criando usuário DONO...');

        const senhaHash = bcrypt.hashSync(senha, 10);

        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO usuarios (nome, email, senha, role, empresa_id, telefone, created_at) 
                    VALUES (?, ?, ?, 'dono', ?, ?, datetime('now'))`,
                [nome, email, senhaHash, empresaId, telefoneLimpo],
                function(err) {
                    if (err) {
                        console.error('❌ Erro ao criar usuário:', err);
                        reject(err);
                    } else {
                        console.log(`   ✅ Usuário criado com ID: ${this.lastID}`);
                        resolve();
                    }
                }
            );
        });

        console.log('========================================');
        console.log('✅ CADASTRO CONCLUÍDO COM SUCESSO!');
        console.log(`   Empresa: ${empresa_nome} (ID: ${empresaId})`);
        console.log(`   Banco: ${nomeBanco}`);
        console.log(`   Usuário: ${email}`);
        console.log('========================================');

        res.json({
            success: true,
            message: 'Cadastro realizado com sucesso! Você já pode fazer login.',
            data: {
                empresa_id: empresaId,
                empresa_nome: empresa_nome,
                banco_arquivo: nomeBanco
            }
        });

    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao realizar cadastro'
        });
    }
});
// ============================================
// POST /api/auth/verificar - VERIFICAR TOKEN
// ============================================

router.post('/verificar', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token não fornecido'
        });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const sql = isProduction
            ? `SELECT u.*, e.nome as empresa_nome
               FROM usuarios u
               LEFT JOIN empresas e ON u.empresa_id = e.id
               WHERE u.id = $1`
            : `SELECT u.*, e.nome as empresa_nome
               FROM usuarios u
               LEFT JOIN empresas e ON u.empresa_id = e.id
               WHERE u.id = ?`;

        db.get(sql, [decoded.id], (err, user) => {
            if (err) {
                console.error('❌ Erro ao verificar token:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao verificar token'
                });
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuário não encontrado'
                });
            }

            const { senha: _, ...usuarioSemSenha } = user;

            res.json({
                success: true,
                usuario: usuarioSemSenha
            });
        });

    } catch (error) {
        console.error('❌ Erro ao verificar token:', error);
        res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado'
        });
    }
});

module.exports = router;