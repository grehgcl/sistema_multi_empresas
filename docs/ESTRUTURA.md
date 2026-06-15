# ESTRUTURA DO PROJETO - Atualizada em 19/06/2026

├── database/
│   └── barbearia.db          # SQLite
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
└── server.js                # Backend completo + rotas chatbot

## VARIAVEIS GLOBAIS (localStorage)
- token: JWT do usuario logado
- usuario: { id, nome, email, role, empresa_id, comissao_percent? }

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

## SISTEMA DE PLANOS (NOVO)
- Starter: R$ 24,90/mês - 1 profissional
- Pro: R$ 49,90/mês - 5 profissionais
- Business: R$ 99,90/mês - 12 profissionais
- Enterprise: R$ 199,90/mês - Profissionais ilimitados
- 45 dias de teste grátis para novos cadastros
- Middleware verifica limite antes de criar profissional
- Tabela planos_historico registra todas as mudanças

## CHATBOT INTELIGENTE (NOVO)
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

## LANDING PAGE (NOVO)
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
- Edição completa de dados

=========================================
## ULTIMA ATUALIZACAO: 19/06/2026

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
- Corrigido dashboard do profissional
=========================================