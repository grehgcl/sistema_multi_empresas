// ============================================
// SCRIPT: criar-tabela-agendamentos-faltantes.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔧 Criando tabela agendamentos para empresas faltantes...');

const dbDir = path.join(__dirname, 'database');

// Empresas que não têm a tabela agendamentos
const empresasFaltantes = [3, 4, 6, 7];

for (const empresaId of empresasFaltantes) {
    const dbPath = path.join(dbDir, `empresa_${empresaId}.db`);

    if (!fs.existsSync(dbPath)) {
        console.log(`⚠️ Banco da empresa ${empresaId} não existe, pulando...`);
        continue;
    }

    console.log(`\n🔧 Processando empresa ${empresaId}...`);

    const db = new sqlite3.Database(dbPath);

    // Criar tabela agendamentos com todas as colunas
    db.run(`
        CREATE TABLE IF NOT EXISTS agendamentos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            data TEXT,
            hora TEXT,
            servico_id INTEGER,
            servico TEXT,
            valor REAL DEFAULT 0,
            duracao INTEGER DEFAULT 30,
            status TEXT DEFAULT 'pendente',
            comissao REAL DEFAULT 0,
            empresa_id INTEGER,
            profissional_id INTEGER,
            lembrete_enviado INTEGER DEFAULT 0,
            valor_total REAL DEFAULT 0,
            servicos_extras TEXT DEFAULT '[]',
            valor_extras REAL DEFAULT 0,
            forma_pagamento TEXT,
            prazo_dias INTEGER,
            data_vencimento TEXT,
            descricao_pagamento TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (servico_id) REFERENCES servicos(id),
            FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
        )
    `, (err) => {
        if (err) {
            console.error(`❌ Erro ao criar tabela empresa ${empresaId}:`, err.message);
        } else {
            console.log(`   ✅ Tabela agendamentos criada empresa ${empresaId}`);
        }
        db.close();
    });
}

console.log('\n✅ Todas as empresas atualizadas!');