-- ============================================
-- TABELA: bloqueios_agenda
-- Bloqueia dias/horários específicos por profissional
-- Executado no banco de CADA empresa
-- ============================================

CREATE TABLE IF NOT EXISTS bloqueios_agenda (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    profissional_id INTEGER,              -- NULL = todos os profissionais
    tipo TEXT NOT NULL DEFAULT 'periodo', -- 'periodo' | 'datas'
    data_inicio TEXT NOT NULL,            -- 'YYYY-MM-DD'
    data_fim TEXT,                        -- usado só se tipo='periodo'
    datas_especificas TEXT DEFAULT '[]',  -- JSON: ["2026-10-25","2026-10-26"]
    dia_inteiro INTEGER DEFAULT 1,
    hora_inicio TEXT,
    hora_fim TEXT,
    motivo TEXT,
    criado_por INTEGER,
    ativo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bloqueios_empresa 
    ON bloqueios_agenda(empresa_id, data_inicio, data_fim, ativo);

CREATE INDEX IF NOT EXISTS idx_bloqueios_profissional 
    ON bloqueios_agenda(empresa_id, profissional_id, ativo);