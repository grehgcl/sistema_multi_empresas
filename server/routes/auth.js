const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Login
router.post('/login', (req, res) => {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
        return res.json({ success: false, message: 'Email e senha obrigatÃ³rios' });
    }
    
    db.get(`SELECT * FROM usuarios WHERE email = ?`, [email], (err, usuario) => {
        if (err) {
            return res.json({ success: false, message: 'Erro no servidor' });
        }
        
        if (!usuario) {
            return res.json({ success: false, message: 'UsuÃ¡rio nÃ£o encontrado' });
        }
        
        const senhaValida = bcrypt.compareSync(senha, usuario.senha);
        if (!senhaValida) {
            return res.json({ success: false, message: 'Senha incorreta' });
        }
        
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, role: usuario.role, empresa_id: usuario.empresa_id },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '7d' }
        );
        
        res.json({
            success: true,
            data: {
                token,
                usuario: {
                    id: usuario.id,
                    nome: usuario.nome,
                    email: usuario.email,
                    role: usuario.role
                }
            }
        });
    });
});

// Verificar token
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.json({ success: false, message: 'Token nÃ£o fornecido' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        res.json({ success: true, data: decoded });
    } catch (error) {
        res.json({ success: false, message: 'Token invÃ¡lido' });
    }
});

module.exports = router;