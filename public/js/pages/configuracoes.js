// Configurações Unificadas - Profissionais + Horários + Chatbot + Tema + BLOQUEIO GERAL + DADOS DA EMPRESA

let profissionaisData = [];
let planoInfo = { plano: 'trial', limite: 1, ativos: 0, podeAdicionar: true };

// ============================================
// FUNÇÃO PRINCIPAL (chamada pelo menu) - MOBILE MELHORADO
// ============================================
async function carregarConfiguracoes() {
    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('configuracoes');
    }
    ativarBotao('configuracoes');
    showLoading();

    const token = localStorage.getItem('token');
    const isMobile = window.innerWidth < 768;

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
            const ativos = profissionaisData.filter(p => p.ativo === true || p.ativo === 1).length;
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

        let diasBloqueioGeral = 0;
        if (empresaData.success && empresaData.data) {
            diasBloqueioGeral = empresaData.data.dias_bloqueio_geral || 0;
        }

        const temaSalvo = localStorage.getItem('theme') || 'light';

        let html = `
            <div class="fade-in">
                <div class="dashboard-header" style="flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'flex-start' : 'center'}; gap:${isMobile ? '8px' : '0'};">
                    <div>
                        <h2 class="page-title" style="font-size:${isMobile ? '20px' : '24px'};">⚙️ Configurações</h2>
                        <p class="page-subtitle" style="font-size:${isMobile ? '13px' : '14px'};">Gerencie todas as configurações da sua empresa</p>
                    </div>
                </div>
                
                <!-- TABS - VERSÃO MOBILE MELHORADA -->
                <div class="config-tabs" style="
                    display: flex;
                    gap: ${isMobile ? '4px' : '8px'};
                    margin-bottom: ${isMobile ? '12px' : '24px'};
                    flex-wrap: wrap;
                    background: var(--bg-card);
                    padding: ${isMobile ? '6px' : '8px'};
                    border-radius: ${isMobile ? '12px' : '16px'};
                    box-shadow: var(--card-shadow);
                    border: 1px solid var(--border-color);
                    ${isMobile ? 'overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch;' : ''}
                ">
                    <button class="config-tab active" onclick="switchConfigTab('profissionais')" style="
                        padding: ${isMobile ? '8px 14px' : '10px 20px'};
                        border: none;
                        border-radius: ${isMobile ? '8px' : '12px'};
                        background: transparent;
                        color: var(--text-secondary);
                        font-weight: 600;
                        font-size: ${isMobile ? '12px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: ${isMobile ? '4px' : '8px'};
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-users" style="font-size: ${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Prof' : 'Profissionais'}
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('horarios')" style="
                        padding: ${isMobile ? '8px 14px' : '10px 20px'};
                        border: none;
                        border-radius: ${isMobile ? '8px' : '12px'};
                        background: transparent;
                        color: var(--text-secondary);
                        font-weight: 600;
                        font-size: ${isMobile ? '12px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: ${isMobile ? '4px' : '8px'};
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-clock" style="font-size: ${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Horários' : 'Horários'}
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('bloqueio')" style="
                        padding: ${isMobile ? '8px 14px' : '10px 20px'};
                        border: none;
                        border-radius: ${isMobile ? '8px' : '12px'};
                        background: transparent;
                        color: var(--text-secondary);
                        font-weight: 600;
                        font-size: ${isMobile ? '12px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: ${isMobile ? '4px' : '8px'};
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-lock" style="font-size: ${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Bloqueio' : 'Bloqueio Geral'}
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('chatbot')" style="
                        padding: ${isMobile ? '8px 14px' : '10px 20px'};
                        border: none;
                        border-radius: ${isMobile ? '8px' : '12px'};
                        background: transparent;
                        color: var(--text-secondary);
                        font-weight: 600;
                        font-size: ${isMobile ? '12px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: ${isMobile ? '4px' : '8px'};
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-robot" style="font-size: ${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Chatbot' : 'Chatbot'}
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('tema')" style="
                        padding: ${isMobile ? '8px 14px' : '10px 20px'};
                        border: none;
                        border-radius: ${isMobile ? '8px' : '12px'};
                        background: transparent;
                        color: var(--text-secondary);
                        font-weight: 600;
                        font-size: ${isMobile ? '12px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: ${isMobile ? '4px' : '8px'};
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-${temaSalvo === 'dark' ? 'moon' : 'sun'}" style="font-size: ${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Tema' : 'Tema'}
                    </button>
                    <button class="config-tab" onclick="switchConfigTab('empresa')" style="
                        padding: ${isMobile ? '8px 14px' : '10px 20px'};
                        border: none;
                        border-radius: ${isMobile ? '8px' : '12px'};
                        background: transparent;
                        color: var(--text-secondary);
                        font-weight: 600;
                        font-size: ${isMobile ? '12px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: ${isMobile ? '4px' : '8px'};
                        white-space: nowrap;
                        flex-shrink: 0;
                    ">
                        <i class="fas fa-building" style="font-size: ${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Empresa' : 'Empresa'}
                    </button>
                </div>
                
                <div id="configContent">
                    ${renderProfissionaisMobile(isMobile)}
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;

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
// SWITCH TABS - CORRIGIDO COM MOBILE
// ============================================
function switchConfigTab(tab) {
    // Atualizar tabs
    document.querySelectorAll('.config-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = 'var(--text-secondary)';
        t.style.boxShadow = 'none';
    });

    const tabs = document.querySelectorAll('.config-tab');
    const index = ['profissionais', 'horarios', 'bloqueio', 'chatbot', 'tema', 'empresa'].indexOf(tab);
    if (tabs[index]) {
        tabs[index].classList.add('active');
        tabs[index].style.background = 'var(--gradient)';
        tabs[index].style.color = 'white';
        tabs[index].style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
    }

    // Carregar conteúdo
    switch (tab) {
        case 'profissionais':
            document.getElementById('configContent').innerHTML = renderProfissionaisMobile(window.innerWidth < 768);
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
        case 'empresa':
            carregarDadosEmpresa();
            break;
        default:
            break;
    }
}

// ============================================
// CARREGAR DADOS DA EMPRESA
// ============================================
async function carregarDadosEmpresa() {
    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/empresa/dados', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success && data.data) {
            document.getElementById('configContent').innerHTML = renderDadosEmpresa(data.data);
        } else {
            showToast('Erro ao carregar dados da empresa', 'error');
            document.getElementById('configContent').innerHTML = '<div class="card"><p class="text-muted">Erro ao carregar dados</p></div>';
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar dados da empresa', 'error');
        document.getElementById('configContent').innerHTML = '<div class="card"><p class="text-muted">Erro ao carregar dados</p></div>';
    }
    hideLoading();
}

// ============================================
// RENDER DADOS DA EMPRESA
// ============================================
function renderDadosEmpresa(empresa) {
    const isMobile = window.innerWidth < 768;

    return `
        <div class="card" style="padding: ${isMobile ? '14px' : '24px'};">
            <div class="card-header">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-building" style="color: var(--primary);"></i> Dados do Estabelecimento
                </h3>
            </div>
            <p class="text-muted" style="font-size: ${isMobile ? '13px' : '14px'}; margin-top: 4px;">Essas informações aparecem nas mensagens enviadas para os clientes.</p>
            
            <form id="formEmpresa" onsubmit="salvarDadosEmpresa(event)">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">
                        <i class="fas fa-store"></i> Nome do Estabelecimento *
                    </label>
                    <input type="text" id="emp-nome" class="form-control" 
                           value="${escapeHtml(empresa.nome || '')}" 
                           placeholder="Nome da sua empresa"
                           required style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                </div>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">
                        <i class="fas fa-phone"></i> Telefone do Dono *
                    </label>
                    <input type="text" id="emp-telefone" class="form-control" 
                           value="${escapeHtml(empresa.telefone_dono || '')}" 
                           placeholder="(00) 00000-0000"
                           required style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                </div>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">
                        <i class="fas fa-map-marker-alt"></i> Endereço
                    </label>
                    <textarea id="emp-endereco" class="form-control" 
                              placeholder="Rua, número, bairro, cidade - UF"
                              rows="2" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary); font-family: 'Inter', sans-serif;">${escapeHtml(empresa.endereco || '')}</textarea>
                </div>
                
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button type="submit" style="
                        padding: ${isMobile ? '10px 24px' : '12px 28px'};
                        background: var(--gradient);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: ${isMobile ? '13px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        ${isMobile ? 'width: 100%; justify-content: center;' : ''}
                    ">
                        <i class="fas fa-save"></i> Salvar Alterações
                    </button>
                    <button type="button" onclick="carregarDadosEmpresa()" style="
                        padding: ${isMobile ? '10px 24px' : '12px 28px'};
                        background: var(--bg-hover);
                        color: var(--text-primary);
                        border: 1px solid var(--border-color);
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: ${isMobile ? '13px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        ${isMobile ? 'width: 100%; justify-content: center;' : ''}
                    ">
                        <i class="fas fa-undo"></i> Recarregar
                    </button>
                </div>
            </form>
            
            <div style="margin-top: 16px; padding: ${isMobile ? '14px' : '16px'}; background: var(--bg-hover); border-radius: 10px;">
                <h4 style="margin: 0 0 8px 0; color: var(--text-primary); font-size: ${isMobile ? '14px' : '16px'};">
                    <i class="fas fa-info-circle" style="color: var(--primary);"></i> Onde essas informações são usadas?
                </h4>
                <ul style="margin: 0; padding-left: 20px; line-height: ${isMobile ? '2' : '2'}; color: var(--text-secondary); font-size: ${isMobile ? '13px' : '14px'};">
                    <li>📱 <strong>Mensagens de confirmação</strong> enviadas aos clientes</li>
                    <li>📱 <strong>Mensagens de conclusão</strong> após o serviço</li>
                    <li>📍 <strong>Endereço</strong> aparece para orientar os clientes</li>
                    <li>📞 <strong>Telefone</strong> para contato direto com o estabelecimento</li>
                </ul>
            </div>
        </div>
    `;
}

// ============================================
// SALVAR DADOS DA EMPRESA
// ============================================
async function salvarDadosEmpresa(event) {
    event.preventDefault();

    const nome = document.getElementById('emp-nome')?.value;
    const telefone = document.getElementById('emp-telefone')?.value;
    const endereco = document.getElementById('emp-endereco')?.value;

    if (!nome || !telefone) {
        showToast('Preencha o nome e telefone do estabelecimento', 'warning');
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/empresa/dados', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                nome: nome.trim(),
                telefone_dono: telefone.trim(),
                endereco: endereco ? endereco.trim() : ''
            })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('✅ Dados do estabelecimento atualizados com sucesso!', 'success');

            // Atualizar o nome da empresa no localStorage se mudou
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            if (usuario.empresa_nome !== nome) {
                usuario.empresa_nome = nome;
                localStorage.setItem('usuario', JSON.stringify(usuario));
            }

            carregarDadosEmpresa();
        } else {
            showToast(data.message || 'Erro ao atualizar dados', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        showToast('Erro ao salvar dados da empresa', 'error');
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
// RENDER BLOQUEIO GERAL - VERSÃO MOBILE MELHORADA
// ============================================
function renderBloqueioGeral(diasAtual) {
    const isMobile = window.innerWidth < 768;

    const opcoes = [
        { value: 0, label: '❌ Desativado (0 dias)', desc: 'Cliente pode agendar no dia seguinte (mas não no mesmo dia)' },
        { value: 7, label: '📅 7 dias', desc: 'Cliente só pode agendar 1 vez por semana' },
        { value: 14, label: '📅 14 dias', desc: 'Cliente só pode agendar 1 vez a cada 2 semanas' },
        { value: 30, label: '📅 30 dias', desc: 'Cliente só pode agendar 1 vez por mês' }
    ];

    const descricaoAtual = opcoes.find(o => o.value === diasAtual)?.desc || '';

    return `
        <div class="card" style="padding: ${isMobile ? '14px' : '24px'};">
            <div class="card-header">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-lock" style="color: var(--primary);"></i> Bloqueio Geral de Agendamentos
                </h3>
            </div>
            
            <div style="
                background: #fef3c720;
                padding: ${isMobile ? '12px' : '16px'};
                border-radius: 10px;
                margin-bottom: 16px;
                border-left: 4px solid #f59e0b;
            ">
                <p style="margin: 0; color: var(--text-secondary); font-size: ${isMobile ? '13px' : '14px'};">
                    <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                    <strong>Regra fixa:</strong> Cliente NÃO pode fazer mais de 1 agendamento por dia.
                    <br>
                    <strong>Bloqueio geral:</strong> Define quantos dias os clientes devem esperar entre um agendamento e outro.
                </p>
            </div>
            
            <div class="form-group" style="max-width: ${isMobile ? '100%' : '400px'};">
                <label style="font-weight: 600; display: block; margin-bottom: 6px; color: var(--text-primary); font-size: ${isMobile ? '13px' : '14px'};">
                    <i class="fas fa-calendar-alt"></i> Dias de bloqueio entre agendamentos:
                </label>
                <select id="bloqueioGeralSelect" class="form-control" style="
                    width: 100%;
                    padding: ${isMobile ? '10px 14px' : '12px 16px'};
                    border: 2px solid var(--border-color);
                    border-radius: 10px;
                    font-size: ${isMobile ? '14px' : '15px'};
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
                    font-size: ${isMobile ? '12px' : '13px'};
                    padding: ${isMobile ? '8px 10px' : '8px 12px'};
                    background: var(--bg-hover);
                    border-radius: 8px;
                    border-left: 3px solid var(--primary);
                ">
                    <i class="fas fa-info-circle"></i> ${descricaoAtual}
                </small>
            </div>
            
            <button onclick="salvarBloqueioGeral()" style="
                margin-top: 10px;
                padding: ${isMobile ? '10px 24px' : '12px 28px'};
                background: var(--gradient);
                color: white;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                font-size: ${isMobile ? '13px' : '14px'};
                cursor: pointer;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                ${isMobile ? 'width: 100%; justify-content: center;' : ''}
            ">
                <i class="fas fa-save"></i> Salvar Bloqueio Geral
            </button>
            
            <div style="margin-top: 16px; padding: ${isMobile ? '14px' : '16px'}; background: var(--bg-hover); border-radius: 10px;">
                <h4 style="margin: 0 0 8px 0; color: var(--text-primary); font-size: ${isMobile ? '14px' : '16px'};">📋 Como funciona:</h4>
                <ul style="margin: 0; padding-left: 20px; line-height: ${isMobile ? '2' : '2'}; color: var(--text-secondary); font-size: ${isMobile ? '13px' : '14px'};">
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
// RENDER PROFISSIONAIS - VERSÃO MOBILE
// ============================================
function renderProfissionaisMobile(isMobile) {
    const podeAdicionar = planoInfo.podeAdicionar;

    return `
        <div class="card" style="padding: ${isMobile ? '14px' : '24px'};">
            <div class="card-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'stretch' : 'center'}; gap: ${isMobile ? '10px' : '0'};">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-users" style="color: var(--primary);"></i> Profissionais
                </h3>
                ${podeAdicionar ?
            `<button onclick="abrirModalProfissional()" style="
                        padding: ${isMobile ? '10px 16px' : '10px 24px'};
                        background: var(--gradient);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: ${isMobile ? '13px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        justify-content: center;
                        ${isMobile ? 'width: 100%;' : ''}
                    ">
                        <i class="fas fa-plus"></i> Novo Profissional
                    </button>` :
            `<button disabled style="
                        padding: ${isMobile ? '10px 16px' : '10px 24px'};
                        background: var(--bg-hover);
                        color: var(--text-muted);
                        border: 1px solid var(--border-color);
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: ${isMobile ? '13px' : '14px'};
                        cursor: not-allowed;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        justify-content: center;
                        ${isMobile ? 'width: 100%;' : ''}
                    ">
                        <i class="fas fa-lock"></i> Limite Atingido
                    </button>`
        }
            </div>
            
            <!-- Plano Info - Mobile Melhorado -->
            <div style="
                background: ${planoInfo.is_trial ? 'linear-gradient(135deg, #f59e0b20, #f59e0b08)' : 'linear-gradient(135deg, #667eea20, #764ba208)'};
                padding: ${isMobile ? '14px' : '16px'};
                border-radius: 12px;
                margin-bottom: 16px;
                border-left: 4px solid ${planoInfo.is_trial ? '#f59e0b' : '#667eea'};
            ">
                <div style="display: flex; flex-direction: ${isMobile ? 'column' : 'row'}; justify-content: space-between; align-items: ${isMobile ? 'flex-start' : 'center'}; gap: ${isMobile ? '10px' : '0'};">
                    <div style="width: 100%;">
                        <strong style="font-size: ${isMobile ? '14px' : '16px'};">📋 Plano ${planoInfo.plano_nome}</strong>
                        <br>
                        <small style="font-size: ${isMobile ? '12px' : '13px'}; color: var(--text-muted);">Limite: ${planoInfo.limite} profissional(is)</small>
                        <div style="margin-top: 6px; width: 100%;">
                            <div style="background: var(--bg-hover); border-radius: 10px; height: 6px; width: 100%; overflow: hidden;">
                                <div style="width: ${Math.min((planoInfo.ativos / planoInfo.limite) * 100, 100)}%; background: var(--gradient); height: 100%; transition: width 0.5s ease;"></div>
                            </div>
                            <small style="font-size: ${isMobile ? '11px' : '12px'}; color: var(--text-muted);">${planoInfo.ativos} de ${planoInfo.limite} utilizado(s)</small>
                        </div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; ${isMobile ? 'width: 100%;' : ''}">
                        ${planoInfo.is_trial ?
            `<span style="
                                background: #f59e0b;
                                color: white;
                                padding: ${isMobile ? '4px 12px' : '4px 12px'};
                                border-radius: 20px;
                                font-size: ${isMobile ? '12px' : '13px'};
                                font-weight: 600;
                                ${isMobile ? 'width: 100%; text-align: center;' : ''}
                            ">🎯 Trial: ${planoInfo.dias_restantes} dias</span>` :
            `<span style="
                                background: #48bb78;
                                color: white;
                                padding: ${isMobile ? '4px 12px' : '4px 12px'};
                                border-radius: 20px;
                                font-size: ${isMobile ? '12px' : '13px'};
                                font-weight: 600;
                                ${isMobile ? 'width: 100%; text-align: center;' : ''}
                            ">✅ Válido até: ${planoInfo.valida_ate || 'N/A'}</span>`
        }
                        ${!planoInfo.podeAdicionar && planoInfo.ativos > 0 ?
            `<button onclick="carregarPlanos()" style="
                                background: var(--gradient);
                                color: white;
                                border: none;
                                padding: ${isMobile ? '8px 16px' : '6px 16px'};
                                border-radius: 20px;
                                font-size: ${isMobile ? '12px' : '13px'};
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                ${isMobile ? 'width: 100%;' : ''}
                            ">💎 Upgrade</button>` : ''
        }
                    </div>
                </div>
            </div>
            
            <!-- Lista de Profissionais - Mobile Cards -->
            ${isMobile ? `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${profissionaisData && profissionaisData.length > 0 ? profissionaisData.map(prof => `
                        <div style="
                            background: var(--bg-card);
                            border-radius: 12px;
                            padding: 14px 16px;
                            border: 1px solid var(--border-color);
                            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div>
                                    <div style="font-size: 15px; font-weight: 600; color: var(--text-primary);">${escapeHtml(prof.nome)}</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(prof.email)}</div>
                                </div>
                                <div style="display: flex; gap: 4px;">
                                    ${(prof.ativo === true || prof.ativo === 1) ?
                '<span style="background: #22c55e; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">✅ Ativo</span>' :
                '<span style="background: #ef4444; color: white; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">❌ Inativo</span>'
            }
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                                <span>💰 Comissão: <strong style="color: var(--text-primary);">${prof.comissao_percent}%</strong></span>
                                <span>📅 ${formatarData(prof.created_at)}</span>
                            </div>
                            <div style="display: flex; gap: 6px; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid var(--border-color);">
                                <button onclick="editarProfissional(${prof.id})" style="
                                    padding: 6px 14px;
                                    border-radius: 8px;
                                    border: 1px solid rgba(102,126,234,0.3);
                                    background: var(--bg-hover);
                                    color: var(--primary);
                                    font-size: 12px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    gap: 4px;
                                    flex: 1;
                                    justify-content: center;
                                ">
                                    <i class="fas fa-pen"></i> Editar
                                </button>
                                <button onclick="resetarSenhaProfissional(${prof.id}, '${escapeHtml(prof.nome)}')" style="
                                    padding: 6px 14px;
                                    border-radius: 8px;
                                    border: 1px solid rgba(245,158,11,0.3);
                                    background: var(--bg-hover);
                                    color: #f59e0b;
                                    font-size: 12px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    gap: 4px;
                                    flex: 1;
                                    justify-content: center;
                                ">
                                    <i class="fas fa-key"></i> Senha
                                </button>
                                <button onclick="alternarStatusProfissional(${prof.id}, ${(prof.ativo === true || prof.ativo === 1) ? 'false' : 'true'})" style="
                                    padding: 6px 14px;
                                    border-radius: 8px;
                                    border: 1px solid ${(prof.ativo === true || prof.ativo === 1) ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
                                    background: var(--bg-hover);
                                    color: ${(prof.ativo === true || prof.ativo === 1) ? '#ef4444' : '#22c55e'};
                                    font-size: 12px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    gap: 4px;
                                    flex: 1;
                                    justify-content: center;
                                ">
                                    <i class="fas ${(prof.ativo === true || prof.ativo === 1) ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                                    ${(prof.ativo === true || prof.ativo === 1) ? 'Desativar' : 'Ativar'}
                                </button>
                                <button onclick="excluirProfissional(${prof.id}, '${escapeHtml(prof.nome)}')" style="
                                    padding: 6px 14px;
                                    border-radius: 8px;
                                    border: 1px solid rgba(239,68,68,0.3);
                                    background: var(--bg-hover);
                                    color: #ef4444;
                                    font-size: 12px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    display: flex;
                                    align-items: center;
                                    gap: 4px;
                                    flex: 1;
                                    justify-content: center;
                                ">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align: center; padding: 30px 20px; color: var(--text-muted);">
                            <i class="fas fa-users" style="font-size: 32px; opacity: 0.3; display: block; margin-bottom: 10px;"></i>
                            <p style="margin: 0;">Nenhum profissional cadastrado</p>
                        </div>
                    `}
                </div>
            ` : `
                <!-- Desktop: Tabela -->
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
                        <tbody id="profissionaisTableBody">${profissionaisData && profissionaisData.length > 0 ? profissionaisData.map(prof => `
                            <tr>
                                <td><strong>${escapeHtml(prof.nome)}</strong></td>
                                <td>${escapeHtml(prof.email)}</td>
                                <td><span class="badge">${prof.comissao_percent}%</span></td>
                                <td>${(prof.ativo === true || prof.ativo === 1) ? '<span class="badge-success">✅ Ativo</span>' : '<span class="badge-danger">❌ Inativo</span>'}</td>
                                <td>${formatarData(prof.created_at)}</td>
                                <td class="actions-cell">
                                    <button class="btn-icon btn-edit" onclick="editarProfissional(${prof.id})">✏️</button>
                                    <button class="btn-icon btn-key" onclick="resetarSenhaProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🔑</button>
                                    <button class="btn-icon btn-toggle" onclick="alternarStatusProfissional(${prof.id}, ${(prof.ativo === true || prof.ativo === 1) ? 'false' : 'true'})" title="${(prof.ativo === true || prof.ativo === 1) ? 'Desativar' : 'Ativar'}">
                                        ${(prof.ativo === true || prof.ativo === 1) ? '🔴' : '🟢'}
                                    </button>
                                    <button class="btn-icon btn-delete" onclick="excluirProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🗑️</button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr><td colspan="6" style="text-align:center; padding: 30px;">Nenhum profissional cadastrado</td></tr>
                        `}</tbody>
                    </table>
                </div>
            `}
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
            <td>${(prof.ativo === true || prof.ativo === 1) ? '<span class="badge-success">✅ Ativo</span>' : '<span class="badge-danger">❌ Inativo</span>'}</td>
            <td>${formatarData(prof.created_at)}</td>
            <td class="actions-cell">
                <button class="btn-icon btn-edit" onclick="editarProfissional(${prof.id})">✏️</button>
                <button class="btn-icon btn-key" onclick="resetarSenhaProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🔑</button>
                <button class="btn-icon btn-toggle" onclick="alternarStatusProfissional(${prof.id}, ${(prof.ativo === true || prof.ativo === 1) ? 'false' : 'true'})" title="${(prof.ativo === true || prof.ativo === 1) ? 'Desativar' : 'Ativar'}">
                    ${(prof.ativo === true || prof.ativo === 1) ? '🔴' : '🟢'}
                </button>
                <button class="btn-icon btn-delete" onclick="excluirProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// RENDER HORÁRIOS - VERSÃO MOBILE MELHORADA
// ============================================
function renderHorarios(horarios) {
    const isMobile = window.innerWidth < 768;
    const dias = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };

    let horariosMap = {};
    if (horarios && horarios.length > 0) {
        horarios.forEach(h => {
            horariosMap[h.dia_semana] = h;
        });
    }

    if (isMobile) {
        // ============================================
        // VERSÃO MOBILE - CARDS
        // ============================================
        let cards = '';
        for (let dia = 0; dia <= 6; dia++) {
            const h = horariosMap[dia] || {};
            const aberto = h.aberto !== undefined ? (h.aberto === true || h.aberto === 1 ? 1 : 0) : (dia === 0 ? 0 : 1);
            const disabled = aberto === 0 ? 'disabled' : '';

            cards += `
                <div style="
                    background: var(--bg-card);
                    border-radius: 12px;
                    padding: 14px 16px;
                    border: 1px solid var(--border-color);
                    margin-bottom: 10px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong style="font-size: 15px; color: var(--text-primary);">${dias[dia]}</strong>
                        <label class="switch">
                            <input type="checkbox" class="status-toggle" data-dia="${dia}" ${(aberto === true || aberto === 1) ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="font-size: 12px; color: var(--text-muted);">⏰ Horário:</span>
                            <input type="time" class="hora-inicio" data-dia="${dia}" value="${h.hora_inicio || '09:00'}" ${disabled} style="
                                padding: 4px 8px;
                                border: 1px solid var(--border-color);
                                border-radius: 6px;
                                background: var(--bg-input);
                                color: var(--text-primary);
                                font-size: 12px;
                                flex: 1;
                                min-width: 70px;
                            ">
                            <span style="color: var(--text-muted);">às</span>
                            <input type="time" class="hora-fim" data-dia="${dia}" value="${h.hora_fim || '18:00'}" ${disabled} style="
                                padding: 4px 8px;
                                border: 1px solid var(--border-color);
                                border-radius: 6px;
                                background: var(--bg-input);
                                color: var(--text-primary);
                                font-size: 12px;
                                flex: 1;
                                min-width: 70px;
                            ">
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <span style="font-size: 12px; color: var(--text-muted);">🍽️ Almoço:</span>
                            <input type="time" class="almoco-inicio" data-dia="${dia}" value="${h.almoco_inicio || '12:00'}" ${disabled} style="
                                padding: 4px 8px;
                                border: 1px solid var(--border-color);
                                border-radius: 6px;
                                background: var(--bg-input);
                                color: var(--text-primary);
                                font-size: 12px;
                                flex: 1;
                                min-width: 70px;
                            ">
                            <span style="color: var(--text-muted);">às</span>
                            <input type="time" class="almoco-fim" data-dia="${dia}" value="${h.almoco_fim || '13:00'}" ${disabled} style="
                                padding: 4px 8px;
                                border: 1px solid var(--border-color);
                                border-radius: 6px;
                                background: var(--bg-input);
                                color: var(--text-primary);
                                font-size: 12px;
                                flex: 1;
                                min-width: 70px;
                            ">
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 12px; color: var(--text-muted);">⏱️ Intervalo:</span>
                            <select class="intervalo-select" data-dia="${dia}" ${disabled} style="
                                padding: 4px 8px;
                                border: 1px solid var(--border-color);
                                border-radius: 6px;
                                background: var(--bg-input);
                                color: var(--text-primary);
                                font-size: 12px;
                                flex: 1;
                            ">
                                <option value="30" ${(h.intervalo_minutos || 30) === 30 ? 'selected' : ''}>30 min</option>
                                <option value="45" ${(h.intervalo_minutos || 30) === 45 ? 'selected' : ''}>45 min</option>
                                <option value="60" ${(h.intervalo_minutos || 30) === 60 ? 'selected' : ''}>60 min</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="card" style="padding: 14px;">
                <div class="card-header" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                    <h3 style="font-size: 16px; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-clock" style="color: var(--primary);"></i> Horários de Funcionamento
                    </h3>
                    <p class="text-muted" style="font-size: 12px; margin: 0;">Configure os dias e horários. As alterações são salvas automaticamente.</p>
                </div>
                <div style="margin-top: 12px;">
                    ${cards}
                </div>
            </div>
        `;
    } else {
        // ============================================
        // VERSÃO DESKTOP - TABELA
        // ============================================
        let rows = '';
        for (let dia = 0; dia <= 6; dia++) {
            const h = horariosMap[dia] || {};
            const aberto = h.aberto !== undefined ? (h.aberto === true || h.aberto === 1 ? 1 : 0) : (dia === 0 ? 0 : 1);
            const disabled = aberto === 0 ? 'disabled' : '';

            rows += `
                <tr>
                    <td><strong>${dias[dia]}</strong></td>
                    <td>
                        <label class="switch">
                            <input type="checkbox" class="status-toggle" data-dia="${dia}" ${(aberto === true || aberto === 1) ? 'checked' : ''}>
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
}

// ============================================
// RENDER CHATBOT - VERSÃO MOBILE MELHORADA
// ============================================
function renderChatbot(link) {
    const isMobile = window.innerWidth < 768;

    return `
        <div class="card" style="padding: ${isMobile ? '14px' : '24px'};">
            <div class="card-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'flex-start' : 'center'}; gap: ${isMobile ? '8px' : '0'};">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-robot" style="color: var(--primary);"></i> Chatbot de Agendamento
                </h3>
            </div>
            <p class="text-muted" style="font-size: ${isMobile ? '13px' : '14px'}; margin-top: 4px;">Compartilhe o link com seus clientes para agendarem automaticamente.</p>
            
            <div style="
                background: var(--bg-hover);
                padding: ${isMobile ? '14px' : '20px'};
                border-radius: 12px;
                margin: ${isMobile ? '12px 0' : '20px 0'};
            ">
                <h4 style="font-size: ${isMobile ? '14px' : '16px'}; margin: 0 0 8px 0;">📋 Regras do Chatbot:</h4>
                <ul style="margin: 0; padding-left: 20px; line-height: 2; font-size: ${isMobile ? '13px' : '14px'}; color: var(--text-secondary);">
                    <li>✅ Respeita horários de funcionamento</li>
                    <li>✅ Respeita o bloqueio geral de dias</li>
                    <li>✅ Você pode bloquear clientes na tela de Clientes</li>
                    <li>✅ Atendimento 24h automático</li>
                </ul>
            </div>
            
            <div class="form-group">
                <label style="font-weight: 600; display: block; margin-bottom: 6px; font-size: ${isMobile ? '13px' : '14px'};">
                    <i class="fas fa-link"></i> Link do Chatbot
                </label>
                <div style="display: flex; gap: 8px; flex-direction: ${isMobile ? 'column' : 'row'};">
                    <input type="text" id="chatbotLink" class="form-control" readonly style="
                        flex: 1;
                        padding: ${isMobile ? '10px 12px' : '10px 14px'};
                        border: 2px solid var(--border-color);
                        border-radius: 8px;
                        background: var(--bg-input);
                        color: var(--text-primary);
                        font-size: ${isMobile ? '13px' : '14px'};
                        ${isMobile ? 'width: 100%;' : ''}
                    " value="${link || ''}">
                    <button onclick="copiarLinkChatbot()" style="
                        padding: ${isMobile ? '10px 16px' : '8px 20px'};
                        background: var(--gradient);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: ${isMobile ? '13px' : '14px'};
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        justify-content: center;
                        ${isMobile ? 'width: 100%;' : ''}
                    ">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: ${isMobile ? '16px' : '20px'}; padding: ${isMobile ? '16px' : '20px'}; background: var(--bg-hover); border-radius: 12px;">
                <p style="font-size: ${isMobile ? '13px' : '14px'}; margin: 0 0 12px 0;">📱 Escaneie o QR Code para acessar o chatbot:</p>
                <div id="qrCode" style="display: flex; justify-content: center;"></div>
                <small style="color: var(--text-muted); display: block; margin-top: 8px; font-size: ${isMobile ? '11px' : '12px'};">Ou compartilhe o link acima com seus clientes</small>
            </div>
        </div>
    `;
}

// ============================================
// RENDER TEMA - VERSÃO MOBILE MELHORADA
// ============================================
function renderTema(temaAtual) {
    const isMobile = window.innerWidth < 768;
    const isDark = temaAtual === 'dark';

    return `
        <div class="card" style="padding: ${isMobile ? '14px' : '24px'};">
            <div class="card-header">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-${isDark ? 'moon' : 'sun'}" style="color: var(--primary);"></i> Tema
                </h3>
            </div>
            
            <div class="theme-settings">
                <div class="theme-toggle-container" style="
                    display: flex;
                    flex-direction: ${isMobile ? 'column' : 'row'};
                    justify-content: space-between;
                    align-items: ${isMobile ? 'center' : 'center'};
                    padding: ${isMobile ? '14px' : '16px'};
                    background: var(--bg-hover);
                    border-radius: 10px;
                    gap: ${isMobile ? '12px' : '16px'};
                    text-align: ${isMobile ? 'center' : 'left'};
                ">
                    <div class="theme-info" style="
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        flex-direction: ${isMobile ? 'column' : 'row'};
                        text-align: ${isMobile ? 'center' : 'left'};
                    ">
                        <i class="fas fa-${isDark ? 'moon' : 'sun'} theme-icon" style="
                            font-size: ${isMobile ? '28px' : '32px'};
                            color: var(--primary);
                        "></i>
                        <div>
                            <h4 style="font-size: ${isMobile ? '15px' : '16px'}; margin: 0; color: var(--text-primary);">
                                ${isDark ? '🌙 Tema Escuro' : '☀️ Tema Claro'}
                            </h4>
                            <p style="font-size: ${isMobile ? '12px' : '13px'}; color: var(--text-muted); margin: 4px 0 0 0;">
                                ${isDark ? 'Interface escura para melhor visualização noturna' : 'Interface clara para melhor visualização durante o dia'}
                            </p>
                        </div>
                    </div>
                    <div class="theme-switch-wrapper" style="display: flex; align-items: center; gap: 10px;">
                        <label class="theme-switch" style="position: relative; display: inline-block; width: 52px; height: 28px;">
                            <input type="checkbox" id="themeToggle" ${isDark ? 'checked' : ''} onchange="toggleTheme()" style="opacity: 0; width: 0; height: 0;">
                            <span class="slider" style="
                                position: absolute;
                                cursor: pointer;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: ${isDark ? 'var(--gradient)' : '#ccc'};
                                transition: 0.4s;
                                border-radius: 34px;
                            "></span>
                            <span class="slider:before" style="
                                position: absolute;
                                content: '';
                                height: 22px;
                                width: 22px;
                                left: 3px;
                                bottom: 3px;
                                background: white;
                                transition: 0.4s;
                                border-radius: 50%;
                                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                                transform: ${isDark ? 'translateX(24px)' : 'none'};
                            "></span>
                        </label>
                        <span class="theme-label" style="font-size: ${isMobile ? '22px' : '24px'};">${isDark ? '🌙' : '☀️'}</span>
                    </div>
                </div>
                
                <div class="theme-preview" style="
                    margin-top: 14px;
                    padding: ${isMobile ? '14px' : '16px'};
                    background: var(--bg-secondary);
                    border-radius: 10px;
                    border: 1px solid var(--border-color);
                ">
                    <p style="color: var(--text-muted); font-size: ${isMobile ? '12px' : '13px'}; margin: 0 0 10px 0;">
                        <i class="fas fa-info-circle"></i> 
                        O tema é salvo automaticamente no seu navegador
                    </p>
                    <div class="theme-preview-row" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <span class="preview-item" style="
                            padding: ${isMobile ? '6px 12px' : '8px 16px'};
                            background: var(--bg-card);
                            border-radius: 8px;
                            border: 1px solid var(--border-color);
                            font-size: ${isMobile ? '12px' : '13px'};
                            color: var(--text-secondary);
                        ">Exemplo Card</span>
                        <span class="preview-item active-preview" style="
                            padding: ${isMobile ? '6px 12px' : '8px 16px'};
                            background: var(--gradient);
                            border-radius: 8px;
                            border: 1px solid transparent;
                            font-size: ${isMobile ? '12px' : '13px'};
                            color: white;
                        ">Botão</span>
                        <span class="preview-item" style="
                            padding: ${isMobile ? '6px 12px' : '8px 16px'};
                            background: var(--bg-card);
                            border-radius: 8px;
                            border: 1px solid var(--border-color);
                            font-size: ${isMobile ? '12px' : '13px'};
                            color: var(--text-secondary);
                        ">Texto</span>
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
    const isMobile = window.innerWidth < 768;

    // 🔥 Para MOBILE: usar cards
    if (isMobile) {
        // Toggle status
        document.querySelectorAll('.status-toggle').forEach(toggle => {
            toggle.removeEventListener('change', handleStatusChangeMobile);
            toggle.addEventListener('change', handleStatusChangeMobile);
        });

        // Inputs de horário
        document.querySelectorAll('.hora-inicio, .hora-fim, .almoco-inicio, .almoco-fim, .intervalo-select').forEach(input => {
            input.removeEventListener('change', handleHorarioChangeMobile);
            input.addEventListener('change', handleHorarioChangeMobile);
        });
    } else {
        // 🔥 Para DESKTOP: usar tabela
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
        console.log('📤 Salvando horário:', { dia, dados });

        const res = await fetch(`/api/horarios/${dia}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(dados)
        });

        const data = await res.json();
        console.log('📥 Resposta:', data);

        if (!data.success) {
            console.error('❌ Erro ao salvar horário:', data.message);
            showToast('Erro ao salvar horário: ' + data.message, 'error');
            return false;
        }

        showToast('✅ Horário atualizado com sucesso!', 'success');

        // 🔥 RECARREGAR OS HORÁRIOS
        if (typeof carregarConfiguracoes === 'function') {
            await carregarConfiguracoes();
        }

        // 🔥 RECARREGAR A AGENDA
        if (typeof carregarAgendaInteligente === 'function') {
            carregarAgendaInteligente();
        }

        return true;

    } catch (error) {
        console.error('❌ Erro:', error);
        showToast('Erro ao salvar horário', 'error');
        return false;
    }
}

// ============================================
// HANDLERS PARA MOBILE (CARDS)
// ============================================

function handleStatusChangeMobile(e) {
    const dia = e.target.getAttribute('data-dia');
    const aberto = e.target.checked ? 1 : 0;

    // Encontrar o card pai
    const card = e.target.closest('div[style*="background: var(--bg-card)"]');
    if (card) {
        card.querySelectorAll('input, select').forEach(input => {
            if (input !== e.target && input.type !== 'checkbox') {
                input.disabled = !aberto;
            }
        });
    }

    salvarHorario(dia, { aberto });
}

function handleHorarioChangeMobile(e) {
    const dia = e.target.getAttribute('data-dia');
    const campo = e.target.classList.contains('hora-inicio') ? 'hora_inicio' :
        e.target.classList.contains('hora-fim') ? 'hora_fim' :
            e.target.classList.contains('almoco-inicio') ? 'almoco_inicio' :
                e.target.classList.contains('almoco-fim') ? 'almoco_fim' : 'intervalo_minutos';
    const valor = campo === 'intervalo_minutos' ? parseInt(e.target.value) : e.target.value;
    salvarHorario(dia, { [campo]: valor });
}

// ============================================
// CARREGAR LINK DO CHATBOT (VERSÃO PERSONALIZADA - CORRIGIDA)
// ============================================
async function carregarLinkChatbot() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('⚠️ Token não encontrado');
            return;
        }

        let empresaId = null;

        // 🔥 TENTAR PEGAR DO TOKEN
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            empresaId = payload.empresa_id || payload.empresaId || payload.id;
            console.log('🔑 Empresa ID do token:', empresaId);
        } catch (e) {
            console.warn('⚠️ Não foi possível decodificar o token:', e.message);
        }

        // 🔥 SE NÃO TIVER NO TOKEN, BUSCAR DO USUÁRIO
        if (!empresaId) {
            try {
                const usuarioStr = localStorage.getItem('usuario');
                if (usuarioStr) {
                    const usuario = JSON.parse(usuarioStr);
                    empresaId = usuario.empresa_id || usuario.empresaId || usuario.id;
                    console.log('👤 Empresa ID do usuário:', empresaId);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao ler usuário:', e.message);
            }
        }

        // 🔥 SE AINDA NÃO TIVER, BUSCAR DA API
        if (!empresaId) {
            console.log('🔄 Buscando empresa ID da API...');
            try {
                const res = await fetch('/api/empresa/dados', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await res.json();
                if (data.success && data.data) {
                    empresaId = data.data.id || data.data.empresa_id;
                    console.log('📡 Empresa ID da API:', empresaId);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao buscar empresa da API:', e.message);
            }
        }

        if (!empresaId) {
            console.error('❌ Não foi possível identificar a empresa');
            // Fallback: usar link padrão
            const linkInput = document.getElementById('chatbotLink');
            if (linkInput) {
                const baseUrl = window.location.origin || 'https://seeagende.tech';
                linkInput.value = `${baseUrl}/chatbot.html?empresa=1`;
            }
            return;
        }

        console.log(`🔗 Buscando link personalizado para empresa ${empresaId}...`);
        
        const response = await fetch(`/api/chatbot/link-personalizado/${empresaId}`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        // 🔥 VERIFICAR SE A RESPOSTA É JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error('❌ Resposta não é JSON:', contentType);
            // Fallback: usar link padrão
            const linkInput = document.getElementById('chatbotLink');
            if (linkInput) {
                const baseUrl = window.location.origin || 'https://seeagende.tech';
                linkInput.value = `${baseUrl}/chatbot.html?empresa=${empresaId}`;
            }
            return;
        }

        const data = await response.json();
        console.log('📦 Resposta link:', data);

        if (data.success) {
            // 🔥 MOSTRAR O LINK PERSONALIZADO
            const linkInput = document.getElementById('chatbotLink');
            if (linkInput) {
                linkInput.value = data.linkPersonalizado || data.link;
                linkInput.style.color = '#667eea';
                linkInput.style.fontWeight = '600';
            }
            
            // Mostrar também o link padrão como fallback
            const linkPadrao = document.getElementById('chatbotLinkPadrao');
            if (linkPadrao) {
                linkPadrao.value = data.link;
                linkPadrao.style.fontSize = '11px';
                linkPadrao.style.color = '#999';
            }
            
            // Mostrar slug info
            const slugInfo = document.getElementById('chatbotSlugInfo');
            if (slugInfo && data.slug) {
                slugInfo.textContent = `🔗 Slug: ${data.slug} | Empresa: ${data.empresa || empresaId}`;
            }
            
            console.log('✅ Link personalizado carregado:', data.linkPersonalizado);
        } else {
            console.error('❌ Erro ao carregar link:', data.message);
            // Fallback: usar link padrão
            const linkInput = document.getElementById('chatbotLink');
            if (linkInput) {
                const baseUrl = window.location.origin || 'https://seeagende.tech';
                linkInput.value = `${baseUrl}/chatbot.html?empresa=${empresaId}`;
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar link do chatbot:', error);
        // Fallback: mostrar link padrão
        try {
            const usuarioStr = localStorage.getItem('usuario');
            if (usuarioStr) {
                const usuario = JSON.parse(usuarioStr);
                const empresaId = usuario.empresa_id || usuario.empresaId || 1;
                const linkInput = document.getElementById('chatbotLink');
                if (linkInput) {
                    const baseUrl = window.location.origin || 'https://seeagende.tech';
                    linkInput.value = `${baseUrl}/chatbot.html?empresa=${empresaId}`;
                }
            }
        } catch (e) {
            console.error('❌ Fallback também falhou:', e);
        }
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
// ABRIR MODAL PROFISSIONAL (SEM BOTÕES DUPLICADOS)
// ============================================
function abrirModalProfissional(profissional = null) {
    if (!profissional && !planoInfo.podeAdicionar) {
        showToast('Limite de profissionais atingido!', 'warning');
        return;
    }

    const isEdit = !!profissional;

    // 🔥 CRIAR O MODAL MANUALMENTE (SEM BOTÕES AUTOMÁTICOS)
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;

    overlay.innerHTML = `
        <div style="
            background: var(--bg-card);
            border-radius: 16px;
            max-width: 480px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 24px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            position: relative;
        ">
            <button onclick="fecharModalPersonalizado()" style="
                position: absolute;
                top: 10px;
                right: 16px;
                background: none;
                border: none;
                font-size: 24px;
                color: var(--text-muted);
                cursor: pointer;
            ">✕</button>
            
            <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: var(--text-primary);">
                ${isEdit ? '✏️ Editar Profissional' : '➕ Novo Profissional'}
            </h3>
            
            <form id="formProfissional" onsubmit="salvarProfissional(event, ${isEdit ? profissional.id : 'null'})">
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">Nome *</label>
                    <input type="text" id="prof-nome" class="form-control" value="${isEdit ? escapeHtml(profissional.nome) : ''}" 
                           placeholder="Nome completo" required style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                </div>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">Email *</label>
                    <input type="email" id="prof-email" class="form-control" value="${isEdit ? escapeHtml(profissional.email) : ''}" 
                           placeholder="email@exemplo.com" required style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                </div>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">Telefone (opcional)</label>
                    <input type="text" id="prof-telefone" class="form-control" value="${isEdit ? (profissional.telefone || '') : ''}" 
                           placeholder="(00) 00000-0000" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                </div>
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">${isEdit ? 'Nova Senha (opcional)' : 'Senha *'}</label>
                    <input type="password" id="prof-senha" class="form-control" 
                           placeholder="${isEdit ? 'Deixe em branco para manter' : 'Crie uma senha'}" 
                           ${!isEdit ? 'required' : ''} style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                </div>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="font-weight: 600; display: block; margin-bottom: 4px; font-size: 14px; color: var(--text-primary);">Comissão (%) *</label>
                    <input type="number" id="prof-comissao" class="form-control" value="${isEdit ? profissional.comissao_percent : '30'}" 
                           min="0" max="100" required style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-primary);">
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button type="submit" style="
                        flex: 1;
                        padding: 12px;
                        background: var(--gradient);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 14px;
                    ">
                        <i class="fas fa-save"></i> ${isEdit ? 'Atualizar' : 'Salvar'}
                    </button>
                    <button type="button" onclick="fecharModalPersonalizado()" style="
                        flex: 1;
                        padding: 12px;
                        background: var(--bg-hover);
                        color: var(--text-primary);
                        border: 1px solid var(--border-color);
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 14px;
                    ">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);
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

// public/js/pages/configuracoes.js

// ============================================
// ALTERNAR STATUS PROFISSIONAL - CORRIGIDO
// ============================================

async function alternarStatusProfissional(id, ativar) {
    const acao = ativar ? 'ativar' : 'desativar';

    // 🔥 CONFIRMAÇÃO MAIS CLARA
    if (!confirm(`⚠️ Tem certeza que deseja ${acao} este profissional?\n\n${ativar ? '✅ Ele poderá receber novos agendamentos.' : '❌ Ele NÃO poderá mais receber agendamentos.'}`)) {
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');

    try {
        // 🔥 ENVIAR APENAS O CAMPO ATIVO
        const body = { ativo: ativar ? 1 : 0 };
        console.log(`📝 ${acao} profissional ${id}:`, body);

        const res = await fetch(`/api/profissionais/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)  // ← 🔥 APENAS { ativo: 0/1 }
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast(`✅ Profissional ${acao}do com sucesso!`, 'success');

            // 🔥 RECARREGAR A PÁGINA DE CONFIGURAÇÕES
            await carregarConfiguracoes();
        } else {
            showToast(`❌ Erro ao ${acao} profissional: ${data.message}`, 'error');
            console.error('❌ Erro no backend:', data);
        }
    } catch (error) {
        hideLoading();
        console.error('❌ Erro ao alternar status:', error);
        showToast(`❌ Erro ao ${acao} profissional`, 'error');
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
    // Simplesmente navega para a página de planos
    const planosBtn = document.querySelector('#btnplanos');
    if (planosBtn) {
        planosBtn.click();
    } else {
        // Fallback: mudar a hash da URL
        window.location.hash = 'planos';
        // Recarregar para garantir
        setTimeout(() => {
            if (typeof window.carregarPlanos === 'function') {
                window.carregarPlanos();
            }
        }, 300);
    }
}

// ============================================
// FECHAR MODAL PERSONALIZADO
// ============================================
function fecharModalPersonalizado() {
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => overlay.remove());

    // Fechar qualquer modal do ui.js
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
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
window.carregarDadosEmpresa = carregarDadosEmpresa;
window.salvarDadosEmpresa = salvarDadosEmpresa;

console.log('✅ configuracoes.js carregado com BLOQUEIO GERAL e DADOS DA EMPRESA!');