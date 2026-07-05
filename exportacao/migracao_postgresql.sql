-- ============================================
-- SCRIPT DE MIGRAÇÃO PARA POSTGRESQL
-- GERADO EM: 05/07/2026, 11:46:57
-- ============================================

-- Tabela: acessos
DROP TABLE IF EXISTS acessos CASCADE;
CREATE TABLE acessos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    empresa_id INTEGER,
    data_acesso TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(45),
    user_agent TEXT
);

-- Inserindo 30 registros em acessos
INSERT INTO acessos (id, usuario_id, empresa_id, data_acesso, ip, user_agent) VALUES
(1, 1001, 3, '2026-06-29 05:27:06', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(2, 999, NULL, '2026-06-29 05:27:32', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(3, 1001, 3, '2026-06-30 04:01:41', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(4, 999, NULL, '2026-06-30 04:03:33', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(5, 1001, 3, '2026-06-30 04:08:05', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(6, 1000, 2, '2026-06-30 04:11:33', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(7, 1, 1, '2026-06-30 04:13:53', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(8, 1003, 5, '2026-06-30 04:15:30', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(9, 1003, 5, '2026-06-30 04:23:51', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(10, 1001, 3, '2026-06-30 04:47:40', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(11, 1001, 3, '2026-06-30 14:41:57', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(12, 999, NULL, '2026-06-30 14:43:06', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(13, 1001, 3, '2026-06-30 16:28:16', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(14, 1001, 3, '2026-06-30 16:29:40', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(15, 999, NULL, '2026-06-30 20:24:07', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(16, 1001, 3, '2026-06-30 22:58:53', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(17, 1001, 3, '2026-06-30 23:20:51', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(18, 1001, 3, '2026-07-01 00:19:50', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(19, 1001, 3, '2026-07-01 04:30:42', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(20, 999, NULL, '2026-07-01 04:51:02', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(21, 1001, 3, '2026-07-01 05:20:00', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(22, 999, NULL, '2026-07-01 05:22:24', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(23, 1001, 3, '2026-07-01 05:40:06', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(24, 1003, 5, '2026-07-01 14:05:58', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(25, 999, NULL, '2026-07-01 14:07:12', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(26, 1004, 6, '2026-07-01 14:28:16', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(27, 1001, 3, '2026-07-05 03:50:53', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(28, 1003, 5, '2026-07-05 03:56:12', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(29, 1001, 3, '2026-07-05 04:28:51', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'),
(30, 3, 3, '2026-07-05 04:51:34', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36')
;

-- Resetar sequência da tabela acessos
SELECT setval('acessos_id_seq', (SELECT MAX(id) FROM acessos));

-- Tabela: agendamentos
DROP TABLE IF EXISTS agendamentos CASCADE;
CREATE TABLE agendamentos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    data DATE,
    hora TIME,
    servico TEXT,
    valor DECIMAL(10,2),
    status TEXT DEFAULT pendente,
    empresa_id INTEGER,
    comissao DECIMAL(10,2) DEFAULT 0,
    profissional_id INTEGER,
    servico_id INTEGER,
    lembrete_enviado INTEGER DEFAULT 0,
    duracao INTEGER DEFAULT 30
);

-- Inserindo 19 registros em agendamentos
INSERT INTO agendamentos (id, cliente_id, data, hora, servico, valor, status, empresa_id, comissao, profissional_id, servico_id, lembrete_enviado, duracao) VALUES
(1, 3, '2026-06-16', '09:30', 'Progressiva', 300, 'concluido', 1, 0, NULL, 2, 0, 30),
(2, 1, '2026-06-16', '10:00', 'corte degrade', 45, 'concluido', 1, 13.5, 1, 1, 0, 30),
(3, 7, '2026-06-16', '11:00', 'corte degrade', 45, 'concluido', 1, 13.5, 1, 1, 0, 30),
(4, 3, '2026-06-18', '10:30', 'Progressiva', 300, 'concluido', 1, 0, NULL, 2, 0, 30),
(5, 1, '2026-06-18', '09:30', 'corte social', 30, 'concluido', 1, 0, NULL, 3, 0, 30),
(6, 7, '2026-06-19', '10:30', 'corte degrade', 45, 'concluido', 1, 13.5, 1, 1, 0, 30),
(7, 6, '2026-06-19', '11:00', 'corte degrade', 45, 'concluido', 1, 13.5, 1, 1, 0, 30),
(8, 8, '2026-06-19', '11:30', 'corte degrade', 45, 'concluido', 1, 13.5, 1, 1, 0, 30),
(10, 1, '2026-06-21', '10:00', 'corte degrade', 45, 'concluido', 1, 0, NULL, 1, 0, 30),
(13, 3, '2026-06-22', '10:00', 'Progressiva', 300, 'concluido', 1, 90, 1, 2, 0, 30),
(26, 14, '2026-06-23', '11:30', 'Progressiva', 300, 'concluido', 1, 90, 1, 2, 0, 30),
(29, 17, '2026-06-22', '13:00', 'corte social', 30, 'pendente', 4, 0, NULL, 6, 0, 30),
(140, 25, '2026-06-30', '09:00', 'corte social', 30, 'pendente', 2, 0, NULL, 9, 0, 30),
(141, 14, '2026-06-30', '09:00', 'Corte de Cabelo', 50, 'pendente', 1, 0, NULL, 4, 0, 30),
(181, 27, '2026-07-01', '13:00', 'mexas', 80, 'concluido', 5, 0, NULL, 11, 0, 60),
(188, 30, '2026-07-01', '13:00', 'corte degadre', 45, 'pendente', 6, 0, NULL, 14, 0, 30),
(196, 15, '2026-07-05', '11:30', 'Limpeza de pele', 60, 'concluido', 3, 0, NULL, 8, 0, 30),
(197, 28, '2026-07-05', '11:30', 'Progressiva', 300, 'concluido', 3, 120, 3, 7, 0, 120),
(198, 16, '2026-07-05', '13:30', 'Limpeza de pele', 60, 'concluido', 3, 24, 3, 8, 0, 30)
;

-- Resetar sequência da tabela agendamentos
SELECT setval('agendamentos_id_seq', (SELECT MAX(id) FROM agendamentos));

-- Tabela: clientes
DROP TABLE IF EXISTS clientes CASCADE;
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    telefone TEXT,
    email TEXT,
    empresa_id INTEGER,
    bloqueado_chatbot INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    dias_bloqueio INTEGER DEFAULT 1
);

-- Inserindo 25 registros em clientes
INSERT INTO clientes (id, nome, telefone, email, empresa_id, bloqueado_chatbot, created_at, dias_bloqueio) VALUES
(1, 'greg leal', '41999003903', '', 1, 0, '2026-06-15 04:39:39', 1),
(2, 'gregorio', '41999003903', '', 1, 0, '2026-06-15 04:39:39', 1),
(4, 'greg leal', '41999003903', '', 1, 0, '2026-06-15 04:39:39', 1),
(6, 'lucas ', '41999999999', '', 1, 0, NULL, 1),
(7, 'lucas silva', '41888888888', NULL, 1, 0, NULL, 1),
(8, 'gregorio', '41777777777', NULL, 1, 0, NULL, 1),
(10, 'luzia sandra ', '41997391855', '', 1, 0, NULL, 1),
(13, 'fran', '41999884757', NULL, 1, 0, NULL, 1),
(14, 'fran', '41998447376', NULL, 1, 0, NULL, 1),
(15, 'Cliente Teste', '11999999999', 'teste@email.com', 3, 0, NULL, 7),
(16, 'greg', '41999003903', '', 3, 0, NULL, 1),
(17, 'lucas ', '41999999999', '', 4, 0, NULL, 1),
(18, 'flavio', '41987663476', '', 3, 0, NULL, 1),
(19, 'sandro', '41987446756', '', 3, 0, NULL, 1),
(20, 'fernando lima', '41987483764', '', 3, 0, NULL, 2),
(21, 'manga', '41876389474', NULL, 3, 0, NULL, 1),
(22, 'mendes', '41987457635', NULL, 3, 0, NULL, 1),
(23, 'sandra', '41997391855', '', 3, 0, NULL, 1),
(24, 'lucas hernandes', '41987656733', '', 3, 0, NULL, 1),
(25, 'sandra', '41999003903', '', 2, 0, NULL, 1),
(26, 'paula ', '41999999999', '', 5, 0, NULL, 1),
(27, 'sabrina', '41998778764', NULL, 5, 0, NULL, 1),
(28, 'fernandao', '41987889878', NULL, 3, 0, NULL, 1),
(30, 'sandra', '41997391855', '', 6, 0, NULL, 1),
(31, 'greg', '41999003903', '', 5, 0, NULL, 1)
;

-- Resetar sequência da tabela clientes
SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));

-- Tabela: despesas
DROP TABLE IF EXISTS despesas CASCADE;
CREATE TABLE despesas (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    categoria TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data DATE NOT NULL,
    data_vencimento DATE,
    pago BOOLEAN DEFAULT 0,
    forma_pagamento TEXT,
    observacao TEXT,
    anexo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserindo 2 registros em despesas
INSERT INTO despesas (id, empresa_id, descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao, anexo, created_at, updated_at) VALUES
(2, 3, 'conta de luz', 'Energia Elétrica', 120, '2026-07-05', '2026-07-30', 0, 'Dinheiro', NULL, NULL, '2026-07-05 04:53:07', '2026-07-05 04:53:07'),
(3, 3, 'agua', 'Água', 80, '2026-07-05', '2026-07-31', 0, 'Dinheiro', NULL, NULL, '2026-07-05 14:22:56', '2026-07-05 14:22:56')
;

-- Resetar sequência da tabela despesas
SELECT setval('despesas_id_seq', (SELECT MAX(id) FROM despesas));

-- Tabela: empresas
DROP TABLE IF EXISTS empresas CASCADE;
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    plano TEXT DEFAULT trial,
    trial_expira DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    limite_profissionais INTEGER DEFAULT 1,
    assinatura_ativa INTEGER DEFAULT 1,
    assinatura_valida_ate DATE,
    ultima_cobranca DATE,
    agendamentos_mes INTEGER DEFAULT 0,
    mes_referencia TEXT,
    dias_bloqueio_geral INTEGER DEFAULT 0,
    telefone_dono VARCHAR(20),
    endereco TEXT
);

-- Inserindo 6 registros em empresas
INSERT INTO empresas (id, nome, plano, trial_expira, created_at, limite_profissionais, assinatura_ativa, assinatura_valida_ate, ultima_cobranca, agendamentos_mes, mes_referencia, dias_bloqueio_geral, telefone_dono, endereco) VALUES
(1, 'Barbearia Teste', 'Starter', '2026-06-23T14:36:20.317Z', '2026-06-12 04:47:55', 1, 1, '2026-07-16T14:45:25.473Z', '2026-06-16 14:45:25', 0, '2026-07', 0, NULL, NULL),
(2, 'barbaazul', 'trial', '2026-07-27', '2026-06-12 04:57:07', 1, 1, NULL, NULL, 0, '2026-07', 0, NULL, NULL),
(3, 'salaoGreen', 'Starter', '2026-07-31', '2026-06-16 16:25:18', 1, 1, '2026-07-22T04:17:43.789Z', '2026-06-22 04:17:43', 23, '2026-07', 0, '41999003903', NULL),
(4, 'barbaazul', 'trial', '2026-08-05T23:50:30.843Z', '2026-06-21 23:50:30', 1, 1, NULL, NULL, 0, '2026-07', 0, NULL, NULL),
(5, 'salao sandrinha2', 'trial', '2026-08-14 04:15:20', '2026-06-30 04:15:20', 1, 1, NULL, NULL, 7, '2026-07', 0, '41997391855', NULL),
(6, 'Lipe barba', 'trial', '2026-08-15 14:28:00', '2026-07-01 14:28:00', 1, 1, NULL, NULL, 7, '2026-07', 0, '41987972223', NULL)
;

-- Resetar sequência da tabela empresas
SELECT setval('empresas_id_seq', (SELECT MAX(id) FROM empresas));

-- Tabela: horarios_funcionamento
DROP TABLE IF EXISTS horarios_funcionamento CASCADE;
CREATE TABLE horarios_funcionamento (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    dia_semana INTEGER NOT NULL,
    aberto INTEGER DEFAULT 1,
    hora_inicio TEXT DEFAULT "09:00",
    hora_fim TEXT DEFAULT "18:00",
    almoco_inicio TEXT DEFAULT "12:00",
    almoco_fim TEXT DEFAULT "13:00",
    intervalo_minutos INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserindo 42 registros em horarios_funcionamento
INSERT INTO horarios_funcionamento (id, empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos, created_at, updated_at) VALUES
(1, 1, 0, 0, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(2, 1, 1, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-17 04:52:17'),
(3, 1, 2, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-17 04:52:18'),
(4, 1, 3, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-17 04:52:18'),
(5, 1, 4, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-17 04:52:19'),
(6, 1, 5, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-17 04:52:19'),
(7, 1, 6, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-17 04:52:20'),
(8, 2, 0, 0, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(9, 2, 1, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(10, 2, 2, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(11, 2, 3, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(12, 2, 4, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(13, 2, 5, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(14, 2, 6, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-13 04:35:25', '2026-06-13 04:35:25'),
(15, 3, 1, 1, '08:00', '18:00', '12:00', '13:00', 60, '2026-06-16 16:25:18', '2026-06-16 16:25:18'),
(16, 3, 5, 1, '08:00', '18:00', '12:00', '13:00', 30, '2026-06-16 16:25:18', '2026-06-16 16:25:18'),
(17, 3, 6, 1, '08:00', '18:00', '12:00', '13:00', 60, '2026-06-16 16:25:18', '2026-06-16 16:25:18'),
(18, 3, 0, 1, '08:00', '18:00', '12:00', '13:00', 30, '2026-06-16 16:25:18', '2026-06-16 16:25:18'),
(19, 3, 3, 1, '08:00', '18:00', '12:00', '13:00', 60, '2026-06-16 16:25:18', '2026-06-16 16:25:18'),
(20, 3, 4, 1, '08:00', '18:00', '12:00', '13:00', 60, '2026-06-16 16:25:18', '2026-06-16 16:25:18'),
(21, 3, 2, 1, '08:00', '18:00', '12:00', '13:00', 60, '2026-06-16 16:25:18', '2026-06-16 16:25:18'),
(22, 4, 0, 0, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-21 23:57:14', '2026-06-21 23:57:14'),
(23, 4, 1, 1, '12:00', '18:00', '12:00', '13:00', 30, '2026-06-21 23:57:14', '2026-06-21 23:57:14'),
(24, 4, 5, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-21 23:57:14', '2026-06-21 23:57:14'),
(25, 4, 6, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-21 23:57:14', '2026-06-21 23:57:14'),
(26, 4, 4, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-21 23:57:14', '2026-06-21 23:57:14'),
(27, 4, 2, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-21 23:57:14', '2026-06-21 23:57:14'),
(28, 4, 3, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-21 23:57:14', '2026-06-21 23:57:14'),
(29, 5, 0, 1, '01:00', '18:00', '12:00', '13:00', 30, '2026-06-30 04:15:20', '2026-06-30 04:15:20'),
(30, 5, 2, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-30 04:15:20', '2026-06-30 04:15:20'),
(31, 5, 5, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-30 04:15:20', '2026-06-30 04:15:20'),
(32, 5, 6, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-30 04:15:20', '2026-06-30 04:15:20'),
(33, 5, 4, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-30 04:15:20', '2026-06-30 04:15:20'),
(34, 5, 1, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-30 04:15:20', '2026-06-30 04:15:20'),
(35, 5, 3, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-06-30 04:15:20', '2026-06-30 04:15:20'),
(36, 6, 0, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-07-01 14:28:01', '2026-07-01 14:28:01'),
(37, 6, 4, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-07-01 14:28:01', '2026-07-01 14:28:01'),
(38, 6, 5, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-07-01 14:28:01', '2026-07-01 14:28:01'),
(39, 6, 6, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-07-01 14:28:01', '2026-07-01 14:28:01'),
(40, 6, 1, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-07-01 14:28:01', '2026-07-01 14:28:01'),
(41, 6, 2, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-07-01 14:28:01', '2026-07-01 14:28:01'),
(42, 6, 3, 1, '09:00', '18:00', '12:00', '13:00', 30, '2026-07-01 14:28:01', '2026-07-01 14:28:01')
;

-- Resetar sequência da tabela horarios_funcionamento
SELECT setval('horarios_funcionamento_id_seq', (SELECT MAX(id) FROM horarios_funcionamento));

-- Tabela: planos_historico
DROP TABLE IF EXISTS planos_historico CASCADE;
CREATE TABLE planos_historico (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER,
    plano_antigo TEXT,
    plano_novo TEXT,
    valor_pago DECIMAL(10,2),
    metodo_pagamento TEXT,
    comprovante TEXT,
    data_mudanca TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserindo 5 registros em planos_historico
INSERT INTO planos_historico (id, empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca) VALUES
(1, 1, 'trial', 'starter', 24.9, 'pix', NULL, '2026-06-15 04:00:05'),
(2, 1, 'pro', 'cancelado', 0, 'cancelamento', 'Usuário cancelou manualmente', '2026-06-15 15:21:14'),
(3, 1, 'enterprise', 'cancelado', 0, 'cancelamento', 'Usuário cancelou manualmente', '2026-06-15 15:23:21'),
(4, 1, 'starter', 'cancelado', 0, 'cancelamento', 'Usuário cancelou manualmente', '2026-06-16 13:38:47'),
(5, 1, 'starter', 'cancelado', 0, 'cancelamento', 'Usuário cancelou manualmente', '2026-06-16 14:36:20')
;

-- Resetar sequência da tabela planos_historico
SELECT setval('planos_historico_id_seq', (SELECT MAX(id) FROM planos_historico));

-- Tabela: profissionais
DROP TABLE IF EXISTS profissionais CASCADE;
CREATE TABLE profissionais (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    senha TEXT NOT NULL,
    comissao_percent INTEGER DEFAULT 30,
    ativo INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telefone TEXT
);

-- Inserindo 2 registros em profissionais
INSERT INTO profissionais (id, empresa_id, nome, email, senha, comissao_percent, ativo, created_at, telefone) VALUES
(1, 1, 'Luzia Sandra', 'luziasandraleal@hotmail.com', '$2a$10$ZkZBsLrrxteC12t1Wx3CaelI9bS6JQOrqAC2jPd0Qob1NXzSadzLO', 30, 1, '2026-06-12 06:04:04', NULL),
(3, 3, 'luis felipe', 'luis@gmail.com', '$2a$10$civ3gCdOmDYjy9TDnf0Z6uuWz8ej2OQ2l8TroUAOtSsJyNsj/uAoa', 40, 1, '2026-06-25 15:23:19', '41999999999')
;

-- Resetar sequência da tabela profissionais
SELECT setval('profissionais_id_seq', (SELECT MAX(id) FROM profissionais));

-- Tabela: servicos
DROP TABLE IF EXISTS servicos CASCADE;
CREATE TABLE servicos (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    duracao INTEGER DEFAULT 30,
    ativo INTEGER DEFAULT 1,
    empresa_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserindo 14 registros em servicos
INSERT INTO servicos (id, nome, descricao, valor, duracao, ativo, empresa_id, created_at) VALUES
(1, 'corte degrade', '', 45, 30, 1, 1, '2026-06-12 15:38:17'),
(2, 'Progressiva', '', 300, 120, 1, 1, '2026-06-12 16:07:36'),
(3, 'corte social', '', 30, 30, 1, 1, '2026-06-15 14:25:41'),
(4, 'Corte de Cabelo', 'Corte tradicional', 50, 30, 1, 1, '2026-06-20 04:17:25'),
(5, 'corte social', '', 30, 30, 1, 3, '2026-06-21 07:15:56'),
(6, 'corte social', '', 30, 30, 1, 4, '2026-06-21 23:51:16'),
(7, 'Progressiva', '', 300, 120, 1, 3, '2026-06-23 13:50:04'),
(8, 'Limpeza de pele', '', 60, 30, 1, 3, '2026-06-30 04:02:39'),
(9, 'corte social', '', 30, 30, 1, 2, '2026-06-30 04:12:54'),
(10, 'unha ', '', 45, 30, 1, 5, '2026-06-30 04:16:07'),
(11, 'mexas', '', 80, 60, 1, 5, '2026-06-30 04:16:20'),
(12, 'mexas', '', 80, 45, 1, 3, '2026-06-30 14:33:29'),
(13, 'pintura de cabelo', '', 35, 30, 1, 3, '2026-06-30 23:21:50'),
(14, 'corte degadre', '', 45, 30, 1, 6, '2026-07-01 14:37:15')
;

-- Resetar sequência da tabela servicos
SELECT setval('servicos_id_seq', (SELECT MAX(id) FROM servicos));

-- Tabela: transacoes_pagamento
DROP TABLE IF EXISTS transacoes_pagamento CASCADE;
CREATE TABLE transacoes_pagamento (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL,
    plano_id VARCHAR(50) NOT NULL,
    plano_nome VARCHAR(100) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(50) NOT NULL,
    transacao_id VARCHAR(255),
    pagamento_id VARCHAR(255),
    status VARCHAR(50) DEFAULT pending,
    qr_code TEXT,
    qr_code_base64 TEXT,
    boleto_url TEXT,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Inserindo 9 registros em transacoes_pagamento
INSERT INTO transacoes_pagamento (id, empresa_id, plano_id, plano_nome, valor, metodo, transacao_id, pagamento_id, status, qr_code, qr_code_base64, boleto_url, payment_method, created_at, updated_at) VALUES
(1, 1, 'pro', 'Pro', 49.9, 'cartao_simulado', NULL, 'sim_card_1781536209883_vmfi1dvjz', 'approved', NULL, NULL, NULL, NULL, '2026-06-15 15:10:09', NULL),
(2, 1, 'starter', 'Starter', 24.9, 'cartao_simulado', NULL, 'sim_card_1781536908734_391g43auk', 'approved', NULL, NULL, NULL, NULL, '2026-06-15 15:21:48', NULL),
(3, 1, 'pro', 'Pro', 49.9, 'cartao_simulado', NULL, 'sim_card_1781536945586_c68rx3ckq', 'approved', NULL, NULL, NULL, NULL, '2026-06-15 15:22:25', NULL),
(4, 1, 'business', 'Business', 99.9, 'cartao_simulado', NULL, 'sim_card_1781536961466_2cr9yf5s9', 'approved', NULL, NULL, NULL, NULL, '2026-06-15 15:22:41', NULL),
(5, 1, 'enterprise', 'Enterprise', 199.9, 'cartao_simulado', NULL, 'sim_card_1781536979950_o7kg6ffyt', 'approved', NULL, NULL, NULL, NULL, '2026-06-15 15:22:59', NULL),
(6, 1, 'starter', 'Starter', 24.9, 'pix_simulado', NULL, 'sim_1781537027536_2zqd7htmf', 'approved', '00020126580014BR.GOV.BCB.PIX0136b9f5e0-4b1e-4b3e-8a6e-8a5e4b3e2a1e52040000530398654042490.005802BR5925See&Agende6009SAO PAULO62070503***6304E2C9', 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', NULL, NULL, '2026-06-15 15:23:47', '2026-06-15 15:23:56'),
(7, 1, 'starter', 'Starter', 24.9, 'cartao_simulado', NULL, 'sim_card_1781619234232_v7ncqa8vq', 'approved', NULL, NULL, NULL, NULL, '2026-06-16 14:13:54', NULL),
(8, 1, 'starter', 'Starter', 24.9, 'cartao_simulado', NULL, 'sim_card_1781621125473_iyudrxkab', 'approved', NULL, NULL, NULL, NULL, '2026-06-16 14:45:25', NULL),
(9, 3, 'starter', 'Starter', 29.9, 'cartao_simulado', NULL, 'sim_card_1782101863789_v2pr7ly5f', 'approved', NULL, NULL, NULL, NULL, '2026-06-22 04:17:43', NULL)
;

-- Resetar sequência da tabela transacoes_pagamento
SELECT setval('transacoes_pagamento_id_seq', (SELECT MAX(id) FROM transacoes_pagamento));

-- Tabela: usuarios
DROP TABLE IF EXISTS usuarios CASCADE;
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome TEXT,
    email TEXT,
    senha TEXT,
    role TEXT DEFAULT dono,
    empresa_id INTEGER,
    ativo INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    telefone VARCHAR(20)
);

-- Inserindo 7 registros em usuarios
INSERT INTO usuarios (id, nome, email, senha, role, empresa_id, ativo, created_at, telefone) VALUES
(1, 'Admin Teste', 'admin@teste.com', '$2a$10$O01AI7y7it9v6A3oIQwOpOf.sMEnD018e/XpWYNCZjDo/wyzcGpnu', 'dono', 1, 1, '2026-06-12 04:47:55', NULL),
(999, 'Super Admin', 'super@admin.com', '$2a$10$M.RsANdTzGAP5eUhxoZLGeMdtEu/yW3L7Ab3e9ru84hU/TAY1IyKe', 'superadmin', NULL, 1, '2026-06-12 04:54:57', NULL),
(1000, 'gregorio ', 'grehgcl@hotmail.com', '$2a$10$Naz/tSTGcXWRBlbevwvjLe/tt4le3k0nP6abD5rLbAoEkiCtmdzyy', 'dono', 2, 1, '2026-06-12 04:57:07', NULL),
(1001, 'gregorio ', 'digregorioleal@gmail.com', '$2a$10$iH18pk4WvC2Ba2n3Ntjjd.z9BmzpINunbsdIVCOgck0eAwWpgISVS', 'dono', 3, 1, '2026-06-16 16:25:18', '41999003903'),
(1002, 'edson carlos ', 'edson@gmail.com', '$2a$10$.ViIoGVu61woaEr2.y/LEeLPYqDcEYnlS0mjaKHnDFzrAZHMnMr3G', 'dono', 4, 1, '2026-06-21 23:50:30', NULL),
(1003, 'sandra leal', 'luziasandraleal@hotmail.com', '$2a$10$BszuindaSZOvi7D3MgRCfe26KH2rgYxKorMg18.lgL16JyeXfOxHS', 'dono', 5, 1, '2026-06-30 04:15:20', '41997391855'),
(1004, 'luis felipe ', 'luisfelipe@gmail.com', '$2a$10$ruG4BrZwSB4rfMMTxEYPjeyhqu.qbxKxlK30pLqzgbsbw/L79Mkcq', 'dono', 6, 1, '2026-07-01 14:28:01', '41987972223')
;

-- Resetar sequência da tabela usuarios
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));
