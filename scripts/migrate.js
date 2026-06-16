// ============================================
// SCRIPT DE MIGRAÇÃO DO BANCO DE DADOS
// ============================================

require('dotenv').config();
const { db, initDatabase } = require('../server/config/database');

console.log('🚀 Iniciando migração do banco de dados...');
console.log(`📋 Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log(`📋 Banco: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);

// Inicializar banco
initDatabase();

console.log('✅ Migração concluída com sucesso!');

// Fechar conexão após 2 segundos
setTimeout(() => {
    if (db.pool) {
        db.pool.end();
    } else {
        db.close();
    }
    console.log('🔒 Conexão fechada.');
}, 2000);