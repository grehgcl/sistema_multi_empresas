// ============================================
// ROTAS DE CLIENTES - SEE&AGENDE
// COMPATÍVEL SQLite e PostgreSQL
// ULTIMA ATUALIZACAO: 19/08/2026
// ============================================

const express = require('express');
const router = express.Router();
const { getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// ============================================
// FUNÇÕES DE COMPATIBILIDADE
// ============================================

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
    return isProduction ? `to_char(${field}, 'YYYY-MM-DD')` : `date(${field})`;
}

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================
// GET /api/clientes - LISTAR CLIENTES
// ============================================

router.get('/', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const { search, grupo, letra, limit } = req.query;

        console.log(`📊 Buscando clientes para empresa ${empresaId}`);

        const db = getEmpresaDb(empresaId);

        if (!db) {
            console.error('❌ Banco da empresa não encontrado');
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        let sql = "SELECT id, nome, telefone, email, grupos, bloqueado_chatbot, dias_bloqueio, created_at FROM clientes WHERE empresa_id = ?";
        let params = [empresaId];

        if (search) {
            const searchTerm = `%${search}%`;
            sql += " AND (nome LIKE ? OR telefone LIKE ? OR email LIKE ?)";
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (grupo && grupo !== '') {
            sql += " AND (grupos IS NOT NULL AND grupos != '[]' AND grupos LIKE ?)";
            params.push(`%${grupo}%`);
        }

        if (letra && letra !== '') {
            sql += " AND nome LIKE ?";
            params.push(`${letra}%`);
        }

        sql += " ORDER BY nome";

        if (limit && !isNaN(parseInt(limit))) {
            sql += " LIMIT ?";
            params.push(parseInt(limit));
        }

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
    } catch (error) {
        console.error('❌ Erro na rota /api/clientes:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro interno do servidor'
        });
    }
});

// ============================================
// GET /api/clientes/grupos - LISTAR GRUPOS
// ============================================

router.get('/grupos', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        console.log(`📊 Buscando grupos para empresa ${empresaId}`);

        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        const sql = "SELECT id, nome, grupos FROM clientes WHERE empresa_id = ? ORDER BY nome";

        db.all(sql, [empresaId], (err, rows) => {
            if (err) {
                console.error('❌ Erro ao buscar clientes:', err.message);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            const gruposSet = new Set();
            const clientesProcessados = [];

            for (const row of rows) {
                let grupos = [];
                try {
                    if (row.grupos) {
                        grupos = typeof row.grupos === 'string' ? JSON.parse(row.grupos) : row.grupos;
                    }
                } catch (e) {
                    grupos = [];
                }

                for (const g of grupos) {
                    if (g && g.trim() !== '') {
                        gruposSet.add(g);
                    }
                }

                clientesProcessados.push({
                    id: row.id,
                    nome: row.nome,
                    grupos: grupos
                });
            }

            const gruposList = Array.from(gruposSet).sort();

            console.log(`📊 ${rows.length} clientes, ${gruposList.length} grupos`);

            res.json({
                success: true,
                data: {
                    clientes: clientesProcessados,
                    grupos: gruposList
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar grupos:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/clientes/:id - BUSCAR UM CLIENTE
// ============================================

router.get('/:id', auth, (req, res) => {
    try {
        const { id } = req.params;
        const empresaId = req.usuario.empresa_id;

        console.log(`🔍 Buscando cliente ID: ${id}`);

        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        const sql = "SELECT id, nome, telefone, email, grupos, bloqueado_chatbot, dias_bloqueio, created_at FROM clientes WHERE id = ? AND empresa_id = ?";

        db.get(sql, [id, empresaId], (err, cliente) => {
            if (err) {
                console.error("❌ Erro ao buscar cliente:", err);
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
                data: { ...cliente, grupos }
            });
        });
    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ============================================
// GET /api/clientes/:id/grupos - BUSCAR GRUPOS DO CLIENTE
// ============================================

router.get('/:id/grupos', auth, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = "SELECT grupos FROM clientes WHERE id = ? AND empresa_id = ?";

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

// ============================================
// POST /api/clientes - CRIAR CLIENTE
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

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const gruposJson = grupos && grupos.length > 0 ? JSON.stringify(grupos) : '[]';

    const sql = "INSERT INTO clientes (nome, telefone, email, grupos, empresa_id) VALUES (?, ?, ?, ?, ?)";

    db.run(sql, [nome, telefone || '', email || '', gruposJson, empresaId], function(err) {
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
// PUT /api/clientes/:id - ATUALIZAR CLIENTE
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

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const gruposJson = grupos && grupos.length > 0 ? JSON.stringify(grupos) : '[]';

    const sql = "UPDATE clientes SET nome = ?, telefone = ?, email = ?, grupos = ?, bloqueado_chatbot = ? WHERE id = ? AND empresa_id = ?";

    db.run(sql, [nome, telefone || '', email || '', gruposJson, bloqueado_chatbot ? 1 : 0, id, empresaId], function(err) {
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

        // Buscar cliente atualizado
        const sqlSelect = "SELECT id, nome, telefone, email, grupos, bloqueado_chatbot, dias_bloqueio, created_at FROM clientes WHERE id = ? AND empresa_id = ?";

        db.get(sqlSelect, [id, empresaId], (err, clienteAtualizado) => {
            if (err) {
                console.error('❌ Erro ao buscar cliente atualizado:', err);
                return res.json({
                    success: true,
                    message: 'Cliente atualizado com sucesso!'
                });
            }

            let gruposRetorno = [];
            if (clienteAtualizado && clienteAtualizado.grupos) {
                try {
                    gruposRetorno = typeof clienteAtualizado.grupos === 'string' ? JSON.parse(clienteAtualizado.grupos) : clienteAtualizado.grupos;
                } catch (e) {
                    gruposRetorno = [];
                }
            }

            res.json({
                success: true,
                message: 'Cliente atualizado com sucesso!',
                data: { ...clienteAtualizado, grupos: gruposRetorno }
            });
        });
    });
});

// ============================================
// DELETE /api/clientes/:id - EXCLUIR CLIENTE
// ============================================

router.delete('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    console.log(`🗑️ Excluindo cliente ${id}`);

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    // Verificar se o cliente existe
    const sqlCheck = "SELECT id FROM clientes WHERE id = ? AND empresa_id = ?";

    db.get(sqlCheck, [id, empresaId], (err, row) => {
        if (err) {
            console.error("❌ Erro ao verificar cliente:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Cliente não encontrado'
            });
        }

        const sqlDelete = "DELETE FROM clientes WHERE id = ? AND empresa_id = ?";

        db.run(sqlDelete, [id, empresaId], function(err) {
            if (err) {
                console.error("❌ Erro ao excluir cliente:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                message: 'Cliente excluído com sucesso!'
            });
        });
    });
});

// ============================================
// PUT /api/clientes/:id/bloquear-chatbot - BLOQUEAR/DESBLOQUEAR
// ============================================

router.put('/:id/bloquear-chatbot', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { bloqueado } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log(`🔒 ${bloqueado ? 'Bloqueando' : 'Desbloqueando'} cliente ${id} no chatbot`);

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = "UPDATE clientes SET bloqueado_chatbot = ? WHERE id = ? AND empresa_id = ?";

    db.run(sql, [bloqueado ? 1 : 0, id, empresaId], function(err) {
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
// PUT /api/clientes/:id/grupos - ATUALIZAR GRUPOS
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

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const gruposJson = JSON.stringify(grupos);

    const sql = "UPDATE clientes SET grupos = ? WHERE id = ? AND empresa_id = ?";

    db.run(sql, [gruposJson, id, empresaId], function(err) {
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

        const sqlSelect = "SELECT id, nome, telefone, email, grupos FROM clientes WHERE id = ? AND empresa_id = ?";

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
// POST /api/clientes/bulk - IMPORTAR LOTE DE CLIENTES
// ============================================

router.post('/bulk', auth, verificarDono, async (req, res) => {
    try {
        const { clientes } = req.body;
        const empresaId = req.usuario.empresa_id;

        if (!clientes || !Array.isArray(clientes) || clientes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Lista de clientes vazia ou inválida'
            });
        }

        console.log(`📝 Importando ${clientes.length} clientes para empresa ${empresaId}`);

        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        let importados = 0;
        let erros = 0;
        const errosLista = [];

        for (const cliente of clientes) {
            const nome = cliente.nome?.trim();
            const telefone = cliente.telefone?.trim() || '';
            const email = cliente.email?.trim() || '';
            const grupos = cliente.grupos || [];

            if (!nome) {
                erros++;
                errosLista.push({ nome: nome || 'Sem nome', erro: 'Nome é obrigatório' });
                continue;
            }

            try {
                const gruposJson = JSON.stringify(grupos);
                const sql = "INSERT INTO clientes (nome, telefone, email, grupos, empresa_id) VALUES (?, ?, ?, ?, ?)";

                await new Promise((resolve, reject) => {
                    db.run(sql, [nome, telefone, email, gruposJson, empresaId], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });

                importados++;
            } catch (err) {
                erros++;
                errosLista.push({ nome: nome, erro: err.message });
            }
        }

        console.log(`✅ ${importados} clientes importados, ${erros} erros`);

        res.json({
            success: true,
            data: {
                importados: importados,
                erros: erros,
                total: clientes.length,
                detalhes_erros: errosLista
            },
            message: `${importados} clientes importados com sucesso!`
        });

    } catch (error) {
        console.error('❌ Erro ao importar clientes em lote:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erro ao importar clientes'
        });
    }
});

// ============================================
// GET /api/clientes/stats - ESTATÍSTICAS RÁPIDAS
// ============================================

router.get('/stats', auth, (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;
        const db = getEmpresaDb(empresaId);

        if (!db) {
            return res.status(500).json({
                success: false,
                message: 'Erro ao conectar ao banco da empresa'
            });
        }

        const sql = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN telefone IS NOT NULL AND telefone != '' THEN 1 ELSE 0 END) as com_whatsapp,
                SUM(CASE WHEN bloqueado_chatbot = 1 THEN 1 ELSE 0 END) as bloqueados,
                COUNT(DISTINCT CASE WHEN grupos IS NOT NULL AND grupos != '[]' THEN id END) as com_grupos
            FROM clientes 
            WHERE empresa_id = ?
        `;

        db.get(sql, [empresaId], (err, stats) => {
            if (err) {
                console.error('❌ Erro ao buscar estatísticas:', err.message);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                data: {
                    total: stats?.total || 0,
                    com_whatsapp: stats?.com_whatsapp || 0,
                    bloqueados: stats?.bloqueados || 0,
                    com_grupos: stats?.com_grupos || 0
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;