--
-- PostgreSQL database dump
--

\restrict 7FSOveOb7mIAcn6wyZE5Q50WW8bfed04S5hbREIlad36O6skVhfzTpeMB5kCqYT

-- Dumped from database version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agendamentos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.agendamentos (
    id integer NOT NULL,
    cliente_id integer,
    data text,
    hora text,
    servico text,
    valor real,
    status text,
    empresa_id integer,
    comissao real,
    profissional_id integer,
    servico_id integer,
    lembrete_enviado integer DEFAULT 0,
    duracao integer DEFAULT 30,
    servicos_extras text DEFAULT '[]'::text,
    valor_extras real DEFAULT 0,
    valor_total real DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.agendamentos OWNER TO postgres;

--
-- Name: agendamentos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.agendamentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.agendamentos_id_seq OWNER TO postgres;

--
-- Name: agendamentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.agendamentos_id_seq OWNED BY public.agendamentos.id;


--
-- Name: empresas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.empresas (
    id integer NOT NULL,
    nome text,
    plano text,
    limite_profissionais integer DEFAULT 1,
    trial_expira timestamp without time zone,
    assinatura_ativa boolean DEFAULT false,
    assinatura_valida_ate timestamp without time zone,
    agendamentos_mes integer DEFAULT 0,
    mes_referencia text,
    dias_bloqueio_geral integer DEFAULT 0,
    telefone_dono text,
    endereco text,
    whatsapp_instance text,
    whatsapp_connected boolean DEFAULT false,
    whatsapp_connected_at timestamp without time zone,
    whatsapp_proprio_habilitado boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.empresas OWNER TO postgres;

--
-- Name: empresas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.empresas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.empresas_id_seq OWNER TO postgres;

--
-- Name: empresas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.empresas_id_seq OWNED BY public.empresas.id;


--
-- Name: localizacoes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.localizacoes (
    id integer NOT NULL,
    empresa_id integer,
    latitude numeric(10,8),
    longitude numeric(11,8),
    endereco text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.localizacoes OWNER TO postgres;

--
-- Name: localizacoes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.localizacoes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.localizacoes_id_seq OWNER TO postgres;

--
-- Name: localizacoes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.localizacoes_id_seq OWNED BY public.localizacoes.id;


--
-- Name: agendamentos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos ALTER COLUMN id SET DEFAULT nextval('public.agendamentos_id_seq'::regclass);


--
-- Name: empresas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas ALTER COLUMN id SET DEFAULT nextval('public.empresas_id_seq'::regclass);


--
-- Name: localizacoes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localizacoes ALTER COLUMN id SET DEFAULT nextval('public.localizacoes_id_seq'::regclass);


--
-- Data for Name: agendamentos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.agendamentos (id, cliente_id, data, hora, servico, valor, status, empresa_id, comissao, profissional_id, servico_id, lembrete_enviado, duracao, servicos_extras, valor_extras, valor_total, created_at) FROM stdin;
\.


--
-- Data for Name: empresas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.empresas (id, nome, plano, limite_profissionais, trial_expira, assinatura_ativa, assinatura_valida_ate, agendamentos_mes, mes_referencia, dias_bloqueio_geral, telefone_dono, endereco, whatsapp_instance, whatsapp_connected, whatsapp_connected_at, whatsapp_proprio_habilitado, created_at) FROM stdin;
3	salaoGreen	Teste R$ 1,00	1	\N	f	\N	0	\N	0	\N	\N	emp-3	t	\N	t	2026-07-30 13:57:41.317156
\.


--
-- Data for Name: localizacoes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.localizacoes (id, empresa_id, latitude, longitude, endereco, created_at) FROM stdin;
\.


--
-- Name: agendamentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.agendamentos_id_seq', 1, false);


--
-- Name: empresas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.empresas_id_seq', 1, false);


--
-- Name: localizacoes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.localizacoes_id_seq', 1, false);


--
-- Name: agendamentos agendamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.agendamentos
    ADD CONSTRAINT agendamentos_pkey PRIMARY KEY (id);


--
-- Name: empresas empresas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.empresas
    ADD CONSTRAINT empresas_pkey PRIMARY KEY (id);


--
-- Name: localizacoes localizacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localizacoes
    ADD CONSTRAINT localizacoes_pkey PRIMARY KEY (id);


--
-- Name: localizacoes localizacoes_empresa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.localizacoes
    ADD CONSTRAINT localizacoes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 7FSOveOb7mIAcn6wyZE5Q50WW8bfed04S5hbREIlad36O6skVhfzTpeMB5kCqYT

