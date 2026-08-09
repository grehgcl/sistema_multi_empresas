// scripts/migrar-pagamento.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database', 'barbearia.db');
const db = new sqlite3.Database(dbPath);

console.log('📦 Iniciando migração de pagamento...');

// Adicionar colunas na tabela agendamentos
const colunas = [
    { nome: 'forma_pagamento', sql: "ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT DEFAULT 'dinheiro'" },
    { nome: 'prazo_dias', sql: "ALTER TABLE agendamentos ADD COLUMN prazo_dias INTEGER DEFAULT 0" },
    { nome: 'data_vencimento', sql: "ALTER TABLE agendamentos ADD COLUMN data_vencimento DATE" },
    { nome: 'lembrete_enviado_2dias', sql: "ALTER TABLE agendamentos ADD COLUMN lembrete_enviado_2dias INTEGER DEFAULT 0" },
    { nome: 'lembrete_enviado_1dia', sql: "ALTER TABLE agendamentos ADD COLUMN lembrete_enviado_1dia INTEGER DEFAULT 0" },
    { nome: 'lembrete_enviado_dia', sql: "ALTER TABLE agendamentos ADD COLUMN lembrete_enviado_dia INTEGER DEFAULT 0" },
    { nome: 'descricao_pagamento', sql: "ALTER TABLE agendamentos ADD COLUMN descricao_pagamento TEXT" }
];

let colunasProcessadas = 0;

colunas.forEach((coluna) => {
    db.run(coluna.sql, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`⚠️ Coluna ${coluna.nome} já existe`);
            } else {
                console.log(`❌ Erro ao adicionar ${coluna.nome}:`, err.message);
            }
        } else {
            console.log(`✅ Coluna ${coluna.nome} adicionada`);
        }
        colunasProcessadas++;

        if (colunasProcessadas === colunas.length) {
            // Criar tabela de lembretes
            db.run(`
                CREATE TABLE IF NOT EXISTS lembretes_pagamento (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agendamento_id INTEGER NOT NULL,
                    empresa_id INTEGER NOT NULL,
                    data_vencimento DATE NOT NULL,
                    lembrete_2dias DATE,
                    lembrete_1dia DATE,
                    lembrete_dia DATE,
                    enviado_2dias INTEGER DEFAULT 0,
                    enviado_1dia INTEGER DEFAULT 0,
                    enviado_dia INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
                    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
                )
            `, (err) => {
                if (err) {
                    console.log('❌ Erro ao criar tabela lembretes_pagamento:', err.message);
                } else {
                    console.log('✅ Tabela lembretes_pagamento criada/verificada');
                }
                db.close();
                console.log('✅ Migração concluída!');
            });
        }
    });
});