// server/services/wppconnect-local.js
const wppconnect = require('@wppconnect-team/wppconnect');

let client = null;
let isConnecting = false;
let isReady = false;

async function iniciarWPPConnect() {
    if (client && isReady) {
        console.log('[WPPCONNECT-LOCAL] ✅ Cliente já conectado e pronto');
        return client;
    }

    if (isConnecting) {
        console.log('[WPPCONNECT-LOCAL] ⏳ Aguardando conexão...');
        while (isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return client;
    }

    isConnecting = true;
    console.log('[WPPCONNECT-LOCAL] 🔄 Conectando ao WhatsApp...');

    try {
        client = await wppconnect.create({
            session: 'seeagende',
            autoClose: false,
            logQR: true,
            browserArgs: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            puppeteerOptions: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        console.log('[WPPCONNECT-LOCAL] ⏳ Aguardando sincronização...');

        // Aguarda até 30 segundos para conectar
        let attempts = 0;
        while (attempts < 30) {
            try {
                if (client.isConnected) {
                    console.log('[WPPCONNECT-LOCAL] ✅ Cliente conectado!');
                    break;
                }
            } catch (e) { }
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }

        isReady = true;
        isConnecting = false;
        console.log('[WPPCONNECT-LOCAL] ✅ WhatsApp conectado e pronto!');
        return client;
    } catch (error) {
        console.error('[WPPCONNECT-LOCAL] ❌ Erro:', error.message);
        isConnecting = false;
        throw error;
    }
}

async function enviarMensagem(phone, message) {
    try {
        const client = await iniciarWPPConnect();

        if (!client || !client.isConnected) {
            return { success: false, error: 'Cliente não conectado' };
        }

        // Formata o telefone
        let cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('55')) {
            cleanPhone = `55${cleanPhone}`;
        }

        console.log(`[WPPCONNECT-LOCAL] 📤 Enviando para ${cleanPhone}...`);
        console.log(`[WPPCONNECT-LOCAL] 📝 Mensagem: ${message.substring(0, 50)}...`);

        // TENTATIVA 1: sendText com número puro (funciona na maioria das vezes)
        try {
            console.log('[WPPCONNECT-LOCAL] 🔄 Tentando sendText...');
            const result = await client.sendText(cleanPhone, message);
            console.log(`[WPPCONNECT-LOCAL] ✅ Mensagem enviada com sucesso via sendText!`);
            return { success: true, data: result };
        } catch (sendTextError) {
            console.log(`[WPPCONNECT-LOCAL] ⚠️ sendText falhou: ${sendTextError.message}`);
        }

        // TENTATIVA 2: sendMessage com chat ID (@c.us)
        try {
            console.log('[WPPCONNECT-LOCAL] 🔄 Tentando sendMessage com chat ID...');
            const chatId = `${cleanPhone}@c.us`;
            const result = await client.sendMessage(chatId, message);
            console.log(`[WPPCONNECT-LOCAL] ✅ Mensagem enviada com sucesso via sendMessage!`);
            return { success: true, data: result };
        } catch (sendMessageError) {
            console.log(`[WPPCONNECT-LOCAL] ⚠️ sendMessage falhou: ${sendMessageError.message}`);
        }

        // TENTATIVA 3: Criar chat primeiro e depois enviar
        try {
            console.log('[WPPCONNECT-LOCAL] 🔄 Tentando criar chat e enviar...');
            const chat = await client.createChat(cleanPhone);
            if (chat) {
                const result = await client.sendMessage(chat.id._serialized, message);
                console.log(`[WPPCONNECT-LOCAL] ✅ Mensagem enviada com sucesso via chat!`);
                return { success: true, data: result };
            }
        } catch (chatError) {
            console.log(`[WPPCONNECT-LOCAL] ⚠️ Chat falhou: ${chatError.message}`);
        }

        // TENTATIVA 4: sendText com o número no formato internacional (com 55)
        try {
            console.log('[WPPCONNECT-LOCAL] 🔄 Tentando sendText com formato internacional...');
            const result = await client.sendText(cleanPhone, message);
            console.log(`[WPPCONNECT-LOCAL] ✅ Mensagem enviada com sucesso!`);
            return { success: true, data: result };
        } catch (finalError) {
            console.log(`[WPPCONNECT-LOCAL] ❌ Todas as tentativas falharam: ${finalError.message}`);
            return { success: false, error: finalError.message };
        }

    } catch (error) {
        console.error('[WPPCONNECT-LOCAL] ❌ Erro ao enviar:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    enviarMensagem,
    iniciarWPPConnect,
    getClient: iniciarWPPConnect
};