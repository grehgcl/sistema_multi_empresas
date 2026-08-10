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
            const url = `ws://163.176.218.131:8080/ws/instance/connect/${this.instanceName}?apikey=${this.apiKey}`;

            console.log(`ðŸ”Œ Conectando WebSocket: ${url}`);

            this.ws = new WebSocket(url);

            this.ws.on('open', () => {
                console.log(`âœ… WebSocket conectado para ${this.instanceName}`);
                resolve();
            });

            this.ws.on('message', (data) => {
                try {
                    const msg = JSON.parse(data);
                    console.log(`ðŸ“¥ Mensagem WebSocket:`, msg);

                    if (msg.qrcode) {
                        this.qrCode = msg.qrcode;
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

                    if (msg.status === 'disconnected') {
                        this.isConnected = false;
                        if (this.onDisconnected) {
                            this.onDisconnected();
                        }
                    }
                } catch (e) {
                    console.error('âŒ Erro ao processar mensagem:', e);
                }
            });

            this.ws.on('error', (error) => {
                console.error('âŒ WebSocket error:', error);
                reject(error);
            });

            this.ws.on('close', () => {
                console.log('ðŸ”Œ WebSocket fechado');
            });

            // Timeout apÃ³s 30 segundos
            setTimeout(() => {
                if (!this.qrCode) {
                    reject(new Error('Timeout - QR Code nÃ£o recebido'));
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