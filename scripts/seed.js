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
        db.get('SELECT COUNT(*) as total FROM empresas', (err, result) => {
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

    // 1. Criar empresa
    const trialExpira = new Date();
    trialExpira.setDate(trialExpira.getDate() + 45);
    const trialData = trialExpira.toISOString().split('T')[0];

    return new Promise((resolve) => {
        db.run(`INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
                VALUES (?, 'trial', 1, ?, 1)`,
            ['Barbearia Teste', trialData],
            function (err) {
                if (err) {
                    console.error('❌ Erro ao criar empresa:', err.message);
                    resolve(false);
                    return;
                }

                const empresaId = this.lastID;
                console.log(`✅ Empresa criada: ID ${empresaId}`);

                // 2. Criar horários padrão
                inserirHorariosPadrao(empresaId);
                console.log('✅ Horários padrão criados');

                // 3. Criar usuário dono
                const senhaHash = bcrypt.hashSync('123456', 10);
                db.run(`INSERT INTO usuarios (nome, email, senha, role, empresa_id) 
                        VALUES (?, ?, ?, 'dono', ?)`,
                    ['Admin Teste', 'admin@teste.com', senhaHash, empresaId],
                    function (err) {
                        if (err) {
                            console.error('❌ Erro ao criar usuário:', err.message);
                            resolve(false);
                            return;
                        }
                        console.log('✅ Usuário dono criado: admin@teste.com / 123456');

                        // 4. Criar serviços
                        const servicos = [
                            ['Corte de Cabelo', 'Corte tradicional', 45.00, 30],
                            ['Barba', 'Barba completa', 35.00, 20],
                            ['Corte + Barba', 'Combo completo', 70.00, 50],
                            ['Platinado', 'Descoloração e tonalização', 120.00, 90],
                            ['Sobrancelha', 'Design de sobrancelha', 25.00, 15]
                        ];

                        let servicosCriados = 0;
                        servicos.forEach(([nome, descricao, valor, duracao]) => {
                            db.run(`INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
                                    VALUES (?, ?, ?, ?, 1, ?)`,
                                [nome, descricao, valor, duracao, empresaId],
                                function (err) {
                                    if (err) {
                                        console.error(`❌ Erro ao criar serviço ${nome}:`, err.message);
                                    } else {
                                        servicosCriados++;
                                        console.log(`✅ Serviço criado: ${nome}`);
                                    }
                                });
                        });

                        console.log(`✅ ${servicosCriados} serviços criados`);
                        resolve(true);
                    });
            });
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
        } else {
            db.close();
        }
        console.log('🔒 Conexão fechada.');
        process.exit(success ? 0 : 1);
    }, 2000);
}

runSeed();