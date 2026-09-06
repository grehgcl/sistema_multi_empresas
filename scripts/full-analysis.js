// scripts/full-analysis.js
// Script completo para analisar o sistema SEE&AGENDE
// ULTIMA ATUALIZACAO: 31/08/2026

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Configurações
const CONFIG = {
    analyses: [
        {
            name: 'Análise do Sistema',
            script: 'scripts/analyze-system.js',
            output: 'analysis/system-analysis.json',
            icon: '🖥️'
        },
        {
            name: 'Análise da Lógica de Negócio',
            script: 'scripts/analyze-business-logic.js',
            output: 'analysis/business-logic-analysis.json',
            icon: '🧠'
        },
        {
            name: 'Análise de Performance',
            script: 'scripts/analyze-performance.js',
            output: 'analysis/performance-analysis.json',
            icon: '⚡'
        },
        {
            name: 'Análise de Segurança',
            script: 'scripts/analyze-security.js',
            output: 'analysis/security-analysis.json',
            icon: '🔒'
        },
        {
            name: 'Análise de Dependências',
            script: 'scripts/analyze-dependencies.js',
            output: 'analysis/dependencies-analysis.json',
            icon: '📦'
        }
    ],
    reportDir: 'analysis',
    logDir: 'logs',
    singleReport: 'analysis/complete-analysis-report.html'
};

// Cores para console
const c = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`
};

class FullAnalyzer {
    constructor() {
        this.results = [];
        this.analysisData = {};
        this.startTime = Date.now();
        this.currentAnalysis = 0;
        this.totalAnalyses = CONFIG.analyses.length;
    }

    async initialize() {
        this.ensureDirectory(CONFIG.reportDir);
        this.ensureDirectory(CONFIG.logDir);
        
        console.log(c.cyan('🚀 Iniciando análise completa do SEE&AGENDE...\n'));
        console.log(c.gray(`📊 ${this.totalAnalyses} análises serão executadas`));
        console.log(c.gray(`📁 Relatório único será gerado em: ${CONFIG.singleReport}\n`));
    }

    ensureDirectory(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async runAnalyses() {
        const startTime = Date.now();
        
        for (let i = 0; i < CONFIG.analyses.length; i++) {
            const analysis = CONFIG.analyses[i];
            this.currentAnalysis = i + 1;
            
            console.log(c.yellow(`\n📌 [${this.currentAnalysis}/${this.totalAnalyses}] ${analysis.icon} ${analysis.name}`));
            console.log(c.gray(`   Script: ${analysis.script}`));
            
            try {
                const result = await this.runSingleAnalysis(analysis);
                this.results.push(result);
                
                if (result.success) {
                    console.log(c.green(`   ✅ ${analysis.name} concluída com sucesso!`));
                    // Carregar dados da análise
                    if (result.output && fs.existsSync(result.output)) {
                        try {
                            const data = JSON.parse(fs.readFileSync(result.output, 'utf8'));
                            this.analysisData[analysis.name] = data;
                            console.log(c.gray(`   📊 Dados carregados: ${Object.keys(data).length} propriedades`));
                        } catch (e) {
                            console.log(c.yellow(`   ⚠️ Não foi possível carregar os dados da análise`));
                        }
                    }
                } else {
                    console.log(c.red(`   ❌ Falha na ${analysis.name.toLowerCase()}`));
                    console.log(c.yellow(`   ⚠️  Erro: ${result.error}`));
                }
                
                this.showProgress();
                
            } catch (error) {
                console.log(c.red(`   ❌ Erro crítico em ${analysis.name}: ${error.message}`));
                this.results.push({
                    name: analysis.name,
                    success: false,
                    error: error.message,
                    output: null
                });
            }
        }
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        console.log(c.green('\n✅ Todas as análises foram concluídas!'));
        console.log(c.gray(`⏱️  Tempo total: ${duration.toFixed(2)} segundos`));
        
        this.generateSummary();
        this.generateCompleteHTMLReport();
    }

    runSingleAnalysis(analysis) {
        return new Promise((resolve) => {
            const scriptPath = path.join(process.cwd(), analysis.script);
            
            if (!fs.existsSync(scriptPath)) {
                resolve({
                    name: analysis.name,
                    success: false,
                    error: `Script não encontrado: ${analysis.script}`,
                    output: null,
                    duration: 0
                });
                return;
            }

            const startTime = Date.now();
            let output = '';
            let errorOutput = '';

            const child = spawn('node', [scriptPath], {
                cwd: process.cwd(),
                env: { ...process.env, NODE_ENV: 'analysis' }
            });

            child.stdout.on('data', (data) => {
                const text = data.toString();
                output += text;
                if (text.includes('✅') || text.includes('❌') || text.includes('📊')) {
                    process.stdout.write(`   ${text}`);
                }
            });

            child.stderr.on('data', (data) => {
                const text = data.toString();
                errorOutput += text;
                if (text.includes('error') || text.includes('Error')) {
                    process.stderr.write(`   ${c.red(text)}`);
                }
            });

            const timeout = setTimeout(() => {
                child.kill();
                resolve({
                    name: analysis.name,
                    success: false,
                    error: 'Timeout - análise excedeu o tempo limite de 5 minutos',
                    output: null,
                    duration: Date.now() - startTime
                });
            }, 300000);

            child.on('close', (code) => {
                clearTimeout(timeout);
                const duration = Date.now() - startTime;
                
                if (code === 0) {
                    resolve({
                        name: analysis.name,
                        success: true,
                        output: analysis.output,
                        duration: duration,
                        log: output
                    });
                } else {
                    resolve({
                        name: analysis.name,
                        success: false,
                        error: `Processo finalizou com código ${code}`,
                        output: null,
                        duration: duration,
                        log: output,
                        errorLog: errorOutput
                    });
                }
            });
        });
    }

    showProgress() {
        const progress = (this.currentAnalysis / this.totalAnalyses * 100).toFixed(1);
        const barLength = 30;
        const filled = Math.round(progress / 100 * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        console.log(c.gray(`\n   Progresso: [${bar}] ${progress}%`));
    }

    generateSummary() {
        const successCount = this.results.filter(r => r.success).length;
        const failCount = this.results.filter(r => !r.success).length;
        
        console.log(c.cyan('\n📊 RESUMO DA ANÁLISE'));
        console.log(c.gray('═'.repeat(50)));
        console.log(`   ✅ Análises bem-sucedidas: ${c.green(successCount)}`);
        console.log(`   ❌ Análises com falha: ${c.red(failCount)}`);
        console.log(`   📊 Total: ${this.totalAnalyses}`);
    }

    generateCompleteHTMLReport() {
        const html = this.buildHTMLReport();
        fs.writeFileSync(CONFIG.singleReport, html);
        console.log(c.green(`\n📄 Relatório completo gerado em: ${CONFIG.singleReport}`));
        console.log(c.gray(`🌐 Abra o arquivo no navegador para visualizar todas as análises`));
    }

    buildHTMLReport() {
        const timestamp = new Date().toLocaleString('pt-BR');
        const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
        const successCount = this.results.filter(r => r.success).length;
        const failCount = this.results.filter(r => !r.success).length;

        return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Completo - SEE&AGENDE</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
        h1 {
            color: #2b6cb0;
            border-bottom: 3px solid #4299e1;
            padding-bottom: 15px;
            margin-bottom: 25px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            background: #edf2f7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .header-item {
            display: flex;
            flex-direction: column;
        }
        .header-item label {
            font-size: 12px;
            text-transform: uppercase;
            color: #718096;
            font-weight: 600;
        }
        .header-item value {
            font-size: 18px;
            font-weight: bold;
            color: #2d3748;
            margin-top: 4px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .summary-card.success { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); }
        .summary-card.fail { background: linear-gradient(135deg, #fc8181 0%, #e53e3e 100%); }
        .summary-card.total { background: linear-gradient(135deg, #4299e1 0%, #2b6cb0 100%); }
        .summary-card .number { font-size: 32px; font-weight: bold; }
        .summary-card .label { font-size: 14px; opacity: 0.9; margin-top: 5px; }
        
        .charts-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
        }
        .chart-box {
            background: #f7fafc;
            border-radius: 8px;
            padding: 20px;
            border: 1px solid #e2e8f0;
        }
        .chart-box h3 { color: #2d3748; margin-bottom: 15px; font-size: 16px; }
        canvas { max-width: 100%; max-height: 300px; }
        
        .analysis-section { margin-top: 30px; }
        .analysis-item {
            background: #f7fafc;
            border-left: 4px solid #4299e1;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            border-left-width: 4px;
        }
        .analysis-item.success { border-left-color: #48bb78; }
        .analysis-item.fail { border-left-color: #fc8181; }
        .analysis-item h3 {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            color: #2d3748;
        }
        .analysis-item .status { font-size: 20px; }
        .analysis-item .details {
            margin-top: 10px;
            padding: 10px;
            background: white;
            border-radius: 4px;
            font-size: 14px;
        }
        .analysis-item .details pre {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
            margin-top: 10px;
            max-height: 400px;
            overflow-y: auto;
        }
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        .data-card {
            background: #edf2f7;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .data-card .value {
            font-size: 24px;
            font-weight: bold;
            color: #2b6cb0;
        }
        .data-card .label {
            font-size: 12px;
            color: #718096;
            margin-top: 4px;
        }
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
        
        .toggle-btn {
            background: #4299e1;
            color: white;
            border: none;
            padding: 5px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 10px;
        }
        .toggle-btn:hover { background: #3182ce; }
        
        @media (max-width: 768px) {
            .container { padding: 15px; }
            .charts-container { grid-template-columns: 1fr; }
            .header-info { grid-template-columns: 1fr; }
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <h1>📊 Relatório Completo de Análise - SEE&AGENDE</h1>

        <div class="header-info">
            <div class="header-item">
                <label>Data da Análise</label>
                <value>${timestamp}</value>
            </div>
            <div class="header-item">
                <label>Tempo Total</label>
                <value>${duration} segundos</value>
            </div>
            <div class="header-item">
                <label>Node.js</label>
                <value>${process.version}</value>
            </div>
            <div class="header-item">
                <label>Plataforma</label>
                <value>${process.platform}</value>
            </div>
        </div>

        <div class="summary-grid">
            <div class="summary-card total">
                <div class="number">${this.totalAnalyses}</div>
                <div class="label">Total de Análises</div>
            </div>
            <div class="summary-card success">
                <div class="number">${successCount}</div>
                <div class="label">✅ Bem-sucedidas</div>
            </div>
            <div class="summary-card fail">
                <div class="number">${failCount}</div>
                <div class="label">❌ Com Falha</div>
            </div>
        </div>

        <div class="charts-container">
            <div class="chart-box">
                <h3>📈 Distribuição dos Resultados</h3>
                <canvas id="resultsChart"></canvas>
            </div>
            <div class="chart-box">
                <h3>⏱️ Tempo por Análise</h3>
                <canvas id="durationChart"></canvas>
            </div>
        </div>

        <div class="analysis-section">
            <h2 style="color: #2d3748; margin-bottom: 20px;">📋 Detalhes das Análises</h2>
            ${this.generateAnalysisHTML()}
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #718096; font-size: 14px;">
            Relatório gerado automaticamente em ${timestamp} | SEE&AGENDE Analysis Tool
        </div>
    </div>

    <script>
        // Gráfico de resultados
        const ctx1 = document.getElementById('resultsChart').getContext('2d');
        new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['✅ Sucesso', '❌ Falha'],
                datasets: [{
                    data: [${successCount}, ${failCount}],
                    backgroundColor: ['#48bb78', '#fc8181'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // Gráfico de duração
        const ctx2 = document.getElementById('durationChart').getContext('2d');
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(this.results.map(r => r.name))},
                datasets: [{
                    label: 'Duração (ms)',
                    data: ${JSON.stringify(this.results.map(r => r.duration || 0))},
                    backgroundColor: ${JSON.stringify(this.results.map(r => 
                        r.success ? 'rgba(72, 187, 120, 0.7)' : 'rgba(252, 129, 129, 0.7)'
                    ))},
                    borderColor: ${JSON.stringify(this.results.map(r => 
                        r.success ? '#48bb78' : '#fc8181'
                    ))},
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: function(value) { return value + 'ms'; } }
                    }
                }
            }
        });

        // Função para toggle de dados
        function toggleData(id) {
            const element = document.getElementById('data-' + id);
            if (element.style.display === 'none') {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        }
    </script>
</body>
</html>`;
    }

    generateAnalysisHTML() {
        return this.results.map((result, index) => {
            const statusIcon = result.success ? '✅' : '❌';
            const statusClass = result.success ? 'success' : 'fail';
            const duration = result.duration ? `${(result.duration/1000).toFixed(2)}s` : 'N/A';
            
            let detailsHTML = '';
            if (result.success && result.output) {
                const outputPath = path.basename(result.output);
                detailsHTML = `
                    <div class="details">
                        <strong>📄 Relatório:</strong> ${outputPath}
                        ${this.getDataCards(result.name)}
                        ${this.getDataPreview(result.name)}
                    </div>
                `;
            } else if (result.error) {
                detailsHTML = `
                    <div class="details">
                        <strong>❌ Erro:</strong> ${result.error}
                    </div>
                `;
            }

            const analysis = CONFIG.analyses.find(a => a.name === result.name);
            const icon = analysis ? analysis.icon : '📊';

            return `
                <div class="analysis-item ${statusClass}">
                    <h3>
                        <span class="status">${statusIcon}</span>
                        ${icon} ${index + 1}. ${result.name}
                        <span style="margin-left: auto; font-size: 14px; color: #718096;">
                            ⏱️ ${duration}
                        </span>
                    </h3>
                    ${detailsHTML}
                </div>
            `;
        }).join('');
    }

    getDataCards(analysisName) {
        const data = this.analysisData[analysisName];
        if (!data || typeof data !== 'object') return '';

        // Extrair métricas importantes
        const metrics = {};
        
        // Tentar extrair dados comuns
        if (data.total !== undefined) metrics['Total'] = data.total;
        if (data.success !== undefined) metrics['Sucessos'] = data.success;
        if (data.errors !== undefined) metrics['Erros'] = data.errors;
        if (data.warnings !== undefined) metrics['Alertas'] = data.warnings;
        if (data.files !== undefined) metrics['Arquivos'] = data.files;
        if (data.lines !== undefined) metrics['Linhas'] = data.lines;
        if (data.functions !== undefined) metrics['Funções'] = data.functions;
        if (data.classes !== undefined) metrics['Classes'] = data.classes;
        if (data.components !== undefined) metrics['Componentes'] = data.components;
        if (data.services !== undefined) metrics['Serviços'] = data.services;
        if (data.models !== undefined) metrics['Modelos'] = data.models;
        if (data.controllers !== undefined) metrics['Controllers'] = data.controllers;
        
        // Se não encontrou métricas específicas, tenta extrair números do objeto
        if (Object.keys(metrics).length === 0) {
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'number' && !key.includes('id') && !key.includes('code')) {
                    metrics[key] = value;
                    if (Object.keys(metrics).length >= 4) break;
                }
            }
        }

        if (Object.keys(metrics).length === 0) return '';

        let cardsHTML = '<div class="data-grid">';
        for (const [label, value] of Object.entries(metrics)) {
            const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
            cardsHTML += `
                <div class="data-card">
                    <div class="value">${value}</div>
                    <div class="label">${formattedLabel}</div>
                </div>
            `;
        }
        cardsHTML += '</div>';

        return cardsHTML;
    }

    getDataPreview(analysisName) {
        const data = this.analysisData[analysisName];
        if (!data) return '';

        // Mostrar botão para ver dados completos
        return `
            <div style="margin-top: 15px;">
                <button class="toggle-btn" onclick="toggleData('${analysisName.replace(/\s/g, '')}')">
                    🔍 Ver dados completos da análise
                </button>
                <div id="data-${analysisName.replace(/\s/g, '')}" style="display: none; margin-top: 10px;">
                    <pre>${this.escapeHtml(JSON.stringify(data, null, 2))}</pre>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async run() {
        try {
            await this.initialize();
            await this.runAnalyses();
        } catch (error) {
            console.error(c.red(`❌ Erro fatal: ${error.message}`));
            process.exit(1);
        }
    }
}

// Executar
const analyzer = new FullAnalyzer();

process.on('SIGINT', () => {
    console.log(c.yellow('\n\n⚠️  Análise interrompida pelo usuário'));
    process.exit(0);
});

analyzer.run().catch(error => {
    console.error(c.red(`❌ Erro não tratado: ${error.message}`));
    process.exit(1);
});

module.exports = { FullAnalyzer, CONFIG };