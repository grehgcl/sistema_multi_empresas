// ============================================================
// ARQUIVO: server/routes/clientes.js
// ROTAS DE CLIENTES
// ============================================================

module.exports = (app, db, isProduction, auth, verificarDono) => {

    // ============================================
    app.get('/api/clientes', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;

    if (!empresa_id) {
        return res.json({ success: true, data: [] });
    }

    const sql = isProduction
        ? `SELECT id, nome, telefone, email, created_at, COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot 
           FROM clientes 
           WHERE empresa_id = $1 
           ORDER BY nome`
        : `SELECT id, nome, telefone, email, created_at, COALESCE(bloqueado_chatbot, 0) as bloqueado_chatbot 
           FROM clientes 
           WHERE empresa_id = ? 
           ORDER BY nome`;

    db.all(sql, [empresa_id], (err, clientes) => {
        if (err) {
            console.error('? Erro ao buscar clientes:', err.message);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: clientes });
    });
});


    // ============================================
    app.post('/api/clientes', auth, (req, res) => {
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('?? Criando cliente:', { nome, telefone, email, empresa_id });

    if (!nome) {
        return res.json({ success: false, message: 'Nome ? obrigat?rio' });
    }

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    const sql = isProduction
        ? `INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES ($1, $2, $3, $4) RETURNING id`
        : `INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)`;

    db.run(sql, [nome, telefonePadrao, email, empresa_id], function (err) {
        if (err) {
            console.error('? Erro ao criar cliente:', err.message);
            return res.json({ success: false, message: 'Erro ao criar cliente: ' + err.message });
        }

        let id = this?.lastID || this?.id || null;
        console.log('? Cliente criado com ID:', id);
        res.json({ success: true, data: { id: id }, message: 'Cliente cadastrado com sucesso!' });
    });
});


    // ============================================
    app.put('/api/clientes/:id', auth, verificarDono, (req, res) => {
    const { id } = req.params;
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;

    console.log('?? Atualizando cliente:', { id, nome, telefone, email, empresa_id });

    const telefonePadrao = telefone ? telefone.replace(/\D/g, '') : null;

    const sql = isProduction
        ? `UPDATE clientes SET 
           nome = COALESCE($1, nome), 
           telefone = COALESCE($2, telefone), 
           email = COALESCE($3, email)
               FROM agendamentos a
               LEFT JOIN clientes c ON a.cliente_id = c.id
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.profissional_id = $1 AND a.status = 'concluido'
               ORDER BY a.data DESC`
            : `SELECT a.*, 
               date(a.data) as data_formatada,
               c.nome as cliente_nome, 
               s.nome as servico_nome
               FROM agendamentos a
               LEFT JOIN clientes c ON a.cliente_id = c.id
               LEFT JOIN servicos s ON a.servico_id = s.id
               WHERE a.profissional_id = ? AND a.status = 'concluido'
               ORDER BY a.data DESC`;

        db.all(sql, [profissional_id], (err, comissoes) => {
            if (err) {
                console.error('? Erro no financeiro profissional:', err.message);
                return res.json({ success: false, message: err.message });
            }

            const dadosFormatados = comissoes.map(a => ({
                ...a,
                data: a.data_formatada || a.data,
                data_formatada: undefined
            }));

            const totalComissoes = dadosFormatados.reduce((s, c) => s + (parseFloat(c.comissao) || 0), 0);

            res.json({
                success: true,
                data: {
                    comissoes: dadosFormatados,
                    totais: {
                        total_comissoes: totalComissoes,
                        total_servicos: dadosFormatados.length
                    }
                }
            });
        });
        return;
    }

    if (role === 'dono') {
        const sql = isProduction
            ? `SELECT 
                a.id,
                to_char(a.data, 'YYYY-MM-DD') as data_formatada,
                a.valor,
                a.servico,
                a.comissao,
                a.profissional_id,
                a.cliente_id,
                c.nome as cliente_nome,
                p.nome as profissional_nome,
                s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = $1 
            AND a.status = 'concluido'
            ORDER BY a.data DESC`
            : `SELECT 
                a.id,
                date(a.data) as data_formatada,
                a.valor,
                a.servico,
                a.comissao,
                a.profissional_id,
                a.cliente_id,
                c.nome as cliente_nome,
                p.nome as profissional_nome,
                s.nome as servico_nome
            FROM agendamentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN profissionais p ON a.profissional_id = p.id
            LEFT JOIN servicos s ON a.servico_id = s.id
            WHERE a.empresa_id = ? 
            AND a.status = 'concluido'
            ORDER BY a.data DESC`;

        db.all(sql, [empresa_id], (err, comissoes) => {
            if (err) {
                console.error('? Erro no financeiro dono:', err.message);
                return res.json({ success: false, message: err.message });
            }

            let faturamentoBruto = 0;
            let totalComissoes = 0;
            let totalServicos = comissoes.length;
            const comissoesPorProfissional = {};

            for (let item of comissoes) {
                const dataFinal = item.data_formatada || item.data;
                item.data = dataFinal;
                delete item.data_formatada;

                const valor = parseFloat(item.valor) || 0;
                faturamentoBruto += valor;

                if (!item.profissional_id) {
                    item.comissao = 0;
                } else {
                    const comissao = parseFloat(item.comissao) || 0;
                    totalComissoes += comissao;

                    const profId = item.profissional_id;
                    const profNome = item.profissional_nome || 'Profissional';

                    if (!comissoesPorProfissional[profId]) {
                        comissoesPorProfissional[profId] = {
                            id: profId,
                            nome: profNome,
                            total_comissao: 0,
                            total_servicos: 0
                        };
                    }
                    comissoesPorProfissional[profId].total_comissao += comissao;
                    comissoesPorProfissional[profId].total_servicos += 1;
                }
            }

            const faturamentoLiquido = faturamentoBruto - totalComissoes;
            const comissoesPorProfissionalArray = Object.values(comissoesPorProfissional);
            comissoesPorProfissionalArray.sort((a, b) => b.total_comissao - a.total_comissao);

            res.json({
                success: true,
                data: {
                    totais: {
                        faturamento_bruto: faturamentoBruto,
                        total_comissoes: totalComissoes,
                        faturamento_liquido: faturamentoLiquido,
                        total_servicos: totalServicos
                    },
                    comissoes: comissoes,
                    comissoes_por_profissional: comissoesPorProfissionalArray
                }
            });
        });
        return;
    }

    if (role === 'superadmin') {
        // ... superadmin financeiro
    }

    res.status(403).json({
        success: false,
        message: 'Acesso negado'
    });
});


};
