// ============================================
// CONFIGURAÇÃO DO BANCO DE DADOS HÍBRIDO
// ============================================

const { Pool } = require('pg');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

let db;
let sqlite3 = null;

// 🔥 SÓ CARREGA SQLITE EM DESENVOLVIMENTO
if (!isProduction) {
    try {
        sqlite3 = require('sqlite3').verbose();
        console.log('✅ sqlite3 carregado para desenvolvimento');
    } catch (e) {
        console.log('⚠ sqlite3 não disponível');
        sqlite3 = null;
    }
}

if (isProduction) {
    console.log('🔵 Conectando ao PostgreSQL (Produção)...');
    console.log('📡 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definido' : '❌ NÃO DEFINIDO');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false  // ← MUDE PARA false
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
                // 🔥 ADICIONE ESTA LINHA
                console.log('📌 PostgreSQL result.rows:', result.rows);
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
    console.log('🟢 Conectando ao SQLite (Desenvolvimento)...');
    if (sqlite3) {
        const sqliteDb = new sqlite3.Database(path.join(__dirname, '../../database/barbearia.db'));

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
                return sqliteDb.run(sql, params, callback);
            }
        };
        console.log('✅ SQLite conectado!');
    } else {
        console.error('❌ sqlite3 não disponível!');
        process.exit(1);
    }
}

// ============================================
// FUNÇÕES MÍNIMAS PARA COMPATIBILIDADE
// ============================================
function initDatabase() { }
function inserirHorariosPadrao() { }
function verificarColunaDiasBloqueio() { }

module.exports = {
    db,
    initDatabase,
    inserirHorariosPadrao,
    verificarColunaDiasBloqueio
};

console.log('✅ database.js carregado!');