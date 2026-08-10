// ============================================
// CONFIGURAÇÃO DO BANCO DE DADOS - SQLITE + POSTGRES
// ============================================

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

let db;
let sqlite3 = null;
let centralDb = null;
let sqliteDb = null;

// ============================================
// SQLITE (DESENVOLVIMENTO)
// ============================================
if (!isProduction) {
    try {
        sqlite3 = require('sqlite3').verbose();
        console.log('✅ sqlite3 carregado para desenvolvimento');
    } catch (e) {
        console.log('⚠ sqlite3 não disponível');
        sqlite3 = null;
    }
}

// ============================================
// BANCO CENTRAL (SQLITE)
// ============================================
if (!isProduction && sqlite3) {
    const centralDbPath = path.join(__dirname, '../../database/central.db');
    centralDb = new sqlite3.Database(centralDbPath);

    // Criar tabelas do banco central
    centralDb.exec(`
        CREATE TABLE IF NOT EXISTS empresas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            plano TEXT DEFAULT 'trial',
            limite_profissionais INTEGER DEFAULT 1,
            trial_expira DATETIME,
            assinatura_ativa INTEGER DEFAULT 0,
            assinatura_valida_ate DATETIME,
            agendamentos_mes INTEGER DEFAULT 0,
            mes_referencia TEXT,
            dias_bloqueio_geral TEXT,
            telefone_dono TEXT,
            endereco TEXT,
            whatsapp_instance TEXT,
            whatsapp_connected INTEGER DEFAULT 0,
            whatsapp_number TEXT,
            whatsapp_connected_at DATETIME,
            whatsapp_proprio_habilitado INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            role TEXT DEFAULT 'dono',
            empresa_id INTEGER,
            telefone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('payment_mode', 'simulation');
    `);

    console.log('✅ Banco central SQLite criado/verificado');
}

// ============================================
// CACHE DE BANCOS POR EMPRESA (SQLITE)
// ============================================
const dbCache = new Map();

// ============================================
// FUNÇÃO PARA OBTER BANCO DA EMPRESA
// ============================================
function getEmpresaDb(empresaId) {
    if (!empresaId) {
        console.error('❌ empresaId é obrigatório');
        return centralDb;
    }

    if (dbCache.has(empresaId)) {
        return dbCache.get(empresaId);
    }

    const dbPath = path.join(__dirname, `../../database/empresa_${empresaId}.db`);
    const dbExists = fs.existsSync(dbPath);

    const empresaDb = new sqlite3.Database(dbPath);

    if (!dbExists) {
        console.log(`🆕 Criando banco para empresa ${empresaId}`);
        criarTabelasEmpresa(empresaDb, empresaId);
    }

    dbCache.set(empresaId, empresaDb);
    console.log(`📁 Banco da empresa ${empresaId} carregado`);

    return empresaDb;
}

// ============================================
// CRIAÇÃO DE TABELAS POR EMPRESA
// ============================================
function criarTabelasEmpresa(db, empresaId) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            telefone TEXT,
            email TEXT,
            empresa_id INTEGER,
            bloqueado_chatbot INTEGER DEFAULT 0,
            dias_bloqueio TEXT,
            grupos TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS profissionais (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT,
            senha TEXT,
            comissao_percent REAL DEFAULT 0,
            empresa_id INTEGER,
            ativo INTEGER DEFAULT 1,
            telefone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS servicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descricao TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            ativo INTEGER DEFAULT 1,
            empresa_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            data TEXT NOT NULL,
            hora TEXT NOT NULL,
            servico_id INTEGER,
            servico TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            status TEXT DEFAULT 'agendado',
            comissao REAL DEFAULT 0,
            empresa_id INTEGER,
            profissional_id INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            valor_total REAL DEFAULT 0,
            servicos_extras TEXT,
            valor_extras REAL DEFAULT 0,
            forma_pagamento TEXT DEFAULT '',
            prazo_dias INTEGER DEFAULT 0,
            data_vencimento TEXT,
            descricao_pagamento TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS despesas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            descricao TEXT,
            categoria TEXT,
            valor REAL DEFAULT 0,
            data TEXT,
            data_vencimento TEXT,
            pago INTEGER DEFAULT 0,
            forma_pagamento TEXT,
            observacao TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS horarios_funcionamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER,
            dia_semana INTEGER,
            aberto INTEGER DEFAULT 1,
            hora_inicio TEXT DEFAULT '08:00',
            hora_fim TEXT DEFAULT '18:00',
            almoco_inicio TEXT DEFAULT '12:00',
            almoco_fim TEXT DEFAULT '13:00'
        );

        CREATE TABLE IF NOT EXISTS lembretes_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agendamento_id INTEGER,
            empresa_id INTEGER,
            cliente_id INTEGER,
            data_vencimento TEXT,
            forma_pagamento TEXT,
            prazo_dias INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Inserir horários padrão
    db.exec(`
        INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim)
        VALUES 
            (${empresaId}, 1, 1, '08:00', '18:00'),
            (${empresaId}, 2, 1, '08:00', '18:00'),
            (${empresaId}, 3, 1, '08:00', '18:00'),
            (${empresaId}, 4, 1, '08:00', '18:00'),
            (${empresaId}, 5, 1, '08:00', '18:00'),
            (${empresaId}, 6, 1, '08:00', '18:00');
    `);

    console.log(`✅ Tabelas criadas para empresa ${empresaId}`);
}

// ============================================
// FUNÇÕES DE COMPATIBILIDADE
// ============================================
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

// ============================================
// INICIALIZAÇÃO
// ============================================
function initDatabase() {
    console.log('✅ Banco de dados inicializado');
}

function inserirHorariosPadrao(empresaId) {
    const empresaDb = getEmpresaDb(empresaId);
    empresaDb.exec(`
        INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim)
        VALUES 
            (${empresaId}, 1, 1, '08:00', '18:00'),
            (${empresaId}, 2, 1, '08:00', '18:00'),
            (${empresaId}, 3, 1, '08:00', '18:00'),
            (${empresaId}, 4, 1, '08:00', '18:00'),
            (${empresaId}, 5, 1, '08:00', '18:00'),
            (${empresaId}, 6, 1, '08:00', '18:00');
    `);
}

function verificarColunaDiasBloqueio() {
    return true;
}

// ============================================
// CONFIGURAR DB (SQLite ou PostgreSQL)
// ============================================
if (isProduction) {
    console.log('🔵 Conectando ao PostgreSQL (Produção)...');
    console.log('📡 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definido' : '❌ NÃO DEFINIDO');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false
    });

    function convertPlaceholders(sql) {
        if (sql.includes('$1')) return sql;
        let i = 0;
        return sql.replace(/\?/g, () => `$${++i}`);
    }

    db = {
        get: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (typeof callback !== 'function') {
                callback = () => { };
            }
            if (!Array.isArray(params)) {
                params = [params];
            }
            const sqlFinal = sql.includes('?') ? convertPlaceholders(sql) : sql;
            pool.query(sqlFinal, params, (err, result) => {
                if (err) {
                    console.error('❌ db.get error:', err.message);
                    return callback(err);
                }
                callback(null, result.rows[0] || null);
            });
        },
        all: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (typeof callback !== 'function') {
                callback = () => { };
            }
            if (!Array.isArray(params)) {
                params = [params];
            }
            const sqlFinal = sql.includes('?') ? convertPlaceholders(sql) : sql;
            pool.query(sqlFinal, params, (err, result) => {
                if (err) {
                    console.error('❌ db.all error:', err.message);
                    return callback(err);
                }
                callback(null, result.rows);
            });
        },
        run: (sql, params, callback) => {
            if (typeof params === 'function') {
                callback = params;
                params = [];
            }
            if (typeof callback !== 'function') {
                callback = () => { };
            }
            if (!Array.isArray(params)) {
                params = [params];
            }
            const sqlFinal = sql.includes('?') ? convertPlaceholders(sql) : sql;
            pool.query(sqlFinal, params, (err, result) => {
                if (err) {
                    console.error('❌ db.run error:', err.message);
                    return callback(err);
                }
                callback(null, {
                    lastID: result.rows[0]?.id || null,
                    changes: result.rowCount
                });
            });
        },
        pool: pool
    };

    pool.connect((err, client, done) => {
        if (err) {
            console.error('❌ Erro PostgreSQL:', err.message);
            return;
        }
        console.log('✅ PostgreSQL conectado!');
        done();
    });

} else {
    // SQLite - usar o banco central
    console.log('🟢 Conectando ao SQLite (Desenvolvimento)...');
    if (sqlite3) {
        sqliteDb = new sqlite3.Database(path.join(__dirname, '../../database/barbearia.db'));

        db = {
            get: (sql, params, callback) => {
                if (typeof params === 'function') {
                    callback = params;
                    params = [];
                }
                if (typeof callback !== 'function') {
                    callback = () => { };
                }
                if (!Array.isArray(params)) {
                    params = [params];
                }
                // Tentar no centralDb primeiro
                if (centralDb && !sql.includes('clientes') && !sql.includes('agendamentos') && !sql.includes('profissionais') && !sql.includes('servicos') && !sql.includes('despesas')) {
                    return centralDb.get(sql, params, callback);
                }
                return sqliteDb.get(sql, params, callback);
            },
            all: (sql, params, callback) => {
                if (typeof params === 'function') {
                    callback = params;
                    params = [];
                }
                if (typeof callback !== 'function') {
                    callback = () => { };
                }
                if (!Array.isArray(params)) {
                    params = [params];
                }
                if (centralDb && !sql.includes('clientes') && !sql.includes('agendamentos') && !sql.includes('profissionais') && !sql.includes('servicos') && !sql.includes('despesas')) {
                    return centralDb.all(sql, params, callback);
                }
                return sqliteDb.all(sql, params, callback);
            },
            run: (sql, params, callback) => {
                if (typeof params === 'function') {
                    callback = params;
                    params = [];
                }
                if (typeof callback !== 'function') {
                    callback = () => { };
                }
                if (!Array.isArray(params)) {
                    params = [params];
                }
                if (centralDb && !sql.includes('clientes') && !sql.includes('agendamentos') && !sql.includes('profissionais') && !sql.includes('servicos') && !sql.includes('despesas')) {
                    return centralDb.run(sql, params, callback);
                }
                return sqliteDb.run(sql, params, callback);
            },
            getEmpresaDb: getEmpresaDb
        };
        console.log('✅ SQLite conectado!');
    } else {
        console.error('❌ sqlite3 não disponível!');
        process.exit(1);
    }
}

// ============================================
// EXPORTAR
// ============================================
module.exports = {
    db,
    getEmpresaDb,
    initDatabase,
    inserirHorariosPadrao,
    verificarColunaDiasBloqueio,
    centralDb,
    formatDate,
    formatMonthYear,
    coalesceSum,
    dateInterval,
    extractMonth,
    extractYear,
    extractDay,
    lower
};

console.log('✅ database.js carregado!');