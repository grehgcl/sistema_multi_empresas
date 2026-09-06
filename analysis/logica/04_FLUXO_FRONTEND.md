# 🖥️ CHAMADAS HTTP DO FRONTEND (189)

| Tipo | Quantidade |
|---|---|
| fetch | 189 |
| axios | 0 |
| xhr | 0 |
| jquery | 0 |

## 📄 public/chatbot.html

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/chatbot/empresa/${empresaId}` | 564 | fetch |
| GET | `/api/chatbot/servicos/${empresaId}` | 606 | fetch |
| GET | `/api/chatbot/profissionais/${empresaId}` | 629 | fetch |
| POST | `/api/chatbot/cliente/buscar` | 1002 | fetch |
| POST | `/api/chatbot/cliente/criar` | 1044 | fetch |
| POST | `/api/chatbot/cliente/buscar` | 1059 | fetch |
| POST | `/api/chatbot/datas-disponiveis-mes` | 1177 | fetch |
| POST | `/api/chatbot/horarios-disponiveis` | 1376 | fetch |
| POST | `/api/chatbot/horarios-disponiveis` | 1484 | fetch |
| GET | `/api/chatbot/servico/${agendamentoAtual.servico_id}` | 1579 | fetch |
| POST | `/api/chatbot/agendar` | 1633 | fetch |
| POST | `/api/chatbot/registrar-anuncio` | 1846 | fetch |

## 📄 public/index.html

| Método | URL | Linha | Tipo |
|---|---|---|---|
| POST | `/api/auth/login` | 497 | fetch |
| POST | `/api/auth/cadastro` | 599 | fetch |

## 📄 public/js/chatbot.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/chatbot/empresa/${empresaId}` | 50 | fetch |
| GET | `/api/chatbot/servicos/${empresaId}` | 88 | fetch |
| GET | `/api/servicos?empresa_id=${empresaId}` | 110 | fetch |
| GET | `/api/profissionais` | 135 | fetch |
| GET | `/api/chatbot/profissionais/${empresaId}` | 150 | fetch |
| POST | `/api/chatbot/cliente/buscar` | 518 | fetch |
| POST | `/api/chatbot/cliente/criar` | 557 | fetch |
| POST | `/api/chatbot/cliente/buscar` | 572 | fetch |
| GET | `/api/chatbot/empresa/${empresaId}` | 610 | fetch |
| GET | `/api/chatbot/cliente/agendamentos/${clienteId}` | 626 | fetch |
| POST | `/api/chatbot/datas-disponiveis-mes` | 765 | fetch |
| POST | `/api/chatbot/horarios-disponiveis` | 1057 | fetch |
| POST | `/api/chatbot/horarios-disponiveis` | 1158 | fetch |
| POST | `/api/chatbot/cliente/buscar` | 1250 | fetch |
| GET | `/api/chatbot/servico/${agendamentoAtual.servico_id}` | 1292 | fetch |
| POST | `/api/chatbot/agendar` | 1353 | fetch |

## 📄 public/js/pages/ads.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/admin/ads-stats?${params.toString()}` | 43 | fetch |
| GET | `/api/admin/empresas` | 46 | fetch |
| POST | `/api/admin/ads-stats` | 826 | fetch |

## 📄 public/js/pages/agendamentos-profissional.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/clientes` | 43 | fetch |
| GET | `/api/servicos` | 44 | fetch |
| GET | `/api/profissional/agendamentos` | 114 | fetch |
| POST | `/api/horarios/disponiveis` | 191 | fetch |
| POST | `/api/agendamentos` | 342 | fetch |
| PUT | `/api/profissional/agendamentos/${id}/concluir` | 377 | fetch |

## 📄 public/js/pages/agendamentos.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/profissionais` | 44 | fetch |
| GET | `/api/clientes` | 45 | fetch |
| GET | `/api/servicos` | 46 | fetch |
| GET | `/api/agendamentos` | 326 | fetch |
| GET | `/api/clientes` | 340 | fetch |
| GET | `/api/profissionais` | 355 | fetch |
| GET | `/api/servicos` | 370 | fetch |
| POST | `/api/clientes` | 1121 | fetch |
| GET | `/api/clientes` | 1136 | fetch |
| POST | `/api/chatbot/horarios-disponiveis` | 1261 | fetch |
| GET | `/api/clientes` | 1335 | fetch |
| GET | `/api/servicos` | 1356 | fetch |
| GET | `/api/profissionais` | 1378 | fetch |
| GET | `/api/clientes` | 1533 | fetch |
| POST | `/api/agendamentos` | 1850 | fetch |
| DELETE | `/api/agendamentos/${id}` | 1940 | fetch |
| GET | `/api/agendamentos` | 1978 | fetch |
| GET | `/api/clientes` | 2003 | fetch |
| GET | `/api/servicos` | 2004 | fetch |
| GET | `/api/profissionais` | 2005 | fetch |
| POST | `/api/chatbot/horarios-disponiveis` | 2242 | fetch |
| PUT | `/api/agendamentos/${id}` | 2338 | fetch |
| GET | `/api/agendamentos` | 2405 | fetch |
| GET | `/api/servicos` | 2421 | fetch |
| GET | `/api/agendamentos` | 2740 | fetch |
| PUT | `/api/agendamentos/${agendamentoId}/extras` | 2771 | fetch |
| GET | `/api/agendamentos` | 2832 | fetch |
| PUT | `/api/agendamentos/${agendamentoId}/extras` | 2866 | fetch |
| GET | `/api/agendamentos` | 2901 | fetch |
| PUT | `/api/agendamentos/${agendamentoId}/extras` | 2931 | fetch |
| GET | `/api/agendamentos` | 2983 | fetch |
| PUT | `/api/agendamentos/${agendamentoId}/pagamento` | 3217 | fetch |

## 📄 public/js/pages/clientes.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/clientes/${clienteId}/grupos` | 117 | fetch |
| GET | `/api/clientes` | 165 | fetch |
| GET | `/api/agendamentos?limit=500` | 166 | fetch |
| GET | `/api/clientes/grupos` | 167 | fetch |
| GET | `/api/clientes` | 311 | fetch |
| GET | `/api/agendamentos?limit=500` | 312 | fetch |
| GET | `/api/clientes/grupos` | 313 | fetch |
| POST | `/api/clientes` | 1222 | fetch |
| GET | `/api/clientes` | 1255 | fetch |
| PUT | `/api/clientes/${id}` | 1344 | fetch |
| DELETE | `/api/clientes/${id}` | 1386 | fetch |
| PUT | `/api/clientes/${id}/bloquear-chatbot` | 1411 | fetch |
| PUT | `/api/clientes/${id}/bloquear-chatbot` | 1443 | fetch |
| GET | `/api/agendamentos` | 1472 | fetch |
| GET | `/api/clientes` | 1551 | fetch |
| DELETE | `/api/clientes/${cliente.id}` | 1568 | fetch |
| PUT | `/api/clientes/${clienteEditandoGrupos}/grupos` | 1854 | fetch |
| POST | `/api/clientes` | 2227 | fetch |
| POST | `/api/whatsapp/enviar` | 2725 | fetch |
| GET | `/api/clientes/grupos` | 2803 | fetch |

## 📄 public/js/pages/clientes_back.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/clientes` | 65 | fetch |
| GET | `/api/agendamentos` | 68 | fetch |
| DELETE | `/api/clientes/apagar-todos` | 309 | fetch |
| GET | `/api/agendamentos` | 342 | fetch |
| POST | `/api/clientes` | 495 | fetch |
| GET | `/api/clientes` | 533 | fetch |
| PUT | `/api/clientes/${id}` | 646 | fetch |
| DELETE | `/api/clientes/` | 680 | fetch |
| PUT | `/api/clientes/${id}/bloquear-chatbot` | 708 | fetch |
| PUT | `/api/clientes/${id}/bloquear-chatbot` | 740 | fetch |
| POST | `/api/clientes` | 941 | fetch |

## 📄 public/js/pages/configuracoes.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/profissionais` | 21 | fetch |
| GET | `/api/horarios` | 22 | fetch |
| GET | `/api/empresa/plano` | 23 | fetch |
| GET | `/api/empresa/dados` | 24 | fetch |
| GET | `/api/empresa/dados` | 264 | fetch |
| PUT | `/api/empresa/dados` | 400 | fetch |
| GET | `/api/empresa/dados` | 444 | fetch |
| PUT | `/api/empresa/bloqueio-geral` | 599 | fetch |
| GET | `/api/horarios` | 641 | fetch |
| GET | `/api/chatbot/link/${usuario.empresa_id}` | 662 | fetch |
| PUT | `/api/horarios/${dia}` | 1425 | fetch |
| GET | `/api/empresa/dados` | 1535 | fetch |
| GET | `/api/chatbot/link-personalizado/${empresaId}` | 1561 | fetch |
| POST | `/api/profissionais/${id}/reset-senha` | 1828 | fetch |
| PUT | `/api/profissionais/${id}` | 1867 | fetch |
| DELETE | `/api/profissionais/${id}` | 1900 | fetch |

## 📄 public/js/pages/dashboard-profissional.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/profissional/financeiro` | 90 | fetch |
| GET | `/api/profissional/agendamentos` | 96 | fetch |

## 📄 public/js/pages/dashboard.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/agendamentos` | 191 | fetch |
| PUT | `/api/agendamentos/${ag2.id}/concluir` | 210 | fetch |
| GET | `/api/horarios` | 240 | fetch |
| GET | `/api/profissionais` | 241 | fetch |
| GET | `/api/agendamentos` | 242 | fetch |
| GET | `/api/servicos/todos` | 243 | fetch |
| GET | `/api/empresa/dados` | 905 | fetch |
| GET | `/api/despesas/resumo` | 912 | fetch |
| GET | `/api/agendamentos` | 918 | fetch |
| GET | `/api/clientes` | 919 | fetch |
| GET | `/api/financeiro` | 920 | fetch |
| GET | `/api/profissionais` | 921 | fetch |
| GET | `/api/admin/empresas` | 1178 | fetch |
| GET | `/api/admin/usuarios` | 1179 | fetch |
| GET | `/api/admin/estatisticas` | 1180 | fetch |

## 📄 public/js/pages/dashboard_backup.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/agendamentos` | 134 | fetch |
| PUT | `/api/agendamentos/${ag2.id}/concluir` | 153 | fetch |
| GET | `/api/horarios` | 183 | fetch |
| GET | `/api/profissionais` | 184 | fetch |
| GET | `/api/agendamentos` | 185 | fetch |
| GET | `/api/servicos/todos` | 186 | fetch |
| GET | `/api/empresa/dados` | 704 | fetch |
| GET | `/api/despesas/resumo` | 711 | fetch |
| GET | `/api/agendamentos` | 717 | fetch |
| GET | `/api/clientes` | 718 | fetch |
| GET | `/api/financeiro` | 719 | fetch |
| GET | `/api/profissionais` | 720 | fetch |
| GET | `/api/admin/empresas` | 970 | fetch |
| GET | `/api/admin/usuarios` | 971 | fetch |
| GET | `/api/admin/estatisticas` | 972 | fetch |

## 📄 public/js/pages/empresas.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/admin/stats` | 40 | fetch |
| GET | `/api/admin/empresas` | 41 | fetch |
| GET | `/api/admin/usuarios` | 42 | fetch |
| GET | `/api/pagamento/config` | 43 | fetch |
| GET | `/api/pagamento/config` | 400 | fetch |
| PUT | `/api/pagamento/config` | 415 | fetch |
| PUT | `/api/admin/empresas/${empresaId}/whatsapp-proprio` | 461 | fetch |
| GET | `/api/admin/empresas/${id}` | 525 | fetch |
| GET | `/api/admin/empresas/${id}/usuarios` | 526 | fetch |
| GET | `/api/admin/empresas/${id}/clientes` | 527 | fetch |
| GET | `/api/admin/empresas/${id}/agendamentos` | 528 | fetch |
| GET | `/api/admin/empresas/${id}/acessos` | 529 | fetch |
| GET | `/api/admin/empresas/${id}` | 1055 | fetch |
| PUT | `/api/admin/empresas/${id}` | 1137 | fetch |
| GET | `/api/admin/usuarios/${id}` | 1188 | fetch |
| POST | `/api/admin/empresas/${empresaId}/extender-trial` | 1363 | fetch |
| DELETE | `/api/admin/empresas/${id}` | 1408 | fetch |

## 📄 public/js/pages/financeiro.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/financeiro` | 126 | fetch |
| GET | `/api/despesas?mes=${mesAtual}&ano=${anoAtual}` | 127 | fetch |
| GET | `/api/financeiro/receitas?mes=${filtroMesReceitas}&ano=${filtroAnoReceitas}` | 128 | fetch |
| GET | `/api/financeiro/comparativo?mes_atual=${mesAtual}&ano_atual=${anoAtual}&mes_anterior=${mesAnterior}&ano_anterior=${anoAn` | 129 | fetch |
| GET | `/api/despesas/${id}` | 1388 | fetch |
| DELETE | `/api/despesas/${idNumber}` | 1732 | fetch |
| GET | `/api/financeiro/receitas?mes=${filtroMesReceitas}&ano=${filtroAnoReceitas}` | 1775 | fetch |
| GET | `/api/financeiro` | 1908 | fetch |
| GET | `/api/financeiro/analise-diaria?mes=${mes}&ano=${ano}` | 2054 | fetch |
| GET | `/api/fiados?mes=${mes}&ano=${ano}` | 2464 | fetch |
| PUT | `/api/fiados/${id}/baixar` | 2889 | fetch |
| POST | `/api/financeiro/receitas/manual` | 3244 | fetch |

## 📄 public/js/pages/planos.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/planos/empresa` | 404 | fetch |

## 📄 public/js/pages/servicos.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/servicos/todos` | 94 | fetch |
| PUT | `/api/servicos/${id}` | 455 | fetch |
| DELETE | `/api/servicos/${id}` | 506 | fetch |

## 📄 public/js/pages/whatsapp-config.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/whatsapp/info` | 16 | fetch |
| POST | `/api/whatsapp/criar-instancia` | 252 | fetch |
| GET | `/api/whatsapp/qrcode` | 278 | fetch |
| GET | `/api/whatsapp/status` | 341 | fetch |
| POST | `/api/whatsapp/disconnect` | 387 | fetch |

## 📄 public/js/ui.js

| Método | URL | Linha | Tipo |
|---|---|---|---|
| GET | `/api/whatsapp/status` | 396 | fetch |

