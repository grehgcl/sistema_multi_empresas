const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO ROTA DE DESPESAS - FINAL...');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Encontrar a rota GET /api/despesas e substituir completamente
// Vamos usar uma abordagem mais simples: substituir a função inteira

const search = /app\.get\('\/api\/despesas', auth, \(req, res\) => \{[\s\S]*?db\.all\(sql, params, \(err, despesas\) => \{[\s\S]*?\}\);/;

// Como a substituição é complexa, vamos fazer correções pontuais

// 1. Corrigir o WHERE para usar $1 e não ter substituição automática
content = content.replace(
    /WHERE d\.empresa_id = \?/g,
    'WHERE d.empresa_id = $1'
);

// 2. Remover a conversão automática de placeholders
content = content.replace(
    /if \(isProduction\) \{\s*sql = sql\.replace\(\\\/\\\?\\\/g, \(match, offset\) => \{\s*return `\$\$\{params\.indexOf\(match\) \+ 1\}`;\s*\}\);\s*\}/g,
    ''
);

// 3. Garantir que os placeholders sejam números
content = content.replace(
    /\$\{params\.length \+ 1\}/g,
    (match) => {
        return `\${counter++}`;
    }
);

// 4. Adicionar contador
content = content.replace(
    /if \(isProduction\) \{\s*\/\/ PostgreSQL/g,
    `if (isProduction) {
        // PostgreSQL
        let counter = 2;`
);

fs.writeFileSync(serverPath, content);
console.log('✅ Correções aplicadas!');
console.log('📝 Reinicie o servidor: Ctrl+C e depois node -r dotenv/config server.js dotenv_config_path=.env.local');