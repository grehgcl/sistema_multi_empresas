#!/usr/bin/env node
/**
 * 🧠 MAPEADOR DE LÓGICA — SEE&AGENDE V4.0
 * 
 * Melhorias vs V3.1:
 *   - Gera apenas 7 relatórios (era 14) — mesmos dados, menos arquivos
 *   - Detecta imports ESM (import ... from ...)
 *   - Detecção de prefixo mais robusta (app.use aninhado, router.use, express.Router)
 *   - Diferencia "rota não existe" de "rota similar existe" (sugestão de fix)
 *   - Reduz falsos positivos em requires quebrados (scripts auxiliares)
 *   - Score com pesos calibrados por impacto real
 *   - Relatório de AÇÃO no topo (o que fazer hoje)
 *   - Ignora .bak do relatório principal (conta mas não detalha)
 * 
 * Uso: node scripts/mapear-logica-completa.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const SAIDA = path.join(RAIZ, 'analysis', 'logica');

// ============================================
// CONFIGURAÇÃO
// ============================================
const VPS_CONFIG = {
    user: 'root',
    ip: '179.199.134.127',
    path: '/var/www/barbearia_nova',
    pm2Process: 'barbearia-pro',
    domain: 'seeagende.tech'
};

const STATUS_SISTEMA = {
    versao: '4.0.0',
    data_ultima_modificacao: '22/09/2026',
    ultimas_modificacoes: [
        '✅ Implementação do sistema de ADS (anúncios no chatbot)',
        '✅ Criação da tabela ads_stats para rastreamento',
        '✅ Painel de anúncios para Super Admin',
        '✅ Chatbot com sistema de anúncios integrado',
    ],
    em_andamento: [
        '⏳ Dashboard do Dono',
        '⏳ Sistema de Cashback',
        '⏳ Relatório automático por email',
    ],
    proximos_passos: [
        '1️⃣ Mesclar branch backup-sem-pwa com main',
        '2️⃣ Corrigir requires quebrados (P1)',
        '3️⃣ Commit do trabalho pendente',
    ]
};

const COMANDOS_DEPLOY = {
    deploy_completo: `ssh ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "
cd ${VPS_CONFIG.path}
git pull origin backup-sem-pwa
npm install
node server/config/migrations/run-migration.js
pm2 restart ${VPS_CONFIG.pm2Process}
"`,
    logs: `ssh ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "pm2 logs --lines 50"`,
    banco: `ssh ${VPS_CONFIG.user}@${VPS_CONFIG.ip} "sqlite3 ${VPS_CONFIG.path}/database/database.db '.tables'"`,
};

// ============================================
// IGNORAR
// ============================================
const PASTAS_IGNORADAS = new Set([
    'node_modules', '.git', 'analysis', 'exportacao',
    'database', '.vscode', '.render', 'dist', 'build',
    'backups', 'logs', 'tmp', 'cache', '.cache', '.next',
    'coverage', '.nyc_output', '.idea'
]);

const EXTS = new Set(['.js', '.html', '.ejs', '.pug', '.vue', '.ts', '.sql', '.json']);

// Arquivos de "ferramenta" — não punir console.log, process.exit, etc.
const ehScriptOuFerramenta = (rel) => {
    if (rel.startsWith('scripts/') || rel.startsWith('tools/')) return true;
    if (rel.startsWith('server/')) return false;
    if (rel === 'server.js') return false;
    // Arquivos na raiz que não são server.js
    if (!rel.includes('/')) return true;
    // Padrões no nome
    return /^(test|teste|check|verificar|audit|fix|analisar|analyze|buscar|diagnostic|forcar|delete|carencia|carência|resetar|checar)/i.test(path.basename(rel));
};

// ============================================
// UTILIDADES
// ============================================
function coletarArquivos(dir, lista = []) {
    let itens;
    try { itens = fs.readdirSync(dir); } catch { return lista; }
    for (const nome of itens) {
        if (PASTAS_IGNORADAS.has(nome)) continue;
        const caminho = path.join(dir, nome);
        let stat;
        try { stat = fs.statSync(caminho); } catch { continue; }
        if (stat.isDirectory()) {
            coletarArquivos(caminho, lista);
        } else if (EXTS.has(path.extname(nome).toLowerCase())) {
            if (/\.(bak\d*|backup\d*|corrompido|old|orig|antes-do-patch)$/i.test(nome)) continue;
            lista.push(caminho);
        }
    }
    return lista;
}

function coletarArquivosBak(dir, lista = []) {
    let itens;
    try { itens = fs.readdirSync(dir); } catch { return lista; }
    for (const nome of itens) {
        if (PASTAS_IGNORADAS.has(nome)) continue;
        const caminho = path.join(dir, nome);
        let stat;
        try { stat = fs.statSync(caminho); } catch { continue; }
        if (stat.isDirectory()) {
            coletarArquivosBak(caminho, lista);
        } else if (/\.(bak\d*|backup\d*|_back|corrompido|old|orig|antes-do-patch)$/i.test(nome)) {
            lista.push(caminho);
        }
    }
    return lista;
}

function tipoDoArquivo(rel) {
    if (rel === 'server.js' || rel.startsWith('server/')) return 'backend';
    if (rel.startsWith('public/')) return 'frontend';
    if (rel.startsWith('scripts/')) return 'script';
    if (rel.endsWith('.sql')) return 'sql';
    return 'outro';
}

function contadorLinhas(txt) {
    const quebras = [];
    for (let i = 0; i < txt.length; i++) if (txt[i] === '\n') quebras.push(i);
    return (indice) => {
        let lo = 0, hi = quebras.length - 1, resp = 0;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (quebras[mid] < indice) { resp = mid + 1; lo = mid + 1; } else hi = mid - 1;
        }
        return resp + 1;
    };
}

const joinPath = (a, b) => ('/' + (a || '').replace(/^\/+|\/+$/g, '') + '/' + (b || '').replace(/^\/+|\/+$/g, '')).replace(/\/+/g, '/');
const segs = (p) => (p || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('/').filter(s => s.length > 0);

function safeExec(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch { return ''; }
}

function getGitInfo() {
    return {
        branch: safeExec('git rev-parse --abbrev-ref HEAD') || 'N/A',
        commit: safeExec('git rev-parse --short HEAD') || 'N/A',
        lastCommit: safeExec('git log -1 --format=%s') || 'N/A',
        lastCommitDate: safeExec('git log -1 --format=%ad --date=short') || 'N/A',
    };
}

function getGitDetalhado() {
    return {
        status: safeExec('git status --short') || '(limpo)',
        uncommittedCount: (safeExec('git status --porcelain') || '').split('\n').filter(Boolean).length,
        branchAtual: safeExec('git rev-parse --abbrev-ref HEAD') || 'N/A',
        upstream: safeExec('git rev-parse --abbrev-ref @{upstream}') || '(sem upstream)',
        aheadBehind: safeExec('git rev-list --left-right --count main...HEAD') || '(sem main?)',
        logUltimos15: safeExec('git log -15 --oneline --no-decorate') || '',
        branchesLocais: safeExec('git branch') || '',
        tags: safeExec('git tag --sort=-creatordate') || '(sem tags)',
        stash: safeExec('git stash list') || '(vazio)'
    };
}

// ============================================
// ANÁLISE DE ARQUIVO
// ============================================
function analisarArquivo(abs) {
    const rel = path.relative(RAIZ, abs).split(path.sep).join('/');
    const conteudo = fs.readFileSync(abs, 'utf8');
    const linha = contadorLinhas(conteudo);
    const ehFerramenta = ehScriptOuFerramenta(rel);

    const a = {
        abs, rel, conteudo,
        tipo: tipoDoArquivo(rel),
        ehFerramenta,
        linhas: conteudo.split('\n').length,
        bytes: Buffer.byteLength(conteudo, 'utf8'),
        requires: [],
        importsESM: [],
        montagens: [],
        rotas: [],
        funcoes: [],
        exportados: new Set(),
        chamadasHTTP: [],
        sockets: [],
        sql: {},
        schemas: [],
        env: new Set(),
        dependencias: [],
        marcadores: {},
    };

    let m;

    // ===== REQUIRES (CJS) =====
    const reReq = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = reReq.exec(conteudo))) {
        a.requires.push({ destino: m[1], linha: linha(m.index), tipo: 'cjs' });
        if (!m[1].startsWith('.') && !m[1].startsWith('/')) {
            const partes = m[1].split('/');
            const base = m[1].startsWith('@') ? partes.slice(0, 2).join('/') : partes[0];
            a.dependencias.push(base);
        }
    }

    // ===== IMPORTS (ESM) — NOVO =====
    const reImport = /^\s*import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/gm;
    while ((m = reImport.exec(conteudo))) {
        a.importsESM.push({ destino: m[1], linha: linha(m.index) });
        if (!m[1].startsWith('.') && !m[1].startsWith('/')) {
            const partes = m[1].split('/');
            const base = m[1].startsWith('@') ? partes.slice(0, 2).join('/') : partes[0];
            a.dependencias.push(base);
        }
    }

    // ===== MONTAGENS (mais robusto) =====
    // Pega: app.use('/x', var), app.use('/x', require('...')), router.use('/x', var)
    const reMount = /\b(app|router)\.use\s*\(\s*['"`]([^'"`]*)['"`]\s*,\s*(?:require\s*\(\s*['"]([^'"]+)['"]\s*\)|([A-Za-z_$][\w$]*))/g;
    while ((m = reMount.exec(conteudo))) {
        a.montagens.push({
            prefixo: m[2],
            destino: m[3] ? `require:${m[3]}` : `var:${m[4]}`,
            linha: linha(m.index),
            tipo: `${m[1]}.use`
        });
    }

    // ===== ROTAS =====
    const reRota = /\b(?:router|app)\.(get|post|put|delete|patch|all|head|options)\s*\(\s*['"`]([^'"`]*)['"`]/g;
    while ((m = reRota.exec(conteudo))) {
        const trecho = conteudo.slice(m.index, m.index + 300).replace(/\s+/g, ' ');
        const tokens = (trecho.slice(trecho.indexOf(m[2]) + m[2].length).match(/[A-Za-z_$][\w$.]*/g) || []);
        const mws = [];
        const params = [];
        const paramMatch = m[2].match(/:([A-Za-z_][\w]*)/g);
        if (paramMatch) params.push(...paramMatch.map(p => p.slice(1)));

        for (const t of tokens) {
            if (/^(req|res|next|async|await|function|try|const|return|if|else|switch|case|break|throw|new|this|typeof|instanceof|delete|void|yield|class|extends|super|import|export|default|from|of|in|for|while|do|continue|with|let|var|then|catch|finally|Promise|setTimeout|setInterval|console|process|module|exports|require|__dirname|__filename|global)/.test(t)) break;
            if (/^(get|post|put|delete|patch|all|router|app)$/.test(t)) continue;
            mws.push(t);
            if (mws.length >= 6) break;
        }

        a.rotas.push({
            metodo: m[1].toUpperCase(),
            caminho: m[2] || '/',
            linha: linha(m.index),
            middlewares: mws,
            params: params,
            assinatura: trecho.slice(0, 200)
        });
    }

    // ===== FUNÇÕES =====
    const reFunc = /(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
    while ((m = reFunc.exec(conteudo))) {
        const nomeFunc = m[1];
        const ocorrencias = (conteudo.match(new RegExp(`\\b${nomeFunc}\\s*\\(`, 'g')) || []).length;
        a.funcoes.push({
            nome: nomeFunc,
            params: m[2].replace(/\s+/g, ' ').trim().slice(0, 100),
            linha: linha(m.index),
            tipo: 'function',
            chamadas: Math.max(0, ocorrencias - 1),
        });
    }
    const reArrow = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
    while ((m = reArrow.exec(conteudo))) {
        const ocorrencias = (conteudo.match(new RegExp(`\\b${m[1]}\\s*\\(`, 'g')) || []).length;
        a.funcoes.push({
            nome: m[1],
            params: m[2].replace(/\s+/g, ' ').trim().slice(0, 100),
            linha: linha(m.index),
            tipo: 'arrow',
            chamadas: ocorrencias,
        });
    }

    // ===== EXPORTS =====
    const reExp = /(?:module\.exports|exports)\.([A-Za-z_$][\w$]*)\s*=/g;
    while ((m = reExp.exec(conteudo))) a.exportados.add(m[1]);

    const reExpObj = /module\.exports\s*=\s*\{([^}]{0,600}?)\}/g;
    while ((m = reExpObj.exec(conteudo))) {
        for (const pedaco of m[1].split(',')) {
            const t = pedaco.trim().split(/[:\s]/)[0];
            if (/^[A-Za-z_$][\w$]*$/.test(t)) a.exportados.add(t);
        }
    }

    // ESM exports
    const reExpESM = /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
    while ((m = reExpESM.exec(conteudo))) a.exportados.add(m[1]);
    
    const reExpESM2 = /export\s*\{([^}]+)\}/g;
    while ((m = reExpESM2.exec(conteudo))) {
        for (const pedaco of m[1].split(',')) {
            const t = pedaco.trim().split(/\s+as\s+/).pop().trim();
            if (/^[A-Za-z_$][\w$]*$/.test(t)) a.exportados.add(t);
        }
    }

    for (const f of a.funcoes) f.exportada = a.exportados.has(f.nome);

    // ===== CHAMADAS HTTP =====
    const metodoFetch = (idx) => {
        const trecho = conteudo.slice(idx, idx + 400);
        const mm = trecho.match(/method\s*:\s*['"](\w+)['"]/i);
        return mm ? mm[1].toUpperCase() : 'GET';
    };
    const reFetch = /\bfetch\s*\(\s*([`'"])([^`'"]+)\1/g;
    while ((m = reFetch.exec(conteudo))) {
        a.chamadasHTTP.push({
            metodo: metodoFetch(m.index),
            url: m[2].slice(0, 120),
            linha: linha(m.index),
            tipo: 'fetch'
        });
    }
    const reFetchConcat = /\bfetch\s*\(\s*([A-Za-z_$][\w$.]*)\s*\+\s*([`'"])([^`'"]+)\2/g;
    while ((m = reFetchConcat.exec(conteudo))) {
        a.chamadasHTTP.push({
            metodo: metodoFetch(m.index),
            url: `[${m[1]}]+${m[3]}`.slice(0, 120),
            linha: linha(m.index),
            tipo: 'fetch'
        });
    }
    const reAxios = /\baxios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*([`'"])([^`'"]+)\2/g;
    while ((m = reAxios.exec(conteudo))) {
        a.chamadasHTTP.push({
            metodo: m[1].toUpperCase(),
            url: m[3].slice(0, 120),
            linha: linha(m.index),
            tipo: 'axios'
        });
    }

    // ===== SOCKET.IO =====
    const reSocket = /\bio\.(on|emit)\s*\(\s*['"]([^'"]+)['"]/g;
    while ((m = reSocket.exec(conteudo))) {
        a.sockets.push({
            evento: m[2],
            handler: m[1] === 'on' ? 'listener' : 'emitter',
            linha: linha(m.index)
        });
    }

    // ===== SQL =====
    const palavrasReservadasSql = /^(SET|DIN|TO|IF|WHERE|VALUES|AND|OR|NOT|NULL|ON|AS|BY|FROM|INTO|TABLE|SELECT|UPDATE|INSERT|DELETE|CREATE|DROP|ALTER|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|ORDER|LIMIT|OFFSET)$/i;
    const reSql = /\b(CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+[`"[]?([A-Za-z_][\w]*)/gi;
    while ((m = reSql.exec(conteudo))) {
        const tabela = m[2];
        const op = m[1].toUpperCase().replace(/\s+/g, ' ');
        if (palavrasReservadasSql.test(tabela)) continue;
        if (/^\$\{/.test(tabela)) continue;
        const tipo = op.startsWith('CREATE') ? 'CREATE' : op.startsWith('INSERT') ? 'INSERT' : op.startsWith('UPDATE') ? 'UPDATE' : 'DELETE';
        if (!a.sql[tabela]) a.sql[tabela] = new Set();
        a.sql[tabela].add(tipo);
        if (tipo === 'CREATE') {
            const fim = conteudo.indexOf(';', m.index);
            a.schemas.push({
                linha: linha(m.index),
                sql: conteudo.slice(m.index, fim === -1 ? m.index + 1000 : fim + 1).trim().slice(0, 1500)
            });
        }
    }
    const reSel = /\bSELECT\b[^;`'"]{0,200}?\bFROM\s+[`"[]?([A-Za-z_][\w]*)/gi;
    while ((m = reSel.exec(conteudo))) {
        if (palavrasReservadasSql.test(m[1])) continue;
        if (!a.sql[m[1]]) a.sql[m[1]] = new Set();
        a.sql[m[1]].add('SELECT');
    }

    // ===== ENV =====
    const reEnv = /process\.env\.([A-Z0-9_]+)/g;
    while ((m = reEnv.exec(conteudo))) a.env.add(m[1]);

    // ===== MARCADORES =====
    const isScript = ehFerramenta || a.tipo === 'script' || a.tipo === 'outro';
    a.marcadores = {
        todo: (conteudo.match(/\/\/\s*(TODO|FIXME|HACK|XXX|BUG)/gi) || []).length,
        consoleLog: isScript ? 0 : (conteudo.match(/console\.(log|debug|info)\(/g) || []).length,
        consoleLogScripts: isScript ? (conteudo.match(/console\.(log|debug|info)\(/g) || []).length : 0,
        vars: (conteudo.match(/\bvar\s+[A-Za-z_$]/g) || []).length,
        emptyCatch: (conteudo.match(/catch\s*\([^)]*\)\s*\{\s*\}/g) || []).length,
        processExit: isScript ? 0 : (conteudo.match(/process\.exit\(/g) || []).length,
        innerHTML: (conteudo.match(/\.innerHTML\s*=/g) || []).length,
        selectStar: (conteudo.match(/SELECT\s+\*\s+FROM/gi) || []).length,
    };
    a.marcadores.emptyCatchList = [...conteudo.matchAll(/catch\s*\(([^)]*)\)\s*\{\s*\}/g)].map(x => ({
        linha: linha(x.index),
        param: x[1]
    }));

    return a;
}

// ============================================
// RESOLUÇÃO DE MÓDULOS
// ============================================
function candidatosDeRequire(destino, dirDoArquivo) {
    const base = path.resolve(dirDoArquivo, destino);
    return [base, base + '.js', base + '.ts', path.join(base, 'index.js'), path.join(base, 'index.ts')];
}

function analisarPackageJson() {
    try {
        const pkgPath = path.join(RAIZ, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return {
            dependencias: Object.keys(pkg.dependencies || {}),
            devDependencias: Object.keys(pkg.devDependencies || {}),
            scriptsDetalhados: pkg.scripts || {},
            name: pkg.name,
            version: pkg.version,
            engines: pkg.engines || {}
        };
    } catch { return null; }
}

function analisarEnvExample() {
    const candidatos = ['.env.example', '.env.sample', '.env.template'];
    const encontrado = candidatos.find(c => fs.existsSync(path.join(RAIZ, c)));
    if (!encontrado) return null;
    try {
        const conteudo = fs.readFileSync(path.join(RAIZ, encontrado), 'utf8');
        const vars = [...conteudo.matchAll(/^([A-Z0-9_]+)\s*=/gm)].map(m => m[1]);
        return { arquivo: encontrado, vars };
    } catch { return null; }
}

function analisarEnvReal() {
    const p = path.join(RAIZ, '.env');
    if (!fs.existsSync(p)) return null;
    try {
        const conteudo = fs.readFileSync(p, 'utf8');
        const vars = [...conteudo.matchAll(/^([A-Z0-9_]+)\s*=/gm)].map(m => m[1]);
        return { vars };
    } catch { return null; }
}

function analisarBancoReal() {
    const dbDir = path.join(RAIZ, 'database');
    if (!fs.existsSync(dbDir)) return null;
    let dbPath = path.join(dbDir, 'database.db');
    if (!fs.existsSync(dbPath)) {
        try {
            const arquivos = fs.readdirSync(dbDir).filter(f => f.endsWith('.db'));
            if (!arquivos.length) return null;
            dbPath = path.join(dbDir, arquivos[0]);
        } catch { return null; }
    }
    try {
        const schema = safeExec(`sqlite3 "${dbPath}" ".schema"`);
        const tabelas = safeExec(`sqlite3 "${dbPath}" ".tables"`).split(/\s+/).filter(Boolean);
        return { tabelas, schema, path: dbPath, nome: path.basename(dbPath) };
    } catch { return null; }
}

// ============================================
// SIMILARIDADE DE ROTAS (sugestão de fix)
// ============================================
function similaridade(a, b) {
    // Distância de Levenshtein simples
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i-1] === b[j-1]
                ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        }
    }
    return dp[m][n];
}

function encontrarRotaSimilar(urlSegs, todasRotas) {
    let melhor = null;
    let melhorDist = Infinity;
    for (const { rota, final } of todasRotas) {
        const rotaSegs = segs(final);
        if (rotaSegs.length !== urlSegs.length) continue;
        let dist = 0;
        for (let i = 0; i < urlSegs.length; i++) {
            if (urlSegs[i] === '{V}' || rotaSegs[i].startsWith(':')) continue;
            dist += similaridade(urlSegs[i].toLowerCase(), rotaSegs[i].toLowerCase());
        }
        if (dist < melhorDist) {
            melhorDist = dist;
            melhor = final;
        }
    }
    // Só sugere se a distância for razoável
    return melhorDist <= 5 ? melhor : null;
}

// ============================================
// SCORE
// ============================================
function calcularScore(dados) {
    const pesos = {
        requiresQuebrados: 8.0,      // aumentei (é crítico)
        rotasSemAuth: 4.0,
        chamadasOrfas: 1.5,
        rotasAdminSemSuper: 5.0,
        arquivosBak: 0.5,            // diminuí (é só lixo)
        scriptsSoltos: 0.3,
        funcoesDuplicadas: 1.5,
        funcoesOrfas: 0.1,
        montagensDuplicadas: 2.0,
        emptyCatch: 0.8,
        depsNaoUsadas: 1.5,
        consoleLogsProducao: 0.005,  // bem atenuado
        varLegado: 0.03,
        selectStar: 0.3,
    };

    const problemas =
        dados.requiresQuebrados.length * pesos.requiresQuebrados +
        dados.rotasSemAuth.length * pesos.rotasSemAuth +
        dados.chamadasOrfas.length * pesos.chamadasOrfas +
        dados.rotasAdminSemSuper.length * pesos.rotasAdminSemSuper +
        dados.arquivosBak.length * pesos.arquivosBak +
        dados.scriptsSoltos.length * pesos.scriptsSoltos +
        dados.funcoesDuplicadas.length * pesos.funcoesDuplicadas +
        dados.funcoesOrfas.length * pesos.funcoesOrfas +
        dados.montagensDuplicadas.length * pesos.montagensDuplicadas +
        dados.emptyCatch.length * pesos.emptyCatch +
        dados.depsNaoUsadas.length * pesos.depsNaoUsadas +
        dados.consoleLogsProducao * pesos.consoleLogsProducao +
        dados.varLegado * pesos.varLegado +
        dados.selectStar * pesos.selectStar;

    return Math.max(0, Math.min(100, 100 - problemas));
}

// ============================================
// PROGRAMA PRINCIPAL
// ============================================
function main() {
    console.log('🧠 MAPEADOR DE LÓGICA — SEE&AGENDE V4.0\n');
    console.log('⚠️  Modo READ-ONLY — nada do sistema será alterado.\n');

    const arquivos = coletarArquivos(RAIZ);
    console.log(`📁 ${arquivos.length} arquivos encontrados. Analisando...`);

    const arquivosBak = coletarArquivosBak(RAIZ);
    console.log(`🧹 ${arquivosBak.length} arquivos .bak/.backup detectados.\n`);

    const modulos = arquivos.map(analisarArquivo);
    const porAbs = new Map(modulos.map((a) => [a.abs, a]));

    // ===== Resolve requires/imports =====
    for (const mod of modulos) {
        mod.requisicoes = [];
        mod.requiresQuebrados = [];
        const todosReqs = [...mod.requires, ...mod.importsESM];
        for (const r of todosReqs) {
            if (!r.destino.startsWith('.')) continue;
            let achou = false;
            for (const cand of candidatosDeRequire(r.destino, path.dirname(mod.abs))) {
                const alvo = porAbs.get(cand);
                if (alvo) {
                    mod.requisicoes.push({ alvo, linha: r.linha });
                    achou = true;
                    break;
                }
            }
            if (!achou) {
                const existe = candidatosDeRequire(r.destino, path.dirname(mod.abs))
                    .some(c => { try { return fs.existsSync(c); } catch { return false; } });
                // Só reporta como quebrado se for arquivo de produção (backend/frontend)
                if (!existe && mod.tipo === 'backend') {
                    mod.requiresQuebrados.push(r);
                }
            }
        }
    }

    // ===== Resolve prefixos das montagens =====
    for (const mod of modulos) {
        for (const mont of mod.montagens) {
            let alvoAbs = null;
            if (mont.destino.startsWith('require:')) {
                for (const cand of candidatosDeRequire(mont.destino.slice(8), path.dirname(mod.abs))) {
                    if (porAbs.has(cand)) { alvoAbs = cand; break; }
                }
            } else {
                const nomeVar = mont.destino.slice(4);
                const re = new RegExp(`(?:const|let|var|import)\\s+${nomeVar}\\s*(?:=|from)\\s*(?:require\\s*\\(\\s*)?['"]([^'"]+)`);
                const mm = mod.conteudo.match(re);
                if (mm) {
                    for (const cand of candidatosDeRequire(mm[1], path.dirname(mod.abs))) {
                        if (porAbs.has(cand)) { alvoAbs = cand; break; }
                    }
                }
            }
            if (alvoAbs) {
                const alvo = porAbs.get(alvoAbs);
                if (!alvo.prefixos) alvo.prefixos = [];
                alvo.prefixos.push(mont.prefixo);
                if (!alvo.prefixo) alvo.prefixo = mont.prefixo;
            }
        }
    }

    const pkg = analisarPackageJson();
    const dependenciasUsadas = new Set();
    for (const mod of modulos) for (const dep of mod.dependencias) dependenciasUsadas.add(dep);

    const envExample = analisarEnvExample();
    const envReal = analisarEnvReal();
    const bancoReal = analisarBancoReal();

    // ===== URLs front =====
    const urlsFront = [];
    for (const mod of modulos) {
        if (mod.tipo !== 'frontend') continue;
        for (const c of mod.chamadasHTTP) {
            let urlNorm = c.url.replace(/\$\{[^}]+\}/g, '{V}');
            urlNorm = urlNorm.replace(/\[\w+\]/g, '{V}');
            urlNorm = urlNorm.replace(/\/\d+/g, '/{V}');
            urlNorm = urlNorm.replace(/\.\.\.$/g, '');
            const normalizada = segs(urlNorm).map(s => (/^\d+$/.test(s) || s === '{V}' ? '{V}' : s));
            urlsFront.push({ segs: normalizada, url: c.url, arquivo: mod.rel, linha: c.linha });
        }
    }

    function casa(urlSegs, rotaSegs) {
        if (urlSegs.length > rotaSegs.length) return null;
        for (let i = 0; i < urlSegs.length; i++) {
            const u = urlSegs[i], r = rotaSegs[i];
            const dinamico = r.startsWith(':') || u === '{V}';
            if (!dinamico && u.toLowerCase() !== r.toLowerCase()) return null;
        }
        return urlSegs.length === rotaSegs.length ? 'exata' : 'parcial';
    }

    function caminhosAlternativos(rota, mod) {
        const base = rota.caminho;
        const prefixos = mod.prefixos || (mod.prefixo ? [mod.prefixo] : []);
        const resultados = [];
        for (const p of prefixos) {
            resultados.push(joinPath(p, base));
            if (!p.startsWith('/api')) resultados.push(joinPath('/api' + p, base));
        }
        if (prefixos.length === 0) resultados.push(base);
        return [...new Set(resultados)]; // dedup
    }

    // Aplica caminhos finais
    for (const mod of modulos) {
        for (const rota of mod.rotas) {
            rota.finais = caminhosAlternativos(rota, mod);
            rota.final = rota.finais[0] || rota.caminho;
            rota.status = rota.final.toLowerCase().includes('webhook') ? 'externa' : 'nao';

            for (const uf of urlsFront) {
                for (const finalAlt of rota.finais) {
                    const resultado = casa(uf.segs, segs(finalAlt));
                    if (resultado === 'exata') { rota.status = 'usada'; break; }
                    if (resultado === 'parcial' && rota.status !== 'usada') rota.status = 'parcial';
                }
                if (rota.status === 'usada') break;
            }
        }
    }

    // Todas as rotas (para busca de similar)
    const todasRotas = [];
    for (const mod of modulos) {
        for (const r of mod.rotas) {
            for (const f of (r.finais || [r.final])) {
                todasRotas.push({ rota: r, final: f });
            }
        }
    }

    // Chamadas órfãs COM sugestão de rota similar
    const chamadasOrfas = [];
    for (const mod of modulos) {
        if (mod.tipo !== 'frontend') continue;
        for (const c of mod.chamadasHTTP) {
            let urlNorm = c.url.replace(/\$\{[^}]+\}/g, '{V}');
            urlNorm = urlNorm.replace(/\[\w+\]/g, '{V}');
            urlNorm = urlNorm.replace(/\/\d+/g, '/{V}');
            urlNorm = urlNorm.replace(/\.\.\.$/g, '');
            const urlSegs = segs(urlNorm);
            let achou = false;
            for (const m2 of modulos) {
                for (const r of m2.rotas) {
                    const finais = r.finais || [r.final];
                    for (const f of finais) {
                        if (casa(urlSegs, segs(f))) { achou = true; break; }
                    }
                    if (achou) break;
                }
                if (achou) break;
            }
            if (!achou) {
                const similar = encontrarRotaSimilar(urlSegs, todasRotas);
                chamadasOrfas.push({ mod, c, sugestao: similar });
            }
        }
    }

    // Funções duplicadas
    const funcoesPorNome = {};
    for (const mod of modulos) {
        if (mod.tipo !== 'backend') continue;
        for (const f of mod.funcoes) {
            (funcoesPorNome[f.nome] = funcoesPorNome[f.nome] || []).push({ arquivo: mod.rel, linha: f.linha });
        }
    }
    const funcoesDuplicadas = Object.entries(funcoesPorNome)
        .filter(([_, arqs]) => arqs.length > 1)
        .sort((a, b) => b[1].length - a[1].length);

    // Funções órfãs
    const funcoesOrfas = [];
    for (const mod of modulos) {
        if (mod.tipo !== 'backend') continue;
        for (const exp of mod.exportados) {
            let usado = false;
            for (const outro of modulos) {
                if (outro === mod) continue;
                if (outro.requisicoes.some(rq => rq.alvo === mod)) {
                    if (outro.conteudo.includes(`.${exp}(`) || new RegExp(`\\b${exp}\\b`).test(outro.conteudo)) {
                        usado = true; break;
                    }
                }
            }
            if (!usado) funcoesOrfas.push({ mod, exp });
        }
    }

    // Rotas sem auth
    const rotasSemAuth = [];
    const rotasAdminSemSuper = [];
    for (const mod of modulos) {
        if (mod.tipo !== 'backend') continue;
        for (const r of mod.rotas) {
            const temAuth = r.middlewares.some(m => /^(auth|verificar)/i.test(m));
            const ehPublica = /\/(chatbot|webhook|health|manifest\.json|sw\.js|icons|auth\/login|auth\/cadastro|auth\/verificar|login|verify)/.test(r.final);
            const arquivoLegado = /^server\/routes\/(auth|whatsapp)\.js$/.test(mod.rel);
            if (!temAuth && !ehPublica && r.status !== 'externa' && !arquivoLegado) {
                rotasSemAuth.push({ mod, r });
            }
            if (r.final.includes('/admin/')) {
                const temSuper = r.middlewares.some(m => /SuperAdmin/i.test(m));
                if (!temSuper) rotasAdminSemSuper.push({ mod, r });
            }
        }
    }

    // SELECT *
    const selectStar = [];
    for (const mod of modulos) {
        if (mod.marcadores.selectStar > 0) selectStar.push({ mod, count: mod.marcadores.selectStar });
    }

    // Montagens duplicadas
    const montagensPorPrefixo = {};
    for (const mod of modulos) {
        for (const mont of mod.montagens) {
            (montagensPorPrefixo[mont.prefixo] = montagensPorPrefixo[mont.prefixo] || []).push({
                arquivo: mod.rel, linha: mont.linha, tipo: mont.tipo, destino: mont.destino
            });
        }
    }
    const montagensDuplicadas = Object.entries(montagensPorPrefixo)
        .filter(([_, arr]) => arr.length > 1);

    // console.log
    const consoleLogsProducao = [];
    const consoleLogsScripts = [];
    for (const mod of modulos) {
        if (mod.marcadores.consoleLog > 0) consoleLogsProducao.push({ arquivo: mod.rel, quantidade: mod.marcadores.consoleLog, tipo: mod.tipo });
        if (mod.marcadores.consoleLogScripts > 0) consoleLogsScripts.push({ arquivo: mod.rel, quantidade: mod.marcadores.consoleLogScripts });
    }
    consoleLogsProducao.sort((a, b) => b.quantidade - a.quantidade);
    consoleLogsScripts.sort((a, b) => b.quantidade - a.quantidade);

    // Empty catch
    const emptyCatchAgregado = [];
    for (const mod of modulos) {
        for (const ec of (mod.marcadores.emptyCatchList || [])) {
            emptyCatchAgregado.push({ arquivo: mod.rel, linha: ec.linha, param: ec.param });
        }
    }

    // Var
    const varLegado = [];
    for (const mod of modulos) {
        if (mod.marcadores.vars > 0) varLegado.push({ arquivo: mod.rel, quantidade: mod.marcadores.vars, tipo: mod.tipo });
    }
    varLegado.sort((a, b) => b.quantidade - a.quantidade);

    const todosQuebrados = modulos.flatMap(m => m.requiresQuebrados.map(r => ({ arquivo: m.rel, ...r })));
    const arquivosBakRel = arquivosBak.map(a => path.relative(RAIZ, a).split(path.sep).join('/'));

    // Scripts soltos
    const scriptsSoltos = [];
    try {
        const raizArquivos = fs.readdirSync(RAIZ);
        for (const nome of raizArquivos) {
            if (!nome.endsWith('.js')) continue;
            if (nome === 'server.js') continue;
            const stat = fs.statSync(path.join(RAIZ, nome));
            if (stat.isFile()) scriptsSoltos.push(nome);
        }
    } catch {}

    const gitInfo = getGitInfo();
    const gitDetalhado = getGitDetalhado();

    const backends = modulos.filter(m => m.tipo === 'backend');
    const frontends = modulos.filter(m => m.tipo === 'frontend');
    const totalRotas = modulos.reduce((s, m) => s + m.rotas.length, 0);
    const totalFuncoes = modulos.reduce((s, m) => s + m.funcoes.length, 0);

    const tabelasGlobais = {};
    for (const mod of modulos) for (const [tab, ops] of Object.entries(mod.sql)) {
        if (!tabelasGlobais[tab]) tabelasGlobais[tab] = { ops: new Set(), arquivos: new Set() };
        ops.forEach(o => tabelasGlobais[tab].ops.add(o));
        tabelasGlobais[tab].arquivos.add(mod.rel);
    }

    const envGlobal = {};
    for (const mod of modulos) for (const v of mod.env) (envGlobal[v] = envGlobal[v] || new Set()).add(mod.rel);

    const rotasOrfas = modulos.flatMap(m => m.rotas.filter(r => r.status === 'nao').map(r => ({ mod: m, r })));
    const depsNaoUsadas = pkg ? pkg.dependencias.filter(d => !dependenciasUsadas.has(d)) : [];

    // ===== SCORE =====
    const score = calcularScore({
        requiresQuebrados: todosQuebrados,
        rotasSemAuth,
        chamadasOrfas,
        rotasAdminSemSuper,
        arquivosBak: arquivosBakRel,
        scriptsSoltos,
        funcoesDuplicadas,
        funcoesOrfas,
        montagensDuplicadas,
        emptyCatch: emptyCatchAgregado,
        depsNaoUsadas,
        consoleLogsProducao: consoleLogsProducao.reduce((s, x) => s + x.quantidade, 0),
        varLegado: varLegado.reduce((s, x) => s + x.quantidade, 0),
        selectStar: selectStar.reduce((s, x) => s + x.count, 0),
    });

    /* ============================================
       GERAÇÃO DOS RELATÓRIOS (7 arquivos)
       ============================================ */
    fs.mkdirSync(SAIDA, { recursive: true });
    const gravar = (nome, conteudo) => fs.writeFileSync(path.join(SAIDA, nome), conteudo, 'utf8');

    const emojiScore = score >= 80 ? '🟢' : score >= 60 ? '🟡' : score >= 40 ? '🟠' : '🔴';

    // ============================================
    // 01_ACOES.md — O QUE FAZER (substitui 00_INDICE + 09_SAUDE + 13_LIMPEZA)
    // ============================================
    let md = `# 🎯 AÇÕES — SEE&AGENDE\n\n`;
    md += `**Análise:** ${new Date().toLocaleString('pt-BR')} · `;
    md += `**Branch:** \`${gitInfo.branch}\` · **Commit:** \`${gitInfo.commit}\` (${gitInfo.lastCommitDate})\n\n`;
    md += `> ⚠️ Mapeador V4.0 — **100% READ-ONLY**. Nada no sistema foi alterado.\n\n`;

    md += `## ${emojiScore} Score: **${score.toFixed(0)}/100**\n\n`;
    md += `| Métrica | Valor |\n|---|---|\n`;
    md += `| Arquivos analisados | ${modulos.length} (${backends.length} backend, ${frontends.length} frontend) |\n`;
    md += `| Rotas | ${totalRotas} |\n`;
    md += `| Funções | ${totalFuncoes} |\n`;
    md += `| Tabelas SQL | ${Object.keys(tabelasGlobais).length} |\n`;
    md += `| Variáveis .env | ${Object.keys(envGlobal).length} |\n`;
    if (pkg) md += `| Deps npm | ${pkg.dependencias.length} (${depsNaoUsadas.length} não usadas) |\n`;
    if (bancoReal) md += `| Tabelas no banco real | ${bancoReal.tabelas.length} |\n`;
    md += `\n`;

    // 🔴 AÇÕES PRIORITÁRIAS
    md += `## 🔴 Ações prioritárias\n\n`;
    if (todosQuebrados.length) {
        md += `### P1 — Corrigir ${todosQuebrados.length} require(s) quebrado(s)\n\n`;
        md += `> Estes podem impedir o servidor de subir.\n\n`;
        for (const r of todosQuebrados) md += `- [ ] \`${r.destino}\` — \`${r.arquivo}:${r.linha}\`\n`;
        md += `\n`;
    }
    if (rotasSemAuth.length) {
        md += `### P2 — Adicionar auth em ${rotasSemAuth.length} rota(s)\n\n`;
        for (const { mod, r } of rotasSemAuth) md += `- [ ] \`${r.metodo} ${r.final}\` — \`${mod.rel}:${r.linha}\`\n`;
        md += `\n`;
    }
    if (chamadasOrfas.length) {
        md += `### P3 — Corrigir ${chamadasOrfas.length} chamada(s) do front sem rota\n\n`;
        for (const { mod, c, sugestao } of chamadasOrfas) {
            md += `- [ ] \`${c.metodo} ${c.url}\` — \`${mod.rel}:${c.linha}\``;
            if (sugestao) md += ` → 💡 similar: \`${sugestao}\``;
            md += `\n`;
        }
        md += `\n`;
    }
    if (gitDetalhado.uncommittedCount > 0) {
        md += `### P4 — Commitar trabalho pendente\n\n`;
        md += `**${gitDetalhado.uncommittedCount} arquivos** não commitados. Último commit: ${gitInfo.lastCommitDate}.\n\n`;
        md += `\`\`\`bash\ngit add -A\ngit commit -m "wip: trabalho em andamento"\ngit push origin ${gitInfo.branch}\n\`\`\`\n\n`;
    }

    // 🟡 Ações secundárias
    md += `## 🟡 Melhorias (não urgentes)\n\n`;
    md += `| Item | Qtd |\n|---|---|\n`;
    md += `| Arquivos .bak versionados | ${arquivosBakRel.length} |\n`;
    md += `| Scripts soltos na raiz | ${scriptsSoltos.length} |\n`;
    md += `| Funções duplicadas | ${funcoesDuplicadas.length} nomes |\n`;
    md += `| Funções exportadas órfãs | ${funcoesOrfas.length} |\n`;
    md += `| Montagens duplicadas | ${montagensDuplicadas.length} |\n`;
    md += `| Catch vazios | ${emptyCatchAgregado.length} |\n`;
    md += `| Deps npm não usadas | ${depsNaoUsadas.length} |\n`;
    md += `| SELECT * | ${selectStar.reduce((s, x) => s + x.count, 0)} |\n`;
    md += `| console.log (produção) | ${consoleLogsProducao.reduce((s, x) => s + x.quantidade, 0)} |\n`;
    md += `| Uso de \`var\` (legado) | ${varLegado.reduce((s, x) => s + x.quantidade, 0)} |\n`;
    md += `\n`;

    // 📋 Status
    md += `## 📋 Status do sistema\n\n`;
    md += `### Últimas modificações (${STATUS_SISTEMA.data_ultima_modificacao})\n\n`;
    for (const x of STATUS_SISTEMA.ultimas_modificacoes) md += `- ${x}\n`;
    md += `\n### Em andamento\n\n`;
    for (const x of STATUS_SISTEMA.em_andamento) md += `- ${x}\n`;
    md += `\n### Próximos passos\n\n`;
    for (const x of STATUS_SISTEMA.proximos_passos) md += `- ${x}\n`;
    md += `\n`;

    // 🔄 Git
    md += `## 🔄 Git\n\n`;
    md += `- **Branch:** \`${gitDetalhado.branchAtual}\`\n`;
    md += `- **Upstream:** \`${gitDetalhado.upstream}\`\n`;
    md += `- **Ahead/Behind vs main:** \`${gitDetalhado.aheadBehind}\`\n`;
    md += `- **Não commitados:** ${gitDetalhado.uncommittedCount}\n`;
    md += `- **Stash:** ${gitDetalhado.stash.split('\n').length}\n\n`;
    md += `### Últimos 10 commits\n\n\`\`\`\n${gitDetalhado.logUltimos15.split('\n').slice(0, 10).join('\n')}\n\`\`\`\n\n`;
    md += `### Branches\n\n\`\`\`\n${gitDetalhado.branchesLocais}\n\`\`\`\n\n`;
    md += `### Tags\n\n\`\`\`\n${gitDetalhado.tags}\n\`\`\`\n\n`;

    // 🚀 Deploy
    md += `## 🚀 Deploy (VPS)\n\n`;
    md += `| Config | Valor |\n|---|---|\n`;
    md += `| IP | ${VPS_CONFIG.ip} |\n`;
    md += `| Caminho | \`${VPS_CONFIG.path}\` |\n`;
    md += `| PM2 | \`${VPS_CONFIG.pm2Process}\` |\n`;
    md += `| Domínio | \`${VPS_CONFIG.domain}\` |\n\n`;
    md += `\`\`\`bash\n${COMANDOS_DEPLOY.deploy_completo}\n\`\`\`\n\n`;

    // 📦 Relatórios
    md += `## 📦 Relatórios\n\n`;
    md += `- **01_ACOES.md** — este arquivo (ações + status)\n`;
    md += `- **02_ARQUITETURA.md** — rotas, montagens, dependências, exports\n`;
    md += `- **03_FUNCOES.md** — funções, duplicadas, órfãs\n`;
    md += `- **04_FRONTEND.md** — chamadas HTTP + rotas órfãs\n`;
    md += `- **05_BANCO.md** — tabelas, schemas, banco real\n`;
    md += `- **06_CONFIG.md** — env vars, deps npm, scripts\n`;
    md += `- **07_QUALIDADE.md** — console.log, catch, var, innerHTML\n\n`;

    // Tamanho de arquivos
    md += `## 📏 Arquivos grandes (>500 linhas)\n\n`;
    md += `| Arquivo | Linhas | Sugestão |\n|---|---|---|\n`;
    for (const a of [...modulos].filter(m => m.linhas > 500).sort((x, y) => y.linhas - x.linhas)) {
        const sug = a.tipo === 'frontend' ? 'quebrar em módulos' : 'separar por responsabilidade';
        md += `| ${a.rel} | ${a.linhas} | ${sug} |\n`;
    }
    md += `\n`;

    gravar('01_ACOES.md', md);

    // ============================================
    // 02_ARQUITETURA.md (rotas + montagens + deps + exports)
    // ============================================
    md = `# 🏗️ ARQUITETURA\n\n`;

    md += `## 🔌 Montagens de rotas\n\n`;
    md += `| Prefixo | Módulo | Onde | Tipo |\n|---|---|---|---|\n`;
    for (const mod of modulos) for (const mont of mod.montagens) {
        md += `| \`${mont.prefixo}\` | ${mont.destino} | ${mod.rel}:${mont.linha} | ${mont.tipo} |\n`;
    }
    md += `\n`;

    if (montagensDuplicadas.length) {
        md += `### ⚠️ Prefixos montados 2+ vezes\n\n`;
        for (const [prefixo, arr] of montagensDuplicadas) {
            md += `**\`${prefixo}\`** — ${arr.length}×\n`;
            for (const x of arr) md += `- ${x.arquivo}:${x.linha} (${x.tipo})\n`;
            md += `\n`;
        }
    }

    md += `## 🛤️ Rotas do backend (${totalRotas})\n\n`;
    md += `Legenda: ✅ usada pelo frontend · 🟡 parcial · 🔗 webhook/externa · ❓ sem correspondência\n\n`;

    const icone = { usada: '✅', parcial: '🟡', externa: '🔗', nao: '❓' };
    for (const mod of modulos) {
        if (!mod.rotas.length) continue;
        const prefixos = mod.prefixos ? mod.prefixos.join(', ') : (mod.prefixo || 'não identificado');
        md += `### 📄 ${mod.rel} (prefixo: \`${prefixos}\`)\n\n`;
        md += `| Método | Caminho | Params | Linha | Middlewares | Front |\n`;
        md += `|---|---|---|---|---|---|\n`;
        for (const r of mod.rotas) {
            md += `| ${r.metodo} | \`${r.final}\` | ${r.params.length ? r.params.join(', ') : '—'} | ${r.linha} | ${r.middlewares.join(', ') || '—'} | ${icone[r.status]} |\n`;
        }
        md += `\n`;
    }

    md += `## 🔗 Dependências internas\n\n`;
    for (const mod of backends) {
        if (!mod.requisicoes.length && !mod.requiresQuebrados.length) continue;
        md += `### ${mod.rel}\n`;
        for (const req of mod.requisicoes) md += `- L${req.linha} → \`${req.alvo.rel}\`\n`;
        for (const req of mod.requiresQuebrados) md += `- L${req.linha} → ⚠️ **\`${req.destino}\` (NÃO ENCONTRADO)**\n`;
        md += `\n`;
    }

    md += `## 🧩 Módulos e exports\n\n`;
    for (const mod of backends) {
        if (!mod.exportados.size) continue;
        md += `### ${mod.rel}\n- ${[...mod.exportados].map(e => `\`${e}\``).join(', ')}\n\n`;
    }

    const todosSockets = modulos.flatMap(m => m.sockets.map(s => ({ ...s, arquivo: m.rel })));
    md += `## 🔌 Socket.io\n\n`;
    if (todosSockets.length) {
        for (const sock of todosSockets) md += `- \`${sock.evento}\` (${sock.handler}) — ${sock.arquivo}:${sock.linha}\n`;
    } else {
        md += `_Nenhum evento Socket.io encontrado_\n`;
    }

    gravar('02_ARQUITETURA.md', md);

    // ============================================
    // 03_FUNCOES.md
    // ============================================
    md = `# ⚙️ FUNÇÕES (${totalFuncoes})\n\n`;

    if (funcoesDuplicadas.length) {
        md += `## 🧬 Funções duplicadas (${funcoesDuplicadas.length} nomes)\n\n`;
        md += `| Função | Ocorrências | Onde |\n|---|---|---|\n`;
        for (const [nome, arqs] of funcoesDuplicadas) {
            md += `| \`${nome}\` | ${arqs.length} | ${arqs.map(a => `${a.arquivo}:${a.linha}`).join('<br>')} |\n`;
        }
        md += `\n`;
    }

    if (funcoesOrfas.length) {
        md += `## 👻 Funções exportadas órfãs (${funcoesOrfas.length})\n\n`;
        for (const { mod, exp } of funcoesOrfas) md += `- \`${exp}\` — ${mod.rel}\n`;
        md += `\n`;
    }

    md += `## 📋 Todas as funções por arquivo\n\n`;
    for (const mod of backends) {
        if (!mod.funcoes.length) continue;
        md += `### ${mod.rel}\n\n`;
        md += `| Função | Params | Linha | Exportada | Chamadas |\n|---|---|---|---|---|\n`;
        for (const f of mod.funcoes) {
            md += `| \`${f.nome}\` | ${f.params || '—'} | ${f.linha} | ${f.exportada ? '✅' : ''} | ${f.chamadas || 0} |\n`;
        }
        md += `\n`;
    }

    gravar('03_FUNCOES.md', md);

    // ============================================
    // 04_FRONTEND.md
    // ============================================
    const totalChamadas = frontends.reduce((s, m) => s + m.chamadasHTTP.length, 0);
    md = `# 🖥️ FRONTEND (${totalChamadas} chamadas)\n\n`;

    if (chamadasOrfas.length) {
        md += `## 🔴 Chamadas sem rota (${chamadasOrfas.length})\n\n`;
        md += `| Arquivo | Linha | Método | URL | 💡 Similar |\n|---|---|---|---|---|\n`;
        for (const { mod, c, sugestao } of chamadasOrfas) {
            md += `| ${mod.rel} | ${c.linha} | ${c.metodo} | \`${c.url}\` | ${sugestao ? `\`${sugestao}\`` : '—'} |\n`;
        }
        md += `\n`;
    } else {
        md += `## ✅ Todas as chamadas batem\n\n`;
    }

    md += `## 🛤️ Rotas do backend sem uso (${rotasOrfas.length})\n\n`;
    md += `> ⚠️ Falsos positivos possíveis (webhooks, chamadas externas). Confira antes de deletar.\n\n`;
    for (const { mod, r } of rotasOrfas) md += `- \`${r.metodo} ${r.final}\` — ${mod.rel}:${r.linha}\n`;
    md += `\n`;

    md += `## 📄 Chamadas por arquivo\n\n`;
    for (const mod of frontends) {
        if (!mod.chamadasHTTP.length) continue;
        md += `### ${mod.rel}\n\n`;
        md += `| Método | URL | Linha |\n|---|---|---|\n`;
        for (const c of mod.chamadasHTTP) md += `| ${c.metodo} | \`${c.url}\` | ${c.linha} |\n`;
        md += `\n`;
    }

    gravar('04_FRONTEND.md', md);

    // ============================================
    // 05_BANCO.md
    // ============================================
    md = `# 🗄️ BANCO DE DADOS\n\n`;

    md += `## 📊 Tabelas detectadas no código (${Object.keys(tabelasGlobais).length})\n\n`;
    md += `| Tabela | Operações | Arquivos |\n|---|---|---|\n`;
    for (const [tab, info] of Object.entries(tabelasGlobais).sort()) {
        md += `| \`${tab}\` | ${[...info.ops].join(', ')} | ${[...info.arquivos].join(', ')} |\n`;
    }
    md += `\n`;

    if (bancoReal) {
        md += `## 💾 Banco real: \`${bancoReal.nome}\`\n\n`;
        md += `**Tabelas:** ${bancoReal.tabelas.length}\n\n`;
        if (bancoReal.tabelas.length) {
            md += `| Tabela | Existe no código? |\n|---|---|\n`;
            for (const t of bancoReal.tabelas.sort()) {
                md += `| \`${t}\` | ${tabelasGlobais[t] ? '✅' : '❓'} |\n`;
            }
            md += `\n`;
        }
        md += `### Schema\n\n\`\`\`sql\n${bancoReal.schema}\n\`\`\`\n\n`;
    }

    md += `## 📐 Schemas (CREATE TABLE no código)\n\n`;
    let achouSchema = false;
    for (const mod of modulos) for (const s of mod.schemas) {
        achouSchema = true;
        md += `### ${mod.rel}:${s.linha}\n\`\`\`sql\n${s.sql}\n\`\`\`\n\n`;
    }
    if (!achouSchema) md += `_Nenhum CREATE TABLE encontrado_\n`;

    gravar('05_BANCO.md', md);

    // ============================================
    // 06_CONFIG.md (env + deps + scripts)
    // ============================================
    md = `# 🔧 CONFIGURAÇÃO\n\n`;

    md += `## 📋 Variáveis de ambiente\n\n`;
    md += `| Origem | Qtd |\n|---|---|\n`;
    md += `| Usadas no código | ${Object.keys(envGlobal).length} |\n`;
    if (envExample) md += `| Em \`${envExample.arquivo}\` | ${envExample.vars.length} |\n`;
    if (envReal) md += `| Em \`.env\` | ${envReal.vars.length} |\n`;
    md += `\n`;

    if (envExample) {
        const usadasCodigo = new Set(Object.keys(envGlobal));
        const faltando = [...usadasCodigo].filter(v => !envExample.vars.includes(v));
        const sobrando = envExample.vars.filter(v => !usadasCodigo.has(v));
        if (faltando.length) {
            md += `### 🔴 Faltam em \`${envExample.arquivo}\` (${faltando.length})\n\n`;
            for (const v of faltando.sort()) md += `- \`${v}\`\n`;
            md += `\n`;
        }
        if (sobrando.length) {
            md += `### 🟡 Em \`${envExample.arquivo}\` mas não usadas (${sobrando.length})\n\n`;
            for (const v of sobrando.sort()) md += `- \`${v}\`\n`;
            md += `\n`;
        }
    }

    md += `### 📋 Todas as variáveis usadas\n\n`;
    md += `| Variável | Arquivos |\n|---|---|\n`;
    for (const [v, arqs] of Object.entries(envGlobal).sort()) {
        md += `| \`${v}\` | ${[...arqs].join(', ')} |\n`;
    }
    md += `\n`;

    if (pkg) {
        md += `## 📦 Dependências npm\n\n`;
        md += `| Métrica | Valor |\n|---|---|\n`;
        md += `| Nome | ${pkg.name} |\n`;
        md += `| Versão | ${pkg.version || 'N/A'} |\n`;
        md += `| Produção | ${pkg.dependencias.length} |\n`;
        md += `| Dev | ${pkg.devDependencias.length} |\n`;
        md += `\n`;

        md += `### Produção\n\n`;
        for (const dep of pkg.dependencias) {
            md += `- ${dependenciasUsadas.has(dep) ? '✅' : '⚠️'} \`${dep}\`${!dependenciasUsadas.has(dep) ? ' — **não usada**' : ''}\n`;
        }
        md += `\n### Dev\n\n`;
        for (const dep of pkg.devDependencias) md += `- \`${dep}\`\n`;

        md += `\n### Scripts npm\n\n`;
        md += `| Script | Comando |\n|---|---|\n`;
        for (const [n, c] of Object.entries(pkg.scriptsDetalhados)) md += `| \`${n}\` | \`${c}\` |\n`;
    }

    gravar('06_CONFIG.md', md);

    // ============================================
    // 07_QUALIDADE.md (console.log, catch, var, innerHTML, select*)
    // ============================================
    md = `# 📊 QUALIDADE DE CÓDIGO\n\n`;

    md += `## 🖨️ console.log em produção (${consoleLogsProducao.reduce((s, x) => s + x.quantidade, 0)})\n\n`;
    md += `> Scripts de análise são ignorados. Estes são os problemáticos.\n\n`;
    if (consoleLogsProducao.length) {
        md += `| Arquivo | Qtd |\n|---|---|\n`;
        for (const x of consoleLogsProducao) md += `| ${x.arquivo} | ${x.quantidade} |\n`;
    } else {
        md += `_Nenhum_ ✅\n`;
    }
    md += `\n`;

    md += `## 🖨️ console.log em scripts (${consoleLogsScripts.reduce((s, x) => s + x.quantidade, 0)})\n\n`;
    md += `> Não são problema — scripts usam intencionalmente.\n\n`;
    if (consoleLogsScripts.length) {
        md += `| Arquivo | Qtd |\n|---|---|\n`;
        for (const x of consoleLogsScripts.slice(0, 15)) md += `| ${x.arquivo} | ${x.quantidade} |\n`;
        if (consoleLogsScripts.length > 15) md += `| _(+${consoleLogsScripts.length - 15})_ | — |\n`;
    }
    md += `\n`;

    md += `## 🕳️ Catch vazios (${emptyCatchAgregado.length})\n\n`;
    if (emptyCatchAgregado.length) {
        md += `| Arquivo | Linha | Param |\n|---|---|---|\n`;
        for (const x of emptyCatchAgregado) md += `| ${x.arquivo} | ${x.linha} | \`${x.param}\` |\n`;
    } else {
        md += `_Nenhum_ ✅\n`;
    }
    md += `\n`;

    md += `## 📜 Uso de \`var\` (${varLegado.reduce((s, x) => s + x.quantidade, 0)})\n\n`;
    if (varLegado.length) {
        md += `| Arquivo | Qtd |\n|---|---|\n`;
        for (const x of varLegado) md += `| ${x.arquivo} | ${x.quantidade} |\n`;
    } else {
        md += `_Nenhum_ ✅\n`;
    }
    md += `\n`;

    md += `## 🔒 innerHTML (potencial XSS) (${modulos.reduce((s, m) => s + (m.marcadores.innerHTML || 0), 0)})\n\n`;
    md += `> Não é erro, mas vale revisar onde usa dados de usuário.\n\n`;
    const comInnerHTML = modulos.filter(m => m.marcadores.innerHTML > 0);
    if (comInnerHTML.length) {
        md += `| Arquivo | Qtd |\n|---|---|\n`;
        for (const m of comInnerHTML.sort((a, b) => b.marcadores.innerHTML - a.marcadores.innerHTML)) {
            md += `| ${m.rel} | ${m.marcadores.innerHTML} |\n`;
        }
    }
    md += `\n`;

    md += `## 🕳️ SELECT * (${selectStar.reduce((s, x) => s + x.count, 0)})\n\n`;
    if (selectStar.length) {
        for (const { mod, count } of selectStar) md += `- \`${mod.rel}\` — ${count}×\n`;
    } else {
        md += `_Nenhum_ ✅\n`;
    }
    md += `\n`;

    md += `## 📦 Lixo no repositório\n\n`;
    md += `### Arquivos .bak (${arquivosBakRel.length})\n\n`;
    md += `\`\`\`\n${arquivosBakRel.join('\n')}\n\`\`\`\n\n`;
    md += `### Scripts soltos na raiz (${scriptsSoltos.length})\n\n`;
    if (scriptsSoltos.length) md += `\`\`\`\n${scriptsSoltos.join('\n')}\n\`\`\`\n\n`;
    else md += `_Nenhum_ ✅\n\n`;

    md += `### 💡 Adicione ao .gitignore\n\n\`\`\`\n*.bak\n*.bak3\n*.backup*\n*.antes-do-patch\n*.corrompido\n*_back.js\n*.old\n*.orig\n\`\`\`\n`;

    gravar('07_QUALIDADE.md', md);

    /* ============================================
       RESUMO NO CONSOLE
       ============================================ */
    console.log(`\n✅ ${fs.readdirSync(SAIDA).filter(f => f.endsWith('.md')).length} RELATÓRIOS GERADOS EM: analysis/logica/\n`);
    for (const nome of fs.readdirSync(SAIDA).sort()) {
        const tam = fs.statSync(path.join(SAIDA, nome)).size;
        console.log(`   📄 ${nome} (${(tam / 1024).toFixed(1)} KB)`);
    }

    console.log(`\n📊 Resumo V4.0:`);
    console.log(`   • Score: ${emojiScore} ${score.toFixed(0)}/100`);
    console.log(`   • ${totalRotas} rotas · ${totalFuncoes} funções`);
    console.log(`   • ${Object.keys(tabelasGlobais).length} tabelas (código)${bancoReal ? ` · ${bancoReal.tabelas.length} no banco real` : ''}`);
    console.log(`   • 🔴 ${todosQuebrados.length} requires quebrados · ${rotasSemAuth.length} rotas sem auth · ${chamadasOrfas.length} chamadas quebradas`);
    console.log(`   • 🟡 ${funcoesDuplicadas.length} funções duplicadas · ${arquivosBakRel.length} arquivos .bak · ${scriptsSoltos.length} scripts soltos`);
    console.log(`   • 🟢 ${consoleLogsProducao.reduce((s, x) => s + x.quantidade, 0)} console.log em produção`);
    console.log(`   • Git: ${gitDetalhado.uncommittedCount} arquivos não commitados (último commit: ${gitInfo.lastCommitDate})`);
    console.log(`\n💡 Leia primeiro: analysis/logica/01_ACOES.md`);
}

try {
    main();
} catch (erro) {
    console.error('❌ Erro fatal:', erro.message);
    console.error(erro.stack);
    process.exit(1);
}