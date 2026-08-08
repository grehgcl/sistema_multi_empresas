const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://barbearia_user:seeagende2024@163.176.218.131:5432/seeagende?sslmode=disable'
});

async function buscar() {
  try {
    console.log('Procurando por Sandro...');

    const clientes = await pool.query("SELECT id, nome, telefone FROM clientes WHERE nome LIKE '%Sandro%' OR nome LIKE '%sandro%' LIMIT 10");
    console.log('Clientes com Sandro:', clientes.rows.length);
    if (clientes.rows.length > 0) console.table(clientes.rows);

    const empresas = await pool.query("SELECT id, nome FROM empresas WHERE nome LIKE '%Sandro%' OR nome LIKE '%sandro%' LIMIT 10");
    console.log('Empresas com Sandro:', empresas.rows.length);
    if (empresas.rows.length > 0) console.table(empresas.rows);

    const usuarios = await pool.query("SELECT id, nome, email FROM usuarios WHERE nome LIKE '%Sandro%' OR nome LIKE '%sandro%' LIMIT 10");
    console.log('Usuarios com Sandro:', usuarios.rows.length);
    if (usuarios.rows.length > 0) console.table(usuarios.rows);

    const profissionais = await pool.query("SELECT id, nome FROM profissionais WHERE nome LIKE '%Sandro%' OR nome LIKE '%sandro%' LIMIT 10");
    console.log('Profissionais com Sandro:', profissionais.rows.length);
    if (profissionais.rows.length > 0) console.table(profissionais.rows);

    console.log('Busca concluida!');
  } catch (err) {
    console.error('Erro:', err.message);
  }
  pool.end();
}

buscar();