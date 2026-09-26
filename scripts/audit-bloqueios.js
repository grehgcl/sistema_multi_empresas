// ============================================
// SCRIPT DE AUDITORIA — SISTEMA DE BLOQUEIOS
// Uso: node scripts/audit-bloqueios.js
// ============================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// Cores ANSI
const C = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m'
};

const log = {
    header: (t) => console.log(`\n${C.bright}${C.cyan}══════════════════════════════════════════════════════════${C.reset}\n${C.bright}${C.cyan}${t}${C.reset}\n${C.cyan}══════════════════════════════════════════════════════════${C.reset}\n`),
    sub: (t) => console.log(`\n${C.bright}${C.blue}▸ ${t}${C.reset}`),
    ok: (t) => console.log(`  ${C.green}✅ ${t}${C.reset}`),
    warn: (t) => console.log(`  ${C.yellow}⚠️  ${t}${C.reset}`),
    err: (t) => console.log(`  ${C.red}❌ ${t}${C.reset}`),
    info: (t) => console.log(`  ${C.gray}ℹ️  ${t}${C.reset}`),
    line: (t) => console.log(`     ${t}`)
};

// ============================================
// 1. ARQUIVOS MODIFICADOS (git)
// ============================================
function auditarGit() {
    log.header('📦 1. ARQUIVOS MODIFICADOS (via git)');

    try {
        // Branch atual
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT })
            .toString().trim();
        log.ok(`Branch atual: ${C.bright}${branch}${C.reset}`);

        // Último commit
        const commit = execSync('git log -1 --pretty=format:"%h - %s (%cr)"', { cwd: ROOT })
            .toString().trim();
        log.ok(`Último commit: ${commit}`);

        // Arquivos com modificação não commitada
        const status = execSync('git status --porcelain', { cwd: ROOT })
            .toString().trim();

        if (!status) {
            log.warn('Nenhum arquivo modificado (tudo commitado)');
        } else {
            log.sub('Arquivos não commitados:');
            status.split('\n').forEach(line => {
                const code = line.substring(0, 2);
                const file = line.substring(3);
                if (code.startsWith('M')) log.line(`${C.yellow}M${C.reset}  ${file}`);
                else if (code.startsWith('A')) log.line(`${C.green}A${C.reset}  ${file}`);
                else if (code.startsWith('D')) log.line(`${C.red}D${C.reset}  ${file}`);
                else if (code.startsWith('??')) log.line(`${C.magenta}?${C.reset}  ${file}`);
                else log.line(`${code}  ${file}`);
            });
        }

        // Commits recentes que mexeram em bloqueios
        log.sub('Últimos 10 commits que mexeram em bloqueios/helpers/horarios:');
        try {
            const commits = execSync(
                'git log --oneline -10 -- server/utils/helpers.js server/routes/horarios.routes.js server/routes/agendamentos.routes.js server/routes/chatbot.routes.js public/js/pages/configuracoes.js public/js/pages/agendamentos.js',
                { cwd: ROOT }
            ).toString().trim();
            if (commits) commits.split('\n').forEach(l => log.line(l));
            else log.info('Nenhum commit relacionado');
        } catch (e) {
            log.info('Não foi possível listar commits');
        }

    } catch (e) {
        log.err(`Git não disponível ou repositório não inicializado: ${e.message}`);
    }
}

// ============================================
// 2. ESTADO DOS ARQUIVOS-CHAVE
// ============================================
function auditarArquivos() {
    log.header('📄 2. ESTADO DOS ARQUIVOS-CHAVE');

    const arquivos = [
        'server/utils/helpers.js',
        'server/routes/horarios.routes.js',
        'server/routes/agendamentos.routes.js',
        'server/routes/chatbot.routes.js',
        'public/js/pages/configuracoes.js',
        'public/js/pages/agendamentos.js',
        'server/config/migrations/bloqueios-agenda.sql',
        'server/config/migrations/run-bloqueios.js'
    ];

    arquivos.forEach(rel => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) {
            log.err(`${rel} — NÃO EXISTE`);
            return;
        }
        const stat = fs.statSync(abs);
        const conteudo = fs.readFileSync(abs, 'utf8');
        const linhas = conteudo.split('\n').length;
        const data = stat.mtime.toLocaleString('pt-BR');

        log.line(`${C.green}✔${C.reset} ${C.bright}${rel}${C.reset}`);
        log.line(`    ${linhas} linhas · modificado ${data}`);
    });
}

// ============================================
// 3. ONDE O FILTRO DE BLOQUEIO FOI INSERIDO
// ============================================
function auditarFiltrosBackend() {
    log.header('🔎 3. FILTROS DE BLOQUEIO NO BACKEND');

    const arquivos = [
        { path: 'server/routes/agendamentos.routes.js', desc: 'Rota de agendamentos' },
        { path: 'server/routes/chatbot.routes.js', desc: 'Rota do chatbot' },
        { path: 'server/routes/horarios.routes.js', desc: 'Rotas de horários' }
    ];

    arquivos.forEach(({ path: rel, desc }) => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) return;

        const conteudo = fs.readFileSync(abs, 'utf8');
        const linhas = conteudo.split('\n');

        log.sub(`${rel} (${desc})`);

        // Procura por chamadas de estaBloqueado e datasBloqueadasMes
        let achouAlgo = false;
        linhas.forEach((linha, i) => {
            if (linha.includes('estaBloqueado') || linha.includes('datasBloqueadasMes')) {
                achouAlgo = true;
                const n = i + 1;
                const trimmed = linha.trim();
                log.line(`  ${C.green}L${n}${C.reset} → ${trimmed.substring(0, 100)}`);
            }
        });

        if (!achouAlgo) {
            log.warn(`Nenhum uso de estaBloqueado/datasBloqueadasMes`);
        }
    });
}

// ============================================
// 4. IMPORT DO HELPER
// ============================================
function auditarImports() {
    log.header('📥 4. IMPORTS DO HELPER NOS ARQUIVOS');

    const arquivos = [
        'server/routes/agendamentos.routes.js',
        'server/routes/chatbot.routes.js',
        'server/routes/horarios.routes.js',
        'server/config/migrations/run-bloqueios.js'
    ];

    arquivos.forEach(rel => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) return;

        const conteudo = fs.readFileSync(abs, 'utf8');
        const linhas = conteudo.split('\n');

        log.sub(rel);

        let achouImport = false;
        linhas.slice(0, 40).forEach((linha, i) => {
            if (linha.includes("require('../utils/helpers')") ||
                linha.includes("require('./helpers')") ||
                linha.includes("estaBloqueado") && linha.includes("require")) {
                achouImport = true;
                log.line(`  ${C.green}L${i + 1}${C.reset} → ${linha.trim()}`);
            }
        });

        if (!achouImport) {
            log.warn(`Nenhum import de estaBloqueado/datasBloqueadasMes`);
        }
    });
}

// ============================================
// 5. ONDE A AGENDA INTELIGENTE BUSCA HORÁRIOS
// ============================================
function auditarAgendaInteligente() {
    log.header('📅 5. ONDE A AGENDA INTELIGENTE BUSCA HORÁRIOS');

    const candidatos = [
        'public/js/pages/agendamentos.js',
        'public/js/pages/agendamentos-profissional.js',
        'public/js/pages/dashboard.js'
    ];

    candidatos.forEach(rel => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) return;

        const conteudo = fs.readFileSync(abs, 'utf8');
        const linhas = conteudo.split('\n');

        log.sub(`${rel}`);

        // Procura por chamadas de horarios-disponiveis ou geração local
        let achouFetch = false;
        linhas.forEach((linha, i) => {
            const n = i + 1;
            const l = linha.trim();

            // fetch para horarios-disponiveis
            if (l.includes('horarios-disponiveis') || l.includes('horarios_disponiveis')) {
                achouFetch = true;
                log.line(`  ${C.green}FETCH L${n}${C.reset} → ${l.substring(0, 110)}`);
            }

            // fetch para bloqueios
            if (l.includes('/bloqueios')) {
                log.line(`  ${C.green}BLOQ L${n}${C.reset} → ${l.substring(0, 110)}`);
            }

            // Geração local de horários (suspeito de ignorar bloqueio)
            if ((l.includes('gerarHorarios') || l.includes('horaAtual') || l.includes('setInterval')) &&
                (l.includes('hora_inicio') || l.includes('horaInicio'))) {
                log.line(`  ${C.yellow}LOCAL L${n}${C.reset} → ${l.substring(0, 110)}`);
            }
        });

        if (!achouFetch) {
            log.warn('Nenhuma chamada a horarios-disponiveis encontrada');
        }
    });

    // Procura por função carregarAgendaInteligente
    log.sub('Função carregarAgendaInteligente()');
    const buscarEm = [
        'public/js/pages/agendamentos.js',
        'public/js/pages/dashboard.js'
    ];

    buscarEm.forEach(rel => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) return;
        const conteudo = fs.readFileSync(abs, 'utf8');
        const linhas = conteudo.split('\n');
        linhas.forEach((linha, i) => {
            if (linha.includes('carregarAgendaInteligente')) {
                log.line(`  ${rel}:${i + 1} → ${linha.trim().substring(0, 100)}`);
            }
        });
    });
}

// ============================================
// 6. BANCO DE DADOS
// ============================================
function auditarBanco() {
    log.header('🗄️ 6. BANCO DE DADOS — TABELA bloqueios_agenda');

    let sqlite3;
    try {
        sqlite3 = require(path.join(ROOT, 'node_modules', 'sqlite3'));
    } catch (e) {
        log.err('sqlite3 não instalado. Rode: npm install sqlite3');
        return;
    }

    const dbDir = path.join(ROOT, 'database');
    if (!fs.existsSync(dbDir)) {
        log.err(`Pasta database/ não encontrada em ${dbDir}`);
        return;
    }

    const arquivos = fs.readdirSync(dbDir).filter(f => f.endsWith('.db'));

    if (arquivos.length === 0) {
        log.warn('Nenhum arquivo .db encontrado');
        return;
    }

    log.ok(`${arquivos.length} banco(s) encontrado(s)`);

    arquivos.forEach(arquivo => {
        const abs = path.join(dbDir, arquivo);
        const db = new sqlite3.Database(abs);

        db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='bloqueios_agenda'", (err, rows) => {
            if (err) {
                log.err(`${arquivo}: ${err.message}`);
                db.close();
                return;
            }

            if (!rows || rows.length === 0) {
                log.warn(`${arquivo}: SEM tabela bloqueios_agenda`);
                db.close();
                return;
            }

            // Tem tabela → conta bloqueios
            db.all('SELECT COUNT(*) as total FROM bloqueios_agenda WHERE ativo = 1', (err2, r2) => {
                if (err2) {
                    log.err(`${arquivo}: ${err2.message}`);
                    db.close();
                    return;
                }
                const total = r2[0]?.total || 0;
                log.ok(`${arquivo}: tabela OK, ${total} bloqueio(s) ativo(s)`);

                if (total > 0) {
                    db.all('SELECT id, profissional_id, tipo, data_inicio, data_fim, dia_inteiro, hora_inicio, hora_fim, motivo FROM bloqueios_agenda WHERE ativo = 1 LIMIT 5', (err3, r3) => {
                        if (!err3 && r3) {
                            r3.forEach(b => {
                                log.line(`     • ID ${b.id}: ${b.tipo} ${b.data_inicio}${b.data_fim ? '→' + b.data_fim : ''} | ${b.dia_inteiro ? 'DIA INTEIRO' : `${b.hora_inicio}–${b.hora_fim}`} | prof:${b.profissional_id || 'todos'} | ${b.motivo || '-'}`);
                            });
                        }
                        db.close();
                    });
                } else {
                    db.close();
                }
            });
        });
    });
}

// ============================================
// 7. RESUMO DE ROTAS DE DISPONIBILIDADE
// ============================================
function auditarRotas() {
    log.header('🛤️ 7. ROTAS DE DISPONIBILIDADE ENCONTRADAS');

    const arquivos = [
        'server/routes/agendamentos.routes.js',
        'server/routes/chatbot.routes.js'
    ];

    arquivos.forEach(rel => {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) return;

        const conteudo = fs.readFileSync(abs, 'utf8');
        const linhas = conteudo.split('\n');

        log.sub(rel);

        linhas.forEach((linha, i) => {
            const l = linha.trim();
            if (/router\.(get|post|put|delete)\(['"]\/horarios-disponiveis/.test(l) ||
                /router\.(get|post|put|delete)\(['"]\/datas-disponiveis-mes/.test(l)) {
                log.line(`  ${C.green}L${i + 1}${C.reset} → ${l}`);
            }
        });
    });
}

// ============================================
// MAIN
// ============================================
console.log(`\n${C.bright}${C.magenta}`);
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   🔍 AUDITORIA — SISTEMA DE BLOQUEIOS DE AGENDA          ║');
console.log('║   SEE&AGENDE                                             ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(C.reset);

console.log(`${C.gray}Diretório raiz: ${ROOT}${C.reset}`);
console.log(`${C.gray}Data: ${new Date().toLocaleString('pt-BR')}${C.reset}`);

auditarGit();
auditarArquivos();
auditarImports();
auditarFiltrosBackend();
auditarRotas();
auditarAgendaInteligente();
auditarBanco();

// Espera um pouco para o banco terminar de ler
setTimeout(() => {
    log.header('✅ FIM DA AUDITORIA');
    console.log(`${C.gray}Próximo passo: analisar os pontos marcados com ❌ ou ⚠️`);
    console.log(`Se a seção "5. ONDE A AGENDA INTELIGENTE BUSCA HORÁRIOS" não mostrar nenhuma chamada de fetch para /horarios-disponiveis,`);
    console.log(`é porque o frontend está gerando os horários localmente e ignorando o backend. 🎯${C.reset}\n`);
}, 2000);