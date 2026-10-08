// ============================================
// MIDDLEWARE: BLOQUEIO POR ASSINATURA
// Bloqueia acesso quando assinatura tá suspensa/vencida/trial-expirado
// ============================================

const assinaturas = require('../services/assinaturas');

// Rotas que NUNCA são bloqueadas (mesmo com assinatura suspensa)
const ROTAS_LIVRES = [
    '/api/auth',
    '/api/pagamento',
    '/api/planos',
    '/api/empresa/plano',
    '/api/empresa/dados',
    '/api/empresa/assinatura',      // 🆕 tela de bloqueio
    '/health',
    '/manifest.json',
    '/sw.js',
    '/icons'
];

/**
 * Verifica se a rota atual tá na lista de liberadas
 */
function rotaLivre(req) {
    const url = req.originalUrl || req.url || '';
    return ROTAS_LIVRES.some(prefixo => url.startsWith(prefixo));
}

/**
 * Middleware principal
 * Pressupõe que já passou pelo `auth` (tem req.usuario)
 */
async function verificarBloqueio(req, res, next) {
    try {
        // Se for rota livre, deixa passar
        if (rotaLivre(req)) {
            return next();
        }

        // Pega empresa_id do usuário autenticado
        const empresaId = req.usuario?.empresa_id || req.empresaId;
        if (!empresaId) {
            // Sem empresa (super admin, por ex.) → deixa passar
            return next();
        }

        // Super admin sempre passa
        if (req.usuario?.role === 'super_admin' || req.usuario?.role === 'superadmin') {
            return next();
        }

        // Verifica acesso
        const acesso = await assinaturas.verificarAcesso(empresaId);

        if (!acesso.bloqueado) {
            // Deixa passar e anexa a assinatura no req (útil pros handlers)
            req.assinatura = acesso.assinatura;
            return next();
        }

        // ⛔ BLOQUEADO — retorna 403 com info útil
        const mensagens = {
            'suspensa':       'Sua assinatura está suspensa por falta de pagamento.',
            'vencida':        'Sua assinatura venceu. Regularize para continuar usando.',
            'trial-expirado': 'Seu período de teste expirou. Assine um plano para continuar.'
        };

        const mensagem = mensagens[acesso.motivo] || 'Acesso bloqueado.';

        console.log(`⛔ Bloqueio: empresa ${empresaId} — motivo: ${acesso.motivo} — rota: ${req.originalUrl}`);

        return res.status(403).json({
            success: false,
            bloqueado: true,
            motivo: acesso.motivo,
            message: mensagem,
            assinatura: {
                status: acesso.assinatura?.status,
                data_vencimento: acesso.assinatura?.data_vencimento,
                meses_devendo: acesso.assinatura?.meses_devendo,
                valor_mensal: acesso.assinatura?.valor_mensal
            }
        });

    } catch (err) {
        console.error('❌ Erro no middleware de bloqueio:', err);
        // Em caso de erro, deixa passar (fail-open — evita travar todo mundo)
        return next();
    }
}

module.exports = verificarBloqueio;