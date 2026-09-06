// scripts/analyze-full-source.js
// Análise completa do código fonte do SEE&AGENDE
// ULTIMA ATUALIZACAO: 31/08/2026

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FullSourceAnalyzer {
    constructor() {
        this.rootDir = process.cwd();
        this.analysis = {
            timestamp: new Date().toISOString(),
            system: {
                name: 'SEE&AGENDE',
                version: this.getPackageVersion(),
                structure: {
                    directories: [],
                    files: {},
                    totalLines: 0,
                    totalFiles: 0
                }
            },
            backend: {
                controllers: [],
                models: [],
                services: [],
                routes: [],
                middlewares: [],
                utils: [],
                configs: [],
                repositories: [],
                validators: [],
                helpers: []
            },
            frontend: {
                components: [],
                pages: [],
                services: [],
                utils: [],
                styles: [],
                assets: []
            },
            database: {
                migrations: [],
                seeds: [],
                models: [],
                queries: []
            },
            infrastructure: {
                docker: false,
                ci_cd: false,
                monitoring: false,
                logging: false
            },
            dependencies: {
                production: [],
                development: [],
                scripts: {}
            },
            api: {
                endpoints: [],
                documentation: false,
                version: ''
            },
            business_rules: [],
            security: {
                issues: [],
                auth_enabled: false,
                jwt_enabled: false,
                cors_enabled: false,
                helmet_enabled: false
            },
            performance: {
                issues: [],
                caching: false,
                compression: false
            },
            testing: {
                unit_tests: 0,
                integration_tests: 0,
                e2e_tests: 0,
                coverage: false
            },
            suggestions: []
        };
    }

    getPackageVersion() {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return packageJson.version || '2.0.0';
        } catch {
            return '2.0.0';
        }
    }

    analyze() {
        console.log('🔍 Analisando código fonte completo do SEE&AGENDE...\n');
        
        // 1. Analisar estrutura do projeto
        this.analyzeProjectStructure();
        
        // 2. Analisar backend
        this.analyzeBackend();
        
        // 3. Analisar frontend (se existir)
        this.analyzeFrontend();
        
        // 4. Analisar banco de dados
        this.analyzeDatabase();
        
        // 5. Analisar infraestrutura
        this.analyzeInfrastructure();
        
        // 6. Analisar dependências
        this.analyzeDependencies();
        
        // 7. Analisar API
        this.analyzeAPI();
        
        // 8. Analisar segurança
        this.analyzeSecurity();
        
        // 9. Analisar performance
        this.analyzePerformance();
        
        // 10. Gerar sugestões
        this.generateSuggestions();

        // 11. Salvar relatórios
        this.saveReports();
        
        return this.analysis;
    }

    analyzeProjectStructure() {
        console.log('📁 Analisando estrutura do projeto...');
        
        const structure = {
            directories: [],
            files: {}
        };
        
        const directories = this.getAllDirectories(this.rootDir);
        
        for (const dir of directories) {
            const relativePath = path.relative(this.rootDir, dir);
            const parts = relativePath.split(path.sep);
            
            if (!parts.some(p => p === 'node_modules' || p === '.git' || p === '.vscode' || p === 'logs' || p === 'analysis')) {
                structure.directories.push(relativePath);
                
                const files = fs.readdirSync(dir).filter(f => {
                    const ext = path.extname(f);
                    return ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md'].includes(ext);
                });
                
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stat = fs.statSync(filePath);
                    if (stat.isFile()) {
                        const relPath = path.relative(this.rootDir, filePath);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const lines = content.split('\n').length;
                        
                        structure.files[relPath] = {
                            size: stat.size,
                            lines: lines,
                            extension: path.extname(file),
                            lastModified: stat.mtime
                        };
                        structure.totalFiles++;
                        structure.totalLines += lines;
                    }
                }
            }
        }
        
        this.analysis.system.structure = structure;
        console.log(`   ✅ ${structure.totalFiles} arquivos encontrados`);
        console.log(`   ✅ ${structure.totalLines} linhas de código`);
        console.log(`   ✅ ${structure.directories.length} diretórios`);
    }

    getAllDirectories(dir) {
        const dirs = [dir];
        try {
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory() && !item.startsWith('.') && !['node_modules', 'logs', 'analysis'].includes(item)) {
                    dirs.push(...this.getAllDirectories(itemPath));
                }
            }
        } catch {}
        return dirs;
    }

    analyzeBackend() {
        console.log('🔧 Analisando backend...');
        
        const backendDirs = this.findDirectories(['backend', 'server', 'api', 'src']);
        if (backendDirs.length === 0) {
            // Procurar em diretórios raiz
            this.searchBackendFiles(this.rootDir);
        } else {
            for (const dir of backendDirs) {
                this.searchBackendFiles(dir);
            }
        }
        
        console.log(`   ✅ ${this.analysis.backend.controllers.length} controllers`);
        console.log(`   ✅ ${this.analysis.backend.models.length} models`);
        console.log(`   ✅ ${this.analysis.backend.services.length} services`);
        console.log(`   ✅ ${this.analysis.backend.routes.length} routes`);
    }

    findDirectories(names) {
        const found = [];
        const walk = (dir) => {
            try {
                const items = fs.readdirSync(dir);
                for (const item of items) {
                    if (names.includes(item)) {
                        found.push(path.join(dir, item));
                    }
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);
                    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                        walk(itemPath);
                    }
                }
            } catch {}
        };
        walk(this.rootDir);
        return found;
    }

    searchBackendFiles(dir) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                const ext = path.extname(file);
                
                if (stat.isDirectory()) {
                    if (!['node_modules', '.git', 'analysis', 'logs'].includes(file)) {
                        this.searchBackendFiles(filePath);
                    }
                } else if (['.js', '.ts'].includes(ext)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const relativePath = path.relative(this.rootDir, filePath);
                    const fileName = path.basename(file, ext);
                    
                    // Classificar o arquivo
                    if (file.includes('controller') || content.includes('Controller') || content.includes('exports.controller')) {
                        this.analysis.backend.controllers.push({
                            file: relativePath,
                            name: this.extractClassName(content, fileName),
                            methods: this.extractMethods(content)
                        });
                    } else if (file.includes('model') || content.includes('Model') || content.includes('schema')) {
                        this.analysis.backend.models.push({
                            file: relativePath,
                            name: this.extractClassName(content, fileName),
                            fields: this.extractFields(content)
                        });
                    } else if (file.includes('service') || content.includes('Service') || content.includes('services')) {
                        this.analysis.backend.services.push({
                            file: relativePath,
                            name: this.extractClassName(content, fileName),
                            methods: this.extractMethods(content)
                        });
                    } else if (file.includes('route') || content.includes('router.')) {
                        this.analysis.backend.routes.push({
                            file: relativePath,
                            name: fileName,
                            endpoints: this.extractEndpoints(content)
                        });
                    } else if (file.includes('middleware') || content.includes('middleware')) {
                        this.analysis.backend.middlewares.push({
                            file: relativePath,
                            name: fileName
                        });
                    } else if (file.includes('util') || file.includes('helper') || file.includes('lib')) {
                        this.analysis.backend.utils.push({
                            file: relativePath,
                            name: fileName
                        });
                    } else if (file.includes('config') || file.includes('settings')) {
                        this.analysis.backend.configs.push({
                            file: relativePath,
                            name: fileName
                        });
                    } else if (file.includes('repository')) {
                        this.analysis.backend.repositories.push({
                            file: relativePath,
                            name: fileName
                        });
                    } else if (file.includes('validator')) {
                        this.analysis.backend.validators.push({
                            file: relativePath,
                            name: fileName
                        });
                    }
                }
            }
        } catch {}
    }

    extractClassName(content, defaultName) {
        const match = content.match(/class\s+(\w+)/);
        if (match) return match[1];
        const exportMatch = content.match(/exports\.(\w+)/);
        if (exportMatch) return exportMatch[1];
        const moduleMatch = content.match(/module\.exports\s*=\s*{\s*(\w+)/);
        if (moduleMatch) return moduleMatch[1];
        return defaultName;
    }

    extractMethods(content) {
        const methods = [];
        const methodRegex = /(async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
        let match;
        while ((match = methodRegex.exec(content)) !== null) {
            methods.push(match[2]);
        }
        return methods;
    }

    extractFields(content) {
        const fields = [];
        const fieldRegex = /(\w+)\s*:\s*{/g;
        let match;
        while ((match = fieldRegex.exec(content)) !== null) {
            fields.push(match[1]);
        }
        return fields;
    }

    extractEndpoints(content) {
        const endpoints = [];
        const endpointRegex = /(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = endpointRegex.exec(content)) !== null) {
            endpoints.push({
                method: match[2].toUpperCase(),
                path: match[3]
            });
        }
        return endpoints;
    }

    analyzeFrontend() {
        console.log('🎨 Analisando frontend...');
        
        const frontendDirs = this.findDirectories(['frontend', 'client', 'web']);
        if (frontendDirs.length > 0) {
            for (const dir of frontendDirs) {
                this.searchFrontendFiles(dir);
            }
        }
        
        console.log(`   ✅ ${this.analysis.frontend.components.length} componentes`);
        console.log(`   ✅ ${this.analysis.frontend.pages.length} páginas`);
    }

    searchFrontendFiles(dir) {
        try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                const ext = path.extname(file);
                
                if (stat.isDirectory()) {
                    if (!['node_modules', '.git', 'analysis'].includes(file)) {
                        this.searchFrontendFiles(filePath);
                    }
                } else if (['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'].includes(ext)) {
                    const relativePath = path.relative(this.rootDir, filePath);
                    const fileName = path.basename(file, ext);
                    
                    if (file.includes('component') || file.match(/^[A-Z]/)) {
                        this.analysis.frontend.components.push({
                            file: relativePath,
                            name: fileName
                        });
                    } else if (file.includes('page') || file.includes('view')) {
                        this.analysis.frontend.pages.push({
                            file: relativePath,
                            name: fileName
                        });
                    } else if (file.includes('service') || file.includes('api')) {
                        this.analysis.frontend.services.push({
                            file: relativePath,
                            name: fileName
                        });
                    }
                }
            }
        } catch {}
    }

    analyzeDatabase() {
        console.log('🗄️  Analisando banco de dados...');
        
        // Procurar migrations
        const migrationDirs = this.findDirectories(['migrations', 'migrate']);
        for (const dir of migrationDirs) {
            try {
                const files = fs.readdirSync(dir);
                this.analysis.database.migrations = files.map(f => ({
                    file: path.relative(this.rootDir, path.join(dir, f)),
                    name: f
                }));
            } catch {}
        }
        
        // Procurar seeds
        const seedDirs = this.findDirectories(['seeds', 'seed']);
        for (const dir of seedDirs) {
            try {
                const files = fs.readdirSync(dir);
                this.analysis.database.seeds = files.map(f => ({
                    file: path.relative(this.rootDir, path.join(dir, f)),
                    name: f
                }));
            } catch {}
        }
        
        console.log(`   ✅ ${this.analysis.database.migrations.length} migrations`);
        console.log(`   ✅ ${this.analysis.database.seeds.length} seeds`);
    }

    analyzeInfrastructure() {
        console.log('⚙️  Analisando infraestrutura...');
        
        const files = fs.readdirSync(this.rootDir);
        
        this.analysis.infrastructure.docker = files.some(f => f === 'Dockerfile' || f === 'docker-compose.yml');
        this.analysis.infrastructure.ci_cd = files.some(f => f === '.github' || f === '.gitlab-ci.yml' || f === '.circleci');
        this.analysis.infrastructure.monitoring = this.hasDependency('newrelic') || this.hasDependency('sentry') || this.hasDependency('prometheus');
        this.analysis.infrastructure.logging = this.hasDependency('winston') || this.hasDependency('morgan') || this.hasDependency('pino');
        
        console.log(`   ✅ Docker: ${this.analysis.infrastructure.docker ? '✅' : '❌'}`);
        console.log(`   ✅ CI/CD: ${this.analysis.infrastructure.ci_cd ? '✅' : '❌'}`);
        console.log(`   ✅ Monitoring: ${this.analysis.infrastructure.monitoring ? '✅' : '❌'}`);
        console.log(`   ✅ Logging: ${this.analysis.infrastructure.logging ? '✅' : '❌'}`);
    }

    analyzeDependencies() {
        console.log('📦 Analisando dependências...');
        
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            this.analysis.dependencies.production = Object.keys(packageJson.dependencies || {}).map(dep => ({
                name: dep,
                version: packageJson.dependencies[dep]
            }));
            
            this.analysis.dependencies.development = Object.keys(packageJson.devDependencies || {}).map(dep => ({
                name: dep,
                version: packageJson.devDependencies[dep]
            }));
            
            this.analysis.dependencies.scripts = packageJson.scripts || {};
            
        } catch {}
        
        console.log(`   ✅ ${this.analysis.dependencies.production.length} dependências de produção`);
        console.log(`   ✅ ${this.analysis.dependencies.development.length} dependências de desenvolvimento`);
    }

    analyzeAPI() {
        console.log('🌐 Analisando API...');
        
        // Procurar endpoints
        const allRoutes = this.analysis.backend.routes;
        const endpoints = [];
        
        for (const route of allRoutes) {
            if (route.endpoints) {
                endpoints.push(...route.endpoints);
            }
        }
        
        this.analysis.api.endpoints = endpoints;
        this.analysis.api.documentation = this.hasFile('swagger') || this.hasFile('openapi');
        this.analysis.api.version = this.getPackageVersion();
        
        console.log(`   ✅ ${endpoints.length} endpoints encontrados`);
        console.log(`   ✅ Documentação: ${this.analysis.api.documentation ? '✅' : '❌'}`);
    }

    analyzeSecurity() {
        console.log('🔒 Analisando segurança...');
        
        const issues = [];
        
        // Verificar autenticação
        this.analysis.security.auth_enabled = this.hasDependency('passport') || this.hasDependency('jsonwebtoken');
        this.analysis.security.jwt_enabled = this.hasDependency('jsonwebtoken');
        this.analysis.security.cors_enabled = this.hasDependency('cors');
        this.analysis.security.helmet_enabled = this.hasDependency('helmet');
        
        // Verificar hardcoded secrets
        const files = Object.keys(this.analysis.system.structure.files);
        for (const file of files) {
            if (['.js', '.ts'].includes(path.extname(file))) {
                try {
                    const content = fs.readFileSync(path.join(this.rootDir, file), 'utf8');
                    const lines = content.split('\n');
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Verificar hardcoded secrets
                        if ((line.includes('password') || line.includes('secret') || line.includes('key')) && 
                            (line.includes('=') || line.includes(':')) && 
                            !line.includes('process.env') && 
                            !line.includes('require') &&
                            !line.includes('//')) {
                            issues.push({
                                type: 'hardcoded_secrets',
                                severity: 'critical',
                                description: 'Possível segredo hardcoded',
                                file: file,
                                line: i + 1
                            });
                        }
                        
                        // Verificar eval
                        if (line.includes('eval(') && !line.includes('//')) {
                            issues.push({
                                type: 'vulnerability',
                                severity: 'high',
                                description: 'Uso de eval() - pode permitir injeção de código',
                                file: file,
                                line: i + 1
                            });
                        }
                    }
                } catch {}
            }
        }
        
        this.analysis.security.issues = issues;
        
        console.log(`   ✅ ${issues.length} problemas de segurança`);
        console.log(`   ✅ Autenticação: ${this.analysis.security.auth_enabled ? '✅' : '❌'}`);
        console.log(`   ✅ JWT: ${this.analysis.security.jwt_enabled ? '✅' : '❌'}`);
        console.log(`   ✅ CORS: ${this.analysis.security.cors_enabled ? '✅' : '❌'}`);
    }

    analyzePerformance() {
        console.log('⚡ Analisando performance...');
        
        const issues = [];
        
        // Verificar caching
        this.analysis.performance.caching = this.hasDependency('redis') || this.hasDependency('node-cache');
        this.analysis.performance.compression = this.hasDependency('compression');
        
        // Verificar possíveis problemas
        const files = Object.keys(this.analysis.system.structure.files);
        for (const file of files) {
            if (['.js', '.ts'].includes(path.extname(file))) {
                try {
                    const content = fs.readFileSync(path.join(this.rootDir, file), 'utf8');
                    const lines = content.split('\n');
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Verificar loops grandes
                        if (line.includes('for') && line.includes('for') && !line.includes('break')) {
                            issues.push({
                                type: 'performance',
                                severity: 'medium',
                                description: 'Possível loop ineficiente',
                                file: file,
                                line: i + 1
                            });
                        }
                        
                        // Verificar operações síncronas pesadas
                        if ((line.includes('fs.readFileSync') || line.includes('JSON.parse')) && !line.includes('catch')) {
                            issues.push({
                                type: 'performance',
                                severity: 'medium',
                                description: 'Operação síncrona potencialmente pesada',
                                file: file,
                                line: i + 1
                            });
                        }
                    }
                } catch {}
            }
        }
        
        this.analysis.performance.issues = issues;
        
        console.log(`   ✅ ${issues.length} problemas de performance`);
        console.log(`   ✅ Caching: ${this.analysis.performance.caching ? '✅' : '❌'}`);
        console.log(`   ✅ Compression: ${this.analysis.performance.compression ? '✅' : '❌'}`);
    }

    hasDependency(name) {
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return !!(packageJson.dependencies && packageJson.dependencies[name]) ||
                   !!(packageJson.devDependencies && packageJson.devDependencies[name]);
        } catch {
            return false;
        }
    }

    hasFile(pattern) {
        const files = Object.keys(this.analysis.system.structure.files);
        return files.some(f => f.toLowerCase().includes(pattern.toLowerCase()));
    }

    generateSuggestions() {
        console.log('💡 Gerando sugestões...');
        
        const suggestions = [];
        
        // 1. Sugestões baseadas na estrutura
        if (this.analysis.system.structure.totalFiles < 20) {
            suggestions.push({
                category: 'architecture',
                priority: 'high',
                description: 'Projeto parece pequeno. Considere uma estrutura mais organizada com separação clara de responsabilidades',
                impact: 'Melhora a manutenibilidade e escalabilidade'
            });
        }
        
        // 2. Sugestões de backend
        if (this.analysis.backend.controllers.length === 0) {
            suggestions.push({
                category: 'backend',
                priority: 'high',
                description: 'Implementar controllers para organizar a lógica de requisições HTTP',
                impact: 'Melhora a organização do código e facilita manutenção'
            });
        }
        
        if (this.analysis.backend.services.length === 0) {
            suggestions.push({
                category: 'backend',
                priority: 'high',
                description: 'Implementar services para encapsular a lógica de negócio',
                impact: 'Separa a lógica de negócio dos controllers e facilita testes'
            });
        }
        
        // 3. Sugestões de segurança
        if (!this.analysis.security.helmet_enabled) {
            suggestions.push({
                category: 'security',
                priority: 'high',
                description: 'Adicionar Helmet.js para segurança de headers HTTP',
                impact: 'Protege contra vulnerabilidades comuns da web'
            });
        }
        
        if (!this.analysis.security.auth_enabled) {
            suggestions.push({
                category: 'security',
                priority: 'critical',
                description: 'Implementar autenticação e autorização',
                impact: 'Protege os dados e funcionalidades do sistema'
            });
        }
        
        // 4. Sugestões de performance
        if (!this.analysis.performance.caching) {
            suggestions.push({
                category: 'performance',
                priority: 'medium',
                description: 'Implementar cache com Redis ou similar',
                impact: 'Melhora significativamente a performance para operações repetitivas'
            });
        }
        
        if (!this.analysis.performance.compression) {
            suggestions.push({
                category: 'performance',
                priority: 'medium',
                description: 'Adicionar compression para reduzir o tamanho das respostas',
                impact: 'Reduz o uso de banda e melhora o tempo de carregamento'
            });
        }
        
        // 5. Sugestões de infraestrutura
        if (!this.analysis.infrastructure.docker) {
            suggestions.push({
                category: 'infrastructure',
                priority: 'medium',
                description: 'Containerizar a aplicação com Docker',
                impact: 'Facilita deployment, escalabilidade e consistência de ambiente'
            });
        }
        
        if (!this.analysis.infrastructure.monitoring) {
            suggestions.push({
                category: 'infrastructure',
                priority: 'medium',
                description: 'Implementar monitoramento com ferramentas como New Relic ou Sentry',
                impact: 'Permite identificar e resolver problemas proativamente'
            });
        }
        
        // 6. Sugestões de documentação
        if (!this.analysis.api.documentation) {
            suggestions.push({
                category: 'documentation',
                priority: 'medium',
                description: 'Documentar a API com Swagger/OpenAPI',
                impact: 'Facilita o uso e integração da API por outros desenvolvedores'
            });
        }
        
        // 7. Sugestões de testes
        if (this.analysis.dependencies.development.some(d => d.name.includes('jest') || d.name.includes('mocha'))) {
            // Verificar se existem arquivos de teste
            const testFiles = Object.keys(this.analysis.system.structure.files)
                .filter(f => f.includes('test') || f.includes('spec'));
            
            if (testFiles.length === 0) {
                suggestions.push({
                    category: 'testing',
                    priority: 'critical',
                    description: 'Implementar testes unitários e de integração',
                    impact: 'Garante a qualidade do código e previne regressões'
                });
            }
        }
        
        this.analysis.suggestions = suggestions;
        console.log(`   ✅ ${suggestions.length} sugestões geradas`);
    }

    saveReports() {
        // Salvar JSON
        const jsonPath = path.join(this.rootDir, 'analysis', 'full-source-analysis.json');
        const dir = path.dirname(jsonPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(jsonPath, JSON.stringify(this.analysis, null, 2));
        console.log(`\n📄 Relatório JSON salvo em: ${jsonPath}`);
        
        // Salvar Markdown
        this.saveMarkdownReport();
        
        // Salvar HTML com visualização
        this.saveHTMLReport();
    }

    saveMarkdownReport() {
        const mdPath = path.join(this.rootDir, 'analysis', 'full-source-analysis.md');
        let md = `# 📊 Análise Completa do Código Fonte - SEE&AGENDE\n\n`;
        
        md += `## 📋 Visão Geral\n\n`;
        md += `- **Sistema:** ${this.analysis.system.name}\n`;
        md += `- **Versão:** ${this.analysis.system.version}\n`;
        md += `- **Data:** ${new Date(this.analysis.timestamp).toLocaleString('pt-BR')}\n`;
        md += `- **Total de Arquivos:** ${this.analysis.system.structure.totalFiles}\n`;
        md += `- **Total de Linhas:** ${this.analysis.system.structure.totalLines}\n\n`;
        
        md += `## 🔧 Backend\n\n`;
        md += `| Componente | Quantidade |\n`;
        md += `|------------|------------|\n`;
        md += `| Controllers | ${this.analysis.backend.controllers.length} |\n`;
        md += `| Models | ${this.analysis.backend.models.length} |\n`;
        md += `| Services | ${this.analysis.backend.services.length} |\n`;
        md += `| Routes | ${this.analysis.backend.routes.length} |\n`;
        md += `| Middlewares | ${this.analysis.backend.middlewares.length} |\n\n`;
        
        md += `## 🎨 Frontend\n\n`;
        md += `| Componente | Quantidade |\n`;
        md += `|------------|------------|\n`;
        md += `| Components | ${this.analysis.frontend.components.length} |\n`;
        md += `| Pages | ${this.analysis.frontend.pages.length} |\n\n`;
        
        md += `## 🔒 Segurança\n\n`;
        md += `| Aspecto | Status |\n`;
        md += `|---------|--------|\n`;
        md += `| Autenticação | ${this.analysis.security.auth_enabled ? '✅' : '❌'} |\n`;
        md += `| JWT | ${this.analysis.security.jwt_enabled ? '✅' : '❌'} |\n`;
        md += `| CORS | ${this.analysis.security.cors_enabled ? '✅' : '❌'} |\n`;
        md += `| Helmet | ${this.analysis.security.helmet_enabled ? '✅' : '❌'} |\n`;
        md += `| Problemas | ${this.analysis.security.issues.length} |\n\n`;
        
        md += `## ⚡ Performance\n\n`;
        md += `| Aspecto | Status |\n`;
        md += `|---------|--------|\n`;
        md += `| Caching | ${this.analysis.performance.caching ? '✅' : '❌'} |\n`;
        md += `| Compression | ${this.analysis.performance.compression ? '✅' : '❌'} |\n`;
        md += `| Problemas | ${this.analysis.performance.issues.length} |\n\n`;
        
        md += `## 💡 Sugestões de Melhoria\n\n`;
        for (const suggestion of this.analysis.suggestions) {
            const emoji = suggestion.priority === 'critical' ? '🔴' : 
                         suggestion.priority === 'high' ? '🟠' : '🟡';
            md += `### ${emoji} ${suggestion.category.toUpperCase()}\n`;
            md += `- **Descrição:** ${suggestion.description}\n`;
            md += `- **Impacto:** ${suggestion.impact}\n`;
            md += `- **Prioridade:** ${suggestion.priority.toUpperCase()}\n\n`;
        }
        
        fs.writeFileSync(mdPath, md);
        console.log(`📄 Relatório Markdown salvo em: ${mdPath}`);
    }

    saveHTMLReport() {
        const htmlPath = path.join(this.rootDir, 'analysis', 'full-source-analysis.html');
        
        let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análise Completa - SEE&AGENDE</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            background: #f5f7fa;
            padding: 20px;
            color: #2d3748;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 { color: #2b6cb0; border-bottom: 3px solid #4299e1; padding-bottom: 15px; margin-bottom: 25px; }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card {
            background: #f7fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .card h3 { color: #2d3748; margin-bottom: 10px; }
        .number { font-size: 32px; font-weight: bold; color: #2b6cb0; }
        .badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge.success { background: #c6f6d5; color: #22543d; }
        .badge.fail { background: #fed7d7; color: #742a2a; }
        .badge.warning { background: #fefcbf; color: #744210; }
        .suggestion-item {
            background: #f7fafc;
            border-left: 4px solid #4299e1;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
        .suggestion-item.critical { border-left-color: #e53e3e; }
        .suggestion-item.high { border-left-color: #ed8936; }
        .suggestion-item.medium { border-left-color: #ecc94b; }
        .suggestion-item .title { font-weight: bold; font-size: 16px; }
        .suggestion-item .impact { color: #718096; font-size: 14px; margin-top: 5px; }
        @media (max-width: 768px) { .container { padding: 15px; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Análise Completa do Código Fonte - SEE&AGENDE</h1>
        
        <div class="grid-2">
            <div class="card">
                <h3>📊 Visão Geral</h3>
                <div><span class="number">${this.analysis.system.structure.totalFiles}</span> arquivos</div>
                <div>📝 ${this.analysis.system.structure.totalLines} linhas de código</div>
                <div>📁 ${this.analysis.system.structure.directories.length} diretórios</div>
                <div>📦 ${this.analysis.dependencies.production.length} dependências</div>
            </div>
            
            <div class="card">
                <h3>🔧 Backend</h3>
                <div>📋 ${this.analysis.backend.controllers.length} Controllers</div>
                <div>📊 ${this.analysis.backend.models.length} Models</div>
                <div>⚙️ ${this.analysis.backend.services.length} Services</div>
                <div>🛤️ ${this.analysis.backend.routes.length} Routes</div>
                <div>🔗 ${this.analysis.backend.middlewares.length} Middlewares</div>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <h3>🔒 Segurança</h3>
                <div>🔐 Autenticação: <span class="badge ${this.analysis.security.auth_enabled ? 'success' : 'fail'}">${this.analysis.security.auth_enabled ? '✅' : '❌'}</span></div>
                <div>🔑 JWT: <span class="badge ${this.analysis.security.jwt_enabled ? 'success' : 'fail'}">${this.analysis.security.jwt_enabled ? '✅' : '❌'}</span></div>
                <div>🌐 CORS: <span class="badge ${this.analysis.security.cors_enabled ? 'success' : 'fail'}">${this.analysis.security.cors_enabled ? '✅' : '❌'}</span></div>
                <div>🛡️ Helmet: <span class="badge ${this.analysis.security.helmet_enabled ? 'success' : 'fail'}">${this.analysis.security.helmet_enabled ? '✅' : '❌'}</span></div>
                <div>⚠️ Problemas: ${this.analysis.security.issues.length}</div>
            </div>
            
            <div class="card">
                <h3>⚡ Performance</h3>
                <div>💾 Caching: <span class="badge ${this.analysis.performance.caching ? 'success' : 'fail'}">${this.analysis.performance.caching ? '✅' : '❌'}</span></div>
                <div>🗜️ Compression: <span class="badge ${this.analysis.performance.compression ? 'success' : 'fail'}">${this.analysis.performance.compression ? '✅' : '❌'}</span></div>
                <div>⚠️ Problemas: ${this.analysis.performance.issues.length}</div>
            </div>
        </div>

        <h2 style="margin: 30px 0 20px 0;">💡 Sugestões de Melhoria</h2>
        ${this.analysis.suggestions.map(s => `
            <div class="suggestion-item ${s.priority}">
                <div class="title">
                    ${s.priority === 'critical' ? '🔴' : s.priority === 'high' ? '🟠' : '🟡'} 
                    ${s.category.toUpperCase()}: ${s.description}
                </div>
                <div class="impact">📈 Impacto: ${s.impact}</div>
                <div style="margin-top: 5px; font-size: 12px; color: #718096;">
                    Prioridade: ${s.priority.toUpperCase()}
                </div>
            </div>
        `).join('')}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #718096; font-size: 14px;">
            Relatório gerado automaticamente em ${new Date(this.analysis.timestamp).toLocaleString('pt-BR')}
        </div>
    </div>
</body>
</html>`;

        fs.writeFileSync(htmlPath, html);
        console.log(`📄 Relatório HTML salvo em: ${htmlPath}`);
    }
}

// Executar
const analyzer = new FullSourceAnalyzer();
analyzer.analyze();

console.log('\n✅ Análise completa finalizada!');