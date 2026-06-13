const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        req.usuario = decoded;
        
        // Adicionar helper para verificar níveis
        req.usuario.ehSuperAdmin = () => decoded.nivel === 3;
        req.usuario.ehDono = () => decoded.nivel === 2;
        req.usuario.ehProfissional = () => decoded.nivel === 1;
        
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token inválido' });
    }
};
