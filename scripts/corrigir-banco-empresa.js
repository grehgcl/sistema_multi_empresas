// scripts/corrigir-banco-empresa.js
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../server/routes');

const files = [
    'agendamentos.routes.js',
    'clientes.routes.js',
    'profissionais.routes.js',
    'servicos.routes.js',
    'horarios.routes.js',
    'despesas.routes.js',
    'financeiro.routes.js'
];

console.log('🔧 FORÇANDO USO DO BANCO DA EMPRESA...\n');

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${file} não encontrado`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Verificar import
    if (content.includes("const { db } = require('../config/database')") &&
        !content.includes('getEmpresaDb')) {
        content = content.replace(
            "const { db } = require('../config/database')",
            "const { db, getEmpresaDb } = require('../config/database')"
        );
        modified = true;
        console.log(`✅ ${file}: Import corrigido`);
    }

    // 2. Adicionar empresaDb se não existir
    if (!content.includes('const empresaDb = getEmpresaDb(empresaId)') &&
        !content.includes('const empresaDb = getEmpresaDb(empresaId);')) {

        // Procurar onde adicionar
        if (content.includes('const empresaId = req.usuario.empresa_id;')) {
            content = content.replace(
                /(const\s+empresaId\s*=\s*req\.usuario\.empresa_id;)/g,
                '$1\n    const empresaDb = getEmpresaDb(empresaId);'
            );
            modified = true;
            console.log(`✅ ${file}: empresaDb adicionado`);
        } else {
            // Adicionar no início da rota
            content = content.replace(
                /(router\.(get|post|put|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*auth\s*,\s*\(req,\s*res\)\s*=>\s*\{)/g,
                '$1\n    const empresaId = req.usuario.empresa_id;\n    const empresaDb = getEmpresaDb(empresaId);'
            );
            modified = true;
            console.log(`✅ ${file}: empresaId e empresaDb adicionados`);
        }
    }

    // 3. Substituir db.xxx por empresaDb.xxx (apenas em queries com empresa_id)
    const lines = content.split('\n');
    let newLines = [];
    let count = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        // Verificar se é uma query que deve usar empresaDb
        if (line.includes('db.all(') && (line.includes('empresa_id') || (i + 1 < lines.length && lines[i + 1].includes('empresa_id')))) {
            line = line.replace('db.all(', 'empresaDb.all(');
            count++;
        }
        if (line.includes('db.get(') && (line.includes('empresa_id') || (i + 1 < lines.length && lines[i + 1].includes('empresa_id')))) {
            line = line.replace('db.get(', 'empresaDb.get(');
            count++;
        }
        if (line.includes('db.run(') && (line.includes('empresa_id') || (i + 1 < lines.length && lines[i + 1].includes('empresa_id')))) {
            line = line.replace('db.run(', 'empresaDb.run(');
            count++;
        }
        newLines.push(line);
    }

    if (count > 0) {
        content = newLines.join('\n');
        modified = true;
        console.log(`✅ ${file}: ${count} substituições db -> empresaDb`);
    }

    // Salvar
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`💾 ${file}: SALVO!\n`);
    } else {
        console.log(`⏭️ ${file}: Nada para corrigir\n`);
    }
});

console.log('\n✅ CORRIGIDO!');
console.log('📝 Reinicie o servidor: npm start');