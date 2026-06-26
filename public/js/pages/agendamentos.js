// pages/agendamentos.js - Versão Completa com Filtros, Edição e Horários Disponíveis
// 🔒 COM BLOQUEIO DE DATAS/HORÁRIOS PASSADOS
// 🔥 CORRIGIDO: Usa variável global para data da agenda inteligente

let profissionaisList = [];
let clientesList = [];
let servicosList = [];

// ============================================
// VARIÁVEIS GLOBAIS PARA DADOS FORÇADOS
// ============================================
window.dataAgendamentoForcada = null;
window.horaAgendamentoForcada = null;
window.profissionalAgendamentoForcado = null;

// ============================================
// 🔥 FUNÇÃO PARA FORMATAR DATA PARA ENVIO
// ============================================
window.formatarDataParaEnvio = function (dataStr) {
    // Se já estiver no formato YYYY-MM-DD, retorna ela mesma
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
        return dataStr;
    }

    // Se for um objeto Date, converter para YYYY-MM-DD
    if (dataStr instanceof Date) {
        const ano = dataStr.getFullYear();
        const mes = String(dataStr.getMonth() + 1).padStart(2, '0');
        const dia = String(dataStr.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    }

    // Tentar converter de outros formatos
    try {
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) {
            const ano = data.getFullYear();
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const dia = String(data.getDate()).padStart(2, '0');
            return `${ano}-${mes}-${dia}`;
        }
    } catch (e) { }

    return dataStr;
};
// ============================================
// 🔥 FUNÇÃO NOVA PARA FORMATAR DATA - SEM FUSO HORÁRIO
// ============================================
function formatarDataBrCorrigida(dataStr) {
    if (!dataStr) return '-';

    // Se for string no formato YYYY-MM-DD (ex: "2026-06-26")
    if (typeof dataStr === 'string' && dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
            const ano = partes[0];
            const mes = partes[1];
            const dia = partes[2];
            return `${dia}/${mes}/${ano}`;
        }
    }

    // Se for string com T (formato ISO)
    if (typeof dataStr === 'string' && dataStr.includes('T')) {
        const dataPart = dataStr.split('T')[0];
        const partes = dataPart.split('-');
        if (partes.length === 3) {
            const ano = partes[0];
            const mes = partes[1];
            const dia = partes[2];
            return `${dia}/${mes}/${ano}`;
        }
    }

    // Fallback
    return dataStr;
}

async function carregarAgendamentos() {
    ativarBotao("agendamentos");
    showLoading();
    const token = localStorage.getItem("token");

    try {
        const [profRes, clientesRes, servicosRes] = await Promise.all([
            fetch("/api/profissionais", { headers: { "Authorization": "Bearer " + token } }),
            fetch("/api/clientes", { headers: { "Authorization": "Bearer " + token } }),
            fetch("/api/servicos", { headers: { "Authorization": "Bearer " + token } })
        ]);

        const profResult = await profRes.json();
        if (profResult.success) profissionaisList = profResult.data || [];
        else profissionaisList = [];

        const clientesResult = await clientesRes.json();
        if (clientesResult.success) clientesList = clientesResult.data || [];
        else clientesList = [];

        const servicosResult = await servicosRes.json();
        if (servicosResult.success) servicosList = servicosResult.data || [];
        else servicosList = [];

        console.log("Dados carregados:", {
            clientes: clientesList.length,
            profissionais: profissionaisList.length,
            servicos: servicosList.length
        });
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        showToast("Erro ao carregar dados", "error");
        profissionaisList = [];
        clientesList = [];
        servicosList = [];
    }

    let profissionaisOptions = "";
    if (profissionaisList.length > 0) {
        for (let p of profissionaisList) {
            if (p.ativo === 1) {
                profissionaisOptions += `<option value="${p.id}">${p.nome} (${p.comissao_percent}%)</option>`;
            }
        }
    }

    let html = `
        <div class="fade-in">
            <!-- Header -->
            <div class="dashboard-header">
                <div>
                    <h2 class="page-title">📅 Agendamentos</h2>
                    <p class="page-subtitle">
                        <i class="fas fa-clock"></i> 
                        Gerencie todos os agendamentos da sua empresa.
                    </p>
                </div>
                <div class="dashboard-actions">
                    <button class="btn btn-primary" onclick="abrirModalAgendamentoDono()">
                        <i class="fas fa-plus"></i> Novo Agendamento
                    </button>
                </div>
            </div>

            <!-- Filtros Melhorados -->
            <div class="filter-bar">
                <div class="filter-group">
                    <label><i class="fas fa-calendar-alt"></i> Data Início</label>
                    <input type="date" id="filtroDataInicio" class="filter-input">
                </div>
                <div class="filter-group">
                    <label><i class="fas fa-calendar-alt"></i> Data Fim</label>
                    <input type="date" id="filtroDataFim" class="filter-input">
                </div>
                <div class="filter-group">
                    <label><i class="fas fa-filter"></i> Status</label>
                    <select id="filtroStatus" class="filter-select">
                        <option value="todos">Todos</option>
                        <option value="agendado">📋 Agendado</option>
                        <option value="pendente">⏳ Pendente</option>
                        <option value="concluido">✅ Concluído</option>
                        <option value="cancelado">❌ Cancelado</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label><i class="fas fa-user"></i> Profissional</label>
                    <select id="filtroProfissional" class="filter-select">
                        <option value="todos">Todos</option>
                        ${profissionaisOptions}
                    </select>
                </div>
                <div class="filter-actions">
                    <button class="btn btn-primary btn-sm" onclick="aplicarFiltrosAgendamentos()">
                        <i class="fas fa-search"></i> Filtrar
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="limparFiltrosAgendamentos()">
                        <i class="fas fa-undo"></i> Limpar
                    </button>
                </div>
            </div>

            <!-- Estatísticas Rápidas -->
            <div class="agendamento-stats" id="agendamentoStats">
                <div class="stat-mini">
                    <span class="stat-mini-value" id="totalAgendamentos">0</span>
                    <span class="stat-mini-label">Total</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" id="agendadosCount">0</span>
                    <span class="stat-mini-label">📋 Agendados</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" id="pendentesCount">0</span>
                    <span class="stat-mini-label">⏳ Pendentes</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" id="concluidosCount">0</span>
                    <span class="stat-mini-label">✅ Concluídos</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" id="canceladosCount">0</span>
                    <span class="stat-mini-label">❌ Cancelados</span>
                </div>
            </div>

            <!-- Tabela -->
            <div class="card">
                <div class="table-responsive">
                    <table class="data-table" id="tabelaAgendamentos">
                        <thead>
                            <tr>
                                <th>📅 Data/Hora</th>
                                <th>👤 Cliente</th>
                                <th>👨‍💼 Profissional</th>
                                <th>✂️ Serviço</th>
                                <th>💰 Valor</th>
                                <th>📊 Status</th>
                                <th>⚡ Ações</th>
                            </tr>
                        </thead>
                        <tbody id="listaAgendamentos"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById("content").innerHTML = html;
    await carregarListaAgendamentosComFiltro();
    hideLoading();
}

// ============================================
// 🚫 VALIDAR SE DATA/HORA É FUTURA
// ============================================
function validarDataHoraFutura(data, hora) {
    const agora = new Date();
    const dataHoraAgendamento = new Date(`${data}T${hora}:00`);

    if (dataHoraAgendamento < agora) {
        showToast('❌ Não é possível agendar em datas ou horários que já passaram.', 'error');
        return false;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAgendamento = new Date(data);
    dataAgendamento.setHours(0, 0, 0, 0);

    if (dataAgendamento.getTime() === hoje.getTime()) {
        const horaAtual = new Date().getHours();
        const minutoAtual = new Date().getMinutes();
        const horaAgendamento = parseInt(hora.split(':')[0]);
        const minutoAgendamento = parseInt(hora.split(':')[1]);

        if (horaAgendamento < horaAtual ||
            (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual)) {
            showToast(`❌ O horário ${hora} já passou. Selecione um horário futuro.`, 'error');
            return false;
        }
    }
    return true;
}

// ============================================
// FUNÇÃO PARA ATUALIZAR ESTATÍSTICAS
// ============================================

function atualizarEstatisticasAgendamentos(agendamentos) {
    const total = agendamentos.length;
    const agendados = agendamentos.filter(a => a.status === 'agendado').length;
    const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
    const concluidos = agendamentos.filter(a => a.status === 'concluido').length;
    const cancelados = agendamentos.filter(a => a.status === 'cancelado').length;

    const totalEl = document.getElementById('totalAgendamentos');
    const agendadosEl = document.getElementById('agendadosCount');
    const pendentesEl = document.getElementById('pendentesCount');
    const concluidosEl = document.getElementById('concluidosCount');
    const canceladosEl = document.getElementById('canceladosCount');

    if (totalEl) totalEl.textContent = total;
    if (agendadosEl) agendadosEl.textContent = agendados;
    if (pendentesEl) pendentesEl.textContent = pendentes;
    if (concluidosEl) concluidosEl.textContent = concluidos;
    if (canceladosEl) canceladosEl.textContent = cancelados;
}

function renderizarLinhaAgendamento(item) {
    const statusMap = {
        'concluido': { class: 'concluido', label: '✅ Concluído' },
        'pendente': { class: 'pendente', label: '⏳ Pendente' },
        'agendado': { class: 'agendado', label: '📋 Agendado' },
        'cancelado': { class: 'cancelado', label: '❌ Cancelado' }
    };

    const statusInfo = statusMap[item.status] || statusMap['pendente'];

    // 🔥 USAR formatarDataBr para a data
    const dataFormatada = item.data ? formatarDataBrCorrigida(item.data) : '-';
    const horaFormatada = item.hora || '-';
    const podeEditar = item.status !== 'concluido' && item.status !== 'cancelado';

    return `
        <tr>
            <td>
                <div class="cell-data-hora">
                    <span class="data">${dataFormatada}</span>
                    <span class="hora">${horaFormatada}</span>
                </div>
            </td>
            <td>
                <div class="cell-cliente">
                    <span class="cliente-nome">${escapeHtml(item.cliente_nome || item.cliente_id || 'N/A')}</span>
                </div>
            </td>
            <td>
                <span class="profissional-nome">${escapeHtml(item.profissional_nome || 'Não atribuído')}</span>
            </td>
            <td>
                <span class="servico-nome">${escapeHtml(item.servico_nome || item.servico || '-')}</span>
            </td>
            <td>
                <span class="valor">R$ ${(item.valor || 0).toFixed(2)}</span>
            </td>
            <td>
                <span class="status-badge ${statusInfo.class}">
                    <span class="dot"></span>
                    ${statusInfo.label}
                </span>
            </td>
            <td>
                <div class="actions-cell">
                    ${podeEditar ? `
                        <button class="btn-icon btn-edit" onclick="editarAgendamento(${item.id})" title="Editar">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-check" onclick="concluirAgendamento(${item.id})" title="Concluir">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon btn-delete" onclick="excluirAgendamento(${item.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ============================================
// CARREGAR LISTA COM FILTROS - VERSÃO MOBILE FRIENDLY
// ============================================

async function carregarListaAgendamentosComFiltro() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/agendamentos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        let agendamentos = [];
        if (data.success && Array.isArray(data.data)) {
            agendamentos = data.data;
        } else {
            console.warn('⚠ Nenhum agendamento encontrado');
            agendamentos = [];
        }

        // Aplicar filtros
        const dataInicio = document.getElementById('filtroDataInicio')?.value;
        const dataFim = document.getElementById('filtroDataFim')?.value;
        const statusFiltro = document.getElementById('filtroStatus')?.value || 'todos';
        const profissionalFiltro = document.getElementById('filtroProfissional')?.value || 'todos';

        let listaFiltrada = agendamentos;

        if (dataInicio) {
            listaFiltrada = listaFiltrada.filter(a => a.data >= dataInicio);
        }
        if (dataFim) {
            listaFiltrada = listaFiltrada.filter(a => a.data <= dataFim);
        }
        if (statusFiltro !== 'todos') {
            listaFiltrada = listaFiltrada.filter(a => a.status === statusFiltro);
        }
        if (profissionalFiltro !== 'todos') {
            listaFiltrada = listaFiltrada.filter(a => a.profissional_id == profissionalFiltro);
        }

        listaFiltrada.sort((a, b) => {
            if (a.data < b.data) return 1;
            if (a.data > b.data) return -1;
            return 0;
        });

        atualizarEstatisticasAgendamentos(agendamentos);

        const tbody = document.getElementById('listaAgendamentos');
        if (!tbody) return;

        // ============================================
        // VERIFICAR SE É MOBILE (largura < 768px)
        // ============================================
        const isMobile = window.innerWidth < 768;

        if (listaFiltrada.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="fas fa-calendar-plus"></i>
                            <h4>${agendamentos.length === 0 ? 'Nenhum agendamento encontrado' : 'Nenhum resultado com os filtros selecionados'}</h4>
                            <p>${agendamentos.length === 0 ? 'Comece criando seu primeiro agendamento!' : 'Tente ajustar os filtros para encontrar o que procura'}</p>
                            ${agendamentos.length === 0 ? `
                                <button class="btn btn-primary btn-sm" onclick="abrirModalAgendamentoDono()">
                                    <i class="fas fa-plus"></i> Novo Agendamento
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';

        if (isMobile) {
            // ============================================
            // VERSÃO MOBILE - CARDS
            // ============================================
            for (let item of listaFiltrada) {
                const statusMap = {
                    'concluido': { class: 'concluido', label: '✅ Concluído' },
                    'pendente': { class: 'pendente', label: '⏳ Pendente' },
                    'agendado': { class: 'agendado', label: '📋 Agendado' },
                    'cancelado': { class: 'cancelado', label: '❌ Cancelado' }
                };
                const statusInfo = statusMap[item.status] || statusMap['pendente'];
                const podeEditar = item.status !== 'concluido' && item.status !== 'cancelado';

                html += `
                    <tr>
                        <td colspan="7" style="padding: 8px 0; border-bottom: none;">
                            <div class="agendamento-card-mobile">
                                <div class="card-header-mobile">
                                    <div class="cliente-info-mobile">
                                        <span class="cliente-avatar-mobile">${item.cliente_nome ? item.cliente_nome.charAt(0).toUpperCase() : '?'}</span>
                                        <div>
                                            <span class="cliente-nome-mobile">${escapeHtml(item.cliente_nome || 'N/A')}</span>
                                            <span class="servico-mobile">${escapeHtml(item.servico_nome || item.servico || '-')}</span>
                                        </div>
                                    </div>
                                    <span class="status-badge ${statusInfo.class}">
                                        <span class="dot"></span>
                                        ${statusInfo.label}
                                    </span>
                                </div>
                                <div class="card-body-mobile">
                                    <div class="info-row">
                                        <span class="info-label">📅 Data</span>
                                        <span class="info-value">${formatarDataBrCorrigida(item.data)}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">⏰ Horário</span>
                                        <span class="info-value">${item.hora || '-'}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">👨‍💼 Profissional</span>
                                        <span class="info-value">${escapeHtml(item.profissional_nome || 'Não atribuído')}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="info-label">💰 Valor</span>
                                        <span class="info-value valor-mobile">R$ ${(item.valor || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                                <div class="card-actions-mobile">
                                    ${podeEditar ? `
                                        <button class="btn-icon btn-edit" onclick="editarAgendamento(${item.id})" title="Editar">
                                            <i class="fas fa-pen"></i> Editar
                                        </button>
                                        <button class="btn-icon btn-check" onclick="concluirAgendamento(${item.id})" title="Concluir">
                                            <i class="fas fa-check"></i> Concluir
                                        </button>
                                    ` : ''}
                                    <button class="btn-icon btn-delete" onclick="excluirAgendamento(${item.id})" title="Excluir">
                                        <i class="fas fa-trash"></i> Excluir
                                    </button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }
        } else {
            // ============================================
            // VERSÃO DESKTOP - TABELA
            // ============================================
            for (let item of listaFiltrada) {
                html += renderizarLinhaAgendamento(item);
            }
        }

        tbody.innerHTML = html;

    } catch (error) {
        console.error('❌ Erro ao carregar agendamentos:', error);
        showToast('Erro ao carregar agendamentos', 'error');
    }
}

// ============================================
// FUNÇÃO PARA RENDERIZAR LINHA DA TABELA (DESKTOP)
// ============================================

function renderizarLinhaAgendamento(item) {
    const statusMap = {
        'concluido': { class: 'concluido', label: '✅ Concluído' },
        'pendente': { class: 'pendente', label: '⏳ Pendente' },
        'agendado': { class: 'agendado', label: '📋 Agendado' },
        'cancelado': { class: 'cancelado', label: '❌ Cancelado' }
    };

    const statusInfo = statusMap[item.status] || statusMap['pendente'];
    const dataFormatada = item.data ? formatarDataBrCorrigida(item.data) : '-';
    const horaFormatada = item.hora || '-';
    const podeEditar = item.status !== 'concluido' && item.status !== 'cancelado';

    return `
        <tr>
            <td>
                <div class="cell-data-hora">
                    <span class="data">${dataFormatada}</span>
                    <span class="hora">${horaFormatada}</span>
                </div>
            </td>
            <td>
                <div class="cell-cliente">
                    <span class="cliente-nome">${escapeHtml(item.cliente_nome || item.cliente_id || 'N/A')}</span>
                </div>
            </td>
            <td>
                <span class="profissional-nome">${escapeHtml(item.profissional_nome || 'Não atribuído')}</span>
            </td>
            <td>
                <span class="servico-nome">${escapeHtml(item.servico_nome || item.servico || '-')}</span>
            </td>
            <td>
                <span class="valor">R$ ${(item.valor || 0).toFixed(2)}</span>
            </td>
            <td>
                <span class="status-badge ${statusInfo.class}">
                    <span class="dot"></span>
                    ${statusInfo.label}
                </span>
            </td>
            <td>
                <div class="actions-cell">
                    ${podeEditar ? `
                        <button class="btn-icon btn-edit" onclick="editarAgendamento(${item.id})" title="Editar">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-check" onclick="concluirAgendamento(${item.id})" title="Concluir">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon btn-delete" onclick="excluirAgendamento(${item.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ============================================
// ATUALIZAR AO REDIMENSIONAR A TELA
// ============================================

let resizeTimeout;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
        if (document.getElementById('listaAgendamentos')) {
            carregarListaAgendamentosComFiltro();
        }
    }, 300);
});

// ============================================
// FILTROS
// ============================================

function aplicarFiltrosAgendamentos() {
    carregarListaAgendamentosComFiltro();
}

function limparFiltrosAgendamentos() {
    const dataInicio = document.getElementById("filtroDataInicio");
    const dataFim = document.getElementById("filtroDataFim");
    const status = document.getElementById("filtroStatus");
    const profissional = document.getElementById("filtroProfissional");

    if (dataInicio) dataInicio.value = "";
    if (dataFim) dataFim.value = "";
    if (status) status.value = "todos";
    if (profissional) profissional.value = "todos";

    carregarListaAgendamentosComFiltro();
}

// ============================================
// FUNÇÃO FORMATAR DATA - CORRIGIDA (SEM FUSO HORÁRIO)
// ============================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';

    // Se for string no formato YYYY-MM-DD (ex: "2026-06-26")
    if (typeof dataStr === 'string' && dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const partes = dataStr.split('-');
        if (partes.length === 3) {
            // 🔥 NÃO CONVERTER PARA DATE - apenas reorganizar
            const ano = partes[0];
            const mes = partes[1];
            const dia = partes[2];
            return `${dia}/${mes}/${ano}`;
        }
    }

    // Se for string no formato "2026-06-26T00:00:00.000Z"
    if (typeof dataStr === 'string' && dataStr.includes('T')) {
        const dataPart = dataStr.split('T')[0];
        const partes = dataPart.split('-');
        if (partes.length === 3) {
            const ano = partes[0];
            const mes = partes[1];
            const dia = partes[2];
            return `${dia}/${mes}/${ano}`;
        }
    }

    // Se for objeto Date (raro, mas seguro)
    if (dataStr instanceof Date) {
        const dia = String(dataStr.getDate()).padStart(2, '0');
        const mes = String(dataStr.getMonth() + 1).padStart(2, '0');
        const ano = dataStr.getFullYear();
        return `${dia}/${mes}/${ano}`;
    }

    // Fallback: tentar converter
    try {
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) {
            const dia = String(data.getDate()).padStart(2, '0');
            const mes = String(data.getMonth() + 1).padStart(2, '0');
            const ano = data.getFullYear();
            return `${dia}/${mes}/${ano}`;
        }
    } catch (e) { }

    return dataStr;
}
// ============================================
// NOVO CLIENTE VIA MODAL
// ============================================

function abrirModalNovoCliente() {
    const modalHtml = `
        <div id="modalNovoCliente" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 400px; width: 90%;">
                <h3>➕ Novo Cliente</h3>
                <form id="formNovoCliente" onsubmit="salvarNovoCliente(event)">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="novoClienteNome" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="novoClienteTelefone" class="form-control" placeholder="(00) 00000-0000">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="novoClienteEmail" class="form-control" placeholder="cliente@email.com">
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="fecharModalNovoCliente()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Cliente</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("modalNovoCliente");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function fecharModalNovoCliente() {
    const modal = document.getElementById("modalNovoCliente");
    if (modal) modal.remove();
}

async function salvarNovoCliente(event) {
    event.preventDefault();

    const nome = document.getElementById("novoClienteNome").value;
    const telefone = document.getElementById("novoClienteTelefone").value;
    const email = document.getElementById("novoClienteEmail").value;

    if (!nome) {
        showToast("Nome é obrigatório", "warning");
        return;
    }

    showLoading();
    const token = localStorage.getItem("token");

    try {
        const res = await fetch("/api/clientes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ nome, telefone, email })
        });

        const result = await res.json();

        if (result.success) {
            showToast("Cliente cadastrado com sucesso!", "success");

            const clientesRes = await fetch("/api/clientes", {
                headers: { "Authorization": "Bearer " + token }
            });
            const clientesResult = await clientesRes.json();
            if (clientesResult.success) clientesList = clientesResult.data || [];

            fecharModalNovoCliente();
            fecharModalAgendamentoDono();
            abrirModalAgendamentoDono();
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        console.error("Erro ao salvar cliente:", error);
        showToast("Erro ao salvar cliente", "error");
    }

    hideLoading();
}

// ============================================
// HORÁRIOS DISPONÍVEIS
// ============================================

async function carregarHorariosDisponiveisDono() {
    const data = document.getElementById("dataAgendamentoDono").value;
    const profissional_id = document.getElementById("profissionalIdDono").value;
    const horaSelect = document.getElementById("horaAgendamentoDono");

    if (!data) {
        horaSelect.innerHTML = '<option value="">Selecione uma data primeiro</option>';
        return;
    }

    horaSelect.innerHTML = '<option value="">Carregando...</option>';

    const token = localStorage.getItem("token");
    try {
        const res = await fetch("/api/chatbot/horarios-disponiveis", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                empresaId: JSON.parse(atob(token.split('.')[1])).empresa_id,
                profissionalId: profissional_id || null,
                data: data
            })
        });

        const result = await res.json();

        if (result.success) {
            let horarios = [];
            if (Array.isArray(result.horarios)) {
                horarios = result.horarios;
            } else if (Array.isArray(result.data)) {
                horarios = result.data;
            }

            if (horarios.length > 0) {
                let options = '<option value="">Selecione um horário</option>';
                for (let hora of horarios) {
                    options += `<option value="${hora}">${hora}</option>`;
                }
                horaSelect.innerHTML = options;
            } else {
                horaSelect.innerHTML = '<option value="">Nenhum horário disponível neste dia</option>';
            }
        } else {
            horaSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
        }
    } catch (error) {
        console.error("Erro ao buscar horários:", error);
        horaSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
    }
}

// ============================================
// ABRIR MODAL NOVO AGENDAMENTO (CORRIGIDO - USA VARIÁVEL GLOBAL E FORÇA DADOS)
// ============================================

async function abrirModalAgendamentoDono() {
    console.log('🔄 abrirModalAgendamentoDono - INICIANDO...');

    // ============================================
    // 🔥 FORÇAR RECARREGAMENTO DOS DADOS
    // ============================================
    await carregarDadosParaAgendamento();

    // Usar as listas globais
    const clientes = Array.isArray(window.clientesList) ? window.clientesList : [];
    const servicos = Array.isArray(window.servicosList) ? window.servicosList : [];
    const profissionais = Array.isArray(window.profissionaisList) ? window.profissionaisList : [];

    console.log(`📊 Dados disponíveis: ${clientes.length} clientes, ${servicos.length} serviços, ${profissionais.length} profissionais`);

    // ============================================
    // 🔥 USAR DATA DA VARIÁVEL GLOBAL OU CALCULAR AMANHÃ
    // ============================================
    let dataAmanha;
    if (window.dataAgendamentoForcada) {
        dataAmanha = window.dataAgendamentoForcada;
        console.log(`📅 Data da variável global: ${dataAmanha}`);
    } else {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        dataAmanha = amanha.toISOString().split('T')[0];
        console.log(`📅 Data calculada (amanhã): ${dataAmanha}`);
    }

    const horaForcada = window.horaAgendamentoForcada || '';
    const profissionalForcado = window.profissionalAgendamentoForcado || null;

    // ============================================
    // 🔥 GERAR OPTIONS DOS CLIENTES (CORRIGIDO)
    // ============================================
    let clientesOptions = '<option value="">Selecione...</option>';
    if (clientes.length > 0) {
        for (let c of clientes) {
            // Verificar se cliente tem nome
            const nomeCliente = c.nome || `Cliente ${c.id}`;
            clientesOptions += `<option value="${c.id}">${escapeHtml(nomeCliente)}</option>`;
        }
        console.log(`✅ ${clientes.length} clientes renderizados no select`);
    } else {
        clientesOptions = '<option value="">Nenhum cliente cadastrado. Clique em "+ Novo Cliente"</option>';
        console.warn('⚠️ Nenhum cliente disponível!');
    }

    let servicosOptions = '<option value="">Selecione um serviço</option>';
    if (servicos.length > 0) {
        for (let s of servicos) {
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}">${escapeHtml(s.nome)} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
        }
    }

    let profissionaisOptions = '<option value="">Não atribuir</option>';
    if (profissionais.length > 0) {
        for (let p of profissionais) {
            if (p.ativo === 1) {
                profissionaisOptions += `<option value="${p.id}">${escapeHtml(p.nome)} (${p.comissao_percent}%)</option>`;
            }
        }
    }

    // ============================================
    // 🔥 GERAR HTML DO MODAL
    // ============================================
    const modalHtml = `
        <div id="modalAgendamentoDono" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h3>➕ Novo Agendamento</h3>

                <div class="form-group">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <label>Cliente *</label>
                        <button type="button" class="btn btn-sm btn-success" onclick="abrirModalNovoCliente()" style="padding: 4px 12px; font-size: 12px;">
                            + Novo Cliente
                        </button>
                    </div>
                    <select id="clienteIdDono" class="form-control" required>
                        ${clientesOptions}
                    </select>
                    <small class="text-muted">Não encontrou o cliente? Clique em "+ Novo Cliente"</small>
                </div>

                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="dataAgendamentoDono" class="form-control" value="${dataAmanha}" onchange="carregarHorariosDisponiveisDono()">
                </div>

                <div class="form-group">
                    <label>Horário *</label>
                    <select id="horaAgendamentoDono" class="form-control">
                        <option value="">Selecione uma data primeiro</option>
                    </select>
                    <small class="text-muted">Horários disponíveis de 30 em 30 minutos</small>
                </div>

                <div class="form-group">
                    <label>Serviço</label>
                    <select id="servicoIdDono" class="form-control" onchange="atualizarValorPorServicoDono()">
                        ${servicosOptions}
                    </select>
                    <input type="text" id="servicoDescricaoDono" class="form-control" style="margin-top: 10px;" placeholder="Ou digite o serviço manualmente">
                </div>

                <div class="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" id="valorAgendamentoDono" class="form-control" step="0.01" placeholder="0,00">
                </div>

                <div class="form-group">
                    <label>Profissional</label>
                    <select id="profissionalIdDono" class="form-control" onchange="carregarHorariosDisponiveisDono()">
                        ${profissionaisOptions}
                    </select>
                    <small class="text-muted">Se não escolher, o agendamento ficará sem profissional</small>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="fecharModalAgendamentoDono()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="salvarAgendamentoDono()">Salvar</button>
                </div>
            </div>
        </div>
    `;

    // Remover modal existente
    const existingModal = document.getElementById("modalAgendamentoDono");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    console.log('✅ Modal de agendamento renderizado');

    // ============================================
    // 🔥 FORÇAR HORÁRIO E PROFISSIONAL
    // ============================================
    setTimeout(() => {
        // Carregar horários
        carregarHorariosDisponiveisDono();

        // Forçar o profissional
        if (profissionalForcado) {
            const profSelect = document.getElementById('profissionalIdDono');
            if (profSelect) {
                for (let opt of profSelect.options) {
                    if (opt.value == profissionalForcado) {
                        profSelect.value = profissionalForcado;
                        console.log(`✅ Profissional ${profissionalForcado} selecionado`);
                        break;
                    }
                }
            }
        }

        // Forçar o horário
        setTimeout(() => {
            if (horaForcada) {
                const horaSelect = document.getElementById('horaAgendamentoDono');
                if (horaSelect) {
                    for (let opt of horaSelect.options) {
                        if (opt.value === horaForcada) {
                            horaSelect.value = horaForcada;
                            console.log(`✅ Horário ${horaForcada} selecionado`);
                            break;
                        }
                    }
                }
            }
        }, 500);
    }, 200);

    // Mostrar toast com a data
    if (window.dataAgendamentoForcada) {
        showToast(`📅 ${formatarDataBrCorrigida(window.dataAgendamentoForcada)}`, 'info');
    }
}

function fecharModalAgendamentoDono() {
    const modal = document.getElementById("modalAgendamentoDono");
    if (modal) modal.remove();
}

function atualizarValorPorServicoDono() {
    const select = document.getElementById("servicoIdDono");
    const selectedOption = select.options[select.selectedIndex];
    const valor = selectedOption.getAttribute("data-valor");
    const nome = selectedOption.getAttribute("data-nome");

    if (valor) {
        document.getElementById("valorAgendamentoDono").value = parseFloat(valor).toFixed(2);
        document.getElementById("servicoDescricaoDono").value = nome;
    }
}

async function salvarAgendamentoDono() {
    const cliente_id = document.getElementById("clienteIdDono").value;
    const dataRaw = document.getElementById("dataAgendamentoDono").value;
    const hora = document.getElementById("horaAgendamentoDono").value;
    const servico_id = document.getElementById("servicoIdDono").value;
    const servico_descricao = document.getElementById("servicoDescricaoDono").value;
    const valor = document.getElementById("valorAgendamentoDono").value;
    const profissional_id = document.getElementById("profissionalIdDono").value;

    // 🔥 FORMATAR A DATA CORRETAMENTE
    const data = formatarDataParaEnvio(dataRaw);

    console.log('📝 Salvando agendamento:', { cliente_id, data, hora, servico_id, profissional_id });

    if (!cliente_id || !data) {
        showToast("Cliente e data são obrigatórios", "warning");
        return;
    }

    if (!hora || hora === '') {
        showToast("Selecione um horário", "warning");
        return;
    }

    // 🚫 VALIDAR DATA/HORA FUTURA
    if (!validarDataHoraFutura(data, hora)) {
        return;
    }

    // Limpar variáveis globais
    window.dataAgendamentoForcada = null;
    window.horaAgendamentoForcada = null;
    window.profissionalAgendamentoForcado = null;

    showLoading();

    const token = localStorage.getItem("token");
    const body = {
        cliente_id: parseInt(cliente_id),
        data: data,  // 👈 USAR A DATA FORMATADA
        hora: hora,
        valor: parseFloat(valor) || 0,
        profissional_id: profissional_id ? parseInt(profissional_id) : null
    };

    if (servico_id && servico_id !== '') {
        body.servico_id = parseInt(servico_id);
    } else if (servico_descricao && servico_descricao.trim() !== '') {
        body.servico = servico_descricao.trim();
    }

    try {
        const res = await fetch("/api/agendamentos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(body)
        });

        const result = await res.json();

        if (result.success) {
            showToast("✅ Agendamento criado com sucesso!", "success");
            fecharModalAgendamentoDono();

            if (typeof window.atualizarAgendaAposAgendamento === 'function') {
                window.atualizarAgendaAposAgendamento();
            }

            carregarAgendamentos();
            if (typeof carregarDashboard === 'function') {
                carregarDashboard();
            }
        } else {
            if (result.message && result.message.includes('já possui um agendamento para este dia')) {
                showToast('⚠️ ' + result.message, 'warning');
            } else {
                showToast("❌ Erro: " + result.message, "error");
            }
        }
    } catch (error) {
        console.error("❌ Erro ao criar agendamento:", error);
        showToast("❌ Erro ao criar agendamento", "error");
    }

    hideLoading();
}

// ============================================
// CONCLUIR AGENDAMENTO
// ============================================

async function concluirAgendamento(id) {
    if (!confirm("Concluir este agendamento?")) return;

    showLoading();
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`/api/agendamentos/${id}/concluir`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();

        if (result.success) {
            showToast(result.message, "success");
            carregarAgendamentos();

            if (typeof window.atualizarAgendaAposAgendamento === 'function') {
                window.atualizarAgendaAposAgendamento();
            }

            if (typeof carregarFinanceiro === "function") {
                const btnFinanceiro = document.getElementById("btnFinanceiro");
                if (btnFinanceiro && btnFinanceiro.classList.contains("active")) {
                    carregarFinanceiro();
                }
            }
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        console.error("Erro ao concluir agendamento:", error);
        showToast("Erro ao concluir agendamento", "error");
    }

    hideLoading();
}

// ============================================
// EXCLUIR AGENDAMENTO
// ============================================

async function excluirAgendamento(id) {
    if (!confirm("Excluir este agendamento?")) return;

    showLoading();
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`/api/agendamentos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();

        if (result.success) {
            showToast("Agendamento removido", "success");
            carregarAgendamentos();

            if (typeof window.atualizarAgendaAposAgendamento === 'function') {
                window.atualizarAgendaAposAgendamento();
            }
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        console.error("Erro ao excluir agendamento:", error);
        showToast("Erro ao excluir agendamento", "error");
    }

    hideLoading();
}

// ============================================
// EDITAR AGENDAMENTO
// ============================================

async function editarAgendamento(id) {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/agendamentos", {
        headers: { "Authorization": "Bearer " + token }
    });
    const result = await res.json();

    if (result.success) {
        const agendamento = result.data.find(a => a.id === id);
        if (!agendamento) {
            showToast("Agendamento não encontrado", "error");
            return;
        }

        if (agendamento.status === "concluido") {
            showToast("Agendamentos concluídos não podem ser editados", "warning");
            return;
        }

        const clientes = Array.isArray(clientesList) ? clientesList : [];
        const servicos = Array.isArray(servicosList) ? servicosList : [];
        const profissionais = Array.isArray(profissionaisList) ? profissionaisList : [];

        let clientesOptions = "";
        for (let c of clientes) {
            const selected = c.id === agendamento.cliente_id ? "selected" : "";
            clientesOptions += `<option value="${c.id}" ${selected}>${c.nome}</option>`;
        }

        let servicosOptions = '<option value="">Selecione um serviço</option>';
        for (let s of servicos) {
            const selected = s.id === agendamento.servico_id ? "selected" : "";
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" ${selected}>${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
        }

        let profissionaisOptions = '<option value="">Não atribuir</option>';
        for (let p of profissionais) {
            if (p.ativo === 1) {
                const selected = p.id === agendamento.profissional_id ? "selected" : "";
                profissionaisOptions += `<option value="${p.id}" ${selected}>${p.nome} (${p.comissao_percent}%)</option>`;
            }
        }

        const modalHtml = `
            <div id="modalEditarAgendamentoDono" class="modal" style="display: flex;">
                <div class="modal-content" style="max-width: 500px; width: 90%;">
                    <h3>✏ Editar Agendamento</h3>

                    <div class="form-group">
                        <label>Cliente *</label>
                        <select id="editClienteIdDono" class="form-control">
                            ${clientesOptions}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Data *</label>
                        <input type="date" id="editDataAgendamentoDono" class="form-control" value="${agendamento.data}">
                    </div>

                    <div class="form-group">
                        <label>Hora</label>
                        <input type="time" id="editHoraAgendamentoDono" class="form-control" value="${agendamento.hora || ''}">
                    </div>

                    <div class="form-group">
                        <label>Serviço</label>
                        <select id="editServicoIdDono" class="form-control" onchange="atualizarValorPorServicoEditDono()">
                            ${servicosOptions}
                        </select>
                        <input type="text" id="editServicoDescricaoDono" class="form-control" style="margin-top: 10px;" value="${agendamento.servico || ''}" placeholder="Ou digite o serviço manualmente">
                    </div>

                    <div class="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" id="editValorAgendamentoDono" class="form-control" step="0.01" value="${agendamento.valor || 0}">
                    </div>

                    <div class="form-group">
                        <label>Profissional</label>
                        <select id="editProfissionalIdDono" class="form-control">
                            ${profissionaisOptions}
                        </select>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="fecharModalEditarAgendamentoDono()">Cancelar</button>
                        <button class="btn btn-primary" onclick="salvarEdicaoAgendamentoDono(${id})">Salvar</button>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById("modalEditarAgendamentoDono");
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
}

function fecharModalEditarAgendamentoDono() {
    const modal = document.getElementById("modalEditarAgendamentoDono");
    if (modal) modal.remove();
}

function atualizarValorPorServicoEditDono() {
    const select = document.getElementById("editServicoIdDono");
    const selectedOption = select.options[select.selectedIndex];
    const valor = selectedOption.getAttribute("data-valor");
    const nome = selectedOption.getAttribute("data-nome");

    if (valor) {
        document.getElementById("editValorAgendamentoDono").value = parseFloat(valor).toFixed(2);
        document.getElementById("editServicoDescricaoDono").value = nome;
    }
}

async function salvarEdicaoAgendamentoDono(id) {
    const cliente_id = document.getElementById("editClienteIdDono").value;
    const data = document.getElementById("editDataAgendamentoDono").value;
    const hora = document.getElementById("editHoraAgendamentoDono").value;
    const servico_id = document.getElementById("editServicoIdDono").value;
    const servico_descricao = document.getElementById("editServicoDescricaoDono").value;
    const valor = document.getElementById("editValorAgendamentoDono").value;
    const profissional_id = document.getElementById("editProfissionalIdDono").value;

    if (!cliente_id || !data) {
        showToast("Cliente e data são obrigatórios", "warning");
        return;
    }

    if (hora && !validarDataHoraFutura(data, hora)) {
        return;
    }

    showLoading();

    const token = localStorage.getItem("token");
    const body = {
        cliente_id: parseInt(cliente_id),
        data: data,
        hora: hora,
        valor: parseFloat(valor) || 0,
        profissional_id: profissional_id ? parseInt(profissional_id) : null
    };

    if (servico_id && servico_id !== '') {
        body.servico_id = parseInt(servico_id);
    } else if (servico_descricao && servico_descricao.trim() !== '') {
        body.servico = servico_descricao.trim();
    }

    try {
        const res = await fetch(`/api/agendamentos/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(body)
        });

        const result = await res.json();

        if (result.success) {
            showToast("Agendamento atualizado com sucesso!", "success");
            fecharModalEditarAgendamentoDono();
            carregarAgendamentos();

            if (typeof window.atualizarAgendaAposAgendamento === 'function') {
                window.atualizarAgendaAposAgendamento();
            }
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        console.error("Erro ao atualizar agendamento:", error);
        showToast("Erro ao atualizar agendamento", "error");
    }

    hideLoading();
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarAgendamentos = carregarAgendamentos;
window.abrirModalAgendamentoDono = abrirModalAgendamentoDono;
window.fecharModalAgendamentoDono = fecharModalAgendamentoDono;
window.salvarAgendamentoDono = salvarAgendamentoDono;
window.concluirAgendamento = concluirAgendamento;
window.excluirAgendamento = excluirAgendamento;
window.atualizarValorPorServicoDono = atualizarValorPorServicoDono;
window.aplicarFiltrosAgendamentos = aplicarFiltrosAgendamentos;
window.limparFiltrosAgendamentos = limparFiltrosAgendamentos;
window.editarAgendamento = editarAgendamento;
window.fecharModalEditarAgendamentoDono = fecharModalEditarAgendamentoDono;
window.salvarEdicaoAgendamentoDono = salvarEdicaoAgendamentoDono;
window.atualizarValorPorServicoEditDono = atualizarValorPorServicoEditDono;
window.carregarHorariosDisponiveisDono = carregarHorariosDisponiveisDono;
window.abrirModalNovoCliente = abrirModalNovoCliente;
window.fecharModalNovoCliente = fecharModalNovoCliente;
window.salvarNovoCliente = salvarNovoCliente;

// ============================================
// CORREÇÃO: AÇÃO RÁPIDA - NOVO AGENDAMENTO
// ============================================

window.abrirModalAgendamento = async function () {
    console.log('🔄 Abrindo modal de agendamento via ação rápida...');

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success && data.data) {
            clientesList = data.data;
            console.log(`✅ ${clientesList.length} clientes carregados`);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
    }

    try {
        const res = await fetch('/api/profissionais', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success && data.data) {
            profissionaisList = data.data;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar profissionais:', error);
    }

    try {
        const res = await fetch('/api/servicos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success && data.data) {
            servicosList = data.data;
        }
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
    }

    if (typeof abrirModalAgendamentoDono === 'function') {
        abrirModalAgendamentoDono();
    } else {
        showToast('Erro ao abrir modal de agendamento', 'error');
    }
};

// ============================================
// CORREÇÃO: AÇÃO RÁPIDA - ABRIR MODAL CLIENTE
// ============================================

window.abrirModalCliente = function () {
    console.log('🔄 Abrindo modal de cliente...');

    if (typeof window.abrirModalClienteOriginal === 'function') {
        window.abrirModalClienteOriginal();
        return;
    }

    if (typeof abrirModalCliente === 'function' && abrirModalCliente !== window.abrirModalCliente) {
        abrirModalCliente();
        return;
    }

    showToast('Carregando página de clientes...', 'info');
    if (typeof carregarClientes === 'function') {
        carregarClientes();
        setTimeout(() => {
            if (typeof abrirModalCliente === 'function' && abrirModalCliente !== window.abrirModalCliente) {
                abrirModalCliente();
            }
        }, 500);
    } else {
        showToast('Função não disponível', 'warning');
    }
};

console.log('✅ Ações rápidas corrigidas!');

// ============================================
// 🔥 FUNÇÃO PARA LIMPAR VARIÁVEIS GLOBAIS
// ============================================

function limparVariaveisAgendamento() {
    window.dataAgendamentoForcada = null;
    window.horaAgendamentoForcada = null;
    window.profissionalAgendamentoForcado = null;
    console.log('🧹 Variáveis de agendamento limpas');
}

// ============================================
// FECHAR MODAL AGENDAMENTO (SUBSTITUIR A EXISTENTE)
// ============================================

function fecharModalAgendamentoDono() {
    const modal = document.getElementById("modalAgendamentoDono");
    if (modal) modal.remove();

    // ============================================
    // 🔥 LIMPAR VARIÁVEIS GLOBAIS AO FECHAR
    // ============================================
    window.dataAgendamentoForcada = null;
    window.horaAgendamentoForcada = null;
    window.profissionalAgendamentoForcado = null;

    console.log('🧹 Modal fechado, variáveis limpas');
}

// ============================================
// EXPORTAR FUNÇÕES (ADICIONAR AO FINAL DO ARQUIVO)
// ============================================

window.limparVariaveisAgendamento = limparVariaveisAgendamento;