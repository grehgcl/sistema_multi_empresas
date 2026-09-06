-- Criação da tabela de estatísticas de anúncios
CREATE TABLE IF NOT EXISTS ads_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    campanha TEXT NOT NULL,
    origem TEXT NOT NULL,
    tipo TEXT NOT NULL,
    cliente_id INTEGER,
    agendamento_id INTEGER,
    valor REAL DEFAULT 0,
    custo REAL DEFAULT 0,
    data_interacao TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
);

-- Índices com verificação de existência (SQLite)
CREATE INDEX IF NOT EXISTS idx_ads_stats_empresa ON ads_stats(empresa_id);
CREATE INDEX IF NOT EXISTS idx_ads_stats_origem ON ads_stats(origem);
CREATE INDEX IF NOT EXISTS idx_ads_stats_data ON ads_stats(data_interacao);
CREATE INDEX IF NOT EXISTS idx_ads_stats_campanha ON ads_stats(campanha);