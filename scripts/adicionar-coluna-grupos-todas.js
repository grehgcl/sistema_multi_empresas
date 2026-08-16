// ============================================
// SCRIPT: adicionar-coluna-grupos-todas.js
// Executar: node adicionar-coluna-grupos-todas.js
// ============================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

console.log('🔧 ADICIONANDO COLUNA grupos EM TODAS AS EMPRESAS...');

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

console.log(`📊 ${empresas.length} empresas encontradas`);

for (const empresaId of empresas) {
    const dbPath = path.join(dbDir, `empresa_${empresaId}.db`);
    console.log(`\n🔧 Empresa ${empresaId}...`);

    const db = new sqlite3.Database(dbPath);

    // Adicionar coluna grupos na tabela clientes
    db.run(`ALTER TABLE clientes ADD COLUMN grupos TEXT DEFAULT '[]'`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log(`   ℹ️ grupos já existe`);
            } else {
                console.log(`   ❌ Erro: ${err.message}`);
            }
        } else {
            console.log(`   ✅ grupos adicionada`);
        }
        db.close();
    });
}

console.log('\n✅ COLUNA grupos ADICIONADA EM TODAS AS EMPRESAS!');