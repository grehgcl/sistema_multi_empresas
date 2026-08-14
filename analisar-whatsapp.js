// ============================================
// SCRIPT: analisar-whatsapp.js
// Executar: node analisar-whatsapp.js
// ============================================

const fs = require('fs');
const path = require('path');

console.log('🔍 ===== ANÁLISE COMPLETA DO FLUXO WHATSAPP =====\n');

// ============================================
// 1. LER TODOS OS ARQUIVOS RELEVANTES
// ============================================

const arquivos = {
    // Backend - Rotas
    'server/routes/whatsapp.routes.js': 'Rota WhatsApp',
    'server/routes/admin.routes.js': 'Rota Admin (Super Admin)',

    // Backend - Serviços
    'server/services/evolution-instances.js': 'Serviço Evolution API',
    'server/services/whatsapp.js': 'Serviço WhatsApp',

    // Backend - Config
    'server/config/database.js': 'Config Banco',
    'server/middlewares/auth.js': 'Middleware Auth',

    // Frontend - Páginas
    'public/js/pages/whatsapp-config.js': 'Frontend WhatsApp (Dono)',
    'public/js/pages/empresas.js': 'Frontend Empresas (Super Admin)',
    'public/js/pages/dashboard.js': 'Frontend Dashboard',

    // Frontend - UI
    'public/js/ui.js': 'UI Global',
    'public/index.html': 'Index Principal'
};

const analise = {};

// ============================================
// 2. FUNÇÃO PARA LER E ANALISAR CADA ARQUIVO
// ============================================

function analisarArquivo(caminho, descricao) {
    console.log(`\n📄 ===== ${descricao} =====`);
    console.log(`📁 ${caminho}`);

    try {
        if (!fs.existsSync(caminho)) {
            console.log(`❌ Arquivo não encontrado!`);
            return null;
        }

        const conteudo = fs.readFileSync(caminho, 'utf8');

        // Buscar padrões importantes
        const padroes = {
            // Rotas
            'rota_whatsapp_info': conteudo.match(/router\.(get|post|put|delete)\s*\(\s*['"]\/info['"]/i),
            'rota_whatsapp_qrcode': conteudo.match(/router\.(get|post|put|delete)\s*\(\s*['"]\/qrcode['"]/i),
            'rota_whatsapp_criar': conteudo.match(/router\.(get|post|put|delete)\s*\(\s*['"]\/criar-instancia['"]/i),
            'rota_whatsapp_status': conteudo.match(/router\.(get|post|put|delete)\s*\(\s*['"]\/status['"]/i),
            'rota_whatsapp_disconnect': conteudo.match(/router\.(get|post|put|delete)\s*\(\s*['"]\/disconnect['"]/i),

            // Funções importantes
            'funcao_criarInstancia': conteudo.match(/criarInstancia\s*\(/i),
            'funcao_deletarInstancia': conteudo.match(/deletarInstancia\s*\(/i),
            'funcao_buscarQrCode': conteudo.match(/buscarQrCode\s*\(/i),
            'funcao_getQrCode': conteudo.match(/getQrCode\s*\(/i),
            'funcao_verificarStatus': conteudo.match(/verificarStatus\s*\(/i),
            'funcao_toggleWhatsApp': conteudo.match(/toggleWhatsAppProprio\s*\(/i),

            // Verificações de role
            'verifica_super_admin': conteudo.match(/super_admin|superadmin|isSuperAdmin/i),
            'verifica_dono': conteudo.match(/dono|isDono|role\s*===\s*['"]dono['"]/i),
            'verifica_profissional': conteudo.match(/profissional|isProfissional/i),

            // Evolution API
            'evolution_api': conteudo.match(/evolution|EVOLUTION_API/i),
            'api_url': conteudo.match(/EVOLUTION_API_URL|apiUrl/i),
            'api_key': conteudo.match(/EVOLUTION_API_KEY|apikey/i),

            // Banco
            'update_empresa': conteudo.match(/UPDATE\s+empresas\s+SET.*whatsapp/i),
            'select_empresa': conteudo.match(/SELECT.*whatsapp.*FROM\s+empresas/i),

            // Frontend
            'carregarWhatsappConfig': conteudo.match(/carregarWhatsappConfig|carregarConfigWhatsApp/i),
            'gerarMenu': conteudo.match(/gerarMenu|carregarMenu/i),
            'btnwhatsapp': conteudo.match(/btnwhatsapp|#whatsapp/i),
        };

        // Contar linhas
        const linhas = conteudo.split('\n').length;
        const tamanho = conteudo.length;

        // Verificar se tem comentários
        const comentarios = (conteudo.match(/\/\//g) || []).length;
        const comentariosBloco = (conteudo.match(/\/\*/g) || []).length;

        console.log(`📊 Linhas: ${linhas} | Tamanho: ${tamanho} bytes | Comentários: ${comentarios + comentariosBloco}`);

        // Mostrar padrões encontrados
        console.log('\n🔍 Padrões encontrados:');
        let encontrados = 0;
        for (const [key, value] of Object.entries(padroes)) {
            if (value) {
                console.log(`  ✅ ${key}: ${value[0]}`);
                encontrados++;
            }
        }
        if (encontrados === 0) {
            console.log('  ⚠️ Nenhum padrão específico encontrado');
        }

        return {
            caminho,
            descricao,
            linhas,
            tamanho,
            padroes,
            conteudo: conteudo.substring(0, 500) + '...' // Primeiros 500 caracteres
        };

    } catch (error) {
        console.log(`❌ Erro ao ler arquivo: ${error.message}`);
        return null;
    }
}

// ============================================
// 3. ANALISAR CADA ARQUIVO
// ============================================

console.log('\n📋 ANALISANDO ARQUIVOS...\n');

for (const [caminho, descricao] of Object.entries(arquivos)) {
    const resultado = analisarArquivo(caminho, descricao);
    if (resultado) {
        analise[caminho] = resultado;
    }
}

// ============================================
// 4. GERAR RELATÓRIO COMPLETO
// ============================================

console.log('\n\n📊 ===== RELATÓRIO COMPLETO =====\n');

// Identificar o fluxo atual
console.log('🔄 FLUXO ATUAL DO WHATSAPP:\n');

const fluxo = {
    'Criação de Instância': {
        'Quem pode criar': 'Super Admin',
        'Onde': 'PUT /api/admin/empresas/:id/whatsapp-proprio',
        'Arquivo': 'server/routes/admin.routes.js',
        'Status': analise['server/routes/admin.routes.js']?.padroes?.funcao_toggleWhatsApp ? '✅ Implementado' : '❌ Não encontrado'
    },
    'QR Code': {
        'Quem pode ver': 'Dono (se habilitado)',
        'Onde': 'GET /api/whatsapp/qrcode',
        'Arquivo': 'server/routes/whatsapp.routes.js',
        'Status': analise['server/routes/whatsapp.routes.js']?.padroes?.rota_whatsapp_qrcode ? '✅ Implementado' : '❌ Não encontrado'
    },
    'Status': {
        'Quem pode ver': 'Todos',
        'Onde': 'GET /api/whatsapp/status',
        'Arquivo': 'server/routes/whatsapp.routes.js',
        'Status': analise['server/routes/whatsapp.routes.js']?.padroes?.rota_whatsapp_status ? '✅ Implementado' : '❌ Não encontrado'
    },
    'Info': {
        'Quem pode ver': 'Todos',
        'Onde': 'GET /api/whatsapp/info',
        'Arquivo': 'server/routes/whatsapp.routes.js',
        'Status': analise['server/routes/whatsapp.routes.js']?.padroes?.rota_whatsapp_info ? '✅ Implementado' : '❌ Não encontrado'
    },
    'Desconectar': {
        'Quem pode fazer': 'Dono',
        'Onde': 'POST /api/whatsapp/disconnect',
        'Arquivo': 'server/routes/whatsapp.routes.js',
        'Status': analise['server/routes/whatsapp.routes.js']?.padroes?.rota_whatsapp_disconnect ? '✅ Implementado' : '❌ Não encontrado'
    }
};

console.table(fluxo);

// ============================================
// 5. VERIFICAR CONSISTÊNCIA
// ============================================

console.log('\n🔍 VERIFICANDO CONSISTÊNCIA:\n');

const problemas = [];

// Verificar se Super Admin pode criar
if (!analise['server/routes/admin.routes.js']?.padroes?.funcao_toggleWhatsApp) {
    problemas.push('❌ Super Admin não tem função para criar instância');
}

// Verificar se Dono pode ver QR Code
if (!analise['server/routes/whatsapp.routes.js']?.padroes?.rota_whatsapp_qrcode) {
    problemas.push('❌ Rota /qrcode não encontrada para Dono');
}

// Verificar se tem verificação de role
if (!analise['server/routes/admin.routes.js']?.padroes?.verifica_super_admin) {
    problemas.push('⚠️ Rota admin não verifica se é Super Admin');
}

// Verificar se o frontend do Dono existe
if (!analise['public/js/pages/whatsapp-config.js']?.padroes?.carregarWhatsappConfig) {
    problemas.push('❌ Frontend WhatsApp do Dono não encontrado');
}

// Verificar se o menu tem WhatsApp
if (!analise['public/index.html']?.padroes?.btnwhatsapp) {
    problemas.push('⚠️ Botão WhatsApp não encontrado no menu');
}

if (problemas.length === 0) {
    console.log('✅ Todos os componentes estão presentes!');
} else {
    console.log('⚠️ Problemas encontrados:');
    problemas.forEach(p => console.log(`  ${p}`));
}

// ============================================
// 6. SUGESTÕES DE CORREÇÃO
// ============================================

console.log('\n💡 SUGESTÕES DE CORREÇÃO:\n');

// Analisar cada arquivo e sugerir correções
for (const [caminho, data] of Object.entries(analise)) {
    if (!data) continue;

    const sugestoes = [];
    const conteudo = data.conteudo || '';

    // Verificar rota /qrcode
    if (caminho === 'server/routes/whatsapp.routes.js') {
        if (data.padroes?.rota_whatsapp_qrcode) {
            const hasCreation = conteudo.includes('criarInstancia') || conteudo.includes('create');
            if (hasCreation) {
                sugestoes.push('⚠️ Rota /qrcode está criando instância - deve apenas buscar QR Code');
            }
        }
    }

    // Verificar frontend do Dono
    if (caminho === 'public/js/pages/whatsapp-config.js') {
        if (data.padroes?.funcao_buscarQrCode) {
            const hasCreation = conteudo.includes('criarInstancia') || conteudo.includes('create');
            if (hasCreation) {
                sugestoes.push('⚠️ buscarQrCode está criando instância - deve apenas buscar QR Code');
            }
        }
    }

    if (sugestoes.length > 0) {
        console.log(`\n📁 ${caminho}:`);
        sugestoes.forEach(s => console.log(`  ${s}`));
    }
}

// ============================================
// 7. RESUMO DO FLUXO IDEAL
// ============================================

console.log('\n📋 ===== FLUXO IDEAL DO WHATSAPP =====\n');
console.log(`
1. SUPER ADMIN (Dashboard > Empresas):
   - Clica em "HABILITAR" → Chama PUT /api/admin/empresas/:id/whatsapp-proprio
   - Backend cria instância na Evolution API
   - Backend atualiza banco (whatsapp_proprio_habilitado = 1, whatsapp_instance = 'emp-X')
   - Dashboard recarrega → Botão muda para "ON"

2. SUPER ADMIN (Dashboard > Empresas):
   - Clica em "DESABILITAR" → Chama PUT /api/admin/empresas/:id/whatsapp-proprio
   - Backend deleta instância na Evolution API
   - Backend atualiza banco (whatsapp_proprio_habilitado = 0, whatsapp_instance = NULL)
   - Dashboard recarrega → Botão muda para "OFF"

3. DONO (Menu > WhatsApp):
   - Abre página → carregarConfigWhatsApp()
   - Chama GET /api/whatsapp/info para verificar status
   - Se habilitado e tem instância → Mostra QR Code
   - Se não habilitado → Mostra "Aguardando Super Admin"

4. DONO (Página WhatsApp):
   - Clica em "Gerar QR Code" → Chama GET /api/whatsapp/qrcode
   - Backend busca QR Code da Evolution API (NUNCA CRIA)
   - Frontend exibe QR Code para escaneamento

5. DONO (Página WhatsApp):
   - Clica em "Verificar Conexão" → Chama GET /api/whatsapp/status
   - Backend verifica status na Evolution API
   - Frontend atualiza status

6. DONO (Página WhatsApp):
   - Clica em "Desconectar" → Chama POST /api/whatsapp/disconnect
   - Backend desconecta na Evolution API
   - Frontend volta para tela de QR Code
`);

console.log('\n🔍 ===== FIM DA ANÁLISE =====\n');
console.log('📌 Para corrigir, execute os comandos sugeridos acima.');