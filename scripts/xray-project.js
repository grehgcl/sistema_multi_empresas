/**
 * ==========================================
 * X-RAY PROJECT - SEE&AGENDE / BARBEARIA
 * VERSÃO: 3.0 (Deep Scan)
 * ==========================================
 * 
 * Faz um raio-X completo no projeto, extraindo:
 * - Estado do Git
 * - Stack do Frontend
 * - Rotas reais do Express (router.get/post)
 * - Schema do Banco de Dados (SQLite dinâmico)
 * - Models, Controllers e Services
 * - Vazamento de Console.logs
 * 
 * USO: node scripts/xray-project.js
 * ==========================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ===== CONFIG =====
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORT_FILE = path.join(__dirname, 'XRAY_PROJETO.md');

// IGNORAR ESTAS PASTAS AO ESCANEAR (Evita travar o PC)
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

// ===== CORES =====
const colors = {
    reset: '\x1b[0m', bold: '\x1b[1m', green: '\x1b[32m',
    yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m',
    cyan: '\x1b[36m', red: '\x1b[31m', gray: '\x1b[90m'
};

function log(color, msg) { console.log(`${color}${msg}${colors.reset}`); }

// ===== HELPERS =====
function readFile(file) { try { return fs.readFileSync(file, 'utf-8'); } catch { return null; } }
function exists(file) { return fs.existsSync(file); }
function isDirectory(dir) { try { return fs.statSync(dir).isDirectory(); } catch { return false; } }

function walkDir(dir, pattern = /.*/, ignoreList = IGNORE_DIRS) {
    const results = [];
    if (!exists(dir)) return results;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (ignoreList.includes(item)) continue; // Pula pastas pesadas
        
        const fullPath = path.join(dir, item);
        if (isDirectory(fullPath)) {
            results.push(...walkDir(fullPath, pattern, ignoreList));
        } else if (pattern.test(item)) {
            results.push(fullPath);
        }
    }
    return results;
}

function extractRegexFromFile(filePath, regex) {
    const content = readFile(filePath);
    if (!content) return [];
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) matches.push(match);
    return matches;
}

// ===== ANALISADORES =====

function analyzeGit() {
    log(colors.cyan, '\n🔀 ANALISANDO ESTADO DO GIT...');
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
        const lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
        return { branch, lastCommit };
    } catch {
        return { branch: 'Não é um repositório Git', lastCommit: 'N/A' };
    }
}

function analyzeServer() {
    log(colors.cyan, '\n📦 ANALISANDO SERVER.JS...');
    const serverPath = path.join(PROJECT_ROOT, 'server.js');
    if (!exists(serverPath)) { log(colors.red, '❌ server.js não encontrado!'); return null; }
    
    const content = readFile(serverPath);
    
    // Rotas diretas no server.js
    const standardRoutes = extractRegexFromFile(serverPath, /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g)
        .map(m => ({ method: m[1].toUpperCase(), path: m[2] }));

    // Rotas com app.use e require (Mapeamento de pastas)
    const useRoutes = extractRegexFromFile(serverPath, /app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\)/g)
        .map(m => ({ method: 'USE', path: m[1], target: m[2] }));

    const middlewares = extractRegexFromFile(serverPath, /app\.use\s*\(\s*['"]([^'"]+)['"]/g).map(m => m[1]);
    const staticDirs = extractRegexFromFile(serverPath, /app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*express\.static/g).map(m => m[1]);
    
    return {
        routes: [...standardRoutes, ...useRoutes],
        middlewares: middlewares.filter(m => !m.includes('.') && !m.startsWith('/')),
        staticDirs,
        hasAuth: content.includes('auth'), 
        hasWhatsApp: content.includes('whatsapp') || content.includes('evolution'),
        hasAdmin: content.includes('admin'), 
        hasChatbot: content.includes('chatbot'), 
        hasFinanceiro: content.includes('financeiro')
    };
}

function analyzePublic() {
    log(colors.cyan, '\n📁 ANALISANDO PASTA PUBLIC/...');
    const publicDir = path.join(PROJECT_ROOT, 'public');
    if (!exists(publicDir)) return null;

    const htmlFiles = walkDir(publicDir, /\.html$/);
    const jsFiles = walkDir(publicDir, /\.js$/);
    const cssFiles = walkDir(publicDir, /\.css$/);
    
    let frontendStack = new Set();
    let pageStructure = {};

    for (const file of htmlFiles) {
        const relPath = path.relative(publicDir, file);
        const content = readFile(file);
        if (!content) continue;

        if (content.includes('jquery') || content.includes('jQuery')) frontendStack.add('jQuery');
        if (content.includes('bootstrap') || content.includes('Bootstrap')) frontendStack.add('Bootstrap');
        if (content.includes('axios')) frontendStack.add('Axios');
        if (content.includes('font-awesome') || content.includes('fa-')) frontendStack.add('Font Awesome');
        if (content.includes('tailwind')) frontendStack.add('Tailwind CSS');
        if (content.includes('sweetalert')) frontendStack.add('SweetAlert');

        const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
        const apiCalls = [...new Set((content.match(/['"]\/api\/[^'"]+['"]/g) || []).map(s => s.replace(/['"]/g, '')))];
        
        pageStructure[relPath] = { title: titleMatch ? titleMatch[1] : 'Sem título', apiCalls };
    }
    
    return { htmlFiles, jsFiles, cssFiles, frontendStack: [...frontendStack], pageStructure };
}

function analyzeDeepDB() {
    return new Promise((resolve) => {
        log(colors.cyan, '\n🗄️ ANALISANDO BANCO DE DADOS (AUTO-DETECT)...');
        
        // Procura dinamicamente qualquer arquivo .db
        const dbFiles = walkDir(PROJECT_ROOT, /\.db$/);
        const dbPath = dbFiles.length > 0 ? dbFiles[0] : null; 

        if (!dbPath) {
            const envContent = readFile(path.join(PROJECT_ROOT, '.env'));
            if (envContent && (envContent.includes('DATABASE_URL') || envContent.includes('PGHOST'))) {
                return resolve({ tables: [], dbFileName: 'PostgreSQL (.env)', error: 'Banco Postgres detectado. Schema não extraível via este script.' });
            }
            return resolve({ tables: [], dbFileName: 'Nenhum', error: 'Nenhum arquivo .db encontrado' });
        }

        // TENTA 1: better-sqlite3 (Muito comum em projetos novos)
        try {
            const Database = require('better-sqlite3');
            const db = Database(dbPath, { readonly: true });
            const rows = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").all();
            db.close();
            
            const tables = rows.filter(r => r.sql && r.sql.trim().startsWith('CREATE TABLE')).map(r => {
                const nameMatch = r.sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/i);
                return { name: nameMatch ? nameMatch[1] : 'Desconhecida', sql: r.sql.trim() };
            });
            if (tables.length > 0) return resolve({ tables, dbFileName: path.basename(dbPath), error: null });
        } catch (e) { /* Falhou, tenta a próxima */ }

        // TENTA 2: sqlite3 (O pacote clássico)
        try {
            const sqlite3Driver = require('sqlite3').verbose();
            const db = new sqlite3Driver.Database(dbPath, sqlite3Driver.OPEN_READONLY, (err) => {
                if (err) return resolve({ tables: [], dbFileName: path.basename(dbPath), error: 'Erro ao abrir com sqlite3' });
                
                db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';", [], (err, rows) => {
                    db.close();
                    if (err) return resolve({ tables: [], dbFileName: path.basename(dbPath), error: 'Erro na query sqlite3' });
                    
                    const tables = rows.filter(r => r.sql && r.sql.trim().startsWith('CREATE TABLE')).map(r => {
                        const nameMatch = r.sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/i);
                        return { name: nameMatch ? nameMatch[1] : 'Desconhecida', sql: r.sql.trim() };
                    });
                    resolve({ tables, dbFileName: path.basename(dbPath), error: null });
                });
            });
        } catch (e) {
             // Falhou as duas bibliotecas
             resolve({ 
                tables: [], 
                dbFileName: path.basename(dbPath), 
                error: 'Nenhum driver de SQLite (sqlite3 ou better-sqlite3) encontrado no package.json para ler o arquivo.' 
            });
        }
    });
}

function analyzeBackendFolder(folderName, filePattern = /\.js$/) {
    log(colors.cyan, `\n📂 ANALISANDO PASTA ${folderName.toUpperCase()}...`);
    const dir = path.join(PROJECT_ROOT, 'server', folderName);
    if (!exists(dir)) return null;

    const files = walkDir(dir, filePattern);
    const structure = {};

    for (const file of files) {
        const name = path.basename(file, '.js');
        
        // Pega exports.funcao = ...
        const functions = extractRegexFromFile(file, /exports\.\s*(\w+)\s*=/g).map(m => m[1]);
        const classes = extractRegexFromFile(file, /class\s+(\w+)/g).map(m => m[1]);
        
        // NOVIDADE: Pega rotas reais do Express (router.get('/rota', ...))
        const expressRoutes = extractRegexFromFile(file, /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g)
            .map(m => `${m[1].toUpperCase()} ${m[2]}`);

        structure[name] = { functions, classes, expressRoutes };
    }
    return structure;
}

function findCodeSmells() {
    log(colors.cyan, '\n🧹 PROCURANDO INDICADORES DE QUALIDADE...');
    const allJs = walkDir(PROJECT_ROOT, /\.js$/, ['node_modules']);
    let consoleLogs = 0;
    let todos = 0;

    allJs.forEach(file => {
        const content = readFile(file);
        if (content) {
            consoleLogs += (content.match(/console\.log\s*\(/g) || []).length;
            todos += (content.match(/\/\/\s*TODO/gi) || []).length;
        }
    });

    return { consoleLogs, todos, totalJsFiles: allJs.length };
}

function analyzeEnv() {
    log(colors.cyan, '\n🔐 ANALISANDO ARQUIVOS .ENV...');
    const envFiles = walkDir(PROJECT_ROOT, /^\.env/);
    const envVars = {};
    
    for (const file of envFiles) {
        const content = readFile(file);
        if (!content) continue;
        const vars = content.split('\n').filter(line => line.trim() && !line.startsWith('#')).map(line => {
            const [key, ...rest] = line.split('=');
            const isSensitive = /pass|secret|key|token|auth/i.test(key);
            return { key: key.trim(), value: isSensitive ? '***OCULTO***' : rest.join('=').trim() };
        });
        envVars[path.basename(file)] = vars;
    }
    return { envFiles, envVars };
}

function analyzePackageJson() {
    log(colors.cyan, '\n📦 ANALISANDO PACKAGE.JSON...');
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    if (!exists(pkgPath)) return null;
    try {
        const pkg = JSON.parse(readFile(pkgPath));
        return { 
            name: pkg.name, 
            version: pkg.version, 
            dependencies: Object.keys(pkg.dependencies || {}), 
            scripts: pkg.scripts || {} 
        };
    } catch { return null; }
}

// ===== GERAR RELATÓRIO =====

function generateReport(data) {
    let r = [];
    r.push('# 🔬 RAIO-X DO PROJETO (X-RAY)');
    r.push(`\n**Data:** ${new Date().toLocaleString('pt-BR')}`);
    r.push(`**Diretório:** ${PROJECT_ROOT}`);
    if (data.git) r.push(`**Git Branch:** \`${data.git.branch}\` | **Último Commit:** ${data.git.lastCommit}`);
    r.push('\n---\n');

    // 1. Visão Geral
    r.push('## 🧠 VISÃO GERAL E STACK');
    r.push(`- **Frontend Detectado:** ${data.public?.frontendStack.length ? data.public.frontendStack.join(', ') : 'Nenhum (Pode ser carregado via JS)'}`);
    r.push(`- **Backend Base:** Node.js + Express`);
    r.push(`- **Banco de Dados:** ${data.db?.dbFileName || 'Não identificado'} (${data.db?.tables?.length || 0} tabelas mapeadas)`);
    r.push(`- **Funcionalidades:** ${[
        data.server?.hasAuth ? '✅Auth' : '❌Auth', 
        data.server?.hasWhatsApp ? '✅WhatsApp' : '❌WhatsApp',
        data.server?.hasAdmin ? '✅Admin' : '❌Admin',
        data.server?.hasFinanceiro ? '✅Financeiro' : '❌Financeiro',
        data.server?.hasChatbot ? '✅Chatbot' : '❌Chatbot'
    ].join(' | ')}`);
    r.push('\n---\n');

    // 2. Banco de Dados
    r.push('## 🗄️ BANCO DE DADOS (ESQUEMA COMPLETO)');
    if (data.db?.tables?.length > 0) {
        data.db.tables.forEach(t => {
            r.push(`### Tabela: \`${t.name}\``);
            r.push('```sql');
            r.push(t.sql);
            r.push('```\n');
        });
    } else {
        r.push(`*${data.db?.error || 'Nenhum banco mapeado'}*\n`);
    }
    r.push('---\n');

    // 3. Rotas & Server.js
    if (data.server) {
        r.push('## 🛣️ SERVER.JS - ROTAS E CONFIGURAÇÕES');
        r.push('### Rotas no arquivo principal:');
        if (data.server.routes.length > 0) {
            data.server.routes.forEach(ro => {
                r.push(`- \`${ro.method.padEnd(6)} ${ro.path}\` ${ro.target ? `-> ${ro.target}` : ''}`);
            });
        } else { r.push('*Nenhuma rota direta (Tudo delegado para server/routes/)*'); }

        if (data.server.middlewares.length > 0 || data.server.staticDirs.length > 0) {
            r.push('\n### Configurações:');
            data.server.middlewares.forEach(m => r.push(`- Middleware: \`${m}\``));
            data.server.staticDirs.forEach(d => r.push(`- Estático: \`${d}\``));
        }
        r.push('\n---\n');
    }

    // 4. Arquitetura Backend
    const backendSections = [
        { key: 'routes', title: '📁 ROTAS DA API (server/routes/)' },
        { key: 'controllers', title: '🕹️ CONTROLLERS (server/controllers/)' },
        { key: 'services', title: '⚙️ SERVICES (server/services/)' },
        { key: 'models', title: '📊 MODELS (server/models/)' }
    ];

    backendSections.forEach(sec => {
        if (data[sec.key]) {
            r.push(`## ${sec.title}`);
            Object.entries(data[sec.key]).forEach(([name, info]) => {
                const details = [...info.functions, ...info.classes];
                let line = `- **${name}**`;
                if (details.length > 0) line += ` → [\`${details.join('`, `')}\`]`;
                r.push(line);
                
                // Imprime as rotas do Express indentadas
                if (info.expressRoutes && info.expressRoutes.length > 0) {
                    info.expressRoutes.forEach(route => r.push(`  - \`${route}\``));
                }
            });
            r.push('\n---\n');
        }
    });

    // 5. Frontend
    if (data.public) {
        r.push('## 🌐 PASTA PUBLIC/ (FRONTEND)');
        r.push(`**Estatísticas:** ${data.public.htmlFiles.length} HTML | ${data.public.jsFiles.length} JS | ${data.public.cssFiles.length} CSS\n`);
        r.push('### Páginas e dependências de API:');
        Object.entries(data.public.pageStructure).forEach(([p, info]) => {
            r.push(`#### ${p}`);
            r.push(`- **Título:** ${info.title}`);
            if (info.apiCalls.length > 0) {
                r.push(`- **Chamadas API:**`);
                info.apiCalls.forEach(api => r.push(`  - \`${api}\``));
            }
            r.push('');
        });
        r.push('---\n');
    }

    // 6. Variáveis de Ambiente
    if (data.env) {
        r.push('## 🔐 VARIÁVEIS DE AMBIENTE (.ENV)');
        Object.entries(data.env.envVars).forEach(([file, vars]) => {
            r.push(`### ${file}`);
            vars.forEach(v => r.push(`- ${v.key}=${v.value}`));
            r.push('');
        });
        r.push('---\n');
    }

    // 7. Código Smells
    if (data.smells) {
        r.push('## 🧹 INDICADORES DE QUALIDADE (CODE SMELLS)');
        r.push(`- **Total de arquivos JS escaneados:** ${data.smells.totalJsFiles}`);
        r.push(`- **Console.logs encontrados:** ${data.smells.consoleLogs} ${data.smells.consoleLogs > 50 ? '⚠️ (ALTO - Remover antes de prod)' : '✅ OK'}`);
        r.push(`- **TODOs no código:** ${data.smells.todos}`);
        r.push('\n---\n');
    }

    const reportContent = r.join('\n');
    fs.writeFileSync(REPORT_FILE, reportContent, 'utf-8');
    return reportContent;
}

// ===== EXECUTAR =====
async function analyze() {
    log(colors.magenta, '\n' + '='.repeat(60));
    log(colors.magenta, '  🔬 X-RAY PROJECT - SCAN INICIANDO');
    log(colors.magenta, '='.repeat(60));

    const data = {
        git: analyzeGit(),
        package: analyzePackageJson(),
        server: analyzeServer(),
        public: analyzePublic(),
        db: await analyzeDeepDB(), // <--- ADICIONE O AWAIT AQUI
        routes: analyzeBackendFolder('routes', /\.routes\.js$/),
        controllers: analyzeBackendFolder('controllers', /\.controller\.js$/),
        services: analyzeBackendFolder('services', /\.js$/),
        models: analyzeBackendFolder('models', /\.js$/),
        env: analyzeEnv(),
        smells: findCodeSmells()
    };

    log(colors.cyan, '\n📝 COMPILANDO RELATÓRIO X-RAY...');
    generateReport(data);

    log(colors.green, `\n✅ RELATÓRIO X-RAY GERADO!`);
    log(colors.blue, `📄 Arquivo: ${REPORT_FILE}`);
    
    if (data.db?.tables?.length > 0) log(colors.green, `🗄️  Schema do DB extraído com sucesso!`);
    
    if (data.smells?.consoleLogs > 50) {
        log(colors.yellow, `🧹 Alerta: ${data.smells.consoleLogs} console.logs encontrados!`);
    }

    log(colors.magenta, '\n' + '='.repeat(60) + '\n');
}

analyze();