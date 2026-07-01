// ============================================
// SCRIPT PARA POPULAR BANCO DE DADOS (TESTE)
// ============================================

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, inserirHorariosPadrao } = require('../server/config/database');

console.log('🌱 Iniciando seed do banco de dados...');

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

// Função para executar queries com Promise (usando o wrapper do db)
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err, result) {
            if (err) {
                reject(err);
            } else {
                // O resultado pode vir como { lastID, id } ou um objeto com o ID
                resolve(result || this);
            }
        });
    });
}

// Função para executar queries de SELECT com Promise
function getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Função principal
async function runSeed() {
    try {
        console.log('📦 Verificando se já existem dados...');

        // 1. Verificar se já existe uma empresa
        const empresaExistente = await getQuery('SELECT id FROM empresas LIMIT 1');

        if (empresaExistente) {
            console.log('ℹ️ Dados já existentes. Pulando seed.');
            process.exit(0);
        }

        console.log('📦 Criando dados de teste...');

        // 2. Criar empresa
        const trialExpira = new Date();
        trialExpira.setDate(trialExpira.getDate() + 45);
        const trialData = trialExpira.toISOString().split('T')[0];

        const sqlEmpresa = isProduction
            ? `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
               VALUES ($1, $2, $3, $4, $5) RETURNING id`
            : `INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, assinatura_ativa) 
               VALUES (?, ?, ?, ?, ?)`;

        // Executar a query e capturar o resultado
        const resultEmpresa = await runQuery(sqlEmpresa, ['Barbearia Teste', 'trial', 1, trialData, 1]);

        // Extrair o ID do resultado (funciona para PostgreSQL e SQLite)
        let empresaId = null;
        if (resultEmpresa) {
            // Para PostgreSQL: o ID pode vir em resultEmpresa.id ou resultEmpresa.lastID
            // Para SQLite: o ID pode vir em resultEmpresa.lastID
            empresaId = resultEmpresa.id || resultEmpresa.lastID || null;
        }

        // Se não veio no resultado, buscar o ID da empresa pelo nome
        if (!empresaId) {
            console.log('⚠️ ID não retornado na inserção. Buscando pelo nome...');
            const empresa = await getQuery('SELECT id FROM empresas WHERE nome = ?', ['Barbearia Teste']);
            if (empresa) {
                empresaId = empresa.id;
            }
        }

        if (!empresaId) {
            console.error('❌ Erro ao criar empresa: ID não encontrado');
            process.exit(1);
        }

        console.log(`✅ Empresa criada: ID ${empresaId}`);

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

        await runQuery(sqlUsuario, ['Admin Teste', 'admin@teste.com', senhaHash, 'dono', empresaId]);
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

        for (const [nome, descricao, valor, duracao] of servicos) {
            const sqlServico = isProduction
                ? `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
                   VALUES ($1, $2, $3, $4, $5, $6)`
                : `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
                   VALUES (?, ?, ?, ?, ?, ?)`;

            try {
                await runQuery(sqlServico, [nome, descricao, valor, duracao, 1, empresaId]);
                servicosCriados++;
                console.log(`✅ Serviço criado: ${nome}`);
            } catch (err) {
                console.error(`❌ Erro ao criar serviço ${nome}:`, err.message);
            }
        }

        console.log(`✅ ${servicosCriados} serviços criados`);
        console.log('✅ Seed concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao executar seed:', error.message);
        process.exit(1);
    } finally {
        // Fechar conexão
        setTimeout(() => {
            if (db.pool) {
                db.pool.end();
            } else if (db.close) {
                db.close();
            }
            console.log('🔒 Conexão fechada.');
            process.exit(0);
        }, 1000);
    }
}

// Executar
runSeed();