// ============================================
// ROTAS DE PROFISSIONAIS - SEE&AGENDE
// ============================================

const express = require('express');
const router = express.Router();
const { getEmpresaDb } = require('../config/database');
const { auth, verificarDono } = require('../middlewares/auth');
const bcrypt = require('bcryptjs');

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
    return isProduction ? `to_char(${field}, 'YYYY-MM-DD')` : `date(${field})`;
}

function coalesceSum(field) {
    return isProduction ? `COALESCE(SUM(${field}), 0)` : `COALESCE(SUM(${field}), 0)`;
}

// ============================================
// GET /api/profissionais - LISTAR PROFISSIONAIS
// ============================================

router.get('/', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { ativo } = req.query;

    console.log(`📊 Buscando profissionais para empresa ${empresaId}`);

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    let sql = `SELECT * FROM profissionais WHERE empresa_id = ?`;
    let params = [empresaId];

    if (ativo !== undefined && ativo !== '') {
        const ativoValue = ativo === 'true' || ativo === '1' ? 1 : 0;
        sql += ` AND ativo = ?`;
        params.push(ativoValue);
    }

    sql += ` ORDER BY nome`;

    console.log('📝 SQL:', sql);
    console.log('📝 Params:', params);

    db.all(sql, params, (err, profissionais) => {
        if (err) {
            console.error("❌ Erro ao buscar profissionais:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        console.log(`✅ ${profissionais.length} profissionais encontrados`);
        res.json({
            success: true,
            data: profissionais || []
        });
    });
});

// ============================================
// GET /api/profissionais/:id - BUSCAR PROFISSIONAL
// ============================================

router.get('/:id', auth, (req, res) => {
    const empresaId = req.usuario.empresa_id;
    const { id } = req.params;

    console.log(`🔍 Buscando profissional ${id} para empresa ${empresaId}`);

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = `SELECT * FROM profissionais WHERE id = ? AND empresa_id = ?`;

    db.get(sql, [id, empresaId], (err, profissional) => {
        if (err) {
            console.error("❌ Erro ao buscar profissional:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!profissional) {
            return res.status(404).json({
                success: false,
                message: 'Profissional não encontrado'
            });
        }

        res.json({
            success: true,
            data: profissional
        });
    });
});

// ============================================
// POST /api/profissionais - CRIAR PROFISSIONAL
// ============================================

router.post('/', auth, verificarDono, (req, res) => {
    const { nome, email, senha, comissao_percent, telefone } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log(`📝 Criando profissional para empresa ${empresaId}:`, { nome, email });

    if (!nome || !email || !senha) {
        return res.status(400).json({
            success: false,
            message: 'Nome, email e senha são obrigatórios'
        });
    }

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    // Verificar se email já existe
    const checkSql = `SELECT id FROM profissionais WHERE email = ? AND empresa_id = ?`;

    db.get(checkSql, [email, empresaId], (err, existing) => {
        if (err) {
            console.error("❌ Erro ao verificar email:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Email já cadastrado para esta empresa'
            });
        }

        const salt = bcrypt.genSaltSync(10);
        const senhaHash = bcrypt.hashSync(senha, salt);

        const sql = `INSERT INTO profissionais (nome, email, senha, comissao_percent, telefone, ativo, empresa_id) 
                     VALUES (?, ?, ?, ?, ?, 1, ?)`;

        db.run(sql, [nome, email, senhaHash, comissao_percent || 30, telefone || '', empresaId], function (err) {
            if (err) {
                console.error("❌ Erro ao criar profissional:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            res.json({
                success: true,
                data: { id: this.lastID },
                message: 'Profissional criado com sucesso!'
            });
        });
    });
});

// ============================================
// PUT /api/profissionais/:id - ATUALIZAR PROFISSIONAL
// ============================================

router.put('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;
    const { nome, email, telefone, comissao_percent, ativo, senha } = req.body;

    console.log('📝 Atualizando profissional:', { id, nome, email, telefone, comissao_percent, ativo, temSenha: !!senha });

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    // Validar campos
    if (nome !== undefined && !nome) {
        return res.status(400).json({
            success: false,
            message: 'Nome é obrigatório'
        });
    }

    if (email !== undefined && !email) {
        return res.status(400).json({
            success: false,
            message: 'Email é obrigatório'
        });
    }

    // Buscar profissional atual
    const sqlSelect = `SELECT * FROM profissionais WHERE id = ? AND empresa_id = ?`;

    db.get(sqlSelect, [id, empresaId], (err, profissional) => {
        if (err) {
            console.error("❌ Erro ao buscar profissional:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!profissional) {
            return res.status(404).json({
                success: false,
                message: 'Profissional não encontrado'
            });
        }

        // Usar valores existentes se não forem enviados
        const nomeFinal = nome !== undefined ? nome : profissional.nome;
        const emailFinal = email !== undefined ? email : profissional.email;
        const telefoneFinal = telefone !== undefined ? telefone : profissional.telefone;
        const comissaoFinal = comissao_percent !== undefined ? comissao_percent : profissional.comissao_percent;
        const ativoFinal = ativo !== undefined ? ativo : profissional.ativo;

        let sql = `UPDATE profissionais 
                   SET nome = ?, email = ?, telefone = ?, comissao_percent = ?, ativo = ?`;
        let params = [nomeFinal, emailFinal, telefoneFinal || '', parseFloat(comissaoFinal) || 30, ativoFinal ? 1 : 0];

        // Se senha foi enviada, incluir no update
        if (senha && senha.length > 0) {
            const salt = bcrypt.genSaltSync(10);
            const senhaHash = bcrypt.hashSync(senha, salt);
            sql += `, senha = ?`;
            params.push(senhaHash);
        }

        sql += ` WHERE id = ? AND empresa_id = ?`;
        params.push(id, empresaId);

        console.log('📝 SQL:', sql);
        console.log('📝 Params:', params);

        db.run(sql, params, function (err) {
            if (err) {
                console.error("❌ Erro ao atualizar profissional:", err);
                return res.status(500).json({
                    success: false,
                    message: err.message
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Profissional não encontrado'
                });
            }

            // Buscar profissional atualizado
            const sqlSelectUpdated = `SELECT id, nome, email, telefone, comissao_percent, ativo, created_at 
                                      FROM profissionais WHERE id = ? AND empresa_id = ?`;

            db.get(sqlSelectUpdated, [id, empresaId], (err, profissionalAtualizado) => {
                if (err) {
                    console.error("❌ Erro ao buscar profissional atualizado:", err);
                    return res.json({
                        success: true,
                        message: 'Profissional atualizado com sucesso!'
                    });
                }

                res.json({
                    success: true,
                    message: 'Profissional atualizado com sucesso!',
                    data: profissionalAtualizado
                });
            });
        });
    });
});

// ============================================
// POST /api/profissionais/:id/reset-senha - RESETAR SENHA
// ============================================

router.post('/:id/reset-senha', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { senha } = req.body;
    const empresaId = req.usuario.empresa_id;

    console.log(`🔑 Resetando senha do profissional ${id}`);

    if (!senha || senha.length < 4) {
        return res.status(400).json({
            success: false,
            message: 'Senha deve ter pelo menos 4 caracteres'
        });
    }

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const salt = bcrypt.genSaltSync(10);
    const senhaHash = bcrypt.hashSync(senha, salt);

    const sql = `UPDATE profissionais SET senha = ? WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [senhaHash, id, empresaId], function (err) {
        if (err) {
            console.error("❌ Erro ao resetar senha:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profissional não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Senha alterada com sucesso!'
        });
    });
});

// ============================================
// DELETE /api/profissionais/:id - DELETAR PROFISSIONAL
// ============================================

router.delete('/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const empresaId = req.usuario.empresa_id;

    console.log(`🗑️ Deletando profissional ${id}`);

    const db = getEmpresaDb(empresaId);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = `DELETE FROM profissionais WHERE id = ? AND empresa_id = ?`;

    db.run(sql, [id, empresaId], function (err) {
        if (err) {
            console.error("❌ Erro ao deletar profissional:", err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Profissional não encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Profissional deletado com sucesso!'
        });
    });
});

// ============================================
// ROTAS DO PROFISSIONAL (AGENDAMENTOS E FINANCEIRO)
// ============================================

// ============================================
// GET /api/profissional/agendamentos
// ============================================

router.get('/profissional/agendamentos', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const profissional_id = req.usuario.id;
    const empresa_id = req.usuario.empresa_id;

    console.log(`📊 Buscando agendamentos do profissional ${profissional_id}`);

    const db = getEmpresaDb(empresa_id);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = `SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome
                 FROM agendamentos a
                 LEFT JOIN clientes c ON a.cliente_id = c.id
                 LEFT JOIN servicos s ON a.servico_id = s.id
                 WHERE a.profissional_id = ?
                 ORDER BY a.data DESC`;

    db.all(sql, [profissional_id], (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos do profissional:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: agendamentos });
    });
});

// ============================================
// GET /api/profissional/financeiro
// ============================================

router.get('/profissional/financeiro', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({
            success: false,
            message: 'Acesso negado. Apenas profissionais podem acessar.'
        });
    }

    const profissional_id = req.usuario.id;
    const empresa_id = req.usuario.empresa_id;

    console.log(`📊 Buscando financeiro do profissional ${profissional_id} (${req.usuario.nome})`);

    const db = getEmpresaDb(empresa_id);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sql = `SELECT 
                    a.id,
                    a.data,
                    date(a.data) as data_formatada,
                    a.valor_total,
                    a.servico,
                    a.comissao,
                    a.cliente_id,
                    a.status,
                    c.nome as cliente_nome,
                    s.nome as servico_nome
                FROM agendamentos a
                LEFT JOIN clientes c ON a.cliente_id = c.id
                LEFT JOIN servicos s ON a.servico_id = s.id
                WHERE a.profissional_id = ? 
                AND a.empresa_id = ?
                AND a.status = 'concluido'
                ORDER BY a.data DESC
                LIMIT 50`;

    db.all(sql, [profissional_id, empresa_id], (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar financeiro do profissional:', err.message);
            return res.json({ success: false, message: err.message });
        }

        let totalComissoes = 0;
        let totalServicos = 0;
        let totalValor = 0;

        const dadosFormatados = agendamentos.map(a => {
            const comissao = parseFloat(a.comissao) || 0;
            const valor = parseFloat(a.valor) || 0;

            totalComissoes += comissao;
            totalServicos += 1;
            totalValor += valor;

            let dataFormatada = a.data_formatada || a.data;
            if (dataFormatada && typeof dataFormatada === 'string') {
                // Já está formatada
            } else if (a.data) {
                try {
                    const dataObj = new Date(a.data);
                    dataFormatada = dataObj.toISOString().split('T')[0];
                } catch (e) {
                    dataFormatada = String(a.data);
                }
            }

            return {
                id: a.id,
                data: dataFormatada,
                valor: valor,
                servico: a.servico || a.servico_nome || 'N/A',
                servico_nome: a.servico_nome || a.servico || 'N/A',
                comissao: comissao,
                cliente_id: a.cliente_id,
                cliente_nome: a.cliente_nome || 'N/A',
                status: a.status
            };
        });

        console.log(`✅ Financeiro do profissional ${profissional_id}: ${totalServicos} serviços, R$ ${totalComissoes.toFixed(2)} em comissões`);

        res.json({
            success: true,
            data: {
                comissoes: dadosFormatados,
                totais: {
                    total_comissoes: totalComissoes,
                    total_servicos: totalServicos,
                    total_valor: totalValor
                }
            }
        });
    });
});

// ============================================
// PUT /api/profissional/agendamentos/:id - ATUALIZAR AGENDAMENTO
// ============================================

router.put('/profissional/agendamentos/:id', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const { id } = req.params;
    const { data, hora, cliente_id } = req.body;
    const profissional_id = req.usuario.id;
    const empresa_id = req.usuario.empresa_id;

    const db = getEmpresaDb(empresa_id);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sqlSelect = `SELECT * FROM agendamentos WHERE id = ? AND profissional_id = ?`;

    db.get(sqlSelect, [id, profissional_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamentos concluídos não podem ser editados' });
        }

        let query = `UPDATE agendamentos SET `;
        let params = [];
        let updates = [];

        if (data !== undefined) {
            updates.push(`data = ?`);
            params.push(data);
        }
        if (hora !== undefined) {
            updates.push(`hora = ?`);
            params.push(hora);
        }
        if (cliente_id !== undefined) {
            updates.push(`cliente_id = ?`);
            params.push(cliente_id);
        }

        if (updates.length === 0) {
            return res.json({ success: false, message: 'Nenhum campo para atualizar' });
        }

        query += updates.join(', ');
        query += ` WHERE id = ? AND profissional_id = ?`;
        params.push(id, profissional_id);

        db.run(query, params, function (err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Agendamento atualizado com sucesso' });
        });
    });
});

// ============================================
// PUT /api/profissional/agendamentos/:id/concluir - CONCLUIR AGENDAMENTO
// ============================================

router.put('/profissional/agendamentos/:id/concluir', auth, (req, res) => {
    if (req.usuario.role !== 'profissional') {
        return res.json({ success: false, message: 'Acesso negado' });
    }

    const { id } = req.params;
    const profissional_id = req.usuario.id;
    const empresa_id = req.usuario.empresa_id;
    const comissao_percent = req.usuario.comissao_percent || 30;

    const db = getEmpresaDb(empresa_id);

    if (!db) {
        return res.status(500).json({
            success: false,
            message: 'Erro ao conectar ao banco da empresa'
        });
    }

    const sqlSelect = `SELECT * FROM agendamentos WHERE id = ? AND profissional_id = ?`;

    db.get(sqlSelect, [id, profissional_id], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }

        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamento já foi concluído' });
        }

        const comissao = (agendamento.valor || 0) * (comissao_percent / 100);

        const sqlUpdate = `UPDATE agendamentos SET status = 'concluido', comissao = ? WHERE id = ?`;

        db.run(sqlUpdate, [comissao, id], (err) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                message: `Agendamento concluído! Sua comissão: R$ ${comissao.toFixed(2)}`,
                data: { comissao: comissao }
            });
        });
    });
});

module.exports = router;