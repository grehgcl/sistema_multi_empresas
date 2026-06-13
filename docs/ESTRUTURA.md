# ESTRUTURA DO PROJETO - Atualizada em 15/06/2026

├── database/
│   └── barbearia.db          # SQLite
├── public/
│   ├── index.html            # Frontend principal
│   └── js/
│       └── pages/
│           ├── dashboard.js              # Dashboard Dono
│           ├── dashboard-profissional.js # Dashboard Profissional
│           ├── clientes.js               # CRUD Clientes (Dono)
│           ├── agendamentos.js           # CRUD Agendamentos (Dono) - COM FILTROS, EDIÇÃO E HORÁRIOS
│           ├── agendamentos-profissional.js # Agendamentos (Profissional) - COM EDIÇÃO E HORÁRIOS
│           ├── servicos.js               # CRUD Servicos (Dono)
│           ├── financeiro.js             # Financeiro (cards por profissional)
│           ├── empresas.js               # Gestao empresas (Super Admin)
│           └── configuracoes.js          # CONFIGURACOES UNIFICADAS (Profissionais + Horarios)
├── docs/                    # Documentacao
└── server.js                # Backend completo (com rotas de horarios)

## VARIAVEIS GLOBAIS (localStorage)
- token: JWT do usuario logado
- usuario: { id, nome, email, role, empresa_id, comissao_percent? }

## FUNCOES GLOBAIS (no index.html)
- ativarBotao(id): Marca botão do menu como ativo
- fecharModal(id): Fecha modal
- logout(): Sai do sistema
- carregarMenu(): Monta menu baseado na role

## FLUXO DE TELAS POR ROLE

### Super Admin
- Dashboard (stats globais)
- Empresas (listar, editar, estender trial)
- Financeiro Global (todas comissoes)

### Dono
- Dashboard (stats da empresa)
- Agendamentos (CRUD com filtros, edicao, horarios disponiveis)
- Servicos (CRUD completo)
- Financeiro (cards por profissional + totais)
- Clientes (CRUD)
- Configuracoes (UNIFICADO: profissionais + horarios de funcionamento)

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
- Intervalo entre agendamentos (15,30,45,60 min)
- Salvamento automático ao alterar valores
- Agendamentos validam automaticamente os horários
- Corrigido fuso horário para datas

## FINANCEIRO DO DONO
- Faturamento Bruto: soma de todos os servicos concluidos
- Comissoes a Pagar: soma das comissoes (apenas com profissional)
- Faturamento Liquido: Bruto - Comissoes
- Cards por profissional: cada profissional com seu total de comissao

=========================================
## ULTIMA ATUALIZACAO: 15/06/2026

MUDANCAS REALIZADAS:
- Adicionado sistema de Horarios de Funcionamento completo
- Adicionado Filtros nos Agendamentos (data, status, profissional)
- Adicionado Edicao de Agendamentos (Dono e Profissional)
- Unificado Configuracoes em uma unica tela
- Corrigido problema de fuso horario nas datas dos agendamentos
- Corrigida duplicacao de horarios no banco de dados
- Adicionado toggle switch com salvamento automatico
=========================================