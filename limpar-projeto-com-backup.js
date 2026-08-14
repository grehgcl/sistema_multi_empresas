// ============================================
// SCRIPT: limpar-projeto-com-backup.js
// Executar: node limpar-projeto-com-backup.js
// ============================================

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️ ===== LIMPEZA SEGURA COM BACKUP =====\n');

// ============================================
// 1. CRIAR PASTA DE BACKUP
// ============================================
const dataHora = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = `backup_antes_limpeza_${dataHora}`;

console.log(`📁 Criando backup em: ${backupDir}/`);
fs.mkdirSync(backupDir, { recursive: true });

// ============================================
// 2. FUNÇÃO PARA COPIAR ARQUIVOS
// ============================================
function copiarParaBackup(origem, destino) {
    try {
        if (!fs.existsSync(origem)) return false;

        // Criar pasta destino
        const pastaDestino = path.dirname(destino);
        if (!fs.existsSync(pastaDestino)) {
            fs.mkdirSync(pastaDestino, { recursive: true });
        }

        // Copiar arquivo
        fs.copyFileSync(origem, destino);
        return true;
    } catch (e) {
        console.log(`⚠️ Erro ao copiar ${origem}: ${e.message}`);
        return false;
    }
}

function copiarPastaParaBackup(origem, destino) {
    try {
        if (!fs.existsSync(origem)) return;

        const itens = fs.readdirSync(origem);
        for (const item of itens) {
            const caminhoOrigem = path.join(origem, item);
            const caminhoDestino = path.join(destino, item);
            const stats = fs.statSync(caminhoOrigem);

            if (stats.isDirectory()) {
                copiarPastaParaBackup(caminhoOrigem, caminhoDestino);
            } else {
                fs.copyFileSync(caminhoOrigem, caminhoDestino);
            }
        }
    } catch (e) {
        console.log(`⚠️ Erro ao copiar pasta ${origem}: ${e.message}`);
    }
}

// ============================================
// 3. FAZER BACKUP DOS ARQUIVOS IMPORTANTES
// ============================================
console.log('\n📦 Fazendo backup dos arquivos...');

// Arquivos importantes para backup
const arquivosImportantes = [
    'server.js',
    'package.json',
    'package-lock.json',
    'public/index.html',
    'public/js/ui.js',
    'public/js/pages/dashboard.js',
    'public/js/pages/empresas.js',
    'public/js/pages/whatsapp-config.js',
    'public/js/pages/agendamentos.js',
    'public/js/pages/clientes.js',
    'public/js/pages/servicos.js',
    'public/js/pages/financeiro.js',
    'public/js/pages/configuracoes.js',
    'public/js/pages/planos.js',
    'server/routes/index.js',
    'server/routes/admin.routes.js',
    'server/routes/whatsapp.routes.js',
    'server/routes/auth.routes.js',
    'server/routes/agendamentos.routes.js',
    'server/routes/servicos.routes.js',
    'server/routes/clientes.routes.js',
    'server/routes/financeiro.routes.js',
    'server/routes/empresas.routes.js',
    'server/routes/planos.routes.js',
    'server/config/database.js',
    'server/middlewares/auth.js',
    'server/services/evolution-instances.js',
    'server/services/whatsapp.js',
    'server/services/mercadopago.js',
    'server/utils/constants.js',
    'server/utils/helpers.js',
    'public/css/style.css'
];

for (const arquivo of arquivosImportantes) {
    if (fs.existsSync(arquivo)) {
        const destino = path.join(backupDir, arquivo);
        copiarParaBackup(arquivo, destino);
        console.log(`  ✅ ${arquivo} -> backup`);
    }
}

// Backup das pastas importantes
console.log('\n📦 Fazendo backup das pastas...');

const pastasImportantes = [
    'public/css/pages',
    'public/js/pages',
    'server/routes',
    'server/services',
    'server/middlewares',
    'server/config',
    'server/utils',
    'scripts'
];

for (const pasta of pastasImportantes) {
    if (fs.existsSync(pasta)) {
        const destino = path.join(backupDir, pasta);
        copiarPastaParaBackup(pasta, destino);
        console.log(`  ✅ ${pasta}/ -> backup`);
    }
}

// ============================================
// 4. BACKUP DO BANCO DE DADOS
// ============================================
console.log('\n💾 Fazendo backup do banco de dados...');

const bancos = [
    'database/barbearia.db',
    'database/empresa_5.db'
];

for (const banco of bancos) {
    if (fs.existsSync(banco)) {
        const destino = path.join(backupDir, banco);
        copiarParaBackup(banco, destino);
        console.log(`  ✅ ${banco} -> backup`);
    }
}

// ============================================
// 5. FAZER BACKUP DO .ENV
// ============================================
console.log('\n🔑 Fazendo backup dos arquivos .env...');

const envFiles = ['.env', '.env.local', '.env.dev'];
for (const env of envFiles) {
    if (fs.existsSync(env)) {
        const destino = path.join(backupDir, env);
        copiarParaBackup(env, destino);
        console.log(`  ✅ ${env} -> backup`);
    }
}

// ============================================
// 6. PERGUNTAR SE QUER CONTINUAR
// ============================================
console.log('\n📊 ===== RESUMO DO BACKUP =====');
console.log(`📁 Pasta de backup: ${backupDir}`);
console.log(`📦 Tamanho do backup: ${(fs.statSync(backupDir).size / 1024 / 1024).toFixed(2)} MB`);
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('❓ Deseja continuar com a limpeza? (s/N): ', (resposta) => {
    if (resposta.toLowerCase() !== 's') {
        console.log('\n❌ Limpeza cancelada. Seus arquivos estão seguros no backup!');
        console.log(`📁 Para restaurar: copie os arquivos de ${backupDir} de volta`);
        rl.close();
        return;
    }

    console.log('\n🧹 Iniciando limpeza...\n');
    realizarLimpeza();
    rl.close();
});

// ============================================
// 7. FUNÇÃO DE LIMPEZA
// ============================================
function realizarLimpeza() {
    // 7.1 Remover pasta lixo
    console.log('🗑️ Removendo pasta lixo/...');
    try {
        if (fs.existsSync('lixo')) {
            fs.rmSync('lixo', { recursive: true, force: true });
            console.log('✅ lixo/ removida');
        }
    } catch (e) {
        console.log('⚠️ Erro ao remover lixo:', e.message);
    }

    // 7.2 Remover backups
    const backups = [
        'public/index.html.backup',
        'public/index.html.backup2',
        'public/js/pages/clientes_back.js',
        'public/js/pages/planos.js.backup',
        'server.js.backup',
        'server.js.backup_whatsapp',
        'server/config/database.js.old',
        'server/utils/constants.js.backup'
    ];

    console.log('\n🗑️ Removendo backups...');
    for (const arquivo of backups) {
        try {
            if (fs.existsSync(arquivo)) {
                fs.unlinkSync(arquivo);
                console.log(`✅ ${arquivo} removido`);
            }
        } catch (e) {
            console.log(`⚠️ Erro ao remover ${arquivo}: ${e.message}`);
        }
    }

    // 7.3 Remover pastas de backup
    const pastasBackup = ['vps_backup', 'backup_local'];
    console.log('\n🗑️ Removendo pastas de backup...');
    for (const pasta of pastasBackup) {
        try {
            if (fs.existsSync(pasta)) {
                fs.rmSync(pasta, { recursive: true, force: true });
                console.log(`✅ ${pasta}/ removida`);
            }
        } catch (e) {
            console.log(`⚠️ Erro ao remover ${pasta}: ${e.message}`);
        }
    }

    // 7.4 Remover arquivos de teste
    const testes = [
        'test-connection.js',
        'testar-login-render.js',
        'teste-email.js',
        'ver-dados.js',
        'ver-horarios-render.js',
        'ver-log-despesas.js',
        'ver-usuarios-local.js',
        'ver-usuarios.js',
        'verificar-agendamentos-dev.js',
        'verificar-evolution.js',
        'verificar-origem.js',
        'verificar-tabelas.js',
        'analisar-estrutura.js',
        'corrigir-whatsapp.js'
    ];

    console.log('\n🗑️ Removendo arquivos de teste...');
    for (const arquivo of testes) {
        try {
            if (fs.existsSync(arquivo)) {
                fs.unlinkSync(arquivo);
                console.log(`✅ ${arquivo} removido`);
            }
        } catch (e) {
            console.log(`⚠️ Erro ao remover ${arquivo}: ${e.message}`);
        }
    }

    // 7.5 Remover arquivos duplicados
    const routesDuplicados = [
        'server/routes/admin.js',
        'server/routes/agendamentos.js',
        'server/routes/auth.js',
        'server/routes/chatbot.js',
        'server/routes/clientes.js',
        'server/routes/financeiro.js',
        'server/routes/horarios.js',
        'server/routes/planos.js',
        'server/routes/profissionais.js',
        'server/routes/servicos.js',
        'server/routes/whatsapp.js'
    ];

    console.log('\n🗑️ Removendo arquivos de rota duplicados...');
    for (const arquivo of routesDuplicados) {
        try {
            if (fs.existsSync(arquivo) && arquivo.includes('.js')) {
                fs.unlinkSync(arquivo);
                console.log(`✅ ${arquivo} removido`);
            }
        } catch (e) {
            console.log(`⚠️ Erro ao remover ${arquivo}: ${e.message}`);
        }
    }

    // 7.6 Remover arquivos .txt
    const txtFiles = [
        'server/routes/temp_plano.txt',
        'scripts/fix-render-postgres.js.txt'
    ];

    console.log('\n🗑️ Removendo arquivos .txt...');
    for (const arquivo of txtFiles) {
        try {
            if (fs.existsSync(arquivo)) {
                fs.unlinkSync(arquivo);
                console.log(`✅ ${arquivo} removido`);
            }
        } catch (e) {
            console.log(`⚠️ Erro ao remover ${arquivo}: ${e.message}`);
        }
    }

    // ============================================
    // 8. RELATÓRIO FINAL
    // ============================================
    console.log('\n📊 ===== RELATÓRIO FINAL =====');
    console.log('✅ Limpeza concluída!');
    console.log('');
    console.log(`📁 Backup salvo em: ${backupDir}`);
    console.log('');
    console.log('📋 Para restaurar o backup:');
    console.log(`  cp -r ${backupDir}/* .`);
    console.log('');
    console.log('🚀 Próximos passos:');
    console.log('  1. Reinicie o servidor: npm start');
    console.log('  2. Teste o WhatsApp novamente');
    console.log('');
    console.log('🔧 ===== FIM =====');
}