// verificar-bancos.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database('database/barbearia.db');

db.all('SELECT id, nome FROM empresas', (err, empresas) => {
    if (err) {
        console.error('❌ Erro:', err);
        db.close();
        return;
    }

    console.log(`📋 Total de empresas: ${empresas.length}\n`);
    console.log('🔍 Verificando bancos individuais...\n');

    let semBanco = [];
    let comBanco = [];

    for (const empresa of empresas) {
        const dbPath = path.join(__dirname, 'database', `empresa_${empresa.id}.db`);
        if (fs.existsSync(dbPath)) {
            comBanco.push({ id: empresa.id, nome: empresa.nome });
        } else {
            semBanco.push({ id: empresa.id, nome: empresa.nome });
        }
    }

    console.log(`✅ Empresas COM banco (${comBanco.length}):`);
    comBanco.forEach(e => console.log(`   ${e.id} - ${e.nome}`));

    console.log(`\n❌ Empresas SEM banco (${semBanco.length}):`);
    semBanco.forEach(e => console.log(`   ${e.id} - ${e.nome}`));

    db.close();
});