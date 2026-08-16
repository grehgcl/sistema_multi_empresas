// ============================================
// SCRIPT: analisar-sistema-completo.js
// Executar: node analisar-sistema-completo.js
// ============================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 ===== ANÁLISE COMPLETA DO SISTEMA =====\n');

// ============================================
// 1. ANALISAR DEPENDÊNCIAS
// ============================================
console.log('📦 1. ANALISANDO DEPENDÊNCIAS...\n');

try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    console.log(`📊 Dependências: ${Object.keys(deps).length}`);
    console.log(`📊 DevDependencies: ${Object.keys(devDeps).length}`);

    // Verificar vulnerabilidades
    console.log('\n🔒 Verificando vulnerabilidades...');
    try {
        const audit = execSync('npm audit --json', { encoding: 'utf8' });
        const auditData = JSON.parse(audit);
        const vulns = auditData.metadata?.vulnerabilities || {};
        console.log(`  ✅ Críticas: ${vulns.critical || 0}`);
        console.log(`  ✅ Altas: ${vulns.high || 0}`);
        console.log(`  ✅ Médias: ${vulns.moderate || 0}`);
        console.log(`  ✅ Baixas: ${vulns.low || 0}`);
    } catch (e) {
        console.log('  ⚠️ Erro ao verificar vulnerabilidades');
    }
} catch (e) {
    console.log('❌ Erro ao ler package.json');
}

// ============================================
// 2. ANALISAR ARQUIVOS JS
// ============================================
console.log('\n📄 2. ANALISANDO ARQUIVOS JS...\n');

function analisarArquivoJS(caminho) {
    try {
        const conteudo = fs.readFileSync(caminho, 'utf8');
        const linhas = conteudo.split('\n').length;
        const funcoes = (conteudo.match(/function\s+\w+\s*\(/g) || []).length;
        const consoleLogs = (conteudo.match(/console\.log/g) || []).length;
        const tryCatch = (conteudo.match(/try\s*\{/g) || []).length;
        const comentarios = (conteudo.match(/\/\//g) || []).length;

        return { linhas, funcoes, consoleLogs, tryCatch, comentarios };
    } catch {
        return null;
    }
}

const arquivosJS = [
    'server.js',
    'server/routes/index.js',
    'server/routes/auth.routes.js',
    'server/routes/whatsapp.routes.js',
    'server/routes/admin.routes.js',
    'server/services/evolution-instances.js',
    'server/services/whatsapp.js',
    'server/config/database.js',
    'server/middlewares/auth.js',
    'public/js/ui.js',
    'public/js/pages/dashboard.js',
    'public/js/pages/agendamentos.js',
    'public/js/pages/clientes.js',
    'public/js/pages/servicos.js',
    'public/js/pages/financeiro.js',
    'public/js/pages/configuracoes.js',
    'public/js/pages/empresas.js',
    'public/js/pages/planos.js',
    'public/js/pages/whatsapp-config.js'
];

let totalLinhas = 0;
let totalFuncoes = 0;
let totalConsoleLogs = 0;
let totalTryCatch = 0;
let totalComentarios = 0;

for (const arquivo of arquivosJS) {
    if (fs.existsSync(arquivo)) {
        const stats = analisarArquivoJS(arquivo);
        if (stats) {
            totalLinhas += stats.linhas;
            totalFuncoes += stats.funcoes;
            totalConsoleLogs += stats.consoleLogs;
            totalTryCatch += stats.tryCatch;
            totalComentarios += stats.comentarios;
            console.log(`  ✅ ${arquivo}: ${stats.linhas} linhas, ${stats.funcoes} funções, ${stats.consoleLogs} console.log`);
        }
    } else {
        console.log(`  ❌ ${arquivo}: não encontrado`);
    }
}

console.log('\n📊 TOTAL:');
console.log(`  📄 Linhas: ${totalLinhas}`);
console.log(`  🔧 Funções: ${totalFuncoes}`);
console.log(`  📝 Console.log: ${totalConsoleLogs}`);
console.log(`  🛡️ Try/Catch: ${totalTryCatch}`);
console.log(`  💬 Comentários: ${totalComentarios}`);

// ============================================
// 3. ANALISAR BANCO DE DADOS
// ============================================
console.log('\n💾 3. ANALISANDO BANCO DE DADOS...\n');

const dbPath = 'database/barbearia.db';
if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`  📊 Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  📅 Última modificação: ${stats.mtime}`);

    // Verificar bancos de empresas
    const empresaDBs = fs.readdirSync('database').filter(f => f.startsWith('empresa_') && f.endsWith('.db'));
    console.log(`  📊 Bancos de empresas: ${empresaDBs.length}`);
    let totalEmpresaDBs = 0;
    for (const db of empresaDBs) {
        const dbStats = fs.statSync(path.join('database', db));
        totalEmpresaDBs += dbStats.size;
    }
    console.log(`  📊 Tamanho total empresas: ${(totalEmpresaDBs / 1024 / 1024).toFixed(2)} MB`);
} else {
    console.log('  ❌ Banco não encontrado');
}

// ============================================
// 4. ANALISAR VARIÁVEIS DE AMBIENTE
// ============================================
console.log('\n🔑 4. ANALISANDO VARIÁVEIS DE AMBIENTE...\n');

const envFiles = ['.env', '.env.local', '.env.dev'];
for (const env of envFiles) {
    if (fs.existsSync(env)) {
        const conteudo = fs.readFileSync(env, 'utf8');
        const linhas = conteudo.split('\n').filter(l => l.trim() && !l.startsWith('#'));
        console.log(`  ✅ ${env}: ${linhas.length} variáveis`);

        // Verificar variáveis importantes
        const temDB = conteudo.includes('DATABASE_URL');
        const temEvolution = conteudo.includes('EVOLUTION_API');
        const temJWT = conteudo.includes('JWT_SECRET');
        console.log(`     📊 DATABASE_URL: ${temDB ? '✅' : '❌'}`);
        console.log(`     📊 EVOLUTION_API: ${temEvolution ? '✅' : '❌'}`);
        console.log(`     📊 JWT_SECRET: ${temJWT ? '✅' : '❌'}`);
    } else {
        console.log(`  ❌ ${env}: não encontrado`);
    }
}

// ============================================
// 5. ANALISAR ARQUIVOS CSS
// ============================================
console.log('\n🎨 5. ANALISANDO ARQUIVOS CSS...\n');

const cssFiles = fs.readdirSync('public/css').filter(f => f.endsWith('.css'));
const cssPages = fs.readdirSync('public/css/pages').filter(f => f.endsWith('.css'));

let totalCSS = 0;
console.log(`  📊 CSS principal: ${cssFiles.length} arquivos`);
for (const css of cssFiles) {
    const stats = fs.statSync(path.join('public/css', css));
    totalCSS += stats.size;
    console.log(`     📄 ${css}: ${(stats.size / 1024).toFixed(1)} KB`);
}

console.log(`  📊 CSS páginas: ${cssPages.length} arquivos`);
for (const css of cssPages) {
    const stats = fs.statSync(path.join('public/css/pages', css));
    totalCSS += stats.size;
    console.log(`     📄 ${css}: ${(stats.size / 1024).toFixed(1)} KB`);
}
console.log(`  📊 Total CSS: ${(totalCSS / 1024).toFixed(1)} KB`);

// ============================================
// 6. RELATÓRIO FINAL
// ============================================
console.log('\n📊 ===== RELATÓRIO FINAL =====\n');

console.log('📦 DEPENDÊNCIAS:');
console.log(`  📊 Total: ${Object.keys(require('./package.json').dependencies || {}).length}`);
console.log('');

console.log('📄 CÓDIGO:');
console.log(`  📊 Linhas de código: ${totalLinhas}`);
console.log(`  📊 Funções: ${totalFuncoes}`);
console.log(`  📊 Console.log: ${totalConsoleLogs}`);
console.log('');

console.log('💾 BANCO:');
console.log(`  📊 Tamanho: ${fs.existsSync(dbPath) ? (fs.statSync(dbPath).size / 1024 / 1024).toFixed(2) : '0'} MB`);
console.log('');

console.log('🎨 CSS:');
console.log(`  📊 Total: ${(totalCSS / 1024).toFixed(1)} KB`);
console.log('');

console.log('🔑 AMBIENTE:');
const envCount = envFiles.filter(f => fs.existsSync(f)).length;
console.log(`  📊 Arquivos .env: ${envCount}`);
console.log('');

console.log('📋 SUGESTÕES:');
if (totalConsoleLogs > 50) {
    console.log('  ⚠️ Muitos console.log - remova em produção');
}
if (totalTryCatch < totalFuncoes * 0.3) {
    console.log('  ⚠️ Poucos try/catch - adicione tratamento de erros');
}
if (fs.existsSync('node_modules')) {
    const nodeSize = execSync('du -sh node_modules 2>/dev/null || echo "0"', { encoding: 'utf8' }).trim();
    console.log(`  📊 node_modules: ${nodeSize}`);
}
console.log('');

console.log('🔧 ===== FIM DA ANÁLISE =====');