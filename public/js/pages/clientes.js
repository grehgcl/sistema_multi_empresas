// pages/clientes.js - COM BLOQUEIO DE CHATBOT E EDIÇÃO

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

        console.log("Clientes a serem exibidos:", clientes.length);

        let html = `
            <div class="fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                    <h2 class="page-title">👥 Clientes</h2>
                    <button class="btn btn-primary" onclick="abrirModalCliente()">+ Novo Cliente</button>
                </div>
                <div class="card">
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>Telefone</th>
                                    <th>Email</th>
                                    <th>Chatbot</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        if (clientes.length === 0) {
            html += `
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 40px;">
                                        <span style="font-size: 48px;">👥</span>
                                        <p>Nenhum cliente cadastrado</p>
                                        <button class="btn btn-primary btn-sm" onclick="abrirModalCliente()">Adicionar Cliente</button>
                                    </td>
                                </tr>
            `;
        } else {
            for (let c of clientes) {
                html += `
                                <tr>
                                    <td style="text-align: center; padding: 10px;">${c.id}</td>
                                    <td style="padding: 10px;"><strong>${escapeHtml(c.nome)}</strong></td>
                                    <td style="padding: 10px;">${c.telefone || '-'}</td>
                                    <td style="padding: 10px;">${c.email || '-'}</td>
                                    <td style="text-align: center; padding: 10px;">
                                        ${c.bloqueado_chatbot === 1 ? '<span class="badge badge-danger">🔒 Bloqueado</span>' : '<span class="badge badge-success">🔓 Liberado</span>'}
                                    </td>
                                    <td class="actions-cell" style="padding: 10px; white-space: nowrap;">
                                        <button class="btn-icon" onclick="editarCliente(${c.id})" title="Editar Cliente">✏️</button>
                                        ${c.bloqueado_chatbot === 1 ?
                        `<button class="btn-icon" onclick="desbloquearChatbot(${c.id})" title="Liberar Chatbot">🔓</button>` :
                        `<button class="btn-icon" onclick="bloquearChatbot(${c.id})" title="Bloquear Chatbot">🔒</button>`
                    }
                                        <button class="btn-icon btn-danger" onclick="excluirCliente(${c.id})" title="Excluir">🗑️</button>
                                    </td>
                                </tr>
                `;
            }
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        showToast("Erro ao carregar clientes", "error");
    }

    hideLoading();
}

// Abrir modal para novo cliente
window.abrirModalCliente = function () {
    console.log("🟡 abrirModalCliente chamada");

    const modalHtml = `
        <div id="modalCliente" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 400px;">
                <h3>➕ Novo Cliente</h3>
                <form id="formNovoCliente" onsubmit="salvarCliente(event)">
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
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="fecharModalCliente()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('modalCliente');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Fechar modal do cliente
function fecharModalCliente() {
    const modal = document.getElementById('modalCliente');
    if (modal) modal.remove();
}

// Salvar novo cliente
window.salvarCliente = async function (event) {
    if (event) event.preventDefault();

    console.log("🟠 salvarCliente chamada");

    const nome = document.getElementById('clienteNome').value;
    const telefone = document.getElementById('clienteTelefone').value;
    const email = document.getElementById('clienteEmail').value;

    console.log("Dados:", { nome, telefone, email });

    if (!nome) {
        showToast('Nome é obrigatório', 'warning');
        return;
    }

    showLoading();

    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nome, telefone, email })
        });

        const data = await res.json();
        console.log("Resposta API:", data);

        hideLoading();

        if (data.success) {
            showToast('Cliente cadastrado com sucesso!', 'success');
            fecharModalCliente();
            // Forçar recarregamento da lista
            await carregarClientes();
        } else {
            showToast(data.message || 'Erro ao cadastrar cliente', 'error');
        }
    } catch (error) {
        console.error("Erro no fetch:", error);
        hideLoading();
        showToast('Erro ao cadastrar cliente', 'error');
    }
};

// Abrir modal para editar cliente
window.editarCliente = async function (id) {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/clientes', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const clientes = (await res.json()).data || [];
    const cliente = clientes.find(c => c.id === id);

    if (!cliente) {
        showToast('Cliente não encontrado', 'error');
        return;
    }

    const modalHtml = `
        <div id="modalEditarCliente" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 400px;">
                <h3>✏️ Editar Cliente</h3>
                <form id="formEditarCliente" onsubmit="atualizarCliente(event, ${id})">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="editClienteNome" class="form-control" value="${escapeHtml(cliente.nome)}" required>
                    </div>
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="editClienteTelefone" class="form-control" value="${cliente.telefone || ''}" placeholder="(00) 00000-0000">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="editClienteEmail" class="form-control" value="${cliente.email || ''}" placeholder="cliente@email.com">
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="fecharModal('modalEditarCliente')">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const existingModal = document.getElementById('modalEditarCliente');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Atualizar cliente
window.atualizarCliente = async function (event, id) {
    event.preventDefault();

    const nome = document.getElementById('editClienteNome').value;
    const telefone = document.getElementById('editClienteTelefone').value;
    const email = document.getElementById('editClienteEmail').value;

    if (!nome) {
        showToast('Nome é obrigatório', 'warning');
        return;
    }

    showLoading();

    const token = localStorage.getItem('token');

    try {
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
            fecharModal('modalEditarCliente');
            carregarClientes();
        } else {
            showToast(data.message || 'Erro ao atualizar cliente', 'error');
        }
    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        hideLoading();
        showToast('Erro ao atualizar cliente', 'error');
    }
};

// Excluir cliente
window.excluirCliente = async function (id) {
    if (!confirm('Excluir este cliente? Esta ação não poderá ser desfeita.')) return;

    showLoading();

    const token = localStorage.getItem('token');
    const res = await fetch('/api/clientes/' + id, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    hideLoading();

    if (data.success) {
        showToast('Cliente removido', 'success');
        carregarClientes();
    } else {
        showToast(data.message || 'Erro ao excluir cliente', 'error');
    }
};

// Bloquear cliente do chatbot
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
            carregarClientes();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Erro ao bloquear cliente', 'error');
    }
};

// Desbloquear cliente do chatbot
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
            carregarClientes();
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Erro ao desbloquear cliente', 'error');
    }
};

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exportar funções
window.carregarClientes = carregarClientes;
window.fecharModalCliente = fecharModalCliente;