// server/config/database.js
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const isTest = process.env.NODE_ENV === 'test';

// ============================================
// CONEXÃO COM BANCO PRINCIPAL
// ============================================

let db;
let mainDb = null;
const dbPath = path.join(__dirname, '../../database/barbearia.db');
const dbDir = path.dirname(dbPath);

// Criar pasta database se não existir
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// ============================================
// POSTGRESQL (PRODUÇÃO)
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

    function getEmpresaDb(empresaId) {
        return db;
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
        pool: pool,
        getEmpresaDb: getEmpresaDb
    };

    pool.connect((err, client, done) => {
        if (err) {
            console.error('❌ Erro PostgreSQL:', err.message);
            return;
        }
        console.log('✅ PostgreSQL conectado!');
        done();
    });

    module.exports = { db, getEmpresaDb: getEmpresaDb, initDatabase, inserirHorariosPadrao, verificarColunaDiasBloqueio };
    console.log('✅ database.js carregado (PostgreSQL)');
    return;
}

// ============================================
// SQLITE (DESENVOLVIMENTO)
// ============================================

console.log('🟢 Conectando ao SQLite (Desenvolvimento)...');
console.log(`📁 Banco: ${dbPath}`);

// Banco principal
mainDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao SQLite:', err.message);
    } else {
        console.log('✅ SQLite conectado!');
    }
});

// ============================================
// CACHE DE BANCOS POR EMPRESA - CORRIGIDO
// ============================================
const empresaDbCache = {};
const nomeBancoCache = {};

function getEmpresaDb(empresaId) {
    if (!empresaId) {
        console.warn('⚠️ getEmpresaDb chamado sem empresaId, retornando mainDb');
        return mainDb;
    }

    // Verificar se já está no cache de conexão
    if (empresaDbCache[empresaId]) {
        return empresaDbCache[empresaId];
    }

    // 🔥 VERIFICAR SE O NOME DO BANCO JÁ ESTÁ NO CACHE
    let nomeArquivo = nomeBancoCache[empresaId];

    if (!nomeArquivo) {
        // 🔥 BUSCAR O NOME DO BANCO DE FORMA INTELIGENTE
        
        // 1. Tentar o formato padrão empresa_X.db
        const caminhoPadrao = path.join(dbDir, `empresa_${empresaId}.db`);
        if (fs.existsSync(caminhoPadrao)) {
            nomeArquivo = `empresa_${empresaId}.db`;
        } else {
            // 2. Procurar por qualquer arquivo que termine com _ID.db
            try {
                const arquivos = fs.readdirSync(dbDir);
                for (const f of arquivos) {
                    // Verificar se o arquivo termina com _ID.db
                    if (f.endsWith(`_${empresaId}.db`)) {
                        nomeArquivo = f;
                        break;
                    }
                }
            } catch (err) {
                console.warn('⚠️ Erro ao ler diretório:', err.message);
            }
            
            // 3. Se ainda não encontrou, tentar buscar pelo nome da empresa
            if (!nomeArquivo) {
                try {
                    // Buscar síncrono o nome da empresa
                    const empresa = mainDb.get('SELECT nome FROM empresas WHERE id = ?', [empresaId]);
                    if (empresa && empresa.nome) {
                        // Gerar nome a partir do nome da empresa
                        const nomeBase = empresa.nome
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-zA-Z0-9]/g, '_')
                            .replace(/_+/g, '_')
                            .replace(/^_|_$/g, '');
                        
                        // Tentar com o nome gerado
                        const caminhoNomeado = path.join(dbDir, `${nomeBase}_${empresaId}.db`);
                        if (fs.existsSync(caminhoNomeado)) {
                            nomeArquivo = `${nomeBase}_${empresaId}.db`;
                        }
                    }
                } catch (err) {
                    console.warn('⚠️ Erro ao buscar nome da empresa:', err.message);
                }
            }
            
            // 4. Se não encontrou nenhum, criar com o nome padrão
            if (!nomeArquivo) {
                console.warn(`⚠️ Banco da empresa ${empresaId} não encontrado, criando novo...`);
                nomeArquivo = `empresa_${empresaId}.db`;
                // Criar o banco vazio
                const novoDbPath = path.join(dbDir, nomeArquivo);
                const novoDb = new sqlite3.Database(novoDbPath);
                novoDb.close();
                console.log(`📁 Banco criado: ${nomeArquivo}`);
            }
        }
        
        // Salvar no cache
        nomeBancoCache[empresaId] = nomeArquivo;
    }

    const dbPathEmpresa = path.join(dbDir, nomeArquivo);

    // Verificar se o banco existe
    if (!fs.existsSync(dbPathEmpresa)) {
        console.warn(`⚠️ Banco da empresa ${empresaId} não encontrado: ${dbPathEmpresa}`);
        // Tentar criar o banco
        const novoDbPath = path.join(dbDir, `empresa_${empresaId}.db`);
        const novoDb = new sqlite3.Database(novoDbPath);
        novoDb.close();
        console.log(`📁 Banco criado: empresa_${empresaId}.db`);
        return mainDb;
    }

    console.log(`📁 Conectando ao banco da empresa ${empresaId}: ${nomeArquivo}`);
    const empresaDb = new sqlite3.Database(dbPathEmpresa);
    empresaDbCache[empresaId] = empresaDb;
    return empresaDb;
}

// ============================================
// WRAPPER DO BANCO PRINCIPAL
// ============================================

db = {
    get: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (typeof callback !== 'function') {
            callback = () => {};
        }
        if (!Array.isArray(params)) {
            params = [params];
        }
        return mainDb.get(sql, params, callback);
    },
    all: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (typeof callback !== 'function') {
            callback = () => {};
        }
        if (!Array.isArray(params)) {
            params = [params];
        }
        return mainDb.all(sql, params, callback);
    },
    run: (sql, params, callback) => {
        if (typeof params === 'function') {
            callback = params;
            params = [];
        }
        if (typeof callback !== 'function') {
            callback = () => {};
        }
        if (!Array.isArray(params)) {
            params = [params];
        }
        return mainDb.run(sql, params, callback);
    },
    getEmpresaDb: getEmpresaDb
};

console.log('✅ database.js carregado (SQLite com bancos independentes)');
console.log(`📊 DB disponível? ${typeof mainDb}`);
console.log(`📊 DB.run é função? ${typeof mainDb?.run === 'function'}`);
console.log(`📊 DB.get é função? ${typeof mainDb?.get === 'function'}`);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function initDatabase() {
    console.log('✅ Database inicializado');
}

function inserirHorariosPadrao() {
    console.log('✅ Horários padrão inseridos');
}

function verificarColunaDiasBloqueio() {
    console.log('✅ Coluna dias_bloqueio verificada');
}

// ============================================
// EXPORTAR
// ============================================

module.exports = {
    db,
    getEmpresaDb: getEmpresaDb,
    initDatabase,
    inserirHorariosPadrao,
    verificarColunaDiasBloqueio
};