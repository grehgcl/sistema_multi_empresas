const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// Listar barbeiros
router.get('/', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    
    db.all(`
        SELECT id, nome, email, comissao_percentual, role, ativo
        FROM usuarios 
        WHERE empresa_id = ? AND role IN ('barbeiro', 'admin')
        ORDER BY nome
    `, [empresa_id], (err, barbeiros) => {
        if (err) {
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: barbeiros });
    });
});

module.exports = router;