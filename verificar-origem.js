const { Pool } = require('pg');

async function verificar() {
  try {
    console.log('🔍 Verificando qual banco é o original...\n');
    
    // Verificar seeagende
    const pool1 = new Pool({
      connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
    });
    
    const clientes1 = await pool1.query('SELECT MIN(created_at) as primeiro, MAX(created_at) as ultimo, COUNT(*) as total FROM clientes');
    console.log('📊 Banco seeagende:');
    console.log('   Clientes:', clientes1.rows[0].total);
    console.log('   Primeiro cliente:', clientes1.rows[0].primeiro);
    console.log('   Último cliente:', clientes1.rows[0].ultimo);
    
    // Verificar seeagende_dev
    const pool2 = new Pool({
      connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende_dev?sslmode=disable'
    });
    
    const clientes2 = await pool2.query('SELECT MIN(created_at) as primeiro, MAX(created_at) as ultimo, COUNT(*) as total FROM clientes');
    console.log('\n📊 Banco seeagende_dev:');
    console.log('   Clientes:', clientes2.rows[0].total);
    console.log('   Primeiro cliente:', clientes2.rows[0].primeiro);
    console.log('   Último cliente:', clientes2.rows[0].ultimo);
    
    await pool1.end();
    await pool2.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

verificar();