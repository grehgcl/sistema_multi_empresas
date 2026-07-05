const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

console.log('🔧 CORRIGINDO BOOLEANOS NO SERVER.JS...');

// Correção 1: Login - profissionais
content = content.replace(
    /WHERE p\.email = \$1 AND p\.ativo = 1/g,
    'WHERE p.email = $1 AND p.ativo = true'
);

// Correção 2: Buscar profissionais ativos
content = content.replace(
    /WHERE empresa_id = \$1 AND ativo = 1 ORDER BY nome/g,
    'WHERE empresa_id = $1 AND ativo = true ORDER BY nome'
);

// Correção 3: Verificar assinatura ativa
content = content.replace(
    /assinatura_ativa === 1/g,
    'assinatura_ativa === true'
);

// Correção 4: Filtrar profissionais ativos (frontend)
content = content.replace(
    /\.filter\(p => p\.ativo === 1\)/g,
    '.filter(p => p.ativo === true)'
);

// Correção 5: Verificar se é dono
content = content.replace(
    /\.filter\(p => p\.ativo === 1 \|\| p\.ativo === true\)/g,
    '.filter(p => p.ativo === true)'
);

fs.writeFileSync(serverPath, content);
console.log('✅ Correções aplicadas!');
console.log('📝 Faça commit e push novamente.');