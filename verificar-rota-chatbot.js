// verificar-rota-chatbot.js
const express = require('express');
const app = express();

try {
    const chatbotRoutes = require('./server/routes/chatbot.routes');
    console.log('✅ chatbot.routes.js carregado com sucesso!');
    console.log('📋 Rotas disponíveis:');
    
    // Listar as rotas do chatbot
    const routes = chatbotRoutes.stack || [];
    routes.forEach((layer, index) => {
        if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            const path = layer.route.path;
            console.log(`   ${methods} /api/chatbot${path}`);
        }
    });
    
    console.log('\n✅ Se você viu as rotas acima, está tudo certo!');
    console.log('⚠️ Se não viu nada, o arquivo pode estar vazio ou com erro.');
} catch (error) {
    console.error('❌ Erro ao carregar chatbot.routes.js:', error.message);
}