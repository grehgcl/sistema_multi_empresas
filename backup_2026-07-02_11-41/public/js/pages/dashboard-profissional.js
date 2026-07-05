// Dashboard para Profissional
async function carregarDashboardProfissional() {
    ativarBotao('dashboard');
    showLoading();

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    let html = `
        <div class="fade-in">
            <h2 class="page-title">📊 Meu Dashboard</h2>
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value" id="totalComissoes">R$ 0,00</div>
                        <div class="stat-label">Total em Comissões</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✂️</div>
                    <div class="stat-content">
                        <div class="stat-value" id="totalServicos">0</div>
                        <div class="stat-label">Total Atendimentos</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value" id="servicosPendentes">0</div>
                        <div class="stat-label">Pendentes</div>
                    </div>
                </div>
            </div>
            <div class="card">
                <h3>📋 Últimas Comissões</h3>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th>Serviço</th>
                                <th>Valor</th>
                                <th>Sua Comissão</th>
                            </tr>
                        </thead>
                        <tbody id="ultimasComissoes"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;

    try {
        // Buscar dados financeiros do profissional
        const resFinanceiro = await fetch('/api/profissional/financeiro', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const financeiro = await resFinanceiro.json();

        // Buscar agendamentos do profissional
        const resAgendamentos = await fetch('/api/profissional/agendamentos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const agendamentos = await resAgendamentos.json();

        console.log('Financeiro:', financeiro);
        console.log('Agendamentos:', agendamentos);

        if (financeiro.success) {
            const totais = financeiro.data.totais;
            const comissoes = financeiro.data.comissoes || [];

            document.getElementById('totalComissoes').innerHTML = `R$ ${(totais.total_comissoes || 0).toFixed(2)}`;
            document.getElementById('totalServicos').innerHTML = totais.total_servicos || 0;

            // Últimas 5 comissões
            const ultimas = comissoes.slice(0, 5);
            const tbody = document.getElementById('ultimasComissoes');

            if (ultimas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">Nenhuma comissão registrada ainda</td></tr>';
            } else {
                tbody.innerHTML = ultimas.map(c => {
                    // Pegar o nome do serviço corretamente
                    const servicoNome = c.servico_nome || c.servico || 'N/A';
                    const clienteNome = c.cliente_nome || c.nome_cliente || 'N/A';
                    const dataFormatada = c.data ? new Date(c.data).toLocaleDateString('pt-BR') : '-';

                    return `
                        <tr>
                            <td>${dataFormatada}</td>
                            <td><strong>${escapeHtml(clienteNome)}</strong></td>
                            <td>${escapeHtml(servicoNome)}</td>
                            <td>R$ ${(c.valor || 0).toFixed(2)}</td>
                            <td><strong class="text-success">R$ ${(c.comissao || 0).toFixed(2)}</strong></td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            console.error('Erro ao carregar financeiro:', financeiro);
            document.getElementById('ultimasComissoes').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar comissões</td></tr>';
        }

        if (agendamentos.success) {
            const pendentes = agendamentos.data.filter(a => a.status === 'pendente').length;
            document.getElementById('servicosPendentes').innerHTML = pendentes;
        }

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showToast('Erro ao carregar dados do dashboard', 'error');
    }

    hideLoading();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.carregarDashboardProfissional = carregarDashboardProfissional;