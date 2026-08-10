// ============================================
// CONFIGURAÃ‡ÃƒO DO BANCO DE DADOS HÃBRIDO
// ============================================

const { Pool } = require('pg');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

let db;
let sqlite3 = null;

// ðŸ”¥ SÃ“ CARREGA SQLITE EM DESENVOLVIMENTO
if (!isProduction) {
    try {
        sqlite3 = require('sqlite3').verbose();
        console.log('âœ… sqlite3 carregado para desenvolvimento');
    } catch (e) {
        console.log('âš  sqlite3 nÃ£o disponÃ­vel');
        sqlite3 = null;
    }
}

if (isProduction) {
    console.log('ðŸ”µ Conectando ao PostgreSQL (ProduÃ§Ã£o)...');
    console.log('ðŸ“¡ DATABASE_URL:', process.env.DATABASE_URL ? 'âœ… Definido' : 'âŒ NÃƒO DEFINIDO');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: false  // â† MUDE PARA false
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
                    console.error('âŒ db.get error:', err.message);
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
                    console.error('âŒ db.all error:', err.message);
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
                    console.error('âŒ db.run error:', err.message);
                    return callback(err);
                }
                // ðŸ”¥ ADICIONE ESTA LINHA
                console.log('ðŸ“Œ PostgreSQL result.rows:', result.rows);
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
            console.error('âŒ Erro PostgreSQL:', err.message);
            return;
        }
        console.log('âœ… PostgreSQL conectado!');
        done();
    });

} else {
    console.log('ðŸŸ¢ Conectando ao SQLite (Desenvolvimento)...');
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
        console.log('âœ… SQLite conectado!');
    } else {
        console.error('âŒ sqlite3 nÃ£o disponÃ­vel!');
        process.exit(1);
    }
}

// ============================================
// FUNÃ‡Ã•ES MÃNIMAS PARA COMPATIBILIDADE
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

console.log('âœ… database.js carregado!');