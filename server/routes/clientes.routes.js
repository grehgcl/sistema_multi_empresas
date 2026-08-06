// server/routes/clientes.routes.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// server/routes/clientes.routes.js

// ============================================
// GET /api/clientes
// ============================================
router.get('/', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { search, grupo, letra } = req.query;

    console.log(`📊 Buscando clientes para empresa ${empresaId}`);

    // 🔥 CORREÇÃO: Remover vírgula extra antes de ORDER BY
    let sql = isProduction
        ? "SELECT * FROM clientes WHERE empresa_id = $1"
        : "SELECT * FROM clientes WHERE empresa_id = ?";
    let params = [empresaId];
    let counter = 2;

    if (search) {
        const searchTerm = `%${search}%`;
        sql += isProduction
            ? ` AND (nome LIKE $${counter} OR telefone LIKE $${counter} OR email LIKE $${counter})`
            : " AND (nome LIKE ? OR telefone LIKE ? OR email LIKE ?)";
        params.push(searchTerm, searchTerm, searchTerm);
        counter += 3;
    }

    if (grupo && grupo !== '') {
        sql += isProduction
            ? ` AND (grupos IS NOT NULL AND grupos != '[]' AND json_extract(grupos, '$') LIKE $${counter})`
            : " AND (grupos IS NOT NULL AND grupos != '[]' AND grupos LIKE ?)";
        const grupoSearch = `%${grupo}%`;
        params.push(grupoSearch);
        counter++;
    }

    if (letra && letra !== '') {
        sql += isProduction
            ? ` AND nome LIKE $${counter}`
            : " AND nome LIKE ?";
        params.push(`${letra}%`);
        counter++;
    }

    // 🔥 CORREÇÃO: Garantir que ORDER BY está correto
    sql += isProduction ? " ORDER BY nome" : " ORDER BY nome";

    console.log('📝 SQL:', sql);
    console.log('📝 Params:', params);

    db.all(sql, params, (err, clientes) => {
        if (err) {
            console.error("❌ Erro ao buscar clientes:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        // Processar grupos
        const clientesComGrupos = clientes.map(c => {
            let grupos = [];
            try {
                if (c.grupos) {
                    grupos = typeof c.grupos === 'string' ? JSON.parse(c.grupos) : c.grupos;
                }
            } catch (e) {
                grupos = [];
            }
            return { ...c, grupos };
        });

        console.log(`✅ ${clientesComGrupos.length} clientes encontrados`);
        res.json({
            success: true,
            data: clientesComGrupos || []
        });
    });
});

// ============================================
// POST /api/clientes
// ============================================
router.post('/', auth, (req, res) => {
    const { nome, telefone, email, grupos } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log(`📝 Criando cliente: ${nome} para empresa ${empresaId}`);

    if (!nome) {
        return res.status(400).json({
            success: false,
            message: 'Nome é obrigatório'
        });
    }

    const gruposJson = grupos && grupos.length > 0 ? JSON.stringify(grupos) : '[]';

    const sql = isProduction
        ? "INSERT INTO clientes (nome, telefone, email, grupos, empresa_id) VALUES ($1, $2, $3, $4, $5)"
        : "INSERT INTO clientes (nome, telefone, email, grupos, empresa_id) VALUES (?, ?, ?, ?, ?)";

    db.run(sql, [nome, telefone || '', email || '', gruposJson, empresaId], function (err) {
        if (err) {
            console.error("❌ Erro ao criar cliente:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        res.json({
            success: true,
            data: { id: this.lastID },
            message: 'Cliente criado com sucesso!'
        });
    });
});

// ============================================
// PUT /api/clientes/:id
// ============================================
router.put('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email, grupos, bloqueado_chatbot } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log(`📝 Atualizando cliente ${id}`);

    if (!nome) {
        return res.status(400).json({
            success: false,
            message: 'Nome é obrigatório'
        });
    }

    const gruposJson = grupos && grupos.length > 0 ? JSON.stringify(grupos) : '[]';

    const sql = isProduction
        ? "UPDATE clientes SET nome = $1, telefone = $2, email = $3, grupos = $4, bloqueado_chatbot = $5 WHERE id = $6 AND empresa_id = $7"
        : "UPDATE clientes SET nome = ?, telefone = ?, email = ?, grupos = ?, bloqueado_chatbot = ? WHERE id = ? AND empresa_id = ?";

    db.run(sql, [nome, telefone || '', email || '', gruposJson, bloqueado_chatbot ? 1 : 0, id, empresaId], function (err) {
        if (err) {
            console.error("❌ Erro ao atualizar cliente:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Cliente atualizado com sucesso!'
        });
    });
});

// ============================================
// DELETE /api/clientes/:id
// ============================================
router.delete('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    console.log(`🗑️ Deletando cliente ${id}`);

    const sql = isProduction
        ? "DELETE FROM clientes WHERE id = $1 AND empresa_id = $2"
        : "DELETE FROM clientes WHERE id = ? AND empresa_id = ?";

    db.run(sql, [id, empresaId], function (err) {
        if (err) {
            console.error("❌ Erro ao deletar cliente:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Cliente deletado com sucesso!'
        });
    });
});

// ============================================
// PUT /api/clientes/:id/bloquear-chatbot
// ============================================
router.put('/:id/bloquear-chatbot', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { bloqueado } = req.body;
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "UPDATE clientes SET bloqueado_chatbot = $1 WHERE id = $2 AND empresa_id = $3"
        : "UPDATE clientes SET bloqueado_chatbot = ? WHERE id = ? AND empresa_id = ?";

    db.run(sql, [bloqueado ? 1 : 0, id, empresaId], function (err) {
        if (err) {
            console.error("❌ Erro ao atualizar bloqueio:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        res.json({
            success: true,
            message: bloqueado ? 'Cliente bloqueado no chatbot!' : 'Cliente desbloqueado no chatbot!'
        });
    });
});

// ============================================
// PUT /api/clientes/:id/grupos
// ============================================
router.put('/:id/grupos', auth, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { grupos } = req.body;

    console.log(`📝 Atualizando grupos do cliente ${id}:`, grupos);

    if (!grupos || !Array.isArray(grupos)) {
        return res.status(400).json({
            success: false,
            message: 'Grupos deve ser um array'
        });
    }

    const gruposJson = JSON.stringify(grupos);

    const sql = isProduction
        ? `UPDATE clientes SET grupos = $1 WHERE id = $2 AND empresa_id = $3`
        : `UPDATE clientes SET grupos = ? WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [gruposJson, id, empresaId], function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar grupos:', err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        // Buscar cliente atualizado
        const sqlSelect = isProduction
            ? `SELECT id, nome, telefone, email, grupos FROM clientes WHERE id = $1 AND empresa_id = $2`
            : `SELECT id, nome, telefone, email, grupos FROM clientes WHERE id = ? AND empresa_id = ?`;

        db.get(sqlSelect, [id, empresaId], (err, cliente) => {
            if (err) {
                console.error('❌ Erro ao buscar cliente:', err);
                return res.json({
                    success: true,
                    message: 'Grupos atualizados com sucesso!'
                });
            }

            let gruposRetorno = [];
            if (cliente && cliente.grupos) {
                try {
                    gruposRetorno = typeof cliente.grupos === 'string' ? JSON.parse(cliente.grupos) : cliente.grupos;
                } catch (e) {
                    gruposRetorno = [];
                }
            }

            res.json({
                success: true,
                message: 'Grupos atualizados com sucesso!',
                data: {
                    ...cliente,
                    grupos: gruposRetorno
                }
            });
        });
    });
});

// ============================================
// GET /api/clientes/grupos
// ============================================
router.get('/grupos', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? `SELECT id, grupos FROM clientes WHERE empresa_id = $1`
        : `SELECT id, grupos FROM clientes WHERE empresa_id = ?`;

    db.all(sql, [empresaId], (err, clientes) => {
        if (err) {
            console.error('❌ Erro ao buscar grupos:', err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        const gruposMap = {};
        clientes.forEach(c => {
            if (c.grupos) {
                try {
                    const grupos = typeof c.grupos === 'string' ? JSON.parse(c.grupos) : c.grupos;
                    if (Array.isArray(grupos) && grupos.length > 0) {
                        gruposMap[c.id] = grupos;
                    }
                } catch (e) { }
            }
        });

        res.json({
            success: true,
            data: gruposMap
        });
    });
});

// ============================================
// GET /api/clientes/:id/grupos
// ============================================
router.get('/:id/grupos', auth, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const sql = isProduction
        ? "SELECT grupos FROM clientes WHERE id = $1 AND empresa_id = $2"
        : "SELECT grupos FROM clientes WHERE id = ? AND empresa_id = ?";

    db.get(sql, [id, empresaId], (err, cliente) => {
        if (err) {
            console.error("❌ Erro ao buscar grupos:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!cliente) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        let grupos = [];
        try {
            if (cliente.grupos) {
                grupos = typeof cliente.grupos === 'string' ? JSON.parse(cliente.grupos) : cliente.grupos;
            }
        } catch (e) {
            grupos = [];
        }

        res.json({
            success: true,
            data: grupos
        });
    });
});

module.exports = router;