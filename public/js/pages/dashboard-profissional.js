// Dashboard para Profissional
async function carregarDashboardProfissional() {
    ativarBotao('dashboard');
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    let html = `
        <h2>📊 Dashboard do Profissional</h2>
        <div class="card-grid">
            <div class="stat-card">
                <div class="stat-value" id="totalComissoes">R$ 0,00</div>
                <div>Total Ganho em Comissões</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="totalServicos">0</div>
                <div>Serviços Concluídos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="servicosPendentes">0</div>
                <div>Serviços Pendentes</div>
            </div>
        </div>
        <div class="card">
            <h3>Últimas Comissões</h3>
            <div style="overflow-x: auto;">
                <table style="width:100%">
                    <thead>
                        <tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Sua Comissão</th></tr>
                    </thead>
                    <tbody id="ultimasComissoes"></tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('content').innerHTML = html;
    
    // Buscar dados do profissional
    const resFinanceiro = await fetch('/api/profissional/financeiro', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const financeiro = await resFinanceiro.json();
    
    const resAgendamentos = await fetch('/api/profissional/agendamentos', {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const agendamentos = await resAgendamentos.json();
    
    if (financeiro.success) {
        const totais = financeiro.data.totais;
        document.getElementById('totalComissoes').innerHTML = `R$ ${totais.total_comissoes.toFixed(2)}`;
        document.getElementById('totalServicos').innerHTML = totais.total_servicos;
        
        const ultimas = financeiro.data.comissoes.slice(0, 5);
        const tbody = document.getElementById('ultimasComissoes');
        if (ultimas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Nenhuma comissão ainda</td></tr>';
        } else {
            tbody.innerHTML = ultimas.map(c => `
                <tr>
                    <td>${new Date(c.data).toLocaleDateString()}</td>
                    <td>${c.cliente_nome || 'N/A'}</td>
                    <td>${c.servico || 'N/A'}</td>
                    <td>R$ ${(c.valor || 0).toFixed(2)}</td>
                    <td><strong>R$ ${(c.comissao || 0).toFixed(2)}</strong></td>
                </tr>
            `).join('');
        }
    }
    
    if (agendamentos.success) {
        const pendentes = agendamentos.data.filter(a => a.status === 'pendente').length;
        document.getElementById('servicosPendentes').innerHTML = pendentes;
    }
}

window.carregarDashboardProfissional = carregarDashboardProfissional;
