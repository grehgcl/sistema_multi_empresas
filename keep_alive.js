// keep_alive.js - Versão Melhorada para Render
const https = require('https');
const http = require('http');
const { exec } = require('child_process');

// Configurações
const PORT = process.env.PORT || 3000;
const INTERVALO = 4 * 60 * 1000; // 4 minutos (Render dorme após 5min sem atividade)
const URL = process.env.RENDER_EXTERNAL_URL || `https://seeagende.onrender.com`;
const URL_INTERNAL = `http://localhost:${PORT}`;

console.log('🔄 Keep Alive iniciado...');
console.log(`📍 URL Externa: ${URL}`);
console.log(`📍 URL Interna: ${URL_INTERNAL}`);
console.log(`⏱️  Intervalo: ${INTERVALO / 1000} segundos`);

// ============================================================
// FUNÇÃO PARA MANTER O SERVIDOR VIVO
// ============================================================

function pingServer() {
    const timestamp = new Date().toLocaleTimeString('pt-BR');

    // Tentar via HTTPS (externo)
    const options = {
        hostname: URL.replace('https://', '').replace('http://', ''),
        port: 443,
        path: '/api/agendamentos',
        method: 'GET',
        timeout: 5000,
        headers: {
            'User-Agent': 'Render-Keep-Alive/1.0'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`✅ [${timestamp}] Ping externo OK - Status: ${res.statusCode}`);
    });

    req.on('error', (err) => {
        console.log(`⚠️ [${timestamp}] Ping externo falhou: ${err.message}`);

        // Tentar via HTTP local como fallback
        try {
            const localReq = http.get(URL_INTERNAL, (localRes) => {
                console.log(`✅ [${timestamp}] Ping interno OK - Status: ${localRes.statusCode}`);
            });
            localReq.on('error', (localErr) => {
                console.log(`❌ [${timestamp}] Ping interno falhou: ${localErr.message}`);
            });
            localReq.end();
        } catch (e) {
            console.log(`❌ [${timestamp}] Erro ao pingar interno: ${e.message}`);
        }
    });

    req.end();
}

// ============================================================
// FUNÇÃO PARA EXECUTAR COMANDOS DE MANUTENÇÃO
// ============================================================

function runMaintenance() {
    const timestamp = new Date().toLocaleTimeString('pt-BR');

    // Verificar uso de memória (opcional)
    if (process.platform !== 'win32') {
        exec('free -m', (error, stdout) => {
            if (!error) {
                const memLines = stdout.split('\n');
                const memInfo = memLines.find(line => line.includes('Mem:'));
                if (memInfo) {
                    const parts = memInfo.split(/\s+/);
                    const total = parts[1];
                    const used = parts[2];
                    const percent = Math.round((used / total) * 100);
                    if (percent > 85) {
                        console.log(`⚠️ [${timestamp}] Uso de memória: ${percent}% (${used}MB/${total}MB)`);
                    }
                }
            }
        });
    }
}

// ============================================================
// EXECUTAR O KEEP ALIVE
// ============================================================

function keepAlive() {
    console.log('🔄 Keep Alive ativado!');

    // Primeiro ping imediato
    setTimeout(() => {
        pingServer();
        runMaintenance();
    }, 5000);

    // Pings periódicos
    setInterval(() => {
        pingServer();
        runMaintenance();
    }, INTERVALO);

    // Ping extra a cada 30 minutos para garantir
    setInterval(() => {
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        console.log(`💓 [${timestamp}] Heartbeat - Servidor ativo`);
    }, 30 * 60 * 1000);
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = { keepAlive };