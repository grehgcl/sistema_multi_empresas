const { Pool } = require('pg');

async function verificar() {
  try {
    const pool = new Pool({
      connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende_dev?sslmode=disable'
    });
    
    console.log('📊 Agendamentos do seeagende_dev:\n');
    
    const agendamentos = await pool.query(`
      SELECT a.id, a.data, a.hora, a.servico, a.status,
             c.nome as cliente_nome,
             p.nome as profissional_nome
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN profissionais p ON a.profissional_id = p.id
      ORDER BY a.data DESC
      LIMIT 15
    `);
    
    console.log('Total:', agendamentos.rows.length);
    if (agendamentos.rows.length > 0) {
      console.table(agendamentos.rows);
    }
    
    await pool.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

verificar();