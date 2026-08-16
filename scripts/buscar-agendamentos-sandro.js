const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

async function buscar() {
  try {
    console.log('🔍 Agendamentos relacionados a Sandro...\n');

    const agendamentos = await pool.query(`
      SELECT a.id, a.data, a.hora, a.servico, a.status,
             c.nome as cliente_nome,
             p.nome as profissional_nome
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN profissionais p ON a.profissional_id = p.id
      WHERE c.nome ILIKE '%sandro%'
      ORDER BY a.data DESC
      LIMIT 20
    `);

    console.log('📋 Agendamentos com clientes que tem Sandro:');
    console.log('Total:', agendamentos.rows.length);
    if (agendamentos.rows.length > 0) {
      console.table(agendamentos.rows);
    }

    const agendamentosProf = await pool.query(`
      SELECT a.id, a.data, a.hora, a.servico, a.status,
             c.nome as cliente_nome,
             p.nome as profissional_nome
      FROM agendamentos a
      LEFT JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN profissionais p ON a.profissional_id = p.id
      WHERE p.nome ILIKE '%sandro%'
      ORDER BY a.data DESC
      LIMIT 20
    `);

    console.log('\n📋 Agendamentos com profissionais que tem Sandro:');
    console.log('Total:', agendamentosProf.rows.length);
    if (agendamentosProf.rows.length > 0) {
      console.table(agendamentosProf.rows);
    }

    console.log('\n✅ Busca concluída!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  pool.end();
}

buscar();