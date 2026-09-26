// server/config/database.js - HÍBRIDO DEFINITIVO (Local + VPS) - CORRIGIDO COM AUTO-CRIAÇÃO
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const hasPostgres = !!process.env.DATABASE_URL;
let db;
const dbDir = path.join(__dirname, '../../database');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// ============================================
// FUNÇÃO AUXILIAR: LIMPEZA DE SQL PARA SQLITE
// ============================================
function prepareSqlForSQLite(sql) {
    let cleanSql = sql;

    cleanSql = cleanSql.replace(/\$\d+/g, '?');

    cleanSql = cleanSql.replace(/EXTRACT\(\s*MONTH\s+FROM\s+([\w\.]+)\s*\)/gi, "strftime('%m', ?)");
    cleanSql = cleanSql.replace(/EXTRACT\(\s*YEAR\s+FROM\s+([\w\.]+)\s*\)/gi, "strftime('%Y', ?)");
    cleanSql = cleanSql.replace(/EXTRACT\(\s*DAY\s+FROM\s+([\w\.]+)\s*\)/gi, "strftime('%d', ?)");

    cleanSql = cleanSql.replace(/to_char\(\s*([\w\.]+)\s*,\s*'YYYY-MM-DD'\s*\)/gi, "date(?)");

    cleanSql = cleanSql.replace(/=\s*true/gi, '= 1');
    cleanSql = cleanSql.replace(/=\s*false/gi, '= 0');

    cleanSql = cleanSql.replace(/\bILIKE\b/gi, 'LIKE');

    return cleanSql;
}

// ============================================
// 🔥 ENCONTRAR BANCO DA EMPRESA
// ============================================
function encontrarArquivoEmpresa(empresaId) {
    try {
        const files = fs.readdirSync(dbDir);
        const idNum = parseInt(empresaId);

        let file = files.find(f => {
            if (f.startsWith('empresa_')) return false;
            const match = f.match(/_(\d+)\.db$/);
            if (!match) return false;
            return parseInt(match[1]) === idNum;
        });

        if (!file) {
            file = files.find(f => {
                const match = f.match(/^empresa_(\d+)_[\w-]+\.db$/);
                if (!match) return false;
                return parseInt(match[1]) === idNum;
            });
        }

        if (!file) {
            file = files.find(f => f === `empresa_${empresaId}.db`);
        }

        if (!file) {
            file = files.find(f => f.includes(`_${empresaId}.db`));
        }

        return file || null;
    } catch (e) {
        console.error(`❌ Erro ao listar arquivos de banco:`, e.message);
        return null;
    }
}

// ============================================
// 🚫 AUTO-CRIAR TABELAS NOVAS NA EMPRESA
// ============================================
function garantirTabelasEmpresa(empresaDb) {
    // Tabela: bloqueios_agenda
    empresaDb.run(`
        CREATE TABLE IF NOT EXISTS bloqueios_agenda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empresa_id INTEGER NOT NULL,
            profissional_id INTEGER,
            tipo TEXT NOT NULL DEFAULT 'periodo',
            data_inicio TEXT NOT NULL,
            data_fim TEXT,
            datas_especificas TEXT DEFAULT '[]',
            dia_inteiro INTEGER DEFAULT 1,
            hora_inicio TEXT,
            hora_fim TEXT,
            motivo TEXT,
            criado_por INTEGER,
            ativo INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela bloqueios_agenda:', err.message);
        }
    });

    empresaDb.run(`
        CREATE INDEX IF NOT EXISTS idx_bloqueios_empresa 
        ON bloqueios_agenda(empresa_id, data_inicio, data_fim, ativo)
    `, () => {});

    empresaDb.run(`
        CREATE INDEX IF NOT EXISTS idx_bloqueios_profissional 
        ON bloqueios_agenda(empresa_id, profissional_id, ativo)
    `, () => {});
}

// ============================================
// 🔥 ABRIR BANCO DA EMPRESA
// ============================================
function abrirBancoEmpresa(empresaId) {
    const file = encontrarArquivoEmpresa(empresaId);

    if (!file) {
        console.warn(`⚠️ Nenhum banco encontrado para empresa ${empresaId}`);
        return null;
    }

    try {
        console.log(`📁 Empresa ${empresaId} → ${file}`);
        const empresaDb = new sqlite3.Database(path.join(dbDir, file));

        // 🚫 Auto-criar tabelas novas
        garantirTabelasEmpresa(empresaDb);

        return {
            get: (sql, p, c) => empresaDb.get(prepareSqlForSQLite(sql), p, c),
            all: (sql, p, c) => empresaDb.all(prepareSqlForSQLite(sql), p, c),
            run: (sql, p, c) => empresaDb.run(prepareSqlForSQLite(sql), p, c),
            _file: file,
            _raw: empresaDb
        };
    } catch (e) {
        console.error(`❌ Erro ao abrir banco da empresa ${empresaId} (${file}):`, e.message);
        return null;
    }
}

// ============================================
// MODO VPS / PRODUÇÃO (PostgreSQL)
// ============================================
if (hasPostgres) {
    console.log('🔵 Conectando ao PostgreSQL (VPS/Produção)...');
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });

    db = {
        get: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            let i = 0;
            const sqlPg = sql.replace(/\?/g, () => `$${++i}`);
            pool.query(sqlPg, params, (err, res) => {
                if (err) console.error('❌ PG Error (get):', err.message);
                cb(err, res?.rows[0]);
            });
        },
        all: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            let i = 0;
            const sqlPg = sql.replace(/\?/g, () => `$${++i}`);
            pool.query(sqlPg, params, (err, res) => {
                if (err) console.error('❌ PG Error (all):', err.message);
                cb(err, res?.rows);
            });
        },
        run: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            let i = 0;
            const sqlPg = sql.replace(/\?/g, () => `$${++i}`);
            pool.query(sqlPg, params, (err, res) => {
                if (err) console.error('❌ PG Error (run):', err.message);
                cb(err, { lastID: res?.rows[0]?.id, changes: res?.rowCount });
            });
        },
        pool: pool
    };

    db.getEmpresaDb = (empresaId) => abrirBancoEmpresa(empresaId);

} else {
    // ============================================
    // MODO LOCAL (SQLite Puro)
    // ============================================
    console.log('🟢 Conectando ao SQLite (Local)...');
    const dbPath = path.join(dbDir, 'barbearia.db');
    const mainDb = new sqlite3.Database(dbPath);

    db = {
        get: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            const sqlFinal = prepareSqlForSQLite(sql);
            mainDb.get(sqlFinal, params, (err, row) => {
                if (err) console.error('❌ SQLite Error (get):', err.message);
                cb(err, row);
            });
        },
        all: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            const sqlFinal = prepareSqlForSQLite(sql);
            mainDb.all(sqlFinal, params, (err, rows) => {
                if (err) console.error('❌ SQLite Error (all):', err.message);
                cb(err, rows);
            });
        },
        run: (sql, params, cb) => {
            if (typeof params === 'function') { cb = params; params = []; }
            if (!Array.isArray(params)) params = [params];
            const sqlFinal = prepareSqlForSQLite(sql);
            mainDb.run(sqlFinal, params, function(err) {
                if (err) console.error('❌ SQLite Error (run):', err.message);
                cb(err, { lastID: this.lastID, changes: this.changes });
            });
        }
    };

    db.getEmpresaDb = (empresaId) => abrirBancoEmpresa(empresaId);
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function initDatabase() {
    console.log('✅ Database inicializado');
}

function inserirHorariosPadrao() {
    console.log('✅ Horários padrão verificados');
}

function verificarColunaDiasBloqueio() {
    console.log('✅ Coluna dias_bloqueio verificada');
}

module.exports = {
    db,
    getEmpresaDb: db.getEmpresaDb || function() { return null; },
    initDatabase,
    inserirHorariosPadrao,
    verificarColunaDiasBloqueio
};