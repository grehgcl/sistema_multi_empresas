const { db } = require('./server/config/database');
db.run(
    `UPDATE empresas 
     SET trial_expira = date('now', '+30 days'),
         assinatura_valida_ate = date('now', '+30 days')
     WHERE id = 1`,
    [],
    function(err) {
        if (err) return console.error('❌ Erro:', err.message);
        console.log('✅ Empresa 1 atualizada');
        db.get(
            'SELECT id, nome, plano, trial_expira, assinatura_valida_ate FROM empresas WHERE id = 1',
            [],
            (err2, row) => { console.log(row); process.exit(0); }
        );
    }
);
