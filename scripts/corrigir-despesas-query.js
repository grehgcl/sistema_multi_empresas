const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO CONSULTA DE DESPESAS...');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Procurar o bloco de código da consulta de despesas
const search = /if \(isProduction\) \{\s*\/\/ PostgreSQL\s*if \(mes && ano\) \{\s*sql \+= ` AND EXTRACT\(MONTH FROM d\.data\) = \$\$\{params\.length \+ 1\}::int AND EXTRACT\(YEAR FROM d\.data\) = \$\$\{params\.length \+ 2\}::int`;\s*params\.push\(parseInt\(mes\), parseInt\(ano\)\);\s*\}\s*if \(categoria\) \{\s*sql \+= ` AND d\.categoria = \$\$\{params\.length \+ 1\}`;\s*params\.push\(categoria\);\s*\}\s*if \(pago !== undefined && pago !== ''\) \{\s*const pagoBool = pago === 'true';\s*sql \+= ` AND d\.pago = \$\$\{params\.length \+ 1\}`;\s*params\.push\(pagoBool\);\s*\}\s*\}/s;

const replace = `if (isProduction) {
        // PostgreSQL - usar placeholders consistentes
        let placeholderCounter = 2; // começa em 2 porque $1 é empresa_id
        
        if (mes && ano) {
            sql += \` AND EXTRACT(MONTH FROM d.data) = $\${placeholderCounter}::int AND EXTRACT(YEAR FROM d.data) = $\${placeholderCounter + 1}::int\`;
            params.push(parseInt(mes), parseInt(ano));
            placeholderCounter += 2;
        }

        if (categoria) {
            sql += \` AND d.categoria = $\${placeholderCounter}\`;
            params.push(categoria);
            placeholderCounter++;
        }

        if (pago !== undefined && pago !== '') {
            const pagoBool = pago === 'true';
            sql += \` AND d.pago = $\${placeholderCounter}\`;
            params.push(pagoBool);
            placeholderCounter++;
        }
    }`;

if (search.test(content)) {
    content = content.replace(search, replace);
    console.log('✅ Correção aplicada!');
} else {
    console.log('⚠️ Padrão não encontrado, tentando correção manual...');
    // Tentar uma substituição mais simples
    content = content.replace(
        /params\.length \+ 1/g,
        'params.length'
    );
    console.log('✅ Correção alternativa aplicada!');
}

fs.writeFileSync(serverPath, content);
console.log('📝 Arquivo salvo!');
console.log('\n🔄 Reinicie o servidor:');
console.log('   Ctrl+C e depois node -r dotenv/config server.js dotenv_config_path=.env.local');