const fs = require('fs');
const path = require('path');

console.log('🔧 CORREÇÃO FINAL...');

const pastaPages = path.join(__dirname, '../public/js/pages');

// Lista de arquivos e suas correções
const correcoes = {
    'configuracoes.js': [
        { de: /\$\{horario\.aberto === 1 \?/g, para: '${(horario.aberto == 1 || horario.aberto == true) ?' },
        { de: /horario\.aberto === 1/g, para: '(horario.aberto == 1 || horario.aberto == true)' }
    ],
    'dashboard.js': [
        { de: /\$\{h\.aberto === 1 \?/g, para: '${(h.aberto == 1 || h.aberto == true) ?' },
        { de: /h\.aberto === 1/g, para: '(h.aberto == 1 || h.aberto == true)' }
    ],
    'agendamentos.js': [
        { de: /\$\{item\.ativo === 1 \?/g, para: '${(item.ativo == 1 || item.ativo == true) ?' },
        { de: /item\.ativo === 1/g, para: '(item.ativo == 1 || item.ativo == true)' }
    ],
    'servicos.js': [
        { de: /\$\{s\.ativo === 1 \?/g, para: '${(s.ativo == 1 || s.ativo == true) ?' },
        { de: /s\.ativo === 1/g, para: '(s.ativo == 1 || s.ativo == true)' }
    ]
};

Object.keys(correcoes).forEach(arquivo => {
    const filePath = path.join(pastaPages, arquivo);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${arquivo} não encontrado`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modificado = false;

    correcoes[arquivo].forEach(({ de, para }) => {
        if (content.includes(de.source || de)) {
            content = content.replace(de, para);
            modificado = true;
        }
    });

    if (modificado) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${arquivo} corrigido`);
    } else {
        console.log(`⏭️ ${arquivo} sem alterações`);
    }
});

console.log('\n✅ Correções aplicadas!');
console.log('📝 Agora recarregue a página (Ctrl+F5)');