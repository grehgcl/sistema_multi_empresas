--
-- PostgreSQL database dump
--

\restrict xHV5D60jzZuaFnqJrpsqCToh7Lz0zUKEjfkSmMohbdr8cvKYKFAcXoBVPFXdtXh

-- Dumped from database version 15.18 (Debian 15.18-1.pgdg13+1)
-- Dumped by pg_dump version 15.18 (Debian 15.18-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: barbearia_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO barbearia_user;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA public;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acessos; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.acessos (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    empresa_id integer,
    data_acesso timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip character varying(45),
    user_agent text
);


ALTER TABLE public.acessos OWNER TO barbearia_user;

--
-- Name: acessos_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.acessos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.acessos_id_seq OWNER TO barbearia_user;

--
-- Name: acessos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.acessos_id_seq OWNED BY public.acessos.id;


--
-- Name: agendamentos; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.agendamentos (
    id integer NOT NULL,
    cliente_id integer,
    data date,
    hora time without time zone,
    servico text,
    valor numeric(10,2),
    status text DEFAULT 'pendente'::text,
    empresa_id integer,
    comissao numeric(10,2) DEFAULT 0,
    profissional_id integer,
    servico_id integer,
    lembrete_enviado boolean DEFAULT false,
    duracao integer DEFAULT 30
);


ALTER TABLE public.agendamentos OWNER TO barbearia_user;

--
-- Name: agendamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.agendamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agendamentos_id_seq OWNER TO barbearia_user;

--
-- Name: agendamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.agendamentos_id_seq OWNED BY public.agendamentos.id;


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.clientes (
    id integer NOT NULL,
    nome text,
    telefone text,
    email text,
    empresa_id integer,
    bloqueado_chatbot boolean DEFAULT false,
    created_at timestamp without time zone,
    dias_bloqueio integer DEFAULT 1
);


ALTER TABLE public.clientes OWNER TO barbearia_user;

--
-- Name: clientes_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.clientes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.clientes_id_seq OWNER TO barbearia_user;

--
-- Name: clientes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.clientes_id_seq OWNED BY public.clientes.id;


--
-- Name: despesas; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.despesas (
    id integer NOT NULL,
    empresa_id integer NOT NULL,
    descricao text NOT NULL,
    categoria text NOT NULL,
    valor numeric(10,2) NOT NULL,
    data date NOT NULL,
    data_vencimento date,
    pago boolean DEFAULT false,
    forma_pagamento text,
    observacao text,
    anexo text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.despesas OWNER TO barbearia_user;

--
-- Name: despesas_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.despesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.despesas_id_seq OWNER TO barbearia_user;

--
-- Name: despesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.despesas_id_seq OWNED BY public.despesas.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nome text,
    plano text DEFAULT 'trial'::text,
    trial_expira date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    limite_profissionais integer DEFAULT 1,
    assinatura_ativa boolean DEFAULT false,
    assinatura_valida_ate date,
    ultima_cobranca date,
    agendamentos_mes integer DEFAULT 0,
    mes_referencia text,
    dias_bloqueio_geral integer DEFAULT 0,
    telefone_dono character varying(20),
    endereco text,
    whatsapp_instance character varying(100),
    whatsapp_connected boolean DEFAULT false,
    whatsapp_number character varying(20),
    whatsapp_connected_at timestamp without time zone,
    whatsapp_proprio_habilitado boolean DEFAULT false
);


ALTER TABLE public.empresas OWNER TO barbearia_user;

--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.empresas_id_seq OWNER TO barbearia_user;

--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: horarios_funcionamento; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.horarios_funcionamento (
    id integer NOT NULL,
    empresa_id integer NOT NULL,
    dia_semana integer NOT NULL,
    aberto boolean DEFAULT true,
    hora_inicio text DEFAULT '"09:00"'::text,
    hora_fim text DEFAULT '"18:00"'::text,
    almoco_inicio text DEFAULT '"12:00"'::text,
    almoco_fim text DEFAULT '"13:00"'::text,
    intervalo_minutos integer DEFAULT 30,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.horarios_funcionamento OWNER TO barbearia_user;

--
-- Name: horarios_funcionamento_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.horarios_funcionamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.horarios_funcionamento_id_seq OWNER TO barbearia_user;

--
-- Name: horarios_funcionamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.horarios_funcionamento_id_seq OWNED BY public.horarios_funcionamento.id;


--
-- Name: metas; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.metas (
    id integer NOT NULL,
    empresa_id integer NOT NULL,
    mes integer NOT NULL,
    ano integer NOT NULL,
    meta_faturamento numeric(10,2) DEFAULT 0,
    meta_clientes integer DEFAULT 0,
    meta_atendimentos integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.metas OWNER TO barbearia_user;

--
-- Name: metas_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.metas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.metas_id_seq OWNER TO barbearia_user;

--
-- Name: metas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.metas_id_seq OWNED BY public.metas.id;


--
-- Name: planos_historico; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.planos_historico (
    id integer NOT NULL,
    empresa_id integer,
    plano_antigo text,
    plano_novo text,
    valor_pago numeric(10,2),
    metodo_pagamento text,
    comprovante text,
    data_mudanca timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.planos_historico OWNER TO barbearia_user;

--
-- Name: planos_historico_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.planos_historico_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.planos_historico_id_seq OWNER TO barbearia_user;

--
-- Name: planos_historico_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.planos_historico_id_seq OWNED BY public.planos_historico.id;


--
-- Name: profissionais; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.profissionais (
    id integer NOT NULL,
    empresa_id integer NOT NULL,
    nome text NOT NULL,
    email text NOT NULL,
    senha text NOT NULL,
    comissao_percent integer DEFAULT 30,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    telefone text
);


ALTER TABLE public.profissionais OWNER TO barbearia_user;

--
-- Name: profissionais_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.profissionais_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.profissionais_id_seq OWNER TO barbearia_user;

--
-- Name: profissionais_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.profissionais_id_seq OWNED BY public.profissionais.id;


--
-- Name: servicos; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.servicos (
    id integer NOT NULL,
    nome text NOT NULL,
    descricao text,
    valor numeric(10,2) NOT NULL,
    duracao integer DEFAULT 30,
    ativo boolean DEFAULT true,
    empresa_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.servicos OWNER TO barbearia_user;

--
-- Name: servicos_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.servicos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.servicos_id_seq OWNER TO barbearia_user;

--
-- Name: servicos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.servicos_id_seq OWNED BY public.servicos.id;


--
-- Name: transacoes_pagamento; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.transacoes_pagamento (
    id integer NOT NULL,
    empresa_id integer NOT NULL,
    plano_id character varying(50) NOT NULL,
    plano_nome character varying(100) NOT NULL,
    valor numeric(10,2) NOT NULL,
    metodo character varying(50) NOT NULL,
    transacao_id character varying(255),
    pagamento_id character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    qr_code text,
    qr_code_base64 text,
    boleto_url text,
    payment_method character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone,
    external_reference character varying(255)
);


ALTER TABLE public.transacoes_pagamento OWNER TO barbearia_user;

--
-- Name: transacoes_pagamento_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.transacoes_pagamento_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.transacoes_pagamento_id_seq OWNER TO barbearia_user;

--
-- Name: transacoes_pagamento_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.transacoes_pagamento_id_seq OWNED BY public.transacoes_pagamento.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: barbearia_user
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nome text,
    email text,
    senha text,
    role text DEFAULT 'dono'::text,
    empresa_id integer,
    ativo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    telefone character varying(20)
);


ALTER TABLE public.usuarios OWNER TO barbearia_user;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: barbearia_user
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.usuarios_id_seq OWNER TO barbearia_user;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: barbearia_user
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: acessos id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.acessos ALTER COLUMN id SET DEFAULT nextval('public.acessos_id_seq'::regclass);


--
-- Name: agendamentos id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.agendamentos ALTER COLUMN id SET DEFAULT nextval('public.agendamentos_id_seq'::regclass);


--
-- Name: clientes id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.clientes ALTER COLUMN id SET DEFAULT nextval('public.clientes_id_seq'::regclass);


--
-- Name: despesas id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.despesas ALTER COLUMN id SET DEFAULT nextval('public.despesas_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: horarios_funcionamento id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.horarios_funcionamento ALTER COLUMN id SET DEFAULT nextval('public.horarios_funcionamento_id_seq'::regclass);


--
-- Name: metas id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.metas ALTER COLUMN id SET DEFAULT nextval('public.metas_id_seq'::regclass);


--
-- Name: planos_historico id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.planos_historico ALTER COLUMN id SET DEFAULT nextval('public.planos_historico_id_seq'::regclass);


--
-- Name: profissionais id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.profissionais ALTER COLUMN id SET DEFAULT nextval('public.profissionais_id_seq'::regclass);


--
-- Name: servicos id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.servicos ALTER COLUMN id SET DEFAULT nextval('public.servicos_id_seq'::regclass);


--
-- Name: transacoes_pagamento id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.transacoes_pagamento ALTER COLUMN id SET DEFAULT nextval('public.transacoes_pagamento_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: acessos; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.acessos (id, usuario_id, empresa_id, data_acesso, ip, user_agent) FROM stdin;
1	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
2	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
3	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
4	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
5	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
7	1	1	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
10	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
11	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
12	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
13	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
14	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
15	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
16	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
17	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
18	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
19	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
20	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
21	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
22	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
23	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
25	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
26	1004	6	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
27	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
29	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
30	3	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
31	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
32	999	\N	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
33	1001	3	2026-07-05 17:54:41.837382	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
34	1001	3	2026-07-05 17:55:53.303669	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
35	1001	3	2026-07-05 18:01:36.89815	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
36	1001	3	2026-07-06 06:37:00.58847	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36
37	1001	3	2026-07-06 13:32:02.57427	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
38	1001	3	2026-07-06 14:07:07.168589	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
39	999	\N	2026-07-06 14:08:00.181284	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
40	1001	3	2026-07-06 14:23:13.040138	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
41	1001	3	2026-07-06 22:12:48.248685	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
42	1001	3	2026-07-07 04:13:23.499163	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
43	1001	3	2026-07-07 04:53:06.991221	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
44	999	\N	2026-07-07 05:02:33.535141	127.0.0.1	curl/7.81.0
45	1001	3	2026-07-08 03:58:16.000656	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
46	1001	3	2026-07-08 22:35:18.082305	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.59.0-gn
47	1001	3	2026-07-08 22:49:25.648523	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.59.0-gn
48	1001	3	2026-07-10 14:39:06.195739	127.0.0.1	Mozilla/5.0 (Linux; Android 15; POCO F5 Build/AQ3A.250226.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.59.0-gn
49	999	\N	2026-07-11 14:24:07.2067	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
51	1005	7	2026-07-12 05:01:02.888945	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
52	999	\N	2026-07-12 05:12:48.083735	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
53	1005	7	2026-07-12 05:14:18.335342	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
54	1005	7	2026-07-12 05:29:58.355332	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
55	1001	3	2026-07-12 05:44:46.514292	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
56	1001	3	2026-07-12 07:33:32.242	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
57	1001	3	2026-07-12 07:37:01.867532	127.0.0.1	Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
58	1001	3	2026-07-12 13:21:55.481108	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
59	1001	3	2026-07-12 18:58:12.673807	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
60	1001	3	2026-07-13 14:41:04.572954	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
61	999	\N	2026-07-13 14:41:23.176004	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
62	1	1	2026-07-13 14:42:35.88223	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
63	999	\N	2026-07-13 16:51:24.484508	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
65	999	\N	2026-07-13 16:59:52.198795	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
68	1008	10	2026-07-13 19:02:17.298002	127.0.0.1	Mozilla/5.0 (Linux; Android 13; Mi 11 Lite 5G Build/TKQ1.220829.002) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.79 Mobile Safari/537.36 XiaoMi/MiuiBrowser/14.58.0-gn
69	999	\N	2026-07-13 19:13:01.519718	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
70	999	\N	2026-07-13 20:15:14.714321	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
71	999	\N	2026-07-13 21:57:27.573313	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
73	999	\N	2026-07-14 00:00:12.215249	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
76	999	\N	2026-07-14 15:06:04.41836	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
77	1001	3	2026-07-14 15:06:27.954598	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
78	1001	3	2026-07-14 15:49:46.795524	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
79	999	\N	2026-07-14 15:50:17.827691	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
80	1001	3	2026-07-14 15:50:49.425571	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
81	999	\N	2026-07-14 15:52:07.453029	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
82	1001	3	2026-07-14 15:52:33.807487	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
83	1001	3	2026-07-14 16:03:49.902273	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
84	1001	3	2026-07-14 16:04:42.870196	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
85	1001	3	2026-07-14 18:53:25.353069	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
86	999	\N	2026-07-14 21:15:05.268804	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
87	999	\N	2026-07-14 23:09:39.039682	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
88	999	\N	2026-07-15 00:26:10.962919	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
89	999	\N	2026-07-15 00:46:26.726095	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
90	999	\N	2026-07-15 02:33:25.760406	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
91	999	\N	2026-07-15 12:50:27.068654	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
92	1001	3	2026-07-15 12:50:52.879957	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
93	1001	3	2026-07-15 14:13:54.458904	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
94	1001	3	2026-07-15 14:21:46.895268	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
95	1001	3	2026-07-15 16:48:53.941114	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
96	999	\N	2026-07-15 19:15:57.566412	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
97	999	\N	2026-07-15 21:25:02.820286	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
98	999	\N	2026-07-15 21:45:39.281737	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
99	999	\N	2026-07-15 23:35:55.456631	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
100	999	\N	2026-07-16 00:07:46.930972	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
101	999	\N	2026-07-16 00:17:24.51262	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
102	999	\N	2026-07-16 00:31:46.644353	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
103	1012	14	2026-07-16 00:46:28.697454	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
104	1001	3	2026-07-16 01:15:53.765221	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
105	1001	3	2026-07-16 04:01:44.379609	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
106	999	\N	2026-07-16 04:02:14.632483	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
107	1012	14	2026-07-16 04:22:49.79357	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
108	1001	3	2026-07-16 04:29:32.598674	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
109	999	\N	2026-07-16 05:44:40.00687	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
110	1001	3	2026-07-16 13:26:42.607673	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
111	1012	14	2026-07-16 14:56:48.099416	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
112	999	\N	2026-07-16 14:59:58.671297	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
113	999	\N	2026-07-16 15:07:32.396919	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
114	1012	14	2026-07-16 22:29:31.959798	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
115	1012	14	2026-07-16 22:41:09.006201	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
116	1012	14	2026-07-16 22:47:43.666276	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
117	999	\N	2026-07-16 23:34:50.69331	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
118	999	\N	2026-07-17 15:02:02.229074	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
119	1008	10	2026-07-17 15:03:10.548481	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
120	1008	10	2026-07-17 15:04:17.769147	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
121	1008	10	2026-07-17 17:04:47.587247	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
122	1001	3	2026-07-17 17:16:00.794147	127.0.0.1	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36
123	1008	10	2026-07-17 17:22:12.640554	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
124	1001	3	2026-07-17 19:39:33.383659	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36
\.


--
-- Data for Name: agendamentos; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.agendamentos (id, cliente_id, data, hora, servico, valor, status, empresa_id, comissao, profissional_id, servico_id, lembrete_enviado, duracao) FROM stdin;
1	3	2026-06-16	09:30:00	Progressiva	300.00	concluido	1	0.00	\N	2	f	30
2	1	2026-06-16	10:00:00	corte degrade	45.00	concluido	1	13.50	1	1	f	30
3	7	2026-06-16	11:00:00	corte degrade	45.00	concluido	1	13.50	1	1	f	30
4	3	2026-06-18	10:30:00	Progressiva	300.00	concluido	1	0.00	\N	2	f	30
5	1	2026-06-18	09:30:00	corte social	30.00	concluido	1	0.00	\N	3	f	30
6	7	2026-06-19	10:30:00	corte degrade	45.00	concluido	1	13.50	1	1	f	30
7	6	2026-06-19	11:00:00	corte degrade	45.00	concluido	1	13.50	1	1	f	30
8	8	2026-06-19	11:30:00	corte degrade	45.00	concluido	1	13.50	1	1	f	30
10	1	2026-06-21	10:00:00	corte degrade	45.00	concluido	1	0.00	\N	1	f	30
13	3	2026-06-22	10:00:00	Progressiva	300.00	concluido	1	90.00	1	2	f	30
26	14	2026-06-23	11:30:00	Progressiva	300.00	concluido	1	90.00	1	2	f	30
188	30	2026-07-01	13:00:00	corte degadre	45.00	pendente	6	0.00	\N	14	f	30
196	15	2026-07-05	11:30:00	Limpeza de pele	60.00	concluido	3	0.00	\N	8	f	30
197	28	2026-07-05	11:30:00	Progressiva	300.00	concluido	3	120.00	3	7	f	120
198	16	2026-07-05	13:30:00	Limpeza de pele	60.00	concluido	3	24.00	3	8	f	30
203	33	2026-07-12	09:30:00	Corte social	25.00	concluido	7	0.00	\N	17	f	30
204	33	2026-07-13	11:00:00	Corte social	25.00	agendado	7	0.00	\N	17	f	30
209	16	2026-07-16	09:30:00	corte social	30.00	agendado	3	0.00	\N	5	f	30
211	35	2026-07-16	13:00:00	Progressiva 	200.00	concluido	14	0.00	\N	24	f	30
213	36	2026-07-16	15:00:00	Progressiva 	200.00	concluido	14	0.00	\N	24	f	120
214	37	2026-07-17	13:00:00	Progressiva 	200.00	concluido	14	0.00	\N	24	f	30
217	42	2026-07-17	15:00:00	aplicacao de colorocao e finalizacao  	75.00	agendado	10	0.00	\N	26	f	30
\.


--
-- Data for Name: clientes; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.clientes (id, nome, telefone, email, empresa_id, bloqueado_chatbot, created_at, dias_bloqueio) FROM stdin;
1	greg leal	41999003903		1	f	2026-06-15 04:39:39	1
2	gregorio	41999003903		1	f	2026-06-15 04:39:39	1
4	greg leal	41999003903		1	f	2026-06-15 04:39:39	1
6	lucas 	41999999999		1	f	\N	1
7	lucas silva	41888888888	\N	1	f	\N	1
8	gregorio	41777777777	\N	1	f	\N	1
10	luzia sandra 	41997391855		1	f	\N	1
13	fran	41999884757	\N	1	f	\N	1
14	fran	41998447376	\N	1	f	\N	1
16	greg	41999003903		3	f	\N	1
18	flavio	41987663476		3	f	\N	1
19	sandro	41987446756		3	f	\N	1
20	fernando lima	41987483764		3	f	\N	2
21	manga	41876389474	\N	3	f	\N	1
22	mendes	41987457635	\N	3	f	\N	1
23	sandra	41997391855		3	f	\N	1
24	lucas hernandes	41987656733		3	f	\N	1
28	fernandao	41987889878	\N	3	f	\N	1
30	sandra	41997391855		6	f	\N	1
15	Cliente Teste	11999999988	teste@email.com	3	f	\N	7
32	Édson	41988258179	\N	3	f	\N	1
33	Gregório	41999003903		7	f	\N	1
35	Gregorio Costa	41999003903	\N	14	f	\N	1
36	luis felipe	41987972223	\N	14	f	\N	1
37	Édson Carlos	41988258179	\N	14	f	\N	1
42	Gregorio Costa leal	41999003903	\N	10	f	\N	1
\.


--
-- Data for Name: despesas; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.despesas (id, empresa_id, descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao, anexo, created_at, updated_at) FROM stdin;
8	3	Água	Água	80.00	2026-07-06	2026-07-31	f	Dinheiro	\N	\N	2026-07-06 13:35:50.511649	2026-07-06 13:35:50.511649
9	3	Luz	Energia Elétrica	100.00	2026-07-07	2026-07-31	f	Dinheiro	\N	\N	2026-07-07 04:16:27.123442	2026-07-07 04:16:27.123442
10	14	aluguel	Aluguel	1000.00	2026-07-16	2026-07-31	f	Dinheiro	\N	\N	2026-07-16 15:05:56.002926	2026-07-16 15:05:56.002926
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.empresas (id, nome, plano, trial_expira, created_at, limite_profissionais, assinatura_ativa, assinatura_valida_ate, ultima_cobranca, agendamentos_mes, mes_referencia, dias_bloqueio_geral, telefone_dono, endereco, whatsapp_instance, whatsapp_connected, whatsapp_number, whatsapp_connected_at, whatsapp_proprio_habilitado) FROM stdin;
1	Barbearia Teste	Starter	2026-06-23	2026-07-05 17:54:41.837382	1	t	2026-07-16	2026-06-16	0	2026-07	0	\N	\N	\N	f	\N	\N	f
14	Salão da Sandra 	trial	2026-08-30	2026-07-16 00:43:49.278472	1	t	\N	\N	7	2026-07	0	41997391855	\N	emp-14-salao-da-sandra-	t	\N	\N	t
6	Lipe barba	trial	2026-08-15	2026-07-05 17:54:41.837382	1	t	\N	\N	7	2026-07	0	41987972223	\N	\N	f	\N	\N	f
10	Studio Sandro matias	trial	2026-08-27	2026-07-13 19:02:10.774754	1	t	\N	\N	3	2026-07	0	41999596407	\N	emp-10-studio-sandro-matias	t	\N	\N	t
7	Gamer barbe	trial	2026-08-26	2026-07-12 05:00:56.817455	1	t	\N	\N	2	2026-07	0	41987972223	\N	emp-7-gamer-barbe	t	\N	\N	t
12	man at works	trial	2026-08-30	2026-07-16 00:18:12.49109	1	t	\N	\N	0	\N	0	41999003903	\N	\N	f	\N	\N	f
3	salaoGreen	Teste R$ 1,00	2026-07-31	2026-07-05 17:54:41.837382	1	t	2026-08-14	2026-06-22	28	2026-07	0	11920102560	\N	emp-3-salaogreen	t	\N	\N	t
\.


--
-- Data for Name: horarios_funcionamento; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.horarios_funcionamento (id, empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos, created_at, updated_at) FROM stdin;
1	1	0	f	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
2	1	1	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
3	1	2	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
4	1	3	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
5	1	4	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
6	1	5	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
7	1	6	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
18	3	0	f	08:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
15	3	1	t	13:00	18:00	12:00	13:00	60	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
36	6	0	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
37	6	4	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
38	6	5	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
39	6	6	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
40	6	1	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
41	6	2	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
42	6	3	t	09:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
21	3	2	t	08:00	18:00	12:00	13:00	60	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
19	3	3	t	08:00	18:00	12:00	13:00	60	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
20	3	4	t	08:00	18:00	12:00	13:00	60	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
16	3	5	t	08:00	18:00	12:00	13:00	30	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
17	3	6	t	08:00	18:00	12:00	13:00	60	2026-07-05 17:54:41.837382	2026-07-05 17:54:41.837382
44	7	6	t	09:00	18:00	12:00	13:00	30	2026-07-12 05:00:56.928319	2026-07-12 05:00:56.928319
45	7	2	t	09:00	18:00	12:00	13:00	30	2026-07-12 05:00:56.928909	2026-07-12 05:00:56.928909
46	7	1	t	09:00	18:00	12:00	13:00	30	2026-07-12 05:00:56.92949	2026-07-12 05:00:56.92949
47	7	3	t	09:00	18:00	12:00	13:00	30	2026-07-12 05:00:56.929862	2026-07-12 05:00:56.929862
48	7	4	t	09:00	18:00	12:00	13:00	30	2026-07-12 05:00:56.930387	2026-07-12 05:00:56.930387
49	7	5	t	09:00	18:00	12:00	13:00	30	2026-07-12 05:00:56.931191	2026-07-12 05:00:56.931191
92	14	0	f	09:00	18:00	12:00	13:00	30	2026-07-16 00:43:49.374959	2026-07-16 00:43:49.374959
64	10	0	f	09:00	18:00	12:00	13:00	30	2026-07-13 19:02:10.867446	2026-07-13 19:02:10.867446
65	10	1	t	13:00	20:00	12:00	13:00	30	2026-07-13 19:02:10.881131	2026-07-13 19:02:10.881131
43	7	0	t	09:00	18:00	12:00	13:00	30	2026-07-12 05:00:56.91253	2026-07-12 05:00:56.91253
66	10	3	t	09:00	20:00	12:00	13:00	30	2026-07-13 19:02:10.881204	2026-07-13 19:02:10.881204
70	10	4	t	09:00	20:00	12:00	13:00	30	2026-07-13 19:02:10.883638	2026-07-13 19:02:10.883638
69	10	5	t	09:00	20:00	12:00	13:00	30	2026-07-13 19:02:10.883489	2026-07-13 19:02:10.883489
78	12	0	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:18:12.588647	2026-07-16 00:18:12.588647
79	12	6	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:18:12.610068	2026-07-16 00:18:12.610068
80	12	4	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:18:12.611354	2026-07-16 00:18:12.611354
81	12	1	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:18:12.61115	2026-07-16 00:18:12.61115
82	12	5	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:18:12.6124	2026-07-16 00:18:12.6124
83	12	3	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:18:12.613574	2026-07-16 00:18:12.613574
84	12	2	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:18:12.612841	2026-07-16 00:18:12.612841
93	14	3	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:43:49.397844	2026-07-16 00:43:49.397844
94	14	1	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:43:49.398344	2026-07-16 00:43:49.398344
95	14	2	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:43:49.399505	2026-07-16 00:43:49.399505
96	14	4	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:43:49.402158	2026-07-16 00:43:49.402158
97	14	6	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:43:49.40239	2026-07-16 00:43:49.40239
98	14	5	t	09:00	18:00	12:00	13:00	30	2026-07-16 00:43:49.406025	2026-07-16 00:43:49.406025
68	10	6	t	09:00	19:00	12:00	13:00	30	2026-07-13 19:02:10.881547	2026-07-13 19:02:10.881547
67	10	2	t	09:00	20:00	12:00	13:00	30	2026-07-13 19:02:10.881156	2026-07-13 19:02:10.881156
\.


--
-- Data for Name: metas; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.metas (id, empresa_id, mes, ano, meta_faturamento, meta_clientes, meta_atendimentos, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: planos_historico; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.planos_historico (id, empresa_id, plano_antigo, plano_novo, valor_pago, metodo_pagamento, comprovante, data_mudanca) FROM stdin;
1	1	trial	starter	24.90	pix	\N	2026-07-05 17:54:41.837382
2	1	pro	cancelado	0.00	cancelamento	Usuário cancelou manualmente	2026-07-05 17:54:41.837382
3	1	enterprise	cancelado	0.00	cancelamento	Usuário cancelou manualmente	2026-07-05 17:54:41.837382
4	1	starter	cancelado	0.00	cancelamento	Usuário cancelou manualmente	2026-07-05 17:54:41.837382
5	1	starter	cancelado	0.00	cancelamento	Usuário cancelou manualmente	2026-07-05 17:54:41.837382
\.


--
-- Data for Name: profissionais; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.profissionais (id, empresa_id, nome, email, senha, comissao_percent, ativo, created_at, telefone) FROM stdin;
3	3	luis felipe	luis@gmail.com	$2a$10$civ3gCdOmDYjy9TDnf0Z6uuWz8ej2OQ2l8TroUAOtSsJyNsj/uAoa	40	t	2026-07-05 17:54:41.837382	41999999999
1	1	Luzia Sandra	luziasandraleal@hotmail.com	$2a$10$ZkZBsLrrxteC12t1Wx3CaelI9bS6JQOrqAC2jPd0Qob1NXzSadzLO	35	t	2026-07-05 17:54:41.837382	\N
\.


--
-- Data for Name: servicos; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.servicos (id, nome, descricao, valor, duracao, ativo, empresa_id, created_at) FROM stdin;
1	corte degrade		45.00	30	t	1	2026-07-05 17:54:41.837382
2	Progressiva		300.00	120	t	1	2026-07-05 17:54:41.837382
3	corte social		30.00	30	t	1	2026-07-05 17:54:41.837382
4	Corte de Cabelo	Corte tradicional	50.00	30	t	1	2026-07-05 17:54:41.837382
5	corte social		30.00	30	t	3	2026-07-05 17:54:41.837382
8	Limpeza de pele		60.00	30	t	3	2026-07-05 17:54:41.837382
12	mexas		80.00	45	t	3	2026-07-05 17:54:41.837382
13	pintura de cabelo		35.00	30	t	3	2026-07-05 17:54:41.837382
14	corte degadre		45.00	30	t	6	2026-07-05 17:54:41.837382
15	barba		20.00	15	t	3	2026-07-11 14:51:34.727726
17	Corte social		25.00	30	t	7	2026-07-12 05:02:24.218958
18	Platinado 	Cabelo platinado	60.00	50	t	3	2026-07-12 13:23:57.040353
7	Progressiva		300.00	120	f	3	2026-07-05 17:54:41.837382
24	Progressiva 		200.00	120	t	14	2026-07-16 00:48:00.89789
25	Mexas		800.00	180	t	3	2026-07-17 17:31:56.973921
26	aplicacao de colorocao e finalizacao  	cliente traz a coloracao 	75.00	90	t	10	2026-07-17 17:37:49.68981
\.


--
-- Data for Name: transacoes_pagamento; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.transacoes_pagamento (id, empresa_id, plano_id, plano_nome, valor, metodo, transacao_id, pagamento_id, status, qr_code, qr_code_base64, boleto_url, payment_method, created_at, updated_at, external_reference) FROM stdin;
1	1	pro	Pro	49.90	cartao_simulado	\N	sim_card_1781536209883_vmfi1dvjz	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
2	1	starter	Starter	24.90	cartao_simulado	\N	sim_card_1781536908734_391g43auk	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
3	1	pro	Pro	49.90	cartao_simulado	\N	sim_card_1781536945586_c68rx3ckq	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
4	1	business	Business	99.90	cartao_simulado	\N	sim_card_1781536961466_2cr9yf5s9	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
5	1	enterprise	Enterprise	199.90	cartao_simulado	\N	sim_card_1781536979950_o7kg6ffyt	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
6	1	starter	Starter	24.90	pix_simulado	\N	sim_1781537027536_2zqd7htmf	approved	00020126580014BR.GOV.BCB.PIX0136b9f5e0-4b1e-4b3e-8a6e-8a5e4b3e2a1e52040000530398654042490.005802BR5925See&Agende6009SAO PAULO62070503***6304E2C9	iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==	\N	\N	2026-07-05 17:54:41.837382	2026-06-15 15:23:56	\N
7	1	starter	Starter	24.90	cartao_simulado	\N	sim_card_1781619234232_v7ncqa8vq	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
8	1	starter	Starter	24.90	cartao_simulado	\N	sim_card_1781621125473_iyudrxkab	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
9	3	starter	Starter	29.90	cartao_simulado	\N	sim_card_1782101863789_v2pr7ly5f	approved	\N	\N	\N	\N	2026-07-05 17:54:41.837382	\N	\N
10	3	teste	Teste R$ 1,00	1.00	pix	\N	167891130641	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e852040000530398654041.005802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter1678911306416304B034	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	\N	\N	2026-07-14 15:07:04.75093	\N	\N
11	3	pro	Pro	59.90	pix_simulado	\N	sim_1784044268006_bek0t825q	pending	00020126580014BR.GOV.BCB.PIX0136b9f5e0-4b1e-4b3e-8a6e-8a5e4b3e2a1e52040000530398654045990.005802BR5925See&Agende6009SAO PAULO62070503***6304E2C9	iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==	\N	\N	2026-07-14 15:51:08.017366	\N	\N
12	3	teste	Teste R$ 1,00	1.00	pix	\N	167899347677	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e852040000530398654041.005802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter1678993476776304B9E6	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	\N	\N	2026-07-14 16:04:02.294538	\N	\N
13	3	starter	Starter	29.90	pix	\N	168056453309	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e8520400005303986540529.905802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter16805645330963045058	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	\N	\N	2026-07-15 15:27:34.628693	\N	\N
14	3	starter	Starter	29.90	pix	\N	168926476214	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e8520400005303986540529.905802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter16892647621463044448	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	\N	\N	2026-07-15 15:32:36.058951	\N	\N
15	3	starter	Starter	29.90	pix	\N	168057865311	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e8520400005303986540529.905802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter1680578653116304856D	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	\N	\N	2026-07-15 15:32:44.643271	\N	\N
16	3	starter	Starter	29.90	pix	\N	168117828397	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e8520400005303986540529.905802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter1681178283976304C796	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	\N	\N	2026-07-15 21:45:08.854699	\N	\N
17	3	starter	Starter	29.90	pix	\N	169016125636	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e8520400005303986540529.905802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter16901612563663040743	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	\N	\N	2026-07-16 01:17:02.673383	\N	\N
18	14	starter	Starter	29.90	checkout	\N	41050420-74576e3f-1713-44dc-9568-930e42bb8f01	pending	\N	\N	\N	\N	2026-07-16 22:47:57.34801	\N	emp_14_starter_1784242076714
19	14	starter	Starter	29.90	pix	\N	169158984014	pending	00020126580014br.gov.bcb.pix01366c3a29e6-d6e9-472a-8856-79b0634f17e8520400005303986540529.905802BR5914DIGREGORIO20086008Curitiba62250521mpqrinter16915898401463049068	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	\N	\N	2026-07-16 22:49:22.222265	\N	\N
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: barbearia_user
--

COPY public.usuarios (id, nome, email, senha, role, empresa_id, ativo, created_at, telefone) FROM stdin;
1	Admin Teste	admin@teste.com	$2a$10$gSHNo56xqRMNWv8xbA0cBe3oKaf3mz6YVZWQCPrFdbH1r9hI7Pz8m	dono	1	t	2026-07-05 17:54:41.837382	\N
1004	luis felipe 	luisfelipe@gmail.com	$2a$10$ab/LMWJgE0EjpoEQ95siYOb70Y/fNtDpOoaSOGJ0X.8xLGWP5kzne	dono	6	t	2026-07-05 17:54:41.837382	41987972223
1008	Alexsandro matias 	crissandrobelly@gmail.com	$2a$10$KL9HFKJxPuVJ/SZfKjDSQeSAAQjA0t499InmfwrhgW5zZnQfsu/Wu	dono	10	t	2026-07-13 19:02:10.863803	41999596407
999	Super Admin	super@admin.com	$2a$10$OufQrAN9EV4hyDLKKdMh0OJ68kx51UECtMs9rR1iGw/0hHU9LzyfG	superadmin	\N	t	2026-07-05 17:54:41.837382	\N
1001	gregorio 	digregorioleal@gmail.com	$2a$10$q41fRcXSszXJv/4rO62H2eV51ZUIZpvczoL7l2ju1D895NucWitDi	dono	3	t	2026-07-05 17:54:41.837382	11920102560
1005	Luis Felipe 	luissssuchiha@gmail.com	$2a$10$D.0AiQtmZ.rplhLRA8qzR.qa566Oom9qnSRAJ.enPXro6ZF8sJLSK	dono	7	t	2026-07-12 05:00:56.90914	41987972223
1010	gregorio 	grehgcl@hotmail.com	$2a$10$Y5Z/rxiVpNgQmE7KqYCyl.2oyeDG/QAbnk9gqnx/sh6AjgTVW2nDa	dono	12	t	2026-07-16 00:18:12.583248	41999003903
1012	Sandra 	luziasandraleal@hotmail.com	$2a$10$rPJ587pPBMDJ/8EuXXK6fuYzH4Q83sDR7/yQgjC1aVTujHHBLUKa2	dono	14	t	2026-07-16 00:43:49.369732	41997391855
\.


--
-- Name: acessos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.acessos_id_seq', 124, true);


--
-- Name: agendamentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.agendamentos_id_seq', 217, true);


--
-- Name: clientes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.clientes_id_seq', 42, true);


--
-- Name: despesas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.despesas_id_seq', 10, true);


--
-- Name: empresas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.empresas_id_seq', 14, true);


--
-- Name: horarios_funcionamento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.horarios_funcionamento_id_seq', 98, true);


--
-- Name: metas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.metas_id_seq', 1, false);


--
-- Name: planos_historico_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.planos_historico_id_seq', 5, true);


--
-- Name: profissionais_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.profissionais_id_seq', 3, true);


--
-- Name: servicos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.servicos_id_seq', 26, true);


--
-- Name: transacoes_pagamento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.transacoes_pagamento_id_seq', 19, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: barbearia_user
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 1012, true);


--
-- Name: acessos acessos_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.acessos
    ADD CONSTRAINT acessos_pkey PRIMARY KEY (id);


--
-- Name: agendamentos agendamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: despesas despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: horarios_funcionamento horarios_funcionamento_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.horarios_funcionamento
    ADD CONSTRAINT horarios_funcionamento_pkey PRIMARY KEY (id);


--
-- Name: metas metas_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_pkey PRIMARY KEY (id);


--
-- Name: planos_historico planos_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.planos_historico
    ADD CONSTRAINT planos_historico_pkey PRIMARY KEY (id);


--
-- Name: profissionais profissionais_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.profissionais
    ADD CONSTRAINT profissionais_pkey PRIMARY KEY (id);


--
-- Name: servicos servicos_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.servicos
    ADD CONSTRAINT servicos_pkey PRIMARY KEY (id);


--
-- Name: transacoes_pagamento transacoes_pagamento_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.transacoes_pagamento
    ADD CONSTRAINT transacoes_pagamento_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: barbearia_user
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_agendamentos_empresa_data; Type: INDEX; Schema: public; Owner: barbearia_user
--

CREATE INDEX idx_agendamentos_empresa_data ON public.agendamentos USING btree (empresa_id, data);


--
-- Name: idx_agendamentos_profissional_data; Type: INDEX; Schema: public; Owner: barbearia_user
--

CREATE INDEX idx_agendamentos_profissional_data ON public.agendamentos USING btree (profissional_id, data, hora) WHERE (status = 'agendado'::text);


--
-- Name: idx_clientes_empresa_telefone; Type: INDEX; Schema: public; Owner: barbearia_user
--

CREATE INDEX idx_clientes_empresa_telefone ON public.clientes USING btree (empresa_id, telefone);


--
-- Name: idx_horario_unico; Type: INDEX; Schema: public; Owner: barbearia_user
--

CREATE UNIQUE INDEX idx_horario_unico ON public.agendamentos USING btree (empresa_id, profissional_id, data, hora) WHERE (status = 'agendado'::text);


--
-- Name: idx_metas_data; Type: INDEX; Schema: public; Owner: barbearia_user
--

CREATE INDEX idx_metas_data ON public.metas USING btree (mes, ano);


--
-- Name: idx_metas_empresa; Type: INDEX; Schema: public; Owner: barbearia_user
--

CREATE INDEX idx_metas_empresa ON public.metas USING btree (empresa_id);


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT blk_read_time double precision, OUT blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision) TO barbearia_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO barbearia_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON SEQUENCES  TO barbearia_user;


--
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TYPES  TO barbearia_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON FUNCTIONS  TO barbearia_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: -; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT ALL ON TABLES  TO barbearia_user;


--
-- PostgreSQL database dump complete
--

\unrestrict xHV5D60jzZuaFnqJrpsqCToh7Lz0zUKEjfkSmMohbdr8cvKYKFAcXoBVPFXdtXh

