// ============================================
// SCRIPT PARA POPULAR BANCO DE DADOS (TESTE)
// ============================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, inserirHorariosPadrao } = require('../server/config/database');

console.log('🌱 Iniciando seed do banco de dados...');

// Função para verificar se já existem dados
function verificarDadosExistentes() {
    return new Promise((resolve) => {
        const sql = 'SELECT COUNT(*) as total FROM empresas';
        db.get(sql, [], (err, result) => {
            if (err) {
                console.error('❌ Erro ao verificar dados:', err.message);
                resolve(0);
            } else {
                resolve(result?.total || 0);
            }
        });
    });
}

// Função para criar dados de teste
async function criarDadosTeste() {
    console.log('📦 Criando dados de teste...');

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    return new Promise((resolve) => {
        // 1. Verificar se empresa já existe
        db.get('SELECT id FROM empresas WHERE nome = ?', ['Barbearia Teste'], (err, empresaExistente) => {
            if (err) {
                console.error('❌ Erro ao verificar empresa:', err.message);
                resolve(false);
                return;
            }

            if (empresaExistente) {
                console.log('ℹ️ Empresa já existe. Pulando criação.');
                resolve(true);
                return;
            }

            // 2. Criar empresa
            const trialExpira = new Date();
            trialExpira.setDate(trialExpira.getDate() + 45);
            const trialData = trialExpira.toISOString().split('T')[0];

            const sql = isProduction
                ? `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING id`
                : `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
                   VALUES (?, ?, ?, ?, ?)`;

            const params = ['Barbearia Teste', 'trial', 1, trialData, 1];

            console.log('📝 Query SQL:', sql);
            console.log('📝 Parâmetros:', params);

            db.run(sql, params, function (err) {
                if (err) {
                    console.error('❌ Erro ao criar empresa:', err.message);
                    resolve(false);
                    return;
                }

                // Pegar o ID (funciona para SQLite e PostgreSQL)
                let empresaId = this?.lastID || this?.id || null;

                // Se não veio no callback, buscar
                if (!empresaId) {
                    db.get('SELECT id FROM empresas WHERE nome = ?', ['Barbearia Teste'], (err, row) => {
                        if (err || !row) {
                            console.error('❌ Erro ao buscar ID da empresa');
                            resolve(false);
                            return;
                        }
                        empresaId = row.id;
                        criarDados(empresaId, resolve);
                    });
                    return;
                }

                criarDados(empresaId, resolve);
            });
        });
    });
}

function criarDados(empresaId, resolve) {
    console.log(`✅ Empresa criada: ID ${empresaId}`);

    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

    // 3. Criar horários padrão
    inserirHorariosPadrao(empresaId);
    console.log('✅ Horários padrão criados');

    // 4. Criar usuário dono
    const senhaHash = bcrypt.hashSync('123456', 10);

    const sqlUsuario = isProduction
        ? `INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
           VALUES ($1, $2, $3, $4, $5)`
        : `INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
           VALUES (?, ?, ?, ?, ?)`;

    db.run(sqlUsuario, ['Admin Teste', 'admin@teste.com', senhaHash, 'dono', empresaId], function (err) {
        if (err) {
            console.error('❌ Erro ao criar usuário:', err.message);
            resolve(false);
            return;
        }
        console.log('✅ Usuário dono criado: admin@teste.com / 123456');

        // 5. Criar serviços
        const servicos = [
            ['Corte de Cabelo', 'Corte tradicional', 45.00, 30],
            ['Barba', 'Barba completa', 35.00, 20],
            ['Corte + Barba', 'Combo completo', 70.00, 50],
            ['Platinado', 'Descoloração e tonalização', 120.00, 90],
            ['Sobrancelha', 'Design de sobrancelha', 25.00, 15]
        ];

        let servicosCriados = 0;

        servicos.forEach(([nome, descricao, valor, duracao]) => {
            const sqlServico = isProduction
                ? `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
                   VALUES ($1, $2, $3, $4, $5, $6)`
                : `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
                   VALUES (?, ?, ?, ?, ?, ?)`;

            db.run(sqlServico, [nome, descricao, valor, duracao, 1, empresaId], function (err) {
                if (err) {
                    console.error(`❌ Erro ao criar serviço ${nome}:`, err.message);
                } else {
                    servicosCriados++;
                    console.log(`✅ Serviço criado: ${nome}`);
                }
            });
        });

        // Aguardar um pouco para garantir que todos os serviços foram criados
        setTimeout(() => {
            console.log(`✅ ${servicosCriados} serviços criados`);
            resolve(true);
        }, 1000);
    });
}

// Executar seed
async function runSeed() {
    const total = await verificarDadosExistentes();

    if (total > 0) {
        console.log('ℹ️ Dados já existentes. Pulando seed.');
        process.exit(0);
    }

    const success = await criarDadosTeste();

    if (success) {
        console.log('✅ Seed concluído com sucesso!');
    } else {
        console.error('❌ Erro ao executar seed.');
    }

    // Fechar conexão
    setTimeout(() => {
        if (db.pool) {
            db.pool.end();
        } else if (db.close) {
            db.close();
        }
        console.log('🔒 Conexão fechada.');
        process.exit(success ? 0 : 1);
    }, 2000);
}

runSeed();