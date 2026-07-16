// scripts/toggle-plano-teste.js
const fs = require('fs');
const path = require('path');

function togglePlanoTeste(modo) {
    const isAtivar = modo === 'on';
    const arquivo = path.join(__dirname, '..', 'public/js/pages/planos.js');

    if (!fs.existsSync(arquivo)) {
        console.log('❌ Arquivo não encontrado');
        return;
    }

    let conteudo = fs.readFileSync(arquivo, 'utf8');

    if (isAtivar) {
        // ATIVAR: remover comentários
        conteudo = conteudo.replace(/\/\/\s*teste:\s*\{/g, '    teste: {');
        conteudo = conteudo.replace(/\/\/\s*'teste':\s*'Teste R\$ 1,00',/g, "        'teste': 'Teste R$ 1,00',");
        console.log('✅ Plano de teste ATIVADO!');
    } else {
        // DESATIVAR: comentar
        conteudo = conteudo.replace(/^    teste:\s*\{/gm, '    // teste: {');
        conteudo = conteudo.replace(/^        'teste':\s*'Teste R\$ 1,00',/gm, "        // 'teste': 'Teste R$ 1,00',");
        console.log('✅ Plano de teste DESATIVADO!');
    }

    fs.writeFileSync(arquivo, conteudo, 'utf8');
    console.log('📄 Arquivo modificado!');
}

const modo = process.argv[2];
if (modo === 'on' || modo === 'off') {
    togglePlanoTeste(modo);
} else {
    console.log('❌ Uso: node toggle-plano-teste.js [on|off]');
}