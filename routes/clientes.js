const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// Listar clientes
router.get('/', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    
    db.all('SELECT * FROM clientes WHERE empresa_id = ? ORDER BY nome', [empresa_id], (err, rows) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// Criar cliente
router.post('/', auth, (req, res) => {
    const { nome, telefone, email } = req.body;
    const empresa_id = req.usuario.empresa_id;
    
    if (!nome) {
        return res.json({ success: false, message: 'Nome é obrigatório' });
    }
    
    db.run(`INSERT INTO clientes (nome, telefone, email, empresa_id) VALUES (?, ?, ?, ?)`,
        [nome, telefone, email, empresa_id], function(err) {
            if (err) {
                return res.json({ success: false, message: err.message });
            }
            res.json({ success: true, data: { id: this.lastID }, message: 'Cliente criado com sucesso' });
        });
});

module.exports = router;
