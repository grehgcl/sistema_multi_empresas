const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

console.log('🔧 CORRIGINDO COALESCE PARA BOOLEANOS...');

// Correção 1: COALESCE(bloqueado_chatbot, 0) → COALESCE(bloqueado_chatbot, false) para PostgreSQL
content = content.replace(
    /COALESCE\(bloqueado_chatbot, 0\) as bloqueado_chatbot/g,
    'COALESCE(bloqueado_chatbot, false) as bloqueado_chatbot'
);

// Correção 2: COALESCE(bloqueado_chatbot, 0) no chatbot (com placeholders diferentes)
// Vamos fazer uma substituição mais segura para PostgreSQL
const lines = content.split('\n');
const newLines = [];

for (let line of lines) {
    // Se for uma linha com COALESCE(bloqueado_chatbot, 0) E tiver $1, $2, $3 (PostgreSQL)
    if (line.includes('COALESCE(bloqueado_chatbot, 0)') && line.includes('$1')) {
        line = line.replace(/COALESCE\(bloqueado_chatbot, 0\)/g, 'COALESCE(bloqueado_chatbot, false)');
    }
    newLines.push(line);
}

content = newLines.join('\n');

fs.writeFileSync(serverPath, content);
console.log('✅ Correções aplicadas!');
console.log('📝 Faça commit e push novamente.');