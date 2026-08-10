// scripts/corrigir-tudo-definitivo.js
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../server/routes');

const files = [
    'empresas.routes.js',
    'agendamentos.routes.js',
    'clientes.routes.js',
    'profissionais.routes.js',
    'servicos.routes.js',
    'horarios.routes.js',
    'despesas.routes.js',
    'financeiro.routes.js'
];

console.log('🚀 CORRIGINDO TODAS AS ROTAS DEFINITIVAMENTE...\n');

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${file} não encontrado`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let changes = [];

    // 1. VERIFICAR IMPORT
    if (content.includes("const { db } = require('../config/database')") ||
        content.includes("const db = require('../config/database')")) {
        if (!content.includes('getEmpresaDb')) {
            content = content.replace(
                /const\s*{\s*db\s*}\s*=\s*require\(['"]\.\.\/config\/database['"]\)/g,
                "const { db, getEmpresaDb } = require('../config/database')"
            );
            content = content.replace(
                /const\s*db\s*=\s*require\(['"]\.\.\/config\/database['"]\)/g,
                "const { db, getEmpresaDb } = require('../config/database')"
            );
            modified = true;
            changes.push('Import corrigido');
        }
    }

    // 2. ADICIONAR empresaId e empresaDb (SE NÃO TIVER)
    if (!content.includes('const empresaDb = getEmpresaDb(')) {
        // Procurar padrão de rota
        const routeRegex = /(router\.(get|post|put|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*auth\s*,\s*\(req,\s*res\)\s*=>\s*\{)/g;

        if (content.match(routeRegex)) {
            content = content.replace(routeRegex, (match) => {
                // Verificar se já tem empresaId
                if (!content.includes('const empresaId = req.usuario.empresa_id;')) {
                    return match + '\n    const empresaId = req.usuario.empresa_id;\n    const empresaDb = getEmpresaDb(empresaId);';
                } else if (!content.includes('const empresaDb = getEmpresaDb')) {
                    return match + '\n    const empresaDb = getEmpresaDb(empresaId);';
                }
                return match;
            });
            modified = true;
            changes.push('empresaId/empresaDb adicionado');
        }
    }

    // 3. SUBSTITUIR db.xxx POR empresaDb.xxx (TODAS AS OCORRÊNCIAS)
    let count = 0;
    const lines = content.split('\n');
    const newLines = [];
    let inQuery = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Verificar se é uma query que usa empresa_id
        if (line.includes('db.all(') || line.includes('db.get(') || line.includes('db.run(')) {
            // Verificar se a query usa empresa_id (na mesma linha ou na próxima)
            let usesEmpresaId = line.includes('empresa_id');
            if (!usesEmpresaId && i + 1 < lines.length) {
                usesEmpresaId = lines[i + 1].includes('empresa_id');
            }
            if (!usesEmpresaId && i + 2 < lines.length) {
                usesEmpresaId = lines[i + 2].includes('empresa_id');
            }

            if (usesEmpresaId) {
                line = line.replace(/db\.all\(/g, 'empresaDb.all(');
                line = line.replace(/db\.get\(/g, 'empresaDb.get(');
                line = line.replace(/db\.run\(/g, 'empresaDb.run(');
                count++;
            }
        }
        newLines.push(line);
    }

    if (count > 0) {
        content = newLines.join('\n');
        modified = true;
        changes.push(`${count} queries substituídas para empresaDb`);
    }

    // 4. CORRIGIR EMPRESAID DUPLICADO
    const empresaIdMatches = content.match(/const\s+empresaId\s*=\s*req\.usuario\.empresa_id;/g);
    if (empresaIdMatches && empresaIdMatches.length > 1) {
        let first = true;
        const lines2 = content.split('\n');
        const newLines2 = [];
        for (const line of lines2) {
            if (line.includes('const empresaId = req.usuario.empresa_id;')) {
                if (first) {
                    newLines2.push(line);
                    first = false;
                }
            } else {
                newLines2.push(line);
            }
        }
        content = newLines2.join('\n');
        modified = true;
        changes.push(`Removidas ${empresaIdMatches.length - 1} duplicatas de empresaId`);
    }

    // 5. CORRIGIR EMPRESADB DUPLICADO
    const empresaDbMatches = content.match(/const\s+empresaDb\s*=\s*getEmpresaDb\(empresaId\);/g);
    if (empresaDbMatches && empresaDbMatches.length > 1) {
        let first = true;
        const lines2 = content.split('\n');
        const newLines2 = [];
        for (const line of lines2) {
            if (line.includes('const empresaDb = getEmpresaDb(empresaId);')) {
                if (first) {
                    newLines2.push(line);
                    first = false;
                }
            } else {
                newLines2.push(line);
            }
        }
        content = newLines2.join('\n');
        modified = true;
        changes.push(`Removidas ${empresaDbMatches.length - 1} duplicatas de empresaDb`);
    }

    // SALVAR
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${file}:`);
        changes.forEach(c => console.log(`   - ${c}`));
        console.log(`   💾 SALVO!\n`);
    } else {
        console.log(`⏭️ ${file}: Nada para corrigir\n`);
    }
});

console.log('\n🎉 TODOS OS ARQUIVOS CORRIGIDOS!');
console.log('📝 Reinicie o servidor: npm start');