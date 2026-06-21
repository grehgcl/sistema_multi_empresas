// pages/dashboard.js - Versão Premium com Banner, Ações Rápidas e Onboarding
let dashboardData = null;
let chartInstance = null;

async function carregarDashboard() {
    ativarBotao('dashboard');
    showLoading();

    try {
        const usuarioStr = localStorage.getItem('usuario');
        const usuarioAtual = usuarioStr ? JSON.parse(usuarioStr) : null;

        if (usuarioAtual && usuarioAtual.role === 'superadmin') {
            await carregarDashboardSuperAdmin();
        } else if (usuarioAtual && usuarioAtual.role === 'profissional') {
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
// DASHBOARD DO DONO - VERSÃO PREMIUM
// ============================================
async function carregarDashboardDono() {
    const token = localStorage.getItem('token');

    let empresa = { plano: 'trial', assinatura_ativa: 0 };

    try {
        const empresaRes = await fetch('/api/empresa/dados', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const empresaData = await empresaRes.json();
        if (empresaData.success) {
            empresa = empresaData.data;
        }
    } catch (error) {
        console.warn('Não foi possível buscar dados da empresa:', error);
    }

    const [agendamentosRes, clientesRes, servicosRes, financeiroRes, profissionaisRes] = await Promise.all([
        fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/servicos/todos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/financeiro', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const agendamentos = (await agendamentosRes.json()).data || [];
    const clientes = (await clientesRes.json()).data || [];
    const servicos = (await servicosRes.json()).data || [];
    const financeiro = (await financeiroRes.json()).data || {};
    const profissionais = (await profissionaisRes.json()).data || [];

    // ============================================
    // VERIFICAR TRIAL
    // ============================================
    const planoAtual = empresa.plano || 'trial';
    const assinaturaAtiva = empresa.assinatura_ativa === 1;

    let mostrarAvisoTrial = false;
    let diasRestantes = 0;
    let mensagemTrial = '';

    if (!assinaturaAtiva && planoAtual === 'trial') {
        if (empresa.trial_expira) {
            const hoje = new Date();
            const dataExpira = new Date(empresa.trial_expira);
            diasRestantes = Math.ceil((dataExpira - hoje) / (1000 * 60 * 60 * 24));

            if (diasRestantes > 0 && diasRestantes <= 45) {
                mostrarAvisoTrial = true;
                mensagemTrial = `⚠️ Período de teste: ${diasRestantes} dias restantes.`;
            }
        }
    }

    if (assinaturaAtiva) {
        mostrarAvisoTrial = false;
    }

    // ============================================
    // CÁLCULOS
    // ============================================
    const totais = financeiro.totais || {};
    const faturamentoBruto = totais.faturamento_bruto || 0;
    const totalComissoes = totais.total_comissoes || 0;
    const faturamentoLiquido = totais.faturamento_liquido || 0;
    const totalServicosConcluidos = totais.total_servicos || 0;

    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => a.data === hoje);
    const pendentes = agendamentos.filter(a => a.status === 'pendente');
    const concluidos = agendamentos.filter(a => a.status === 'concluido');

    const dataAtual = new Date();
    const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).toISOString().split('T')[0];
    const faturamentoMes = agendamentos.filter(a =>
        a.status === 'concluido' && a.data >= primeiroDiaMes
    ).reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

    const ticketMedio = concluidos.length > 0 ?
        (concluidos.reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0) / concluidos.length).toFixed(2) : 0;

    const profissionaisAtivos = profissionais.filter(p => p.ativo === 1 || p.ativo === true).length;

    const novosClientesMes = clientes.filter(c => {
        const dataCriacao = new Date(c.created_at);
        return dataCriacao >= new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    }).length;

    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const agendamentosPorDia = [0, 0, 0, 0, 0, 0, 0];
    agendamentos.forEach(ag => {
        const data = new Date(ag.data + 'T00:00:00');
        const diaSemana = data.getDay();
        agendamentosPorDia[diaSemana]++;
    });

    const servicosPopulares = {};
    concluidos.forEach(ag => {
        const nomeServico = ag.servico || 'Serviço';
        servicosPopulares[nomeServico] = (servicosPopulares[nomeServico] || 0) + 1;
    });
    const topServicos = Object.entries(servicosPopulares)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const proximosAgendamentos = agendamentos
        .filter(a => a.status === 'pendente' && a.data >= hoje)
        .sort((a, b) => (a.data + ' ' + a.hora).localeCompare(b.data + ' ' + b.hora))
        .slice(0, 5);

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

    // Verificar se é um novo usuário (sem agendamentos e sem clientes)
    const isNewUser = agendamentos.length === 0 && clientes.length === 0;

    // ============================================
    // NOME DO USUÁRIO PARA BOAS-VINDAS
    // ============================================
    const usuarioStr = localStorage.getItem('usuario');
    const usuarioAtual = usuarioStr ? JSON.parse(usuarioStr) : null;
    const nomeUsuario = usuarioAtual?.nome || 'Usuário';

    // ============================================
    // HTML DO DASHBOARD - VERSÃO PREMIUM
    // ============================================
    const html = `
        <div class="fade-in">
            ${mostrarAvisoTrial ? `
                <div class="trial-banner">
                    <div class="trial-content">
                        <span>${mensagemTrial}</span>
                        <button onclick="carregarPlanos()" class="btn-upgrade">Fazer upgrade →</button>
                    </div>
                </div>
            ` : ''}
            
            <!-- BANNER DE BOAS-VINDAS -->
            <div class="welcome-banner">
                <div class="welcome-content">
                    <div>
                        <h2>👋 Olá, ${nomeUsuario}!</h2>
                        <p>Bem-vindo ao See&Agende. Aqui está o resumo do seu negócio hoje.</p>
                        <div class="welcome-tips">
                            <i class="fas fa-lightbulb"></i> 
                            ${isNewUser ?
            '💡 Dica: Comece cadastrando seus serviços!' :
            '💡 Dica: Clique em "Novo Agendamento" para começar'}
                        </div>
                    </div>
                    <div class="welcome-date">
                        <span class="day">${dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
                        <span class="date">${dataAtual.toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
            
            <!-- AÇÕES RÁPIDAS -->
            <div class="quick-actions">
                <h3>⚡ Ações Rápidas</h3>
                <div class="quick-actions-grid">
                    <button class="quick-action" onclick="abrirModalAgendamento()">
                        <i class="fas fa-plus-circle"></i>
                        <span>Novo Agendamento</span>
                    </button>
                    <button class="quick-action" onclick="abrirModalCliente()">
                        <i class="fas fa-user-plus"></i>
                        <span>Novo Cliente</span>
                    </button>
                    <button class="quick-action" onclick="carregarAgendamentos()">
                        <i class="fas fa-calendar-day"></i>
                        <span>Ver Agenda</span>
                    </button>
                    <button class="quick-action" onclick="carregarFinanceiro()">
                        <i class="fas fa-chart-simple"></i>
                        <span>Ver Financeiro</span>
                    </button>
                </div>
            </div>
            
            <!-- ONBOARDING PARA NOVOS USUÁRIOS -->
            ${isNewUser ? `
                <div class="onboarding-card">
                    <div class="onboarding-content">
                        <i class="fas fa-rocket"></i>
                        <h3>🚀 Comece aqui!</h3>
                        <p>Parece que você ainda não tem agendamentos. Vamos te ajudar a começar:</p>
                        <div class="onboarding-steps">
                            <div class="step">
                                <span class="step-number">1</span>
                                <span>Cadastre seus <strong>serviços</strong></span>
                            </div>
                            <div class="step">
                                <span class="step-number">2</span>
                                <span>Adicione seus <strong>profissionais</strong></span>
                            </div>
                            <div class="step">
                                <span class="step-number">3</span>
                                <span>Crie seu primeiro <strong>agendamento</strong></span>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="carregarServicos()">
                            <i class="fas fa-arrow-right"></i> Começar Agora
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <!-- Cards Principais - Linha 1 -->
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoMes)}</div>
                        <div class="stat-label">Faturamento do Mês</div>
                        <div class="stat-trend ${variacaoClasse}">
                            <i class="fas ${variacaoIcone}"></i> ${variacaoSinal}${variacaoPercentual}% vs mês anterior
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon purple">✂️</div>
                    <div class="stat-content">
                        <div class="stat-value">${agendamentos.length}</div>
                        <div class="stat-label">Total de Atendimentos</div>
                        <div class="stat-sub">
                            <span class="text-success">${concluidos.length} concluídos</span>
                            ${pendentes.length > 0 ? ` · <span class="text-warning">${pendentes.length} pendentes</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon blue">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${clientes.length}</div>
                        <div class="stat-label">Clientes</div>
                        <div class="stat-sub">
                            <span class="text-success">+${novosClientesMes} novos</span> este mês
                        </div>
                    </div>
                </div>
                
                <div class="stat-card ${pendentes.length > 5 ? 'warning' : ''}">
                    <div class="stat-icon orange">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${pendentes.length}</div>
                        <div class="stat-label">Pendentes</div>
                        <div class="stat-sub">
                            ${agendamentosHoje.length > 0 ?
            `<span class="text-warning">${agendamentosHoje.length} hoje</span>` :
            'Nenhum hoje'}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cards Performance - Linha 2 -->
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-icon teal">🎫</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(ticketMedio)}</div>
                        <div class="stat-label">Ticket Médio</div>
                        <div class="stat-sub">${concluidos.length} atendimentos</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon green">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${totalServicosConcluidos}</div>
                        <div class="stat-label">Serviços Concluídos</div>
                        <div class="stat-sub">
                            ${((totalServicosConcluidos / (agendamentos.length || 1)) * 100 || 0).toFixed(1)}% do total
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon pink">💸</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(totalComissoes)}</div>
                        <div class="stat-label">Comissões a Pagar</div>
                        <div class="stat-sub">
                            <i class="fas fa-users"></i> ${profissionaisAtivos} profissionais
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon indigo">📦</div>
                    <div class="stat-content">
                        <div class="stat-value">${servicos.length}</div>
                        <div class="stat-label">Serviços</div>
                        <div class="stat-sub">
                            ${servicos.filter(s => s.ativo).length} ativos
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cards Extras - Linha 3 -->
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoBruto)}</div>
                        <div class="stat-label">Faturamento Bruto</div>
                        <div class="stat-sub">Total de serviços concluídos</div>
                    </div>
                </div>
                
                <div class="stat-card premium">
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
                    <div class="card-header">
                        <h3><i class="fas fa-chart-line"></i> Agendamentos por Dia</h3>
                    </div>
                    <canvas id="chartAgendamentos" style="max-height: 280px; width: 100%"></canvas>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-trophy"></i> Serviços Mais Populares</h3>
                    </div>
                    ${topServicos.length > 0 ? `
                        <div class="top-servicos-list">
                            ${topServicos.map(([nome, qtd], idx) => `
                                <div class="servico-rank-item">
                                    <div class="rank-number ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}">
                                        ${idx + 1}º
                                    </div>
                                    <div class="servico-rank-info">
                                        <div class="servico-rank-nome">${escapeHtml(nome)}</div>
                                        <div class="servico-rank-stats">
                                            <span class="qtd">${qtd} atendimento${qtd !== 1 ? 's' : ''}</span>
                                            <span class="percent">${((qtd / (totalServicosConcluidos || 1)) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div class="rank-bar">
                                        <div class="fill" style="width: ${(qtd / (topServicos[0]?.[1] || 1)) * 100}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-cut"></i>
                            <h4>Nenhum serviço concluído</h4>
                            <p>Os serviços aparecerão aqui quando forem concluídos</p>
                        </div>
                    `}
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
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${proximosAgendamentos.map(ag => `
                                    <tr>
                                        <td><strong>${escapeHtml(ag.cliente_nome || 'Cliente')}</strong></td>
                                        <td>${escapeHtml(ag.servico || '-')}</td>
                                        <td>${formatarDataBr(ag.data)}</td>
                                        <td><span class="hora-badge">${ag.hora || '-'}</span></td>
                                        <td>${escapeHtml(ag.profissional_nome || '-')}</td>
                                        <td><strong>R$ ${formatarMoeda(ag.valor)}</strong></td>
                                        <td>
                                            <span class="status-badge ${ag.status}">
                                                <span class="dot"></span>
                                                ${ag.status === 'agendado' ? 'Agendado' :
                    ag.status === 'pendente' ? 'Pendente' :
                        ag.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <h4>Nenhum agendamento pendente</h4>
                        <p>Que tal criar um novo agendamento?</p>
                        <button class="btn btn-primary btn-sm" onclick="abrirModalAgendamento()">
                            <i class="fas fa-plus"></i> Novo Agendamento
                        </button>
                    </div>
                `}
            </div>
            
            <!-- Últimos Clientes -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-users"></i> Últimos Clientes</h3>
                    <button class="btn btn-sm btn-secondary" onclick="carregarClientes()">
                        Ver Todos <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                ${clientes.length > 0 ? `
                    <div class="ultimos-clientes-grid">
                        ${clientes.slice(0, 6).map(cliente => `
                            <div class="cliente-card-item" onclick="editarCliente(${cliente.id})">
                                <div class="cliente-avatar-icon">
                                    ${cliente.nome ? cliente.nome.charAt(0).toUpperCase() : '👤'}
                                </div>
                                <div class="cliente-info-data">
                                    <div class="cliente-nome-completo">${escapeHtml(cliente.nome)}</div>
                                    <div class="cliente-contato-info">
                                        ${escapeHtml(cliente.telefone || cliente.email || 'Sem contato')}
                                    </div>
                                </div>
                                ${cliente.bloqueado_chatbot === 1 ?
                                '<span class="badge badge-danger">🔒</span>' :
                                '<span class="badge badge-success">✅</span>'
                            }
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-user-plus"></i>
                        <h4>Nenhum cliente cadastrado</h4>
                        <p>Comece adicionando seus primeiros clientes</p>
                        <button class="btn btn-primary btn-sm" onclick="abrirModalCliente()">
                            <i class="fas fa-plus"></i> Novo Cliente
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;

    setTimeout(() => {
        renderizarGraficoAgendamentos(diasSemana, agendamentosPorDia);
    }, 100);
}

// ============================================
// DASHBOARD SUPER ADMIN
// ============================================
async function carregarDashboardSuperAdmin() {
    const token = localStorage.getItem('token');

    try {
        const [statsRes, empresasRes] = await Promise.all([
            fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/empresas', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const stats = (await statsRes.json()).data || {};
        const empresas = (await empresasRes.json()).data || [];

        const empresasTrial = empresas.filter(e => e.plano === 'trial').length;
        const empresasPagas = empresas.filter(e => e.plano !== 'trial' && e.plano !== null).length;

        const html = `
            <div class="fade-in">
                <div class="dashboard-header">
                    <h2 class="page-title">🏢 Dashboard Super Admin</h2>
                    <div class="date-range">
                        <span class="badge badge-info">
                            <i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                </div>
                
                <div class="card-grid">
                    <div class="stat-card premium">
                        <div class="stat-icon">🏢</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.empresas || 0}</div>
                            <div class="stat-label">Total de Empresas</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon purple">👨‍💼</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.donos || 0}</div>
                            <div class="stat-label">Donos</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon blue">👥</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.clientes || 0}</div>
                            <div class="stat-label">Total Clientes</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">✂️</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.agendamentos || 0}</div>
                            <div class="stat-label">Agendamentos</div>
                        </div>
                    </div>
                </div>
                
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
                                    <span>Planos Pagos</span>
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
                                <div class="empresa-trial-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e5e7eb;">
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
                '<p class="text-muted" style="padding: 20px; text-align: center;">Nenhuma empresa em trial</p>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar dashboard super admin:', error);
        document.getElementById('content').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dashboard Super Admin</p>
                <button onclick="carregarDashboard()" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
    }
}

// ============================================
// DASHBOARD PROFISSIONAL
// ============================================
async function carregarDashboardProfissional() {
    const token = localStorage.getItem('token');

    try {
        const [agendamentosRes, financeiroRes] = await Promise.all([
            fetch('/api/profissional/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissional/financeiro', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const agendamentos = (await agendamentosRes.json()).data || [];
        const financeiro = (await financeiroRes.json()).data || {};

        const pendentes = agendamentos.filter(a => a.status === 'pendente');
        const concluidos = agendamentos.filter(a => a.status === 'concluido');
        const totalComissoes = financeiro.total_comissoes || 0;

        const html = `
            <div class="fade-in">
                <div class="dashboard-header">
                    <h2 class="page-title">📊 Meu Dashboard</h2>
                    <div class="date-range">
                        <span class="badge badge-info">
                            <i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                </div>
                
                <div class="card-grid">
                    <div class="stat-card premium">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value">R$ ${formatarMoeda(totalComissoes)}</div>
                            <div class="stat-label">Total em Comissões</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon purple">✂️</div>
                        <div class="stat-content">
                            <div class="stat-value">${agendamentos.length}</div>
                            <div class="stat-label">Total Atendimentos</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon orange">⏳</div>
                        <div class="stat-content">
                            <div class="stat-value">${pendentes.length}</div>
                            <div class="stat-label">Pendentes</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">✅</div>
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
    } catch (error) {
        console.error('Erro ao carregar dashboard profissional:', error);
        document.getElementById('content').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dashboard do profissional</p>
                <button onclick="carregarDashboard()" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function renderizarGraficoAgendamentos(dias, dados) {
    const canvas = document.getElementById('chartAgendamentos');
    if (!canvas) return;

    if (typeof Chart !== 'undefined') {
        if (chartInstance) chartInstance.destroy();

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');

        chartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Agendamentos',
                    data: dados,
                    backgroundColor: gradient,
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(139, 92, 246, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: (ctx) => `${ctx.raw} agendamentos` },
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false } }
                },
                animation: { duration: 800, easing: 'easeInOutQuart' }
            }
        });
    }
}

function formatarMoeda(valor) {
    if (!valor) return '0,00';
    return parseFloat(valor).toFixed(2).replace('.', ',');
}

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

// Atualizar dashboard (recarregar)
window.atualizarDashboard = function () {
    showToast('🔄 Atualizando dados...', 'info');
    carregarDashboard();
};

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

// ============================================
// AÇÕES RÁPIDAS - USANDO A FUNÇÃO DO AGENDAMENTOS.JS
// ============================================

// Ação: Novo Agendamento - chama diretamente a função do agendamentos.js
function abrirModalAgendamento() {
    console.log('🔄 Abrindo modal de agendamento via ação rápida...');

    // Verificar se as listas estão carregadas
    if (typeof clientesList === 'undefined' || clientesList.length === 0) {
        // Carregar dados antes de abrir o modal
        carregarDadosAgendamento().then(() => {
            if (typeof abrirModalAgendamentoDono === 'function') {
                abrirModalAgendamentoDono();
            } else {
                showToast('Função de agendamento não disponível', 'warning');
            }
        });
    } else {
        if (typeof abrirModalAgendamentoDono === 'function') {
            abrirModalAgendamentoDono();
        } else {
            showToast('Função de agendamento não disponível', 'warning');
        }
    }
}

// Função auxiliar para carregar dados
async function carregarDadosAgendamento() {
    const token = localStorage.getItem('token');
    try {
        const [clientesRes, servicosRes, profissionaisRes] = await Promise.all([
            fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/servicos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const clientesData = await clientesRes.json();
        const servicosData = await servicosRes.json();
        const profissionaisData = await profissionaisRes.json();

        if (clientesData.success) clientesList = clientesData.data || [];
        if (servicosData.success) servicosList = servicosData.data || [];
        if (profissionaisData.success) profissionaisList = profissionaisData.data || [];

        console.log('✅ Dados carregados para ação rápida:', {
            clientes: clientesList.length,
            servicos: servicosList.length,
            profissionais: profissionaisList.length
        });
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
}

// Ação: Novo Cliente - usa o mesmo modal de clientes
function abrirModalCliente() {
    console.log('🔄 Abrindo modal de cliente via ação rápida...');

    // Verificar se a função existe no clientes.js
    if (typeof window.abrirModalCliente === 'function' && window.abrirModalCliente !== abrirModalCliente) {
        window.abrirModalCliente();
        return;
    }

    // Fallback: tentar usar a função do clientes.js
    if (typeof abrirModalCliente === 'function') {
        abrirModalCliente();
        return;
    }

    // Fallback 2: carregar a página de clientes e abrir o modal
    showToast('Carregando clientes...', 'info');
    if (typeof carregarClientes === 'function') {
        carregarClientes();
        setTimeout(() => {
            if (typeof abrirModalCliente === 'function') {
                abrirModalCliente();
            }
        }, 500);
    } else {
        showToast('Função não disponível', 'warning');
    }
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.carregarDashboard = carregarDashboard;
window.carregarDashboardSuperAdmin = carregarDashboardSuperAdmin;
window.carregarDashboardProfissional = carregarDashboardProfissional;
window.atualizarDashboard = window.atualizarDashboard;
window.abrirModalAgendamento = abrirModalAgendamento;
window.abrirModalCliente = abrirModalCliente;
window.estenderTrial = window.estenderTrial;

console.log('✅ dashboard.js carregado com ações rápidas corrigidas!');