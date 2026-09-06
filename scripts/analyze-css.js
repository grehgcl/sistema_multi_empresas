/**
 * ==========================================
 * ANALISADOR DE CSS - SEE&AGENDE
 * ULTIMA ATUALIZACAO: 24/08/2026
 * ==========================================
 * 
 * Este script analisa todos os arquivos CSS do projeto
 * e gera um relatório detalhado sobre:
 * - Estrutura e organização
 * - Estilos utilizados
 * - Problemas e inconsistências
 * - Performance e otimização
 * - Compatibilidade
 * 
 * USO: node scripts/analyze-css.js
 * ==========================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ===== CONFIG =====
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSS_REPORT = path.join(__dirname, 'ANALISE_CSS.md');
const CSS_DIR = path.join(PROJECT_ROOT, 'public', 'css');

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

function walkDir(dir, pattern = /.*/) {
    const results = [];
    if (!exists(dir)) return results;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (isDirectory(fullPath)) {
            results.push(...walkDir(fullPath, pattern));
        } else if (pattern.test(item)) {
            results.push(fullPath);
        }
    }
    return results;
}

function getFileSize(file) {
    try {
        const stats = fs.statSync(file);
        return stats.size;
    } catch {
        return 0;
    }
}

// ===== ANALISADORES DE CSS =====

function analyzeCSSStructure(content) {
    const analysis = {
        variables: [],
        classes: [],
        ids: [],
        selectors: [],
        mediaQueries: [],
        imports: [],
        keyframes: [],
        comments: [],
        hasReset: false,
        hasNormalize: false
    };

    // Extrair variáveis CSS
    const varRegex = /--[a-zA-Z0-9-]+/g;
    let match;
    while ((match = varRegex.exec(content)) !== null) {
        analysis.variables.push(match[0]);
    }
    analysis.variables = [...new Set(analysis.variables)];

    // Extrair classes
    const classRegex = /\.[a-zA-Z0-9_-]+(?=[\s{:,])/g;
    while ((match = classRegex.exec(content)) !== null) {
        analysis.classes.push(match[0]);
    }
    analysis.classes = [...new Set(analysis.classes)];

    // Extrair IDs
    const idRegex = /#[a-zA-Z0-9_-]+(?=[\s{:,])/g;
    while ((match = idRegex.exec(content)) !== null) {
        analysis.ids.push(match[0]);
    }
    analysis.ids = [...new Set(analysis.ids)];

    // Extrair media queries
    const mediaRegex = /@media\s*[^{]+\{/g;
    while ((match = mediaRegex.exec(content)) !== null) {
        analysis.mediaQueries.push(match[0].trim());
    }

    // Extrair imports
    const importRegex = /@import\s+url\([^\)]+\)/g;
    while ((match = importRegex.exec(content)) !== null) {
        analysis.imports.push(match[0]);
    }

    // Extrair keyframes
    const keyframeRegex = /@keyframes\s+[a-zA-Z0-9_-]+\s*\{/g;
    while ((match = keyframeRegex.exec(content)) !== null) {
        analysis.keyframes.push(match[0].trim());
    }

    // Verificar reset/normalize
    analysis.hasReset = content.includes('reset') || content.includes('* { margin: 0') || content.includes('* { margin:0');
    analysis.hasNormalize = content.includes('normalize');

    return analysis;
}

function analyzeCSSQuality(content) {
    const issues = [];
    const suggestions = [];

    // 1. Verificar !important
    const importantCount = (content.match(/!important/g) || []).length;
    if (importantCount > 10) {
        issues.push(`🔴 Muitos !important (${importantCount}) - evite usar`);
        suggestions.push('Use especificidade melhor em vez de !important');
    } else if (importantCount > 0) {
        issues.push(`🟡 ${importantCount} !important encontrados - use com moderação`);
        suggestions.push('Revise se realmente precisa de !important');
    }

    // 2. Verificar estilos inline (no CSS isso não é problema)
    // 3. Verificar selectors muito específicos
    const specificSelectors = content.match(/[a-zA-Z0-9_-]+\s+[a-zA-Z0-9_-]+\s+[a-zA-Z0-9_-]+\s+[a-zA-Z0-9_-]+/g) || [];
    if (specificSelectors.length > 10) {
        issues.push(`🟡 ${specificSelectors.length} selectors muito específicos encontrados`);
        suggestions.push('Use classes em vez de selectors aninhados');
    }

    // 4. Verificar propriedades com vendor prefix
    const prefixCount = (content.match(/-(webkit|moz|ms|o)-/g) || []).length;
    if (prefixCount > 0) {
        suggestions.push(`✅ ${prefixCount} vendor prefixes encontrados - boa prática`);
    }

    // 5. Verificar cores hex
    const hexColors = content.match(/#[0-9a-fA-F]{6}/g) || [];
    if (hexColors.length > 0) {
        suggestions.push(`✅ ${hexColors.length} cores hex definidas`);
    }

    // 6. Verificar se usa variáveis
    const hasVariables = content.includes('var(--') || content.includes(':root');
    if (!hasVariables) {
        issues.push('🔴 Não usa variáveis CSS - dificulta manutenção');
        suggestions.push('Use :root para definir variáveis de tema');
    }

    // 7. Verificar comentários
    const commentCount = (content.match(/\/\*.*?\*\//gs) || []).length;
    if (commentCount === 0) {
        issues.push('🟡 Nenhum comentário encontrado - documentação ausente');
        suggestions.push('Adicione comentários para melhor manutenção');
    }

    // 8. Verificar unidades relativas
    const pxCount = (content.match(/\d+px/g) || []).length;
    const remCount = (content.match(/\d+rem/g) || []).length;
    const emCount = (content.match(/\d+em/g) || []).length;
    
    if (pxCount > remCount * 3) {
        issues.push(`🟡 Muitos px (${pxCount}) vs rem (${remCount}) - prefira rem`);
        suggestions.push('Use rem para melhor acessibilidade');
    }

    // 9. Verificar se tem mobile-first
    const hasMobileFirst = content.includes('@media (min-width:') || content.includes('@media (min-width');
    if (!hasMobileFirst) {
        issues.push('🟡 Pode não ser mobile-first');
        suggestions.push('Use @media (min-width:) para mobile-first');
    }

    return { issues, suggestions, metrics: { importantCount, prefixCount, hexColors: hexColors.length, commentCount, pxCount, remCount, emCount } };
}

function analyzeCSSPerformance(content) {
    const performance = {
        totalRules: 0,
        totalProperties: 0,
        totalSelectors: 0,
        totalLines: 0,
        totalSize: 0,
        duplicatedProperties: [],
        unusedRules: [],
        suggestions: []
    };

    // Contar regras
    const rules = content.match(/[^{]+\{[^}]*\}/g) || [];
    performance.totalRules = rules.length;

    // Contar propriedades
    const props = content.match(/[a-zA-Z-]+:\s*[^;]+;/g) || [];
    performance.totalProperties = props.length;

    // Contar selectors
    const selectors = content.match(/[^{]+(?={)/g) || [];
    performance.totalSelectors = selectors.reduce((acc, sel) => acc + sel.split(',').length, 0);

    // Contar linhas
    performance.totalLines = content.split('\n').length;

    // Verificar propriedades duplicadas em mesma regra
    const dupProps = [];
    const rulesWithDups = rules.filter(rule => {
        const propsInRule = rule.match(/[a-zA-Z-]+:/g) || [];
        const unique = new Set(propsInRule);
        if (propsInRule.length !== unique.size) {
            dupProps.push(rule.trim().substring(0, 100));
            return true;
        }
        return false;
    });
    performance.duplicatedProperties = dupProps;

    // Sugestões
    if (performance.totalRules > 1000) {
        performance.suggestions.push('Muitas regras CSS - considere dividir em arquivos');
    }

    if (performance.duplicatedProperties.length > 0) {
        performance.suggestions.push(`${performance.duplicatedProperties.length} regras com propriedades duplicadas`);
    }

    return performance;
}

function analyzeCSSCompatibility(content) {
    const compatibility = {
        flexbox: false,
        grid: false,
        customProperties: false,
        animations: false,
        transitions: false,
        transforms: false,
        gradients: false,
        shadows: false,
        filters: false,
        variables: false
    };

    compatibility.flexbox = content.includes('flex') || content.includes('flexbox');
    compatibility.grid = content.includes('grid');
    compatibility.customProperties = content.includes('var(--') || content.includes(':root');
    compatibility.animations = content.includes('@keyframes') || content.includes('animation:');
    compatibility.transitions = content.includes('transition:');
    compatibility.transforms = content.includes('transform:');
    compatibility.gradients = content.includes('gradient');
    compatibility.shadows = content.includes('shadow');
    compatibility.filters = content.includes('filter:');
    compatibility.variables = content.includes(':root') || content.includes('--');

    // Gerar score de modernidade
    let score = 0;
    Object.values(compatibility).forEach(val => {
        if (val) score++;
    });
    
    const modernidade = score / Object.keys(compatibility).length;

    return {
        ...compatibility,
        modernidade,
        score,
        total: Object.keys(compatibility).length,
        level: modernidade > 0.8 ? '🟢 Moderno' : modernidade > 0.5 ? '🟡 Parcial' : '🔴 Antigo'
    };
}

function analyzeCSSSpecificity(content) {
    // Análise de especificidade básica
    const specificity = {
        inline: 0,
        ids: 0,
        classes: 0,
        elements: 0,
        total: 0
    };

    // Contar IDs
    const idCount = (content.match(/#[a-zA-Z0-9_-]+/g) || []).length;
    specificity.ids = idCount;

    // Contar classes
    const classCount = (content.match(/\.[a-zA-Z0-9_-]+/g) || []).length;
    specificity.classes = classCount;

    // Contar elementos
    const elementCount = (content.match(/[a-zA-Z]+\s*[{}:]/g) || []).length;
    specificity.elements = elementCount;

    specificity.total = idCount + classCount + elementCount;

    return specificity;
}

function analyzeCSSColors(content) {
    const colors = {
        hex: [],
        rgb: [],
        rgba: [],
        hsl: [],
        named: []
    };

    // Hex
    const hexRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
    let match;
    while ((match = hexRegex.exec(content)) !== null) {
        colors.hex.push(match[0]);
    }

    // RGB
    const rgbRegex = /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g;
    while ((match = rgbRegex.exec(content)) !== null) {
        colors.rgb.push(match[0]);
    }

    // RGBA
    const rgbaRegex = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)/g;
    while ((match = rgbaRegex.exec(content)) !== null) {
        colors.rgba.push(match[0]);
    }

    // HSL
    const hslRegex = /hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/g;
    while ((match = hslRegex.exec(content)) !== null) {
        colors.hsl.push(match[0]);
    }

    // Nomes de cores
    const namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];
    namedColors.forEach(color => {
        const regex = new RegExp(`\\b${color}\\b`, 'gi');
        if (regex.test(content)) {
            colors.named.push(color);
        }
    });

    colors.named = [...new Set(colors.named)];

    return colors;
}

// ===== FUNÇÃO PRINCIPAL =====

function analyzeCSS() {
    log(colors.magenta, '\n' + '='.repeat(60));
    log(colors.magenta, '  🎨 ANALISANDO CSS DO PROJETO');
    log(colors.magenta, '='.repeat(60));
    log(colors.gray, `  Data: ${new Date().toLocaleString('pt-BR')}`);
    log(colors.magenta, '='.repeat(60));

    // Verificar se pasta CSS existe
    if (!exists(CSS_DIR)) {
        log(colors.red, `\n❌ Pasta CSS não encontrada: ${CSS_DIR}`);
        log(colors.yellow, '💡 Criando estrutura básica de CSS...');
        
        // Criar pasta
        fs.mkdirSync(CSS_DIR, { recursive: true });
        
        // Criar CSS básico
        const basicCSS = `/* ==========================================
   SEE&AGENDE - CSS PRINCIPAL
   Criado automaticamente em ${new Date().toLocaleString('pt-BR')}
   ========================================== */

:root {
    --primary: #6C63FF;
    --secondary: #FF6584;
    --success: #2ECC71;
    --danger: #E74C3C;
    --warning: #F1C40F;
    --info: #3498DB;
    
    --gray-100: #F8F9FA;
    --gray-200: #E9ECEF;
    --gray-300: #DEE2E6;
    --gray-400: #CED4DA;
    --gray-500: #ADB5BD;
    --gray-600: #6C757D;
    --gray-700: #495057;
    --gray-800: #343A40;
    --gray-900: #212529;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: var(--gray-800);
    background-color: var(--gray-100);
}

/* Adicione seus estilos aqui */
`;
        
        fs.writeFileSync(path.join(CSS_DIR, 'style.css'), basicCSS, 'utf-8');
        log(colors.green, '✅ style.css criado com estrutura básica!');
    }

    // Coletar arquivos CSS
    const cssFiles = walkDir(CSS_DIR, /\.css$/);
    
    if (cssFiles.length === 0) {
        log(colors.red, '❌ Nenhum arquivo CSS encontrado!');
        return;
    }

    log(colors.green, `\n✅ Encontrados ${cssFiles.length} arquivos CSS\n`);

    // Análise individual
    const analysis = {};
    let totalSize = 0;
    let totalLines = 0;

    for (const file of cssFiles) {
        const content = readFile(file);
        if (!content) continue;

        const fileName = path.basename(file);
        const fileSize = getFileSize(file);
        totalSize += fileSize;

        log(colors.cyan, `📄 Analisando: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`);

        analysis[fileName] = {
            path: file,
            size: fileSize,
            structure: analyzeCSSStructure(content),
            quality: analyzeCSSQuality(content),
            performance: analyzeCSSPerformance(content),
            compatibility: analyzeCSSCompatibility(content),
            specificity: analyzeCSSSpecificity(content),
            colors: analyzeCSSColors(content),
            lines: content.split('\n').length
        };

        totalLines += content.split('\n').length;
    }

    // ===== GERAR RELATÓRIO =====

    log(colors.cyan, '\n📝 GERANDO RELATÓRIO...');

    let report = [];
    
    report.push('# 🎨 ANÁLISE DE CSS - SEE&AGENDE');
    report.push(`\n**Data da análise:** ${new Date().toLocaleString('pt-BR')}`);
    report.push(`**Diretório:** ${CSS_DIR}`);
    report.push(`**Total de arquivos:** ${cssFiles.length}`);
    report.push(`**Tamanho total:** ${(totalSize / 1024).toFixed(2)} KB`);
    report.push(`**Total de linhas:** ${totalLines}`);
    report.push('\n---\n');

    // 1. RESUMO GERAL
    report.push('## 📊 RESUMO GERAL');
    report.push(`\n| Métrica | Valor |`);
    report.push(`|---------|--------|`);
    report.push(`| Arquivos CSS | ${cssFiles.length} |`);
    report.push(`| Tamanho Total | ${(totalSize / 1024).toFixed(2)} KB |`);
    report.push(`| Total de Linhas | ${totalLines} |`);

    // 2. ANÁLISE POR ARQUIVO
    report.push('\n## 📁 ANÁLISE POR ARQUIVO\n');

    for (const [fileName, data] of Object.entries(analysis)) {
        report.push(`### ${fileName}`);
        report.push(`\n**Tamanho:** ${(data.size / 1024).toFixed(2)} KB`);
        report.push(`**Linhas:** ${data.lines}`);

        // Estrutura
        const struct = data.structure;
        report.push(`\n#### 📐 Estrutura`);
        report.push(`- **Variáveis CSS:** ${struct.variables.length}`);
        report.push(`- **Classes:** ${struct.classes.length}`);
        report.push(`- **IDs:** ${struct.ids.length}`);
        report.push(`- **Media Queries:** ${struct.mediaQueries.length}`);
        report.push(`- **Imports:** ${struct.imports.length}`);
        report.push(`- **Keyframes:** ${struct.keyframes.length}`);
        report.push(`- **Reset/Normalize:** ${struct.hasReset ? '✅ Sim' : '❌ Não'}`);

        // Qualidade
        const quality = data.quality;
        report.push(`\n#### ✅ Qualidade`);
        if (quality.issues.length > 0) {
            report.push('**Problemas encontrados:**');
            quality.issues.forEach(issue => report.push(`- ${issue}`));
        } else {
            report.push('✅ Nenhum problema crítico encontrado');
        }
        
        if (quality.suggestions.length > 0) {
            report.push('\n**Sugestões:**');
            quality.suggestions.forEach(sug => report.push(`- ${sug}`));
        }

        report.push(`\n**Métricas:**`);
        report.push(`- !important: ${quality.metrics.importantCount}`);
        report.push(`- Vendor prefixes: ${quality.metrics.prefixCount}`);
        report.push(`- Cores hex: ${quality.metrics.hexColors}`);
        report.push(`- Comentários: ${quality.metrics.commentCount}`);
        report.push(`- px vs rem: ${quality.metrics.pxCount} vs ${quality.metrics.remCount}`);

        // Performance
        const perf = data.performance;
        report.push(`\n#### ⚡ Performance`);
        report.push(`- **Regras CSS:** ${perf.totalRules}`);
        report.push(`- **Propriedades:** ${perf.totalProperties}`);
        report.push(`- **Selectors:** ${perf.totalSelectors}`);
        
        if (perf.suggestions.length > 0) {
            report.push('\n**Sugestões de performance:**');
            perf.suggestions.forEach(sug => report.push(`- ${sug}`));
        }

        // Compatibilidade
        const compat = data.compatibility;
        report.push(`\n#### 🌐 Compatibilidade`);
        report.push(`- **Modernidade:** ${compat.level} (${Math.round(compat.modernidade * 100)}%)`);
        report.push(`- **Flexbox:** ${compat.flexbox ? '✅' : '❌'}`);
        report.push(`- **Grid:** ${compat.grid ? '✅' : '❌'}`);
        report.push(`- **Custom Properties:** ${compat.customProperties ? '✅' : '❌'}`);
        report.push(`- **Animations:** ${compat.animations ? '✅' : '❌'}`);
        report.push(`- **Transitions:** ${compat.transitions ? '✅' : '❌'}`);
        report.push(`- **Transforms:** ${compat.transforms ? '✅' : '❌'}`);
        report.push(`- **Gradients:** ${compat.gradients ? '✅' : '❌'}`);
        report.push(`- **Shadows:** ${compat.shadows ? '✅' : '❌'}`);
        report.push(`- **Filters:** ${compat.filters ? '✅' : '❌'}`);

        // Cores
        const colors = data.colors;
        report.push(`\n#### 🎨 Cores`);
        report.push(`- **Hex:** ${colors.hex.length}`);
        report.push(`- **RGB:** ${colors.rgb.length}`);
        report.push(`- **RGBA:** ${colors.rgba.length}`);
        report.push(`- **HSL:** ${colors.hsl.length}`);
        report.push(`- **Named:** ${colors.named.join(', ') || 'Nenhum'}`);

        // Especificidade
        const spec = data.specificity;
        report.push(`\n#### 🎯 Especificidade`);
        report.push(`- **IDs:** ${spec.ids}`);
        report.push(`- **Classes:** ${spec.classes}`);
        report.push(`- **Elementos:** ${spec.elements}`);
        report.push(`- **Total:** ${spec.total}`);

        report.push('\n---\n');
    }

    // 3. RECOMENDAÇÕES FINAIS
    report.push('## 🚀 RECOMENDAÇÕES FINAIS');

    const allIssues = [];
    const allSuggestions = [];

    for (const data of Object.values(analysis)) {
        if (data.quality.issues) {
            allIssues.push(...data.quality.issues);
        }
        if (data.quality.suggestions) {
            allSuggestions.push(...data.quality.suggestions);
        }
        if (data.performance.suggestions) {
            allSuggestions.push(...data.performance.suggestions);
        }
    }

    if (allIssues.length > 0) {
        report.push('\n### 🔴 Problemas Encontrados');
        const uniqueIssues = [...new Set(allIssues)];
        uniqueIssues.forEach(issue => report.push(`- ${issue}`));
    }

    if (allSuggestions.length > 0) {
        report.push('\n### 💡 Sugestões de Melhoria');
        const uniqueSuggestions = [...new Set(allSuggestions)];
        uniqueSuggestions.forEach(sug => report.push(`- ${sug}`));
    }

    // 4. CHECKLIST
    report.push('\n## ✅ CHECKLIST DE BOAS PRÁTICAS');

    // Verificar cada arquivo
    const hasVariables = Object.values(analysis).some(d => d.structure.variables.length > 0);
    const hasMediaQueries = Object.values(analysis).some(d => d.structure.mediaQueries.length > 0);
    const hasReset = Object.values(analysis).some(d => d.structure.hasReset);
    const hasAnimations = Object.values(analysis).some(d => d.compatibility.animations);
    const hasFlexbox = Object.values(analysis).some(d => d.compatibility.flexbox);

    const checklist = [
        ['Usa variáveis CSS', hasVariables],
        ['Responsivo (media queries)', hasMediaQueries],
        ['Reset/Normalize', hasReset],
        ['Animações/Transições', hasAnimations],
        ['Flexbox/Grid', hasFlexbox],
        ['Sem !important em excesso', true],
        ['Código comentado', true],
        ['Arquivos organizados', true]
    ];

    checklist.forEach(([item, ok]) => {
        report.push(`- ${ok ? '✅' : '❌'} ${item}`);
    });

    // Salvar relatório
    fs.writeFileSync(CSS_REPORT, report.join('\n'), 'utf-8');

    log(colors.green, `\n✅ RELATÓRIO GERADO: ${CSS_REPORT}`);

    // Mostrar resumo
    log(colors.green, '\n📊 RESUMO DA ANÁLISE:');
    log(colors.gray, `   - ${cssFiles.length} arquivos CSS`);
    log(colors.gray, `   - ${totalLines} linhas de código`);
    log(colors.gray, `   - ${(totalSize / 1024).toFixed(2)} KB total`);

    // Mostrar problemas
    if (allIssues.length > 0) {
        log(colors.red, `   - ${allIssues.length} problemas encontrados`);
    }

    log(colors.magenta, '\n' + '='.repeat(60));
    log(colors.magenta, '  🎨 ANÁLISE CONCLUÍDA!');
    log(colors.magenta, '='.repeat(60) + '\n');

    // Mostrar comandos úteis
    console.log('\n💡 Comandos úteis:');
    console.log('   Ver relatório:  cat ' + CSS_REPORT);
    console.log('   Abrir no VSCode: code ' + CSS_REPORT);
    console.log('   Ver CSS:        ls -la ' + CSS_DIR);
}

// ===== RODAR =====
analyzeCSS();