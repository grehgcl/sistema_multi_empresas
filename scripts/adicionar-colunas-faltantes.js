// ============================================
// SCRIPT: adicionar-colunas-faltantes.js
// Executar: node adicionar-colunas-faltantes.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const empresaId = 14;
const dbPath = path.join(__dirname, `database/empresa_${empresaId}.db`);

console.log(`🔧 Adicionando colunas faltantes no banco da empresa ${empresaId}...`);

const db = new sqlite3.Database(dbPath);

// Adicionar coluna forma_pagamento na tabela agendamentos
db.run(`ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT`, (err) => {
    if (err) {
        console.log('⚠️ Coluna forma_pagamento já existe ou erro:', err.message);
    } else {
        console.log('✅ Coluna forma_pagamento adicionada');
    }
});

// Adicionar coluna grupos na tabela clientes
db.run(`ALTER TABLE clientes ADD COLUMN grupos TEXT`, (err) => {
    if (err) {
        console.log('⚠️ Coluna grupos já existe ou erro:', err.message);
    } else {
        console.log('✅ Coluna grupos adicionada');
    }
});

db.close(() => {
    console.log(`✅ Banco da empresa ${empresaId} atualizado!`);
});