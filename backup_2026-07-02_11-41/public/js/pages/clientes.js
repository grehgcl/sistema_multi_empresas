// pages/clientes.js - VERSÃO CORRIGIDA E ESTÁVEL
// CORREÇÃO: Verificação de elementos antes de acessar .value

// ============================================
// CARREGAR CLIENTES
// ============================================
async function carregarClientes() {
    console.log("🟢 carregarClientes chamada");
    ativarBotao('clientes');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        console.log("Resposta da API:", data);

        const clientes = data.data || [];
        const isMobile = window.innerWidth < 768;

        console.log("Clientes a serem exibidos:", clientes.length);

        let html = `
            <div class="fade-in">
                <!-- Header -->
                <div class="dashboard-header">
                    <div>
                        <h2 class="page-title">👥 Clientes</h2>
                        <p class="page-subtitle">
                            <i class="fas fa-users"></i> 
                            Gerencie seus clientes
                        </p>
                    </div>
                    <div class="dashboard-actions">
                        <button class="btn btn-primary" onclick="abrirModalCliente()">
                            <i class="fas fa-plus"></i> Novo Cliente
                        </button>
                    </div>
                </div>

                <!-- Estatísticas Rápidas -->
                <div class="cliente-stats" id="clienteStats">
                    <div class="stat-mini">
                        <span class="stat-mini-value" id="totalClientes">${clientes.length}</span>
                        <span class="stat-mini-label">Total</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value" id="liberadosCount">${clientes.filter(c => c.bloqueado_chatbot !== 1).length}</span>
                        <span class="stat-mini-label">🔓 Liberados</span>
                    </div>
                    <div class="stat-mini">
                        <span class="stat-mini-value" id="bloqueadosCount">${clientes.filter(c => c.bloqueado_chatbot === 1).length}</span>
                        <span class="stat-mini-label">🔒 Bloqueados</span>
                    </div>
                </div>

                <!-- Lista de Clientes -->
                <div class="card">
        `;

        if (clientes.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <h4>Nenhum cliente cadastrado</h4>
                    <p>Comece adicionando seus primeiros clientes</p>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalCliente()">
                        <i class="fas fa-plus"></i> Adicionar Cliente
                    </button>
                </div>
            `;
        } else if (isMobile) {
            // VERSÃO MOBILE - CARDS
            html += `<div class="clientes-cards-mobile">`;
            for (let c of clientes) {
                const isBloqueado = c.bloqueado_chatbot === 1;
                const telefone = c.telefone || '';
                const whatsappLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '#';
                const diasBloqueio = c.dias_bloqueio || 1;

                html += `
                    <div class="cliente-card-mobile">
                        <div class="cliente-card-header">
                            <div class="cliente-info-mobile">
                                <div class="cliente-avatar-mobile">${c.nome ? c.nome.charAt(0).toUpperCase() : '?'}</div>
                                <div>
                                    <div class="cliente-nome-mobile">${escapeHtml(c.nome)}</div>
                                    <div class="cliente-contato-mobile">
                                        ${c.telefone ? `<i class="fas fa-phone"></i> ${escapeHtml(c.telefone)}` : 'Sem telefone'}
                                    </div>
                                </div>
                            </div>
                            <span class="status-badge ${isBloqueado ? 'inativo' : 'ativo'}">
                                <span class="dot"></span>
                                ${isBloqueado ? '🔒 Bloqueado' : '🔓 Liberado'}
                            </span>
                        </div>
                        <div class="cliente-card-body">
                            <div class="info-row">
                                <span class="info-label">📧 Email</span>
                                <span class="info-value">${c.email || '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📅 Cadastro</span>
                                <span class="info-value">${formatarDataBr(c.created_at)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">⏳ Dias bloqueio</span>
                                <span class="info-value"><strong>${diasBloqueio}</strong> dia(s)</span>
                            </div>
                        </div>
                        <div class="cliente-card-actions">
                            ${whatsappLink !== '#' ? `
                                <a href="${whatsappLink}" target="_blank" class="btn-icon btn-whatsapp" title="Chamar no WhatsApp">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </a>
                            ` : `
                                <span class="btn-icon btn-whatsapp disabled" title="Cliente sem telefone">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </span>
                            `}
                            <button class="btn-icon btn-edit" onclick="editarCliente(${c.id})" title="Editar">
                                <i class="fas fa-pen"></i> Editar
                            </button>
                            ${isBloqueado ?
                        `<button class="btn-icon btn-unblock" onclick="desbloquearChatbot(${c.id})" title="Liberar Chatbot">
                                    <i class="fas fa-unlock"></i> Liberar
                                </button>` :
                        `<button class="btn-icon btn-block" onclick="bloquearChatbot(${c.id})" title="Bloquear Chatbot">
                                    <i class="fas fa-lock"></i> Bloquear
                                </button>`
                    }
                            <button class="btn-icon btn-delete" onclick="excluirCliente(${c.id})" title="Excluir">
                                <i class="fas fa-trash"></i> Excluir
                            </button>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        } else {
            // VERSÃO DESKTOP - TABELA
            html += `
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Email</th>
                                <th>Dias Bloqueio</th>
                                <th>Chatbot</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (let c of clientes) {
                const isBloqueado = c.bloqueado_chatbot === 1;
                const telefone = c.telefone || '';
                const whatsappLink = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : '#';
                const diasBloqueio = c.dias_bloqueio || 1;

                html += `
                    <tr>
                        <td style="text-align: center;">${c.id}</td>
                        <td><strong>${escapeHtml(c.nome)}</strong></td>
                        <td>
                            ${telefone ? `
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    ${escapeHtml(telefone)}
                                    <a href="${whatsappLink}" target="_blank" class="btn-whatsapp-icon" title="Chamar no WhatsApp">
                                        <i class="fab fa-whatsapp" style="color: #25D366;"></i>
                                    </a>
                                </div>
                            ` : '-'}
                        </td>
                        <td>${c.email || '-'}</td>
                        <td style="text-align: center;"><strong>${diasBloqueio}</strong> dia(s)</td>
                        <td>
                            <span class="status-badge ${isBloqueado ? 'inativo' : 'ativo'}">
                                <span class="dot"></span>
                                ${isBloqueado ? '🔒 Bloqueado' : '🔓 Liberado'}
                            </span>
                        </td>
                        <td>
                            <div class="actions-cell">
                                <button class="btn-icon btn-edit" onclick="editarCliente(${c.id})" title="Editar">
                                    <i class="fas fa-pen"></i>
                                </button>
                                ${isBloqueado ?
                        `<button class="btn-icon btn-unblock" onclick="desbloquearChatbot(${c.id})" title="Liberar Chatbot">
                                        <i class="fas fa-unlock"></i>
                                    </button>` :
                        `<button class="btn-icon btn-block" onclick="bloquearChatbot(${c.id})" title="Bloquear Chatbot">
                                        <i class="fas fa-lock"></i>
                                    </button>`
                    }
                                <button class="btn-icon btn-delete" onclick="excluirCliente(${c.id})" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
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
// ABRIR MODAL NOVO CLIENTE (CORRIGIDO)
// ============================================
window.abrirModalCliente = function () {
    console.log("🟡 abrirModalCliente chamada");

    // Remover modal existente
    const existingModal = document.getElementById('modalCliente');
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="modalCliente" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
            <div class="modal-content" style="max-width: 450px; width: 100%; margin: 20px; padding: 25px; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #333;">➕ Novo Cliente</h3>
                    <button onclick="fecharModalCliente()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999;">&times;</button>
                </div>
                <form id="formNovoCliente" onsubmit="event.preventDefault(); salvarCliente();">
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Nome *</label>
                        <input type="text" id="clienteNome" class="form-control" placeholder="Nome completo" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Telefone</label>
                        <input type="text" id="clienteTelefone" class="form-control" placeholder="(00) 00000-0000" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Email</label>
                        <input type="email" id="clienteEmail" class="form-control" placeholder="cliente@email.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Dias de bloqueio entre agendamentos</label>
                        <input type="number" id="clienteDiasBloqueio" class="form-control" value="1" min="0" max="365" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <small style="display: block; margin-top: 5px; color: #666; font-size: 12px;">
                            Quantos dias o cliente deve esperar para fazer um novo agendamento.<br>
                            <strong>1 dia</strong> = não pode agendar 2 vezes no mesmo dia.<br>
                            <strong>7 dias</strong> = só pode agendar 1 vez por semana.<br>
                            <strong>0 dias</strong> = sem restrição.
                        </small>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="fecharModalCliente()" style="padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; background: #e0e0e0; color: #333;">Cancelar</button>
                        <button type="button" class="btn btn-primary" onclick="salvarCliente()" style="padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; background: #667eea; color: #fff; font-weight: 600;">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// ============================================
// FECHAR MODAL CLIENTE
// ============================================
function fecharModalCliente() {
    const modal = document.getElementById('modalCliente');
    if (modal) modal.remove();
}

// ============================================
// SALVAR CLIENTE (CORRIGIDO - VERIFICAÇÃO SEGURA)
// ============================================
window.salvarCliente = async function () {
    console.log("💾 Salvando cliente...");

    try {
        // PEGAR ELEMENTOS COM VERIFICAÇÃO DE SEGURANÇA
        const nomeInput = document.getElementById('clienteNome');
        const telefoneInput = document.getElementById('clienteTelefone');
        const emailInput = document.getElementById('clienteEmail');
        const diasBloqueioInput = document.getElementById('clienteDiasBloqueio');

        // VERIFICAR SE OS ELEMENTOS EXISTEM
        if (!nomeInput) {
            console.error('❌ Campo nome não encontrado!');
            showToast('Erro: Campo nome não encontrado', 'error');
            return;
        }

        // PEGAR VALORES COM FALLBACK
        const nome = nomeInput ? nomeInput.value.trim() : '';
        const telefone = telefoneInput ? telefoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const diasBloqueio = diasBloqueioInput ? parseInt(diasBloqueioInput.value) || 1 : 1;

        // VALIDAR
        if (!nome) {
            showToast('Nome é obrigatório', 'warning');
            return;
        }

        const dados = {
            nome,
            telefone,
            email,
            dias_bloqueio: diasBloqueio
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
};

// ============================================
// EDITAR CLIENTE (CORRIGIDO)
// ============================================
window.editarCliente = async function (id) {
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

        // Remover modal existente
        const existingModal = document.getElementById('modalEditarCliente');
        if (existingModal) existingModal.remove();

        const modalHtml = `
            <div id="modalEditarCliente" class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999;">
                <div class="modal-content" style="max-width: 450px; width: 100%; margin: 20px; padding: 25px; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0; color: #333;">✏️ Editar Cliente</h3>
                        <button onclick="fecharModalEditarCliente()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: #999;">&times;</button>
                    </div>
                    <form id="formEditarCliente" onsubmit="event.preventDefault(); atualizarCliente(${id});">
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Nome *</label>
                            <input type="text" id="editClienteNome" class="form-control" value="${escapeHtml(cliente.nome)}" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Telefone</label>
                            <input type="text" id="editClienteTelefone" class="form-control" value="${escapeHtml(cliente.telefone || '')}" placeholder="(00) 00000-0000" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Email</label>
                            <input type="email" id="editClienteEmail" class="form-control" value="${escapeHtml(cliente.email || '')}" placeholder="cliente@email.com" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #333;">Dias de bloqueio entre agendamentos</label>
                            <input type="number" id="editClienteDiasBloqueio" class="form-control" value="${cliente.dias_bloqueio || 1}" min="0" max="365" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                            <small style="display: block; margin-top: 5px; color: #666; font-size: 12px;">
                                Quantos dias o cliente deve esperar para fazer um novo agendamento.<br>
                                <strong>1 dia</strong> = não pode agendar 2 vezes no mesmo dia.<br>
                                <strong>7 dias</strong> = só pode agendar 1 vez por semana.<br>
                                <strong>0 dias</strong> = sem restrição.
                            </small>
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" class="btn btn-secondary" onclick="fecharModalEditarCliente()" style="padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; background: #e0e0e0; color: #333;">Cancelar</button>
                            <button type="button" class="btn btn-primary" onclick="atualizarCliente(${id})" style="padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; background: #667eea; color: #fff; font-weight: 600;">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (error) {
        console.error('❌ Erro ao carregar cliente para edição:', error);
        showToast('Erro ao carregar dados do cliente', 'error');
    }
};

// ============================================
// FECHAR MODAL EDITAR CLIENTE
// ============================================
function fecharModalEditarCliente() {
    const modal = document.getElementById('modalEditarCliente');
    if (modal) modal.remove();
}

// ============================================
// ATUALIZAR CLIENTE (CORRIGIDO)
// ============================================
window.atualizarCliente = async function (id) {
    console.log('📝 Atualizando cliente:', id);

    try {
        // PEGAR ELEMENTOS COM VERIFICAÇÃO
        const nomeInput = document.getElementById('editClienteNome');
        const telefoneInput = document.getElementById('editClienteTelefone');
        const emailInput = document.getElementById('editClienteEmail');
        const diasBloqueioInput = document.getElementById('editClienteDiasBloqueio');

        if (!nomeInput) {
            console.error('❌ Campo nome não encontrado!');
            showToast('Erro: Campo nome não encontrado', 'error');
            return;
        }

        const nome = nomeInput ? nomeInput.value.trim() : '';
        const telefone = telefoneInput ? telefoneInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const diasBloqueio = diasBloqueioInput ? parseInt(diasBloqueioInput.value) || 1 : 1;

        if (!nome) {
            showToast('Nome é obrigatório', 'warning');
            return;
        }

        const dados = {
            nome,
            telefone,
            email,
            dias_bloqueio: diasBloqueio
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
};

// ============================================
// EXCLUIR CLIENTE
// ============================================
window.excluirCliente = async function (id) {
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
};

// ============================================
// BLOQUEAR CHATBOT
// ============================================
window.bloquearChatbot = async function (id) {
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
};

// ============================================
// DESBLOQUEAR CHATBOT
// ============================================
window.desbloquearChatbot = async function (id) {
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
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        const data = new Date(dataStr + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// GARANTIR FUNÇÕES GLOBAIS
// ============================================
window.carregarClientes = carregarClientes;
window.fecharModalCliente = fecharModalCliente;
window.fecharModalEditarCliente = fecharModalEditarCliente;

console.log('✅ clientes.js carregado com sucesso!');

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

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarClientes = carregarClientes;
window.fecharModalCliente = fecharModalCliente;
window.fecharModalEditarCliente = fecharModalEditarCliente;