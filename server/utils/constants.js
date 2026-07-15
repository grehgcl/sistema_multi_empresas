// ============================================
// CONSTANTES GLOBAIS - NÃO MEXER!
// ============================================

const PLANOS = {
    //'teste': { nome: 'Teste R$ 1,00', limite: 1, valor: 1.00 },  // ← ADICIONE ESTA LINHA
    'starter': { nome: 'Starter', limite: 1, valor: 29.90 },
    'pro': { nome: 'Pro', limite: 5, valor: 59.90 },
    'business': { nome: 'Business', limite: 15, valor: 119.90 },
    'enterprise': { nome: 'Enterprise', limite: 9999, valor: 249.90 }
};

const PLANOS_NOMES = {
    'trial': 'Trial',
    'starter': 'Starter',
    'pro': 'Pro',
    'business': 'Business',
    'enterprise': 'Enterprise'
};

const JWT_SECRET = 'secret_key';

module.exports = { PLANOS, PLANOS_NOMES, JWT_SECRET };