// ============================================
// SCRIPT PARA EVITAR QUE O RENDER DURMA
// ============================================

const http = require('http');
const https = require('https');

// Configuração
const PORT = process.env.PORT || 3000;
const URL = process.env.RENDER_URL || process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Função para fazer ping no servidor
function keepAlive() {
    const timestamp = new Date().toISOString();
    console.log(`🔄 Keep Alive: Pingando ${URL}... (${timestamp})`);

    const client = URL.startsWith('https') ? https : http;

    client.get(URL, (res) => {
        console.log(`✅ Keep Alive: ${res.statusCode} - ${timestamp}`);
    }).on('error', (err) => {
        console.error(`❌ Keep Alive: ${err.message} - ${timestamp}`);
    });
}

// Executar a cada 10 minutos (600000 ms)
const INTERVALO = 10 * 60 * 1000;

console.log(`🟢 Keep Alive iniciado! Pingando a cada ${INTERVALO / 60000} minutos.`);
console.log(`📍 URL: ${URL}`);
console.log(`⏰ Próximo ping: ${new Date(Date.now() + INTERVALO).toLocaleTimeString()}`);

// Primeiro ping imediato
keepAlive();

// Depois a cada intervalo
setInterval(keepAlive, INTERVALO);

// Exportar para uso no server.js
module.exports = { keepAlive };