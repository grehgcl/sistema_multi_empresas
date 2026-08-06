const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO .toFixed() EM TODOS OS ARQUIVOS...');

const pastaPublic = path.join(__dirname, '../public/js/pages');
const arquivos = fs.readdirSync(pastaPublic);

let totalCorrigidos = 0;

arquivos.forEach(arquivo => {
    if (!arquivo.endsWith('.js')) return;

    const filePath = path.join(pastaPublic, arquivo);
    let content = fs.readFileSync(filePath, 'utf8');
    let modificado = false;

    // Padrão: (valor || 0).toFixed(2) → parseFloat(valor) || 0
    const regex1 = /\((\w+)\s*\|\|\s*0\)\.toFixed\(2\)/g;
    if (regex1.test(content)) {
        content = content.replace(regex1, `(parseFloat($1) || 0).toFixed(2)`);
        modificado = true;
        console.log(`   ✅ ${arquivo}: corrigido (valor || 0).toFixed`);
    }

    // Padrão: (item.valor || 0).toFixed(2)
    const regex2 = /\((\w+\.\w+)\s*\|\|\s*0\)\.toFixed\(2\)/g;
    if (regex2.test(content)) {
        content = content.replace(regex2, `(parseFloat($1) || 0).toFixed(2)`);
        modificado = true;
        console.log(`   ✅ ${arquivo}: corrigido (item.valor || 0).toFixed`);
    }

    // Padrão: (s.valor || 0).toFixed
    const regex3 = /\((\w+\.\w+)\s*\|\|\s*0\)\.toFixed/g;
    if (regex3.test(content)) {
        content = content.replace(regex3, `(parseFloat($1) || 0).toFixed`);
        modificado = true;
        console.log(`   ✅ ${arquivo}: corrigido (s.valor || 0).toFixed`);
    }

    // Padrão: (valor || 0).toFixed (sem parâmetro)
    const regex4 = /\((\w+)\s*\|\|\s*0\)\.toFixed\(/g;
    if (regex4.test(content)) {
        content = content.replace(regex4, `(parseFloat($1) || 0).toFixed(`);
        modificado = true;
        console.log(`   ✅ ${arquivo}: corrigido (valor || 0).toFixed(`);
    }

    if (modificado) {
        fs.writeFileSync(filePath, content);
        totalCorrigidos++;
        console.log(`   📝 ${arquivo} salvo!`);
    }
});

console.log(`\n✅ ${totalCorrigidos} arquivos corrigidos!`);
console.log('📝 Faça commit e push novamente.');