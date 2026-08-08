const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

pool.query('SELECT id, nome, telefone FROM clientes WHERE nome LIKE $1 LIMIT 10', ['%sandro%'], (err, res) => {
  if (err) console.error('Erro:', err.message);
  else {
    console.log('Clientes com Sandro:');
    console.table(res.rows);
    console.log('Total:', res.rows.length);
  }
  pool.end();
});