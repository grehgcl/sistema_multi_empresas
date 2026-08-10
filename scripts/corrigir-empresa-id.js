// scripts/corrigir-empresa-id.js
const fs = require('fs');
const path = require('path');

const files = [
    'empresas.routes.js',
    'despesas.routes.js',
    'servicos.routes.js',
    'agendamentos.routes.js',
    'clientes.routes.js',
    'profissionais.routes.js',
    'horarios.routes.js'
];

const routesDir = path.join(__dirname, '../server/routes');

console.log('🔧 Corrigindo empresaId e empresaDb...\n');

files.forEach(file => {
    const filePath = path.join(routesDir, file);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Verificar se tem empresaId declarado
    const hasEmpresaId = content.includes('const empresaId = req.usuario.empresa_id;');

    // Verificar se tem empresaDb
    const hasEmpresaDb = content.includes('const empresaDb = getEmpresaDb(empresaId);');

    // Se não tem empresaId, adicionar
    if (!hasEmpresaId && !content.includes('router.get') && !content.includes('router.post')) {
        // Adicionar após o auth
        content = content.replace(
            /(router\.(get|post|put|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*auth\s*,\s*\(req,\s*res\)\s*=>\s*\{)/g,
            '$1\n    const empresaId = req.usuario.empresa_id;\n    const empresaDb = getEmpresaDb(empresaId);'
        );
        modified = true;
        console.log(`✅ ${file}: Adicionado empresaId e empresaDb`);
    }

    // Se tem empresaId mas não tem empresaDb
    if (hasEmpresaId && !hasEmpresaDb) {
        content = content.replace(
            /(const\s+empresaId\s*=\s*req\.usuario\.empresa_id;)/g,
            '$1\n    const empresaDb = getEmpresaDb(empresaId);'
        );
        modified = true;
        console.log(`✅ ${file}: Adicionado empresaDb`);
    }

    // Substituir db.all por empresaDb.all
    if (content.includes('db.all(') && content.includes('empresaDb')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('db.all(') &&
                (lines[i].includes('empresa_id') || lines[i + 1]?.includes('empresa_id'))) {
                lines[i] = lines[i].replace('db.all(', 'empresaDb.all(');
            }
        }
        content = lines.join('\n');
        modified = true;
        console.log(`✅ ${file}: Substituído db.all por empresaDb.all`);
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`💾 ${file}: SALVO!\n`);
    } else {
        console.log(`⏭️ ${file}: Nenhuma modificação\n`);
    }
});

console.log('✅ CORRIGIDO! Reinicie o servidor: npm start');