// server/routes/auth.routes.js - VERSÃO SIMPLIFICADA (após recriar tabela)
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
// POST /api/auth/login
// ============================================
router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            success: false,
            message: 'Email e senha são obrigatórios'
        });
    }

    // Super Admin
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

    // Buscar usuário
    db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('❌ Erro ao buscar usuário:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        db.get('SELECT * FROM empresas WHERE id = ?', [user.empresa_id], (err, empresa) => {
            if (err) {
                console.error('❌ Erro ao buscar empresa:', err);
                return res.status(500).json({ success: false, message: 'Erro ao buscar empresa' });
            }

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

            res.json({
                success: true,
                data: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    empresa_id: user.empresa_id,
                    empresa_nome: empresa?.nome || null
                },
                token: token
            });
        });
    });
});

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
// POST /api/auth/cadastro - VERSÃO SIMPLIFICADA
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
            message: 'Telefone inválido'
        });
    }

    try {
        // 1. Verificar email
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

        // ============================================
        // 2. CRIAR EMPRESA (AGORA FUNCIONA!)
        // ============================================
        console.log('📝 Criando empresa no banco principal...');

        const sqlEmpresa = `
            INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, telefone_dono, whatsapp_proprio_habilitado) 
            VALUES (?, 'trial', 1, datetime('now', '+45 days'), ?, 0)
        `;

        let empresaId = null;

        await new Promise((resolve, reject) => {
            db.run(sqlEmpresa, [empresa_nome, telefoneLimpo], function(err) {
                if (err) {
                    console.error('❌ Erro ao criar empresa:', err);
                    reject(err);
                } else {
                    empresaId = this.lastID;
                    console.log(`   ✅ Empresa criada com ID: ${empresaId}`);
                    resolve();
                }
            });
        });

        if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
            throw new Error(`ID da empresa inválido: ${empresaId}`);
        }

        console.log(`   ✅ ID da empresa confirmado: ${empresaId}`);

        // ============================================
        // 3. VERIFICAR EMPRESA
        // ============================================
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

        // ============================================
        // 4. CRIAR BANCO INDIVIDUAL
        // ============================================
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

        // ============================================
        // 6. CRIAR USUÁRIO
        // ============================================
        console.log('📝 Criando usuário DONO...');

        const senhaHash = bcrypt.hashSync(senha, 10);
        const sqlUsuario = `
            INSERT INTO usuarios (nome, email, senha, role, empresa_id, telefone) 
            VALUES (?, ?, ?, 'dono', ?, ?)
        `;

        await new Promise((resolve, reject) => {
            db.run(sqlUsuario, [nome, email, senhaHash, empresaId, telefoneLimpo], function(err) {
                if (err) {
                    console.error('❌ Erro ao criar usuário:', err);
                    reject(err);
                } else {
                    console.log(`   ✅ Usuário criado com ID: ${this.lastID}`);
                    resolve();
                }
            });
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

module.exports = router;