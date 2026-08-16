const { Pool } = require('pg');

// Configuração dos bancos
const origem = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende_dev?sslmode=disable'
});

const destino = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

async function migrar() {
  try {
    console.log('🔄 Iniciando migração dos dados do Sandro...\n');

    // 1. Buscar empresa Studio Sandro no destino
    const empresaDestino = await destino.query(
      'SELECT id FROM empresas WHERE nome ILIKE $1',
      ['%studio sandro%']
    );

    if (empresaDestino.rows.length === 0) {
      console.log('❌ Empresa Studio Sandro não encontrada no destino!');
      console.log('   Criando empresa...');

      await destino.query(
        'INSERT INTO empresas (nome, plano, limite_profissionais, trial_expira, created_at) VALUES ($1, $2, $3, $4, $5)',
        ['Studio Sandro matias', 'pro', 5, new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), new Date()]
      );

      const novaEmpresa = await destino.query(
        'SELECT id FROM empresas WHERE nome ILIKE $1',
        ['%studio sandro%']
      );
      empresaId = novaEmpresa.rows[0].id;
      console.log('✅ Empresa criada com ID:', empresaId);
    } else {
      var empresaId = empresaDestino.rows[0].id;
      console.log('✅ Empresa encontrada com ID:', empresaId);
    }

    // 2. Buscar todos os clientes do Studio Sandro na origem
    const clientesOrigem = await origem.query(
      'SELECT * FROM clientes WHERE empresa_id = 10'
    );

    console.log('\n👤 Clientes a migrar:', clientesOrigem.rows.length);

    let clientesMigrados = 0;
    let clientesIgnorados = 0;

    for (const cliente of clientesOrigem.rows) {
      try {
        // Verificar se cliente já existe no destino (pelo nome e telefone)
        const existe = await destino.query(
          'SELECT id FROM clientes WHERE nome = $1 AND telefone = $2 AND empresa_id = $3',
          [cliente.nome, cliente.telefone, empresaId]
        );

        if (existe.rows.length === 0) {
          await destino.query(`
            INSERT INTO clientes (nome, telefone, email, empresa_id, created_at) 
            VALUES ($1, $2, $3, $4, $5)
          `, [cliente.nome, cliente.telefone, cliente.email, empresaId, cliente.created_at]);
          clientesMigrados++;
        } else {
          clientesIgnorados++;
        }
      } catch (err) {
        console.log('   ⚠️ Erro ao migrar cliente', cliente.nome + ':', err.message);
      }
    }

    console.log('   ✅ Clientes migrados:', clientesMigrados);
    console.log('   ⏭️ Clientes ignorados (já existem):', clientesIgnorados);

    // 3. Buscar agendamentos do Studio Sandro na origem
    const agendamentosOrigem = await origem.query(`
      SELECT a.*, c.nome as cliente_nome 
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      WHERE a.empresa_id = 10
    `);

    console.log('\n📅 Agendamentos a migrar:', agendamentosOrigem.rows.length);

    let agendamentosMigrados = 0;
    let agendamentosIgnorados = 0;

    for (const ag of agendamentosOrigem.rows) {
      try {
        // Encontrar o cliente no destino
        const clienteDestino = await destino.query(
          'SELECT id FROM clientes WHERE nome = $1 AND empresa_id = $2',
          [ag.cliente_nome, empresaId]
        );

        if (clienteDestino.rows.length === 0) {
          console.log('   ⚠️ Cliente não encontrado:', ag.cliente_nome);
          agendamentosIgnorados++;
          continue;
        }

        const clienteId = clienteDestino.rows[0].id;

        // Verificar se agendamento já existe
        const existe = await destino.query(
          'SELECT id FROM agendamentos WHERE cliente_id = $1 AND data = $2 AND hora = $3 AND empresa_id = $4',
          [clienteId, ag.data, ag.hora, empresaId]
        );

        if (existe.rows.length === 0) {
          await destino.query(`
            INSERT INTO agendamentos (
              cliente_id, data, hora, servico, valor, status, 
              empresa_id, profissional_id, duracao, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            clienteId,
            ag.data,
            ag.hora,
            ag.servico,
            ag.valor || 0,
            ag.status || 'pendente',
            empresaId,
            ag.profissional_id,
            ag.duracao || 30,
            ag.created_at || new Date()
          ]);
          agendamentosMigrados++;
        } else {
          agendamentosIgnorados++;
        }
      } catch (err) {
        console.log('   ⚠️ Erro ao migrar agendamento:', err.message);
        agendamentosIgnorados++;
      }
    }

    console.log('   ✅ Agendamentos migrados:', agendamentosMigrados);
    console.log('   ⏭️ Agendamentos ignorados (já existem):', agendamentosIgnorados);

    console.log('\n✅ MIGRAÇÃO CONCLUÍDA!');
    console.log('📊 Resumo:');
    console.log(`   👤 Clientes migrados: ${clientesMigrados}`);
    console.log(`   📅 Agendamentos migrados: ${agendamentosMigrados}`);

  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
  } finally {
    await origem.end();
    await destino.end();
  }
}

migrar();