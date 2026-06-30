// ============================================
// SUPER ADMIN - GESTÃO COMPLETA DE EMPRESAS
// ============================================

let empresasData = [];
let usuariosData = [];
let empresasTimeout = null;

// ============================================
// CARREGAR DASHBOARD SUPER ADMIN (VERSÃO SIMPLES)
// ============================================

async function carregarDashboardSuperAdmin() {
    ativarBotao('dashboard');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        // 🔥 USAR A ROTA QUE JÁ FUNCIONA
        const [statsRes, empresasRes, usuariosRes] = await Promise.all([
            fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/empresas', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/usuarios', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const stats = (await statsRes.json()).data || {};
        const empresas = (await empresasRes.json()).data || [];
        const usuarios = (await usuariosRes.json()).data || [];

        console.log('📊 EMPRESAS CARREGADAS:', empresas.length);
        console.log('📊 PRIMEIRA EMPRESA:', empresas[0]);

        empresasData = empresas;
        usuariosData = usuarios;

        // ============================================
        // CÁLCULOS E MÉTRICAS
        // ============================================

        const totalEmpresas = empresas.length;
        const empresasAtivas = empresas.filter(e => e.assinatura_ativa === 1).length;
        const empresasTrial = empresas.filter(e => e.plano === 'trial' || e.plano === 'Trial').length;
        const empresasPagas = empresas.filter(e => e.plano !== 'trial' && e.plano !== 'Trial' && e.plano !== null).length;

        const totalDonos = usuarios.filter(u => u.role === 'dono').length;
        const totalProfissionais = usuarios.filter(u => u.role === 'profissional').length;
        const totalClientes = stats.total_clientes || 0;
        const totalAgendamentos = stats.total_agendamentos || 0;

        const agendamentosMes = stats.agendamentos_mes || 0;
        const faturamentoMes = stats.faturamento_mes || 0;

        // ============================================
        // HTML DO DASHBOARD
        // ============================================

        const html = `
            <div class="fade-in">
                <!-- CABEÇALHO -->
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                    <div>
                        <h2 style="margin:0;font-size:22px;">🏢 Dashboard Super Admin</h2>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:13px;">Visão completa do ecossistema See&Agende</p>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <span style="background:var(--bg-hover);padding:4px 14px;border-radius:8px;font-size:12px;color:var(--text-muted);">
                            <i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}
                        </span>
                        <button onclick="carregarDashboardSuperAdmin()" style="background:var(--primary);border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;">
                            <i class="fas fa-sync"></i> Atualizar
                        </button>
                    </div>
                </div>
                
                <!-- CARDS PRINCIPAIS -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px;">
                    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.05));border-radius:12px;padding:14px 16px;border:1px solid rgba(102,126,234,0.1);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:22px;">🏢</span>
                            <div>
                                <div style="font-size:22px;font-weight:700;color:var(--text-primary);">${totalEmpresas}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Total Empresas</div>
                                <div style="font-size:10px;display:flex;gap:6px;color:var(--text-muted);">
                                    <span style="color:#22c55e;">${empresasAtivas} ativas</span>
                                    <span style="color:#f59e0b;">${empresasTrial} trial</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:14px 16px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:22px;">👨‍💼</span>
                            <div>
                                <div style="font-size:22px;font-weight:700;color:var(--text-primary);">${totalDonos}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Donos</div>
                                <div style="font-size:10px;color:var(--text-muted);">${totalProfissionais} profissionais</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:14px 16px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:22px;">👥</span>
                            <div>
                                <div style="font-size:22px;font-weight:700;color:var(--text-primary);">${totalClientes}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Clientes</div>
                                <div style="font-size:10px;color:var(--text-muted);">em todas as empresas</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(5,150,105,0.05));border-radius:12px;padding:14px 16px;border:1px solid rgba(16,185,129,0.1);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:22px;">✂️</span>
                            <div>
                                <div style="font-size:22px;font-weight:700;color:var(--text-primary);">${totalAgendamentos}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Agendamentos</div>
                                <div style="font-size:10px;color:#22c55e;">+${agendamentosMes} este mês</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.08),rgba(217,119,6,0.05));border-radius:12px;padding:14px 16px;border:1px solid rgba(245,158,11,0.1);">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:22px;">💰</span>
                            <div>
                                <div style="font-size:22px;font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(faturamentoMes)}</div>
                                <div style="font-size:11px;color:var(--text-muted);">Faturamento Mês</div>
                                <div style="font-size:10px;color:var(--text-muted);">${empresasPagas} empresas pagas</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- LISTA DE EMPRESAS -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-building" style="color:var(--primary);"></i> Todas as Empresas (${totalEmpresas})</h4>
                        <div style="display:flex;gap:8px;">
                            <input type="text" id="buscarEmpresa" placeholder="🔍 Buscar empresa..." style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:6px;padding:4px 12px;font-size:12px;color:var(--text-primary);width:180px;" oninput="filtrarEmpresas()">
                            <button onclick="carregarDashboardSuperAdmin()" style="background:var(--primary);border:none;padding:4px 14px;border-radius:6px;color:white;font-size:12px;cursor:pointer;">
                                <i class="fas fa-sync"></i>
                            </button>
                        </div>
                    </div>
                    
                    ${totalEmpresas > 0 ? `
                    <div style="overflow-x:auto;">
                        <table class="data-table" style="font-size:12px;">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Empresa</th>
                                    <th>Plano</th>
                                    <th>Status</th>
                                    <th>Donos</th>
                                    <th>Profissionais</th>
                                    <th>Clientes</th>
                                    <th>Agendamentos</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="listaEmpresas">
                                ${empresas.map((e, idx) => {
            const isTrial = e.plano === 'trial' || e.plano === 'Trial';
            const isAtivo = e.assinatura_ativa === 1;

            let statusColor = '#22c55e';
            let statusText = '✅ Ativo';
            if (isTrial) {
                statusColor = '#f59e0b';
                statusText = '🔄 Trial';
                if (e.trial_expira && new Date(e.trial_expira) < new Date()) {
                    statusColor = '#ef4444';
                    statusText = '⛔ Expirado';
                }
            } else if (!isAtivo) {
                statusColor = '#ef4444';
                statusText = '⛔ Inativo';
            }

            const donos = usuarios.filter(u => u.empresa_id === e.id && u.role === 'dono');
            const profissionais = usuarios.filter(u => u.empresa_id === e.id && u.role === 'profissional');

            return `
                                        <tr>
                                            <td style="font-weight:600;color:var(--text-muted);">${idx + 1}</td>
                                            <td style="font-weight:600;">${escapeHtml(e.nome)}</td>
                                            <td><span style="padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${isTrial ? 'rgba(245,158,11,0.15)' : 'rgba(102,126,234,0.15)'};color:${isTrial ? '#f59e0b' : 'var(--primary)'};">${isTrial ? 'Trial' : e.plano || 'N/A'}</span></td>
                                            <td><span style="color:${statusColor};font-weight:600;font-size:11px;">${statusText}</span></td>
                                            <td>${donos.length}</td>
                                            <td>${profissionais.length}</td>
                                            <td>${e.total_clientes || 0}</td>
                                            <td>${e.total_agendamentos || 0}</td>
                                            <td>
                                                <div style="display:flex;gap:4px;flex-wrap:wrap;">
                                                    <button onclick="verEmpresa(${e.id})" style="background:rgba(102,126,234,0.15);border:none;padding:2px 10px;border-radius:4px;color:var(--primary);font-size:10px;cursor:pointer;" title="Ver detalhes">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                    <button onclick="editarEmpresa(${e.id})" style="background:rgba(245,158,11,0.15);border:none;padding:2px 10px;border-radius:4px;color:#f59e0b;font-size:10px;cursor:pointer;" title="Editar">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    ${isTrial ? `
                                                        <button onclick="estenderTrial(${e.id})" style="background:rgba(34,197,94,0.15);border:none;padding:2px 10px;border-radius:4px;color:#22c55e;font-size:10px;cursor:pointer;" title="Estender trial">
                                                            <i class="fas fa-clock"></i>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : `
                        <div style="text-align:center;padding:30px;color:var(--text-muted);">
                            <i class="fas fa-building" style="font-size:48px;opacity:0.2;display:block;margin-bottom:12px;"></i>
                            <p style="font-size:16px;font-weight:600;">Nenhuma empresa cadastrada</p>
                            <p style="font-size:13px;">Ainda não há empresas no sistema.</p>
                        </div>
                    `}
                </div>
                
                <!-- USUÁRIOS RECENTES -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-users" style="color:var(--primary);"></i> Últimos Usuários Cadastrados</h4>
                        <span style="font-size:11px;color:var(--text-muted);">Total: ${usuarios.length}</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="data-table" style="font-size:12px;">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Empresa</th>
                                    <th>Cadastro</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuarios.slice(0, 10).map(u => {
            const empresa = empresas.find(e => e.id === u.empresa_id);
            const roleLabels = {
                'superadmin': '🔴 Super Admin',
                'dono': '🟠 Dono',
                'profissional': '🔵 Profissional'
            };
            return `
                                        <tr>
                                            <td style="font-weight:600;">${escapeHtml(u.nome)}</td>
                                            <td style="font-size:11px;color:var(--text-muted);">${escapeHtml(u.email)}</td>
                                            <td><span style="font-size:11px;">${roleLabels[u.role] || u.role}</span></td>
                                            <td style="font-size:11px;">${empresa ? escapeHtml(empresa.nome) : 'N/A'}</td>
                                            <td style="font-size:11px;color:var(--text-muted);">${formatarDataBr(u.created_at)}</td>
                                            <td>
                                                <button onclick="editarUsuario(${u.id})" style="background:rgba(102,126,234,0.15);border:none;padding:2px 10px;border-radius:4px;color:var(--primary);font-size:10px;cursor:pointer;">
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

    } catch (error) {
        console.error('❌ Erro ao carregar dashboard super admin:', error);
        hideLoading();
        document.getElementById('content').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#ef4444;"></i>
                <p style="margin:12px 0;color:var(--text-muted);">Erro ao carregar dashboard</p>
                <button onclick="carregarDashboardSuperAdmin()" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
    }
}

// ============================================
// FUNÇÃO PARA FILTRAR EMPRESAS
// ============================================

function filtrarEmpresas() {
    const termo = document.getElementById('buscarEmpresa').value.toLowerCase();
    const rows = document.querySelectorAll('#listaEmpresas tr');

    rows.forEach(row => {
        const nome = row.querySelector('td:nth-child(2)')?.textContent?.toLowerCase() || '';
        row.style.display = nome.includes(termo) ? '' : 'none';
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
        // Buscar todos os dados da empresa
        const [empresaRes, usuariosRes, clientesRes, agendamentosRes, acessosRes] = await Promise.all([
            fetch(`/api/admin/empresas/${id}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/usuarios`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/clientes`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/agendamentos`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/admin/empresas/${id}/acessos`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const empresa = (await empresaRes.json()).data || {};
        const usuarios = (await usuariosRes.json()).data || [];
        const clientes = (await clientesRes.json()).data || [];
        const agendamentos = (await agendamentosRes.json()).data || [];
        const acessos = (await acessosRes.json()).data || [];

        console.log('📊 Dados carregados:');
        console.log('  - Empresa:', empresa.nome);
        console.log('  - Usuários:', usuarios.length);
        console.log('  - Clientes:', clientes.length);
        console.log('  - Agendamentos:', agendamentos.length);
        console.log('  - Acessos:', acessos.length);

        // Separar donos e profissionais
        const donos = usuarios.filter(u => u.tipo === 'dono' || u.role === 'dono');
        const profissionais = usuarios.filter(u => u.tipo === 'profissional' || u.role === 'profissional');

        const isTrial = empresa.plano === 'trial' || empresa.plano === 'Trial';
        const isAtivo = empresa.assinatura_ativa === 1;

        // Calcular dias restantes do trial
        let diasRestantes = 0;
        if (empresa.trial_expira) {
            const hoje = new Date();
            const expira = new Date(empresa.trial_expira);
            diasRestantes = Math.ceil((expira - hoje) / (1000 * 60 * 60 * 24));
        }

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

        // Calcular estatísticas de acessos
        const totalAcessos = acessos.length;
        const acessosHoje = acessos.filter(a => {
            const hoje = new Date().toISOString().split('T')[0];
            return a.data_acesso && a.data_acesso.startsWith(hoje);
        }).length;

        const ultimoAcesso = acessos.length > 0 ? acessos[0].data_acesso : null;
        const ultimoAcessoFormatado = ultimoAcesso ? formatarDataHora(ultimoAcesso) : 'Nunca acessou';

        // Agendamentos por status
        const agendamentosPendentes = agendamentos.filter(a => a.status === 'pendente' || a.status === 'agendado').length;
        const agendamentosConcluidos = agendamentos.filter(a => a.status === 'concluido').length;
        const agendamentosCancelados = agendamentos.filter(a => a.status === 'cancelado').length;

        // Calcular faturamento total
        const faturamentoTotal = agendamentos
            .filter(a => a.status === 'concluido')
            .reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

        const html = `
            <div class="fade-in">
                <!-- CABEÇALHO COM AÇÕES -->
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
                        <span style="background:${statusColor}22;padding:4px 14px;border-radius:8px;color:${statusColor};font-size:12px;font-weight:600;border:1px solid ${statusColor}44;">
                            ${statusText}
                        </span>
                        <button onclick="editarEmpresa(${empresa.id})" style="background:var(--primary);border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;">
                            <i class="fas fa-edit"></i> Editar
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
                
                <!-- DONOS -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-crown" style="color:#f59e0b;"></i> Donos (${donos.length})</h4>
                        <span style="font-size:11px;color:var(--text-muted);">Responsáveis pela gestão da empresa</span>
                    </div>
                    ${donos.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Telefone</th>
                                        <th>Cadastro</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${donos.map(d => `
                                        <tr>
                                            <td style="font-weight:600;">${escapeHtml(d.nome)}</td>
                                            <td>${escapeHtml(d.email)}</td>
                                            <td>${escapeHtml(d.telefone || '-')}</td>
                                            <td style="font-size:11px;color:var(--text-muted);">${formatarDataBr(d.created_at)}</td>
                                            <td>
                                                <button onclick="editarUsuario(${d.id})" style="background:rgba(102,126,234,0.15);border:none;padding:2px 12px;border-radius:4px;color:var(--primary);font-size:11px;cursor:pointer;" title="Editar usuário">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button onclick="verAcessosUsuario(${d.id})" style="background:rgba(16,185,129,0.15);border:none;padding:2px 12px;border-radius:4px;color:#22c55e;font-size:11px;cursor:pointer;" title="Ver acessos">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">
                            <i class="fas fa-user-slash" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>
                            Nenhum dono cadastrado nesta empresa.
                        </div>
                    `}
                </div>
                
                <!-- PROFISSIONAIS -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-users" style="color:var(--primary);"></i> Profissionais (${profissionais.length})</h4>
                        <span style="font-size:11px;color:var(--text-muted);">Atendentes e prestadores de serviço</span>
                    </div>
                    ${profissionais.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Telefone</th>
                                        <th>Comissão</th>
                                        <th>Cadastro</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${profissionais.map(p => `
                                        <tr>
                                            <td style="font-weight:600;">${escapeHtml(p.nome)}</td>
                                            <td>${escapeHtml(p.email)}</td>
                                            <td>${escapeHtml(p.telefone || '-')}</td>
                                            <td><span style="background:rgba(16,185,129,0.15);padding:2px 10px;border-radius:12px;color:#22c55e;font-weight:600;">${p.comissao_percent || 0}%</span></td>
                                            <td style="font-size:11px;color:var(--text-muted);">${formatarDataBr(p.created_at)}</td>
                                            <td>
                                                <button onclick="editarUsuario(${p.id})" style="background:rgba(102,126,234,0.15);border:none;padding:2px 12px;border-radius:4px;color:var(--primary);font-size:11px;cursor:pointer;" title="Editar usuário">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button onclick="verAcessosUsuario(${p.id})" style="background:rgba(16,185,129,0.15);border:none;padding:2px 12px;border-radius:4px;color:#22c55e;font-size:11px;cursor:pointer;" title="Ver acessos">
                                                    <i class="fas fa-history"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">
                            <i class="fas fa-user-slash" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>
                            Nenhum profissional cadastrado nesta empresa.
                            <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
                                Profissionais são cadastrados pelo dono na tela de configurações.
                            </div>
                        </div>
                    `}
                </div>
                
                <!-- CLIENTES -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-address-book" style="color:#8b5cf6;"></i> Clientes (${clientes.length})</h4>
                        <span style="font-size:11px;color:var(--text-muted);">Base de clientes da empresa</span>
                    </div>
                    ${clientes.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Telefone</th>
                                        <th>Email</th>
                                        <th>Cadastro</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${clientes.slice(0, 20).map(c => `
                                        <tr>
                                            <td style="font-weight:600;">${escapeHtml(c.nome)}</td>
                                            <td>${escapeHtml(c.telefone || '-')}</td>
                                            <td>${escapeHtml(c.email || '-')}</td>
                                            <td style="font-size:11px;color:var(--text-muted);">${formatarDataBr(c.created_at)}</td>
                                            <td>${c.bloqueado_chatbot === 1 ? '🔒 Bloqueado' : '✅ Ativo'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${clientes.length > 20 ? `
                                <div style="text-align:center;padding:8px;color:var(--text-muted);font-size:12px;">
                                    + ${clientes.length - 20} clientes a mais...
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">
                            <i class="fas fa-users-slash" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>
                            Nenhum cliente cadastrado nesta empresa.
                        </div>
                    `}
                </div>
                
                <!-- AGENDAMENTOS -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-calendar-alt" style="color:var(--primary);"></i> Agendamentos (${agendamentos.length})</h4>
                        <div style="display:flex;gap:8px;font-size:11px;">
                            <span style="color:#f59e0b;">⏳ ${agendamentosPendentes} pendentes</span>
                            <span style="color:#22c55e;">✅ ${agendamentosConcluidos} concluídos</span>
                            ${agendamentosCancelados > 0 ? `<span style="color:#ef4444;">❌ ${agendamentosCancelados} cancelados</span>` : ''}
                        </div>
                    </div>
                    ${agendamentos.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Serviço</th>
                                        <th>Data</th>
                                        <th>Hora</th>
                                        <th>Valor</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${agendamentos.slice(0, 15).map(a => `
                                        <tr>
                                            <td>${escapeHtml(a.cliente_nome || 'N/A')}</td>
                                            <td>${escapeHtml(a.servico || a.servico_nome || '-')}</td>
                                            <td>${formatarDataBr(a.data)}</td>
                                            <td>${a.hora || '-'}</td>
                                            <td>R$ ${formatarMoeda(a.valor)}</td>
                                            <td><span style="padding:2px 10px;border-radius:12px;font-size:10px;font-weight:600;background:${a.status === 'concluido' ? 'rgba(34,197,94,0.15)' : a.status === 'cancelado' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)'};color:${a.status === 'concluido' ? '#22c55e' : a.status === 'cancelado' ? '#ef4444' : '#f59e0b'};">${a.status || 'pendente'}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            ${agendamentos.length > 15 ? `
                                <div style="text-align:center;padding:8px;color:var(--text-muted);font-size:12px;">
                                    + ${agendamentos.length - 15} agendamentos a mais...
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">
                            <i class="fas fa-calendar-times" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>
                            Nenhum agendamento encontrado para esta empresa.
                        </div>
                    `}
                </div>
                
                <!-- ACESSOS RECENTES -->
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-history" style="color:#8b5cf6;"></i> Acessos Recentes (${Math.min(acessos.length, 10)})</h4>
                        <span style="font-size:11px;color:var(--text-muted);">Total: ${totalAcessos} acessos</span>
                    </div>
                    ${acessos.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table class="data-table" style="font-size:12px;">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Usuário</th>
                                        <th>IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${acessos.slice(0, 10).map(a => `
                                        <tr>
                                            <td style="font-size:11px;">${formatarDataHora(a.data_acesso)}</td>
                                            <td>${escapeHtml(a.usuario_nome || 'N/A')}</td>
                                            <td style="font-size:11px;color:var(--text-muted);">${a.ip || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">
                            <i class="fas fa-clock" style="font-size:24px;opacity:0.3;display:block;margin-bottom:8px;"></i>
                            Nenhum acesso registrado para esta empresa.
                        </div>
                    `}
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
// EDITAR EMPRESA
// ============================================

async function editarEmpresa(id) {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/empresas/${id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
            const empresa = data.data;
            document.getElementById('editEmpresaId').value = empresa.id;
            document.getElementById('editEmpresaNome').value = empresa.nome || '';
            document.getElementById('editEmpresaPlano').value = empresa.plano || 'trial';
            document.getElementById('modalEditarEmpresa').style.display = 'block';

            // Conectar o formulário
            setTimeout(conectarFormEmpresa, 100);
        } else {
            showToast('Erro ao carregar dados da empresa', 'error');
        }
    } catch (error) {
        showToast('Erro ao carregar dados da empresa', 'error');
    }
}

// ============================================
// EDITAR USUÁRIO (CORRIGIDO - COM TELEFONE)
// ============================================

async function editarUsuario(id) {
    console.log('👤 Editando usuário ID:', id);

    if (!id) {
        showToast('ID do usuário não informado', 'error');
        return;
    }

    const token = localStorage.getItem('token');

    if (!token) {
        showToast('Token não encontrado. Faça login novamente.', 'error');
        return;
    }

    showLoading();

    try {
        console.log(`📡 Buscando usuário ${id}...`);

        const res = await fetch(`/api/admin/usuarios/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log('📡 Dados recebidos:', data);

        hideLoading();

        if (!data.success) {
            showToast(data.message || 'Erro ao carregar usuário', 'error');
            return;
        }

        if (!data.data) {
            showToast('Usuário não encontrado', 'error');
            return;
        }

        const usuario = data.data;
        console.log('👤 Usuário carregado:', usuario.nome);

        // 🔥 CORRIGIDO: Incluir telefone se existir
        const modalContent = `
            <div style="padding: 10px 0;">
                <form id="formEditarUsuario" style="display:flex;flex-direction:column;gap:12px;">
                    <input type="hidden" id="editUsuarioId" value="${usuario.id}">
                    
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="editUsuarioNome" class="form-control" value="${escapeHtml(usuario.nome || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" id="editUsuarioEmail" class="form-control" value="${escapeHtml(usuario.email || '')}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="editUsuarioTelefone" class="form-control" value="${escapeHtml(usuario.telefone || '')}" placeholder="(41) 99999-9999">
                        <small style="color:var(--text-muted);font-size:11px;">Telefone do profissional (se aplicável)</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Role (Função)</label>
                        <select id="editUsuarioRole" class="form-control">
                            <option value="dono" ${usuario.role === 'dono' ? 'selected' : ''}>👑 Dono</option>
                            <option value="profissional" ${usuario.role === 'profissional' ? 'selected' : ''}>👤 Profissional</option>
                        </select>
                        <small style="color:var(--text-muted);font-size:11px;">Alterar role pode afetar permissões do usuário</small>
                    </div>
                    
                    ${usuario.role === 'profissional' ? `
                        <div class="form-group">
                            <label>Comissão (%)</label>
                            <input type="number" id="editUsuarioComissao" class="form-control" value="${usuario.comissao_percent || 30}" min="0" max="100">
                            <small style="color:var(--text-muted);font-size:11px;">Percentual de comissão para profissionais</small>
                        </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label>Nova Senha (opcional)</label>
                        <input type="text" id="editUsuarioSenha" class="form-control" placeholder="Digite nova senha (mínimo 6 caracteres)">
                        <small style="color:var(--text-muted);font-size:11px;">Deixe em branco para manter a senha atual</small>
                    </div>
                    
                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <button type="submit" class="btn-3d" style="flex:1;">
                            <i class="fas fa-save"></i> Salvar
                        </button>
                        <button type="button" onclick="fecharModalEditarUsuario()" class="btn-secondary">
                            Cancelar
                        </button>
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

                console.log('✅ Formulário de usuário conectado!');
            }

            const modal = document.querySelector('.modal');
            if (modal) {
                modal.style.maxWidth = '500px';
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.maxHeight = '90vh';
                    modalContent.style.overflowY = 'auto';
                }
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

// ============================================
// SALVAR USUÁRIO (CORRIGIDO)
// ============================================

async function salvarUsuario() {
    console.log('📝 Salvando usuário...');

    const id = document.getElementById('editUsuarioId')?.value;
    const nome = document.getElementById('editUsuarioNome')?.value;
    const email = document.getElementById('editUsuarioEmail')?.value;
    const telefone = document.getElementById('editUsuarioTelefone')?.value || '';
    const role = document.getElementById('editUsuarioRole')?.value || 'dono';
    const senha = document.getElementById('editUsuarioSenha')?.value || '';
    const comissao = document.getElementById('editUsuarioComissao')?.value;

    if (!id) {
        showToast('ID do usuário não encontrado', 'error');
        return;
    }

    if (!nome || !email) {
        showToast('Nome e email são obrigatórios', 'warning');
        return;
    }

    if (senha && senha.length < 6) {
        showToast('A senha deve ter pelo menos 6 caracteres', 'warning');
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const body = {
            nome: nome.trim(),
            email: email.trim(),
            telefone: telefone.trim(),
            role: role
        };

        if (senha && senha.length >= 6) {
            body.senha = senha;
        }

        if (comissao && role === 'profissional') {
            body.comissao_percent = parseFloat(comissao);
        }

        console.log('📤 Enviando dados:', body);

        const res = await fetch(`/api/admin/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('✅ Usuário atualizado com sucesso!', 'success');
            fecharModalEditarUsuario();
            setTimeout(() => {
                carregarDashboardSuperAdmin();
            }, 500);
        } else {
            showToast(data.message || 'Erro ao atualizar usuário', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao salvar usuário:', error);
        showToast('Erro ao atualizar usuário: ' + error.message, 'error');
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nome, plano })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('✅ Empresa atualizada com sucesso!', 'success');
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
// FUNÇÃO PARA FECHAR MODAL GENÉRICA
// ============================================

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ============================================
// CONECTAR FORMULÁRIO DA EMPRESA
// ============================================

function conectarFormEmpresa() {
    const form = document.getElementById('formEmpresa');
    if (form) {
        // Remover event listener antigo para evitar duplicação
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📝 Formulário da empresa submetido!');
            salvarEmpresa();
        });

        console.log('✅ Formulário da empresa conectado!');
    } else {
        console.warn('⚠️ Formulário da empresa não encontrado');
    }
}

// ============================================
// FUNÇÃO: FORMATAR DATA/HORA
// ============================================

function formatarDataHora(dataStr) {
    if (!dataStr) return 'Nunca';
    try {
        const data = new Date(dataStr);
        if (isNaN(data.getTime())) return 'Nunca';
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dataStr;
    }
}

// ============================================
// INICIALIZAR CONEXÕES
// ============================================

// Quando o DOM carregar, conectar os formulários
document.addEventListener('DOMContentLoaded', function () {
    conectarFormEmpresa();
    console.log('✅ empresas.js - Formulários conectados!');
});

// Também conectar quando o dashboard for carregado
setTimeout(conectarFormEmpresa, 500);

// ============================================
// EXPORTAR FUNÇÕES
// ============================================

window.carregarDashboardSuperAdmin = carregarDashboardSuperAdmin;
window.carregarEmpresas = carregarDashboardSuperAdmin;
window.verEmpresa = verEmpresa;
window.editarEmpresa = editarEmpresa;
window.editarUsuario = editarUsuario;
window.estenderTrial = estenderTrial;
window.filtrarEmpresas = filtrarEmpresas;
window.fecharModalEditarUsuario = fecharModalEditarUsuario;
window.salvarUsuario = salvarUsuario;
window.salvarEmpresa = salvarEmpresa;
window.fecharModal = fecharModal;

console.log('✅ empresas.js carregado com Dashboard Super Admin completo!');