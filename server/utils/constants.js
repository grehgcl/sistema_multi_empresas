// ============================================
// CONSTANTES GLOBAIS - NÃO MEXER!
// ============================================

const PLANOS = {
    starter: { limite: 1, valor: 24.90, dias_acesso: 30, nome: 'Starter' },
    pro: { limite: 5, valor: 49.90, dias_acesso: 30, nome: 'Pro' },
    business: { limite: 12, valor: 99.90, dias_acesso: 30, nome: 'Business' },
    enterprise: { limite: 999999, valor: 199.90, dias_acesso: 30, nome: 'Enterprise' }
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