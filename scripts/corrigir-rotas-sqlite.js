// scripts/corrigir-rotas-sqlite.js
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../server/routes');

// Lista de arquivos de rota que precisam ser corrigidos
const routeFiles = [
    'agendamentos.routes.js',
    'profissionais.routes.js',
    'servicos.routes.js',
    'horarios.routes.js',
    'clientes.routes.js',
    'despesas.routes.js',
    'financeiro.routes.js'
];

console.log('🔧 Corrigindo rotas para usar SQLite por empresa...\n');

routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Adicionar getEmpresaDb na importação
    if (content.includes("const { db } = require('../config/database')") &&
        !content.includes('getEmpresaDb')) {
        content = content.replace(
            "const { db } = require('../config/database')",
            "const { db, getEmpresaDb } = require('../config/database')"
        );
        modified = true;
        console.log(`✅ ${file}: Adicionado getEmpresaDb`);
    }

    // 2. Adicionar empresaDb = getEmpresaDb(empresaId)
    if (content.includes('const empresaId = req.usuario.empresa_id;') &&
        !content.includes('const empresaDb = getEmpresaDb')) {
        content = content.replace(
            /(const\s+empresaId\s*=\s*req\.usuario\.empresa_id;)/g,
            '$1\n    const empresaDb = getEmpresaDb(empresaId);'
        );
        modified = true;
        console.log(`✅ ${file}: Adicionado empresaDb`);
    }

    // 3. Substituir SQL PostgreSQL por SQLite
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
        console.log(`✅ ${file}: SQL convertido para SQLite`);
        modified = true;
    }

    // Salvar se houve modificações
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`💾 ${file}: Salvo!\n`);
    } else {
        console.log(`⏭️ ${file}: Nenhuma modificação necessária\n`);
    }
});

console.log('✅ TODAS AS ROTAS CORRIGIDAS!');
console.log('\n📝 Agora reinicie o servidor: npm start');