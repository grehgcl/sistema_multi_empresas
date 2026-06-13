const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// Listar serviços
router.get('/', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    
    db.all('SELECT * FROM servicos WHERE empresa_id = ? ORDER BY nome', [empresa_id], (err, rows) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// Criar serviço
router.post('/', auth, (req, res) => {
    const { nome, preco, duracao } = req.body;
    const empresa_id = req.usuario.empresa_id;
    
    if (!nome || !preco) {
        return res.json({ success: false, message: 'Nome e preço são obrigatórios' });
    }
    
    db.run(`INSERT INTO servicos (nome, preco, duracao, empresa_id) VALUES (?, ?, ?, ?)`,
        [nome, preco, duracao || 60, empresa_id], function(err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, data: { id: this.lastID }, message: 'Serviço criado com sucesso' });
        });
});

module.exports = router;
