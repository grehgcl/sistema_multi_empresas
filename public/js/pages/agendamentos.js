// ============================================
// PÁGINA AGENDAMENTOS - VERSÃO CORRIGIDA
// ============================================

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

            <!-- Filtros -->
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

            <!-- Estatísticas -->
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
// FUNÇÃO PARA RENDERIZAR LINHA DA TABELA
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
                            <i class="fas fa-plus-circle"></i> ${extrasCount} extra(s)
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
// ATUALIZAR ESTATÍSTICAS
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
                            <h4>${agendamentos.length === 0 ? 'Nenhum agendamento' : 'Nenhum resultado'}</h4>
                            <p>${agendamentos.length === 0 ? 'Crie seu primeiro agendamento!' : 'Ajuste os filtros'}</p>
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
            // Versão Mobile - Cards
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
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:8px;">
                        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
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
                    
                    <div style="display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--border-color);padding-top:10px;">
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
// NOVO CLIENTE VIA MODAL - CORRIGIDO (z-index)
// ============================================

function abrirModalNovoCliente() {
    // Fecha o modal de agendamento temporariamente para não atrapalhar
    // Mas mantém ele aberto por baixo

    const modalHtml = `
        <div id="modalNovoCliente" class="modal" style="
            display: flex; 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background: rgba(0,0,0,0.7); 
            z-index: 99999; 
            align-items: center; 
            justify-content: center; 
            padding: 16px;
        ">
            <div class="modal-content" style="
                max-width: 420px; 
                width: 100%; 
                margin: auto; 
                padding: 24px; 
                background: var(--bg-card); 
                border-radius: 16px; 
                box-shadow: 0 20px 60px rgba(0,0,0,0.5); 
                max-height: 90vh; 
                overflow-y: auto;
                position: relative;
                z-index: 99999;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                        <i class="fas fa-user-plus" style="color: #22c55e;"></i>
                        ➕ Novo Cliente
                    </h3>
                    <button onclick="fecharModalNovoCliente()" style="
                        background: none; 
                        border: none; 
                        font-size: 28px; 
                        cursor: pointer; 
                        color: var(--text-muted);
                        line-height: 1;
                        padding: 0 8px;
                    ">&times;</button>
                </div>
                
                <form id="formNovoCliente" onsubmit="salvarNovoCliente(event)" style="display:flex;flex-direction:column;gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                            Nome <span style="color:#ef4444;">*</span>
                        </label>
                        <input type="text" id="novoClienteNome" class="form-control" required style="
                            width:100%; 
                            padding:10px 12px; 
                            border-radius:8px; 
                            border:1px solid var(--border-color); 
                            background:var(--bg-input); 
                            color:var(--text-primary); 
                            font-size:14px;
                        ">
                    </div>
                    
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                            📱 Telefone
                        </label>
                        <input type="text" id="novoClienteTelefone" class="form-control" placeholder="(00) 00000-0000" style="
                            width:100%; 
                            padding:10px 12px; 
                            border-radius:8px; 
                            border:1px solid var(--border-color); 
                            background:var(--bg-input); 
                            color:var(--text-primary); 
                            font-size:14px;
                        ">
                    </div>
                    
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                            📧 Email
                        </label>
                        <input type="email" id="novoClienteEmail" class="form-control" placeholder="cliente@email.com" style="
                            width:100%; 
                            padding:10px 12px; 
                            border-radius:8px; 
                            border:1px solid var(--border-color); 
                            background:var(--bg-input); 
                            color:var(--text-primary); 
                            font-size:14px;
                        ">
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <button type="button" onclick="fecharModalNovoCliente()" style="
                            padding: 8px 20px; 
                            border-radius: 8px; 
                            border: 1px solid var(--border-color); 
                            background: transparent; 
                            color: var(--text-secondary); 
                            font-size: 13px; 
                            cursor: pointer;
                            font-weight: 500;
                        ">
                            Cancelar
                        </button>
                        <button type="submit" style="
                            padding: 8px 24px; 
                            border-radius: 8px; 
                            border: none; 
                            background: linear-gradient(135deg, #22c55e, #16a34a); 
                            color: white; 
                            font-size: 13px; 
                            font-weight: 600; 
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <i class="fas fa-save"></i> Salvar Cliente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Remove modal antigo se existir
    const existingModal = document.getElementById("modalNovoCliente");
    if (existingModal) existingModal.remove();

    // Adiciona o novo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Foca no campo nome
    setTimeout(() => {
        const nomeInput = document.getElementById('novoClienteNome');
        if (nomeInput) nomeInput.focus();
    }, 100);
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
// CARREGAR HORÁRIOS DISPONÍVEIS
// ============================================

async function carregarHorariosDisponiveisDono(manterHorario = false, horarioParaRestaurar = null) {
    try {
        const data = document.getElementById("dataAgendamentoDono")?.value;
        const profissional_id = document.getElementById("profissionalIdDono")?.value;
        const servicoSelect = document.getElementById("servicoIdDono");
        const servicoId = servicoSelect ? servicoSelect.value : null;
        const horaSelect = document.getElementById("horaAgendamentoDono");

        const horarioAtual = horaSelect ? horaSelect.value : null;
        const horarioFinal = horarioParaRestaurar || (manterHorario ? horarioAtual : null);

        if (!data || !horaSelect) return;

        let duracao = 30;
        if (servicoId && servicoId !== '') {
            const servico = servicosList.find(s => s.id == servicoId);
            if (servico) {
                duracao = servico.duracao || 30;
            }
        }

        const infoDuracao = document.getElementById('infoDuracaoHorario');
        if (infoDuracao) {
            infoDuracao.textContent = `⏱️ ${duracao}min`;
        }

        const hoje = new Date();
        const hojeStr = hoje.toISOString().split('T')[0];

        if (data < hojeStr) {
            horaSelect.innerHTML = '<option value="">⚠️ Data passou</option>';
            return;
        }

        horaSelect.innerHTML = '<option value="">⏳</option>';

        const token = localStorage.getItem("token");
        if (!token) {
            horaSelect.innerHTML = '<option value="">❌</option>';
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
                horaSelect.innerHTML = `<option value="">⚠️ ${response.status}</option>`;
                return;
            }

            const result = await response.json();

            if (result.success) {
                let horarios = [];
                if (Array.isArray(result.horarios)) horarios = result.horarios;
                else if (Array.isArray(result.data)) horarios = result.data;

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
                    let options = '<option value="">Selecione</option>';
                    for (let horaItem of horariosFiltrados) {
                        const horaNum = parseInt(horaItem.split(':')[0]);
                        const isAlmoco = horaNum >= 12 && horaNum < 13;
                        const emoji = isAlmoco ? ' 🍽️' : '';
                        options += `<option value="${horaItem}">${horaItem}${emoji}</option>`;
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
                        if (!encontrado && horaSelect.options.length > 1) {
                            const proximo = Array.from(horaSelect.options)
                                .map(o => o.value)
                                .filter(v => v !== '')
                                .find(h => h >= horarioFinal) || horaSelect.options[1]?.value;
                            if (proximo) horaSelect.value = proximo;
                        }
                    } else if (horaSelect.options.length > 1 && !horaSelect.value) {
                        horaSelect.value = horaSelect.options[1].value;
                    }
                } else {
                    horaSelect.innerHTML = `<option value="">${data === hojeStr ? '⏰ Passou' : '📭 Indisponível'}</option>`;
                }
            } else {
                horaSelect.innerHTML = `<option value="">⚠️ ${result.message || 'Erro'}</option>`;
            }
        } catch (tokenError) {
            console.error('❌ Erro:', tokenError);
            horaSelect.innerHTML = '<option value="">❌ Token</option>';
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        const horaSelect = document.getElementById("horaAgendamentoDono");
        if (horaSelect) {
            horaSelect.innerHTML = `<option value="">⚠️</option>`;
        }
    }
}

// ============================================
// ABRIR MODAL NOVO AGENDAMENTO - COM BUSCA DE CLIENTES
// ============================================

async function abrirModalAgendamentoDono(horarioPreDefinido = null) {
    const token = localStorage.getItem('token');

    // 🔥 CARREGA CLIENTES, SERVIÇOS E PROFISSIONAIS SE NÃO TIVER
    if (!clientesList || clientesList.length === 0) {
        try {
            const res = await fetch('/api/clientes', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success) {
                clientesList = data.data || [];
                console.log(`✅ ${clientesList.length} clientes carregados`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
        }
    }

    if (!servicosList || servicosList.length === 0) {
        try {
            const res = await fetch('/api/servicos', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success) {
                servicosList = data.data || [];
                console.log(`✅ ${servicosList.length} serviços carregados`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar serviços:', error);
        }
    }

    if (!profissionaisList || profissionaisList.length === 0) {
        try {
            const res = await fetch('/api/profissionais', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success) {
                profissionaisList = data.data || [];
                console.log(`✅ ${profissionaisList.length} profissionais carregados`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar profissionais:', error);
        }
    }

    const clientes = Array.isArray(clientesList) ? clientesList : [];
    const servicos = Array.isArray(servicosList) ? servicosList : [];
    const profissionais = Array.isArray(profissionaisList) ? profissionaisList : [];
    const isMobile = window.innerWidth < 768;

    // Ordenar clientes por nome
    const clientesOrdenados = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome));

    let servicosOptions = '<option value="">Selecione</option>';
    if (servicos.length > 0) {
        for (let s of servicos) {
            if ((s.ativo == 1 || s.ativo == true)) {
                servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" data-duracao="${s.duracao || 30}">${escapeHtml(s.nome)} - R$ ${(parseFloat(s.valor) || 0).toFixed(2)}</option>`;
            }
        }
    } else {
        servicosOptions += `<option value="" disabled>⚠️ Nenhum serviço cadastrado</option>`;
    }

    let profissionaisOptions = '<option value="">Não atribuir</option>';
    if (profissionais.length > 0) {
        for (let p of profissionais) {
            if ((p.ativo == 1 || p.ativo == true)) {
                profissionaisOptions += `<option value="${p.id}">${escapeHtml(p.nome)}</option>`;
            }
        }
    } else {
        profissionaisOptions += `<option value="" disabled>⚠️ Nenhum profissional cadastrado</option>`;
    }

    // Gerar lista de clientes para o datalist
    let clientesDatalist = '';
    for (let c of clientesOrdenados) {
        clientesDatalist += `<option value="${escapeHtml(c.nome)}" data-id="${c.id}" data-telefone="${escapeHtml(c.telefone || '')}"></option>`;
    }

    const modalHtml = `
        <div id="modalAgendamentoDono" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; align-items: center; justify-content: center; padding: ${isMobile ? '8px' : '20px'};">
            <div class="modal-content" style="
                max-width: ${isMobile ? '100%' : '500px'}; 
                width: ${isMobile ? '100%' : '90%'}; 
                max-height: ${isMobile ? '98vh' : '90vh'}; 
                overflow-y: auto; 
                background: var(--bg-card); 
                border-radius: ${isMobile ? '12px' : '16px'}; 
                padding: ${isMobile ? '16px' : '24px'}; 
                box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                margin: ${isMobile ? '0' : 'auto'};
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isMobile ? '12px' : '16px'};">
                    <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-calendar-plus" style="font-size: ${isMobile ? '14px' : '18px'};"></i> 
                        ${isMobile ? 'Novo' : 'Novo Agendamento'}
                    </h3>
                    <button onclick="fecharModalAgendamentoDono()" style="
                        background: transparent; 
                        border: none; 
                        font-size: ${isMobile ? '20px' : '24px'}; 
                        cursor: pointer; 
                        color: var(--text-muted);
                        padding: ${isMobile ? '4px' : '8px'};
                        line-height: 1;
                    ">✕</button>
                </div>

                <!-- 🔍 CLIENTE COM BUSCA -->
                <div style="margin-bottom: ${isMobile ? '10px' : '14px'};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <label style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 600; color: var(--text-secondary);">
                            👤 Cliente <span style="color: #ef4444;">*</span>
                        </label>
                        <button type="button" onclick="abrirModalNovoCliente()" style="
                            padding: ${isMobile ? '3px 10px' : '4px 14px'}; 
                            font-size: ${isMobile ? '10px' : '11px'}; 
                            border-radius: ${isMobile ? '6px' : '8px'}; 
                            border: none; 
                            background: linear-gradient(135deg, #22c55e, #16a34a); 
                            color: white; 
                            font-weight: 600; 
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: ${isMobile ? '3px' : '4px'};
                        ">
                            <i class="fas fa-plus" style="font-size: ${isMobile ? '8px' : '10px'};"></i> ${isMobile ? 'Novo' : 'Novo Cliente'}
                        </button>
                    </div>
                    
                    <!-- 🔍 CAMPO DE BUSCA COM AUTOCOMPLETE -->
                    <div style="position: relative;">
                        <div style="display: flex; align-items: center; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: ${isMobile ? '6px' : '8px'}; padding: 0 10px;">
                            <i class="fas fa-search" style="color: var(--text-muted); font-size: ${isMobile ? '12px' : '14px'};"></i>
                            <input type="text" 
                                   id="buscaClienteDono" 
                                   class="form-control" 
                                   placeholder="${isMobile ? 'Digite o nome...' : 'Digite o nome do cliente...'}" 
                                   style="
                                       border: none; 
                                       background: transparent; 
                                       padding: ${isMobile ? '8px 8px' : '10px 8px'}; 
                                       font-size: ${isMobile ? '13px' : '14px'}; 
                                       width: 100%;
                                       outline: none;
                                       color: var(--text-primary);
                                   "
                                   autocomplete="off"
                                   oninput="filtrarClientesDono(this.value)"
                                   onfocus="this.select()"
                            >
                        </div>
                        
                        <!-- LISTA DE SUGESTÕES -->
                        <div id="listaSugestoesClientes" style="
                            position: absolute;
                            top: 100%;
                            left: 0;
                            right: 0;
                            background: var(--bg-card);
                            border: 1px solid var(--border-color);
                            border-radius: ${isMobile ? '6px' : '8px'};
                            max-height: 200px;
                            overflow-y: auto;
                            z-index: 9999;
                            display: none;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                            margin-top: 2px;
                        ">
                            <!-- Preenchido via JavaScript -->
                        </div>
                    </div>
                    
                    <!-- CLIENTE SELECIONADO (HIDDEN) -->
                    <input type="hidden" id="clienteIdDono" value="">
                    <input type="hidden" id="clienteTelefoneDono" value="">
                    
                    <!-- NOME DO CLIENTE SELECIONADO -->
                    <div id="clienteSelecionadoInfo" style="
                        display: none;
                        margin-top: 6px;
                        padding: ${isMobile ? '6px 10px' : '8px 12px'};
                        background: rgba(34,197,94,0.08);
                        border: 1px solid rgba(34,197,94,0.2);
                        border-radius: ${isMobile ? '6px' : '8px'};
                        font-size: ${isMobile ? '12px' : '13px'};
                        color: var(--text-secondary);
                    ">
                        <i class="fas fa-check-circle" style="color: #22c55e;"></i>
                        Cliente selecionado: <strong id="clienteSelecionadoNome">-</strong>
                        <span id="clienteSelecionadoTelefone" style="color: var(--text-muted); font-size: 11px;"></span>
                        <button onclick="limparClienteSelecionado()" style="
                            background: none;
                            border: none;
                            color: #ef4444;
                            cursor: pointer;
                            font-size: 12px;
                            margin-left: 8px;
                        ">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <!-- Data + Horário -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${isMobile ? '8px' : '12px'}; margin-bottom: ${isMobile ? '10px' : '14px'};">
                    <div>
                        <label style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 3px;">
                            📅 Data <span style="color: #ef4444;">*</span>
                        </label>
                        <input type="date" id="dataAgendamentoDono" class="form-control" onchange="carregarHorariosDisponiveisDono()" style="
                            width: 100%; 
                            padding: ${isMobile ? '8px 10px' : '10px 12px'}; 
                            border-radius: ${isMobile ? '6px' : '8px'}; 
                            border: 1px solid var(--border-color); 
                            background: var(--bg-input); 
                            color: var(--text-primary); 
                            font-size: ${isMobile ? '13px' : '14px'};
                        ">
                    </div>
                    <div>
                        <label style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 3px;">
                            ⏰ Horário <span style="color: #ef4444;">*</span>
                        </label>
                        <select id="horaAgendamentoDono" class="form-control" style="
                            width: 100%; 
                            padding: ${isMobile ? '8px 10px' : '10px 12px'}; 
                            border-radius: ${isMobile ? '6px' : '8px'}; 
                            border: 1px solid var(--border-color); 
                            background: var(--bg-input); 
                            color: var(--text-primary); 
                            font-size: ${isMobile ? '13px' : '14px'};
                            -webkit-appearance: none;
                            appearance: none;
                        ">
                            <option value="">Selecione</option>
                        </select>
                    </div>
                </div>

                <!-- Serviço + Valor -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: ${isMobile ? '8px' : '12px'}; margin-bottom: ${isMobile ? '10px' : '14px'};">
                    <div>
                        <label style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 3px;">
                            ✂️ Serviço
                        </label>
                        <select id="servicoIdDono" class="form-control" onchange="atualizarValorPorServicoDono()" style="
                            width: 100%; 
                            padding: ${isMobile ? '8px 10px' : '10px 12px'}; 
                            border-radius: ${isMobile ? '6px' : '8px'}; 
                            border: 1px solid var(--border-color); 
                            background: var(--bg-input); 
                            color: var(--text-primary); 
                            font-size: ${isMobile ? '13px' : '14px'};
                            -webkit-appearance: none;
                            appearance: none;
                        ">
                            ${servicosOptions}
                        </select>
                        <input type="text" id="servicoDescricaoDono" class="form-control" style="
                            width: 100%; 
                            margin-top: 4px; 
                            padding: ${isMobile ? '6px 8px' : '8px 10px'}; 
                            border-radius: ${isMobile ? '4px' : '6px'}; 
                            border: 1px solid var(--border-color); 
                            background: var(--bg-input); 
                            color: var(--text-primary); 
                            font-size: ${isMobile ? '11px' : '12px'};
                        " placeholder="${isMobile ? 'Manual...' : 'Ou digite manualmente'}">
                    </div>
                    <div>
                        <label style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 3px;">
                            💰 Valor
                        </label>
                        <input type="number" id="valorAgendamentoDono" class="form-control" step="0.01" placeholder="0,00" style="
                            width: 100%; 
                            padding: ${isMobile ? '8px 10px' : '10px 12px'}; 
                            border-radius: ${isMobile ? '6px' : '8px'}; 
                            border: 1px solid var(--border-color); 
                            background: var(--bg-input); 
                            color: var(--text-primary); 
                            font-size: ${isMobile ? '14px' : '14px'};
                            font-weight: 600;
                        ">
                    </div>
                </div>

                <!-- Profissional -->
                <div style="margin-bottom: ${isMobile ? '12px' : '16px'};">
                    <label style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 3px;">
                        👨‍💼 Profissional
                    </label>
                    <select id="profissionalIdDono" class="form-control" onchange="carregarHorariosDisponiveisDono()" style="
                        width: 100%; 
                        padding: ${isMobile ? '8px 10px' : '10px 12px'}; 
                        border-radius: ${isMobile ? '6px' : '8px'}; 
                        border: 1px solid var(--border-color); 
                        background: var(--bg-input); 
                        color: var(--text-primary); 
                        font-size: ${isMobile ? '13px' : '14px'};
                        -webkit-appearance: none;
                        appearance: none;
                    ">
                        ${profissionaisOptions}
                    </select>
                </div>

                <!-- Duração -->
                <div style="
                    background: rgba(102,126,234,0.06); 
                    border-radius: ${isMobile ? '4px' : '8px'}; 
                    padding: ${isMobile ? '4px 8px' : '8px 12px'}; 
                    margin-bottom: ${isMobile ? '10px' : '14px'}; 
                    border: 1px solid rgba(102,126,234,0.1);
                    display: flex;
                    align-items: center;
                    gap: ${isMobile ? '4px' : '8px'};
                    font-size: ${isMobile ? '9px' : '12px'};
                    color: var(--text-muted);
                ">
                    <i class="fas fa-clock" style="font-size: ${isMobile ? '10px' : '14px'};"></i>
                    <span id="infoDuracaoHorario">⏱️ 30min</span>
                </div>

                <!-- Botões -->
                <div style="display: flex; gap: ${isMobile ? '6px' : '10px'}; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: ${isMobile ? '12px' : '16px'};">
                    <button type="button" onclick="fecharModalAgendamentoDono()" style="
                        padding: ${isMobile ? '6px 14px' : '10px 24px'}; 
                        border-radius: ${isMobile ? '6px' : '8px'}; 
                        border: 1px solid var(--border-color); 
                        background: transparent; 
                        color: var(--text-secondary); 
                        font-size: ${isMobile ? '12px' : '14px'}; 
                        cursor: pointer;
                        font-weight: 500;
                    ">
                        ${isMobile ? '✕' : 'Cancelar'}
                    </button>
                    <button type="button" onclick="salvarAgendamentoDono()" style="
                        padding: ${isMobile ? '6px 16px' : '10px 28px'}; 
                        border-radius: ${isMobile ? '6px' : '8px'}; 
                        border: none; 
                        background: linear-gradient(135deg, #667eea, #764ba2); 
                        color: white; 
                        font-size: ${isMobile ? '12px' : '14px'}; 
                        font-weight: 600; 
                        cursor: pointer;
                        box-shadow: 0 2px 12px rgba(102,126,234,0.3);
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    ">
                        <i class="fas fa-save" style="font-size: ${isMobile ? '10px' : '12px'};"></i> 
                        ${isMobile ? 'Salvar' : 'Salvar Agendamento'}
                    </button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("modalAgendamentoDono");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Configurar data padrão
    const dataInput = document.getElementById('dataAgendamentoDono');
    if (dataInput) {
        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        dataInput.value = amanha.toISOString().split('T')[0];
        setTimeout(() => carregarHorariosDisponiveisDono(), 100);
    }

    // Adicionar event listener para Enter na busca
    const buscaInput = document.getElementById('buscaClienteDono');
    if (buscaInput) {
        buscaInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const sugestoes = document.getElementById('listaSugestoesClientes');
                const primeiroItem = sugestoes?.querySelector('.sugestao-item');
                if (primeiroItem) {
                    primeiroItem.click();
                }
            }
        });
    }
}

// ============================================
// FUNÇÕES DE BUSCA DE CLIENTES
// ============================================

function filtrarClientesDono(texto) {
    const lista = document.getElementById('listaSugestoesClientes');
    const clientes = Array.isArray(clientesList) ? clientesList : [];
    const busca = texto.toLowerCase().trim();

    if (!busca || busca.length < 1) {
        lista.style.display = 'none';
        return;
    }

    // Filtrar clientes que correspondem à busca
    const resultados = clientes.filter(c => {
        const nomeMatch = c.nome.toLowerCase().includes(busca);
        const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(busca);
        const emailMatch = c.email && c.email.toLowerCase().includes(busca);
        return nomeMatch || telefoneMatch || emailMatch;
    });

    if (resultados.length === 0) {
        lista.innerHTML = `
            <div style="padding: 10px; color: var(--text-muted); text-align: center; font-size: 13px;">
                <i class="fas fa-search"></i> Nenhum cliente encontrado<br>
                <button onclick="abrirModalNovoCliente()" style="
                    margin-top: 6px;
                    padding: 4px 14px;
                    border: none;
                    border-radius: 6px;
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                    font-size: 12px;
                    cursor: pointer;
                ">
                    <i class="fas fa-plus"></i> Criar novo cliente
                </button>
            </div>
        `;
        lista.style.display = 'block';
        return;
    }

    // Limitar a 10 resultados para não sobrecarregar
    const exibir = resultados.slice(0, 10);

    let html = '';
    for (let c of exibir) {
        const telefone = c.telefone || '';
        const telefoneFormatado = telefone ? `📱 ${telefone}` : '';
        html += `
            <div class="sugestao-item" style="
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: background 0.15s;
            "
            onmouseover="this.style.background='var(--bg-hover)'"
            onmouseout="this.style.background='transparent'"
            onclick="selecionarClienteDono(${c.id}, '${escapeHtml(c.nome)}', '${escapeHtml(telefone)}')">
                <div>
                    <span style="font-weight: 500; color: var(--text-primary);">${escapeHtml(c.nome)}</span>
                    ${telefone ? `<span style="font-size: 11px; color: var(--text-muted); margin-left: 8px;">${escapeHtml(telefone)}</span>` : ''}
                </div>
                <span style="font-size: 11px; color: var(--text-muted);">
                    <i class="fas fa-chevron-right"></i>
                </span>
            </div>
        `;
    }

    if (resultados.length > 10) {
        html += `
            <div style="padding: 6px 12px; color: var(--text-muted); font-size: 11px; text-align: center; border-top: 1px solid var(--border-color);">
                + ${resultados.length - 10} outros resultados
            </div>
        `;
    }

    lista.innerHTML = html;
    lista.style.display = 'block';
}

function selecionarClienteDono(id, nome, telefone) {
    // Ocultar lista de sugestões
    document.getElementById('listaSugestoesClientes').style.display = 'none';

    // Preencher hidden fields
    document.getElementById('clienteIdDono').value = id;
    document.getElementById('clienteTelefoneDono').value = telefone || '';

    // Preencher campo de busca com o nome selecionado
    document.getElementById('buscaClienteDono').value = nome;

    // Mostrar informação do cliente selecionado
    const infoDiv = document.getElementById('clienteSelecionadoInfo');
    document.getElementById('clienteSelecionadoNome').textContent = nome;
    document.getElementById('clienteSelecionadoTelefone').textContent = telefone ? ` (${telefone})` : '';
    infoDiv.style.display = 'block';

    // Atualizar horários (se data já estiver selecionada)
    const dataInput = document.getElementById('dataAgendamentoDono');
    if (dataInput && dataInput.value) {
        carregarHorariosDisponiveisDono();
    }
}

function limparClienteSelecionado() {
    document.getElementById('clienteIdDono').value = '';
    document.getElementById('clienteTelefoneDono').value = '';
    document.getElementById('buscaClienteDono').value = '';
    document.getElementById('clienteSelecionadoInfo').style.display = 'none';
    document.getElementById('listaSugestoesClientes').style.display = 'none';
}

// ============================================
// SALVAR AGENDAMENTO (ATUALIZADO)
// ============================================

async function salvarAgendamentoDono() {
    // 🔥 USAR O ID DO CLIENTE DO HIDDEN FIELD
    const cliente_id = document.getElementById("clienteIdDono").value;
    const data = document.getElementById("dataAgendamentoDono").value;
    const hora = document.getElementById("horaAgendamentoDono").value;
    const servico_id = document.getElementById("servicoIdDono").value;
    const servico_descricao = document.getElementById("servicoDescricaoDono").value;
    const valor = document.getElementById("valorAgendamentoDono").value;
    const profissional_id = document.getElementById("profissionalIdDono").value;

    if (!cliente_id || !data) {
        showToast("Selecione um cliente e uma data", "warning");
        // Se não tiver cliente, focar na busca
        if (!cliente_id) {
            document.getElementById('buscaClienteDono').focus();
        }
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
            showToast("✅ Agendamento criado!", "success");
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
        console.error("❌ Erro:", error);
        showToast("❌ Erro ao criar agendamento", "error");
    }

    hideLoading();
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
            showToast("✅ Agendamento criado!", "success");
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
        console.error("❌ Erro:", error);
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
        console.error("Erro:", error);
        showToast("Erro ao concluir", "error");
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
        console.error("Erro:", error);
        showToast("Erro ao excluir", "error");
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
            showToast("Concluídos não podem ser editados", "warning");
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

        let servicosOptions = '<option value="">Selecione</option>';
        for (let s of servicos) {
            const selected = s.id === agendamento.servico_id ? "selected" : "";
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" ${selected}>${s.nome} - R$ ${(parseFloat(s.valor) || 0).toFixed(2)}</option>`;
        }

        let profissionaisOptions = '<option value="">Não atribuir</option>';
        for (let p of profissionais) {
            if ((p.ativo == 1 || p.ativo == true)) {
                const selected = p.id === agendamento.profissional_id ? "selected" : "";
                profissionaisOptions += `<option value="${p.id}" ${selected}>${p.nome}</option>`;
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
                        <input type="text" id="editServicoDescricaoDono" class="form-control" style="margin-top: 10px;" value="${agendamento.servico || ''}" placeholder="Ou digite manualmente">
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
            showToast("Agendamento atualizado!", "success");
            fecharModalEditarAgendamentoDono();
            carregarAgendamentos();

            if (typeof window.atualizarAgendaAposAgendamento === 'function') {
                window.atualizarAgendaAposAgendamento();
            }
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        console.error("Erro:", error);
        showToast("Erro ao atualizar", "error");
    }

    hideLoading();
}
// ============================================
// 🔥 SERVIÇOS EXTRAS - FUNÇÕES
// ============================================

// Abrir modal para adicionar serviço extra
function abrirModalExtra(agendamentoId) {
    console.log('📝 Abrindo modal de extras para agendamento:', agendamentoId);

    if (!agendamentoId) {
        showToast('Agendamento não encontrado', 'error');
        return;
    }

    const token = localStorage.getItem('token');

    // Buscar o agendamento atual
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

                    const valorPrincipal = parseFloat(agendamento.valor) || 0;
                    const valorTotal = valorPrincipal + valorExtras;

                    // Montar opções de serviços
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

                    const isMobile = window.innerWidth < 768;

                    const modalHtml = `
                <div id="modalExtras" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
                    <div class="modal-content" style="
                        max-width: 500px; 
                        width: 100%; 
                        max-height: 90vh; 
                        overflow-y: auto; 
                        background: var(--bg-card); 
                        border-radius: 16px; 
                        padding: ${isMobile ? '16px' : '24px'}; 
                        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-plus-circle" style="color: #f59e0b;"></i>
                                Serviços Extras
                            </h3>
                            <button onclick="fecharModalExtras()" style="
                                background: none; 
                                border: none; 
                                font-size: 28px; 
                                cursor: pointer; 
                                color: var(--text-muted);
                                line-height: 1;
                            ">&times;</button>
                        </div>

                        <p style="color: var(--text-muted); font-size: ${isMobile ? '13px' : '14px'}; margin-bottom: 16px;">
                            Adicione serviços realizados durante este atendimento.
                        </p>

                        <!-- Resumo -->
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

                        <!-- Adicionar Extra -->
                        <div style="margin-bottom:16px;">
                            <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                                Adicionar serviço extra:
                            </label>
                            <div style="display:flex;gap:8px;">
                                <select id="extraServicoSelect" class="form-control" style="
                                    flex:1; 
                                    padding: ${isMobile ? '8px 10px' : '10px 12px'}; 
                                    border-radius: 8px; 
                                    border: 1px solid var(--border-color); 
                                    background: var(--bg-input); 
                                    color: var(--text-primary); 
                                    font-size: ${isMobile ? '13px' : '14px'};
                                ">
                                    ${servicosOptions}
                                </select>
                                <button onclick="adicionarExtraNoModal(${agendamentoId})" style="
                                    padding: ${isMobile ? '8px 14px' : '10px 20px'}; 
                                    border-radius: 8px; 
                                    border: none; 
                                    background: linear-gradient(135deg, #667eea, #764ba2); 
                                    color: white; 
                                    font-size: ${isMobile ? '12px' : '14px'}; 
                                    font-weight: 600; 
                                    cursor: pointer;
                                    white-space: nowrap;
                                ">
                                    <i class="fas fa-plus"></i> Adicionar
                                </button>
                            </div>
                        </div>

                        <!-- Lista de Extras -->
                        <div style="margin-bottom:16px;">
                            <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                                Serviços adicionados:
                            </label>
                            <div style="
                                background: var(--bg-hover); 
                                border-radius: 8px; 
                                padding: 8px; 
                                min-height: 40px;
                                border: 1px solid var(--border-color);
                            ">
                                ${extrasHtml || '<p style="color:var(--text-muted);font-size:13px;text-align:center;margin:8px 0;">Nenhum serviço extra adicionado.</p>'}
                            </div>
                        </div>

                        <!-- Botões -->
                        <div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--border-color);padding-top:16px;">
                            <button onclick="fecharModalExtras()" style="
                                padding: ${isMobile ? '6px 16px' : '10px 24px'}; 
                                border-radius: 8px; 
                                border: 1px solid var(--border-color); 
                                background: transparent; 
                                color: var(--text-secondary); 
                                font-size: ${isMobile ? '12px' : '14px'}; 
                                cursor: pointer;
                            ">
                                Fechar
                            </button>
                            <button onclick="salvarExtrasModal(${agendamentoId})" style="
                                padding: ${isMobile ? '6px 16px' : '10px 24px'}; 
                                border-radius: 8px; 
                                border: none; 
                                background: linear-gradient(135deg, #22c55e, #16a34a); 
                                color: white; 
                                font-size: ${isMobile ? '12px' : '14px'}; 
                                font-weight: 600; 
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                gap: 6px;
                            ">
                                <i class="fas fa-save"></i> Salvar Extras
                            </button>
                        </div>
                    </div>
                </div>
            `;

                    const existingModal = document.getElementById('modalExtras');
                    if (existingModal) existingModal.remove();

                    document.body.insertAdjacentHTML('beforeend', modalHtml);

                })
                .catch(err => {
                    console.error('❌ Erro:', err);
                    showToast('Erro ao carregar serviços', 'error');
                });

        })
        .catch(err => {
            console.error('❌ Erro:', err);
            showToast('Erro ao carregar agendamento', 'error');
        });
}

// ============================================
// FUNÇÕES AUXILIARES DOS EXTRAS
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

            if (extrasList.some(e => e.servico_id === servicoId)) {
                showToast('Este serviço já foi adicionado como extra', 'warning');
                return;
            }

            extrasList.push({
                servico_id: servicoId,
                nome: nome,
                valor: valor,
                duracao: duracao,
                adicionado_em: new Date().toISOString()
            });

            return fetch(`/api/agendamentos/${agendamentoId}/extras`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ servicos_extras: extrasList })
            });
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showToast('Serviço extra adicionado!', 'success');
                fecharModalExtras();
                abrirModalExtra(agendamentoId);
                carregarAgendamentos();
            } else {
                showToast('Erro ao adicionar extra: ' + (result.message || ''), 'error');
            }
        })
        .catch(err => {
            console.error('❌ Erro:', err);
            showToast('Erro ao adicionar extra', 'error');
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

            return fetch(`/api/agendamentos/${agendamentoId}/extras`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ servicos_extras: novosExtras })
            });
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
            console.error('❌ Erro:', err);
            showToast('Erro ao remover extra', 'error');
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
window.abrirModalExtra = abrirModalExtra;
window.fecharModalExtras = fecharModalExtras;
window.adicionarExtraNoModal = adicionarExtraNoModal;
window.removerExtraDoModal = removerExtraDoModal;
window.salvarExtrasModal = salvarExtrasModal;

console.log('✅ agendamentos.js carregado com sucesso!');