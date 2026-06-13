// pages/clientes.js
async function carregarClientes() {
    ativarBotao('clientes');
    
    const res = await fetch('/api/clientes', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const clientes = (await res.json()).data || [];
    
    let html = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px">
            <h2>👥 Clientes</h2>
            <button class="btn-green" onclick="abrirModalCliente()">+ Novo Cliente</button>
        </div>
        <div class="card">
            <table>
                <thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Ações</th></tr></thead>
                <tbody>
                    ${clientes.map(c => `
                        <tr>
                            <td>${c.nome}</td>
                            <td>${c.telefone || '-'}</td>
                            <td>${c.email || '-'}</td>
                            <td><button class="btn-red" onclick="excluirCliente(${c.id})">Excluir</button></td>
                        </tr>
                    `).join('')}
                    ${clientes.length === 0 ? '<tr><td colspan="4">Nenhum cliente cadastrado</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
    document.getElementById('content').innerHTML = html;
}

window.abrirModalCliente = function() {
    document.getElementById('modalCliente').style.display = 'flex';
    document.getElementById('clienteNome').value = '';
    document.getElementById('clienteTelefone').value = '';
    document.getElementById('clienteEmail').value = '';
};

window.salvarCliente = async function() {
    const nome = document.getElementById('clienteNome').value;
    const telefone = document.getElementById('clienteTelefone').value;
    const email = document.getElementById('clienteEmail').value;
    
    const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ nome, telefone, email })
    });
    const data = await res.json();
    if (data.success) {
        fecharModal('modalCliente');
        carregarClientes();
    } else {
        alert(data.message);
    }
};

window.excluirCliente = async function(id) {
    if (confirm('Excluir este cliente?')) {
        await fetch('/api/clientes/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        carregarClientes();
    }
};

window.carregarClientes = carregarClientes;
