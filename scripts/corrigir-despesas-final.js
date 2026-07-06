const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO ROTA DE DESPESAS...');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Encontrar a rota GET /api/despesas e substituir completamente
// Como é complexo, vamos fazer uma correção específica

// 1. Corrigir a inicialização dos parâmetros
content = content.replace(
    /let params = \[empresaId\];/g,
    'let params = [];'
);

// 2. Corrigir o WHERE para usar $1
content = content.replace(
    /WHERE d\.empresa_id = \?/g,
    'WHERE d.empresa_id = $1'
);

// 3. Remover a substituição automática de placeholders
content = content.replace(
    /if \(isProduction\) \{\s*sql = sql\.replace\(\\\/\\\?\\\/g, \(match, offset\) => \{\s*return `\$\$\{params\.indexOf\(match\) \+ 1\}`;\s*\}\);\s*\}/g,
    ''
);

// 4. Adicionar params.push(empresaId) depois de definir params
content = content.replace(
    /let params = \[\];/g,
    `let params = [];
    params.push(empresaId);`
);

fs.writeFileSync(serverPath, content);
console.log('✅ Correções aplicadas!');
console.log('📝 Reinicie o servidor: Ctrl+C e depois node -r dotenv/config server.js dotenv_config_path=.env.local');