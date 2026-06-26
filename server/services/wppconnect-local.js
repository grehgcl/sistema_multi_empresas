// server/services/wppconnect-local.js
const wppconnect = require('@wppconnect-team/wppconnect');

let client = null;
let isConnected = false;
let connectionPromise = null;

async function getClient() {
    // Se já está conectado, retorna
    if (client && isConnected) {
        return client;
    }

    // Se está conectando, aguarda
    if (connectionPromise) {
        return connectionPromise;
    }

    // Inicia conexão
    connectionPromise = new Promise(async (resolve, reject) => {
        try {
            client = await wppconnect.create({
                session: 'seeagende',
                catchQR: (base64Qr, asciiQR) => {
                    console.log('📱 Escaneie o QR Code para conectar:');
                    console.log(asciiQR);
                },
                statusFind: (statusSession) => {
                    console.log('📱 Status:', statusSession);
                    if (statusSession === 'isLogged') {
                        isConnected = true;
                    }
                },
                autoClose: false
            });

            isConnected = true;
            console.log('✅ WPPConnect conectado!');
            connectionPromise = null;
            resolve(client);
        } catch (error) {
            console.error('❌ Erro ao conectar WPPConnect:', error);
            connectionPromise = null;
            reject(error);
        }
    });

    return connectionPromise;
}

async function sendMessage(telefone, mensagem) {
    console.log(`📱 [WPPCONNECT] Enviando para ${telefone}`);

    try {
        const client = await getClient();

        if (!client) {
            throw new Error('Cliente não conectado');
        }

        // 🔥 Testar diferentes formatos de número
        const numeroLimpo = telefone.replace(/\D/g, '');

        // Tentar com @c.us
        const numero1 = numeroLimpo + '@c.us';
        console.log(`📱 [WPPCONNECT] Tentando formato 1: ${numero1}`);

        try {
            const result = await client.sendText(numero1, mensagem);
            console.log(`✅ [WPPCONNECT] Mensagem enviada para ${telefone}`);
            return { success: true, result };
        } catch (error1) {
            console.log(`❌ [WPPCONNECT] Formato 1 falhou:`, error1.message);

            // Tentar sem @c.us
            console.log(`📱 [WPPCONNECT] Tentando formato 2: ${numeroLimpo}`);
            try {
                const result = await client.sendText(numeroLimpo, mensagem);
                console.log(`✅ [WPPCONNECT] Mensagem enviada para ${telefone}`);
                return { success: true, result };
            } catch (error2) {
                console.log(`❌ [WPPCONNECT] Formato 2 falhou:`, error2.message);

                // Tentar com 55 + número
                if (!numeroLimpo.startsWith('55')) {
                    const numero3 = '55' + numeroLimpo;
                    console.log(`📱 [WPPCONNECT] Tentando formato 3: ${numero3}`);
                    try {
                        const result = await client.sendText(numero3, mensagem);
                        console.log(`✅ [WPPCONNECT] Mensagem enviada para ${telefone}`);
                        return { success: true, result };
                    } catch (error3) {
                        console.log(`❌ [WPPCONNECT] Formato 3 falhou:`, error3.message);
                        throw new Error(`Todos os formatos falharam: ${error1.message}`);
                    }
                }
                throw error2;
            }
        }
    } catch (error) {
        console.error('❌ [WPPCONNECT] Erro ao enviar:', error);
        return { success: false, error: error.message };
    }
}
module.exports = { getClient, sendMessage };