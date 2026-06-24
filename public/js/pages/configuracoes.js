// Configurações Unificadas - Profissionais + Horários + Chatbot + Tema + BLOQUEIO GERAL

let profissionaisData = [];
let planoInfo = { plano: 'trial', limite: 1, ativos: 0, podeAdicionar: true };

// ============================================
// FUNÇÃO PRINCIPAL (chamada pelo menu)
// ============================================
async function carregarConfiguracoes() {
    ativarBotao('configuracoes');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        const [profissionaisRes, horariosRes, planoRes, empresaRes] = await Promise.all([
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/horarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/empresa/plano', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/empresa/dados', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const profissionaisData_raw = await profissionaisRes.json();
        const horariosData = await horariosRes.json();
        const planoData = await planoRes.json();
        const empresaData = await empresaRes.json();

        if (profissionaisData_raw.success) {
            profissionaisData = profissionaisData_raw.data || [];
        }

        if (planoData.success && planoData.data) {
            const ativos = profissionaisData.filter(p => p.ativo === 1).length;
            planoInfo = {
                plano: planoData.data.plano,
                plano_nome: planoData.data.plano_nome || (planoData.data.plano === 'trial' ? 'Trial' : planoData.data.plano),
                limite: planoData.data.limite_profissionais,
                ativos: ativos,
                podeAdicionar: ativos < planoData.data.limite_profissionais,
                is_trial: planoData.data.is_trial,
                dias_restantes: planoData.data.dias_restantes || 0,
                valida_ate: planoData.data.valida_ate
            };
        }

        // Buscar dias_bloqueio_geral da empresa
        let diasBloqueioGeral = 0;
        if (empresaData.success && empresaData.data) {
            diasBloqueioGeral = empresaData.data.dias_bloqueio_geral || 0;
        }

        const temaSalvo = localStorage.getItem('theme') || 'light';

        let html = `
            <div class="fade-in">
                <div class="dashboard-header">
                    <div>
                        <h2 class="page-title">⚙️ Configurações</h2>
                        <p class="page-subtitle">Gerencie todas as configurações da sua empresa</p>
                    </div>
                </div>
                
                <div class="config-tabs">
                    <button class="config-tab active" onclick="switchConfigTab('profissionais')">
                        <i class="fas fa-users"></i> Profissionais
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('horarios')">
                        <i class="fas fa-clock"></i> Horários
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('bloqueio')">
                        <i class="fas fa-lock"></i> Bloqueio Geral
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('chatbot')">
                        <i class="fas fa-robot"></i> Chatbot
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('tema')">
                        <i class="fas fa-${temaSalvo === 'dark' ? 'moon' : 'sun'}"></i> Tema
                    </button>
                </div>
                
                <div id="configContent">
                    ${renderProfissionais()}
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;

        // Inicializar eventos
        setTimeout(() => {
            inicializarHorariosEvents();
            carregarLinkChatbot();
        }, 100);

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar configurações', 'error');
    }

    hideLoading();
}

// ============================================
// SWITCH TABS - CORRIGIDO
// ============================================
function switchConfigTab(tab) {
    document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
    const tabs = document.querySelectorAll('.config-tab');
    const index = ['profissionais', 'horarios', 'bloqueio', 'chatbot', 'tema'].indexOf(tab);
    if (tabs[index]) tabs[index].classList.add('active');

    switch (tab) {
        case 'profissionais':
            document.getElementById('configContent').innerHTML = renderProfissionais();
            break;
        case 'horarios':
            carregarHorarios();
            break;
        case 'bloqueio':
            carregarBloqueioGeral();
            break;
        case 'chatbot':
            carregarChatbot();
            break;
        case 'tema':
            const temaAtual = localStorage.getItem('theme') || 'light';
            document.getElementById('configContent').innerHTML = renderTema(temaAtual);
            break;
        default:
            break;
    }
}

// ============================================
// CARREGAR BLOQUEIO GERAL
// ============================================
async function carregarBloqueioGeral() {
    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/empresa/dados', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        let diasBloqueioGeral = 0;
        if (data.success && data.data) {
            diasBloqueioGeral = data.data.dias_bloqueio_geral || 0;
        }

        document.getElementById('configContent').innerHTML = renderBloqueioGeral(diasBloqueioGeral);
    } catch (error) {
        showToast('Erro ao carregar bloqueio geral', 'error');
        document.getElementById('configContent').innerHTML = '<div class="card"><p class="text-muted">Erro ao carregar bloqueio geral</p></div>';
    }
    hideLoading();
}

// ============================================
// RENDER BLOQUEIO GERAL (COM ESTILOS INLINE)
// ============================================
function renderBloqueioGeral(diasAtual) {
    const opcoes = [
        { value: 0, label: '❌ Desativado (0 dias)', desc: 'Cliente pode agendar no dia seguinte (mas não no mesmo dia)' },
        { value: 7, label: '📅 7 dias', desc: 'Cliente só pode agendar 1 vez por semana' },
        { value: 14, label: '📅 14 dias', desc: 'Cliente só pode agendar 1 vez a cada 2 semanas' },
        { value: 30, label: '📅 30 dias', desc: 'Cliente só pode agendar 1 vez por mês' }
    ];

    // Encontrar a descrição atual
    const descricaoAtual = opcoes.find(o => o.value === diasAtual)?.desc || '';

    return `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-lock"></i> Bloqueio Geral de Agendamentos</h3>
            </div>
            
            <div style="background: #fef3c720; padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: var(--text-secondary);">
                    <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                    <strong>Regra fixa:</strong> Cliente NÃO pode fazer mais de 1 agendamento por dia.
                    <br>
                    <strong>Bloqueio geral:</strong> Define quantos dias os clientes devem esperar entre um agendamento e outro.
                </p>
            </div>
            
            <div class="form-group" style="max-width: 400px;">
                <label style="font-weight: 600; display: block; margin-bottom: 6px; color: var(--text-primary);">
                    <i class="fas fa-calendar-alt"></i> Dias de bloqueio entre agendamentos:
                </label>
                <select id="bloqueioGeralSelect" class="form-control" style="
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid var(--border-color);
                    border-radius: 12px;
                    font-size: 15px;
                    background: var(--bg-input);
                    color: var(--text-primary);
                    transition: all 0.3s ease;
                    font-family: 'Inter', sans-serif;
                    cursor: pointer;
                    appearance: auto;
                ">
                    ${opcoes.map(o => `
                        <option value="${o.value}" ${o.value === diasAtual ? 'selected' : ''} style="padding: 8px;">
                            ${o.label}
                        </option>
                    `).join('')}
                </select>
                <small id="bloqueioDescricao" style="
                    display: block;
                    margin-top: 8px;
                    color: var(--text-muted);
                    font-size: 13px;
                    padding: 8px 12px;
                    background: var(--bg-hover);
                    border-radius: 8px;
                    border-left: 3px solid var(--primary);
                ">
                    <i class="fas fa-info-circle"></i> ${descricaoAtual}
                </small>
            </div>
            
            <button onclick="salvarBloqueioGeral()" class="btn btn-primary" style="
                margin-top: 10px;
                padding: 12px 28px;
                background: var(--gradient);
                color: white;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            ">
                <i class="fas fa-save"></i> Salvar Bloqueio Geral
            </button>
            
            <div style="margin-top: 20px; padding: 16px; background: var(--bg-hover); border-radius: 12px;">
                <h4 style="margin: 0 0 10px 0; color: var(--text-primary);">📋 Como funciona:</h4>
                <ul style="margin: 0; padding-left: 20px; line-height: 2; color: var(--text-secondary);">
                    <li><strong>0 dias:</strong> Cliente pode agendar no dia seguinte (mas não no mesmo dia)</li>
                    <li><strong>7 dias:</strong> Cliente só pode agendar 1 vez por semana</li>
                    <li><strong>14 dias:</strong> Cliente só pode agendar 1 vez a cada 2 semanas</li>
                    <li><strong>30 dias:</strong> Cliente só pode agendar 1 vez por mês</li>
                </ul>
            </div>
        </div>
    `;
}

// ============================================
// SALVAR BLOQUEIO GERAL
// ============================================
async function salvarBloqueioGeral() {
    const select = document.getElementById('bloqueioGeralSelect');
    if (!select) {
        showToast('Erro: elemento não encontrado', 'error');
        return;
    }

    const dias = parseInt(select.value) || 0;
    const token = localStorage.getItem('token');

    // Pegar a descrição para mostrar na confirmação
    const opcoes = [
        { value: 0, label: '❌ Desativado (0 dias)', desc: 'Cliente pode agendar no dia seguinte (mas não no mesmo dia)' },
        { value: 7, label: '📅 7 dias', desc: 'Cliente só pode agendar 1 vez por semana' },
        { value: 14, label: '📅 14 dias', desc: 'Cliente só pode agendar 1 vez a cada 2 semanas' },
        { value: 30, label: '📅 30 dias', desc: 'Cliente só pode agendar 1 vez por mês' }
    ];
    const opcao = opcoes.find(o => o.value === dias);
    const label = opcao ? opcao.label : `${dias} dias`;

    if (!confirm(`Deseja aplicar bloqueio de ${label} para TODOS os clientes?`)) {
        return;
    }

    showLoading();

    try {
        const res = await fetch('/api/empresa/bloqueio-geral', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ dias_bloqueio: dias })
        });

        const data = await res.json();

        hideLoading();

        if (data.success) {
            showToast(data.message, 'success');
            // Atualizar a descrição
            const descEl = document.getElementById('bloqueioDescricao');
            if (descEl && opcao) {
                descEl.innerHTML = `<i class="fas fa-info-circle"></i> ${opcao.desc}`;
            }
            // Atualizar o select
            if (select) {
                select.value = dias;
            }
            carregarBloqueioGeral();
        } else {
            showToast(data.message || 'Erro ao salvar bloqueio', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        showToast('Erro ao salvar bloqueio', 'error');
    }
}

// ============================================
// CARREGAR HORÁRIOS
// ============================================
async function carregarHorarios() {
    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/horarios', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        document.getElementById('configContent').innerHTML = renderHorarios(data.data || []);
        setTimeout(() => inicializarHorariosEvents(), 100);
    } catch (error) {
        showToast('Erro ao carregar horários', 'error');
        document.getElementById('configContent').innerHTML = '<div class="card"><p class="text-muted">Erro ao carregar horários</p></div>';
    }
    hideLoading();
}

// ============================================
// CARREGAR CHATBOT
// ============================================
async function carregarChatbot() {
    showLoading();
    try {
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const res = await fetch(`/api/chatbot/link/${usuario.empresa_id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        document.getElementById('configContent').innerHTML = renderChatbot(data.link || '');
        setTimeout(() => carregarLinkChatbot(), 100);
    } catch (error) {
        showToast('Erro ao carregar chatbot', 'error');
        document.getElementById('configContent').innerHTML = '<div class="card"><p class="text-muted">Erro ao carregar chatbot</p></div>';
    }
    hideLoading();
}

// ============================================
// RENDER PROFISSIONAIS
// ============================================
function renderProfissionais() {
    return `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-users"></i> Profissionais</h3>
                ${planoInfo.podeAdicionar ?
            `<button class="btn-primary" onclick="abrirModalProfissional()">+ Novo Profissional</button>` :
            `<button class="btn-secondary" disabled style="opacity: 0.6;">🔒 Limite Atingido</button>`
        }
            </div>
            
            <div style="background: linear-gradient(135deg, ${planoInfo.is_trial ? '#f59e0b20' : '#667eea20'}, ${planoInfo.is_trial ? '#f59e0b20' : '#764ba220'}); padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid ${planoInfo.is_trial ? '#f59e0b' : '#667eea'};">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <strong>📋 Plano ${planoInfo.plano_nome}</strong>
                        <br>
                        <small>Limite: ${planoInfo.limite} profissional(is)</small>
                        <div style="margin-top: 5px;">
                            <div style="background: var(--bg-hover); border-radius: 10px; height: 6px; width: 200px; overflow: hidden;">
                                <div style="width: ${Math.min((planoInfo.ativos / planoInfo.limite) * 100, 100)}%; background: var(--gradient); height: 100%;"></div>
                            </div>
                            <small>${planoInfo.ativos} de ${planoInfo.limite} utilizado(s)</small>
                        </div>
                    </div>
                    <div>
                        ${planoInfo.is_trial ?
            `<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px;">🎯 Trial: ${planoInfo.dias_restantes} dias</span>` :
            `<span style="background: #48bb78; color: white; padding: 4px 12px; border-radius: 20px;">✅ Válido até: ${planoInfo.valida_ate || 'N/A'}</span>`
        }
                        ${!planoInfo.podeAdicionar && planoInfo.ativos > 0 ?
            `<button class="btn-primary" onclick="carregarPlanos()" style="margin-left: 10px;">💎 Upgrade</button>` : ''
        }
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Comissão</th>
                            <th>Status</th>
                            <th>Data</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="profissionaisTableBody">${renderProfissionaisList()}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderProfissionaisList() {
    if (!profissionaisData || profissionaisData.length === 0) {
        return `<tr><td colspan="6" style="text-align:center;">Nenhum profissional cadastrado</td></tr>`;
    }
    return profissionaisData.map(prof => `
        <tr>
            <td><strong>${escapeHtml(prof.nome)}</strong></td>
            <td>${escapeHtml(prof.email)}</td>
            <td><span class="badge">${prof.comissao_percent}%</span></td>
            <td>${prof.ativo === 1 ? '<span class="badge-success">✅ Ativo</span>' : '<span class="badge-danger">❌ Inativo</span>'}</td>
            <td>${formatarData(prof.created_at)}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" onclick="editarProfissional(${prof.id})">✏️</button>
                <button class="btn-icon btn-key" onclick="resetarSenhaProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🔑</button>
                <button class="btn-icon btn-toggle" onclick="alternarStatusProfissional(${prof.id}, ${prof.ativo === 1 ? 'false' : 'true'})">${prof.ativo === 1 ? '🔴' : '🟢'}</button>
                <button class="btn-icon btn-delete" onclick="excluirProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// RENDER HORÁRIOS
// ============================================
function renderHorarios(horarios) {
    const dias = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };

    let horariosMap = {};
    if (horarios && horarios.length > 0) {
        horarios.forEach(h => {
            horariosMap[h.dia_semana] = h;
        });
    }

    let rows = '';
    for (let dia = 0; dia <= 6; dia++) {
        const h = horariosMap[dia] || {};
        const aberto = h.aberto !== undefined ? h.aberto : (dia === 0 ? 0 : 1);
        const disabled = aberto === 0 ? 'disabled' : '';

        rows += `
            <tr>
                <td><strong>${dias[dia]}</strong></td>
                <td>
                    <label class="switch">
                        <input type="checkbox" class="status-toggle" data-dia="${dia}" ${aberto === 1 ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <input type="time" class="hora-inicio" data-dia="${dia}" value="${h.hora_inicio || '09:00'}" ${disabled}>
                    às 
                    <input type="time" class="hora-fim" data-dia="${dia}" value="${h.hora_fim || '18:00'}" ${disabled}>
                </td>
                <td>
                    <input type="time" class="almoco-inicio" data-dia="${dia}" value="${h.almoco_inicio || '12:00'}" ${disabled}>
                    às 
                    <input type="time" class="almoco-fim" data-dia="${dia}" value="${h.almoco_fim || '13:00'}" ${disabled}>
                </td>
                <td>
                    <select class="intervalo-select" data-dia="${dia}" ${disabled}>
                        <option value="30" ${(h.intervalo_minutos || 30) === 30 ? 'selected' : ''}>30 min</option>
                        <option value="45" ${(h.intervalo_minutos || 30) === 45 ? 'selected' : ''}>45 min</option>
                        <option value="60" ${(h.intervalo_minutos || 30) === 60 ? 'selected' : ''}>60 min</option>
                    </select>
                </td>
            </tr>
        `;
    }

    return `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-clock"></i> Horários de Funcionamento</h3>
            </div>
            <p class="text-muted">Configure os dias e horários. As alterações são salvas automaticamente.</p>
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Dia</th>
                            <th>Status</th>
                            <th>Horário</th>
                            <th>Almoço</th>
                            <th>Intervalo</th>
                        </tr>
                    </thead>
                    <tbody id="horariosTableBody">
                        ${rows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ============================================
// RENDER CHATBOT
// ============================================
function renderChatbot(link) {
    return `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-robot"></i> Chatbot de Agendamento</h3>
            </div>
            <p class="text-muted">Compartilhe o link com seus clientes para agendarem automaticamente.</p>
            
            <div style="background: var(--bg-hover); padding: 20px; border-radius: 16px; margin: 20px 0;">
                <h4>📋 Regras do Chatbot:</h4>
                <ul style="margin-left: 20px; margin-top: 8px;">
                    <li>✅ Respeita horários de funcionamento</li>
                    <li>✅ Respeita o bloqueio geral de dias</li>
                    <li>✅ Você pode bloquear clientes na tela de Clientes</li>
                    <li>✅ Atendimento 24h automático</li>
                </ul>
            </div>
            
            <div class="form-group">
                <label>🔗 Link do Chatbot</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="chatbotLink" class="form-control" readonly style="flex:1; background: var(--bg-input);" value="${link || ''}">
                    <button class="btn-primary" onclick="copiarLinkChatbot()">📋 Copiar</button>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; background: var(--bg-hover); border-radius: 16px;">
                <p>📱 Escaneie o QR Code para acessar o chatbot:</p>
                <div id="qrCode" style="display: flex; justify-content: center; margin-top: 12px;"></div>
                <small style="color: var(--text-muted); display: block; margin-top: 8px;">Ou compartilhe o link acima com seus clientes</small>
            </div>
        </div>
    `;
}

// ============================================
// RENDER TEMA
// ============================================
function renderTema(temaAtual) {
    const isDark = temaAtual === 'dark';

    return `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-${isDark ? 'moon' : 'sun'}"></i> Tema</h3>
            </div>
            
            <div class="theme-settings">
                <div class="theme-toggle-container">
                    <div class="theme-info">
                        <i class="fas fa-${isDark ? 'moon' : 'sun'} theme-icon"></i>
                        <div>
                            <h4>${isDark ? '🌙 Tema Escuro' : '☀️ Tema Claro'}</h4>
                            <p>${isDark ? 'Interface escura para melhor visualização noturna' : 'Interface clara para melhor visualização durante o dia'}</p>
                        </div>
                    </div>
                    <div class="theme-switch-wrapper">
                        <label class="theme-switch">
                            <input type="checkbox" id="themeToggle" ${isDark ? 'checked' : ''} onchange="toggleTheme()">
                            <span class="slider round"></span>
                        </label>
                        <span class="theme-label">${isDark ? '🌙' : '☀️'}</span>
                    </div>
                </div>
                
                <div class="theme-preview">
                    <p style="color: var(--text-muted); font-size: 13px; margin-top: 12px;">
                        <i class="fas fa-info-circle"></i> 
                        O tema é salvo automaticamente no seu navegador
                    </p>
                    <div class="theme-preview-row">
                        <span class="preview-item">Exemplo Card</span>
                        <span class="preview-item active-preview">Botão</span>
                        <span class="preview-item">Texto</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// FUNÇÃO PARA ALTERNAR TEMA
// ============================================
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.checked = newTheme === 'dark';
    }

    showToast(`Tema ${newTheme === 'dark' ? '🌙 escuro' : '☀️ claro'} ativado!`, 'success');

    setTimeout(() => {
        carregarConfiguracoes();
    }, 300);
}

// ============================================
// FUNÇÕES DE HORÁRIOS
// ============================================
function inicializarHorariosEvents() {
    const tbody = document.getElementById('horariosTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('.status-toggle').forEach(toggle => {
        toggle.removeEventListener('change', handleStatusChange);
        toggle.addEventListener('change', handleStatusChange);
    });

    tbody.querySelectorAll('.hora-inicio, .hora-fim, .almoco-inicio, .almoco-fim, .intervalo-select').forEach(input => {
        input.removeEventListener('change', handleHorarioChange);
        input.addEventListener('change', handleHorarioChange);
    });
}

function handleStatusChange(e) {
    const dia = e.target.getAttribute('data-dia');
    const aberto = e.target.checked ? 1 : 0;
    const row = e.target.closest('tr');
    if (row) {
        row.querySelectorAll('input, select').forEach(input => {
            if (input !== e.target) input.disabled = !aberto;
        });
    }
    salvarHorario(dia, { aberto });
}

function handleHorarioChange(e) {
    const dia = e.target.getAttribute('data-dia');
    const campo = e.target.classList.contains('hora-inicio') ? 'hora_inicio' :
        e.target.classList.contains('hora-fim') ? 'hora_fim' :
            e.target.classList.contains('almoco-inicio') ? 'almoco_inicio' :
                e.target.classList.contains('almoco-fim') ? 'almoco_fim' : 'intervalo_minutos';
    const valor = campo === 'intervalo_minutos' ? parseInt(e.target.value) : e.target.value;
    salvarHorario(dia, { [campo]: valor });
}

async function salvarHorario(dia, dados) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/horarios/${dia}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(dados)
        });
        const data = await res.json();
        if (!data.success) {
            console.error('Erro ao salvar horário:', data.message);
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ============================================
// FUNÇÕES DO CHATBOT
// ============================================
async function carregarLinkChatbot() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario.empresa_id) return;

    try {
        const res = await fetch(`/api/chatbot/link/${usuario.empresa_id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            const linkInput = document.getElementById('chatbotLink');
            if (linkInput) linkInput.value = data.link;

            const qrDiv = document.getElementById('qrCode');
            if (qrDiv) {
                qrDiv.innerHTML = `
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data.link)}" 
                         alt="QR Code do Chatbot" 
                         style="border-radius: 12px; background: white; padding: 8px;">
                `;
            }
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

function copiarLinkChatbot() {
    const input = document.getElementById('chatbotLink');
    if (input) {
        input.select();
        document.execCommand('copy');
        showToast('Link copiado para a área de transferência! 📋', 'success');
    }
}

// ============================================
// FUNÇÕES DE PROFISSIONAIS
// ============================================
function abrirModalProfissional(profissional = null) {
    if (!profissional && !planoInfo.podeAdicionar) {
        showModal('Limite Atingido',
            `<p>Seu plano ${planoInfo.plano_nome} permite apenas ${planoInfo.limite} profissional(is).</p>
             <button class="btn-primary" onclick="carregarPlanos()">💎 Ver Planos</button>
             <button class="btn-secondary" onclick="fecharModalPersonalizado()">Fechar</button>`
        );
        return;
    }

    const isEdit = !!profissional;
    const modalContent = `
        <form id="formProfissional" onsubmit="salvarProfissional(event, ${isEdit ? profissional.id : 'null'})">
            <div class="form-group">
                <label>Nome *</label>
                <input type="text" id="prof-nome" class="form-control" value="${isEdit ? escapeHtml(profissional.nome) : ''}" placeholder="Nome completo" required>
            </div>
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="prof-email" class="form-control" value="${isEdit ? escapeHtml(profissional.email) : ''}" placeholder="email@exemplo.com" required>
            </div>
            <div class="form-group">
                <label>Telefone (opcional)</label>
                <input type="text" id="prof-telefone" class="form-control" value="${isEdit ? (profissional.telefone || '') : ''}" placeholder="(00) 00000-0000">
            </div>
            <div class="form-group">
                <label>${isEdit ? 'Nova Senha (opcional)' : 'Senha *'}</label>
                <input type="password" id="prof-senha" class="form-control" placeholder="${isEdit ? 'Deixe em branco para manter' : 'Crie uma senha'}" ${!isEdit ? 'required' : ''}>
            </div>
            <div class="form-group">
                <label>Comissão (%) *</label>
                <input type="number" id="prof-comissao" class="form-control" value="${isEdit ? profissional.comissao_percent : '30'}" min="0" max="100" required>
            </div>
            <div class="modal-buttons">
                <button type="submit" class="btn-primary">Salvar</button>
                <button type="button" class="btn-secondary" onclick="fecharModalPersonalizado()">Cancelar</button>
            </div>
        </form>
    `;
    showModal(isEdit ? '✏️ Editar Profissional' : '➕ Novo Profissional', modalContent);
}

async function salvarProfissional(event, id) {
    event.preventDefault();
    const nome = document.getElementById('prof-nome')?.value;
    const email = document.getElementById('prof-email')?.value;
    const telefone = document.getElementById('prof-telefone')?.value;
    const senha = document.getElementById('prof-senha')?.value;
    const comissao = parseInt(document.getElementById('prof-comissao')?.value);

    if (!nome || !email) {
        showToast('Preencha nome e email', 'warning');
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');
    const body = {
        nome: nome.trim(),
        email: email.trim(),
        comissao_percent: comissao || 30,
        telefone: telefone || ''
    };
    if (!id && senha) body.senha = senha;
    if (id && senha && senha.length > 0) body.senha = senha;

    try {
        const res = await fetch(id ? `/api/profissionais/${id}` : '/api/profissionais', {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast(data.message || 'Profissional salvo com sucesso!', 'success');
            fecharModalPersonalizado();
            carregarConfiguracoes();
        } else {
            showToast(data.message || 'Erro ao salvar profissional', 'error');
        }
    } catch (error) {
        hideLoading();
        showToast('Erro ao salvar profissional', 'error');
    }
}

function editarProfissional(id) {
    const profissional = profissionaisData.find(p => p.id === id);
    if (profissional) abrirModalProfissional(profissional);
}

async function resetarSenhaProfissional(id, nome) {
    const novaSenha = prompt(`Nova senha para ${nome}:`);
    if (!novaSenha || novaSenha.length < 4) {
        showToast('Senha deve ter 4+ caracteres', 'warning');
        return;
    }
    showLoading();
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/profissionais/${id}/reset-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ senha: novaSenha })
        });
        const data = await res.json();
        hideLoading();
        showToast(data.success ? 'Senha alterada com sucesso!' : data.message, data.success ? 'success' : 'error');
    } catch (error) {
        hideLoading();
        showToast('Erro ao resetar senha', 'error');
    }
}

async function alternarStatusProfissional(id, ativar) {
    if (!confirm(`Deseja ${ativar ? 'ativar' : 'desativar'} este profissional?`)) return;
    showLoading();
    const token = localStorage.getItem('token');
    try {
        await fetch(`/api/profissionais/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ ativo: ativar ? 1 : 0 })
        });
        hideLoading();
        showToast(`Profissional ${ativar ? 'ativado' : 'desativado'}!`, 'success');
        carregarConfiguracoes();
    } catch (error) {
        hideLoading();
        showToast('Erro ao alterar status', 'error');
    }
}

async function excluirProfissional(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir ${nome}?`)) return;
    showLoading();
    const token = localStorage.getItem('token');
    try {
        await fetch(`/api/profissionais/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        hideLoading();
        showToast('Profissional excluído com sucesso!', 'success');
        carregarConfiguracoes();
    } catch (error) {
        hideLoading();
        showToast('Erro ao excluir profissional', 'error');
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function fecharModalPersonalizado() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleDateString('pt-BR');
}

// ============================================
// FUNÇÃO PARA CARREGAR PLANOS
// ============================================
function carregarPlanos() {
    if (typeof window.carregarPlanos === 'function') {
        window.carregarPlanos();
    } else {
        showToast('Carregando página de planos...', 'info');
        const planosBtn = document.querySelector('#btnplanos');
        if (planosBtn) planosBtn.click();
    }
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.carregarConfiguracoes = carregarConfiguracoes;
window.switchConfigTab = switchConfigTab;
window.carregarHorarios = carregarHorarios;
window.carregarChatbot = carregarChatbot;
window.carregarBloqueioGeral = carregarBloqueioGeral;
window.salvarBloqueioGeral = salvarBloqueioGeral;
window.abrirModalProfissional = abrirModalProfissional;
window.salvarProfissional = salvarProfissional;
window.editarProfissional = editarProfissional;
window.resetarSenhaProfissional = resetarSenhaProfissional;
window.alternarStatusProfissional = alternarStatusProfissional;
window.excluirProfissional = excluirProfissional;
window.fecharModalPersonalizado = fecharModalPersonalizado;
window.copiarLinkChatbot = copiarLinkChatbot;
window.carregarLinkChatbot = carregarLinkChatbot;
window.toggleTheme = toggleTheme;
window.carregarPlanos = carregarPlanos;

console.log('✅ configuracoes.js carregado com BLOQUEIO GERAL!');