const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// Helper para filtrar por acesso
function getFiltroAcesso(usuario) {
    if (usuario.ehSuperAdmin && usuario.ehSuperAdmin()) {
        return { sql: '', params: [] }; // Super admin vê tudo
    }
    if (usuario.ehProfissional && usuario.ehProfissional()) {
        return { sql: 'AND a.barbeiro_id = ?', params: [usuario.id] }; // Profissional vê só seus
    }
    // Dono vê só sua empresa
    return { sql: 'AND a.empresa_id = ?', params: [usuario.empresa_id] };
}

// Listar agendamentos com filtro por nível
router.get('/', auth, (req, res) => {
    const filtro = getFiltroAcesso(req.usuario);
    
    let query = `
        SELECT a.*, 
               c.nome as cliente_nome,
               u.nome as barbeiro_nome,
               s.nome as servico_nome,
               s.preco
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN usuarios u ON a.barbeiro_id = u.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        WHERE 1=1 ${filtro.sql}
        ORDER BY a.data DESC, a.hora DESC
    `;
    
    db.all(query, filtro.params, (err, agendamentos) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: agendamentos });
    });
});

// Criar novo agendamento (dono ou admin pode criar)
router.post('/', auth, (req, res) => {
    const { cliente_id, barbeiro_id, servico_id, data, hora, valor_total } = req.body;
    
    let empresa_id = req.usuario.empresa_id;
    
    if (!empresa_id && !req.usuario.ehSuperAdmin()) {
        return res.json({ success: false, message: 'Empresa não identificada' });
    }
    
    if (!cliente_id || !barbeiro_id || !servico_id || !data || !hora) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios' });
    }
    
    db.get(`SELECT preco FROM servicos WHERE id = ?`, [servico_id], (err, servico) => {
        if (err || !servico) {
            return res.json({ success: false, message: 'Serviço não encontrado' });
        }
        
        const precoFinal = valor_total || servico.preco;
        
        db.run(`
            INSERT INTO agendamentos (cliente_id, barbeiro_id, servico_id, data, hora, valor_total, status, empresa_id)
            VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)
        `, [cliente_id, barbeiro_id, servico_id, data, hora, precoFinal, empresa_id], function(err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, message: 'Agendamento criado com sucesso!', data: { id: this.lastID } });
        });
    });
});

// Concluir agendamento e gerar comissão
router.put('/:id/concluir', auth, (req, res) => {
    const { id } = req.params;
    const filtro = getFiltroAcesso(req.usuario);
    
    let query = `
        SELECT a.*, u.comissao_percentual
        FROM agendamentos a
        LEFT JOIN usuarios u ON a.barbeiro_id = u.id
        WHERE a.id = ? ${filtro.sql}
    `;
    
    db.get(query, [id, ...filtro.params], (err, agendamento) => {
        if (err || !agendamento) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }
        
        if (agendamento.status === 'concluido') {
            return res.json({ success: false, message: 'Agendamento já foi concluído' });
        }
        
        db.run(`UPDATE agendamentos SET status = 'concluido' WHERE id = ?`, [id], (err) => {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            
            if (agendamento.barbeiro_id && agendamento.valor_total) {
                const percentual = agendamento.comissao_percentual || 30;
                const valorComissao = (agendamento.valor_total * percentual) / 100;
                const empresa_id = agendamento.empresa_id || req.usuario.empresa_id;
                
                db.run(`
                    INSERT INTO comissoes (agendamento_id, barbeiro_id, valor, data, status, empresa_id)
                    VALUES (?, ?, ?, date('now'), 'pendente', ?)
                `, [id, agendamento.barbeiro_id, valorComissao, empresa_id], (err) => {
                    if (err) console.error('Erro ao gerar comissão:', err);
                });
            }
            
            res.json({ success: true, message: 'Agendamento concluído e comissão gerada!' });
        });
    });
});

// Cancelar agendamento
router.put('/:id/cancelar', auth, (req, res) => {
    const { id } = req.params;
    const filtro = getFiltroAcesso(req.usuario);
    
    let query = `UPDATE agendamentos SET status = 'cancelado' WHERE id = ? ${filtro.sql}`;
    
    db.run(query, [id, ...filtro.params], function(err) {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        
        if (this.changes === 0) {
            return res.json({ success: false, message: 'Agendamento não encontrado' });
        }
        
        res.json({ success: true, message: 'Agendamento cancelado com sucesso!' });
    });
});

module.exports = router;
