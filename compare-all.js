// ============================================
// 🔍 COMPARADOR COMPLETO - VS Code x VPS
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
// PASTAS PARA IGNORAR
// ============================================
const ignoreFolders = [
    'node_modules',
    '.git',
    'database',
    'backups',
    '.pm2',
    'logs',
    'tmp',
    'cache',
    '.vscode',
    'scripts'
];

const ignoreFiles = [
    '.env',
    'package-lock.json',
    'database-compatibility-report.json',
    '*.db',
    '*.log',
    '.DS_Store',
    '*.bak',
    '*.backup'
];

// ============================================
// FUNÇÕES
// ============================================

function deveIgnorar(caminho) {
    const nome = path.basename(caminho);
    
    // Ignorar pastas
    for (const folder of ignoreFolders) {
        if (caminho.includes(`/${folder}/`) || caminho.includes(`\\${folder}\\`)) {
            return true;
        }
    }
    
    // Ignorar arquivos
    for (const pattern of ignoreFiles) {
        if (pattern.includes('*')) {
            const ext = pattern.replace('*', '');
            if (nome.endsWith(ext)) return true;
        } else if (nome === pattern) {
            return true;
        }
    }
    
    return false;
}

function listarArquivos(dir, baseDir = '') {
    let resultados = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const caminhoCompleto = path.join(dir, item);
        const caminhoRelativo = baseDir ? path.join(baseDir, item) : item;
        
        if (deveIgnorar(caminhoCompleto)) continue;
        
        const stat = fs.statSync(caminhoCompleto);
        if (stat.isDirectory()) {
            resultados = resultados.concat(listarArquivos(caminhoCompleto, caminhoRelativo));
        } else {
            resultados.push(caminhoRelativo);
        }
    }
    
    return resultados;
}

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

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================
function compararTodos() {
    console.log('\n' + '='.repeat(70));
    log('🔍 COMPARADOR COMPLETO - VS Code x VPS', cores.azul);
    console.log('='.repeat(70));
    console.log('');
    
    log(`📂 Local: ${CONFIG.localPath}`, cores.azul);
    log(`🌐 VPS: ${CONFIG.vpsUser}@${CONFIG.vpsIp}:${CONFIG.vpsPath}`, cores.azul);
    console.log('');
    console.log('-'.repeat(70));
    console.log('');
    
    console.log('📁 LISTANDO ARQUIVOS LOCAIS...');
    const arquivosLocais = listarArquivos(CONFIG.localPath);
    console.log(`✅ ${arquivosLocais.length} arquivos encontrados`);
    console.log('');
    
    console.log('📁 LISTANDO ARQUIVOS NA VPS...');
    let arquivosVps = [];
    try {
        const cmd = `ssh ${CONFIG.vpsUser}@${CONFIG.vpsIp} "cd ${CONFIG.vpsPath} && find . -type f ! -path '*/node_modules/*' ! -path '*/.git/*' ! -path '*/database/*' ! -path '*/.env' ! -path '*/backups/*' ! -path '*/logs/*' ! -path '*/tmp/*' | sed 's|^\\./||'"`;
        const result = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        arquivosVps = result.trim().split('\n').filter(f => f);
    } catch (error) {
        console.error('❌ Erro ao listar arquivos da VPS');
    }
    console.log(`✅ ${arquivosVps.length} arquivos encontrados`);
    console.log('');
    console.log('-'.repeat(70));
    console.log('');
    
    // ============================================
    // ANÁLISE
    // ============================================
    
    const apenasLocal = [];
    const apenasVps = [];
    const iguais = [];
    const diferentes = [];
    
    // Verificar arquivos que estão no local
    for (const arquivo of arquivosLocais) {
        if (arquivosVps.includes(arquivo)) {
            const md5Local = md5File(path.join(CONFIG.localPath, arquivo));
            const md5VpsResult = md5Vps(arquivo);
            
            if (md5Local === md5VpsResult) {
                iguais.push(arquivo);
            } else {
                diferentes.push(arquivo);
            }
        } else {
            apenasLocal.push(arquivo);
        }
    }
    
    // Verificar arquivos que estão apenas na VPS
    for (const arquivo of arquivosVps) {
        if (!arquivosLocais.includes(arquivo)) {
            apenasVps.push(arquivo);
        }
    }
    
    // ============================================
    // EXIBIR RESULTADOS
    // ============================================
    
    log('📊 RESUMO GERAL:', cores.azul);
    console.log(`   📁 Total arquivos locais: ${arquivosLocais.length}`);
    console.log(`   📁 Total arquivos VPS: ${arquivosVps.length}`);
    console.log('');
    console.log(`   ${cores.verde}✅ Iguais: ${iguais.length}${cores.reset}`);
    console.log(`   ${cores.vermelho}❌ Diferentes: ${diferentes.length}${cores.reset}`);
    console.log(`   ${cores.vermelho}❌ Apenas no Local: ${apenasLocal.length}${cores.reset}`);
    console.log(`   ${cores.vermelho}❌ Apenas na VPS: ${apenasVps.length}${cores.reset}`);
    console.log('');
    
    // ============================================
    // DETALHES
    // ============================================
    
    if (diferentes.length > 0) {
        log('📋 ARQUIVOS DIFERENTES:', cores.vermelho);
        for (const arquivo of diferentes.slice(0, 20)) {
            console.log(`   ❌ ${arquivo}`);
        }
        if (diferentes.length > 20) {
            console.log(`   ... e mais ${diferentes.length - 20} arquivos`);
        }
        console.log('');
    }
    
    if (apenasLocal.length > 0) {
        log('📋 ARQUIVOS APENAS NO LOCAL:', cores.vermelho);
        for (const arquivo of apenasLocal.slice(0, 20)) {
            console.log(`   📤 ${arquivo}`);
        }
        if (apenasLocal.length > 20) {
            console.log(`   ... e mais ${apenasLocal.length - 20} arquivos`);
        }
        console.log('');
    }
    
    if (apenasVps.length > 0) {
        log('📋 ARQUIVOS APENAS NA VPS:', cores.vermelho);
        for (const arquivo of apenasVps.slice(0, 20)) {
            console.log(`   📥 ${arquivo}`);
        }
        if (apenasVps.length > 20) {
            console.log(`   ... e mais ${apenasVps.length - 20} arquivos`);
        }
        console.log('');
    }
    
    // ============================================
    // SUGESTÕES
    // ============================================
    
    if (diferentes.length === 0 && apenasLocal.length === 0 && apenasVps.length === 0) {
        log('🎉 TUDO OK! Todos os arquivos estão sincronizados!', cores.verde);
    } else {
        log('💡 Para sincronizar, você pode:', cores.amarelo);
        console.log('');
        
        if (diferentes.length > 0 || apenasLocal.length > 0) {
            console.log('   1. Enviar arquivos que estão diferentes ou faltando:');
            console.log('      scp -r server/ root@179.199.134.127:/var/www/barbearia_nova/');
            console.log('      scp -r public/ root@179.199.134.127:/var/www/barbearia_nova/');
            console.log('');
        }
        
        if (apenasVps.length > 0) {
            console.log('   2. Verificar arquivos que estão apenas na VPS (podem ser backups):');
            console.log(`      ssh ${CONFIG.vpsUser}@${CONFIG.vpsIp} "ls -la ${CONFIG.vpsPath}/"`);
            console.log('');
        }
    }
    
    console.log('='.repeat(70));
    console.log('');
}

// ============================================
// EXECUTAR
// ============================================
try {
    compararTodos();
} catch (error) {
    console.error('❌ Erro ao executar comparação:', error.message);
    process.exit(1);
}