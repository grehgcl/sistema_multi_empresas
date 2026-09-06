# 🛤️ ROTAS DO BACKEND (160)

Legenda: ✅ usada pelo frontend · 🟡 parcialmente casada · 🔗 webhook/externa · ❓ sem correspondência no frontend

| Método | Qtd |
|---|---|
| GET | 77 |
| POST | 44 |
| PUT | 31 |
| DELETE | 8 |

## 📄 scripts/xray-project.js ⚠️ prefixo não identificado

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/rota` | — | 220 | — | ❓ |

## 📄 server/routes/admin.routes.js (prefixo: `/admin`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/admin/stats` | — | 50 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas` | — | 125 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas/:id` | id | 219 | auth, verificarSuperAdmin | ❓ |
| PUT | `/admin/empresas/:id` | id | 261 | auth, verificarSuperAdmin | ❓ |
| DELETE | `/admin/empresas/:id` | id | 289 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/usuarios` | — | 403 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresa/:id` | id | 437 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/usuarios/:id` | id | 481 | auth, verificarSuperAdmin | ❓ |
| PUT | `/admin/usuarios/:id` | id | 551 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/faturamento-mensal` | — | 637 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/crescimento-empresas` | — | 662 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas/:id/usuarios` | id | 686 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas/:id/acessos` | id | 779 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas/:id/clientes` | id | 812 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas/:id/agendamentos` | id | 840 | auth, verificarSuperAdmin | ❓ |
| POST | `/admin/empresas/:id/extender-trial` | id | 887 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas/estatisticas` | — | 918 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/empresas/:id` | id | 1011 | auth, verificarSuperAdmin | ❓ |
| PUT | `/admin/profissionais/:id` | id | 1096 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/profissionais/:id` | id | 1171 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/acessos` | — | 1207 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/planos-config` | — | 1269 | auth, verificarSuperAdmin | ❓ |
| PUT | `/admin/planos-config` | — | 1282 | auth, verificarSuperAdmin | ❓ |
| POST | `/admin/registrar-acesso` | — | 1295 | auth, verificarSuperAdmin | ❓ |
| PUT | `/admin/empresas/:id/whatsapp-proprio` | id | 1316 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/ads-stats` | — | 1444 | auth, verificarSuperAdmin | ❓ |
| POST | `/admin/ads-stats` | — | 1558 | auth, verificarSuperAdmin | ❓ |
| GET | `/admin/ads-stats/summary` | — | 1622 | auth, verificarSuperAdmin | ❓ |

## 📄 server/routes/agendamentos.routes.js (prefixo: `/agendamentos`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/agendamentos/` | — | 47 | auth | ❓ |
| GET | `/agendamentos/:id` | id | 109 | auth | ❓ |
| POST | `/agendamentos/` | — | 163 | auth | ❓ |
| PUT | `/agendamentos/:id` | id | 534 | auth, verificarDono | ❓ |
| PUT | `/agendamentos/:id/concluir` | id | 682 | auth, verificarDono | ❓ |
| PUT | `/agendamentos/:id/confirmar` | id | 859 | auth, verificarDono | ❓ |
| PUT | `/agendamentos/:id/cancelar` | id | 917 | auth, verificarDono | ❓ |
| DELETE | `/agendamentos/:id` | id | 1029 | auth | ❓ |
| PUT | `/agendamentos/:id/extras` | id | 1089 | auth, verificarDono | ❓ |
| GET | `/agendamentos/periodo` | — | 1136 | auth | ❓ |
| GET | `/agendamentos/horarios-disponiveis` | — | 1190 | auth | ❓ |
| GET | `/agendamentos/profissionais-disponiveis` | — | 1300 | auth | ❓ |
| PUT | `/agendamentos/:id/pagamento` | id | 1357 | auth | ❓ |
| POST | `/agendamentos/:id/enviar-cobranca` | id | 1658 | auth, verificarDono | ❓ |

## 📄 server/routes/auth.js ⚠️ prefixo não identificado

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| POST | `/login` | — | 8 | — | ❓ |
| GET | `/verify` | — | 51 | — | ❓ |

## 📄 server/routes/auth.routes.js (prefixo: `/auth`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| POST | `/auth/login` | — | 71 | — | ❓ |
| POST | `/auth/cadastro` | — | 179 | — | ❓ |
| POST | `/auth/verificar` | — | 487 | — | ❓ |

## 📄 server/routes/chatbot.routes.js (prefixo: `/chatbot`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/chatbot/link/:empresaId` | empresaId | 152 | — | ❓ |
| GET | `/chatbot/empresa/:id` | id | 164 | — | ❓ |
| GET | `/chatbot/servicos/:empresaId` | empresaId | 240 | — | ❓ |
| GET | `/chatbot/profissionais/:empresaId` | empresaId | 277 | — | ❓ |
| POST | `/chatbot/cliente/buscar` | — | 314 | — | ❓ |
| POST | `/chatbot/cliente/criar` | — | 387 | — | ❓ |
| POST | `/chatbot/datas-disponiveis-mes` | — | 425 | — | ❓ |
| POST | `/chatbot/horarios-disponiveis` | — | 530 | — | ❓ |
| POST | `/chatbot/agendar` | — | 670 | — | ❓ |
| GET | `/chatbot/link-personalizado/:empresaId` | empresaId | 921 | — | ❓ |
| GET | `/chatbot/:slug` | slug | 967 | — | ❓ |
| POST | `/chatbot/registrar-anuncio` | — | 1083 | — | ❓ |

## 📄 server/routes/clientes.routes.js (prefixo: `/clientes`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/clientes/paginated` | — | 18 | auth | ❓ |
| GET | `/clientes/` | — | 208 | auth | ❓ |
| GET | `/clientes/grupos` | — | 294 | auth | ❓ |
| GET | `/clientes/:id` | id | 371 | auth | ❓ |
| GET | `/clientes/:id/grupos` | id | 432 | auth | ❓ |
| POST | `/clientes/` | — | 483 | auth | ❓ |
| PUT | `/clientes/:id` | id | 530 | auth, verificarDono | ❓ |
| DELETE | `/clientes/:id` | id | 607 | auth, verificarDono | ❓ |
| PUT | `/clientes/:id/bloquear-chatbot` | id | 664 | auth, verificarDono | ❓ |
| PUT | `/clientes/:id/grupos` | id | 709 | auth | ❓ |
| POST | `/clientes/bulk` | — | 788 | auth, verificarDono | ❓ |
| GET | `/clientes/stats` | — | 874 | auth | ❓ |

## 📄 server/routes/despesas.routes.js (prefixo: `/despesas`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/despesas/` | — | 14 | auth | ❓ |
| GET | `/despesas/resumo` | — | 106 | auth | ❓ |
| GET | `/despesas/categorias` | — | 178 | auth | ❓ |
| GET | `/despesas/:id` | id | 220 | auth | ❓ |
| POST | `/despesas/` | — | 272 | auth, verificarDono | ❓ |
| PUT | `/despesas/:id` | id | 339 | auth, verificarDono | ❓ |
| DELETE | `/despesas/:id` | id | 412 | auth, verificarDono | ❓ |

## 📄 server/routes/empresas.routes.js (prefixo: `/empresa`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/empresa/plano` | — | 43 | auth | ❓ |
| GET | `/empresa/dados` | — | 94 | auth | ❓ |
| GET | `/empresa/dados-completos` | — | 140 | auth | ❓ |
| PUT | `/empresa/dados` | — | 218 | auth, verificarDono | ❓ |
| PUT | `/empresa/endereco` | — | 255 | auth, verificarDono | ❓ |
| PUT | `/empresa/telefone-dono` | — | 283 | auth, verificarDono | ❓ |
| PUT | `/empresa/bloqueio-geral` | — | 317 | auth, verificarDono | ❓ |
| PUT | `/empresa/bloqueio-geral` | — | 350 | auth, verificarDono | ❓ |

## 📄 server/routes/fiados.routes.js ⚠️ prefixo não identificado

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/` | — | 15 | auth | ❓ |
| PUT | `/:id/baixar` | id | 123 | auth, verificarDono | ❓ |
| GET | `/stats` | — | 274 | auth | ❓ |

## 📄 server/routes/financeiro.routes.js (prefixo: `/financeiro`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/financeiro/` | — | 49 | auth | ❓ |
| GET | `/financeiro/comparativo` | — | 239 | auth | ❓ |
| GET | `/financeiro/receitas` | — | 327 | auth | ❓ |
| GET | `/financeiro/analise-diaria` | — | 436 | auth | ❓ |
| GET | `/financeiro/despesas/:id` | id | 521 | auth, verificarDono | ❓ |
| DELETE | `/financeiro/:id` | id | 571 | auth, verificarDono | ❓ |
| GET | `/financeiro/fiados` | — | 662 | auth | ❓ |
| PUT | `/financeiro/fiados/:id/baixar` | id | 775 | auth, verificarDono | ❓ |
| GET | `/financeiro/fiados/stats` | — | 919 | auth | ❓ |
| PUT | `/financeiro/fiados/:id/baixar` | id | 976 | auth, verificarDono | ❓ |
| POST | `/financeiro/receitas/manual` | — | 1129 | auth, verificarDono | ❓ |
| DELETE | `/financeiro/receitas/manual/:id` | id | 1218 | auth, verificarDono | ❓ |

## 📄 server/routes/horarios.routes.js (prefixo: `/horarios`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/horarios/` | — | 40 | auth | ❓ |
| PUT | `/horarios/:dia` | dia | 66 | auth, verificarDono | ❓ |
| POST | `/horarios/` | — | 195 | auth, verificarDono | ❓ |
| POST | `/horarios/inicializar` | — | 299 | auth, verificarDono | ❓ |

## 📄 server/routes/pagamento.routes.js (prefixo: `/pagamento`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/pagamento/config` | — | 103 | auth | ❓ |
| PUT | `/pagamento/config` | — | 130 | auth, verificarSuperAdmin | ❓ |
| GET | `/pagamento/status` | — | 171 | — | ❓ |
| POST | `/pagamento/simulate-payment` | — | 185 | auth | ❓ |
| POST | `/pagamento/simulate-pix` | — | 270 | auth | ❓ |
| POST | `/pagamento/simulate-card` | — | 303 | auth | ❓ |
| POST | `/pagamento/simulate-boleto` | — | 358 | auth | ❓ |
| POST | `/pagamento/confirm-simulated-payment/:paymentId` | paymentId | 389 | auth | ❓ |
| POST | `/pagamento/mercadopago/webhook` | — | 445 | — | 🔗 |
| POST | `/pagamento/create-boleto` | — | 584 | auth | ❓ |
| POST | `/pagamento/create-pix` | — | 616 | auth | ❓ |
| POST | `/pagamento/create-payment` | — | 645 | auth, verificarDono | ❓ |
| POST | `/pagamento/webhook` | — | 750 | — | 🔗 |

## 📄 server/routes/planos.routes.js (prefixo: `/planos`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/planos/payment-mode` | — | 185 | auth | ❓ |
| GET | `/planos/` | — | 201 | auth | ❓ |
| GET | `/planos/empresa` | — | 208 | auth | ❓ |
| PUT | `/planos/empresa` | — | 225 | auth, verificarDono | ❓ |
| POST | `/planos/upgrade` | — | 273 | auth, verificarDono | ❓ |
| POST | `/planos/cancel-subscription` | — | 290 | auth, verificarDono | ❓ |
| POST | `/planos/admin/ativar-whatsapp/:id` | id | 312 | auth, verificarSuperAdmin | ❓ |

## 📄 server/routes/profissionais.routes.js (prefixo: `/profissionais`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/profissionais/` | — | 41 | auth | ❓ |
| GET | `/profissionais/:id` | id | 91 | auth | ❓ |
| POST | `/profissionais/` | — | 135 | auth, verificarDono | ❓ |
| PUT | `/profissionais/:id` | id | 204 | auth, verificarDono | ❓ |
| POST | `/profissionais/:id/reset-senha` | id | 322 | auth, verificarDono | ❓ |
| DELETE | `/profissionais/:id` | id | 377 | auth, verificarDono | ❓ |
| GET | `/profissionais/profissional/agendamentos` | — | 425 | auth | ❓ |
| GET | `/profissionais/profissional/financeiro` | — | 464 | auth | ❓ |
| PUT | `/profissionais/profissional/agendamentos/:id` | id | 569 | auth | ❓ |
| PUT | `/profissionais/profissional/agendamentos/:id/concluir` | id | 637 | auth | ❓ |

## 📄 server/routes/servicos.routes.js (prefixo: `/servicos`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/servicos/` | — | 14 | auth | ❓ |
| GET | `/servicos/todos` | — | 65 | auth, verificarDono | ❓ |
| POST | `/servicos/` | — | 103 | auth | ❓ |
| PUT | `/servicos/:id` | id | 152 | auth, verificarDono | ❓ |
| DELETE | `/servicos/:id` | id | 206 | auth, verificarDono | ❓ |

## 📄 server/routes/whatsapp.js ⚠️ prefixo não identificado

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| POST | `/webhook/wati` | — | 9 | — | 🔗 |
| POST | `/teste` | — | 32 | — | ❓ |
| GET | `/status` | — | 50 | — | ❓ |

## 📄 server/routes/whatsapp.routes.js (prefixo: `/whatsapp`)

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/whatsapp/info` | — | 41 | auth | ❓ |
| POST | `/whatsapp/criar-instancia` | — | 83 | auth | ❓ |
| GET | `/whatsapp/qrcode` | — | 157 | auth | ❓ |
| GET | `/whatsapp/status` | — | 279 | auth | ❓ |
| POST | `/whatsapp/disconnect` | — | 406 | auth | ❓ |
| POST | `/whatsapp/contatos` | — | 471 | auth | ❓ |
| GET | `/whatsapp/contatos` | — | 525 | auth | ❓ |
| GET | `/whatsapp/admin/empresas/whatsapp-status` | — | 570 | auth, verificarSuperAdmin | ❓ |
| PUT | `/whatsapp/admin/empresas/:id/whatsapp-proprio` | id | 615 | auth, verificarSuperAdmin | ❓ |
| POST | `/whatsapp/webhook` | — | 730 | — | 🔗 |
| GET | `/whatsapp/webhook` | — | 805 | — | 🔗 |
| POST | `/whatsapp/enviar` | — | 828 | auth | ❓ |

## 📄 server.js ⚠️ prefixo não identificado

| Método | Caminho final | Parâmetros | Linha | Middlewares | Front |
|---|---|---|---|---|---|
| GET | `/manifest.json` | — | 129 | — | ❓ |
| GET | `/sw.js` | — | 133 | — | ❓ |
| GET | `/icons/:file` | file | 137 | — | ❓ |
| GET | `/health` | — | 704 | — | ❓ |

