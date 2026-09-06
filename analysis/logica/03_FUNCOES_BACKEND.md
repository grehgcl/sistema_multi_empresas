# ⚙️ FUNÇÕES DO BACKEND (693 no projeto todo)

## 📄 server/config/database.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `prepareSqlForSQLite` | sql | 18 |  | ✅| `extractMonth` | field | 166 |  | ⚠️| `extractYear` | field | 170 |  | ⚠️| `extractDay` | field | 174 |  | ⚠️| `formatDate` | field | 178 |  | ✅| `coalesceSum` | field | 182 |  | ⚠️| `initDatabase` | — | 202 |  | ⚠️| `inserirHorariosPadrao` | — | 206 |  | ⚠️| `verificarColunaDiasBloqueio` | — | 210 |  | ⚠️

## 📄 server/config/db-hybrid.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `adaptQuery` | sql, isSQLite | 4 | ✅ | ✅

## 📄 server/config/migrations/run-migration.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `runMigration` | — | 5 | ✅ | ✅

## 📄 server/jobs/email-cron.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `enviarDicas` | — | 8 |  | ✅| `verificarTrial` | — | 26 |  | ✅| `start` | — | 44 | ✅ | ⚠️

## 📄 server/jobs/lembretes-pagamento.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `enviarMensagemCobranca` | whatsappInstance, numero, mensagem | 13 | ✅ | ✅| `formatarDataBr` | dataStr | 53 |  | ✅| `processarCobrancas` | — | 130 | ✅ | ✅

## 📄 server/jobs/reset-contador.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `resetarContadores` | — | 12 |  | ✅

## 📄 server/middlewares/auth.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `auth` | req, res, next | 13 | ✅ | ⚠️| `verificarSuperAdmin` | req, res, next | 48 | ✅ | ⚠️| `verificarDono` | req, res, next | 82 | ✅ | ⚠️| `verificarLimiteProfissionais` | req, res, next | 117 | ✅ | ⚠️| `verificarAcessoAgendamentos` | req, res, next | 159 | ✅ | ⚠️| `verificarLimiteAgendamentos` | req, res, next | 241 | ✅ | ⚠️| `incrementarContadorAgendamentos` | empresaId, callback | 318 |  | ⚠️| `incrementar` | — | 355 |  | ✅

## 📄 server/middlewares/empresa-db.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `withEmpresaDb` | req, res, next | 3 | ✅ | ⚠️

## 📄 server/routes/admin.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `extractMonth` | field | 18 |  | ⚠️| `extractYear` | field | 22 |  | ⚠️| `extractDay` | field | 26 |  | ⚠️| `formatDate` | field | 30 |  | ⚠️| `coalesceSum` | field | 34 |  | ✅| `formatMonthYear` | coluna | 38 |  | ✅| `dateInterval` | intervalo | 42 |  | ✅

## 📄 server/routes/agendamentos.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `extractMonth` | field | 23 |  | ⚠️| `extractYear` | field | 27 |  | ⚠️| `extractDay` | field | 31 |  | ⚠️| `formatDate` | field | 35 |  | ⚠️| `coalesceSum` | field | 39 |  | ⚠️| `finalizarResposta` | agendamentoId | 387 |  | ✅| `continuarUpdate` | — | 589 |  | ✅| `inserirReceita` | — | 1510 |  | ✅| `formatarDataBr` | dataStr | 1575 |  | ✅

## 📄 server/routes/auth.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `getCurrentTimestamp` | — | 24 |  | ✅| `extractMonth` | field | 28 |  | ⚠️| `extractYear` | field | 32 |  | ⚠️| `extractDay` | field | 36 |  | ⚠️| `formatDate` | field | 40 |  | ⚠️| `coalesceSum` | field | 44 |  | ⚠️| `gerarNomeBanco` | nomeEmpresa, empresaId | 52 |  | ✅

## 📄 server/routes/chatbot.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `registrarEventoAds` | empresaId, tipo, campanha, origem, clienteId = null, agendamentoId = null, valor = 0, custo = 0 | 15 |  | ✅| `horaParaMinutos` | hora | 87 |  | ✅| `minutosParaHora` | minutos | 93 |  | ✅| `formatarDataBr` | dataStr | 99 |  | ✅| `gerarHorariosDoDia` | inicio, fim, almocoInicio, almocoFim | 112 |  | ✅| `gerarDatasFallback` | ano, mes | 128 |  | ✅

## 📄 server/routes/empresas.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `extractMonth` | field | 17 |  | ⚠️| `extractYear` | field | 21 |  | ⚠️| `extractDay` | field | 25 |  | ⚠️| `formatDate` | field | 29 |  | ✅| `coalesceSum` | field | 33 |  | ⚠️

## 📄 server/routes/financeiro.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `lower` | field | 17 |  | ⚠️| `extractMonth` | field | 21 |  | ⚠️| `extractYear` | field | 25 |  | ⚠️| `extractDay` | field | 29 |  | ⚠️| `formatDate` | field | 33 |  | ⚠️| `coalesce` | field, fallback | 37 |  | ⚠️| `coalesceSum` | field | 41 |  | ⚠️| `getDados` | mes, ano | 255 |  | ✅

## 📄 server/routes/horarios.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `extractMonth` | field | 16 |  | ⚠️| `extractYear` | field | 20 |  | ⚠️| `extractDay` | field | 24 |  | ⚠️| `formatDate` | field | 28 |  | ⚠️| `coalesceSum` | field | 32 |  | ⚠️

## 📄 server/routes/pagamento.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `extractMonth` | field | 16 |  | ⚠️| `extractYear` | field | 20 |  | ⚠️| `extractDay` | field | 24 |  | ⚠️| `formatDate` | field | 28 |  | ⚠️| `coalesceSum` | field | 32 |  | ⚠️| `getPaymentMode` | callback | 51 |  | ✅

## 📄 server/routes/planos.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `getPaymentModeFromDB` | callback | 19 |  | ✅| `normalizarPlano` | plano | 99 |  | ✅| `booleano` | valor | 104 |  | ✅| `dataValida` | valor | 108 |  | ✅| `diasAte` | valor | 114 |  | ✅| `adicionarDias` | dias | 121 |  | ✅| `assinaturaAtiva` | empresa, plano | 127 |  | ✅| `montarResposta` | empresa | 133 |  | ✅| `buscarEmpresa` | empresaId, callback | 166 |  | ✅| `atualizarWhatsApp` | empresaId, habilitado, callback = ( | 174 |  | ✅

## 📄 server/routes/profissionais.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `extractMonth` | field | 17 |  | ⚠️| `extractYear` | field | 21 |  | ⚠️| `extractDay` | field | 25 |  | ⚠️| `formatDate` | field | 29 |  | ⚠️| `coalesceSum` | field | 33 |  | ⚠️

## 📄 server/routes/whatsapp.routes.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `extractMonth` | field | 17 |  | ⚠️| `extractYear` | field | 21 |  | ⚠️| `extractDay` | field | 25 |  | ⚠️| `formatDate` | field | 29 |  | ⚠️| `coalesceSum` | field | 33 |  | ⚠️

## 📄 server/services/email.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `enviarBoasVindas` | email, nome, empresaNome | 19 | ✅ | ⚠️| `enviarBoleto` | email, nome, planoNome, valor, boletoUrl | 291 | ✅ | ⚠️| `enviarPix` | email, nome, planoNome, valor, qrCode, qrCodeBase64 | 319 | ✅ | ⚠️| `notificarNovoCadastro` | donoEmail, nome, empresaNome, telefone, email | 348 | ✅ | ⚠️

## 📄 server/services/whatsapp.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `formatarDataBr` | dataStr | 33 | ✅ | ✅| `formatarTelefone` | telefone | 48 | ✅ | ✅| `formatNumber` | number | 59 |  | ✅| `getInstanciaEmpresa` | empresaId | 68 | ✅ | ✅| `send` | empresaId, numero, mensagem | 111 | ✅ | ✅| `enviarConfirmacao` | dados | 175 | ✅ | ⚠️| `enviarCancelamento` | dados | 218 | ✅ | ⚠️| `enviarConclusao` | dados | 237 | ✅ | ⚠️

## 📄 server/utils/helpers.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `formatarDataBr` | dataStr | 9 | ✅ | ⚠️| `incrementarContadorAgendamentos` | empresaId, callback | 23 | ✅ | ⚠️| `resetarContadorAgendamentos` | empresaId, callback | 46 | ✅ | ✅| `verificarLimiteAgendamentos` | empresaId, callback | 70 | ✅ | ⚠️| `verificarDisponibilidadeHorario` | empresaId, profissionalId, data, hora, duracao | 114 | ✅ | ⚠️

## 📄 server/utils/sqlite-compat.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `formatDate` | coluna | 4 | ✅ | ⚠️| `formatMonthYear` | coluna | 8 | ✅ | ⚠️| `coalesceSum` | valor | 12 | ✅ | ⚠️| `dateInterval` | intervalo | 16 | ✅ | ⚠️| `extractMonth` | coluna | 20 | ✅ | ⚠️| `extractYear` | coluna | 24 | ✅ | ⚠️| `extractDay` | coluna | 28 | ✅ | ⚠️| `lower` | coluna | 32 | ✅ | ⚠️| `toChar` | coluna, formato | 36 | ✅ | ⚠️| `convertPlaceholders` | sql | 44 | ✅ | ⚠️

## 📄 server.js

| Função | Parâmetros | Linha | Exportada | Chamada |
|---|---|---|---|---|
| `formatDate` | coluna | 71 |  | ⚠️| `formatMonthYear` | coluna | 75 |  | ⚠️| `coalesceSum` | valor | 79 |  | ⚠️| `dateInterval` | intervalo | 83 |  | ⚠️| `extractMonth` | coluna | 87 |  | ⚠️| `extractYear` | coluna | 91 |  | ⚠️| `extractDay` | coluna | 95 |  | ⚠️| `lower` | coluna | 99 |  | ⚠️| `formatarDataBr` | dataStr | 323 |  | ⚠️| `gerarHorariosDoDia` | horaInicio, horaFim, almocoInicio, almocoFim | 338 |  | ⚠️| `verificarDisponibilidadeHorario` | empresa_id, profissional_id, data, hora, duracao | 357 |  | ⚠️

