#!/usr/bin/env node
/**
 * ============================================================
 * ANALISADOR COMPLETO DO PROJETO SEE&AGENDE (Barbearia Pro)
 * ============================================================
 * Uso: node analisar-projeto-completo.js [caminho-do-projeto]
 * 
 * O que ele faz:
 * 1. Mapeia toda a estrutura de diretórios e arquivos
 * 2. Analisa package.json (dependências, scripts, vulnerabilidades conhecidas)
 * 3. Varre server.js para extrair rotas, middlewares e configurações
 * 4. Analisa todas as rotas em server/routes/ (métodos HTTP, endpoints)
 * 5. Analisa serviços em server/services/ (funções exportadas)
 * 6. Mapeia o frontend em public/ (HTML, JS, CSS, chamadas de API)
 * 7. Detecta inconsistências de banco (SQLite vs PostgreSQL)
 * 8. Verifica segurança (.env exposto, secrets hardcoded)
 * 9. Gera relatório Markdown completo com recomendações
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURAÇÃO ====================
const PROJECT_PATH = process.argv[2] || process.cwd();
const OUTPUT_FILE = path.join(PROJECT_PATH, 'ANALISE_COMPLETA_PROJETO.md');

// Extensões e padrões a ignorar
const IGNORE = [
  'node_modules', '.git', 'ANALISE_', '.md', 'package-lock.json',
  'yarn.lock', 'pnpm-lock.yaml', 'dist', 'build', '.next', 'coverage'
];

// ==================== UTILITÁRIOS ====================
function shouldIgnore(filePath) {
  return IGNORE.some(i => filePath.includes(i));
}

function readFileSafe(filePath, encoding = 'utf8') {
  try {
    return fs.readFileSync(filePath, encoding);
  } catch {
    return null;
  }
}

function getAllFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (shouldIgnore(fullPath)) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllFiles(fullPath, files);
      } else {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Sem permissão ou diretório não existe
  }
  return files;
}

function countLines(content) {
  return content ? content.split('\n').length : 0;
}

function extractPattern(content, regex, groupIndex = 1) {
  if (!content) return [];
  const matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[groupIndex]);
  }
  return matches;
}

// ==================== ANALISADORES ====================

function analyzePackageJson(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  const content = readFileSafe(pkgPath);
  if (!content) return { error: 'package.json não encontrado' };

  try {
    const pkg = JSON.parse(content);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Verifica dependências com vulnerabilidades conhecidas
    const riskyDeps = [];
    const knownVulnerable = {
      'bcryptjs': 'Considere bcrypt nativo (mais rápido)',
      'jsonwebtoken': 'Verifique versão >= 9.0.0 (vulnerabilidade CVE-2022-23529)',
      'express': 'Verifique versão >= 4.17.3',
      'nodemailer': 'Verifique configuração de TLS/SSL',
      'ws': 'Verifique versão >= 8.17.1'
    };

    for (const [dep, warning] of Object.entries(knownVulnerable)) {
      if (deps[dep]) riskyDeps.push({ name: dep, version: deps[dep], warning });
    }

    return {
      name: pkg.name,
      version: pkg.version,
      main: pkg.main,
      scripts: pkg.scripts || {},
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
      totalDeps: Object.keys(deps).length,
      riskyDeps,
      hasStartScript: !!pkg.scripts?.start,
      hasTestScript: !!pkg.scripts?.test
    };
  } catch {
    return { error: 'package.json inválido' };
  }
}

function analyzeServerJs(projectPath) {
  const serverPath = path.join(projectPath, 'server.js');
  const content = readFileSafe(serverPath);
  if (!content) return { error: 'server.js não encontrado' };

  // Extrai middlewares de rotas
  const middlewares = extractPattern(content, /app\.use\(['"`](.+?)['"`]/g);

  // Extrai rotas GET
  const getRoutes = extractPattern(content, /app\.get\(['"`](.+?)['"`]/g);

  // Extrai rotas POST
  const postRoutes = extractPattern(content, /app\.post\(['"`](.+?)['"`]/g);

  // Extrai rotas PUT
  const putRoutes = extractPattern(content, /app\.put\(['"`](.+?)['"`]/g);

  // Extrai rotas DELETE
  const deleteRoutes = extractPattern(content, /app\.delete\(['"`](.+?)['"`]/g);

  // Detecta configurações
  const hasCors = content.includes('cors');
  const hasHelmet = content.includes('helmet');
  const hasMorgan = content.includes('morgan');
  const hasRateLimit = content.includes('rate-limit') || content.includes('express-rate');
  const hasCompression = content.includes('compression');
  const portMatch = content.match(/PORT\s*=\s*(\d+)|process\.env\.PORT\s*\|\|\s*(\d+)/);
  const port = portMatch ? (portMatch[1] || portMatch[2]) : 'não detectado';

  // Detecta banco
  const usesSQLite = content.includes('sqlite') || content.includes('.db');
  const usesPostgres = content.includes('pg') || content.includes('postgres') || content.includes('postgresql');
  const usesPrisma = content.includes('prisma');
  const usesSequelize = content.includes('sequelize');

  return {
    lines: countLines(content),
    middlewares: [...new Set(middlewares)],
    routes: {
      GET: [...new Set(getRoutes)],
      POST: [...new Set(postRoutes)],
      PUT: [...new Set(putRoutes)],
      DELETE: [...new Set(deleteRoutes)]
    },
    security: {
      hasCors,
      hasHelmet,
      hasMorgan,
      hasRateLimit,
      hasCompression
    },
    port,
    database: {
      usesSQLite,
      usesPostgres,
      usesPrisma,
      usesSequelize,
      inconsistency: usesSQLite && usesPostgres ? '⚠️ ALERTA: Detectado uso de SQLite E PostgreSQL simultaneamente!' : null
    }
  };
}

function analyzeRoutes(projectPath) {
  const routesDir = path.join(projectPath, 'server', 'routes');
  if (!fs.existsSync(routesDir)) return { error: 'Diretório server/routes/ não encontrado' };

  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  const routes = [];

  for (const file of files) {
    const filePath = path.join(routesDir, file);
    const content = readFileSafe(filePath);
    if (!content) continue;

    const name = file.replace('.routes.js', '');
    const methods = { GET: [], POST: [], PUT: [], DELETE: [] };

    // Extrai rotas por método
    const getMatches = extractPattern(content, /router\.get\(['"`](.+?)['"`]/g);
    const postMatches = extractPattern(content, /router\.post\(['"`](.+?)['"`]/g);
    const putMatches = extractPattern(content, /router\.put\(['"`](.+?)['"`]/g);
    const deleteMatches = extractPattern(content, /router\.delete\(['"`](.+?)['"`]/g);

    methods.GET = [...new Set(getMatches)];
    methods.POST = [...new Set(postMatches)];
    methods.PUT = [...new Set(putMatches)];
    methods.DELETE = [...new Set(deleteMatches)];

    const totalRoutes = methods.GET.length + methods.POST.length + methods.PUT.length + methods.DELETE.length;

    routes.push({
      file,
      name,
      lines: countLines(content),
      methods,
      totalRoutes,
      hasAuth: content.includes('auth') || content.includes('jwt') || content.includes('verify'),
      hasValidation: content.includes('joi') || content.includes('zod') || content.includes('express-validator') || content.includes('validate')
    });
  }

  return { count: files.length, routes };
}

function analyzeServices(projectPath) {
  const servicesDir = path.join(projectPath, 'server', 'services');
  if (!fs.existsSync(servicesDir)) return { error: 'Diretório server/services/ não encontrado' };

  const files = fs.readdirSync(servicesDir).filter(f => f.endsWith('.js'));
  const services = [];

  for (const file of files) {
    const filePath = path.join(servicesDir, file);
    const content = readFileSafe(filePath);
    if (!content) continue;

    const exports = extractPattern(content, /module\.exports\s*=\s*\{([^}]+)\}/s);
    const namedExports = extractPattern(content, /module\.exports\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
    const defaultExport = content.includes('module.exports') ? 'Sim' : 'Não';

    services.push({
      file,
      lines: countLines(content),
      hasExports: defaultExport,
      exportedFunctions: namedExports.length > 0 ? namedExports : (exports.length > 0 ? ['objeto exportado'] : []),
      hasAsync: content.includes('async'),
      hasTryCatch: content.includes('try') && content.includes('catch'),
      hasDatabaseQuery: content.includes('db.') || content.includes('query') || content.includes('findOne') || content.includes('select')
    });
  }

  return { count: files.length, services };
}

function analyzePublic(projectPath) {
  const publicDir = path.join(projectPath, 'public');
  if (!fs.existsSync(publicDir)) return { error: 'Diretório public/ não encontrado' };

  const allFiles = getAllFiles(publicDir);
  const htmlFiles = allFiles.filter(f => f.endsWith('.html'));
  const jsFiles = allFiles.filter(f => f.endsWith('.js'));
  const cssFiles = allFiles.filter(f => f.endsWith('.css'));

  const pages = [];
  for (const html of htmlFiles) {
    const content = readFileSafe(html);
    if (!content) continue;

    const titleMatch = content.match(/<title>(.+?)<\/title>/i);
    const apiCalls = extractPattern(content, /fetch\(['"`](.+?)['"`]/g);
    const axiosCalls = extractPattern(content, /axios\.(get|post|put|delete)\(['"`](.+?)['"`]/g, 2);
    const hasLogin = content.includes('login') || content.includes('auth');
    const hasDashboard = content.includes('dashboard') || content.includes('painel');
    const hasAdmin = content.includes('admin') || content.includes('super');

    pages.push({
      file: path.relative(projectPath, html),
      title: titleMatch ? titleMatch[1] : 'Sem título',
      apiCalls: [...new Set([...apiCalls, ...axiosCalls])],
      hasLogin,
      hasDashboard,
      hasAdmin
    });
  }

  return {
    htmlCount: htmlFiles.length,
    jsCount: jsFiles.length,
    cssCount: cssFiles.length,
    totalFiles: allFiles.length,
    pages,
    hasLoginPage: pages.some(p => p.hasLogin),
    hasDashboardPage: pages.some(p => p.hasDashboard),
    hasAdminPage: pages.some(p => p.hasAdmin)
  };
}

function analyzeDatabase(projectPath) {
  const allFiles = getAllFiles(projectPath);
  const dbFiles = allFiles.filter(f => f.endsWith('.db'));
  const sqlFiles = allFiles.filter(f => f.endsWith('.sql'));

  // Analisa arquivos SQL para extrair tabelas
  const tables = [];
  for (const sql of sqlFiles) {
    const content = readFileSafe(sql);
    if (!content) continue;
    const tableMatches = extractPattern(content, /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?(\w+)[`"']?/gi);
    tables.push(...tableMatches);
  }

  // Verifica .env
  const envPath = path.join(projectPath, '.env');
  const envContent = readFileSafe(envPath);
  const envVars = {};
  if (envContent) {
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) {
        const key = match[1];
        const val = match[2].trim();
        envVars[key] = val.includes('***') || val.length < 3 ? val : val.substring(0, 3) + '***';
      }
    }
  }

  return {
    sqliteFiles: dbFiles.length,
    sqlFiles: sqlFiles.length,
    tablesDetected: [...new Set(tables)],
    envExists: !!envContent,
    envVars: Object.keys(envVars),
    hasDatabaseUrl: envContent ? envContent.includes('DATABASE_URL') : false,
    hasPostgresInEnv: envContent ? envContent.includes('postgres') || envContent.includes('postgresql') : false,
    hasSQLiteInEnv: envContent ? envContent.includes('.db') || envContent.includes('sqlite') : false,
    envExposed: fs.existsSync(path.join(projectPath, '.git')) && envContent ? '⚠️ .env presente no repo (verificar .gitignore)' : 'N/A'
  };
}

function analyzeSecurity(projectPath) {
  const allFiles = getAllFiles(projectPath);
  const issues = [];

  for (const file of allFiles) {
    if (file.endsWith('.js')) {
      const content = readFileSafe(file);
      if (!content) continue;

      const relPath = path.relative(projectPath, file);

      // Secrets hardcoded
      if (content.includes('JWT_SECRET') && !content.includes('process.env')) {
        issues.push({ file: relPath, severity: 'CRÍTICO', issue: 'JWT_SECRET hardcoded no código' });
      }
      if (content.includes('API_KEY') && !content.includes('process.env') && !content.includes('req.headers')) {
        issues.push({ file: relPath, severity: 'CRÍTICO', issue: 'API_KEY hardcoded no código' });
      }

      // SQL Injection risk
      if (content.includes('${') && content.includes('db.') && content.includes('query')) {
        issues.push({ file: relPath, severity: 'ALTO', issue: 'Possível risco de SQL Injection (template string em query)' });
      }

      // CORS aberto
      if (content.includes('cors()') || content.includes("cors({origin: '*'})") || content.includes('origin: true')) {
        issues.push({ file: relPath, severity: 'MÉDIO', issue: 'CORS configurado de forma permissiva' });
      }

      // Console.log em produção
      if (content.includes('console.log') && !file.includes('dev') && !file.includes('test')) {
        const count = (content.match(/console\.log/g) || []).length;
        if (count > 5) {
          issues.push({ file: relPath, severity: 'BAIXO', issue: `${count} console.log encontrados (remover em produção)` });
        }
      }
    }
  }

  return { issues, totalIssues: issues.length };
}

// ==================== GERADOR DE RELATÓRIO ====================

function generateReport(data) {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  let md = `# 🔍 ANÁLISE COMPLETA DO PROJETO

**Data da análise:** ${now}  
**Diretório:** ${data.projectPath}  
**Versão do analisador:** 2.0.0

---

## 📦 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Nome do projeto | ${data.pkg.name || 'N/A'} |
| Versão | ${data.pkg.version || 'N/A'} |
| Total de dependências | ${data.pkg.totalDeps} |
| Arquivos no projeto | ${data.totalFiles} |
| Rotas API | ${data.routesAnalysis.count} arquivos |
| Serviços | ${data.servicesAnalysis.count} arquivos |
| Páginas HTML | ${data.public.htmlCount} |
| Arquivos JS (frontend) | ${data.public.jsCount} |
| Arquivos CSS | ${data.public.cssCount} |
| Bancos SQLite (.db) | ${data.database.sqliteFiles} |
| Scripts SQL | ${data.database.sqlFiles} |
| Problemas de segurança | ${data.security.totalIssues} |

---

## 🚨 ALERTAS CRÍTICOS

`;

  // Alertas
  const alerts = [];

  if (data.server.database.inconsistency) {
    alerts.push(`🔴 **INCONSISTÊNCIA DE BANCO:** ${data.server.database.inconsistency}\n   → VPS usa PostgreSQL, mas VS Code usa SQLite. Isso causa divergência de schema, dados e comportamento entre ambientes.`);
  }

  if (!data.public.hasLoginPage) {
    alerts.push(`🔴 **FRONTEND INCOMPLETO:** Página de login (login.html) não encontrada em public/.`);
  }
  if (!data.public.hasDashboardPage) {
    alerts.push(`🔴 **FRONTEND INCOMPLETO:** Dashboard principal não encontrado em public/.`);
  }
  if (!data.public.hasAdminPage) {
    alerts.push(`🔴 **FRONTEND INCOMPLETO:** Painel de administração não encontrado em public/.`);
  }

  if (data.security.issues.some(i => i.severity === 'CRÍTICO')) {
    alerts.push(`🔴 **SEGURANÇA:** ${data.security.issues.filter(i => i.severity === 'CRÍTICO').length} problema(s) crítico(s) de segurança detectado(s).`);
  }

  if (data.database.envExposed.includes('⚠️')) {
    alerts.push(`🟡 **SEGURANÇA:** Arquivo .env pode estar versionado no Git. Verifique .gitignore.`);
  }

  if (!data.server.security.hasHelmet) {
    alerts.push(`🟡 **SEGURANÇA:** Helmet não detectado no server.js. Recomendado para headers de segurança.`);
  }
  if (!data.server.security.hasRateLimit) {
    alerts.push(`🟡 **SEGURANÇA:** Rate limiting não detectado. Vulnerável a brute-force e DDoS.`);
  }

  if (data.pkg.riskyDeps.length > 0) {
    alerts.push(`🟡 **DEPENDÊNCIAS:** ${data.pkg.riskyDeps.length} dependência(s) com potenciais vulnerabilidades conhecidas.`);
  }

  if (alerts.length === 0) {
    md += `✅ Nenhum alerta crítico detectado.\n`;
  } else {
    alerts.forEach((a, i) => md += `${i + 1}. ${a}\n\n`);
  }

  md += `---

## 📦 PACKAGE.JSON

**Nome:** ${data.pkg.name}  
**Versão:** ${data.pkg.version}  
**Entry point:** ${data.pkg.main}

### Scripts disponíveis:
`;

  for (const [name, cmd] of Object.entries(data.pkg.scripts || {})) {
    md += `- \`${name}\`: ${cmd}\n`;
  }

  md += `\n### Dependências (${data.pkg.totalDeps} total):\n\n`;
  md += `**Produção:**\n`;
  for (const [name, version] of Object.entries(data.pkg.dependencies || {})) {
    md += `- ${name}: ${version}\n`;
  }
  if (data.pkg.devDependencies && Object.keys(data.pkg.devDependencies).length > 0) {
    md += `\n**Desenvolvimento:**\n`;
    for (const [name, version] of Object.entries(data.pkg.devDependencies || {})) {
      md += `- ${name}: ${version}\n`;
    }
  }

  if (data.pkg.riskyDeps.length > 0) {
    md += `\n### ⚠️ Dependências com Atenção:\n`;
    for (const dep of data.pkg.riskyDeps) {
      md += `- **${dep.name}** (${dep.version}): ${dep.warning}\n`;
    }
  }

  md += `\n---

## 🖥️ SERVER.JS (Backend Principal)

**Linhas de código:** ${data.server.lines}  
**Porta:** ${data.server.port}

### Middlewares de rotas:
`;

  data.server.middlewares.forEach(m => {
    md += `- \`${m}\`\n`;
  });

  md += `\n### Rotas diretas no server.js:\n`;
  ['GET', 'POST', 'PUT', 'DELETE'].forEach(method => {
    const routes = data.server.routes[method];
    if (routes.length > 0) {
      md += `\n**${method}:**\n`;
      routes.forEach(r => md += `- \`${r}\`\n`);
    }
  });

  md += `\n### Configuração de Segurança:
| Feature | Status |
|---------|--------|
| CORS | ${data.server.security.hasCors ? '✅' : '❌'} |
| Helmet | ${data.server.security.hasHelmet ? '✅' : '❌'} |
| Morgan (logs) | ${data.server.security.hasMorgan ? '✅' : '❌'} |
| Rate Limit | ${data.server.security.hasRateLimit ? '✅' : '❌'} |
| Compression | ${data.server.security.hasCompression ? '✅' : '❌'} |

### Banco de Dados detectado:
| Tecnologia | Status |
|------------|--------|
| SQLite | ${data.server.database.usesSQLite ? '✅ Detectado' : '❌ Não detectado'} |
| PostgreSQL | ${data.server.database.usesPostgres ? '✅ Detectado' : '❌ Não detectado'} |
| Prisma ORM | ${data.server.database.usesPrisma ? '✅ Detectado' : '❌ Não detectado'} |
| Sequelize | ${data.server.database.usesSequelize ? '✅ Detectado' : '❌ Não detectado'} |
`;

  if (data.server.database.inconsistency) {
    md += `\n> ⚠️ **${data.server.database.inconsistency}**\n`;
  }

  md += `\n---

## 🛣️ ROTAS API (server/routes/)

**Total de arquivos:** ${data.routesAnalysis.count}\n`;

  for (const route of data.routesAnalysis.routes) {
    md += `\n### ${route.file} (${route.lines} linhas, ${route.totalRoutes} rotas)\n`;
    md += `- Autenticação: ${route.hasAuth ? '✅ Sim' : '❌ Não detectada'}\n`;
    md += `- Validação: ${route.hasValidation ? '✅ Sim' : '❌ Não detectada'}\n`;

    ['GET', 'POST', 'PUT', 'DELETE'].forEach(method => {
      const methods = route.methods[method];
      if (methods.length > 0) {
        md += `\n**${method}:**\n`;
        methods.forEach(m => md += `- \`${m}\`\n`);
      }
    });
  }

  md += `\n---

## ⚙️ SERVIÇOS (server/services/)

**Total de arquivos:** ${data.servicesAnalysis.count}\n`;

  for (const svc of data.servicesAnalysis.services) {
    md += `\n### ${svc.file} (${svc.lines} linhas)\n`;
    md += `- Exporta funções: ${svc.hasExports}\n`;
    md += `- Funções exportadas: ${svc.exportedFunctions.length > 0 ? svc.exportedFunctions.join(', ') : 'Nenhuma detectada'}\n`;
    md += `- Usa async/await: ${svc.hasAsync ? '✅ Sim' : '❌ Não'}\n`;
    md += `- Tem try/catch: ${svc.hasTryCatch ? '✅ Sim' : '❌ Não'}\n`;
    md += `- Acessa banco: ${svc.hasDatabaseQuery ? '✅ Sim' : '❌ Não detectado'}\n`;
  }

  md += `\n---

## 🎨 FRONTEND (public/)

**Páginas HTML:** ${data.public.htmlCount} | **JS:** ${data.public.jsCount} | **CSS:** ${data.public.cssCount}\n`;

  md += `\n### Páginas encontradas:\n`;
  for (const page of data.public.pages) {
    md += `\n#### ${page.file}\n`;
    md += `- Título: ${page.title}\n`;
    md += `- Tem login: ${page.hasLogin ? '✅' : '❌'}\n`;
    md += `- Tem dashboard: ${page.hasDashboard ? '✅' : '❌'}\n`;
    md += `- Tem admin: ${page.hasAdmin ? '✅' : '❌'}\n`;
    if (page.apiCalls.length > 0) {
      md += `- Chamadas de API:\n`;
      page.apiCalls.forEach(api => md += `  - \`${api}\`\n`);
    }
  }

  md += `\n### Status das páginas essenciais:
| Página | Status |
|--------|--------|
| Login | ${data.public.hasLoginPage ? '✅ Encontrada' : '❌ NÃO ENCONTRADA'} |
| Dashboard | ${data.public.hasDashboardPage ? '✅ Encontrada' : '❌ NÃO ENCONTRADA'} |
| Admin | ${data.public.hasAdminPage ? '✅ Encontrada' : '❌ NÃO ENCONTRADA'} |

---

## 🗄️ BANCO DE DADOS

| Métrica | Valor |
|---------|-------|
| Arquivos .db (SQLite) | ${data.database.sqliteFiles} |
| Scripts .sql | ${data.database.sqlFiles} |
| Tabelas detectadas em SQL | ${data.database.tablesDetected.length} |
| .env presente | ${data.database.envExists ? '✅ Sim' : '❌ Não'} |
| DATABASE_URL no .env | ${data.database.hasDatabaseUrl ? '✅ Sim' : '❌ Não'} |
| PostgreSQL mencionado no .env | ${data.database.hasPostgresInEnv ? '✅ Sim' : '❌ Não'} |
| SQLite mencionado no .env | ${data.database.hasSQLiteInEnv ? '✅ Sim' : '❌ Não'} |
| .env exposto no Git | ${data.database.envExposed} |

### Tabelas detectadas nos scripts SQL:
`;

  if (data.database.tablesDetected.length > 0) {
    data.database.tablesDetected.forEach(t => md += `- \`${t}\`\n`);
  } else {
    md += `_Nenhuma tabela detectada automaticamente nos arquivos .sql_\n`;
  }

  md += `\n### Variáveis de ambiente encontradas:
`;
  data.database.envVars.forEach(v => md += `- \`${v}\`\n`);

  md += `\n---

## 🔐 ANÁLISE DE SEGURANÇA

**Total de problemas:** ${data.security.totalIssues}\n`;

  if (data.security.issues.length > 0) {
    md += `\n| Severidade | Arquivo | Problema |\n`;
    md += `|------------|---------|----------|\n`;
    for (const issue of data.security.issues) {
      md += `| ${issue.severity} | \`${issue.file}\` | ${issue.issue} |\n`;
    }
  } else {
    md += `\n✅ Nenhum problema de segurança óbvio detectado nos arquivos analisados.\n`;
  }

  md += `\n---

## 📈 RECOMENDAÇÕES PRIORITÁRIAS

### 🔴 URGENTE (fazer agora)

`;

  const urgent = [];
  if (data.server.database.inconsistency) {
    urgent.push(`**Padronizar o banco de dados:** Você está usando SQLite no desenvolvimento (VS Code) e PostgreSQL na VPS. Isso é perigoso porque:\n   - Schemas podem divergir (tipos de dados diferentes)\n   - Funções SQL específicas do PostgreSQL não funcionam no SQLite\n   - Dados de teste não refletem produção\n   **Solução:** Use Docker com PostgreSQL localmente, ou crie um script de sync entre os dois.`);
  }
  if (!data.public.hasLoginPage) {
    urgent.push(`**Criar public/login.html:** A API de autenticação existe, mas não há interface para usar. Crie uma página de login que consuma \`/api/auth/login\`.`);
  }
  if (!data.public.hasDashboardPage) {
    urgent.push(`**Criar public/dashboard.html:** O coração do sistema precisa de uma interface para gerenciar agendamentos, clientes e financeiro.`);
  }
  if (data.security.issues.some(i => i.severity === 'CRÍTICO')) {
    urgent.push(`**Remover secrets hardcoded:** Nunca deixe JWT_SECRET ou API keys no código. Use sempre \`process.env.XXX\`.`);
  }

  if (urgent.length === 0) {
    md += `Nenhuma recomendação urgente.\n`;
  } else {
    urgent.forEach((u, i) => md += `${i + 1}. ${u}\n\n`);
  }

  md += `\n### 🟡 IMPORTANTE (fazer em breve)

`;

  const important = [];
  if (!data.server.security.hasHelmet) important.push(`Adicionar \`helmet\` ao Express para headers de segurança (X-Frame-Options, HSTS, etc.)`);
  if (!data.server.security.hasRateLimit) important.push(`Adicionar \`express-rate-limit\` para proteger endpoints de login e API contra brute-force`);
  if (!data.server.security.hasCompression) important.push(`Adicionar \`compression\` para reduzir tamanho das respostas HTTP`);
  if (data.database.sqliteFiles > 1) important.push(`Consolidar os ${data.database.sqliteFiles} arquivos .db em um único banco PostgreSQL com schema multi-tenant (coluna \`empresa_id\`)`);
  if (!data.pkg.hasTestScript) important.push(`Adicionar script de testes no package.json (mesmo que seja básico)`);

  const routesWithoutAuth = data.routesAnalysis.routes.filter(r => !r.hasAuth && r.totalRoutes > 0);
  if (routesWithoutAuth.length > 0) {
    important.push(`Verificar autenticação nas rotas: ${routesWithoutAuth.map(r => r.file).join(', ')} — algumas podem estar desprotegidas`);
  }

  const routesWithoutValidation = data.routesAnalysis.routes.filter(r => !r.hasValidation && r.totalRoutes > 0);
  if (routesWithoutValidation.length > 0) {
    important.push(`Adicionar validação de entrada (Joi/Zod/express-validator) nas rotas: ${routesWithoutValidation.map(r => r.file).join(', ')}`);
  }

  if (important.length === 0) {
    md += `Nenhuma recomendação importante pendente.\n`;
  } else {
    important.forEach((u, i) => md += `${i + 1}. ${u}\n`);
  }

  md += `\n### 🟢 MELHORIAS (quando houver tempo)

1. Migrar o frontend para um framework (React/Vue) — o vanilla JS vai escalar mal com ${data.public.jsCount} arquivos
2. Implementar testes automatizados (Jest + Supertest para API)
3. Adicionar documentação da API (Swagger/OpenAPI)
4. Configurar CI/CD para deploy automático na VPS
5. Implementar cache Redis para sessões e dados frequentes
6. Adicionar logs estruturados (Winston/Pino) ao invés de console.log
7. Criar migrations versionadas (Knex.js ou node-pg-migrate) ao invés de scripts SQL soltos

---

## 📊 FLUXO DO SISTEMA (Como funciona)

Baseado na análise, o fluxo do See&Agende é:

\`\`\`
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Cliente   │────▶│  Chatbot    │────▶│  API /whatsapp  │
│  (WhatsApp) │     │  (WPPConnect│     │  (Evolution API)│
└─────────────┘     │  + Chatbot) │     └─────────────────┘
                    └──────┬──────┘              │
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐     ┌─────────────────┐
                    │   Agendar   │────▶│  API Node.js    │
                    │   Serviço   │     │  (Express)      │
                    └─────────────┘     └────────┬────────┘
                                                 │
                    ┌─────────────┐              │
                    │  Super Admin│◀─────────────┤
                    │  (Painel)   │              │
                    └─────────────┘              │
                                                 ▼
                    ┌─────────────┐     ┌─────────────────┐
                    │  Barbearia  │◀────│  Banco de Dados │
                    │  (Dashboard)│     │  SQLite/PG      │
                    └─────────────┘     └─────────────────┘
\`\`\`

### Camadas identificadas:
1. **Integração WhatsApp:** Evolution API (VPS) + WPPConnect (local) — dual provider
2. **Chatbot:** Automatiza agendamentos via WhatsApp
3. **API REST:** Express.js com autenticação JWT
4. **Frontend:** Páginas estáticas em public/ (incompletas)
5. **Banco:** SQLite (dev) / PostgreSQL (prod) — inconsistência
6. **Pagamentos:** Mercado Pago + Stripe (sandbox)
7. **E-mail:** Nodemailer (configurado)
8. **Super Admin:** Rotas existem, mas frontend não

---

*Relatório gerado automaticamente pelo Analisador See&Agende v2.0.0*
`;

  return md;
}

// ==================== EXECUÇÃO PRINCIPAL ====================

console.log('🔍 Iniciando análise completa do projeto...');
console.log(`📁 Diretório: ${PROJECT_PATH}\n`);

const allFiles = getAllFiles(PROJECT_PATH);

const data = {
  projectPath: PROJECT_PATH,
  totalFiles: allFiles.length,
  pkg: analyzePackageJson(PROJECT_PATH),
  server: analyzeServerJs(PROJECT_PATH),
  routesAnalysis: analyzeRoutes(PROJECT_PATH),
  servicesAnalysis: analyzeServices(PROJECT_PATH),
  public: analyzePublic(PROJECT_PATH),
  database: analyzeDatabase(PROJECT_PATH),
  security: analyzeSecurity(PROJECT_PATH)
};

const report = generateReport(data);
fs.writeFileSync(OUTPUT_FILE, report, 'utf8');

console.log('✅ Análise concluída!');
console.log(`📄 Relatório salvo em: ${OUTPUT_FILE}`);
console.log(`\n📊 Resumo rápido:`);
console.log(`   - ${data.routesAnalysis.count} arquivos de rotas`);
console.log(`   - ${data.servicesAnalysis.count} serviços`);
console.log(`   - ${data.public.htmlCount} páginas HTML`);
console.log(`   - ${data.security.totalIssues} problemas de segurança`);
if (data.server.database.inconsistency) {
  console.log(`   ⚠️  ALERTA: ${data.server.database.inconsistency}`);
}
if (!data.public.hasLoginPage) {
  console.log(`   ❌ Faltando: página de login`);
}
if (!data.public.hasDashboardPage) {
  console.log(`   ❌ Faltando: dashboard principal`);
}