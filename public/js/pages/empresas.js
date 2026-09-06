// ============================================
// SUPER ADMIN - GESTÃO COMPLETA DE EMPRESAS
// VERSÃO COM CSS INTEGRADO E RESPONSIVO
// ============================================
// ============================================
// VARIÁVEIS GLOBAIS - EMPRESAS.JS
// ============================================

let empresasData = [];
let usuariosData = [];
let empresasTimeout = null;


// ============================================
// FORÇAR CARREGAMENTO DO CSS DO SUPER ADMIN
// ============================================
(function carregarCSSSuperAdmin() {
    // Verifica se já foi carregado
    if (document.querySelector('link[href*="empresas.css"]')) {
        console.log('✅ CSS Super Admin já carregado');
        return;
    }
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/pages/empresas.css?v=' + Date.now();
    document.head.appendChild(link);
    console.log('✅ CSS Super Admin carregado via JS!');
})();
// ============================================
// 🏢 SUPER ADMIN - DASHBOARD
// ============================================
async function carregarDashboardSuperAdmin() {
    if (typeof ativarBotao === 'function') ativarBotao('dashboard');
    if (typeof showLoading === 'function') showLoading();
    const token = localStorage.getItem('token');

    try {
        const [statsRes, empresasRes, usuariosRes, paymentRes] = await Promise.all([
            fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/empresas', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/usuarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/pagamento/config', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const stats = (await statsRes.json()).data || {};
        const empresas = (await empresasRes.json()).data || [];
        const usuarios = (await usuariosRes.json()).data || [];

        let paymentData = { mode: 'simulation', label: '🟡 Simulação' };
        try {
            if (paymentRes.ok) {
                const paymentJson = await paymentRes.json();
                if (paymentJson.success) {
                    paymentData = paymentJson.data;
                }
            }
        } catch (paymentError) {
            console.warn('⚠️ Erro ao buscar modo de pagamento:', paymentError.message);
        }

        console.log('✅ Empresas carregadas:', empresas.length);

        const totalEmpresas = empresas.length;
        const empresasAtivas = empresas.filter(e => e.assinatura_ativa === 1 || e.assinatura_ativa === true).length;
        const empresasTrial = empresas.filter(e => e.plano === 'trial' || e.plano === 'Trial').length;
        const empresasExpiradas = empresas.filter(e => {
            if (!e.trial_expira) return false;
            const hoje = new Date();
            const expira = new Date(e.trial_expira);
            return expira < hoje && (e.plano === 'trial' || e.plano === 'Trial');
        });

        const totalDonos = usuarios.filter(u => u.role === 'dono').length;
        const totalProfissionais = usuarios.filter(u => u.role === 'profissional').length;
        const totalClientes = stats.total_clientes || 0;
        const totalAgendamentos = stats.total_agendamentos || 0;
        const agendamentosMes = stats.agendamentos_mes || 0;
        const faturamentoMes = stats.faturamento_mes || 0;

        const isReal = paymentData.mode === 'real';
        const isMobile = window.innerWidth < 768;

        // ============================================
        // HTML PRINCIPAL COM CLASSES CSS
        // ============================================
        const html = `
            <div class="sa-container">

                <!-- CABEÇALHO -->
                <div class="sa-header">
                    <div class="sa-header-content">
                        <div>
                            <div class="sa-header-title">
                                <span class="sa-header-icon">👑</span>
                                <h1 class="sa-header-h1">Super Admin</h1>
                            </div>
                            <p class="sa-header-date">
                                <i class="fas fa-calendar-alt" style="color:#667eea;"></i> 
                                ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <button onclick="carregarDashboardSuperAdmin()" class="sa-btn-refresh">
                            <i class="fas fa-sync-alt"></i> ${isMobile ? 'Atualizar' : 'Atualizar Dados'}
                        </button>
                    </div>
                </div>

                <!-- MODO DE PAGAMENTO -->
                <div class="sa-payment ${isReal ? 'real' : 'simulation'}">
                    <div class="sa-payment-left">
                        <span class="sa-payment-icon">${isReal ? '🔴' : '🟡'}</span>
                        <div>
                            <div class="sa-payment-label">
                                💳 <span class="${isReal ? 'real-text' : 'simulation-text'}">${paymentData.label}</span>
                            </div>
                            <div class="sa-payment-sub">
                                ${isReal ? '⚠️ Pagamentos REAIS estão ativos!' : '🔸 Modo SIMULAÇÃO - Nenhuma cobrança real'}
                            </div>
                        </div>
                    </div>
                    <button onclick="alternarModoPagamento()" class="sa-payment-btn ${isReal ? 'real' : 'simulation'}">
                        <i class="fas fa-${isReal ? 'toggle-on' : 'toggle-off'}"></i>
                        ${isReal ? 'Desativar Pagamentos Reais' : 'Ativar Pagamentos Reais'}
                    </button>
                </div>

                <!-- CARDS DE MÉTRICAS -->
                <div class="sa-metrics">
                    ${[
                        { icon: '🏢', label: 'Empresas', value: totalEmpresas, color: '#667eea' },
                        { icon: '👥', label: 'Usuários', value: usuarios.length, color: '#8b5cf6' },
                        { icon: '👤', label: 'Clientes', value: totalClientes, color: '#22c55e' },
                        { icon: '✂️', label: 'Agendamentos', value: totalAgendamentos, color: '#f59e0b' },
                        { icon: '💰', label: 'Faturamento', value: `R$ ${formatarMoeda(faturamentoMes)}`, color: '#ec4899' }
                    ].map(metric => `
                        <div class="sa-metric-card" style="--metric-color: ${metric.color}">
                            <div class="sa-metric-icon">${metric.icon}</div>
                            <div class="sa-metric-value">${metric.value}</div>
                            <div class="sa-metric-label">${metric.label}</div>
                            <div class="sa-metric-bar" style="background:linear-gradient(90deg,${metric.color},transparent);"></div>
                        </div>
                    `).join('')}
                </div>

                <!-- FILTRO E BUSCA -->
                <div class="sa-filters">
                    <div class="sa-search">
                        <i class="fas fa-search sa-search-icon"></i>
                        <input type="text" id="buscarEmpresa" class="sa-search-input" placeholder="Buscar empresa..." oninput="filtrarEmpresas()">
                    </div>
                    <select id="filtroStatus" class="sa-filter-select" onchange="filtrarEmpresas()">
                        <option value="">📋 Todos</option>
                        <option value="ativo">🟢 Ativos</option>
                        <option value="trial">🟡 Trial</option>
                        <option value="expirado">🔴 Expirados</option>
                        <option value="inativo">⚪ Inativos</option>
                    </select>
                    <select id="filtroPlano" class="sa-filter-select" onchange="filtrarEmpresas()">
                        <option value="">📦 Todos Planos</option>
                        <option value="trial">🔄 Trial</option>
                        <option value="starter">🚀 Starter</option>
                        <option value="pro">💎 Pro</option>
                        <option value="business">🏢 Business</option>
                        <option value="enterprise">🌐 Enterprise</option>
                    </select>
                </div>

                <!-- LISTA DE EMPRESAS -->
                <div class="sa-empresas-list">
                    <div class="sa-empresas-header">
                        <div class="sa-empresas-title">
                            <span class="sa-empresas-icon">📋</span>
                            <h3 class="sa-empresas-h3">
                                Empresas <span class="sa-empresas-count">(${totalEmpresas})</span>
                            </h3>
                        </div>
                        <div class="sa-empresas-badges">
                            <span class="sa-badge sa-badge-ativo">🟢 ${empresasAtivas}</span>
                            <span class="sa-badge sa-badge-trial">🟡 ${empresasTrial}</span>
                            ${empresasExpiradas.length > 0 ? `<span class="sa-badge sa-badge-expirado">🔴 ${empresasExpiradas.length}</span>` : ''}
                        </div>
                    </div>

                    <div id="listaEmpresas" class="sa-empresas-grid">
                        ${empresas.length === 0 ? `
                            <div class="sa-empty">
                                <i class="fas fa-building sa-empty-icon"></i>
                                Nenhuma empresa cadastrada
                            </div>
                        ` : empresas.map((e) => {
                            const isTrial = e.plano === 'trial' || e.plano === 'Trial';
                            const isAtivo = e.assinatura_ativa === 1 || e.assinatura_ativa === true;

                            let diasRestantes = 0;
                            if (isTrial && e.trial_expira) {
                                const hoje = new Date();
                                const expira = new Date(e.trial_expira);
                                diasRestantes = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
                                if (diasRestantes < 0) diasRestantes = 0;
                            } else if (!isTrial && e.assinatura_valida_ate) {
                                const hoje = new Date();
                                const validaAte = new Date(e.assinatura_valida_ate);
                                diasRestantes = Math.ceil((validaAte - hoje) / (1000 * 60 * 60 * 24));
                                if (diasRestantes < 0) diasRestantes = 0;
                            }

                            let diasColor = 'verde';
                            let diasTexto = '♾️';
                            if (isTrial) {
                                if (diasRestantes <= 0) { diasColor = 'vermelho'; diasTexto = '0d'; }
                                else if (diasRestantes <= 3) { diasColor = 'vermelho'; diasTexto = diasRestantes + 'd ⚠️'; }
                                else if (diasRestantes <= 7) { diasColor = 'amarelo'; diasTexto = diasRestantes + 'd'; }
                                else { diasColor = 'verde'; diasTexto = diasRestantes + 'd'; }
                            }

                            let statusClass = 'ativo';
                            let statusText = '✅ Ativo';
                            if (isTrial) {
                                if (diasRestantes <= 0) {
                                    statusClass = 'expirado';
                                    statusText = '⛔ Expirado';
                                } else {
                                    statusClass = 'trial';
                                    statusText = '🔄 Trial';
                                }
                            } else if (!isAtivo) {
                                statusClass = 'inativo';
                                statusText = '⛔ Inativo';
                            }

                            let planoClass = 'trial';
                            let planoText = 'Trial';
                            if (e.plano === 'Starter' || e.plano === 'starter') { planoClass = 'starter'; planoText = 'Starter'; }
                            else if (e.plano === 'Pro' || e.plano === 'pro') { planoClass = 'pro'; planoText = 'Pro'; }
                            else if (e.plano === 'Business' || e.plano === 'business') { planoClass = 'business'; planoText = 'Business'; }
                            else if (e.plano === 'Enterprise' || e.plano === 'enterprise') { planoClass = 'enterprise'; planoText = 'Enterprise'; }

                            const donos = usuarios.filter(u => u.empresa_id === e.id && u.role === 'dono').length;
                            const profissionais = usuarios.filter(u => u.empresa_id === e.id && u.role === 'profissional').length;
                            const clientes = e.total_clientes || 0;
                            const agendamentos = e.total_agendamentos || 0;

                            const whatsappHabilitado = e.whatsapp_proprio_habilitado === true || e.whatsapp_proprio_habilitado === 1;
                            const whatsappConectado = e.whatsapp_connected === true || e.whatsapp_connected === 1;

                            let whatsappClass = 'off';
                            let whatsappText = '🔴 OFF';
                            if (whatsappHabilitado && whatsappConectado) { whatsappClass = 'on'; whatsappText = '🟢 ON'; }
                            else if (whatsappHabilitado) { whatsappClass = 'pend'; whatsappText = '🟡 PEND'; }

                            return `
                                <div class="sa-empresa-card" data-id="${e.id}" data-nome="${(e.nome || '').toLowerCase()}" data-status="${isTrial ? 'trial' : isAtivo ? 'ativo' : 'inativo'}" data-plano="${planoClass}">
                                    <div class="sa-card-header">
                                        <span class="sa-card-nome">${escapeHtml(e.nome)}</span>
                                        <span class="sa-card-status ${statusClass}">${statusText}</span>
                                    </div>
                                    <div class="sa-card-info">
                                        <span class="sa-card-plano ${planoClass}">${planoText}</span>
                                        <span class="sa-card-whatsapp ${whatsappClass}">${whatsappText}</span>
                                        <span class="sa-card-dias ${diasColor}">${diasTexto}</span>
                                    </div>
                                    <div class="sa-card-stats">
                                        <div class="sa-stat">
                                            <span class="sa-stat-icon">👑</span>
                                            <span class="sa-stat-value">${donos}</span>
                                            <span class="sa-stat-label">donos</span>
                                        </div>
                                        <div class="sa-stat">
                                            <span class="sa-stat-icon">👤</span>
                                            <span class="sa-stat-value">${profissionais}</span>
                                            <span class="sa-stat-label">profs</span>
                                        </div>
                                        <div class="sa-stat">
                                            <span class="sa-stat-icon">👥</span>
                                            <span class="sa-stat-value">${clientes}</span>
                                            <span class="sa-stat-label">clientes</span>
                                        </div>
                                        <div class="sa-stat">
                                            <span class="sa-stat-icon">✂️</span>
                                            <span class="sa-stat-value">${agendamentos}</span>
                                            <span class="sa-stat-label">agend.</span>
                                        </div>
                                    </div>
                                    <div class="sa-card-actions">
                                        <button onclick="event.stopPropagation();verEmpresa(${e.id})" class="sa-btn sa-btn-ver">
                                            <i class="fas fa-eye"></i>
                                            <span class="sa-btn-text">Ver</span>
                                        </button>
                                        <button onclick="event.stopPropagation();editarEmpresa(${e.id})" class="sa-btn sa-btn-editar">
                                            <i class="fas fa-edit"></i>
                                            <span class="sa-btn-text">Editar</span>
                                        </button>
                                        ${isTrial ? `
                                            <button onclick="event.stopPropagation();estenderTrial(${e.id})" class="sa-btn sa-btn-extender">
                                                <i class="fas fa-clock"></i>
                                                <span class="sa-btn-text">+30d</span>
                                            </button>
                                        ` : ''}
                                        <button onclick="event.stopPropagation();toggleWhatsAppProprio(${e.id}, ${!whatsappHabilitado})" class="sa-btn ${whatsappHabilitado ? 'sa-btn-whatsapp-on' : 'sa-btn-whatsapp-off'}">
                                            <i class="fas fa-${whatsappHabilitado ? 'toggle-on' : 'toggle-off'}"></i>
                                            <span class="sa-btn-text">${whatsappHabilitado ? 'Desativar' : 'Ativar'}</span>
                                        </button>
                                        <button onclick="event.stopPropagation();deletarEmpresa(${e.id}, '${escapeHtml(e.nome)}')" class="sa-btn sa-btn-deletar">
                                            <i class="fas fa-trash"></i>
                                            <span class="sa-btn-text">Deletar</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- ÚLTIMOS USUÁRIOS -->
                <div class="sa-usuarios">
                    <div class="sa-usuarios-header">
                        <div class="sa-usuarios-title">
                            <span class="sa-usuarios-icon">👥</span>
                            <h3 class="sa-usuarios-h3">Últimos Usuários</h3>
                        </div>
                        <span class="sa-usuarios-total">Total: ${usuarios.length}</span>
                    </div>
                    <div class="sa-usuarios-table-wrapper">
                        <table class="sa-usuarios-table">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th class="sa-text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuarios.slice(0, 8).map(u => {
                                    let roleClass = 'dono';
                                    let roleLabel = '🟠 Dono';
                                    if (u.role === 'superadmin') { roleClass = 'super'; roleLabel = '🔴 Super'; }
                                    else if (u.role === 'profissional') { roleClass = 'prof'; roleLabel = '🔵 Prof'; }

                                    return `
                                        <tr>
                                            <td class="sa-usuario-nome">${escapeHtml(u.nome)}</td>
                                            <td class="sa-usuario-email">${escapeHtml(u.email)}</td>
                                            <td><span class="sa-role-badge ${roleClass}">${roleLabel}</span></td>
                                            <td class="sa-text-center">
                                                <button onclick="editarUsuario(${u.id})" class="sa-btn-edit-user">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
        if (typeof hideLoading === 'function') hideLoading();

        // Animar cards
        setTimeout(() => {
            document.querySelectorAll('.sa-empresa-card').forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.4s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 50 * index);
            });
        }, 100);

    } catch (error) {
        console.error('❌ Erro:', error);
        if (typeof hideLoading === 'function') hideLoading();
        document.getElementById('content').innerHTML = `
            <div class="sa-error">
                <i class="fas fa-exclamation-triangle sa-error-icon"></i>
                <p class="sa-error-title">Erro ao carregar dashboard</p>
                <p class="sa-error-msg">${error.message}</p>
                <button onclick="carregarDashboardSuperAdmin()" class="sa-error-btn">
                    <i class="fas fa-sync"></i> Tentar Novamente
                </button>
            </div>
        `;
    }
}

// ============================================
// ALTERNAR MODO DE PAGAMENTO
// ============================================
async function alternarModoPagamento() {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/pagamento/config', {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.success) {
            const modoAtual = data.data.mode;
            const novoModo = modoAtual === 'real' ? 'simulation' : 'real';

            const updateRes = await fetch('/api/pagamento/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ mode: novoModo })
            });

            const updateData = await updateRes.json();

            if (updateData.success) {
                if (typeof showToast === 'function') {
                    showToast(`💳 Modo alterado para: ${updateData.data.isReal ? '🔴 REAL' : '🟡 SIMULAÇÃO'}`, 'success');
                }
                setTimeout(() => carregarDashboardSuperAdmin(), 500);
            } else {
                if (typeof showToast === 'function') {
                    showToast(updateData.message || '❌ Erro ao alterar modo', 'error');
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao alternar modo de pagamento:', error);
        if (typeof showToast === 'function') {
            showToast('❌ Erro ao alternar modo de pagamento', 'error');
        }
    }
}

// ============================================
// TOGGLE WHATSAPP PRÓPRIO
// ============================================
async function toggleWhatsAppProprio(empresaId, habilitar) {
    const acao = habilitar ? 'HABILITAR' : 'DESABILITAR';
    const emoji = habilitar ? '🟢' : '🔴';

    if (!confirm(`${emoji} Deseja realmente ${acao.toLowerCase()} o WhatsApp próprio desta empresa?\n\n` +
        (habilitar ? '✅ A empresa poderá conectar seu próprio WhatsApp' : '⚠️ A empresa voltará a usar o WhatsApp compartilhado'))) {
        return;
    }

    if (typeof showLoading === 'function') showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${empresaId}/whatsapp-proprio`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ habilitado: habilitar })
        });

        const data = await res.json();
        if (typeof hideLoading === 'function') hideLoading();

        if (data.success) {
            if (typeof showToast === 'function') {
                showToast(data.message, 'success');
            }
            carregarDashboardSuperAdmin();
        } else {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Erro ao atualizar', 'error');
            }
        }
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('Erro:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao atualizar WhatsApp', 'error');
        }
    }
}

// ============================================
// FILTRAR EMPRESAS
// ============================================
function filtrarEmpresas() {
    const termo = document.getElementById('buscarEmpresa')?.value?.toLowerCase() || '';
    const filtroStatus = document.getElementById('filtroStatus')?.value || '';
    const filtroPlano = document.getElementById('filtroPlano')?.value || '';
    const cards = document.querySelectorAll('.sa-empresa-card');

    cards.forEach(card => {
        const nome = card.getAttribute('data-nome') || '';
        const status = card.getAttribute('data-status') || '';
        const plano = card.getAttribute('data-plano') || '';

        const matchNome = nome.includes(termo);
        const matchStatus = filtroStatus === '' || status === filtroStatus;
        const matchPlano = filtroPlano === '' || plano === filtroPlano;

        card.style.display = (matchNome && matchStatus && matchPlano) ? '' : 'none';
    });
}

// ============================================
// 👁️ VER EMPRESA - VERSÃO SEM REGISTRO DE ACESSO
// ============================================
async function verEmpresa(id) {
    console.log('👁️ Ver empresa ID:', id);
    
    const token = localStorage.getItem('token');
    const isMobile = window.innerWidth < 768;
    const isVeryMobile = window.innerWidth < 480;

    if (typeof showLoading === 'function') showLoading();

    try {
        const [empresaRes, usuariosRes, clientesRes, agendamentosRes, acessosRes] = await Promise.all([
            fetch(`/api/admin/empresas/${id}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/usuarios`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/clientes`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/agendamentos`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/acessos`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!empresaRes.ok) {
            if (typeof showToast === 'function') {
                showToast('Erro ao carregar dados da empresa', 'error');
            }
            if (typeof hideLoading === 'function') hideLoading();
            return;
        }

        const empresa = (await empresaRes.json()).data || {};
        const usuarios = (await usuariosRes.json()).data || [];
        const clientes = (await clientesRes.json()).data || [];
        const agendamentos = (await agendamentosRes.json()).data || [];
        const acessos = (await acessosRes.json()).data || [];

        console.log(`✅ Empresa: ${empresa.nome}`);
        console.log(`📊 Clientes: ${clientes.length}`);
        console.log(`📊 Agendamentos: ${agendamentos.length}`);

        const donos = usuarios.filter(u => u.tipo === 'dono' || u.role === 'dono');
        const profissionais = usuarios.filter(u => u.tipo === 'profissional' || u.role === 'profissional');

        // ===== STATUS =====
        const isTrial = empresa.plano === 'trial' || empresa.plano === 'Trial';
        const isAtivo = empresa.assinatura_ativa === 1 || empresa.assinatura_ativa === true;

        let diasRestantes = 0;
        if (isTrial && empresa.trial_expira) {
            const hoje = new Date();
            const expira = new Date(empresa.trial_expira);
            diasRestantes = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
            if (diasRestantes < 0) diasRestantes = 0;
        } else if (!isTrial && empresa.assinatura_valida_ate) {
            const hoje = new Date();
            const validaAte = new Date(empresa.assinatura_valida_ate);
            diasRestantes = Math.ceil((validaAte - hoje) / (1000 * 60 * 60 * 24));
            if (diasRestantes < 0) diasRestantes = 0;
        }

        let statusColor = '#22c55e';
        let statusText = '✅ Ativo';
        let statusBg = 'rgba(34,197,94,0.15)';
        if (isTrial) {
            if (diasRestantes <= 0) {
                statusColor = '#ef4444';
                statusText = '⛔ Expirado';
                statusBg = 'rgba(239,68,68,0.15)';
            } else if (diasRestantes <= 7) {
                statusColor = '#f59e0b';
                statusText = `⚠️ ${diasRestantes} dias`;
                statusBg = 'rgba(245,158,11,0.15)';
            } else {
                statusColor = '#22c55e';
                statusText = `✅ ${diasRestantes} dias`;
                statusBg = 'rgba(34,197,94,0.15)';
            }
        } else if (!isAtivo) {
            statusColor = '#ef4444';
            statusText = '⛔ Inativo';
            statusBg = 'rgba(239,68,68,0.15)';
        }

        // ===== MÉTRICAS =====
        const totalAcessos = acessos.length;

        // ACESSOS DE HOJE
        const acessosHoje = acessos.filter(a => {
            const hoje = new Date().toISOString().split('T')[0];
            const dataAcesso = a.data_acesso || a.data || a.created_at || a.data_hora || '';
            return dataAcesso && dataAcesso.startsWith(hoje);
        }).length;

        // ÚLTIMO ACESSO
        let ultimoAcesso = null;
        const acessosValidos = acessos.filter(a => 
            a.data_acesso && 
            a.data_acesso !== 'null' && 
            a.data_acesso !== null &&
            a.data_acesso !== 'undefined'
        );

        if (acessosValidos.length > 0) {
            const acessosOrdenados = [...acessosValidos].sort((a, b) => {
                const dataA = new Date(a.data_acesso);
                const dataB = new Date(b.data_acesso);
                if (isNaN(dataA)) return 1;
                if (isNaN(dataB)) return -1;
                return dataB - dataA;
            });
            ultimoAcesso = acessosOrdenados[0].data_acesso;
        }

        const ultimoAcessoFormatado = ultimoAcesso ? formatarDataHora(ultimoAcesso) : 'Nunca';

        const agendamentosPendentes = agendamentos.filter(a => a.status === 'pendente' || a.status === 'agendado').length;
        const agendamentosConcluidos = agendamentos.filter(a => a.status === 'concluido').length;
        const agendamentosCancelados = agendamentos.filter(a => a.status === 'cancelado').length;
        const faturamentoTotal = agendamentos
            .filter(a => a.status === 'concluido')
            .reduce((sum, a) => sum + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);

        const planoFormatado = isTrial ? 'Trial' : (empresa.plano || 'N/A');
        const planoEmoji = isTrial ? '🔄' : 
                           empresa.plano?.toLowerCase() === 'starter' ? '🚀' :
                           empresa.plano?.toLowerCase() === 'pro' ? '💎' :
                           empresa.plano?.toLowerCase() === 'business' ? '🏢' : '📦';

        // ===== TAMANHOS DAS FONTES =====
        const fontSize = {
            titulo: isVeryMobile ? '22px' : isMobile ? '26px' : '32px',
            subtitulo: isVeryMobile ? '17px' : isMobile ? '19px' : '22px',
            corpo: isVeryMobile ? '16px' : isMobile ? '18px' : '20px',
            pequeno: isVeryMobile ? '14px' : isMobile ? '15px' : '17px',
            muitoPequeno: isVeryMobile ? '12px' : isMobile ? '13px' : '15px',
            cardValor: isVeryMobile ? '20px' : isMobile ? '24px' : '28px',
            cardLabel: isVeryMobile ? '13px' : isMobile ? '14px' : '16px',
            tabela: isVeryMobile ? '14px' : isMobile ? '15px' : '17px',
            tabelaCabecalho: isVeryMobile ? '12px' : isMobile ? '13px' : '15px',
        };

        // ===== HTML =====
        const html = `
            <div style="padding: ${isVeryMobile ? '16px' : isMobile ? '20px' : '28px'}; max-width: 1200px; margin: 0 auto; font-family: 'Inter', -apple-system, sans-serif;">

                <!-- BOTÃO VOLTAR -->
                <button onclick="carregarDashboardSuperAdmin()" style="
                    background:transparent;
                    border:none;
                    padding: ${isVeryMobile ? '12px 20px' : isMobile ? '14px 24px' : '16px 28px'};
                    cursor:pointer;
                    color:#94a3b8;
                    font-size: ${fontSize.corpo};
                    display:flex;
                    align-items:center;
                    gap:10px;
                    transition:all 0.3s ease;
                    border-radius:10px;
                    margin-bottom: ${isVeryMobile ? '16px' : '20px'};
                    width: fit-content;
                " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    <i class="fas fa-arrow-left" style="font-size:${fontSize.corpo};"></i> Voltar
                </button>

                <!-- CABEÇALHO -->
                <div style="
                    display:flex;
                    flex-direction: ${isMobile ? 'column' : 'row'};
                    justify-content:space-between;
                    align-items: ${isMobile ? 'flex-start' : 'center'};
                    gap: ${isMobile ? '16px' : '24px'};
                    padding: ${isVeryMobile ? '20px 24px' : isMobile ? '24px 28px' : '32px 36px'};
                    background:linear-gradient(135deg,#0f0f1a,#1a1a3e);
                    border-radius: ${isMobile ? '16px' : '20px'};
                    border:1px solid rgba(102,126,234,0.08);
                    margin-bottom: ${isMobile ? '20px' : '28px'};
                ">
                    <div style="width:100%;">
                        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:${isVeryMobile ? '10px' : '14px'};">
                            <h2 style="
                                margin:0;
                                font-size: ${fontSize.titulo};
                                color:#fff;
                                font-weight:700;
                                word-break:break-word;
                            ">
                                🏢 ${escapeHtml(empresa.nome)}
                            </h2>
                            <span style="
                                background:${statusBg};
                                padding: ${isVeryMobile ? '6px 16px' : '8px 20px'};
                                border-radius:10px;
                                color:${statusColor};
                                font-size: ${fontSize.pequeno};
                                font-weight:600;
                                border:1px solid ${statusColor}44;
                                white-space:nowrap;
                            ">${statusText}</span>
                        </div>
                        <div style="
                            display:flex;
                            flex-wrap:wrap;
                            gap: ${isVeryMobile ? '10px' : isMobile ? '12px' : '18px'};
                            margin-top: ${isVeryMobile ? '8px' : '10px'};
                            font-size: ${fontSize.pequeno};
                            color:#94a3b8;
                        ">
                            <span><i class="fas fa-calendar"></i> ${formatarDataBr(empresa.created_at)}</span>
                            ${empresa.dono_nome ? `<span><i class="fas fa-crown" style="color:#f59e0b;"></i> ${escapeHtml(empresa.dono_nome)}</span>` : ''}
                            <span><i class="fas fa-tag"></i> ${planoEmoji} ${planoFormatado}</span>
                        </div>
                    </div>
                    <div style="
                        display:flex;
                        gap: ${isVeryMobile ? '10px' : '14px'};
                        flex-wrap:wrap;
                        width: ${isMobile ? '100%' : 'auto'};
                    ">
                        <button onclick="editarEmpresa(${empresa.id})" style="
                            background:rgba(245,158,11,0.15);
                            border:1px solid rgba(245,158,11,0.2);
                            padding: ${isVeryMobile ? '12px 24px' : isMobile ? '14px 28px' : '16px 32px'};
                            border-radius:10px;
                            color:#f59e0b;
                            font-size: ${fontSize.pequeno};
                            font-weight:600;
                            cursor:pointer;
                            transition:all 0.3s ease;
                            flex: ${isMobile ? '1' : '0'};
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            gap:8px;
                        " onmouseover="this.style.background='rgba(245,158,11,0.25)'" onmouseout="this.style.background='rgba(245,158,11,0.15)'">
                            <i class="fas fa-edit" style="font-size:${fontSize.pequeno};"></i> ${isVeryMobile ? '' : 'Editar'}
                        </button>
                        ${isTrial ? `
                            <button onclick="estenderTrial(${empresa.id})" style="
                                background:rgba(34,197,94,0.15);
                                border:1px solid rgba(34,197,94,0.2);
                                padding: ${isVeryMobile ? '12px 24px' : isMobile ? '14px 28px' : '16px 32px'};
                                border-radius:10px;
                                color:#22c55e;
                                font-size: ${fontSize.pequeno};
                                font-weight:600;
                                cursor:pointer;
                                transition:all 0.3s ease;
                                flex: ${isMobile ? '1' : '0'};
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                gap:8px;
                            " onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'">
                                <i class="fas fa-clock" style="font-size:${fontSize.pequeno};"></i> ${isVeryMobile ? '+30' : '+30 dias'}
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- CARDS DE MÉTRICAS -->
                <div style="
                    display:grid;
                    grid-template-columns: ${isVeryMobile ? 'repeat(2, 1fr)' : isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)'};
                    gap: ${isVeryMobile ? '10px' : isMobile ? '12px' : '16px'};
                    margin-bottom: ${isMobile ? '20px' : '28px'};
                ">
                    ${[
                        { icon: '📦', label: 'Plano', value: planoFormatado, color: '#667eea' },
                        { icon: '👥', label: 'Usuários', value: usuarios.length, sub: `${donos.length} donos`, color: '#8b5cf6' },
                        { icon: '📊', label: 'Acessos', value: totalAcessos, sub: `${acessosHoje} hoje`, color: '#06b6d4' },
                        { icon: '📅', label: 'Último acesso', value: ultimoAcessoFormatado, color: '#f59e0b' },
                        { icon: '✂️', label: 'Agendamentos', value: agendamentos.length, sub: `${agendamentosPendentes} pendentes`, color: '#ec4899' },
                        { icon: '💰', label: 'Faturamento', value: `R$ ${formatarMoeda(faturamentoTotal)}`, sub: `${agendamentosConcluidos} concluídos`, color: '#22c55e' }
                    ].map(metric => `
                        <div style="
                            background:linear-gradient(135deg,#14142a,#1a1a3a);
                            border-radius: ${isVeryMobile ? '12px' : isMobile ? '14px' : '16px'};
                            padding: ${isVeryMobile ? '16px 10px' : isMobile ? '18px 12px' : '24px 18px'};
                            border:1px solid rgba(255,255,255,0.04);
                            text-align:center;
                            transition:all 0.3s ease;
                            box-shadow:0 2px 8px rgba(0,0,0,0.06);
                        " onmouseover="this.style.borderColor='${metric.color}44';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.04)';this.style.transform='translateY(0)'">
                            <div style="font-size: ${isVeryMobile ? '32px' : isMobile ? '38px' : '44px'};">${metric.icon}</div>
                            <div style="
                                font-size: ${fontSize.cardLabel};
                                color:#94a3b8;
                                margin-top: ${isVeryMobile ? '6px' : '8px'};
                                font-weight:500;
                            ">${metric.label}</div>
                            <div style="
                                font-size: ${fontSize.cardValor};
                                font-weight:700;
                                color:#fff;
                                margin: ${isVeryMobile ? '6px 0' : '8px 0'};
                                word-break:break-word;
                            ">${metric.value}</div>
                            ${metric.sub ? `<div style="font-size:${fontSize.muitoPequeno};color:#64748b;">${metric.sub}</div>` : ''}
                            <div style="height:3px;background:linear-gradient(90deg,${metric.color},transparent);border-radius:4px;margin-top:${isVeryMobile ? '8px' : '10px'};"></div>
                        </div>
                    `).join('')}
                </div>

                <!-- DONOS -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius: ${isMobile ? '14px' : '18px'};
                    padding: ${isVeryMobile ? '18px 20px' : isMobile ? '22px 28px' : '28px 36px'};
                    border:1px solid rgba(255,255,255,0.04);
                    margin-bottom: ${isMobile ? '16px' : '22px'};
                ">
                    <h4 style="
                        margin:0 0 ${isVeryMobile ? '14px' : '18px'} 0;
                        font-size: ${fontSize.subtitulo};
                        color:#fff;
                        display:flex;
                        align-items:center;
                        gap:10px;
                    ">
                        <i class="fas fa-crown" style="color:#f59e0b;font-size:${fontSize.subtitulo};"></i> Donos (${donos.length})
                    </h4>
                    ${donos.length > 0 ? `
                        <div style="
                            display:grid;
                            grid-template-columns: ${isVeryMobile ? '1fr' : isMobile ? '1fr' : '1fr 1fr'};
                            gap: ${isVeryMobile ? '10px' : '14px'};
                        ">
                            ${donos.map(d => `
                                <div style="
                                    display:flex;
                                    flex-direction: ${isVeryMobile ? 'column' : 'row'};
                                    justify-content:space-between;
                                    align-items: ${isVeryMobile ? 'flex-start' : 'center'};
                                    padding: ${isVeryMobile ? '14px 18px' : '16px 22px'};
                                    background:rgba(255,255,255,0.02);
                                    border-radius:10px;
                                    border:1px solid rgba(255,255,255,0.03);
                                    gap: ${isVeryMobile ? '6px' : '0'};
                                ">
                                    <span style="color:#e2e8f0;font-weight:500;font-size: ${fontSize.corpo};">${escapeHtml(d.nome)}</span>
                                    <span style="color:#94a3b8;font-size: ${fontSize.pequeno};word-break:break-all;">${escapeHtml(d.email)}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:16px;">Nenhum dono cadastrado.</div>'}
                </div>

                <!-- PROFISSIONAIS -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius: ${isMobile ? '14px' : '18px'};
                    padding: ${isVeryMobile ? '18px 20px' : isMobile ? '22px 28px' : '28px 36px'};
                    border:1px solid rgba(255,255,255,0.04);
                    margin-bottom: ${isMobile ? '16px' : '22px'};
                ">
                    <h4 style="
                        margin:0 0 ${isVeryMobile ? '14px' : '18px'} 0;
                        font-size: ${fontSize.subtitulo};
                        color:#fff;
                        display:flex;
                        align-items:center;
                        gap:10px;
                    ">
                        <i class="fas fa-users" style="color:#818cf8;font-size:${fontSize.subtitulo};"></i> Profissionais (${profissionais.length})
                    </h4>
                    ${profissionais.length > 0 ? `
                        <div style="
                            display:grid;
                            grid-template-columns: ${isVeryMobile ? '1fr' : isMobile ? '1fr' : '1fr 1fr'};
                            gap: ${isVeryMobile ? '10px' : '14px'};
                        ">
                            ${profissionais.map(p => `
                                <div style="
                                    display:flex;
                                    flex-direction: ${isVeryMobile ? 'column' : 'row'};
                                    justify-content:space-between;
                                    align-items: ${isVeryMobile ? 'flex-start' : 'center'};
                                    padding: ${isVeryMobile ? '14px 18px' : '16px 22px'};
                                    background:rgba(255,255,255,0.02);
                                    border-radius:10px;
                                    border:1px solid rgba(255,255,255,0.03);
                                    gap: ${isVeryMobile ? '6px' : '0'};
                                ">
                                    <span style="color:#e2e8f0;font-weight:500;font-size: ${fontSize.corpo};">${escapeHtml(p.nome)}</span>
                                    <span style="
                                        background:rgba(16,185,129,0.12);
                                        padding: ${isVeryMobile ? '4px 14px' : '6px 18px'};
                                        border-radius:12px;
                                        color:#22c55e;
                                        font-weight:600;
                                        font-size: ${fontSize.pequeno};
                                    ">${p.comissao_percent || 0}%</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:16px;">Nenhum profissional cadastrado.</div>'}
                </div>

                <!-- CLIENTES -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius: ${isMobile ? '14px' : '18px'};
                    padding: ${isVeryMobile ? '18px 20px' : isMobile ? '22px 28px' : '28px 36px'};
                    border:1px solid rgba(255,255,255,0.04);
                    margin-bottom: ${isMobile ? '16px' : '22px'};
                ">
                    <h4 style="
                        margin:0 0 ${isVeryMobile ? '14px' : '18px'} 0;
                        font-size: ${fontSize.subtitulo};
                        color:#fff;
                        display:flex;
                        align-items:center;
                        gap:10px;
                    ">
                        <i class="fas fa-address-book" style="color:#8b5cf6;font-size:${fontSize.subtitulo};"></i> Clientes (${clientes.length})
                    </h4>
                    ${clientes.length > 0 ? `
                        <div style="overflow-x:auto; -webkit-overflow-scrolling: touch;">
                            <table style="
                                width:100%;
                                font-size: ${fontSize.tabela};
                                border-collapse:collapse;
                                min-width: ${isVeryMobile ? '320px' : '400px'};
                            ">
                                <thead>
                                    <tr style="border-bottom:2px solid rgba(255,255,255,0.04);">
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:left;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Nome</th>
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:left;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Telefone</th>
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:center;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${clientes.slice(0, isVeryMobile ? 10 : isMobile ? 15 : 20).map(c => `
                                        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
                                            <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};font-weight:500;color:#e2e8f0;font-size:${fontSize.tabela};">${escapeHtml(c.nome)}</td>
                                            <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};color:#94a3b8;font-size:${fontSize.tabela};">${escapeHtml(c.telefone || '-')}</td>
                                            <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:center;font-size:${fontSize.tabela};">${c.bloqueado_chatbot === 1 ? '🔒' : '✅'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${clientes.length > (isVeryMobile ? 10 : isMobile ? 15 : 20) ? `
                                <div style="text-align:center;padding:12px;color:#94a3b8;font-size:${fontSize.pequeno};">+ ${clientes.length - (isVeryMobile ? 10 : isMobile ? 15 : 20)} clientes a mais...</div>
                            ` : ''}
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:16px;">Nenhum cliente cadastrado.</div>'}
                </div>

                <!-- AGENDAMENTOS -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius: ${isMobile ? '14px' : '18px'};
                    padding: ${isVeryMobile ? '18px 20px' : isMobile ? '22px 28px' : '28px 36px'};
                    border:1px solid rgba(255,255,255,0.04);
                ">
                    <div style="display:flex;flex-direction:${isVeryMobile ? 'column' : 'row'};justify-content:space-between;align-items:${isVeryMobile ? 'flex-start' : 'center'};gap:10px;margin-bottom:16px;">
                        <h4 style="
                            margin:0;
                            font-size: ${fontSize.subtitulo};
                            color:#fff;
                            display:flex;
                            align-items:center;
                            gap:10px;
                        ">
                            <i class="fas fa-calendar-alt" style="color:#f59e0b;font-size:${fontSize.subtitulo};"></i> Agendamentos (${agendamentos.length})
                        </h4>
                        <div style="display:flex;gap:12px;font-size: ${fontSize.pequeno};flex-wrap:wrap;">
                            <span style="color:#f59e0b;">⏳ ${agendamentosPendentes}</span>
                            <span style="color:#22c55e;">✅ ${agendamentosConcluidos}</span>
                            ${agendamentosCancelados > 0 ? `<span style="color:#ef4444;">❌ ${agendamentosCancelados}</span>` : ''}
                        </div>
                    </div>
                    ${agendamentos.length > 0 ? `
                        <div style="overflow-x:auto; -webkit-overflow-scrolling: touch;">
                            <table style="
                                width:100%;
                                font-size: ${fontSize.tabela};
                                border-collapse:collapse;
                                min-width: ${isVeryMobile ? '380px' : '480px'};
                            ">
                                <thead>
                                    <tr style="border-bottom:2px solid rgba(255,255,255,0.04);">
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:left;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Cliente</th>
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:left;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Serviço</th>
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:left;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Data</th>
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:center;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Status</th>
                                        <th style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:right;color:#94a3b8;font-weight:600;font-size:${fontSize.tabelaCabecalho};">Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${agendamentos.slice(0, isVeryMobile ? 8 : isMobile ? 12 : 20).map(a => {
                                        const statusColor = a.status === 'concluido' ? '#22c55e' : 
                                                          a.status === 'cancelado' ? '#ef4444' : '#f59e0b';
                                        const statusBg = a.status === 'concluido' ? 'rgba(34,197,94,0.12)' : 
                                                        a.status === 'cancelado' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
                                        const valor = parseFloat(a.valor_total) || parseFloat(a.valor) || 0;
                                        return `
                                            <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
                                                <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};font-weight:500;color:#e2e8f0;font-size:${fontSize.tabela};">${escapeHtml(a.cliente_nome || 'N/A')}</td>
                                                <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};color:#94a3b8;font-size:${fontSize.tabela};">${escapeHtml(a.servico || a.servico_nome || '-')}</td>
                                                <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};color:#94a3b8;font-size:${fontSize.tabela};white-space:nowrap;">${formatarDataBr(a.data)}</td>
                                                <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:center;">
                                                    <span style="
                                                        padding: ${isVeryMobile ? '6px 14px' : '8px 18px'};
                                                        border-radius:10px;
                                                        font-size: ${fontSize.muitoPequeno};
                                                        font-weight:600;
                                                        background:${statusBg};
                                                        color:${statusColor};
                                                        white-space:nowrap;
                                                    ">${a.status || 'pendente'}</span>
                                                </td>
                                                <td style="padding: ${isVeryMobile ? '12px 14px' : isMobile ? '14px 18px' : '16px 22px'};text-align:right;font-weight:600;color:#fff;font-size:${fontSize.tabela};">R$ ${formatarMoeda(valor)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                            ${agendamentos.length > (isVeryMobile ? 8 : isMobile ? 12 : 20) ? `
                                <div style="text-align:center;padding:12px;color:#94a3b8;font-size:${fontSize.pequeno};">+ ${agendamentos.length - (isVeryMobile ? 8 : isMobile ? 12 : 20)} agendamentos a mais...</div>
                            ` : ''}
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:16px;">Nenhum agendamento encontrado.</div>'}
                </div>

            </div>
        `;

        document.getElementById('content').innerHTML = html;
        if (typeof hideLoading === 'function') hideLoading();

    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Erro ao carregar detalhes da empresa:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao carregar detalhes da empresa: ' + error.message, 'error');
        }
    }
}
// ============================================
// EDITAR EMPRESA
// ============================================
async function editarEmpresa(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/empresas/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();

        if (data.success) {
            const empresa = data.data;
            let modal = document.getElementById('modalEditarEmpresa');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'modalEditarEmpresa';
                modal.className = 'modal';
                modal.style.display = 'none';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 500px;">
                        <div class="modal-header">
                            <h3>✏️ Editar Empresa</h3>
                            <button onclick="fecharModal('modalEditarEmpresa')" class="modal-close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="formEmpresa" style="display:flex;flex-direction:column;gap:12px;">
                                <input type="hidden" id="editEmpresaId">
                                <div class="form-group">
                                    <label>Nome da Empresa *</label>
                                    <input type="text" id="editEmpresaNome" class="form-control" required>
                                </div>
                                <div class="form-group">
                                    <label>Plano *</label>
                                    <select id="editEmpresaPlano" class="form-control">
                                        <option value="trial">Trial (Grátis)</option>
                                        <option value="starter">Starter (R$ 29,90/mês)</option>
                                        <option value="pro">Pro (R$ 59,90/mês)</option>
                                        <option value="business">Business (R$ 119,90/mês)</option>
                                        <option value="enterprise">Enterprise (R$ 249,90/mês)</option>
                                    </select>
                                </div>
                                <div style="display:flex;gap:8px;margin-top:8px;">
                                    <button type="submit" class="btn-3d" style="flex:1;"><i class="fas fa-save"></i> Salvar Alterações</button>
                                    <button type="button" onclick="fecharModal('modalEditarEmpresa')" class="btn-secondary">Cancelar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            document.getElementById('editEmpresaId').value = empresa.id;
            document.getElementById('editEmpresaNome').value = empresa.nome || '';
            document.getElementById('editEmpresaPlano').value = empresa.plano || 'trial';
            modal.style.display = 'block';

            setTimeout(conectarFormEmpresa, 100);
        } else {
            if (typeof showToast === 'function') {
                showToast('Erro ao carregar dados da empresa', 'error');
            }
        }
    } catch (error) {
        if (typeof showToast === 'function') {
            showToast('Erro ao carregar dados da empresa', 'error');
        }
    }
}

// ============================================
// SALVAR EMPRESA
// ============================================
async function salvarEmpresa() {
    const id = document.getElementById('editEmpresaId').value;
    const nome = document.getElementById('editEmpresaNome').value;
    const plano = document.getElementById('editEmpresaPlano').value;

    if (!nome) {
        if (typeof showToast === 'function') {
            showToast('Nome da empresa é obrigatório', 'warning');
        }
        return;
    }

    if (typeof showLoading === 'function') showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ nome, plano })
        });

        const data = await res.json();
        if (typeof hideLoading === 'function') hideLoading();

        if (data.success) {
            if (typeof showToast === 'function') {
                showToast('✅ Empresa e Plano atualizados com sucesso!', 'success');
            }
            fecharModal('modalEditarEmpresa');
            carregarDashboardSuperAdmin();
        } else {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Erro ao atualizar empresa', 'error');
            }
        }
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Erro ao salvar empresa:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao atualizar empresa', 'error');
        }
    }
}

// ============================================
// EDITAR USUÁRIO
// ============================================
async function editarUsuario(id) {
    console.log('👤 Editando usuário ID:', id);
    if (!id) {
        if (typeof showToast === 'function') {
            showToast('ID do usuário não informado', 'error');
        }
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        if (typeof showToast === 'function') {
            showToast('Token não encontrado. Faça login novamente.', 'error');
        }
        return;
    }

    if (typeof showLoading === 'function') showLoading();
    try {
        const resUser = await fetch(`/api/admin/usuarios/${id}`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        if (!resUser.ok) throw new Error(`HTTP ${resUser.status}: ${resUser.statusText}`);
        const userData = await resUser.json();
        if (!userData.success || !userData.data) {
            if (typeof showToast === 'function') {
                showToast('Usuário não encontrado', 'error');
            }
            return;
        }

        const usuario = userData.data;
        let url = usuario.role === 'profissional' ? `/api/admin/profissionais/${id}` : `/api/admin/usuarios/${id}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (typeof hideLoading === 'function') hideLoading();

        if (!data.success || !data.data) {
            if (typeof showToast === 'function') {
                showToast('Usuário não encontrado', 'error');
            }
            return;
        }

        const usuarioCompleto = data.data;
        const isProfissional = usuarioCompleto.role === 'profissional';
        const telefone = usuarioCompleto.telefone || '';

        const modalContent = `
            <div style="padding: 10px 0;">
                <form id="formEditarUsuario" style="display:flex;flex-direction:column;gap:12px;">
                    <input type="hidden" id="editUsuarioId" value="${usuarioCompleto.id}">
                    <input type="hidden" id="editUsuarioTipo" value="${isProfissional ? 'profissional' : 'usuario'}">
                    
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="editUsuarioNome" class="form-control" value="${escapeHtml(usuarioCompleto.nome || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="editUsuarioEmail" class="form-control" value="${escapeHtml(usuarioCompleto.email || '')}" required>
                    </div>
                    <div class="form-group">
                        <label>📱 Telefone</label>
                        <input type="text" id="editUsuarioTelefone" class="form-control" value="${escapeHtml(telefone)}" placeholder="(11) 99999-9999">
                        <small style="color:var(--text-muted);font-size:11px;">Este número aparecerá nas mensagens do WhatsApp</small>
                    </div>
                    ${isProfissional ? `
                        <div class="form-group">
                            <label>Comissão (%)</label>
                            <input type="number" id="editUsuarioComissao" class="form-control" value="${usuarioCompleto.comissao_percent || 30}" min="0" max="100">
                        </div>
                    ` : `
                        <div class="form-group">
                            <label>Role (Função)</label>
                            <select id="editUsuarioRole" class="form-control">
                                <option value="dono" ${usuarioCompleto.role === 'dono' ? 'selected' : ''}>👑 Dono</option>
                                <option value="profissional" ${usuarioCompleto.role === 'profissional' ? 'selected' : ''}>👤 Profissional</option>
                                <option value="superadmin" ${usuarioCompleto.role === 'superadmin' ? 'selected' : ''}>🔴 Super Admin</option>
                            </select>
                        </div>
                    `}
                    <div class="form-group">
                        <label>Nova Senha (opcional)</label>
                        <input type="text" id="editUsuarioSenha" class="form-control" placeholder="Deixe em branco para manter a atual">
                    </div>
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <button type="submit" class="btn-3d" style="flex:1;"><i class="fas fa-save"></i> Salvar</button>
                        <button type="button" onclick="fecharModalEditarUsuario()" class="btn-secondary">Cancelar</button>
                    </div>
                </form>
            </div>
        `;

        if (typeof showModal === 'function') {
            showModal('✏️ Editar Usuário', modalContent, null);
        }

        setTimeout(() => {
            const form = document.getElementById('formEditarUsuario');
            if (form) {
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);
                newForm.addEventListener('submit', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    salvarUsuario();
                });
            }
        }, 200);

    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Erro ao editar usuário:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao carregar dados do usuário: ' + error.message, 'error');
        }
    }
}

function fecharModalEditarUsuario() {
    const modal = document.querySelector('.modal');
    if (modal) modal.style.display = 'none';
}

async function salvarUsuario() {
    const id = document.getElementById('editUsuarioId')?.value;
    const tipo = document.getElementById('editUsuarioTipo')?.value || 'usuario';
    const nome = document.getElementById('editUsuarioNome')?.value;
    const email = document.getElementById('editUsuarioEmail')?.value;
    const senha = document.getElementById('editUsuarioSenha')?.value;
    const comissao = document.getElementById('editUsuarioComissao')?.value;
    const telefone = document.getElementById('editUsuarioTelefone')?.value;
    const role = document.getElementById('editUsuarioRole')?.value;

    if (!id || !nome || !email) {
        if (typeof showToast === 'function') {
            showToast('Nome e email são obrigatórios', 'error');
        }
        return;
    }

    const dados = { nome, email, senha: senha || undefined, telefone: telefone || '' };
    if (tipo === 'profissional') {
        if (comissao !== undefined && comissao !== '') dados.comissao_percent = parseFloat(comissao);
    } else {
        if (role) dados.role = role;
    }

    try {
        const url = tipo === 'profissional' ? `/api/admin/profissionais/${id}` : `/api/admin/usuarios/${id}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const data = await response.json();
        if (data.success) {
            if (typeof showToast === 'function') {
                showToast('✅ Usuário atualizado com sucesso!', 'success');
            }
            fecharModal();
            carregarDashboardSuperAdmin();
        } else {
            if (typeof showToast === 'function') {
                showToast('❌ ' + data.message, 'error');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao salvar usuário:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao salvar usuário: ' + error.message, 'error');
        }
    }
}

// ============================================
// ESTENDER TRIAL
// ============================================
async function estenderTrial(empresaId) {
    if (!confirm('Estender trial por mais 30 dias?')) return;
    if (typeof showLoading === 'function') showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${empresaId}/extender-trial`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (typeof hideLoading === 'function') hideLoading();

        if (data.success) {
            if (typeof showToast === 'function') {
                showToast('Trial estendido com sucesso! +30 dias', 'success');
            }
            carregarDashboardSuperAdmin();
        } else {
            if (typeof showToast === 'function') {
                showToast(data.message || 'Erro ao estender trial', 'error');
            }
        }
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        if (typeof showToast === 'function') {
            showToast('Erro ao estender trial', 'error');
        }
    }
}

// ============================================
// DELETAR EMPRESA
// ============================================
async function deletarEmpresa(id, nome) {
    if (!confirm(`⚠️ TEM CERTEZA QUE DESEJA DELETAR A EMPRESA "${nome}"?\n\nIsso vai deletar PERMANENTEMENTE:\n• Todos os usuários (donos e profissionais)\n• Todos os clientes\n• Todos os agendamentos\n• Todos os serviços\n• Todos os horários\n• Todas as despesas\n• Todos os acessos\n\n📌 Esta ação NÃO pode ser desfeita!`)) {
        return;
    }

    const confirmacao = prompt(`Digite "DELETAR" para confirmar a exclusão da empresa "${nome}":`);
    if (confirmacao !== 'DELETAR') {
        if (typeof showToast === 'function') {
            showToast('❌ Exclusão cancelada - confirmação incorreta', 'warning');
        }
        return;
    }

    if (typeof showLoading === 'function') showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        const data = await res.json();
        if (typeof hideLoading === 'function') hideLoading();

        if (data.success) {
            if (typeof showToast === 'function') {
                showToast(`✅ Empresa "${nome}" deletada com sucesso!`, 'success');
            }
            setTimeout(() => carregarDashboardSuperAdmin(), 1000);
        } else {
            if (typeof showToast === 'function') {
                showToast('❌ ' + data.message, 'error');
            }
        }
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Erro ao deletar empresa:', error);
        if (typeof showToast === 'function') {
            showToast('❌ Erro ao deletar empresa: ' + error.message, 'error');
        }
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function fecharModal(modalId) {
    const modal = modalId ? document.getElementById(modalId) : document.querySelector('.modal');
    if (modal) modal.style.display = 'none';
}

function conectarFormEmpresa() {
    const form = document.getElementById('formEmpresa');
    if (form) {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📝 Formulário da empresa submetido!');
            salvarEmpresa();
        });
    }
}

function formatarDataHora(dataStr) {
    if (!dataStr) return 'Nunca';
    try {
        const data = new Date(dataStr);
        if (isNaN(data.getTime())) return 'Nunca';
        return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return dataStr;
    }
}

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                return partes[2] + '/' + partes[1] + '/' + partes[0];
            }
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

function formatarMoeda(valor) {
    if (!valor) return '0,00';
    try {
        return valor.toFixed(2).replace('.', ',');
    } catch {
        return '0,00';
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showModal(title, content, callback) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button onclick="this.closest('.modal').style.display='none'" class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function fecharModal() {
    const modal = document.querySelector('.modal');
    if (modal) modal.style.display = 'none';
}

// ============================================
// 📊 ADS - CHAMAR PÁGINA DEDICADA (CORRIGIDO)
// ============================================

let adsScriptCarregado = false;
let adsCarregando = false;

function carregarPainelAds(empresaId = null) {
    console.log('📊 Carregando página dedicada de Anúncios...');
    
    // 🔥 VERIFICAR SE JÁ ESTÁ CARREGANDO
    if (adsCarregando) {
        console.log('⏳ Já está carregando, aguarde...');
        return;
    }
    
    // 🔥 VERIFICAR SE A FUNÇÃO JÁ ESTÁ DISPONÍVEL (NÃO A QUE ESTAMOS EXECUTANDO)
    if (typeof window._carregarPainelAdsReal === 'function') {
        console.log('✅ Função já disponível, chamando diretamente');
        window._carregarPainelAdsReal(empresaId);
        return;
    }
    
    // 🔥 VERIFICAR SE O SCRIPT JÁ FOI CARREGADO
    const scriptExistente = document.querySelector('script[src*="ads.js"]');
    if (scriptExistente && typeof window._carregarPainelAdsReal === 'undefined') {
        console.warn('⚠️ ads.js carregado mas função não encontrada, recarregando...');
        scriptExistente.remove();
        adsScriptCarregado = false;
    }
    
    // 🔥 SE JÁ CARREGADO, NÃO RECARREGAR
    if (adsScriptCarregado) {
        console.log('✅ ads.js já carregado, chamando função...');
        if (typeof window._carregarPainelAdsReal === 'function') {
            window._carregarPainelAdsReal(empresaId);
        } else {
            console.error('❌ Função não encontrada mesmo após carregar');
            adsScriptCarregado = false;
            // Tentar recarregar
            carregarScriptAds(empresaId);
        }
        return;
    }
    
    // 🔥 CARREGAR O SCRIPT
    carregarScriptAds(empresaId);
}

function carregarScriptAds(empresaId) {
    if (adsCarregando) return;
    adsCarregando = true;
    
    console.log('📦 Carregando ads.js...');
    
    // Remover scripts antigos
    document.querySelectorAll('script[src*="ads.js"]').forEach(s => s.remove());
    
    const script = document.createElement('script');
    script.src = '/js/pages/ads.js?v=' + Date.now();
    script.onload = function() {
        console.log('✅ ads.js carregado com sucesso!');
        adsScriptCarregado = true;
        adsCarregando = false;
        
        // Aguardar um pouco para garantir que as funções foram registradas
        setTimeout(() => {
            if (typeof window._carregarPainelAdsReal === 'function') {
                window._carregarPainelAdsReal(empresaId);
            } else {
                console.error('❌ Função _carregarPainelAdsReal não encontrada após carregar');
                // Tentar mais uma vez
                setTimeout(() => {
                    if (typeof window._carregarPainelAdsReal === 'function') {
                        window._carregarPainelAdsReal(empresaId);
                    } else {
                        console.error('❌ Falha definitiva ao carregar ADS');
                        if (typeof showToast === 'function') {
                            showToast('❌ Erro ao carregar painel de anúncios', 'error');
                        }
                    }
                }, 500);
            }
        }, 300);
    };
    script.onerror = function() {
        console.error('❌ Erro ao carregar ads.js');
        adsCarregando = false;
        if (typeof showToast === 'function') {
            showToast('❌ Erro ao carregar módulo de anúncios', 'error');
        }
    };
    document.head.appendChild(script);
}

// ============================================
// FALLBACK PARA ADMIN ADS (COMPATIBILIDADE)
// ============================================
function carregarAdminAds() {
    console.log('📊 Redirecionando para Painel de Anúncios...');
    carregarPainelAds();
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================
window.carregarPainelAds = carregarPainelAds;
window.carregarAdminAds = carregarAdminAds;

console.log('✅ ADS - Integração com página dedicada carregada! (CORRIGIDO)');
// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.carregarDashboardSuperAdmin = carregarDashboardSuperAdmin;
window.carregarEmpresas = carregarDashboardSuperAdmin;
window.alternarModoPagamento = alternarModoPagamento;
window.toggleWhatsAppProprio = toggleWhatsAppProprio;
window.filtrarEmpresas = filtrarEmpresas;
window.verEmpresa = verEmpresa;
window.editarEmpresa = editarEmpresa;
window.salvarEmpresa = salvarEmpresa;
window.editarUsuario = editarUsuario;
window.salvarUsuario = salvarUsuario;
window.fecharModalEditarUsuario = fecharModalEditarUsuario;
window.estenderTrial = estenderTrial;
window.deletarEmpresa = deletarEmpresa;
window.fecharModal = fecharModal;
window.conectarFormEmpresa = conectarFormEmpresa;
window.formatarMoeda = formatarMoeda;
window.formatarDataBr = formatarDataBr;
window.escapeHtml = escapeHtml;
window.showModal = showModal;

console.log('✅ empresas.js carregado com Dashboard Super Admin COMPLETO e RICO!');