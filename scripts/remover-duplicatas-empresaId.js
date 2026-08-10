// scripts/remover-duplicatas-empresaId.js
const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '../server/routes');

const files = [
    'agendamentos.routes.js',
    'profissionais.routes.js',
    'servicos.routes.js',
    'horarios.routes.js',
    'clientes.routes.js',
    'despesas.routes.js',
    'financeiro.routes.js',
    'empresas.routes.js',
    'whatsapp.routes.js',
    'admin.routes.js'
];

console.log('🔧 Removendo duplicatas de empresaId...\n');

files.forEach(file => {
    const filePath = path.join(routesDir, file);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Arquivo não encontrado: ${file}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Verificar se tem empresaId duplicado
    const lines = content.split('\n');
    const newLines = [];
    let found = false;
    let removed = 0;

    for (const line of lines) {
        if (line.includes('const empresaId = req.usuario.empresa_id;')) {
            if (!found) {
                newLines.push(line);
                found = true;
            } else {
                removed++;
                modified = true;
            }
        } else {
            newLines.push(line);
        }
    }

    if (modified) {
        content = newLines.join('\n');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${file}: Removidas ${removed} duplicatas`);
    } else {
        console.log(`⏭️ ${file}: Nenhuma duplicata encontrada`);
    }
});

console.log('\n✅ DUPLICATAS REMOVIDAS!');
console.log('📝 Agora rode: node scripts/corrigir-rotas-final.js');