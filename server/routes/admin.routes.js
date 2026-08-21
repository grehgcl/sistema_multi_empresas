// ============================================
// ROTAS DE ADMIN (SUPER ADMIN) - COMPLETO
// ============================================

const express = require('express');
const router = express.Router();
const { db, getEmpresaDb } = require('../config/database');
const { auth, verificarSuperAdmin, verificarDono } = require('../middlewares/auth');
const bcrypt = require('bcryptjs');
const axios = require('axios');

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

function formatMonthYear(coluna) {
    return isProduction ? `TO_CHAR(${coluna}, 'YYYY-MM')` : `strftime('%Y-%m', ${coluna})`;
}

function dateInterval(intervalo) {
    return isProduction ? `CURRENT_DATE - INTERVAL '${intervalo}'` : `date('now', '-${intervalo}')`;
}

// ============================================
// GET /api/admin/stats - ESTATÍSTICAS GERAIS
// ============================================

router.get('/stats', auth, verificarSuperAdmin, async (req, res) => {
    try {
        const empresaId = req.usuario.empresa_id;

        console.log('📊 Buscando estatísticas para SuperAdmin');

        const sql = isProduction
            ? `SELECT 
                (SELECT COUNT(*) FROM empresas) as total_empresas,
                (SELECT COUNT(*) FROM empresas WHERE assinatura_ativa = true OR plano != 'trial') as empresas_ativas,
                (SELECT COUNT(*) FROM empresas WHERE plano = 'trial') as empresas_trial,
                (SELECT COUNT(*) FROM usuarios) as total_usuarios,
                (SELECT COUNT(*) FROM usuarios WHERE role = 'dono') as total_donos,
                (SELECT COUNT(*) FROM usuarios WHERE role = 'profissional') as total_profissionais,
                (SELECT COUNT(*) FROM clientes) as total_clientes,
                (SELECT COUNT(*) FROM agendamentos) as total_agendamentos,
                (SELECT COUNT(*) FROM agendamentos WHERE EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)) as agendamentos_mes,
                (SELECT COALESCE(SUM(COALESCE(valor_total, valor, 0)), 0) FROM agendamentos WHERE status = 'concluido') as faturamento_total,
                (SELECT COUNT(*) FROM empresas WHERE assinatura_ativa = true) as empresas_pagas
            `
            : `SELECT 
                (SELECT COUNT(*) FROM empresas) as total_empresas,
                (SELECT COUNT(*) FROM empresas WHERE assinatura_ativa = 1 OR plano != 'trial') as empresas_ativas,
                (SELECT COUNT(*) FROM empresas WHERE plano = 'trial') as empresas_trial,
                (SELECT COUNT(*) FROM usuarios) as total_usuarios,
                (SELECT COUNT(*) FROM usuarios WHERE role = 'dono') as total_donos,
                (SELECT COUNT(*) FROM usuarios WHERE role = 'profissional') as total_profissionais,
                (SELECT COUNT(*) FROM clientes) as total_clientes,
                (SELECT COUNT(*) FROM agendamentos) as total_agendamentos,
                (SELECT COUNT(*) FROM agendamentos WHERE strftime('%m', data) = strftime('%m', 'now') AND strftime('%Y', data) = strftime('%Y', 'now')) as agendamentos_mes,
                (SELECT COALESCE(SUM(COALESCE(valor_total, valor, 0)), 0) FROM agendamentos WHERE status = 'concluido') as faturamento_total,
                (SELECT COUNT(*) FROM empresas WHERE assinatura_ativa = 1) as empresas_pagas
            `;

        db.get(sql, [], (err, stats) => {
            if (err) {
                console.error('❌ Erro ao buscar stats:', err.message);
                return res.status(500).json({
                    success: false,
                    message: 'Erro ao buscar estatísticas: ' + err.message
                });
            }

            console.log('✅ Estatísticas carregadas:', stats);
            res.json({
                success: true,
                data: stats || {
                    total_empresas: 0,
                    empresas_ativas: 0,
                    empresas_trial: 0,
                    total_usuarios: 0,
                    total_donos: 0,
                    total_profissionais: 0,
                    total_clientes: 0,
                    total_agendamentos: 0,
                    agendamentos_mes: 0,
                    faturamento_total: 0,
                    empresas_pagas: 0
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno: ' + error.message
        });
    }
});

// ============================================
// GET /api/admin/empresas - CORRIGIDO
// ============================================

router.get('/empresas', auth, verificarSuperAdmin, (req, res) => {
    console.log('🏢 Buscando empresas para SuperAdmin');

    // Primeiro, buscar todas as empresas
    const sqlEmpresas = isProduction
        ? `SELECT id, nome, plano, trial_expira, assinatura_valida_ate, 
           whatsapp_proprio_habilitado, whatsapp_connected, telefone_dono
           FROM empresas ORDER BY id DESC`
        : `SELECT id, nome, plano, trial_expira, assinatura_valida_ate, 
           whatsapp_proprio_habilitado, whatsapp_connected, telefone_dono
           FROM empresas ORDER BY id DESC`;

    db.all(sqlEmpresas, [], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao buscar empresas:', err);
            return res.status(500).json({ 
                success: false, 
                message: err.message 
            });
        }

        // 🔥 Para cada empresa, buscar dados no banco da empresa
        let empresasProcessadas = 0;
        const resultados = [];

        empresas.forEach((empresa, index) => {
            const empresaDb = getEmpresaDb(empresa.id);
            
            if (!empresaDb) {
                // Se não tiver banco próprio, usar contagem do banco principal
                db.get(
                    `SELECT COUNT(*) as total_clientes FROM clientes WHERE empresa_id = ?`,
                    [empresa.id],
                    (err, clientesRow) => {
                        db.get(
                            `SELECT COUNT(*) as total_agendamentos FROM agendamentos WHERE empresa_id = ?`,
                            [empresa.id],
                            (err, agendamentosRow) => {
                                resultados[index] = {
                                    ...empresa,
                                    total_clientes: clientesRow?.total || 0,
                                    total_agendamentos: agendamentosRow?.total || 0
                                };
                                empresasProcessadas++;
                                if (empresasProcessadas === empresas.length) {
                                    res.json({ 
                                        success: true, 
                                        data: resultados 
                                    });
                                }
                            }
                        );
                    }
                );
                return;
            }

            // Buscar do banco da empresa
            empresaDb.get('SELECT COUNT(*) as total FROM clientes', [], (err, clientesRow) => {
                const totalClientes = clientesRow?.total || 0;
                
                empresaDb.get('SELECT COUNT(*) as total FROM agendamentos', [], (err, agendamentosRow) => {
                    const totalAgendamentos = agendamentosRow?.total || 0;
                    
                    resultados[index] = {
                        ...empresa,
                        total_clientes: totalClientes,
                        total_agendamentos: totalAgendamentos
                    };
                    
                    empresasProcessadas++;
                    if (empresasProcessadas === empresas.length) {
                        res.json({ 
                            success: true, 
                            data: resultados 
                        });
                    }
                });
            });
        });

        if (empresas.length === 0) {
            res.json({ 
                success: true, 
                data: [] 
            });
        }
    });
});

// ============================================
// GET /api/admin/empresas/:id
// ============================================

router.get('/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando empresa ${id}...`);

    const sql = isProduction
        ? `SELECT e.*, 
           u.nome as dono_nome,
           u.email as dono_email,
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'profissional') as total_profissionais,
           (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos
           FROM empresas e
           LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
           WHERE e.id = ?`
        : `SELECT e.*, 
           u.nome as dono_nome,
           u.email as dono_email,
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'profissional') as total_profissionais,
           (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos
           FROM empresas e
           LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
           WHERE e.id = ?`;

    db.get(sql, [id], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar empresa:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!empresa) {
            return res.json({ success: false, message: 'Empresa não encontrada' });
        }

        res.json({ success: true, data: empresa });
    });
});

// ============================================
// PUT /api/admin/empresas/:id
// ============================================

router.put('/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, plano } = req.body;
    console.log(`🔧 Super Admin - Atualizando empresa ${id}:`, { nome, plano });

    if (!nome) {
        return res.json({ success: false, message: 'Nome da empresa é obrigatório' });
    }

    const sql = isProduction
        ? `UPDATE empresas SET nome = ?, plano = ? WHERE id = ?`
        : `UPDATE empresas SET nome = ?, plano = ? WHERE id = ?`;

    db.run(sql, [nome, plano || 'trial', id], function (err) {
        if (err) {
            console.error('❌ Erro ao atualizar empresa:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log('✅ Empresa atualizada com sucesso!');
        res.json({ success: true, message: 'Empresa atualizada com sucesso' });
    });
});

// ============================================
// DELETE /api/admin/empresas/:id - CORRIGIDO
// ============================================

router.delete('/empresas/:id', auth, verificarSuperAdmin, async (req, res) => {
    const { id } = req.params;
    console.log(`⚠️ Super Admin - Deletando empresa ID: ${id}...`);

    try {
        // 1. Verificar se a empresa existe
        const sqlCheck = isProduction
            ? `SELECT id, nome FROM empresas WHERE id = ?`
            : `SELECT id, nome FROM empresas WHERE id = ?`;

        const empresa = await new Promise((resolve, reject) => {
            db.get(sqlCheck, [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        console.log(`📌 Empresa encontrada: "${empresa.nome}" (ID: ${id})`);

        // Lista de tabelas que existem no SQLite
        const queries = [
            `DELETE FROM agendamentos WHERE empresa_id = ?`,
            `DELETE FROM clientes WHERE empresa_id = ?`,
            `DELETE FROM profissionais WHERE empresa_id = ?`,
            `DELETE FROM servicos WHERE empresa_id = ?`,
            `DELETE FROM horarios_funcionamento WHERE empresa_id = ?`,
            `DELETE FROM despesas WHERE empresa_id = ?`,
            `DELETE FROM acessos WHERE empresa_id = ?`,
            `DELETE FROM usuarios WHERE empresa_id = ?`,
            `DELETE FROM empresas WHERE id = ?`
        ];

        // Verificar se as tabelas existem antes de tentar deletar
        const tabelasExistentes = await new Promise((resolve) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
                if (err) {
                    console.error('❌ Erro ao listar tabelas:', err);
                    resolve([]);
                } else {
                    resolve(rows.map(r => r.name));
                }
            });
        });

        console.log('📋 Tabelas existentes:', tabelasExistentes);

        // Filtrar apenas as tabelas que existem
        const queriesFiltradas = queries.filter(sql => {
            const match = sql.match(/FROM\s+(\w+)/i);
            if (match) {
                const tabela = match[1];
                const existe = tabelasExistentes.includes(tabela);
                if (!existe) {
                    console.log(`   ⏭️ Tabela ${tabela} não existe, ignorando...`);
                }
                return existe;
            }
            return true;
        });

        console.log(`📝 Executando ${queriesFiltradas.length} queries...`);

        // Executar cada query
        for (const sql of queriesFiltradas) {
            await new Promise((resolve) => {
                db.run(sql, [id], (err) => {
                    if (err) {
                        console.error(`❌ Erro ao executar: ${sql}`, err.message);
                    }
                    resolve();
                });
            });
        }

        // Deletar o banco individual da empresa (se existir)
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(__dirname, '../../database', `empresa_${id}.db`);
        if (fs.existsSync(dbPath)) {
            try {
                fs.unlinkSync(dbPath);
                console.log(`🗑️ Banco individual deletado: empresa_${id}.db`);
            } catch (err) {
                console.warn(`⚠️ Não foi possível deletar o banco: ${err.message}`);
            }
        }

        console.log(`✅ Empresa "${empresa.nome}" (ID: ${id}) deletada com sucesso!`);

        res.json({
            success: true,
            message: `Empresa "${empresa.nome}" deletada com sucesso!`
        });

    } catch (error) {
        console.error('❌ Erro ao deletar empresa:', error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao deletar empresa: ' + error.message
        });
    }
});

// ============================================
// GET /api/admin/usuarios - LISTAR USUÁRIOS
// ============================================

router.get('/usuarios', auth, verificarSuperAdmin, (req, res) => {
    console.log('👤 Buscando usuários para SuperAdmin');

    const sql = isProduction
        ? `SELECT u.*, e.nome as empresa_nome
           FROM usuarios u
           LEFT JOIN empresas e ON u.empresa_id = e.id
           ORDER BY u.created_at DESC`
        : `SELECT u.*, e.nome as empresa_nome
           FROM usuarios u
           LEFT JOIN empresas e ON u.empresa_id = e.id
           ORDER BY u.created_at DESC`;

    db.all(sql, [], (err, usuarios) => {
        if (err) {
            console.error('❌ Erro ao listar usuários:', err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        console.log(`✅ ${usuarios.length} usuários encontrados`);
        res.json({
            success: true,
            data: usuarios || []
        });
    });
});

// ============================================
// GET /api/admin/empresa/:id - DETALHES DA EMPRESA
// ============================================

router.get('/empresa/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;

    const sql = isProduction
        ? `SELECT e.*, 
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id) as total_usuarios,
           (SELECT COUNT(*) FROM profissionais WHERE empresa_id = e.id) as total_profissionais,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos
           FROM empresas e
           WHERE e.id = ?`
        : `SELECT e.*, 
           (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id) as total_usuarios,
           (SELECT COUNT(*) FROM profissionais WHERE empresa_id = e.id) as total_profissionais,
           (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos
           FROM empresas e
           WHERE e.id = ?`;

    db.get(sql, [id], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar empresa:', err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        res.json({
            success: true,
            data: empresa
        });
    });
});

// ============================================
// GET /api/admin/usuarios/:id
// ============================================

router.get('/usuarios/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando usuário ${id}...`);

    const sqlUsuario = isProduction
        ? `SELECT id, nome, email, role, empresa_id, created_at, telefone 
           FROM usuarios 
           WHERE id = ?`
        : `SELECT id, nome, email, role, empresa_id, created_at, telefone 
           FROM usuarios 
           WHERE id = ?`;

    db.get(sqlUsuario, [id], (err, usuario) => {
        if (err) {
            console.error('❌ Erro ao buscar usuário:', err);
            return res.json({ success: false, message: err.message });
        }

        if (usuario) {
            delete usuario.senha;

            if (usuario.role === 'profissional') {
                const sqlProf = isProduction
                    ? `SELECT comissao_percent FROM profissionais WHERE email = ?`
                    : `SELECT comissao_percent FROM profissionais WHERE email = ?`;

                db.get(sqlProf, [usuario.email], (err, prof) => {
                    usuario.comissao_percent = (prof?.comissao_percent || 30);
                    console.log('✅ Usuário encontrado:', usuario.nome);
                    res.json({ success: true, data: usuario });
                });
            } else {
                usuario.comissao_percent = null;
                console.log('✅ Usuário encontrado:', usuario.nome);
                res.json({ success: true, data: usuario });
            }
            return;
        }

        console.log(`🔍 Usuário ${id} não encontrado em usuarios, buscando em profissionais...`);

        const sqlProfissional = isProduction
            ? `SELECT id, nome, email, 'profissional' as role, empresa_id, created_at, telefone, comissao_percent
               FROM profissionais 
               WHERE id = ? AND ativo = TRUE`
            : `SELECT id, nome, email, 'profissional' as role, empresa_id, created_at, telefone, comissao_percent
               FROM profissionais 
               WHERE id = ? AND ativo = true`;

        db.get(sqlProfissional, [id], (err, profissional) => {
            if (err) {
                console.error('❌ Erro ao buscar profissional:', err);
                return res.json({ success: false, message: err.message });
            }

            if (!profissional) {
                console.log(`❌ Usuário ${id} não encontrado em nenhuma tabela`);
                return res.json({ success: false, message: 'Usuário não encontrado' });
            }

            console.log('✅ Profissional encontrado:', profissional.nome);
            res.json({ success: true, data: profissional });
        });
    });
});

// ============================================
// PUT /api/admin/usuarios/:id
// ============================================

router.put('/usuarios/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, email, role, senha, telefone } = req.body;

    console.log(`🔧 Super Admin - Atualizando usuário ${id}:`, { nome, email, role, telefone });

    const sqlCheck = isProduction
        ? `SELECT id, empresa_id, role FROM usuarios WHERE id = ?`
        : `SELECT id, empresa_id, role FROM usuarios WHERE id = ?`;

    db.get(sqlCheck, [id], (err, usuario) => {
        if (err) {
            console.error('❌ Erro ao verificar usuário:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!usuario) {
            return res.json({ success: false, message: 'Usuário não encontrado' });
        }

        let query = isProduction
            ? `UPDATE usuarios SET 
               nome = COALESCE(?, nome), 
               email = COALESCE(?, email),
               role = COALESCE(?, role)`
            : `UPDATE usuarios SET 
               nome = COALESCE(?, nome), 
               email = COALESCE(?, email),
               role = COALESCE(?, role)`;

        let params = [nome || null, email || null, role || null];

        if (telefone !== undefined) {
            const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;
            query += isProduction ? `, telefone = ?` : `, telefone = ?`;
            params.push(telefoneLimpo);
        }

        if (senha && senha.trim() !== '') {
            const senhaHash = bcrypt.hashSync(senha, 10);
            query += isProduction ? `, senha = ?` : `, senha = ?`;
            params.push(senhaHash);
        }

        query += isProduction ? ` WHERE id = ?` : ` WHERE id = ?`;
        params.push(id);

        db.run(query, params, function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar usuário:', err);
                return res.json({ success: false, message: err.message });
            }

            const novaRole = role || usuario.role;
            const empresaId = usuario.empresa_id;
            const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

            if (novaRole === 'dono' && telefoneLimpo && empresaId) {
                console.log(`📝 Atualizando telefone do dono na empresa ${empresaId}: ${telefoneLimpo}`);

                const sqlEmpresa = isProduction
                    ? `UPDATE empresas SET telefone_dono = ? WHERE id = ?`
                    : `UPDATE empresas SET telefone_dono = ? WHERE id = ?`;

                db.run(sqlEmpresa, [telefoneLimpo, empresaId], function (err) {
                    if (err) {
                        console.error('❌ Erro ao atualizar telefone da empresa:', err);
                    } else {
                        console.log(`✅ Telefone do dono atualizado na empresa ${empresaId}: ${telefoneLimpo}`);
                    }
                });
            }

            console.log('✅ Usuário atualizado com sucesso!');
            res.json({
                success: true,
                message: 'Usuário atualizado com sucesso!'
            });
        });
    });
});

// ============================================
// GET /api/admin/faturamento-mensal
// ============================================

router.get('/faturamento-mensal', auth, verificarSuperAdmin, (req, res) => {
    const sql = `
        SELECT 
            ${formatMonthYear('data')} as mes,
            ${coalesceSum('valor')} as total
        FROM agendamentos
        WHERE status = 'concluido'
            AND data >= ${dateInterval('6 months')}
        GROUP BY ${formatMonthYear('data')}
        ORDER BY mes ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar faturamento mensal:', err);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// ============================================
// GET /api/admin/crescimento-empresas
// ============================================

router.get('/crescimento-empresas', auth, verificarSuperAdmin, (req, res) => {
    const sql = `
        SELECT 
            ${formatMonthYear('created_at')} as mes,
            COUNT(*) as total
        FROM empresas
        WHERE created_at >= ${dateInterval('6 months')}
        GROUP BY ${formatMonthYear('created_at')}
        ORDER BY mes ASC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Erro ao buscar crescimento de empresas:', err);
            return res.json({ success: false, message: err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// ============================================
// GET /api/admin/empresas/:id/usuarios
// ============================================

router.get('/empresas/:id/usuarios', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando usuários e profissionais da empresa ${id}...`);

    const ativoCond = isProduction ? 'TRUE' : '1';

    const sql = isProduction
        ? `SELECT 
            'dono' as tipo,
            u.id, 
            u.nome, 
            u.email, 
            u.role, 
            u.created_at,
            u.telefone,
            NULL as comissao_percent,
            u.empresa_id
           FROM usuarios u
           WHERE u.empresa_id = ? AND u.role = 'dono'
           
           UNION ALL
           
           SELECT 
            'profissional' as tipo,
            p.id, 
            p.nome, 
            p.email, 
            'profissional' as role,
            p.created_at,
            p.telefone,
            p.comissao_percent,
            p.empresa_id
           FROM profissionais p
           WHERE p.empresa_id = ? AND p.ativo = ${ativoCond}
           
           ORDER BY tipo, nome`
        : `SELECT 
            'dono' as tipo,
            u.id, 
            u.nome, 
            u.email, 
            u.role, 
            u.created_at,
            u.telefone,
            NULL as comissao_percent,
            u.empresa_id
           FROM usuarios u
           WHERE u.empresa_id = ? AND u.role = 'dono'
           
           UNION ALL
           
           SELECT 
            'profissional' as tipo,
            p.id, 
            p.nome, 
            p.email, 
            'profissional' as role,
            p.created_at,
            p.telefone,
            p.comissao_percent,
            p.empresa_id
           FROM profissionais p
           WHERE p.empresa_id = ? AND p.ativo = true
           
           ORDER BY tipo, nome`;

    db.all(sql, [id, id], (err, usuarios) => {
        if (err) {
            console.error('❌ Erro ao buscar usuários e profissionais:', err);
            return res.json({ success: false, message: err.message });
        }

        const dadosFormatados = usuarios.map(u => {
            const { senha, ...rest } = u;
            return {
                ...rest,
                telefone: u.telefone || '-',
                comissao_percent: u.tipo === 'dono' ? null : (u.comissao_percent || 0)
            };
        });

        console.log(`✅ ${dadosFormatados.length} usuários/profissionais encontrados`);
        console.log(`   - Donos: ${dadosFormatados.filter(u => u.tipo === 'dono').length}`);
        console.log(`   - Profissionais: ${dadosFormatados.filter(u => u.tipo === 'profissional').length}`);

        res.json({ success: true, data: dadosFormatados });
    });
});

// ============================================
// GET /api/admin/empresas/:id/acessos
// ============================================

router.get('/empresas/:id/acessos', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando acessos da empresa ${id}...`);

    const sql = isProduction
        ? `SELECT a.*, u.nome as usuario_nome
           FROM acessos a
           LEFT JOIN usuarios u ON a.usuario_id = u.id
           WHERE a.empresa_id = ?
           ORDER BY a.data_acesso DESC
           LIMIT 50`
        : `SELECT a.*, u.nome as usuario_nome
           FROM acessos a
           LEFT JOIN usuarios u ON a.usuario_id = u.id
           WHERE a.empresa_id = ?
           ORDER BY a.data_acesso DESC
           LIMIT 50`;

    db.all(sql, [id], (err, acessos) => {
        if (err) {
            console.error('❌ Erro ao buscar acessos:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log(`✅ ${acessos.length} acessos encontrados`);
        res.json({ success: true, data: acessos });
    });
});

// ============================================
// GET /api/admin/empresas/:id/clientes - USANDO BANCO DA EMPRESA
// ============================================

router.get('/empresas/:id/clientes', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando clientes da empresa ${id}...`);

    const empresaDb = getEmpresaDb(id);
    if (!empresaDb) {
        return res.status(404).json({ 
            success: false, 
            message: 'Banco da empresa não encontrado' 
        });
    }

    const sql = "SELECT id, nome, telefone, email, created_at, bloqueado_chatbot FROM clientes ORDER BY nome";

    empresaDb.all(sql, [], (err, clientes) => {
        if (err) {
            console.error('❌ Erro ao buscar clientes:', err);
            return res.status(500).json({ success: false, message: err.message });
        }
        console.log(`✅ ${clientes?.length || 0} clientes encontrados`);
        res.json({ success: true, data: clientes || [] });
    });
});

// ============================================
// GET /api/admin/empresas/:id/agendamentos - USANDO BANCO DA EMPRESA
// ============================================

router.get('/empresas/:id/agendamentos', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando agendamentos da empresa ${id}...`);

    // 🔥 USAR O BANCO DA EMPRESA (getEmpresaDb)
    const empresaDb = getEmpresaDb(id);
    if (!empresaDb) {
        return res.status(404).json({ 
            success: false, 
            message: 'Banco da empresa não encontrado' 
        });
    }

    const sql = `
        SELECT 
            a.*,
            c.nome as cliente_nome,
            s.nome as servico_nome,
            p.nome as profissional_nome
        FROM agendamentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN servicos s ON a.servico_id = s.id
        LEFT JOIN profissionais p ON a.profissional_id = p.id
        ORDER BY a.data DESC, a.hora DESC
    `;

    empresaDb.all(sql, [], (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos:', err);
            return res.status(500).json({ 
                success: false, 
                message: err.message 
            });
        }

        console.log(`✅ ${agendamentos?.length || 0} agendamentos encontrados para empresa ${id}`);
        res.json({ 
            success: true, 
            data: agendamentos || [] 
        });
    });
});

// ============================================
// POST /api/admin/empresas/:id/extender-trial
// ============================================

router.post('/empresas/:id/extender-trial', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔧 Super Admin - Estendendo trial da empresa ${id}...`);

    const dataTrialExpira = new Date();
    dataTrialExpira.setDate(dataTrialExpira.getDate() + 45);
    const dataStr = dataTrialExpira.toISOString().split('T')[0];

    const sql = isProduction
        ? `UPDATE empresas SET trial_expira = ?, assinatura_ativa = 0, plano = 'trial' WHERE id = ?`
        : `UPDATE empresas SET trial_expira = ?, assinatura_ativa = 0, plano = 'trial' WHERE id = ?`;

    db.run(sql, [dataStr, id], function (err) {
        if (err) {
            console.error('❌ Erro ao estender trial:', err);
            return res.json({ success: false, message: 'Erro ao estender trial' });
        }

        console.log(`✅ Trial estendido até ${dataStr}`);
        res.json({
            success: true,
            message: `Trial estendido por mais 45 dias! Nova data: ${dataTrialExpira.toLocaleDateString('pt-BR')}`,
            data: { nova_data: dataStr }
        });
    });
});

// ============================================
// GET /api/admin/empresas/estatisticas
// ============================================

router.get('/empresas/estatisticas', auth, verificarSuperAdmin, (req, res) => {
    console.log('🔍 Super Admin - Buscando empresas com estatísticas...');

    const sqlEmpresas = isProduction
        ? `SELECT * FROM empresas ORDER BY created_at DESC`
        : `SELECT * FROM empresas ORDER BY created_at DESC`;

    db.all(sqlEmpresas, [], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao buscar empresas:', err);
            return res.json({ success: false, message: err.message });
        }

        console.log(`📊 ${empresas.length} empresas encontradas`);

        const promises = empresas.map((e) => {
            return new Promise((resolve) => {
                const sqlUsuarios = isProduction
                    ? `SELECT COUNT(*) as total FROM usuarios WHERE empresa_id = ?`
                    : `SELECT COUNT(*) as total FROM usuarios WHERE empresa_id = ?`;

                db.get(sqlUsuarios, [e.id], (err, usuarios) => {
                    const sqlProfissionais = isProduction
                        ? `SELECT COUNT(*) as total FROM profissionais WHERE empresa_id = ? AND ativo = true`
                        : `SELECT COUNT(*) as total FROM profissionais WHERE empresa_id = ? AND ativo = true`;

                    db.get(sqlProfissionais, [e.id], (err, profissionais) => {
                        const sqlClientes = isProduction
                            ? `SELECT COUNT(*) as total FROM clientes WHERE empresa_id = ?`
                            : `SELECT COUNT(*) as total FROM clientes WHERE empresa_id = ?`;

                        db.get(sqlClientes, [e.id], (err, clientes) => {
                            const sqlAgendamentos = isProduction
                                ? `SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?`
                                : `SELECT COUNT(*) as total FROM agendamentos WHERE empresa_id = ?`;

                            db.get(sqlAgendamentos, [e.id], (err, agendamentos) => {
                                const sqlAcessos = isProduction
                                    ? `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = ?`
                                    : `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = ?`;

                                db.get(sqlAcessos, [e.id], (err, acessos) => {
                                    const sqlUltimoAcesso = isProduction
                                        ? `SELECT data_acesso FROM acessos WHERE empresa_id = ? ORDER BY data_acesso DESC LIMIT 1`
                                        : `SELECT data_acesso FROM acessos WHERE empresa_id = ? ORDER BY data_acesso DESC LIMIT 1`;

                                    db.get(sqlUltimoAcesso, [e.id], (err, ultimoAcesso) => {
                                        const sqlAcessosHoje = isProduction
                                            ? `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = ? AND DATE(data_acesso) = CURRENT_DATE`
                                            : `SELECT COUNT(*) as total FROM acessos WHERE empresa_id = ? AND DATE(data_acesso) = DATE('now')`;

                                        db.get(sqlAcessosHoje, [e.id], (err, acessosHoje) => {
                                            let diasRestantes = null;
                                            if (e.plano === 'trial' && e.trial_expira) {
                                                const hoje = new Date();
                                                const expira = new Date(e.trial_expira);
                                                diasRestantes = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
                                            }

                                            resolve({
                                                ...e,
                                                total_usuarios: usuarios?.total || 0,
                                                total_profissionais: profissionais?.total || 0,
                                                total_clientes: clientes?.total || 0,
                                                total_agendamentos: agendamentos?.total || 0,
                                                total_acessos: acessos?.total || 0,
                                                ultimo_acesso: ultimoAcesso?.data_acesso || null,
                                                acessos_hoje: acessosHoje?.total || 0,
                                                dias_restantes_trial: diasRestantes,
                                                ultimo_acesso_formatado: ultimoAcesso?.data_acesso ?
                                                    new Date(ultimoAcesso.data_acesso).toLocaleString('pt-BR') : 'Nunca'
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        Promise.all(promises).then((empresasCompletas) => {
            console.log(`✅ ${empresasCompletas.length} empresas com estatísticas carregadas`);
            res.json({ success: true, data: empresasCompletas });
        });
    });
});

// ============================================
// GET /api/admin/empresas/:id - CORRIGIDO
// ============================================

router.get('/empresas/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando empresa ${id}...`);

    // 🔥 BUSCAR DADOS DA EMPRESA COM CONTAGENS CORRETAS
    const sql = isProduction
        ? `SELECT 
            e.id,
            e.nome,
            e.plano,
            e.trial_expira,
            e.assinatura_valida_ate,
            e.whatsapp_proprio_habilitado,
            e.whatsapp_instance,
            e.whatsapp_connected,
            e.telefone_dono,
            e.endereco,
            u.nome as dono_nome,
            u.email as dono_email,
            (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
            (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos,
            (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'pendente') as agendamentos_pendentes,
            (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'concluido') as agendamentos_concluidos,
            (SELECT COALESCE(SUM(COALESCE(valor_total, valor, 0)), 0) FROM agendamentos WHERE empresa_id = e.id AND status = 'concluido') as faturamento_total,
            (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'dono') as total_donos,
            (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'profissional') as total_profissionais
        FROM empresas e
        LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
        WHERE e.id = ?`
        : `SELECT 
            e.id,
            e.nome,
            e.plano,
            e.trial_expira,
            e.assinatura_valida_ate,
            e.whatsapp_proprio_habilitado,
            e.whatsapp_instance,
            e.whatsapp_connected,
            e.telefone_dono,
            e.endereco,
            u.nome as dono_nome,
            u.email as dono_email,
            (SELECT COUNT(*) FROM clientes WHERE empresa_id = e.id) as total_clientes,
            (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id) as total_agendamentos,
            (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'pendente') as agendamentos_pendentes,
            (SELECT COUNT(*) FROM agendamentos WHERE empresa_id = e.id AND status = 'concluido') as agendamentos_concluidos,
            (SELECT COALESCE(SUM(COALESCE(valor_total, valor, 0)), 0) FROM agendamentos WHERE empresa_id = e.id AND status = 'concluido') as faturamento_total,
            (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'dono') as total_donos,
            (SELECT COUNT(*) FROM usuarios WHERE empresa_id = e.id AND role = 'profissional') as total_profissionais
        FROM empresas e
        LEFT JOIN usuarios u ON u.empresa_id = e.id AND u.role = 'dono'
        WHERE e.id = ?`;

    db.get(sql, [id], (err, empresa) => {
        if (err) {
            console.error('❌ Erro ao buscar empresa:', err);
            return res.status(500).json({
                success: false,
                message: err.message
            });
        }

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        console.log(`✅ Empresa encontrada: ${empresa.nome}`);
        console.log(`📊 Clientes: ${empresa.total_clientes || 0}`);
        console.log(`📊 Agendamentos: ${empresa.total_agendamentos || 0}`);
        console.log(`💰 Faturamento: R$ ${empresa.faturamento_total || 0}`);

        res.json({
            success: true,
            data: empresa
        });
    });
});

// ============================================
// PUT /api/admin/profissionais/:id
// ============================================

router.put('/profissionais/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, comissao_percent, telefone, ativo } = req.body;

    console.log(`🔧 Super Admin - Atualizando profissional ${id}:`, { nome, email, comissao_percent });

    const sqlCheck = isProduction
        ? `SELECT id, empresa_id FROM profissionais WHERE id = ?`
        : `SELECT id, empresa_id FROM profissionais WHERE id = ?`;

    db.get(sqlCheck, [id], (err, profissional) => {
        if (err) {
            console.error('❌ Erro ao verificar profissional:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!profissional) {
            console.log(`❌ Profissional ID ${id} não encontrado`);
            return res.json({ success: false, message: 'Profissional não encontrado' });
        }

        let query = isProduction
            ? `UPDATE profissionais SET 
               nome = COALESCE(?, nome), 
               email = COALESCE(?, email)`
            : `UPDATE profissionais SET 
               nome = COALESCE(?, nome), 
               email = COALESCE(?, email)`;

        let params = [nome || null, email || null];

        if (comissao_percent !== undefined && comissao_percent !== null && comissao_percent !== '') {
            query += isProduction ? `, comissao_percent = ?` : `, comissao_percent = ?`;
            params.push(parseFloat(comissao_percent));
        }

        if (telefone !== undefined) {
            const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;
            query += isProduction ? `, telefone = ?` : `, telefone = ?`;
            params.push(telefoneLimpo);
        }

        if (ativo !== undefined && ativo !== null) {
            query += isProduction ? `, ativo = ?` : `, ativo = ?`;
            params.push(ativo ? 1 : 0);
        }

        if (senha && senha.trim() !== '') {
            const senhaHash = bcrypt.hashSync(senha, 10);
            query += isProduction ? `, senha = ?` : `, senha = ?`;
            params.push(senhaHash);
        }

        query += isProduction ? ` WHERE id = ?` : ` WHERE id = ?`;
        params.push(id);

        db.run(query, params, function (err) {
            if (err) {
                console.error('❌ Erro ao atualizar profissional:', err);
                return res.json({ success: false, message: err.message });
            }

            console.log(`✅ Profissional ${id} atualizado com sucesso!`);
            res.json({
                success: true,
                message: 'Profissional atualizado com sucesso!'
            });
        });
    });
});

// ============================================
// GET /api/admin/profissionais/:id
// ============================================

router.get('/profissionais/:id', auth, verificarSuperAdmin, (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Super Admin - Buscando profissional ${id}...`);

    const ativoCond = isProduction ? 'TRUE' : '1';

    const sql = isProduction
        ? `SELECT id, nome, email, comissao_percent, telefone, ativo, empresa_id, created_at 
           FROM profissionais 
           WHERE id = ? AND ativo = ${ativoCond}`
        : `SELECT id, nome, email, comissao_percent, telefone, ativo, empresa_id, created_at 
           FROM profissionais 
           WHERE id = ? AND ativo = true`;

    db.get(sql, [id], (err, profissional) => {
        if (err) {
            console.error('❌ Erro ao buscar profissional:', err);
            return res.json({ success: false, message: err.message });
        }

        if (!profissional) {
            console.log(`❌ Profissional ID ${id} não encontrado`);
            return res.json({ success: false, message: 'Profissional não encontrado' });
        }

        profissional.role = 'profissional';

        console.log(`✅ Profissional encontrado: ${profissional.nome} (ID: ${profissional.id})`);
        res.json({ success: true, data: profissional });
    });
});

// ============================================
// GET /api/admin/acessos
// ============================================

router.get('/acessos', auth, verificarSuperAdmin, (req, res) => {
    const sql = isProduction
        ? `SELECT 
            COUNT(*) as total_acessos,
            COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
            COUNT(DISTINCT empresa_id) as total_empresas_ativas,
            date(data_acesso) as data
           FROM acessos
           WHERE data_acesso >= datetime('now', '-30 days')
           GROUP BY date(data_acesso)
           ORDER BY data DESC`
        : `SELECT 
            COUNT(*) as total_acessos,
            COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
            COUNT(DISTINCT empresa_id) as total_empresas_ativas,
            date(data_acesso) as data
           FROM acessos
           WHERE data_acesso >= datetime('now', '-30 days')
           GROUP BY date(data_acesso)
           ORDER BY data DESC`;

    db.all(sql, [], (err, acessos) => {
        if (err) {
            console.error('❌ Erro ao buscar acessos:', err);
            return res.json({ success: false, message: err.message });
        }

        const sqlTotais = isProduction
            ? `SELECT 
                COUNT(*) as total_acessos,
                COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
                COUNT(DISTINCT empresa_id) as total_empresas_ativas
               FROM acessos
               WHERE data_acesso >= datetime('now', '-30 days')`
            : `SELECT 
                COUNT(*) as total_acessos,
                COUNT(DISTINCT usuario_id) as total_usuarios_ativos,
                COUNT(DISTINCT empresa_id) as total_empresas_ativas
               FROM acessos
               WHERE data_acesso >= datetime('now', '-30 days')`;

        db.get(sqlTotais, [], (err, totais) => {
            if (err) {
                console.error('❌ Erro ao buscar totais de acessos:', err);
                return res.json({ success: false, message: err.message });
            }

            res.json({
                success: true,
                data: {
                    ultimos_30_dias: acessos || [],
                    totais: totais || { total_acessos: 0, total_usuarios_ativos: 0, total_empresas_ativas: 0 }
                }
            });
        });
    });
});

// ============================================
// GET /api/admin/planos-config
// ============================================

router.get('/planos-config', auth, verificarSuperAdmin, (req, res) => {
    try {
        const planos = require('../utils/constants').PLANOS;
        res.json({ success: true, data: planos });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ============================================
// PUT /api/admin/planos-config
// ============================================

router.put('/planos-config', auth, verificarSuperAdmin, (req, res) => {
    try {
        const plano = req.body;
        if (!plano.id || !plano.nome || !plano.valor_mensal) {
            return res.json({ success: false, message: 'Dados incompletos' });
        }
        res.json({ success: true, message: 'Plano atualizado!' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ============================================
// POST /api/admin/registrar-acesso
// ============================================

router.post('/registrar-acesso', auth, (req, res) => {
    const usuario_id = req.usuario.id;
    const empresa_id = req.usuario.empresa_id || null;
    const ip = req.ip || req.connection.remoteAddress || null;
    const user_agent = req.headers['user-agent'] || null;

    const sql = isProduction
        ? `INSERT INTO acessos (usuario_id, empresa_id, ip, user_agent) VALUES (?, ?, ?, ?)`
        : `INSERT INTO acessos (usuario_id, empresa_id, ip, user_agent) VALUES (?, ?, ?, ?)`;

    db.run(sql, [usuario_id, empresa_id, ip, user_agent], (err) => {
        if (err) {
            console.error('❌ Erro ao registrar acesso:', err);
        }
        res.json({ success: true });
    });
});

// ============================================
// PUT /api/admin/empresas/:id/whatsapp-proprio
// ============================================

router.put('/empresas/:id/whatsapp-proprio', auth, verificarSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { habilitado } = req.body;

    console.log(`🔧 Super Admin - Alternando WhatsApp próprio da empresa ${id}:`, habilitado ? 'HABILITAR' : 'DESABILITAR');

    try {
        // Buscar empresa
        const empresa = await new Promise((resolve, reject) => {
            const sql = isProduction
                ? 'SELECT id, nome FROM empresas WHERE id = ?'
                : 'SELECT id, nome FROM empresas WHERE id = ?';
            db.get(sql, [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!empresa) {
            return res.status(404).json({
                success: false,
                message: 'Empresa não encontrada'
            });
        }

        // Atualizar WhatsApp próprio
        const sqlUpdate = isProduction
            ? `UPDATE empresas SET whatsapp_proprio_habilitado = ? WHERE id = ?`
            : `UPDATE empresas SET whatsapp_proprio_habilitado = ? WHERE id = ?`;

        await new Promise((resolve, reject) => {
            db.run(sqlUpdate, [habilitado ? 1 : 0, id], function (err) {
                if (err) reject(err);
                resolve(this);
            });
        });

        // Se habilitou, criar instância
        if (habilitado) {
            try {
                const evolution = require('../services/evolution-instances');
                const instanceName = `emp-${id}-${empresa.nome.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                await evolution.criarInstancia(instanceName);
                console.log(`✅ Instância ${instanceName} criada para empresa ${id}`);
            } catch (e) {
                console.error('❌ Erro ao criar instância:', e.message);
                // Não falha a requisição, só loga o erro
            }
        }

        res.json({
            success: true,
            message: habilitado ? 'WhatsApp próprio habilitado!' : 'WhatsApp próprio desabilitado!'
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;