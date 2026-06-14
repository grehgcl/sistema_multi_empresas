// pages/dashboard.js - Versão Melhorada
let dashboardData = null;
let chartInstance = null;

async function carregarDashboard() {
    ativarBotao('dashboard');
    showLoading();

    try {
        if (usuario.role === 'superadmin') {
            await carregarDashboardSuperAdmin();
        } else if (usuario.role === 'profissional') {
            await carregarDashboardProfissional();
        } else {
            await carregarDashboardDono();
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showToast('Erro ao carregar dashboard', 'error');
        document.getElementById('content').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dashboard. Tente novamente.</p>
                <button onclick="carregarDashboard()" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
    }

    hideLoading();
}

// ============================================
// DASHBOARD DO DONO
// ============================================
async function carregarDashboardDono() {
    const token = localStorage.getItem('token');

    // Buscar dados em paralelo
    const [agendamentosRes, clientesRes, servicosRes, financeiroRes, profissionaisRes] = await Promise.all([
        fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/servicos/todos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/financeiro', { headers: { 'Authorization': 'Bearer ' + token } }),  // ← Mesmo endpoint do Financeiro
        fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const agendamentos = (await agendamentosRes.json()).data || [];
    const clientes = (await clientesRes.json()).data || [];
    const servicos = (await servicosRes.json()).data || [];
    const financeiro = (await financeiroRes.json()).data || {};
    const profissionais = (await profissionaisRes.json()).data || [];

    // ============================================
    // USAR OS MESMOS DADOS DO FINANCEIRO
    // ============================================
    const totais = financeiro.totais || {};

    // Faturamento Bruto, Comissões e Líquido vindos diretamente do endpoint financeiro
    const faturamentoBruto = totais.faturamento_bruto || 0;
    const totalComissoes = totais.total_comissoes || 0;  // ← Esta é a comissão que aparece no Financeiro!
    const faturamentoLiquido = totais.faturamento_liquido || 0;
    const totalServicosConcluidos = totais.total_servicos || 0;

    // Estatísticas adicionais
    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => a.data === hoje);
    const pendentes = agendamentos.filter(a => a.status === 'pendente');
    const concluidos = agendamentos.filter(a => a.status === 'concluido');

    // Faturamento do mês (para o card específico)
    const dataAtual = new Date();
    const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).toISOString().split('T')[0];
    const faturamentoMes = agendamentos.filter(a =>
        a.status === 'concluido' && a.data >= primeiroDiaMes
    ).reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

    // Ticket médio
    const ticketMedio = concluidos.length > 0 ?
        (concluidos.reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0) / concluidos.length).toFixed(2) : 0;

    // Contar profissionais ativos
    const profissionaisAtivos = profissionais.filter(p => p.ativo === 1 || p.ativo === true).length;

    // Novos clientes este mês
    const novosClientesMes = clientes.filter(c => {
        const dataCriacao = new Date(c.created_at);
        return dataCriacao >= new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    }).length;

    // Agendamentos por dia da semana (para gráfico)
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const agendamentosPorDia = [0, 0, 0, 0, 0, 0, 0];
    agendamentos.forEach(ag => {
        const data = new Date(ag.data + 'T00:00:00');
        const diaSemana = data.getDay();
        agendamentosPorDia[diaSemana]++;
    });

    // Serviços mais populares
    const servicosPopulares = {};
    concluidos.forEach(ag => {
        const nomeServico = ag.servico || 'Serviço';
        servicosPopulares[nomeServico] = (servicosPopulares[nomeServico] || 0) + 1;
    });
    const topServicos = Object.entries(servicosPopulares)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Próximos agendamentos
    const proximosAgendamentos = agendamentos
        .filter(a => a.status === 'pendente' && a.data >= hoje)
        .sort((a, b) => (a.data + ' ' + a.hora).localeCompare(b.data + ' ' + b.hora))
        .slice(0, 5);

    // Calcular variação do faturamento
    const mesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1);
    const primeiroDiaMesAnterior = mesAnterior.toISOString().split('T')[0];
    const ultimoDiaMesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 0).toISOString().split('T')[0];
    const faturamentoMesAnterior = agendamentos.filter(a =>
        a.status === 'concluido' && a.data >= primeiroDiaMesAnterior && a.data <= ultimoDiaMesAnterior
    ).reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

    const variacaoPercentual = faturamentoMesAnterior > 0 ?
        ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior * 100).toFixed(1) : 0;
    const variacaoSinal = variacaoPercentual >= 0 ? '+' : '';
    const variacaoClasse = variacaoPercentual >= 0 ? 'trend-up' : 'trend-down';
    const variacaoIcone = variacaoPercentual >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

    const html = `
        <div class="fade-in">
            <div class="dashboard-header">
                <h2 class="page-title">📊 Dashboard da Barbearia</h2>
                <div class="date-range">
                    <span class="badge badge-info">
                        <i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}
                    </span>
                </div>
            </div>
            
            <!-- Cards Principais -->
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoMes)}</div>
                        <div class="stat-label">Faturamento do Mês</div>
                        <div class="stat-trend ${variacaoClasse}">
                            <i class="fas ${variacaoIcone}"></i> ${variacaoSinal}${variacaoPercentual}% este mês
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">✂️</div>
                    <div class="stat-content">
                        <div class="stat-value">${agendamentos.length}</div>
                        <div class="stat-label">Total Atendimentos</div>
                        <div class="stat-sub">${concluidos.length} concluídos</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${clientes.length}</div>
                        <div class="stat-label">Clientes</div>
                        <div class="stat-sub">${novosClientesMes} novos este mês</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${pendentes.length}</div>
                        <div class="stat-label">Pendentes</div>
                        <div class="stat-sub">${agendamentosHoje.length} hoje</div>
                    </div>
                </div>
            </div>
            
            <!-- Cards de Performance (com os dados do Financeiro) -->
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-icon">🎫</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(ticketMedio)}</div>
                        <div class="stat-label">Ticket Médio</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${totalServicosConcluidos}</div>
                        <div class="stat-label">Serviços Concluídos</div>
                        <div class="stat-sub">${((totalServicosConcluidos / agendamentos.length) * 100 || 0).toFixed(1)}% do total</div>
                    </div>
                </div>
                
                <!-- Card de Comissões a Pagar - MESMO VALOR DO FINANCEIRO -->
                <div class="stat-card">
                    <div class="stat-icon">💸</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(totalComissoes)}</div>
                        <div class="stat-label">Comissões a Pagar</div>
                        <div class="stat-sub">
                            <i class="fas fa-users"></i> ${profissionaisAtivos} profissionais
                            ${totalComissoes > 0 ? '<br><small style="color:#f59e0b;">💰 Total de comissões calculadas</small>' : ''}
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div class="stat-content">
                        <div class="stat-value">${servicos.length}</div>
                        <div class="stat-label">Serviços</div>
                        <div class="stat-sub">${servicos.filter(s => s.ativo).length} ativos</div>
                    </div>
                </div>
            </div>
            
            <!-- Cards Extras - Faturamento Bruto e Líquido (igual Financeiro) -->
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoBruto)}</div>
                        <div class="stat-label">Faturamento Bruto Total</div>
                        <div class="stat-sub">Total de serviços concluídos</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">💎</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoLiquido)}</div>
                        <div class="stat-label">Faturamento Líquido</div>
                        <div class="stat-sub">Bruto - Comissões</div>
                    </div>
                </div>
            </div>
            
            <!-- Gráficos -->
            <div class="card-grid-2">
                <div class="card">
                    <h3><i class="fas fa-chart-line"></i> Agendamentos por Dia da Semana</h3>
                    <canvas id="chartAgendamentos" style="max-height: 300px; width: 100%"></canvas>
                </div>
                
                <div class="card">
                    <h3><i class="fas fa-trophy"></i> Serviços Mais Populares</h3>
                    ${topServicos.length > 0 ? `
                        <div class="top-servicos">
                            ${topServicos.map(([nome, qtd], idx) => `
                                <div class="servico-item">
                                    <div class="servico-rank ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}">
                                        ${idx + 1}º
                                    </div>
                                    <div class="servico-info">
                                        <div class="servico-nome">${escapeHtml(nome)}</div>
                                        <div class="servico-quantidade">${qtd} atendimentos</div>
                                    </div>
                                    <div class="servico-percent">
                                        ${((qtd / totalServicosConcluidos) * 100 || 0).toFixed(1)}%
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted" style="padding: 40px; text-align: center;">Nenhum serviço concluído ainda</p>'}
                </div>
            </div>
            
            <!-- Próximos Agendamentos -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-calendar-alt"></i> Próximos Atendimentos</h3>
                    <button class="btn btn-sm btn-primary" onclick="carregarAgendamentos()">
                        Ver Todos <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                ${proximosAgendamentos.length > 0 ? `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Serviço</th>
                                    <th>Data</th>
                                    <th>Horário</th>
                                    <th>Profissional</th>
                                    <th>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${proximosAgendamentos.map(ag => `
                                    <tr>
                                        <td><strong>${escapeHtml(ag.cliente_nome || 'Cliente')}</strong></td>
                                        <td>${escapeHtml(ag.servico || '-')}</td>
                                        <td>${formatarDataBr(ag.data)}</
                                        <td>${ag.hora || '-'}</
                                        <td>${escapeHtml(ag.profissional_nome || '-')}</
                                        <td>R$ ${formatarMoeda(ag.valor)}</
                                    40
                                `).join('')}
                            </tbody>
                        60
                    </div>
                ` : '<p class="text-muted" style="padding: 40px; text-align: center;">Nenhum agendamento pendente</p>'}
            </div>
            
            <!-- Últimos Clientes -->
            <div class="card">
                <h3><i class="fas fa-users"></i> Últimos Clientes</h3>
                <div class="clientes-grid">
                    ${clientes.slice(0, 6).map(cliente => `
                        <div class="cliente-card">
                            <div class="cliente-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="cliente-info">
                                <div class="cliente-nome">${escapeHtml(cliente.nome)}</div>
                                <div class="cliente-contato">${escapeHtml(cliente.telefone || cliente.email || 'Sem contato')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${clientes.length > 6 ? `
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="btn btn-secondary btn-sm" onclick="carregarClientes()">
                            Ver todos os ${clientes.length} clientes
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;

    // Renderizar gráfico
    setTimeout(() => {
        renderizarGraficoAgendamentos(diasSemana, agendamentosPorDia);
    }, 100);
}

// ============================================
// DASHBOARD SUPER ADMIN
// ============================================
async function carregarDashboardSuperAdmin() {
    const token = localStorage.getItem('token');

    const [statsRes, empresasRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/admin/empresas', { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const stats = (await statsRes.json()).data || {};
    const empresas = (await empresasRes.json()).data || [];

    const empresasTrial = empresas.filter(e => e.plano === 'trial').length;
    const empresasPagas = empresas.filter(e => e.plano !== 'trial').length;

    const html = `
        <div class="fade-in">
            <h2 class="page-title">🏢 Dashboard Super Admin</h2>
            
            <!-- Cards Principais -->
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">🏢</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.empresas || 0}</div>
                        <div class="stat-label">Total de Empresas</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">👨‍💼</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.donos || 0}</div>
                        <div class="stat-label">Donos</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.clientes || 0}</div>
                        <div class="stat-label">Total Clientes</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">✂️</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.agendamentos || 0}</div>
                        <div class="stat-label">Agendamentos</div>
                    </div>
                </div>
            </div>
            
            <!-- Status Planos -->
            <div class="card-grid-2">
                <div class="card">
                    <h3><i class="fas fa-chart-pie"></i> Distribuição de Planos</h3>
                    <div style="padding: 20px;">
                        <div class="progress-item">
                            <div class="progress-label">
                                <span>Trial</span>
                                <span>${empresasTrial}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(empresasTrial / (empresas.length || 1)) * 100}%; background: #f59e0b;"></div>
                            </div>
                        </div>
                        <div class="progress-item">
                            <div class="progress-label">
                                <span>Premium/Básico</span>
                                <span>${empresasPagas}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(empresasPagas / (empresas.length || 1)) * 100}%; background: #10b981;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3><i class="fas fa-clock"></i> Empresas em Trial</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${empresas.filter(e => e.plano === 'trial').slice(0, 5).map(emp => `
                            <div class="empresa-trial-item">
                                <div>
                                    <strong>${escapeHtml(emp.nome)}</strong>
                                    <div class="text-muted small">Expira: ${formatarDataBr(emp.trial_expira)}</div>
                                </div>
                                <button class="btn btn-sm btn-primary" onclick="estenderTrial(${emp.id})">
                                    +30 dias
                                </button>
                            </div>
                        `).join('')}
                        ${empresas.filter(e => e.plano === 'trial').length === 0 ?
            '<p class="text-muted">Nenhuma empresa em trial</p>' : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
}

// ============================================
// DASHBOARD PROFISSIONAL
// ============================================
async function carregarDashboardProfissional() {
    const token = localStorage.getItem('token');

    const [agendamentosRes, financeiroRes] = await Promise.all([
        fetch('/api/profissional/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/financeiro', { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const agendamentos = (await agendamentosRes.json()).data || [];
    const financeiro = (await financeiroRes.json()).data || {};

    const pendentes = agendamentos.filter(a => a.status === 'pendente');
    const concluidos = agendamentos.filter(a => a.status === 'concluido');
    const totalComissoes = financeiro.total_comissoes || 0;

    const html = `
        <div class="fade-in">
            <h2 class="page-title">📊 Meu Dashboard</h2>
            
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(totalComissoes)}</div>
                        <div class="stat-label">Total em Comissões</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">✂️</div>
                    <div class="stat-content">
                        <div class="stat-value">${agendamentos.length}</div>
                        <div class="stat-label">Total Atendimentos</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${pendentes.length}</div>
                        <div class="stat-label">Pendentes</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${concluidos.length}</div>
                        <div class="stat-label">Concluídos</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-calendar-alt"></i> Meus Próximos Atendimentos</h3>
                    <button class="btn btn-sm btn-primary" onclick="carregarAgendamentosProfissional()">
                        Ver Todos
                    </button>
                </div>
                ${pendentes.length > 0 ? `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr><th>Cliente</th><th>Serviço</th><th>Data</th><th>Hora</th><th>Valor</th><th>Comissão</th></tr>
                            </thead>
                            <tbody>
                                ${pendentes.slice(0, 5).map(ag => `
                                    <tr>
                                        <td>${escapeHtml(ag.cliente_nome || 'Cliente')}</td>
                                        <td>${escapeHtml(ag.servico || '-')}</td>
                                        <td>${formatarDataBr(ag.data)}</td>
                                        <td>${ag.hora || '-'}</td>
                                        <td>R$ ${formatarMoeda(ag.valor)}</td>
                                        <td>R$ ${formatarMoeda(ag.comissao || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p class="text-muted" style="padding: 40px; text-align: center;">Nenhum atendimento pendente</p>'}
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function renderizarGraficoAgendamentos(dias, dados) {
    const canvas = document.getElementById('chartAgendamentos');
    if (!canvas) return;

    // Usar Chart.js se disponível, ou fallback simples
    if (typeof Chart !== 'undefined') {
        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Agendamentos',
                    data: dados,
                    backgroundColor: 'rgba(139, 92, 246, 0.7)',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.raw} agendamentos` } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    } else {
        // Fallback simples sem Chart.js
        console.log('Chart.js não carregado');
    }
}

function formatarMoeda(valor) {
    if (!valor) return '0,00';
    return parseFloat(valor).toFixed(2).replace('.', ',');
}

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para estender trial (Super Admin)
window.estenderTrial = async function (empresaId) {
    if (!confirm('Estender trial por mais 30 dias?')) return;

    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/empresas/${empresaId}/extender-trial`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
            showToast('Trial estendido com sucesso!', 'success');
            carregarDashboard();
        } else {
            showToast(data.message || 'Erro ao estender trial', 'error');
        }
    } catch (error) {
        showToast('Erro ao estender trial', 'error');
    }
    hideLoading();
};

// Exportar
window.carregarDashboard = carregarDashboard;
window.carregarDashboardSuperAdmin = carregarDashboardSuperAdmin;
window.carregarDashboardProfissional = carregarDashboardProfissional;