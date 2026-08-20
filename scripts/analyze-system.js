// scripts/analyze-system.js
// Script para analisar toda a estrutura do sistema SEE&AGENDE
// ULTIMA ATUALIZACAO: 19/08/2026

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuração
const CONFIG = {
    rootDir: path.resolve(__dirname, '..'),
    outputDir: path.resolve(__dirname, '..', 'analysis'),
    ignoreDirs: ['node_modules', '.git', 'analysis', 'lixo', 'backup', 'logs', 'tmp'],
    ignoreFiles: ['.env', '.env.local', '*.log', '*.db', '*.sqlite'],
    extensions: ['.js', '.html', '.css', '.json', '.md', '.txt', '.ejs']
};

// Estrutura para armazenar a análise
const analysis = {
    summary: {
        totalFiles: 0,
        totalLines: 0,
        totalDirectories: 0,
        fileTypes: {},
        largestFiles: [],
        oldestFiles: []
    },
    backend: {
        routes: [],
        middlewares: [],
        services: [],
        jobs: [],
        models: [],
        scripts: []
    },
    frontend: {
        pages: [],
        components: [],
        styles: [],
        assets: []
    },
    database: {
        tables: [],
        queries: [],
        migrations: []
    },
    features: {
        whatsapp: {
            status: '✅ OK',
            files: [],
            routes: []
        },
        financeiro: {
            status: '✅ OK',
            files: [],
            routes: []
        },
        agendamentos: {
            status: '✅ OK',
            files: [],
            routes: []
        },
        clientes: {
            status: '✅ OK',
            files: [],
            routes: []
        },
        admin: {
            status: '✅ OK',
            files: [],
            routes: []
        }
    },
    dependencies: {
        packages: {},
        versions: {}
    },
    structure: {
        backend: {},
        frontend: {},
        scripts: {}
    }
};

// Funções auxiliares
function getFileStats(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats;
    } catch (error) {
        return null;
    }
}

function countLines(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.split('\n').length;
    } catch (error) {
        return 0;
    }
}

function getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase();
}

function isDirectory(dirPath) {
    try {
        return fs.statSync(dirPath).isDirectory();
    } catch (error) {
        return false;
    }
}

function shouldIgnore(dirPath) {
    const name = path.basename(dirPath);
    // Ignorar diretórios configurados
    if (CONFIG.ignoreDirs.includes(name)) return true;
    // Ignorar diretórios que começam com .
    if (name.startsWith('.')) return true;
    return false;
}

// Função principal de análise
function analyzeDirectory(dirPath, depth = 0) {
    const items = fs.readdirSync(dirPath);
    const relativePath = path.relative(CONFIG.rootDir, dirPath);
    const name = path.basename(dirPath);

    // Se deve ignorar, retorna vazio
    if (shouldIgnore(dirPath) && depth > 0) return;

    analysis.summary.totalDirectories++;

    items.forEach(item => {
        const itemPath = path.join(dirPath, item);
        
        if (isDirectory(itemPath)) {
            // Se for um diretório, analisa recursivamente
            if (!shouldIgnore(itemPath)) {
                analyzeDirectory(itemPath, depth + 1);
            }
            return;
        }

        // Analisar arquivo
        const ext = getFileExtension(itemPath);
        const isAnalyzedExt = CONFIG.extensions.includes(ext);
        
        if (!isAnalyzedExt) return;

        analysis.summary.totalFiles++;
        const lines = countLines(itemPath);
        analysis.summary.totalLines += lines;

        // Estatísticas por tipo de arquivo
        if (!analysis.summary.fileTypes[ext]) {
            analysis.summary.fileTypes[ext] = { count: 0, lines: 0 };
        }
        analysis.summary.fileTypes[ext].count++;
        analysis.summary.fileTypes[ext].lines += lines;

        // Classificar arquivos por tipo
        classifyFile(itemPath, item, ext, relativePath);

        // Arquivos grandes
        if (lines > 500) {
            analysis.summary.largestFiles.push({
                path: relativePath,
                lines: lines
            });
        }

        // Arquivos antigos (baseado na data de modificação)
        const stats = getFileStats(itemPath);
        if (stats) {
            const age = Date.now() - stats.mtime.getTime();
            if (age > 30 * 24 * 60 * 60 * 1000) { // mais de 30 dias
                analysis.summary.oldestFiles.push({
                    path: relativePath,
                    modified: stats.mtime
                });
            }
        }

        // Identificar dependências (package.json)
        if (path.basename(item) === 'package.json') {
            try {
                const pkg = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
                analysis.dependencies.packages = pkg.dependencies || {};
                analysis.dependencies.versions = {
                    node: pkg.engines?.node || 'N/A',
                    npm: pkg.engines?.npm || 'N/A'
                };
            } catch (error) {}
        }
    });
}

// Classificar arquivos por categoria
function classifyFile(filePath, fileName, ext, relativePath) {
    // Backend
    if (filePath.includes('/server/') || filePath.includes('\\server\\')) {
        if (filePath.includes('/routes/') || filePath.includes('\\routes\\')) {
            analysis.backend.routes.push(relativePath);
            // Identificar features
            identifyFeature(relativePath, 'routes');
        } else if (filePath.includes('/middlewares/') || filePath.includes('\\middlewares\\')) {
            analysis.backend.middlewares.push(relativePath);
        } else if (filePath.includes('/services/') || filePath.includes('\\services\\')) {
            analysis.backend.services.push(relativePath);
        } else if (filePath.includes('/jobs/') || filePath.includes('\\jobs\\')) {
            analysis.backend.jobs.push(relativePath);
        } else if (filePath.includes('/models/') || filePath.includes('\\models\\')) {
            analysis.backend.models.push(relativePath);
        } else if (fileName === 'server.js' || fileName === 'app.js' || fileName === 'index.js') {
            analysis.structure.backend.main = relativePath;
        }
    }
    // Scripts
    else if (filePath.includes('/scripts/') || filePath.includes('\\scripts\\')) {
        analysis.backend.scripts.push(relativePath);
        if (fileName.includes('migrate') || fileName.includes('migration')) {
            analysis.database.migrations.push(relativePath);
        }
    }
    // Frontend
    else if (filePath.includes('/public/') || filePath.includes('\\public\\')) {
        if (ext === '.js' && (filePath.includes('/js/pages/') || filePath.includes('\\js\\pages\\'))) {
            analysis.frontend.pages.push(relativePath);
        } else if (ext === '.js' && (filePath.includes('/js/components/') || filePath.includes('\\js\\components\\'))) {
            analysis.frontend.components.push(relativePath);
        } else if (ext === '.css') {
            analysis.frontend.styles.push(relativePath);
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(ext)) {
            analysis.frontend.assets.push(relativePath);
        }
    }
    // Database
    else if (fileName.includes('schema') || fileName.includes('migration') || fileName.includes('.sql')) {
        analysis.database.queries.push(relativePath);
    }
}

// Identificar features baseado nas rotas
function identifyFeature(routePath, type) {
    const features = {
        'whatsapp': ['whatsapp', 'evolution', 'instancia'],
        'financeiro': ['financeiro', 'despesa', 'receita', 'pagamento'],
        'agendamentos': ['agendamento', 'schedule', 'booking'],
        'clientes': ['cliente', 'customer', 'promocao'],
        'admin': ['admin', 'super', 'empresa', 'usuario']
    };

    const lowerPath = routePath.toLowerCase();
    for (const [feature, keywords] of Object.entries(features)) {
        if (keywords.some(kw => lowerPath.includes(kw))) {
            if (type === 'routes') {
                analysis.features[feature].routes.push(routePath);
            }
            analysis.features[feature].files.push(routePath);
            // Atualizar status
            analysis.features[feature].status = '✅ OK';
            break;
        }
    }
}

// Gerar relatório
function generateReport() {
    const report = {
        timestamp: new Date().toISOString(),
        analysis: analysis,
        recommendations: generateRecommendations(),
        quickFixes: generateQuickFixes()
    };
    return report;
}

// Gerar recomendações
function generateRecommendations() {
    const recs = [];

    // Verificar WhatsApp
    if (analysis.features.whatsapp.routes.length === 0) {
        recs.push('⚠️ Nenhuma rota WhatsApp encontrada - Verificar integração');
    }

    // Verificar Financeiro
    if (analysis.features.financeiro.routes.length === 0) {
        recs.push('⚠️ Nenhuma rota Financeiro encontrada - Verificar módulo');
    }

    // Verificar arquivos grandes
    if (analysis.summary.largestFiles.length > 0) {
        recs.push('📏 Arquivos grandes encontrados:');
        analysis.summary.largestFiles.slice(0, 5).forEach(f => {
            recs.push(`   - ${f.path} (${f.lines} linhas)`);
        });
    }

    // Verificar rotas
    if (analysis.backend.routes.length < 10) {
        recs.push('⚠️ Poucas rotas encontradas - Verificar estrutura do backend');
    }

    // Verificar frontend
    if (analysis.frontend.pages.length === 0) {
        recs.push('⚠️ Nenhuma página frontend encontrada - Verificar public/js/pages/');
    }

    return recs;
}

// Gerar quick fixes
function generateQuickFixes() {
    const fixes = [];

    // Verificar arquivos essenciais
    const essentialFiles = [
        'server.js',
        'package.json',
        'public/index.html',
        'public/js/pages/dashboard.js',
        'public/js/pages/agendamentos.js'
    ];

    essentialFiles.forEach(file => {
        const fullPath = path.join(CONFIG.rootDir, file);
        if (!fs.existsSync(fullPath)) {
            fixes.push(`❌ Arquivo essencial não encontrado: ${file}`);
        }
    });

    // Verificar se tem arquivos .env
    if (!fs.existsSync(path.join(CONFIG.rootDir, '.env'))) {
        fixes.push('⚠️ Arquivo .env não encontrado - Criar com variáveis necessárias');
    }

    // Verificar dependências
    if (!fs.existsSync(path.join(CONFIG.rootDir, 'node_modules'))) {
        fixes.push('⚠️ node_modules não encontrado - Executar npm install');
    }

    return fixes;
}

// Salvar relatório
function saveReport(report) {
    // Criar diretório de saída
    if (!fs.existsSync(CONFIG.outputDir)) {
        fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    // Salvar como JSON
    const jsonPath = path.join(CONFIG.outputDir, `system-analysis-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`✅ Relatório salvo em: ${jsonPath}`);

    // Salvar como Markdown
    const mdPath = path.join(CONFIG.outputDir, `system-analysis-${Date.now()}.md`);
    const md = generateMarkdownReport(report);
    fs.writeFileSync(mdPath, md);
    console.log(`✅ Relatório Markdown salvo em: ${mdPath}`);
}

// Gerar relatório em Markdown
function generateMarkdownReport(report) {
    const { analysis, timestamp, recommendations, quickFixes } = report;
    let md = `# 📊 SEE&AGENDE - ANÁLISE COMPLETA DO SISTEMA\n\n`;
    md += `**Data da Análise:** ${new Date(timestamp).toLocaleString('pt-BR')}\n\n`;
    md += `---\n\n`;

    // Sumário
    md += `## 📈 SUMÁRIO\n\n`;
    md += `| Métrica | Valor |\n`;
    md += `|---------|-------|\n`;
    md += `| Total de Arquivos | ${analysis.summary.totalFiles} |\n`;
    md += `| Total de Linhas | ${analysis.summary.totalLines} |\n`;
    md += `| Total de Diretórios | ${analysis.summary.totalDirectories} |\n\n`;

    // Tipos de arquivo
    md += `### 📁 Tipos de Arquivo\n\n`;
    md += `| Extensão | Quantidade | Linhas |\n`;
    md += `|----------|------------|--------|\n`;
    Object.entries(analysis.summary.fileTypes).forEach(([ext, data]) => {
        md += `| ${ext} | ${data.count} | ${data.lines} |\n`;
    });
    md += `\n`;

    // Backend
    md += `## 🖥️ BACKEND\n\n`;
    md += `### Rotas (${analysis.backend.routes.length})\n\n`;
    if (analysis.backend.routes.length > 0) {
        analysis.backend.routes.forEach(route => {
            md += `- ${route}\n`;
        });
        md += `\n`;
    }

    md += `### Middlewares (${analysis.backend.middlewares.length})\n\n`;
    analysis.backend.middlewares.forEach(mw => {
        md += `- ${mw}\n`;
    });
    md += `\n`;

    md += `### Services (${analysis.backend.services.length})\n\n`;
    analysis.backend.services.forEach(service => {
        md += `- ${service}\n`;
    });
    md += `\n`;

    md += `### Jobs (${analysis.backend.jobs.length})\n\n`;
    analysis.backend.jobs.forEach(job => {
        md += `- ${job}\n`;
    });
    md += `\n`;

    // Frontend
    md += `## 🎨 FRONTEND\n\n`;
    md += `### Páginas (${analysis.frontend.pages.length})\n\n`;
    analysis.frontend.pages.forEach(page => {
        md += `- ${page}\n`;
    });
    md += `\n`;

    md += `### Componentes (${analysis.frontend.components.length})\n\n`;
    analysis.frontend.components.forEach(comp => {
        md += `- ${comp}\n`;
    });
    md += `\n`;

    md += `### Estilos (${analysis.frontend.styles.length})\n\n`;
    analysis.frontend.styles.forEach(style => {
        md += `- ${style}\n`;
    });
    md += `\n`;

    // Features
    md += `## ⚡ FEATURES\n\n`;
    Object.entries(analysis.features).forEach(([feature, data]) => {
        md += `### ${feature.toUpperCase()} ${data.status}\n\n`;
        md += `**Arquivos:** ${data.files.length}\n\n`;
        md += `**Rotas:** ${data.routes.length}\n\n`;
        if (data.routes.length > 0) {
            data.routes.forEach(route => {
                md += `- ${route}\n`;
            });
            md += `\n`;
        }
    });

    // Dependências
    md += `## 📦 DEPENDÊNCIAS\n\n`;
    md += `**Node.js:** ${analysis.dependencies.versions.node}\n\n`;
    md += `**NPM:** ${analysis.dependencies.versions.npm}\n\n`;
    md += `### Pacotes Principais\n\n`;
    Object.entries(analysis.dependencies.packages).forEach(([pkg, version]) => {
        md += `- ${pkg}@${version}\n`;
    });
    md += `\n`;

    // Recomendações
    md += `## 💡 RECOMENDAÇÕES\n\n`;
    if (recommendations.length === 0) {
        md += `✅ Tudo parece OK!\n\n`;
    } else {
        recommendations.forEach(rec => {
            md += `- ${rec}\n`;
        });
        md += `\n`;
    }

    // Quick Fixes
    md += `## 🔧 QUICK FIXES\n\n`;
    if (quickFixes.length === 0) {
        md += `✅ Nenhum problema crítico encontrado!\n\n`;
    } else {
        quickFixes.forEach(fix => {
            md += `- ${fix}\n`;
        });
        md += `\n`;
    }

    md += `---\n`;
    md += `**Última Atualização:** ${new Date().toLocaleString('pt-BR')}\n`;

    return md;
}

// Função principal
function main() {
    console.log('🔍 Iniciando análise do sistema SEE&AGENDE...');
    console.log(`📁 Diretório raiz: ${CONFIG.rootDir}\n`);

    // Analisar diretório
    analyzeDirectory(CONFIG.rootDir);

    console.log(`📊 Análise concluída!`);
    console.log(`   Total de arquivos: ${analysis.summary.totalFiles}`);
    console.log(`   Total de linhas: ${analysis.summary.totalLines}`);
    console.log(`   Total de diretórios: ${analysis.summary.totalDirectories}`);

    // Gerar relatório
    const report = generateReport();
    saveReport(report);

    // Exibir resumo das features
    console.log(`\n📋 FEATURES ENCONTRADAS:`);
    Object.entries(analysis.features).forEach(([name, data]) => {
        console.log(`   ${name}: ${data.status} (${data.routes.length} rotas, ${data.files.length} arquivos)`);
    });

    // Exibir recomendações
    if (report.recommendations.length > 0) {
        console.log(`\n💡 RECOMENDAÇÕES:`);
        report.recommendations.forEach(rec => {
            console.log(`   ${rec}`);
        });
    }

    // Exibir quick fixes
    if (report.quickFixes.length > 0) {
        console.log(`\n🔧 QUICK FIXES:`);
        report.quickFixes.forEach(fix => {
            console.log(`   ${fix}`);
        });
    }

    console.log('\n✅ Análise finalizada!');
    console.log(`📁 Relatórios salvos em: ${CONFIG.outputDir}`);
}

// Executar
main();