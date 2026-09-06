// scripts/export-system-context.js
// ============================================
// EXPORTADOR DE CONTEXTO DO SISTEMA
// Gera um relatório completo para IAs
// ULTIMA ATUALIZACAO: 01/09/2026
// ============================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SystemContextExporter {
    constructor() {
        this.rootDir = process.cwd();
        this.output = {
            timestamp: new Date().toISOString(),
            system: {
                name: 'SEE&AGENDE',
                version: this.getPackageVersion(),
                description: 'Sistema de agendamento para barbearias/salões'
            },
            architecture: {
                backend: {},
                frontend: {},
                database: {},
                infrastructure: {}
            },
            modules: [],
            routes: [],
            services: [],
            functions: [],
            businessRules: [],
            dependencies: {},
            config: {},
            api: {
                endpoints: [],
                webhooks: []
            },
            security: {},
            performance: {},
            suggestions: [],
            // 🔥 NOVAS SEÇÕES
            lastChanges: {},
            deployCommands: {},
            folderStructure: {},
            userFlows: {},
            knownIssues: [],
            nextSteps: [],
            envConfig: {}
        };
    }

    getPackageVersion() {
        try {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return pkg.version || '1.0.0';
        } catch {
            return '1.0.0';
        }
    }

    // ============================================
    // 1. ÚLTIMAS ALTERAÇÕES
    // ============================================
    async getLastChanges() {
        try {
            const gitLog = execSync('git log --oneline --since="7 days ago"', { encoding: 'utf8' });
            const changes = gitLog.split('\n').filter(line => line.trim());
            
            const files = [];
            try {
                const fileChanges = execSync('git diff --name-only HEAD~10 HEAD', { encoding: 'utf8' });
                fileChanges.split('\n').forEach(f => {
                    if (f.trim()) files.push(f.trim());
                });
            } catch {}
            
            return {
                recentCommits: changes.slice(0, 10),
                modifiedFiles: files.slice(0, 20),
                totalCommits: changes.length
            };
        } catch {
            return { recentCommits: [], modifiedFiles: [], totalCommits: 0 };
        }
    }

    // ============================================
    // 2. COMANDOS DE DEPLOY
    // ============================================
    getDeployCommands() {
        return {
            vps: {
                ip: '179.199.134.127',
                user: 'root',
                projectPath: '/var/www/barbearia_nova',
                commands: [
                    'ssh root@179.199.134.127',
                    'cd /var/www/barbearia_nova',
                    'pm2 restart seeagende',
                    'pm2 logs seeagende --lines 20'
                ],
                scpCommands: [
                    'scp public/js/pages/planos.js root@179.199.134.127:/var/www/barbearia_nova/public/js/pages/',
                    'scp public/js/pages/empresas.js root@179.199.134.127:/var/www/barbearia_nova/public/js/pages/',
                    'scp server/routes/*.js root@179.199.134.127:/var/www/barbearia_nova/server/routes/',
                    'scp server.js root@179.199.134.127:/var/www/barbearia_nova/',
                    'scp .env root@179.199.134.127:/var/www/barbearia_nova/'
                ]
            },
            localCommands: [
                'npm start',
                'npm run dev',
                'node scripts/export-system-context.js'
            ]
        };
    }

    // ============================================
    // 3. ESTRUTURA DE PASTAS DETALHADA
    // ============================================
    getFolderStructure() {
        return {
            public: {
                description: 'Arquivos públicos (frontend)',
                subfolders: {
                    'css/pages': 'Estilos das páginas',
                    'js/pages': 'JavaScript das páginas',
                    'admin': 'Painel administrativo',
                    'icons': 'Ícones do sistema'
                }
            },
            server: {
                description: 'Backend do sistema',
                subfolders: {
                    'config': 'Configurações (banco de dados, etc)',
                    'routes': 'Rotas da API (151 endpoints)',
                    'services': 'Serviços (email, whatsapp, mercadopago)',
                    'middlewares': 'Middlewares (auth, validação)',
                    'jobs': 'Jobs agendados (cron)',
                    'utils': 'Funções utilitárias'
                }
            },
            database: 'Arquivos de banco de dados SQLite',
            scripts: 'Scripts de automação e análise'
        };
    }

    // ============================================
    // 4. FLUXOS DE USUÁRIO
    // ============================================
    getUserFlows() {
        return {
            agendamento: {
                description: 'Fluxo de agendamento',
                steps: [
                    '1. Cliente acessa o chatbot',
                    '2. Seleciona serviço',
                    '3. Escolhe profissional (opcional)',
                    '4. Seleciona data e horário',
                    '5. Confirma agendamento',
                    '6. Recebe confirmação via WhatsApp'
                ]
            },
            pagamento: {
                description: 'Fluxo de pagamento de plano',
                steps: [
                    '1. Usuário acessa página de planos',
                    '2. Escolhe plano (Starter/Pro)',
                    '3. Clica em "Pagar agora"',
                    '4. Redirecionado para MercadoPago',
                    '5. Realiza pagamento (PIX/Cartão/Boleto)',
                    '6. Webhook confirma pagamento',
                    '7. Plano é ativado automaticamente'
                ]
            },
            admin: {
                description: 'Fluxo do Super Admin',
                steps: [
                    '1. Acessa o dashboard',
                    '2. Vê lista de empresas',
                    '3. Pode editar/ativar/deletar empresas',
                    '4. Pode ativar WhatsApp em qualquer plano',
                    '5. Gerencia usuários'
                ]
            }
        };
    }

    // ============================================
    // 5. ERROS CONHECIDOS E SOLUÇÕES
    // ============================================
    getKnownIssues() {
        return [
            {
                id: 'issue-001',
                title: 'Tabela transacoes_pagamento não existe',
                status: 'resolvido',
                solution: 'Criar tabela manualmente ou adicionar no server.js',
                file: 'server.js'
            },
            {
                id: 'issue-002',
                title: 'Webhook MercadoPago 404',
                status: 'resolvido',
                solution: 'Adicionar rota /api/pagamento no server.js',
                file: 'server.js'
            },
            {
                id: 'issue-003',
                title: 'Modo de pagamento simulation mesmo com .env real',
                status: 'resolvido',
                solution: 'Sincronizar banco de dados com .env',
                file: 'server.js + planos.routes.js'
            }
        ];
    }

    // ============================================
    // 6. PRÓXIMOS PASSOS
    // ============================================
    getNextSteps() {
        return [
            '1. ✅ Pagamento com PIX - FUNCIONANDO',
            '2. ✅ Pagamento com Cartão - FUNCIONANDO',
            '3. ✅ Ativação automática via webhook - FUNCIONANDO',
            '4. 🔄 Melhorar feedback visual (toast) - EM ANDAMENTO',
            '5. 🔄 Criar página de sucesso/erro - EM ANDAMENTO',
            '6. ⏳ Implementar testes unitários - PENDENTE',
            '7. ⏳ Adicionar rate limiting - PENDENTE'
        ];
    }

    // ============================================
    // 7. VARIÁVEIS DE AMBIENTE (com exemplos)
    // ============================================
    getEnvConfig() {
        return {
            required: [
                { key: 'NODE_ENV', example: 'production', description: 'Ambiente (development/production)' },
                { key: 'PORT', example: '3000', description: 'Porta do servidor' },
                { key: 'BASE_URL', example: 'https://seeagende.tech', description: 'URL pública do sistema' },
                { key: 'JWT_SECRET', example: '****', description: 'Chave secreta para JWT' },
                { key: 'PAYMENT_MODE', example: 'real', description: 'Modo de pagamento (real/simulation)' },
                { key: 'MERCADOPAGO_ACCESS_TOKEN', example: 'APP_USR-****', description: 'Token do MercadoPago' }
            ],
            optional: [
                { key: 'WHATSAPP_ENABLED', example: 'true', description: 'Habilitar WhatsApp' },
                { key: 'EVOLUTION_API_URL', example: 'http://localhost:8080', description: 'URL da Evolution API' }
            ]
        };
    }

    // ============================================
    // MÉTODOS PRINCIPAIS
    // ============================================

    async run() {
        console.log('🔍 GERANDO CONTEXTO COMPLETO DO SISTEMA...\n');
        
        // 1. Mapear estrutura do projeto
        this.mapStructure();
        
        // 2. Mapear rotas da API
        this.mapRoutes();
        
        // 3. Mapear serviços
        this.mapServices();
        
        // 4. Mapear funções importantes
        this.mapFunctions();
        
        // 5. Extrair regras de negócio
        this.extractBusinessRules();
        
        // 6. Mapear dependências
        this.mapDependencies();
        
        // 7. Mapear configurações
        this.mapConfig();
        
        // 8. Mapear segurança
        this.mapSecurity();
        
        // 9. Mapear webhooks
        this.mapWebhooks();
        
        // 🔥 NOVAS SEÇÕES - ADICIONADAS
        console.log('📋 Coletando informações adicionais...');
        this.output.lastChanges = await this.getLastChanges();
        this.output.deployCommands = this.getDeployCommands();
        this.output.folderStructure = this.getFolderStructure();
        this.output.userFlows = this.getUserFlows();
        this.output.knownIssues = this.getKnownIssues();
        this.output.nextSteps = this.getNextSteps();
        this.output.envConfig = this.getEnvConfig();
        
        // 10. Gerar resumo
        this.generateSummary();
        
        // 11. Salvar relatório
        this.saveReport();
        
        console.log('\n✅ RELATÓRIO GERADO COM SUCESSO!');
        console.log(`📁 Arquivo: analysis/system-context.json`);
        console.log(`📁 Arquivo: analysis/system-context.md`);
        console.log('\n📋 AGORA VOCÊ PODE:');
        console.log('   1. Copiar o conteúdo do JSON');
        console.log('   2. Colar para qualquer IA');
        console.log('   3. A IA vai entender TODO o sistema!');
    }

    mapStructure() {
        console.log('📁 Mapeando estrutura...');
        
        const structure = {
            directories: [],
            files: {}
        };
        
        const walk = (dir, prefix = '') => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    if (['node_modules', '.git', 'analysis', 'logs', 'backups'].includes(item)) continue;
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);
                    const relativePath = path.relative(this.rootDir, itemPath);
                    
                    if (stat.isDirectory()) {
                        structure.directories.push(relativePath);
                        walk(itemPath, prefix + '  ');
                    } else if (['.js', '.json', '.md', '.html', '.css'].includes(path.extname(item))) {
                        try {
                            const content = fs.readFileSync(itemPath, 'utf8');
                            const lines = content.split('\n').length;
                            structure.files[relativePath] = {
                                size: stat.size,
                                lines: lines,
                                extension: path.extname(item),
                                lastModified: stat.mtime
                            };
                        } catch {}
                    }
                }
            } catch {}
        };
        
        walk(this.rootDir);
        this.output.architecture.structure = structure;
        console.log(`   ✅ ${Object.keys(structure.files).length} arquivos mapeados`);
    }

    mapRoutes() {
        console.log('🛤️  Mapeando rotas...');
        
        const routesDir = path.join(this.rootDir, 'server', 'routes');
        const endpoints = [];
        
        if (fs.existsSync(routesDir)) {
            const files = fs.readdirSync(routesDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
                    const routeName = file.replace('.routes.js', '').replace('.js', '');
                    
                    const endpointRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
                    let match;
                    while ((match = endpointRegex.exec(content)) !== null) {
                        endpoints.push({
                            method: match[1].toUpperCase(),
                            path: `/${routeName}${match[2]}`,
                            file: file,
                            description: this.extractDescription(content, match.index)
                        });
                    }
                }
            }
        }
        
        this.output.api.endpoints = endpoints;
        this.output.routes = endpoints;
        console.log(`   ✅ ${endpoints.length} endpoints mapeados`);
    }

    mapServices() {
        console.log('⚙️  Mapeando serviços...');
        
        const servicesDir = path.join(this.rootDir, 'server', 'services');
        const services = [];
        
        if (fs.existsSync(servicesDir)) {
            const files = fs.readdirSync(servicesDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const content = fs.readFileSync(path.join(servicesDir, file), 'utf8');
                    const functions = this.extractFunctions(content);
                    services.push({
                        name: file.replace('.js', ''),
                        file: file,
                        functions: functions,
                        description: this.extractDescription(content, 0)
                    });
                }
            }
        }
        
        this.output.services = services;
        this.output.architecture.backend.services = services;
        console.log(`   ✅ ${services.length} serviços mapeados`);
    }

    mapFunctions() {
        console.log('🔧 Mapeando funções importantes...');
        
        const functions = [];
        const files = this.findCodeFiles();
        
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const fileFunctions = this.extractFunctions(content);
            if (fileFunctions.length > 0) {
                functions.push({
                    file: path.relative(this.rootDir, file),
                    functions: fileFunctions
                });
            }
        }
        
        this.output.functions = functions;
        console.log(`   ✅ ${functions.length} arquivos com funções`);
    }

    extractFunctions(content) {
        const functions = [];
        const patterns = [
            /function\s+(\w+)\s*\(/g,
            /const\s+(\w+)\s*=\s*async\s*\(/g,
            /const\s+(\w+)\s*=\s*\(/g,
            /async\s+function\s+(\w+)/g,
            /class\s+(\w+)/g
        ];
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1] && !functions.includes(match[1])) {
                    functions.push(match[1]);
                }
            }
        }
        
        return functions;
    }

    extractBusinessRules() {
        console.log('📋 Extraindo regras de negócio...');
        
        const rules = [];
        const files = this.findCodeFiles();
        const keywords = ['validate', 'check', 'isValid', 'permission', 'role', 'limit', 'allowed', 'blocked'];
        
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (keywords.some(k => line.toLowerCase().includes(k)) && 
                        (line.includes('if') || line.includes('return') || line.includes('throw'))) {
                        rules.push({
                            type: this.detectRuleType(line),
                            description: line.trim(),
                            file: path.relative(this.rootDir, file),
                            line: i + 1
                        });
                    }
                }
            } catch {}
        }
        
        this.output.businessRules = rules;
        console.log(`   ✅ ${rules.length} regras de negócio encontradas`);
    }

    detectRuleType(line) {
        if (line.includes('validate')) return 'validation';
        if (line.includes('permission') || line.includes('role')) return 'permission';
        if (line.includes('limit')) return 'limit';
        if (line.includes('check')) return 'check';
        if (line.includes('blocked')) return 'block';
        return 'business_rule';
    }

    mapDependencies() {
        console.log('📦 Mapeando dependências...');
        
        try {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            this.output.dependencies = {
                production: Object.keys(pkg.dependencies || {}).length,
                development: Object.keys(pkg.devDependencies || {}).length,
                list: {
                    production: pkg.dependencies || {},
                    development: pkg.devDependencies || {}
                },
                scripts: pkg.scripts || {}
            };
        } catch {}
        
        console.log(`   ✅ ${this.output.dependencies.production} dependências de produção`);
    }

    mapConfig() {
        console.log('⚙️  Mapeando configurações...');
        
        try {
            const env = fs.readFileSync('.env', 'utf8');
            const config = {};
            const lines = env.split('\n');
            
            for (const line of lines) {
                if (line.includes('=') && !line.startsWith('#')) {
                    const [key, value] = line.split('=');
                    config[key.trim()] = value.trim();
                }
            }
            
            // Ocultar dados sensíveis
            if (config.JWT_SECRET) config.JWT_SECRET = '***';
            if (config.MERCADOPAGO_ACCESS_TOKEN) config.MERCADOPAGO_ACCESS_TOKEN = '***';
            if (config.EMAIL_PASSWORD) config.EMAIL_PASSWORD = '***';
            
            this.output.config = config;
        } catch {}
        
        console.log('   ✅ Configurações mapeadas');
    }

    mapSecurity() {
        console.log('🔒 Mapeando segurança...');
        
        const security = {
            auth: {
                enabled: true,
                type: 'JWT',
                middleware: 'auth.js'
            },
            cors: {
                enabled: true
            },
            rateLimit: false,
            validation: true
        };
        
        this.output.security = security;
        console.log('   ✅ Segurança mapeada');
    }

    mapWebhooks() {
        console.log('📡 Mapeando webhooks...');
        
        const webhooks = [];
        const content = fs.readFileSync('server/routes/pagamento.routes.js', 'utf8');
        const webhookRegex = /router\.post\s*\(\s*['"]([^'"]+)['"]/g;
        
        let match;
        while ((match = webhookRegex.exec(content)) !== null) {
            webhooks.push({
                path: `/api/pagamento${match[1]}`,
                method: 'POST',
                description: 'Webhook do MercadoPago para confirmação de pagamentos'
            });
        }
        
        this.output.api.webhooks = webhooks;
        console.log(`   ✅ ${webhooks.length} webhooks mapeados`);
    }

    generateSummary() {
        console.log('📊 Gerando resumo...');
        
        this.output.summary = {
            totalFiles: Object.keys(this.output.architecture.structure?.files || {}).length,
            totalEndpoints: this.output.api.endpoints.length,
            totalServices: this.output.services.length,
            totalBusinessRules: this.output.businessRules.length,
            totalWebhooks: this.output.api.webhooks.length,
            mainTechnologies: ['Node.js', 'Express', 'SQLite', 'MercadoPago']
        };
        
        // Adicionar sugestões automáticas
        this.output.suggestions = [
            {
                category: 'documentation',
                description: 'Adicionar comentários JSDoc nas funções principais',
                impact: 'Facilita a compreensão do código por outras IAs e desenvolvedores'
            },
            {
                category: 'testing',
                description: 'Implementar testes unitários para as regras de negócio',
                impact: 'Garante a confiabilidade do sistema'
            },
            {
                category: 'security',
                description: 'Adicionar rate limiting nas rotas de pagamento',
                impact: 'Protege contra ataques de força bruta'
            }
        ];
    }

    findCodeFiles() {
        const files = [];
        const walk = (dir) => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    if (['node_modules', '.git', 'analysis', 'logs', 'backups'].includes(item)) continue;
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);
                    if (stat.isDirectory()) {
                        walk(itemPath);
                    } else if (item.endsWith('.js')) {
                        files.push(itemPath);
                    }
                }
            } catch {}
        };
        walk(this.rootDir);
        return files;
    }

    extractDescription(content, position) {
        const lines = content.split('\n');
        const currentLine = content.substring(0, position).split('\n').length - 1;
        
        for (let i = currentLine - 5; i < currentLine + 5; i++) {
            if (i >= 0 && i < lines.length) {
                const line = lines[i];
                if (line.includes('//') || line.includes('/*') || line.includes('*')) {
                    return line.replace(/\/\/|\*|\/\*/g, '').trim();
                }
            }
        }
        return '';
    }

    saveReport() {
        const reportDir = path.join(this.rootDir, 'analysis');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const jsonPath = path.join(reportDir, 'system-context.json');
        fs.writeFileSync(jsonPath, JSON.stringify(this.output, null, 2));
        
        this.saveMarkdown(reportDir);
        
        console.log(`\n📄 JSON: ${jsonPath}`);
    }

    saveMarkdown(reportDir) {
        const mdPath = path.join(reportDir, 'system-context.md');
        let md = `# 📊 Contexto Completo do SEE&AGENDE\n\n`;
        md += `## 📋 Visão Geral\n\n`;
        md += `- **Sistema:** ${this.output.system.name}\n`;
        md += `- **Versão:** ${this.output.system.version}\n`;
        md += `- **Data:** ${new Date(this.output.timestamp).toLocaleString('pt-BR')}\n`;
        md += `- **Arquivos:** ${this.output.summary.totalFiles}\n\n`;
        
        md += `## 🛤️ Endpoints da API (${this.output.api.endpoints.length})\n\n`;
        const endpoints = this.output.api.endpoints.slice(0, 20);
        for (const endpoint of endpoints) {
            md += `- \`${endpoint.method}\` ${endpoint.path}\n`;
        }
        if (endpoints.length < this.output.api.endpoints.length) {
            md += `\n*... e mais ${this.output.api.endpoints.length - endpoints.length} endpoints*\n`;
        }
        
        md += `\n## ⚙️ Serviços (${this.output.services.length})\n\n`;
        for (const service of this.output.services) {
            md += `- **${service.name}**: ${service.functions.length} funções\n`;
        }
        
        md += `\n## 📋 Regras de Negócio (${this.output.businessRules.length})\n\n`;
        for (const rule of this.output.businessRules.slice(0, 10)) {
            md += `- **${rule.type}**: \`${rule.description.substring(0, 80)}...\` (${rule.file}:${rule.line})\n`;
        }
        
        md += `\n## 📦 Dependências\n\n`;
        md += `- Produção: ${this.output.dependencies.production}\n`;
        md += `- Desenvolvimento: ${this.output.dependencies.development}\n\n`;
        
        md += `\n## 💡 Sugestões de Melhoria\n\n`;
        for (const suggestion of this.output.suggestions) {
            md += `### ${suggestion.category.toUpperCase()}\n`;
            md += `- ${suggestion.description}\n`;
            md += `- Impacto: ${suggestion.impact}\n\n`;
        }
        
        // 🔥 NOVAS SEÇÕES NO MARKDOWN
        md += `\n## 🔄 Últimas Alterações\n\n`;
        if (this.output.lastChanges.recentCommits && this.output.lastChanges.recentCommits.length > 0) {
            md += `### Commits Recentes (${this.output.lastChanges.totalCommits})\n\n`;
            for (const commit of this.output.lastChanges.recentCommits) {
                md += `- ${commit}\n`;
            }
        } else {
            md += `*Nenhum commit recente encontrado*\n`;
        }
        
        md += `\n## 🚀 Comandos de Deploy\n\n`;
        md += `### VPS (${this.output.deployCommands.vps?.ip || 'N/A'})\n\n`;
        md += `**Acessar:**\n\`\`\`bash\nssh root@${this.output.deployCommands.vps?.ip || '179.199.134.127'}\ncd ${this.output.deployCommands.vps?.projectPath || '/var/www/barbearia_nova'}\n\`\`\`\n\n`;
        md += `**Reiniciar:**\n\`\`\`bash\npm2 restart seeagende\npm2 logs seeagende --lines 20\n\`\`\`\n\n`;
        md += `**Enviar arquivos:**\n\`\`\`bash\n${(this.output.deployCommands.vps?.scpCommands || []).join('\n')}\n\`\`\`\n\n`;
        
        md += `\n## 📁 Estrutura de Pastas\n\n`;
        const folderStructure = this.output.folderStructure || {};
        for (const [folder, info] of Object.entries(folderStructure)) {
            if (typeof info === 'object' && info.description) {
                md += `- **${folder}**: ${info.description}\n`;
                if (info.subfolders) {
                    for (const [sub, desc] of Object.entries(info.subfolders)) {
                        md += `  - ${sub}: ${desc}\n`;
                    }
                }
            } else if (typeof info === 'string') {
                md += `- **${folder}**: ${info}\n`;
            }
        }
        
        md += `\n## 🔄 Fluxos de Usuário\n\n`;
        const userFlows = this.output.userFlows || {};
        for (const [flow, data] of Object.entries(userFlows)) {
            md += `### ${flow.toUpperCase()}\n`;
            md += `- ${data.description}\n`;
            for (const step of data.steps || []) {
                md += `  - ${step}\n`;
            }
            md += '\n';
        }
        
        md += `\n## 🐛 Erros Conhecidos\n\n`;
        for (const issue of this.output.knownIssues || []) {
            const emoji = issue.status === 'resolvido' ? '✅' : '❌';
            md += `- ${emoji} **${issue.title}** (${issue.status})\n`;
            md += `  - Solução: ${issue.solution}\n`;
            md += `  - Arquivo: ${issue.file}\n\n`;
        }
        
        md += `\n## 📋 Próximos Passos\n\n`;
        for (const step of this.output.nextSteps || []) {
            md += `- ${step}\n`;
        }
        
        md += `\n## ⚙️ Variáveis de Ambiente\n\n`;
        const envConfig = this.output.envConfig || {};
        md += `**Obrigatórias:**\n\n`;
        for (const env of envConfig.required || []) {
            md += `- \`${env.key}\`: ${env.description} (ex: ${env.example})\n`;
        }
        md += `\n**Opcionais:**\n\n`;
        for (const env of envConfig.optional || []) {
            md += `- \`${env.key}\`: ${env.description} (ex: ${env.example})\n`;
        }
        
        fs.writeFileSync(mdPath, md);
        console.log(`📄 Markdown: ${mdPath}`);
    }
}

// Executar
const exporter = new SystemContextExporter();
exporter.run().catch(console.error);