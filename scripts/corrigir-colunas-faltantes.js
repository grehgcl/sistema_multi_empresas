// scripts/corrigir-colunas-faltantes.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

function corrigirBanco(dbPath) {
    return new Promise((resolve) => {
        console.log(`🔧 Corrigindo: ${path.basename(dbPath)}`);
        const db = new sqlite3.Database(dbPath);

        db.exec(`
            -- horarios_funcionamento
            ALTER TABLE horarios_funcionamento ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE horarios_funcionamento ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
            
            -- despesas
            ALTER TABLE despesas ADD COLUMN anexo TEXT;
            ALTER TABLE despesas ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE despesas ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
        `, (err) => {
            if (err) {
                // Se der erro, pode ser que as colunas já existam
                if (err.message.includes('duplicate column name')) {
                    console.log(`   ⚠️ Colunas já existem`);
                } else {
                    console.log(`   ❌ Erro: ${err.message}`);
                }
            } else {
                console.log(`   ✅ Colunas adicionadas`);
            }
            db.close();
            resolve();
        });
    });
}

async function main() {
    console.log('🚀 CORRIGINDO COLUNAS FALTANTES...\n');

    const databaseDir = path.join(__dirname, '../database');

    // 1. Corrigir banco principal
    await corrigirBanco(path.join(databaseDir, 'barbearia.db'));

    // 2. Corrigir bancos das empresas
    const files = fs.readdirSync(databaseDir).filter(f => f.startsWith('empresa_') && f.endsWith('.db'));
    console.log(`\n📋 ${files.length} bancos de empresa encontrados\n`);

    for (const file of files) {
        await corrigirBanco(path.join(databaseDir, file));
    }

    console.log('\n✅ CORREÇÃO CONCLUÍDA!');
    console.log('📝 Rode novamente: node scripts/migrar-para-sqlite-por-empresa.js');
}

main().catch(console.error);