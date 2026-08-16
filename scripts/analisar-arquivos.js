// scripts/analisar-arquivos.js
const fs = require('fs');
const path = require('path');

console.log('============================================');
console.log('ANALISANDO ARQUIVOS DO PROJETO');
console.log('============================================');
console.log('');

// Pastas para analisar
const pastas = [
    'server/config',
    'server/middlewares',
    'server/routes',
    'server/services',
    'server/jobs',
    'server/utils',
    'scripts',
    'public',
    'database'
];

console.log('1. ARQUIVOS DUPLICADOS');
console.log('--------------------------------------------');
const arquivos = [];
pastas.forEach(pasta => {
    if (fs.existsSync(pasta)) {
        try {
            const lista = fs.readdirSync(pasta, { recursive: true })
                .filter(f => f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.html'));
            lista.forEach(arquivo => {
                const nome = path.basename(arquivo);
                arquivos.push({ 
                    nome: nome, 
                    caminho: path.join(pasta, arquivo),
                    pasta: pasta
                });
            });
        } catch (e) {
            // Ignorar pastas que não podem ser lidas
        }
    }
});

const grupos = {};
arquivos.forEach(a => {
    if (!grupos[a.nome]) grupos[a.nome] = [];
    grupos[a.nome].push(a.caminho);
});

let duplicados = 0;
Object.keys(grupos).forEach(nome => {
    if (grupos[nome].length > 1) {
        console.log('DUPLICADO: ' + nome);
        grupos[nome].forEach(c => console.log('   ' + c));
        duplicados++;
    }
});

if (duplicados === 0) {
    console.log('Nenhum arquivo duplicado encontrado');
}

console.log('');
console.log('2. ARQUIVOS DE BACKUP');
console.log('--------------------------------------------');
const backups = [];
pastas.forEach(pasta => {
    if (fs.existsSync(pasta)) {
        try {
            const lista = fs.readdirSync(pasta, { recursive: true })
                .filter(f => f.includes('.backup') || f.includes('.bak') || f.includes('.old'));
            lista.forEach(arquivo => {
                const caminho = path.join(pasta, arquivo);
                try {
                    const stats = fs.statSync(caminho);
                    backups.push({ caminho, tamanho: stats.size, data: stats.mtime });
                } catch (e) {}
            });
        } catch (e) {}
    }
});

if (backups.length > 0) {
    backups.forEach(b => {
        console.log(b.caminho + ' (' + (b.tamanho/1024).toFixed(1) + ' KB) - ' + b.data.toLocaleDateString());
    });
    console.log('Total: ' + backups.length + ' arquivos de backup');
} else {
    console.log('Nenhum arquivo de backup encontrado');
}

console.log('');
console.log('3. ARQUIVOS DE TESTE E LOGS');
console.log('--------------------------------------------');
const testFiles = [];
pastas.forEach(pasta => {
    if (fs.existsSync(pasta)) {
        try {
            const lista = fs.readdirSync(pasta, { recursive: true })
                .filter(f => f.includes('test') || f.includes('log') || f.includes('tmp') || f.includes('temp'));
            lista.forEach(arquivo => {
                const caminho = path.join(pasta, arquivo);
                testFiles.push(caminho);
            });
        } catch (e) {}
    }
});

if (testFiles.length > 0) {
    testFiles.forEach(f => console.log(f));
    console.log('Total: ' + testFiles.length + ' arquivos de teste/log');
} else {
    console.log('Nenhum arquivo de teste/log encontrado');
}

console.log('');
console.log('4. ARQUIVOS DE SCRIPT NAO UTILIZADOS');
console.log('--------------------------------------------');

try {
    const scripts = fs.readdirSync('scripts', { recursive: true })
        .filter(f => f.endsWith('.js'));

    const scriptsUteis = [
        'migrate-vps.js',
        'migrar-usuarios-vps.js',
        'verificar-agendamentos.js',
        'verificar-bancos-empresas.js',
        'analisar-arquivos.js'
    ];

    const scriptsNaoUteis = scripts.filter(s => !scriptsUteis.includes(s));

    if (scriptsNaoUteis.length > 0) {
        scriptsNaoUteis.forEach(s => console.log('scripts/' + s));
        console.log('Total: ' + scriptsNaoUteis.length + ' scripts que podem ser removidos');
    } else {
        console.log('Todos os scripts parecem uteis');
    }
} catch (e) {
    console.log('Erro ao ler scripts:', e.message);
}

console.log('');
console.log('5. ARQUIVOS .backup E .old');
console.log('--------------------------------------------');

const arquivosBackup = [];
['.', 'server', 'public', 'database'].forEach(pasta => {
    if (fs.existsSync(pasta)) {
        try {
            const lista = fs.readdirSync(pasta)
                .filter(f => f.includes('.backup') || f.includes('.old') || f.includes('.bak'));
            lista.forEach(arquivo => {
                const caminho = path.join(pasta, arquivo);
                try {
                    const stats = fs.statSync(caminho);
                    arquivosBackup.push({ caminho, tamanho: stats.size });
                } catch (e) {}
            });
        } catch (e) {}
    }
});

if (arquivosBackup.length > 0) {
    arquivosBackup.forEach(b => {
        console.log(b.caminho + ' (' + (b.tamanho/1024).toFixed(1) + ' KB)');
    });
    console.log('Total: ' + arquivosBackup.length + ' arquivos .backup/.old');
} else {
    console.log('Nenhum arquivo .backup/.old encontrado');
}

console.log('');
console.log('============================================');
console.log('RESUMO DA ANALISE');
console.log('============================================');
console.log('Arquivos duplicados: ' + duplicados);
console.log('Arquivos de backup: ' + backups.length);
console.log('Arquivos de teste/log: ' + testFiles.length);
console.log('Scripts nao utilizados: ' + (scriptsNaoUteis ? scriptsNaoUteis.length : 0));
console.log('Arquivos .backup/.old: ' + arquivosBackup.length);
console.log('============================================');