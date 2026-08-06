const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/barbearia.db');
const db = new sqlite3.Database(dbPath);

const migrations = `
-- Criar tabela de despesas
CREATE TABLE IF NOT EXISTS despesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data DATE NOT NULL,
    data_vencimento DATE,
    pago BOOLEAN DEFAULT 0,
    forma_pagamento TEXT,
    observacao TEXT,
    anexo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_despesas_empresa ON despesas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_despesas_data ON despesas(data);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON despesas(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_pago ON despesas(pago);
`;

db.exec(migrations, (err) => {
    if (err) {
        console.error('❌ Erro na migração:', err.message);
    } else {
        console.log('✅ Tabela despesas criada com sucesso!');
        console.log('✅ Índices criados com sucesso!');
    }
    db.close();
});