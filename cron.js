// cron.js - Job para manter o servidor ativo (alternativa)
const https = require('https');
const http = require('http');

const URL = process.env.RENDER_EXTERNAL_URL || 'https://seeagende.onrender.com';
const PORT = process.env.PORT || 3000;

// Função para pingar o servidor
function pingServer() {
    const timestamp = new Date().toLocaleTimeString('pt-BR');

    // Tentar via HTTPS
    try {
        const options = {
            hostname: URL.replace('https://', '').replace('http://', ''),
            port: 443,
            path: '/',
            method: 'HEAD',
            timeout: 5000,
            headers: {
                'User-Agent': 'Render-Cron/1.0'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`✅ [${timestamp}] Cron ping OK - Status: ${res.statusCode}`);
        });

        req.on('error', (err) => {
            // Fallback para local
            try {
                http.get(`http://localhost:${PORT}`, (localRes) => {
                    console.log(`✅ [${timestamp}] Cron local OK - Status: ${localRes.statusCode}`);
                }).on('error', (localErr) => {
                    console.log(`❌ [${timestamp}] Cron falhou: ${localErr.message}`);
                });
            } catch (e) {
                console.log(`❌ [${timestamp}] Cron erro: ${e.message}`);
            }
        });

        req.end();
    } catch (error) {
        console.log(`❌ [${timestamp}] Cron erro: ${error.message}`);
    }
}

// Executar a cada 4 minutos
setInterval(pingServer, 4 * 60 * 1000);

// Primeira execução imediata
setTimeout(pingServer, 5000);

console.log('🔄 Cron job iniciado para manter o servidor ativo!');
console.log(`📍 URL: ${URL}`);
console.log(`⏱️  Intervalo: 4 minutos`);