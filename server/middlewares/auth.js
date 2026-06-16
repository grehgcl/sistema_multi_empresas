// ============================================
// MIDDLEWARES - NÃO MEXER!
// ============================================

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/constants');
const { db } = require('../config/database');

function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token inválido' });
    }
}

function verificarSuperAdmin(req, res, next) {
    if (req.usuario.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Super Admin.' });
    }
    next();
}

function verificarDono(req, res, next) {
    if (req.usuario.role !== 'dono') {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Dono.' });
    }
    next();
}

function verificarLimiteProfissionais(req, res, next) {
    const empresaId = req.usuario.empresa_id;

    db.get(`SELECT plano, limite_profissionais, 
            (SELECT COUNT(*) FROM profissionais WHERE empresa_id = ? AND ativo = 1) as total_profs 
            FROM empresas WHERE id = ?`,
        [empresaId, empresaId], (err, empresa) => {
            if (err) return res.status(500).json({ success: false, message: 'Erro interno' });

            if (!empresa) {
                return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
            }

            if (empresa.total_profs >= empresa.limite_profissionais) {
                return res.status(403).json({
                    success: false,
                    message: `Seu plano (${empresa.plano}) permite apenas ${empresa.limite_profissionais} profissional(is). Faça upgrade para adicionar mais.`,
                    needs_upgrade: true
                });
            }
            next();
        });
}

function verificarAcessoAgendamentos(req, res, next) {
    const empresaId = req.usuario.empresa_id;

    db.get(`SELECT plano, trial_expira, assinatura_ativa, assinatura_valida_ate 
            FROM empresas WHERE id = ?`, [empresaId], (err, empresa) => {
        if (err) return res.status(500).json({ success: false, message: 'Erro interno' });

        if (!empresa) {
            return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let acessoLiberado = false;
        let mensagem = '';

        if (empresa.plano === 'trial' && empresa.trial_expira) {
            const trialExpira = new Date(empresa.trial_expira);
            if (hoje <= trialExpira) {
                acessoLiberado = true;
            } else {
                mensagem = 'Seu período de teste expirou. Faça upgrade para continuar agendando.';
            }
        } else if (empresa.plano !== 'trial') {
            if (empresa.assinatura_ativa === 1) {
                if (empresa.assinatura_valida_ate) {
                    const validaAte = new Date(empresa.assinatura_valida_ate);
                    if (hoje <= validaAte) {
                        acessoLiberado = true;
                    } else {
                        mensagem = 'Sua assinatura expirou. Renove para continuar usando o sistema.';
                    }
                } else {
                    acessoLiberado = true;
                }
            } else {
                mensagem = 'Sua assinatura está inativa. Entre em contato com o suporte.';
            }
        }

        if (!acessoLiberado) {
            return res.status(403).json({
                success: false,
                message: mensagem || 'Acesso bloqueado. Verifique seu plano.',
                requires_upgrade: true
            });
        }

        next();
    });
}

module.exports = {
    auth,
    verificarSuperAdmin,
    verificarDono,
    verificarLimiteProfissionais,
    verificarAcessoAgendamentos
};