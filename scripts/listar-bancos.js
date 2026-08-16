const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/postgres?sslmode=disable'
});

async function listarBancos() {
  try {
    console.log('🔍 Listando todos os bancos de dados na VPS...\n');
    
    const result = await pool.query(`
      SELECT datname, pg_database_size(datname) as size 
      FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    console.log('📋 BANCOS ENCONTRADOS:');
    console.table(result.rows);
    console.log('\nTotal:', result.rows.length, 'bancos');
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  pool.end();
}

listarBancos();