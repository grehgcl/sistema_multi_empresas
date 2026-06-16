// ============================================
// CONFIGURAÇÃO DO BANCO DE DADOS
// ============================================

// Carregar sqlite3 apenas se não estiver em produção
let sqlite3;
try {
    if (process.env.NODE_ENV !== 'production' && process.env.RENDER !== 'true') {
        sqlite3 = require('sqlite3').verbose();
        console.log('✅ sqlite3 carregado para desenvolvimento');
    } else {
        console.log('ℹ️ sqlite3 não carregado (ambiente de produção)');
        sqlite3 = null;
    }
} catch (e) {
    console.log('⚠️ sqlite3 não disponível');
    sqlite3 = null;
}

const { Pool } = require('pg');
const path = require('path');

// ============================================
// DETECTA O AMBIENTE
// ============================================

const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true';

// ============================================
// CONEXÃO COM O BANCO
// ============================================

let db;

if (isProduction || isRender) {
    // ============================================
    // PRODUÇÃO: PostgreSQL (Render)
    // ============================================
    console.log('🔵 Conectando ao PostgreSQL (Produção)...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    // Wrapper para manter compatibilidade com o SQLite
    db = {
        // Para queries que retornam uma linha
        get: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            pool.query(sql, params, (err, result) => {
                if (err) {
                    if (callback) return callback(err);
                    console.error('❌ Erro no get:', err.message);
                    return;
                }
                if (callback) callback(null, result.rows[0] || null);
            });
        },
        // Para queries que retornam várias linhas
        all: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            pool.query(sql, params, (err, result) => {
                if (err) {
                    if (callback) return callback(err);
                    console.error('❌ Erro no all:', err.message);
                    return;
                }
                if (callback) callback(null, result.rows);
            });
        },
        // Para INSERT/UPDATE/DELETE
        run: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }

            // Verificar se é um INSERT com RETURNING
            const isInsert = sql.trim().toUpperCase().startsWith('INSERT');

            pool.query(sql, params, (err, result) => {
                if (err) {
                    if (callback) return callback(err);
                    console.error('❌ Erro no run:', err.message);
                    return;
                }

                let lastID = null;
                // Para INSERT com RETURNING, pegar o ID da primeira linha
                if (isInsert && result && result.rows && result.rows.length > 0) {
                    lastID = result.rows[0].id || null;
                }

                if (callback) {
                    callback(null, { lastID: lastID, id: lastID });
                }
            });
        },
        // Para queries com resultado (SELECT com retorno)
        query: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            pool.query(sql, params, (err, result) => {
                if (err) {
                    if (callback) return callback(err);
                    console.error('❌ Erro no query:', err.message);
                    return;
                }
                if (callback) callback(null, { rows: result.rows });
            });
        },
        // Pool nativo para queries avançadas
        pool: pool
    };

    // Testar conexão
    pool.query('SELECT NOW()', (err, result) => {
        if (err) {
            console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
        } else {
            console.log('✅ PostgreSQL conectado com sucesso!');
            console.log(`   📍 Host: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Render'}`);
        }
    });

} else {
    // ============================================
    // DESENVOLVIMENTO: SQLite (Local)
    // ============================================
    console.log('🟢 Conectando ao SQLite (Desenvolvimento)...');

    if (sqlite3) {
        const sqliteDb = new sqlite3.Database(path.join(__dirname, '../../database/barbearia.db'));
        db = sqliteDb;
        console.log('✅ SQLite conectado com sucesso!');
    } else {
        console.error('❌ sqlite3 não disponível! Certifique-se de instalar as dependências de desenvolvimento.');
        console.error('   Execute: npm install --include=dev');
        process.exit(1);
    }
}

// ============================================
// FUNÇÕES DE INICIALIZAÇÃO DAS TABELAS
// ============================================

function initDatabase() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (isProduction) {
        // ============================================
        // PostgreSQL: Criação das tabelas
        // ============================================
        console.log('📦 Criando tabelas no PostgreSQL...');

        const queries = [
            // empresas
            `CREATE TABLE IF NOT EXISTS empresas (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                plano TEXT DEFAULT 'trial',
                limite_profissionais INTEGER DEFAULT 1,
                trial_expira DATE,
                assinatura_ativa INTEGER DEFAULT 1,
                assinatura_valida_ate DATE,
                ultima_cobranca DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // usuarios
            `CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                role TEXT DEFAULT 'dono',
                empresa_id INTEGER REFERENCES empresas(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // profissionais
            `CREATE TABLE IF NOT EXISTS profissionais (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                comissao_percent REAL DEFAULT 30,
                empresa_id INTEGER REFERENCES empresas(id),
                ativo INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // clientes
            `CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                telefone TEXT,
                email TEXT,
                bloqueado_chatbot INTEGER DEFAULT 0,
                empresa_id INTEGER REFERENCES empresas(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // servicos
            `CREATE TABLE IF NOT EXISTS servicos (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                descricao TEXT,
                valor REAL NOT NULL,
                duracao INTEGER DEFAULT 30,
                ativo INTEGER DEFAULT 1,
                empresa_id INTEGER REFERENCES empresas(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // agendamentos
            `CREATE TABLE IF NOT EXISTS agendamentos (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER REFERENCES clientes(id),
                servico_id INTEGER REFERENCES servicos(id),
                servico TEXT,
                valor REAL,
                data DATE NOT NULL,
                hora TEXT NOT NULL,
                status TEXT DEFAULT 'pendente',
                comissao REAL DEFAULT 0,
                empresa_id INTEGER REFERENCES empresas(id),
                profissional_id INTEGER REFERENCES profissionais(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // horarios_funcionamento
            `CREATE TABLE IF NOT EXISTS horarios_funcionamento (
                id SERIAL PRIMARY KEY,
                empresa_id INTEGER REFERENCES empresas(id),
                dia_semana INTEGER,
                aberto INTEGER DEFAULT 1,
                hora_inicio TEXT DEFAULT '09:00',
                hora_fim TEXT DEFAULT '18:00',
                almoco_inicio TEXT DEFAULT '12:00',
                almoco_fim TEXT DEFAULT '13:00',
                intervalo_minutos INTEGER DEFAULT 30
            )`,

            // transacoes_pagamento
            `CREATE TABLE IF NOT EXISTS transacoes_pagamento (
                id SERIAL PRIMARY KEY,
                empresa_id INTEGER NOT NULL REFERENCES empresas(id),
                plano_id VARCHAR(50) NOT NULL,
                plano_nome VARCHAR(100) NOT NULL,
                valor DECIMAL(10,2) NOT NULL,
                metodo VARCHAR(50) NOT NULL,
                transacao_id VARCHAR(255),
                pagamento_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                qr_code TEXT,
                qr_code_base64 TEXT,
                boleto_url TEXT,
                payment_method VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )`,

            // planos_historico
            `CREATE TABLE IF NOT EXISTS planos_historico (
                id SERIAL PRIMARY KEY,
                empresa_id INTEGER NOT NULL REFERENCES empresas(id),
                plano_antigo VARCHAR(50),
                plano_novo VARCHAR(50) NOT NULL,
                valor_pago DECIMAL(10,2),
                metodo_pagamento VARCHAR(50),
                comprovante TEXT,
                data_mudanca TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        let executed = 0;
        queries.forEach((query, index) => {
            db.run(query, [], (err) => {
                if (err) {
                    console.error(`❌ Erro ao criar tabela ${index + 1}:`, err.message);
                } else {
                    executed++;
                    if (executed === queries.length) {
                        console.log(`✅ ${queries.length} tabelas criadas/verificadas no PostgreSQL!`);
                    }
                }
            });
        });

    } else {
        // ============================================
        // SQLite: Criação das tabelas (código original)
        // ============================================
        console.log('📦 Criando tabelas no SQLite...');

        db.run(`CREATE TABLE IF NOT EXISTS empresas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            plano TEXT DEFAULT 'trial',
            limite_profissionais INTEGER DEFAULT 1,
            trial_expira DATE,
            assinatura_ativa INTEGER DEFAULT 1,
            assinatura_valida_ate DATE,
            ultima_cobranca DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            role TEXT DEFAULT 'dono',
            empresa_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            comissao_percent REAL DEFAULT 30,
            empresa_id INTEGER,
            ativo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            bloqueado_chatbot INTEGER DEFAULT 0,
            empresa_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL NOT NULL,
            duracao INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1,
            empresa_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            servico_id INTEGER,
            servico TEXT,
            valor REAL,
            data DATE NOT NULL,
            hora TEXT NOT NULL,
            status TEXT DEFAULT 'pendente',
            comissao REAL DEFAULT 0,
            empresa_id INTEGER,
            profissional_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (servico_id) REFERENCES servicos(id),
            FOREIGN KEY (empresa_id) REFERENCES empresas(id),
            FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS horarios_funcionamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            dia_semana INTEGER,
            aberto INTEGER DEFAULT 1,
            hora_inicio TEXT DEFAULT '09:00',
            hora_fim TEXT DEFAULT '18:00',
            almoco_inicio TEXT DEFAULT '12:00',
            almoco_fim TEXT DEFAULT '13:00',
            intervalo_minutos INTEGER DEFAULT 30,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS transacoes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            plano_id VARCHAR(50) NOT NULL,
            plano_nome VARCHAR(100) NOT NULL,
            valor DECIMAL(10,2) NOT NULL,
            metodo VARCHAR(50) NOT NULL,
            transacao_id VARCHAR(255),
            pagamento_id VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending',
            qr_code TEXT,
            qr_code_base64 TEXT,
            boleto_url TEXT,
            payment_method VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS planos_historico (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            plano_antigo VARCHAR(50),
            plano_novo VARCHAR(50) NOT NULL,
            valor_pago DECIMAL(10,2),
            metodo_pagamento VARCHAR(50),
            comprovante TEXT,
            data_mudanca DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empresa_id) REFERENCES empresas(id)
        )`);

        console.log('✅ Tabelas SQLite criadas/verificadas!');
    }
}

function inserirHorariosPadrao(empresaId) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    if (isProduction) {
        // PostgreSQL: Deleta e insere novamente para evitar conflitos
        db.run(`DELETE FROM horarios_funcionamento WHERE empresa_id = $1`, [empresaId], (err) => {
            if (err) {
                console.error('❌ Erro ao deletar horários antigos:', err.message);
                return;
            }
            for (let i = 1; i <= 6; i++) {
                db.run(`INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
                        VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00')`,
                    [empresaId, i], (err) => {
                        if (err) console.error('❌ Erro ao inserir horário:', err.message);
                    });
            }
            db.run(`INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
                    VALUES ($1, 0, 0, '09:00', '18:00', '12:00', '13:00')`,
                [empresaId], (err) => {
                    if (err) console.error('❌ Erro ao inserir horário domingo:', err.message);
                });
        });
    } else {
        // SQLite: Mantém o INSERT OR IGNORE
        for (let i = 1; i <= 6; i++) {
            db.run(`INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
                    VALUES (?, ?, 1, '09:00', '18:00', '12:00', '13:00')`, [empresaId, i]);
        }
        db.run(`INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim)
                VALUES (?, 0, 0, '09:00', '18:00', '12:00', '13:00')`, [empresaId]);
    }
}

module.exports = { db, initDatabase, inserirHorariosPadrao };