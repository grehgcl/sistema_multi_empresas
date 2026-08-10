// server/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');

// ============================================
// WEBHOOK - STATUS DE ENTREGA
// ============================================
router.post('/webhook/wati', async (req, res) => {
    try {
        const { event, data } = req.body;

        console.log('[WHATSAPP WEBHOOK] Evento recebido:', event, data);

        // Processa conforme necessÃ¡rio
        if (event === 'message_sent') {
            // Mensagem enviada com sucesso
        } else if (event === 'message_failed') {
            // Falha no envio
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[WHATSAPP WEBHOOK] Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TESTE - ENVIA MENSAGEM DE TESTE
// ============================================
router.post('/teste', async (req, res) => {
    const { telefone, mensagem } = req.body;

    if (!telefone) {
        return res.status(400).json({ success: false, error: 'Telefone Ã© obrigatÃ³rio' });
    }

    const result = await whatsappService.send(
        telefone,
        mensagem || 'ðŸ§ª *Mensagem de Teste*\n\nO SEE&AGENDE estÃ¡ funcionando! ðŸŽ‰'
    );

    res.json(result);
});

// ============================================
// STATUS
// ============================================
router.get('/status', (req, res) => {
    res.json({
        enabled: whatsappService.enabled,
        provider: whatsappService.provider,
    });
});

module.exports = router;