// ============================================
// CLIENTES.JS - VERSÃO CRM COMPLETA
// ULTIMA ATUALIZACAO: 23/07/2026
// CORREÇÃO: IMPORTAÇÃO MOBILE
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
// CARREGAR CLIENTES
// ============================================

async function carregarClientes() {
    console.log("🟢 carregarClientes chamada (CRM)");
    ativarBotao('clientes');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        const resClientes = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const dataClientes = await resClientes.json();

        const resAgendamentos = await fetch('/api/agendamentos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const dataAgendamentos = await resAgendamentos.json();

        const clientes = dataClientes.data || [];
        const agendamentos = dataAgendamentos.data || [];

        clientesCompletos = clientes.map(cliente => {
            const ags = agendamentos.filter(a => a.cliente_id === cliente.id);
            const agsConcluidos = ags.filter(a => a.status === 'concluido');
            const agsPendentes = ags.filter(a => a.status === 'pendente' || a.status === 'agendado');

            const totalAgendamentos = ags.length;
            const totalConcluidos = agsConcluidos.length;

            let valorTotal = 0;
            agsConcluidos.forEach(a => {
                valorTotal += parseFloat(a.valor_total) || parseFloat(a.valor) || 0;
            });

            const ticketMedio = totalConcluidos > 0 ? valorTotal / totalConcluidos : 0;

            let ultimaVisita = null;
            if (agsConcluidos.length > 0) {
                const datas = agsConcluidos.map(a => new Date(a.data + 'T00:00:00'));
                ultimaVisita = new Date(Math.max(...datas));
            }

            const servicosCount = {};
            agsConcluidos.forEach(a => {
                const servico = a.servico_nome || a.servico || 'Outro';
                servicosCount[servico] = (servicosCount[servico] || 0) + 1;
            });

            const servicosOrdenados = Object.entries(servicosCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([nome, count]) => ({ nome, count }));

            let diasDesdeUltima = null;
            if (ultimaVisita) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const diffTime = hoje - ultimaVisita;
                diasDesdeUltima = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            let classificacao = 'regular';
            let icone = '👤';

            if (totalConcluidos >= 10 && valorTotal >= 500) {
                classificacao = 'vip';
                icone = '⭐';
            } else if (totalConcluidos >= 5) {
                classificacao = 'frequente';
                icone = '🔥';
            } else if (diasDesdeUltima !== null && diasDesdeUltima > 60) {
                classificacao = 'sumido';
                icone = '😴';
            } else if (totalConcluidos <= 1) {
                classificacao = 'novo';
                icone = '🌱';
            }

            return {
                ...cliente,
                total_agendamentos: totalAgendamentos,
                total_concluidos: totalConcluidos,
                pendentes: agsPendentes.length,
                valor_total: valorTotal,
                ticket_medio: ticketMedio,
                ultima_visita: ultimaVisita,
                dias_sem_visita: diasDesdeUltima,
                servicos_frequentes: servicosOrdenados,
                classificacao: classificacao,
                icone: icone
            };
        });

        clientesCompletos.sort((a, b) => b.total_concluidos - a.total_concluidos);

        const isMobile = window.innerWidth < 768 || window.screen.width < 768;

        const totalClientes = clientesCompletos.length;
        const vipCount = clientesCompletos.filter(c => c.classificacao === 'vip').length;
        const sumidosCount = clientesCompletos.filter(c => c.classificacao === 'sumido').length;
        const frequentesCount = clientesCompletos.filter(c => c.classificacao === 'frequente').length;
        const comWhatsApp = clientesCompletos.filter(c => c.telefone && c.telefone.trim() !== '').length;
        const totalGasto = clientesCompletos.reduce((acc, c) => acc + c.valor_total, 0);

        // 🔍 APLICAR BUSCA
        let clientesFiltrados = clientesCompletos;

        if (termoBuscaClientes) {
            clientesFiltrados = clientesFiltrados.filter(c => {
                const nomeMatch = c.nome.toLowerCase().includes(termoBuscaClientes);
                const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(termoBuscaClientes);
                const emailMatch = c.email && c.email.toLowerCase().includes(termoBuscaClientes);
                return nomeMatch || telefoneMatch || emailMatch;
            });
        }

        if (filtroClientes === 'vip') {
            clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'vip');
        } else if (filtroClientes === 'sumidos') {
            clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'sumido');
        } else if (filtroClientes === 'frequentes') {
            clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'frequente' || c.classificacao === 'vip');
        } else if (filtroClientes === 'novos') {
            clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'novo');
        }

        // ============================================
        // HTML
        // ============================================
        let html = `
            <div class="fade-in">
                <div class="dashboard-header">
                    <div>
                        <h2 class="page-title">👥 Clientes</h2>
                        <p class="page-subtitle">
                            <i class="fas fa-users"></i> 
                            Gerencie seus clientes e acompanhe métricas importantes
                        </p>
                    </div>
                    <div class="dashboard-actions" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 4px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; padding: 2px 4px; flex: 1; min-width: 120px; max-width: ${isMobile ? '100%' : '250px'};">
                            <i class="fas fa-search" style="color: var(--text-muted); padding-left: 8px; font-size: 13px;"></i>
                            <input type="text" id="buscaClientesInput" 
                                   placeholder="🔍 Buscar cliente..." 
                                   style="border: none; background: transparent; padding: 6px 8px; font-size: 13px; width: 100%; outline: none; color: var(--text-primary);"
                                   oninput="buscarClientes()"
                                   autocomplete="off"
                            >
                            <button onclick="limparBuscaClientes()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 8px; font-size: 14px; display: ${termoBuscaClientes ? 'block' : 'none'};" id="btnLimparBusca">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        </div>
                        
                        <button class="btn btn-whatsapp" onclick="abrirModalPromocao()" style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 8px 16px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: ${isMobile ? '12px' : '14px'}; box-shadow: 0 4px 16px rgba(37,211,102,0.25); transition: all 0.3s ease;">
                            <i class="fas fa-bullhorn"></i> ${isMobile ? 'Promoção' : 'Disparar Promoção'}
                        </button>
                        
                        <button class="btn btn-success" onclick="abrirModalImportarCSV()" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 8px 16px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: ${isMobile ? '12px' : '14px'}; box-shadow: 0 4px 16px rgba(34,197,94,0.25);">
                            <i class="fas fa-file-csv"></i> ${isMobile ? 'Importar' : 'Importar Contatos'}
                        </button>
                        <button class="btn btn-primary" onclick="abrirModalCliente()" style="padding: 8px 16px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: ${isMobile ? '12px' : '14px'}; background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                            <i class="fas fa-plus"></i> ${isMobile ? 'Novo' : 'Novo Cliente'}
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
                    <button onclick="setFiltroClientes('todos')" class="btn ${filtroClientes === 'todos' ? 'btn-primary' : 'btn-outline'}" style="font-size: 12px; padding: 4px 14px;">📊 Todos (${totalClientes})</button>
                    <button onclick="setFiltroClientes('vip')" class="btn ${filtroClientes === 'vip' ? 'btn-primary' : 'btn-outline'}" style="font-size: 12px; padding: 4px 14px;">⭐ VIP (${vipCount})</button>
                    <button onclick="setFiltroClientes('frequentes')" class="btn ${filtroClientes === 'frequentes' ? 'btn-primary' : 'btn-outline'}" style="font-size: 12px; padding: 4px 14px;">🔥 Frequentes (${frequentesCount})</button>
                    <button onclick="setFiltroClientes('sumidos')" class="btn ${filtroClientes === 'sumidos' ? 'btn-primary' : 'btn-outline'}" style="font-size: 12px; padding: 4px 14px;">😴 Sumidos (${sumidosCount})</button>
                    <button onclick="setFiltroClientes('novos')" class="btn ${filtroClientes === 'novos' ? 'btn-primary' : 'btn-outline'}" style="font-size: 12px; padding: 4px 14px;">🌱 Novos (${clientesCompletos.filter(c => c.classificacao === 'novo').length})</button>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; font-size: 13px; color: var(--text-muted); border-bottom: 1px solid var(--border-color); margin-bottom: 12px;">
                    <span id="contadorBuscaClientes">
                        ${termoBuscaClientes ? `🔍 "${termoBuscaClientes}" → ` : ''}
                        <strong>${clientesFiltrados.length}</strong> de <strong>${clientesCompletos.length}</strong> clientes
                    </span>
                </div>

                <div class="cliente-stats" id="clienteStats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px;">
                    <div class="stat-mini" style="background: linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.04)); border-radius: 10px; padding: 10px;">
                        <span class="stat-mini-value" id="totalClientes">${clientesFiltrados.length}</span>
                        <span class="stat-mini-label">📊 Total</span>
                    </div>
                    <div class="stat-mini" style="background: linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04)); border-radius: 10px; padding: 10px;">
                        <span class="stat-mini-value">${vipCount}</span>
                        <span class="stat-mini-label">⭐ VIP</span>
                    </div>
                    <div class="stat-mini" style="background: linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04)); border-radius: 10px; padding: 10px;">
                        <span class="stat-mini-value">${frequentesCount}</span>
                        <span class="stat-mini-label">🔥 Frequentes</span>
                    </div>
                    <div class="stat-mini" style="background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.04)); border-radius: 10px; padding: 10px;">
                        <span class="stat-mini-value">${sumidosCount}</span>
                        <span class="stat-mini-label">😴 Sumidos</span>
                    </div>
                    <div class="stat-mini" style="background: linear-gradient(135deg, rgba(37,211,102,0.08), rgba(18,140,126,0.04)); border-radius: 10px; padding: 10px;">
                        <span class="stat-mini-value">${comWhatsApp}</span>
                        <span class="stat-mini-label"><i class="fab fa-whatsapp"></i> WhatsApp</span>
                    </div>
                    <div class="stat-mini" style="background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(124,58,237,0.04)); border-radius: 10px; padding: 10px;">
                        <span class="stat-mini-value">R$ ${formatMoney(totalGasto)}</span>
                        <span class="stat-mini-label">💰 Total Gasto</span>
                    </div>
                </div>

                <div class="card">
        `;

        if (clientesFiltrados.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <h4>${termoBuscaClientes ? 'Nenhum cliente encontrado com esta busca' : 'Nenhum cliente encontrado com este filtro'}</h4>
                    <p>${termoBuscaClientes ? 'Tente buscar por outro nome, telefone ou email' : 'Tente ajustar os filtros ou adicionar novos clientes'}</p>
                    <button class="btn btn-primary btn-sm" onclick="${termoBuscaClientes ? 'limparBuscaClientes()' : 'setFiltroClientes(\'todos\')'}">
                        <i class="fas fa-undo"></i> ${termoBuscaClientes ? 'Limpar Busca' : 'Mostrar Todos'}
                    </button>
                </div>
            `;
        } else if (isMobile) {
            html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
            for (let c of clientesFiltrados) {
                const isBloqueado = c.bloqueado_chatbot === 1;
                const telefone = c.telefone || '';
                const whatsappLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '#';
                const inicial = c.nome ? c.nome.charAt(0).toUpperCase() : '?';
                const cores = {
                    vip: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
                    frequente: { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#22c55e' },
                    sumido: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' },
                    novo: { bg: 'rgba(102,126,234,0.15)', border: '#667eea', text: '#667eea' },
                    regular: { bg: 'rgba(107,114,128,0.1)', border: '#6b7280', text: '#6b7280' }
                };
                const cor = cores[c.classificacao] || cores.regular;
                html += `
                    <div style="background: var(--bg-card); border-radius: 16px; padding: 16px; border: 1px solid ${cor.border}; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                                <div style="width:40px;height:40px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0;">${inicial}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:15px;font-weight:600;color:var(--text-primary);">
                                        ${escapeHtml(c.nome)}
                                        <span style="font-size:14px;">${c.icone}</span>
                                    </div>
                                    <div style="font-size:11px;color:var(--text-muted);">
                                        ${c.telefone ? `📱 ${escapeHtml(c.telefone)}` : 'Sem telefone'}
                                    </div>
                                </div>
                            </div>
                            <span style="padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${cor.bg};color:${cor.text};border:1px solid ${cor.border};white-space:nowrap;">
                                ${c.icone} ${c.classificacao}
                            </span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;background:var(--bg-hover);border-radius:8px;padding:8px;margin:8px 0;">
                            <div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:var(--text-primary);">${c.total_concluidos}</div><div style="font-size:8px;color:var(--text-muted);">Atend.</div></div>
                            <div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:#22c55e;">R$ ${formatMoney(c.ticket_medio)}</div><div style="font-size:8px;color:var(--text-muted);">Ticket</div></div>
                            <div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-primary)'};">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</div><div style="font-size:8px;color:var(--text-muted);">Última</div></div>
                        </div>
                        <div style="display:flex;gap:4px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--border-color);">
                            ${whatsappLink !== '#' ? `<a href="${whatsappLink}" target="_blank" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(37,211,102,0.3);background:var(--bg-hover);color:#25D366;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;flex:1;justify-content:center;text-decoration:none;"><i class="fab fa-whatsapp"></i></a>` : ''}
                            <button onclick="editarCliente(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(102,126,234,0.3);background:var(--bg-hover);color:var(--primary);font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-pen"></i></button>
                            <button onclick="verHistoricoCliente(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(139,92,246,0.3);background:var(--bg-hover);color:#8b5cf6;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-history"></i></button>
                            ${isBloqueado ? `<button onclick="desbloquearChatbot(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(34,197,94,0.3);background:var(--bg-hover);color:#22c55e;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-unlock"></i></button>` : `<button onclick="bloquearChatbot(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--bg-hover);color:#ef4444;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-lock"></i></button>`}
                            <button onclick="excluirCliente(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--bg-hover);color:#ef4444;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        } else {
            html += `
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr><th>#</th><th>Cliente</th><th>Telefone</th><th>Classificação</th><th>Atend.</th><th>Ticket Médio</th><th>Serviços Frequentes</th><th>Última Visita</th><th>Ações</th></tr>
                        </thead>
                        <tbody id="listaClientesTbody">
            `;
            for (let c of clientesFiltrados) {
                const isBloqueado = c.bloqueado_chatbot === 1;
                const telefone = c.telefone || '';
                const whatsappLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '#';
                const cores = {
                    vip: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
                    frequente: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
                    sumido: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
                    novo: { bg: 'rgba(102,126,234,0.15)', text: '#667eea' },
                    regular: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' }
                };
                const cor = cores[c.classificacao] || cores.regular;
                html += `
                    <tr>
                        <td style="text-align:center;">${c.id}</td>
                        <td><strong>${escapeHtml(c.nome)}</strong> <span style="font-size:14px;">${c.icone}</span></td>
                        <td>${telefone ? `<div style="display:flex;align-items:center;gap:4px;">${escapeHtml(telefone)}<a href="${whatsappLink}" target="_blank" style="color:#25D366;text-decoration:none;"><i class="fab fa-whatsapp"></i></a></div>` : '-'}</td>
                        <td><span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${cor.bg};color:${cor.text};">${c.icone} ${c.classificacao}</span></td>
                        <td style="text-align:center;">${c.total_concluidos}</td>
                        <td style="text-align:center;font-weight:600;color:#22c55e;">R$ ${formatMoney(c.ticket_medio)}</td>
                        <td>${c.servicos_frequentes.slice(0, 2).map(s => `<span style="background:rgba(102,126,234,0.08);padding:1px 6px;border-radius:8px;font-size:10px;color:var(--text-secondary);display:inline-block;margin:1px;">${escapeHtml(s.nome)} (${s.count})</span>`).join('')}</td>
                        <td style="text-align:center;font-size:12px;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-muted)'};">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</td>
                        <td>
                            <div style="display:flex;gap:2px;flex-wrap:wrap;">
                                <button class="btn-icon btn-edit" onclick="editarCliente(${c.id})" title="Editar" style="padding:2px 6px;"><i class="fas fa-pen"></i></button>
                                <button class="btn-icon" onclick="verHistoricoCliente(${c.id})" title="Histórico" style="padding:2px 6px;color:#8b5cf6;"><i class="fas fa-history"></i></button>
                                ${isBloqueado ? `<button class="btn-icon btn-unblock" onclick="desbloquearChatbot(${c.id})" title="Liberar" style="padding:2px 6px;"><i class="fas fa-unlock"></i></button>` : `<button class="btn-icon btn-block" onclick="bloquearChatbot(${c.id})" title="Bloquear" style="padding:2px 6px;"><i class="fas fa-lock"></i></button>`}
                                <button class="btn-icon btn-delete" onclick="excluirCliente(${c.id})" title="Excluir" style="padding:2px 6px;"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            html += `</tbody></table></div>`;
        }

        html += `</div></div>`;
        document.getElementById('content').innerHTML = html;
        console.log("✅ Clientes renderizados com sucesso (CRM)!");

    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        document.getElementById('content').innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar clientes</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarClientes()">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    hideLoading();
}

// ============================================
// 🔍 BUSCA DE CLIENTES - VERSÃO DEFINITIVA
// ============================================

function buscarClientes() {
    const input = document.getElementById('buscaClientesInput');
    if (!input) {
        console.error('❌ Input de busca não encontrado!');
        return;
    }

    const termo = input.value.toLowerCase().trim();
    termoBuscaClientes = termo;
    window.termoBuscaClientes = termo;

    console.log('🔍 Buscando por:', termo);

    const btnLimpar = document.getElementById('btnLimparBusca');
    if (btnLimpar) {
        btnLimpar.style.display = termo ? 'block' : 'none';
    }

    // 🔥 NÃO CHAMAR carregarClientes() - APENAS FILTRAR
    if (clientesCompletos.length > 0) {
        aplicarFiltroClientes();
    }
}

function limparBuscaClientes() {
    const input = document.getElementById('buscaClientesInput');
    if (input) {
        input.value = '';
        termoBuscaClientes = '';
        window.termoBuscaClientes = '';

        const btnLimpar = document.getElementById('btnLimparBusca');
        if (btnLimpar) {
            btnLimpar.style.display = 'none';
        }

        console.log('🧹 Busca limpa');
        if (clientesCompletos.length > 0) {
            aplicarFiltroClientes();
        }
    }
}

// ============================================
// 🔥 APLICAR FILTRO SEM RECARREGAR
// ============================================

function aplicarFiltroClientes() {
    const clientes = clientesCompletos;
    if (clientes.length === 0) return;

    let clientesFiltrados = clientes;
    if (termoBuscaClientes) {
        clientesFiltrados = clientes.filter(c => {
            const nomeMatch = c.nome.toLowerCase().includes(termoBuscaClientes);
            const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(termoBuscaClientes);
            const emailMatch = c.email && c.email.toLowerCase().includes(termoBuscaClientes);
            return nomeMatch || telefoneMatch || emailMatch;
        });
    }

    if (filtroClientes === 'vip') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'vip');
    } else if (filtroClientes === 'sumidos') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'sumido');
    } else if (filtroClientes === 'frequentes') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'frequente' || c.classificacao === 'vip');
    } else if (filtroClientes === 'novos') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'novo');
    }

    console.log(`🔍 Resultado: ${clientesFiltrados.length} de ${clientes.length} clientes`);

    // Atualizar contador
    const contador = document.getElementById('contadorBuscaClientes');
    if (contador) {
        contador.innerHTML = `
            ${termoBuscaClientes ? `🔍 "${termoBuscaClientes}" → ` : ''}
            <strong>${clientesFiltrados.length}</strong> de <strong>${clientes.length}</strong> clientes
        `;
    }

    // Atualizar total
    const totalEl = document.getElementById('totalClientes');
    if (totalEl) {
        totalEl.textContent = clientesFiltrados.length;
    }

    // Atualizar lista
    const tbody = document.getElementById('listaClientesTbody');
    if (!tbody) return;

    const isMobile = window.innerWidth < 768 || window.screen.width < 768;

    if (clientesFiltrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h4>Nenhum cliente encontrado</h4>
                        <p>Tente buscar por outro nome, telefone ou email</p>
                        <button class="btn btn-primary btn-sm" onclick="limparBuscaClientes()">
                            <i class="fas fa-undo"></i> Limpar Busca
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    if (isMobile) {
        for (let c of clientesFiltrados) {
            const isBloqueado = c.bloqueado_chatbot === 1;
            const telefone = c.telefone || '';
            const whatsappLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '#';
            const inicial = c.nome ? c.nome.charAt(0).toUpperCase() : '?';
            const cores = {
                vip: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#f59e0b' },
                frequente: { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', text: '#22c55e' },
                sumido: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444' },
                novo: { bg: 'rgba(102,126,234,0.15)', border: '#667eea', text: '#667eea' },
                regular: { bg: 'rgba(107,114,128,0.1)', border: '#6b7280', text: '#6b7280' }
            };
            const cor = cores[c.classificacao] || cores.regular;
            html += `
                <tr>
                    <td colspan="9">
                        <div style="background: var(--bg-card); border-radius: 16px; padding: 16px; border: 1px solid ${cor.border}; box-shadow: 0 2px 8px rgba(0,0,0,0.04); margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;">
                                    <div style="width:40px;height:40px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0;">${inicial}</div>
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-size:15px;font-weight:600;color:var(--text-primary);">
                                            ${escapeHtml(c.nome)}
                                            <span style="font-size:14px;">${c.icone}</span>
                                        </div>
                                        <div style="font-size:11px;color:var(--text-muted);">
                                            ${c.telefone ? `📱 ${escapeHtml(c.telefone)}` : 'Sem telefone'}
                                        </div>
                                    </div>
                                </div>
                                <span style="padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${cor.bg};color:${cor.text};border:1px solid ${cor.border};white-space:nowrap;">${c.icone} ${c.classificacao}</span>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;background:var(--bg-hover);border-radius:8px;padding:8px;margin:8px 0;">
                                <div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:var(--text-primary);">${c.total_concluidos}</div><div style="font-size:8px;color:var(--text-muted);">Atend.</div></div>
                                <div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:#22c55e;">R$ ${formatMoney(c.ticket_medio)}</div><div style="font-size:8px;color:var(--text-muted);">Ticket</div></div>
                                <div style="text-align:center;"><div style="font-size:16px;font-weight:700;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-primary)'};">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</div><div style="font-size:8px;color:var(--text-muted);">Última</div></div>
                            </div>
                            <div style="display:flex;gap:4px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--border-color);">
                                ${whatsappLink !== '#' ? `<a href="${whatsappLink}" target="_blank" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(37,211,102,0.3);background:var(--bg-hover);color:#25D366;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;flex:1;justify-content:center;text-decoration:none;"><i class="fab fa-whatsapp"></i></a>` : ''}
                                <button onclick="editarCliente(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(102,126,234,0.3);background:var(--bg-hover);color:var(--primary);font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-pen"></i></button>
                                <button onclick="verHistoricoCliente(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(139,92,246,0.3);background:var(--bg-hover);color:#8b5cf6;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-history"></i></button>
                                ${isBloqueado ? `<button onclick="desbloquearChatbot(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(34,197,94,0.3);background:var(--bg-hover);color:#22c55e;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-unlock"></i></button>` : `<button onclick="bloquearChatbot(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--bg-hover);color:#ef4444;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-lock"></i></button>`}
                                <button onclick="excluirCliente(${c.id})" style="padding:4px 12px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--bg-hover);color:#ef4444;font-size:11px;cursor:pointer;flex:1;"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
    } else {
        for (let c of clientesFiltrados) {
            const isBloqueado = c.bloqueado_chatbot === 1;
            const telefone = c.telefone || '';
            const whatsappLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '#';
            const cores = {
                vip: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
                frequente: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
                sumido: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
                novo: { bg: 'rgba(102,126,234,0.15)', text: '#667eea' },
                regular: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' }
            };
            const cor = cores[c.classificacao] || cores.regular;
            html += `
                <tr>
                    <td style="text-align:center;">${c.id}</td>
                    <td><strong>${escapeHtml(c.nome)}</strong> <span style="font-size:14px;">${c.icone}</span></td>
                    <td>${telefone ? `<div style="display:flex;align-items:center;gap:4px;">${escapeHtml(telefone)}<a href="${whatsappLink}" target="_blank" style="color:#25D366;text-decoration:none;"><i class="fab fa-whatsapp"></i></a></div>` : '-'}</td>
                    <td><span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${cor.bg};color:${cor.text};">${c.icone} ${c.classificacao}</span></td>
                    <td style="text-align:center;">${c.total_concluidos}</td>
                    <td style="text-align:center;font-weight:600;color:#22c55e;">R$ ${formatMoney(c.ticket_medio)}</td>
                    <td>${c.servicos_frequentes.slice(0, 2).map(s => `<span style="background:rgba(102,126,234,0.08);padding:1px 6px;border-radius:8px;font-size:10px;color:var(--text-secondary);display:inline-block;margin:1px;">${escapeHtml(s.nome)} (${s.count})</span>`).join('')}</td>
                    <td style="text-align:center;font-size:12px;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-muted)'};">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</td>
                    <td>
                        <div style="display:flex;gap:2px;flex-wrap:wrap;">
                            <button class="btn-icon btn-edit" onclick="editarCliente(${c.id})" title="Editar" style="padding:2px 6px;"><i class="fas fa-pen"></i></button>
                            <button class="btn-icon" onclick="verHistoricoCliente(${c.id})" title="Histórico" style="padding:2px 6px;color:#8b5cf6;"><i class="fas fa-history"></i></button>
                            ${isBloqueado ? `<button class="btn-icon btn-unblock" onclick="desbloquearChatbot(${c.id})" title="Liberar" style="padding:2px 6px;"><i class="fas fa-unlock"></i></button>` : `<button class="btn-icon btn-block" onclick="bloquearChatbot(${c.id})" title="Bloquear" style="padding:2px 6px;"><i class="fas fa-lock"></i></button>`}
                            <button class="btn-icon btn-delete" onclick="excluirCliente(${c.id})" title="Excluir" style="padding:2px 6px;"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
    }
}

// ============================================
// FILTROS DE CLIENTES
// ============================================

function setFiltroClientes(filtro) {
    filtroClientes = filtro;
    carregarClientes();
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
            showToast('📋 Este cliente ainda não tem agendamentos', 'info');
            return;
        }

        const cliente = clientesCompletos.find(c => c.id === id);

        let html = `
            <div id="modalHistorico" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-content" style="max-width: 600px; width: 100%; max-height: 80vh; overflow-y: auto; background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0;">📋 Histórico de ${escapeHtml(cliente?.nome || 'Cliente')}</h3>
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
                            <div style="font-size: 10px; color: var(--text-muted);">⏳ Pendentes</div>
                        </div>
                    </div>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${ags.sort((a, b) => new Date(b.data) - new Date(a.data)).map(a => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-size: 13px;">
                                <span>📅 ${formatarDataBr(a.data)} ${a.hora || ''}</span>
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
    console.log("🟡 abrirModalCliente chamada");

    const existingModal = document.getElementById('modalCliente');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="modalCliente" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
            <div class="modal-content" style="max-width: 450px; width: 100%; margin: 20px; padding: 25px; background: var(--bg-card); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: var(--text-primary);">➕ Novo Cliente</h3>
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

        console.log('📦 Dados a enviar:', dados);

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
        console.error("❌ Erro no fetch:", error);
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
        console.error('❌ Erro ao excluir:', error);
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
        console.error('❌ Erro ao bloquear:', error);
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
// 📱 IMPORTAÇÃO UNIVERSAL - CORRIGIDO PARA MOBILE
// ============================================

function abrirModalImportarCSV() {
    const isMobile = window.innerWidth < 768 || window.screen.width < 768;

    const modalHtml = `
        <div id="modalImportarCSV" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
            <div class="modal-content" style="
                max-width: 500px; 
                width: 100%; 
                background: var(--bg-card); 
                border-radius: 16px; 
                padding: ${isMobile ? '16px' : '24px'}; 
                box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                        <i class="fas fa-address-book" style="color: #22c55e;"></i>
                        Importar Contatos
                    </h3>
                    <button onclick="fecharModalImportarCSV()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted); line-height: 1; padding: 0 8px;">&times;</button>
                </div>
                
                <!-- Área de upload melhorada para mobile -->
                <div id="dropArea" style="
                    border: 2px dashed var(--border-color); 
                    border-radius: 12px; 
                    padding: ${isMobile ? '20px' : '30px'}; 
                    text-align: center; 
                    margin-bottom: 16px; 
                    background: var(--bg-hover);
                    transition: all 0.3s ease;
                    cursor: pointer;
                " onclick="document.getElementById('csvFileInputMobile').click()">
                    
                    <i class="fas fa-cloud-upload-alt" style="font-size: ${isMobile ? '32px' : '48px'}; color: var(--primary); margin-bottom: 8px;"></i>
                    
                    <p style="margin: 8px 0; color: var(--text-secondary); font-weight: 600; font-size: ${isMobile ? '14px' : '16px'};">
                        📂 Toque para selecionar
                    </p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                        Suporta: <strong>.CSV</strong> ou <strong>.VCF</strong> (iPhone/Android)
                    </p>
                    
                    <!-- 🔥 INPUT MOBILE MELHORADO -->
                    <input 
                        type="file" 
                        id="csvFileInputMobile" 
                        accept=".csv,.vcf,.txt,text/csv,text/vcard,text/x-vcard" 
                        style="display: none;" 
                        onchange="handleFileSelectMobile(this)"
                    >
                    
                    <button type="button" onclick="event.stopPropagation(); document.getElementById('csvFileInputMobile').click();" class="btn btn-success" style="
                        padding: 10px 24px; 
                        border-radius: 10px; 
                        border: none; 
                        background: linear-gradient(135deg, #22c55e, #16a34a); 
                        color: white; 
                        font-weight: 600; 
                        font-size: 14px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        box-shadow: 0 4px 16px rgba(34,197,94,0.25);
                        width: ${isMobile ? '100%' : 'auto'};
                        justify-content: center;
                    ">
                        <i class="fas fa-file-import"></i> Escolher Arquivo
                    </button>
                </div>

                <!-- Dica Mobile -->
                <div style="
                    background: rgba(102,126,234,0.08); 
                    padding: 12px; 
                    border-radius: 8px; 
                    font-size: 12px; 
                    color: var(--text-secondary); 
                    margin-bottom: 16px;
                    border-left: 3px solid var(--primary);
                ">
                    <strong>📱 No iPhone:</strong> 
                    Ajustes > Contatos > Exportar Contatos 
                    <span style="display:block;margin-top:4px;font-size:11px;color:var(--text-muted);">
                        Ou acesse <strong>contatos.icloud.com</strong> para exportar
                    </span>
                </div>

                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="fecharModalImportarCSV()" style="
                        padding: 8px 24px; 
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
                </div>

                <!-- Status de processamento -->
                <div id="statusImportacao" style="display:none; margin-top: 12px; padding: 12px; border-radius: 8px; background: var(--bg-hover);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="spinner-border spinner-border-sm" role="status" style="color:var(--primary);"></div>
                        <span style="font-size:13px;color:var(--text-secondary);" id="statusImportacaoTexto">Processando arquivo...</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('modalImportarCSV');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 🔥 CORRIGIR: Fechar modal ao clicar fora (mobile-friendly)
    const modal = document.getElementById('modalImportarCSV');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                fecharModalImportarCSV();
            }
        });
    }
}

function fecharModalImportarCSV() {
    const modal = document.getElementById('modalImportarCSV');
    if (modal) modal.remove();
}

// 🔥 NOVA FUNÇÃO PARA MOBILE - MANIPULA ARQUIVO CORRETAMENTE
function handleFileSelectMobile(input) {
    console.log('📁 Arquivo selecionado (mobile):', input.files);

    if (input.files && input.files[0]) {
        const file = input.files[0];
        console.log('📄 Nome:', file.name);
        console.log('📄 Tamanho:', file.size, 'bytes');
        console.log('📄 Tipo:', file.type);

        processarArquivoContatosMobile(file);
    } else {
        console.warn('⚠️ Nenhum arquivo selecionado');
        showToast('⚠️ Nenhum arquivo selecionado', 'warning');
    }
}

// 🔥 FUNÇÃO DE PROCESSAMENTO MOBILE
async function processarArquivoContatosMobile(file) {
    console.log('🔄 Processando arquivo:', file.name);

    const statusDiv = document.getElementById('statusImportacao');
    const statusTexto = document.getElementById('statusImportacaoTexto');

    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusTexto.textContent = '📖 Lendo arquivo...';
    }

    showLoading();

    try {
        // 🔥 LER COMO TEXTO COM ENCODING CORRETO
        const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            // Tenta UTF-8 primeiro, depois fallback para Latin-1
            reader.readAsText(file, 'UTF-8');
        });

        console.log('✅ Arquivo lido com sucesso!');
        console.log('📄 Primeiros 200 caracteres:', content.substring(0, 200));

        if (statusTexto) {
            statusTexto.textContent = '🔍 Analisando contatos...';
        }

        let clientesParaImportar = [];

        const fileName = file.name.toLowerCase();

        // DETECTA FORMATO
        if (fileName.endsWith('.vcf') || content.trim().toUpperCase().startsWith('BEGIN:VCARD')) {
            clientesParaImportar = parseVCFMobile(content);
        } else {
            clientesParaImportar = parseCSVMobile(content);
        }

        console.log(`📊 Encontrados ${clientesParaImportar.length} contatos`);

        hideLoading();

        if (statusDiv) {
            statusDiv.style.display = 'none';
        }

        if (clientesParaImportar.length === 0) {
            showToast('⚠️ Nenhum contato válido encontrado no arquivo.', 'warning');
            return;
        }

        // Mostra preview dos primeiros contatos
        const preview = clientesParaImportar.slice(0, 5).map(c => `${c.nome} (${c.telefone || 'sem telefone'})`).join('\n');

        if (!confirm(`📊 Encontrados ${clientesParaImportar.length} contatos.\n\nPrimeiros:\n${preview}\n\nDeseja importar para o CRM?`)) {
            return;
        }

        if (statusTexto) {
            statusTexto.textContent = '💾 Salvando contatos...';
        }

        await salvarLoteClientesMobile(clientesParaImportar);

    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', error);
        hideLoading();

        if (statusDiv) {
            statusDiv.style.display = 'none';
        }

        showToast('❌ Erro ao ler o arquivo. Verifique o formato.', 'error');
    }
}

// 🔥 PARSER VCF MELHORADO PARA MOBILE
function parseVCFMobile(content) {
    console.log('🔍 Parseando VCF...');

    const lines = content.split(/\r\n|\n|\r/);
    const contacts = [];
    let currentContact = {};
    let inVCard = false;

    for (let line of lines) {
        line = line.trim();

        if (line.startsWith('BEGIN:VCARD')) {
            inVCard = true;
            currentContact = { nome: '', telefone: '', email: '' };
            continue;
        }

        if (line.startsWith('END:VCARD')) {
            inVCard = false;
            // Só adiciona se tiver nome OU telefone
            if (currentContact.nome || currentContact.telefone) {
                // Se tiver telefone mas não nome, usa "Contato"
                if (!currentContact.nome && currentContact.telefone) {
                    currentContact.nome = 'Contato';
                }
                contacts.push({ ...currentContact });
            }
            continue;
        }

        if (!inVCard) continue;

        // Nome completo
        if (line.startsWith('FN:')) {
            let nome = line.substring(3).trim();
            // Remove caracteres estranhos
            nome = nome.replace(/[^\w\sÀ-ú]/g, ' ').trim();
            if (nome) currentContact.nome = nome;
        }

        // Nome estruturado (fallback)
        if (line.startsWith('N;') || line.startsWith('N:')) {
            if (!currentContact.nome) {
                const parts = line.split(':')[1]?.split(';') || [];
                // Formato: Sobrenome;Nome;Meio;Prefix;Sufixo
                let nome = parts[1] || '';
                let sobrenome = parts[0] || '';
                if (nome || sobrenome) {
                    currentContact.nome = (nome + ' ' + sobrenome).trim();
                }
            }
        }

        // Telefone
        if (line.startsWith('TEL') || line.startsWith('TEL;')) {
            if (!currentContact.telefone) {
                // Pega tudo depois do último ':'
                const telPart = line.split(':');
                if (telPart.length > 1) {
                    let tel = telPart.slice(1).join(':').trim();
                    // Remove caracteres não numéricos (exceto +)
                    tel = tel.replace(/[^\d+]/g, '');
                    // Remove '+' se tiver, deixa só números
                    tel = tel.replace(/\+/g, '');
                    // Se tiver código de país 55, mantém
                    if (tel.startsWith('55') && tel.length > 10) {
                        tel = tel.substring(2);
                    }
                    currentContact.telefone = tel;
                }
            }
        }

        // Email
        if (line.startsWith('EMAIL') || line.startsWith('EMAIL;')) {
            if (!currentContact.email) {
                const emailPart = line.split(':');
                if (emailPart.length > 1) {
                    currentContact.email = emailPart.slice(1).join(':').trim();
                }
            }
        }
    }

    // Filtra contatos duplicados (mesmo telefone)
    const seen = new Set();
    const uniqueContacts = contacts.filter(c => {
        const key = c.telefone || c.email || c.nome;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    console.log(`✅ Parseados ${uniqueContacts.length} contatos VCF`);
    return uniqueContacts;
}

// 🔥 PARSER CSV MELHORADO
function parseCSVMobile(content) {
    console.log('🔍 Parseando CSV...');

    const lines = content.split('\n');
    const contacts = [];

    // Tenta detectar separador e cabeçalho
    let separator = ',';
    if (content.includes(';')) separator = ';';
    if (content.includes('\t')) separator = '\t';

    // Detecta se tem cabeçalho
    let startIndex = 0;
    const firstLine = lines[0]?.toLowerCase() || '';
    if (firstLine.includes('nome') || firstLine.includes('name') ||
        firstLine.includes('telefone') || firstLine.includes('phone') ||
        firstLine.includes('email') || firstLine.includes('e-mail')) {
        startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Divide por separador detectado
        const cols = line.split(separator).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 1) {
            // Detecta colunas
            let nome = cols[0] || '';
            let telefone = (cols.length > 1) ? cols[1] : '';
            let email = (cols.length > 2) ? cols[2] : '';

            // Se tem só uma coluna, tenta extrair nome e telefone
            if (cols.length === 1 && cols[0].includes(' - ')) {
                const parts = cols[0].split(' - ');
                nome = parts[0].trim();
                telefone = parts[1]?.trim() || '';
            }

            // Limpa telefone
            telefone = telefone.replace(/[^\d+]/g, '').replace(/\+/g, '');

            if (nome || telefone) {
                if (!nome) nome = 'Contato';
                contacts.push({
                    nome: nome,
                    telefone: telefone || '',
                    email: email || ''
                });
            }
        }
    }

    console.log(`✅ Parseados ${contacts.length} contatos CSV`);
    return contacts;
}

// 🔥 SALVAMENTO EM LOTE - MOBILE
async function salvarLoteClientesMobile(lista) {
    showLoading();
    const token = localStorage.getItem('token');
    let successCount = 0;
    let errorCount = 0;
    let total = lista.length;

    // Processa em lotes menores (5 por vez) para não travar o servidor
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < lista.length; i += batchSize) {
        batches.push(lista.slice(i, i + batchSize));
    }

    const statusTexto = document.getElementById('statusImportacaoTexto');
    let processed = 0;

    for (let batch of batches) {
        // Processa cada lote em paralelo
        const promises = batch.map(async (cliente) => {
            // Validação mínima
            if (!cliente.nome && !cliente.telefone) return;

            try {
                const res = await fetch('/api/clientes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        nome: cliente.nome || 'Contato',
                        telefone: cliente.telefone || '',
                        email: cliente.email || ''
                    })
                });

                const data = await res.json();
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (err) {
                errorCount++;
                console.error('❌ Erro ao salvar:', err);
            }
        });

        await Promise.all(promises);
        processed += batch.length;

        // Atualiza status
        if (statusTexto) {
            statusTexto.textContent = `💾 Salvando... ${processed}/${total} (${successCount} OK, ${errorCount} erros)`;
        }
    }

    hideLoading();
    fecharModalImportarCSV();

    if (successCount > 0) {
        showToast(`✅ ${successCount} contatos importados! ${errorCount > 0 ? `⚠️ ${errorCount} erros` : ''}`, errorCount > 0 ? 'warning' : 'success');
        // Recarrega a lista
        await carregarClientes();
    } else {
        showToast('❌ Falha na importação. Verifique sua conexão.', 'error');
    }
}

// ============================================
// 📱 ENVIO DE PROMOÇÕES VIA WHATSAPP (COM SELEÇÃO DE CLIENTES)
// ============================================

let promocaoEmAndamento = false;

function abrirModalPromocao() {
    const isMobile = window.innerWidth < 768 || window.screen.width < 768;

    // Contar clientes com WhatsApp
    const clientesComWhatsApp = clientesCompletos.filter(c => c.telefone && c.telefone.trim() !== '');

    if (clientesComWhatsApp.length === 0) {
        showToast('⚠️ Nenhum cliente com WhatsApp cadastrado', 'warning');
        return;
    }

    // Gerar lista de clientes com checkbox
    let listaClientesHTML = '';
    const exibirClientes = clientesComWhatsApp.slice(0, 50);

    for (let c of exibirClientes) {
        const classificacaoIcon = c.classificacao === 'vip' ? '⭐' :
            c.classificacao === 'frequente' ? '🔥' :
                c.classificacao === 'sumido' ? '😴' : '👤';
        listaClientesHTML += `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-color);">
                <input type="checkbox" id="cliente_${c.id}" value="${c.id}" checked style="width:16px;height:16px;cursor:pointer;">
                <label for="cliente_${c.id}" style="flex:1;cursor:pointer;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
                    <span>
                        ${classificacaoIcon} ${escapeHtml(c.nome)}
                        <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">${c.telefone}</span>
                    </span>
                    <span style="font-size:10px;color:var(--text-muted);background:var(--bg-hover);padding:0 8px;border-radius:8px;">
                        ${c.total_concluidos} atend.
                    </span>
                </label>
            </div>
        `;
    }

    const totalClientes = clientesComWhatsApp.length;
    const mostrarMais = totalClientes > 50 ? `<span style="font-size:11px;color:var(--text-muted);">+ ${totalClientes - 50} outros clientes</span>` : '';

    const modalHtml = `
        <div id="modalPromocao" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
            <div class="modal-content" style="
                max-width: 600px; 
                width: 100%; 
                max-height: 90vh; 
                overflow-y: auto; 
                background: var(--bg-card); 
                border-radius: 16px; 
                padding: ${isMobile ? '16px' : '24px'}; 
                box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                        <i class="fas fa-bullhorn" style="color: #25D366;"></i>
                        Disparar Promoção
                    </h3>
                    <button onclick="fecharModalPromocao()" style="
                        background: none; 
                        border: none; 
                        font-size: 28px; 
                        cursor: pointer; 
                        color: var(--text-muted);
                        line-height: 1;
                        padding: 0 8px;
                    ">&times;</button>
                </div>

                <div style="background: rgba(37,211,102,0.08); border-radius: 10px; padding: 12px; margin-bottom: 16px; border: 1px solid rgba(37,211,102,0.15);">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <span style="color: var(--text-muted); font-size: 13px;">
                            📱 <strong>${totalClientes}</strong> clientes com WhatsApp
                        </span>
                        <span style="color: var(--text-muted); font-size: 13px;">
                            ⏱️ Aprox. <strong>${Math.ceil(totalClientes * 3 / 60)}</strong> minuto(s)
                        </span>
                    </div>
                </div>

                <form id="formPromocao" onsubmit="event.preventDefault(); enviarPromocao();" style="display:flex;flex-direction:column;gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                            📝 Mensagem da Promoção
                        </label>
                        <textarea id="mensagemPromocao" class="form-control" rows="4" required style="
                            width:100%; 
                            padding:10px 12px; 
                            border-radius:8px; 
                            border:1px solid var(--border-color); 
                            background:var(--bg-input); 
                            color:var(--text-primary); 
                            font-size:14px;
                            resize: vertical;
                            min-height: 100px;
                        " placeholder="Digite a mensagem da promoção...">🎉 OFERTA ESPECIAL! 🎉

Venha aproveitar nossa promoção imperdível!

📍 Agende já pelo nosso WhatsApp!
📱 (11) 99999-9999

⚠️ Vagas limitadas!</textarea>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                                ⏱️ Delay entre mensagens (segundos)
                            </label>
                            <input type="number" id="delayPromocao" class="form-control" value="3" min="2" max="10" style="
                                width:100%; 
                                padding:8px 10px; 
                                border-radius:8px; 
                                border:1px solid var(--border-color); 
                                background:var(--bg-input); 
                                color:var(--text-primary); 
                                font-size:14px;
                            ">
                            <small style="color:var(--text-muted);font-size:10px;">Recomendado: 3-5 segundos</small>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">
                                👥 Filtro rápido
                            </label>
                            <select id="filtroPromocao" class="form-control" onchange="filtrarClientesPromocao()" style="
                                width:100%; 
                                padding:8px 10px; 
                                border-radius:8px; 
                                border:1px solid var(--border-color); 
                                background:var(--bg-input); 
                                color:var(--text-primary); 
                                font-size:14px;
                            ">
                                <option value="todos">📊 Todos</option>
                                <option value="vip">⭐ VIP</option>
                                <option value="frequentes">🔥 Frequentes</option>
                                <option value="sumidos">😴 Sumidos</option>
                            </select>
                        </div>
                    </div>

                    <!-- 🔥 LISTA DE CLIENTES COM CHECKBOX -->
                    <div style="
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        padding: 8px;
                        max-height: 200px;
                        overflow-y: auto;
                        background: var(--bg-hover);
                    ">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border-color);">
                            <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">
                                👥 Selecionar clientes
                            </span>
                            <div style="display:flex;gap:8px;">
                                <button type="button" onclick="selecionarTodosClientes(true)" style="
                                    font-size:11px;
                                    padding:2px 10px;
                                    border-radius:4px;
                                    border:1px solid var(--border-color);
                                    background:var(--bg-input);
                                    color:var(--text-secondary);
                                    cursor:pointer;
                                ">
                                    Todos
                                </button>
                                <button type="button" onclick="selecionarTodosClientes(false)" style="
                                    font-size:11px;
                                    padding:2px 10px;
                                    border-radius:4px;
                                    border:1px solid var(--border-color);
                                    background:var(--bg-input);
                                    color:var(--text-secondary);
                                    cursor:pointer;
                                ">
                                    Nenhum
                                </button>
                            </div>
                        </div>
                        <div id="listaClientesPromocao">
                            ${listaClientesHTML}
                            ${mostrarMais}
                        </div>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:-4px;">
                        <span id="contadorSelecionados">${totalClientes}</span> clientes selecionados
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <button type="button" onclick="fecharModalPromocao()" style="
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
                        <button type="submit" id="btnEnviarPromocao" style="
                            padding: 10px 28px; 
                            border-radius: 8px; 
                            border: none; 
                            background: linear-gradient(135deg, #25D366, #128C7E); 
                            color: white; 
                            font-size: 14px; 
                            font-weight: 600; 
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                            box-shadow: 0 4px 16px rgba(37,211,102,0.3);
                            transition: all 0.3s ease;
                            width: ${isMobile ? '100%' : 'auto'};
                            justify-content: center;
                        ">
                            <i class="fab fa-whatsapp"></i> Enviar Promoção
                        </button>
                    </div>
                </form>

                <!-- Progresso -->
                <div id="progressoPromocao" style="display: none; margin-top: 16px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
                        <span id="progressoTexto">Enviando 0/0...</span>
                        <span id="progressoPorcentagem">0%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--bg-hover); border-radius: 4px; overflow: hidden; margin-top: 4px;">
                        <div id="progressoBarra" style="height: 100%; width: 0%; background: linear-gradient(90deg, #25D366, #128C7E); border-radius: 4px; transition: width 0.5s;"></div>
                    </div>
                    <div id="progressoStatus" style="margin-top: 8px; font-size: 12px; color: var(--text-muted);"></div>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('modalPromocao');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Atualizar contador inicial
    atualizarContadorSelecionados();
}

// ============================================
// FUNÇÕES AUXILIARES DA PROMOÇÃO
// ============================================

function fecharModalPromocao() {
    const modal = document.getElementById('modalPromocao');
    if (modal) modal.remove();
    promocaoEmAndamento = false;
}

function selecionarTodosClientes(selecionar) {
    const checkboxes = document.querySelectorAll('#listaClientesPromocao input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = selecionar;
    });
    atualizarContadorSelecionados();
}

function atualizarContadorSelecionados() {
    const checkboxes = document.querySelectorAll('#listaClientesPromocao input[type="checkbox"]');
    const selecionados = Array.from(checkboxes).filter(cb => cb.checked).length;
    const contador = document.getElementById('contadorSelecionados');
    if (contador) {
        contador.textContent = selecionados;
    }
}

function filtrarClientesPromocao() {
    const filtro = document.getElementById('filtroPromocao').value;
    const container = document.getElementById('listaClientesPromocao');
    const checkboxes = container.querySelectorAll('div');

    for (let item of checkboxes) {
        const label = item.querySelector('label');
        if (!label) continue;

        const texto = label.textContent.toLowerCase();
        let mostrar = true;

        if (filtro === 'vip' && !texto.includes('⭐')) {
            mostrar = false;
        } else if (filtro === 'frequentes' && !texto.includes('🔥')) {
            mostrar = false;
        } else if (filtro === 'sumidos' && !texto.includes('😴')) {
            mostrar = false;
        }

        item.style.display = mostrar ? 'flex' : 'none';
    }

    setTimeout(atualizarContadorSelecionados, 100);
}

// ============================================
// ENVIAR PROMOÇÃO (COM SELEÇÃO)
// ============================================

async function enviarPromocao() {
    if (promocaoEmAndamento) {
        showToast('⏳ Já está enviando... aguarde', 'warning');
        return;
    }

    const mensagem = document.getElementById('mensagemPromocao').value.trim();
    const delay = parseInt(document.getElementById('delayPromocao').value) || 3;

    if (!mensagem) {
        showToast('⚠️ Digite uma mensagem', 'warning');
        return;
    }

    const checkboxes = document.querySelectorAll('#listaClientesPromocao input[type="checkbox"]:checked');
    const idsSelecionados = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (idsSelecionados.length === 0) {
        showToast('⚠️ Selecione pelo menos um cliente', 'warning');
        return;
    }

    const clientesAlvo = clientesCompletos.filter(c =>
        idsSelecionados.includes(c.id) && c.telefone && c.telefone.trim() !== ''
    );

    if (clientesAlvo.length === 0) {
        showToast('⚠️ Nenhum cliente válido selecionado', 'warning');
        return;
    }

    if (!confirm(`Enviar promoção para ${clientesAlvo.length} cliente(s)?`)) {
        return;
    }

    promocaoEmAndamento = true;
    const btn = document.getElementById('btnEnviarPromocao');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const progressoDiv = document.getElementById('progressoPromocao');
    progressoDiv.style.display = 'block';

    const progressoTexto = document.getElementById('progressoTexto');
    const progressoBarra = document.getElementById('progressoBarra');
    const progressoPorcentagem = document.getElementById('progressoPorcentagem');
    const progressoStatus = document.getElementById('progressoStatus');

    const token = localStorage.getItem('token');
    let enviados = 0;
    let erros = 0;
    const total = clientesAlvo.length;

    for (let i = 0; i < clientesAlvo.length; i++) {
        const cliente = clientesAlvo[i];
        const telefone = cliente.telefone.replace(/\D/g, '');

        const progresso = Math.round(((i + 1) / total) * 100);
        progressoTexto.textContent = `Enviando ${i + 1}/${total}...`;
        progressoBarra.style.width = progresso + '%';
        progressoPorcentagem.textContent = progresso + '%';
        progressoStatus.textContent = `📱 ${cliente.nome} (${telefone})`;

        try {
            const response = await fetch('/api/whatsapp/enviar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    numero: telefone,
                    mensagem: mensagem
                })
            });

            const result = await response.json();

            if (result.success) {
                enviados++;
            } else {
                erros++;
                console.warn('⚠️ Erro ao enviar para', cliente.nome, result.message);
            }

        } catch (error) {
            erros++;
            console.error('❌ Erro ao enviar para', cliente.nome, error);
        }

        if (i < clientesAlvo.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
    }

    progressoStatus.textContent = `✅ Concluído! ${enviados} enviados, ${erros} erros.`;
    btn.disabled = false;
    btn.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar Promoção';
    promocaoEmAndamento = false;

    showToast(`✅ ${enviados} mensagens enviadas! ${erros > 0 ? `⚠️ ${erros} erros` : ''}`, erros > 0 ? 'warning' : 'success');

    setTimeout(() => {
        fecharModalPromocao();
    }, 5000);
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarClientes = carregarClientes;
window.buscarClientes = buscarClientes;
window.limparBuscaClientes = limparBuscaClientes;
window.setFiltroClientes = setFiltroClientes;
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
window.handleFileSelectMobile = handleFileSelectMobile;
window.processarArquivoContatosMobile = processarArquivoContatosMobile;
window.parseVCFMobile = parseVCFMobile;
window.parseCSVMobile = parseCSVMobile;

// Funções de Promoção
window.abrirModalPromocao = abrirModalPromocao;
window.fecharModalPromocao = fecharModalPromocao;
window.enviarPromocao = enviarPromocao;
window.selecionarTodosClientes = selecionarTodosClientes;
window.atualizarContadorSelecionados = atualizarContadorSelecionados;
window.filtrarClientesPromocao = filtrarClientesPromocao;

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