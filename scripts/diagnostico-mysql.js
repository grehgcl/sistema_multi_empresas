// ============================================
// DIAGNÓSTICO - MIGRAÇÃO SQLITE → MYSQL
// ============================================
// Arquivo: scripts/diagnostico-mysql.js
// Data: 16/08/2026 02:20:08
// ============================================

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Cores para o terminal
const cores = {
    vermelho: '\x1b[31m',
    verde: '\x1b[32m',
    amarelo: '\x1b[33m',
    azul: '\x1b[34m',
    magenta: '\x1b[35m',
    ciano: '\x1b[36m',
    reset: '\x1b[0m',
    negrito: '\x1b[1m'
};

console.log(cores.negrito + cores.ciano + '============================================');
console.log('🔍 DIAGNÓSTICO - MIGRAÇÃO SQLITE → MYSQL');
console.log('============================================' + cores.reset);
console.log();

// ============================================
// 1. ARQUIVOS QUE USAM SQLITE
// ============================================
console.log(cores.negrito + cores.amarelo + '📁 1. ARQUIVOS QUE USAM SQLITE' + cores.reset);
console.log('--------------------------------------------');

const arquivosSqlite = [];
const pastasParaAnalisar = ['server', 'scripts', 'migrations'];

pastasParaAnalisar.forEach(pasta => {
    if (fs.existsSync(pasta)) {
        const arquivos = fs.readdirSync(pasta, { recursive: true })
            .filter(f => f.endsWith('.js') || f.endsWith('.ts'));
        
        arquivos.forEach(arquivo => {
            const caminho = path.join(pasta, arquivo);
            const conteudo = fs.readFileSync(caminho, 'utf8');
            
            // Palavras-chave SQLite
            const palavrasChave = [
                'sqlite3',
                'sqlite',
                'db.run',
                'db.get',
                'db.all',
                'db.exec',
                'AUTOINCREMENT',
                'strftime',
                "datetime('now')",
                "date('now')",
                'IFNULL',
                'COALESCE'
            ];
            
            const temSqlite = palavrasChave.some(palavra => 
                conteudo.includes(palavra)
            );
            
            if (temSqlite) {
                arquivosSqlite.push(caminho);
                
                // Mostrar quais palavras foram encontradas
                const encontradas = palavrasChave.filter(p => conteudo.includes(p));
                console.log(cores.vermelho + '❌ ' + cores.reset + caminho);
                console.log('   Palavras SQLite: ' + cores.amarelo + encontradas.join(', ') + cores.reset);
            }
        });
    }
});

console.log();
console.log(cores.negrito + 'Total de arquivos com SQLite: ' + cores.vermelho + arquivosSqlite.length + cores.reset);
console.log();

// ============================================
// 2. QUERIES QUE PRECISAM SER ADAPTADAS
// ============================================
console.log(cores.negrito + cores.amarelo + '📝 2. QUERIES QUE PRECISAM SER ADAPTADAS' + cores.reset);
console.log('--------------------------------------------');

const queriesParaAdaptar = [];

function analisarQuery(conteudo, arquivo) {
    // Padrões SQLite que precisam ser adaptados
    const padroes = [
        { 
            sqlite: /AUTOINCREMENT/gi, 
            mysql: 'AUTO_INCREMENT',
            descricao: 'AUTOINCREMENT → AUTO_INCREMENT'
        },
        { 
            sqlite: /strftime\(['"]%m['"],\s*([^)]+)\)/gi, 
            mysql: 'EXTRACT(MONTH FROM )',
            descricao: 'strftime → EXTRACT (mês)'
        },
        { 
            sqlite: /strftime\(['"]%Y['"],\s*([^)]+)\)/gi, 
            mysql: 'EXTRACT(YEAR FROM )',
            descricao: 'strftime → EXTRACT (ano)'
        },
        { 
            sqlite: /strftime\(['"]%d['"],\s*([^)]+)\)/gi, 
            mysql: 'EXTRACT(DAY FROM )',
            descricao: 'strftime → EXTRACT (dia)'
        },
        { 
            sqlite: /strftime\(['"]%H['"],\s*([^)]+)\)/gi, 
            mysql: 'EXTRACT(HOUR FROM )',
            descricao: 'strftime → EXTRACT (hora)'
        },
        { 
            sqlite: /strftime\(['"]%M['"],\s*([^)]+)\)/gi, 
            mysql: 'EXTRACT(MINUTE FROM )',
            descricao: 'strftime → EXTRACT (minuto)'
        },
        { 
            sqlite: /datetime\(['"]now['"]/gi, 
            mysql: 'NOW()',
            descricao: "datetime('now') → NOW()"
        },
        { 
            sqlite: /date\(['"]now['"]/gi, 
            mysql: 'CURDATE()',
            descricao: "date('now') → CURDATE()"
        },
        { 
            sqlite: /IFNULL\(/gi, 
            mysql: 'IFNULL(',
            descricao: 'IFNULL (MySQL também suporta) ✅'
        },
        { 
            sqlite: /COALESCE\(/gi, 
            mysql: 'COALESCE(',
            descricao: 'COALESCE (MySQL também suporta) ✅'
        },
        { 
            sqlite: /ROWID/gi, 
            mysql: 'id',
            descricao: 'ROWID → id (MySQL não tem ROWID)'
        },
        { 
            sqlite: /TEXT PRIMARY KEY/gi, 
            mysql: 'VARCHAR(255) PRIMARY KEY',
            descricao: 'TEXT PRIMARY KEY → VARCHAR(255) PRIMARY KEY'
        },
        { 
            sqlite: /REAL/gi, 
            mysql: 'DECIMAL(10,2)',
            descricao: 'REAL → DECIMAL(10,2)'
        },
        { 
            sqlite: /BOOLEAN/gi, 
            mysql: 'TINYINT(1)',
            descricao: 'BOOLEAN → TINYINT(1)'
        },
        { 
            sqlite: /INTEGER PRIMARY KEY AUTOINCREMENT/gi, 
            mysql: 'INT PRIMARY KEY AUTO_INCREMENT',
            descricao: 'INTEGER PRIMARY KEY AUTOINCREMENT → INT PRIMARY KEY AUTO_INCREMENT'
        }
    ];
    
    const linhas = conteudo.split('\n');
    let temQuery = false;
    
    linhas.forEach((linha, index) => {
        // Verificar se a linha parece uma query SQL
        const pareceQuery = /SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP/i.test(linha);
        
        if (pareceQuery) {
            padroes.forEach(padrao => {
                if (padrao.sqlite.test(linha)) {
                    queriesParaAdaptar.push({
                        arquivo: arquivo,
                        linha: index + 1,
                        conteudo: linha.trim(),
                        padrao: padrao.descricao,
                        mysql: padrao.mysql
                    });
                    temQuery = true;
                }
            });
        }
    });
    
    return temQuery;
}

// Analisar todos os arquivos .js
const todosArquivos = [];
['server', 'scripts', 'migrations'].forEach(pasta => {
    if (fs.existsSync(pasta)) {
        const arquivos = fs.readdirSync(pasta, { recursive: true })
            .filter(f => f.endsWith('.js') || f.endsWith('.ts'));
        
        arquivos.forEach(arquivo => {
            const caminho = path.join(pasta, arquivo);
            todosArquivos.push(caminho);
        });
    }
});

todosArquivos.forEach(arquivo => {
    try {
        const conteudo = fs.readFileSync(arquivo, 'utf8');
        analisarQuery(conteudo, arquivo);
    } catch (e) {
        // Ignorar erros
    }
});

if (queriesParaAdaptar.length === 0) {
    console.log(cores.verde + '✅ Nenhuma query precisa ser adaptada!' + cores.reset);
} else {
    console.log(cores.vermelho + '⚠️ ' + queriesParaAdaptar.length + ' queries precisam ser adaptadas:' + cores.reset);
    console.log();
    
    // Agrupar por arquivo
    const porArquivo = {};
    queriesParaAdaptar.forEach(q => {
        if (!porArquivo[q.arquivo]) porArquivo[q.arquivo] = [];
        porArquivo[q.arquivo].push(q);
    });
    
    Object.keys(porArquivo).forEach(arquivo => {
        console.log(cores.negrito + cores.ciano + '📄 ' + arquivo + cores.reset);
        porArquivo[arquivo].forEach(q => {
            console.log('   Linha ' + q.linha + ': ' + cores.amarelo + q.padrao + cores.reset);
            console.log('   SQLite: ' + cores.vermelho + q.conteudo + cores.reset);
            console.log('   MySQL:  ' + cores.verde + q.conteudo.replace(/AUTOINCREMENT/gi, 'AUTO_INCREMENT').replace(/strftime\(['"]%m['"],/gi, 'EXTRACT(MONTH FROM ').replace(/strftime\(['"]%Y['"],/gi, 'EXTRACT(YEAR FROM ') + cores.reset);
            console.log();
        });
        console.log('---');
    });
}

console.log();
console.log(cores.negrito + cores.amarelo + '📊 RESUMO' + cores.reset);
console.log('--------------------------------------------');
console.log('📁 Arquivos com SQLite: ' + arquivosSqlite.length);
console.log('📝 Queries para adaptar: ' + queriesParaAdaptar.length);

// ============================================
// 3. O QUE É COMPATÍVEL COM MYSQL
// ============================================
console.log();
console.log(cores.negrito + cores.amarelo + '✅ 3. O QUE É COMPATÍVEL COM MYSQL' + cores.reset);
console.log('--------------------------------------------');

const compatibilidades = [
    { item: 'COALESCE', status: '✅ Compatível' },
    { item: 'IFNULL', status: '✅ Compatível' },
    { item: 'LIKE', status: '✅ Compatível' },
    { item: 'INNER JOIN', status: '✅ Compatível' },
    { item: 'LEFT JOIN', status: '✅ Compatível' },
    { item: 'ORDER BY', status: '✅ Compatível' },
    { item: 'GROUP BY', status: '✅ Compatível' },
    { item: 'DISTINCT', status: '✅ Compatível' },
    { item: 'COUNT', status: '✅ Compatível' },
    { item: 'SUM', status: '✅ Compatível' },
    { item: 'AVG', status: '✅ Compatível' },
    { item: 'MAX', status: '✅ Compatível' },
    { item: 'MIN', status: '✅ Compatível' },
    { item: 'DATE', status: '✅ Compatível (usar DATE_FORMAT)' },
    { item: 'NOW()', status: '✅ Compatível' },
    { item: 'CURDATE()', status: '✅ Compatível' },
    { item: 'CURTIME()', status: '✅ Compatível' },
];

compatibilidades.forEach(c => {
    console.log(c.item + ' → ' + cores.verde + c.status + cores.reset);
});

console.log();
console.log(cores.negrito + cores.ciano + '============================================');
console.log('✅ DIAGNÓSTICO CONCLUÍDO!');
console.log('============================================' + cores.reset);
