
## 📄 **ARQUIVO 3: `docs/ESTRUTURA.md`**

```markdown
# ESTRUTURA DO PROJETO - Atualizada em 17/06/2026

├── database/
│   └── barbearia.db          # SQLite
├── public/
│   ├── index.html            # Frontend principal
│   ├── css/
│   │   └── style.css         # Estilos premium completos
│   └── js/
│       ├── ui.js             # UI Global (toasts, loading, modal)
│       └── pages/
│           ├── dashboard.js              # Dashboard Dono (completo)
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes (Dono)
│           ├── agendamentos.js           # CRUD Agendamentos (Dono) 
│           │   # COM FILTROS, EDIÇÃO, HORÁRIOS 30/30min, +NOVO CLIENTE
│           ├── agendamentos-profissional.js # Agendamentos (Profissional)
│           │   # COM EDIÇÃO, HORÁRIOS 30/30min
│           ├── servicos.js               # CRUD Servicos (Dono)
│           ├── financeiro.js             # Financeiro (cards por profissional)
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           └── configuracoes.js          # CONFIGURACOES UNIFICADAS
│               # Profissionais (CRUD completo) + Horarios
├── docs/                    # Documentacao
└── server.js                # Backend completo (com rotas de horarios 30/30min)

## VARIAVEIS GLOBAIS (localStorage)
- token: JWT do usuario logado
- usuario: { id, nome, email, role, empresa_id, comissao_percent? }

## FUNCOES GLOBAIS (no index.html)
- ativarBotao(id): Marca botão do menu como ativo
- fecharModal(id): Fecha modal
- logout(): Sai do sistema
- carregarMenu(): Monta menu baseado na role

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
- Agendamentos (CRUD com filtros, edicao, horarios 30/30min, +cliente)
- Servicos (CRUD completo)
- Financeiro (cards por profissional + totais)
- Clientes (CRUD)
- Configuracoes (UNIFICADO: profissionais + horarios de funcionamento)

### Profissional
- Dashboard (suas comissoes e pendentes)
- Meus Agendamentos (listar, criar, editar, concluir, horarios 30/30min)
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
- Intervalo entre agendamentos (15,30,45,60 min) - PADRÃO 30 min no código
- Salvamento automático ao alterar valores
- Agendamentos validam automaticamente os horários
- Corrigido fuso horário para datas
- **NOVO: Horários gerados de 30 em 30 minutos (09:00, 09:30, 10:00...)**

## FINANCEIRO DO DONO
- Faturamento Bruto: soma de todos os servicos concluidos
- Comissoes a Pagar: soma das comissoes (apenas com profissional)
- Faturamento Liquido: Bruto - Comissoes
- Cards por profissional: cada profissional com seu total de comissao

## DASHBOARD DO DONO (MELHORADO)
- Cards com faturamento do mês, total atendimentos, clientes, pendentes
- Cards com ticket médio, serviços concluídos, comissões a pagar, serviços ativos
- Gráfico de agendamentos por dia da semana
- Ranking de serviços mais populares (Top 5)
- Lista de próximos agendamentos
- Grid de últimos clientes
- Variação percentual do faturamento

## NOVIDADE: +NOVO CLIENTE NO AGENDAMENTO
- Botão "+ Novo Cliente" dentro do modal de agendamento
- Modal para cadastro rápido (nome, telefone, email)
- Atualização automática do select de clientes
- Seleção automática do novo cliente criado

=========================================
## ULTIMA ATUALIZACAO: 17/06/2026

MUDANCAS REALIZADAS:
- Adicionado sistema de Horarios de Funcionamento completo
- Adicionado Filtros nos Agendamentos (data, status, profissional)
- Adicionado Edicao de Agendamentos (Dono e Profissional)
- Unificado Configuracoes em uma unica tela
- Corrigido problema de fuso horario nas datas dos agendamentos
- Corrigida duplicacao de horarios no banco de dados
- Adicionado toggle switch com salvamento automatico
- **NOVO: Corrigido geracao de horarios de 30 em 30 minutos**
- **NOVO: Adicionado botao "+ Novo Cliente" no modal de agendamento**
- **NOVO: Dashboard melhorado com graficos e metricas**
- **NOVO: Dashboard agora consistente com tela financeiro**
- **NOVO: Gestao completa de profissionais na tela de configuracoes**
=========================================

## NOVIDADES - DESIGN E UI (17/06/2026)
- Glassmorphism com gradientes animados
- Responsividade completa (iPhone SE a Pro Max)
- Sidebar retrátil com swipe no mobile
- Suporte a safe area (iPhones com notch)
- Toast notifications coloridas
- Loading spinner animado
- Touch targets otimizados (44px+)
- Scrollbar customizada com gradiente
- Animações fade-in e slide-up
- Badges com gradientes por tipo de usuário
=========================================