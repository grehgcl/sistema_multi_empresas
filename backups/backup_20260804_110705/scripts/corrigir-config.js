const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO CONFIGURACOES.JS...');

const filePath = path.join(__dirname, '../public/js/pages/configuracoes.js');
let content = fs.readFileSync(filePath, 'utf8');

console.log('📝 Aplicando correções...');

// 1. Corrigir status do profissional
content = content.replace(
    /prof\.ativo === 1 \? '<span class="badge-success">✅ Ativo<\/span>' : '<span class="badge-danger">❌ Inativo<\/span>'/g,
    '(prof.ativo === true || prof.ativo === 1) ? \'<span class="badge-success">✅ Ativo</span>\' : \'<span class="badge-danger">❌ Inativo</span>\''
);

// 2. Corrigir contagem de ativos
content = content.replace(
    /const ativos = profissionaisData\.filter\(p => p\.ativo === 1\)\.length;/g,
    'const ativos = profissionaisData.filter(p => p.ativo === true || p.ativo === 1).length;'
);

// 3. Corrigir toggle de status
content = content.replace(
    /prof\.ativo === 1 \? '🔴' : '🟢'/g,
    '(prof.ativo === true || prof.ativo === 1) ? \'🔴\' : \'🟢\''
);

// 4. Corrigir no alternar status
content = content.replace(
    /prof\.ativo === 1 \? 'false' : 'true'/g,
    '(prof.ativo === true || prof.ativo === 1) ? \'false\' : \'true\''
);

// 5. Corrigir aberto nos horários
content = content.replace(
    /const aberto = h\.aberto !== undefined \? h\.aberto : \(dia === 0 \? 0 : 1\);/g,
    'const aberto = h.aberto !== undefined ? (h.aberto === true || h.aberto === 1 ? 1 : 0) : (dia === 0 ? 0 : 1);'
);

// 6. Corrigir status do horário no toggle
content = content.replace(
    /aberto === 1 \? 'checked' : ''/g,
    '(aberto === true || aberto === 1) ? \'checked\' : \'\''
);

// 7. Corrigir renderização de horários (aberto no checkbox)
content = content.replace(
    /\$\{aberto === 1 \? 'checked' : ''\}/g,
    '\${(aberto === true || aberto === 1) ? \'checked\' : \'\'}'
);

fs.writeFileSync(filePath, content);
console.log('✅ Correções aplicadas em configuracoes.js!');
console.log('🔄 Recarregue a página (Ctrl+F5)');