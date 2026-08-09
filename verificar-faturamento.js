const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

async function verificar() {
  try {
    console.log('🔍 Verificando faturamento...\n');

    // 1. Ver agendamentos concluídos com valor
    const ags = await pool.query(`
      SELECT id, valor, status, empresa_id 
      FROM agendamentos 
      WHERE status = 'concluido' 
      LIMIT 10
    `);
    console.log('📋 Agendamentos concluídos (amostra):');
    console.table(ags.rows);

    // 2. Soma dos valores
    const soma = await pool.query(`
      SELECT SUM(valor) as total 
      FROM agendamentos 
      WHERE status = 'concluido'
    `);
    console.log('\n💰 Soma dos valores (concluídos):', soma.rows[0].total);

    // 3. Ver status disponíveis
    const status = await pool.query(`
      SELECT DISTINCT status FROM agendamentos
    `);
    console.log('\n📊 Status disponíveis:');
    console.table(status.rows);

    // 4. Ver se tem agendamentos com valor > 0 e status 'concluido'
    const comValor = await pool.query(`
      SELECT COUNT(*) as total 
      FROM agendamentos 
      WHERE valor > 0 AND status = 'concluido'
    `);
    console.log('\n✅ Agendamentos com valor > 0 e concluídos:', comValor.rows[0].total);

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
  pool.end();
}

verificar();