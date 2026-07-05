const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO TODOS OS ARQUIVOS...');
console.log('='.repeat(60));

const pasta = path.join(__dirname, '../public/js/pages');

// Lista de arquivos e padrões para corrigir
const correcoes = {
    'dashboard.js': [
        { de: /p\.ativo === 1/g, para: '(p.ativo == 1 || p.ativo == true)' },
        { de: /horarioConfiguradoHoje\.aberto === 1/g, para: '(horarioConfiguradoHoje.aberto == 1 || horarioConfiguradoHoje.aberto == true)' },
        { de: /horarioDia\.aberto === 1/g, para: '(horarioDia.aberto == 1 || horarioDia.aberto == true)' },
        { de: /empresa\.assinatura_ativa === 1/g, para: '(empresa.assinatura_ativa == 1 || empresa.assinatura_ativa == true)' },
        { de: /cliente\.bloqueado_chatbot === 1/g, para: '(cliente.bloqueado_chatbot == 1 || cliente.bloqueado_chatbot == true)' }
    ],
    'configuracoes.js': [
        { de: /horario\.aberto === 1/g, para: '(horario.aberto == 1 || horario.aberto == true)' }
    ],
    'agendamentos.js': [
        { de: /p\.ativo === 1/g, para: '(p.ativo == 1 || p.ativo == true)' }
    ],
    'servicos.js': [
        { de: /s\.ativo === 1/g, para: '(s.ativo == 1 || s.ativo == true)' },
        { de: /servico\.ativo === 1/g, para: '(servico.ativo == 1 || servico.ativo == true)' }
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
            console.log(`   ✅ ${arquivo}: corrigido padrão`);
        }
    });

    if (modificado) {
        fs.writeFileSync(filePath, content);
        console.log(`📝 ${arquivo} salvo!`);
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
console.log('2. git commit -m "fix: compatibilidade PostgreSQL (booleanos)"');
console.log('3. git push origin main');