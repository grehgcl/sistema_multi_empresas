// scripts/analyze-business-logic.js
// Script para analisar a lógica de negócio do SEE&AGENDE
// ULTIMA ATUALIZACAO: 19/08/2026

const fs = require('fs');
const path = require('path');

const businessRules = {
    agendamentos: {
        regras: [],
        validacoes: [],
        fluxos: []
    },
    whatsapp: {
        regras: [],
        fluxos: [],
        permissoes: []
    },
    financeiro: {
        regras: [],
        calculos: [],
        relatorios: []
    },
    clientes: {
        regras: [],
        grupos: [],
        promocoes: []
    },
    admin: {
        regras: [],
        permissoes: [],
        controle: []
    }
};

// Função para extrair regras de negócio de arquivos JS
function extractBusinessRules(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // Padrões para identificar regras de negócio
        const patterns = {
            regra: /(?:regra|rule|business|negocio|valid|check|verify|permit|allow|block|restrict|limite|max|min|required|obrigatorio|deve|precisa|somente|apenas|nao|não|proibido|permitido|autorizado)/i,
            validacao: /(?:valid|check|verify|validate|required|obrigatorio|precisa)/i,
            fluxo: /(?:fluxo|flow|process|step|etapa|status|state|transition)/i,
            calculo: /(?:calc|calcul|sum|total|valor|price|cost|profit|comissao|desconto|taxa|juros|multa|percent|porcentagem)/i,
            permissao: /(?:perm|role|nivel|level|access|acesso|admin|super|dono|profissional|user|usuario)/i,
            grupo: /(?:grupo|group|team|cliente|client|customer|categoria|category|tipo|type)/i,
            promocao: /(?:promocao|promo|discount|desconto|oferta|offer|cupom|coupon|voucher)/i
        };

        lines.forEach((line, index) => {
            // Agendamentos
            if (line.toLowerCase().includes('agendamento') || line.toLowerCase().includes('schedule')) {
                if (patterns.regra.test(line)) {
                    businessRules.agendamentos.regras.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.validacao.test(line)) {
                    businessRules.agendamentos.validacoes.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.fluxo.test(line)) {
                    businessRules.agendamentos.fluxos.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
            }

            // WhatsApp
            if (line.toLowerCase().includes('whatsapp') || line.toLowerCase().includes('evolution') || line.toLowerCase().includes('instancia')) {
                if (patterns.regra.test(line)) {
                    businessRules.whatsapp.regras.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.fluxo.test(line)) {
                    businessRules.whatsapp.fluxos.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.permissao.test(line)) {
                    businessRules.whatsapp.permissoes.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
            }

            // Financeiro
            if (line.toLowerCase().includes('financeiro') || line.toLowerCase().includes('despesa') || line.toLowerCase().includes('receita') || line.toLowerCase().includes('pagamento')) {
                if (patterns.regra.test(line)) {
                    businessRules.financeiro.regras.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.calculo.test(line)) {
                    businessRules.financeiro.calculos.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (line.toLowerCase().includes('relatorio') || line.toLowerCase().includes('report') || line.toLowerCase().includes('resumo')) {
                    businessRules.financeiro.relatorios.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
            }

            // Clientes e Promoções
            if (line.toLowerCase().includes('cliente') || line.toLowerCase().includes('customer') || line.toLowerCase().includes('promocao') || line.toLowerCase().includes('grupo')) {
                if (patterns.grupo.test(line)) {
                    businessRules.clientes.grupos.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.promocao.test(line)) {
                    businessRules.clientes.promocoes.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.regra.test(line)) {
                    businessRules.clientes.regras.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
            }

            // Admin
            if (line.toLowerCase().includes('admin') || line.toLowerCase().includes('super') || line.toLowerCase().includes('empresa')) {
                if (patterns.permissao.test(line)) {
                    businessRules.admin.permissoes.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (patterns.regra.test(line)) {
                    businessRules.admin.regras.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
                if (line.toLowerCase().includes('controle') || line.toLowerCase().includes('control')) {
                    businessRules.admin.controle.push({
                        file: path.basename(filePath),
                        line: index + 1,
                        content: line.trim()
                    });
                }
            }
        });
    } catch (error) {
        // Ignorar arquivos que não podem ser lidos
    }
}

// Função para analisar todos os arquivos JS
function analyzeBusinessLogic(rootDir) {
    console.log('🔍 Analisando lógica de negócio...');
    
    function walkDir(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                // Ignorar node_modules e .git
                if (file !== 'node_modules' && file !== '.git' && file !== 'analysis') {
                    walkDir(filePath);
                }
            } else if (file.endsWith('.js')) {
                extractBusinessRules(filePath);
            }
        });
    }

    walkDir(rootDir);
}

// Gerar relatório de lógica de negócio
function generateBusinessReport() {
    const report = {
        timestamp: new Date().toISOString(),
        businessRules: businessRules,
        summary: {}
    };

    // Resumo
    Object.entries(businessRules).forEach(([category, data]) => {
        let total = 0;
        Object.values(data).forEach(arr => {
            total += arr.length;
        });
        report.summary[category] = {
            total: total,
            details: Object.fromEntries(
                Object.entries(data).map(([key, arr]) => [key, arr.length])
            )
        };
    });

    return report;
}

// Salvar relatório
function saveBusinessReport(report) {
    const outputDir = path.join(__dirname, '..', 'analysis');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, `business-logic-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`✅ Relatório de lógica de negócio salvo em: ${jsonPath}`);

    // Gerar versão Markdown
    const mdPath = path.join(outputDir, `business-logic-${Date.now()}.md`);
    const md = generateBusinessMarkdown(report);
    fs.writeFileSync(mdPath, md);
    console.log(`✅ Relatório Markdown salvo em: ${mdPath}`);
}

// Gerar Markdown do relatório de negócio
function generateBusinessMarkdown(report) {
    let md = `# 🧠 SEE&AGENDE - LÓGICA DE NEGÓCIO\n\n`;
    md += `**Data da Análise:** ${new Date(report.timestamp).toLocaleString('pt-BR')}\n\n`;
    md += `---\n\n`;

    md += `## 📊 RESUMO\n\n`;
    md += `| Módulo | Total de Regras | Detalhes |\n`;
    md += `|--------|----------------|----------|\n`;
    Object.entries(report.summary).forEach(([category, data]) => {
        const details = Object.entries(data.details)
            .map(([key, count]) => `${key}: ${count}`)
            .join(', ');
        md += `| ${category} | ${data.total} | ${details} |\n`;
    });
    md += `\n`;

    // Detalhes por módulo
    Object.entries(report.businessRules).forEach(([category, data]) => {
        md += `## 📌 ${category.toUpperCase()}\n\n`;
        
        Object.entries(data).forEach(([ruleType, rules]) => {
            if (rules.length === 0) return;
            
            const titles = {
                regras: '📋 Regras de Negócio',
                validacoes: '✅ Validações',
                fluxos: '🔄 Fluxos',
                permissoes: '🔐 Permissões',
                calculos: '🧮 Cálculos',
                relatorios: '📊 Relatórios',
                grupos: '👥 Grupos',
                promocoes: '🎯 Promoções',
                controle: '🎛️ Controle'
            };
            
            md += `### ${titles[ruleType] || ruleType.toUpperCase()}\n\n`;
            md += `| Arquivo | Linha | Conteúdo |\n`;
            md += `|---------|-------|----------|\n`;
            
            rules.slice(0, 20).forEach(rule => {
                const content = rule.content.replace(/\|/g, '\\|').substring(0, 100);
                md += `| ${rule.file} | ${rule.line} | ${content} |\n`;
            });
            
            if (rules.length > 20) {
                md += `\n*... e mais ${rules.length - 20} regras*\n`;
            }
            md += `\n`;
        });
    });

    md += `---\n`;
    md += `**Última Atualização:** ${new Date().toLocaleString('pt-BR')}\n`;

    return md;
}

// Função principal
function main() {
    const rootDir = path.resolve(__dirname, '..');
    
    console.log('🧠 Analisando lógica de negócio do SEE&AGENDE...\n');
    
    analyzeBusinessLogic(rootDir);
    
    console.log(`📊 Análise concluída!\n`);
    
    // Resumo
    console.log('📋 REGRAS DE NEGÓCIO ENCONTRADAS:');
    Object.entries(businessRules).forEach(([category, data]) => {
        const total = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`   ${category}: ${total} regras`);
        Object.entries(data).forEach(([key, arr]) => {
            if (arr.length > 0) {
                console.log(`      - ${key}: ${arr.length}`);
            }
        });
    });
    
    // Gerar relatório
    const report = generateBusinessReport();
    saveBusinessReport(report);
    
    console.log('\n✅ Análise de lógica de negócio finalizada!');
}

// Executar
main();