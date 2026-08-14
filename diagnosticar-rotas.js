// diagnosticar-rotas.js
const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DE ROTAS\n');

// 1. Verificar se o arquivo existe
const chatbotPath = path.join(__dirname, 'server', 'routes', 'chatbot.routes.js');
console.log(`📁 Arquivo chatbot.routes.js: ${fs.existsSync(chatbotPath) ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);

// 2. Verificar se o index.js importa o chatbot
const indexPath = path.join(__dirname, 'server', 'routes', 'index.js');
if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf8');
    const temChatbot = content.includes('chatbot');
    console.log(`📁 index.js importa chatbot? ${temChatbot ? '✅ SIM' : '❌ NÃO'}`);
    if (!temChatbot) {
        console.log('   ⚠️ ADICIONE: const chatbotRoutes = require("./chatbot.routes");');
        console.log('   ⚠️ ADICIONE: router.use("/chatbot", chatbotRoutes);');
    }
}

// 3. Verificar se o server.js importa o chatbot
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    const content = fs.readFileSync(serverPath, 'utf8');
    const temChatbot = content.includes('chatbot');
    console.log(`📁 server.js importa chatbot? ${temChatbot ? '✅ SIM' : '❌ NÃO'}`);
}

console.log('\n📋 ROTAS DISPONÍVEIS NO CHATBOT:');
if (fs.existsSync(chatbotPath)) {
    const content = fs.readFileSync(chatbotPath, 'utf8');
    const rotas = content.match(/router\.(get|post|put|delete)\(['"]([^'"]+)['"]/g) || [];
    rotas.forEach(r => {
        console.log(`   ${r.replace('router.', '').replace(/\(['"]/, ' ').replace(/['"]\)/, '')}`);
    });
}