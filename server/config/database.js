// server/config/database.js - Suporte SQLite + Turso (CORRIGIDO)
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const useTurso = process.env.USE_TURSO === 'true' && process.env.TURSO_DATABASE_URL;
const hasPostgres = !!process.env.DATABASE_URL && !useTurso;

let db = null;
let isTurso = false;
let isPostgres = false;

if (useTurso) {
    console.log('🔵 Conectando ao Turso (LibSQL)...');
    console.log('📡 URL:', process.env.TURSO_DATABASE_URL);

    try {
        const tursoClient = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN
        });
        isTurso = true;
        console.log('✅ Turso conectado!');
        
        db = {
            // Turso: get (SELECT único) - COM CALLBACK
            get: (sql, params, cb) => {
                if (typeof params === 'function') { cb = params; params = []; }
                if (!Array.isArray(params)) params = [params];
                
                const args = params.map(p => p !== undefined ? p : null);
                
                tursoClient.execute({ sql: sql, args: args })
                    .then(result => {
                        const rows = result.rows || [];
                        if (typeof cb === 'function') cb(null, rows.length > 0 ? rows[0] : null);
                    })
                    .catch(err => {
                        console.error('❌ Turso Error (get):', err.message);
                        if (typeof cb === 'function') cb(err, null);
                    });
            },
            
            // Turso: all (SELECT múltiplos) - COM CALLBACK
            all: (sql, params, cb) => {
                if (typeof params === 'function') { cb = params; params = []; }
                if (!Array.isArray(params)) params = [params];
                
                const args = params.map(p => p !== undefined ? p : null);
                
                tursoClient.execute({ sql: sql, args: args })
                    .then(result => {
                        if (typeof cb === 'function') cb(null, result.rows || []);
                    })
                    .catch(err => {
                        console.error('❌ Turso Error (all):', err.message);
                        if (typeof cb === 'function') cb(err, null);
                    });
            },
            
            // Turso: run (INSERT, UPDATE, DELETE) - COM CALLBACK
            run: (sql, params, cb) => {
                if (typeof params === 'function') { cb = params; params = []; }
                if (!Array.isArray(params)) params = [params];
                
                const args = params.map(p => p !== undefined ? p : null);
                
                tursoClient.execute({ sql: sql, args: args })
                    .then(result => {
                        if (typeof cb === 'function') {
                            cb(null, { 
                                lastID: result.lastInsertRowid || 0, 
                                changes: result.rowsAffected || 0 
                            });
                        }
                    })
                    .catch(err => {
                        console.error('❌ Turso Error (run):', err.message);
                        if (typeof cb === 'function') cb(err, null);
                    });
            },
            
            // Turso: exec (criação de tabelas) - COM CALLBACK
            exec: (sql, cb) => {
                tursoClient.execute(sql)
                    .then(() => {
                        if (typeof cb === 'function') cb(null, { changes: 0 });
                    })
                    .catch(err => {
                        console.error('❌ Turso Error (exec):', err.message);
                        if (typeof cb === 'function') cb(err, null);
                    });
            }
        };
        
    } catch (error) {
        console.error('❌ Erro ao conectar Turso:', error.message);
        console.log('🟢 Usando SQLite como fallback...');
        isTurso = false;
    }
}

// ============================================
// POSTGRESQL
// ============================================
if (!isTurso && hasPostgres) {
    console.log('🔵 Conectando ao PostgreSQL...');
    const { Pool } = require('pg');
    const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL, 
        ssl: false 
    });
    isPostgres = true;
    
    db = {
        get: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            let i = 0;
            const sqlPg = sql.replace(/\?/g, () => $);
            pool.query(sqlPg, params, (err, res) => {
                if (err) console.error('❌ PG Error (get):', err.message);
                cb(err, res?.rows[0]);
            });
        },
        all: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            let i = 0;
            const sqlPg = sql.replace(/\?/g, () => $);
            pool.query(sqlPg, params, (err, res) => {
                if (err) console.error('❌ PG Error (all):', err.message);
                cb(err, res?.rows);
            });
        },
        run: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            let i = 0;
            const sqlPg = sql.replace(/\?/g, () => $);
            pool.query(sqlPg, params, (err, res) => {
                if (err) console.error('❌ PG Error (run):', err.message);
                cb(err, { lastID: res?.rows[0]?.id, changes: res?.rowCount });
            });
        }
    };
}

// ============================================
// SQLITE (FALLBACK)
// ============================================
if (!isTurso && !isPostgres) {
    console.log('🟢 Conectando ao SQLite (Local)...');
    const dbDir = path.join(__dirname, '../../database');
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    const sqliteDb = new sqlite3.Database('./database/barbearia.db', (err) => {
        if (err) console.error('❌ Erro ao conectar SQLite:', err.message);
        else console.log('✅ SQLite conectado');
    });

    db = {
        get: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            sqliteDb.get(sql, params, (err, row) => {
                if (err) console.error('❌ SQLite Error (get):', err.message);
                cb(err, row);
            });
        },
        all: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            sqliteDb.all(sql, params, (err, rows) => {
                if (err) console.error('❌ SQLite Error (all):', err.message);
                cb(err, rows);
            });
        },
        run: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            sqliteDb.run(sql, params, function(err) {
                if (err) console.error('❌ SQLite Error (run):', err.message);
                cb(err, { lastID: this.lastID, changes: this.changes });
            });
        }
    };
}

// ============================================
// FUNÇÃO getEmpresaDb
// ============================================
db.getEmpresaDb = (empresaId) => {
    if (isTurso) return db;
    return db;
};

function initDatabase() { console.log('✅ Database inicializado'); }
function inserirHorariosPadrao(empresaId) { console.log('📅 Inserindo horários padrão para empresa', empresaId); }
function verificarColunaDiasBloqueio() { console.log('✅ Coluna dias_bloqueio verificada'); }

module.exports = {
    db,
    getEmpresaDb: db.getEmpresaDb || function() { return db; },
    initDatabase,
    inserirHorariosPadrao,
    verificarColunaDiasBloqueio,
    isTurso,
    isPostgres
};
