// ============================================
// SUPER ADMIN - GESTÃO COMPLETA DE EMPRESAS (VERSÃO FUNDIDA E MELHORADA)
// ============================================
let empresasData = [];
let usuariosData = [];
let empresasTimeout = null;

// ============================================
// 🏢 SUPER ADMIN - DASHBOARD ULTRA MOBILE PREMIUM
// ============================================
async function carregarDashboardSuperAdmin() {
    ativarBotao('dashboard');
    showLoading();
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
        // HTML PRINCIPAL
        // ============================================
        const html = `
            <div style="padding:${isMobile ? '8px' : '16px'};max-width:1400px;margin:0 auto;font-family:'Inter',sans-serif;">

                <!-- ========================================== -->
                <!-- CABEÇALHO COM GRADIENTE -->
                <!-- ========================================== -->
                <div style="
                    background:linear-gradient(135deg,#1a1a2e,#2d2d5f);
                    border-radius:16px;
                    padding:${isMobile ? '16px' : '20px'};
                    margin-bottom:16px;
                    border:1px solid rgba(102,126,234,0.15);
                    box-shadow:0 4px 20px rgba(102,126,234,0.08);
                ">
                    <div style="display:flex;flex-direction:${isMobile ? 'column' : 'row'};justify-content:space-between;align-items:${isMobile ? 'flex-start' : 'center'};gap:12px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <span style="font-size:28px;">👑</span>
                                <h1 style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;margin:0;background:linear-gradient(135deg,#667eea,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                                    Super Admin
                                </h1>
                            </div>
                            <p style="color:#94a3b8;font-size:${isMobile ? '11px' : '14px'};margin:4px 0 0 0;">
                                <i class="fas fa-calendar-alt" style="color:#667eea;"></i> 
                                ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <button onclick="carregarDashboardSuperAdmin()" style="
                            background:linear-gradient(135deg,#667eea,#764ba2);
                            border:none;
                            padding:${isMobile ? '10px 16px' : '10px 24px'};
                            border-radius:12px;
                            color:white;
                            font-size:${isMobile ? '13px' : '14px'};
                            font-weight:600;
                            cursor:pointer;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            gap:8px;
                            width:${isMobile ? '100%' : 'auto'};
                            transition:all 0.3s ease;
                            box-shadow:0 4px 15px rgba(102,126,234,0.3);
                        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            <i class="fas fa-sync-alt"></i> ${isMobile ? 'Atualizar' : 'Atualizar Dados'}
                        </button>
                    </div>
                </div>

                <!-- ========================================== -->
                <!-- MODO DE PAGAMENTO - CARD DESTAQUE -->
                <!-- ========================================== -->
                <div style="
                    background: ${isReal ? 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.04))' : 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))'}; 
                    border: 1px solid ${isReal ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}; 
                    border-radius: 14px; 
                    padding: ${isMobile ? '12px 14px' : '16px 20px'}; 
                    margin-bottom: 16px;
                    display: flex; 
                    flex-direction: ${isMobile ? 'column' : 'row'};
                    justify-content: space-between; 
                    align-items: ${isMobile ? 'flex-start' : 'center'}; 
                    gap: 10px;
                ">
                    <div style="display: flex; align-items: center; gap: 12px; flex-wrap:wrap;">
                        <span style="font-size: ${isMobile ? '28px' : '32px'};">${isReal ? '🔴' : '🟡'}</span>
                        <div>
                            <div style="font-size: ${isMobile ? '14px' : '16px'}; font-weight: 700; color: var(--text-primary);">
                                💳 <span style="color: ${isReal ? '#ef4444' : '#f59e0b'};">${paymentData.label}</span>
                            </div>
                            <div style="font-size: ${isMobile ? '11px' : '13px'}; color: #94a3b8; margin-top: 2px;">
                                ${isReal ? '⚠️ Pagamentos REAIS estão ativos!' : '🔸 Modo SIMULAÇÃO - Nenhuma cobrança real'}
                            </div>
                        </div>
                    </div>
                    <button onclick="alternarModoPagamento()" style="
                        padding: ${isMobile ? '8px 16px' : '8px 24px'};
                        border: none;
                        border-radius: 10px;
                        background: ${isReal ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
                        color: ${isReal ? '#ef4444' : '#22c55e'};
                        font-weight: 700;
                        font-size: ${isMobile ? '12px' : '14px'};
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        width: ${isMobile ? '100%' : 'auto'};
                        transition:all 0.3s ease;
                    " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-${isReal ? 'toggle-on' : 'toggle-off'}"></i>
                        ${isReal ? 'Desativar Pagamentos Reais' : 'Ativar Pagamentos Reais'}
                    </button>
                </div>

                <!-- ========================================== -->
                <!-- CARDS DE MÉTRICAS - COM ÍCONES E CORES -->
                <!-- ========================================== -->
                <div style="display:grid;grid-template-columns:${isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)'};gap:${isMobile ? '8px' : '14px'};margin-bottom:16px;">
                    ${[
                        { icon: '🏢', label: 'Empresas', value: totalEmpresas, color: '#667eea' },
                        { icon: '👥', label: 'Usuários', value: usuarios.length, color: '#8b5cf6' },
                        { icon: '👤', label: 'Clientes', value: totalClientes, color: '#22c55e' },
                        { icon: '✂️', label: 'Agendamentos', value: totalAgendamentos, color: '#f59e0b' },
                        { icon: '💰', label: 'Faturamento', value: `R$ ${formatarMoeda(faturamentoMes)}`, color: '#ec4899' }
                    ].map(metric => `
                        <div style="
                            background:linear-gradient(135deg,#1a1a2e,#252540);
                            border-radius:12px;
                            padding:${isMobile ? '10px 8px' : '16px 14px'};
                            border:1px solid rgba(255,255,255,0.04);
                            text-align:center;
                            transition:all 0.3s ease;
                            box-shadow:0 2px 12px rgba(0,0,0,0.1);
                        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            <div style="font-size:${isMobile ? '22px' : '28px'};">${metric.icon}</div>
                            <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;color:#fff;margin:2px 0;">${metric.value}</div>
                            <div style="font-size:${isMobile ? '8px' : '11px'};color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${metric.label}</div>
                            <div style="height:3px;background:linear-gradient(90deg,${metric.color},transparent);border-radius:4px;margin-top:6px;"></div>
                        </div>
                    `).join('')}
                </div>

                <!-- ========================================== -->
                <!-- FILTRO E BUSCA - COM ÍCONES -->
                <!-- ========================================== -->
                <div style="display:flex;flex-direction:${isMobile ? 'column' : 'row'};gap:8px;margin-bottom:14px;">
                    <div style="flex:1;position:relative;">
                        <i class="fas fa-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:14px;"></i>
                        <input type="text" id="buscarEmpresa" placeholder="Buscar empresa..." oninput="filtrarEmpresas()" style="
                            width:100%;
                            padding:${isMobile ? '12px 14px 12px 40px' : '10px 14px 10px 40px'};
                            border-radius:10px;
                            border:1px solid #2d2d3f;
                            background:#1a1a2e;
                            color:#fff;
                            font-size:${isMobile ? '14px' : '14px'};
                            outline:none;
                            transition:all 0.3s ease;
                        " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#2d2d3f'">
                    </div>
                    <select id="filtroStatus" onchange="filtrarEmpresas()" style="
                        padding:${isMobile ? '12px 14px' : '10px 14px'};
                        border-radius:10px;
                        border:1px solid #2d2d3f;
                        background:#1a1a2e;
                        color:#fff;
                        font-size:${isMobile ? '14px' : '14px'};
                        width:${isMobile ? '100%' : 'auto'};
                        outline:none;
                        cursor:pointer;
                        transition:all 0.3s ease;
                    " onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#2d2d3f'">
                        <option value="">📋 Todos</option>
                        <option value="ativo">🟢 Ativos</option>
                        <option value="trial">🟡 Trial</option>
                        <option value="expirado">🔴 Expirados</option>
                    </select>
                </div>

                <!-- ========================================== -->
                <!-- LISTA DE EMPRESAS - CARDS PREMIUM -->
                <!-- ========================================== -->
                <div style="
                    background:linear-gradient(135deg,#1a1a2e,#1f1f3a);
                    border-radius:16px;
                    padding:${isMobile ? '12px' : '18px'};
                    border:1px solid rgba(102,126,234,0.08);
                    margin-bottom:16px;
                    box-shadow:0 4px 24px rgba(0,0,0,0.15);
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:20px;">📋</span>
                            <h3 style="margin:0;font-size:${isMobile ? '15px' : '18px'};font-weight:700;color:#fff;">
                                Empresas <span style="font-size:12px;color:#94a3b8;font-weight:400;">(${totalEmpresas})</span>
                            </h3>
                        </div>
                        <div style="display:flex;gap:6px;font-size:${isMobile ? '9px' : '11px'};">
                            <span style="background:rgba(34,197,94,0.15);padding:3px 10px;border-radius:12px;color:#22c55e;font-weight:600;">🟢 ${empresasAtivas}</span>
                            <span style="background:rgba(245,158,11,0.15);padding:3px 10px;border-radius:12px;color:#f59e0b;font-weight:600;">🟡 ${empresasTrial}</span>
                            ${empresasExpiradas.length > 0 ? `<span style="background:rgba(239,68,68,0.15);padding:3px 10px;border-radius:12px;color:#ef4444;font-weight:600;">🔴 ${empresasExpiradas.length}</span>` : ''}
                        </div>
                    </div>

                    <div id="listaEmpresas" style="display:flex;flex-direction:column;gap:8px;">
                        ${empresas.length === 0 ? `
                            <div style="text-align:center;padding:30px;color:#94a3b8;">
                                <i class="fas fa-building" style="font-size:32px;display:block;margin-bottom:8px;opacity:0.3;"></i>
                                Nenhuma empresa cadastrada
                            </div>
                        ` : empresas.map((e) => {
                            // ... lógica de cálculo (mantida igual) ...
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

                            let diasColor = '#22c55e';
                            let diasTexto = '♾️';
                            if (isTrial) {
                                if (diasRestantes <= 0) { diasColor = '#ef4444'; diasTexto = '0d'; }
                                else if (diasRestantes <= 3) { diasColor = '#ef4444'; diasTexto = diasRestantes + 'd ⚠️'; }
                                else if (diasRestantes <= 7) { diasColor = '#f59e0b'; diasTexto = diasRestantes + 'd'; }
                                else { diasColor = '#22c55e'; diasTexto = diasRestantes + 'd'; }
                            }

                            let statusColor = '#22c55e';
                            let statusText = '✅ Ativo';
                            let statusBg = 'rgba(34,197,94,0.12)';
                            if (isTrial) {
                                if (diasRestantes <= 0) {
                                    statusColor = '#ef4444'; statusText = '⛔ Expirado';
                                    statusBg = 'rgba(239,68,68,0.12)';
                                } else {
                                    statusColor = '#f59e0b'; statusText = '🔄 Trial';
                                    statusBg = 'rgba(245,158,11,0.12)';
                                }
                            } else if (!isAtivo) {
                                statusColor = '#94a3b8'; statusText = '⛔ Inativo';
                                statusBg = 'rgba(148,163,184,0.12)';
                            }

                            let planoColor = '#f59e0b';
                            let planoBg = 'rgba(245,158,11,0.12)';
                            let planoText = 'Trial';
                            if (e.plano === 'Starter' || e.plano === 'starter') { planoColor = '#667eea'; planoBg = 'rgba(102,126,234,0.12)'; planoText = 'Starter'; }
                            else if (e.plano === 'Pro' || e.plano === 'pro') { planoColor = '#22c55e'; planoBg = 'rgba(34,197,94,0.12)'; planoText = 'Pro'; }
                            else if (e.plano === 'Business' || e.plano === 'business') { planoColor = '#8b5cf6'; planoBg = 'rgba(139,92,246,0.12)'; planoText = 'Business'; }
                            else if (e.plano === 'Enterprise' || e.plano === 'enterprise') { planoColor = '#d97706'; planoBg = 'rgba(245,158,11,0.12)'; planoText = 'Enterprise'; }

                            const donos = usuarios.filter(u => u.empresa_id === e.id && u.role === 'dono').length;
                            const profissionais = usuarios.filter(u => u.empresa_id === e.id && u.role === 'profissional').length;
                            const clientes = e.total_clientes || 0;
                            const agendamentos = e.total_agendamentos || 0;

                            const whatsappHabilitado = e.whatsapp_proprio_habilitado === true || e.whatsapp_proprio_habilitado === 1;
                            const whatsappConectado = e.whatsapp_connected === true || e.whatsapp_connected === 1;

                            let whatsappStatus = '';
                            if (!whatsappHabilitado) {
                                whatsappStatus = `<span style="color:#ef4444;font-weight:600;font-size:10px;">🔴 OFF</span>`;
                            } else if (!whatsappConectado) {
                                whatsappStatus = `<span style="color:#f59e0b;font-weight:600;font-size:10px;">🟡 PEND</span>`;
                            } else {
                                whatsappStatus = `<span style="color:#22c55e;font-weight:600;font-size:10px;">🟢 ON</span>`;
                            }

                            return `
                                <div class="empresa-card" data-id="${e.id}" data-nome="${e.nome.toLowerCase()}" data-status="${isTrial ? 'trial' : isAtivo ? 'ativo' : 'inativo'}" style="
                                    background:linear-gradient(135deg,#252540,#2a2a4a);
                                    border-radius:12px;
                                    padding:${isMobile ? '12px 14px' : '14px 18px'};
                                    border:1px solid rgba(102,126,234,0.06);
                                    cursor:pointer;
                                    transition:all 0.3s ease;
                                    display:flex;
                                    flex-direction:column;
                                    gap:6px;
                                    box-shadow:0 2px 12px rgba(0,0,0,0.08);
                                " onmouseover="this.style.borderColor='rgba(102,126,234,0.2)';this.style.transform='translateX(4px)'" onmouseout="this.style.borderColor='rgba(102,126,234,0.06)';this.style.transform='translateX(0)'">
                                    
                                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px;">
                                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1;min-width:0;">
                                            <span style="font-size:${isMobile ? '15px' : '17px'};font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;">
                                                ${escapeHtml(e.nome)}
                                            </span>
                                            <span style="
                                                background:${statusBg};
                                                color:${statusColor};
                                                padding:2px 10px;
                                                border-radius:10px;
                                                font-size:${isMobile ? '8px' : '10px'};
                                                font-weight:600;
                                                border:1px solid ${statusColor}22;
                                            ">${statusText}</span>
                                        </div>
                                        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                            ${whatsappStatus}
                                            <span style="font-size:${isMobile ? '11px' : '13px'};color:${diasColor};font-weight:700;">${diasTexto}</span>
                                        </div>
                                    </div>

                                    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                                        <span style="padding:2px 10px;border-radius:8px;font-size:${isMobile ? '8px' : '10px'};font-weight:600;background:${planoBg};color:${planoColor};border:1px solid ${planoColor}22;">${planoText}</span>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#94a3b8;display:flex;align-items:center;gap:3px;">👑 ${donos}</span>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#94a3b8;display:flex;align-items:center;gap:3px;">👤 ${profissionais}</span>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#818cf8;display:flex;align-items:center;gap:3px;">👥 ${clientes}</span>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#f59e0b;display:flex;align-items:center;gap:3px;font-weight:600;">✂️ ${agendamentos}</span>
                                    </div>

                                    <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:8px;border-top:1px solid rgba(255,255,255,0.04);">
                                        <button onclick="event.stopPropagation();verEmpresa(${e.id})" style="
                                            padding:${isMobile ? '7px 12px' : '6px 14px'};
                                            border:none;
                                            border-radius:8px;
                                            font-size:${isMobile ? '11px' : '12px'};
                                            font-weight:600;
                                            cursor:pointer;
                                            background:linear-gradient(135deg,rgba(102,126,234,0.15),rgba(102,126,234,0.05));
                                            color:#818cf8;
                                            border:1px solid rgba(102,126,234,0.1);
                                            flex:1;
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                            gap:4px;
                                            transition:all 0.3s ease;
                                        " onmouseover="this.style.background='rgba(102,126,234,0.25)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(102,126,234,0.15),rgba(102,126,234,0.05))'">
                                            <i class="fas fa-eye"></i> ${isMobile ? '' : 'Ver'}
                                        </button>
                                        <button onclick="event.stopPropagation();editarEmpresa(${e.id})" style="
                                            padding:${isMobile ? '7px 12px' : '6px 14px'};
                                            border:none;
                                            border-radius:8px;
                                            font-size:${isMobile ? '11px' : '12px'};
                                            font-weight:600;
                                            cursor:pointer;
                                            background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05));
                                            color:#f59e0b;
                                            border:1px solid rgba(245,158,11,0.1);
                                            flex:1;
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                            gap:4px;
                                            transition:all 0.3s ease;
                                        " onmouseover="this.style.background='rgba(245,158,11,0.25)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.05))'">
                                            <i class="fas fa-edit"></i> ${isMobile ? '' : 'Editar'}
                                        </button>
                                        ${isTrial ? `
                                            <button onclick="event.stopPropagation();estenderTrial(${e.id})" style="
                                                padding:${isMobile ? '7px 12px' : '6px 14px'};
                                                border:none;
                                                border-radius:8px;
                                                font-size:${isMobile ? '11px' : '12px'};
                                                font-weight:600;
                                                cursor:pointer;
                                                background:linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.05));
                                                color:#22c55e;
                                                border:1px solid rgba(34,197,94,0.1);
                                                flex:1;
                                                display:flex;
                                                align-items:center;
                                                justify-content:center;
                                                gap:4px;
                                                transition:all 0.3s ease;
                                            " onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(34,197,94,0.15),rgba(34,197,94,0.05))'">
                                                <i class="fas fa-clock"></i> ${isMobile ? '' : '+30d'}
                                            </button>
                                        ` : ''}
                                        <button onclick="event.stopPropagation();toggleWhatsAppProprio(${e.id}, ${!whatsappHabilitado})" style="
                                            padding:${isMobile ? '7px 12px' : '6px 14px'};
                                            border:none;
                                            border-radius:8px;
                                            font-size:${isMobile ? '11px' : '12px'};
                                            font-weight:600;
                                            cursor:pointer;
                                            background:${whatsappHabilitado ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
                                            color:${whatsappHabilitado ? '#ef4444' : '#22c55e'};
                                            border:1px solid ${whatsappHabilitado ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)'};
                                            flex:1;
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                            gap:4px;
                                            transition:all 0.3s ease;
                                        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                                            <i class="fas fa-${whatsappHabilitado ? 'toggle-on' : 'toggle-off'}"></i> ${isMobile ? '' : (whatsappHabilitado ? 'Desativar' : 'Ativar')}
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- ========================================== -->
                <!-- ÚLTIMOS USUÁRIOS - VERSÃO PREMIUM -->
                <!-- ========================================== -->
                <div style="
                    background:linear-gradient(135deg,#1a1a2e,#1f1f3a);
                    border-radius:16px;
                    padding:${isMobile ? '12px' : '18px'};
                    border:1px solid rgba(102,126,234,0.08);
                    box-shadow:0 4px 24px rgba(0,0,0,0.15);
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:20px;">👥</span>
                            <h3 style="margin:0;font-size:${isMobile ? '15px' : '18px'};font-weight:700;color:#fff;">Últimos Usuários</h3>
                        </div>
                        <span style="font-size:11px;color:#94a3b8;background:rgba(255,255,255,0.04);padding:4px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.04);">Total: ${usuarios.length}</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:${isMobile ? '10px' : '13px'};min-width:350px;">
                            <thead>
                                <tr style="border-bottom:2px solid rgba(255,255,255,0.04);">
                                    <th style="padding:${isMobile ? '6px 8px' : '8px 12px'};text-align:left;color:#94a3b8;font-size:${isMobile ? '8px' : '10px'};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Nome</th>
                                    <th style="padding:${isMobile ? '6px 8px' : '8px 12px'};text-align:left;color:#94a3b8;font-size:${isMobile ? '8px' : '10px'};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Email</th>
                                    <th style="padding:${isMobile ? '6px 8px' : '8px 12px'};text-align:left;color:#94a3b8;font-size:${isMobile ? '8px' : '10px'};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Role</th>
                                    <th style="padding:${isMobile ? '6px 8px' : '8px 12px'};text-align:center;color:#94a3b8;font-size:${isMobile ? '8px' : '10px'};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuarios.slice(0, 8).map(u => {
                                    const empresa = empresas.find(e => e.id === u.empresa_id);
                                    let roleColor = '#f59e0b';
                                    let roleLabel = '🟠 Dono';
                                    if (u.role === 'superadmin') { roleColor = '#ef4444'; roleLabel = '🔴 Super'; }
                                    else if (u.role === 'profissional') { roleColor = '#818cf8'; roleLabel = '🔵 Prof'; }

                                    return `
                                        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
                                            <td style="padding:${isMobile ? '6px 8px' : '8px 12px'};font-weight:600;color:#fff;font-size:${isMobile ? '10px' : '13px'};">${escapeHtml(u.nome)}</td>
                                            <td style="padding:${isMobile ? '6px 8px' : '8px 12px'};color:#94a3b8;font-size:${isMobile ? '9px' : '12px'};">${escapeHtml(u.email)}</td>
                                            <td style="padding:${isMobile ? '6px 8px' : '8px 12px'};">
                                                <span style="padding:2px 10px;border-radius:8px;font-size:${isMobile ? '8px' : '10px'};font-weight:600;background:${roleColor}15;color:${roleColor};border:1px solid ${roleColor}15;">${roleLabel}</span>
                                            </td>
                                            <td style="padding:${isMobile ? '6px 8px' : '8px 12px'};text-align:center;">
                                                <button onclick="editarUsuario(${u.id})" style="
                                                    padding:${isMobile ? '3px 8px' : '4px 12px'};
                                                    border:none;
                                                    border-radius:6px;
                                                    font-size:${isMobile ? '10px' : '11px'};
                                                    cursor:pointer;
                                                    background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04));
                                                    color:#f59e0b;
                                                    border:1px solid rgba(245,158,11,0.08);
                                                    transition:all 0.3s ease;
                                                " onmouseover="this.style.background='rgba(245,158,11,0.2)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))'">
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
        hideLoading();

        // ============================================
        // INICIAR ANIMAÇÃO DOS CARDS (entrada)
        // ============================================
        setTimeout(() => {
            document.querySelectorAll('.empresa-card').forEach((card, index) => {
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
        hideLoading();
        document.getElementById('content').innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:40px;color:#ef4444;"></i>
                <p style="margin:12px 0;font-size:16px;color:#fff;">Erro ao carregar dashboard</p>
                <p style="color:#94a3b8;font-size:13px;">${error.message}</p>
                <button onclick="carregarDashboardSuperAdmin()" style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;padding:10px 24px;border-radius:10px;color:white;font-size:14px;cursor:pointer;margin-top:12px;font-weight:600;">
                    <i class="fas fa-sync"></i> Tentar Novamente
                </button>
            </div>
        `;
    }
}

// public/js/pages/empresas.js

// ============================================
// ALTERNAR MODO DE PAGAMENTO - CORRIGIDO
// ============================================

async function alternarModoPagamento() {
    const token = localStorage.getItem('token');

    try {
        // 🔥 CORRIGIR: /api/payment/config → /api/pagamento/config
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

            // Enviar alteração
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
                showToast(`💳 Modo alterado para: ${updateData.data.isReal ? '🔴 REAL' : '🟡 SIMULAÇÃO'}`, 'success');
                // Recarregar o dashboard
                setTimeout(() => carregarDashboardSuperAdmin(), 500);
            } else {
                showToast(updateData.message || '❌ Erro ao alterar modo', 'error');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao alternar modo de pagamento:', error);
        showToast('❌ Erro ao alternar modo de pagamento', 'error');
    }
}

// ============================================
// 🔥 TOGGLE WHATSAPP PRÓPRIO (SUPER ADMIN)
// ============================================
async function toggleWhatsAppProprio(empresaId, habilitar) {
    const acao = habilitar ? 'HABILITAR' : 'DESABILITAR';
    const emoji = habilitar ? '🟢' : '🔴';

    if (!confirm(`${emoji} Deseja realmente ${acao.toLowerCase()} o WhatsApp próprio desta empresa?\n\n` +
        (habilitar ? '✅ A empresa poderá conectar seu próprio WhatsApp' : '⚠️ A empresa voltará a usar o WhatsApp compartilhado'))) {
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${empresaId}/whatsapp-proprio`, {
            method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ habilitado: habilitar })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast(data.message, 'success');
            carregarDashboardSuperAdmin();
        } else {
            showToast(data.message || 'Erro ao atualizar', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        showToast('Erro ao atualizar WhatsApp', 'error');
    }
}

// ============================================
// FUNÇÃO PARA FILTRAR EMPRESAS
// ============================================
function filtrarEmpresas() {
    const termo = document.getElementById('buscarEmpresa').value.toLowerCase();
    const filtroStatus = document.getElementById('filtroStatus').value;
    const rows = document.querySelectorAll('#listaEmpresas tr');

    rows.forEach(row => {
        const nome = row.querySelector('td:nth-child(2)')?.textContent?.toLowerCase() || '';
        const status = row.getAttribute('data-status') || '';

        const matchNome = nome.includes(termo);
        const matchStatus = filtroStatus === '' || status === filtroStatus;

        row.style.display = (matchNome && matchStatus) ? '' : 'none';
    });
}

// ============================================
// VER EMPRESA - VERSÃO MOBILE MELHORADA
// ============================================
async function verEmpresa(id) {
    console.log('👁️ Ver empresa ID:', id);
    showLoading();
    const token = localStorage.getItem('token');
    const isMobile = window.innerWidth < 768;

    try {
        const [empresaRes, usuariosRes, clientesRes, agendamentosRes, acessosRes] = await Promise.all([
            fetch(`/api/admin/empresas/${id}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/usuarios`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/clientes`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/agendamentos`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/acessos`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        if (!empresaRes.ok) {
            console.error('❌ Erro ao carregar empresa:', empresaRes.status);
            showToast('Erro ao carregar dados da empresa', 'error');
            hideLoading();
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

        // ============================================
        // CALCULAR STATUS E DIAS RESTANTES
        // ============================================
        const isTrial = empresa.plano === 'trial' || empresa.plano === 'Trial';
        const isAtivo = empresa.assinatura_ativa === 1 || empresa.assinatura_ativa === true;

        let diasRestantes = 0;
        let isIlimitado = false;

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
        } else {
            isIlimitado = true;
            diasRestantes = 999;
        }

        let statusColor = '#22c55e';
        let statusText = '✅ Ativo';

        if (isTrial) {
            if (diasRestantes <= 0) {
                statusColor = '#ef4444';
                statusText = '⛔ Expirado';
            } else if (diasRestantes <= 7) {
                statusColor = '#f59e0b';
                statusText = `⚠️ ${diasRestantes} dias`;
            } else {
                statusColor = '#22c55e';
                statusText = `✅ ${diasRestantes} dias`;
            }
        } else if (!isAtivo) {
            statusColor = '#ef4444';
            statusText = '⛔ Inativo';
        }

        // ============================================
        // CALCULAR MÉTRICAS
        // ============================================
        const totalAcessos = acessos.length;
        const acessosHoje = acessos.filter(a => {
            const hoje = new Date().toISOString().split('T')[0];
            return a.data_acesso && a.data_acesso.startsWith(hoje);
        }).length;

        const ultimoAcesso = acessos.length > 0 ? acessos[0].data_acesso : null;
        const ultimoAcessoFormatado = ultimoAcesso ? formatarDataHora(ultimoAcesso) : 'Nunca acessou';

        const agendamentosPendentes = agendamentos.filter(a => a.status === 'pendente' || a.status === 'agendado').length;
        const agendamentosConcluidos = agendamentos.filter(a => a.status === 'concluido').length;
        const agendamentosCancelados = agendamentos.filter(a => a.status === 'cancelado').length;

        const faturamentoTotal = agendamentos
            .filter(a => a.status === 'concluido')
            .reduce((sum, a) => sum + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);

        // ============================================
        // GERAR HTML - VERSÃO MOBILE MELHORADA
        // ============================================
        const html = `
            <div class="fade-in" style="padding: ${isMobile ? '8px' : '16px'};">
                <!-- CABEÇALHO -->
                <div style="display:flex;flex-direction:${isMobile ? 'column' : 'row'};justify-content:space-between;align-items:${isMobile ? 'flex-start' : 'center'};gap:${isMobile ? '10px' : '12px'};margin-bottom:16px;">
                    <div>
                        <button onclick="carregarDashboardSuperAdmin()" style="background:var(--bg-hover);border:none;padding:4px 12px;border-radius:6px;cursor:pointer;color:var(--text-secondary);font-size:${isMobile ? '11px' : '12px'};">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <h2 style="margin:6px 0 0;font-size:${isMobile ? '20px' : '24px'};color:var(--text-primary);">🏢 ${escapeHtml(empresa.nome)}</h2>
                        <p style="margin:2px 0 0;color:var(--text-muted);font-size:${isMobile ? '11px' : '13px'};">
                            <i class="fas fa-calendar"></i> Criado em ${formatarDataBr(empresa.created_at)}
                            ${empresa.dono_nome ? `• 👑 ${escapeHtml(empresa.dono_nome)}` : ''}
                        </p>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;width:${isMobile ? '100%' : 'auto'};">
                        <span style="background:${statusColor}22;padding:4px 12px;border-radius:6px;color:${statusColor};font-size:${isMobile ? '11px' : '12px'};font-weight:600;border:1px solid ${statusColor}44;">
                            ${statusText}
                        </span>
                        <button onclick="editarEmpresa(${empresa.id})" style="background:var(--primary);border:none;padding:${isMobile ? '6px 14px' : '6px 16px'};border-radius:6px;color:white;font-size:${isMobile ? '12px' : '12px'};cursor:pointer;">
                            <i class="fas fa-edit"></i> ${isMobile ? '' : 'Editar'}
                        </button>
                        ${isTrial ? `
                            <button onclick="estenderTrial(${empresa.id})" style="background:#22c55e;border:none;padding:${isMobile ? '6px 14px' : '6px 16px'};border-radius:6px;color:white;font-size:${isMobile ? '12px' : '12px'};cursor:pointer;">
                                <i class="fas fa-clock"></i> ${isMobile ? '+30d' : '+30 dias'}
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- CARDS DE MÉTRICAS - VERSÃO MOBILE -->
                <div style="display:grid;grid-template-columns:${isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)'};gap:${isMobile ? '6px' : '10px'};margin-bottom:16px;">
                    <div style="background:var(--bg-card);border-radius:10px;padding:${isMobile ? '8px 6px' : '12px 14px'};border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Plano</div>
                        <div style="font-size:${isMobile ? '12px' : '16px'};font-weight:700;color:var(--text-primary);">${isTrial ? 'Trial' : empresa.plano || 'N/A'}</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:${isMobile ? '8px 6px' : '12px 14px'};border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">👥 Usuários</div>
                        <div style="font-size:${isMobile ? '14px' : '16px'};font-weight:700;color:var(--text-primary);">${usuarios.length}</div>
                        <div style="font-size:${isMobile ? '7px' : '10px'};color:var(--text-muted);">${donos.length} donos</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:${isMobile ? '8px 6px' : '12px 14px'};border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">📊 Acessos</div>
                        <div style="font-size:${isMobile ? '14px' : '16px'};font-weight:700;color:var(--text-primary);">${totalAcessos}</div>
                        <div style="font-size:${isMobile ? '7px' : '10px'};color:var(--text-muted);">${acessosHoje} hoje</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:${isMobile ? '8px 6px' : '12px 14px'};border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">📅 Último acesso</div>
                        <div style="font-size:${isMobile ? '10px' : '13px'};font-weight:600;color:var(--text-primary);">${ultimoAcessoFormatado}</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:${isMobile ? '8px 6px' : '12px 14px'};border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">✂️ Agendamentos</div>
                        <div style="font-size:${isMobile ? '14px' : '16px'};font-weight:700;color:#f59e0b;">${agendamentos.length}</div>
                        <div style="font-size:${isMobile ? '7px' : '10px'};color:var(--text-muted);">${agendamentosPendentes} pendentes</div>
                    </div>
                    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.05));border-radius:10px;padding:${isMobile ? '8px 6px' : '12px 14px'};border:1px solid rgba(16,185,129,0.1);text-align:center;">
                        <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">💰 Faturamento</div>
                        <div style="font-size:${isMobile ? '14px' : '16px'};font-weight:700;color:#22c55e;">R$ ${formatarMoeda(faturamentoTotal)}</div>
                        <div style="font-size:${isMobile ? '7px' : '10px'};color:var(--text-muted);">${agendamentosConcluidos} concluídos</div>
                    </div>
                </div>

                <!-- SEÇÃO DONOS - MOBILE -->
                <div style="background:var(--bg-card);border-radius:${isMobile ? '10px' : '12px'};padding:${isMobile ? '10px 12px' : '16px'};border:1px solid var(--border-color);margin-bottom:12px;">
                    <h4 style="margin:0 0 8px 0;font-size:${isMobile ? '13px' : '14px'};color:var(--text-primary);">
                        <i class="fas fa-crown" style="color:#f59e0b;"></i> Donos (${donos.length})
                    </h4>
                    ${donos.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table style="width:100%;font-size:${isMobile ? '11px' : '12px'};border-collapse:collapse;">
                                <thead>
                                    <tr style="background:var(--bg-hover);">
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '9px' : '11px'};">Nome</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '9px' : '11px'};">Email</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '9px' : '11px'};">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${donos.map(d => `
                                        <tr style="border-bottom:1px solid var(--border-color);">
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};font-weight:600;color:var(--text-primary);">${escapeHtml(d.nome)}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};color:var(--text-muted);font-size:${isMobile ? '10px' : '12px'};">${escapeHtml(d.email)}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;">
                                                <button onclick="editarUsuario(${d.id})" style="background:rgba(102,126,234,0.15);border:none;padding:${isMobile ? '2px 6px' : '2px 10px'};border-radius:4px;color:var(--primary);font-size:${isMobile ? '10px' : '11px'};cursor:pointer;">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Nenhum dono cadastrado.</div>'}
                </div>

                <!-- SEÇÃO PROFISSIONAIS - MOBILE -->
                <div style="background:var(--bg-card);border-radius:${isMobile ? '10px' : '12px'};padding:${isMobile ? '10px 12px' : '16px'};border:1px solid var(--border-color);margin-bottom:12px;">
                    <h4 style="margin:0 0 8px 0;font-size:${isMobile ? '13px' : '14px'};color:var(--text-primary);">
                        <i class="fas fa-users" style="color:var(--primary);"></i> Profissionais (${profissionais.length})
                    </h4>
                    ${profissionais.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table style="width:100%;font-size:${isMobile ? '11px' : '12px'};border-collapse:collapse;">
                                <thead>
                                    <tr style="background:var(--bg-hover);">
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '9px' : '11px'};">Nome</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '9px' : '11px'};">Comissão</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '9px' : '11px'};">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${profissionais.map(p => `
                                        <tr style="border-bottom:1px solid var(--border-color);">
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};font-weight:600;color:var(--text-primary);">${escapeHtml(p.nome)}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};">
                                                <span style="background:rgba(16,185,129,0.15);padding:1px 8px;border-radius:10px;color:#22c55e;font-weight:600;font-size:${isMobile ? '10px' : '12px'};">${p.comissao_percent || 0}%</span>
                                            </td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;">
                                                <button onclick="editarUsuario(${p.id})" style="background:rgba(102,126,234,0.15);border:none;padding:${isMobile ? '2px 6px' : '2px 10px'};border-radius:4px;color:var(--primary);font-size:${isMobile ? '10px' : '11px'};cursor:pointer;">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Nenhum profissional cadastrado.</div>'}
                </div>

                <!-- SEÇÃO CLIENTES - MOBILE (CARDS) -->
                <div style="background:var(--bg-card);border-radius:${isMobile ? '10px' : '12px'};padding:${isMobile ? '10px 12px' : '16px'};border:1px solid var(--border-color);margin-bottom:12px;">
                    <h4 style="margin:0 0 8px 0;font-size:${isMobile ? '13px' : '14px'};color:var(--text-primary);">
                        <i class="fas fa-address-book" style="color:#8b5cf6;"></i> Clientes (${clientes.length})
                    </h4>
                    ${clientes.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table style="width:100%;font-size:${isMobile ? '10px' : '12px'};border-collapse:collapse;">
                                <thead>
                                    <tr style="background:var(--bg-hover);">
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '8px' : '10px'};">Nome</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '8px' : '10px'};">Telefone</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '8px' : '10px'};">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${clientes.slice(0, isMobile ? 15 : 20).map(c => `
                                        <tr style="border-bottom:1px solid var(--border-color);">
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};font-weight:600;color:var(--text-primary);font-size:${isMobile ? '10px' : '12px'};">${escapeHtml(c.nome)}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};color:var(--text-muted);font-size:${isMobile ? '9px' : '11px'};">${escapeHtml(c.telefone || '-')}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;font-size:${isMobile ? '9px' : '11px'};">
                                                ${c.bloqueado_chatbot === 1 ? '🔒' : '✅'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${clientes.length > (isMobile ? 15 : 20) ? `
                                <div style="text-align:center;padding:6px;color:var(--text-muted);font-size:11px;">+ ${clientes.length - (isMobile ? 15 : 20)} clientes a mais...</div>
                            ` : ''}
                        </div>
                    ` : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Nenhum cliente cadastrado.</div>'}
                </div>

                <!-- SEÇÃO AGENDAMENTOS - MOBILE (CARDS) -->
                <div style="background:var(--bg-card);border-radius:${isMobile ? '10px' : '12px'};padding:${isMobile ? '10px 12px' : '16px'};border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
                        <h4 style="margin:0;font-size:${isMobile ? '13px' : '14px'};color:var(--text-primary);">
                            <i class="fas fa-calendar-alt" style="color:var(--primary);"></i> Agendamentos (${agendamentos.length})
                        </h4>
                        <div style="display:flex;gap:6px;font-size:${isMobile ? '9px' : '11px'};">
                            <span style="color:#f59e0b;">⏳ ${agendamentosPendentes}</span>
                            <span style="color:#22c55e;">✅ ${agendamentosConcluidos}</span>
                            ${agendamentosCancelados > 0 ? `<span style="color:#ef4444;">❌ ${agendamentosCancelados}</span>` : ''}
                        </div>
                    </div>
                    ${agendamentos.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table style="width:100%;font-size:${isMobile ? '10px' : '12px'};border-collapse:collapse;">
                                <thead>
                                    <tr style="background:var(--bg-hover);">
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '8px' : '10px'};">Cliente</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '8px' : '10px'};">Serviço</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:left;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '8px' : '10px'};">Data</th>
                                        <th style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;color:var(--text-muted);font-weight:600;font-size:${isMobile ? '8px' : '10px'};">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${agendamentos.slice(0, isMobile ? 10 : 15).map(a => `
                                        <tr style="border-bottom:1px solid var(--border-color);">
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};font-weight:500;color:var(--text-primary);font-size:${isMobile ? '9px' : '11px'};">${escapeHtml(a.cliente_nome || 'N/A')}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};color:var(--text-muted);font-size:${isMobile ? '9px' : '11px'};">${escapeHtml(a.servico || a.servico_nome || '-')}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};color:var(--text-muted);font-size:${isMobile ? '9px' : '11px'};">${formatarDataBr(a.data)}</td>
                                            <td style="padding:${isMobile ? '4px 6px' : '6px 10px'};text-align:center;">
                                                <span style="padding:2px 8px;border-radius:10px;font-size:${isMobile ? '8px' : '10px'};font-weight:600;background:${a.status === 'concluido' ? 'rgba(34,197,94,0.15)' : a.status === 'cancelado' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};color:${a.status === 'concluido' ? '#22c55e' : a.status === 'cancelado' ? '#ef4444' : '#f59e0b'};">
                                                    ${a.status || 'pendente'}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${agendamentos.length > (isMobile ? 10 : 15) ? `
                                <div style="text-align:center;padding:6px;color:var(--text-muted);font-size:11px;">+ ${agendamentos.length - (isMobile ? 10 : 15)} agendamentos a mais...</div>
                            ` : ''}
                        </div>
                    ` : '<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">Nenhum agendamento encontrado.</div>'}
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao carregar detalhes da empresa:', error);
        showToast('Erro ao carregar detalhes da empresa: ' + error.message, 'error');
    }
}
// ============================================
// EDITAR EMPRESA (PARA MUDAR PLANO/NOME)
// ============================================
async function editarEmpresa(id) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/empresas/${id}`, { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();

        if (data.success) {
            const empresa = data.data;
            // Cria o modal dinamicamente se não existir no HTML
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
                                        <option value="enterprise">Enterprise (R$ 249,90/mês)</option
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
            showToast('Erro ao carregar dados da empresa', 'error');
        }
    } catch (error) {
        showToast('Erro ao carregar dados da empresa', 'error');
    }
}

// ============================================
// SALVAR EMPRESA (EDITAR)
// ============================================
async function salvarEmpresa() {
    const id = document.getElementById('editEmpresaId').value;
    const nome = document.getElementById('editEmpresaNome').value;
    const plano = document.getElementById('editEmpresaPlano').value;

    if (!nome) {
        showToast('Nome da empresa é obrigatório', 'warning');
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ nome, plano })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('✅ Empresa e Plano atualizados com sucesso!', 'success');
            fecharModal('modalEditarEmpresa');
            carregarDashboardSuperAdmin();
        } else {
            showToast(data.message || 'Erro ao atualizar empresa', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao salvar empresa:', error);
        showToast('Erro ao atualizar empresa', 'error');
    }
}

// ============================================
// EDITAR USUÁRIO (RESTAURADO COMPLETO)
// ============================================
async function editarUsuario(id) {
    console.log('👤 Editando usuário ID:', id);
    if (!id) { showToast('ID do usuário não informado', 'error'); return; }

    const token = localStorage.getItem('token');
    if (!token) { showToast('Token não encontrado. Faça login novamente.', 'error'); return; }

    showLoading();
    try {
        const resUser = await fetch(`/api/admin/usuarios/${id}`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        if (!resUser.ok) throw new Error(`HTTP ${resUser.status}: ${resUser.statusText}`);
        const userData = await resUser.json();
        if (!userData.success || !userData.data) { showToast('Usuário não encontrado', 'error'); return; }

        const usuario = userData.data;
        let url = usuario.role === 'profissional' ? `/api/admin/profissionais/${id}` : `/api/admin/usuarios/${id}`;

        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        hideLoading();

        if (!data.success || !data.data) { showToast('Usuário não encontrado', 'error'); return; }

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

        showModal('✏️ Editar Usuário', modalContent, null);

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
        hideLoading();
        console.error('❌ Erro ao editar usuário:', error);
        showToast('Erro ao carregar dados do usuário: ' + error.message, 'error');
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
        showToast('Nome e email são obrigatórios', 'error');
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
            showToast('✅ Usuário atualizado com sucesso!', 'success');
            fecharModal();
            carregarDashboardSuperAdmin();
        } else {
            showToast('❌ ' + data.message, 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar usuário:', error);
        showToast('Erro ao salvar usuário: ' + error.message, 'error');
    }
}

// ============================================
// ESTENDER TRIAL
// ============================================
async function estenderTrial(empresaId) {
    if (!confirm('Estender trial por mais 30 dias?')) return;
    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${empresaId}/extender-trial`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('Trial estendido com sucesso! +30 dias', 'success');
            carregarDashboardSuperAdmin();
        } else {
            showToast(data.message || 'Erro ao estender trial', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Erro ao estender trial', 'error');
    }
}

// ============================================
// DELETAR EMPRESA (COM CONFIRMAÇÃO RIGOROSA)
// ============================================
async function deletarEmpresa(id, nome) {
    if (!confirm(`⚠️ TEM CERTEZA QUE DESEJA DELETAR A EMPRESA "${nome}"?\n\nIsso vai deletar PERMANENTEMENTE:\n• Todos os usuários (donos e profissionais)\n• Todos os clientes\n• Todos os agendamentos\n• Todos os serviços\n• Todos os horários\n• Todas as despesas\n• Todos os acessos\n\n📌 Esta ação NÃO pode ser desfeita!`)) {
        return;
    }

    const confirmacao = prompt(`Digite "DELETAR" para confirmar a exclusão da empresa "${nome}":`);
    if (confirmacao !== 'DELETAR') {
        showToast('❌ Exclusão cancelada - confirmação incorreta', 'warning');
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast(`✅ Empresa "${nome}" deletada com sucesso!`, 'success');
            setTimeout(() => carregarDashboardSuperAdmin(), 1000);
        } else {
            showToast('❌ ' + data.message, 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao deletar empresa:', error);
        showToast('❌ Erro ao deletar empresa: ' + error.message, 'error');
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
// ============================================
// PLANOS - GESTÃO COMPLETA (SUPER ADMIN)
// ============================================

let planosConfig = [];

async function carregarPlanosConfig() {
    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/admin/planos-config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
            planosConfig = data.data;
            renderizarGerenciadorPlanos();
        }
    } catch (error) {
        showToast('Erro ao carregar planos', 'error');
    }
    hideLoading();
}

function renderizarGerenciadorPlanos() {
    const html = `
        <div style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                <div>
                    <button onclick="carregarDashboardSuperAdmin()" style="background:var(--bg-hover);border:none;padding:4px 14px;border-radius:6px;cursor:pointer;color:var(--text-secondary);font-size:12px;">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                    <h2 style="margin:8px 0 0;font-size:24px;">💰 Gerenciador de Planos</h2>
                    <p style="color:var(--text-muted);font-size:13px;">Gerencie valores, promoções e recursos dos planos</p>
                </div>
                <button onclick="criarNovoPlano()" style="background:#22c55e;border:none;padding:10px 20px;border-radius:8px;color:white;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-plus"></i> Novo Plano
                </button>
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">
                ${planosConfig.map(plano => `
                    <div style="background:#1a1a2e;border-radius:14px;padding:18px;border:1px solid #2d2d3f;position:relative;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                            <div>
                                <div style="font-size:18px;font-weight:700;color:#fff;">${plano.nome}</div>
                                <div style="font-size:24px;font-weight:700;color:#667eea;margin:6px 0;">
                                    R$ ${plano.valor_mensal.toFixed(2)}
                                    <span style="font-size:12px;color:#888;font-weight:400;">/mês</span>
                                </div>
                                ${plano.valor_anual ? `
                                    <div style="font-size:14px;color:#22c55e;">
                                        R$ ${plano.valor_anual.toFixed(2)}/ano 
                                        <span style="font-size:11px;color:#888;">(economia de ${Math.round((1 - plano.valor_anual / (plano.valor_mensal * 12)) * 100)}%)</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div style="display:flex;gap:4px;">
                                <button onclick="editarPlano('${plano.id}')" style="padding:4px 10px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:rgba(102,126,234,0.15);color:#667eea;">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="duplicarPlano('${plano.id}')" style="padding:4px 10px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:rgba(34,197,94,0.15);color:#22c55e;">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button onclick="deletarPlano('${plano.id}')" style="padding:4px 10px;border:none;border-radius:6px;font-size:12px;cursor:pointer;background:rgba(239,68,68,0.15);color:#ef4444;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>

                        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
                            ${plano.popular ? `<span style="background:#f59e0b;padding:2px 10px;border-radius:12px;font-size:10px;color:white;">⭐ Popular</span>` : ''}
                            <span style="background:#2d2d3f;padding:2px 10px;border-radius:12px;font-size:10px;color:#888;">
                                👥 ${plano.profs === 'Ilimitado' ? '♾️' : plano.profs} profissionais
                            </span>
                            <span style="background:#2d2d3f;padding:2px 10px;border-radius:12px;font-size:10px;color:#888;">
                                📅 ${plano.agendamentos || 'Ilimitados'}
                            </span>
                        </div>

                        <div style="margin-top:12px;">
                            <div style="font-size:12px;color:#888;margin-bottom:4px;">Recursos:</div>
                            <div style="display:flex;flex-wrap:wrap;gap:4px;">
                                ${plano.recursos.map(r => `
                                    <span style="background:rgba(34,197,94,0.08);padding:2px 10px;border-radius:12px;font-size:10px;color:#22c55e;">
                                        ${r.replace('✅ ', '')}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div style="margin-top:12px;">
                            <div style="font-size:12px;color:#888;margin-bottom:4px;">Limitações:</div>
                            <div style="display:flex;flex-wrap:wrap;gap:4px;">
                                ${plano.limitacoes.map(l => `
                                    <span style="background:rgba(239,68,68,0.08);padding:2px 10px;border-radius:12px;font-size:10px;color:#ef4444;">
                                        ${l.replace('❌ ', '')}
                                    </span>
                                `).join('')}
                            </div>
                        </div>

                        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #2d2d3f;display:flex;gap:8px;font-size:11px;color:#888;">
                            <span>💳 <span style="color:#fff;">${plano.id}</span></span>
                            <span>•</span>
                            <span>${plano.cor || '#667eea'}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
}
async function editarPlano(planoId) {
    const plano = planosConfig.find(p => p.id === planoId);
    if (!plano) return;

    const modalContent = `
        <div style="padding:10px 0;">
            <form id="formEditarPlano">
                <input type="hidden" id="planoId" value="${plano.id}">
                
                <div class="form-group">
                    <label>ID do Plano (identificador único)</label>
                    <input type="text" id="planoIdInput" class="form-control" value="${plano.id}" placeholder="ex: starter">
                    <small style="color:var(--text-muted);font-size:10px;">Use letras minúsculas sem espaços</small>
                </div>
                
                <div class="form-group">
                    <label>Nome do Plano *</label>
                    <input type="text" id="planoNome" class="form-control" value="${plano.nome}" placeholder="ex: Starter">
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label>Valor Mensal (R$) *</label>
                        <input type="number" id="planoValorMensal" class="form-control" value="${plano.valor_mensal}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label>Valor Anual (R$)</label>
                        <input type="number" id="planoValorAnual" class="form-control" value="${plano.valor_anual || ''}" step="0.01">
                        <small style="color:var(--text-muted);font-size:10px;">Deixe em branco se não tiver</small>
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label>👥 Profissionais</label>
                        <input type="text" id="planoProfs" class="form-control" value="${plano.profs}" placeholder="5 ou Ilimitado">
                    </div>
                    <div class="form-group">
                        <label>📅 Agendamentos/mês</label>
                        <input type="text" id="planoAgendamentos" class="form-control" value="${plano.agendamentos || 'Ilimitados'}" placeholder="100 ou Ilimitados">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>🎨 Cor do Plano</label>
                    <input type="color" id="planoCor" class="form-control" value="${plano.cor || '#667eea'}" style="height:40px;padding:2px;">
                </div>
                
                <div class="form-group">
                    <label>⭐ Popular</label>
                    <select id="planoPopular" class="form-control">
                        <option value="true" ${plano.popular ? 'selected' : ''}>Sim</option>
                        <option value="false" ${!plano.popular ? 'selected' : ''}>Não</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>✅ Recursos (um por linha)</label>
                    <textarea id="planoRecursos" class="form-control" rows="4" placeholder="Ex: ✅ Chatbot Inteligente">${plano.recursos.join('\n')}</textarea>
                    <small style="color:var(--text-muted);font-size:10px;">Cada recurso em uma nova linha</small>
                </div>
                
                <div class="form-group">
                    <label>❌ Limitações (um por linha)</label>
                    <textarea id="planoLimitacoes" class="form-control" rows="2" placeholder="Ex: ❌ Sem WhatsApp Business">${(plano.limitacoes || []).join('\n')}</textarea>
                </div>
                
                <div style="display:flex;gap:8px;margin-top:12px;">
                    <button type="submit" class="btn-3d" style="flex:1;"><i class="fas fa-save"></i> Salvar Plano</button>
                    <button type="button" onclick="fecharModalEditarPlano()" class="btn-secondary">Cancelar</button>
                </div>
            </form>
        </div>
    `;

    showModal('✏️ Editar Plano', modalContent, null);

    setTimeout(() => {
        const form = document.getElementById('formEditarPlano');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                salvarPlanoConfig();
            });
        }
    }, 200);
}

function fecharModalEditarPlano() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

async function salvarPlanoConfig() {
    const id = document.getElementById('planoId').value;
    const nome = document.getElementById('planoNome').value;
    const valor_mensal = parseFloat(document.getElementById('planoValorMensal').value);
    const valor_anual = parseFloat(document.getElementById('planoValorAnual').value) || null;
    const profs = document.getElementById('planoProfs').value;
    const agendamentos = document.getElementById('planoAgendamentos').value;
    const cor = document.getElementById('planoCor').value;
    const popular = document.getElementById('planoPopular').value === 'true';
    const recursos = document.getElementById('planoRecursos').value.split('\n').filter(r => r.trim());
    const limitacoes = document.getElementById('planoLimitacoes').value.split('\n').filter(l => l.trim());

    if (!nome || !valor_mensal) {
        showToast('Nome e valor mensal são obrigatórios', 'warning');
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/admin/planos-config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                id,
                nome,
                valor_mensal,
                valor_anual,
                profs,
                agendamentos,
                cor,
                popular,
                recursos,
                limitacoes
            })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('✅ Plano atualizado com sucesso!', 'success');
            fecharModalEditarPlano();
            carregarPlanosConfig();
        } else {
            showToast(data.message || 'Erro ao salvar plano', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Erro ao salvar plano', 'error');
    }
}
// ============================================
// FUNÇÃO AUXILIAR: VERIFICAR MOBILE
// ============================================
function isMobile() {
    return window.innerWidth < 768;
}
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

console.log('✅ empresas.js carregado com Dashboard Super Admin COMPLETO e RICO!');