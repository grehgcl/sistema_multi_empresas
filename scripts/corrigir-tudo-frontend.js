const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO FRONT-END COMPLETO...');
console.log('='.repeat(60));

const pasta = path.join(__dirname, '../public/js/pages');

// Lista de arquivos e correções
const correcoes = {
    'agendamentos.js': [
        { de: /\$\(s\.valor\.toFixed\(2\)\)/g, para: '${(parseFloat(s.valor) || 0).toFixed(2)}' },
        { de: /s\.valor\.toFixed\(2\)/g, para: '(parseFloat(s.valor) || 0).toFixed(2)' },
        { de: /item\.valor\.toFixed\(2\)/g, para: '(parseFloat(item.valor) || 0).toFixed(2)' },
        { de: /\(item\.valor \|\| 0\)\.toFixed/g, para: '(parseFloat(item.valor) || 0).toFixed' },
        { de: /\(s\.valor \|\| 0\)\.toFixed/g, para: '(parseFloat(s.valor) || 0).toFixed' },
        { de: /const valor = item\.valor \|\| 0;/g, para: 'const valor = parseFloat(item.valor) || 0;' },
        { de: /const comissao = item\.comissao \|\| 0;/g, para: 'const comissao = parseFloat(item.comissao) || 0;' },
    ],
    'servicos.js': [
        { de: /\$\{s\.valor\.toFixed\(2\)\}/g, para: '${(parseFloat(s.valor) || 0).toFixed(2)}' },
        { de: /s\.valor\.toFixed\(2\)/g, para: '(parseFloat(s.valor) || 0).toFixed(2)' },
        { de: /\(s\.valor \|\| 0\)\.toFixed/g, para: '(parseFloat(s.valor) || 0).toFixed' },
        { de: /\(servico\.valor \|\| 0\)\.toFixed/g, para: '(parseFloat(servico.valor) || 0).toFixed' },
    ],
    'financeiro.js': [
        { de: /\(item\.valor \|\| 0\)\.toFixed/g, para: '(parseFloat(item.valor) || 0).toFixed' },
        { de: /\(item\.comissao \|\| 0\)\.toFixed/g, para: '(parseFloat(item.comissao) || 0).toFixed' },
        { de: /\(totais\.faturamento_bruto \|\| 0\)\.toFixed/g, para: '(parseFloat(totais.faturamento_bruto) || 0).toFixed' },
        { de: /\(totais\.total_comissoes \|\| 0\)\.toFixed/g, para: '(parseFloat(totais.total_comissoes) || 0).toFixed' },
        { de: /\(totais\.faturamento_liquido \|\| 0\)\.toFixed/g, para: '(parseFloat(totais.faturamento_liquido) || 0).toFixed' },
    ],
    'dashboard.js': [
        { de: /\(valor \|\| 0\)\.toFixed/g, para: '(parseFloat(valor) || 0).toFixed' },
    ]
};

let totalModificados = 0;

Object.keys(correcoes).forEach(arquivo => {
    const filePath = path.join(pasta, arquivo);
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ ${arquivo} não encontrado`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modificado = false;

    correcoes[arquivo].forEach(({ de, para }) => {
        if (de.test(content)) {
            content = content.replace(de, para);
            modificado = true;
        }
    });

    if (modificado) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ ${arquivo} corrigido e salvo!`);
        totalModificados++;
    } else {
        console.log(`⏭️ ${arquivo}: sem alterações`);
    }
});

console.log('='.repeat(60));
console.log(`✅ ${totalModificados} arquivos corrigidos!`);
console.log('');
console.log('📝 PRÓXIMOS PASSOS:');
console.log('1. git add public/js/pages/*.js');
console.log('2. git commit -m "fix: corrigir toFixed para PostgreSQL"');
console.log('3. git push origin main');