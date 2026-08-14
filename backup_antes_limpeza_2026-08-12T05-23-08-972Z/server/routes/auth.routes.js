// ============================================
// ROTAS DE AUTENTICAÇÃO
// ============================================
const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/constants');

// ============================================
// POST /api/login
// ============================================
router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            success: false,
            message: 'Email e senha são obrigatórios'
        });
    }

    // Verificar se é Super Admin
    if (email === 'super@admin.com' && senha === 'super123') {
        const token = jwt.sign(
            { id: 1, email: 'super@admin.com', role: 'super_admin' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        return res.json({
            success: true,
            data: {
                id: 1,
                nome: 'Super Admin',
                email: 'super@admin.com',
                role: 'super_admin',
                empresa_id: null
            },
            token: token
        });
    }

    // Buscar usuário no banco
    const sql = "SELECT * FROM usuarios WHERE email = ?";
    db.get(sql, [email], async (err, user) => {
        if (err) {
            console.error('❌ Erro ao buscar usuário:', err);
            return res.status(500).json({ success: false, message: 'Erro ao buscar usuário' });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        // Verificar senha
        const senhaValida = await bcrypt.compare(senha, user.senha);
        if (!senhaValida) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        // Buscar empresa
        const sqlEmpresa = "SELECT * FROM empresas WHERE id = ?";
        db.get(sqlEmpresa, [user.empresa_id], (err, empresa) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Erro ao buscar empresa' });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    empresa_id: user.empresa_id
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // Registrar acesso
            const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
            const userAgent = req.headers['user-agent'] || '';

            db.run(
                "INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES (?, ?, ?, ?)",
                [user.empresa_id, user.id, ip, userAgent],
                (err) => {
                    if (err) console.error('Erro ao registrar acesso:', err);
                }
            );

            res.json({
                success: true,
                data: {
                    id: user.id,
                    nome: user.nome,
                    email: user.email,
                    role: user.role,
                    empresa_id: user.empresa_id,
                    empresa_nome: empresa?.nome || null
                },
                token: token
            });
        });
    });
});

// ============================================
// POST /api/cadastro - CORRIGIDO
// ============================================
router.post('/cadastro', async (req, res) => {
    const { nome, email, senha, empresa_nome, telefone } = req.body;

    if (!nome || !email || !senha || !empresa_nome) {
        return res.status(400).json({
            success: false,
            message: 'Nome, email, senha e nome da empresa são obrigatórios'
        });
    }

    try {
        // Verificar se já existe
        const userExist = await new Promise((resolve) => {
            db.get("SELECT id FROM usuarios WHERE email = ?", [email], (err, row) => {
                resolve(row);
            });
        });

        if (userExist) {
            return res.status(400).json({
                success: false,
                message: 'Este email já está cadastrado'
            });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // Criar empresa (trial de 45 dias)
        const trialExpira = new Date();
        trialExpira.setDate(trialExpira.getDate() + 45);
        const trialExpiraStr = trialExpira.toISOString().split('T')[0];

        console.log('📝 Criando empresa:', empresa_nome);

        // 🔥 USAR db.get PARA PEGAR O ID RETORNADO
        const empresaResult = await new Promise((resolve, reject) => {
            db.get(
                "INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira) VALUES ($1, 'trial', 1, $2) RETURNING id",
                [empresa_nome, trialExpiraStr],
                (err, row) => {
                    if (err) {
                        console.error('❌ Erro SQL:', err);
                        reject(err);
                    } else {
                        console.log('✅ Resultado INSERT:', row);
                        resolve(row);
                    }
                }
            );
        });

        const empresaId = empresaResult?.id;

        if (!empresaId) {
            throw new Error('Erro ao criar empresa - ID inválido');
        }

        console.log('✅ Empresa criada com ID:', empresaId);

        // 🔥 CRIAR HORÁRIOS PADRÃO
        console.log('📝 Criando horários para empresa:', empresaId);
        const diasSemana = [0, 1, 2, 3, 4, 5, 6];
        for (const dia of diasSemana) {
            const aberto = dia !== 0 && dia !== 6;
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO horarios_funcionamento 
                     (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim) 
                     VALUES ($1, $2, $3, '08:00:00', '18:00:00', '12:00:00', '13:00:00')`,
                    [empresaId, dia, aberto],
                    function (err) {
                        if (err) {
                            console.error(`❌ Erro ao criar horário para dia ${dia}:`, err.message);
                            reject(err);
                        } else {
                            console.log(`✅ Horário criado para dia ${dia}`);
                            resolve(this);
                        }
                    }
                );
            });
        }
        console.log(`✅ Horários padrão criados para empresa ${empresaId}`);

        // Criar usuário (dono)
        console.log('📝 Criando usuário:', email);
        const usuarioId = await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO usuarios (nome, email, senha, role, empresa_id) VALUES ($1, $2, $3, 'dono', $4) RETURNING id",
                [nome, email, senhaHash, empresaId],
                function (err) {
                    if (err) {
                        console.error('❌ Erro ao criar usuário:', err);
                        reject(err);
                    } else {
                        console.log('✅ Usuário criado com ID:', this.lastID);
                        resolve(this.lastID);
                    }
                }
            );
        });

        // Atualizar telefone do dono na empresa
        if (telefone) {
            db.run("UPDATE empresas SET telefone_dono = $1 WHERE id = $2", [telefone, empresaId]);
        }

        // Gerar token
        const token = jwt.sign(
            { id: usuarioId, email: email, role: 'dono', empresa_id: empresaId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: {
                id: usuarioId,
                nome: nome,
                email: email,
                role: 'dono',
                empresa_id: empresaId,
                empresa_nome: empresa_nome
            },
            token: token,
            message: 'Cadastro realizado com sucesso!'
        });

    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao realizar cadastro: ' + error.message
        });
    }
});
module.exports = router;
