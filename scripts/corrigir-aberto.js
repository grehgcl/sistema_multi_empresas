const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO "aberto" PARA COMPATIBILIDADE...');

const pastaPublic = path.join(__dirname, '../public/js/pages');
const arquivos = fs.readdirSync(pastaPublic);

arquivos.forEach(arquivo => {
    if (!arquivo.endsWith('.js')) return;

    const filePath = path.join(pastaPublic, arquivo);
    let content = fs.readFileSync(filePath, 'utf8');
    let modificado = false;

    // Substituir h.aberto === 1 por isAberto(h.aberto)
    if (content.includes('h.aberto === 1')) {
        content = content.replace(/h\.aberto === 1/g, 'isAberto(h.aberto)');
        modificado = true;
        console.log(`   ✅ ${arquivo}: corrigido h.aberto === 1`);
    }

    // Substituir horario.aberto === 1
    if (content.includes('horario.aberto === 1')) {
        content = content.replace(/horario\.aberto === 1/g, 'isAberto(horario.aberto)');
        modificado = true;
        console.log(`   ✅ ${arquivo}: corrigido horario.aberto === 1`);
    }

    // Se não tiver a função isAberto, adicionar
    if (modificado && !content.includes('function isAberto')) {
        const funcao = `
// ============================================
// FUNÇÃO PARA CONVERTER ABERTO (BOOLEAN/INTEGER)
// ============================================
function isAberto(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}
`;
        // Adicionar no início do arquivo
        content = funcao + content;
        modificado = true;
        console.log(`   ✅ ${arquivo}: adicionada função isAberto`);
    }

    if (modificado) {
        fs.writeFileSync(filePath, content);
        console.log(`   📝 ${arquivo} salvo!`);
    }
});

console.log('\n✅ Correções aplicadas!');
console.log('📝 Faça commit e push novamente.');