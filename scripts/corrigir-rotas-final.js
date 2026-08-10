// scripts/corrigir-rotas-final.js
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../server/routes');

// Lista de arquivos de rota
const routeFiles = [
    'agendamentos.routes.js',
    'profissionais.routes.js',
    'servicos.routes.js',
    'horarios.routes.js',
    'clientes.routes.js',
    'despesas.routes.js',
    'financeiro.routes.js',
    'empresas.routes.js'
];

console.log('🔧 CORRIGINDO ROTAS PARA SQLITE POR EMPRESA...\n');

routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    console.log(`\n📝 Processando: ${file}`);

    // ============================================
    // 1. CORRIGIR IMPORTS
    // ============================================

    // Adicionar getEmpresaDb na importação
    if (content.includes("const { db } = require('../config/database')") &&
        !content.includes('getEmpresaDb')) {
        content = content.replace(
            "const { db } = require('../config/database')",
            "const { db, getEmpresaDb } = require('../config/database')"
        );
        modified = true;
        console.log(`  ✅ getEmpresaDb adicionado ao import`);
    }

    // ============================================
    // 2. ADICIONAR empresaDb (sem duplicar empresaId)
    // ============================================

    // Verificar se tem empresaDb
    if (!content.includes('const empresaDb = getEmpresaDb')) {
        // Verificar se já tem empresaId
        if (content.includes('const empresaId = req.usuario.empresa_id')) {
            // Já tem empresaId, só adicionar empresaDb
            content = content.replace(
                /(const\s+empresaId\s*=\s*req\.usuario\.empresa_id;)/g,
                '$1\n    const empresaDb = getEmpresaDb(empresaId);'
            );
            modified = true;
            console.log(`  ✅ empresaDb adicionado (empresaId já existia)`);
        } else {
            // Adicionar ambos
            content = content.replace(
                /(router\.(get|post|put|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*auth\s*,\s*\(req,\s*res\)\s*=>\s*\{)/g,
                '$1\n    const empresaId = req.usuario.empresa_id;\n    const empresaDb = getEmpresaDb(empresaId);'
            );
            modified = true;
            console.log(`  ✅ empresaId e empresaDb adicionados`);
        }
    }

    // ============================================
    // 3. SUBSTITUIR db.xxx POR empresaDb.xxx
    // ============================================

    let countAll = 0, countGet = 0, countRun = 0;

    // Substituir db.all por empresaDb.all
    if (content.includes('db.all(')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('db.all(') &&
                (lines[i].includes('empresa_id') || (i + 1 < lines.length && lines[i + 1].includes('empresa_id')))) {
                lines[i] = lines[i].replace('db.all(', 'empresaDb.all(');
                countAll++;
            }
        }
        if (countAll > 0) {
            content = lines.join('\n');
            modified = true;
            console.log(`  ✅ ${countAll} db.all substituídos`);
        }
    }

    // Substituir db.get por empresaDb.get
    if (content.includes('db.get(')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('db.get(') &&
                (lines[i].includes('empresa_id') || (i + 1 < lines.length && lines[i + 1].includes('empresa_id')))) {
                lines[i] = lines[i].replace('db.get(', 'empresaDb.get(');
                countGet++;
            }
        }
        if (countGet > 0) {
            content = lines.join('\n');
            modified = true;
            console.log(`  ✅ ${countGet} db.get substituídos`);
        }
    }

    // Substituir db.run por empresaDb.run
    if (content.includes('db.run(')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('db.run(') &&
                (lines[i].includes('empresa_id') || (i + 1 < lines.length && lines[i + 1].includes('empresa_id')))) {
                lines[i] = lines[i].replace('db.run(', 'empresaDb.run(');
                countRun++;
            }
        }
        if (countRun > 0) {
            content = lines.join('\n');
            modified = true;
            console.log(`  ✅ ${countRun} db.run substituídos`);
        }
    }

    // ============================================
    // 4. CORRIGIR SQL POSTGRESQL -> SQLITE
    // ============================================

    const sqlReplacements = [
        { from: /TO_CHAR\(([^,]+),\s*['"]YYYY-MM-DD['"]\)/g, to: 'date($1)' },
        { from: /TO_CHAR\(([^,]+),\s*['"]YYYY-MM['"]\)/g, to: "strftime('%Y-%m', $1)" },
        { from: /EXTRACT\s*\(\s*MONTH\s+FROM\s+([^)]+)\)/gi, to: "strftime('%m', $1)" },
        { from: /EXTRACT\s*\(\s*YEAR\s+FROM\s+([^)]+)\)/gi, to: "strftime('%Y', $1)" },
        { from: /EXTRACT\s*\(\s*DAY\s+FROM\s+([^)]+)\)/gi, to: "strftime('%d', $1)" },
        { from: /COALESCE\s*\(/g, to: 'IFNULL(' },
        { from: /\$(\d+)/g, to: '?' }
    ];

    let sqlModified = false;
    sqlReplacements.forEach(({ from, to }) => {
        if (content.match(from)) {
            content = content.replace(from, to);
            sqlModified = true;
        }
    });

    if (sqlModified) {
        console.log(`  ✅ SQL convertido para SQLite`);
        modified = true;
    }

    // ============================================
    // 5. REMOVER empresaId DUPLICADO
    // ============================================

    // Verificar se tem empresaId duplicado
    const empresaIdMatches = content.match(/const\s+empresaId\s*=\s*req\.usuario\.empresa_id;/g);
    if (empresaIdMatches && empresaIdMatches.length > 1) {
        // Remover duplicatas, manter apenas a primeira
        let first = true;
        const lines = content.split('\n');
        const newLines = [];
        for (const line of lines) {
            if (line.includes('const empresaId = req.usuario.empresa_id;')) {
                if (first) {
                    newLines.push(line);
                    first = false;
                }
                // Pular duplicatas
            } else {
                newLines.push(line);
            }
        }
        content = newLines.join('\n');
        modified = true;
        console.log(`  ✅ Removidas ${empresaIdMatches.length - 1} duplicatas de empresaId`);
    }

    // ============================================
    // 6. SALVAR
    // ============================================

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  💾 ${file} SALVO!`);
    } else {
        console.log(`  ⏭️ Nenhuma modificação necessária`);
    }
});

console.log('\n✅ TODAS AS ROTAS CORRIGIDAS!');
console.log('\n📝 Agora reinicie o servidor: npm start');