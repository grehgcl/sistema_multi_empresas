// pages/empresas.js
async function carregarEmpresas() {
    ativarBotao('empresas');
    
    const res = await fetch('/api/admin/empresas', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const empresas = (await res.json()).data || [];
    
    let html = '<h2>🏢 Empresas</h2>';
    for (let e of empresas) {
        html += `
            <div class="empresa-item" onclick="verEmpresa(${e.id})">
                <div style="display:flex; justify-content:space-between">
                    <div><strong>${e.nome}</strong> <span style="font-size:12px">${e.plano || 'trial'}</span></div>
                    <div>
                        <button class="btn-orange" onclick="event.stopPropagation(); editarEmpresa(${e.id}, '${e.nome}', '${e.plano || 'trial'}')">✏️ Editar</button>
                        <button class="btn-green" onclick="event.stopPropagation(); extenderTrial(${e.id})">📅 +30 dias</button>
                    </div>
                </div>
                <div style="display:flex; gap:20px; margin-top:10px; font-size:13px; color:#666">
                    <span>👥 ${e.total_usuarios || 0} donos</span>
                    <span>👤 ${e.total_clientes || 0} clientes</span>
                    <span>📅 ${e.total_agendamentos || 0} agendamentos</span>
                </div>
            </div>
        `;
    }
    document.getElementById('content').innerHTML = html;
}

window.verEmpresa = async function(id) {
    const res = await fetch('/api/admin/empresas/' + id, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const dados = (await res.json()).data;
    
    let html = `
        <button onclick="carregarEmpresas()">← Voltar</button>
        <h2>${dados.empresa.nome}</h2>
        <div class="card-grid">
            <div class="stat-card"><div class="stat-value">${dados.total_clientes}</div><div>Clientes</div></div>
            <div class="stat-card"><div class="stat-value">${dados.total_agendamentos}</div><div>Agendamentos</div></div>
            <div class="stat-card"><div class="stat-value">${dados.agendamentos_concluidos}</div><div>Concluídos</div></div>
        </div>
    `;
    document.getElementById('content').innerHTML = html;
};

window.editarEmpresa = function(id, nomeAtual, planoAtual) {
    document.getElementById('editEmpresaNome').value = nomeAtual;
    document.getElementById('editEmpresaPlano').value = planoAtual;
    window.empresaEditandoId = id;
    document.getElementById('modalEditarEmpresa').style.display = 'flex';
};

window.salvarEdicaoEmpresa = async function() {
    const nome = document.getElementById('editEmpresaNome').value;
    const plano = document.getElementById('editEmpresaPlano').value;
    const res = await fetch('/api/admin/empresas/' + window.empresaEditandoId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ nome, plano })
    });
    const data = await res.json();
    alert(data.message);
    fecharModal('modalEditarEmpresa');
    carregarEmpresas();
};

window.extenderTrial = async function(id) {
    if (confirm('Adicionar +30 dias de trial?')) {
        const res = await fetch('/api/admin/empresas/' + id + '/extender-trial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ dias: 30 })
        });
        const data = await res.json();
        alert(data.message);
        carregarEmpresas();
    }
};

window.carregarEmpresas = carregarEmpresas;
