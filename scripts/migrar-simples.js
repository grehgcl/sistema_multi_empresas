// scripts/migrar-simples.js
const fs = require('fs');
const path = require('path');

console.log('Migrando SQLite para MariaDB/MySQL...');
console.log('');

const arquivos = [
    'server/routes/admin.routes.js',
    'server/routes/financeiro.routes.js',
    'server/routes/chatbot.routes.js',
    'server/routes/despesas.routes.js',
    'server/routes/agendamentos.routes.js',
    'server/routes/clientes.routes.js',
    'server/routes/planos.routes.js',
    'server/routes/whatsapp.routes.js',
    'server/middlewares/auth.js',
    'server/config/database.js'
];

let totalModificacoes = 0;

arquivos.forEach(arquivo => {
    const caminho = path.join(process.cwd(), arquivo);
    
    if (!fs.existsSync(caminho)) {
        console.log('Arquivo nao encontrado:', arquivo);
        return;
    }
    
    let conteudo = fs.readFileSync(caminho, 'utf8');
    let modificado = false;
    let modificacoes = 0;
    
    // 1. strftime('%m', data) -> EXTRACT(MONTH FROM data)
    const novo1 = conteudo.replace(/strftime\s*\(\s*['"]%m['"]\s*,\s*([^)]+)\s*\)/gi, 'EXTRACT(MONTH FROM )');
    if (novo1 !== conteudo) {
        modificado = true;
        modificacoes++;
        conteudo = novo1;
    }
    
    // 2. strftime('%Y', data) -> EXTRACT(YEAR FROM data)
    const novo2 = conteudo.replace(/strftime\s*\(\s*['"]%Y['"]\s*,\s*([^)]+)\s*\)/gi, 'EXTRACT(YEAR FROM )');
    if (novo2 !== conteudo) {
        modificado = true;
        modificacoes++;
        conteudo = novo2;
    }
    
    // 3. strftime('%d', data) -> EXTRACT(DAY FROM data)
    const novo3 = conteudo.replace(/strftime\s*\(\s*['"]%d['"]\s*,\s*([^)]+)\s*\)/gi, 'EXTRACT(DAY FROM )');
    if (novo3 !== conteudo) {
        modificado = true;
        modificacoes++;
        conteudo = novo3;
    }
    
    // 4. datetime('now') -> NOW()
    const novo4 = conteudo.replace(/datetime\s*\(\s*['"]now['"]\s*\)/gi, 'NOW()');
    if (novo4 !== conteudo) {
        modificado = true;
        modificacoes++;
        conteudo = novo4;
    }
    
    // 5. date('now') -> CURDATE()
    const novo5 = conteudo.replace(/date\s*\(\s*['"]now['"]\s*\)/gi, 'CURDATE()');
    if (novo5 !== conteudo) {
        modificado = true;
        modificacoes++;
        conteudo = novo5;
    }
    
    // 6. AUTOINCREMENT -> AUTO_INCREMENT
    const novo6 = conteudo.replace(/AUTOINCREMENT/gi, 'AUTO_INCREMENT');
    if (novo6 !== conteudo) {
        modificado = true;
        modificacoes++;
        conteudo = novo6;
    }
    
    // 7. ROWID as id -> id as id
    const novo7 = conteudo.replace(/ROWID\s+as\s+id/gi, 'id as id');
    if (novo7 !== conteudo) {
        modificado = true;
        modificacoes++;
        conteudo = novo7;
    }
    
    if (modificado) {
        const backup = caminho + '.backup';
        fs.copyFileSync(caminho, backup);
        console.log('Backup:', arquivo + '.backup');
        
        fs.writeFileSync(caminho, conteudo, 'utf8');
        console.log('Modificado:', arquivo, '-', modificacoes, 'alteracoes');
        totalModificacoes += modificacoes;
    } else {
        console.log('Sem alteracoes:', arquivo);
    }
});

console.log('');
console.log('============================================');
console.log('MIGRACAO CONCLUIDA!');
console.log('Total de modificacoes:', totalModificacoes);
console.log('============================================');
console.log('');
console.log('IMPORTANTE:');
console.log('1. Verifique as alteracoes: git diff');
console.log('2. Teste com MariaDB/MySQL');
console.log('3. Se algo quebrar, restaure os .backup');
