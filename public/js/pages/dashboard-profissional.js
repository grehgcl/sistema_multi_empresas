// ============================================
// DASHBOARD DO PROFISSIONAL - COM AGENDA VISUAL
// ============================================

async function carregarDashboardProfissional() {
    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('dashboard');
    }
    ativarBotao('dashboard');
    showLoading();

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    // 🔥 Marca que estamos no contexto do profissional
    window.__MODO_PROFISSIONAL__ = true;
    window.__PROFISSIONAL_ID__ = usuario.id;

    // Cards + agenda
    let html = `<div class="fade-in dash-wrapper">`;

    // HEADER BEM-VINDO
    const agora = new Date();
    html += `
        <div class="dash-welcome">
            <div class="dash-welcome-left">
                <div class="greeting-text">
                    👋 Olá, <strong>${escapeHtml(usuario.nome || 'Profissional')}</strong>
                </div>
                <div class="date-text">
                    📅 ${agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>
            <div class="revenue-box">
                <div class="revenue-value" id="minhaComissaoHoje">R$ 0,00</div>
                <div class="revenue-label">
                    <i class="fas fa-coins"></i> Comissão de hoje
                </div>
            </div>
        </div>
    `;

    // CARDS DE RESUMO
    html += `
        <div class="dash-cards-grid">
            <div class="dash-card-green">
                <div class="card-number" id="totalMeusAtendimentos">0</div>
                <div class="card-label">✂️ Meus Atendimentos</div>
            </div>
            <div class="dash-card-purple">
                <div class="card-number" id="minhaComissaoTotal">R$ 0,00</div>
                <div class="card-label">💰 Comissão Total</div>
            </div>
            <div class="dash-card-yellow">
                <div class="card-number" id="meusPendentes">0</div>
                <div class="card-label">⏳ Pendentes</div>
            </div>
        </div>
    `;

    // AGENDA VISUAL (reaproveitada do dashboard.js)
    html += `
        <div class="agenda-section">
            <div class="agenda-header">
                <h3 class="agenda-title">
                    <i class="fas fa-calendar-alt"></i> Minha Agenda
                </h3>
                <button class="btn-ver-todos" onclick="carregarAgendamentosProfissional()">
                    Ver todos →
                </button>
            </div>
            <div id="agendaInteligenteContainer" class="agenda-container">
                <div class="agenda-loading">
                    <div class="loading-spinner"></div>
                    <p>Carregando agenda...</p>
                </div>
            </div>
        </div>
    `;

    // ÚLTIMAS COMISSÕES
    html += `
        <div class="card" style="margin-top:16px;">
            <h3 style="margin-bottom:12px;font-size:16px;">📋 Últimas Comissões</h3>
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
                    <tbody id="ultimasComissoes">
                        <tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    html += `</div>`;
    document.getElementById('content').innerHTML = html;

    // 🔥 Carrega agenda inteligente (reaproveitada do dashboard.js)
    setTimeout(() => {
        if (typeof window.carregarAgendaInteligente === 'function') {
            window.carregarAgendaInteligente();
        }
    }, 150);

    // 🔥 Carrega dados financeiros
    try {
        const [resFinanceiro, resAgendamentos] = await Promise.all([
            fetch('/api/profissionais/profissional/financeiro', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch('/api/profissionais/profissional/agendamentos', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
        ]);

        const financeiro = await resFinanceiro.json();
        const agendamentos = await resAgendamentos.json();

        if (financeiro.success) {
            const totais = financeiro.data.totais || {};
            const comissoes = financeiro.data.comissoes || [];

            const comissaoTotal = parseFloat(totais.total_comissoes) || 0;
            document.getElementById('minhaComissaoTotal').textContent = `R$ ${comissaoTotal.toFixed(2)}`;
            document.getElementById('totalMeusAtendimentos').textContent = totais.total_servicos || 0;

            // Comissão do dia
            const hoje = new Date();
            const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
            const comissaoHoje = comissoes
                .filter(c => c.data && c.data.startsWith(hojeStr))
                .reduce((s, c) => s + (parseFloat(c.comissao) || 0), 0);
            document.getElementById('minhaComissaoHoje').textContent = `R$ ${comissaoHoje.toFixed(2)}`;

            // Últimas 5 comissões
            const tbody = document.getElementById('ultimasComissoes');
            if (comissoes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">Nenhuma comissão registrada ainda</td></tr>';
            } else {
                tbody.innerHTML = comissoes.slice(0, 5).map(c => {
                    const servicoNome = c.servico_nome || c.servico || 'N/A';
                    const clienteNome = c.cliente_nome || c.nome_cliente || 'N/A';
                    const dataFormatada = c.data
                        ? new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '-';
                    return `
                        <tr>
                            <td>${dataFormatada}</td>
                            <td><strong>${escapeHtml(clienteNome)}</strong></td>
                            <td>${escapeHtml(servicoNome)}</td>
                            <td>R$ ${(parseFloat(c.valor) || 0).toFixed(2)}</td>
                            <td><strong class="text-success">R$ ${(parseFloat(c.comissao) || 0).toFixed(2)}</strong></td>
                        </tr>
                    `;
                }).join('');
            }
        }

        if (agendamentos.success) {
            const pendentes = (agendamentos.data || []).filter(a => a.status === 'pendente').length;
            document.getElementById('meusPendentes').textContent = pendentes;
        }

    } catch (error) {
        console.error('❌ Erro ao carregar dashboard profissional:', error);
        showToast('Erro ao carregar alguns dados do dashboard', 'error');
    }

    hideLoading();
}

// ============================================
// ATALHO PRO BOTÃO "VER TODOS"
// ============================================

function carregarAgendamentosProfissional() {
    if (typeof window.carregarAgendamentosProf === 'function') {
        window.carregarAgendamentosProf();
    } else if (typeof executarAcao === 'function') {
        executarAcao('agendamentos');
    }
}

window.carregarDashboardProfissional = carregarDashboardProfissional;
window.carregarAgendamentosProfissional = carregarAgendamentosProfissional;

console.log('✅ dashboard-profissional.js carregado (com agenda visual)');