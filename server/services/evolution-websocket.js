// server/services/evolution-websocket.js
const WebSocket = require('ws');

class EvolutionWebSocket {
    constructor(instanceName, apiKey) {
        this.instanceName = instanceName;
        this.apiKey = apiKey;
        this.ws = null;
        this.qrCode = null;
        this.isConnected = false;
        this.onQRCode = null;
        this.onConnected = null;
        this.onDisconnected = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            // ✅ Monta a URL a partir do .env (sem IP fixo no código)
            const apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
            const wsUrl = apiUrl.replace(/^http/, 'ws');
            const url = `${wsUrl}/ws/instance/connect/${this.instanceName}?apikey=${this.apiKey}`;

            console.log(`🔌 Conectando WebSocket: ${url}`);

            this.ws = new WebSocket(url);

            this.ws.on('open', () => {
                console.log(`✅ WebSocket conectado para ${this.instanceName}`);
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data);
                    console.log(`📥 Mensagem WebSocket:`, msg);

                    // Suporta os formatos de QR que a Evolution pode enviar
                    const qr = msg.qrcode || msg.qrCode || (msg.data && msg.data.qrcode);
                    if (qr) {
                        this.qrCode = typeof qr === 'object' ? (qr.base64 || qr.base64Full) : qr;
                        if (this.onQRCode) {
                            this.onQRCode(this.qrCode);
                        }
                    }

                    if (msg.status === 'connected' || msg.state === 'open') {
                        this.isConnected = true;
                        if (this.onConnected) {
                            this.onConnected();
                        }
                    }

                    if (msg.status === 'disconnected' || msg.state === 'close') {
                        this.isConnected = false;
                        if (this.onDisconnected) {
                            this.onDisconnected();
                        }
                    }
                } catch (e) {
                    console.error('❌ Erro ao processar mensagem:', e);
                }
            });

            this.ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('🔌 WebSocket fechado');
            });

            // Timeout após 30 segundos
            setTimeout(() => {
                if (!this.qrCode) {
                    reject(new Error('Timeout - QR Code não recebido'));
                }
            }, 30000);
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    getQRCode() {
        return this.qrCode;
    }
}

module.exports = EvolutionWebSocket;