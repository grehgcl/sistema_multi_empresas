// ============================================================
// ARQUIVO: server/routes/auth.js
// ROTAS DE AUTENTICAÇÃO
// ============================================================

module.exports = (app, db, isProduction, bcrypt, jwt, JWT_SECRET) => {

    // ============================================
    app.post('/api/login', (req, res) => {
    const { email, senha } = req.body;

    console.log('?? Tentando login:', { email });

    // Query para profissionais (adaptada para PostgreSQL)
    const sqlProfissional = isProduction
        ? `SELECT p.*, e.nome as empresa_nome, e.trial_expira, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
           FROM profissionais p 
           LEFT JOIN empresas e ON p.empresa_id = e.id 
           WHERE p.email = $1 AND p.ativo = 1`
        : `SELECT p.*, e.nome as empresa_nome, e.trial_expira, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
           FROM profissionais p 
           LEFT JOIN empresas e ON p.empresa_id = e.id 
           WHERE p.email = ? AND p.ativo = 1`;

    db.get(sqlProfissional, [email], (err, profissional) => {
        if (err) {
            console.error('? Erro ao buscar profissional:', err.message);
            return res.json({ success: false, message: 'Erro ao buscar profissional' });
        }

        if (profissional && bcrypt.compareSync(senha, profissional.senha)) {
            const token = jwt.sign(
                {
                    id: profissional.id,
                    email: profissional.email,
                    role: 'profissional',
                    empresa_id: profissional.empresa_id,
                    nome: profissional.nome,
                    comissao_percent: profissional.comissao_percent
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // ?? REGISTRAR ACESSO DO PROFISSIONAL
            const ip = req.ip || req.connection.remoteAddress || null;
            const user_agent = req.headers['user-agent'] || null;

            const sqlAcesso = isProduction
                ? `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES ($1, $2, $3, $4)`
                : `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES (?, ?, ?, ?)`;

            db.run(sqlAcesso, [profissional.empresa_id, profissional.id, ip, user_agent], (err) => {
                if (err) {
                    console.error('?? Erro ao registrar acesso do profissional:', err.message);
                } else {
                    console.log(`?? Acesso registrado para profissional ${profissional.nome} (empresa ${profissional.empresa_id})`);
                }
            });

            return res.json({
                success: true,
                data: {
                    token,
                    usuario: {
                        id: profissional.id,
                        nome: profissional.nome,
                        email: profissional.email,
                        role: 'profissional',
                        empresa_id: profissional.empresa_id,
                        empresa_nome: profissional.empresa_nome,
                        comissao_percent: profissional.comissao_percent
                    }
                }
            });
        }

        // Query para usu?rios (adaptada para PostgreSQL)
        const sqlUsuario = isProduction
            ? `SELECT u.*, e.trial_expira, e.nome as empresa_nome, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
               FROM usuarios u 
               LEFT JOIN empresas e ON u.empresa_id = e.id 
               WHERE u.email = $1`
            : `SELECT u.*, e.trial_expira, e.nome as empresa_nome, e.plano, e.assinatura_ativa, e.assinatura_valida_ate, e.limite_profissionais
               FROM usuarios u 
               LEFT JOIN empresas e ON u.empresa_id = e.id 
               WHERE u.email = ?`;

        db.get(sqlUsuario, [email], (err, user) => {
            if (err) {
                console.error('? Erro ao buscar usu?rio:', err.message);
                return res.json({ success: false, message: 'Erro ao buscar usu?rio' });
            }

            if (!user) {
                console.log('? Usu?rio n?o encontrado:', email);
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            if (!bcrypt.compareSync(senha, user.senha)) {
                console.log('? Senha incorreta para:', email);
                return res.json({ success: false, message: 'Email ou senha incorretos' });
            }

            let diasRestantes = 0;

            if (user.role === 'dono') {
                if (user.plano === 'trial' && user.trial_expira) {
                    const hoje = new Date();
                    const trialExpira = new Date(user.trial_expira);
                    if (hoje > trialExpira) {
                        return res.json({ success: false, message: 'Seu per?odo de teste expirou. Fa?a upgrade para continuar usando o sistema.' });
                    }
                    diasRestantes = Math.ceil((trialExpira - hoje) / (1000 * 60 * 60 * 24));
                } else if (user.plano !== 'trial' && user.assinatura_ativa === 1 && user.assinatura_valida_ate) {
                    const hoje = new Date();
                    const validaAte = new Date(user.assinatura_valida_ate);
                    if (hoje > validaAte) {
                        return res.json({ success: false, message: 'Sua assinatura expirou. Renove para continuar usando o sistema.' });
                    }
                    diasRestantes = Math.ceil((validaAte - hoje) / (1000 * 60 * 60 * 24));
                }
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role, empresa_id: user.empresa_id, nome: user.nome },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            // ?? REGISTRAR ACESSO DO USU?RIO
            const ip = req.ip || req.connection.remoteAddress || null;
            const user_agent = req.headers['user-agent'] || null;

            const sqlAcesso = isProduction
                ? `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES ($1, $2, $3, $4)`
                : `INSERT INTO acessos (empresa_id, usuario_id, ip, user_agent) VALUES (?, ?, ?, ?)`;

            db.run(sqlAcesso, [user.empresa_id, user.id, ip, user_agent], (err) => {
                if (err) {
                    console.error('?? Erro ao registrar acesso do usu?rio:', err.message);
                } else {
                    console.log(`?? Acesso registrado para ${user.nome} (empresa ${user.empresa_id})`);
                }
            });

            console.log('? Login bem sucedido:', email);

            res.json({
                success: true,
                data: {
                    token,
                    usuario: {
                        id: user.id,
                        nome: user.nome,
                        email: user.email,
                        role: user.role,
                        empresa_id: user.empresa_id,
                        empresa_nome: user.empresa_nome,
                        dias_restantes: diasRestantes,
                        plano: user.plano,
                        limite_profissionais: user.limite_profissionais
                    }
                }
            });
        });
    });
});


    // ============================================
    app.post('/api/cadastro', (req, res) => {
    const { nome, email, senha, empresa_nome, telefone } = req.body; // ? ADICIONEI telefone

    if (!nome || !email || !senha || !empresa_nome) {
        return res.json({ success: false, message: 'Todos os campos s?o obrigat?rios' });
    }

    console.log('?? Tentando cadastrar:', { nome, email, empresa_nome, telefone });

    // ?? VERIFICAR SE EMAIL J? EXISTE
    const sqlCheck = isProduction
        ? 'SELECT id FROM usuarios WHERE email = $1'
        : 'SELECT id FROM usuarios WHERE email = ?';

    db.get(sqlCheck, [email], (err, user) => {
        if (err) {
            console.error('? Erro ao verificar email:', err.message);
            return res.json({ success: false, message: 'Erro ao verificar email' });
        }

        if (user) {
            return res.json({ success: false, message: 'Email j? cadastrado' });
        }

        // ?? LIMPAR O TELEFONE (APENAS N?MEROS)
        const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;
        console.log('?? Telefone limpo:', telefoneLimpo);

        // ?? CRIAR EMPRESA (COM TELEFONE_DONO)
        const sqlEmpresa = isProduction
            ? `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa, telefone_dono) 
               VALUES ($1, 'trial', 1, (CURRENT_TIMESTAMP + INTERVAL '45 days'), 1, $2) RETURNING id`
            : `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa, telefone_dono) 
               VALUES (?, 'trial', 1, datetime('now', '+45 days'), 1, ?)`;

        db.run(sqlEmpresa, [empresa_nome, telefoneLimpo], function (err) {
            if (err) {
                console.error('? Erro ao criar empresa:', err.message);
                return res.json({ success: false, message: 'Erro ao criar empresa' });
            }

            // ?? BUSCAR ID DA EMPRESA
            let sqlFind;
            let paramsFind;

            if (isProduction) {
                sqlFind = `SELECT id FROM empresas WHERE nome = $1 ORDER BY id DESC LIMIT 1`;
                paramsFind = [empresa_nome];
            } else {
                sqlFind = `SELECT id FROM empresas WHERE nome = ? ORDER BY id DESC LIMIT 1`;
                paramsFind = [empresa_nome];
            }

            db.get(sqlFind, paramsFind, (err, row) => {
                if (err || !row) {
                    console.error('? Erro ao buscar ID da empresa:', err?.message);
                    return res.json({ success: false, message: 'Erro ao buscar ID da empresa' });
                }

                const empresa_id = row.id;
                console.log('? Empresa criada com ID:', empresa_id);
                console.log('?? Telefone do dono salvo:', telefoneLimpo);

                // ?? CRIAR USU?RIO (COM TELEFONE)
                const senhaHash = bcrypt.hashSync(senha, 10);
                const sqlUsuario = isProduction
                    ? `INSERT INTO usuarios (nome, email, senha, role, empresa_id, telefone) 
                       VALUES ($1, $2, $3, 'dono', $4, $5)`
                    : `INSERT INTO usuarios (nome, email, senha, role, empresa_id, telefone) 
                       VALUES (?, ?, ?, 'dono', ?, ?)`;

                db.run(sqlUsuario, [nome, email, senhaHash, empresa_id, telefoneLimpo], function (err) {
                    if (err) {
                        console.error('? Erro ao criar usu?rio:', err.message);
                        return res.json({ success: false, message: 'Erro ao criar usu?rio' });
                    }

                    console.log('? Usu?rio criado com sucesso!');
                    console.log('?? Telefone do usu?rio salvo:', telefoneLimpo);

                    // ?? INSERIR HOR?RIOS PADR?O
                    console.log('?? Inserindo hor?rios padr?o para empresa:', empresa_id);

                    const diasSemana = [0, 1, 2, 3, 4, 5, 6];
                    let horariosInseridos = 0;
                    let totalErros = 0;

                    for (const dia of diasSemana) {
                        const sqlHorario = isProduction
                            ? `
                            INSERT INTO horarios_funcionamento 
                            (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                            VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00', 30)
                            ON CONFLICT (empresa_id, dia_semana) DO NOTHING
                        `
                            : `
                            INSERT OR IGNORE INTO horarios_funcionamento 
                            (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                            VALUES (?, ?, 1, '09:00', '18:00', '12:00', '13:00', 30)
                        `;

                        db.run(sqlHorario, isProduction ? [empresa_id, dia] : [empresa_id, dia], function (err) {
                            if (err) {
                                console.error(`? Erro ao inserir hor?rio dia ${dia}:`, err.message);
                                totalErros++;
                            } else {
                                horariosInseridos++;
                                console.log(`? Hor?rio dia ${dia} inserido (${horariosInseridos}/7)`);
                            }

                            if (horariosInseridos + totalErros === 7 || horariosInseridos === 7) {
                                const sqlCheck = isProduction
                                    ? `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1`
                                    : `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?`;

                                db.get(sqlCheck, [empresa_id], (err, result) => {
                                    if (!err && result) {
                                        console.log(`? ${result.total} hor?rios confirmados no banco`);
                                    }

                                    res.json({
                                        success: true,
                                        message: 'Cadastro realizado! Voc? tem 45 dias de teste.',
                                        data: {
                                            empresa_id: empresa_id,
                                            horarios_inseridos: horariosInseridos,
                                            telefone_dono: telefoneLimpo
                                        }
                                    });
                                });
                            }
                        });
                    }

                    // TIMEOUT DE SEGURAN?A
                    setTimeout(() => {
                        console.log('? Verificando hor?rios ap?s timeout...');
                        const sqlCheck = isProduction
                            ? `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = $1`
                            : `SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?`;

                        db.get(sqlCheck, [empresa_id], (err, result) => {
                            if (!err && result && result.total > 0) {
                                console.log(`? ${result.total} hor?rios encontrados`);
                            } else {
                                console.warn('?? Inserindo hor?rios manualmente...');
                                for (const dia of [0, 1, 2, 3, 4, 5, 6]) {
                                    const sqlManual = isProduction
                                        ? `INSERT INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                                           VALUES ($1, $2, 1, '09:00', '18:00', '12:00', '13:00', 30) ON CONFLICT DO NOTHING`
                                        : `INSERT OR IGNORE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                                           VALUES (?, ?, 1, '09:00', '18:00', '12:00', '13:00', 30)`;

                                    db.run(sqlManual, isProduction ? [empresa_id, dia] : [empresa_id, dia]);
                                }
                            }
                        });
                    }, 5000);
                });
            });
        });
    });
});


};
