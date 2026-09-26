// ============================================
// ROTAS DE AUTENTICAÇÃO - SEE&AGENDE
// COMPATÍVEL SQLite e PostgreSQL
// ULTIMA ATUALIZACAO: 09/09/2026
// ============================================

const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database');
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
// FUNÇÃO: CRIAR TABELAS DO BANCO DA EMPRESA
// ============================================

function criarTabelasEmpresa(empresaDb, empresaId) {
    return new Promise((resolve, reject) => {
        empresaDb.serialize(() => {
            try {
                console.log('📋 Criando tabelas...');

                // Clientes
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

                // Serviços
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

                // Profissionais
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

                // Agendamentos
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

                // Despesas
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

                // Horários
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

                // Configurações
                empresaDb.run(`CREATE TABLE IF NOT EXISTS configuracoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    chave TEXT UNIQUE,
                    valor TEXT,
                    payment_mode TEXT DEFAULT 'simulation',
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )`);

                // Receitas
                empresaDb.run(`CREATE TABLE IF NOT EXISTS receitas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    empresa_id INTEGER NOT NULL,
                    descricao TEXT NOT NULL,
                    valor REAL NOT NULL,
                    data TEXT NOT NULL,
                    forma_pagamento TEXT NOT NULL,
                    agendamento_id INTEGER,
                    status TEXT DEFAULT 'recebido',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // ============================================
                // DADOS PADRÃO
                // ============================================

                console.log('📋 Inserindo dados padrão...');

                // Horários padrão
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

                // Configuração padrão
                empresaDb.run(`INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('payment_mode', 'simulation')`);

                // Serviço padrão
                empresaDb.run(`INSERT OR IGNORE INTO servicos (nome, descricao, valor, duracao, empresa_id) 
                    VALUES ('Corte de Cabelo', 'Corte tradicional', 40.00, 30, ${empresaId})`);

                console.log('   ✅ Dados padrão inseridos!');
                resolve();

            } catch (error) {
                console.error('❌ Erro ao criar tabelas:', error);
                reject(error);
            }
        });
    });
}

// ============================================
// LOGIN UNIFICADO — busca em usuarios (dono/admin) OU profissionais
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

    // ============================================
    // Super Admin (hardcoded)
    // ============================================
    if (email === 'super@admin.com' && senha === 'super123') {
        const token = jwt.sign(
            { id: 1, email: 'super@admin.com', role: 'super_admin' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        console.log('✅ Login (super_admin)');
        return res.json({
            success: true,
            data: {
                id: 1,
                nome: 'Super Admin',
                email: 'super@admin.com',
                role: 'super_admin',
                empresa_id: null
            },
            token
        });
    }

    // ============================================
    // 1) TENTA EM `usuarios` (banco central)
    // ============================================
    const sqlUsuario = `SELECT u.*, e.nome as empresa_nome, e.whatsapp_instance, e.whatsapp_connected
                        FROM usuarios u
                        LEFT JOIN empresas e ON u.empresa_id = e.id
                        WHERE u.email = ?`;

    db.get(sqlUsuario, [email], async (err, user) => {
        if (err) {
            console.error('❌ Erro ao buscar usuário:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
        }

        // Se achou em usuarios, valida e retorna
        if (user) {
            try {
                const senhaValida = await bcrypt.compare(senha, user.senha);
                if (!senhaValida) {
                    console.log(`⚠️ Senha errada para usuario: ${email}`);
                    return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
                }

                const { senha: _, ...usuarioSemSenha } = user;
                const token = jwt.sign(
                    { id: user.id, email: user.email, role: user.role, empresa_id: user.empresa_id },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                console.log(`✅ Login (usuarios): ${user.nome} (${user.role})`);
                return res.json({ success: true, data: usuarioSemSenha, token });
            } catch (e) {
                console.error('❌ Erro bcrypt:', e);
                return res.status(500).json({ success: false, message: 'Erro ao validar senha' });
            }
        }

        // ============================================
        // 2) NÃO ACHOU EM usuarios → TENTA EM `profissionais`
        //    Busca em TODOS os bancos (multi-tenant)
        // ============================================
        console.log(`🔎 Buscando profissional em todos os bancos: ${email}`);

        // Helper: aceita ativo como 1, '1', 'true', true
        const estaAtivo = (valor) => {
            if (valor === 1 || valor === true) return true;
            if (typeof valor === 'string') return valor === '1' || valor.toLowerCase() === 'true';
            if (typeof valor === 'number') return valor === 1;
            return false;
        };

        // Lista bancos de empresas (ex: Salao_da_Sandra_14.db → 14)
        const listarBancosEmpresas = () => {
            const pastaDb = path.join(__dirname, '..', '..', 'database');
            const resultado = [];
            try {
                const arquivos = fs.readdirSync(pastaDb).filter(f => f.endsWith('.db'));
                for (const arq of arquivos) {
                    const match = arq.match(/_(\d+)\.db$/);
                    if (match) resultado.push({ empresaId: parseInt(match[1]), arquivo: arq });
                }
            } catch (e) {
                console.error('❌ Erro ao listar bancos:', e.message);
            }
            return resultado;
        };

        // ============================================
        // BUSCA PROFISSIONAL EM TODOS OS BANCOS
        // Prioridade: banco da empresa > banco central
        // ============================================
        const buscarProfissionalEmTodosOsBancos = async () => {
            const candidatos = [];

            // 2.1) PRIMEIRO: bancos por empresa (multi-tenant)
            const bancos = listarBancosEmpresas();
            for (const { empresaId, arquivo } of bancos) {
                try {
                    const empresaDb = getEmpresaDb(empresaId);
                    if (!empresaDb) continue;

                    const prof = await new Promise((resolve) => {
                        empresaDb.get(
                            `SELECT * FROM profissionais WHERE email = ?`,
                            [email],
                            (err, row) => resolve(err ? null : row)
                        );
                    });

                    if (prof) {
                        candidatos.push({
                            prof,
                            empresaId: prof.empresa_id || empresaId,
                            origem: arquivo
                        });
                    }
                } catch (e) {
                    // ignora e continua
                }
            }

            // 2.2) DEPOIS: banco central (fallback, só se não achou em nenhum banco de empresa)
            if (candidatos.length === 0) {
                try {
                    const profCentral = await new Promise((resolve) => {
                        db.get(
                            `SELECT * FROM profissionais WHERE email = ?`,
                            [email],
                            (err, row) => resolve(err ? null : row)
                        );
                    });
                    if (profCentral) {
                        candidatos.push({
                            prof: profCentral,
                            empresaId: profCentral.empresa_id,
                            origem: 'banco central'
                        });
                    }
                } catch (e) {
                    // ignora
                }
            }

            return candidatos;
        };

        // ============================================
        // EXECUTA A BUSCA
        // ============================================
        const candidatos = await buscarProfissionalEmTodosOsBancos();

        // Não achou em nenhum banco
        if (candidatos.length === 0) {
            console.log(`⚠️ Email não encontrado em nenhum banco: ${email}`);
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        // ============================================
        // TESTA SENHA EM CADA CANDIDATO
        // ============================================
        let profValido = null;
        let empresaValida = null;

        for (const { prof, empresaId, origem } of candidatos) {
            if (!estaAtivo(prof.ativo)) {
                console.log(`⏭️  Pulando ${email} (${origem}): inativo (ativo=${prof.ativo})`);
                continue;
            }

            try {
                const senhaValida = await bcrypt.compare(senha, prof.senha);
                if (senhaValida) {
                    profValido = prof;
                    empresaValida = empresaId;
                    console.log(`✅ Senha válida em: ${origem} (empresa ${empresaId})`);
                    break;
                } else {
                    console.log(`⏭️  Senha errada em: ${origem}`);
                }
            } catch (e) {
                console.log(`⏭️  Erro bcrypt em ${origem}:`, e.message);
            }
        }

        // Nenhum candidato validou
        if (!profValido) {
            console.log(`⚠️ Credenciais inválidas para: ${email}`);
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        // ============================================
        // SUCESSO — MONTA RESPOSTA E TOKEN
        // ============================================
        const { senha: _, ...profSemSenha } = profValido;
        const usuarioParaRetorno = {
            ...profSemSenha,
            role: 'profissional',
            profissional_id: profValido.id,
            empresa_id: empresaValida
        };

        const token = jwt.sign(
            { id: profValido.id, email: profValido.email, role: 'profissional', empresa_id: empresaValida },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ Login (profissionais): ${profValido.nome} (empresa ${empresaValida}, ID ${profValido.id})`);
        return res.json({ success: true, data: usuarioParaRetorno, token });
    });
});
// ============================================
// POST /api/auth/cadastro - VERSÃO CORRIGIDA
// ============================================

router.post('/cadastro', async (req, res) => {
    const { nome, email, senha, empresa_nome, telefone } = req.body;

    console.log('========================================');
    console.log('📝 NOVO CADASTRO');
    console.log(`   Empresa: ${empresa_nome}`);
    console.log(`   Usuário: ${nome} (${email})`);
    console.log('========================================');

    // ============================================
    // 1. VALIDAÇÃO
    // ============================================

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
        // ============================================
        // 2. VERIFICAR SE USUÁRIO JÁ EXISTE
        // ============================================
        const usuarioExistente = await new Promise((resolve) => {
            db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar usuário:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });

        if (usuarioExistente) {
            console.log(`⚠️ Usuário ${email} já existe com ID: ${usuarioExistente.id}`);
            
            // ============================================
            // 3. CRIAR EMPRESA (VERSÃO CORRIGIDA)
            // ============================================
            console.log('📝 Criando empresa para usuário existente...');

            const trialExpira = new Date();
            trialExpira.setDate(trialExpira.getDate() + 45);
            const trialExpiraStr = trialExpira.toISOString().split('T')[0];

            // VERIFICAR SE A TABELA TEM AS COLUNAS NECESSÁRIAS
            const tableInfo = await new Promise((resolve, reject) => {
                db.all("PRAGMA table_info(empresas)", (err, rows) => {
                    if (err) {
                        console.error('❌ Erro ao verificar tabela empresas:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

            const colunas = tableInfo.map(r => r.name);
            console.log('📊 Colunas da tabela empresas:', colunas);

            // Construir INSERT dinâmico baseado nas colunas existentes
            let insertSql = 'INSERT INTO empresas (nome, plano, limite_profissionais';
            let values = [empresa_nome, 'trial', 1];
            let placeholders = '?, ?, ?';

            if (colunas.includes('trial_expira')) {
                insertSql += ', trial_expira';
                values.push(trialExpiraStr);
                placeholders += ', ?';
            }

            if (colunas.includes('telefone_dono')) {
                insertSql += ', telefone_dono';
                values.push(telefoneLimpo);
                placeholders += ', ?';
            }

            if (colunas.includes('whatsapp_proprio_habilitado')) {
                insertSql += ', whatsapp_proprio_habilitado';
                values.push(0);
                placeholders += ', ?';
            }

            if (colunas.includes('created_at')) {
                insertSql += ', created_at';
                values.push(new Date().toISOString());
                placeholders += ', ?';
            }

            insertSql += `) VALUES (${placeholders})`;

            console.log('📝 SQL:', insertSql);
            console.log('📊 Values:', values);

            let empresaId = null;

            // Tentar db.run com this.lastID
            await new Promise((resolve, reject) => {
                db.run(insertSql, values, function(err) {
                    if (err) {
                        console.error('❌ Erro ao criar empresa (db.run):', err);
                        reject(err);
                    } else {
                        console.log(`   📊 lastID (db.run): ${this.lastID}`);
                        empresaId = this.lastID;
                        resolve();
                    }
                });
            });

            // Se o lastID veio undefined, buscar o último ID inserido
            if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
                console.log('⚠️ lastID veio undefined, buscando último ID...');
                
                empresaId = await new Promise((resolve, reject) => {
                    db.get('SELECT last_insert_rowid() as id', (err, row) => {
                        if (err) {
                            console.error('❌ Erro ao buscar last_insert_rowid:', err);
                            reject(err);
                        } else {
                            console.log(`   📊 last_insert_rowid: ${row?.id}`);
                            resolve(row?.id);
                        }
                    });
                });
            }

            // Se ainda assim veio undefined, buscar o maior ID
            if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
                console.log('⚠️ Buscando maior ID da tabela...');
                
                empresaId = await new Promise((resolve, reject) => {
                    db.get('SELECT MAX(id) as id FROM empresas', (err, row) => {
                        if (err) {
                            console.error('❌ Erro ao buscar MAX(id):', err);
                            reject(err);
                        } else {
                            console.log(`   📊 MAX(id): ${row?.id}`);
                            resolve(row?.id);
                        }
                    });
                });
            }

            // Verificação final
            if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
                throw new Error(`Não foi possível obter o ID da empresa. lastID: ${empresaId}`);
            }

            console.log(`   ✅ Empresa criada com ID: ${empresaId}`);

            // ============================================
            // 4. VERIFICAR EMPRESA
            // ============================================

            const empresaVerificada = await new Promise((resolve, reject) => {
                db.get('SELECT id, nome FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                    if (err) {
                        console.error('❌ Erro ao verificar empresa:', err);
                        reject(err);
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
            // 5. CRIAR BANCO INDIVIDUAL
            // ============================================

            const dbDir = path.join(__dirname, '../../database');
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            const nomeBanco = gerarNomeBanco(empresa_nome, empresaId);
            const empresaDbPath = path.join(dbDir, nomeBanco);

            console.log(`📁 Criando banco: ${nomeBanco}`);
            console.log(`   📂 Caminho: ${empresaDbPath}`);

            if (fs.existsSync(empresaDbPath)) {
                console.log('   🗑️ Deletando banco antigo...');
                fs.unlinkSync(empresaDbPath);
            }

            // Criar banco e tabelas
            await new Promise((resolve, reject) => {
                const empresaDb = new sqlite3.Database(empresaDbPath, (err) => {
                    if (err) {
                        console.error('❌ Erro ao criar banco:', err);
                        reject(err);
                    } else {
                        console.log('   ✅ Banco criado com sucesso!');
                        
                        // Criar tabelas
                        criarTabelasEmpresa(empresaDb, empresaId)
                            .then(() => {
                                empresaDb.close((err) => {
                                    if (err) console.error('❌ Erro ao fechar banco:', err);
                                    console.log(`   ✅ Banco ${nomeBanco} finalizado!`);
                                    resolve();
                                });
                            })
                            .catch(reject);
                    }
                });
            });

            // ============================================
            // 6. ATUALIZAR USUÁRIO EXISTENTE
            // ============================================
            console.log('📝 Atualizando usuário existente...');
            
            await new Promise((resolve, reject) => {
                db.run('UPDATE usuarios SET empresa_id = ?, nome = ? WHERE email = ?', [empresaId, nome, email], function(err) {
                    if (err) {
                        console.error('❌ Erro ao atualizar usuário:', err);
                        reject(err);
                    } else {
                        console.log(`   ✅ Usuário atualizado com sucesso!`);
                        resolve();
                    }
                });
            });

            console.log('========================================');
            console.log('✅ CADASTRO CONCLUÍDO (usuário já existente)!');
            console.log(`   Empresa: ${empresa_nome} (ID: ${empresaId})`);
            console.log(`   Banco: ${nomeBanco}`);
            console.log(`   Usuário: ${email}`);
            console.log('========================================');

            return res.json({
                success: true,
                message: 'Cadastro realizado com sucesso! Usuário já existente foi vinculado à nova empresa.',
                data: {
                    empresa_id: empresaId,
                    empresa_nome: empresa_nome,
                    banco_arquivo: nomeBanco
                }
            });
        }

        // ============================================
        // 3. CRIAR EMPRESA PARA NOVO USUÁRIO
        // ============================================
        console.log('📝 Criando empresa para novo usuário...');

        const trialExpira = new Date();
        trialExpira.setDate(trialExpira.getDate() + 45);
        const trialExpiraStr = trialExpira.toISOString().split('T')[0];

        // VERIFICAR SE A TABELA TEM AS COLUNAS NECESSÁRIAS
        const tableInfo = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(empresas)", (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao verificar tabela empresas:', err);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });

        const colunas = tableInfo.map(r => r.name);
        console.log('📊 Colunas da tabela empresas:', colunas);

        // Construir INSERT dinâmico baseado nas colunas existentes
        let insertSql = 'INSERT INTO empresas (nome, plano, limite_profissionais';
        let values = [empresa_nome, 'trial', 1];
        let placeholders = '?, ?, ?';

        if (colunas.includes('trial_expira')) {
            insertSql += ', trial_expira';
            values.push(trialExpiraStr);
            placeholders += ', ?';
        }

        if (colunas.includes('telefone_dono')) {
            insertSql += ', telefone_dono';
            values.push(telefoneLimpo);
            placeholders += ', ?';
        }

        if (colunas.includes('whatsapp_proprio_habilitado')) {
            insertSql += ', whatsapp_proprio_habilitado';
            values.push(0);
            placeholders += ', ?';
        }

        if (colunas.includes('created_at')) {
            insertSql += ', created_at';
            values.push(new Date().toISOString());
            placeholders += ', ?';
        }

        insertSql += `) VALUES (${placeholders})`;

        console.log('📝 SQL:', insertSql);
        console.log('📊 Values:', values);

        let empresaId = null;

        // Tentar db.run com this.lastID
        await new Promise((resolve, reject) => {
            db.run(insertSql, values, function(err) {
                if (err) {
                    console.error('❌ Erro ao criar empresa (db.run):', err);
                    reject(err);
                } else {
                    console.log(`   📊 lastID (db.run): ${this.lastID}`);
                    empresaId = this.lastID;
                    resolve();
                }
            });
        });

        // Se o lastID veio undefined, buscar o último ID inserido
        if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
            console.log('⚠️ lastID veio undefined, buscando último ID...');
            
            empresaId = await new Promise((resolve, reject) => {
                db.get('SELECT last_insert_rowid() as id', (err, row) => {
                    if (err) {
                        console.error('❌ Erro ao buscar last_insert_rowid:', err);
                        reject(err);
                    } else {
                        console.log(`   📊 last_insert_rowid: ${row?.id}`);
                        resolve(row?.id);
                    }
                });
            });
        }

        // Se ainda assim veio undefined, buscar o maior ID
        if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
            console.log('⚠️ Buscando maior ID da tabela...');
            
            empresaId = await new Promise((resolve, reject) => {
                db.get('SELECT MAX(id) as id FROM empresas', (err, row) => {
                    if (err) {
                        console.error('❌ Erro ao buscar MAX(id):', err);
                        reject(err);
                    } else {
                        console.log(`   📊 MAX(id): ${row?.id}`);
                        resolve(row?.id);
                    }
                });
            });
        }

        // Verificação final
        if (!empresaId || isNaN(empresaId) || empresaId <= 0) {
            throw new Error(`Não foi possível obter o ID da empresa. lastID: ${empresaId}`);
        }

        console.log(`   ✅ Empresa criada com ID: ${empresaId}`);

        // ============================================
        // 4. VERIFICAR EMPRESA
        // ============================================

        const empresaVerificada = await new Promise((resolve, reject) => {
            db.get('SELECT id, nome FROM empresas WHERE id = ?', [empresaId], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar empresa:', err);
                    reject(err);
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
        // 5. CRIAR BANCO INDIVIDUAL
        // ============================================

        const dbDir = path.join(__dirname, '../../database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        const nomeBanco = gerarNomeBanco(empresa_nome, empresaId);
        const empresaDbPath = path.join(dbDir, nomeBanco);

        console.log(`📁 Criando banco: ${nomeBanco}`);
        console.log(`   📂 Caminho: ${empresaDbPath}`);

        if (fs.existsSync(empresaDbPath)) {
            console.log('   🗑️ Deletando banco antigo...');
            fs.unlinkSync(empresaDbPath);
        }

        // Criar banco e tabelas
        await new Promise((resolve, reject) => {
            const empresaDb = new sqlite3.Database(empresaDbPath, (err) => {
                if (err) {
                    console.error('❌ Erro ao criar banco:', err);
                    reject(err);
                } else {
                    console.log('   ✅ Banco criado com sucesso!');
                    
                    // Criar tabelas
                    criarTabelasEmpresa(empresaDb, empresaId)
                        .then(() => {
                            empresaDb.close((err) => {
                                if (err) console.error('❌ Erro ao fechar banco:', err);
                                console.log(`   ✅ Banco ${nomeBanco} finalizado!`);
                                resolve();
                            });
                        })
                        .catch(reject);
                }
            });
        });

// ============================================
// 6. CRIAR USUÁRIO (DONO) - VERSÃO DEFINITIVA
// ============================================
console.log('📝 Criando usuário DONO...');

const senhaHash = bcrypt.hashSync(senha, 10);

// 🔥 PRIMEIRO: Verificar se o usuário já existe
const userExists = await new Promise((resolve) => {
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, row) => {
        if (err) {
            console.error('❌ Erro ao verificar usuário:', err);
            resolve(null);
        } else {
            resolve(row);
        }
    });
});

let usuarioId;

if (userExists && userExists.id) {
    // Usuário já existe com ID válido
    console.log(`⚠️ Usuário ${email} já existe com ID: ${userExists.id}`);
    usuarioId = userExists.id;
    
    // Atualizar dados
    await new Promise((resolve, reject) => {
        db.run('UPDATE usuarios SET empresa_id = ?, nome = ? WHERE email = ?', [empresaId, nome, email], function(err) {
            if (err) {
                console.error('❌ Erro ao atualizar usuário:', err);
                reject(err);
            } else {
                console.log('   ✅ Usuário atualizado com sucesso!');
                resolve();
            }
        });
    });
} else {
    // Criar novo usuário
    const insertUser = `INSERT INTO usuarios 
        (nome, email, senha, role, empresa_id, telefone, created_at) 
        VALUES (?, ?, ?, 'dono', ?, ?, datetime('now'))`;

    await new Promise((resolve, reject) => {
        db.run(insertUser, [nome, email, senhaHash, empresaId, telefoneLimpo], function(err) {
            if (err) {
                console.error('❌ Erro ao criar usuário:', err);
                reject(err);
            } else {
                console.log(`   ✅ Usuário inserido com sucesso!`);
                resolve();
            }
        });
    });

    // 🔥 BUSCAR O USUÁRIO PELO EMAIL
    const usuarioRow = await new Promise((resolve) => {
        db.get('SELECT id FROM usuarios WHERE email = ?', [email], (err, row) => {
            if (err) {
                console.error('❌ Erro ao buscar usuário:', err);
                resolve(null);
            } else {
                resolve(row);
            }
        });
    });

    if (!usuarioRow || !usuarioRow.id) {
        // 🔥 ÚLTIMA TENTATIVA: Buscar pelo rowid
        const rowidRow = await new Promise((resolve) => {
            db.get('SELECT rowid as id FROM usuarios WHERE email = ?', [email], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao buscar rowid:', err);
                    resolve(null);
                } else {
                    resolve(row);
                }
            });
        });
        
        if (rowidRow && rowidRow.id) {
            // Corrigir o ID usando o rowid
            await new Promise((resolve) => {
                db.run('UPDATE usuarios SET id = ? WHERE email = ?', [rowidRow.id, email], (err) => {
                    if (err) console.error('❌ Erro ao corrigir ID:', err);
                    resolve();
                });
            });
            usuarioId = rowidRow.id;
            console.log(`   ✅ Usuário corrigido com ID: ${usuarioId}`);
        } else {
            throw new Error(`Usuário não encontrado após criação! Email: ${email}`);
        }
    } else {
        usuarioId = usuarioRow.id;
        console.log(`   ✅ Usuário criado com ID: ${usuarioId}`);
    }
}

// Verificação final
const usuarioVerificado = await new Promise((resolve) => {
    db.get('SELECT id, nome, email, role FROM usuarios WHERE id = ?', [usuarioId], (err, row) => {
        if (err || !row) {
            console.error('❌ Usuário não encontrado na verificação final!');
            resolve(null);
        } else {
            resolve(row);
        }
    });
});

if (!usuarioVerificado) {
    throw new Error(`Usuário com ID ${usuarioId} não encontrado na verificação final!`);
}

console.log(`   ✅ Usuário verificado: ${usuarioVerificado.nome} (ID: ${usuarioVerificado.id})`);

        // ============================================
        // 7. SUCESSO
        // ============================================

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
        console.error('   Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao realizar cadastro'
        });
    }
});

// ============================================
// POST /api/auth/verificar
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
        
        const sql = `SELECT u.*, e.nome as empresa_nome
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