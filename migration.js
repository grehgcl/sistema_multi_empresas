const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'database', 'barbearia.db'));

// SQL para criar tabela
const createTableSQL = `
    CREATE TABLE IF NOT EXISTS transacoes_pagamento (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        empresa_id INTEGER NOT NULL,
        plano_id VARCHAR(50) NOT NULL,
        plano_nome VARCHAR(100) NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        metodo VARCHAR(50) NOT NULL,
        transacao_id VARCHAR(255),
        pagamento_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        qr_code TEXT,
        qr_code_base64 TEXT,
        boleto_url TEXT,
        payment_method VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME,
        FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transacoes_empresa ON transacoes_pagamento(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes_pagamento(status);
    CREATE INDEX IF NOT EXISTS idx_transacoes_transacao_id ON transacoes_pagamento(transacao_id);
`;

db.run(createTableSQL, (err) => {
    if (err) {
        console.error('Erro ao criar tabela:', err.message);
    } else {
        console.log('✅ Tabela transacoes_pagamento criada com sucesso!');
    }
    db.close();
});