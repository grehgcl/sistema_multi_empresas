const { Pool } = require('pg');

async function verificarBanco(nomeBanco) {
  try {
    const pool = new Pool({
      connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/' + nomeBanco + '?sslmode=disable'
    });
    
    const result = await pool.query('SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name');
    
    console.log('\n📊 Banco:', nomeBanco);
    console.log('   Tabelas:', result.rows.length > 0 ? result.rows.map(r => r.table_name).join(', ') : 'Nenhuma');
    
    if (result.rows.length > 0) {
      const ag = await pool.query('SELECT COUNT(*) as total FROM agendamentos');
      console.log('   Agendamentos:', ag.rows[0].total);
    }
    
    await pool.end();
  } catch (err) {
    console.log('❌ Banco', nomeBanco + ':', err.message);
  }
}

async function verificarTodos() {
  const bancos = ['seeagende', 'seeagende_test', 'postgres'];
  console.log('🔍 Verificando bancos...\n');
  for (const banco of bancos) {
    await verificarBanco(banco);
  }
}

verificarTodos();