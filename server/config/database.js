// ============================================
// CONFIGURAÇÃO DO BANCO DE DADOS - SQLITE
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🟢 Conectando ao SQLite (Desenvolvimento)...');

const dbPath = path.join(__dirname, '../../database/barbearia.db');
const db = new sqlite3.Database(dbPath);

console.log('✅ SQLite conectado!');

// ============================================
// WRAPPER PARA COMPATIBILIDADE
// ============================================

const dbWrapper = {
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
        return db.get(sql, params, callback);
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
        return db.all(sql, params, callback);
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
        return db.run(sql, params, callback);
    },
    pool: db
};

// ============================================
// FUNÇÕES MÍNIMAS PARA COMPATIBILIDADE
// ============================================
function initDatabase() {}
function inserirHorariosPadrao() {}
function verificarColunaDiasBloqueio() {}

module.exports = {
    db: dbWrapper,
    initDatabase,
    inserirHorariosPadrao,
    verificarColunaDiasBloqueio
};

console.log('✅ database.js carregado!');