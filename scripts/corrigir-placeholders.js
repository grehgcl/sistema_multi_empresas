const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO PLACEHOLDERS POSTGRESQL...');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Corrigir a substituição de placeholders
// Procurar pelo padrão antigo
const oldPattern = /sql = sql\.replace\(\\\/\\\?\\\/g, \(match, offset\) => \{\s*return `\$\$\{params\.indexOf\(match\) \+ 1\}`;\s*\}\);/g;

if (oldPattern.test(content)) {
    content = content.replace(oldPattern, `sql = sql.replace(/\\?/g, () => {
        let counter = 1;
        return \`\$\${counter++}\`;
    });`);
    console.log('✅ Padrão antigo corrigido!');
} else {
    console.log('⚠️ Padrão antigo não encontrado, tentando outra abordagem...');

    // Tentar encontrar e corrigir manualmente
    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('params.indexOf(match) + 1')) {
            console.log(`📝 Encontrado na linha ${i + 1}: ${lines[i].trim()}`);
            lines[i] = lines[i].replace(
                /return `\$\$\{params\.indexOf\(match\) \+ 1\}`/,
                `let counter = 1; return \`\$\${counter++}\``
            );
            // Ajustar a linha para usar counter
            modified = true;
            console.log('✅ Linha corrigida!');
        }
    }

    if (modified) {
        content = lines.join('\n');
    } else {
        // Procurar por outra variação
        const search = /sql\.replace\(\\\/\\\?\\\/g, \(match, offset\) => \{\s*return `\$\${\w+\.indexOf\(match\) \+\s*\d+}`;\s*\}\)/g;
        if (search.test(content)) {
            content = content.replace(search, `sql.replace(/\\?/g, () => {
                let counter = 1;
                return \`\$\${counter++}\`;
            })`);
            console.log('✅ Variação corrigida!');
        } else {
            console.log('⚠️ Nenhum padrão encontrado. Verifique manualmente.');
        }
    }
}

fs.writeFileSync(serverPath, content);
console.log('📝 Arquivo salvo!');
console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('1. git add server.js');
console.log('2. git commit -m "fix: corrigir placeholders PostgreSQL"');
console.log('3. git push origin main');