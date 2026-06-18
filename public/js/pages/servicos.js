// pages/servicos.js - Versão Mobile Friendly com Cards
let listaServicosGlobal = [];

async function carregarServicos() {
    ativarBotao('servicos');

    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (usuario.role !== 'dono') {
        document.getElementById('content').innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-lock"></i>
                    <h4>Acesso negado</h4>
                    <p>Apenas donos podem acessar serviços.</p>
                </div>
            </div>
        `;
        return;
    }

    let html = `
        <div class="fade-in">
            <!-- Header -->
            <div class="dashboard-header">
                <div>
                    <h2 class="page-title">💇 Serviços</h2>
                    <p class="page-subtitle">
                        <i class="fas fa-cut"></i> 
                        Gerencie os serviços da sua barbearia
                    </p>
                </div>
                <div class="dashboard-actions">
                    <button class="btn btn-primary" onclick="abrirModalServico()">
                        <i class="fas fa-plus"></i> Novo Serviço
                    </button>
                </div>
            </div>

            <!-- Estatísticas Rápidas -->
            <div class="servico-stats" id="servicoStats">
                <div class="stat-mini">
                    <span class="stat-mini-value" id="totalServicos">0</span>
                    <span class="stat-mini-label">Total</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" id="ativosCount">0</span>
                    <span class="stat-mini-label">✅ Ativos</span>
                </div>
                <div class="stat-mini">
                    <span class="stat-mini-value" id="inativosCount">0</span>
                    <span class="stat-mini-label">⛔ Inativos</span>
                </div>
            </div>

            <!-- Lista de Serviços -->
            <div class="card">
                <div id="listaServicosContainer">
                    <div style="text-align: center; padding: 40px;">
                        <div class="loading-spinner" style="display: inline-block;"></div>
                        <p>Carregando serviços...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
    await carregarListaServicos();
}

// ============================================
// CARREGAR LISTA DE SERVIÇOS
// ============================================

async function carregarListaServicos() {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/servicos/todos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            listaServicosGlobal = result.data;
            const container = document.getElementById('listaServicosContainer');
            const isMobile = window.innerWidth < 768;

            // Atualizar estatísticas
            const total = listaServicosGlobal.length;
            const ativos = listaServicosGlobal.filter(s => s.ativo === 1).length;
            const inativos = listaServicosGlobal.filter(s => s.ativo === 0).length;

            document.getElementById('totalServicos').textContent = total;
            document.getElementById('ativosCount').textContent = ativos;
            document.getElementById('inativosCount').textContent = inativos;

            if (listaServicosGlobal.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-cut"></i>
                        <h4>Nenhum serviço cadastrado</h4>
                        <p>Comece criando seu primeiro serviço!</p>
                        <button class="btn btn-primary btn-sm" onclick="abrirModalServico()">
                            <i class="fas fa-plus"></i> Novo Serviço
                        </button>
                    </div>
                `;
                return;
            }

            let html = '';

            if (isMobile) {
                // ============================================
                // VERSÃO MOBILE - CARDS
                // ============================================
                html = `<div class="servicos-cards-mobile">`;
                for (let s of listaServicosGlobal) {
                    const statusClass = s.ativo === 1 ? 'ativo' : 'inativo';
                    const statusLabel = s.ativo === 1 ? '✅ Ativo' : '⛔ Inativo';

                    html += `
                        <div class="servico-card-mobile">
                            <div class="servico-card-header">
                                <div class="servico-nome-mobile">
                                    <span class="servico-icone">✂️</span>
                                    <span>${escapeHtml(s.nome)}</span>
                                </div>
                                <span class="status-badge ${statusClass}">
                                    <span class="dot"></span>
                                    ${statusLabel}
                                </span>
                            </div>
                            <div class="servico-card-body">
                                <div class="info-row">
                                    <span class="info-label">📝 Descrição</span>
                                    <span class="info-value">${escapeHtml(s.descricao || '-')}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">💰 Valor</span>
                                    <span class="info-value valor-mobile">R$ ${(s.valor || 0).toFixed(2)}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">⏱️ Duração</span>
                                    <span class="info-value">${s.duracao || 30} min</span>
                                </div>
                            </div>
                            <div class="servico-card-actions">
                                <button class="btn-icon btn-edit" onclick="editarServico(${s.id})" title="Editar">
                                    <i class="fas fa-pen"></i> Editar
                                </button>
                                <button class="btn-icon ${s.ativo === 1 ? 'btn-toggle-on' : 'btn-toggle-off'}" onclick="toggleServico(${s.id})" title="${s.ativo === 1 ? 'Desativar' : 'Ativar'}">
                                    <i class="fas ${s.ativo === 1 ? 'fa-toggle-on' : 'fa-toggle-off'}"></i> 
                                    ${s.ativo === 1 ? 'Desativar' : 'Ativar'}
                                </button>
                                <button class="btn-icon btn-delete" onclick="excluirServico(${s.id})" title="Excluir">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            } else {
                // ============================================
                // VERSÃO DESKTOP - TABELA
                // ============================================
                html = `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Descrição</th>
                                    <th>Valor</th>
                                    <th>Duração</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${listaServicosGlobal.map(s => `
                                    <tr>
                                        <td><strong>${escapeHtml(s.nome)}</strong></td>
                                        <td>${escapeHtml(s.descricao || '-')}</td>
                                        <td><span class="valor">R$ ${(s.valor || 0).toFixed(2)}</span></td>
                                        <td>${s.duracao || 30} min</td>
                                        <td>
                                            <span class="status-badge ${s.ativo === 1 ? 'ativo' : 'inativo'}">
                                                <span class="dot"></span>
                                                ${s.ativo === 1 ? '✅ Ativo' : '⛔ Inativo'}
                                            </span>
                                        </td>
                                        <td>
                                            <div class="actions-cell">
                                                <button class="btn-icon btn-edit" onclick="editarServico(${s.id})" title="Editar">
                                                    <i class="fas fa-pen"></i>
                                                </button>
                                                <button class="btn-icon ${s.ativo === 1 ? 'btn-toggle-on' : 'btn-toggle-off'}" onclick="toggleServico(${s.id})" title="${s.ativo === 1 ? 'Desativar' : 'Ativar'}">
                                                    <i class="fas ${s.ativo === 1 ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                                </button>
                                                <button class="btn-icon btn-delete" onclick="excluirServico(${s.id})" title="Excluir">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('listaServicosContainer').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Erro ao carregar serviços</h4>
                <p>Tente novamente mais tarde.</p>
                <button class="btn btn-primary btn-sm" onclick="carregarListaServicos()">
                    <i class="fas fa-sync"></i> Tentar Novamente
                </button>
            </div>
        `;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// ABRIR MODAL SERVIÇO
// ============================================

function abrirModalServico(servico = null) {
    const isEdit = servico !== null;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'modalServicoCustom';
    modalDiv.className = 'modal';
    modalDiv.style.display = 'flex';

    modalDiv.innerHTML = `
        <div class="modal-content" style="max-width: 480px; width: 90%;">
            <h3>${isEdit ? '✏️ Editar' : '➕ Novo'} Serviço</h3>
            <input type="hidden" id="servicoEditId" value="${isEdit ? servico.id : ''}">

            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="servicoNome" class="form-control" value="${isEdit ? escapeHtml(servico.nome) : ''}" placeholder="Ex: Corte de Cabelo">
            </div>

            <div class="form-group">
                <label>Descrição</label>
                <textarea id="servicoDescricao" class="form-control" rows="3" placeholder="Descrição do serviço...">${isEdit ? (servico.descricao || '') : ''}</textarea>
            </div>

            <div class="form-group">
                <label>Valor (R$) *</label>
                <input type="number" id="servicoValor" class="form-control" step="0.01" value="${isEdit ? servico.valor : ''}" placeholder="0,00">
            </div>

            <div class="form-group">
                <label>Duração (minutos)</label>
                <input type="number" id="servicoDuracao" class="form-control" value="${isEdit ? (servico.duracao || 30) : 30}" placeholder="30">
            </div>

            ${isEdit ? `
            <div class="form-group">
                <label>Status</label>
                <select id="servicoStatus" class="form-control">
                    <option value="1" ${servico.ativo === 1 ? 'selected' : ''}>✅ Ativo</option>
                    <option value="0" ${servico.ativo === 0 ? 'selected' : ''}>⛔ Inativo</option>
                </select>
            </div>
            ` : ''}

            <div class="modal-buttons">
                <button onclick="fecharModalServico()">Cancelar</button>
                <button onclick="salvarServico()">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);
}

function fecharModalServico() {
    const modal = document.getElementById('modalServicoCustom');
    if (modal) modal.remove();
}

// ============================================
// SALVAR SERVIÇO
// ============================================

async function salvarServico() {
    const id = document.getElementById('servicoEditId').value;
    const nome = document.getElementById('servicoNome').value;
    const descricao = document.getElementById('servicoDescricao').value;
    const valor = document.getElementById('servicoValor').value;
    const duracao = document.getElementById('servicoDuracao').value;

    if (!nome || !valor) {
        showToast('Nome e valor são obrigatórios', 'warning');
        return;
    }

    showLoading();

    const token = localStorage.getItem('token');
    const url = id ? `/api/servicos/${id}` : '/api/servicos';
    const method = id ? 'PUT' : 'POST';

    const body = {
        nome: nome,
        descricao: descricao,
        valor: parseFloat(valor),
        duracao: parseInt(duracao) || 30
    };

    if (id) {
        body.ativo = parseInt(document.getElementById('servicoStatus')?.value || 1);
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });

        const result = await res.json();

        if (result.success) {
            showToast(result.message, 'success');
            fecharModalServico();
            await carregarListaServicos();
        } else {
            showToast('Erro: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao salvar serviço', 'error');
    }

    hideLoading();
}

// ============================================
// EDITAR SERVIÇO
// ============================================

async function editarServico(id) {
    const servico = listaServicosGlobal.find(s => s.id === id);
    if (servico) {
        abrirModalServico(servico);
    }
}

// ============================================
// TOGGLE (ATIVAR/DESATIVAR) SERVIÇO
// ============================================

async function toggleServico(id) {
    const servico = listaServicosGlobal.find(s => s.id === id);
    if (!servico) return;

    const acao = servico.ativo === 1 ? 'desativar' : 'ativar';
    if (!confirm(`Tem certeza que deseja ${acao} este serviço?`)) return;

    showLoading();

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/servicos/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                nome: servico.nome,
                descricao: servico.descricao,
                valor: servico.valor,
                duracao: servico.duracao,
                ativo: servico.ativo === 1 ? 0 : 1
            })
        });

        const result = await res.json();

        if (result.success) {
            showToast(`Serviço ${acao}do com sucesso!`, 'success');
            await carregarListaServicos();
        } else {
            showToast('Erro: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao alterar status', 'error');
    }

    hideLoading();
}

// ============================================
// EXCLUIR SERVIÇO
// ============================================

async function excluirServico(id) {
    const servico = listaServicosGlobal.find(s => s.id === id);
    if (!servico) return;

    if (!confirm(`Tem certeza que deseja excluir "${servico.nome}"?`)) return;

    showLoading();

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/servicos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            showToast(result.message, 'success');
            await carregarListaServicos();
        } else {
            showToast('Erro: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir serviço', 'error');
    }

    hideLoading();
}

// ============================================
// ATUALIZAR AO REDIMENSIONAR A TELA
// ============================================

let resizeTimeoutServicos;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeoutServicos);
    resizeTimeoutServicos = setTimeout(function () {
        if (document.getElementById('listaServicosContainer')) {
            carregarListaServicos();
        }
    }, 300);
});

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarServicos = carregarServicos;
window.abrirModalServico = abrirModalServico;
window.fecharModalServico = fecharModalServico;
window.salvarServico = salvarServico;
window.editarServico = editarServico;
window.toggleServico = toggleServico;
window.excluirServico = excluirServico;