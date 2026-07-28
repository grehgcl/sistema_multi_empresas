// ============================================
// CLIENTES.JS - VERSÃO CRM COMPLETA + MOBILE BLINDADO
// ULTIMA ATUALIZACAO: 28/07/2026
// CORREÇÃO: REMOÇÃO DE FUNÇÕES DUPLICADAS + BUSCA MOBILE MELHORADA
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
// FUNÇÕES DE LIMPEZA
// ============================================

function limparNome(nome) {
    if (!nome) return 'Contato';

    let limpo = String(nome)
        .replace(/[^\w\sÀ-ú]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[0-9]/g, '')
        .trim();

    if (!limpo || limpo.length < 2) {
        return 'Contato';
    }

    return limpo.split(' ').map(palavra =>
        palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase()
    ).join(' ');
}

function limparTelefone(telefone) {
    if (!telefone) return '';
    return String(telefone).replace(/\D/g, '');
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let clientesCompletos = [];
let filtroClientes = 'todos';
let filtroGrupo = 'todos';
let termoBuscaClientes = '';
let promocaoEmAndamento = false;
let carregandoClientes = false;
let gruposClientes = [];
let clienteEditandoGrupos = null;
let gruposSelecionadosTemp = [];
let timeoutBusca = null;
let resizeTimeoutClientes = null;
let ultimoResizeClientes = 0;
let envioLock = false;
let carregandoBackground = false;
// ============================================
// PREVENIR RECARREGAMENTOS NO MOBILE
// ============================================

// 🔥 PREVINE QUE O TOQUE NO INPUT DISPARE RECARGA
document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('buscaClientesInput');
    if (input) {
        input.addEventListener('focus', function (e) {
            e.stopPropagation();
            console.log('📱 Input focado, evitando recarga');
        }, { passive: true });

        input.addEventListener('click', function (e) {
            e.stopPropagation();
        }, { passive: true });

        input.addEventListener('touchstart', function (e) {
            e.stopPropagation();
        }, { passive: true });
    }
});

// OU usa MutationObserver para capturar quando o input for criado
const observerInput = new MutationObserver(function () {
    const input = document.getElementById('buscaClientesInput');
    if (input && !input._eventosAdicionados) {
        input._eventosAdicionados = true;
        input.addEventListener('focus', function (e) {
            e.stopPropagation();
        }, { passive: true });
        input.addEventListener('click', function (e) {
            e.stopPropagation();
        }, { passive: true });
        input.addEventListener('touchstart', function (e) {
            e.stopPropagation();
        }, { passive: true });
        console.log('✅ Eventos de prevenção adicionados ao input');
    }
});

observerInput.observe(document.body, {
    childList: true,
    subtree: true
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
// ABRIR MODAL DE GERENCIAR GRUPOS
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

                <!-- GRUPOS ATUAIS COM BOTÃO DE EXCLUIR -->
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

// ============================================
// EXCLUIR GRUPO DO CLIENTE
// ============================================

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
// TOGGLE GRUPO CLIENTE
// ============================================

async function toggleGrupoCliente(grupo) {
    const btn = document.getElementById(`grupo_btn_${grupo.replace(/\s/g, '_')}`);
    if (!btn) return;

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
}

// ============================================
// CRIAR NOVO GRUPO
// ============================================

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

            const input = document.getElementById('novoGrupoInput');
            if (input) input.value = '';

            showToast(`Grupo "${nome}" criado e adicionado! ✅`, 'success');
        }, 150);
    }, 150);
}

// ============================================
// ATUALIZAR GRUPOS ATUAIS
// ============================================

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

// ============================================
// SALVAR GRUPOS DO CLIENTE
// ============================================

async function salvarGruposCliente() {
    if (!clienteEditandoGrupos) return;

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/clientes/${clienteEditandoGrupos}/grupos`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ grupos: gruposSelecionadosTemp })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('Grupos atualizados com sucesso!', 'success');
            fecharModalGrupos();

            const clienteIndex = clientesCompletos.findIndex(c => c.id === clienteEditandoGrupos);
            if (clienteIndex !== -1) {
                clientesCompletos[clienteIndex].grupos = [...gruposSelecionadosTemp];
                console.log(`✅ Cliente atualizado: ${clientesCompletos[clienteIndex].nome} → Grupos:`, gruposSelecionadosTemp);
            }

            renderizarListaClientes();

            if (filtroGrupo !== 'todos') {
                setTimeout(() => {
                    const botoes = document.querySelectorAll('[onclick*="setFiltroGrupo"]');
                    for (let btn of botoes) {
                        const onclick = btn.getAttribute('onclick');
                        if (onclick && onclick.includes(`'${filtroGrupo}'`)) {
                            btn.click();
                            break;
                        }
                    }
                }, 200);
            }

        } else {
            showToast(data.message || 'Erro ao salvar grupos', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar grupos:', error);
        hideLoading();
        showToast('Erro ao salvar grupos', 'error');
    }
}

// ============================================
// SET FILTRO GRUPO
// ============================================

function setFiltroGrupo(grupo) {
    console.log(`🔍 Filtrando por grupo: ${grupo}`);

    filtroGrupo = grupo;
    if (filtroClientes !== 'todos') {
        filtroClientes = 'todos';
    }

    if (window._filtroTimeout) {
        clearTimeout(window._filtroTimeout);
    }

    window._filtroTimeout = setTimeout(() => {
        const clientesFiltrados = clientesCompletos.filter(c => {
            if (filtroGrupo !== 'todos') {
                return c.grupos && Array.isArray(c.grupos) && c.grupos.includes(filtroGrupo);
            }
            return true;
        });

        atualizarListaClientes(clientesFiltrados);
        atualizarBotoesFiltro();

        console.log(`✅ Filtro aplicado: ${clientesFiltrados.length} clientes encontrados`);
    }, 100);
}

// ============================================
// APLICAR FILTRO DO GRUPO ATUAL
// ============================================

function aplicarFiltroGrupoAtual() {
    if (filtroGrupo === 'todos') return;

    const botoes = document.querySelectorAll('[onclick*="setFiltroGrupo"]');
    for (let btn of botoes) {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(`'${filtroGrupo}'`)) {
            btn.click();
            return;
        }
    }

    carregarClientes();
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

    let clientesFiltrados = clientesCompletos;

    if (termoBuscaClientes) {
        const busca = termoBuscaClientes.toLowerCase().trim();
        clientesFiltrados = clientesFiltrados.filter(c => {
            const nomeMatch = c.nome.toLowerCase().includes(busca);
            const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(busca);
            const emailMatch = c.email && c.email.toLowerCase().includes(busca);
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

    if (filtroGrupo !== 'todos') {
        clientesFiltrados = clientesFiltrados.filter(c =>
            c.grupos && Array.isArray(c.grupos) && c.grupos.includes(filtroGrupo)
        );
    }

    atualizarListaClientes(clientesFiltrados);
    atualizarBotoesFiltro();
}

// ============================================
// RENDERIZAR LISTA DE CLIENTES
// ============================================

function renderizarListaClientes() {
    const content = document.getElementById('content');
    if (!content || !content.innerHTML.includes('👥 Clientes')) {
        return;
    }

    const isMobile = window.innerWidth < 768;

    let clientesFiltrados = clientesCompletos;

    if (termoBuscaClientes) {
        const busca = termoBuscaClientes.toLowerCase().trim();
        clientesFiltrados = clientesFiltrados.filter(c => {
            const nomeMatch = c.nome.toLowerCase().includes(busca);
            const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(busca);
            const emailMatch = c.email && c.email.toLowerCase().includes(busca);
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

    if (filtroGrupo !== 'todos') {
        clientesFiltrados = clientesFiltrados.filter(c =>
            c.grupos && Array.isArray(c.grupos) && c.grupos.includes(filtroGrupo)
        );
    }

    atualizarListaClientes(clientesFiltrados);
    atualizarBotoesFiltro();
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
            fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/clientes/grupos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!resClientes.ok) {
            carregandoBackground = false;
            return;
        }

        const dataClientes = await resClientes.json();
        const dataAgendamentos = await resAgendamentos.json();
        const dataGrupos = resGrupos.ok ? await resGrupos.json() : { data: {} };

        const clientes = dataClientes.data || [];
        const agendamentos = dataAgendamentos.data || [];
        const gruposMap = dataGrupos.data || {};

        clientesCompletos = clientes.map(cliente => {
            const ags = agendamentos.filter(a => a.cliente_id === cliente.id);
            const agsConcluidos = ags.filter(a => a.status === 'concluido');

            let valorTotal = 0;
            agsConcluidos.forEach(a => {
                valorTotal += parseFloat(a.valor_total) || parseFloat(a.valor) || 0;
            });

            const ticketMedio = agsConcluidos.length > 0 ? valorTotal / agsConcluidos.length : 0;

            let ultimaVisita = null;
            if (agsConcluidos.length > 0) {
                const datas = agsConcluidos.map(a => new Date(a.data + 'T00:00:00'));
                ultimaVisita = new Date(Math.max(...datas));
            }

            let diasDesdeUltima = null;
            if (ultimaVisita) {
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

            const grupos = gruposMap[cliente.id] || [];

            return {
                ...cliente,
                total_agendamentos: ags.length,
                total_concluidos: agsConcluidos.length,
                valor_total: valorTotal,
                ticket_medio: ticketMedio,
                ultima_visita: ultimaVisita,
                dias_sem_visita: diasDesdeUltima,
                classificacao: classificacao,
                icone: icone,
                grupos: grupos
            };
        });

        clientesCompletos.sort((a, b) => b.total_concluidos - a.total_concluidos);

        aplicarFiltrosClientes();

        console.log(`✅ Background: ${clientesCompletos.length} clientes atualizados`);

    } catch (error) {
        console.error('❌ Erro no background:', error);
    }

    carregandoBackground = false;
}

// ============================================
// CARREGAR CLIENTES (PRINCIPAL)
// ============================================

async function carregarClientes() {
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
            fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/clientes/grupos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!resClientes.ok || !resAgendamentos.ok) {
            throw new Error('Erro ao buscar dados do servidor');
        }

        const dataClientes = await resClientes.json();
        const dataAgendamentos = await resAgendamentos.json();
        const dataGrupos = resGrupos.ok ? await resGrupos.json() : { data: {} };

        const clientes = dataClientes.data || [];
        const agendamentos = dataAgendamentos.data || [];
        const gruposMap = dataGrupos.data || {};

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

            const grupos = gruposMap[cliente.id] || [];

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
                icone: icone,
                grupos: grupos
            };
        });

        clientesCompletos.sort((a, b) => b.total_concluidos - a.total_concluidos);

        const isMobile = window.innerWidth < 768;

        let clientesFiltrados = clientesCompletos;

        if (termoBuscaClientes) {
            const busca = termoBuscaClientes.toLowerCase().trim();
            clientesFiltrados = clientesFiltrados.filter(c => {
                const nomeMatch = c.nome.toLowerCase().includes(busca);
                const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(busca);
                const emailMatch = c.email && c.email.toLowerCase().includes(busca);
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

        if (filtroGrupo !== 'todos') {
            clientesFiltrados = clientesFiltrados.filter(c =>
                c.grupos && Array.isArray(c.grupos) && c.grupos.includes(filtroGrupo)
            );
        }

        const totalClientes = clientesCompletos.length;
        const vipCount = clientesCompletos.filter(c => c.classificacao === 'vip').length;
        const sumidosCount = clientesCompletos.filter(c => c.classificacao === 'sumido').length;
        const frequentesCount = clientesCompletos.filter(c => c.classificacao === 'frequente').length;
        const comWhatsApp = clientesCompletos.filter(c => c.telefone && c.telefone.trim() !== '').length;
        const totalGasto = clientesCompletos.reduce((acc, c) => acc + c.valor_total, 0);
        const novosCount = clientesCompletos.filter(c => c.classificacao === 'novo').length;

        // ==========================================
        // RENDERIZAÇÃO HTML
        // ==========================================
        let html = `<div class="fade-in" style="padding-bottom: 80px;">`;

        html += `
            <div class="dashboard-header">
                <div>
                    <h2 class="page-title" style="font-size: ${isMobile ? '18px' : '24px'};">👥 Clientes</h2>
                    ${!isMobile ? `<p class="page-subtitle"><i class="fas fa-users"></i> Gerencie seus clientes e acompanhe métricas importantes</p>` : ''}
                </div>
                <div class="dashboard-actions" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                    <div style="display: flex; align-items: center; gap: 4px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; padding: 2px 4px; flex: 1; min-width: 100px; max-width: ${isMobile ? '100%' : '250px'};" 
     onclick="event.stopPropagation(); event.preventDefault();">
    <i class="fas fa-search" style="color: var(--text-muted); padding-left: 8px; font-size: 12px;"></i>
    <input type="text" id="buscaClientesInput" 
           placeholder="🔍 Buscar..." 
           inputmode="search"
           style="border: none; background: transparent; padding: 6px 8px; font-size: 12px; width: 100%; outline: none; color: var(--text-primary);"
           oninput="buscarClientes()"
           onsearch="buscarClientes()"
           onfocus="event.stopPropagation(); event.preventDefault();"
           onclick="event.stopPropagation(); event.preventDefault();"
           ontouchstart="event.stopPropagation(); event.preventDefault();"
           autocomplete="off"
           value="${escapeHtml(termoBuscaClientes)}"
           enterkeyhint="search"
    >
    <button onclick="event.stopPropagation(); event.preventDefault(); buscarClientesBotao();" 
            style="background: linear-gradient(135deg, #667eea, #764ba2); 
                   border: none; 
                   color: white; 
                   padding: ${isMobile ? '4px 8px' : '4px 12px'}; 
                   border-radius: 6px; 
                   cursor: pointer; 
                   font-size: ${isMobile ? '11px' : '12px'}; 
                   font-weight: 600;
                   min-width: ${isMobile ? '32px' : 'auto'};
                   display: flex;
                   align-items: center;
                   justify-content: center;">
        <i class="fas fa-search"></i>
        ${!isMobile ? ' Buscar' : ''}
    </button>
    <button onclick="event.stopPropagation(); event.preventDefault(); limparBuscaClientes();" 
            style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px 8px; font-size: 14px; display: ${termoBuscaClientes ? 'block' : 'none'};" 
            id="btnLimparBusca">
        <i class="fas fa-times-circle"></i>
    </button>
</div>
                    
                    <button class="btn btn-whatsapp" onclick="abrirModalPromocao()" style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 6px 12px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: ${isMobile ? '11px' : '13px'};">
                        <i class="fas fa-bullhorn"></i> ${isMobile ? '' : 'Promoção'}
                    </button>
                    
                    ${!isMobile ? `
                    <!-- BOTÃO IMPORTAR DESATIVADO TEMPORARIAMENTE
                    <button class="btn btn-success" onclick="abrirModalImportarCSV()" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 6px 14px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
                        <i class="fas fa-file-csv"></i> Importar
                    </button>
                    -->
                    ` : ''}
                    
                    <button class="btn btn-primary" onclick="abrirModalCliente()" style="padding: 6px 12px; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-size: ${isMobile ? '11px' : '13px'}; background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                        <i class="fas fa-plus"></i> ${isMobile ? '' : 'Novo'}
                    </button>
                </div>
            </div>

            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                <button onclick="setFiltroClientes('todos')" class="btn ${filtroClientes === 'todos' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '10px' : '12px'}; padding: 3px 10px;">📊 Todos (${totalClientes})</button>
                <button onclick="setFiltroClientes('vip')" class="btn ${filtroClientes === 'vip' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '10px' : '12px'}; padding: 3px 10px;">⭐ VIP (${vipCount})</button>
                <button onclick="setFiltroClientes('frequentes')" class="btn ${filtroClientes === 'frequentes' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '10px' : '12px'}; padding: 3px 10px;">🔥 Frequentes (${frequentesCount})</button>
                <button onclick="setFiltroClientes('sumidos')" class="btn ${filtroClientes === 'sumidos' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '10px' : '12px'}; padding: 3px 10px;">😴 Sumidos (${sumidosCount})</button>
                <button onclick="setFiltroClientes('novos')" class="btn ${filtroClientes === 'novos' ? 'btn-primary' : 'btn-outline'}" style="font-size: ${isMobile ? '10px' : '12px'}; padding: 3px 10px;">🌱 Novos (${novosCount})</button>
                
                <button onclick="apagarTodosClientes()" class="btn btn-danger" style="margin-left: auto; white-space: nowrap; font-size: ${isMobile ? '9px' : '11px'}; padding: 3px 10px; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fas fa-trash-alt"></i> ${isMobile ? '' : 'Apagar Todos'}
                </button>
            </div>`;

        // FILTROS POR GRUPO
        const gruposDisponiveis = new Set();
        clientesCompletos.forEach(c => {
            if (c.grupos && Array.isArray(c.grupos)) {
                c.grupos.forEach(g => gruposDisponiveis.add(g));
            }
        });
        const gruposArray = Array.from(gruposDisponiveis);

        if (gruposArray.length > 0) {
            html += `
                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; padding: 8px 0; border-top: 1px solid var(--border-color);">
                    <span style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-right: 4px;">
                        <i class="fas fa-tags" style="color: #8b5cf6;"></i> Grupos:
                    </span>
                    ${gruposArray.map(g => `
                        <button onclick="setFiltroGrupo('${g}')" 
                                class="btn ${filtroGrupo === g ? 'btn-primary' : 'btn-outline'}" 
                                style="font-size: 10px; padding: 3px 10px; border-color: #8b5cf6; color: ${filtroGrupo === g ? '#fff' : '#8b5cf6'};">
                            🏷️ ${g}
                        </button>
                    `).join('')}
                    ${filtroGrupo !== 'todos' ? `
                        <button onclick="setFiltroGrupo('todos')" class="btn btn-outline" style="font-size: 10px; padding: 3px 10px; border-color: #ef4444; color: #ef4444;">
                            <i class="fas fa-times"></i> Limpar
                        </button>
                    ` : ''}
                </div>
            `;
        }

        // STATS MINI - DESKTOP
        if (!isMobile) {
            html += `
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px;">
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid var(--border-color);">
                    <div style="font-size: 24px; font-weight: 700; color: var(--text-primary);">${clientesFiltrados.length}</div>
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-top: 2px;">📊 Total</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Clientes cadastrados</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #f59e0b; box-shadow: 0 2px 8px rgba(245,158,11,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #f59e0b;">${vipCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #f59e0b; margin-top: 2px;">⭐ VIP</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">+10 atendimentos / +R$500</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #22c55e; box-shadow: 0 2px 8px rgba(34,197,94,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #22c55e;">${frequentesCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #22c55e; margin-top: 2px;">🔥 Frequentes</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">+5 atendimentos</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #ef4444; box-shadow: 0 2px 8px rgba(239,68,68,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${sumidosCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #ef4444; margin-top: 2px;">😴 Sumidos</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">+60 dias sem visitar</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #667eea; box-shadow: 0 2px 8px rgba(102,126,234,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #667eea;">${novosCount}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #667eea; margin-top: 2px;">🌱 Novos</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">1º atendimento</div>
                </div>
                <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 12px; text-align: center; border: 2px solid #25D366; box-shadow: 0 2px 8px rgba(37,211,102,0.15);">
                    <div style="font-size: 24px; font-weight: 700; color: #25D366;">${comWhatsApp}</div>
                    <div style="font-size: 13px; font-weight: 600; color: #25D366; margin-top: 2px;"><i class="fab fa-whatsapp"></i> WhatsApp</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">Com telefone cadastrado</div>
                </div>
            </div>`;
        } else {
            // STATS MINI - MOBILE
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
            </div>`;
        }

        html += `
            <div class="card" style="padding: ${isMobile ? '10px' : '16px'};">
        `;

        if (clientesFiltrados.length > 0 || termoBuscaClientes) {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted); border-bottom: 1px solid var(--border-color); margin-bottom: 10px;">
                    <span>
                        ${termoBuscaClientes ? `🔍 "${escapeHtml(termoBuscaClientes)}" → ` : ''}
                        ${filtroGrupo !== 'todos' ? `🏷️ "${filtroGrupo}" → ` : ''}
                        <strong>${clientesFiltrados.length}</strong> de ${clientesCompletos.length}
                    </span>
                </div>
            `;
        }

        if (clientesFiltrados.length === 0) {
            html += `
                <div class="empty-state" style="padding: 20px; text-align: center;">
                    <i class="fas fa-user-plus" style="font-size: 32px; color: var(--text-muted);"></i>
                    <h4 style="font-size: 14px; margin: 8px 0;">${termoBuscaClientes ? 'Nenhum cliente encontrado' : 'Nenhum cliente'}</h4>
                    <button class="btn btn-primary btn-sm" onclick="${termoBuscaClientes ? 'limparBuscaClientes()' : 'setFiltroClientes(\'todos\')'}" style="font-size: 11px; padding: 4px 12px;">
                        <i class="fas fa-undo"></i> ${termoBuscaClientes ? 'Limpar Busca' : 'Mostrar Todos'}
                    </button>
                </div>
            `;
        } else if (isMobile) {
            // RENDERIZAÇÃO MOBILE (CARDS)
            html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
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

                const gruposLabels = c.grupos && Array.isArray(c.grupos) ? c.grupos.map(g =>
                    `<span style="background:rgba(139,92,246,0.1);padding:1px 6px;border-radius:8px;font-size:8px;color:#8b5cf6;margin:1px;">${g}</span>`
                ).join(' ') : '';

                html += `
                    <div style="background: var(--bg-card); border-radius: 12px; padding: 12px; border: 1px solid ${cor.border};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                                <div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;flex-shrink:0;">${inicial}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:13px;font-weight:600;color:var(--text-primary);">
                                        ${escapeHtml(String(c.nome || 'Cliente'))}
                                        <span style="font-size:11px;">${c.icone || ''}</span>
                                    </div>
                                    <div style="font-size:10px;color:var(--text-muted);">
                                        ${c.telefone ? `📱 ${escapeHtml(String(c.telefone))}` : 'Sem telefone'}
                                    </div>
                                    <div style="font-size:8px;margin-top:2px;">${gruposLabels}</div>
                                </div>
                            </div>
                            <span style="padding:1px 8px;border-radius:10px;font-size:9px;font-weight:600;background:${cor.bg};color:${cor.text};border:1px solid ${cor.border};white-space:nowrap;">
                                ${c.classificacao}
                            </span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;background:var(--bg-hover);border-radius:6px;padding:6px;margin:6px 0;">
                            <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:var(--text-primary);">${c.total_concluidos}</div><div style="font-size:8px;color:var(--text-muted);">Atend.</div></div>
                            <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:#22c55e;">R$ ${formatMoney(c.ticket_medio)}</div><div style="font-size:8px;color:var(--text-muted);">Ticket</div></div>
                            <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-primary)'};">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</div><div style="font-size:8px;color:var(--text-muted);">Última</div></div>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding-top:6px;border-top:1px solid var(--border-color);">
                            ${whatsappLink !== '#' ? `<a href="${whatsappLink}" target="_blank" style="text-align:center;padding:4px;border-radius:6px;background:rgba(37,211,102,0.1);color:#25D366;font-size:12px;text-decoration:none;"><i class="fab fa-whatsapp"></i></a>` : '<div></div>'}
                            <button onclick="editarCliente(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(102,126,234,0.1);color:#667eea;border:none;font-size:12px;"><i class="fas fa-pen"></i></button>
                            <button onclick="verHistoricoCliente(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(139,92,246,0.1);color:#8b5cf6;border:none;font-size:12px;"><i class="fas fa-history"></i></button>
                            <button onclick="abrirModalGrupos(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(139,92,246,0.1);color:#8b5cf6;border:none;font-size:12px;" title="Grupos"><i class="fas fa-tags"></i></button>
                            ${isBloqueado ? `<button onclick="desbloquearChatbot(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(34,197,94,0.1);color:#22c55e;border:none;font-size:12px;"><i class="fas fa-unlock"></i></button>` : `<button onclick="bloquearChatbot(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(239,68,68,0.1);color:#ef4444;border:none;font-size:12px;"><i class="fas fa-lock"></i></button>`}
                            <button onclick="excluirCliente(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(239,68,68,0.1);color:#ef4444;border:none;font-size:12px;"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        } else {
            // RENDERIZAÇÃO DESKTOP (TABELA)
            const cores = {
                vip: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
                frequente: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
                sumido: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
                novo: { bg: 'rgba(102,126,234,0.15)', text: '#667eea' },
                regular: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' }
            };

            html += `
            <div class="table-responsive" style="overflow-x: auto;">
                <table class="data-table" style="width: 100%; min-width: 800px; font-size: 13px;">
                    <thead>
                        <tr>
                            <th style="padding: 6px 8px;">#</th>
                            <th style="padding: 6px 8px;">Cliente</th>
                            <th style="padding: 6px 8px;">Telefone</th>
                            <th style="padding: 6px 8px;">Class.</th>
                            <th style="padding: 6px 8px;">Grupos</th>
                            <th style="padding: 6px 8px; text-align:center;">Atend.</th>
                            <th style="padding: 6px 8px; text-align:center;">Ticket</th>
                            <th style="padding: 6px 8px; text-align:center;">Última</th>
                            <th style="padding: 6px 8px; text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>`;
            for (let c of clientesFiltrados) {
                const isBloqueado = c.bloqueado_chatbot === 1;
                const telefone = c.telefone || '';
                const cor = cores[c.classificacao] || cores.regular;

                const gruposLabels = c.grupos && Array.isArray(c.grupos) ? c.grupos.map(g =>
                    `<span style="background:rgba(139,92,246,0.1);padding:1px 6px;border-radius:8px;font-size:9px;color:#8b5cf6;margin:1px;display:inline-block;">${g}</span>`
                ).join(' ') : '';

                html += `
                    <tr>
                        <td style="padding: 6px 8px; text-align:center;">${c.id}</td>
                        <td style="padding: 6px 8px;">
                            <strong>${escapeHtml(String(c.nome || 'Cliente'))}</strong> 
                            <span style="font-size:14px;">${c.icone || ''}</span>
                        </td>
                        <td style="padding: 6px 8px;">
                            ${telefone ? escapeHtml(String(telefone)) : '-'}
                            ${telefone ? `<a href="https://wa.me/55${telefone.replace(/\D/g, '')}" target="_blank" style="color:#25D366;text-decoration:none;margin-left:4px;"><i class="fab fa-whatsapp"></i></a>` : ''}
                        </td>
                        <td style="padding: 6px 8px;">
                            <span style="padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${cor.bg};color:${cor.text};">
                                ${c.icone || ''} ${c.classificacao}
                            </span>
                        </td>
                        <td style="padding: 6px 8px; font-size:10px;">
                            ${gruposLabels || '-'}
                        </td>
                        <td style="padding: 6px 8px; text-align:center;">${c.total_concluidos}</td>
                        <td style="padding: 6px 8px; text-align:center;font-weight:600;color:#22c55e;">
                            R$ ${formatMoney(c.ticket_medio)}
                        </td>
                        <td style="padding: 6px 8px; text-align:center;font-size:12px;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-muted)'};">
                            ${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}
                        </td>
                        <td style="padding: 6px 8px;">
                            <div style="display:flex;gap:2px;flex-wrap:wrap;justify-content:center;">
                                <button class="btn-icon btn-edit" onclick="editarCliente(${c.id})" title="Editar" style="padding:2px 6px;border:none;background:rgba(102,126,234,0.1);border-radius:4px;cursor:pointer;color:#667eea;">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button class="btn-icon" onclick="verHistoricoCliente(${c.id})" title="Histórico" style="padding:2px 6px;border:none;background:rgba(139,92,246,0.1);border-radius:4px;cursor:pointer;color:#8b5cf6;">
                                    <i class="fas fa-history"></i>
                                </button>
                                <button class="btn-icon" onclick="abrirModalGrupos(${c.id})" title="Grupos" style="padding:2px 6px;border:none;background:rgba(139,92,246,0.1);border-radius:4px;cursor:pointer;color:#8b5cf6;">
                                    <i class="fas fa-tags"></i>
                                </button>
                                ${isBloqueado ?
                        `<button class="btn-icon btn-unblock" onclick="desbloquearChatbot(${c.id})" title="Liberar" style="padding:2px 6px;border:none;background:rgba(34,197,94,0.1);border-radius:4px;cursor:pointer;color:#22c55e;">
                                    <i class="fas fa-unlock"></i>
                                </button>` :
                        `<button class="btn-icon btn-block" onclick="bloquearChatbot(${c.id})" title="Bloquear" style="padding:2px 6px;border:none;background:rgba(239,68,68,0.1);border-radius:4px;cursor:pointer;color:#ef4444;">
                                    <i class="fas fa-lock"></i>
                                </button>`
                    }
                                <button class="btn-icon btn-delete" onclick="excluirCliente(${c.id})" title="Excluir" style="padding:2px 6px;border:none;background:rgba(239,68,68,0.1);border-radius:4px;cursor:pointer;color:#ef4444;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
            }
            html += `</tbody></table></div>`;
        }

        html += `</div></div>`;

        document.getElementById('content').innerHTML = html;
        window.scrollTo(0, 0);

        console.log(`✅ Clientes renderizados: ${clientesFiltrados.length} de ${clientesCompletos.length}`);

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
// BUSCAR CLIENTES - CORRIGIDO PARA MOBILE
// ============================================

function buscarClientes() {
    const input = document.getElementById('buscaClientesInput');
    if (!input) return;

    const termo = input.value.toLowerCase().trim();
    termoBuscaClientes = termo;

    console.log(`🔍 Buscando: "${termo}"`);

    const btnLimpar = document.getElementById('btnLimparBusca');
    if (btnLimpar) {
        btnLimpar.style.display = termo ? 'block' : 'none';
    }

    if (timeoutBusca) {
        clearTimeout(timeoutBusca);
        timeoutBusca = null;
    }

    if (!termo) {
        carregarClientes();
        return;
    }

    if (clientesCompletos.length > 0) {
        const clientesFiltrados = clientesCompletos.filter(c => {
            const nomeMatch = c.nome.toLowerCase().includes(termo);
            const telefoneMatch = c.telefone && c.telefone.replace(/\D/g, '').includes(termo);
            const emailMatch = c.email && c.email.toLowerCase().includes(termo);
            return nomeMatch || telefoneMatch || emailMatch;
        });

        console.log(`✅ Encontrados ${clientesFiltrados.length} clientes`);

        atualizarListaClientes(clientesFiltrados);
        atualizarStatsClientes(clientesFiltrados);
    } else {
        carregarClientes();
    }
}

function buscarClientesBotao() {
    console.log('🔍 Busca via botão acionada!');
    if (window.event) {
        window.event.stopPropagation?.();
        window.event.preventDefault?.();
    }

    const input = document.getElementById('buscaClientesInput');
    if (input) {
        // 🔥 EVITA O FOQUE FORÇADO QUE PODE CAUSAR RECARGA
        setTimeout(() => {
            buscarClientes();
        }, 50);
    } else {
        buscarClientes();
    }
}

function limparBuscaClientes() {
    const input = document.getElementById('buscaClientesInput');
    if (input) {
        input.value = '';
        // 🔥 REMOVIDO: input.focus(); - causava recarga no mobile
    }

    termoBuscaClientes = '';

    const btnLimpar = document.getElementById('btnLimparBusca');
    if (btnLimpar) {
        btnLimpar.style.display = 'none';
    }

    if (timeoutBusca) {
        clearTimeout(timeoutBusca);
        timeoutBusca = null;
    }

    carregarClientes();
}

// ============================================
// ATUALIZAR STATS DOS CLIENTES
// ============================================

function atualizarStatsClientes(clientesFiltrados) {
    const totalExibidos = clientesFiltrados.length;
    const totalClientes = clientesCompletos.length;

    const contador = document.getElementById('contadorBuscaClientes');
    if (contador) {
        contador.innerHTML = `
            ${termoBuscaClientes ? `🔍 "${escapeHtml(termoBuscaClientes)}" → ` : ''}
            ${filtroGrupo !== 'todos' ? `🏷️ "${filtroGrupo}" → ` : ''}
            <strong>${totalExibidos}</strong> de <strong>${totalClientes}</strong> clientes
        `;
    }

    const totalEl = document.getElementById('totalClientes');
    if (totalEl) totalEl.textContent = totalExibidos;

    const vipCount = clientesFiltrados.filter(c => c.classificacao === 'vip').length;
    const vipEl = document.querySelector('.stat-mini-value[style*="color: #f59e0b"]');
    if (vipEl) vipEl.textContent = vipCount;

    const freqCount = clientesFiltrados.filter(c => c.classificacao === 'frequente').length;
    const freqEl = document.querySelector('.stat-mini-value[style*="color: #22c55e"]');
    if (freqEl && freqEl.parentElement?.querySelector('.stat-mini-label')?.textContent.includes('Frequentes')) {
        freqEl.textContent = freqCount;
    }

    const sumidosCount = clientesFiltrados.filter(c => c.classificacao === 'sumido').length;
    const sumidosEl = document.querySelector('.stat-mini-value[style*="color: #ef4444"]');
    if (sumidosEl) sumidosEl.textContent = sumidosCount;

    const novosCount = clientesFiltrados.filter(c => c.classificacao === 'novo').length;
    const novosEl = document.querySelector('.stat-mini-value[style*="color: #667eea"]');
    if (novosEl) novosEl.textContent = novosCount;

    const whatsCount = clientesFiltrados.filter(c => c.telefone && c.telefone.trim() !== '').length;
    const whatsEl = document.querySelector('.stat-mini-value[style*="color: #25D366"]');
    if (whatsEl) whatsEl.textContent = whatsCount;
}

// ============================================
// SET FILTRO CLIENTES
// ============================================

function setFiltroClientes(filtro) {
    filtroClientes = filtro;
    if (filtroGrupo !== 'todos') {
        filtroGrupo = 'todos';
    }

    if (window._filtroTimeout) {
        clearTimeout(window._filtroTimeout);
    }

    aplicarFiltrosClientes();

    window._filtroTimeout = setTimeout(() => {
        carregarClientesBackground();
    }, 1000);
}

// ============================================
// FORCAR ATUALIZAÇÃO DOS GRUPOS
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
            const gruposMap = data.data || {};

            clientesCompletos.forEach(c => {
                if (gruposMap[c.id]) {
                    c.grupos = gruposMap[c.id];
                } else {
                    c.grupos = [];
                }
            });

            console.log('✅ Grupos atualizados localmente');
            aplicarFiltrosClientes();
        }
    } catch (error) {
        console.error('❌ Erro ao forçar atualização:', error);
    }
}

// ============================================
// ATUALIZAR LISTA DE CLIENTES
// ============================================

function atualizarListaClientes(clientesFiltrados) {
    const content = document.getElementById('content');
    if (!content || !content.innerHTML.includes('👥 Clientes')) return;

    const isMobile = window.innerWidth < 768;

    const totalExibidos = clientesFiltrados.length;
    const totalClientes = clientesCompletos.length;

    const contador = document.getElementById('contadorBuscaClientes');
    if (contador) {
        contador.innerHTML = `
            ${termoBuscaClientes ? `🔍 "${escapeHtml(termoBuscaClientes)}" → ` : ''}
            ${filtroGrupo !== 'todos' ? `🏷️ "${filtroGrupo}" → ` : ''}
            <strong>${totalExibidos}</strong> de <strong>${totalClientes}</strong> clientes
        `;
    }

    const totalEl = document.getElementById('totalClientes');
    if (totalEl) totalEl.textContent = totalExibidos;

    const vipCount = clientesFiltrados.filter(c => c.classificacao === 'vip').length;
    const vipEl = document.querySelector('.stat-mini-value[style*="color: #f59e0b"]');
    if (vipEl) vipEl.textContent = vipCount;

    const freqCount = clientesFiltrados.filter(c => c.classificacao === 'frequente').length;
    const freqEl = document.querySelector('.stat-mini-value[style*="color: #22c55e"]');
    if (freqEl && freqEl.parentElement?.querySelector('.stat-mini-label')?.textContent.includes('Frequentes')) {
        freqEl.textContent = freqCount;
    }

    const sumidosCount = clientesFiltrados.filter(c => c.classificacao === 'sumido').length;
    const sumidosEl = document.querySelector('.stat-mini-value[style*="color: #ef4444"]');
    if (sumidosEl) sumidosEl.textContent = sumidosCount;

    const novosCount = clientesFiltrados.filter(c => c.classificacao === 'novo').length;
    const novosEl = document.querySelector('.stat-mini-value[style*="color: #667eea"]');
    if (novosEl) novosEl.textContent = novosCount;

    const whatsCount = clientesFiltrados.filter(c => c.telefone && c.telefone.trim() !== '').length;
    const whatsEl = document.querySelector('.stat-mini-value[style*="color: #25D366"]');
    if (whatsEl) whatsEl.textContent = whatsCount;

    const btnTodos = document.querySelector('button[onclick*="setFiltroClientes(\'todos\')"]');
    if (btnTodos) btnTodos.textContent = `📊 Todos (${totalClientes})`;

    const btnVip = document.querySelector('button[onclick*="setFiltroClientes(\'vip\')"]');
    if (btnVip) btnVip.textContent = `⭐ VIP (${clientesCompletos.filter(c => c.classificacao === 'vip').length})`;

    const btnFreq = document.querySelector('button[onclick*="setFiltroClientes(\'frequentes\')"]');
    if (btnFreq) btnFreq.textContent = `🔥 Frequentes (${clientesCompletos.filter(c => c.classificacao === 'frequente' || c.classificacao === 'vip').length})`;

    const btnSumidos = document.querySelector('button[onclick*="setFiltroClientes(\'sumidos\')"]');
    if (btnSumidos) btnSumidos.textContent = `😴 Sumidos (${clientesCompletos.filter(c => c.classificacao === 'sumido').length})`;

    const btnNovos = document.querySelector('button[onclick*="setFiltroClientes(\'novos\')"]');
    if (btnNovos) btnNovos.textContent = `🌱 Novos (${clientesCompletos.filter(c => c.classificacao === 'novo').length})`;

    let container = document.getElementById('listaClientesContainer');
    if (!container) {
        const card = content.querySelector('.card');
        if (card) {
            const oldContent = card.innerHTML;
            const oldContainer = card.querySelector('#listaClientesContainer');
            if (oldContainer) {
                card.innerHTML = oldContainer.innerHTML;
            }
            card.innerHTML = `<div id="listaClientesContainer">${card.innerHTML}</div>`;
            container = document.getElementById('listaClientesContainer');
        }
        if (!container) return;
    }

    let html = '';

    if (clientesFiltrados.length === 0) {
        html = `
            <div class="empty-state" style="padding: 20px; text-align: center;">
                <i class="fas fa-user-plus" style="font-size: 32px; color: var(--text-muted);"></i>
                <h4 style="font-size: 14px; margin: 8px 0;">Nenhum cliente encontrado</h4>
                <p style="font-size: 12px; color: var(--text-muted);">Tente buscar por outro nome, telefone ou email</p>
                <button class="btn btn-primary btn-sm" onclick="limparBuscaClientes()" style="font-size: 11px; padding: 4px 12px;">
                    <i class="fas fa-undo"></i> Limpar Busca
                </button>
            </div>
        `;
    } else if (isMobile) {
        html = `<div style="display:flex;flex-direction:column;gap:8px;">`;
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

            const gruposLabels = c.grupos && Array.isArray(c.grupos) ? c.grupos.map(g =>
                `<span style="background:rgba(139,92,246,0.1);padding:1px 6px;border-radius:8px;font-size:8px;color:#8b5cf6;margin:1px;">${g}</span>`
            ).join(' ') : '';

            html += `
                <div style="background: var(--bg-card); border-radius: 12px; padding: 12px; border: 1px solid ${cor.border};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
                            <div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;flex-shrink:0;">${inicial}</div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:13px;font-weight:600;color:var(--text-primary);">
                                    ${escapeHtml(String(c.nome || 'Cliente'))}
                                    <span style="font-size:11px;">${c.icone || ''}</span>
                                </div>
                                <div style="font-size:10px;color:var(--text-muted);">
                                    ${c.telefone ? `📱 ${escapeHtml(String(c.telefone))}` : 'Sem telefone'}
                                </div>
                                <div style="font-size:8px;margin-top:2px;">${gruposLabels}</div>
                            </div>
                        </div>
                        <span style="padding:1px 8px;border-radius:10px;font-size:9px;font-weight:600;background:${cor.bg};color:${cor.text};border:1px solid ${cor.border};white-space:nowrap;">
                            ${c.classificacao}
                        </span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;background:var(--bg-hover);border-radius:6px;padding:6px;margin:6px 0;">
                        <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:var(--text-primary);">${c.total_concluidos}</div><div style="font-size:8px;color:var(--text-muted);">Atend.</div></div>
                        <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:#22c55e;">R$ ${formatMoney(c.ticket_medio)}</div><div style="font-size:8px;color:var(--text-muted);">Ticket</div></div>
                        <div style="text-align:center;"><div style="font-size:13px;font-weight:700;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-primary)'};">${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}</div><div style="font-size:8px;color:var(--text-muted);">Última</div></div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding-top:6px;border-top:1px solid var(--border-color);">
                        ${whatsappLink !== '#' ? `<a href="${whatsappLink}" target="_blank" style="text-align:center;padding:4px;border-radius:6px;background:rgba(37,211,102,0.1);color:#25D366;font-size:12px;text-decoration:none;"><i class="fab fa-whatsapp"></i></a>` : '<div></div>'}
                        <button onclick="editarCliente(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(102,126,234,0.1);color:#667eea;border:none;font-size:12px;"><i class="fas fa-pen"></i></button>
                        <button onclick="verHistoricoCliente(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(139,92,246,0.1);color:#8b5cf6;border:none;font-size:12px;"><i class="fas fa-history"></i></button>
                        <button onclick="abrirModalGrupos(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(139,92,246,0.1);color:#8b5cf6;border:none;font-size:12px;" title="Grupos"><i class="fas fa-tags"></i></button>
                        ${isBloqueado ? `<button onclick="desbloquearChatbot(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(34,197,94,0.1);color:#22c55e;border:none;font-size:12px;"><i class="fas fa-unlock"></i></button>` : `<button onclick="bloquearChatbot(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(239,68,68,0.1);color:#ef4444;border:none;font-size:12px;"><i class="fas fa-lock"></i></button>`}
                        <button onclick="excluirCliente(${c.id})" style="text-align:center;padding:4px;border-radius:6px;background:rgba(239,68,68,0.1);color:#ef4444;border:none;font-size:12px;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    } else {
        const cores = {
            vip: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b' },
            frequente: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
            sumido: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' },
            novo: { bg: 'rgba(102,126,234,0.15)', text: '#667eea' },
            regular: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' }
        };

        html = `
            <div class="table-responsive" style="overflow-x: auto;">
                <table class="data-table" style="width: 100%; min-width: 800px; font-size: 13px;">
                    <thead>
                        <tr>
                            <th style="padding: 6px 8px;">#</th>
                            <th style="padding: 6px 8px;">Cliente</th>
                            <th style="padding: 6px 8px;">Telefone</th>
                            <th style="padding: 6px 8px;">Class.</th>
                            <th style="padding: 6px 8px;">Grupos</th>
                            <th style="padding: 6px 8px; text-align:center;">Atend.</th>
                            <th style="padding: 6px 8px; text-align:center;">Ticket</th>
                            <th style="padding: 6px 8px; text-align:center;">Última</th>
                            <th style="padding: 6px 8px; text-align:center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>`;
        for (let c of clientesFiltrados) {
            const isBloqueado = c.bloqueado_chatbot === 1;
            const telefone = c.telefone || '';
            const cor = cores[c.classificacao] || cores.regular;

            const gruposLabels = c.grupos && Array.isArray(c.grupos) ? c.grupos.map(g =>
                `<span style="background:rgba(139,92,246,0.1);padding:1px 6px;border-radius:8px;font-size:9px;color:#8b5cf6;margin:1px;display:inline-block;">${g}</span>`
            ).join(' ') : '';

            html += `
                <tr>
                    <td style="padding: 6px 8px; text-align:center;">${c.id}</td>
                    <td style="padding: 6px 8px;">
                        <strong>${escapeHtml(String(c.nome || 'Cliente'))}</strong> 
                        <span style="font-size:14px;">${c.icone || ''}</span>
                    </td>
                    <td style="padding: 6px 8px;">
                        ${telefone ? escapeHtml(String(telefone)) : '-'}
                        ${telefone ? `<a href="https://wa.me/55${telefone.replace(/\D/g, '')}" target="_blank" style="color:#25D366;text-decoration:none;margin-left:4px;"><i class="fab fa-whatsapp"></i></a>` : ''}
                    </td>
                    <td style="padding: 6px 8px;">
                        <span style="padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${cor.bg};color:${cor.text};">
                            ${c.icone || ''} ${c.classificacao}
                        </span>
                    </td>
                    <td style="padding: 6px 8px; font-size:10px;">
                        ${gruposLabels || '-'}
                    </td>
                    <td style="padding: 6px 8px; text-align:center;">${c.total_concluidos}</td>
                    <td style="padding: 6px 8px; text-align:center;font-weight:600;color:#22c55e;">
                        R$ ${formatMoney(c.ticket_medio)}
                    </td>
                    <td style="padding: 6px 8px; text-align:center;font-size:12px;color:${c.dias_sem_visita > 60 ? '#ef4444' : 'var(--text-muted)'};">
                        ${c.dias_sem_visita !== null ? c.dias_sem_visita + 'd' : '-'}
                    </td>
                    <td style="padding: 6px 8px;">
                        <div style="display:flex;gap:2px;flex-wrap:wrap;justify-content:center;">
                            <button class="btn-icon btn-edit" onclick="editarCliente(${c.id})" title="Editar" style="padding:2px 6px;border:none;background:rgba(102,126,234,0.1);border-radius:4px;cursor:pointer;color:#667eea;">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn-icon" onclick="verHistoricoCliente(${c.id})" title="Histórico" style="padding:2px 6px;border:none;background:rgba(139,92,246,0.1);border-radius:4px;cursor:pointer;color:#8b5cf6;">
                                <i class="fas fa-history"></i>
                            </button>
                            <button class="btn-icon" onclick="abrirModalGrupos(${c.id})" title="Grupos" style="padding:2px 6px;border:none;background:rgba(139,92,246,0.1);border-radius:4px;cursor:pointer;color:#8b5cf6;">
                                <i class="fas fa-tags"></i>
                            </button>
                            ${isBloqueado ?
                    `<button class="btn-icon btn-unblock" onclick="desbloquearChatbot(${c.id})" title="Liberar" style="padding:2px 6px;border:none;background:rgba(34,197,94,0.1);border-radius:4px;cursor:pointer;color:#22c55e;">
                                    <i class="fas fa-unlock"></i>
                                </button>` :
                    `<button class="btn-icon btn-block" onclick="bloquearChatbot(${c.id})" title="Bloquear" style="padding:2px 6px;border:none;background:rgba(239,68,68,0.1);border-radius:4px;cursor:pointer;color:#ef4444;">
                                    <i class="fas fa-lock"></i>
                                </button>`
                }
                            <button class="btn-icon btn-delete" onclick="excluirCliente(${c.id})" title="Excluir" style="padding:2px 6px;border:none;background:rgba(239,68,68,0.1);border-radius:4px;cursor:pointer;color:#ef4444;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }
        html += `</tbody></table></div>`;
    }

    container.innerHTML = html;

    const buscaInput = document.getElementById('buscaClientesInput');
    if (buscaInput && termoBuscaClientes) {
        buscaInput.focus();
        const len = buscaInput.value.length;
        buscaInput.setSelectionRange(len, len);
    }
}

// ============================================
// PREVENIR RECARREGAMENTOS NO MOBILE
// ============================================

document.addEventListener('touchstart', function (e) {
    if (e.target && e.target.id === 'buscaClientesInput') {
        console.log('📱 Toque no input de busca');
        if (window._touchTimeout) {
            clearTimeout(window._touchTimeout);
        }
        window._touchTimeout = setTimeout(() => { }, 2000);
    }
}, { passive: true });

// ============================================
// REDIMENSIONAMENTO - CORRIGIDO PARA MOBILE
// ============================================

window.addEventListener('resize', function () {
    const content = document.getElementById('content');
    if (!content || !content.innerHTML.includes('👥 Clientes')) {
        return;
    }

    if (termoBuscaClientes && termoBuscaClientes.length > 0) {
        console.log('📱 Busca ativa, ignorando resize');
        return;
    }

    const agora = Date.now();
    if (agora - ultimoResizeClientes < 500) {
        return;
    }
    ultimoResizeClientes = agora;

    clearTimeout(resizeTimeoutClientes);
    resizeTimeoutClientes = setTimeout(function () {
        if (!termoBuscaClientes && !carregandoClientes) {
            console.log('📱 Recarregando clientes após resize...');
            carregarClientes();
        }
    }, 500);
});

// ============================================
// APAGAR TODOS OS CLIENTES
// ============================================

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
        console.error('❌ Erro:', error);
        hideLoading();
        showToast('Erro ao excluir cliente', 'error');
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

// ============================================
// IMPORTAÇÃO - APENAS DESKTOP
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
// ABRIR MODAL PROMOÇÃO
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

function filtrarClientesPromocao() {
    const filtroGrupo = document.getElementById('filtroGrupoPromocao')?.value || 'todos';
    const termoBusca = document.getElementById('buscaClientePromocao')?.value?.toLowerCase().trim() || '';

    const container = document.getElementById('listaClientesPromocao');
    const items = container.querySelectorAll('.cliente-item');

    let visiveis = 0;

    for (let item of items) {
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
}

function selecionarTodosClientes(selecionar) {
    const container = document.getElementById('listaClientesPromocao');
    const items = container.querySelectorAll('.cliente-item');

    for (let item of items) {
        if (item.style.display !== 'none') {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = selecionar;
            }
        }
    }
    atualizarContadorSelecionados();
}

function atualizarContadorSelecionados() {
    const container = document.getElementById('listaClientesPromocao');
    const items = container.querySelectorAll('.cliente-item');

    let selecionados = 0;
    for (let item of items) {
        if (item.style.display !== 'none') {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                selecionados++;
            }
        }
    }

    const contador = document.getElementById('contadorSelecionados');
    if (contador) contador.textContent = selecionados;
}

function fecharModalPromocao() {
    const modal = document.getElementById('modalPromocao');
    if (modal) modal.remove();
    promocaoEmAndamento = false;
}

// ============================================
// NORMALIZAR NÚMERO
// ============================================

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

// ============================================
// ENVIAR PROMOÇÃO
// ============================================

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

            console.log(`📤 Enviando para ${cliente.nome} (${telefone})`);

            const response = await fetch('/api/whatsapp/enviar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
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
                console.log(`✅ Enviado: ${cliente.nome} (${telefone})`);
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
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarClientes = carregarClientes;
window.buscarClientes = buscarClientes;
window.buscarClientesBotao = buscarClientesBotao;
window.limparBuscaClientes = limparBuscaClientes;
window.setFiltroClientes = setFiltroClientes;
window.setFiltroGrupo = setFiltroGrupo;
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

console.log('✅ clientes.js carregado (CRM COMPLETO + MOBILE + GRUPOS + LIMPEZA DE NOMES)');