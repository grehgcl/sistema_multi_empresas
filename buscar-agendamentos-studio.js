const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

async function buscar() {
  try {
    console.log('🔍 Buscando agendamentos do Studio Sandro matias...\n');

    // Buscar a empresa
    const empresa = await pool.query('SELECT id, nome FROM empresas WHERE nome ILIKE $1', ['%studio sandro%']);
    if (empresa.rows.length === 0) {
      console.log('❌ Empresa Studio Sandro não encontrada');
      pool.end();
      return;
    }

    const empresaId = empresa.rows[0].id;
    console.log('🏢 Empresa:', empresa.rows[0].nome, '(ID:', empresaId + ')');

    // Buscar agendamentos da empresa
    const agendamentos = await pool.query(`
      SELECT a.id, a.data, a.hora, a.servico, a.status,
             c.nome as cliente_nome,
             p.nome as profissional_nome
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN profissionais p ON a.profissional_id = p.id
      WHERE a.empresa_id = $1
      ORDER BY a.data DESC
      LIMIT 30
    `, [empresaId]);

    console.log('\n📋 Agendamentos do Studio Sandro:');
    console.log('Total:', agendamentos.rows.length);
    if (agendamentos.rows.length > 0) {
      console.table(agendamentos.rows);
    } else {
      console.log('Nenhum agendamento encontrado para esta empresa.');
    }

    // Buscar clientes da empresa
    const clientes = await pool.query(`
      SELECT id, nome, telefone FROM clientes WHERE empresa_id = $1 LIMIT 10
    `, [empresaId]);

    console.log('\n👤 Clientes do Studio Sandro:');
    console.log('Total:', clientes.rows.length);
    if (clientes.rows.length > 0) {
      console.table(clientes.rows);
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  pool.end();
}

buscar();