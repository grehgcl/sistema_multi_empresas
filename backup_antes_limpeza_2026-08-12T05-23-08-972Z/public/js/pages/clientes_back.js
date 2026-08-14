// ============================================
// CLIENTES.JS - VERSÃO CRM COMPLETA + MOBILE BLINDADO
// ULTIMA ATUALIZACAO: 24/07/2026
// ============================================

// ============================================
// FUNÇÕES DE COMPATIBILIDADE POSTGRESQL
// ============================================

function isAberto(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

function isAtivo(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

function toNumber(valor) {
    return parseFloat(valor) || 0;
}

function formatMoney(valor) {
    return toNumber(valor).toFixed(2).replace('.', ',');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatarDataBr(data) {
    if (!data) return '';
    const d = new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let clientesCompletos = [];
let filtroClientes = 'todos';
let termoBuscaClientes = '';

// ============================================
// CARREGAR CLIENTES (CORE BLINDADO)
// ============================================

async function carregarClientes() {
    console.log("🟢 carregarClientes chamada (CRM)");
    ativarBotao('clientes');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        const resClientes = await fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } });
        const dataClientes = await resClientes.json();

        const resAgendamentos = await fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } });
        const dataAgendamentos = await resAgendamentos.json();

        const clientes = dataClientes.data || [];
        const agendamentos = dataAgendamentos.data || [];

        // Processamento dos dados
        clientesCompletos = clientes.map(cliente => {
            const ags = agendamentos.filter(a => a.cliente_id === cliente.id);
            const agsConcluidos = ags.filter(a => a.status === 'concluido');
            const agsPendentes = ags.filter(a => a.status === 'pendente' || a.status === 'agendado');

            let valorTotal = 0;
            agsConcluidos.forEach(a => valorTotal += parseFloat(a.valor_total) || parseFloat(a.valor) || 0);

            const totalConcluidos = agsConcluidos.length;
            const ticketMedio = totalConcluidos > 0 ? valorTotal / totalConcluidos : 0;

            let ultimaVisita = null;
            if (agsConcluidos.length > 0) {
                const datas = agsConcluidos.map(a => new Date(a.data + 'T00:00:00'));
                ultimaVisita = new Date(Math.max(...datas));
            }

            let diasDesdeUltima = null;
            if (ultimaVisita) {
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
                diasDesdeUltima = Math.ceil((hoje - ultimaVisita) / (1000 * 60 * 60 * 24));
            }

            let classificacao = 'regular'; let icone = '👤';
            if (totalConcluidos >= 10 && valorTotal >= 500) { classificacao = 'vip'; icone = '⭐'; }
            else if (totalConcluidos >= 5) { classificacao = 'frequente'; icone = '🔥'; }
            else if (diasDesdeUltima !== null && diasDesdeUltima > 60) { classificacao = 'sumido'; icone = '😴'; }
            else if (totalConcluidos <= 1) { classificacao = 'novo'; icone = ''; }

            return { ...cliente, total_concluidos: totalConcluidos, pendentes: agsPendentes.length, valor_total: valorTotal, ticket_medio: ticketMedio, dias_sem_visita: diasDesdeUltima, classificacao, icone };
        });

        clientesCompletos.sort((a, b) => b.total_concluidos - a.total_concluidos);

        // Detecção de Mobile Robusta
        const isMobile = window.innerWidth < 768;

        // Filtros e Busca
        let clientesFiltrados = clientesCompletos;
        if (termoBuscaClientes) {
            clientesFiltrados = clientesFiltrados.filter(c =>
                c.nome.toLowerCase().includes(termoBuscaClientes) ||
                (c.telefone && c.telefone.replace(/\D/g, '').includes(termoBuscaClientes))
            );
        }
        if (filtroClientes !== 'todos') {
            clientesFiltrados = clientesFiltrados.filter(c => {
                if (filtroClientes === 'vip') return c.classificacao === 'vip';
                if (filtroClientes === 'sumidos') return c.classificacao === 'sumido';
                if (filtroClientes === 'frequentes') return ['frequente', 'vip'].includes(c.classificacao);
                if (filtroClientes === 'novos') return c.classificacao === 'novo';
                return true;
            });
        }

        // Métricas para Header
        const stats = {
            total: clientesFiltrados.length,
            vip: clientesFiltrados.filter(c => c.classificacao === 'vip').length,
            freq: clientesFiltrados.filter(c => c.classificacao === 'frequente').length,
            sum: clientesFiltrados.filter(c => c.classificacao === 'sumido').length,
            novos: clientesFiltrados.filter(c => c.classificacao === 'novo').length,
            whats: clientesFiltrados.filter(c => c.telefone).length,
            gasto: formatMoney(clientesFiltrados.reduce((acc, c) => acc + c.valor_total, 0))
        };

        // ==========================================
        // RENDERIZAÇÃO HTML BLINDADA
        // ==========================================
        let html = `<div class="fade-in" style="padding-bottom: 80px;">`; // Padding extra para scroll mobile

        // Header e Ações
        html += `
            <div class="dashboard-header">
                <h2 class="page-title">👥 Clientes</h2>
                <div class="dashboard-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px;">
                    <input type="text" id="buscaClientesInput" placeholder="🔍 Buscar..." 
                           style="flex: 1; min-width: 100px; padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);"
                           oninput="buscarClientes()" value="${termoBuscaClientes}">
                    <button onclick="abrirModalPromocao()" class="btn btn-success" style="font-size: 12px; padding: 8px 12px;">📢 Promoção</button>
                    <button onclick="abrirModalImportarCSV()" class="btn btn-primary" style="font-size: 12px; padding: 8px 12px;">📂 Importar</button>
                    <button onclick="abrirModalCliente()" class="btn btn-whatsapp" style="font-size: 12px; padding: 8px 12px;">➕ Novo</button>
                </div>
            </div>

            <!-- Filtros Rápidos + Botão Apagar Tudo -->
            <div style="display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; margin-bottom: 10px; -webkit-overflow-scrolling: touch; align-items: center;">
                <button onclick="setFiltroClientes('todos')" class="btn ${filtroClientes === 'todos' ? 'btn-primary' : 'btn-outline'}" style="white-space: nowrap; font-size: 11px; padding: 4px 10px;">Todos (${stats.total})</button>
                <button onclick="setFiltroClientes('vip')" class="btn ${filtroClientes === 'vip' ? 'btn-primary' : 'btn-outline'}" style="white-space: nowrap; font-size: 11px; padding: 4px 10px;">⭐ VIP (${stats.vip})</button>
                <button onclick="setFiltroClientes('frequentes')" class="btn ${filtroClientes === 'frequentes' ? 'btn-primary' : 'btn-outline'}" style="white-space: nowrap; font-size: 11px; padding: 4px 10px;"> Frequentes (${stats.freq})</button>
                <button onclick="setFiltroClientes('sumidos')" class="btn ${filtroClientes === 'sumidos' ? 'btn-primary' : 'btn-outline'}" style="white-space: nowrap; font-size: 11px; padding: 4px 10px;"> Sumidos (${stats.sum})</button>
                <button onclick="setFiltroClientes('novos')" class="btn ${filtroClientes === 'novos' ? 'btn-primary' : 'btn-outline'}" style="white-space: nowrap; font-size: 11px; padding: 4px 10px;"> Novos (${stats.novos})</button>
                
                <!-- BOTÃO APAGAR TODOS -->
                <button onclick="apagarTodosClientes()" class="btn btn-danger" style="margin-left: auto; white-space: nowrap; font-size: 11px; padding: 4px 10px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(239,68,68,0.2);">
                    <i class="fas fa-trash-alt"></i> Apagar Todos
                </button>
            </div>

            <!-- Stats Mini -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; margin-bottom: 16px;">
                <div class="stat-mini"><span class="stat-mini-value">${stats.total}</span><span class="stat-mini-label">Total</span></div>
                <div class="stat-mini"><span class="stat-mini-value">${stats.whats}</span><span class="stat-mini-label">WhatsApp</span></div>
                <div class="stat-mini"><span class="stat-mini-value">R$ ${stats.gasto}</span><span class="stat-mini-label">Gasto</span></div>
            </div>
        `;

        // Lista de Clientes
        if (clientesFiltrados.length === 0) {
            html += `<div class="empty-state"><p>Nenhum cliente encontrado.</p></div>`;
        } else if (isMobile) {
            // RENDERIZAÇÃO MOBILE (CARDS)
            html += `<div style="display: flex; flex-direction: column; gap: 12px;">`;
            for (let c of clientesFiltrados) {
                const cores = {
                    vip: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', text: '#f59e0b' },
                    frequente: { bg: 'rgba(34,197,94,0.1)', border: '#22c55e', text: '#22c55e' },
                    sumido: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', text: '#ef4444' },
                    novo: { bg: 'rgba(102,126,234,0.1)', border: '#667eea', text: '#667eea' },
                    regular: { bg: 'rgba(107,114,128,0.1)', border: '#6b7280', text: '#6b7280' }
                };
                const cor = cores[c.classificacao] || cores.regular;
                const tel = c.telefone ? c.telefone.replace(/\D/g, '') : '';

                html += `
                    <div style="background: var(--bg-card); border: 1px solid ${cor.border}; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; flex-shrink: 0;">${c.nome.charAt(0).toUpperCase()}</div>
                                <div style="min-width: 0;">
                                    <div style="font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(c.nome)} ${c.icone}</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">${c.telefone || 'Sem telefone'}</div>
                                </div>
                            </div>
                            <span style="font-size: 10px; padding: 2px 8px; border-radius: 10px; background: ${cor.bg}; color: ${cor.text}; border: 1px solid ${cor.border};">${c.classificacao}</span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: var(--bg-hover); padding: 8px; border-radius: 8px; margin-bottom: 12px; text-align: center;">
                            <div><div style="font-weight: bold; color: var(--text-primary);">${c.total_concluidos}</div><div style="font-size: 10px; color: var(--text-muted);">Atend.</div></div>
                            <div><div style="font-weight: bold; color: #22c55e;">R$ ${formatMoney(c.ticket_medio)}</div><div style="font-size: 10px; color: var(--text-muted);">Ticket</div></div>
                            <div><div style="font-weight: bold; color: ${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-primary)'};">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</div><div style="font-size: 10px; color: var(--text-muted);">Última</div></div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                            ${tel ? `<a href="https://wa.me/55${tel}" target="_blank" style="text-align: center; padding: 8px; border-radius: 8px; background: rgba(37,211,102,0.1); color: #25D366; text-decoration: none; font-size: 16px;"><i class="fab fa-whatsapp"></i></a>` : '<div></div>'}
                            <button onclick="editarCliente(${c.id})" style="text-align: center; padding: 8px; border-radius: 8px; background: rgba(102,126,234,0.1); color: #667eea; border: none; font-size: 16px;"><i class="fas fa-pen"></i></button>
                            <button onclick="verHistoricoCliente(${c.id})" style="text-align: center; padding: 8px; border-radius: 8px; background: rgba(139,92,246,0.1); color: #8b5cf6; border: none; font-size: 16px;"><i class="fas fa-history"></i></button>
                            <button onclick="excluirCliente(${c.id})" style="text-align: center; padding: 8px; border-radius: 8px; background: rgba(239,68,68,0.1); color: #ef4444; border: none; font-size: 16px;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        } else {
            // RENDERIZAÇÃO DESKTOP (TABELA)
            html += `
                <div class="table-responsive" style="overflow-x: auto;">
                    <table class="data-table" style="width: 100%; min-width: 800px;">
                        <thead><tr><th>#</th><th>Cliente</th><th>Telefone</th><th>Classificação</th><th>Atend.</th><th>Ticket</th><th>Última</th><th>Ações</th></tr></thead>
                        <tbody id="listaClientesTbody">
            `;
            // Loop da tabela desktop
            for (let c of clientesFiltrados) {
                html += `<tr>
                    <td>${c.id}</td>
                    <td><strong>${escapeHtml(c.nome)}</strong></td>
                    <td>${c.telefone || '-'}</td>
                    <td>${c.classificacao} ${c.icone}</td>
                    <td>${c.total_concluidos}</td>
                    <td>R$ ${formatMoney(c.ticket_medio)}</td>
                    <td>${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</td>
                    <td>
                        <button onclick="editarCliente(${c.id})" class="btn-icon"><i class="fas fa-pen"></i></button>
                        <button onclick="excluirCliente(${c.id})" class="btn-icon btn-delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            }
            html += `</tbody></table></div>`;
        }

        html += `</div>`;
        document.getElementById('content').innerHTML = html;

    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        document.getElementById('content').innerHTML = `<div class="card"><p>Erro ao carregar. <button onclick="carregarClientes()">Tentar novamente</button></p></div>`;
    }
    hideLoading();
}

// ============================================
// 🔍 BUSCA E FILTROS - VERSÃO ESTÁVEL (RECARGA TOTAL)
// ============================================

function buscarClientes() {
    const input = document.getElementById('buscaClientesInput');
    if (!input) return;

    termoBuscaClientes = input.value.toLowerCase().trim();

    // Recarrega a lista completa aplicando o filtro (evita bugs de renderização parcial no mobile)
    carregarClientes();
}

function limparBuscaClientes() {
    const input = document.getElementById('buscaClientesInput');
    if (input) input.value = '';

    termoBuscaClientes = '';
    carregarClientes();
}

function setFiltroClientes(filtro) {
    filtroClientes = filtro;
    carregarClientes();
}

// ============================================
// ️ APAGAR TODOS OS CLIENTES
// ============================================

async function apagarTodosClientes() {
    if (!confirm('️ ATENÇÃO: Você tem certeza que deseja apagar TODOS os clientes?\n\nEsta ação apagará também todos os agendamentos vinculados e não poderá ser desfeita!')) {
        return;
    }

    if (!confirm('🛑 ÚLTIMA CONFIRMAÇÃO: Digite OK mentalmente. Tem certeza absoluta?')) {
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/clientes/apagar-todos', {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        hideLoading();

        if (data.success) {
            showToast(`✅ ${data.message}`, 'success');
            // Reseta variáveis locais
            clientesCompletos = [];
            filtroClientes = 'todos';
            termoBuscaClientes = '';
            await carregarClientes();
        } else {
            showToast(data.message || 'Erro ao apagar clientes', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao apagar todos:', error);
        hideLoading();
        showToast('Erro ao conectar com o servidor', 'error');
    }
}

// ============================================
// VER HISTÓRICO DO CLIENTE
// ============================================

async function verHistoricoCliente(id) {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/agendamentos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const agendamentos = data.data || [];
        const ags = agendamentos.filter(a => a.cliente_id === id);

        if (ags.length === 0) {
            showToast(' Este cliente ainda não tem agendamentos', 'info');
            return;
        }

        const cliente = clientesCompletos.find(c => c.id === id);

        let html = `
            <div id="modalHistorico" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-content" style="max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0;"> Histórico de ${escapeHtml(cliente?.nome || 'Cliente')}</h3>
                        <button onclick="fecharModalHistorico()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted);">&times;</button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                        <div style="background: var(--bg-hover); border-radius: 8px; padding: 10px; text-align: center;">
                            <div style="font-size: 20px; font-weight: 700;">${ags.length}</div>
                            <div style="font-size: 10px; color: var(--text-muted);">Total</div>
                        </div>
                        <div style="background: var(--bg-hover); border-radius: 8px; padding: 10px; text-align: center;">
                            <div style="font-size: 20px; font-weight: 700; color: #22c55e;">${ags.filter(a => a.status === 'concluido').length}</div>
                            <div style="font-size: 10px; color: var(--text-muted);">✅ Concluídos</div>
                        </div>
                        <div style="background: var(--bg-hover); border-radius: 8px; padding: 10px; text-align: center;">
                            <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${ags.filter(a => a.status === 'pendente' || a.status === 'agendado').length}</div>
                            <div style="font-size: 10px; color: var(--text-muted);"> Pendentes</div>
                        </div>
                    </div>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${ags.sort((a, b) => new Date(b.data) - new Date(a.data)).map(a => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-size: 13px;">
                                <span> 📅 ${formatarDataBr(a.data)} ${a.hora || ''}</span>
                                <span>✂️ ${escapeHtml(a.servico_nome || a.servico || 'N/A')}</span>
                                <span style="font-weight: 600; color: ${a.status === 'concluido' ? '#22c55e' : a.status === 'cancelado' ? '#ef4444' : '#f59e0b'};">${a.status || 'pendente'}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
                        <button onclick="fecharModalHistorico()" style="padding: 8px 24px; border: none; border-radius: 8px; background: var(--primary); color: white; font-weight: 600; cursor: pointer;">Fechar</button>
                    </div>
                </div>
            </div>
        `;

        const existing = document.getElementById('modalHistorico');
        if (existing) existing.remove();
        document.body.insertAdjacentHTML('beforeend', html);

    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        showToast('Erro ao carregar histórico', 'error');
    }
}

function fecharModalHistorico() {
    const modal = document.getElementById('modalHistorico');
    if (modal) modal.remove();
}

// ============================================
// CRUD DE CLIENTES
// ============================================

function abrirModalCliente() {
    console.log(" abrirModalCliente chamada");

    const existingModal = document.getElementById('modalCliente');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="modalCliente" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
            <div class="modal-content" style="max-width: 450px; width: 100%; margin: 20px; padding: 25px; background: var(--bg-card); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: var(--text-primary);"> Novo Cliente</h3>
                    <button onclick="fecharModalCliente()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>
                <form id="formNovoCliente" onsubmit="event.preventDefault(); salvarCliente();">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: var(--text-secondary);">Nome *</label>
                        <input type="text" id="clienteNome" class="form-control" placeholder="Nome completo" required style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: var(--text-secondary);">Telefone</label>
                        <input type="text" id="clienteTelefone" class="form-control" placeholder="(00) 00000-0000" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: var(--text-secondary);">Email</label>
                        <input type="email" id="clienteEmail" class="form-control" placeholder="cliente@email.com" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 6px; font-size: 14px; background: var(--bg-input); color: var(--text-primary);">
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="fecharModalCliente()" style="padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; background: var(--bg-hover); color: var(--text-secondary);">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="salvarCliente()" style="padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-weight: 600;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function fecharModalCliente() {
    const modal = document.getElementById('modalCliente');
    if (modal) modal.remove();
}

async function salvarCliente() {
    console.log("💾 Salvando cliente...");

    try {
        const nomeInput = document.getElementById('clienteNome');
        const telefoneInput = document.getElementById('clienteTelefone');
        const emailInput = document.getElementById('clienteEmail');

        if (!nomeInput) {
            console.error('❌ Campo nome não encontrado!');
            showToast('Erro: Campo nome não encontrado', 'error');
            return;
        }

        const nome = nomeInput ? nomeInput.value.trim() : '';
        const telefone = telefoneInput ? telefoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';

        if (!nome) {
            showToast('Nome é obrigatório', 'warning');
            return;
        }

        const dados = {
            nome: nome,
            telefone: telefone || '',
            email: email || ''
        };

        console.log(' Dados a enviar:', dados);

        showLoading();
        const token = localStorage.getItem('token');

        if (!token) {
            showToast('Sessão expirada. Faça login novamente.', 'error');
            hideLoading();
            return;
        }

        const res = await fetch('/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(dados)
        });

        const data = await res.json();

        hideLoading();

        if (data.success) {
            showToast('Cliente cadastrado com sucesso!', 'success');
            fecharModalCliente();
            await carregarClientes();
        } else {
            showToast(data.message || 'Erro ao cadastrar cliente', 'error');
        }
    } catch (error) {
        console.error(" Erro no fetch:", error);
        hideLoading();
        showToast('Erro ao cadastrar cliente', 'error');
    }
}

async function editarCliente(id) {
    console.log("✏️ Editando cliente:", id);

    try {
        const token = localStorage.getItem('token');

        if (!token) {
            showToast('Sessão expirada', 'error');
            return;
        }

        const res = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await res.json();
        const clientes = data.data || [];
        const cliente = clientes.find(c => c.id === id);

        if (!cliente) {
            showToast('Cliente não encontrado', 'error');
            return;
        }

        const existingModal = document.getElementById('modalEditarCliente');
        if (existingModal) existingModal.remove();

        const isMobile = window.innerWidth < 768;

        const modalHtml = `
            <div id="modalEditarCliente" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-content" style="max-width: 450px; width: 100%; margin: auto; padding: ${isMobile ? '16px' : '24px'}; background: var(--bg-card); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                            <i class="fas fa-user-edit"></i> Editar Cliente
                        </h3>
                        <button onclick="fecharModalEditarCliente()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted); line-height: 1; padding: 0 8px;">&times;</button>
                    </div>
                    
                    <form id="formEditarCliente" onsubmit="event.preventDefault(); atualizarCliente(${id});" style="display:flex;flex-direction:column;gap:12px;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">Nome <span style="color:#ef4444;">*</span></label>
                            <input type="text" id="editClienteNome" class="form-control" value="${escapeHtml(cliente.nome)}" required style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:14px;">
                        </div>
                        
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">📱 Telefone</label>
                            <input type="text" id="editClienteTelefone" class="form-control" value="${escapeHtml(cliente.telefone || '')}" placeholder="(00) 00000-0000" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:14px;">
                        </div>
                        
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">📧 Email</label>
                            <input type="email" id="editClienteEmail" class="form-control" value="${escapeHtml(cliente.email || '')}" placeholder="cliente@email.com" style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:14px;">
                        </div>
                        
                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                            <button type="button" onclick="fecharModalEditarCliente()" style="padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer; font-weight: 500;">Cancelar</button>
                            <button type="submit" style="padding: 8px 24px; border-radius: 8px; border: none; background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-save"></i> Salvar Alterações
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        setTimeout(() => {
            const nomeInput = document.getElementById('editClienteNome');
            if (nomeInput) nomeInput.focus();
        }, 100);

    } catch (error) {
        console.error('❌ Erro ao carregar cliente para edição:', error);
        showToast('Erro ao carregar dados do cliente', 'error');
    }
}

function fecharModalEditarCliente() {
    const modal = document.getElementById('modalEditarCliente');
    if (modal) modal.remove();
}

async function atualizarCliente(id) {
    console.log('📝 Atualizando cliente:', id);

    try {
        const nomeInput = document.getElementById('editClienteNome');
        const telefoneInput = document.getElementById('editClienteTelefone');
        const emailInput = document.getElementById('editClienteEmail');

        if (!nomeInput) {
            console.error('❌ Campo nome não encontrado!');
            showToast('Erro: Campo nome não encontrado', 'error');
            return;
        }

        const nome = nomeInput ? nomeInput.value.trim() : '';
        const telefone = telefoneInput ? telefoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';

        if (!nome) {
            showToast('Nome é obrigatório', 'warning');
            return;
        }

        const dados = {
            nome: nome,
            telefone: telefone || '',
            email: email || ''
        };

        console.log('📦 Atualizando:', dados);

        showLoading();
        const token = localStorage.getItem('token');

        if (!token) {
            showToast('Sessão expirada', 'error');
            hideLoading();
            return;
        }

        const res = await fetch(`/api/clientes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(dados)
        });

        const data = await res.json();

        hideLoading();

        if (data.success) {
            showToast('Cliente atualizado com sucesso!', 'success');
            fecharModalEditarCliente();
            await carregarClientes();
        } else {
            showToast(data.message || 'Erro ao atualizar cliente', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar cliente:', error);
        hideLoading();
        showToast('Erro ao atualizar cliente', 'error');
    }
}

async function excluirCliente(id) {
    if (!confirm('Excluir este cliente? Esta ação não poderá ser desfeita.')) return;

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/clientes/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        hideLoading();

        if (data.success) {
            showToast('Cliente removido com sucesso!', 'success');
            await carregarClientes();
        } else {
            showToast(data.message || 'Erro ao excluir cliente', 'error');
        }
    } catch (error) {
        console.error(' Erro ao excluir:', error);
        hideLoading();
        showToast('Erro ao excluir cliente', 'error');
    }
}

async function bloquearChatbot(id) {
    if (!confirm('Bloquear este cliente de usar o chatbot? Ele não poderá fazer agendamentos online.')) return;

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/clientes/${id}/bloquear-chatbot`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ bloquear: true })
        });
        const data = await res.json();

        hideLoading();

        if (data.success) {
            showToast('Cliente bloqueado do chatbot!', 'success');
            await carregarClientes();
        } else {
            showToast(data.message || 'Erro ao bloquear', 'error');
        }
    } catch (error) {
        console.error(' Erro ao bloquear:', error);
        hideLoading();
        showToast('Erro ao bloquear cliente', 'error');
    }
}

async function desbloquearChatbot(id) {
    if (!confirm('Desbloquear este cliente para usar o chatbot?')) return;

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/clientes/${id}/bloquear-chatbot`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ bloquear: false })
        });
        const data = await res.json();

        hideLoading();

        if (data.success) {
            showToast('Cliente liberado para usar o chatbot!', 'success');
            await carregarClientes();
        } else {
            showToast(data.message || 'Erro ao desbloquear', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao desbloquear:', error);
        hideLoading();
        showToast('Erro ao desbloquear cliente', 'error');
    }
}

// ============================================
//  IMPORTAÇÃO UNIVERSAL - VERSÃO MOBILE SEGURA
// ============================================

function abrirModalImportarCSV() {
    // Remove qualquer modal anterior para evitar duplicidade
    const existing = document.getElementById('modalImportarCSV');
    if (existing) existing.remove();

    const isMobile = window.innerWidth < 768;

    const modalHtml = `
        <div id="modalImportarCSV" style="
            position: fixed; inset: 0; 
            background: rgba(0,0,0,0.85); 
            z-index: 2000; 
            display: flex; align-items: center; justify-content: center; 
            padding: 20px; backdrop-filter: blur(3px);
            overscroll-behavior: contain;
        ">
            <div style="
                max-width: 450px; width: 100%; 
                background: var(--bg-card, #1a1a1a); 
                border-radius: 16px; 
                padding: 24px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                max-height: 85vh; overflow-y: auto;
                border: 1px solid var(--border-color, #333);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 18px; color: var(--text-primary, #fff);">📂 Importar Contatos</h3>
                    <button onclick="fecharModalImportarCSV()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted, #888);">&times;</button>
                </div>
                
                <div style="
                    border: 2px dashed var(--border-color, #444); 
                    border-radius: 12px; 
                    padding: 30px 20px; 
                    text-align: center; 
                    margin-bottom: 20px; 
                    background: var(--bg-hover, #222);
                    cursor: pointer;
                " onclick="document.getElementById('csvFileInput').click()">
                    
                    <i class="fas fa-cloud-upload-alt" style="font-size: 40px; color: var(--primary, #667eea); margin-bottom: 15px;"></i>
                    <p style="margin: 0 0 10px 0; color: var(--text-secondary, #ccc); font-weight: 600;">Toque para selecionar arquivo</p>
                    <p style="font-size: 12px; color: var(--text-muted, #888); margin-bottom: 15px;">Suporta: .CSV ou .VCF (iPhone/Android)</p>
                    
                    <input type="file" id="csvFileInput" accept=".csv,.vcf,.txt,text/csv,text/vcard" 
                           style="display: none;" onchange="handleFileSelect(this)">
                    
                    <button type="button" style="
                        padding: 10px 20px; border-radius: 8px; border: none; 
                        background: linear-gradient(135deg, #22c55e, #16a34a); 
                        color: white; font-weight: 600; cursor: pointer;
                        display: inline-flex; align-items: center; gap: 8px;
                        pointer-events: none;
                    ">
                        <i class="fas fa-folder-open"></i> Escolher Arquivo
                    </button>
                </div>

                <div style="background: rgba(102,126,234,0.1); padding: 12px; border-radius: 8px; font-size: 12px; color: var(--text-secondary, #ccc); margin-bottom: 20px; border-left: 4px solid var(--primary, #667eea);">
                    <strong> Dica iPhone:</strong> Ajustes > Contatos > Exportar Contatos
                </div>

                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="fecharModalImportarCSV()" style="padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border-color, #444); background: transparent; color: var(--text-secondary, #ccc); cursor: pointer;">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Previne scroll do body enquanto modal está aberto
    document.body.style.overflow = 'hidden';
}

function fecharModalImportarCSV() {
    const modal = document.getElementById('modalImportarCSV');
    if (modal) {
        modal.remove();
        // Restaura o scroll e o foco
        document.body.style.overflow = '';
        document.body.focus();
    }
}

function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        processarArquivoContatos(input.files[0]);
    }
}

async function processarArquivoContatos(file) {
    showLoading();
    try {
        const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file, 'UTF-8');
        });

        let clientesParaImportar = [];
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.vcf') || content.includes('BEGIN:VCARD')) {
            clientesParaImportar = parseVCF(content);
        } else {
            clientesParaImportar = parseCSV(content);
        }

        hideLoading();

        if (clientesParaImportar.length === 0) {
            showToast('Nenhum contato válido encontrado.', 'warning');
            return;
        }

        if (!confirm(`Encontrados ${clientesParaImportar.length} contatos. Deseja importar?`)) return;

        await salvarLoteClientes(clientesParaImportar);

    } catch (error) {
        hideLoading();
        console.error(error);
        showToast('Erro ao ler o arquivo.', 'error');
    }
}

// Parsers simplificados e robustos
function parseVCF(content) {
    const lines = content.split(/\r\n|\n|\r/);
    const contacts = [];
    let current = {};
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith('BEGIN:VCARD')) current = { nome: '', telefone: '', email: '' };
        else if (line.startsWith('END:VCARD') && (current.nome || current.telefone)) contacts.push({ ...current });
        else if (line.startsWith('FN:')) current.nome = line.substring(3).replace(/;/g, ' ').trim();
        else if (line.startsWith('TEL') && !current.telefone) current.telefone = line.split(':').pop().trim().replace(/[^\d+]/g, '');
        else if (line.startsWith('EMAIL') && !current.email) current.email = line.split(':').pop().trim();
    }
    return contacts;
}

function parseCSV(content) {
    const lines = content.split('\n');
    const contacts = [];
    let start = lines[0] && (lines[0].toLowerCase().includes('nome') || lines[0].toLowerCase().includes('name')) ? 1 : 0;
    for (let i = start; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(/[,;]/).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 1) {
            contacts.push({
                nome: cols[0],
                telefone: cols[1] ? cols[1].replace(/[^\d+]/g, '') : '',
                email: cols[2] || ''
            });
        }
    }
    return contacts;
}

async function salvarLoteClientes(lista) {
    showLoading();
    const token = localStorage.getItem('token');
    let success = 0, errors = 0;
    for (let i = 0; i < lista.length; i += 5) {
        const batch = lista.slice(i, i + 5);
        await Promise.all(batch.map(async (cliente) => {
            if (!cliente.nome && !cliente.telefone) return;
            try {
                const res = await fetch('/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                    body: JSON.stringify({ nome: cliente.nome || 'Sem Nome', telefone: cliente.telefone, email: cliente.email })
                });
                const data = await res.json();
                if (data.success) success++; else errors++;
            } catch (e) { errors++; }
        }));
    }
    hideLoading();
    fecharModalImportarCSV();
    if (success > 0) {
        showToast(`${success} contatos importados!`, 'success');
        carregarClientes();
    } else {
        showToast('Falha na importação.', 'error');
    }
}

// ============================================
// 📢 PROMOÇÕES WHATSAPP - VERSÃO MOBILE SEGURA
// ============================================

function abrirModalPromocao() {
    const existing = document.getElementById('modalPromocao');
    if (existing) existing.remove();

    const clientesComTel = clientesCompletos.filter(c => c.telefone && c.telefone.trim() !== '');
    if (clientesComTel.length === 0) {
        showToast('Nenhum cliente com telefone cadastrado.', 'warning');
        return;
    }

    const modalHtml = `
        <div id="modalPromocao" style="
            position: fixed; inset: 0; 
            background: rgba(0,0,0,0.85); 
            z-index: 2000; 
            display: flex; align-items: center; justify-content: center; 
            padding: 20px; backdrop-filter: blur(3px);
            overscroll-behavior: contain;
        ">
            <div style="
                max-width: 500px; width: 100%; 
                background: var(--bg-card, #1a1a1a); 
                border-radius: 16px; 
                padding: 24px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                max-height: 85vh; overflow-y: auto;
                border: 1px solid var(--border-color, #333);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: var(--text-primary, #fff);"> Disparar Promoção</h3>
                    <button onclick="fecharModalPromocao()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted, #888);">&times;</button>
                </div>
                
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: var(--text-secondary, #ccc);">Mensagem</label>
                    <textarea id="textoPromocao" rows="5" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color, #444); background: var(--bg-input, #222); color: var(--text-primary, #fff); resize: vertical;" placeholder="Olá! Temos uma promoção especial..."></textarea>
                </div>

                <div style="margin-top: 15px; font-size: 13px; color: var(--text-muted, #888);">
                    <i class="fas fa-info-circle"></i> Serão enviadas mensagens individuais para <strong>${clientesComTel.length}</strong> clientes.
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button onclick="fecharModalPromocao()" style="padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color, #444); background: transparent; color: var(--text-secondary, #ccc); cursor: pointer;">Cancelar</button>
                    <button onclick="enviarPromocao()" style="padding: 10px 20px; border-radius: 8px; border: none; background: #25D366; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fab fa-whatsapp"></i> Enviar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function fecharModalPromocao() {
    const modal = document.getElementById('modalPromocao');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        document.body.focus();
    }
}

function enviarPromocao() {
    const texto = document.getElementById('textoPromocao').value.trim();
    if (!texto) {
        showToast('Digite a mensagem da promoção.', 'warning');
        return;
    }

    const clientesComTel = clientesCompletos.filter(c => c.telefone && c.telefone.trim() !== '');
    let count = 0;

    clientesComTel.forEach((cliente, index) => {
        setTimeout(() => {
            const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
            const numeroFinal = telefoneLimpo.startsWith('55') ? telefoneLimpo : '55' + telefoneLimpo;
            window.open(`https://wa.me/${numeroFinal}?text=${encodeURIComponent(texto)}`, '_blank');
            count++;

            if (count === clientesComTel.length) {
                fecharModalPromocao();
                showToast(`Processo iniciado para ${count} clientes!`, 'success');
            }
        }, index * 1500);
    });
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarClientes = carregarClientes;
window.buscarClientes = buscarClientes;
window.limparBuscaClientes = limparBuscaClientes;
window.setFiltroClientes = setFiltroClientes;
window.apagarTodosClientes = apagarTodosClientes;
window.abrirModalCliente = abrirModalCliente;
window.fecharModalCliente = fecharModalCliente;
window.salvarCliente = salvarCliente;
window.editarCliente = editarCliente;
window.fecharModalEditarCliente = fecharModalEditarCliente;
window.atualizarCliente = atualizarCliente;
window.excluirCliente = excluirCliente;
window.bloquearChatbot = bloquearChatbot;
window.desbloquearChatbot = desbloquearChatbot;
window.verHistoricoCliente = verHistoricoCliente;
window.fecharModalHistorico = fecharModalHistorico;

// Funções de Importação Universal (CSV/VCF/iPhone) - CORRIGIDAS MOBILE
window.abrirModalImportarCSV = abrirModalImportarCSV;
window.fecharModalImportarCSV = fecharModalImportarCSV;
window.handleFileSelect = handleFileSelect;
window.abrirModalPromocao = abrirModalPromocao;
window.fecharModalPromocao = fecharModalPromocao;
window.enviarPromocao = enviarPromocao;

console.log('✅ clientes.js carregado com sucesso (CRM COMPLETO + IMPORTAÇÃO UNIVERSAL + MOBILE FIX)!');

// ============================================
// ATUALIZAR AO REDIMENSIONAR A TELA
// ============================================
let resizeTimeoutClientes;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeoutClientes);
    resizeTimeoutClientes = setTimeout(function () {
        if (document.getElementById('content') && document.getElementById('content').innerHTML.includes('👥 Clientes')) {
            carregarClientes();
        }
    }, 300);
});