// ============================================
// SCRIPT: SEED DE SERVIÇOS (CORRIGIDO)
// ============================================

const dbModule = require('../server/config/database');

// 🔥 PEGA O DB CORRETAMENTE (pode estar em dbModule ou dbModule.db)
const db = dbModule.db || dbModule;

// ============================================
// FUNÇÕES AUXILIARES COM PROMISES
// ============================================
function queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        // Tenta usar db.all, se não existir, tenta db.query
        if (typeof db.all === 'function') {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        } else if (typeof db.query === 'function') {
            // Para PostgreSQL
            db.query(sql, params)
                .then(result => resolve(result.rows))
                .catch(reject);
        } else if (typeof db.get === 'function') {
            // Fallback para db.get
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row ? [row] : []);
            });
        } else {
            reject(new Error('Nenhum método de query encontrado no db'));
        }
    });
}

function queryRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (typeof db.run === 'function') {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this?.lastID || null, changes: this?.changes || 0 });
            });
        } else if (typeof db.query === 'function') {
            // Para PostgreSQL
            db.query(sql, params)
                .then(result => resolve({ lastID: result.rows[0]?.id || null, changes: result.rowCount || 0 }))
                .catch(reject);
        } else {
            reject(new Error('Nenhum método run encontrado no db'));
        }
    });
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================
async function seedServicos() {
    try {
        console.log('🔍 Verificando conexão com o banco...');
        console.log('📦 db disponível:', typeof db);
        console.log('📦 Métodos disponíveis:', Object.keys(db).filter(k => typeof db[k] === 'function'));

        // 1. Buscar empresas
        console.log('🔍 Buscando empresas...');
        const empresas = await queryAll('SELECT id, nome FROM empresas');

        if (!empresas || empresas.length === 0) {
            console.log('❌ Nenhuma empresa encontrada. Criando uma empresa padrão...');

            // Criar empresa padrão
            await queryRun(
                `INSERT INTO empresas (nome, plano, assinatura_ativa, trial_expira) 
                 VALUES (?, ?, ?, datetime('now', '+45 days'))`,
                ['Barbearia Teste', 'trial', 1]
            );

            const novasEmpresas = await queryAll('SELECT id, nome FROM empresas');
            if (novasEmpresas.length === 0) {
                console.log('❌ Não foi possível criar a empresa.');
                return;
            }
            empresas.push(novasEmpresas[0]);
        }

        console.log(`✅ ${empresas.length} empresa(s) encontrada(s):`);
        empresas.forEach(e => console.log(`  - ${e.nome} (ID: ${e.id})`));

        // 2. Serviços de exemplo
        const servicosExemplo = [
            { nome: 'Corte Masculino', descricao: 'Corte completo com tesoura e máquina', valor: 45.00, duracao: 30 },
            { nome: 'Barba', descricao: 'Barba com navalha e toalha quente', valor: 30.00, duracao: 20 },
            { nome: 'Corte + Barba', descricao: 'Pacote completo de corte e barba', valor: 70.00, duracao: 50 },
            { nome: 'Platinado', descricao: 'Descoloração e tonalização', valor: 120.00, duracao: 90 },
            { nome: 'Pezinho', descricao: 'Acabamento com navalha', valor: 20.00, duracao: 15 },
            { nome: 'Hidratação', descricao: 'Tratamento capilar profundo', valor: 50.00, duracao: 40 },
            { nome: 'Sobrancelha', descricao: 'Design e correção', valor: 25.00, duracao: 15 },
            { nome: 'Barba + Sobrancelha', descricao: 'Pacote completo de barba e sobrancelha', valor: 50.00, duracao: 35 }
        ];

        // 3. Para cada empresa, verificar e adicionar serviços
        for (const empresa of empresas) {
            console.log(`\n📋 Processando empresa: ${empresa.nome} (ID: ${empresa.id})`);

            // Verificar se já tem serviços
            const servicosExistentes = await queryAll(
                'SELECT id, nome FROM servicos WHERE empresa_id = ?',
                [empresa.id]
            );

            if (servicosExistentes.length > 0) {
                console.log(`  ✅ Já tem ${servicosExistentes.length} serviços. Pulando.`);
                servicosExistentes.forEach(s => console.log(`    - ${s.nome}`));
                continue;
            }

            console.log(`  📝 Adicionando ${servicosExemplo.length} serviços...`);

            let adicionados = 0;
            for (const s of servicosExemplo) {
                try {
                    await queryRun(
                        `INSERT INTO servicos (nome, descricao, valor, duracao, ativo, empresa_id) 
                         VALUES (?, ?, ?, ?, 1, ?)`,
                        [s.nome, s.descricao, s.valor, s.duracao, empresa.id]
                    );
                    console.log(`    ✅ ${s.nome} - R$ ${s.valor}`);
                    adicionados++;
                } catch (err) {
                    console.log(`    ❌ Erro ao adicionar ${s.nome}:`, err.message);
                }
            }

            console.log(`  ✅ ${adicionados} serviços adicionados com sucesso!`);
        }

        // 4. Verificar resultado final
        console.log('\n📊 RESUMO FINAL:');
        for (const empresa of empresas) {
            const servicos = await queryAll(
                'SELECT id, nome, valor FROM servicos WHERE empresa_id = ?',
                [empresa.id]
            );
            console.log(`  🏢 ${empresa.nome}: ${servicos.length} serviços`);
            servicos.forEach(s => console.log(`    - ${s.nome}: R$ ${s.valor}`));
        }

        console.log('\n🎉 Seed de serviços concluído com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao executar seed:', error);
        console.error('📚 Stack:', error.stack);
    }
}

// ============================================
// EXECUTAR
// ============================================
seedServicos();