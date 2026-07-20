// pages/agendamentos.js - Versão Completa com SERVIÇOS EXTRAS
let profissionaisList = [];
let clientesList = [];
let servicosList = [];

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
            if ((p.ativo == 1 || p.ativo == true)) {
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
// FUNÇÃO PARA RENDERIZAR LINHA DA TABELA (COM EXTRAS)
// ============================================

function renderizarLinhaAgendamento(item) {
    const statusMap = {
        'concluido': { class: 'concluido', label: '✅ Concluído' },
        'pendente': { class: 'pendente', label: '⏳ Pendente' },
        'agendado': { class: 'agendado', label: '📋 Agendado' },
        'cancelado': { class: 'cancelado', label: '❌ Cancelado' }
    };

    const statusInfo = statusMap[item.status] || statusMap['pendente'];
    const dataFormatada = item.data ? formatarDataBr(item.data) : '-';
    const horaFormatada = item.hora || '-';
    const podeEditar = item.status !== 'concluido' && item.status !== 'cancelado';

    // Verificar se tem extras
    let extrasCount = 0;
    let extrasList = [];
    let valorExtras = 0;

    if (item.servicos_extras) {
        try {
            extrasList = typeof item.servicos_extras === 'string' ? JSON.parse(item.servicos_extras) : item.servicos_extras;
            extrasCount = extrasList.length;
            for (let extra of extrasList) {
                valorExtras += parseFloat(extra.valor) || 0;
            }
        } catch (e) {
            extrasList = [];
            extrasCount = 0;
        }
    }

    const valorPrincipal = parseFloat(item.valor) || 0;
    const valorTotal = valorPrincipal + valorExtras;
    const valorExibir = item.valor_total ? parseFloat(item.valor_total) : valorTotal;

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
                <div>
                    <span class="servico-nome">${escapeHtml(item.servico_nome || item.servico || '-')}</span>
                    ${extrasCount > 0 ? `
                        <span style="display:block;font-size:10px;color:#f59e0b;margin-top:2px;">
                            <i class="fas fa-plus-circle"></i> ${extrasCount} extra(s): ${extrasList.map(e => e.nome).join(', ')}
                        </span>
                    ` : ''}
                </div>
            </td>
            <td>
                <div>
                    ${extrasCount > 0 ? `
                        <span style="font-size:11px;color:var(--text-muted);display:block;">
                            R$ ${valorPrincipal.toFixed(2)}
                            <span style="color:#22c55e;">+ R$ ${valorExtras.toFixed(2)}</span>
                        </span>
                        <span style="font-weight:700;color:var(--primary);font-size:15px;">
                            R$ ${valorExibir.toFixed(2)}
                        </span>
                    ` : `
                        <span class="valor">R$ ${valorPrincipal.toFixed(2)}</span>
                    `}
                </div>
            </td>
            <td>
                <span class="status-badge ${statusInfo.class}">
                    <span class="dot"></span>
                    ${statusInfo.label}
                </span>
            </td>
            <td>
                <div class="actions-cell" style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${podeEditar ? `
                        <button class="btn-icon btn-edit" onclick="editarAgendamento(${item.id})" title="Editar">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-check" onclick="concluirAgendamento(${item.id})" title="Concluir">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <!-- 🔥 BOTÃO EXTRAS -->
                    <button class="btn-icon btn-extra" onclick="abrirModalExtra(${item.id})" title="Serviços Extras" style="
                        padding: 4px 10px;
                        border-radius: 6px;
                        border: 1px solid ${extrasCount > 0 ? 'rgba(34,197,94,0.5)' : 'rgba(245,158,11,0.3)'};
                        background: var(--bg-hover);
                        color: ${extrasCount > 0 ? '#22c55e' : '#f59e0b'};
                        font-size: 12px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        <i class="fas ${extrasCount > 0 ? 'fa-star' : 'fa-plus-circle'}"></i> 
                        ${extrasCount > 0 ? `${extrasCount}` : 'Extras'}
                    </button>
                    <button class="btn-icon btn-delete" onclick="excluirAgendamento(${item.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
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

// ============================================
// CARREGAR LISTA COM FILTROS
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

        const isMobile = window.innerWidth < 768;

        if (listaFiltrada.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="fas fa-calendar-plus"></i>
                            <h4>${agendamentos.length === 0 ? 'Nenhum agendamento encontrado' : 'Nenhum resultado com os filtros selecionados'}</h4>
                            <p>${agendamentos.length === 0 ? 'Comece criando seu primeiro agendamento!' : 'Tente ajustar os filtros'}</p>
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

        if (isMobile) {
            // Versão Mobile - Cards com Extras
            const tableContainer = tbody.closest('.table-responsive');
            const cardContainer = document.createElement('div');
            cardContainer.className = 'agendamentos-mobile-container';
            cardContainer.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 8px 4px;
                width: 100%;
                max-width: 100%;
                box-sizing: border-box;
            `;

            for (let item of listaFiltrada) {
                const statusMap = {
                    'concluido': { class: 'concluido', label: '✅ Concluído' },
                    'pendente': { class: 'pendente', label: '⏳ Pendente' },
                    'agendado': { class: 'agendado', label: '📋 Agendado' },
                    'cancelado': { class: 'cancelado', label: '❌ Cancelado' }
                };
                const statusInfo = statusMap[item.status] || statusMap['pendente'];
                const podeEditar = item.status !== 'concluido' && item.status !== 'cancelado';

                // Extras
                let extrasCount = 0;
                let extrasList = [];
                let valorExtras = 0;
                if (item.servicos_extras) {
                    try {
                        extrasList = typeof item.servicos_extras === 'string' ? JSON.parse(item.servicos_extras) : item.servicos_extras;
                        extrasCount = extrasList.length;
                        for (let extra of extrasList) {
                            valorExtras += parseFloat(extra.valor) || 0;
                        }
                    } catch (e) {
                        extrasList = [];
                        extrasCount = 0;
                    }
                }
                const valorPrincipal = parseFloat(item.valor) || 0;
                const valorTotal = valorPrincipal + valorExtras;

                const card = document.createElement('div');
                card.style.cssText = `
                    background: var(--bg-card);
                    border-radius: 14px;
                    padding: 14px 16px;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                `;

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                            <span style="width:38px;height:38px;border-radius:50%;background:var(--gradient);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;">${item.cliente_nome ? item.cliente_nome.charAt(0).toUpperCase() : '?'}</span>
                            <div style="min-width:0;flex:1;">
                                <span style="display:block;font-weight:600;color:var(--text-primary);font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.cliente_nome || 'N/A')}</span>
                                <span style="display:block;font-size:12px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.servico_nome || item.servico || '-')}</span>
                                ${extrasCount > 0 ? `<span style="display:block;font-size:10px;color:#f59e0b;">⭐ +${extrasCount} extra(s)</span>` : ''}
                            </div>
                        </div>
                        <span style="padding:3px 10px;border-radius:20px;font-size:10px;font-weight:600;white-space:nowrap;flex-shrink:0;background:${statusInfo.class === 'concluido' ? 'rgba(34,197,94,0.15)' : statusInfo.class === 'cancelado' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};color:${statusInfo.class === 'concluido' ? '#22c55e' : statusInfo.class === 'cancelado' ? '#ef4444' : '#f59e0b'};">
                            ${statusInfo.label}
                        </span>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;background:var(--bg-hover);padding:10px 14px;border-radius:10px;margin-bottom:12px;width:100%;box-sizing:border-box;">
                        <div>
                            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;">📅 Data</div>
                            <div style="font-weight:500;color:var(--text-primary);font-size:14px;">${formatarDataBr(item.data)}</div>
                        </div>
                        <div>
                            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;">⏰ Horário</div>
                            <div style="font-weight:500;color:var(--text-primary);font-size:14px;">${item.hora || '-'}</div>
                        </div>
                        <div>
                            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;">👨‍💼 Profissional</div>
                            <div style="font-weight:500;color:var(--text-primary);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(item.profissional_nome || 'Não atribuído')}</div>
                        </div>
                        <div>
                            <div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.3px;">💰 Valor</div>
                            <div style="font-weight:700;color:#22c55e;font-size:15px;">R$ ${valorTotal.toFixed(2)}</div>
                            ${extrasCount > 0 ? `<div style="font-size:9px;color:var(--text-muted);">R$ ${valorPrincipal.toFixed(2)} + R$ ${valorExtras.toFixed(2)}</div>` : ''}
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid var(--border-color); padding-top: 10px;">
                        ${podeEditar ? `
                            <button onclick="editarAgendamento(${item.id})" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(102,126,234,0.25);background:var(--bg-hover);color:var(--primary);font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:4px;flex:1;justify-content:center;">
                                <i class="fas fa-pen" style="font-size:11px;"></i> Editar
                            </button>
                            <button onclick="concluirAgendamento(${item.id})" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(34,197,94,0.25);background:var(--bg-hover);color:#22c55e;font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:4px;flex:1;justify-content:center;">
                                <i class="fas fa-check" style="font-size:11px;"></i> Concluir
                            </button>
                        ` : ''}
                        <button onclick="abrirModalExtra(${item.id})" style="padding:6px 12px;border-radius:8px;border:1px solid ${extrasCount > 0 ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.3)'};background:var(--bg-hover);color:${extrasCount > 0 ? '#22c55e' : '#f59e0b'};font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:4px;${podeEditar ? 'flex:0.8;' : 'flex:1;'}justify-content:center;">
                            <i class="fas ${extrasCount > 0 ? 'fa-star' : 'fa-plus-circle'}" style="font-size:11px;"></i> ${extrasCount > 0 ? `⭐ ${extrasCount}` : 'Extras'}
                        </button>
                        <button onclick="excluirAgendamento(${item.id})" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.25);background:var(--bg-hover);color:#ef4444;font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;gap:4px;${podeEditar ? 'flex:0.7;' : 'flex:1;'}justify-content:center;">
                            <i class="fas fa-trash" style="font-size:11px;"></i> Excluir
                        </button>
                    </div>
                `;

                cardContainer.appendChild(card);
            }

            if (tableContainer) {
                tableContainer.replaceWith(cardContainer);
            } else {
                const parent = tbody.parentElement;
                if (parent) {
                    parent.replaceWith(cardContainer);
                }
            }
            return;
        }

        // Versão Desktop
        let html = '';
        for (let item of listaFiltrada) {
            html += renderizarLinhaAgendamento(item);
        }
        tbody.innerHTML = html;

    } catch (error) {
        console.error('❌ Erro ao carregar agendamentos:', error);
        showToast('Erro ao carregar agendamentos', 'error');
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                const ano = parseInt(partes[0]);
                const mes = parseInt(partes[1]) - 1;
                const dia = parseInt(partes[2]);
                const data = new Date(Date.UTC(ano, mes, dia));
                return data.toLocaleDateString('pt-BR');
            }
        }
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) {
            return data.toLocaleDateString('pt-BR');
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// FUNÇÕES DE FILTROS
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
// ============================================
// CARREGAR HORÁRIOS DISPONÍVEIS
// ============================================

async function carregarHorariosDisponiveisDono(manterHorario = false, horarioParaRestaurar = null) {
    try {
        const data = document.getElementById("dataAgendamentoDono").value;
        const profissional_id = document.getElementById("profissionalIdDono").value;
        const servicoSelect = document.getElementById("servicoIdDono");
        const servicoId = servicoSelect ? servicoSelect.value : null;
        const horaSelect = document.getElementById("horaAgendamentoDono");

        const horarioAtual = horaSelect ? horaSelect.value : null;
        const horarioFinal = horarioParaRestaurar || (manterHorario ? horarioAtual : null);

        if (!data) {
            horaSelect.innerHTML = '<option value="">Selecione uma data primeiro</option>';
            return;
        }

        let duracao = 30;
        if (servicoId && servicoId !== '') {
            const servico = servicosList.find(s => s.id == servicoId);
            if (servico) {
                duracao = servico.duracao || 30;
            }
        }

        const infoDuracao = document.getElementById('infoDuracaoHorario');
        if (infoDuracao) {
            infoDuracao.textContent = `⏱️ Duração do serviço: ${duracao}min - Horários disponíveis consideram este tempo`;
        }

        const hoje = new Date();
        const hojeStr = hoje.toISOString().split('T')[0];

        if (data < hojeStr) {
            horaSelect.innerHTML = '<option value="">⚠️ Esta data já passou</option>';
            showToast('⚠️ Não é possível agendar em datas passadas', 'warning');
            return;
        }

        horaSelect.innerHTML = '<option value="">Carregando...</option>';

        const token = localStorage.getItem("token");
        if (!token) {
            horaSelect.innerHTML = '<option value="">Erro: Token não encontrado</option>';
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const empresaId = payload.empresa_id;

            const body = {
                empresaId: empresaId,
                profissionalId: profissional_id || null,
                data: data,
                duracao: duracao
            };

            const response = await fetch("/api/chatbot/horarios-disponiveis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                horaSelect.innerHTML = `<option value="">Erro HTTP: ${response.status}</option>`;
                return;
            }

            const result = await response.json();

            if (result.success) {
                let horarios = [];
                if (Array.isArray(result.horarios)) {
                    horarios = result.horarios;
                } else if (Array.isArray(result.data)) {
                    horarios = result.data;
                }

                const agora = new Date();
                const hojeStr = agora.toISOString().split('T')[0];
                let horariosFiltrados = horarios;

                if (data === hojeStr) {
                    const horaAtual = agora.getHours();
                    const minutoAtual = agora.getMinutes();
                    horariosFiltrados = horarios.filter(horaItem => {
                        const [horaNum, minutoNum] = horaItem.split(':').map(Number);
                        return horaNum > horaAtual || (horaNum === horaAtual && minutoNum > minutoAtual);
                    });
                }

                if (horariosFiltrados.length > 0) {
                    let options = '<option value="">Selecione um horário</option>';
                    for (let horaItem of horariosFiltrados) {
                        const horaNum = parseInt(horaItem.split(':')[0]);
                        const isAlmoco = horaNum >= 12 && horaNum < 13;
                        const emoji = isAlmoco ? ' 🍽️' : '';
                        options += `<option value="${horaItem}">${horaItem}${emoji} (${duracao}min)</option>`;
                    }
                    horaSelect.innerHTML = options;

                    if (horarioFinal) {
                        let encontrado = false;
                        for (let opt of horaSelect.options) {
                            if (opt.value === horarioFinal) {
                                horaSelect.value = horarioFinal;
                                encontrado = true;
                                break;
                            }
                        }
                        if (!encontrado) {
                            const horariosDisponiveis = Array.from(horaSelect.options).map(o => o.value).filter(v => v !== '');
                            if (horariosDisponiveis.length > 0) {
                                const horarioProximo = horariosDisponiveis.find(h => h >= horarioFinal) || horariosDisponiveis[0];
                                horaSelect.value = horarioProximo;
                            }
                        }
                    } else {
                        if (horariosFiltrados.length > 0 && !horaSelect.value) {
                            horaSelect.value = horariosFiltrados[0];
                        }
                    }
                } else {
                    if (data === hojeStr) {
                        horaSelect.innerHTML = '<option value="">⏰ Todos os horários de hoje já passaram</option>';
                    } else {
                        horaSelect.innerHTML = `<option value="">Nenhum horário disponível para serviço de ${duracao}min</option>`;
                    }
                }
            } else {
                horaSelect.innerHTML = `<option value="">Erro: ${result.message || 'Erro ao carregar horários'}</option>`;
            }
        } catch (tokenError) {
            console.error('❌ Erro ao decodificar token:', tokenError);
            horaSelect.innerHTML = '<option value="">Erro: Token inválido</option>';
        }
    } catch (error) {
        console.error('❌ Erro geral:', error);
        const horaSelect = document.getElementById("horaAgendamentoDono");
        if (horaSelect) {
            horaSelect.innerHTML = `<option value="">Erro: ${error.message || 'Erro desconhecido'}</option>`;
        }
        showToast('Erro ao carregar horários: ' + error.message, 'error');
    }
}

// ============================================
// ABRIR MODAL NOVO AGENDAMENTO
// ============================================

async function abrirModalAgendamentoDono(horarioPreDefinido = null) {
    const clientes = Array.isArray(clientesList) ? clientesList : [];
    const servicos = Array.isArray(servicosList) ? servicosList : [];
    const profissionais = Array.isArray(profissionaisList) ? profissionaisList : [];

    let clientesOptions = '<option value="">Selecione...</option>';
    if (clientes.length > 0) {
        for (let c of clientes) {
            clientesOptions += `<option value="${c.id}">${escapeHtml(c.nome)}</option>`;
        }
    }

    let servicosOptions = '<option value="">Selecione um serviço</option>';
    if (servicos.length > 0) {
        for (let s of servicos) {
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" data-duracao="${s.duracao || 30}">${escapeHtml(s.nome)} - R$ ${(parseFloat(s.valor) || 0).toFixed(2)} (${s.duracao || 30}min)</option>`;
        }
    }

    let profissionaisOptions = '<option value="">Não atribuir</option>';
    if (profissionais.length > 0) {
        for (let p of profissionais) {
            if ((p.ativo == 1 || p.ativo == true)) {
                profissionaisOptions += `<option value="${p.id}">${escapeHtml(p.nome)} (${p.comissao_percent}%)</option>`;
            }
        }
    }

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
                    <input type="date" id="dataAgendamentoDono" class="form-control" onchange="carregarHorariosDisponiveisDono()">
                </div>

                <div class="form-group">
                    <label>Horário *</label>
                    <select id="horaAgendamentoDono" class="form-control">
                        <option value="">Selecione uma data primeiro</option>
                    </select>
                    <small class="text-muted" id="infoDuracaoHorario">Horários disponíveis considerando a duração do serviço</small>
                </div>

                <div class="form-group">
                    <label>Serviço</label>
                    <select id="servicoIdDono" class="form-control" onchange="atualizarValorPorServicoDono()">
                        ${servicosOptions}
                    </select>
                    <input type="text" id="servicoDescricaoDono" class="form-control" style="margin-top: 10px;" placeholder="Ou digite o serviço manualmente" onchange="carregarHorariosDisponiveisDono()">
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
                    <small class="text-muted">Se não escolher, o sistema buscará um profissional disponível</small>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="fecharModalAgendamentoDono()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="salvarAgendamentoDono()">Salvar</button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("modalAgendamentoDono");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
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

    const horaSelect = document.getElementById("horaAgendamentoDono");
    const horarioAtual = horaSelect ? horaSelect.value : null;

    if (valor) {
        document.getElementById("valorAgendamentoDono").value = parseFloat(valor).toFixed(2);
        document.getElementById("servicoDescricaoDono").value = nome;
        carregarHorariosDisponiveisDono(true, horarioAtual);
    }
}

// ============================================
// SALVAR AGENDAMENTO
// ============================================

async function salvarAgendamentoDono() {
    const cliente_id = document.getElementById("clienteIdDono").value;
    const data = document.getElementById("dataAgendamentoDono").value;
    const hora = document.getElementById("horaAgendamentoDono").value;
    const servico_id = document.getElementById("servicoIdDono").value;
    const servico_descricao = document.getElementById("servicoDescricaoDono").value;
    const valor = document.getElementById("valorAgendamentoDono").value;
    const profissional_id = document.getElementById("profissionalIdDono").value;

    if (!cliente_id || !data) {
        showToast("Cliente e data são obrigatórios", "warning");
        return;
    }

    if (!hora || hora === '') {
        showToast("Selecione um horário", "warning");
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

            if (typeof carregarAgendamentos === 'function') {
                carregarAgendamentos();
            }
        } else {
            showToast("❌ Erro: " + result.message, "error");
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
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" ${selected}>${s.nome} - R$ ${(parseFloat(s.valor) || 0).toFixed(2)} (${s.duracao}min)</option>`;
        }

        let profissionaisOptions = '<option value="">Não atribuir</option>';
        for (let p of profissionais) {
            if ((p.ativo == 1 || p.ativo == true)) {
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
// ============================================
// 🔥 SERVIÇOS EXTRAS - FUNÇÕES
// ============================================

// Abrir modal para adicionar serviço extra
async function abrirModalExtra(agendamentoId) {
    const token = localStorage.getItem("token");

    // Buscar o agendamento atual
    const res = await fetch("/api/agendamentos", {
        headers: { "Authorization": "Bearer " + token }
    });
    const result = await res.json();

    if (!result.success) {
        showToast("Erro ao carregar agendamento", "error");
        return;
    }

    const agendamento = result.data.find(a => a.id === agendamentoId);
    if (!agendamento) {
        showToast("Agendamento não encontrado", "error");
        return;
    }

    // Buscar serviços disponíveis
    const servicosRes = await fetch("/api/servicos", {
        headers: { "Authorization": "Bearer " + token }
    });
    const servicosResult = await servicosRes.json();
    const servicos = servicosResult.success ? servicosResult.data : [];

    // Buscar extras já adicionados
    let extrasList = [];
    let valorExtras = 0;
    if (agendamento.servicos_extras) {
        try {
            extrasList = typeof agendamento.servicos_extras === 'string' ?
                JSON.parse(agendamento.servicos_extras) : agendamento.servicos_extras;
            for (let extra of extrasList) {
                valorExtras += parseFloat(extra.valor) || 0;
            }
        } catch (e) {
            extrasList = [];
        }
    }

    let servicosOptions = '';
    for (let s of servicos) {
        if ((s.ativo == 1 || s.ativo == true)) {
            const jaAdicionado = extrasList.some(e => e.servico_id === s.id);
            if (!jaAdicionado) {
                servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" data-duracao="${s.duracao || 30}">
                    ${s.nome} - R$ ${(parseFloat(s.valor) || 0).toFixed(2)} (${s.duracao || 30}min)
                </option>`;
            }
        }
    }

    // HTML dos extras já adicionados
    let extrasHtml = '';
    let totalExtras = 0;
    for (let extra of extrasList) {
        totalExtras += parseFloat(extra.valor) || 0;
        extrasHtml += `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-hover);border-radius:8px;margin-bottom:4px;">
                <div>
                    <span style="font-weight:500;">${escapeHtml(extra.nome)}</span>
                    <span style="font-size:12px;color:var(--text-muted);"> +${extra.duracao || 0}min</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-weight:600;color:#22c55e;">R$ ${(parseFloat(extra.valor) || 0).toFixed(2)}</span>
                    <button onclick="removerExtra(${agendamentoId}, ${extra.servico_id})" style="padding:2px 10px;border-radius:6px;border:none;background:rgba(239,68,68,0.15);color:#ef4444;font-size:14px;cursor:pointer;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    const valorPrincipal = parseFloat(agendamento.valor) || 0;
    const valorTotal = valorPrincipal + totalExtras;

    const modalHtml = `
        <div id="modalExtras" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h3>➕ Serviços Extras</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">
                    Adicione serviços realizados durante este atendimento.
                </p>
                
                <div style="background:var(--bg-hover);border-radius:10px;padding:12px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;padding:4px 0;">
                        <span style="color:var(--text-muted);">Serviço principal:</span>
                        <span style="font-weight:500;">${escapeHtml(agendamento.servico_nome || agendamento.servico || 'N/A')}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid var(--border-color);">
                        <span style="color:var(--text-muted);">Valor principal:</span>
                        <span style="font-weight:600;color:#22c55e;">R$ ${valorPrincipal.toFixed(2)}</span>
                    </div>
                    ${totalExtras > 0 ? `
                        <div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid var(--border-color);">
                            <span style="color:var(--text-muted);">Extras:</span>
                            <span style="font-weight:600;color:#22c55e;">R$ ${totalExtras.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div style="display:flex;justify-content:space-between;padding:8px 0 0 0;border-top:2px solid var(--primary);margin-top:4px;">
                        <span style="font-weight:600;">Total:</span>
                        <span style="font-weight:700;color:var(--primary);font-size:18px;">R$ ${valorTotal.toFixed(2)}</span>
                    </div>
                </div>
                
                <div style="margin-bottom:16px;">
                    <label>Adicionar serviço extra:</label>
                    <div style="display:flex;gap:8px;margin-top:6px;">
                        <select id="extraServicoSelect" class="form-control" style="flex:1;">
                            ${servicosOptions || '<option value="">Nenhum serviço disponível</option>'}
                        </select>
                        <button onclick="adicionarExtra(${agendamentoId})" class="btn btn-primary" style="white-space:nowrap;">
                            <i class="fas fa-plus"></i> Adicionar
                        </button>
                    </div>
                </div>
                
                <div style="margin-bottom:16px;">
                    <label>Serviços adicionados:</label>
                    <div style="margin-top:6px;">
                        ${extrasHtml || '<p style="color:var(--text-muted);font-size:13px;">Nenhum serviço extra adicionado.</p>'}
                    </div>
                </div>
                
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                    <button class="btn btn-secondary" onclick="fecharModalExtras()">Fechar</button>
                    <button class="btn btn-success" onclick="salvarExtras(${agendamentoId})">
                        <i class="fas fa-save"></i> Salvar Extras
                    </button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("modalExtras");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Adicionar serviço extra
async function adicionarExtra(agendamentoId) {
    const select = document.getElementById("extraServicoSelect");
    if (!select || !select.value) {
        showToast("Selecione um serviço", "warning");
        return;
    }

    const selectedOption = select.options[select.selectedIndex];
    const servicoId = parseInt(select.value);
    const nome = selectedOption.getAttribute("data-nome");
    const valor = parseFloat(selectedOption.getAttribute("data-valor")) || 0;
    const duracao = parseInt(selectedOption.getAttribute("data-duracao")) || 30;

    const token = localStorage.getItem("token");
    const res = await fetch("/api/agendamentos", {
        headers: { "Authorization": "Bearer " + token }
    });
    const result = await res.json();
    const agendamento = result.data.find(a => a.id === agendamentoId);

    if (!agendamento) return;

    let extrasList = [];
    if (agendamento.servicos_extras) {
        try {
            extrasList = typeof agendamento.servicos_extras === 'string' ?
                JSON.parse(agendamento.servicos_extras) : agendamento.servicos_extras;
        } catch (e) {
            extrasList = [];
        }
    }

    if (extrasList.some(e => e.servico_id === servicoId)) {
        showToast("Este serviço já foi adicionado como extra", "warning");
        return;
    }

    extrasList.push({
        servico_id: servicoId,
        nome: nome,
        valor: valor,
        duracao: duracao,
        adicionado_em: new Date().toISOString()
    });

    const updateRes = await fetch(`/api/agendamentos/${agendamentoId}/extras`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ servicos_extras: extrasList })
    });

    const updateResult = await updateRes.json();
    if (updateResult.success) {
        showToast("Serviço extra adicionado!", "success");
        fecharModalExtras();
        abrirModalExtra(agendamentoId);
    } else {
        showToast("Erro ao adicionar extra: " + (updateResult.message || ''), "error");
    }
}

// Remover serviço extra
async function removerExtra(agendamentoId, servicoId) {
    if (!confirm("Remover este serviço extra?")) return;

    const token = localStorage.getItem("token");
    const res = await fetch("/api/agendamentos", {
        headers: { "Authorization": "Bearer " + token }
    });
    const result = await res.json();
    const agendamento = result.data.find(a => a.id === agendamentoId);

    if (!agendamento) return;

    let extrasList = [];
    if (agendamento.servicos_extras) {
        try {
            extrasList = typeof agendamento.servicos_extras === 'string' ?
                JSON.parse(agendamento.servicos_extras) : agendamento.servicos_extras;
        } catch (e) {
            extrasList = [];
        }
    }

    const novosExtras = extrasList.filter(e => e.servico_id !== servicoId);

    const updateRes = await fetch(`/api/agendamentos/${agendamentoId}/extras`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ servicos_extras: novosExtras })
    });

    const updateResult = await updateRes.json();
    if (updateResult.success) {
        showToast("Serviço extra removido!", "success");
        fecharModalExtras();
        abrirModalExtra(agendamentoId);
    } else {
        showToast("Erro ao remover extra", "error");
    }
}

// Salvar extras e fechar
async function salvarExtras(agendamentoId) {
    fecharModalExtras();
    showToast("✅ Extras salvos com sucesso!", "success");
    carregarAgendamentos();

    if (typeof carregarFinanceiro === 'function') {
        const btnFinanceiro = document.getElementById("btnFinanceiro");
        if (btnFinanceiro && btnFinanceiro.classList.contains("active")) {
            carregarFinanceiro();
        }
    }
}

function fecharModalExtras() {
    const modal = document.getElementById("modalExtras");
    if (modal) modal.remove();
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarAgendamentos = carregarAgendamentos;
window.carregarListaAgendamentosComFiltro = carregarListaAgendamentosComFiltro;
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

// 🔥 Exportar funções de Extras
window.abrirModalExtra = abrirModalExtra;
window.adicionarExtra = adicionarExtra;
window.removerExtra = removerExtra;
window.salvarExtras = salvarExtras;
window.fecharModalExtras = fecharModalExtras;

console.log('✅ agendamentos.js carregado com SERVIÇOS EXTRAS!');

// ============================================
// 🔥 SERVIÇOS EXTRAS - FUNÇÃO PRINCIPAL
// ============================================

function abrirModalExtra(agendamentoId) {
    console.log('📝 Abrindo modal de extras para agendamento:', agendamentoId);

    if (!agendamentoId) {
        showToast('Agendamento não encontrado', 'error');
        return;
    }

    // Buscar os dados do agendamento
    const token = localStorage.getItem('token');

    fetch('/api/agendamentos', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showToast('Erro ao carregar agendamento', 'error');
                return;
            }

            const agendamento = data.data.find(a => a.id === agendamentoId);
            if (!agendamento) {
                showToast('Agendamento não encontrado', 'error');
                return;
            }

            // Buscar serviços disponíveis
            fetch('/api/servicos', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
                .then(res => res.json())
                .then(servicosData => {
                    if (!servicosData.success) {
                        showToast('Erro ao carregar serviços', 'error');
                        return;
                    }

                    const servicos = servicosData.data || [];

                    // Extrair serviços extras já adicionados
                    let extrasList = [];
                    if (agendamento.servicos_extras) {
                        try {
                            extrasList = typeof agendamento.servicos_extras === 'string' ?
                                JSON.parse(agendamento.servicos_extras) : agendamento.servicos_extras;
                        } catch (e) {
                            extrasList = [];
                        }
                    }

                    // Calcular valor dos extras
                    let valorExtras = 0;
                    for (let extra of extrasList) {
                        valorExtras += parseFloat(extra.valor) || 0;
                    }

                    const valorPrincipal = parseFloat(agendamento.valor) || 0;
                    const valorTotal = valorPrincipal + valorExtras;

                    // Montar HTML do modal
                    let servicosOptions = '<option value="">Selecione um serviço</option>';
                    for (let s of servicos) {
                        if ((s.ativo == 1 || s.ativo == true)) {
                            const jaAdicionado = extrasList.some(e => e.servico_id === s.id);
                            if (!jaAdicionado) {
                                servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" data-duracao="${s.duracao || 30}">
                            ${s.nome} - R$ ${(parseFloat(s.valor) || 0).toFixed(2)} (${s.duracao || 30}min)
                        </option>`;
                            }
                        }
                    }

                    // HTML dos extras já adicionados
                    let extrasHtml = '';
                    for (let extra of extrasList) {
                        extrasHtml += `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg-hover);border-radius:8px;margin-bottom:4px;">
                        <div>
                            <span style="font-weight:500;">${escapeHtml(extra.nome)}</span>
                            <span style="font-size:12px;color:var(--text-muted);"> +${extra.duracao || 0}min</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-weight:600;color:#22c55e;">R$ ${(parseFloat(extra.valor) || 0).toFixed(2)}</span>
                            <button onclick="removerExtraDoModal(${agendamentoId}, ${extra.servico_id})" style="padding:2px 10px;border-radius:6px;border:none;background:rgba(239,68,68,0.15);color:#ef4444;font-size:14px;cursor:pointer;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                `;
                    }

                    // Criar o modal
                    const modalHtml = `
                <div id="modalExtras" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
                    <div class="modal-content" style="max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                        <h3 style="margin-top: 0;">➕ Serviços Extras</h3>
                        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">
                            Adicione serviços realizados durante este atendimento.
                        </p>
                        
                        <div style="background:var(--bg-hover);border-radius:10px;padding:12px;margin-bottom:16px;">
                            <div style="display:flex;justify-content:space-between;padding:4px 0;">
                                <span style="color:var(--text-muted);">Serviço principal:</span>
                                <span style="font-weight:500;">${escapeHtml(agendamento.servico_nome || agendamento.servico || 'N/A')}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid var(--border-color);">
                                <span style="color:var(--text-muted);">Valor principal:</span>
                                <span style="font-weight:600;color:#22c55e;">R$ ${valorPrincipal.toFixed(2)}</span>
                            </div>
                            ${extrasList.length > 0 ? `
                                <div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid var(--border-color);">
                                    <span style="color:var(--text-muted);">Extras:</span>
                                    <span style="font-weight:600;color:#22c55e;">R$ ${valorExtras.toFixed(2)}</span>
                                </div>
                            ` : ''}
                            <div style="display:flex;justify-content:space-between;padding:8px 0 0 0;border-top:2px solid var(--primary);margin-top:4px;">
                                <span style="font-weight:600;">Total:</span>
                                <span style="font-weight:700;color:var(--primary);font-size:18px;">R$ ${valorTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div style="margin-bottom:16px;">
                            <label>Adicionar serviço extra:</label>
                            <div style="display:flex;gap:8px;margin-top:6px;">
                                <select id="extraServicoSelect" class="form-control" style="flex:1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                                    ${servicosOptions}
                                </select>
                                <button onclick="adicionarExtraNoModal(${agendamentoId})" class="btn btn-primary" style="white-space:nowrap; padding: 8px 16px; border-radius: 8px; background: var(--primary); color: white; border: none; cursor: pointer;">
                                    <i class="fas fa-plus"></i> Adicionar
                                </button>
                            </div>
                        </div>
                        
                        <div style="margin-bottom:16px;">
                            <label>Serviços adicionados:</label>
                            <div style="margin-top:6px;">
                                ${extrasHtml || '<p style="color:var(--text-muted);font-size:13px;">Nenhum serviço extra adicionado.</p>'}
                            </div>
                        </div>
                        
                        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
                            <button onclick="fecharModalExtras()" class="btn btn-secondary" style="padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); cursor: pointer;">
                                Fechar
                            </button>
                            <button onclick="salvarExtrasModal(${agendamentoId})" class="btn btn-success" style="padding: 8px 20px; border-radius: 8px; background: #22c55e; color: white; border: none; cursor: pointer;">
                                <i class="fas fa-save"></i> Salvar Extras
                            </button>
                        </div>
                    </div>
                </div>
            `;

                    // Remover modal antigo e adicionar novo
                    const existingModal = document.getElementById('modalExtras');
                    if (existingModal) existingModal.remove();

                    document.body.insertAdjacentHTML('beforeend', modalHtml);

                })
                .catch(err => {
                    console.error('Erro:', err);
                    showToast('Erro ao carregar serviços', 'error');
                });

        })
        .catch(err => {
            console.error('Erro:', err);
            showToast('Erro ao carregar agendamento', 'error');
        });
}

// ============================================
// FUNÇÕES AUXILIARES DO MODAL
// ============================================

function fecharModalExtras() {
    const modal = document.getElementById('modalExtras');
    if (modal) modal.remove();
}

function adicionarExtraNoModal(agendamentoId) {
    const select = document.getElementById('extraServicoSelect');
    if (!select || !select.value) {
        showToast('Selecione um serviço', 'warning');
        return;
    }

    const selectedOption = select.options[select.selectedIndex];
    const servicoId = parseInt(select.value);
    const nome = selectedOption.getAttribute('data-nome');
    const valor = parseFloat(selectedOption.getAttribute('data-valor')) || 0;
    const duracao = parseInt(selectedOption.getAttribute('data-duracao')) || 30;

    // Adicionar via API
    const token = localStorage.getItem('token');

    // Buscar agendamento atual
    fetch('/api/agendamentos', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(res => res.json())
        .then(data => {
            const agendamento = data.data.find(a => a.id === agendamentoId);
            if (!agendamento) {
                showToast('Agendamento não encontrado', 'error');
                return;
            }

            let extrasList = [];
            if (agendamento.servicos_extras) {
                try {
                    extrasList = typeof agendamento.servicos_extras === 'string' ?
                        JSON.parse(agendamento.servicos_extras) : agendamento.servicos_extras;
                } catch (e) {
                    extrasList = [];
                }
            }

            // Verificar se já foi adicionado
            if (extrasList.some(e => e.servico_id === servicoId)) {
                showToast('Este serviço já foi adicionado como extra', 'warning');
                return;
            }

            // Adicionar
            extrasList.push({
                servico_id: servicoId,
                nome: nome,
                valor: valor,
                duracao: duracao,
                adicionado_em: new Date().toISOString()
            });

            // Salvar no servidor
            fetch(`/api/agendamentos/${agendamentoId}/extras`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ servicos_extras: extrasList })
            })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        showToast('Serviço extra adicionado!', 'success');
                        // Recarregar o modal
                        fecharModalExtras();
                        abrirModalExtra(agendamentoId);
                        // Recarregar lista
                        carregarAgendamentos();
                    } else {
                        showToast('Erro ao adicionar extra: ' + (result.message || ''), 'error');
                    }
                })
                .catch(err => {
                    console.error('Erro:', err);
                    showToast('Erro ao salvar extra', 'error');
                });
        })
        .catch(err => {
            console.error('Erro:', err);
            showToast('Erro ao carregar agendamento', 'error');
        });
}

function removerExtraDoModal(agendamentoId, servicoId) {
    if (!confirm('Remover este serviço extra?')) return;

    const token = localStorage.getItem('token');

    fetch('/api/agendamentos', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(res => res.json())
        .then(data => {
            const agendamento = data.data.find(a => a.id === agendamentoId);
            if (!agendamento) {
                showToast('Agendamento não encontrado', 'error');
                return;
            }

            let extrasList = [];
            if (agendamento.servicos_extras) {
                try {
                    extrasList = typeof agendamento.servicos_extras === 'string' ?
                        JSON.parse(agendamento.servicos_extras) : agendamento.servicos_extras;
                } catch (e) {
                    extrasList = [];
                }
            }

            const novosExtras = extrasList.filter(e => e.servico_id !== servicoId);

            fetch(`/api/agendamentos/${agendamentoId}/extras`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ servicos_extras: novosExtras })
            })
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        showToast('Serviço extra removido!', 'success');
                        fecharModalExtras();
                        abrirModalExtra(agendamentoId);
                        carregarAgendamentos();
                    } else {
                        showToast('Erro ao remover extra', 'error');
                    }
                })
                .catch(err => {
                    console.error('Erro:', err);
                    showToast('Erro ao remover extra', 'error');
                });
        })
        .catch(err => {
            console.error('Erro:', err);
            showToast('Erro ao carregar agendamento', 'error');
        });
}

function salvarExtrasModal(agendamentoId) {
    fecharModalExtras();
    showToast('✅ Extras salvos com sucesso!', 'success');
    carregarAgendamentos();

    if (typeof carregarFinanceiro === 'function') {
        const btnFinanceiro = document.getElementById('btnFinanceiro');
        if (btnFinanceiro && btnFinanceiro.classList.contains('active')) {
            carregarFinanceiro();
        }
    }
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.abrirModalExtra = abrirModalExtra;
window.fecharModalExtras = fecharModalExtras;
window.adicionarExtraNoModal = adicionarExtraNoModal;
window.removerExtraDoModal = removerExtraDoModal;
window.salvarExtrasModal = salvarExtrasModal;

console.log('✅ Serviços Extras carregados!');