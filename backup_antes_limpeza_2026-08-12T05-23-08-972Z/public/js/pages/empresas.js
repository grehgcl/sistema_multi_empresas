// ============================================
// SUPER ADMIN - GESTÃO COMPLETA DE EMPRESAS (VERSÃO FUNDIDA E MELHORADA)
// ============================================
let empresasData = [];
let usuariosData = [];
let empresasTimeout = null;

// ============================================
// 🏢 SUPER ADMIN - DASHBOARD COMPLETO (COM MODO DE PAGAMENTO + RIQUEZA DE DETALHES)
// ============================================
async function carregarDashboardSuperAdmin() {
    ativarBotao('dashboard');
    showLoading();
    const token = localStorage.getItem('token');

    try {
        // public/js/pages/empresas.js

        const [statsRes, empresasRes, usuariosRes, paymentRes] = await Promise.all([
            fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/empresas', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/usuarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            // 🔥 CORRIGIR: /api/payment/config → /api/pagamento/config
            fetch('/api/pagamento/config', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const stats = (await statsRes.json()).data || {};
        const empresas = (await empresasRes.json()).data || [];
        const usuarios = (await usuariosRes.json()).data || [];

        // 🔥 MODO DE PAGAMENTO - COM FALLBACK
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
        console.log('💳 Modo de pagamento:', paymentData.mode);

        // Cálculos
        const totalEmpresas = empresas.length;
        const empresasAtivas = empresas.filter(e => e.assinatura_ativa === 1 || e.assinatura_ativa === true).length;
        const empresasTrial = empresas.filter(e => e.plano === 'trial' || e.plano === 'Trial').length;
        const empresasPagas = empresas.filter(e => e.plano !== 'trial' && e.plano !== 'Trial' && e.plano !== null).length;
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

        const html = `
            <div style="padding:16px;max-width:1400px;margin:0 auto;">
                <!-- CABEÇALHO -->
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2d2d3f;">
                    <div>
                        <h1 style="font-size:24px;font-weight:700;margin:0;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">🏢 Dashboard Super Admin</h1>
                        <p style="color:#888;font-size:13px;margin:2px 0 0;">
                            <i class="fas fa-calendar-alt"></i> ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button onclick="carregarDashboardSuperAdmin()" style="background:#667eea;border:none;padding:8px 20px;border-radius:8px;color:white;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>

                <!-- 🔥 CARD - MODO DE PAGAMENTO (NOVO) -->
                <div style="
                    background: ${isReal ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'}; 
                    border: 1px solid ${isReal ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}; 
                    border-radius: 12px; 
                    padding: 16px 20px; 
                    margin-bottom: 20px;
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    flex-wrap: wrap;
                    gap: 12px;
                ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 28px;">${isReal ? '🔴' : '🟡'}</span>
                        <div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">
                                💳 Modo de Pagamento: <span style="color: ${isReal ? '#ef4444' : '#f59e0b'};">${paymentData.label}</span>
                            </div>
                            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                                ${isReal ? '⚠️ Pagamentos REAIS estão ativos! Os clientes serão cobrados de verdade.' : '🔸 Modo SIMULAÇÃO ativo. Nenhum pagamento real é processado.'}
                            </div>
                        </div>
                    </div>
                    <button onclick="alternarModoPagamento()" style="
                        padding: 8px 20px;
                        border: none;
                        border-radius: 10px;
                        background: ${isReal ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
                        color: ${isReal ? '#ef4444' : '#22c55e'};
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        <i class="fas fa-${isReal ? 'toggle-on' : 'toggle-off'}"></i>
                        ${isReal ? 'Desativar Pagamentos Reais' : 'Ativar Pagamentos Reais'}
                    </button>
                </div>

                <!-- ALERTA -->
                <div style="padding:12px 18px;border-radius:12px;margin-bottom:20px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                    <span style="font-size:20px;">✅</span>
                    <div>
                        <div style="font-size:14px;font-weight:600;color:#22c55e;">Painel de Controle Completo</div>
                        <div style="font-size:12px;color:#888;">Gerencie empresas, planos, usuários e configurações de pagamento.</div>
                    </div>
                </div>

                <!-- CARDS DE MÉTRICAS -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:24px;">
                    <div style="background:#1a1a2e;border-radius:14px;padding:16px 18px;border:1px solid #2d2d3f;transition:all 0.3s;">
                        <div style="font-size:24px;display:block;margin-bottom:4px;">🏢</div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Total Empresas</div>
                        <div style="font-size:28px;font-weight:700;color:#fff;margin:2px 0;">${totalEmpresas}</div>
                        <div style="display:flex;gap:10px;font-size:11px;color:#888;margin-top:4px;flex-wrap:wrap;">
                            <span style="padding:2px 10px;border-radius:12px;background:rgba(34,197,94,0.15);color:#22c55e;">${empresasAtivas} ativas</span>
                            <span style="padding:2px 10px;border-radius:12px;background:rgba(245,158,11,0.15);color:#f59e0b;">${empresasTrial} trial</span>
                        </div>
                        <div style="height:3px;background:#2d2d3f;border-radius:2px;margin-top:8px;overflow:hidden;">
                            <div style="height:100%;width:${totalEmpresas > 0 ? (empresasAtivas / totalEmpresas * 100) : 0}%;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:2px;"></div>
                        </div>
                    </div>

                    <div style="background:#1a1a2e;border-radius:14px;padding:16px 18px;border:1px solid #2d2d3f;">
                        <div style="font-size:24px;display:block;margin-bottom:4px;">👥</div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Usuários</div>
                        <div style="font-size:28px;font-weight:700;color:#fff;margin:2px 0;">${usuarios.length}</div>
                        <div style="display:flex;gap:10px;font-size:11px;color:#888;margin-top:4px;flex-wrap:wrap;">
                            <span style="padding:2px 10px;border-radius:12px;background:rgba(245,158,11,0.15);color:#f59e0b;">👑 ${totalDonos} donos</span>
                            <span style="padding:2px 10px;border-radius:12px;background:rgba(102,126,234,0.15);color:#667eea;">👤 ${totalProfissionais} profs</span>
                        </div>
                    </div>

                    <div style="background:#1a1a2e;border-radius:14px;padding:16px 18px;border:1px solid #2d2d3f;">
                        <div style="font-size:24px;display:block;margin-bottom:4px;">👤</div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Clientes</div>
                        <div style="font-size:28px;font-weight:700;color:#fff;margin:2px 0;">${totalClientes}</div>
                        <div style="display:flex;gap:10px;font-size:11px;color:#888;margin-top:4px;">
                            <span style="padding:2px 10px;border-radius:12px;background:rgba(102,126,234,0.15);color:#667eea;">em todas as empresas</span>
                        </div>

                    </div>

                    <div style="background:#1a1a2e;border-radius:14px;padding:16px 18px;border:1px solid #2d2d3f;">
                        <div style="font-size:24px;display:block;margin-bottom:4px;">✂️</div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Agendamentos</div>
                        <div style="font-size:28px;font-weight:700;color:#fff;margin:2px 0;">${totalAgendamentos}</div>
                        <div style="display:flex;gap:10px;font-size:11px;color:#888;margin-top:4px;">
                            <span style="padding:2px 10px;border-radius:12px;background:rgba(34,197,94,0.15);color:#22c55e;">+${agendamentosMes} este mês</span>
                        </div>
                    </div>

                    <div style="background:#1a1a2e;border-radius:14px;padding:16px 18px;border:1px solid #2d2d3f;">
                        <div style="font-size:24px;display:block;margin-bottom:4px;">💰</div>
                        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Faturamento</div>
                        <div style="font-size:28px;font-weight:700;color:#f59e0b;margin:2px 0;">R$ ${formatarMoeda(faturamentoMes)}</div>
                        <div style="display:flex;gap:10px;font-size:11px;color:#888;margin-top:4px;">
                            <span style="padding:2px 10px;border-radius:12px;background:rgba(102,126,234,0.15);color:#667eea;">${empresasPagas} empresas pagas</span>
                        </div>
                    </div>
                </div>

                <!-- TABELA DE EMPRESAS (RICA, COM TODAS AS COLUNAS) -->
                <div style="background:#1a1a2e;border-radius:14px;padding:18px;border:1px solid #2d2d3f;margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #2d2d3f;">
                        <div>
                            <h3 style="margin:0;font-size:16px;font-weight:600;color:#fff;">📋 Todas as Empresas <span style="font-size:12px;color:#888;font-weight:400;">(${totalEmpresas})</span></h3>
                            <div style="display:flex;gap:12px;font-size:12px;color:#888;margin-top:4px;flex-wrap:wrap;">
                                <span style="display:flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;background:#2d2d3f;color:#22c55e;">🟢 ${empresasAtivas} ativas</span>
                                <span style="display:flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;background:#2d2d3f;color:#f59e0b;">🟡 ${empresasTrial} trial</span>
                                <span style="display:flex;align-items:center;gap:4px;padding:2px 10px;border-radius:12px;background:#2d2d3f;color:#ef4444;">🔴 ${empresasExpiradas.length} expiradas</span>
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <input type="text" id="buscarEmpresa" placeholder="🔍 Buscar empresa..." oninput="filtrarEmpresas()" style="background:#2d2d3f;border:1px solid #3d3d5f;border-radius:8px;padding:6px 14px;font-size:12px;color:#fff;min-height:36px;">
                            <select id="filtroStatus" onchange="filtrarEmpresas()" style="background:#2d2d3f;border:1px solid #3d3d5f;border-radius:8px;padding:6px 14px;font-size:12px;color:#fff;min-height:36px;">
                                <option value="">📋 Todos</option>
                                <option value="ativo">🟢 Ativos</option>
                                <option value="trial">🟡 Trial</option>
                                <option value="expirado">🔴 Expirados</option>
                            </select>
                        </div>
                    </div>

                    <div style="overflow-x:auto;margin:0 -4px;padding:0 4px;">
                        <table style="width:100%;min-width:950px;border-collapse:separate;border-spacing:0 6px;font-size:13px;">
                            <thead>
                                <tr>
                                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;border-radius:8px 0 0 0;">#</th>
                                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">Empresa</th>
                                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">Plano</th>
                                    <th style="padding:10px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">Status</th>
                                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">⏳ Dias</th>
                                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">👑</th>
                                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">👤</th>
                                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">👥</th>
                                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">✂️</th>
                                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;">💬 WhatsApp</th>
                                    <th style="padding:10px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;background:#1a1a2e;border-radius:0 8px 0 0;">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="listaEmpresas">
                                ${empresas.map((e, idx) => {
            const isTrial = e.plano === 'trial' || e.plano === 'Trial';
            const isAtivo = e.assinatura_ativa === 1 || e.assinatura_ativa === true;

            let diasRestantes = 0;
            let isIlimitado = false;

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
            } else {
                isIlimitado = true;
                diasRestantes = 999;
            }

            let diasColor = '#22c55e';
            let diasTexto = '♾️';
            if (!isIlimitado) {
                if (diasRestantes <= 0) { diasColor = '#ef4444'; diasTexto = '0d 🔴'; }
                else if (diasRestantes <= 3) { diasColor = '#ef4444'; diasTexto = diasRestantes + 'd 🔴'; }
                else if (diasRestantes <= 7) { diasColor = '#f59e0b'; diasTexto = diasRestantes + 'd ⚠️'; }
                else { diasColor = '#22c55e'; diasTexto = diasRestantes + 'd'; }
            }

            let statusColor = '#22c55e';
            let statusText = '✅ Ativo';
            let statusBg = 'rgba(34,197,94,0.12)';
            let statusBorder = 'rgba(34,197,94,0.15)';

            if (isTrial) {
                if (diasRestantes <= 0) {
                    statusColor = '#ef4444'; statusText = '⛔ Expirado';
                    statusBg = 'rgba(239,68,68,0.12)'; statusBorder = 'rgba(239,68,68,0.15)';
                } else {
                    statusColor = '#f59e0b'; statusText = '🔄 Trial';
                    statusBg = 'rgba(245,158,11,0.12)'; statusBorder = 'rgba(245,158,11,0.15)';
                }
            } else if (!isAtivo) {
                statusColor = '#94a3b8'; statusText = '⛔ Inativo';
                statusBg = 'rgba(148,163,184,0.12)'; statusBorder = 'rgba(148,163,184,0.15)';
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

            const whatsappHabilitado = e.whatsapp_proprio_habilitado === true || e.whatsapp_proprio_habilitado === 1 || e.whatsapp_proprio_habilitado === 't';
            const whatsappConectado = e.whatsapp_connected === true || e.whatsapp_connected === 1 || e.whatsapp_connected === 't';

            let whatsappStatus = '';
            if (!whatsappHabilitado) {
                whatsappStatus = `<button onclick="toggleWhatsAppProprio(${e.id}, true)" style="padding:4px 10px;border:none;border-radius:6px;font-size:10px;cursor:pointer;background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.25)'" onmouseout="this.style.background='rgba(239,68,68,0.15)'" title="Clique para HABILITAR">🔴 OFF</button>`;
            } else if (!whatsappConectado) {
                whatsappStatus = `<button onclick="toggleWhatsAppProprio(${e.id}, false)" style="padding:4px 10px;border:none;border-radius:6px;font-size:10px;cursor:pointer;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);transition:all 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.25)'" onmouseout="this.style.background='rgba(245,158,11,0.15)'" title="Habilitado mas não conectado">🟡 PEND</button>`;
            } else {
                whatsappStatus = `<button onclick="toggleWhatsAppProprio(${e.id}, false)" style="padding:4px 10px;border:none;border-radius:6px;font-size:10px;cursor:pointer;background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);transition:all 0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'" title="✅ WhatsApp PRÓPRIO ativo!">🟢 ON</button>`;
            }

            return `
                                        <tr data-status="${isTrial ? 'trial' : isAtivo ? 'ativo' : 'inativo'}" data-nome="${e.nome.toLowerCase()}" style="background:#252540;border-radius:10px;transition:all 0.2s;cursor:default;">
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;border-radius:10px 0 0 10px;font-weight:600;color:#666;font-size:12px;text-align:center;">${idx + 1}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;font-weight:600;color:#fff;font-size:14px;">${escapeHtml(e.nome)}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;"><span style="padding:3px 14px;border-radius:20px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;background:${planoBg};color:${planoColor};border:1px solid ${planoColor}33;">${planoText}</span></td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;"><span style="padding:4px 14px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:6px;background:${statusBg};color:${statusColor};border:1px solid ${statusBorder};">${statusText}</span></td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;font-weight:700;color:${diasColor};text-align:center;font-size:14px;">${diasTexto}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;font-weight:600;color:#fff;text-align:center;font-size:14px;">${donos}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;font-weight:600;color:#fff;text-align:center;font-size:14px;">${profissionais}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;font-weight:600;color:#fff;text-align:center;font-size:14px;">${clientes}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;font-weight:600;color:#667eea;text-align:center;font-size:15px;">${agendamentos}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;text-align:center;">${whatsappStatus}</td>
                                            <td style="padding:10px 12px;vertical-align:middle;border-bottom:none;border-radius:0 10px 10px 0;">
                                                <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">
                                                    <button onclick="verEmpresa(${e.id})" style="padding:4px 8px;border:none;border-radius:6px;font-size:11px;cursor:pointer;background:#1a1a2e;border:1px solid rgba(102,126,234,0.2);color:#667eea;transition:all 0.2s;" onmouseover="this.style.background='rgba(102,126,234,0.15)'" onmouseout="this.style.background='#1a1a2e'" title="Ver detalhes"><i class="fas fa-eye"></i></button>
                                                    <button onclick="editarEmpresa(${e.id})" style="padding:4px 8px;border:none;border-radius:6px;font-size:11px;cursor:pointer;background:#1a1a2e;border:1px solid rgba(245,158,11,0.2);color:#f59e0b;transition:all 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.15)'" onmouseout="this.style.background='#1a1a2e'" title="Editar plano/nome"><i class="fas fa-edit"></i></button>
                                                    ${isTrial ? `<button onclick="estenderTrial(${e.id})" style="padding:4px 8px;border:none;border-radius:6px;font-size:11px;cursor:pointer;background:#1a1a2e;border:1px solid rgba(34,197,94,0.2);color:#22c55e;transition:all 0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.15)'" onmouseout="this.style.background='#1a1a2e'" title="Estender Trial"><i class="fas fa-clock"></i></button>` : ''}
                                                    <button onclick="deletarEmpresa(${e.id}, '${escapeHtml(e.nome)}')" style="padding:4px 8px;border:none;border-radius:6px;font-size:11px;cursor:pointer;background:#1a1a2e;border:1px solid rgba(239,68,68,0.2);color:#ef4444;transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.15)'" onmouseout="this.style.background='#1a1a2e'" title="Deletar"><i class="fas fa-trash"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- SEÇÃO: ÚLTIMOS USUÁRIOS CADASTRADOS -->
                <div style="background:#1a1a2e;border-radius:14px;padding:18px;border:1px solid #2d2d3f;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
                        <h3 style="margin:0;font-size:16px;font-weight:600;color:#fff;">👥 Últimos Usuários Cadastrados</h3>
                        <span style="font-size:12px;color:#888;background:#2d2d3f;padding:4px 14px;border-radius:20px;">Total: ${usuarios.length}</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:500px;">
                            <thead>
                                <tr>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;">Nome</th>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;">Email</th>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;">Role</th>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;">Empresa</th>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;">Cadastro</th>
                                    <th style="padding:8px 12px;text-align:center;font-weight:600;color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #2d2d3f;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuarios.slice(0, 10).map(u => {
            const empresa = empresas.find(e => e.id === u.empresa_id);
            let roleColor = '#f59e0b';
            let roleBg = 'rgba(245,158,11,0.15)';
            let roleLabel = '🟠 Dono';
            if (u.role === 'superadmin') { roleColor = '#ef4444'; roleBg = 'rgba(239,68,68,0.15)'; roleLabel = '🔴 Super Admin'; }
            else if (u.role === 'profissional') { roleColor = '#667eea'; roleBg = 'rgba(102,126,234,0.15)'; roleLabel = '🔵 Profissional'; }

            return `
                                        <tr style="transition:background 0.2s;cursor:default;" onmouseover="this.style.background='#2d2d3f'" onmouseout="this.style.background='transparent'">
                                            <td style="padding:8px 12px;border-bottom:1px solid #2d2d3f;font-weight:600;color:#fff;">${escapeHtml(u.nome)}</td>
                                            <td style="padding:8px 12px;border-bottom:1px solid #2d2d3f;font-size:12px;color:#888;">${escapeHtml(u.email)}</td>
                                            <td style="padding:8px 12px;border-bottom:1px solid #2d2d3f;"><span style="padding:3px 12px;border-radius:20px;font-size:11px;font-weight:500;background:${roleBg};color:${roleColor};">${roleLabel}</span></td>
                                            <td style="padding:8px 12px;border-bottom:1px solid #2d2d3f;font-size:12px;">${empresa ? escapeHtml(empresa.nome) : 'N/A'}</td>
                                            <td style="padding:8px 12px;border-bottom:1px solid #2d2d3f;font-size:12px;color:#888;">${formatarDataBr(u.created_at)}</td>
                                            <td style="padding:8px 12px;border-bottom:1px solid #2d2d3f;text-align:center;">
                                                <button onclick="editarUsuario(${u.id})" style="padding:4px 10px;border:none;border-radius:6px;font-size:11px;cursor:pointer;background:#1a1a2e;border:1px solid rgba(245,158,11,0.2);color:#f59e0b;transition:all 0.2s;" onmouseover="this.style.background='rgba(245,158,11,0.15)'" onmouseout="this.style.background='#1a1a2e'"><i class="fas fa-edit"></i></button>
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

    } catch (error) {
        console.error('❌ Erro:', error);
        hideLoading();
        document.getElementById('content').innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size:48px;color:#ef4444;"></i>
                <p style="margin:12px 0;font-size:18px;color:#fff;">Erro ao carregar dashboard</p>
                <p style="color:#888;font-size:14px;">${error.message}</p>
                <button onclick="carregarDashboardSuperAdmin()" style="background:#667eea;border:none;padding:10px 24px;border-radius:8px;color:white;font-size:14px;cursor:pointer;margin-top:12px;">
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
// 🔥 TOGGLE WHATSAPP PRÓPRIO - CORRIGIDO
// ============================================
async function toggleWhatsAppProprio(empresaId, habilitar) {
    const acao = habilitar ? 'HABILITAR' : 'DESABILITAR';

    const msgConfirmacao = habilitar
        ? `🟢 Deseja realmente HABILITAR o WhatsApp próprio desta empresa?\n\n✅ A empresa poderá conectar seu próprio WhatsApp\n📱 Uma nova instância será criada na Evolution`
        : `🔴 Deseja realmente DESABILITAR o WhatsApp próprio desta empresa?\n\n⚠️ A empresa voltará a usar o WhatsApp compartilhado\n🗑️ A instância será DELETADA da Evolution`;

    if (!confirm(msgConfirmacao)) {
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${empresaId}/whatsapp-proprio`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ habilitado: habilitar })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast(data.message, 'success');

            // 🔥 FORÇAR RECARREGAMENTO
            setTimeout(() => {
                if (typeof carregarDashboardSuperAdmin === 'function') {
                    carregarDashboardSuperAdmin();
                } else if (typeof carregarDashboard === 'function') {
                    carregarDashboard();
                } else {
                    location.reload();
                }
            }, 1500);

        } else {
            showToast(data.message || 'Erro ao atualizar WhatsApp', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        showToast('Erro ao atualizar WhatsApp: ' + error.message, 'error');
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
// VER EMPRESA - VERSÃO COMPLETA E DETALHADA
// ============================================
async function verEmpresa(id) {
    console.log('👁️ Ver empresa ID:', id);
    showLoading();
    const token = localStorage.getItem('token');

    try {
        const [empresaRes, usuariosRes, clientesRes, agendamentosRes, acessosRes, localizacaoRes] = await Promise.all([
            fetch(`/api/admin/empresas/${id}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/usuarios`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/clientes`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/agendamentos`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/acessos`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/localizacao`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const empresa = (await empresaRes.json()).data || {};
        const usuarios = (await usuariosRes.json()).data || [];
        const clientes = (await clientesRes.json()).data || [];
        const agendamentos = (await agendamentosRes.json()).data || [];
        const acessos = (await acessosRes.json()).data || [];
        const localizacao = (await localizacaoRes.json()).data || {};

        const donos = usuarios.filter(u => u.tipo === 'dono' || u.role === 'dono');
        const profissionais = usuarios.filter(u => u.tipo === 'profissional' || u.role === 'profissional');

        // ============================================
        // 🔥 CALCULAR STATUS E DIAS RESTANTES
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

        // ============================================
        // 🔥 DEFINIR STATUS COLOR E TEXT
        // ============================================
        let statusColor = '#22c55e';
        let statusText = '✅ Ativo';

        if (isTrial) {
            if (diasRestantes <= 0) {
                statusColor = '#ef4444';
                statusText = '⛔ Expirado';
            } else if (diasRestantes <= 7) {
                statusColor = '#f59e0b';
                statusText = `⚠️ ${diasRestantes} dias restantes`;
            } else {
                statusColor = '#22c55e';
                statusText = `✅ ${diasRestantes} dias restantes`;
            }
        } else if (!isAtivo) {
            statusColor = '#ef4444';
            statusText = '⛔ Inativo';
        }

        // ============================================
        // 🔥 CALCULAR OUTRAS MÉTRICAS
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
            .reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

        // ============================================
        // 📝 GERAR HTML
        // ============================================
        const html = `
            <div class="fade-in">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
                    <div>
                        <button onclick="carregarDashboardSuperAdmin()" style="background:var(--bg-hover);border:none;padding:4px 14px;border-radius:6px;cursor:pointer;color:var(--text-secondary);font-size:12px;">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <h2 style="margin:8px 0 0;font-size:24px;">🏢 ${escapeHtml(empresa.nome)}</h2>
                        <p style="margin:2px 0 0;color:var(--text-muted);font-size:13px;">
                            <i class="fas fa-calendar"></i> Criado em ${formatarDataBr(empresa.created_at)}
                            ${empresa.dono_nome ? `• 👑 Dono: ${escapeHtml(empresa.dono_nome)}` : ''}
                        </p>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <span style="background:${statusColor}22;padding:4px 14px;border-radius:8px;color:${statusColor};font-size:12px;font-weight:600;border:1px solid ${statusColor}44;">${statusText}</span>
                        <button onclick="editarEmpresa(${empresa.id})" style="background:var(--primary);border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;">
                            <i class="fas fa-edit"></i> Editar Plano
                        </button>
                        ${isTrial ? `
                            <button onclick="estenderTrial(${empresa.id})" style="background:#22c55e;border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;">
                                <i class="fas fa-clock"></i> +30 dias
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <!-- CARDS DE MÉTRICAS -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px;">
                    <div style="background:var(--bg-card);border-radius:10px;padding:12px 14px;border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:11px;color:var(--text-muted);">Plano</div>
                        <div style="font-size:16px;font-weight:700;">${isTrial ? 'Trial' : empresa.plano || 'N/A'}</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:12px 14px;border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:11px;color:var(--text-muted);">👥 Usuários</div>
                        <div style="font-size:16px;font-weight:700;">${usuarios.length}</div>
                        <div style="font-size:10px;color:var(--text-muted);">${donos.length} donos, ${profissionais.length} prof</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:12px 14px;border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:11px;color:var(--text-muted);">📊 Acessos</div>
                        <div style="font-size:16px;font-weight:700;">${totalAcessos}</div>
                        <div style="font-size:10px;color:var(--text-muted);">${acessosHoje} hoje</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:12px 14px;border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:11px;color:var(--text-muted);">📅 Último acesso</div>
                        <div style="font-size:13px;font-weight:600;">${ultimoAcessoFormatado}</div>
                    </div>
                    <div style="background:var(--bg-card);border-radius:10px;padding:12px 14px;border:1px solid var(--border-color);text-align:center;">
                        <div style="font-size:11px;color:var(--text-muted);">✂️ Agendamentos</div>
                        <div style="font-size:16px;font-weight:700;">${agendamentos.length}</div>
                        <div style="font-size:10px;color:var(--text-muted);">${agendamentosPendentes} pendentes</div>
                    </div>
                    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.05));border-radius:10px;padding:12px 14px;border:1px solid rgba(16,185,129,0.1);text-align:center;">
                        <div style="font-size:11px;color:var(--text-muted);">💰 Faturamento</div>
                        <div style="font-size:16px;font-weight:700;color:#22c55e;">R$ ${formatarMoeda(faturamentoTotal)}</div>
                        <div style="font-size:10px;color:var(--text-muted);">${agendamentosConcluidos} concluídos</div>
                    </div>
                </div>

                <!-- LOCALIZAÇÃO DO CADASTRO -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-map-marker-alt" style="color:#22c55e;"></i> 
                        Localização do Cadastro
                        <span style="font-size:11px;color:var(--text-muted);font-weight:400;">
                            ${localizacao.created_at ? `• ${formatarDataHora(localizacao.created_at)}` : ''}
                        </span>
                    </h4>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
                        <div style="background:var(--bg-hover);padding:10px;border-radius:8px;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">📡 IP</div>
                            <div style="font-size:14px;font-weight:600;font-family:monospace;color:var(--text-primary);">
                                ${localizacao.ip || 'N/A'}
                            </div>
                        </div>
                        <div style="background:var(--bg-hover);padding:10px;border-radius:8px;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">🌍 Cidade</div>
                            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">
                                ${localizacao.cidade || 'N/A'}
                            </div>
                        </div>
                        <div style="background:var(--bg-hover);padding:10px;border-radius:8px;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">📍 Estado</div>
                            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">
                                ${localizacao.estado || 'N/A'}
                            </div>
                        </div>
                        <div style="background:var(--bg-hover);padding:10px;border-radius:8px;">
                            <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">🏢 ISP</div>
                            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">
                                ${localizacao.isp || 'N/A'}
                            </div>
                        </div>
                    </div>
                    ${localizacao.latitude && localizacao.longitude ? `
                        <div style="margin-top:10px;text-align:center;">
                            <a href="https://www.google.com/maps?q=${localizacao.latitude},${localizacao.longitude}" target="_blank" 
                               style="color:#667eea;font-size:12px;text-decoration:none;background:rgba(102,126,234,0.08);padding:6px 16px;border-radius:8px;display:inline-flex;align-items:center;gap:6px;">
                                <i class="fas fa-map"></i> Ver no Google Maps
                            </a>
                        </div>
                    ` : ''}
                </div>

                <!-- SEÇÃO DONOS -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;"><i class="fas fa-crown" style="color:#f59e0b;"></i> Donos (${donos.length})</h4>
                    ${donos.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;width:100%">
                                <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Cadastro</th><th>Ações</th></tr></thead>
                                <tbody>
                                    ${donos.map(d => `<tr>
                                        <td style="font-weight:600;">${escapeHtml(d.nome)}</td>
                                        <td>${escapeHtml(d.email)}</td>
                                        <td>${escapeHtml(d.telefone || '-')}</td>
                                        <td style="font-size:11px;color:var(--text-muted);">${formatarDataBr(d.created_at)}</td>
                                        <td><button onclick="editarUsuario(${d.id})" style="background:rgba(102,126,234,0.15);border:none;padding:2px 12px;border-radius:4px;color:var(--primary);font-size:11px;cursor:pointer;"><i class="fas fa-edit"></i></button></td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:var(--text-muted);">Nenhum dono cadastrado.</div>'}
                </div>

                <!-- SEÇÃO PROFISSIONAIS -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;"><i class="fas fa-users" style="color:var(--primary);"></i> Profissionais (${profissionais.length})</h4>
                    ${profissionais.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;width:100%">
                                <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Comissão</th><th>Cadastro</th><th>Ações</th></tr></thead>
                                <tbody>
                                    ${profissionais.map(p => `<tr>
                                        <td style="font-weight:600;">${escapeHtml(p.nome)}</td>
                                        <td>${escapeHtml(p.email)}</td>
                                        <td>${escapeHtml(p.telefone || '-')}</td>
                                        <td><span style="background:rgba(16,185,129,0.15);padding:2px 10px;border-radius:12px;color:#22c55e;font-weight:600;">${p.comissao_percent || 0}%</span></td>
                                        <td style="font-size:11px;color:var(--text-muted);">${formatarDataBr(p.created_at)}</td>
                                        <td><button onclick="editarUsuario(${p.id})" style="background:rgba(102,126,234,0.15);border:none;padding:2px 12px;border-radius:4px;color:var(--primary);font-size:11px;cursor:pointer;"><i class="fas fa-edit"></i></button></td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:var(--text-muted);">Nenhum profissional cadastrado.</div>'}
                </div>

                <!-- SEÇÃO CLIENTES -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <h4 style="margin:0 0 12px 0;font-size:14px;"><i class="fas fa-address-book" style="color:#8b5cf6;"></i> Clientes (${clientes.length})</h4>
                    ${clientes.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;width:100%">
                                <thead><tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Cadastro</th><th>Status</th></tr></thead>
                                <tbody>
                                    ${clientes.slice(0, 20).map(c => `<tr>
                                        <td style="font-weight:600;">${escapeHtml(c.nome)}</td>
                                        <td>${escapeHtml(c.telefone || '-')}</td>
                                        <td>${escapeHtml(c.email || '-')}</td>
                                        <td style="font-size:11px;color:var(--text-muted);">${formatarDataBr(c.created_at)}</td>
                                        <td>${c.bloqueado_chatbot === 1 ? '🔒 Bloqueado' : '✅ Ativo'}</td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                            ${clientes.length > 20 ? `<div style="text-align:center;padding:8px;color:var(--text-muted);font-size:12px;">+ ${clientes.length - 20} clientes a mais...</div>` : ''}
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:var(--text-muted);">Nenhum cliente cadastrado.</div>'}
                </div>

                <!-- SEÇÃO AGENDAMENTOS -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-calendar-alt" style="color:var(--primary);"></i> Agendamentos (${agendamentos.length})</h4>
                        <div style="display:flex;gap:8px;font-size:11px;">
                            <span style="color:#f59e0b;">⏳ ${agendamentosPendentes}</span>
                            <span style="color:#22c55e;">✅ ${agendamentosConcluidos}</span>
                            ${agendamentosCancelados > 0 ? `<span style="color:#ef4444;">❌ ${agendamentosCancelados}</span>` : ''}
                        </div>
                    </div>
                    ${agendamentos.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;width:100%">
                                <thead><tr><th>Cliente</th><th>Serviço</th><th>Data</th><th>Hora</th><th>Valor</th><th>Status</th></tr></thead>
                                <tbody>
                                    ${agendamentos.slice(0, 15).map(a => `<tr>
                                        <td>${escapeHtml(a.cliente_nome || 'N/A')}</td>
                                        <td>${escapeHtml(a.servico || a.servico_nome || '-')}</td>
                                        <td>${formatarDataBr(a.data)}</td>
                                        <td>${a.hora || '-'}</td>
                                        <td>R$ ${formatarMoeda(a.valor)}</td>
                                        <td><span style="padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${a.status === 'concluido' ? 'rgba(34,197,94,0.15)' : a.status === 'cancelado' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};color:${a.status === 'concluido' ? '#22c55e' : a.status === 'cancelado' ? '#ef4444' : '#f59e0b'};">${a.status || 'pendente'}</span></td>
                                    </tr>`).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div style="text-align:center;padding:16px;color:var(--text-muted);">Nenhum agendamento encontrado.</div>'}
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