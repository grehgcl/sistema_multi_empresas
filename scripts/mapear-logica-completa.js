#!/usr/bin/env node
/**
 * 🧠 MAPEADOR DE LÓGICA COMPLETA — SEE&AGENDE V2.0
 * Analisa o código-fonte e gera relatórios detalhados em analysis/logica/
 *
 * Melhorias:
 * - Suporte a .ejs, .pug, .vue, .ts, .sql
 * - Detecção de router.use()
 * - XMLHttpRequest tracking
 * - Socket.io detection
 * - Parâmetros de rota
 * - Análise de package.json
 * - Detecção de código morto
 *
 * Uso: node scripts/mapear-logica-completa.js
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const SAIDA = path.join(RAIZ, 'analysis', 'logica');

const PASTAS_IGNORADAS = new Set(['node_modules', '.git', 'analysis', 'exportacao', 'database', '.vscode', '.render', 'dist', 'build']);
const EXTS = new Set(['.js', '.html', '.ejs', '.pug', '.vue', '.ts', '.sql', '.json']);

/* ================= UTILIDADES ================= */

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
      if (/\.(bak\d*|backup\d*|corrompido|old|orig)$/i.test(nome)) continue;
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

/* ================= ANÁLISE DE ARQUIVO ================= */

function analisarArquivo(abs) {
  const rel = path.relative(RAIZ, abs).split(path.sep).join('/');
  const conteudo = fs.readFileSync(abs, 'utf8');
  const linha = contadorLinhas(conteudo);

  const a = {
    abs, rel, conteudo,
    tipo: tipoDoArquivo(rel),
    linhas: conteudo.split('\n').length,
    requires: [],        // { destino, linha }
    montagens: [],       // { prefixo, destino, linha, tipo }
    rotas: [],           // { metodo, caminho, linha, middlewares, params, assinatura }
    funcoes: [],         // { nome, params, linha, tipo, exportada, chamadas }
    exportados: new Set(),
    chamadasHTTP: [],    // { metodo, url, linha, tipo }
    sockets: [],         // { evento, handler, linha }
    sql: {},             // tabela -> Set(operacoes)
    schemas: [],         // { linha, sql }
    env: new Set(),
    dependencias: [],    // pacotes npm usados
    variaveisNaoUsadas: [], // variáveis declaradas mas não usadas
  };

  let m;

  // ===== REQUIRES =====
  const reReq = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = reReq.exec(conteudo))) {
    a.requires.push({ destino: m[1], linha: linha(m.index) });
    // Detecta dependências npm (não relativas)
    if (!m[1].startsWith('.') && !m[1].startsWith('/')) {
      a.dependencias.push(m[1]);
    }
  }

  // ===== MONTAGENS =====
  // app.use()
  const reMount = /\bapp\.use\s*\(\s*['"`]([^'"`]*)['"`]\s*,\s*(?:require\s*\(\s*['"]([^'"]+)['"]\s*\)|([A-Za-z_$][\w$]*))/g;
  while ((m = reMount.exec(conteudo))) {
    a.montagens.push({ 
      prefixo: m[1], 
      destino: m[2] ? `require:${m[2]}` : `var:${m[3]}`, 
      linha: linha(m.index),
      tipo: 'app.use'
    });
  }

  // router.use() - NOVO
  const reRouterUse = /\brouter\.use\s*\(\s*['"`]([^'"`]*)['"`]\s*,\s*(?:require\s*\(\s*['"]([^'"]+)['"]\s*\)|([A-Za-z_$][\w$]*))/g;
  while ((m = reRouterUse.exec(conteudo))) {
    a.montagens.push({ 
      prefixo: m[1], 
      destino: m[2] ? `require:${m[2]}` : `var:${m[3]}`, 
      linha: linha(m.index),
      tipo: 'router.use'
    });
  }

  // ===== ROTAS EXPRESS =====
  const reRota = /\b(?:router|app)\.(get|post|put|delete|patch|all|head|options)\s*\(\s*['"`]([^'"`]*)['"`]/g;
  while ((m = reRota.exec(conteudo))) {
    const trecho = conteudo.slice(m.index, m.index + 300).replace(/\s+/g, ' ');
    const posPath = trecho.indexOf(m[2]) + m[2].length;
    const tokens = (trecho.slice(posPath).match(/[A-Za-z_$][\w$.]*/g) || []);
    const mws = [];
    const params = [];
    
    // Extrai parâmetros da rota ex: /users/:id/posts/:postId
    const paramMatch = m[2].match(/:([A-Za-z_][\w]*)/g);
    if (paramMatch) {
      params.push(...paramMatch.map(p => p.slice(1)));
    }

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
  // Funções tradicionais
  const reFunc = /(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g;
  while ((m = reFunc.exec(conteudo))) {
    // Verifica se a função é chamada em outro lugar
    const nomeFunc = m[1];
    const chamadas = (conteudo.match(new RegExp(`\\b${nomeFunc}\\s*\\(`, 'g')) || []).length - 1; // -1 pela definição
    a.funcoes.push({ 
      nome: nomeFunc, 
      params: m[2].replace(/\s+/g, ' ').trim().slice(0, 100), 
      linha: linha(m.index), 
      tipo: 'function',
      chamadas: chamadas > 0
    });
  }

  // Arrow functions
  const reArrow = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
  while ((m = reArrow.exec(conteudo))) {
    const chamadas = (conteudo.match(new RegExp(`\\b${m[1]}\\s*\\(`, 'g')) || []).length;
    a.funcoes.push({ 
      nome: m[1], 
      params: m[2].replace(/\s+/g, ' ').trim().slice(0, 100), 
      linha: linha(m.index), 
      tipo: 'arrow',
      chamadas: chamadas > 0
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

  const reExpArr = /exports\s*=\s*\[([^\]]{0,200}?)\]/g;
  while ((m = reExpArr.exec(conteudo))) {
    for (const pedaco of m[1].split(',')) {
      const t = pedaco.trim().replace(/['"]/g, '');
      if (/^[A-Za-z_$][\w$]*$/.test(t)) a.exportados.add(t);
    }
  }

  for (const f of a.funcoes) f.exportada = a.exportados.has(f.nome);

  // ===== CHAMADAS HTTP =====
  const metodoFetch = (idx) => {
    const trecho = conteudo.slice(idx, idx + 300);
    const mm = trecho.match(/method\s*:\s*['"](\w+)['"]/i);
    return mm ? mm[1].toUpperCase() : 'GET';
  };

  // fetch()
  const reFetch = /\bfetch\s*\(\s*([`'"])([^`'"]+)\1/g;
  while ((m = reFetch.exec(conteudo))) {
    a.chamadasHTTP.push({ 
      metodo: metodoFetch(m.index), 
      url: m[2].slice(0, 120), 
      linha: linha(m.index),
      tipo: 'fetch'
    });
  }

  // fetch com concatenação
  const reFetchConcat = /\bfetch\s*\(\s*[A-Za-z_$][\w$.]*\s*\+\s*([`'"])([^`'"]+)\1/g;
  while ((m = reFetchConcat.exec(conteudo))) {
    a.chamadasHTTP.push({ 
      metodo: metodoFetch(m.index), 
      url: m[2].slice(0, 120) + ' (concat)', 
      linha: linha(m.index),
      tipo: 'fetch'
    });
  }

  // axios
  const reAxios = /\baxios\s*\.\s*(get|post|put|delete|patch)\s*\(\s*([`'"])([^`'"]+)\2/g;
  while ((m = reAxios.exec(conteudo))) {
    a.chamadasHTTP.push({ 
      metodo: m[1].toUpperCase(), 
      url: m[3].slice(0, 120), 
      linha: linha(m.index),
      tipo: 'axios'
    });
  }

  // XMLHttpRequest - NOVO
  const reXHR = /\.open\s*\(\s*['"](GET|POST|PUT|DELETE|PATCH)['"]\s*,\s*['"]([^'"]+)['"]/g;
  while ((m = reXHR.exec(conteudo))) {
    a.chamadasHTTP.push({ 
      metodo: m[1], 
      url: m[2].slice(0, 120), 
      linha: linha(m.index),
      tipo: 'xhr'
    });
  }

  // $.ajax, $.get, $.post - jQuery
  const reJquery = /\$\.(ajax|get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = reJquery.exec(conteudo))) {
    const metodo = m[1] === 'ajax' ? 'GET' : m[1].toUpperCase();
    a.chamadasHTTP.push({ 
      metodo: metodo, 
      url: m[2].slice(0, 120), 
      linha: linha(m.index),
      tipo: 'jquery'
    });
  }

  // ===== SOCKET.IO - NOVO =====
  const reSocket = /\bio\.(on|emit)\s*\(\s*['"]([^'"]+)['"]/g;
  while ((m = reSocket.exec(conteudo))) {
    a.sockets.push({ 
      evento: m[2], 
      handler: m[1] === 'on' ? 'listener' : 'emitter',
      linha: linha(m.index)
    });
  }

  // ===== SQL =====
  const reSql = /\b(CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+[`"[]?([A-Za-z_][\w]*)/gi;
  while ((m = reSql.exec(conteudo))) {
    const tabela = m[2];
    const op = m[1].toUpperCase();
    const tipo = op.startsWith('CREATE') ? 'CREATE' : op.startsWith('INSERT') ? 'INSERT' : op.startsWith('UPDATE') ? 'UPDATE' : 'DELETE';
    if (!a.sql[tabela]) a.sql[tabela] = new Set();
    a.sql[tabela].add(tipo);
    if (tipo === 'CREATE') {
      const fim = conteudo.indexOf(';', m.index);
      a.schemas.push({ linha: linha(m.index), sql: conteudo.slice(m.index, fim === -1 ? m.index + 1000 : fim + 1).trim().slice(0, 1200) });
    }
  }

  const reSel = /\bSELECT\b[^;`'"]{0,200}?\bFROM\s+[`"[]?([A-Za-z_][\w]*)/gi;
  while ((m = reSel.exec(conteudo))) {
    if (!a.sql[m[1]]) a.sql[m[1]] = new Set();
    a.sql[m[1]].add('SELECT');
  }

  // ===== VARIÁVEIS DE AMBIENTE =====
  const reEnv = /process\.env\.([A-Z0-9_]+)/g;
  while ((m = reEnv.exec(conteudo))) a.env.add(m[1]);

  // ===== VARIÁVEIS NÃO USADAS =====
  // Detecta declarações de variáveis que não são usadas
  const reVarDecl = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
  const varsDeclaradas = new Set();
  while ((m = reVarDecl.exec(conteudo))) {
    varsDeclaradas.add(m[1]);
  }
  for (const v of varsDeclaradas) {
    // Verifica se a variável é usada em outro lugar (exceto a declaração)
    const reUso = new RegExp(`\\b${v}\\b`, 'g');
    let count = 0;
    let match;
    while ((match = reUso.exec(conteudo))) count++;
    if (count <= 1) { // apenas a declaração
      a.variaveisNaoUsadas.push(v);
    }
  }

  return a;
}

/* ================= RESOLUÇÃO DE MÓDULOS ================= */

function candidatosDeRequire(destino, dirDoArquivo) {
  const base = path.resolve(dirDoArquivo, destino);
  return [base, base + '.js', base + '.ts', path.join(base, 'index.js'), path.join(base, 'index.ts')];
}

/* ================= ANÁLISE DE PACKAGE.JSON ================= */

function analisarPackageJson() {
  try {
    const pkgPath = path.join(RAIZ, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return {
      dependencias: Object.keys(pkg.dependencies || {}),
      devDependencias: Object.keys(pkg.devDependencies || {}),
      scripts: Object.keys(pkg.scripts || {}),
      name: pkg.name,
      version: pkg.version
    };
  } catch {
    return null;
  }
}

/* ================= PROGRAMA PRINCIPAL ================= */

function main() {
  console.log('🧠 MAPEADOR DE LÓGICA COMPLETA — SEE&AGENDE V2.0\n');
  const arquivos = coletarArquivos(RAIZ);
  console.log(`📁 ${arquivos.length} arquivos encontrados. Analisando...`);

  const modulos = arquivos.map(analisarArquivo);
  const porAbs = new Map(modulos.map((a) => [a.abs, a]));

  // Resolve requires -> módulos
  for (const mod of modulos) {
    mod.requisicoes = [];
    for (const r of mod.requires) {
      for (const cand of candidatosDeRequire(r.destino, path.dirname(mod.abs))) {
        const alvo = porAbs.get(cand);
        if (alvo) { mod.requisicoes.push({ alvo, linha: r.linha }); break; }
      }
    }
  }

  // Resolve prefixos das montagens
  for (const mod of modulos) {
    for (const mont of mod.montagens) {
      let alvoAbs = null;
      if (mont.destino.startsWith('require:')) {
        for (const cand of candidatosDeRequire(mont.destino.slice(8), path.dirname(mod.abs))) {
          if (porAbs.has(cand)) { alvoAbs = cand; break; }
        }
      } else {
        const nomeVar = mont.destino.slice(4);
        const re = new RegExp(`(?:const|let|var)\\s+${nomeVar}\\s*=\\s*require\\s*\\(\\s*['"]([^'"]+)`);
        const mm = mod.conteudo.match(re);
        if (mm) {
          for (const cand of candidatosDeRequire(mm[1], path.dirname(mod.abs))) {
            if (porAbs.has(cand)) { alvoAbs = cand; break; }
          }
        }
      }
      if (alvoAbs) {
        const alvo = porAbs.get(alvoAbs);
        if (!alvo.prefixo) alvo.prefixo = mont.prefixo;
      }
    }
  }

  // Análise do package.json
  const pkg = analisarPackageJson();
  const dependenciasUsadas = new Set();
  for (const mod of modulos) {
    for (const dep of mod.dependencias) {
      dependenciasUsadas.add(dep);
    }
  }

  // Caminho final das rotas + cruzamento com frontend
  const urlsFront = [];
  for (const mod of modulos) {
    if (mod.tipo !== 'frontend') continue;
    for (const c of mod.chamadasHTTP) {
      const normalizada = segs(c.url.replace(/\$\{[^}]+\}/g, '{V}').replace(/^\/+/, '/')).map(s => (/^\d+$/.test(s) || s === '{V}' ? '{V}' : s));
      urlsFront.push({ segs: normalizada, url: c.url, arquivo: mod.rel });
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

  for (const mod of modulos) {
    for (const rota of mod.rotas) {
      rota.final = mod.prefixo !== undefined ? joinPath(mod.prefixo, rota.caminho) : rota.caminho;
      rota.status = rota.final.toLowerCase().includes('webhook') ? 'externa' : 'nao';
      const rotaSegs = segs(rota.final);
      for (const uf of urlsFront) {
        const resultado = casa(uf.segs, rotaSegs);
        if (resultado === 'exata') { rota.status = 'usada'; break; }
        if (resultado === 'parcial' && rota.status !== 'usada') rota.status = 'parcial';
      }
    }
  }

  /* ---------- GERAÇÃO DOS RELATÓRIOS ---------- */
  fs.mkdirSync(SAIDA, { recursive: true });
  const gravar = (nome, conteudo) => fs.writeFileSync(path.join(SAIDA, nome), conteudo, 'utf8');

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

  // 00 INDICE
  let md = `# 🧠 MAPA DA LÓGICA — SEE&AGENDE\n\nGerado em ${new Date().toLocaleString('pt-BR')}\n\n`;
  md += `| Métrica | Valor |\n|---|---|\n| Arquivos analisados | ${modulos.length} |\n| Backend | ${backends.length} |\n| Frontend | ${frontends.length} |\n| Rotas | ${totalRotas} |\n| Funções | ${totalFuncoes} |\n| Tabelas SQL | ${Object.keys(tabelasGlobais).length} |\n| Variáveis .env usadas | ${Object.keys(envGlobal).length} |\n`;
  if (pkg) {
    md += `| Dependências npm | ${pkg.dependencias.length} |\n`;
    md += `| Dev Dependências | ${pkg.devDependencias.length} |\n`;
  }
  md += `\n## 📦 Relatórios gerados\n\n`;
  md += `- **01_ARQUITETURA.md** — dependências entre arquivos, montagens de rotas, middlewares\n- **02_ROTAS_BACKEND.md** — todas as rotas com caminho completo e uso pelo frontend\n- **03_FUNCOES_BACKEND.md** — funções do backend com parâmetros e linhas\n- **04_FLUXO_FRONTEND.md** — todas as chamadas HTTP do frontend\n- **05_BANCO_DADOS.md** — tabelas, operações e schemas\n- **06_ENV_CONFIG.md** — variáveis de ambiente usadas\n- **07_ORFAOS.md** — rotas e funções possivelmente sem uso\n- **08_DEPENDENCIAS.md** — análise de dependências npm\n\n`;
  md += `## 📏 Maiores arquivos (top 15)\n\n| Arquivo | Linhas |\n|---|---|\n`;
  for (const mod of [...modulos].sort((a, b) => b.linhas - a.linhas).slice(0, 15)) md += `| ${mod.rel} | ${mod.linhas} |\n`;
  gravar('00_INDICE.md', md);

  // 01 ARQUITETURA
  md = `# 🏗️ ARQUITETURA — Dependências e Montagens\n\n`;
  md += `## 🔌 Montagens de rotas (app.use / router.use)\n\n| Prefixo | Módulo destino | Onde | Tipo |\n|---|---|---|---|\n`;
  for (const mod of modulos) for (const mont of mod.montagens) md += `| \`${mont.prefixo}\` | ${mont.destino} | ${mod.rel}:${mont.linha} | ${mont.tipo || 'app.use'} |\n`;
  md += `\n## 🔗 Dependências internas (require)\n\n`;
  for (const mod of backends) {
    if (!mod.requisicoes.length) continue;
    md += `### ${mod.rel}\n`;
    for (const req of mod.requisicoes) md += `- linha ${req.linha} → \`${req.alvo.rel}\`\n`;
    md += `\n`;
  }
  md += `## 🧩 Módulos e o que exportam\n\n`;
  for (const mod of backends) {
    if (!mod.exportados.size) continue;
    md += `### ${mod.rel}\n- Exporta: ${[...mod.exportados].map(e => `\`${e}\``).join(', ')}\n\n`;
  }
  md += `\n## 🔌 Socket.io Events\n\n`;
  const todosSockets = modulos.flatMap(m => m.sockets);
  if (todosSockets.length) {
    for (const sock of todosSockets) {
      md += `- \`${sock.evento}\` (${sock.handler}) — ${sock.linha}\n`;
    }
  } else {
    md += `_Nenhum evento Socket.io encontrado_\n`;
  }
  gravar('01_ARQUITETURA.md', md);

  // 02 ROTAS
  md = `# 🛤️ ROTAS DO BACKEND (${totalRotas})\n\nLegenda: ✅ usada pelo frontend · 🟡 parcialmente casada · 🔗 webhook/externa · ❓ sem correspondência no frontend\n\n`;
  const porMetodo = {};
  for (const mod of modulos) for (const r of mod.rotas) porMetodo[r.metodo] = (porMetodo[r.metodo] || 0) + 1;
  md += `| Método | Qtd |\n|---|---|\n`;
  for (const [met, q] of Object.entries(porMetodo).sort((a, b) => b[1] - a[1])) md += `| ${met} | ${q} |\n`;
  md += `\n`;
  const icone = { usada: '✅', parcial: '🟡', externa: '🔗', nao: '❓' };
  for (const mod of modulos) {
    if (!mod.rotas.length) continue;
    md += `## 📄 ${mod.rel}${mod.prefixo !== undefined ? ` (prefixo: \`${mod.prefixo}\`)` : ' ⚠️ prefixo não identificado'}\n\n| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |\n|---|---|---|---|---|---|\n`;
    for (const r of mod.rotas) md += `| ${r.metodo} | \`${r.final}\` | ${r.params.length ? r.params.join(', ') : '—'} | ${r.linha} | ${r.middlewares.join(', ') || '—'} | ${icone[r.status]} |\n`;
    md += `\n`;
  }
  gravar('02_ROTAS_BACKEND.md', md);

  // 03 FUNÇÕES
  md = `# ⚙️ FUNÇÕES DO BACKEND (${totalFuncoes} no projeto todo)\n\n`;
  for (const mod of backends) {
    if (!mod.funcoes.length) continue;
    md += `## 📄 ${mod.rel}\n\n| Função | Parâmetros | Linha | Exportada | Chamada |\n|---|---|---|---|---|\n`;
    for (const f of mod.funcoes) md += `| \`${f.nome}\` | ${f.params || '—'} | ${f.linha} | ${f.exportada ? '✅' : ''} | ${f.chamadas ? '✅' : '⚠️'}`;
    md += `\n\n`;
  }
  gravar('03_FUNCOES_BACKEND.md', md);

  // 04 FRONTEND
  const totalChamadas = frontends.reduce((s, m) => s + m.chamadasHTTP.length, 0);
  md = `# 🖥️ CHAMADAS HTTP DO FRONTEND (${totalChamadas})\n\n`;
  const chamadasPorTipo = { fetch: 0, axios: 0, xhr: 0, jquery: 0 };
  for (const mod of frontends) for (const c of mod.chamadasHTTP) chamadasPorTipo[c.tipo] = (chamadasPorTipo[c.tipo] || 0) + 1;
  md += `| Tipo | Quantidade |\n|---|---|\n`;
  for (const [tipo, q] of Object.entries(chamadasPorTipo)) md += `| ${tipo} | ${q} |\n`;
  md += `\n`;
  for (const mod of frontends) {
    if (!mod.chamadasHTTP.length) continue;
    md += `## 📄 ${mod.rel}\n\n| Método | URL | Linha | Tipo |\n|---|---|---|---|\n`;
    for (const c of mod.chamadasHTTP) md += `| ${c.metodo} | \`${c.url}\` | ${c.linha} | ${c.tipo || 'fetch'} |\n`;
    md += `\n`;
  }
  gravar('04_FLUXO_FRONTEND.md', md);

  // 05 BANCO
  md = `# 🗄️ BANCO DE DADOS — Tabelas e Operações\n\n| Tabela | Operações | Arquivos que usam |\n|---|---|---|\n`;
  for (const [tab, info] of Object.entries(tabelasGlobais).sort()) {
    md += `| \`${tab}\` | ${[...info.ops].join(', ')} | ${[...info.arquivos].join(', ')} |\n`;
  }
  md += `\n## 📐 Schemas encontrados no código (CREATE TABLE)\n\n`;
  let achouSchema = false;
  for (const mod of modulos) for (const s of mod.schemas) {
    achouSchema = true;
    md += `### ${mod.rel}:${s.linha}\n\`\`\`sql\n${s.sql}\n\`\`\`\n\n`;
  }
  if (!achouSchema) md += `_Nenhum CREATE TABLE encontrado no código (tabelas só existem nos .db)_\n`;
  gravar('05_BANCO_DADOS.md', md);

  // 06 ENV
  md = `# 🔧 VARIÁVEIS DE AMBIENTE USADAS NO CÓDIGO\n\n| Variável | Arquivos |\n|---|---|\n`;
  for (const [v, arqs] of Object.entries(envGlobal).sort()) md += `| \`${v}\` | ${[...arqs].join(', ')} |\n`;
  gravar('06_ENV_CONFIG.md', md);

  // 07 ÓRFÃOS
  const orfas = [];
  for (const mod of modulos) for (const r of mod.rotas) if (r.status === 'nao') orfas.push({ mod, r });
  const funcoesOrfas = [];
  for (const mod of backends) {
    for (const exp of mod.exportados) {
      let usado = false;
      for (const outro of backends) {
        if (outro === mod) continue;
        if (outro.requisicoes.some(rq => rq.alvo === mod)) {
          if (outro.conteudo.includes(`.${exp}(`) || new RegExp(`const\\s*\\{[^}]*\\b${exp}\\b`).test(outro.conteudo)) { usado = true; break; }
        }
      }
      if (!usado) funcoesOrfas.push({ mod, exp });
    }
  }
  md = `# 👻 POSSÍVEIS ÓRFÃOS (heurística — confirme antes de deletar!)\n\n`;
  md += `⚠️ Falsos positivos comuns: rotas chamadas por apps externos (WhatsApp, MercadoPago), URLs montadas dinamicamente, funções chamadas via reflexão.\n\n`;
  md += `## 🛤️ Rotas sem chamada correspondente no frontend (${orfas.length})\n\n`;
  for (const { mod, r } of orfas) md += `- \`${r.metodo} ${r.final}\` — ${mod.rel}:${r.linha}\n`;
  md += `\n## ⚙️ Funções exportadas nunca referenciadas (${funcoesOrfas.length})\n\n`;
  for (const { mod, exp } of funcoesOrfas) md += `- \`${exp}\` — ${mod.rel}\n`;
  md += `\n## 📦 Dependências npm não usadas\n\n`;
  if (pkg) {
    const naoUsadas = pkg.dependencias.filter(d => !dependenciasUsadas.has(d));
    if (naoUsadas.length) {
      for (const dep of naoUsadas) md += `- \`${dep}\` — instalada mas não usada no código\n`;
    } else {
      md += `_Todas as dependências estão sendo usadas_\n`;
    }
  }
  gravar('07_ORFAOS.md', md);

  // 08 DEPENDÊNCIAS - NOVO
  md = `# 📦 ANÁLISE DE DEPENDÊNCIAS NPM\n\n`;
  if (pkg) {
    md += `## 📊 Visão Geral\n\n`;
    md += `| Métrica | Valor |\n|---|---|\n`;
    md += `| Nome do projeto | ${pkg.name} |\n`;
    md += `| Versão | ${pkg.version || 'N/A'} |\n`;
    md += `| Dependências | ${pkg.dependencias.length} |\n`;
    md += `| Dev Dependências | ${pkg.devDependencias.length} |\n`;
    md += `| Scripts | ${pkg.scripts.length} |\n\n`;

    md += `## 📦 Dependências em produção\n\n`;
    for (const dep of pkg.dependencias) {
      const usada = dependenciasUsadas.has(dep);
      md += `- ${usada ? '✅' : '⚠️'} \`${dep}\`${!usada ? ' — **não usada no código**' : ''}\n`;
    }

    md += `\n## 🛠️ Dev Dependências\n\n`;
    for (const dep of pkg.devDependencias) {
      md += `- \`${dep}\`\n`;
    }

    md += `\n## 📜 Scripts disponíveis\n\n`;
    for (const script of pkg.scripts) {
      md += `- \`${script}\`\n`;
    }
  } else {
    md += `_package.json não encontrado_\n`;
  }
  gravar('08_DEPENDENCIAS.md', md);

  /* ---------- RESUMO NO CONSOLE ---------- */
  console.log(`\n✅ RELATÓRIOS GERADOS EM: analysis/logica/\n`);
  for (const nome of fs.readdirSync(SAIDA)) {
    const tam = fs.statSync(path.join(SAIDA, nome)).size;
    console.log(`   📄 ${nome} (${(tam / 1024).toFixed(1)} KB)`);
  }
  console.log(`\n📊 Resumo: ${totalRotas} rotas · ${totalFuncoes} funções · ${Object.keys(tabelasGlobais).length} tabelas · ${orfas.length} rotas órfãs · ${funcoesOrfas.length} funções órfãs`);
  if (pkg) {
    const naoUsadas = pkg.dependencias.filter(d => !dependenciasUsadas.has(d));
    console.log(`📦 Dependências não usadas: ${naoUsadas.length}`);
  }
  console.log(`\n💡 Próximo passo: envie os relatórios para a IA um por um, começando pelo 00_INDICE.md!`);
}

try {
  main();
} catch (erro) {
  console.error('❌ Erro fatal:', erro.message);
  console.error(erro.stack);
  process.exit(1);
}