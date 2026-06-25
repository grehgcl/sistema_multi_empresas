// ============================================
// MIDDLEWARES - COMPLETO COM LIMITE DE AGENDAMENTOS
// ============================================

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/constants');
const { db } = require('../config/database');

// ============================================
// 1. AUTENTICAÇÃO
// ============================================

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

// ============================================
// 2. VERIFICAR SUPER ADMIN
// ============================================

function verificarSuperAdmin(req, res, next) {
    if (req.usuario.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Super Admin.' });
    }
    next();
}

// ============================================
// 3. VERIFICAR DONO
// ============================================

function verificarDono(req, res, next) {
    if (req.usuario.role !== 'dono') {
        return res.status(403).json({ success: false, message: 'Acesso negado. Apenas Dono.' });
    }
    next();
}

// ============================================
// 4. VERIFICAR LIMITE DE PROFISSIONAIS
// ============================================

function verificarLimiteProfissionais(req, res, next) {
    const empresaId = req.usuario.empresa_id;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    console.log(`🔍 Verificando limite de profissionais para empresa ${empresaId}`);

    // 🔥 CORRIGIDO: Usar $1 e $2 (dois placeholders diferentes)
    const sql = isProduction
        ? `SELECT plano, limite_profissionais, 
            (SELECT COUNT(*) FROM profissionais WHERE empresa_id = $1 AND ativo = 1) as total_profs 
            FROM empresas WHERE id = $2`
        : `SELECT plano, limite_profissionais, 
            (SELECT COUNT(*) FROM profissionais WHERE empresa_id = ? AND ativo = 1) as total_profs 
            FROM empresas WHERE id = ?`;

    // 🔥 CORRIGIDO: Passar o mesmo valor para os dois placeholders
    db.get(sql, [empresaId, empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao verificar limite:', err);
            return res.status(500).json({ success: false, message: 'Erro interno' });
        }

        if (!empresa) {
            return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        }

        console.log(`📊 Profissionais: ${empresa.total_profs}/${empresa.limite_profissionais}`);

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
// ============================================
// 5. VERIFICAR ACESSO A AGENDAMENTOS (TRIAL/ASSINATURA)
// ============================================

function verificarAcessoAgendamentos(req, res, next) {
    const empresaId = req.usuario.empresa_id;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    console.log('🔍 Verificando acesso para empresa:', empresaId);

    const sql = isProduction
        ? `SELECT plano, trial_expira, assinatura_ativa, assinatura_valida_ate 
           FROM empresas WHERE id = $1`
        : `SELECT plano, trial_expira, assinatura_ativa, assinatura_valida_ate 
           FROM empresas WHERE id = ?`;

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao verificar acesso:', err.message);
            return res.status(500).json({ success: false, message: 'Erro interno ao verificar acesso' });
        }

        if (!empresa) {
            console.log('❌ Empresa não encontrada:', empresaId);
            return res.status(404).json({ success: false, message: 'Empresa não encontrada' });
        }

        console.log('📝 Dados da empresa:', empresa);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let acessoLiberado = false;
        let mensagem = '';

        if (empresa.plano === 'trial' && empresa.trial_expira) {
            const trialExpira = new Date(empresa.trial_expira);
            if (hoje <= trialExpira) {
                acessoLiberado = true;
                console.log('✅ Trial ativo até:', trialExpira);
            } else {
                mensagem = 'Seu período de teste expirou. Faça upgrade para continuar agendando.';
                console.log('❌ Trial expirado em:', trialExpira);
            }
        } else if (empresa.plano !== 'trial') {
            if (empresa.assinatura_ativa === 1) {
                if (empresa.assinatura_valida_ate) {
                    const validaAte = new Date(empresa.assinatura_valida_ate);
                    if (hoje <= validaAte) {
                        acessoLiberado = true;
                        console.log('✅ Assinatura ativa até:', validaAte);
                    } else {
                        mensagem = 'Sua assinatura expirou. Renove para continuar usando o sistema.';
                        console.log('❌ Assinatura expirada em:', validaAte);
                    }
                } else {
                    acessoLiberado = true;
                    console.log('✅ Assinatura ativa sem data de validade');
                }
            } else {
                mensagem = 'Sua assinatura está inativa. Entre em contato com o suporte.';
                console.log('❌ Assinatura inativa');
            }
        }

        if (!acessoLiberado) {
            console.log('❌ Acesso bloqueado:', mensagem);
            return res.status(403).json({
                success: false,
                message: mensagem || 'Acesso bloqueado. Verifique seu plano.',
                requires_upgrade: true
            });
        }

        console.log('✅ Acesso liberado!');
        next();
    });
}

// ============================================
// 6. VERIFICAR LIMITE DE AGENDAMENTOS (100/MÊS PARA STARTER)
// ============================================

function verificarLimiteAgendamentos(req, res, next) {
    const empresaId = req.usuario.empresa_id;
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const LIMITE_MAXIMO = 100;

    console.log(`🔍 Verificando limite de agendamentos para empresa ${empresaId}`);

    const sql = isProduction
        ? `SELECT plano, agendamentos_mes, mes_referencia FROM empresas WHERE id = $1`
        : `SELECT plano, agendamentos_mes, mes_referencia FROM empresas WHERE id = ?`;

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar empresa:', err);
            return res.status(500).json({
                success: false,
                message: 'Erro ao verificar limite de agendamentos'
            });
        }

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        // Verificar se é Starter ou Trial
        const planoLower = (empresa.plano || '').toLowerCase();
        const temLimite = (planoLower === 'starter' || planoLower === 'trial');

        if (temLimite) {
            const mesAtual = new Date().toISOString().slice(0, 7);

            // Se mudou de mês, resetar contador
            if (empresa.mes_referencia !== mesAtual) {
                const sqlUpdate = isProduction
                    ? `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = $1 WHERE id = $2`
                    : `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = ? WHERE id = ?`;

                db.run(sqlUpdate, [mesAtual, empresaId], (err) => {
                    if (err) {
                        console.error('❌ Erro ao resetar contador:', err);
                    } else {
                        console.log(`✅ Contador resetado para empresa ${empresaId} (novo mês: ${mesAtual})`);
                        empresa.agendamentos_mes = 0;
                    }
                });
            }

            const agendamentosAtuais = empresa.agendamentos_mes || 0;

            if (agendamentosAtuais >= LIMITE_MAXIMO) {
                console.log(`❌ Limite de agendamentos atingido: ${agendamentosAtuais}/${LIMITE_MAXIMO}`);
                return res.status(403).json({
                    success: false,
                    message: `Limite de ${LIMITE_MAXIMO} agendamentos/mês do plano Starter foi atingido. Faça upgrade para o plano Pro para agendamentos ilimitados.`,
                    needs_upgrade: true,
                    limit_reached: true,
                    current: agendamentosAtuais,
                    max: LIMITE_MAXIMO
                });
            }

            console.log(`✅ Agendamentos deste mês: ${agendamentosAtuais}/${LIMITE_MAXIMO}`);
        } else {
            console.log(`✅ Plano ${empresa.plano} - agendamentos ilimitados`);
        }

        next();
    });
}

// ============================================
// 7. INCREMENTAR CONTADOR DE AGENDAMENTOS
// ============================================

function incrementarContadorAgendamentos(empresaId, callback) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
    const mesAtual = new Date().toISOString().slice(0, 7);

    console.log(`📝 Incrementando contador para empresa ${empresaId} - Mês: ${mesAtual}`);

    // Primeiro verifica se o mês mudou
    const sqlCheck = isProduction
        ? `SELECT mes_referencia FROM empresas WHERE id = $1`
        : `SELECT mes_referencia FROM empresas WHERE id = ?`;

    db.get(sqlCheck, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao verificar mês:', err);
            if (callback) callback(err);
            return;
        }

        // Se mudou de mês, resetar antes de incrementar
        if (empresa && empresa.mes_referencia !== mesAtual) {
            const sqlReset = isProduction
                ? `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = $1 WHERE id = $2`
                : `UPDATE empresas SET agendamentos_mes = 0, mes_referencia = ? WHERE id = ?`;

            db.run(sqlReset, [mesAtual, empresaId], (err) => {
                if (err) {
                    console.error('❌ Erro ao resetar contador:', err);
                    if (callback) callback(err);
                    return;
                }
                console.log(`✅ Contador resetado para empresa ${empresaId}`);
                incrementar();
            });
        } else {
            incrementar();
        }

        function incrementar() {
            const sqlUpdate = isProduction
                ? `UPDATE empresas SET agendamentos_mes = COALESCE(agendamentos_mes, 0) + 1, mes_referencia = $1 WHERE id = $2`
                : `UPDATE empresas SET agendamentos_mes = COALESCE(agendamentos_mes, 0) + 1, mes_referencia = ? WHERE id = ?`;

            db.run(sqlUpdate, [mesAtual, empresaId], function (err) {
                if (err) {
                    console.error('❌ Erro ao incrementar contador:', err);
                    if (callback) callback(err);
                    return;
                }
                console.log(`✅ Contador incrementado para empresa ${empresaId}`);
                if (callback) callback(null, this.changes);
            });
        }
    });
}

// ============================================
// EXPORTAR TODAS AS FUNÇÕES
// ============================================

module.exports = {
    auth,
    verificarSuperAdmin,
    verificarDono,
    verificarLimiteProfissionais,
    verificarAcessoAgendamentos,
    verificarLimiteAgendamentos,      // 🔥 NOVO
    incrementarContadorAgendamentos   // 🔥 NOVO
};