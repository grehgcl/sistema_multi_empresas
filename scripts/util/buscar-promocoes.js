// buscar-promocoes.js
// Procura em todo o projeto por termos relacionados a promoções
const fs = require('fs');
const path = require('path');

const TERMOS = [
    'promocao', 'promoção', 'promocoes', 'promoções',
    'promo',
    'disparo', 'disparar',
    'campanha', 'campanhas',
    'marketing',
    'broadcast',
    'mensagem em massa', 'envio em massa',
    'notificacao', 'notificação', 'notificacoes', 'notificações',
    'aviso', 'avisos'
];

// Pastas para ignorar
const IGNORAR = ['node_modules', '.git', 'backups', 'analysis', 'dist', 'build'];

let totalAchados = 0;
const achados = [];

function varrer(dir) {
    let itens;
    try {
        itens = fs.readdirSync(dir);
    } catch (e) {
        return;
    }

    for (const item of itens) {
        if (IGNORAR.includes(item)) continue;

        const caminho = path.join(dir, item);
        let stat;
        try {
            stat = fs.statSync(caminho);
        } catch (e) {
            continue;
        }

        if (stat.isDirectory()) {
            varrer(caminho);
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            // Só olha arquivos de código
            if (!['.js', '.json', '.html', '.sql', '.md'].includes(ext)) continue;

            try {
                const conteudo = fs.readFileSync(caminho, 'utf8');
                const linhas = conteudo.split('\n');

                linhas.forEach((linha, i) => {
                    const linhaLower = linha.toLowerCase();
                    for (const termo of TERMOS) {
                        if (linhaLower.includes(termo.toLowerCase())) {
                            achados.push({
                                arquivo: caminho.replace(process.cwd(), '.'),
                                linha: i + 1,
                                termo,
                                texto: linha.trim().substring(0, 150)
                            });
                            totalAchados++;
                            break; // não duplica se bater em 2 termos
                        }
                    }
                });
            } catch (e) {}
        }
    }
}

console.log('\n🔍 Buscando termos relacionados a "promoções"...\n');

varrer(process.cwd());

if (totalAchados === 0) {
    console.log('❌ Nenhuma ocorrência encontrada.\n');
    process.exit(0);
}

// Agrupa por arquivo
const porArquivo = {};
achados.forEach(a => {
    if (!porArquivo[a.arquivo]) porArquivo[a.arquivo] = [];
    porArquivo[a.arquivo].push(a);
});

// Ordena por quantidade de ocorrências (mais relevante primeiro)
const ordenado = Object.entries(porArquivo)
    .sort((a, b) => b[1].length - a[1].length);

console.log(`📊 ${totalAchados} ocorrência(s) em ${ordenado.length} arquivo(s)\n`);
console.log('═══════════════════════════════════════════════════════════\n');

ordenado.forEach(([arquivo, ocorrencias]) => {
    console.log(`📄 ${arquivo} (${ocorrencias.length} ocorrências)`);
    ocorrencias.forEach(o => {
        console.log(`   L${o.linha}: ${o.texto}`);
    });
    console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Busca concluída\n');
