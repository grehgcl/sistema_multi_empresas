// scripts/analyze-business-logic-deep.js
// Análise profunda da lógica de negócio do SEE&AGENDE
// ULTIMA ATUALIZACAO: 31/08/2026

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BusinessLogicAnalyzer {
    constructor() {
        this.rootDir = process.cwd();
        this.srcDir = path.join(this.rootDir, 'src');
        this.analysis = {
            timestamp: new Date().toISOString(),
            system: {
                name: 'SEE&AGENDE',
                version: this.getPackageVersion(),
                architecture: {},
                modules: [],
                dependencies: [],
                services: [],
                models: [],
                controllers: [],
                routes: [],
                middlewares: [],
                utils: [],
                configs: [],
                tests: []
            },
            businessRules: [],
            workflows: [],
            integrations: [],
            security: [],
            performance: [],
            suggestions: []
        };
    }

    getPackageVersion() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return packageJson.version || '1.0.0';
        } catch {
            return '1.0.0';
        }
    }

    analyze() {
        console.log('🔍 Iniciando análise profunda da lógica de negócio...\n');

        // 1. Mapear estrutura de diretórios
        this.mapDirectoryStructure();
        
        // 2. Analisar arquivos de código
        this.analyzeCodeFiles();
        
        // 3. Identificar padrões de arquitetura
        this.identifyArchitecturePatterns();
        
        // 4. Extrair regras de negócio
        this.extractBusinessRules();
        
        // 5. Mapear fluxos de trabalho
        this.mapWorkflows();
        
        // 6. Analisar integrações
        this.analyzeIntegrations();
        
        // 7. Verificar segurança
        this.analyzeSecurity();
        
        // 8. Avaliar performance
        this.analyzePerformance();
        
        // 9. Gerar sugestões de melhoria
        this.generateSuggestions();

        // Salvar relatório
        this.saveReport();
        
        return this.analysis;
    }

    mapDirectoryStructure() {
        console.log('📁 Mapeando estrutura de diretórios...');
        
        const structure = {
            src: {},
            totalFiles: 0,
            totalLines: 0
        };

        const walkDir = (dir, structure) => {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    
                    if (stat.isDirectory()) {
                        structure[file] = {};
                        walkDir(filePath, structure[file]);
                    } else if (file.match(/\.(js|jsx|ts|tsx|html|css|json|md)$/)) {
                        structure[file] = 'file';
                        structure.totalFiles++;
                        try {
                            const content = fs.readFileSync(filePath, 'utf8');
                            const lines = content.split('\n').length;
                            structure.totalLines += lines;
                        } catch {}
                    }
                }
            } catch {}
        };

        if (fs.existsSync(this.srcDir)) {
            walkDir(this.srcDir, structure.src);
        }

        this.analysis.system.architecture.directoryStructure = structure;
        this.analysis.system.modules = Object.keys(structure.src);
        
        console.log(`   ✅ ${structure.totalFiles} arquivos encontrados`);
        console.log(`   ✅ ${structure.totalLines} linhas de código`);
    }

    analyzeCodeFiles() {
        console.log('📝 Analisando arquivos de código...');
        
        const codeFiles = this.findCodeFiles();
        const patterns = {
            controllers: [],
            services: [],
            models: [],
            routes: [],
            middlewares: [],
            utils: [],
            configs: [],
            tests: []
        };

        for (const file of codeFiles) {
            const content = fs.readFileSync(file, 'utf8');
            const fileName = path.basename(file);
            const relativePath = path.relative(this.rootDir, file);
            
            // Identificar tipo de arquivo pelo nome e conteúdo
            if (fileName.includes('controller') || content.includes('@Controller') || content.includes('exports.controller')) {
                patterns.controllers.push({ file: relativePath, name: this.extractClassName(content) });
            } else if (fileName.includes('service') || content.includes('@Service') || content.includes('class.*Service')) {
                patterns.services.push({ file: relativePath, name: this.extractClassName(content) });
            } else if (fileName.includes('model') || content.includes('@Model') || content.includes('class.*Model') || content.includes('Schema')) {
                patterns.models.push({ file: relativePath, name: this.extractClassName(content) });
            } else if (fileName.includes('route') || content.includes('router.') || content.includes('app.')) {
                patterns.routes.push({ file: relativePath, name: fileName });
            } else if (fileName.includes('middleware') || content.includes('middleware')) {
                patterns.middlewares.push({ file: relativePath, name: this.extractFunctionName(content) });
            } else if (fileName.includes('util') || fileName.includes('helper') || fileName.includes('lib')) {
                patterns.utils.push({ file: relativePath, name: fileName });
            } else if (fileName.includes('config') || fileName.includes('settings')) {
                patterns.configs.push({ file: relativePath, name: fileName });
            } else if (fileName.includes('test') || fileName.includes('spec')) {
                patterns.tests.push({ file: relativePath, name: fileName });
            }
        }

        this.analysis.system.controllers = patterns.controllers;
        this.analysis.system.services = patterns.services;
        this.analysis.system.models = patterns.models;
        this.analysis.system.routes = patterns.routes;
        this.analysis.system.middlewares = patterns.middlewares;
        this.analysis.system.utils = patterns.utils;
        this.analysis.system.configs = patterns.configs;
        this.analysis.system.tests = patterns.tests;

        console.log(`   ✅ ${patterns.controllers.length} controllers`);
        console.log(`   ✅ ${patterns.services.length} services`);
        console.log(`   ✅ ${patterns.models.length} models`);
        console.log(`   ✅ ${patterns.routes.length} routes`);
    }

    findCodeFiles() {
        const files = [];
        const extensions = ['.js', '.jsx', '.ts', '.tsx'];
        
        const walk = (dir) => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);
                    
                    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
                        walk(itemPath);
                    } else if (extensions.some(ext => item.endsWith(ext))) {
                        files.push(itemPath);
                    }
                }
            } catch {}
        };

        if (fs.existsSync(this.srcDir)) {
            walk(this.srcDir);
        }
        
        return files;
    }

    extractClassName(content) {
        const classMatch = content.match(/class\s+(\w+)/);
        if (classMatch) return classMatch[1];
        
        const exportMatch = content.match(/exports\.(\w+)/);
        if (exportMatch) return exportMatch[1];
        
        const moduleMatch = content.match(/module\.exports\s*=\s*{\s*(\w+)/);
        if (moduleMatch) return moduleMatch[1];
        
        return 'Unknown';
    }

    extractFunctionName(content) {
        const functionMatch = content.match(/function\s+(\w+)/);
        if (functionMatch) return functionMatch[1];
        
        const arrowMatch = content.match(/const\s+(\w+)\s*=\s*\(/);
        if (arrowMatch) return arrowMatch[1];
        
        return 'Unknown';
    }

    identifyArchitecturePatterns() {
        console.log('🏗️  Identificando padrões de arquitetura...');
        
        const patterns = [];
        
        // Verificar MVC
        if (this.analysis.system.controllers.length > 0 && 
            this.analysis.system.models.length > 0 && 
            this.analysis.system.services.length > 0) {
            patterns.push('MVC (Model-View-Controller)');
        }
        
        // Verificar Repository Pattern
        if (this.analysis.system.services.some(s => s.name.includes('Repository'))) {
            patterns.push('Repository Pattern');
        }
        
        // Verificar DI (Dependency Injection)
        const hasDI = this.hasPattern('@Inject|@Autowired|container\\.get|dependency');
        if (hasDI) {
            patterns.push('Dependency Injection');
        }
        
        // Verificar Middleware Pattern
        if (this.analysis.system.middlewares.length > 0) {
            patterns.push('Middleware Pattern');
        }
        
        // Verificar REST API
        if (this.analysis.system.routes.length > 0) {
            patterns.push('REST API');
        }
        
        this.analysis.system.architecture.patterns = patterns;
        console.log(`   ✅ ${patterns.length} padrões identificados`);
    }

    hasPattern(pattern) {
        try {
            const files = this.findCodeFiles();
            for (const file of files) {
                const content = fs.readFileSync(file, 'utf8');
                if (new RegExp(pattern).test(content)) {
                    return true;
                }
            }
        } catch {}
        return false;
    }

    extractBusinessRules() {
        console.log('📋 Extraindo regras de negócio...');
        
        const rules = [];
        const files = this.findCodeFiles();
        
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Procurar por regras de validação
                if (line.includes('validate') || line.includes('isValid') || line.includes('check')) {
                    const rule = this.extractRuleFromLine(line, i, file);
                    if (rule) rules.push(rule);
                }
                
                // Procurar por regras de negócio em comentários
                if (line.includes('//') || line.includes('/*')) {
                    const businessComment = this.extractBusinessComment(line);
                    if (businessComment) rules.push({
                        type: 'business_rule_comment',
                        description: businessComment,
                        file: path.relative(this.rootDir, file),
                        line: i + 1
                    });
                }
            }
        }
        
        this.analysis.businessRules = rules;
        console.log(`   ✅ ${rules.length} regras de negócio encontradas`);
    }

    extractRuleFromLine(line, lineNumber, file) {
        const patterns = [
            { regex: /if\s*\(.*\)/, type: 'conditional' },
            { regex: /validate[A-Z]\w+/, type: 'validation' },
            { regex: /check[A-Z]\w+/, type: 'check' },
            { regex: /is[A-Z]\w+/, type: 'boolean' },
            { regex: /has[A-Z]\w+/, type: 'has' },
            { regex: /can[A-Z]\w+/, type: 'permission' },
            { regex: /must[A-Z]\w+/, type: 'requirement' }
        ];
        
        for (const pattern of patterns) {
            if (pattern.regex.test(line)) {
                return {
                    type: pattern.type,
                    description: line.trim(),
                    file: path.relative(this.rootDir, file),
                    line: lineNumber + 1
                };
            }
        }
        return null;
    }

    extractBusinessComment(line) {
        const commentMatch = line.match(/\/\/\s*(.*)/);
        if (commentMatch) {
            const comment = commentMatch[1].trim();
            if (comment.includes('rule') || comment.includes('business') || 
                comment.includes('validation') || comment.includes('must')) {
                return comment;
            }
        }
        return null;
    }

    mapWorkflows() {
        console.log('🔄 Mapeando fluxos de trabalho...');
        
        const workflows = [];
        const workflowKeywords = ['flow', 'workflow', 'process', 'pipeline', 'step'];
        const files = this.findCodeFiles();
        
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (workflowKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
                    workflows.push({
                        name: this.extractWorkflowName(line),
                        description: line.trim(),
                        file: path.relative(this.rootDir, file),
                        line: i + 1
                    });
                }
            }
        }
        
        this.analysis.workflows = workflows;
        console.log(`   ✅ ${workflows.length} fluxos de trabalho identificados`);
    }

    extractWorkflowName(line) {
        const match = line.match(/(flow|workflow|process)\s*[:=]\s*['"]([^'"]+)['"]/i);
        if (match) return match[2];
        
        const funcMatch = line.match(/(function|const|let|var)\s+(\w+)/);
        if (funcMatch) return funcMatch[2];
        
        return 'Unnamed Workflow';
    }

    analyzeIntegrations() {
        console.log('🔗 Analisando integrações...');
        
        const integrations = [];
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        // Identificar integrações por dependências
        const integrationMap = {
            'express': 'Express.js Web Framework',
            'mongoose': 'MongoDB ODM',
            'sequelize': 'Sequelize ORM',
            'knex': 'Knex.js Query Builder',
            'pg': 'PostgreSQL',
            'mysql': 'MySQL',
            'mongodb': 'MongoDB Driver',
            'redis': 'Redis Client',
            'socket.io': 'WebSockets',
            'axios': 'HTTP Client',
            'node-fetch': 'HTTP Client',
            'jsonwebtoken': 'JWT Authentication',
            'passport': 'Authentication',
            'bcrypt': 'Password Hashing',
            'jwt': 'JWT Authentication',
            'dotenv': 'Environment Variables',
            'cors': 'CORS Middleware',
            'helmet': 'Security Headers',
            'winston': 'Logging',
            'morgan': 'HTTP Logging',
            'jest': 'Testing Framework',
            'mocha': 'Testing Framework',
            'chai': 'Testing Assertions',
            'supertest': 'API Testing'
        };
        
        for (const [dep, description] of Object.entries(integrationMap)) {
            if (dependencies[dep]) {
                integrations.push({
                    name: dep,
                    description: description,
                    version: dependencies[dep]
                });
            }
        }
        
        this.analysis.integrations = integrations;
        console.log(`   ✅ ${integrations.length} integrações identificadas`);
    }

    analyzeSecurity() {
        console.log('🔒 Analisando segurança...');
        
        const securityIssues = [];
        const files = this.findCodeFiles();
        
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Verificar vulnerabilidades comuns
                if (line.includes('eval(') && !line.includes('//')) {
                    securityIssues.push({
                        type: 'vulnerability',
                        severity: 'high',
                        description: 'Uso de eval() - pode permitir injeção de código',
                        file: path.relative(this.rootDir, file),
                        line: i + 1
                    });
                }
                
                if ((line.includes('password') || line.includes('secret') || line.includes('key')) && 
                    (line.includes('=') || line.includes(':')) && 
                    !line.includes('process.env') && !line.includes('process.env')) {
                    securityIssues.push({
                        type: 'hardcoded_secrets',
                        severity: 'critical',
                        description: 'Possível segredo hardcoded encontrado',
                        file: path.relative(this.rootDir, file),
                        line: i + 1
                    });
                }
                
                if (line.includes('console.log') && !line.includes('//')) {
                    securityIssues.push({
                        type: 'logging',
                        severity: 'low',
                        description: 'Console.log em produção pode expor informações sensíveis',
                        file: path.relative(this.rootDir, file),
                        line: i + 1
                    });
                }
            }
        }
        
        this.analysis.security.issues = securityIssues;
        console.log(`   ✅ ${securityIssues.length} problemas de segurança identificados`);
    }

    analyzePerformance() {
        console.log('⚡ Analisando performance...');
        
        const performanceIssues = [];
        const files = this.findCodeFiles();
        
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Verificar problemas de performance
                if (line.includes('for') && line.includes('for') && !line.includes('break')) {
                    // Possível loop ineficiente
                }
                
                if (line.includes('JSON.parse') && line.includes('JSON.stringify')) {
                    // Possível serialização desnecessária
                }
                
                if (line.includes('setTimeout') && !line.includes('clearTimeout')) {
                    performanceIssues.push({
                        type: 'memory_leak',
                        severity: 'medium',
                        description: 'Possível memory leak com setTimeout sem clearTimeout',
                        file: path.relative(this.rootDir, file),
                        line: i + 1
                    });
                }
            }
        }
        
        this.analysis.performance.issues = performanceIssues;
        console.log(`   ✅ ${performanceIssues.length} problemas de performance identificados`);
    }

    generateSuggestions() {
        console.log('💡 Gerando sugestões de melhoria...');
        
        const suggestions = [];
        
        // Sugestões baseadas na análise
        if (this.analysis.businessRules.length < 5) {
            suggestions.push({
                category: 'business_logic',
                priority: 'high',
                description: 'Documentar melhor as regras de negócio em comentários ou documentação',
                impact: 'Facilita a manutenção e compreensão do sistema'
            });
        }
        
        if (this.analysis.system.tests.length === 0) {
            suggestions.push({
                category: 'testing',
                priority: 'critical',
                description: 'Implementar testes unitários e de integração',
                impact: 'Garante a qualidade e confiabilidade do código'
            });
        }
        
        if (this.analysis.security.issues.some(i => i.severity === 'critical')) {
            suggestions.push({
                category: 'security',
                priority: 'critical',
                description: 'Corrigir vulnerabilidades críticas de segurança identificadas',
                impact: 'Protege o sistema contra ataques e vazamento de dados'
            });
        }
        
        if (this.analysis.integrations.length < 3) {
            suggestions.push({
                category: 'architecture',
                priority: 'medium',
                description: 'Considerar a adição de mais integrações para melhorar a funcionalidade',
                impact: 'Expande as capacidades do sistema'
            });
        }
        
        // Sugestões específicas baseadas em padrões
        if (!this.analysis.system.architecture.patterns.includes('Dependency Injection')) {
            suggestions.push({
                category: 'architecture',
                priority: 'medium',
                description: 'Implementar Dependency Injection para melhorar a testabilidade e desacoplamento',
                impact: 'Facilita testes e manutenção do código'
            });
        }
        
        this.analysis.suggestions = suggestions;
        console.log(`   ✅ ${suggestions.length} sugestões geradas`);
    }

    saveReport() {
        const reportPath = path.join(process.cwd(), 'analysis', 'business-logic-deep-analysis.json');
        const reportDir = path.dirname(reportPath);
        
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(this.analysis, null, 2));
        console.log(`\n📄 Relatório salvo em: ${reportPath}`);
        
        // Gerar versão resumida em Markdown
        this.saveMarkdownReport();
    }

    saveMarkdownReport() {
        const mdPath = path.join(process.cwd(), 'analysis', 'business-logic-analysis.md');
        let md = `# 📊 Análise da Lógica de Negócio - SEE&AGENDE\n\n`;
        
        md += `## 📋 Visão Geral\n\n`;
        md += `- **Sistema:** ${this.analysis.system.name}\n`;
        md += `- **Versão:** ${this.analysis.system.version}\n`;
        md += `- **Data da Análise:** ${new Date(this.analysis.timestamp).toLocaleString('pt-BR')}\n\n`;
        
        md += `## 🏗️ Arquitetura\n\n`;
        md += `**Padrões Identificados:**\n`;
        for (const pattern of this.analysis.system.architecture.patterns || []) {
            md += `- ${pattern}\n`;
        }
        
        md += `\n**Estrutura:**\n`;
        md += `- Controllers: ${this.analysis.system.controllers.length}\n`;
        md += `- Services: ${this.analysis.system.services.length}\n`;
        md += `- Models: ${this.analysis.system.models.length}\n`;
        md += `- Routes: ${this.analysis.system.routes.length}\n`;
        md += `- Middlewares: ${this.analysis.system.middlewares.length}\n\n`;
        
        md += `## 📋 Regras de Negócio\n\n`;
        if (this.analysis.businessRules.length > 0) {
            for (const rule of this.analysis.businessRules.slice(0, 10)) {
                md += `- **${rule.type}**: \`${rule.description}\` (${rule.file}:${rule.line})\n`;
            }
            if (this.analysis.businessRules.length > 10) {
                md += `\n*... e mais ${this.analysis.businessRules.length - 10} regras*\n`;
            }
        } else {
            md += `*Nenhuma regra de negócio explícita identificada*\n`;
        }
        
        md += `\n## 🔗 Integrações\n\n`;
        for (const integration of this.analysis.integrations) {
            md += `- **${integration.name}**: ${integration.description} (v${integration.version})\n`;
        }
        
        md += `\n## 🔒 Segurança\n\n`;
        if (this.analysis.security.issues && this.analysis.security.issues.length > 0) {
            md += `**Problemas Identificados:**\n`;
            for (const issue of this.analysis.security.issues) {
                const emoji = issue.severity === 'critical' ? '🔴' : issue.severity === 'high' ? '🟠' : '🟡';
                md += `- ${emoji} **${issue.severity.toUpperCase()}**: ${issue.description} (${issue.file}:${issue.line})\n`;
            }
        } else {
            md += `*Nenhum problema de segurança identificado*\n`;
        }
        
        md += `\n## 💡 Sugestões de Melhoria\n\n`;
        for (const suggestion of this.analysis.suggestions) {
            const priorityEmoji = suggestion.priority === 'critical' ? '🔴' : 
                                 suggestion.priority === 'high' ? '🟠' : '🟡';
            md += `### ${priorityEmoji} ${suggestion.category.toUpperCase()}\n`;
            md += `- **Descrição:** ${suggestion.description}\n`;
            md += `- **Impacto:** ${suggestion.impact}\n`;
            md += `- **Prioridade:** ${suggestion.priority.toUpperCase()}\n\n`;
        }
        
        fs.writeFileSync(mdPath, md);
        console.log(`📄 Relatório Markdown salvo em: ${mdPath}`);
    }
}

// Executar análise
const analyzer = new BusinessLogicAnalyzer();
analyzer.analyze();

console.log('\n✅ Análise completa finalizada!');
console.log('📁 Verifique os relatórios em: analysis/');