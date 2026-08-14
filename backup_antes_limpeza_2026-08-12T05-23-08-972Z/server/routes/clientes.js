// public/js/pages/clientes.js

// ============================================
// CARREGAR CLIENTES
// ============================================
async function carregarClientes() {
    ativarBotao('clientes');
    showLoading();

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
            let html = `
                <div class="fade-in">
                    <div class="page-header">
                        <h2 class="page-title">👥 Clientes</h2>
                        <button class="btn-primary" onclick="abrirModalCliente()">
                            <i class="fas fa-plus"></i> Novo Cliente
                        </button>
                    </div>
                    <div class="card-grid" id="clientesGrid">
            `;

            if (data.data && data.data.length > 0) {
                data.data.forEach(cliente => {
                    const statusBadge = cliente.bloqueado_chatbot
                        ? '<span class="badge-danger">🔒 Bloqueado</span>'
                        : '<span class="badge-success">🔓 Liberado</span>';

                    html += `
                        <div class="card cliente-card" data-id="${cliente.id}">
                            <div class="card-header">
                                <div class="cliente-avatar">
                                    <i class="fas fa-user-circle"></i>
                                </div>
                                <div class="cliente-info">
                                    <h3>${cliente.nome}</h3>
                                    <p><i class="fas fa-phone"></i> ${cliente.telefone || 'Sem telefone'}</p>
                                    <p><i class="fas fa-envelope"></i> ${cliente.email || 'Sem email'}</p>
                                </div>
                                ${statusBadge}
                            </div>
                            <div class="card-actions">
                                <button class="btn-whatsapp" onclick="chamarWhatsApp('${cliente.telefone}')" ${!cliente.telefone ? 'disabled' : ''}>
                                    <i class="fab fa-whatsapp"></i>
                                </button>
                                <button class="btn-edit" onclick="editarCliente(${cliente.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-toggle" onclick="toggleBloqueio(${cliente.id}, ${cliente.bloqueado_chatbot || 0})">
                                    ${cliente.bloqueado_chatbot ? '🔓 Desbloquear' : '🔒 Bloquear'}
                                </button>
                                <button class="btn-delete" onclick="excluirCliente(${cliente.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                });
            } else {
                html += `
                    <div class="empty-state">
                        <i class="fas fa-users fa-3x"></i>
                        <p>Nenhum cliente cadastrado</p>
                        <button class="btn-primary" onclick="abrirModalCliente()">Cadastrar Cliente</button>
                    </div>
                `;
            }

            html += `</div></div>`;
            document.getElementById('content').innerHTML = html;
        } else {
            showToast(data.message || 'Erro ao carregar clientes', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar clientes', 'error');
    }

    hideLoading();
}

// ============================================
// SALVAR CLIENTE
// ============================================
async function salvarCliente() {
    const id = document.getElementById('clienteId').value;
    const nome = document.getElementById('clienteNome').value;
    const telefone = document.getElementById('clienteTelefone').value;
    const email = document.getElementById('clienteEmail').value;

    // VALIDAÇÃO
    if (!nome || nome.trim() === '') {
        showToast('Nome é obrigatório', 'error');
        return;
    }

    showLoading();

    try {
        const token = localStorage.getItem('token');
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/clientes/${id}` : '/api/clientes';

        console.log('📝 Salvando cliente:', { id, nome, telefone, email, method, url });

        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nome.trim(),
                telefone: telefone || '',
                email: email || ''
            })
        });

        const data = await res.json();
        console.log('📨 Resposta:', data);

        if (data.success) {
            showToast(data.message || 'Cliente salvo com sucesso!', 'success');
            fecharModalCliente();
            carregarClientes();
        } else {
            showToast(data.message || 'Erro ao salvar cliente', 'error');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        showToast('Erro ao salvar cliente: ' + error.message, 'error');
    }

    hideLoading();
}

// ============================================
// EDITAR CLIENTE
// ============================================
async function editarCliente(id) {
    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/clientes/${id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
            const cliente = data.data;
            document.getElementById('clienteId').value = cliente.id;
            document.getElementById('clienteNome').value = cliente.nome || '';
            document.getElementById('clienteTelefone').value = cliente.telefone || '';
            document.getElementById('clienteEmail').value = cliente.email || '';
            document.getElementById('modalClienteTitle').textContent = 'Editar Cliente';
            document.getElementById('modalCliente').style.display = 'block';
        } else {
            showToast('Erro ao carregar cliente', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar cliente', 'error');
    }
    hideLoading();
}

// ============================================
// EXCLUIR CLIENTE
// ============================================
async function excluirCliente(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/clientes/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
            showToast('Cliente removido com sucesso!', 'success');
            carregarClientes();
        } else {
            showToast(data.message || 'Erro ao excluir cliente', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir cliente', 'error');
    }
    hideLoading();
}

// ============================================
// BLOQUEAR/DESBLOQUEAR CHATBOT
// ============================================
async function toggleBloqueio(id, bloqueado) {
    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/clientes/${id}/bloquear-chatbot`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bloquear: !bloqueado })
        });
        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            carregarClientes();
        } else {
            showToast(data.message || 'Erro ao alterar status', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao alterar status', 'error');
    }
    hideLoading();
}

// ============================================
// CHAMAR WHATSAPP
// ============================================
function chamarWhatsApp(telefone) {
    if (!telefone) {
        showToast('Cliente não tem telefone cadastrado', 'warning');
        return;
    }
    const telefoneLimpo = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${telefoneLimpo}`, '_blank');
}

// ============================================
// EXPOR FUNÇÕES GLOBAIS
// ============================================
window.carregarClientes = carregarClientes;
window.salvarCliente = salvarCliente;
window.editarCliente = editarCliente;
window.excluirCliente = excluirCliente;
window.toggleBloqueio = toggleBloqueio;
window.chamarWhatsApp = chamarWhatsApp;