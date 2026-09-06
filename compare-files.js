// ============================================
// 🔍 COMPARADOR DE ARQUIVOS - VS Code x VPS
// ============================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// ============================================
// CONFIGURAÇÕES
// ============================================
const CONFIG = {
    vpsUser: 'root',
    vpsIp: '179.199.134.127',
    vpsPath: '/var/www/barbearia_nova',
    localPath: process.cwd()
};

// Cores para terminal
const cores = {
    verde: '\x1b[32m',
    vermelho: '\x1b[31m',
    amarelo: '\x1b[33m',
    azul: '\x1b[34m',
    reset: '\x1b[0m'
};

// ============================================
// LISTA DE ARQUIVOS PARA COMPARAR
// ============================================
const arquivos = [
    // Backend - Migrations
    { path: 'server/config/migrations/ads_stats.sql', importante: true },
    { path: 'server/config/migrations/run-migration.js', importante: true },
    
    // Backend - Utils
    { path: 'server/utils/cashback.js', importante: false },
    
    // Backend - Routes
    { path: 'server/routes/admin.routes.js', importante: true },
    { path: 'server/routes/chatbot.routes.js', importante: true },
    { path: 'server/routes/empresas.routes.js', importante: true },
    
    // Frontend - JavaScript
    { path: 'public/js/pages/ads.js', importante: true },
    { path: 'public/js/pages/empresas.js', importante: true },
    { path: 'public/js/ui.js', importante: true },
    
    // Frontend - CSS
    { path: 'public/css/pages/empresas.css', importante: true },
    { path: 'public/css/pages/admin-ads.css', importante: false },
    
    // Frontend - HTML
    { path: 'public/chatbot.html', importante: true },
    { path: 'public/index.html', importante: true },
    { path: 'public/admin-ads.html', importante: false },
    { path: 'public/relatorio-ads.html', importante: false }
];

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function md5File(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
        return null;
    }
}

function md5Vps(filePath) {
    try {
        const cmd = `ssh ${CONFIG.vpsUser}@${CONFIG.vpsIp} "md5sum ${CONFIG.vpsPath}/${filePath} 2>/dev/null"`;
        const result = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        return result.trim().split(' ')[0] || null;
    } catch (error) {
        return null;
    }
}

function arquivoExisteVps(filePath) {
    try {
        const cmd = `ssh ${CONFIG.vpsUser}@${CONFIG.vpsIp} "[ -f ${CONFIG.vpsPath}/${filePath} ] && echo 'ok' || echo 'nao'"`;
        const result = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        return result.trim() === 'ok';
    } catch (error) {
        return false;
    }
}

function log(mensagem, cor = cores.reset) {
    console.log(`${cor}${mensagem}${cores.reset}`);
}

function logStatus(simbolo, mensagem, cor = cores.reset) {
    console.log(`${cor}${simbolo} ${mensagem}${cores.reset}`);
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================
function compararArquivos() {
    console.log('\n' + '='.repeat(60));
    log('🔍 COMPARADOR DE ARQUIVOS - VS Code x VPS', cores.azul);
    console.log('='.repeat(60));
    console.log('');
    
    log(`📂 Local: ${CONFIG.localPath}`, cores.azul);
    log(`🌐 VPS: ${CONFIG.vpsUser}@${CONFIG.vpsIp}:${CONFIG.vpsPath}`, cores.azul);
    console.log('');
    console.log('-'.repeat(60));
    console.log('');
    
    let total = 0;
    let iguais = 0;
    let diferentes = 0;
    let faltaLocal = 0;
    let faltaVps = 0;
    
    // Cabeçalho da tabela
    console.log('📊 ARQUIVO'.padEnd(45) + 'STATUS');
    console.log('-'.repeat(60));
    
    for (const arquivo of arquivos) {
        total++;
        const localPath = path.join(CONFIG.localPath, arquivo.path);
        const existeLocal = fs.existsSync(localPath);
        const existeVps = arquivoExisteVps(arquivo.path);
        
        let status = '';
        let cor = cores.reset;
        
        if (!existeLocal) {
            status = '❌ FALTA LOCAL';
            cor = cores.vermelho;
            faltaLocal++;
        } else if (!existeVps) {
            status = '❌ FALTA VPS';
            cor = cores.vermelho;
            faltaVps++;
        } else {
            const md5Local = md5File(localPath);
            const md5VpsResult = md5Vps(arquivo.path);
            
            if (md5Local === md5VpsResult) {
                status = '✅ IGUAL';
                cor = cores.verde;
                iguais++;
            } else {
                status = '❌ DIFERENTE';
                cor = cores.vermelho;
                diferentes++;
            }
        }
        
        // Marcar arquivos importantes
        const marcador = arquivo.importante ? '⭐ ' : '   ';
        const nomeArquivo = marcador + arquivo.path.padEnd(40);
        console.log(`${cor}${nomeArquivo} ${status}${cores.reset}`);
    }
    
    console.log('');
    console.log('-'.repeat(60));
    console.log('');
    
    // Resumo
    log('📊 RESUMO:', cores.azul);
    console.log(`   Total verificados: ${total}`);
    log(`   ✅ Iguais: ${iguais}`, cores.verde);
    log(`   ❌ Diferentes: ${diferentes}`, cores.vermelho);
    log(`   ❌ Faltando na VPS: ${faltaVps}`, cores.vermelho);
    log(`   ❌ Faltando no Local: ${faltaLocal}`, cores.vermelho);
    console.log('');
    
    // Sugestões
    if (diferentes > 0 || faltaVps > 0) {
        log('⚠️  Arquivos que precisam ser sincronizados:', cores.amarelo);
        console.log('');
        
        for (const arquivo of arquivos) {
            const localPath = path.join(CONFIG.localPath, arquivo.path);
            const existeLocal = fs.existsSync(localPath);
            const existeVps = arquivoExisteVps(arquivo.path);
            
            if (existeLocal && !existeVps) {
                log(`   📤 FALTA NA VPS: ${arquivo.path}`, cores.vermelho);
                console.log(`      scp ${arquivo.path} ${CONFIG.vpsUser}@${CONFIG.vpsIp}:${CONFIG.vpsPath}/${path.dirname(arquivo.path)}/`);
            } else if (existeLocal && existeVps) {
                const md5Local = md5File(localPath);
                const md5VpsResult = md5Vps(arquivo.path);
                if (md5Local !== md5VpsResult) {
                    log(`   🔄 DIFERENTE: ${arquivo.path}`, cores.vermelho);
                    console.log(`      scp ${arquivo.path} ${CONFIG.vpsUser}@${CONFIG.vpsIp}:${CONFIG.vpsPath}/${path.dirname(arquivo.path)}/`);
                }
            }
        }
        console.log('');
    }
    
    if (iguais === total && faltaLocal === 0 && faltaVps === 0) {
        log('🎉 TUDO OK! Todos os arquivos estão sincronizados!', cores.verde);
    } else {
        log('💡 Para sincronizar, execute os comandos scp sugeridos acima.', cores.amarelo);
    }
    
    console.log('');
    console.log('='.repeat(60));
    console.log('');
}

// ============================================
// EXECUTAR
// ============================================
try {
    compararArquivos();
} catch (error) {
    console.error('❌ Erro ao executar comparação:', error.message);
    process.exit(1);
}