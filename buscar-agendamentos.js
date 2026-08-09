const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

async function buscar() {
  try {
    console.log('🔍 Buscando agendamentos no PostgreSQL da VPS...\n');

    // 1. Total de agendamentos
    const total = await pool.query('SELECT COUNT(*) as total FROM agendamentos');
    console.log('📊 Total de agendamentos:', total.rows[0].total);

    // 2. Agendamentos com valor
    const comValor = await pool.query('SELECT COUNT(*) as total FROM agendamentos WHERE valor > 0');
    console.log('💰 Agendamentos com valor > 0:', comValor.rows[0].total);

    // 3. Últimos 10 agendamentos
    const agendamentos = await pool.query(`
      SELECT a.id, a.cliente_id, a.data, a.hora, a.servico, a.valor, a.status, a.empresa_id,
             c.nome as cliente_nome
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      ORDER BY a.id DESC
      LIMIT 10
    `);

    console.log('\n📋 Últimos 10 agendamentos:');
    console.table(agendamentos.rows);

    // 4. Agendamentos por status
    const status = await pool.query(`
      SELECT status, COUNT(*) as total 
      FROM agendamentos 
      GROUP BY status
    `);
    console.log('\n📊 Agendamentos por status:');
    console.table(status.rows);

    // 5. Agendamentos por empresa (top 5)
    const empresas = await pool.query(`
      SELECT empresa_id, COUNT(*) as total 
      FROM agendamentos 
      GROUP BY empresa_id 
      ORDER BY total DESC 
      LIMIT 5
    `);
    console.log('\n🏢 Agendamentos por empresa (top 5):');
    console.table(empresas.rows);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  pool.end();
}

buscar();