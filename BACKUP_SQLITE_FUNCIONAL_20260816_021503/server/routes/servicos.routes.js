// ============================================
// ROTAS DE SERVICOS - CORRIGIDO
// ============================================
const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// GET /api/servicos - CORRIGIDO
// ============================================
router.get('/', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { ativo } = req.query;

        console.log(`📋 Buscando serviços para empresa ${empresaId}`);

        // 🔥 USAR O BANCO DA EMPRESA
        const empresaDb = getEmpresaDb(empresaId);

        let sql = "SELECT * FROM servicos WHERE empresa_id = ?";
        let params = [empresaId];

        if (ativo !== undefined && ativo !== '') {
            const ativoValue = ativo === 'true' || ativo === '1' ? 1 : 0;
            sql += " AND (ativo = ? OR ativo IS NULL)";
            params.push(ativoValue);
        }

        sql += " ORDER BY nome";

        console.log('📝 SQL:', sql);
        console.log('📝 Params:', params);

        empresaDb.all(sql, params, (err, servicos) => {
            if (err) {
                console.error("❌ Erro ao buscar servicos:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            console.log(`📋 ${servicos.length} serviços encontrados para empresa ${empresaId}`);
            res.json({
                success: true,
                data: servicos || []
            });
        });
    } catch (error) {
        console.error('❌ Erro na rota /api/servicos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// ============================================
// GET /api/servicos/todos - CORRIGIDO
// ============================================
router.get('/todos', auth, verificarDono, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;

        console.log(`📋 Buscando TODOS os serviços para empresa ${empresaId}`);

        // 🔥 USAR O BANCO DA EMPRESA
        const empresaDb = getEmpresaDb(empresaId);

        const sql = "SELECT * FROM servicos WHERE empresa_id = ? AND ativo = 1 ORDER BY nome";

        empresaDb.all(sql, [empresaId], (err, servicos) => {
            if (err) {
                console.error("Erro ao buscar servicos:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            console.log(`📋 ${servicos.length} serviços ativos encontrados`);
            res.json({
                success: true,
                data: servicos || []
            });
        });
    } catch (error) {
        console.error('❌ Erro na rota /api/servicos/todos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// ============================================
// POST /api/servicos - CORRIGIDO
// ============================================
router.post('/', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { nome, descricao, valor, duracao, ativo } = req.body;

        console.log(`📝 Criando serviço: ${nome} para empresa ${empresaId}`);

        if (!nome) {
            return res.status(400).json({
                success: false,
                message: 'Nome é obrigatório'
            });
        }

        // 🔥 USAR O BANCO DA EMPRESA
        const empresaDb = getEmpresaDb(empresaId);

        const ativoValue = ativo === true || ativo === 1 || ativo === 'true' || ativo === '1' ? 1 : 1;
        const sql = `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`;

        empresaDb.run(sql, [nome, descricao || '', parseFloat(valor) || 0, parseInt(duracao) || 30, ativoValue, empresaId], function (err) {
            if (err) {
                console.error('❌ Erro ao criar serviço:', err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            console.log(`✅ Serviço criado com ID: ${this.lastID}`);
            res.json({
                success: true,
                message: 'Serviço criado com sucesso!',
                data: { id: this.lastID }
            });
        });
    } catch (error) {
        console.error('❌ Erro na rota POST /api/servicos:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// ============================================
// PUT /api/servicos/:id - CORRIGIDO
// ============================================
router.put('/:id', auth, verificarDono, (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, valor, duracao, ativo } = req.body;
        const empresaId = req.usuario.empresa_id;

        console.log(`📝 Atualizando serviço ${id} da empresa ${empresaId}`);

        if (!nome || !valor) {
            return res.status(400).json({
                success: false,
                message: 'Nome e valor são obrigatórios'
            });
        }

        // 🔥 USAR O BANCO DA EMPRESA
        const empresaDb = getEmpresaDb(empresaId);

        const sql = "UPDATE servicos SET nome = ?, descricao = ?, valor = ?, duracao = ?, ativo = ? WHERE id = ? AND empresa_id = ?";

        empresaDb.run(sql, [nome, descricao || '', parseFloat(valor), duracao || 30, ativo === false ? 0 : 1, id, empresaId], function (err) {
            if (err) {
                console.error("Erro ao atualizar servico:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Serviço não encontrado'
                });
            }

            console.log(`✅ Serviço ${id} atualizado com sucesso`);
            res.json({
                success: true,
                message: 'Serviço atualizado com sucesso!'
            });
        });
    } catch (error) {
        console.error('❌ Erro na rota PUT /api/servicos/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// ============================================
// DELETE /api/servicos/:id - CORRIGIDO
// ============================================
router.delete('/:id', auth, verificarDono, (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;

        console.log(`🗑️ Deletando serviço ${id} da empresa ${empresaId}`);

        // 🔥 USAR O BANCO DA EMPRESA
        const empresaDb = getEmpresaDb(empresaId);

        const sql = "DELETE FROM servicos WHERE id = ? AND empresa_id = ?";

        empresaDb.run(sql, [id, empresaId], function (err) {
            if (err) {
                console.error("Erro ao deletar servico:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Serviço não encontrado'
                });
            }

            console.log(`✅ Serviço ${id} deletado com sucesso`);
            res.json({
                success: true,
                message: 'Serviço deletado com sucesso!'
            });
        });
    } catch (error) {
        console.error('❌ Erro na rota DELETE /api/servicos/:id:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

module.exports = router;