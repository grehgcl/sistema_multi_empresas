const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO DASHBOARD.JS...');

const filePath = path.join(__dirname, '../public/js/pages/dashboard.js');
let content = fs.readFileSync(filePath, 'utf8');

// Correção 1: s.valor.toFixed(2) no preenchimento de serviços
const regex1 = /window\.servicosList\.forEach\(s => \{\s*servicoSelect\.innerHTML \+= `<option value="\$\{s\.id\}" data-valor="\$\{s\.valor\}" data-nome="\$\{s\.nome\}" data-duracao="\$\{s\.duracao \|\| 30\}">\$\{s\.nome\} - R\$ \$\{s\.valor\.toFixed\(2\)\} \(\$\{s\.duracao \|\| 30\}min\)<\/option>`;\s*\}\)/s;

if (regex1.test(content)) {
    content = content.replace(regex1, `window.servicosList.forEach(s => {
    const valor = parseFloat(s.valor) || 0;
    servicoSelect.innerHTML += \`<option value="\${s.id}" data-valor="\${valor}" data-nome="\${s.nome}" data-duracao="\${s.duracao || 30}">\${s.nome} - R$ \${valor.toFixed(2)} (\${s.duracao || 30}min)</option>\`;
});`);
    console.log('✅ Correção 1 aplicada');
}

// Correção 2: s.valor.toFixed(2) em outros lugares
const regex2 = /s\.valor\.toFixed\(2\)/g;
if (regex2.test(content)) {
    content = content.replace(regex2, '(parseFloat(s.valor) || 0).toFixed(2)');
    console.log('✅ Correção 2 aplicada');
}

// Correção 3: (valor || 0).toFixed
const regex3 = /\(valor \|\| 0\)\.toFixed/g;
if (regex3.test(content)) {
    content = content.replace(regex3, '(parseFloat(valor) || 0).toFixed');
    console.log('✅ Correção 3 aplicada');
}

fs.writeFileSync(filePath, content);
console.log('📝 dashboard.js salvo!');
console.log('');
console.log('📝 PRÓXIMOS PASSOS:');
console.log('1. git add public/js/pages/dashboard.js');
console.log('2. git commit -m "fix: corrigir dashboard.js toFixed"');
console.log('3. git push origin main');