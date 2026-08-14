// scripts/adicionar-intervalo-minutos.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

function corrigirBanco(dbPath, nomeBanco) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔧 Corrigindo: ${nomeBanco}`);

        if (!fs.existsSync(dbPath)) {
            console.log(`   ⚠️ Banco não existe: ${dbPath}`);
            resolve();
            return;
        }

        const db = new sqlite3.Database(dbPath);

        db.exec(`ALTER TABLE horarios_funcionamento ADD COLUMN intervalo_minutos INTEGER DEFAULT 30;`, (err) => {
            if (err) {
                if (err.message.includes('duplicate column name')) {
                    console.log(`   ✅ Coluna já existe`);
                } else {
                    console.log(`   ⚠️ Erro: ${err.message}`);
                }
            } else {
                console.log(`   ✅ Coluna intervalo_minutos adicionada`);
            }
            db.close();
            resolve();
        });
    });
}

async function main() {
    console.log('🚀 ADICIONANDO COLUNA intervalo_minutos...\n');

    const bancos = [
        { path: path.join(__dirname, '../database/barbearia.db'), nome: 'barbearia.db' },
        { path: path.join(__dirname, '../database/empresa_5.db'), nome: 'empresa_5.db' },
        { path: path.join(__dirname, '../database/empresa_14.db'), nome: 'empresa_14.db' }
    ];

    for (const banco of bancos) {
        await corrigirBanco(banco.path, banco.nome);
    }

    console.log('\n✅ CORREÇÃO CONCLUÍDA!');
    console.log('📝 Reinicie o servidor: npm start');
}

main().catch(console.error);