const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

async function calcular() {
  try {
    console.log('💰 Calculando faturamento...\n');

    // 1. Faturamento total
    const total = await pool.query('SELECT SUM(valor) as total FROM agendamentos WHERE status = $1', ['concluido']);
    console.log('📊 Faturamento total:', total.rows[0].total ? 'R$ ' + parseFloat(total.rows[0].total).toFixed(2) : 'R$ 0,00');

    // 2. Faturamento por empresa
    const empresas = await pool.query(`
      SELECT empresa_id, SUM(valor) as total 
      FROM agendamentos 
      WHERE status = $1 
      GROUP BY empresa_id 
      ORDER BY total DESC
    `, ['concluido']);
    
    console.log('\n🏢 Faturamento por empresa:');
    console.table(empresas.rows.map(e => ({
      empresa_id: e.empresa_id,
      total: 'R$ ' + parseFloat(e.total).toFixed(2)
    })));

    // 3. Quantos agendamentos concluídos
    const qtd = await pool.query('SELECT COUNT(*) as total FROM agendamentos WHERE status = $1', ['concluido']);
    console.log('\n✅ Agendamentos concluídos:', qtd.rows[0].total);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  pool.end();
}

calcular();