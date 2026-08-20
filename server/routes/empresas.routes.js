// ============================================
// ROTAS DE EMPRESA
// ============================================
const express = require('express');
const router = express.Router();
// const { db } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');
const { db, getEmpresaDb, centralDb } = require('../config/database');


// ============================================
// COMPATIBILIDADE SQLite / PostgreSQL
// ============================================

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

function extractMonth(field) {
    return isProduction ? `EXTRACT(MONTH FROM ${field})` : `strftime('%m', ${field})`;
}

function extractYear(field) {
    return isProduction ? `EXTRACT(YEAR FROM ${field})` : `strftime('%Y', ${field})`;
}

function extractDay(field) {
    return isProduction ? `EXTRACT(DAY FROM ${field})` : `strftime('%d', ${field})`;
}

function formatDate(field) {
    return isProduction ? `${formatDate('${field}')}` : `date(${field})`;
}

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================


// ============================================
// GET /api/empresa/plano
// ============================================
router.get('/plano', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "SELECT plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate FROM empresas WHERE id = ?"
        : "SELECT plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate FROM empresas WHERE id = ?";

    db.get(sql, [empresaId], (err, empresa) => {
        if (err || !empresa) {
            return res.json({ success: false, message: 'Empresa nao encontrada' });
        }

        let diasRestantes = 0;
        let validaAte = null;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (empresa.plano === 'trial' && empresa.trial_expira) {
            const trialExpira = new Date(empresa.trial_expira);
            diasRestantes = Math.max(0, Math.ceil((trialExpira - hoje) / (1000 * 60 * 60 * 24)));
            validaAte = empresa.trial_expira;
        } else if (empresa.plano !== 'trial' && empresa.assinatura_valida_ate) {
            const validaAteDate = new Date(empresa.assinatura_valida_ate);
            diasRestantes = Math.max(0, Math.ceil((validaAteDate - hoje) / (1000 * 60 * 60 * 24)));
            validaAte = empresa.assinatura_valida_ate;
        }

        const PLANOS_NOMES = {
            trial: 'Trial',
            starter: 'Starter',
            pro: 'Pro',
            business: 'Business',
            enterprise: 'Enterprise'
        };

        res.json({
            success: true,
            data: {
                plano: empresa.plano,
                plano_nome: PLANOS_NOMES[empresa.plano] || empresa.plano,
                limite_profissionais: empresa.limite_profissionais,
                assinatura_ativa: empresa.assinatura_ativa,
                dias_restantes: diasRestantes,
                valida_ate: validaAte,
                is_trial: empresa.plano === 'trial'
            }
        });
    });
});

router.get('/dados', auth, (req, res) => {
    // 🔥 CORREÇÃO: usar req.user (NÃO req.usuario)
    const empresaId = req.user?.empresa_id;
    
    console.log(`🔍 Buscando dados da empresa: ${empresaId}`);
    console.log(`👤 Usuario: ${req.user?.email}`);

    if (!empresaId) {
        return res.status(400).json({
            success: false,
            message: 'Empresa não identificada'
        });
    }

    // Buscar dados da empresa
    const sql = isProduction
        ? 'SELECT * FROM empresas WHERE id = ?'
        : 'SELECT * FROM empresas WHERE id = ?';

    db.get(sql, [empresaId], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar dados da empresa:', err.message);
            return res.status(500).json({
                success: false,
                message: 'Erro ao buscar dados da empresa: ' + err.message
            });
        }

        if (!empresa) {
            console.log(`⚠️ Empresa ${empresaId} não encontrada`);
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        console.log(`✅ Empresa encontrada: ${empresa.nome}`);
        res.json({
            success: true,
            data: empresa
        });
    });
});
// ============================================
// GET /api/empresa/dados-completos - Buscar tudo
// ============================================
router.get('/dados-completos', auth, async (req, res) => {
    try {
        const empresaId = req.user?.empresa_id;
        
        if (!empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Empresa não identificada'
            });
        }

        // Buscar dados da empresa
        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT * FROM empresas WHERE id = ?'
                : 'SELECT * FROM empresas WHERE id = ?';
            db.get(sql, [empresaId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        // Buscar horários
        const horarios = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT * FROM horarios_funcionamento WHERE empresa_id = ?'
                : 'SELECT * FROM horarios_funcionamento WHERE empresa_id = ?';
            db.all(sql, [empresaId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Buscar serviços do banco individual
        const empresaDb = getEmpresaDb(empresaId);
        const servicos = await new Promise((resolve, reject) => {
            empresaDb.all('SELECT * FROM servicos WHERE ativo = 1', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Buscar profissionais
        const profissionais = await new Promise((resolve, reject) => {
            empresaDb.all('SELECT id, nome, comissao_percent, ativo FROM profissionais WHERE ativo = 1', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        res.json({
            success: true,
            data: {
                ...empresa,
                horarios,
                servicos,
                profissionais
            }
        });

    } catch (error) {
        console.error('❌ Erro ao buscar dados completos:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
// ============================================
// PUT /api/empresa/dados
// ============================================
router.put('/dados', auth, verificarDono, (req, res) => {
    const { nome, telefone_dono, endereco } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log("Atualizando dados da empresa:", { empresaId, nome, telefone_dono, endereco });

    if (!nome || !telefone_dono) {
        return res.status(400).json({
            success: false,
            message: 'Nome e telefone sao obrigatorios'
        });
    }

    const sql = isProduction
        ? "UPDATE empresas SET nome = ?, telefone_dono = ?, endereco = ? WHERE id = ?"
        : "UPDATE empresas SET nome = ?, telefone_dono = ?, endereco = ? WHERE id = ?";

    db.run(sql, [nome.trim(), telefone_dono.trim(), endereco ? endereco.trim() : '', empresaId], function (err) {
        if (err) {
            console.error("Erro ao atualizar empresa:", err.message);
            return res.status(500).json({
                success: false,
                message: err.message || 'Erro ao salvar dados da empresa'
            });
        }

        console.log("Empresa " + empresaId + " atualizada com sucesso!");
        res.json({
            success: true,
            message: 'Dados do estabelecimento atualizados com sucesso!'
        });
    });
});

// ============================================
// PUT /api/empresa/endereco
// ============================================
router.put('/endereco', auth, verificarDono, (req, res) => {
    const { endereco } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log("Atualizando endereco:", { empresaId, endereco });

    const sql = isProduction
        ? "UPDATE empresas SET endereco = ? WHERE id = ?"
        : "UPDATE empresas SET endereco = ? WHERE id = ?";

    db.run(sql, [endereco || '', empresaId], function (err) {
        if (err) {
            console.error("Erro ao atualizar endereco:", err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log("Endereco atualizado:", endereco);
        res.json({
            success: true,
            message: 'Endereco atualizado com sucesso!',
            data: { endereco: endereco }
        });
    });
});

// ============================================
// PUT /api/empresa/telefone-dono
// ============================================
router.put('/telefone-dono', auth, verificarDono, (req, res) => {
    const { telefone } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log("Atualizando telefone do dono:", { empresaId, telefone });

    if (!telefone) {
        return res.status(400).json({
            success: false,
            message: 'Telefone e obrigatorio'
        });
    }

    const sql = isProduction
        ? "UPDATE empresas SET telefone_dono = ? WHERE id = ?"
        : "UPDATE empresas SET telefone_dono = ? WHERE id = ?";

    db.run(sql, [telefone.trim(), empresaId], function (err) {
        if (err) {
            console.error("Erro ao atualizar telefone:", err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log("Telefone do dono atualizado:", telefone);
        res.json({
            success: true,
            message: 'Telefone do dono atualizado com sucesso!'
        });
    });
});

// ============================================
// PUT /api/empresa/bloqueio-geral
// ============================================
router.put('/bloqueio-geral', auth, verificarDono, (req, res) => {
    const { dias_bloqueio } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log("Atualizando bloqueio geral:", { empresaId, dias_bloqueio });

    if (dias_bloqueio === undefined || dias_bloqueio === null) {
        return res.status(400).json({
            success: false,
            message: 'Dias de bloqueio e obrigatorio'
        });
    }

    const sql = isProduction
        ? "UPDATE empresas SET dias_bloqueio_geral = ? WHERE id = ?"
        : "UPDATE empresas SET dias_bloqueio_geral = ? WHERE id = ?";

    db.run(sql, [dias_bloqueio, empresaId], function (err) {
        if (err) {
            console.error("Erro ao atualizar bloqueio geral:", err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log("Bloqueio geral atualizado para " + dias_bloqueio + " dias");
        res.json({
            success: true,
            message: "Bloqueio geral atualizado para " + dias_bloqueio + " dias!"
        });
    });
});
// ============================================
// PUT /api/empresa/bloqueio-geral
// ============================================
router.put('/bloqueio-geral', auth, verificarDono, (req, res) => {
    const { dias_bloqueio } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log('🔄 Atualizando bloqueio geral:', { empresaId, dias_bloqueio });

    const diasBloqueioFinal = parseInt(dias_bloqueio) || 0;

    const sql = isProduction
        ? `UPDATE empresas SET dias_bloqueio_geral = ? WHERE id = ?`
        : `UPDATE empresas SET dias_bloqueio_geral = ? WHERE id = ?`;

    db.run(sql, [diasBloqueioFinal, empresaId], function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar bloqueio geral:', err.message);
            return res.json({ success: false, message: err.message });
        }

        console.log('✅ Bloqueio geral atualizado para:', diasBloqueioFinal);
        res.json({ success: true, message: `Bloqueio geral atualizado para ${diasBloqueioFinal} dias!` });
    });
});
module.exports = router;