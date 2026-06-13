// Página de Serviços - Apenas Dono
let listaServicosGlobal = [];

async function carregarServicos() {
    ativarBotao('servicos');

    const usuario = JSON.parse(localStorage.getItem('usuario'));
    if (usuario.role !== 'dono') {
        document.getElementById('content').innerHTML = '<div class="card"><div class="card-body" style="color:red">Acesso negado. Apenas donos podem acessar serviços.</div></div>';
        return;
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>💇 Serviços</h2>
            <button class="btn-green" onclick="abrirModalServico()" style="background:#48bb78; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">+ Novo Serviço</button>
        </div>
        <div class="card">
            <div style="overflow-x: auto;">
                <table style="width:100%">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th>Valor (R$)</th>
                            <th>Duração (min)</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaServicosBody">
                        <tr><td colspan="6" style="text-align:center">Carregando...</td</tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
    await carregarListaServicos();
}

async function carregarListaServicos() {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/servicos/todos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            listaServicosGlobal = result.data;
            const tbody = document.getElementById('tabelaServicosBody');

            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum serviço cadastrado</td</tr>';
            } else {
                tbody.innerHTML = result.data.map(s => `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${escapeHtml(s.nome)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${escapeHtml(s.descricao || '-')}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">R$ ${(s.valor || 0).toFixed(2)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${s.duracao} min</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">
                            ${s.ativo ? '<span style="background:#48bb78; color:white; padding:4px 8px; border-radius:4px;">Ativo</span>' : '<span style="background:#e53e3e; color:white; padding:4px 8px; border-radius:4px;">Inativo</span>'}
                        </td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">
                            <button onclick="editarServico(${s.id})" style="background:#ed8936; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️ Editar</button>
                            <button onclick="excluirServico(${s.id})" style="background:#e53e3e; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">🗑️ Excluir</button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('tabelaServicosBody').innerHTML = '<tr><td colspan="6" style="text-align:center;color:red">Erro ao carregar serviços</td></tr>';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function abrirModalServico(servico = null) {
    const isEdit = servico !== null;

    const modalDiv = document.createElement('div');
    modalDiv.id = 'modalServicoCustom';
    modalDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';

    modalDiv.innerHTML = `
        <div style="background: white; border-radius: 10px; padding: 25px; width: 450px; max-width: 90%;">
            <h3 style="margin-bottom: 20px;">${isEdit ? 'Editar' : 'Novo'} Serviço</h3>
            <input type="hidden" id="servicoEditId" value="${isEdit ? servico.id : ''}">
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Nome *</label>
                <input type="text" id="servicoNome" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" value="${isEdit ? escapeHtml(servico.nome) : ''}">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Descrição</label>
                <textarea id="servicoDescricao" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${isEdit ? (servico.descricao || '') : ''}</textarea>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Valor (R$) *</label>
                <input type="number" id="servicoValor" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" value="${isEdit ? servico.valor : ''}">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Duração (minutos)</label>
                <input type="number" id="servicoDuracao" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" value="${isEdit ? (servico.duracao || 30) : 30}">
            </div>
            
            ${isEdit ? `
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Status</label>
                <select id="servicoStatus" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="1" ${servico.ativo === 1 ? 'selected' : ''}>Ativo</option>
                    <option value="0" ${servico.ativo === 0 ? 'selected' : ''}>Inativo</option>
                </select>
            </div>
            ` : ''}
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button onclick="fecharModalServico()" style="background: #ddd; color: #333; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                <button onclick="salvarServico()" style="background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);
}

function fecharModalServico() {
    const modal = document.getElementById('modalServicoCustom');
    if (modal) modal.remove();
}

async function salvarServico() {
    const id = document.getElementById('servicoEditId').value;
    const nome = document.getElementById('servicoNome').value;
    const descricao = document.getElementById('servicoDescricao').value;
    const valor = document.getElementById('servicoValor').value;
    const duracao = document.getElementById('servicoDuracao').value;

    if (!nome || !valor) {
        alert('Nome e valor são obrigatórios');
        return;
    }

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
            alert(result.message);
            fecharModalServico();
            await carregarListaServicos();
        } else {
            alert('Erro: ' + result.message);
        }
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

async function editarServico(id) {
    const servico = listaServicosGlobal.find(s => s.id === id);
    if (servico) {
        abrirModalServico(servico);
    }
}

async function excluirServico(id) {
    if (!confirm('Tem certeza que deseja excluir/desativar este serviço?')) return;

    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/servicos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            alert(result.message);
            await carregarListaServicos();
        } else {
            alert('Erro: ' + result.message);
        }
    } catch (error) {
        alert('Erro: ' + error.message);
    }
}

// Registrar funções globais
window.carregarServicos = carregarServicos;
window.abrirModalServico = abrirModalServico;
window.fecharModalServico = fecharModalServico;
window.salvarServico = salvarServico;
window.editarServico = editarServico;
window.excluirServico = excluirServico;