# 🏗️ ARQUITETURA — Dependências e Montagens

## 🔌 Montagens de rotas (app.use / router.use)

| Prefixo | Módulo destino | Onde | Tipo |
|---|---|---|---|
| `/auth` | var:authRoutes | server/routes/index.js:22 | router.use |
| `/empresa` | var:empresasRoutes | server/routes/index.js:23 | router.use |
| `/servicos` | var:servicosRoutes | server/routes/index.js:24 | router.use |
| `/horarios` | var:horariosRoutes | server/routes/index.js:25 | router.use |
| `/profissionais` | var:profissionaisRoutes | server/routes/index.js:26 | router.use |
| `/clientes` | var:clientesRoutes | server/routes/index.js:27 | router.use |
| `/despesas` | var:despesasRoutes | server/routes/index.js:28 | router.use |
| `/agendamentos` | var:agendamentosRoutes | server/routes/index.js:29 | router.use |
| `/financeiro` | var:financeiroRoutes | server/routes/index.js:30 | router.use |
| `/admin` | var:adminRoutes | server/routes/index.js:31 | router.use |
| `/whatsapp` | var:whatsappRoutes | server/routes/index.js:32 | router.use |
| `/chatbot` | var:chatbotRoutes | server/routes/index.js:33 | router.use |
| `/pagamento` | var:pagamentoRoutes | server/routes/index.js:34 | router.use |
| `/planos` | var:planosRoutes | server/routes/index.js:35 | router.use |
| `/api/auth` | var:authRoutes | server.js:167 | app.use |
| `/api/pagamento` | var:pagamentoRoutes | server.js:178 | app.use |
| `/api/planos` | var:planosRoutes | server.js:189 | app.use |
| `/api/chatbot` | var:chatbotRoutes | server.js:201 | app.use |
| `/chatbot` | var:chatbotRoutes | server.js:205 | app.use |
| `/api/admin` | var:auth | server.js:218 | app.use |
| `/api/empresa` | var:auth | server.js:227 | app.use |
| `/api/clientes` | var:auth | server.js:236 | app.use |
| `/api/servicos` | var:auth | server.js:245 | app.use |
| `/api/agendamentos` | var:auth | server.js:254 | app.use |
| `/api/profissionais` | var:auth | server.js:263 | app.use |
| `/api/financeiro` | var:auth | server.js:272 | app.use |
| `/api/despesas` | var:auth | server.js:281 | app.use |
| `/api/horarios` | var:auth | server.js:290 | app.use |
| `/api/empresa/whatsapp` | var:auth | server.js:299 | app.use |
| `/api/whatsapp` | var:auth | server.js:300 | app.use |
| `/api/fiados` | var:auth | server.js:309 | app.use |

## 🔗 Dependências internas (require)

### server/config/migrations/run-migration.js
- linha 1 → `server/config/database.js`

### server/jobs/email-cron.js
- linha 3 → `server/services/email.js`

### server/jobs/lembretes-pagamento.js
- linha 7 → `server/config/database.js`

### server/jobs/lembretes.js
- linha 3 → `server/config/database.js`
- linha 4 → `server/services/whatsapp.js`

### server/jobs/reset-contador.js
- linha 5 → `server/config/database.js`

### server/middlewares/auth.js
- linha 6 → `server/utils/constants.js`
- linha 7 → `server/config/database.js`

### server/middlewares/empresa-db.js
- linha 1 → `server/config/database.js`

### server/routes/admin.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`
- linha 1271 → `server/utils/constants.js`

### server/routes/agendamentos.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`
- linha 15 → `server/utils/helpers.js`
- linha 1555 → `server/config/database.js`
- linha 1722 → `server/jobs/lembretes-pagamento.js`

### server/routes/auth.routes.js
- linha 9 → `server/config/database.js`
- linha 12 → `server/utils/constants.js`

### server/routes/chatbot.routes.js
- linha 8 → `server/config/database.js`
- linha 16 → `server/config/database.js`
- linha 249 → `server/config/database.js`
- linha 286 → `server/config/database.js`
- linha 535 → `server/config/database.js`
- linha 697 → `server/config/database.js`
- linha 864 → `server/services/whatsapp.js`

### server/routes/clientes.routes.js
- linha 9 → `server/config/database.js`
- linha 10 → `server/middlewares/auth.js`

### server/routes/despesas.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`

### server/routes/empresas.routes.js
- linha 6 → `server/config/database.js`
- linha 7 → `server/middlewares/auth.js`
- linha 8 → `server/config/database.js`

### server/routes/fiados.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`
- linha 190 → `server/config/database.js`

### server/routes/financeiro.routes.js
- linha 8 → `server/config/database.js`
- linha 9 → `server/middlewares/auth.js`
- linha 783 → `server/config/database.js`
- linha 1045 → `server/config/database.js`

### server/routes/horarios.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`

### server/routes/index.js
- linha 6 → `server/routes/auth.routes.js`
- linha 7 → `server/routes/empresas.routes.js`
- linha 8 → `server/routes/servicos.routes.js`
- linha 9 → `server/routes/horarios.routes.js`
- linha 10 → `server/routes/profissionais.routes.js`
- linha 11 → `server/routes/clientes.routes.js`
- linha 12 → `server/routes/despesas.routes.js`
- linha 13 → `server/routes/agendamentos.routes.js`
- linha 14 → `server/routes/financeiro.routes.js`
- linha 15 → `server/routes/admin.routes.js`
- linha 16 → `server/routes/whatsapp.routes.js`
- linha 17 → `server/routes/chatbot.routes.js`
- linha 18 → `server/routes/pagamento.routes.js`
- linha 19 → `server/routes/planos.routes.js`

### server/routes/pagamento.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`

### server/routes/planos.routes.js
- linha 9 → `server/config/database.js`
- linha 10 → `server/middlewares/auth.js`

### server/routes/profissionais.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`

### server/routes/servicos.routes.js
- linha 6 → `server/config/database.js`
- linha 7 → `server/middlewares/auth.js`

### server/routes/whatsapp.js
- linha 4 → `server/services/whatsapp.js`

### server/routes/whatsapp.routes.js
- linha 7 → `server/config/database.js`
- linha 8 → `server/middlewares/auth.js`
- linha 114 → `server/services/evolution-instances.js`
- linha 206 → `server/services/evolution-instances.js`
- linha 321 → `server/services/evolution-instances.js`
- linha 433 → `server/services/evolution-instances.js`
- linha 503 → `server/services/evolution-instances.js`
- linha 548 → `server/services/evolution-instances.js`

### server/services/evolution-instances.js
- linha 59 → `server/config/database.js`
- linha 153 → `server/config/database.js`

### server/services/whatsapp.js
- linha 6 → `server/config/database.js`
- linha 73 → `server/config/database.js`

### server/utils/helpers.js
- linha 3 → `server/config/database.js`

### server.js
- linha 38 → `server/jobs/lembretes-pagamento.js`
- linha 48 → `server/config/database.js`
- linha 57 → `server/middlewares/auth.js`
- linha 58 → `server/utils/constants.js`
- linha 64 → `server/utils/helpers.js`
- linha 106 → `server/services/mercadopago.js`
- linha 111 → `server/services/whatsapp.js`
- linha 166 → `server/routes/auth.routes.js`
- linha 177 → `server/routes/pagamento.routes.js`
- linha 188 → `server/routes/planos.routes.js`
- linha 199 → `server/routes/chatbot.routes.js`
- linha 217 → `server/routes/admin.routes.js`
- linha 226 → `server/routes/empresas.routes.js`
- linha 235 → `server/routes/clientes.routes.js`
- linha 244 → `server/routes/servicos.routes.js`
- linha 253 → `server/routes/agendamentos.routes.js`
- linha 262 → `server/routes/profissionais.routes.js`
- linha 271 → `server/routes/financeiro.routes.js`
- linha 280 → `server/routes/despesas.routes.js`
- linha 289 → `server/routes/horarios.routes.js`
- linha 298 → `server/routes/whatsapp.routes.js`
- linha 308 → `server/routes/fiados.routes.js`
- linha 647 → `server/jobs/reset-contador.js`
- linha 658 → `server/jobs/lembretes.js`
- linha 672 → `server/jobs/lembretes-pagamento.js`

## 🧩 Módulos e o que exportam

### server/config/database.js
- Exporta: `db`, `getEmpresaDb`

### server/config/db-hybrid.js
- Exporta: `adaptQuery`, `HybridDB`, `isSQLite`

### server/config/migrations/run-migration.js
- Exporta: `runMigration`

### server/jobs/email-cron.js
- Exporta: `start`

### server/jobs/lembretes-pagamento.js
- Exporta: `processarCobrancas`, `enviarMensagemCobranca`

### server/jobs/reset-contador.js
- Exporta: `start`

### server/middlewares/auth.js
- Exporta: `auth`, `verificarSuperAdmin`, `verificarDono`, `verificarLimiteProfissionais`, `verificarAcessoAgendamentos`, `verificarLimiteAgendamentos`

### server/middlewares/empresa-db.js
- Exporta: `withEmpresaDb`

### server/services/email.js
- Exporta: `enviarBoasVindas`, `enviarBoleto`, `enviarPix`, `notificarNovoCadastro`

### server/services/whatsapp.js
- Exporta: `send`, `enviarConfirmacao`, `enviarCancelamento`, `enviarConclusao`, `formatarDataBr`, `formatarTelefone`, `getInstanciaEmpresa`

### server/utils/constants.js
- Exporta: `PLANOS`, `PLANOS_NOMES`, `JWT_SECRET`

### server/utils/helpers.js
- Exporta: `formatarDataBr`, `incrementarContadorAgendamentos`, `resetarContadorAgendamentos`, `verificarDisponibilidadeHorario`, `verificarLimiteAgendamentos`

### server/utils/sqlite-compat.js
- Exporta: `formatDate`, `formatMonthYear`, `coalesceSum`, `dateInterval`, `extractMonth`, `extractYear`, `extractDay`, `lower`, `toChar`, `convertPlaceholders`


## 🔌 Socket.io Events

_Nenhum evento Socket.io encontrado_
