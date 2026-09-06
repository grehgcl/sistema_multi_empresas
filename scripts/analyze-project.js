/**
 * ==========================================
 * ANALISADOR DE ESTRUTURA - SEE&AGENDE - V2.0
 * ULTIMA ATUALIZACAO: 24/08/2026
 * ==========================================
 * 
 * Este script analisa toda a estrutura do projeto
 * e gera um relatório detalhado com recomendações
 * para melhorias e próximo passo.
 * 
 * USO: node scripts/analyze-project.js
 * ==========================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// ===== CONFIG =====
const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORT_FILE = path.join(__dirname, 'ANALISE_PROJETO_V2.md');
const QUICK_REPORT_FILE = path.join(__dirname, 'QUICK_REPORT.md');

// ===== CORES =====
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m'
};

function log(color, msg) {
    console.log(`${color}${msg}${colors.reset}`);
}

// ===== HELPERS =====
function readFile(file) {
    try {
        return fs.readFileSync(file, 'utf-8');
    } catch {
        return null;
    }
}

function exists(file) {
    return fs.existsSync(file);
}

function isDirectory(dir) {
    try {
        return fs.statSync(dir).isDirectory();
    } catch {
        return false;
    }
}

function walkDir(dir, pattern = /.*/, maxDepth = 5, currentDepth = 0) {
    const results = [];
    if (!exists(dir) || currentDepth > maxDepth) return results;
    
    try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (item === 'node_modules' || item === '.git') continue;
            const fullPath = path.join(dir, item);
            if (isDirectory(fullPath)) {
                results.push(...walkDir(fullPath, pattern, maxDepth, currentDepth + 1));
            } else if (pattern.test(item)) {
                results.push(fullPath);
            }
        }
    } catch {
        // Ignore permission errors
    }
    return results;
}

function extractRoutes(content) {
    const routes = [];
    const regex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        routes.push({
            method: match[1].toUpperCase(),
            path: match[2],
            file: 'server.js'
        });
    }
    return routes;
}

function extractMiddlewares(content) {
    const middlewares = [];
    const regex = /app\.use\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        middlewares.push(match[1]);
    }
    return middlewares;
}

function extractSessionConfig(content) {
    const sessionMatch = content.match(/session\s*\(\s*\{([^}]+)\}/s);
    if (sessionMatch) {
        return sessionMatch[1].trim();
    }
    return null;
}

function extractDBConfig(content) {
    const dbMatch = content.match(/(sqlite3|postgres|pg|database|db)\s*[=:]/i);
    return dbMatch ? dbMatch[1] : null;
}

function extractAPIRoutes(content) {
    const routes = [];
    const regex = /['"]\/api\/[^'"]+['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        routes.push(match[0].replace(/['"]/g, ''));
    }
    return [...new Set(routes)];
}

// NOVO: Extrair modelos/schemas
function extractModels(content) {
    const models = [];
    const regex = /(?:model|schema|table|createTable)\s*['"]([^'"]+)['"]/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        models.push(match[1]);
    }
    return [...new Set(models)];
}

// NOVO: Extrair middleware de autenticação
function extractAuthMiddleware(content) {
    const authMiddles = [];
    const regex = /(?:isAuthenticated|auth|checkAuth|verifyToken|requireLogin|ensureAuth)\s*[=:]/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        authMiddles.push(match[0].trim());
    }
    return authMiddles;
}

// NOVO: Extrair rotas protegidas
function extractProtectedRoutes(content) {
    const protectedRoutes = [];
    const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:isAuthenticated|auth|verifyToken|requireLogin)/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        protectedRoutes.push({
            method: match[1].toUpperCase(),
            path: match[2],
            middleware: 'auth'
        });
    }
    return protectedRoutes;
}

// NOVO: Extrair níveis de usuário/roles
function extractUserRoles(content) {
    const roles = [];
    const regex = /(?:role|type|level|access)\s*['"]?([a-zA-Z_]+)['"]?/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        roles.push(match[1]);
    }
    return [...new Set(roles)];
}

// NOVO: Extrair configurações de VPS/Deploy
function extractDeployConfig(content) {
    const configs = {
        port: null,
        host: null,
        env: null,
        nginx: false,
        pm2: false,
        docker: false,
        ssl: false
    };
    
    const portMatch = content.match(/port\s*[=:]\s*(\d+)/i);
    if (portMatch) configs.port = portMatch[1];
    
    const hostMatch = content.match(/host\s*[=:]\s*['"]([^'"]+)['"]/i);
    if (hostMatch) configs.host = hostMatch[1];
    
    configs.nginx = content.includes('nginx');
    configs.pm2 = content.includes('pm2');
    configs.docker = content.includes('docker');
    configs.ssl = content.includes('ssl') || content.includes('https');
    
    return configs;
}

// NOVO: Análise de segurança básica
function analyzeSecurity(content) {
    const issues = [];
    const recommendations = [];
    
    // Verificar headers de segurança
    if (!content.includes('helmet')) {
        issues.push('Falta middleware Helmet para segurança de headers');
        recommendations.push('Instalar e configurar helmet: npm install helmet');
    }
    
    // Verificar CORS
    if (!content.includes('cors')) {
        issues.push('Falta configuração CORS');
        recommendations.push('Configurar CORS adequadamente');
    }
    
    // Verificar rate limiting
    if (!content.includes('rateLimit') && !content.includes('rate-limit')) {
        issues.push('Falta rate limiting para prevenir ataques de força bruta');
        recommendations.push('Implementar express-rate-limit');
    }
    
    // Verificar sanitização de entrada
    if (!content.includes('sanitize') && !content.includes('escape')) {
        issues.push('Falta sanitização de entrada de dados');
        recommendations.push('Usar express-validator ou similar');
    }
    
    return { issues, recommendations };
}

// NOVO: Análise de performance
function analyzePerformance(content, files) {
    const issues = [];
    const recommendations = [];
    const findings = {
        nPlusOne: false,
        noCaching: false,
        noIndexes: false,
        heavyQueries: false
    };
    
    // Verificar queries N+1
    if (content.includes('.find') && content.includes('.populate')) {
        findings.nPlusOne = true;
        issues.push('Possível query N+1 com populate');
        recommendations.push('Usar populate com select ou lean()');
    }
    
    // Verificar caching
    if (!content.includes('cache') && !content.includes('redis')) {
        findings.noCaching = true;
        issues.push('Sistema sem cache implementado');
        recommendations.push('Implementar Redis ou cache em memória');
    }
    
    // Verificar índices de banco
    const hasIndexes = content.includes('INDEX') || content.includes('index');
    if (!hasIndexes) {
        findings.noIndexes = true;
        issues.push('Possível falta de índices no banco de dados');
        recommendations.push('Adicionar índices nas colunas mais consultadas');
    }
    
    // Verificar queries sem limite
    if (content.includes('.find(') && !content.includes('.limit(')) {
        findings.heavyQueries = true;
        issues.push('Queries sem limite podem ser pesadas');
        recommendations.push('Adicionar .limit() e .skip() para paginação');
    }
    
    return { issues, recommendations, findings };
}

// NOVO: Análise de logs
function analyzeLogging(content) {
    const config = {
        hasWinston: content.includes('winston'),
        hasMorgan: content.includes('morgan'),
        hasLog: content.includes('console.log') || content.includes('logger'),
        logLevel: null
    };
    
    const levelMatch = content.match(/level\s*['"]?([a-zA-Z]+)['"]?/i);
    if (levelMatch) config.logLevel = levelMatch[1];
    
    return config;
}

// ===== ANALISADORES PRINCIPAIS =====

function analyzeServer() {
    log(colors.cyan, '\n📦 ANALISANDO SERVER.JS...');
    
    const serverPath = path.join(PROJECT_ROOT, 'server.js');
    if (!exists(serverPath)) {
        log(colors.red, '❌ server.js não encontrado!');
        return null;
    }
    
    const content = readFile(serverPath);
    if (!content) {
        log(colors.red, '❌ Não foi possível ler server.js');
        return null;
    }
    
    const routes = extractRoutes(content);
    const middlewares = extractMiddlewares(content);
    const sessionConfig = extractSessionConfig(content);
    const dbType = extractDBConfig(content);
    const apiRoutes = extractAPIRoutes(content);
    const models = extractModels(content);
    const authMiddleware = extractAuthMiddleware(content);
    const protectedRoutes = extractProtectedRoutes(content);
    const roles = extractUserRoles(content);
    const deployConfig = extractDeployConfig(content);
    const security = analyzeSecurity(content);
    const performance = analyzePerformance(content, [serverPath]);
    const logging = analyzeLogging(content);
    
    // Rotas de arquivos estáticos
    const staticDirs = [];
    const staticRegex = /app\.use\s*\(\s*['"]([^'"]+)['"]\s*,\s*express\.static/g;
    let match;
    while ((match = staticRegex.exec(content)) !== null) {
        staticDirs.push(match[1]);
    }
    
    return {
        routes,
        middlewares,
        sessionConfig,
        dbType,
        apiRoutes,
        staticDirs,
        models,
        authMiddleware,
        protectedRoutes,
        roles,
        deployConfig,
        security,
        performance,
        logging,
        hasAuth: content.includes('/api/auth') || content.includes('auth'),
        hasWhatsApp: content.includes('whatsapp') || content.includes('evolution'),
        hasAdmin: content.includes('/admin') || content.includes('super_admin'),
        hasChatbot: content.includes('chatbot'),
        hasFinanceiro: content.includes('financeiro'),
        hasWebhook: content.includes('webhook'),
        hasEmail: content.includes('email') || content.includes('nodemailer'),
        hasSMS: content.includes('twilio') || content.includes('sms')
    };
}

function analyzePackageJson() {
    log(colors.cyan, '\n📦 ANALISANDO PACKAGE.JSON...');
    
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    if (!exists(pkgPath)) {
        log(colors.red, '❌ package.json não encontrado!');
        return null;
    }
    
    try {
        const content = readFile(pkgPath);
        const pkg = JSON.parse(content);
        
        // Verificar dependências obsoletas (simples)
        const deps = pkg.dependencies || {};
        const outdated = [];
        for (const [name, version] of Object.entries(deps)) {
            if (version.startsWith('^') || version.startsWith('~')) {
                outdated.push({ name, version });
            }
        }
        
        return {
            name: pkg.name,
            version: pkg.version,
            dependencies: Object.keys(deps),
            devDependencies: Object.keys(pkg.devDependencies || {}),
            scripts: pkg.scripts || {},
            main: pkg.main || 'server.js',
            engines: pkg.engines || {},
            outdatedDependencies: outdated,
            totalDeps: Object.keys(deps).length
        };
    } catch {
        log(colors.red, '❌ Erro ao ler package.json');
        return null;
    }
}

function analyzePublic() {
    log(colors.cyan, '\n📁 ANALISANDO PASTA PUBLIC/...');
    
    const publicDir = path.join(PROJECT_ROOT, 'public');
    if (!exists(publicDir)) {
        log(colors.red, '❌ Pasta public/ não encontrada!');
        return null;
    }
    
    const htmlFiles = walkDir(publicDir, /\.html$/);
    const jsFiles = walkDir(publicDir, /\.js$/);
    const cssFiles = walkDir(publicDir, /\.css$/);
    const images = walkDir(publicDir, /\.(png|jpg|jpeg|gif|svg|webp)$/);
    
    // Páginas principais
    const pages = {
        index: exists(path.join(publicDir, 'index.html')),
        login: exists(path.join(publicDir, 'login.html')),
        dashboard: exists(path.join(publicDir, 'dashboard.html')),
        admin: exists(path.join(publicDir, 'admin', 'dashboard.html'))
    };
    
    // Estrutura de páginas
    const pageStructure = {};
    const navigationFlow = {};
    
    for (const file of htmlFiles) {
        const relPath = path.relative(publicDir, file);
        const content = readFile(file);
        if (content) {
            // Extrair título
            const titleMatch = content.match(/<title[^>]*>([^<]*)<\/title>/i);
            // Extrair scripts importados
            const scripts = content.match(/<script[^>]*src=["']([^"']*)["']/g) || [];
            // Extrair rotas de API usadas
            const apiCalls = content.match(/['"]\/api\/[^'"]+['"]/g) || [];
            // Extrair links para outras páginas
            const links = content.match(/<a[^>]*href=["']([^"']*)["']/g) || [];
            // Extrair formulários
            const forms = content.match(/<form[^>]*action=["']([^"']*)["']/g) || [];
            
            pageStructure[relPath] = {
                title: titleMatch ? titleMatch[1] : 'Sem título',
                scripts: scripts.map(s => s.match(/src=["']([^"']*)["']/)[1]),
                apiCalls: [...new Set(apiCalls.map(s => s.replace(/['"]/g, '')))],
                links: links.map(l => l.match(/href=["']([^"']*)["']/)[1]),
                forms: forms.map(f => f.match(/action=["']([^"']*)["']/)[1]),
                hasAuth: content.includes('login') || content.includes('auth') || content.includes('token'),
                hasDashboard: content.includes('dashboard') || content.includes('admin')
            };
        }
    }
    
    return {
        htmlFiles,
        jsFiles,
        cssFiles,
        images,
        pages,
        pageStructure,
        totalFiles: htmlFiles.length + jsFiles.length + cssFiles.length + images.length
    };
}

function analyzeRoutes() {
    log(colors.cyan, '\n📁 ANALISANDO PASTA SERVER/ROUTES/...');
    
    const routesDir = path.join(PROJECT_ROOT, 'server', 'routes');
    if (!exists(routesDir)) {
        log(colors.yellow, '⚠️ Pasta server/routes/ não encontrada!');
        return null;
    }
    
    const routeFiles = walkDir(routesDir, /\.routes\.js$/);
    const routes = {};
    let totalRoutes = 0;
    let protectedCount = 0;
    
    for (const file of routeFiles) {
        const content = readFile(file);
        if (content) {
            const name = path.basename(file);
            // Extrair rotas definidas
            const routeDefs = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g) || [];
            const protectedRoutes = extractProtectedRoutes(content);
            const authMiddleware = extractAuthMiddleware(content);
            
            routes[name] = {
                path: file,
                routes: routeDefs.map(r => {
                    const match = r.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/);
                    return match ? `${match[1].toUpperCase()} ${match[2]}` : r;
                }),
                protectedRoutes: protectedRoutes,
                hasAuth: authMiddleware.length > 0,
                totalRoutes: routeDefs.length,
                protectedCount: protectedRoutes.length
            };
            
            totalRoutes += routeDefs.length;
            protectedCount += protectedRoutes.length;
        }
    }
    
    return {
        files: routes,
        totalFiles: routeFiles.length,
        totalRoutes,
        protectedCount,
        protectedPercentage: totalRoutes > 0 ? Math.round((protectedCount / totalRoutes) * 100) : 0
    };
}

function analyzeServices() {
    log(colors.cyan, '\n📁 ANALISANDO PASTA SERVER/SERVICES/...');
    
    const servicesDir = path.join(PROJECT_ROOT, 'server', 'services');
    if (!exists(servicesDir)) {
        log(colors.yellow, '⚠️ Pasta server/services/ não encontrada!');
        return null;
    }
    
    const serviceFiles = walkDir(servicesDir, /\.js$/);
    const services = {};
    let totalFunctions = 0;
    
    for (const file of serviceFiles) {
        const name = path.basename(file, '.js');
        const content = readFile(file);
        if (content) {
            // Extrair funções exportadas
            const functions = content.match(/exports\.(\w+)/g) || [];
            // Extrair funções internas
            const internalFuncs = content.match(/function\s+(\w+)/g) || [];
            // Extrair chamadas de banco
            const dbCalls = content.match(/\.(find|findOne|insert|update|delete|save|create)/gi) || [];
            
            services[name] = {
                path: file,
                functions: functions.map(f => f.replace('exports.', '')),
                internalFunctions: internalFuncs.map(f => f.replace('function ', '')),
                dbCalls: dbCalls.length,
                hasDatabase: dbCalls.length > 0
            };
            
            totalFunctions += functions.length;
        }
    }
    
    return {
        files: services,
        totalFiles: serviceFiles.length,
        totalFunctions
    };
}

function analyzeDB() {
    log(colors.cyan, '\n🗄️ ANALISANDO BANCO DE DADOS...');
    
    const dbFiles = walkDir(PROJECT_ROOT, /\.db$/);
    const sqlFiles = walkDir(PROJECT_ROOT, /\.sql$/);
    
    // Verificar estrutura SQLite
    let sqliteTables = [];
    let tableSchemas = {};
    
    if (exists(path.join(PROJECT_ROOT, 'seeagende.db'))) {
        try {
            // Tabelas
            const output = execSync('sqlite3 seeagende.db ".tables"', { 
                cwd: PROJECT_ROOT, 
                encoding: 'utf-8' 
            });
            sqliteTables = output.trim().split(/\s+/);
            
            // Schema de cada tabela
            for (const table of sqliteTables) {
                try {
                    const schema = execSync(`sqlite3 seeagende.db "PRAGMA table_info(${table})"`, {
                        cwd: PROJECT_ROOT,
                        encoding: 'utf-8'
                    });
                    const columns = schema.trim().split('\n').map(line => {
                        const parts = line.split('|');
                        return {
                            name: parts[1],
                            type: parts[2],
                            nullable: parts[3] === '0' ? 'NOT NULL' : 'NULL',
                            default: parts[4] || null,
                            pk: parts[5] === '1'
                        };
                    });
                    tableSchemas[table] = columns;
                } catch {
                    // Skip
                }
            }
        } catch {
            log(colors.yellow, '⚠️ Não foi possível listar tabelas SQLite');
        }
    }
    
    // Verificar migrations
    const migrationsDir = path.join(PROJECT_ROOT, 'migrations');
    const hasMigrations = exists(migrationsDir);
    const migrationFiles = hasMigrations ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')) : [];
    
    // Verificar seeds
    const seedsDir = path.join(PROJECT_ROOT, 'seeds');
    const hasSeeds = exists(seedsDir);
    const seedFiles = hasSeeds ? fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')) : [];
    
    return {
        dbFiles,
        sqlFiles,
        sqliteTables,
        tableSchemas,
        hasMigrations,
        migrationFiles,
        hasSeeds,
        seedFiles,
        totalTables: sqliteTables.length,
        hasData: sqliteTables.length > 0
    };
}

function analyzeEnv() {
    log(colors.cyan, '\n🔐 ANALISANDO ARQUIVOS .ENV...');
    
    const envFiles = walkDir(PROJECT_ROOT, /^\.env/);
    const envVars = {};
    const requiredVars = [
        'PORT', 'NODE_ENV', 'SESSION_SECRET', 
        'DB_PATH', 'API_URL', 'JWT_SECRET'
    ];
    let missingVars = [];
    
    for (const file of envFiles) {
        const content = readFile(file);
        if (content) {
            const vars = content.split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => {
                    const [key, ...rest] = line.split('=');
                    return { key: key.trim(), value: rest.join('=').trim() };
                });
            envVars[path.basename(file)] = vars;
            
            // Verificar variáveis obrigatórias
            const keys = vars.map(v => v.key);
            const missing = requiredVars.filter(v => !keys.includes(v));
            if (missing.length > 0) {
                missingVars = [...new Set([...missingVars, ...missing])];
            }
        }
    }
    
    return { 
        envFiles, 
        envVars,
        missingVars,
        hasEnv: envFiles.length > 0
    };
}

function analyzeScripts() {
    log(colors.cyan, '\n📜 ANALISANDO PASTA SCRIPTS/...');
    
    const scriptsDir = path.join(PROJECT_ROOT, 'scripts');
    if (!exists(scriptsDir)) {
        log(colors.yellow, '⚠️ Pasta scripts/ não encontrada!');
        return null;
    }
    
    const scriptFiles = walkDir(scriptsDir, /\.js$/);
    const scripts = {};
    
    for (const file of scriptFiles) {
        const name = path.basename(file);
        const content = readFile(file);
        if (content) {
            // Verificar tipo de script
            const isMigration = content.includes('migrate') || content.includes('migration');
            const isVPS = content.includes('vps') || content.includes('VPS');
            const isBackup = content.includes('backup') || content.includes('dump');
            const isTest = content.includes('test') || content.includes('jest');
            const isSeed = content.includes('seed');
            
            // Extrair descrição
            const descMatch = content.match(/\/\*\*([^*]*)\*\//) || content.match(/\/\/\s*(.*)/);
            const description = descMatch ? descMatch[1].trim() : 'Sem descrição';
            
            // Extrair dependências
            const deps = content.match(/require\(['"]([^'"]+)['"]\)/g) || [];
            
            scripts[name] = {
                path: file,
                isMigration,
                isVPS,
                isBackup,
                isTest,
                isSeed,
                description: description.substring(0, 150),
                dependencies: deps.map(d => d.match(/['"]([^'"]+)['"]/)[1]),
                hasDatabaseAccess: content.includes('db') || content.includes('sqlite')
            };
        }
    }
    
    return scripts;
}

function analyzeProjectStructure() {
    log(colors.cyan, '\n📁 ANALISANDO ESTRUTURA DO PROJETO...');
    
    const structure = {
        hasServer: false,
        hasPublic: false,
        hasSrc: false,
        hasTests: false,
        hasDocs: false,
        hasDocker: false,
        hasCI: false,
        hasExamples: false
    };
    
    // Verificar diretórios principais
    structure.hasServer = exists(path.join(PROJECT_ROOT, 'server'));
    structure.hasPublic = exists(path.join(PROJECT_ROOT, 'public'));
    structure.hasSrc = exists(path.join(PROJECT_ROOT, 'src'));
    structure.hasTests = exists(path.join(PROJECT_ROOT, 'tests')) || exists(path.join(PROJECT_ROOT, 'test'));
    structure.hasDocs = exists(path.join(PROJECT_ROOT, 'docs'));
    structure.hasDocker = exists(path.join(PROJECT_ROOT, 'Dockerfile')) || exists(path.join(PROJECT_ROOT, 'docker-compose.yml'));
    structure.hasCI = exists(path.join(PROJECT_ROOT, '.github')) || exists(path.join(PROJECT_ROOT, '.gitlab-ci.yml'));
    structure.hasExamples = exists(path.join(PROJECT_ROOT, 'examples'));
    
    return structure;
}

// ===== GERADOR DE RECOMENDAÇÕES =====

function generateRecommendations(data) {
    const recommendations = {
        critical: [],
        high: [],
        medium: [],
        low: []
    };
    
    // 1. CRÍTICAS (Segurança e estabilidade)
    if (!data.env?.hasEnv) {
        recommendations.critical.push({
            area: 'Segurança',
            issue: 'Arquivo .env não encontrado',
            action: 'Criar arquivo .env com variáveis de ambiente',
            impact: 'Dados sensíveis podem estar expostos',
            time: '5 minutos'
        });
    }
    
    if (data.env?.missingVars?.length > 0) {
        recommendations.critical.push({
            area: 'Configuração',
            issue: `Variáveis de ambiente faltando: ${data.env.missingVars.join(', ')}`,
            action: 'Adicionar variáveis faltantes no .env',
            impact: 'Sistema pode não funcionar corretamente',
            time: '10 minutos'
        });
    }
    
    if (!data.server?.security?.issues?.length === 0) {
        recommendations.critical.push({
            area: 'Segurança',
            issue: 'Falta proteção de segurança básica',
            action: 'Implementar Helmet, CORS e rate limiting',
            impact: 'Sistema vulnerável a ataques',
            time: '30 minutos'
        });
    }
    
    // 2. ALTAS (Funcionalidade e usabilidade)
    if (!data.public?.pages?.login) {
        recommendations.high.push({
            area: 'Autenticação',
            issue: 'Página de login não encontrada',
            action: 'Criar public/login.html',
            impact: 'Usuários não podem acessar o sistema',
            time: '1 hora'
        });
    }
    
    if (!data.public?.pages?.dashboard) {
        recommendations.high.push({
            area: 'UX',
            issue: 'Dashboard principal não encontrado',
            action: 'Criar public/dashboard.html',
            impact: 'Usuários não têm visão geral do sistema',
            time: '2 horas'
        });
    }
    
    if (!data.public?.pages?.admin) {
        recommendations.high.push({
            area: 'Administração',
            issue: 'Painel Super Admin não encontrado',
            action: 'Criar public/admin/dashboard.html',
            impact: 'Administradores não têm controle total',
            time: '3 horas'
        });
    }
    
    if (data.server?.protectedRoutes?.length === 0 && data.server?.hasAuth) {
        recommendations.high.push({
            area: 'Segurança',
            issue: 'Nenhuma rota protegida encontrada',
            action: 'Adicionar middleware de autenticação nas rotas',
            impact: 'Dados sensíveis podem ser acessados sem login',
            time: '1 hora'
        });
    }
    
    // 3. MÉDIAS (Performance e otimização)
    if (data.server?.performance?.findings?.noCaching) {
        recommendations.medium.push({
            area: 'Performance',
            issue: 'Sistema sem cache',
            action: 'Implementar Redis ou cache em memória',
            impact: 'Respostas mais lentas e maior carga no servidor',
            time: '4 horas'
        });
    }
    
    if (data.server?.performance?.findings?.noIndexes) {
        recommendations.medium.push({
            area: 'Banco de Dados',
            issue: 'Possível falta de índices',
            action: 'Adicionar índices nas colunas mais consultadas',
            impact: 'Consultas lentas em tabelas grandes',
            time: '1 hora'
        });
    }
    
    if (!data.server?.logging?.hasWinston && !data.server?.logging?.hasMorgan) {
        recommendations.medium.push({
            area: 'Monitoramento',
            issue: 'Falta logging estruturado',
            action: 'Implementar Winston para logs e Morgan para requests',
            impact: 'Dificuldade em debug e monitoramento',
            time: '2 horas'
        });
    }
    
    // 4. BAIXAS (Melhorias e refatoração)
    if (data.package?.outdatedDependencies?.length > 5) {
        recommendations.low.push({
            area: 'Manutenção',
            issue: `${data.package.outdatedDependencies.length} dependências podem estar desatualizadas`,
            action: 'Atualizar dependências gradualmente',
            impact: 'Risco de segurança e incompatibilidades',
            time: '2 horas'
        });
    }
    
    if (!data.server?.deployConfig?.pm2) {
        recommendations.low.push({
            area: 'Deploy',
            issue: 'Falta configuração PM2',
            action: 'Configurar PM2 para gerenciar o processo',
            impact: 'Aplicação pode parar sem auto-reinício',
            time: '30 minutos'
        });
    }
    
    return recommendations;
}

// ===== GERADOR DE FLUXOS =====

function generateUserFlows(data) {
    const flows = [];
    
    // Fluxo de Login
    if (data.public?.pages?.login && data.public?.pages?.dashboard) {
        flows.push({
            name: 'Login e Acesso',
            steps: [
                'Usuário acessa /login.html',
                'Insere credenciais',
                'Sistema valida usuário',
                'Redireciona para /dashboard.html',
                'Carrega dados do usuário via API'
            ],
            pages: ['login.html', 'dashboard.html'],
            apis: ['/api/auth/login', '/api/user/profile']
        });
    }
    
    // Fluxo Admin
    if (data.public?.pages?.admin) {
        flows.push({
            name: 'Administração do Sistema',
            steps: [
                'Admin acessa /admin/dashboard.html',
                'Visualiza métricas do sistema',
                'Gerencia usuários',
                'Configura parâmetros do sistema'
            ],
            pages: ['admin/dashboard.html'],
            apis: ['/api/admin/stats', '/api/admin/users']
        });
    }
    
    // Fluxo WhatsApp (se existir)
    if (data.server?.hasWhatsApp) {
        flows.push({
            name: 'Integração WhatsApp',
            steps: [
                'Sistema conecta ao Evolution API',
                'Gerencia sessões WhatsApp',
                'Envia e recebe mensagens',
                'Processa interações com chatbot'
            ],
            pages: ['dashboard.html'],
            apis: ['/api/whatsapp/connect', '/api/whatsapp/send', '/api/whatsapp/webhook']
        });
    }
    
    return flows;
}

// ===== GERAR RELATÓRIO =====

function generateReport(data, recommendations, flows) {
    let report = [];
    
    report.push('# 📊 ANÁLISE COMPLETA DO PROJETO SEE&AGENDE - V2');
    report.push(`\n**Data da análise:** ${new Date().toLocaleString('pt-BR')}`);
    report.push(`**Diretório:** ${PROJECT_ROOT}`);
    report.push(`**Versão do Node:** ${process.version}`);
    report.push('---\n');
    
    // 1. RESUMO EXECUTIVO
    report.push('## 🎯 RESUMO EXECUTIVO');
    report.push('\n### Status do Sistema:');
    const status = [];
    if (data.server) status.push('✅ Servidor configurado');
    if (data.public) status.push('✅ Interface pública existente');
    if (data.db?.hasData) status.push('✅ Banco de dados configurado');
    if (data.env?.hasEnv) status.push('✅ Variáveis de ambiente configuradas');
    if (data.routes?.totalRoutes > 0) status.push('✅ Rotas definidas');
    
    if (status.length >= 5) {
        report.push('\n🟢 **Sistema bem estruturado e pronto para produção**');
    } else if (status.length >= 3) {
        report.push('\n🟡 **Sistema parcialmente configurado, algumas melhorias necessárias**');
    } else {
        report.push('\n🔴 **Sistema precisa de configuração básica**');
    }
    
    status.forEach(s => report.push(`- ${s}`));
    
    report.push('\n### Estatísticas Rápidas:');
    report.push(`- 📄 **Total de arquivos:** ${data.public?.totalFiles || 0} (públicos) + ${data.routes?.totalFiles || 0} (rotas)`);
    report.push(`- 🛣️ **Total de rotas API:** ${data.server?.routes?.length || 0}`);
    report.push(`- 🗄️ **Tabelas no banco:** ${data.db?.totalTables || 0}`);
    report.push(`- 🔐 **Rotas protegidas:** ${data.routes?.protectedCount || 0} (${data.routes?.protectedPercentage || 0}%)`);
    report.push(`- 📦 **Dependências:** ${data.package?.totalDeps || 0}`);
    report.push(`- 🚨 **Recomendações críticas:** ${recommendations.critical.length}`);
    report.push('\n---\n');
    
    // 2. DIAGRAMA DE ARQUITETURA
    report.push('## 🏗️ ARQUITETURA DO SISTEMA');
    report.push('\n```');
    report.push('┌─────────────────────────────────────────────────────┐');
    report.push('│               FRONTEND (Public/)                  │');
    report.push('├─────────────────────────────────────────────────────┤');
    report.push('│  index.html  │  login.html  │  dashboard.html     │');
    report.push('│  admin/      │  js/         │  css/               │');
    report.push('└─────────────────────────────────────────────────────┘');
    report.push('                         │');
    report.push('                         ▼');
    report.push('┌─────────────────────────────────────────────────────┐');
    report.push('│               API (server.js)                     │');
    report.push('├─────────────────────────────────────────────────────┤');
    report.push('│  Middlewares  │  Routes  │  Services  │  Models   │');
    report.push('└─────────────────────────────────────────────────────┘');
    report.push('                         │');
    report.push('                         ▼');
    report.push('┌─────────────────────────────────────────────────────┐');
    report.push('│              BANCO DE DADOS                       │');
    report.push('├─────────────────────────────────────────────────────┤');
    report.push(`│  ${data.db?.sqliteTables?.slice(0, 5).join(', ') || 'Nenhuma tabela encontrada'}  │`);
    report.push('└─────────────────────────────────────────────────────┘');
    report.push('```');
    report.push('\n---\n');
    
    // 3. FLUXOS DE USUÁRIO
    report.push('## 👤 FLUXOS DE USUÁRIO IDENTIFICADOS');
    if (flows.length > 0) {
        flows.forEach((flow, index) => {
            report.push(`\n### ${index + 1}. ${flow.name}`);
            report.push(`\n**Páginas envolvidas:** ${flow.pages.join(' → ')}`);
            report.push('\n**Passos:**');
            flow.steps.forEach(step => report.push(`  1. ${step}`));
            if (flow.apis) {
                report.push('\n**APIs utilizadas:**');
                flow.apis.forEach(api => report.push(`  - \`${api}\``));
            }
        });
    } else {
        report.push('\n⚠️ Nenhum fluxo de usuário identificado. Considere documentar os fluxos principais.');
    }
    report.push('\n---\n');
    
    // 4. RECOMENDAÇÕES PRIORIZADAS
    report.push('## 🚀 RECOMENDAÇÕES DE MELHORIA');
    
    if (recommendations.critical.length > 0) {
        report.push('\n### 🔴 CRÍTICAS (Resolver imediatamente)');
        recommendations.critical.forEach((rec, i) => {
            report.push(`\n**${i + 1}. ${rec.area}**`);
            report.push(`- **Problema:** ${rec.issue}`);
            report.push(`- **Ação:** ${rec.action}`);
            report.push(`- **Impacto:** ${rec.impact}`);
            report.push(`- **Tempo estimado:** ${rec.time}`);
        });
    }
    
    if (recommendations.high.length > 0) {
        report.push('\n### 🟡 PRIORIDADE ALTA (Próximas 24h)');
        recommendations.high.forEach((rec, i) => {
            report.push(`\n**${i + 1}. ${rec.area}**`);
            report.push(`- **Problema:** ${rec.issue}`);
            report.push(`- **Ação:** ${rec.action}`);
            report.push(`- **Impacto:** ${rec.impact}`);
            report.push(`- **Tempo estimado:** ${rec.time}`);
        });
    }
    
    if (recommendations.medium.length > 0) {
        report.push('\n### 🟠 PRIORIDADE MÉDIA (Esta semana)');
        recommendations.medium.forEach((rec, i) => {
            report.push(`\n**${i + 1}. ${rec.area}**`);
            report.push(`- **Problema:** ${rec.issue}`);
            report.push(`- **Ação:** ${rec.action}`);
            report.push(`- **Impacto:** ${rec.impact}`);
            report.push(`- **Tempo estimado:** ${rec.time}`);
        });
    }
    
    if (recommendations.low.length > 0) {
        report.push('\n### 🟢 PRIORIDADE BAIXA (Futuro)');
        recommendations.low.forEach((rec, i) => {
            report.push(`\n**${i + 1}. ${rec.area}**`);
            report.push(`- **Problema:** ${rec.issue}`);
            report.push(`- **Ação:** ${rec.action}`);
            report.push(`- **Impacto:** ${rec.impact}`);
            report.push(`- **Tempo estimado:** ${rec.time}`);
        });
    }
    report.push('\n---\n');
    
    // 5. ANÁLISE DETALHADA POR COMPONENTE
    report.push('## 🔍 ANÁLISE DETALHADA');
    
    // 5.1 Server
    if (data.server) {
        report.push('\n### 🚀 SERVER.JS');
        report.push(`- **Banco de Dados:** ${data.server.dbType || 'Não identificado'}`);
        report.push(`- **Autenticação:** ${data.server.hasAuth ? '✅ Sim' : '❌ Não'}`);
        report.push(`- **WhatsApp:** ${data.server.hasWhatsApp ? '✅ Sim' : '❌ Não'}`);
        report.push(`- **Chatbot:** ${data.server.hasChatbot ? '✅ Sim' : '❌ Não'}`);
        report.push(`- **Financeiro:** ${data.server.hasFinanceiro ? '✅ Sim' : '❌ Não'}`);
        report.push(`- **Email:** ${data.server.hasEmail ? '✅ Sim' : '❌ Não'}`);
        report.push(`- **Webhooks:** ${data.server.hasWebhook ? '✅ Sim' : '❌ Não'}`);
        
        if (data.server.roles.length > 0) {
            report.push(`\n**Níveis de usuário encontrados:** ${data.server.roles.join(', ')}`);
        }
        
        if (data.server.models.length > 0) {
            report.push(`\n**Modelos/Schemas:** ${data.server.models.join(', ')}`);
        }
        
        report.push(`\n**Rotas totais:** ${data.server.routes.length}`);
        report.push(`**Rotas protegidas:** ${data.server.protectedRoutes.length}`);
    }
    
    // 5.2 Rotas
    if (data.routes) {
        report.push('\n### 📁 ROTAS');
        report.push(`- **Arquivos de rota:** ${data.routes.totalFiles}`);
        report.push(`- **Total de rotas:** ${data.routes.totalRoutes}`);
        report.push(`- **Rotas protegidas:** ${data.routes.protectedCount} (${data.routes.protectedPercentage}%)`);
        
        // Top 5 arquivos de rota
        const topRoutes = Object.entries(data.routes.files)
            .sort((a, b) => b[1].totalRoutes - a[1].totalRoutes)
            .slice(0, 5);
        
        report.push('\n**Arquivos com mais rotas:**');
        topRoutes.forEach(([name, info]) => {
            report.push(`- ${name}: ${info.totalRoutes} rotas`);
        });
    }
    
    // 5.3 Banco de Dados
    if (data.db) {
        report.push('\n### 🗄️ BANCO DE DADOS');
        report.push(`- **Tabelas:** ${data.db.totalTables}`);
        report.push(`- **Migrations:** ${data.db.migrationFiles.length}`);
        report.push(`- **Seeds:** ${data.db.seedFiles.length}`);
        
        if (data.db.totalTables > 0) {
            report.push('\n**Estrutura das tabelas:**');
            Object.entries(data.db.tableSchemas).slice(0, 5).forEach(([table, columns]) => {
                report.push(`\n#### ${table}`);
                columns.forEach(col => {
                    const pk = col.pk ? '🔑 ' : '';
                    report.push(`- ${pk}${col.name}: ${col.type} ${col.nullable}`);
                });
            });
        }
    }
    
    // 5.4 Segurança
    if (data.server?.security) {
        report.push('\n### 🔐 SEGURANÇA');
        const security = data.server.security;
        if (security.issues.length === 0) {
            report.push('✅ Sem problemas de segurança identificados');
        } else {
            report.push('**Problemas encontrados:**');
            security.issues.forEach(issue => report.push(`- ⚠️ ${issue}`));
            report.push('\n**Recomendações:**');
            security.recommendations.forEach(rec => report.push(`- 💡 ${rec}`));
        }
    }
    
    // 5.5 Performance
    if (data.server?.performance) {
        report.push('\n### ⚡ PERFORMANCE');
        const perf = data.server.performance;
        if (perf.issues.length === 0) {
            report.push('✅ Sem problemas de performance identificados');
        } else {
            report.push('**Problemas encontrados:**');
            perf.issues.forEach(issue => report.push(`- ⚠️ ${issue}`));
            report.push('\n**Recomendações:**');
            perf.recommendations.forEach(rec => report.push(`- 💡 ${rec}`));
        }
    }
    
    // 5.6 Páginas Públicas
    if (data.public) {
        report.push('\n### 📄 PÁGINAS PÚBLICAS');
        report.push(`- **HTML:** ${data.public.htmlFiles.length}`);
        report.push(`- **JavaScript:** ${data.public.jsFiles.length}`);
        report.push(`- **CSS:** ${data.public.cssFiles.length}`);
        report.push(`- **Imagens:** ${data.public.images.length}`);
        
        report.push('\n**Páginas disponíveis:**');
        Object.entries(data.public.pages).forEach(([name, exists]) => {
            report.push(`- ${exists ? '✅' : '❌'} ${name}.html`);
        });
    }
    
    report.push('\n---\n');
    
    // 6. PRÓXIMOS PASSOS
    report.push('## 📋 PRÓXIMOS PASSOS SUGERIDOS');
    
    if (recommendations.critical.length > 0) {
        report.push('\n### Semana 1 - Resolver problemas críticos:');
        recommendations.critical.forEach((rec, i) => {
            report.push(`${i + 1}. ${rec.action}`);
        });
    }
    
    if (recommendations.high.length > 0) {
        report.push('\n### Semana 2 - Implementar funcionalidades essenciais:');
        recommendations.high.forEach((rec, i) => {
            report.push(`${i + 1}. ${rec.action}`);
        });
    }
    
    if (recommendations.medium.length > 0) {
        report.push('\n### Semana 3-4 - Otimizar e melhorar:');
        recommendations.medium.forEach((rec, i) => {
            report.push(`${i + 1}. ${rec.action}`);
        });
    }
    
    report.push('\n### Checklist de deploy:');
    const checklist = [
        ['Variáveis de ambiente configuradas', data.env?.hasEnv],
        ['Banco de dados configurado', data.db?.hasData],
        ['Páginas principais existentes', data.public?.pages?.login && data.public?.pages?.dashboard],
        ['Rotas protegidas', data.routes?.protectedCount > 0],
        ['Logs configurados', data.server?.logging?.hasWinston || data.server?.logging?.hasMorgan],
        ['Segurança básica', data.server?.security?.issues?.length === 0]
    ];
    
    checklist.forEach(([item, done]) => {
        report.push(`- ${done ? '✅' : '❌'} ${item}`);
    });
    
    // Salvar relatório
    const reportContent = report.join('\n');
    fs.writeFileSync(REPORT_FILE, reportContent, 'utf-8');
    
    // Salvar relatório rápido
    const quickReport = generateQuickReport(data, recommendations, flows);
    fs.writeFileSync(QUICK_REPORT_FILE, quickReport, 'utf-8');
    
    return reportContent;
}

function generateQuickReport(data, recommendations, flows) {
    const lines = [];
    
    lines.push('# 🚀 RELATÓRIO RÁPIDO - SEE&AGENDE');
    lines.push(`\n**Gerado em:** ${new Date().toLocaleString('pt-BR')}`);
    lines.push('\n## ⚡ STATUS DO SISTEMA');
    
    // Status geral
    const status = [];
    if (data.server) status.push('✅ Servidor OK');
    if (data.public) status.push('✅ Frontend OK');
    if (data.db?.hasData) status.push('✅ Banco OK');
    if (data.env?.hasEnv) status.push('✅ Env OK');
    if (data.routes?.totalRoutes > 0) status.push('✅ Rotas OK');
    
    if (status.length >= 5) lines.push('\n🟢 **Sistema pronto para produção**');
    else if (status.length >= 3) lines.push('\n🟡 **Sistema parcialmente pronto**');
    else lines.push('\n🔴 **Sistema precisa de configuração**');
    
    status.forEach(s => lines.push(`- ${s}`));
    
    lines.push('\n## 🎯 PRÓXIMOS PASSOS PRIORITÁRIOS');
    
    // Top 5 recomendações
    const allRecs = [
        ...recommendations.critical,
        ...recommendations.high,
        ...recommendations.medium
    ].slice(0, 5);
    
    allRecs.forEach((rec, i) => {
        const emoji = i < 2 ? '🔴' : i < 4 ? '🟡' : '🟢';
        lines.push(`\n${emoji} **${rec.area}**`);
        lines.push(`   ${rec.action} (${rec.time})`);
    });
    
    lines.push('\n## 📊 ESTATÍSTICAS RÁPIDAS');
    lines.push(`- Rotas: ${data.server?.routes?.length || 0}`);
    lines.push(`- Tabelas: ${data.db?.totalTables || 0}`);
    lines.push(`- Páginas: ${data.public?.htmlFiles?.length || 0}`);
    lines.push(`- Dependências: ${data.package?.totalDeps || 0}`);
    lines.push(`- Recomendações: ${recommendations.critical.length + recommendations.high.length + recommendations.medium.length}`);
    
    return lines.join('\n');
}

// ===== EXECUTAR ANÁLISE =====

function analyze() {
    log(colors.magenta, '\n' + '='.repeat(60));
    log(colors.magenta, '  🔍 ANALISANDO PROJETO SEE&AGENDE - V2.0');
    log(colors.magenta, '='.repeat(60));
    log(colors.gray, `  Data: ${new Date().toLocaleString('pt-BR')}`);
    log(colors.gray, `  Node: ${process.version}`);
    log(colors.magenta, '='.repeat(60));
    
    const data = {};
    
    // Executar análises
    data.server = analyzeServer();
    data.package = analyzePackageJson();
    data.public = analyzePublic();
    data.routes = analyzeRoutes();
    data.services = analyzeServices();
    data.scripts = analyzeScripts();
    data.db = analyzeDB();
    data.env = analyzeEnv();
    data.structure = analyzeProjectStructure();
    
    // Gerar recomendações
    log(colors.cyan, '\n💡 GERANDO RECOMENDAÇÕES...');
    const recommendations = generateRecommendations(data);
    
    // Gerar fluxos de usuário
    log(colors.cyan, '\n👤 GERANDO FLUXOS DE USUÁRIO...');
    const flows = generateUserFlows(data);
    
    // Gerar relatório
    log(colors.cyan, '\n📝 GERANDO RELATÓRIO...');
    const report = generateReport(data, recommendations, flows);
    
    // Resumo final
    log(colors.green, '\n✅ RELATÓRIO GERADO COM SUCESSO!');
    log(colors.blue, `📄 Relatório completo: ${REPORT_FILE}`);
    log(colors.blue, `📄 Relatório rápido: ${QUICK_REPORT_FILE}`);
    
    log(colors.green, '\n📊 RESUMO DA ANÁLISE:');
    log(colors.gray, `   - 🔴 ${recommendations.critical.length} problemas críticos`);
    log(colors.gray, `   - 🟡 ${recommendations.high.length} problemas de alta prioridade`);
    log(colors.gray, `   - 🟠 ${recommendations.medium.length} problemas de média prioridade`);
    log(colors.gray, `   - 🟢 ${recommendations.low.length} melhorias sugeridas`);
    
    log(colors.magenta, '\n' + '='.repeat(60));
    log(colors.magenta, '  🚀 ANÁLISE CONCLUÍDA!');
    log(colors.magenta, '='.repeat(60) + '\n');
    
    // Exibir próximos passos interativos
    showNextSteps(recommendations);
}

// ===== INTERAÇÃO COM USUÁRIO =====

function showNextSteps(recommendations) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log('\n🎯 PRÓXIMOS PASSOS RECOMENDADOS:');
    
    if (recommendations.critical.length > 0) {
        console.log(`\n${colors.bgRed}${colors.white}  🔴 1 - Resolver problemas críticos ${colors.reset}`);
        recommendations.critical.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec.action}`);
        });
    }
    
    if (recommendations.high.length > 0) {
        console.log(`\n${colors.bgYellow}${colors.white}  🟡 2 - Implementar funcionalidades essenciais ${colors.reset}`);
        recommendations.high.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec.action}`);
        });
    }
    
    if (recommendations.medium.length > 0) {
        console.log(`\n${colors.bgGreen}${colors.white}  🟢 3 - Otimizar e melhorar ${colors.reset}`);
        recommendations.medium.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec.action}`);
        });
    }
    
    console.log('\n📄 Consulte o relatório completo para mais detalhes.');
    console.log(`📁 ${REPORT_FILE}\n`);
    
    rl.close();
}

// ===== RODAR =====
analyze();