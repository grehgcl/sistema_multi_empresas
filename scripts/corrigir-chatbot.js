// scripts/corrigir-chatbot.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/routes/chatbot.routes.js');

if (!fs.existsSync(filePath)) {
    console.log('❌ Arquivo chatbot.routes.js não encontrado');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let modified = false;

// 1. Adicionar getEmpresaDb no import
if (content.includes("const { db } = require('../config/database')") &&
    !content.includes('getEmpresaDb')) {
    content = content.replace(
        "const { db } = require('../config/database')",
        "const { db, getEmpresaDb } = require('../config/database')"
    );
    modified = true;
    console.log('✅ getEmpresaDb adicionado ao import');
}

// 2. Adicionar empresaDb nas rotas
if (content.includes('const empresaId = req.usuario.empresa_id;') &&
    !content.includes('const empresaDb = getEmpresaDb')) {
    content = content.replace(
        /(const\s+empresaId\s*=\s*req\.usuario\.empresa_id;)/g,
        '$1\n    const empresaDb = getEmpresaDb(empresaId);'
    );
    modified = true;
    console.log('✅ empresaDb adicionado');
}

// 3. Substituir db.xxx por empresaDb.xxx
if (content.includes('db.all(') && content.includes('empresaDb')) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('db.all(') &&
            (lines[i].includes('horarios_funcionamento') || lines[i].includes('empresa_id'))) {
            lines[i] = lines[i].replace('db.all(', 'empresaDb.all(');
        }
        if (lines[i].includes('db.get(') &&
            (lines[i].includes('horarios_funcionamento') || lines[i].includes('empresa_id'))) {
            lines[i] = lines[i].replace('db.get(', 'empresaDb.get(');
        }
    }
    content = lines.join('\n');
    modified = true;
    console.log('✅ db substituído por empresaDb');
}

if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ chatbot.routes.js corrigido!');
} else {
    console.log('⚠️ Nenhuma modificação necessária');
}