const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO ARQUIVOS DE FORMA SEGURA...');
console.log('='.repeat(60));

const arquivos = [
    'configuracoes.js',
    'dashboard.js',
    'agendamentos.js',
    'servicos.js',
    'financeiro.js'
];

const pastaPages = path.join(__dirname, '../public/js/pages');

arquivos.forEach(arquivo => {
    const filePath = path.join(pastaPages, arquivo);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let modificado = false;

    // 1. Corrigir .aberto === 1 → .aberto === 1 || .aberto === true
    if (content.includes('.aberto === 1')) {
        // Não substituir tudo, apenas os casos específicos
        content = content.replace(/h\.aberto === 1/g, '(h.aberto === 1 || h.aberto === true)');
        content = content.replace(/horario\.aberto === 1/g, '(horario.aberto === 1 || horario.aberto === true)');
        modificado = true;
        console.log(`✅ ${arquivo}: corrigido .aberto`);
    }

    // 2. Corrigir .ativo === 1 → .ativo === 1 || .ativo === true
    if (content.includes('.ativo === 1')) {
        content = content.replace(/s\.ativo === 1/g, '(s.ativo === 1 || s.ativo === true)');
        content = content.replace(/p\.ativo === 1/g, '(p.ativo === 1 || p.ativo === true)');
        content = content.replace(/prof\.ativo === 1/g, '(prof.ativo === 1 || prof.ativo === true)');
        modificado = true;
        console.log(`✅ ${arquivo}: corrigido .ativo`);
    }

    // 3. Corrigir .status === 1 → .status === 1 || .status === true
    if (content.includes('.status === 1')) {
        content = content.replace(/item\.status === 1/g, '(item.status === 1 || item.status === true)');
        modificado = true;
        console.log(`✅ ${arquivo}: corrigido .status`);
    }

    if (modificado) {
        fs.writeFileSync(filePath, content);
        console.log(`📝 ${arquivo} salvo!`);
    } else {
        console.log(`⏭️ ${arquivo}: sem alterações`);
    }
});

console.log('\n✅ Correções aplicadas!');
console.log('📝 Agora faça git add, commit e push');