// ============================================
// SCRIPT: adicionar-colunas-pagamento-agendamentos.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔧 Adicionando colunas de pagamento na tabela agendamentos...');

const dbDir = path.join(__dirname, 'database');

// Listar todas as empresas
const files = fs.readdirSync(dbDir);
const empresas = [];

for (const file of files) {
    if (file.startsWith('empresa_') && file.endsWith('.db')) {
        const id = parseInt(file.replace('empresa_', '').replace('.db', ''));
        empresas.push(id);
    }
}

console.log(`📊 Empresas encontradas: ${empresas.length}`);

for (const empresaId of empresas) {
    const dbPath = path.join(dbDir, `empresa_${empresaId}.db`);
    console.log(`\n🔧 Processando empresa ${empresaId}...`);

    const db = new sqlite3.Database(dbPath);

    // 1. Adicionar coluna forma_pagamento (se não existir)
    db.run(`ALTER TABLE agendamentos ADD COLUMN forma_pagamento TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`   ℹ️ forma_pagamento já existe`);
            } else {
                console.log(`   ⚠️ Erro ao adicionar forma_pagamento:`, err.message);
            }
        } else {
            console.log(`   ✅ forma_pagamento adicionada`);
        }
    });

    // 2. Adicionar coluna prazo_dias (se não existir)
    db.run(`ALTER TABLE agendamentos ADD COLUMN prazo_dias INTEGER`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`   ℹ️ prazo_dias já existe`);
            } else {
                console.log(`   ⚠️ Erro ao adicionar prazo_dias:`, err.message);
            }
        } else {
            console.log(`   ✅ prazo_dias adicionada`);
        }
    });

    // 3. Adicionar coluna data_vencimento (se não existir)
    db.run(`ALTER TABLE agendamentos ADD COLUMN data_vencimento TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`   ℹ️ data_vencimento já existe`);
            } else {
                console.log(`   ⚠️ Erro ao adicionar data_vencimento:`, err.message);
            }
        } else {
            console.log(`   ✅ data_vencimento adicionada`);
        }
    });

    // 4. Adicionar coluna descricao_pagamento (se não existir)
    db.run(`ALTER TABLE agendamentos ADD COLUMN descricao_pagamento TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`   ℹ️ descricao_pagamento já existe`);
            } else {
                console.log(`   ⚠️ Erro ao adicionar descricao_pagamento:`, err.message);
            }
        } else {
            console.log(`   ✅ descricao_pagamento adicionada`);
        }
    });

    db.close(() => {
        console.log(`   ✅ Banco empresa ${empresaId} fechado`);
    });
}

console.log('\n✅ Todas as empresas atualizadas!');