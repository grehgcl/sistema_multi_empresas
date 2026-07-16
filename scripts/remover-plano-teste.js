// scripts/remover-plano-teste.js
const fs = require('fs');
const path = require('path');

function desativarPlanoTeste() {
    console.log('🔒 Desativando plano de teste R$ 1,00...\n');

    const arquivos = [
        'public/js/pages/planos.js',
        'server/utils/constants.js',
        'server.js'
    ];

    let modificados = 0;

    for (const arquivo of arquivos) {
        const caminho = path.join(__dirname, '..', arquivo);
        if (!fs.existsSync(caminho)) {
            console.log(`❌ ${arquivo} não encontrado`);
            continue;
        }

        let conteudo = fs.readFileSync(caminho, 'utf8');
        let novoConteudo = conteudo;

        // Comentar todas as ocorrências de 'teste' relacionadas ao plano
        novoConteudo = novoConteudo.replace(/^(\s*)teste:\s*\{/gm, '$1// teste: {');
        novoConteudo = novoConteudo.replace(/^(\s*)'teste':\s*'Teste R\$ 1,00',/gm, "$1// 'teste': 'Teste R$ 1,00',");
        novoConteudo = novoConteudo.replace(/^(\s*)'teste':\s*\{/gm, "$1// 'teste': {");
        novoConteudo = novoConteudo.replace(/^(\s*)plano:\s*'teste'/gm, "$1// plano: 'teste'");

        if (novoConteudo !== conteudo) {
            fs.writeFileSync(caminho, novoConteudo, 'utf8');
            console.log(`✅ ${arquivo} modificado`);
            modificados++;
        } else {
            console.log(`⏭️ ${arquivo} - sem alterações`);
        }
    }

    console.log(`\n✅ ${modificados} arquivos modificados`);
    console.log('\n💡 Próximos passos:');
    console.log('   1. git add .');
    console.log('   2. git commit -m "🔒 Desativa plano de teste R$ 1,00"');
    console.log('   3. git push origin main');
    console.log('   4. Na VPS: cd ~/seeagende && ./atualizar.sh');
}

desativarPlanoTeste();