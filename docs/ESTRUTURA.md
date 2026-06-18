﻿# ESTRUTURA DO PROJETO - Atualizada em 17/06/2026

├── database/
│   └── barbearia.db          # SQLite (desenvolvimento local)
├── public/
│   ├── index.html            # Landing Page + Frontend principal
│   ├── chatbot.html          # Página do Chatbot Inteligente
│   ├── css/
│   │   ├── style.css         # Estilos premium principais
│   │   └── chatbot.css       # Estilos específicos do chatbot
│   └── js/
│       ├── ui.js             # UI Global (toasts, loading, modal)
│       └── pages/
│           ├── dashboard.js              # Dashboard Dono (completo)
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes + Bloqueio Chatbot
│           ├── agendamentos.js           # CRUD Agendamentos (Dono)
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           ├── servicos.js               # CRUD Servicos (Dono)
│           ├── financeiro.js             # Financeiro (cards por profissional)
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           ├── configuracoes.js          # Configuracoes + Chatbot
│           └── planos.js                 # Página de Planos e Upgrade
├── docs/                    # Documentacao
│   ├── DEV_GUIDE.md
│   ├── ESTRUTURA.md
│   ├── IA_CONTEXT.md
│   └── PARA_NOVA_IA.txt
├── server/                  # ESTRUTURA MODULAR DO BACKEND
│   ├── config/
│   │   └── database.js      # Conexão com banco + criação das tabelas (SQLite/PostgreSQL)
│   ├── middlewares/
│   │   └── auth.js          # Middlewares de autenticação (auth, verificarDono, etc)
│   └── utils/
│       ├── constants.js     # Constantes (PLANOS, PLANOS_NOMES, JWT_SECRET)
│       └── helpers.js       # Funções auxiliares (horaParaMinutos, etc)
├── scripts/                 # Scripts utilitários
│   ├── migrate.js           # Migração do banco de dados
│   └── seed.js              # População com dados iniciais
├── .render/
│   └── start.sh             # Script de inicialização no Render
├── keep_alive.js            # Mantém o servidor ativo no Render
├── render.yaml              # Configuração de deploy no Render
├── .env.example             # Exemplo de variáveis de ambiente
├── package.json             # Dependências e scripts
├── README.md                # Documentação do projeto
└── server.js                # Backend completo + rotas (~700 linhas)

## VARIAVEIS GLOBAIS (localStorage)
- token: JWT do usuario logado
- usuario: { id, nome, email, role, empresa_id, comissao_percent? }

## VARIAVEIS DE AMBIENTE (.env)
- NODE_ENV: production / development
- RENDER: true / false (identifica ambiente Render)
- DATABASE_URL: URL do PostgreSQL (apenas produção)
- PORT: 3000 (padrão)
- JWT_SECRET: Chave secreta para JWT

## FUNCOES GLOBAIS (no index.html)
- ativarBotao(id): Marca botão do menu como ativo
- fecharModal(id): Fecha modal
- logout(): Sai do sistema
- carregarMenu(): Monta menu baseado na role
- mostrarLanding(): Mostra landing page de vendas
- mostrarLoginApp(): Mostra tela de login
- mostrarCadastroApp(): Mostra tela de cadastro

## FUNCOES GLOBAIS UI (ui.js)
- showToast(msg, type): Exibe notificacao toast
- showLoading(): Mostra loading spinner
- hideLoading(): Esconde loading spinner
- showModal(title, content, callback): Modal customizado

## FLUXO DE TELAS POR ROLE

### Super Admin
- Dashboard (stats globais)
- Empresas (listar, editar, estender trial)
- Financeiro Global (todas comissoes)

### Dono
- Dashboard (stats da empresa, gráficos, métricas)
- Agendamentos (CRUD com filtros, edicao, horarios 30/30min)
- Servicos (CRUD completo)
- Financeiro (cards por profissional + totais)
- Clientes (CRUD + bloqueio chatbot)
- Configuracoes (Profissionais + Horarios + Chatbot)
- Planos (Visualizar planos e fazer upgrade)

### Profissional
- Dashboard (suas comissoes e pendentes)
- Meus Agendamentos (listar, criar, editar, concluir)
- Minhas Comissoes (suas comissoes)

## SISTEMA DE COMISSOES
- Dono define % ao criar profissional (padrão 30%)
- Ao concluir agendamento com profissional, comissao = valor * (comissao_percent / 100)
- Comissao so e gerada se profissional_id existir
- Comissao fica salva no campo 'comissao' da tabela agendamentos

## SISTEMA DE SERVICOS
- Dono cria servicos com nome, descricao, valor, duracao
- Servicos aparecem em select nos agendamentos
- Ao selecionar um servico, valor e preenchido automaticamente
- Servicos podem ser ativados/desativados

## SISTEMA DE HORARIOS DE FUNCIONAMENTO
- Dono configura dias e horarios na tela de Configuracoes
- Toggle switch liga/desliga por dia da semana
- Configuração de horário de abertura e fechamento
- Configuração de horário de almoço (início e fim)
- Intervalo FIXO de 30 minutos (código)
- Salvamento automático ao alterar valores
- Agendamentos validam automaticamente os horários

## SISTEMA DE PLANOS
- Starter: R$ 24,90/mês - 1 profissional
- Pro: R$ 49,90/mês - 5 profissionais
- Business: R$ 99,90/mês - 12 profissionais
- Enterprise: R$ 199,90/mês - Profissionais ilimitados
- 45 dias de teste grátis para novos cadastros
- Middleware verifica limite antes de criar profissional
- Tabela planos_historico registra todas as mudanças
- Rota de cancelamento de assinatura (/api/cancel-subscription)
- Ao cancelar, volta para Trial com 7 dias

## SISTEMA DE PAGAMENTOS
- Integração com Mercado Pago (PIX, Cartão, Boleto)
- Modo de simulação para testes (modoSimulacao = true)
- Tabela transacoes_pagamento para registrar pagamentos
- Webhook para confirmação automática
- QR Code para pagamento PIX
- Suporte a parcelamento no cartão

## CHATBOT INTELIGENTE
- Página pública: /chatbot.html?empresa=ID
- Conversa natural estilo assistente virtual
- Verifica cliente por telefone (busca flexível)
- Cadastro automático de novos clientes
- Calendário visual para seleção de datas
- Horários de 30 em 30 minutos
- Limite de 1 agendamento a cada 20 dias
- Dono pode bloquear clientes na tela de Clientes
- Dono aparece como opção de profissional

## FINANCEIRO DO DONO
- Faturamento Bruto: soma de todos os servicos concluidos
- Comissoes a Pagar: soma das comissoes (apenas com profissional)
- Faturamento Liquido: Bruto - Comissoes
- Cards por profissional: cada profissional com seu total de comissao

## DASHBOARD DO DONO
- Cards com faturamento do mês, total atendimentos, clientes, pendentes
- Cards com ticket médio, serviços concluídos, comissões a pagar
- Gráfico de agendamentos por dia da semana
- Ranking de serviços mais populares (Top 5)
- Lista de próximos agendamentos
- Grid de últimos clientes

## LANDING PAGE
- Estrutura separada do sistema de login
- Seções: Hero, Estatísticas, Problema, Solução, Showcase, Benefícios, Depoimentos, Comparação, Planos
- Design responsivo com animações AOS
- Mockups do dashboard em CSS puro
- Botões de CTA para cadastro

## CONFIGURACOES (TABS)
1. 👥 Profissionais - CRUD completo + limite por plano
2. ⏰ Horários - Configuração de expediente
3. 🤖 Chatbot - Link e QR Code para compartilhar

## CLIENTES (MELHORADO)
- Listagem completa com ações
- Botão para bloquear/desbloquear chatbot
- Badges de status (🔓 Liberado / 🔒 Bloqueado)
- Edição completa de clientes

## REFATORAÇÃO DO BACKEND (16/06/2026)
=========================================

Estrutura modular criada para melhor organização:

### server/config/database.js
- Conexão com banco SQLite (desenvolvimento) e PostgreSQL (produção)
- Função initDatabase() para criar todas as tabelas
- Função inserirHorariosPadrao() para horários iniciais
- Wrapper para compatibilidade entre SQLite e PostgreSQL

### server/middlewares/auth.js
- auth() - Middleware de autenticação JWT
- verificarSuperAdmin() - Apenas Super Admin
- verificarDono() - Apenas Dono
- verificarLimiteProfissionais() - Verifica limite do plano
- verificarAcessoAgendamentos() - Verifica trial/assinatura

### server/utils/constants.js
- PLANOS - Configurações de todos os planos
- PLANOS_NOMES - Nomes dos planos
- JWT_SECRET - Chave secreta do JWT

### server/utils/helpers.js
- horaParaMinutos() - Converte hora para minutos
- minutosParaHora() - Converte minutos para hora
- getDiaSemanaFromDate() - Pega dia da semana da data
- gerarSenhaTemporaria() - Gera senha aleatória

### server.js (refatorado)
- Apenas as rotas da API (~700 linhas)
- Importa as partes fixas dos arquivos acima
- ~200 linhas a menos que o original

## DEPLOY NO RENDER (17/06/2026)
=========================================

### Banco de Dados Híbrido
- Local: SQLite (desenvolvimento)
- Produção: PostgreSQL (Render)

### Scripts de Deploy
- keep_alive.js: Evita que o servidor durma no Render
- scripts/migrate.js: Migração do banco de dados
- scripts/seed.js: População com dados iniciais
- .render/start.sh: Script de inicialização no Render

### Variáveis de Ambiente no Render
- NODE_ENV: production
- RENDER: true
- DATABASE_URL: URL do PostgreSQL (fornecida pelo Render)
- PORT: 3000 (padrão)
- JWT_SECRET: Gerada automaticamente

### Correções para PostgreSQL
- Todos os placeholders SQL adaptados ($1, $2, ...)
- COALESCE adaptado para funcionar em ambos os bancos
- ON CONFLICT substituído por verificações manuais
- INSERT OR IGNORE substituído por INSERT com verificação

## CORREÇÕES FINAIS (17/06/2026)
=========================================

### Super Admin
- Criado sem forçar ID fixo (evita conflito de chave primária)
- Atualização automática de senha se já existir
- Busca dinâmica do ID da empresa

### Horários Disponíveis
- Rota /api/chatbot/horarios-disponiveis com placeholders corretos
- Query de ocupados adaptada para PostgreSQL

### Criação de Agendamentos
- Rota POST /api/agendamentos com placeholders corretos
- Suporte a serviço_id ou serviço manual

### Declaração isProduction
- Removida declaração duplicada no server.js
- Variável definida uma única vez no início

## REDESIGN LANDING PAGE E UI/UX (17/06/2026)
=========================================

### Landing Page Redesign
- Navbar com 3 links: Solução, Recursos, Planos
- Hero com tag, título forte, 2 CTAs e prova social
- Nova seção 'O que resolvemos' com 4 cards
- Seção de Estatísticas com números de impacto
- Seção 'Recursos poderosos' com 6 cards
- Seção de Depoimentos com 3 cards
- Planos com mais descrição e features
- CTA com badges de confiança

### Correções UI/UX
- Padronização de botões (todos com border-radius: 9999px)
- Cards com hover effects consistentes
- Dashboard com cards premium e métricas
- Responsividade melhorada para todos os dispositivos
- Menu mobile com todos os links e botões
- Animações AOS em todas as seções
- Posição do olho (toggle password) corrigida nos campos de senha
- Input group com ícones posicionados corretamente

=========================================
## ULTIMA ATUALIZACAO: 17/06/2026

MUDANCAS REALIZADAS:
- Implementado Chatbot Inteligente com calendário visual
- Adicionado bloqueio de clientes para chatbot
- Criada página pública /chatbot.html
- Adicionada rota de busca de cliente por telefone
- Criado sistema de limite de 20 dias entre agendamentos
- Dono adicionado como opção de profissional no chatbot
- Link do chatbot disponível nas configurações
- QR Code para compartilhamento fácil
- Criada Landing Page de vendas completa
- Implementado sistema de planos de assinatura
- Adicionados planos: Starter, Pro, Business, Enterprise
- Criado sistema de upgrade com middleware
- Implementado sistema de pagamentos (Mercado Pago)
- Adicionado modo de simulação para testes
- Criada tabela transacoes_pagamento
- Adicionada rota de cancelamento de assinatura
- Corrigido dashboard do profissional
- REFATORAÇÃO: Backend modularizado em server/ (16/06/2026)
- DEPLOY: Preparação para Render com PostgreSQL (17/06/2026)
- CORREÇÕES: Todas as queries adaptadas para PostgreSQL e SQLite
- CORREÇÃO: Super Admin sem forçar ID fixo
- CORREÇÃO: Horários disponíveis com placeholders corretos
- CORREÇÃO: Criação de agendamentos com placeholders corretos
- CORREÇÃO: Removida declaração duplicada de isProduction
- REDESIGN: Landing page profissional com novas seções
- CORREÇÃO: Toggle password (olho) posicionado corretamente
- CORREÇÃO: Input group com ícones alinhados
=========================================