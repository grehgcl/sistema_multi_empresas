// ============================================
// CLIENTES.JS - CRM OTIMIZADO (RENDERIZAÇÃO EM BATCHES)
// ULTIMA ATUALIZACAO: 22/08/2026
// ============================================

// ============================================
// FUNÇÕES DE COMPATIBILIDADE
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
    try {
        const d = new Date(data + 'T00:00:00');
        return d.toLocaleDateString('pt-BR');
    } catch {
        return data;
    }
}

function limparNome(nome) {
    if (!nome) return 'Contato';
    let limpo = String(nome)
        .replace(/[^\w\sÀ-ú]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[0-9]/g, '')
        .trim();
    if (!limpo || limpo.length < 2) return 'Contato';
    return limpo.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

function limparTelefone(telefone) {
    if (!telefone) return '';
    return String(telefone).replace(/\D/g, '');
}

// ============================================
// CONFIGURAÇÕES DE PERFORMANCE
// ============================================

const PERFORMANCE_CONFIG = {
    BATCH_SIZE: 100,
    DEBOUNCE_MS: 300,
    RENDER_DELAY: 50
};

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let clientesCompletos = [];
let clientesFiltradosCache = [];
let filtroClientes = 'todos';
let filtroGrupo = 'todos';
let termoBuscaClientes = '';
let letraSelecionada = '';
let promocaoEmAndamento = false;
let carregandoClientes = false;
let gruposClientes = [];
let clienteEditandoGrupos = null;
let gruposSelecionadosTemp = [];
let timeoutBusca = null;
let envioLock = false;
let carregandoBackground = false;
let clientesAgendamentosCache = {};
let renderTimeout = null;
let clienteObserver = null;

// ============================================
// PREVENIR RECARREGAMENTOS NO MOBILE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('buscaClientesInput');
    if (input) {
        input.addEventListener('focus', e => e.stopPropagation(), { passive: true });
        input.addEventListener('click', e => e.stopPropagation(), { passive: true });
        input.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    }
});

// ============================================
// CARREGAR GRUPOS DO CLIENTE
// ============================================

async function carregarGruposCliente(clienteId) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/clientes/${clienteId}/grupos`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        return data.data || [];
    } catch (error) {
        console.error('❌ Erro ao carregar grupos:', error);
        return [];
    }
}

// ============================================
// CARREGAR CLIENTES (PRINCIPAL) - COM CSS
// ============================================

async function carregarClientes() {
    // 🔥 CARREGAR CSS - FORÇADO
    const cssLink = document.querySelector('link[href*="clientes.css"]');
    if (!cssLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/css/pages/clientes.css';
        document.head.appendChild(link);
        console.log('✅ CSS clientes.css carregado!');
    }

    if (carregandoClientes) {
        console.log("⏳ Já está carregando clientes, aguarde...");
        return;
    }

    console.log("🟢 carregarClientes chamada (CRM)");
    carregandoClientes = true;
    ativarBotao('clientes');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        if (!token) {
            console.error("❌ Token não encontrado!");
            showToast('Sessão expirada. Faça login novamente.', 'error');
            carregandoClientes = false;
            hideLoading();
            return;
        }

        const [resClientes, resAgendamentos, resGrupos] = await Promise.all([
            fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/agendamentos?limit=500', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/clientes/grupos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!resClientes.ok) {
            throw new Error('Erro ao buscar clientes');
        }

        const dataClientes = await resClientes.json();
        const dataAgendamentos = resAgendamentos.ok ? await resAgendamentos.json() : { data: [] };
        const dataGrupos = resGrupos.ok ? await resGrupos.json() : { data: { clientes: [], grupos: [] } };

        const clientes = dataClientes.data || [];
        const agendamentos = dataAgendamentos.data || [];

        const agendamentosPorCliente = new Map();
        for (const a of agendamentos) {
            if (!agendamentosPorCliente.has(a.cliente_id)) {
                agendamentosPorCliente.set(a.cliente_id, []);
            }
            agendamentosPorCliente.get(a.cliente_id).push(a);
        }

        clientesCompletos = clientes.map(cliente => {
            const ags = agendamentosPorCliente.get(cliente.id) || [];
            const agsConcluidos = ags.filter(a => a.status === 'concluido');
            const agsPendentes = ags.filter(a => a.status === 'pendente' || a.status === 'agendado');

            let valorTotal = 0;
            for (const a of agsConcluidos) {
                valorTotal += parseFloat(a.valor_total) || parseFloat(a.valor) || 0;
            }

            const ticketMedio = agsConcluidos.length > 0 ? valorTotal / agsConcluidos.length : 0;

            let ultimaVisita = null;
            let diasDesdeUltima = null;
            if (agsConcluidos.length > 0) {
                const datas = agsConcluidos.map(a => new Date(a.data + 'T00:00:00'));
                ultimaVisita = new Date(Math.max(...datas));
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const diffTime = hoje - ultimaVisita;
                diasDesdeUltima = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            let classificacao = 'regular';
            let icone = '👤';

            if (agsConcluidos.length >= 10 && valorTotal >= 500) {
                classificacao = 'vip';
                icone = '⭐';
            } else if (agsConcluidos.length >= 5) {
                classificacao = 'frequente';
                icone = '🔥';
            } else if (diasDesdeUltima !== null && diasDesdeUltima > 60) {
                classificacao = 'sumido';
                icone = '😴';
            } else if (agsConcluidos.length <= 1) {
                classificacao = 'novo';
                icone = '🌱';
            }

            let grupos = [];
            if (cliente.grupos) {
                try {
                    grupos = typeof cliente.grupos === 'string' ? JSON.parse(cliente.grupos) : cliente.grupos;
                } catch (e) {
                    grupos = [];
                }
            }

            return {
                id: cliente.id,
                nome: cliente.nome || 'Cliente',
                telefone: cliente.telefone || '',
                email: cliente.email || '',
                grupos: grupos,
                bloqueado_chatbot: cliente.bloqueado_chatbot || 0,
                dias_bloqueio: cliente.dias_bloqueio || null,
                created_at: cliente.created_at,
                total_agendamentos: ags.length,
                total_concluidos: agsConcluidos.length,
                pendentes: agsPendentes.length,
                valor_total: valorTotal,
                ticket_medio: ticketMedio,
                ultima_visita: ultimaVisita,
                dias_sem_visita: diasDesdeUltima,
                classificacao: classificacao,
                icone: icone
            };
        });

        clientesCompletos.sort((a, b) => b.total_concluidos - a.total_concluidos);

        const gruposSet = new Set();
        for (const c of clientesCompletos) {
            if (c.grupos && Array.isArray(c.grupos)) {
                for (const g of c.grupos) {
                    if (g) gruposSet.add(g);
                }
            }
        }
        gruposClientes = Array.from(gruposSet).sort();

        renderizarClientesOtimizado(clientesCompletos);

        console.log(`✅ ${clientesCompletos.length} clientes carregados`);

    } catch (error) {
        console.error("❌ Erro ao carregar clientes:", error);
        document.getElementById('content').innerHTML = `
            <div class="card" style="padding: 20px;">
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                    <h4 style="font-size: 14px; margin: 8px 0;">Erro ao carregar clientes</h4>
                    <p style="font-size: 12px; color: var(--text-muted);">${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarClientes()" style="font-size: 11px; padding: 4px 12px; margin-top: 8px;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    carregandoClientes = false;
    hideLoading();
}

// ============================================
// CARREGAR CLIENTES EM BACKGROUND
// ============================================

async function carregarClientesBackground() {
    if (carregandoBackground) return;
    carregandoBackground = true;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            carregandoBackground = false;
            return;
        }

        const [resClientes, resAgendamentos, resGrupos] = await Promise.all([
            fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/agendamentos?limit=500', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/clientes/grupos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!resClientes.ok) {
            carregandoBackground = false;
            return;
        }

        const dataClientes = await resClientes.json();
        const dataAgendamentos = resAgendamentos.ok ? await resAgendamentos.json() : { data: [] };
        const dataGrupos = resGrupos.ok ? await resGrupos.json() : { data: { clientes: [], grupos: [] } };

        const clientes = dataClientes.data || [];
        const agendamentos = dataAgendamentos.data || [];

        const agendamentosPorCliente = new Map();
        for (const a of agendamentos) {
            if (!agendamentosPorCliente.has(a.cliente_id)) {
                agendamentosPorCliente.set(a.cliente_id, []);
            }
            agendamentosPorCliente.get(a.cliente_id).push(a);
        }

        clientesCompletos = clientes.map(cliente => {
            const ags = agendamentosPorCliente.get(cliente.id) || [];
            const agsConcluidos = ags.filter(a => a.status === 'concluido');

            let valorTotal = 0;
            for (const a of agsConcluidos) {
                valorTotal += parseFloat(a.valor_total) || parseFloat(a.valor) || 0;
            }

            const ticketMedio = agsConcluidos.length > 0 ? valorTotal / agsConcluidos.length : 0;

            let ultimaVisita = null;
            let diasDesdeUltima = null;
            if (agsConcluidos.length > 0) {
                const datas = agsConcluidos.map(a => new Date(a.data + 'T00:00:00'));
                ultimaVisita = new Date(Math.max(...datas));
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const diffTime = hoje - ultimaVisita;
                diasDesdeUltima = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            let classificacao = 'regular';
            let icone = '👤';

            if (agsConcluidos.length >= 10 && valorTotal >= 500) {
                classificacao = 'vip';
                icone = '⭐';
            } else if (agsConcluidos.length >= 5) {
                classificacao = 'frequente';
                icone = '🔥';
            } else if (diasDesdeUltima !== null && diasDesdeUltima > 60) {
                classificacao = 'sumido';
                icone = '😴';
            } else if (agsConcluidos.length <= 1) {
                classificacao = 'novo';
                icone = '🌱';
            }

            let grupos = [];
            if (cliente.grupos) {
                try {
                    grupos = typeof cliente.grupos === 'string' ? JSON.parse(cliente.grupos) : cliente.grupos;
                } catch (e) {
                    grupos = [];
                }
            }

            return {
                id: cliente.id,
                nome: cliente.nome || 'Cliente',
                telefone: cliente.telefone || '',
                email: cliente.email || '',
                grupos: grupos,
                bloqueado_chatbot: cliente.bloqueado_chatbot || 0,
                dias_bloqueio: cliente.dias_bloqueio || null,
                created_at: cliente.created_at,
                total_agendamentos: ags.length,
                total_concluidos: agsConcluidos.length,
                valor_total: valorTotal,
                ticket_medio: ticketMedio,
                ultima_visita: ultimaVisita,
                dias_sem_visita: diasDesdeUltima,
                classificacao: classificacao,
                icone: icone
            };
        });

        clientesCompletos.sort((a, b) => b.total_concluidos - a.total_concluidos);

        const gruposSet = new Set();
        for (const c of clientesCompletos) {
            if (c.grupos && Array.isArray(c.grupos)) {
                for (const g of c.grupos) {
                    if (g) gruposSet.add(g);
                }
            }
        }
        gruposClientes = Array.from(gruposSet).sort();

        renderizarClientesOtimizado(clientesCompletos);

        console.log(`✅ Background: ${clientesCompletos.length} clientes atualizados`);

    } catch (error) {
        console.error('❌ Erro no background:', error);
    }

    carregandoBackground = false;
}

// ============================================
// RENDERIZAR CLIENTES OTIMIZADO (BATCHES) - CORRIGIDO
// ============================================

function renderizarClientesOtimizado(clientes) {
    const isMobile = window.innerWidth < 768;
    const content = document.getElementById('content');

    let clientesFiltrados = [...clientes];

    // Filtro por letra
    const letraSalva = localStorage.getItem('letraSelecionada') || '';
    if (letraSalva && letraSalva !== 'todos') {
        clientesFiltrados = clientesFiltrados.filter(c => 
            c.nome.toLowerCase().startsWith(letraSalva.toLowerCase())
        );
        letraSelecionada = letraSalva;
    }

    // Filtro por busca
    if (termoBuscaClientes && !isMobile) {
        const busca = termoBuscaClientes.toLowerCase().trim();
        clientesFiltrados = clientesFiltrados.filter(c => {
            const nomeMatch = c.nome.toLowerCase().includes(busca);
            const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(busca);
            const emailMatch = c.email && c.email.toLowerCase().includes(busca);
            return nomeMatch || telefoneMatch || emailMatch;
        });
    }

    // Filtro por classificação
    if (filtroClientes === 'vip') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'vip');
    } else if (filtroClientes === 'sumidos') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'sumido');
    } else if (filtroClientes === 'frequentes') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'frequente' || c.classificacao === 'vip');
    } else if (filtroClientes === 'novos') {
        clientesFiltrados = clientesFiltrados.filter(c => c.classificacao === 'novo');
    }

    // Filtro por grupo
    if (filtroGrupo !== 'todos') {
        clientesFiltrados = clientesFiltrados.filter(c =>
            c.grupos && Array.isArray(c.grupos) && c.grupos.includes(filtroGrupo)
        );
    }

    clientesFiltradosCache = clientesFiltrados;

    // Estatísticas
    const totalClientes = clientes.length;
    const vipCount = clientes.filter(c => c.classificacao === 'vip').length;
    const sumidosCount = clientes.filter(c => c.classificacao === 'sumido').length;
    const frequentesCount = clientes.filter(c => c.classificacao === 'frequente' || c.classificacao === 'vip').length;
    const novosCount = clientes.filter(c => c.classificacao === 'novo').length;
    const comWhatsApp = clientes.filter(c => c.telefone && c.telefone.trim() !== '').length;

    // ==========================================
    // HTML
    // ==========================================
    let html = `<div class="fade-in" style="padding-bottom: 80px;">`;

    // 🔥 HEADER - COM BOTÕES MOBILE MAIORES
    html += `
        <div class="dashboard-header" style="${isMobile ? 'flex-direction:column;align-items:stretch;gap:8px;' : ''}">
            <div>
                <h2 class="page-title" style="font-size: ${isMobile ? '20px' : '24px'};">👥 Clientes</h2>
                ${!isMobile ? `<p class="page-subtitle"><i class="fas fa-users"></i> Gerencie seus clientes e acompanhe métricas importantes</p>` : ''}
            </div>
            <div class="dashboard-actions" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; ${isMobile ? 'width:100%;' : ''}">
                ${!isMobile ? `
                <div style="display: flex; align-items: center; gap: 4px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; padding: 2px 4px; flex: 1; min-width: 100px;">
                    <input type="text" id="buscaClientesInput" 
                           placeholder="🔍 Buscar por nome..." 
                           style="border: none; background: transparent; padding: 6px 8px; font-size: 12px; width: 100%; outline: none; color: var(--text-primary);"
                           oninput="buscarClientes()"
                           onsearch="buscarClientes()"
                           autocomplete="off"
                           value="${escapeHtml(termoBuscaClientes)}"
                           enterkeyhint="search">
                    <button onclick="limparBuscaClientes();" 
                            style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 8px; font-size: 14px; display: ${termoBuscaClientes ? 'block' : 'none'};" 
                            id="btnLimparBusca">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
                ` : ''}
                
                <!-- 🔥 BOTÃO PROMOÇÃO - MAIOR NO MOBILE -->
                <button class="btn btn-whatsapp" onclick="abrirModalPromocao()" style="
                    background: linear-gradient(135deg, #25D366, #128C7E); 
                    color: white; 
                    padding: ${isMobile ? '12px 18px' : '6px 14px'}; 
                    border-radius: ${isMobile ? '12px' : '8px'}; 
                    border: none; 
                    font-weight: 700; 
                    cursor: pointer; 
                    display: inline-flex; 
                    align-items: center; 
                    justify-content: center;
                    gap: 8px; 
                    font-size: ${isMobile ? '15px' : '13px'};
                    ${isMobile ? 'flex: 1; min-height: 48px; width: 100%;' : ''}
                    box-shadow: 0 4px 12px rgba(37,211,102,0.35);
                    transition: all 0.3s ease;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
                onmousedown="this.style.transform='scale(0.95)'"
                onmouseup="this.style.transform='scale(1.02)'"
                >
                    <i class="fas fa-bullhorn" style="font-size: ${isMobile ? '18px' : '14px'};"></i> 
                    ${isMobile ? '📢 Promoção' : 'Promoção'}
                </button>
                
                ${!isMobile ? `
                <button class="btn btn-success" onclick="abrirModalImportarCSV()" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 6px 14px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
                    <i class="fas fa-file-csv"></i> Importar
                </button>
                ` : ''}
                
                <!-- 🔥 BOTÃO NOVO CLIENTE - MAIOR NO MOBILE -->
                <button class="btn btn-primary" onclick="abrirModalCliente()" style="
                    padding: ${isMobile ? '12px 18px' : '6px 14px'}; 
                    border-radius: ${isMobile ? '12px' : '8px'}; 
                    border: none; 
                    font-weight: 700; 
                    cursor: pointer; 
                    display: inline-flex; 
                    align-items: center; 
                    justify-content: center;
                    gap: 8px; 
                    font-size: ${isMobile ? '15px' : '13px'}; 
                    background: linear-gradient(135deg, #667eea, #764ba2); 
                    color: white;
                    ${isMobile ? 'flex: 1; min-height: 48px; width: 100%;' : ''}
                    box-shadow: 0 4px 12px rgba(102,126,234,0.35);
                    transition: all 0.3s ease;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
                onmousedown="this.style.transform='scale(0.95)'"
                onmouseup="this.style.transform='scale(1.02)'"
                >
                    <i class="fas fa-plus" style="font-size: ${isMobile ? '18px' : '14px'};"></i> 
                    ${isMobile ? '➕ Novo Cliente' : 'Novo'}
                </button>
            </div>
        </div>

        <!-- FILTROS DE CLASSIFICAÇÃO -->
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; ${isMobile ? 'justify-content:center;' : ''}">
            <button onclick="setFiltroClientes('todos')" class="btn ${filtroClientes === 'todos' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '11px' : '12px'}; padding: ${isMobile ? '6px 12px' : '3px 10px'};">📊 Todos (${totalClientes})</button>
            <button onclick="setFiltroClientes('vip')" class="btn ${filtroClientes === 'vip' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '11px' : '12px'}; padding: ${isMobile ? '6px 12px' : '3px 10px'};">⭐ VIP (${vipCount})</button>
            <button onclick="setFiltroClientes('frequentes')" class="btn ${filtroClientes === 'frequentes' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '11px' : '12px'}; padding: ${isMobile ? '6px 12px' : '3px 10px'};">🔥 Frequentes (${frequentesCount})</button>
            <button onclick="setFiltroClientes('sumidos')" class="btn ${filtroClientes === 'sumidos' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '11px' : '12px'}; padding: ${isMobile ? '6px 12px' : '3px 10px'};">😴 Sumidos (${sumidosCount})</button>
            <button onclick="setFiltroClientes('novos')" class="btn ${filtroClientes === 'novos' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '11px' : '12px'}; padding: ${isMobile ? '6px 12px' : '3px 10px'};">🌱 Novos (${novosCount})</button>
        </div>`;

    // 🔥 FILTRO POR GRUPOS - MAIS BONITO E MAIOR
    if (gruposClientes.length > 0) {
        html += `
            <div style="
                display: flex; 
                gap: ${isMobile ? '8px' : '10px'}; 
                flex-wrap: wrap; 
                margin-bottom: 14px; 
                padding: ${isMobile ? '12px 8px' : '12px 0'}; 
                border-top: 2px solid var(--border-color, #e5e7eb);
                border-bottom: 2px solid var(--border-color, #e5e7eb);
                background: var(--bg-hover, rgba(0,0,0,0.02));
                border-radius: 12px;
                ${isMobile ? 'justify-content: center;' : ''}
            ">
                <span style="
                    font-size: ${isMobile ? '13px' : '14px'}; 
                    color: var(--text-muted, #6b7280); 
                    display: flex; 
                    align-items: center; 
                    gap: 6px; 
                    margin-right: 6px;
                    font-weight: 600;
                ">
                    <i class="fas fa-tags" style="color: #8b5cf6; font-size: ${isMobile ? '16px' : '14px'};"></i> 
                    ${isMobile ? '' : 'Grupos:'}
                </span>
                ${gruposClientes.map(g => `
                    <button onclick="setFiltroGrupo('${g}')" 
                            class="btn ${filtroGrupo === g ? 'btn-primary' : 'btn-outline'}" 
                            style="
                                font-size: ${isMobile ? '13px' : '12px'}; 
                                padding: ${isMobile ? '8px 16px' : '6px 16px'}; 
                                border-radius: 20px;
                                border: 2px solid ${filtroGrupo === g ? '#8b5cf6' : '#8b5cf6'};
                                background: ${filtroGrupo === g ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'transparent'};
                                color: ${filtroGrupo === g ? '#ffffff' : '#8b5cf6'};
                                font-weight: ${filtroGrupo === g ? '700' : '600'};
                                cursor: pointer;
                                transition: all 0.2s ease;
                                ${isMobile ? 'min-height: 40px; min-width: 60px;' : ''}
                                box-shadow: ${filtroGrupo === g ? '0 4px 15px rgba(139,92,246,0.3)' : 'none'};
                            "
                            onmouseover="this.style.transform='scale(1.05)'" 
                            onmouseout="this.style.transform='scale(1)'"
                            onmousedown="this.style.transform='scale(0.95)'"
                            onmouseup="this.style.transform='scale(1.05)'"
                        >
                            🏷️ ${g}
                        </button>
                `).join('')}
                ${filtroGrupo !== 'todos' ? `
                    <button onclick="setFiltroGrupo('todos')" 
                            class="btn btn-outline" 
                            style="
                                font-size: ${isMobile ? '13px' : '12px'}; 
                                padding: ${isMobile ? '8px 16px' : '6px 16px'}; 
                                border-radius: 20px;
                                border: 2px solid #ef4444;
                                background: transparent;
                                color: #ef4444;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                ${isMobile ? 'min-height: 40px; min-width: 60px;' : ''}
                            "
                            onmouseover="this.style.background='rgba(239,68,68,0.1)'" 
                            onmouseout="this.style.background='transparent'"
                            onmousedown="this.style.transform='scale(0.95)'"
                            onmouseup="this.style.transform='scale(1)'"
                        >
                            <i class="fas fa-times"></i> ${isMobile ? '' : 'Limpar'}
                        </button>
                ` : ''}
            </div>
        `;
    }

    // Índice A-Z
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const letraAtiva = localStorage.getItem('letraSelecionada') || '';

    html += `
        <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px; padding: 8px 0; border-top: 1px solid var(--border-color); justify-content: center; position: sticky; top: 0; background: var(--bg-primary); z-index: 10; padding: 8px 4px;">
            <button onclick="limparFiltroLetra()" 
                    class="letra-btn ${!letraAtiva || letraAtiva === 'todos' ? 'active' : ''}" 
                    data-letra="todos"
                    style="padding: 4px 10px; border-radius: 20px; border: 2px solid ${!letraAtiva || letraAtiva === 'todos' ? 'transparent' : 'var(--border-color)'}; background: ${!letraAtiva || letraAtiva === 'todos' ? 'var(--gradient)' : 'var(--bg-card)'}; color: ${!letraAtiva || letraAtiva === 'todos' ? 'white' : 'var(--text-secondary)'}; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; touch-action: manipulation; user-select: none;">
                📋 Todos
            </button>
            ${letras.map(letra => `
                <button onclick="filtrarPorLetra('${letra}')" 
                        class="letra-btn ${letraAtiva === letra ? 'active' : ''}" 
                        data-letra="${letra}"
                        style="padding: 4px 10px; border-radius: 20px; border: 2px solid ${letraAtiva === letra ? 'transparent' : 'var(--border-color)'}; background: ${letraAtiva === letra ? 'var(--gradient)' : 'var(--bg-card)'}; color: ${letraAtiva === letra ? 'white' : 'var(--text-secondary)'}; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s; touch-action: manipulation; user-select: none;">
                    ${letra}
                </button>
            `).join('')}
        </div>
    `;

    // Stats
    if (!isMobile) {
        html += `
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px;">
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid var(--border-color);">
                    <div style="font-size: 24px; font-weight: 700; color: var(--text-primary);">${clientesFiltrados.length}</div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-top: 2px;">📊 Total</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #f59e0b; box-shadow: 0 2px 8px rgba(245,158,11,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${vipCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #f59e0b; margin-top: 2px;">⭐ VIP</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #22c55e; box-shadow: 0 2px 8px rgba(34,197,94,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #22c55e;">${frequentesCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #22c55e; margin-top: 2px;">🔥 Frequentes</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #ef4444; box-shadow: 0 2px 8px rgba(239,68,68,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${sumidosCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #ef4444; margin-top: 2px;">😴 Sumidos</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #667eea; box-shadow: 0 2px 8px rgba(102,126,234,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #667eea;">${novosCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #667eea; margin-top: 2px;">🌱 Novos</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #25D366; box-shadow: 0 2px 8px rgba(37,211,102,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #25D366;">${comWhatsApp}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #25D366; margin-top: 2px;"><i class="fab fa-whatsapp"></i> WhatsApp</div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
                <div style="background: var(--bg-card); border-radius: 10px; padding: 10px 8px; text-align: center; border: 1px solid var(--border-color);">
                    <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">${clientesFiltrados.length}</div>
                    <div style="font-size: 9px; font-weight: 600; color: var(--text-secondary);">Total</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 10px; padding: 10px 8px; text-align: center; border: 2px solid #f59e0b;">
                    <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${vipCount}</div>
                    <div style="font-size: 9px; font-weight: 600; color: #f59e0b;">⭐ VIP</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 10px; padding: 10px 8px; text-align: center; border: 2px solid #22c55e;">
                    <div style="font-size: 18px; font-weight: 700; color: #22c55e;">${frequentesCount}</div>
                    <div style="font-size: 9px; font-weight: 600; color: #22c55e;">🔥 Frequentes</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 10px; padding: 10px 8px; text-align: center; border: 2px solid #ef4444;">
                    <div style="font-size: 18px; font-weight: 700; color: #ef4444;">${sumidosCount}</div>
                    <div style="font-size: 9px; font-weight: 600; color: #ef4444;">😴 Sumidos</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 10px; padding: 10px 8px; text-align: center; border: 2px solid #667eea;">
                    <div style="font-size: 18px; font-weight: 700; color: #667eea;">${novosCount}</div>
                    <div style="font-size: 9px; font-weight: 600; color: #667eea;">🌱 Novos</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 10px; padding: 10px 8px; text-align: center; border: 2px solid #25D366;">
                    <div style="font-size: 18px; font-weight: 700; color: #25D366;">${comWhatsApp}</div>
                    <div style="font-size: 9px; font-weight: 600; color: #25D366;"><i class="fab fa-whatsapp"></i> WhatsApp</div>
                </div>
            </div>
        `;
    }

    html += `<div class="card" style="padding: ${isMobile ? '10px' : '16px'};">`;

    if (clientesFiltrados.length === 0) {
        html += `
            <div class="empty-state" style="padding: 20px; text-align: center;">
                <i class="fas fa-user-plus" style="font-size: 32px; color: var(--text-muted);"></i>
                <h4 style="font-size: 14px; margin: 8px 0;">Nenhum cliente encontrado</h4>
                <button class="btn btn-primary btn-sm" onclick="limparBuscaClientes()" style="font-size: 11px; padding: 4px 12px;">
                    <i class="fas fa-undo"></i> Limpar Busca
                </button>
            </div>
        `;
    } else if (isMobile) {
        // ============================================
        // 🔥 VERSÃO MOBILE - CARDS COM CLASSES CSS
        // ============================================
        html += `<div class="clientes-mobile-container" style="display:flex;flex-direction:column;gap:10px;padding:4px;width:100%;box-sizing:border-box;">`;
        for (const c of clientesFiltrados) {
            const isBloqueado = c.bloqueado_chatbot === 1;
            const telefone = c.telefone || '';
            const whatsappLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '#';
            const inicial = c.nome ? c.nome.charAt(0).toUpperCase() : '?';
            const corClass = c.classificacao || 'regular';

            const gruposLabels = c.grupos && Array.isArray(c.grupos) ? c.grupos.map(g =>
                `<span class="grupo-tag">${g}</span>`
            ).join(' ') : '';

            html += `
                <div class="cliente-card" style="width:100%;box-sizing:border-box;">
                    <div class="card-top">
                        <div class="card-cliente">
                            <div class="card-avatar">${inicial}</div>
                            <div style="flex:1;min-width:0;">
                                <div class="card-nome">
                                    ${escapeHtml(c.nome)} <span class="icone">${c.icone || ''}</span>
                                </div>
                                <div class="card-telefone">
                                    <i class="fas fa-phone"></i> ${c.telefone ? escapeHtml(c.telefone) : 'Sem telefone'}
                                </div>
                                <div class="card-grupos">${gruposLabels}</div>
                            </div>
                        </div>
                        <span class="card-classificacao ${corClass}">${c.classificacao}</span>
                    </div>

                    <div class="card-stats">
                        <div class="stat-item">
                            <div class="stat-number">${c.total_concluidos}</div>
                            <div class="stat-label">Atend.</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number verde">R$ ${formatMoney(c.ticket_medio)}</div>
                            <div class="stat-label">Ticket</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number ${c.dias_sem_visita > 60 ? 'vermelho' : ''}">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</div>
                            <div class="stat-label">Última</div>
                        </div>
                    </div>

                    <div class="card-actions">
                        ${whatsappLink !== '#' ? `<a href="${whatsappLink}" target="_blank" class="btn-action-card btn-whatsapp"><i class="fab fa-whatsapp"></i></a>` : '<div></div>'}
                        <button class="btn-action-card btn-edit" onclick="editarCliente(${c.id})"><i class="fas fa-pen"></i></button>
                        <button class="btn-action-card btn-history" onclick="verHistoricoCliente(${c.id})"><i class="fas fa-history"></i></button>
                        <button class="btn-action-card btn-grupos" onclick="abrirModalGrupos(${c.id})"><i class="fas fa-tags"></i></button>
                        ${isBloqueado ? 
                            `<button class="btn-action-card btn-unblock" onclick="desbloquearChatbot(${c.id})"><i class="fas fa-unlock"></i></button>` :
                            `<button class="btn-action-card btn-block" onclick="bloquearChatbot(${c.id})"><i class="fas fa-lock"></i></button>`
                        }
                        <button class="btn-action-card btn-delete" onclick="excluirCliente(${c.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    } else {
        // ============================================
        // 🔥 VERSÃO DESKTOP - TABELA
        // ============================================
        html += `
            <div id="clientesTableContainer" style="position:relative;max-height:70vh;overflow-y:auto;overflow-x:auto;">
                <table class="data-table" style="width: 100%; min-width: 800px; font-size: 13px;border-collapse:collapse;">
                    <thead style="position:sticky;top:0;z-index:5;">
                        <tr>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);">#</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);">Cliente</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);">Telefone</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);">Class.</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);">Grupos</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);text-align:center;">Atend.</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);text-align:center;">Ticket</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);text-align:center;">Última</th>
                            <th style="padding: 6px 8px;background:var(--bg-card);border-bottom:2px solid var(--border-color);text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="listaClientesBody">
                        <!-- Renderizado via batches -->
                    </tbody>
                </table>
            </div>
            <div id="loadingIndicator" style="display:none;text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">
                <i class="fas fa-spinner fa-spin"></i> Carregando clientes...
            </div>
        `;
    }

    html += `</div></div>`;

    content.innerHTML = html;

    // 🔥 Renderizar em batches (Desktop apenas)
    if (!isMobile && clientesFiltrados.length > 0) {
        renderizarClientesBatches(clientesFiltrados);
    }

    window.scrollTo(0, 0);
    console.log(`✅ Clientes renderizados: ${clientesFiltrados.length} de ${clientes.length}`);
}
// ============================================
// RENDERIZAR CLIENTES EM BATCHES - DESKTOP CORRIGIDO
// ============================================

function renderizarClientesBatches(clientes) {
    const tbody = document.getElementById('listaClientesBody');
    if (!tbody) return;

    const batchSize = PERFORMANCE_CONFIG.BATCH_SIZE;
    let index = 0;
    const total = clientes.length;

    const cores = {
        vip: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
        frequente: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
        sumido: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
        novo: { bg: 'rgba(102,126,234,0.15)', text: '#667eea' },
        regular: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' }
    };

    function renderizarBatch() {
        const start = index;
        const end = Math.min(start + batchSize, total);
        const fragment = document.createDocumentFragment();

        for (let i = start; i < end; i++) {
            const c = clientes[i];
            const isBloqueado = c.bloqueado_chatbot === 1;
            const telefone = c.telefone || '';
            const cor = cores[c.classificacao] || cores.regular;
            const gruposLabels = c.grupos && Array.isArray(c.grupos) ? c.grupos.map(g =>
                `<span class="grupo-tag">${g}</span>`
            ).join(' ') : '';

            const tr = document.createElement('tr');
            tr.style.transition = 'opacity 0.15s';
            tr.innerHTML = `
                <td data-label="ID" style="padding: 6px 8px; text-align:center;">${c.id}</td>
                <td data-label="Cliente" style="padding: 6px 8px;">
                    <strong>${escapeHtml(c.nome)}</strong> 
                    <span style="font-size:14px;">${c.icone || ''}</span>
                </td>
                <td data-label="Telefone" style="padding: 6px 8px;">
                    ${telefone ? escapeHtml(telefone) : '-'}
                    ${telefone ? `<a href="https://wa.me/55${telefone.replace(/\D/g, '')}" target="_blank" style="color:#25D366;text-decoration:none;margin-left:4px;"><i class="fab fa-whatsapp"></i></a>` : ''}
                </td>
                <td data-label="Class." style="padding: 6px 8px;">
                    <span style="padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${cor.bg};color:${cor.text};">
                        ${c.icone || ''} ${c.classificacao}
                    </span>
                </td>
                <td data-label="Grupos" style="padding: 6px 8px; font-size:10px;">
                    <div class="grupos-container">${gruposLabels || '-'}</div>
                </td>
                <td data-label="Atend." style="padding: 6px 8px; text-align:center;">${c.total_concluidos || 0}</td>
                <td data-label="Ticket" style="padding: 6px 8px; text-align:center;font-weight:600;color:#22c55e;">
                    R$ ${formatMoney(c.ticket_medio || 0)}
                </td>
                <td data-label="Última" style="padding: 6px 8px; text-align:center;font-size:12px;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-muted)'};">
                    ${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}
                </td>
                <td data-label="Ações" style="padding: 6px 8px;">
                    <div class="actions-cell">
                        <button class="btn-icon btn-edit" onclick="editarCliente(${c.id})" title="Editar">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-history" onclick="verHistoricoCliente(${c.id})" title="Histórico">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn-icon btn-grupos" onclick="abrirModalGrupos(${c.id})" title="Grupos">
                            <i class="fas fa-tags"></i>
                        </button>
                        ${isBloqueado ?
                            `<button class="btn-icon btn-unblock" onclick="desbloquearChatbot(${c.id})" title="Liberar">
                                <i class="fas fa-unlock"></i>
                            </button>` :
                            `<button class="btn-icon btn-block" onclick="bloquearChatbot(${c.id})" title="Bloquear">
                                <i class="fas fa-lock"></i>
                            </button>`
                        }
                        <button class="btn-icon btn-delete" onclick="excluirCliente(${c.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            fragment.appendChild(tr);
        }

        tbody.appendChild(fragment);
        index = end;

        if (index < total) {
            requestAnimationFrame(() => {
                setTimeout(renderizarBatch, PERFORMANCE_CONFIG.RENDER_DELAY);
            });
        } else {
            const indicator = document.getElementById('loadingIndicator');
            if (indicator) indicator.style.display = 'none';
            console.log(`✅ ${total} clientes renderizados em ${Math.ceil(total/batchSize)} batches`);
            atualizarBotoesFiltro();
        }
    }

    const indicator = document.getElementById('loadingIndicator');
    if (indicator) indicator.style.display = 'block';

    // Limpar tbody antes de renderizar
    tbody.innerHTML = '';
    setTimeout(renderizarBatch, 100);
}

// ============================================
// FUNÇÕES DE FILTRO
// ============================================

function setFiltroClientes(filtro) {
    filtroClientes = filtro;
    if (filtroGrupo !== 'todos') filtroGrupo = 'todos';
    renderizarClientesOtimizado(clientesCompletos);
}

function setFiltroGrupo(grupo) {
    filtroGrupo = grupo;
    if (filtroClientes !== 'todos') {
        filtroClientes = 'todos';
    }

    if (window._filtroTimeout) {
        clearTimeout(window._filtroTimeout);
    }

    window._filtroTimeout = setTimeout(() => {
        renderizarClientesOtimizado(clientesCompletos);
    }, 100);
}

function filtrarPorLetra(letra) {
    console.log(`🔍 Filtrando por letra: ${letra}`);
    letraSelecionada = letra;
    localStorage.setItem('letraSelecionada', letra);

    const botoesLetras = document.querySelectorAll('.letra-btn');
    botoesLetras.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.letra === letra) {
            btn.classList.add('active');
        }
    });

    if (letra === 'todos') {
        localStorage.removeItem('letraSelecionada');
        letraSelecionada = '';
        termoBuscaClientes = '';
        const input = document.getElementById('buscaClientesInput');
        if (input) input.value = '';
    } else {
        if (termoBuscaClientes) {
            termoBuscaClientes = '';
            const input = document.getElementById('buscaClientesInput');
            if (input) input.value = '';
        }
    }

    renderizarClientesOtimizado(clientesCompletos);
}

function limparFiltroLetra() {
    letraSelecionada = '';
    localStorage.removeItem('letraSelecionada');
    const botoesLetras = document.querySelectorAll('.letra-btn');
    botoesLetras.forEach(btn => btn.classList.remove('active'));
    termoBuscaClientes = '';
    const input = document.getElementById('buscaClientesInput');
    if (input) input.value = '';
    renderizarClientesOtimizado(clientesCompletos);
}

function buscarClientes() {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        console.log('📱 Busca mobile desativada (apenas desktop)');
        return;
    }

    const input = document.getElementById('buscaClientesInput');
    if (!input) return;
    termoBuscaClientes = input.value.toLowerCase().trim();

    if (termoBuscaClientes) {
        localStorage.removeItem('letraSelecionada');
        letraSelecionada = '';
    }

    const btnLimpar = document.getElementById('btnLimparBusca');
    if (btnLimpar) btnLimpar.style.display = termoBuscaClientes ? 'block' : 'none';

    if (timeoutBusca) clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(() => renderizarClientesOtimizado(clientesCompletos), PERFORMANCE_CONFIG.DEBOUNCE_MS);
}

function limparBuscaClientes() {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        console.log('📱 Busca mobile desativada (apenas desktop)');
        return;
    }

    const input = document.getElementById('buscaClientesInput');
    if (input) input.value = '';
    termoBuscaClientes = '';
    localStorage.removeItem('letraSelecionada');
    letraSelecionada = '';
    const btnLimpar = document.getElementById('btnLimparBusca');
    if (btnLimpar) btnLimpar.style.display = 'none';
    renderizarClientesOtimizado(clientesCompletos);
}

// ============================================
// RENDERIZAR LISTA CLIENTES (Compatibilidade)
// ============================================

function renderizarListaClientes() {
    renderizarClientesOtimizado(clientesCompletos);
}

// ============================================
// APLICAR FILTROS CLIENTES
// ============================================

function aplicarFiltrosClientes() {
    const content = document.getElementById('content');
    if (!content || !content.innerHTML.includes('👥 Clientes')) return;

    if (clientesCompletos.length === 0) {
        carregarClientes();
        return;
    }

    renderizarClientesOtimizado(clientesCompletos);
}

// ============================================
// ATUALIZAR BOTÕES DE FILTRO
// ============================================

function atualizarBotoesFiltro() {
    const totalClientes = clientesCompletos.length;
    const vipCount = clientesCompletos.filter(c => c.classificacao === 'vip').length;
    const sumidosCount = clientesCompletos.filter(c => c.classificacao === 'sumido').length;
    const frequentesCount = clientesCompletos.filter(c => c.classificacao === 'frequente').length;
    const novosCount = clientesCompletos.filter(c => c.classificacao === 'novo').length;
    const comWhatsApp = clientesCompletos.filter(c => c.telefone && c.telefone.trim() !== '').length;

    const btnTodos = document.querySelector('button[onclick*="setFiltroClientes(\'todos\')"]');
    if (btnTodos) btnTodos.textContent = `📊 Todos (${totalClientes})`;

    const btnVip = document.querySelector('button[onclick*="setFiltroClientes(\'vip\')"]');
    if (btnVip) btnVip.textContent = `⭐ VIP (${vipCount})`;

    const btnFreq = document.querySelector('button[onclick*="setFiltroClientes(\'frequentes\')"]');
    if (btnFreq) btnFreq.textContent = `🔥 Frequentes (${frequentesCount})`;

    const btnSumidos = document.querySelector('button[onclick*="setFiltroClientes(\'sumidos\')"]');
    if (btnSumidos) btnSumidos.textContent = `😴 Sumidos (${sumidosCount})`;

    const btnNovos = document.querySelector('button[onclick*="setFiltroClientes(\'novos\')"]');
    if (btnNovos) btnNovos.textContent = `🌱 Novos (${novosCount})`;

    const whatsEl = document.querySelector('.stat-mini-value[style*="color: #25D366"]');
    if (whatsEl) whatsEl.textContent = comWhatsApp;
}

// ============================================
// FUNÇÕES CRUD
// ============================================
// ============================================
// ABRIR MODAL CLIENTE - CORRIGIDO
// ============================================

function abrirModalCliente() {
    const existingModal = document.getElementById('modalCliente');
    if (existingModal) existingModal.remove();

    const isMobile = window.innerWidth < 768;

    const modalHtml = `
        <div id="modalCliente" class="modal modal-cliente" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; padding: 16px;">
            <div class="modal-content" style="max-width: 450px; width: 100%; margin: auto; padding: ${isMobile ? '16px' : '24px'}; background: var(--bg-card); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                        <i class="fas fa-user-plus" style="color: #22c55e;"></i>
                        ${isMobile ? 'Novo' : 'Novo Cliente'}
                    </h3>
                    <button class="modal-close" onclick="fecharModalCliente()">&times;</button>
                </div>
                
                <form id="formNovoCliente" onsubmit="event.preventDefault(); salvarCliente();">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="clienteNome" class="form-control" placeholder="Nome completo" required>
                    </div>
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="clienteTelefone" class="form-control" placeholder="(00) 00000-0000">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="clienteEmail" class="form-control" placeholder="cliente@email.com">
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-action btn-outline" onclick="fecharModalCliente()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn-action btn-primary">
                            <i class="fas fa-save"></i> Salvar
                        </button>
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
    try {
        const nomeInput = document.getElementById('clienteNome');
        const telefoneInput = document.getElementById('clienteTelefone');
        const emailInput = document.getElementById('clienteEmail');

        if (!nomeInput) {
            showToast('Erro: Campo nome não encontrado', 'error');
            return;
        }

        const nome = nomeInput.value.trim();
        const telefone = telefoneInput ? telefoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';

        if (!nome) {
            showToast('Nome é obrigatório', 'warning');
            return;
        }

        showLoading();
        const token = localStorage.getItem('token');

        const res = await fetch('/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nome, telefone, email })
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
        console.error("❌ Erro:", error);
        hideLoading();
        showToast('Erro ao cadastrar cliente', 'error');
    }
}

// ============================================
// EDITAR CLIENTE - CORRIGIDO
// ============================================

async function editarCliente(id) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        const cliente = data.data.find(c => c.id === id);

        if (!cliente) {
            showToast('Cliente não encontrado', 'error');
            return;
        }

        const existingModal = document.getElementById('modalEditarCliente');
        if (existingModal) existingModal.remove();

        const isMobile = window.innerWidth < 768;

        const modalHtml = `
            <div id="modalEditarCliente" class="modal modal-cliente" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
                <div class="modal-content" style="max-width: 450px; width: 100%; margin: auto; padding: ${isMobile ? '16px' : '24px'}; background: var(--bg-card); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                            <i class="fas fa-user-edit" style="color: var(--primary);"></i>
                            ${isMobile ? 'Editar' : 'Editar Cliente'}
                        </h3>
                        <button class="modal-close" onclick="fecharModalEditarCliente()">&times;</button>
                    </div>
                    
                    <form id="formEditarCliente" onsubmit="event.preventDefault(); atualizarCliente(${id});">
                        <div class="form-group">
                            <label>Nome *</label>
                            <input type="text" id="editClienteNome" class="form-control" value="${escapeHtml(cliente.nome)}" required>
                        </div>
                        <div class="form-group">
                            <label>Telefone</label>
                            <input type="text" id="editClienteTelefone" class="form-control" value="${escapeHtml(cliente.telefone || '')}" placeholder="(00) 00000-0000">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="editClienteEmail" class="form-control" value="${escapeHtml(cliente.email || '')}" placeholder="cliente@email.com">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-action btn-outline" onclick="fecharModalEditarCliente()">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="submit" class="btn-action btn-primary">
                                <i class="fas fa-save"></i> Salvar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

    } catch (error) {
        console.error('❌ Erro ao carregar cliente:', error);
        showToast('Erro ao carregar dados do cliente', 'error');
    }
}

function fecharModalEditarCliente() {
    const modal = document.getElementById('modalEditarCliente');
    if (modal) modal.remove();
}

async function atualizarCliente(id) {
    try {
        const nomeInput = document.getElementById('editClienteNome');
        const telefoneInput = document.getElementById('editClienteTelefone');
        const emailInput = document.getElementById('editClienteEmail');

        if (!nomeInput) {
            showToast('Erro: Campo nome não encontrado', 'error');
            return;
        }

        const nome = nomeInput.value.trim();
        const telefone = telefoneInput ? telefoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';

        if (!nome) {
            showToast('Nome é obrigatório', 'warning');
            return;
        }

        showLoading();
        const token = localStorage.getItem('token');

        const res = await fetch(`/api/clientes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nome, telefone, email })
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
        console.error('❌ Erro:', error);
        hideLoading();
        showToast('Erro ao atualizar cliente', 'error');
    }
}

async function excluirCliente(id) {
    const confirmado = await showConfirm(
        'Deseja realmente excluir este cliente?\n\nEsta ação não poderá ser desfeita!',
        '👤 Excluir Cliente',
        { 
            confirmText: '✅ Sim, Excluir', 
            cancelText: '❌ Cancelar', 
            icon: '👤',
            confirmClass: 'btn-danger'
        }
    );
    
    if (!confirmado) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/clientes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const result = await response.json();
        if (result.success) {
            showToast('✅ Cliente excluído com sucesso!', 'success');
            carregarClientes();
        } else {
            showToast(result.message || '❌ Erro ao excluir cliente', 'error');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        showToast('❌ Erro ao excluir cliente', 'error');
    }
}

async function bloquearChatbot(id) {
    if (!confirm('Bloquear este cliente de usar o chatbot?')) return;

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
        console.error('❌ Erro:', error);
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
        console.error('❌ Erro:', error);
        hideLoading();
        showToast('Erro ao desbloquear cliente', 'error');
    }
}

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

async function apagarTodosClientes() {
    if (!confirm('🛑 ATENÇÃO: Você tem certeza que deseja apagar TODOS os clientes?\n\nEsta ação apagará também todos os agendamentos vinculados e não poderá ser desfeita!')) {
        return;
    }

    if (!confirm('🛑 ÚLTIMA CONFIRMAÇÃO: Tem certeza absoluta?')) {
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const resClientes = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const dataClientes = await resClientes.json();
        const clientes = dataClientes.data || [];

        if (clientes.length === 0) {
            showToast('✅ Nenhum cliente para apagar', 'info');
            hideLoading();
            return;
        }

        let excluidos = 0;
        let erros = 0;

        for (let cliente of clientes) {
            try {
                const resDelete = await fetch(`/api/clientes/${cliente.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await resDelete.json();
                if (data.success) {
                    excluidos++;
                } else {
                    erros++;
                }
            } catch (e) {
                erros++;
            }
        }

        hideLoading();

        if (excluidos > 0) {
            showToast(`✅ ${excluidos} clientes removidos! ${erros > 0 ? `⚠️ ${erros} erros` : ''}`, erros > 0 ? 'warning' : 'success');
            clientesCompletos = [];
            filtroClientes = 'todos';
            filtroGrupo = 'todos';
            termoBuscaClientes = '';
            await carregarClientes();
        } else {
            showToast('❌ Falha ao excluir clientes', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao apagar todos:', error);
        hideLoading();
        showToast('Erro ao conectar com o servidor', 'error');
    }
}

// ============================================
// FUNÇÕES DE GRUPOS
// ============================================

async function abrirModalGrupos(clienteId) {
    clienteEditandoGrupos = clienteId;
    const cliente = clientesCompletos.find(c => c.id === clienteId);
    if (!cliente) {
        showToast('Cliente não encontrado', 'error');
        return;
    }

    const grupos = await carregarGruposCliente(clienteId);
    const gruposDisponiveis = ['Premium', 'Frequentes', 'Promoções', 'Aniversariantes', 'Amigos', 'Indicados', 'Especiais'];

    const isMobile = window.innerWidth < 768;

    let html = `
        <div id="modalGrupos" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
            <div class="modal-content" style="max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto; background: var(--bg-card); border-radius: 16px; padding: ${isMobile ? '16px' : '24px'}; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                        <i class="fas fa-tags" style="color: #8b5cf6;"></i>
                        Grupos de ${escapeHtml(cliente.nome)}
                    </h3>
                    <button onclick="fecharModalGrupos()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>

                <div style="margin-bottom: 16px;">
                    <p style="font-size: 13px; color: var(--text-muted);">Selecione os grupos que este cliente pertence</p>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
                    ${gruposDisponiveis.map(g => {
        const isSelected = grupos.includes(g);
        return `
                            <button onclick="toggleGrupoCliente('${g}')" 
                                    style="padding: 6px 14px; border-radius: 20px; border: 2px solid ${isSelected ? '#8b5cf6' : 'var(--border-color)'}; 
                                           background: ${isSelected ? 'rgba(139,92,246,0.15)' : 'var(--bg-hover)'}; 
                                           color: ${isSelected ? '#8b5cf6' : 'var(--text-secondary)'}; 
                                           font-size: 12px; font-weight: ${isSelected ? '700' : '500'}; cursor: pointer; transition: all 0.2s;
                                           display: inline-flex; align-items: center; gap: 4px;"
                                    id="grupo_btn_${g.replace(/\s/g, '_')}">
                                ${isSelected ? '✅' : '☐'} ${g}
                            </button>
                        `;
    }).join('')}
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <input type="text" id="novoGrupoInput" placeholder="Criar novo grupo..." 
                           style="flex:1; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); 
                                  background: var(--bg-input); color: var(--text-primary); font-size: 13px;">
                    <button onclick="criarNovoGrupo()" style="padding: 8px 16px; border-radius: 8px; border: none; 
                            background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: white; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-plus"></i> Adicionar
                    </button>
                </div>

                ${grupos.length > 0 ? `
                <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-hover); border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                        <i class="fas fa-list"></i> Grupos atuais
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${grupos.map(g => `
                            <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(139,92,246,0.1); padding: 4px 10px; border-radius: 16px; border: 1px solid rgba(139,92,246,0.2);">
                                🏷️ ${g}
                                <button onclick="excluirGrupoCliente('${g}')" 
                                        style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 0 2px;"
                                        title="Remover grupo">
                                    <i class="fas fa-times-circle"></i>
                                </button>
                            </span>
                        `).join('')}
                    </div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">
                        Clique no ✕ para remover um grupo deste cliente
                    </div>
                </div>
                ` : `
                <div style="margin-bottom: 16px; padding: 10px; background: var(--bg-hover); border-radius: 8px; text-align: center; color: var(--text-muted); font-size: 12px; border: 1px dashed var(--border-color);">
                    <i class="fas fa-info-circle"></i> Este cliente não pertence a nenhum grupo
                </div>
                `}

                <div style="display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <button onclick="fecharModalGrupos()" style="padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer;">Cancelar</button>
                    <button onclick="salvarGruposCliente()" style="padding: 8px 24px; border-radius: 8px; border: none; background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 13px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-save"></i> Salvar Grupos
                    </button>
                </div>
            </div>
        </div>
    `;

    const existing = document.getElementById('modalGrupos');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);

    gruposSelecionadosTemp = [...grupos];
}

function fecharModalGrupos() {
    const modal = document.getElementById('modalGrupos');
    if (modal) modal.remove();
    clienteEditandoGrupos = null;
    gruposSelecionadosTemp = [];
}

function toggleGrupoCliente(grupo) {
    const btn = document.getElementById(`grupo_btn_${grupo.replace(/\s/g, '_')}`);
    if (!btn) {
        console.warn(`⚠️ Botão não encontrado para: ${grupo}`);
        return;
    }

    const isSelected = btn.textContent.includes('✅');

    if (isSelected) {
        btn.textContent = `☐ ${grupo}`;
        btn.style.background = 'var(--bg-hover)';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'var(--border-color)';
        btn.style.fontWeight = '500';
        gruposSelecionadosTemp = gruposSelecionadosTemp.filter(g => g !== grupo);
    } else {
        btn.textContent = `✅ ${grupo}`;
        btn.style.background = 'rgba(139,92,246,0.15)';
        btn.style.color = '#8b5cf6';
        btn.style.borderColor = '#8b5cf6';
        btn.style.fontWeight = '700';
        if (!gruposSelecionadosTemp.includes(grupo)) {
            gruposSelecionadosTemp.push(grupo);
        }
    }

    if (clienteEditandoGrupos) {
        atualizarGruposAtuais(clienteEditandoGrupos);
    }
}

function criarNovoGrupo() {
    const input = document.getElementById('novoGrupoInput');
    const nome = input.value.trim();

    if (!nome) {
        showToast('Digite um nome para o grupo', 'warning');
        return;
    }

    const gruposDisponiveis = ['Premium', 'Frequentes', 'Promoções', 'Aniversariantes', 'Amigos', 'Indicados', 'Especiais'];

    if (gruposDisponiveis.includes(nome)) {
        showToast(`O grupo "${nome}" já existe`, 'warning');
        return;
    }

    if (!gruposSelecionadosTemp.includes(nome)) {
        gruposSelecionadosTemp.push(nome);
    }

    const clienteId = clienteEditandoGrupos;
    fecharModalGrupos();

    setTimeout(() => {
        abrirModalGrupos(clienteId);
        setTimeout(() => {
            gruposSelecionadosTemp.forEach(g => {
                const btn = document.getElementById(`grupo_btn_${g.replace(/\s/g, '_')}`);
                if (btn) {
                    btn.textContent = `✅ ${g}`;
                    btn.style.background = 'rgba(139,92,246,0.15)';
                    btn.style.color = '#8b5cf6';
                    btn.style.borderColor = '#8b5cf6';
                    btn.style.fontWeight = '700';
                }
            });

            const btnNovoGrupo = document.getElementById(`grupo_btn_${nome.replace(/\s/g, '_')}`);
            if (btnNovoGrupo) {
                btnNovoGrupo.textContent = `✅ ${nome}`;
                btnNovoGrupo.style.background = 'rgba(139,92,246,0.15)';
                btnNovoGrupo.style.color = '#8b5cf6';
                btnNovoGrupo.style.borderColor = '#8b5cf6';
                btnNovoGrupo.style.fontWeight = '700';
            }

            atualizarGruposAtuais(clienteId);

            const input2 = document.getElementById('novoGrupoInput');
            if (input2) input2.value = '';

            showToast(`Grupo "${nome}" criado e adicionado! ✅`, 'success');
        }, 150);
    }, 150);
}

function atualizarGruposAtuais(clienteId) {
    const container = document.querySelector('#modalGrupos .modal-content');
    if (!container) return;

    const gruposAtuaisDiv = container.querySelector('div:has(> div > span)');
    if (!gruposAtuaisDiv) return;

    const gruposHtml = gruposSelecionadosTemp.length > 0 ? `
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${gruposSelecionadosTemp.map(g => `
                <span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(139,92,246,0.1); padding: 4px 10px; border-radius: 16px; border: 1px solid rgba(139,92,246,0.2);">
                    🏷️ ${g}
                    <button onclick="excluirGrupoCliente('${g}')" 
                            style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 14px; padding: 0 2px;"
                            title="Remover grupo">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </span>
            `).join('')}
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px;">
            Clique no ✕ para remover um grupo deste cliente
        </div>
    ` : `
        <div style="padding: 10px; background: var(--bg-hover); border-radius: 8px; text-align: center; color: var(--text-muted); font-size: 12px; border: 1px dashed var(--border-color);">
            <i class="fas fa-info-circle"></i> Este cliente não pertence a nenhum grupo
        </div>
    `;

    const gruposAtuaisDivParent = gruposAtuaisDiv.parentElement;
    if (gruposAtuaisDivParent) {
        const title = gruposAtuaisDivParent.querySelector('div[style*="font-size: 12px; font-weight: 600;"]');
        if (title) {
            gruposAtuaisDivParent.innerHTML = `
                ${title.outerHTML}
                ${gruposHtml}
            `;
        }
    }
}

async function salvarGruposCliente() {
    if (!clienteEditandoGrupos) {
        showToast('❌ Nenhum cliente selecionado', 'error');
        return;
    }

    console.log('📝 Salvando grupos para cliente:', clienteEditandoGrupos);
    console.log('📝 Grupos selecionados:', gruposSelecionadosTemp);

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/clientes/${clienteEditandoGrupos}/grupos`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                grupos: gruposSelecionadosTemp
            })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('✅ Grupos atualizados com sucesso!', 'success');

            const clienteIndex = clientesCompletos.findIndex(c => c.id === clienteEditandoGrupos);
            if (clienteIndex !== -1) {
                clientesCompletos[clienteIndex].grupos = [...gruposSelecionadosTemp];
            }

            fecharModalGrupos();
            await carregarClientes();

            if (filtroGrupo !== 'todos') {
                setTimeout(() => {
                    setFiltroGrupo(filtroGrupo);
                }, 300);
            }

        } else {
            showToast(data.message || '❌ Erro ao salvar grupos', 'error');
            console.error('❌ Erro no backend:', data);
        }
    } catch (error) {
        console.error('❌ Erro ao salvar grupos:', error);
        hideLoading();
        showToast('❌ Erro ao conectar com o servidor', 'error');
    }
}

function excluirGrupoCliente(grupo) {
    if (!confirm(`Remover o grupo "${grupo}" deste cliente?`)) return;

    gruposSelecionadosTemp = gruposSelecionadosTemp.filter(g => g !== grupo);

    const btn = document.getElementById(`grupo_btn_${grupo.replace(/\s/g, '_')}`);
    if (btn) {
        btn.textContent = `☐ ${grupo}`;
        btn.style.background = 'var(--bg-hover)';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'var(--border-color)';
        btn.style.fontWeight = '500';
    }

    const clienteId = clienteEditandoGrupos;
    atualizarGruposAtuais(clienteId);

    showToast(`Grupo "${grupo}" removido deste cliente`, 'info');
}

// ============================================
// FUNÇÕES DE IMPORTAÇÃO CSV
// ============================================

function abrirModalImportarCSV() {
    if (window.innerWidth < 768) {
        showToast('📱 Importação disponível apenas no desktop', 'warning');
        return;
    }

    const modalHtml = `
        <div id="modalImportarCSV" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
            <div class="modal-content" style="max-width: 500px; width: 100%; background: var(--bg-card); border-radius: 16px; padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.4); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; font-size: 20px; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                        <i class="fas fa-address-book" style="color: #22c55e;"></i>
                        Importar Contatos
                    </h3>
                    <button onclick="fecharModalImportarCSV()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>
                
                <div onclick="document.getElementById('csvFileInputDesktop').click()" style="border: 2px dashed var(--border-color); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 16px; background: var(--bg-hover); cursor: pointer;">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: var(--primary); margin-bottom: 8px;"></i>
                    <p style="margin: 8px 0; color: var(--text-secondary); font-weight: 600; font-size: 16px;">📂 Clique para selecionar</p>
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">Suporta: <strong>.CSV</strong> ou <strong>.VCF</strong></p>
                    <input type="file" id="csvFileInputDesktop" accept=".csv,.vcf,.txt" style="display: none;" onchange="handleFileSelectDesktop(this)">
                    <button type="button" class="btn btn-success" style="padding: 10px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-weight: 600; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
                        <i class="fas fa-file-import"></i> Escolher Arquivo
                    </button>
                </div>

                <div style="background: rgba(102,126,234,0.08); padding: 12px; border-radius: 8px; font-size: 12px; color: var(--text-secondary); margin-bottom: 16px; border-left: 3px solid var(--primary);">
                    <strong>📱 iPhone:</strong> Ajustes > Contatos > Exportar Contatos
                </div>

                <div style="display: flex; justify-content: flex-end;">
                    <button onclick="fecharModalImportarCSV()" style="padding: 8px 24px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer;">Cancelar</button>
                </div>

                <div id="statusImportacao" style="display:none; margin-top: 12px; padding: 12px; border-radius: 8px; background: var(--bg-hover);">
                    <span style="font-size:13px;color:var(--text-secondary);" id="statusImportacaoTexto">Processando...</span>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('modalImportarCSV');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function fecharModalImportarCSV() {
    const modal = document.getElementById('modalImportarCSV');
    if (modal) modal.remove();
}

function handleFileSelectDesktop(input) {
    if (input.files && input.files[0]) {
        processarArquivoContatosDesktop(input.files[0]);
    }
}

async function processarArquivoContatosDesktop(file) {
    const statusDiv = document.getElementById('statusImportacao');
    const statusTexto = document.getElementById('statusImportacaoTexto');

    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusTexto.textContent = '📖 Lendo arquivo...';
    }

    showLoading();

    try {
        const content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsText(file, 'UTF-8');
        });

        if (statusTexto) {
            statusTexto.textContent = '🔍 Analisando contatos...';
        }

        let clientesParaImportar = [];
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.vcf') || content.trim().toUpperCase().startsWith('BEGIN:VCARD')) {
            clientesParaImportar = parseVCFMobile(content);
        } else {
            clientesParaImportar = parseCSVMobile(content);
        }

        clientesParaImportar = clientesParaImportar.filter(c => {
            const temNome = c.nome && c.nome.trim().length > 0 && c.nome !== 'Contato';
            const temTelefone = c.telefone && c.telefone.trim().length >= 10;
            return temNome && temTelefone;
        });

        hideLoading();

        if (statusDiv) {
            statusDiv.style.display = 'none';
        }

        if (clientesParaImportar.length === 0) {
            showToast('⚠️ Nenhum contato válido encontrado. (Nome e telefone são obrigatórios, mínimo 10 dígitos)', 'warning');
            return;
        }

        const preview = clientesParaImportar.slice(0, 5).map(c =>
            `${c.nome} (${c.telefone})`
        ).join('\n');

        if (!confirm(`📊 Encontrados ${clientesParaImportar.length} contatos válidos.\n\nPrimeiros:\n${preview}\n\nDeseja importar?`)) {
            return;
        }

        await salvarLoteClientesDesktop(clientesParaImportar);

    } catch (error) {
        console.error('❌ Erro:', error);
        hideLoading();
        if (statusDiv) statusDiv.style.display = 'none';
        showToast('❌ Erro ao ler o arquivo.', 'error');
    }
}

function parseVCFMobile(content) {
    console.log('🔍 Parseando VCF...');

    const lines = content.split(/\r\n|\n|\r/);
    const contacts = [];
    let currentContact = {};
    let inVCard = false;
    let nomeTemp = '';

    for (let line of lines) {
        line = line.trim();

        if (line.startsWith('BEGIN:VCARD')) {
            inVCard = true;
            currentContact = { nome: '', telefone: '', email: '' };
            nomeTemp = '';
            continue;
        }

        if (line.startsWith('END:VCARD')) {
            inVCard = false;
            if (currentContact.nome || currentContact.telefone) {
                if (!currentContact.nome && currentContact.telefone) {
                    currentContact.nome = 'Contato';
                }
                currentContact.nome = limparNome(currentContact.nome);
                contacts.push({ ...currentContact });
            }
            continue;
        }

        if (!inVCard) continue;

        if (line.startsWith('FN:')) {
            let nome = line.substring(3).trim();
            nome = nome.replace(/[^\w\sÀ-ú]/g, ' ').trim();
            if (nome) {
                currentContact.nome = nome;
                nomeTemp = nome;
            }
        }

        if (line.startsWith('N;') || line.startsWith('N:')) {
            if (!currentContact.nome || currentContact.nome === 'Contato') {
                const parts = line.split(':')[1]?.split(';') || [];
                let sobrenome = parts[0] || '';
                let nome = parts[1] || '';
                let nomeCompleto = (nome + ' ' + sobrenome).trim();
                if (nomeCompleto) {
                    currentContact.nome = limparNome(nomeCompleto);
                    nomeTemp = currentContact.nome;
                }
            }
        }

        if (line.startsWith('TEL') || line.startsWith('TEL;')) {
            if (!currentContact.telefone) {
                const telPart = line.split(':');
                if (telPart.length > 1) {
                    let tel = telPart.slice(1).join(':').trim();
                    tel = tel.replace(/[^\d+]/g, '');
                    tel = tel.replace(/\+/g, '');
                    if (tel.startsWith('55') && tel.length > 10) {
                        tel = tel.substring(2);
                    }
                    if (tel && tel.length >= 10) {
                        currentContact.telefone = tel;
                    }
                }
            }
        }

        if (line.startsWith('EMAIL') || line.startsWith('EMAIL;')) {
            if (!currentContact.email) {
                const emailPart = line.split(':');
                if (emailPart.length > 1) {
                    currentContact.email = emailPart.slice(1).join(':').trim().toLowerCase();
                }
            }
        }
    }

    const seen = new Set();
    const uniqueContacts = contacts.filter(c => {
        const telefoneLimpo = limparTelefone(c.telefone || '');
        const key = telefoneLimpo || c.email || c.nome;
        if (seen.has(key)) return false;
        seen.add(key);
        if (!c.nome || c.nome === 'Contato' || !c.telefone) return false;
        if (telefoneLimpo.length < 10) return false;
        return true;
    });

    console.log(`✅ Parseados ${uniqueContacts.length} contatos VCF válidos`);
    return uniqueContacts;
}

function parseCSVMobile(content) {
    console.log('🔍 Parseando CSV...');

    const lines = content.split('\n');
    const contacts = [];

    let separator = ',';
    if (content.includes(';')) separator = ';';
    if (content.includes('\t')) separator = '\t';

    let startIndex = 0;
    const firstLine = lines[0]?.toLowerCase() || '';
    if (firstLine.includes('nome') || firstLine.includes('name') ||
        firstLine.includes('telefone') || firstLine.includes('phone') ||
        firstLine.includes('email') || firstLine.includes('e-mail') ||
        firstLine.includes('contato')) {
        startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(separator).map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 1) {
            let nome = cols[0] || '';
            let telefone = (cols.length > 1) ? cols[1] : '';
            let email = (cols.length > 2) ? cols[2] : '';

            if (cols.length === 1 && cols[0].includes(' - ')) {
                const parts = cols[0].split(' - ');
                nome = parts[0].trim();
                telefone = parts[1]?.trim() || '';
            } else if (cols.length === 1 && cols[0].includes(',')) {
                const parts = cols[0].split(',');
                nome = parts[0].trim();
                telefone = parts[1]?.trim() || '';
            }

            telefone = limparTelefone(telefone);
            nome = limparNome(nome);

            if (nome && nome !== 'Contato' && telefone && telefone.length >= 10) {
                contacts.push({
                    nome: nome,
                    telefone: telefone,
                    email: email || ''
                });
            }
        }
    }

    console.log(`✅ Parseados ${contacts.length} contatos CSV válidos`);
    return contacts;
}

async function salvarLoteClientesDesktop(lista) {
    showLoading();
    const token = localStorage.getItem('token');
    let successCount = 0;
    let errorCount = 0;
    let total = lista.length;

    const batchSize = 3;
    const batches = [];
    for (let i = 0; i < lista.length; i += batchSize) {
        batches.push(lista.slice(i, i + batchSize));
    }

    const statusTexto = document.getElementById('statusImportacaoTexto');
    let processed = 0;

    for (let batch of batches) {
        const promises = batch.map(async (cliente) => {
            const nomeLimpo = limparNome(cliente.nome || '');
            const telefoneLimpo = limparTelefone(cliente.telefone || '');

            if (!nomeLimpo || nomeLimpo === 'Contato' || !telefoneLimpo || telefoneLimpo.length < 10) {
                errorCount++;
                return;
            }

            try {
                const res = await fetch('/api/clientes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        nome: nomeLimpo,
                        telefone: telefoneLimpo,
                        email: cliente.email || ''
                    })
                });

                const data = await res.json();
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                    console.warn('⚠️ Erro ao salvar:', cliente.nome, data.message);
                }
            } catch (err) {
                errorCount++;
                console.error('❌ Erro ao salvar:', err);
            }
        });

        await Promise.all(promises);
        processed += batch.length;

        if (statusTexto) {
            statusTexto.textContent = `💾 Salvando... ${processed}/${total} (${successCount} OK, ${errorCount} erros)`;
        }
    }

    hideLoading();
    fecharModalImportarCSV();

    if (successCount > 0) {
        showToast(`✅ ${successCount} contatos importados! ${errorCount > 0 ? `⚠️ ${errorCount} erros` : ''}`, errorCount > 0 ? 'warning' : 'success');
        await carregarClientes();
    } else {
        showToast('❌ Falha na importação. Verifique os dados.', 'error');
    }
}

// ============================================
// FUNÇÕES DE PROMOÇÃO
// ============================================

function abrirModalPromocao() {
    const isMobile = window.innerWidth < 768;

    let clientesComWhatsApp = clientesCompletos.filter(c => c.telefone && c.telefone.trim() !== '');

    if (clientesComWhatsApp.length === 0) {
        showToast('⚠️ Nenhum cliente com WhatsApp cadastrado', 'warning');
        return;
    }

    const gruposExistentes = new Set();
    clientesCompletos.forEach(c => {
        if (c.grupos && Array.isArray(c.grupos)) {
            c.grupos.forEach(g => gruposExistentes.add(g));
        }
    });

    const gruposPadrao = ['Premium', 'Frequentes', 'Promoções', 'Aniversariantes', 'Amigos', 'Indicados', 'Especiais', 'VIP', 'Sumidos'];
    const todosGrupos = new Set([...gruposPadrao, ...gruposExistentes]);
    const gruposAtivos = Array.from(todosGrupos).sort();

    console.log('📋 Grupos disponíveis para promoção:', gruposAtivos);

    let listaClientesHTML = '';
    const totalClientes = clientesComWhatsApp.length;

    for (let c of clientesComWhatsApp) {
        const classificacaoIcon = c.classificacao === 'vip' ? '⭐' :
            c.classificacao === 'frequente' ? '🔥' :
            c.classificacao === 'sumido' ? '😴' : '👤';

        const gruposLabels = c.grupos && Array.isArray(c.grupos) ? c.grupos.map(g =>
            `<span style="background:rgba(139,92,246,0.1);padding:1px 6px;border-radius:8px;font-size:8px;color:#8b5cf6;">${g}</span>`
        ).join(' ') : '';

        listaClientesHTML += `
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border-color);" 
                 class="cliente-item" 
                 data-id="${c.id}"
                 data-nome="${c.nome.toLowerCase()}" 
                 data-telefone="${c.telefone || ''}" 
                 data-grupos="${(c.grupos || []).join(',')}"
                 data-classificacao="${c.classificacao}">
                <input type="checkbox" id="cliente_${c.id}" value="${c.id}" checked style="width:16px;height:16px;cursor:pointer;">
                <label for="cliente_${c.id}" style="flex:1;cursor:pointer;font-size:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
                    <span>
                        ${classificacaoIcon} ${escapeHtml(String(c.nome || 'Cliente'))}
                        <span style="font-size:10px;color:var(--text-muted);margin-left:4px;">${c.telefone}</span>
                    </span>
                    <span style="display:flex;gap:2px;flex-wrap:wrap;">
                        ${gruposLabels}
                        <span style="font-size:9px;color:var(--text-muted);background:var(--bg-hover);padding:0 6px;border-radius:6px;">
                            ${c.total_concluidos} atend.
                        </span>
                    </span>
                </label>
            </div>
        `;
    }

    let gruposOptions = '<option value="todos">📊 Todos</option>';
    for (let g of gruposAtivos) {
        const count = clientesComWhatsApp.filter(c =>
            c.grupos && Array.isArray(c.grupos) && c.grupos.includes(g)
        ).length;
        gruposOptions += `<option value="${g}">🏷️ ${g} (${count})</option>`;
    }

    const modalHtml = `
        <div id="modalPromocao" class="modal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 99999; align-items: center; justify-content: center; padding: 16px;">
            <div class="modal-content" style="max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; background: var(--bg-card); border-radius: 16px; padding: ${isMobile ? '16px' : '24px'}; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: ${isMobile ? '16px' : '20px'}; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                        <i class="fas fa-bullhorn" style="color: #25D366;"></i>
                        Disparar Promoção
                    </h3>
                    <button onclick="fecharModalPromocao()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-muted);">&times;</button>
                </div>

                <div style="background: rgba(37,211,102,0.08); border-radius: 10px; padding: 12px; margin-bottom: 16px; border: 1px solid rgba(37,211,102,0.15);">
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                        <span style="color: var(--text-muted); font-size: 13px;">📱 <strong id="totalClientesWhats">${totalClientes}</strong> clientes com WhatsApp</span>
                        <span style="color: var(--text-muted); font-size: 13px;">⏱️ Aprox. <strong>${Math.ceil(totalClientes * 3 / 60)}</strong> minuto(s)</span>
                    </div>
                </div>

                <form id="formPromocao" onsubmit="event.preventDefault(); enviarPromocao();" style="display:flex;flex-direction:column;gap:12px;">
                    <div class="form-group" style="margin:0;">
                        <label style="font-size:13px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">📝 Mensagem</label>
                        <textarea id="mensagemPromocao" class="form-control" rows="4" required style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:14px; resize:vertical; min-height:100px;" placeholder="Digite a mensagem...">🎉 OFERTA ESPECIAL! 🎉

Venha aproveitar nossa promoção imperdível!

📍 Agende já!</textarea>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">⏱️ Delay (segundos)</label>
                            <input type="number" id="delayPromocao" class="form-control" value="3" min="2" max="10" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:14px;">
                            <small style="color:var(--text-muted);font-size:10px;">Recomendado: 3-5s</small>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px;">👥 Filtrar por Grupo</label>
                            <select id="filtroGrupoPromocao" class="form-control" onchange="filtrarClientesPromocao()" style="width:100%; padding:8px 10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-primary); font-size:14px;">
                                ${gruposOptions}
                            </select>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px 8px;">
                        <i class="fas fa-search" style="color: var(--text-muted); font-size: 14px;"></i>
                        <input type="text" id="buscaClientePromocao" 
                               placeholder="🔍 Buscar cliente por nome ou telefone..." 
                               style="border: none; background: transparent; padding: 6px 8px; font-size: 13px; width: 100%; outline: none; color: var(--text-primary);"
                               oninput="filtrarClientesPromocao()"
                               autocomplete="off">
                        <button onclick="document.getElementById('buscaClientePromocao').value = ''; filtrarClientesPromocao();" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 8px;">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </div>

                    <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 8px; max-height: 300px; overflow-y: auto; background: var(--bg-hover);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border-color);">
                            <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">👥 Selecionar</span>
                            <div style="display:flex;gap:8px;">
                                <button type="button" onclick="selecionarTodosClientes(true)" style="font-size:11px;padding:2px 10px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);cursor:pointer;">Todos</button>
                                <button type="button" onclick="selecionarTodosClientes(false)" style="font-size:11px;padding:2px 10px;border-radius:4px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);cursor:pointer;">Nenhum</button>
                            </div>
                        </div>
                        <div id="listaClientesPromocao" style="max-height: 250px; overflow-y: auto;">
                            ${listaClientesHTML}
                        </div>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:-4px;">
                        <span id="contadorSelecionados">${totalClientes}</span> clientes selecionados
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <button type="button" onclick="fecharModalPromocao()" style="padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer;">Cancelar</button>
                        <button type="submit" id="btnEnviarPromocao" style="padding: 10px 28px; border-radius: 8px; border: none; background: linear-gradient(135deg, #25D366, #128C7E); color: white; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(37,211,102,0.3); width: ${isMobile ? '100%' : 'auto'}; justify-content: center;">
                            <i class="fab fa-whatsapp"></i> Enviar
                        </button>
                    </div>
                </form>

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

    setTimeout(() => {
        const select = document.getElementById('filtroGrupoPromocao');
        if (select && select.value !== 'todos') {
            filtrarClientesPromocao();
        }
        atualizarContadorSelecionados();
    }, 100);
}

function fecharModalPromocao() {
    const modal = document.getElementById('modalPromocao');
    if (modal) modal.remove();
    promocaoEmAndamento = false;
}

function filtrarClientesPromocao() {
    try {
        const filtroGrupo = document.getElementById('filtroGrupoPromocao')?.value || 'todos';
        const termoBusca = document.getElementById('buscaClientePromocao')?.value?.toLowerCase().trim() || '';

        const container = document.getElementById('listaClientesPromocao');
        if (!container) {
            console.log('⚠️ Container listaClientesPromocao não encontrado');
            return;
        }

        const items = container.querySelectorAll('.cliente-item');
        if (!items || items.length === 0) {
            return;
        }

        let visiveis = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (!checkbox) continue;

            const nome = (item.dataset.nome || '').toLowerCase();
            const telefone = item.dataset.telefone || '';
            const gruposData = item.dataset.grupos || '';
            const gruposArray = gruposData ? gruposData.split(',').filter(g => g.trim() !== '') : [];

            let mostrar = true;

            if (filtroGrupo !== 'todos') {
                if (!gruposArray.includes(filtroGrupo)) {
                    mostrar = false;
                }
            }

            if (mostrar && termoBusca) {
                const nomeMatch = nome.includes(termoBusca);
                const telefoneMatch = telefone.includes(termoBusca);
                if (!nomeMatch && !telefoneMatch) {
                    mostrar = false;
                }
            }

            item.style.display = mostrar ? 'flex' : 'none';
            if (mostrar) visiveis++;
        }

        atualizarContadorSelecionados();
    } catch (error) {
        console.error('❌ Erro ao filtrar clientes:', error);
    }
}

function selecionarTodosClientes(selecionar) {
    try {
        const container = document.getElementById('listaClientesPromocao');
        if (!container) {
            console.log('⚠️ Container listaClientesPromocao não encontrado');
            return;
        }

        const items = container.querySelectorAll('.cliente-item');
        if (!items || items.length === 0) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.style.display !== 'none') {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = selecionar;
                }
            }
        }
        atualizarContadorSelecionados();
    } catch (error) {
        console.error('❌ Erro ao selecionar todos:', error);
    }
}

function atualizarContadorSelecionados() {
    try {
        const container = document.getElementById('listaClientesPromocao');
        if (!container) {
            console.log('⚠️ Container listaClientesPromocao não encontrado');
            return;
        }

        const items = container.querySelectorAll('.cliente-item');
        if (!items || items.length === 0) {
            const contador = document.getElementById('contadorSelecionados');
            if (contador) contador.textContent = '0';
            return;
        }

        let selecionados = 0;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.style.display !== 'none') {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.checked) {
                    selecionados++;
                }
            }
        }

        const contador = document.getElementById('contadorSelecionados');
        if (contador) {
            contador.textContent = selecionados;
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar contador:', error);
    }
}

function normalizarNumero(telefone) {
    if (!telefone) return '';
    let numero = telefone.replace(/\D/g, '');

    if (numero.startsWith('0')) {
        numero = numero.substring(1);
    }

    if (numero.length === 10 || numero.length === 11) {
        return '55' + numero;
    }

    if (numero.length === 13 && numero.startsWith('55')) {
        return numero;
    }

    if (numero.length === 12 && numero.startsWith('55')) {
        return numero;
    }

    return numero;
}

async function enviarPromocao() {
    if (promocaoEmAndamento || envioLock) {
        showToast('⏳ Já está enviando, aguarde...', 'warning');
        return;
    }

    envioLock = true;
    promocaoEmAndamento = true;

    const mensagem = document.getElementById('mensagemPromocao').value.trim();
    if (!mensagem) {
        showToast('⚠️ Digite uma mensagem', 'warning');
        envioLock = false;
        promocaoEmAndamento = false;
        return;
    }

    const container = document.getElementById('listaClientesPromocao');
    const items = container.querySelectorAll('.cliente-item');

    const idsSelecionados = [];
    for (let item of items) {
        if (item.style.display !== 'none') {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                idsSelecionados.push(parseInt(checkbox.value));
            }
        }
    }

    if (idsSelecionados.length === 0) {
        showToast('⚠️ Selecione pelo menos um cliente visível', 'warning');
        envioLock = false;
        promocaoEmAndamento = false;
        return;
    }

    const clientesAlvo = clientesCompletos.filter(c =>
        idsSelecionados.includes(c.id) && c.telefone && c.telefone.trim() !== ''
    );

    if (clientesAlvo.length === 0) {
        showToast('⚠️ Nenhum cliente válido', 'warning');
        envioLock = false;
        promocaoEmAndamento = false;
        return;
    }

    const tempoEstimado = Math.ceil(clientesAlvo.length * 7 / 60);
    if (!confirm(`📱 Enviar promoção para ${clientesAlvo.length} cliente(s)?\n\n⏱️ Tempo estimado: ~${tempoEstimado} minuto(s)`)) {
        envioLock = false;
        promocaoEmAndamento = false;
        return;
    }

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
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const empresaId = usuario.empresa_id;

    let enviados = 0;
    let erros = 0;
    let duplicados = 0;
    const total = clientesAlvo.length;

    const enviadosCache = new Set();

    function getDelay(index, total) {
        const baseDelay = 5000 + Math.random() * 5000;
        if (index % 10 === 0 && index > 0) {
            return 20000 + Math.random() * 10000;
        }
        if (index % 50 === 0 && index > 0) {
            return 60000 + Math.random() * 60000;
        }
        return baseDelay;
    }

    function getMensagemComNome(cliente, mensagemBase) {
        if (Math.random() < 0.3 && cliente.nome) {
            const saudacoes = ['Olá', 'Oi', 'Oie', 'E aí', 'Fala'];
            const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];
            return `${saudacao} ${cliente.nome}! ${mensagemBase}`;
        }
        return mensagemBase;
    }

    for (let i = 0; i < clientesAlvo.length; i++) {
        const cliente = clientesAlvo[i];
        const telefoneRaw = cliente.telefone || '';
        const telefone = normalizarNumero(telefoneRaw);

        const chaveLocal = `${telefone}_${mensagem.substring(0, 20)}`;

        if (enviadosCache.has(chaveLocal)) {
            duplicados++;
            console.log(`⏭️ Duplicada local: ${cliente.nome} (${telefone})`);
            const progresso = Math.round(((i + 1) / total) * 100);
            progressoTexto.textContent = `Enviando ${i + 1}/${total}... (${duplicados} duplicadas)`;
            progressoBarra.style.width = progresso + '%';
            progressoPorcentagem.textContent = progresso + '%';
            progressoStatus.textContent = `⏭️ ${cliente.nome} - Duplicada (ignorada)`;
            continue;
        }

        const progresso = Math.round(((i + 1) / total) * 100);
        progressoTexto.textContent = `Enviando ${i + 1}/${total}...`;
        progressoBarra.style.width = progresso + '%';
        progressoPorcentagem.textContent = progresso + '%';
        progressoStatus.textContent = `📱 ${cliente.nome} - Enviando...`;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${i + 1}/${total}`;

        try {
            const mensagemFinal = getMensagemComNome(cliente, mensagem);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            console.log(`📤 Enviando para ${cliente.nome} (${telefone}) - Empresa: ${empresaId}`);

            const response = await fetch('/api/whatsapp/enviar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    empresa_id: empresaId,
                    numero: telefone,
                    mensagem: mensagemFinal
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (result.success) {
                enviados++;
                enviadosCache.add(chaveLocal);
                progressoStatus.textContent = `✅ ${cliente.nome} - Enviado!`;
                console.log(`✅ Enviado: ${cliente.nome} (${telefone}) via ${result.data?.instanceName || 'instância'}`);
            } else {
                erros++;
                progressoStatus.textContent = `❌ ${cliente.nome} - Erro: ${result.message || 'Falha'}`;
                console.error(`❌ Erro: ${cliente.nome}`, result.message);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                erros++;
                progressoStatus.textContent = `⏰ ${cliente.nome} - Timeout`;
                console.error(`⏰ Timeout: ${cliente.nome}`);
            } else {
                erros++;
                progressoStatus.textContent = `❌ ${cliente.nome} - Erro de conexão`;
                console.error(`❌ Erro: ${cliente.nome}`, error);
            }
        }

        if (i < clientesAlvo.length - 1) {
            const delay = getDelay(i + 1, total);
            const segundos = Math.round(delay / 1000);
            progressoStatus.textContent = `⏳ Aguardando ${segundos}s...`;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    progressoStatus.textContent = `✅ Finalizado! ${enviados} enviados, ${erros} erros, ${duplicados} duplicados`;
    btn.disabled = false;
    btn.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar';

    envioLock = false;
    promocaoEmAndamento = false;

    let msgFinal = `✅ ${enviados} mensagens enviadas!`;
    if (erros > 0) msgFinal += ` ⚠️ ${erros} erros`;
    if (duplicados > 0) msgFinal += ` ⏭️ ${duplicados} duplicadas ignoradas`;

    showToast(msgFinal, erros > 0 ? 'warning' : 'success');

    setTimeout(() => {
        if (enviados === total && erros === 0) {
            fecharModalPromocao();
        }
    }, 5000);
}

// ============================================
// FORÇAR ATUALIZAÇÃO DOS GRUPOS
// ============================================

async function forcarAtualizacaoGrupos() {
    console.log('🔄 Forçando atualização dos grupos...');

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/clientes/grupos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.ok) {
            const data = await res.json();
            const clientes = data.data?.clientes || [];
            const grupos = data.data?.grupos || [];

            const gruposMap = {};
            for (const c of clientes) {
                gruposMap[c.id] = c.grupos || [];
            }

            clientesCompletos.forEach(c => {
                if (gruposMap[c.id]) {
                    c.grupos = gruposMap[c.id];
                } else {
                    c.grupos = [];
                }
            });

            gruposClientes = grupos;

            console.log('✅ Grupos atualizados localmente');
            renderizarClientesOtimizado(clientesCompletos);
            showToast('✅ Grupos atualizados com sucesso!', 'success');
        } else {
            showToast('❌ Erro ao atualizar grupos', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao forçar atualização:', error);
        showToast('❌ Erro ao conectar com o servidor', 'error');
    }
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarClientes = carregarClientes;
window.buscarClientes = buscarClientes;
window.limparBuscaClientes = limparBuscaClientes;
window.setFiltroClientes = setFiltroClientes;
window.setFiltroGrupo = setFiltroGrupo;
window.filtrarPorLetra = filtrarPorLetra;
window.limparFiltroLetra = limparFiltroLetra;
window.renderizarClientesOtimizado = renderizarClientesOtimizado;
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
window.abrirModalImportarCSV = abrirModalImportarCSV;
window.fecharModalImportarCSV = fecharModalImportarCSV;
window.handleFileSelectDesktop = handleFileSelectDesktop;
window.processarArquivoContatosDesktop = processarArquivoContatosDesktop;
window.parseVCFMobile = parseVCFMobile;
window.parseCSVMobile = parseCSVMobile;
window.salvarLoteClientesDesktop = salvarLoteClientesDesktop;
window.abrirModalPromocao = abrirModalPromocao;
window.fecharModalPromocao = fecharModalPromocao;
window.enviarPromocao = enviarPromocao;
window.selecionarTodosClientes = selecionarTodosClientes;
window.atualizarContadorSelecionados = atualizarContadorSelecionados;
window.filtrarClientesPromocao = filtrarClientesPromocao;
window.abrirModalGrupos = abrirModalGrupos;
window.fecharModalGrupos = fecharModalGrupos;
window.toggleGrupoCliente = toggleGrupoCliente;
window.criarNovoGrupo = criarNovoGrupo;
window.salvarGruposCliente = salvarGruposCliente;
window.excluirGrupoCliente = excluirGrupoCliente;
window.aplicarFiltrosClientes = aplicarFiltrosClientes;
window.carregarClientesBackground = carregarClientesBackground;
window.renderizarListaClientes = renderizarListaClientes;
window.forcarAtualizacaoGrupos = forcarAtualizacaoGrupos;
window.atualizarBotoesFiltro = atualizarBotoesFiltro;

console.log('✅ clientes.js carregado (OTIMIZADO COM RENDERIZAÇÃO EM BATCHES)');