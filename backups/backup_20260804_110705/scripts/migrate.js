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

// ÍNDICES PRA EVITAR HORÁRIO DUPLICADO E ACELERAR CONSULTAS
const indices = [
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa_data ON agendamentos(empresa_id, data)`,
    `CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional_data ON agendamentos(profissional_id, data, hora) WHERE status = 'agendado'`,
    `CREATE INDEX IF NOT EXISTS idx_clientes_empresa_telefone ON clientes(empresa_id, telefone)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_horario_unico ON agendamentos(empresa_id, profissional_id, data, hora) WHERE status = 'agendado'`
];

indices.forEach((sql, i) => {
    db.run(sql, (err) => {
        if (err && !err.message.includes('already exists')) {
            console.error(`❌ Erro índice ${i + 1}:`, err.message);
        } else {
            console.log(`✅ Índice ${i + 1} criado`);
        }
    });
});

// Fechar conexão após 2 segundos
setTimeout(() => {
    if (db.pool) {
        db.pool.end();
    } else {
        db.close();
    }
    console.log('🔒 Conexão fechada.');
}, 2000);