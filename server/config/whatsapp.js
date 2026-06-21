// server/config/whatsapp.js
require('dotenv').config();

const config = {
    // WATI
    wati: {
        apiUrl: process.env.WATI_API_URL || 'https://live-mt-server.wati.io',
        apiKey: process.env.WATI_API_KEY || '',
        accountId: process.env.WATI_ACCOUNT_ID || '',
    },
    // Evolution API
    evolution: {
        apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
        apiKey: process.env.EVOLUTION_API_KEY || '',
        instance: process.env.EVOLUTION_INSTANCE || 'seeagende',
    },
    // WPPConnect
    wppconnect: {
        apiUrl: process.env.WPPCONNECT_API_URL || 'http://localhost:3000',
        apiKey: process.env.WPPCONNECT_API_KEY || 'minha_chave_wpp_2024',
    },
    // Configurações gerais
    geral: {
        provider: process.env.WHATSAPP_PROVIDER || 'wati',
        enabled: process.env.WHATSAPP_ENABLED === 'true',
        from: process.env.WHATSAPP_FROM || '',
        templateNamespace: process.env.WHATSAPP_TEMPLATE_NAMESPACE || '',
    }
};

console.log('[CONFIG] 📱 WhatsApp:', {
    provider: config.geral.provider,
    enabled: config.geral.enabled
});

module.exports = config;