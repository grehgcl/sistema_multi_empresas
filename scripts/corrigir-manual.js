const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO MANUALMENTE...');

const substituicoes = [
    // configuracoes.js
    {
        arquivo: 'configuracoes.js',
        de: /horario\.aberto === 1/g,
        para: '(horario.aberto == 1 || horario.aberto == true)'
    },
    // dashboard.js
    {
        arquivo: 'dashboard.js',
        de: /h\.aberto === 1/g,
        para: '(h.aberto == 1 || h.aberto == true)'
    },
    // servicos.js
    {
        arquivo: 'servicos.js',
        de: /s\.ativo === 1 \?/g,
        para: '(s.ativo == 1 || s.ativo == true) ?'
    },
    // agendamentos.js
    {
        arquivo: 'agendamentos.js',
        de: /item\.ativo === 1/g,
        para: '(item.ativo == 1 || item.ativo == true)'
    }
];

const pastaPages = path.join(__dirname, '../public/js/pages');

substituicoes.forEach(({ arquivo, de, para }) => {
    const filePath = path.join(pastaPages, arquivo);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${arquivo} não encontrado`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(de.source || de)) {
        content = content.replace(de, para);
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${arquivo} corrigido`);
    } else {
        console.log(`⏭️ ${arquivo} sem alterações`);
    }
});

console.log('\n✅ Correções aplicadas!');
console.log('📝 git add . && git commit -m "fix: compatibilidade PostgreSQL" && git push');