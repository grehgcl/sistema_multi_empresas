const { Pool } = require('pg');

async function verificarBanco(nomeBanco) {
  try {
    const pool = new Pool({
      connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/' + nomeBanco + '?sslmode=disable'
    });
    
    console.log('\n📊 Banco:', nomeBanco);
    
    // Listar tabelas
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
    console.log('   Tabelas:', result.rows.length > 0 ? result.rows.map(r => r.table_name).join(', ') : 'Nenhuma');
    
    if (result.rows.length > 0) {
      // Contar registros em cada tabela
      for (const row of result.rows) {
        const count = await pool.query('SELECT COUNT(*) as total FROM ' + row.table_name);
        console.log('   ' + row.table_name + ':', count.rows[0].total, 'registros');
      }
    }
    
    await pool.end();
  } catch (err) {
    console.log('❌ Banco', nomeBanco + ':', err.message);
  }
}

async function verificarTodos() {
  const bancos = ['evolution', 'seeagende_dev'];
  console.log('🔍 Verificando bancos...\n');
  for (const banco of bancos) {
    await verificarBanco(banco);
  }
}

verificarTodos();