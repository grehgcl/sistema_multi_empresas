// ============================================
// PLANOS.JS - VERSÃƒO COMPLETA E CORRIGIDA
// ============================================

let currentPaymentId = null;
let modoSimulacao = true;
let periodoSelecionado = 'mensal';
let planoSelecionado = null;
let modoPagamento = 'simulation';

// ============================================
// CONFIGURAÃ‡Ã•ES DOS PLANOS
// ============================================

const PLANOS_CONFIG = {
    // ðŸ”¥ PLANO DE TESTE - R$ 1,00 (ADICIONAR PRIMEIRO)
    teste: {
        id: 'teste',
        nome: 'Teste R$ 1,00',
        valor_mensal: 1.00,
        valor_anual: 12.00,
        profs: 1,
        popular: false,
        cor: '#10b981',
        recursos: [
            'âœ… Teste de pagamento real',
            'âœ… Apenas R$ 1,00',
            'âœ… Plano Starter por 1 mÃªs',
            'âœ… Perfeito para validar integraÃ§Ã£o'
        ],
        limitacoes: [
            'âŒ Apenas 1 profissional',
            'âŒ VÃ¡lido por 1 dia'
        ]
    },
    pro: {
        id: 'pro',
        nome: 'Pro',
        valor_mensal: 59.90,
        valor_anual: 575.04,
        profs: 5,
        popular: true,
        cor: '#f59e0b',
        recursos: [
            'âœ… Tudo do Starter',
            'âœ… Agendamentos Ilimitados',
            'âœ… AtÃ© 5 Profissionais',
            'âœ… Dashboard Analytics',
            'âœ… RelatÃ³rios AvanÃ§ados',
            'âœ… Suporte WhatsApp'
        ],
        limitacoes: [
            'âŒ Sem API',
            'âŒ Sem MÃºltiplas Unidades'
        ]
    },
    business: {
        id: 'business',
        nome: 'Business',
        valor_mensal: 119.90,
        valor_anual: 1151.04,
        profs: 15,
        popular: false,
        cor: '#8b5cf6',
        recursos: [
            'âœ… Tudo do Pro',
            'âœ… AtÃ© 15 Profissionais',
            'âœ… API BÃ¡sica',
            'âœ… Suporte PrioritÃ¡rio 24/7',
            'âœ… RelatÃ³rios CustomizÃ¡veis',
            'âœ… Chatbot Premium',
            'âœ… MÃºltiplas Unidades'
        ],
        limitacoes: [
            'âŒ Limite de 15 profissionais'
        ]
    },
    enterprise: {
        id: 'enterprise',
        nome: 'Enterprise',
        valor_mensal: 249.90,
        valor_anual: 2399.04,
        profs: 'Ilimitado',
        popular: false,
        cor: '#ec4899',
        recursos: [
            'âœ… Tudo do Business',
            'âœ… Profissionais Ilimitados',
            'âœ… API Completa',
            'âœ… Suporte Dedicado',
            'âœ… Onboarding Personalizado',
            'âœ… SLA Garantido',
            'âœ… Treinamento da Equipe'
        ],
        limitacoes: []
    }
};
// public/js/pages/planos.js - ADICIONAR NO INÃCIO

// ============================================
// BUSCAR MODO DE PAGAMENTO ATUAL
// ============================================
async function buscarModoPagamento() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/pagamento/config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                modoPagamento = data.data.mode;
                console.log(`ðŸ’³ Modo de pagamento atual: ${modoPagamento}`);
                return modoPagamento;
            }
        }
        return 'simulation';
    } catch (error) {
        console.warn('âš ï¸ Erro ao buscar modo de pagamento:', error);
        return 'simulation';
    }
}
// ============================================
// CARREGAR PLANOS - CORRIGIDO (COM MODO DE PAGAMENTO)
// ============================================

async function carregarPlanos() {
    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('planos');
    }
    console.log('ðŸ”„ Carregando planos...');
    showLoading();

    const token = localStorage.getItem('token');
    const isMobile = window.innerWidth < 768;

    try {
        // ðŸ”¥ BUSCAR MODO DE PAGAMENTO PRIMEIRO
        let modoAtual = 'simulation';
        try {
            const resModo = await fetch('/api/pagamento/config', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (resModo.ok) {
                const dataModo = await resModo.json();
                if (dataModo.success) {
                    modoAtual = dataModo.data.mode;
                    modoPagamento = modoAtual;
                    console.log(`ðŸ’³ Modo de pagamento: ${modoAtual === 'real' ? 'ðŸ”´ REAL' : 'ðŸŸ¡ SIMULAÃ‡ÃƒO'}`);
                }
            }
        } catch (error) {
            console.warn('âš ï¸ Erro ao buscar modo de pagamento:', error);
        }

        // ðŸ”¥ USAR /api/planos/empresa (rota que existe no planos.routes.js)
        const resPlano = await fetch('/api/planos/empresa', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const planoData = await resPlano.json();

        let planoAtual = 'trial';
        let limiteAtual = 1;
        let diasRestantes = 0;
        let validaAte = '';
        let isTrial = true;

        if (planoData.success && planoData.data) {
            planoAtual = planoData.data.plano || 'trial';
            limiteAtual = planoData.data.limite_profissionais || 1;
            diasRestantes = planoData.data.dias_restantes || 0;
            validaAte = planoData.data.valida_ate || '';
            isTrial = planoData.data.is_trial || (planoAtual === 'trial');
        }

        const isReal = modoAtual === 'real';
        const modoLabel = isReal ? 'ðŸ”´ Pagamentos Reais' : 'ðŸŸ¡ Modo SimulaÃ§Ã£o';
        const modoCor = isReal ? '#ef4444' : '#f59e0b';
        const modoBg = isReal ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';
        const modoBorder = isReal ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';

        // Gerar HTML
        let html = `
            <div class="fade-in">
                <div class="dashboard-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'flex-start' : 'center'}; gap: ${isMobile ? '8px' : '0'};">
                    <div>
                        <h2 class="page-title" style="font-size: ${isMobile ? '20px' : '24px'};">ðŸ’Ž Planos e Assinaturas</h2>
                        <p class="page-subtitle" style="font-size: ${isMobile ? '13px' : '14px'};">
                            <i class="fas fa-rocket"></i> Escolha o plano ideal para o seu negÃ³cio
                        </p>
                    </div>
                </div>

                <!-- ðŸ”¥ CARD - MODO DE PAGAMENTO -->
                <div style="
                    background: ${modoBg}; 
                    border: 1px solid ${modoBorder}; 
                    border-radius: 12px; 
                    padding: ${isMobile ? '12px 16px' : '14px 20px'}; 
                    margin-bottom: 20px;
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    flex-wrap: wrap;
                    gap: 10px;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">${isReal ? 'ðŸ”´' : 'ðŸŸ¡'}</span>
                        <div>
                            <div style="font-size: ${isMobile ? '14px' : '16px'}; font-weight: 600; color: var(--text-primary);">
                                ðŸ’³ Modo de Pagamento: <span style="color: ${modoCor};">${modoLabel}</span>
                            </div>
                            <div style="font-size: ${isMobile ? '11px' : '13px'}; color: var(--text-muted); margin-top: 2px;">
                                ${isReal ? 'âš ï¸ Pagamentos REAIS estÃ£o ativos! Os clientes serÃ£o cobrados de verdade.' : 'ðŸ”¸ Modo SIMULAÃ‡ÃƒO ativo. Nenhum pagamento real Ã© processado.'}
                            </div>
                        </div>
                    </div>
                    ${window.role === 'super_admin' || window.role === 'superadmin' ? `
                        <button onclick="window.location.href='#empresas'; setTimeout(() => carregarDashboardSuperAdmin(), 300)" style="
                            padding: ${isMobile ? '6px 14px' : '8px 18px'};
                            border: none;
                            border-radius: 8px;
                            background: ${isReal ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};
                            color: ${isReal ? '#ef4444' : '#22c55e'};
                            font-weight: 600;
                            font-size: ${isMobile ? '12px' : '13px'};
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        ">
                            <i class="fas fa-${isReal ? 'toggle-on' : 'toggle-off'}"></i>
                            ${isReal ? 'Desativar' : 'Ativar'} Pagamentos Reais
                        </button>
                    ` : ''}
                </div>

                <!-- Plano Atual -->
                <div style="
                    background: linear-gradient(135deg, #667eea, #764ba2); 
                    border-radius: 16px; 
                    padding: ${isMobile ? '20px' : '30px'}; 
                    margin-bottom: 24px; 
                    color: white;
                ">
                    <div style="display: flex; flex-direction: ${isMobile ? 'column' : 'row'}; justify-content: space-between; align-items: ${isMobile ? 'center' : 'center'}; gap: ${isMobile ? '16px' : '20px'}; text-align: ${isMobile ? 'center' : 'left'};">
                        <div>
                            <h3 style="color: white; margin: 0 0 8px 0; font-size: ${isMobile ? '16px' : '18px'};">
                                <i class="fas fa-crown"></i> Plano Atual
                            </h3>
                            <p style="font-size: ${isMobile ? '24px' : '32px'}; font-weight: bold; margin: 0;">
                                ${isTrial ? 'ðŸŽ¯ Trial (Teste GrÃ¡tis)' : PLANOS_CONFIG[planoAtual]?.nome || planoAtual}
                            </p>
                            ${isTrial ? `
                                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: ${isMobile ? '14px' : '16px'};">
                                    â³ ${diasRestantes} dias restantes de teste
                                </p>
                            ` : `
                                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: ${isMobile ? '14px' : '16px'};">
                                    ðŸ“… VÃ¡lido atÃ©: ${validaAte || 'N/A'}
                                </p>
                            `}
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: ${isMobile ? '13px' : '14px'};">
                                ðŸ‘¥ ${limiteAtual} profissional(is) ativo(s)
                            </p>
                        </div>
                        ${isTrial ? `
                            <div style="
                                text-align: center; 
                                background: rgba(255,255,255,0.2); 
                                padding: ${isMobile ? '16px 24px' : '20px 30px'}; 
                                border-radius: 12px;
                            ">
                                <div style="font-size: ${isMobile ? '36px' : '48px'}; font-weight: bold;">${diasRestantes}</div>
                                <div style="font-size: ${isMobile ? '12px' : '14px'}; opacity: 0.9;">dias restantes</div>
                            </div>
                        ` : `
                            <button onclick="cancelarAssinatura()" style="
                                background: rgba(255,255,255,0.2); 
                                color: white; 
                                border: 1px solid rgba(255,255,255,0.3); 
                                padding: ${isMobile ? '10px 20px' : '10px 20px'}; 
                                border-radius: 8px; 
                                cursor: pointer;
                            ">
                                âŒ Cancelar Assinatura
                            </button>
                        `}
                    </div>
                </div>
        `;

        // Aviso de trial prÃ³ximo do fim
        if (isTrial && diasRestantes <= 7 && diasRestantes > 0) {
            html += `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: ${isMobile ? '12px 16px' : '15px 20px'}; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #92400e; font-size: ${isMobile ? '13px' : '14px'};">
                        âš ï¸ <strong>AtenÃ§Ã£o!</strong> Seu perÃ­odo de teste termina em <strong>${diasRestantes} dias</strong>. 
                        Escolha um plano abaixo para nÃ£o perder o acesso ao sistema.
                    </p>
                </div>
            `;
        }

        // Toggle Mensal/Anual
        html += `
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-flex; gap: 8px; background: var(--bg-hover); padding: 4px; border-radius: 30px;">
                    <button onclick="togglePeriodo('mensal')" id="btnMensal" 
                        style="
                            padding: ${isMobile ? '8px 16px' : '10px 24px'}; 
                            border: none; 
                            border-radius: 24px; 
                            background: #667eea; 
                            color: white; 
                            cursor: pointer; 
                            font-weight: bold; 
                            transition: all 0.3s;
                            font-size: ${isMobile ? '13px' : '14px'};
                        ">
                        ðŸ“… Mensal
                    </button>
                    <button onclick="togglePeriodo('anual')" id="btnAnual" 
                        style="
                            padding: ${isMobile ? '8px 16px' : '10px 24px'}; 
                            border: none; 
                            border-radius: 24px; 
                            background: transparent; 
                            color: var(--text-muted); 
                            cursor: pointer; 
                            transition: all 0.3s;
                            font-size: ${isMobile ? '13px' : '14px'};
                        ">
                        ðŸ“† Anual 
                        <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: ${isMobile ? '9px' : '11px'}; margin-left: 4px;">
                            -20%
                        </span>
                    </button>
                </div>
            </div>

            <div id="planosContainer" style="display: grid; grid-template-columns: ${isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))'}; gap: ${isMobile ? '16px' : '24px'};">
        `;

        for (const [key, plano] of Object.entries(PLANOS_CONFIG)) {
            const isCurrent = planoAtual === key;
            const valor = periodoSelecionado === 'anual' ? plano.valor_anual : plano.valor_mensal;
            const periodoLabel = periodoSelecionado === 'anual' ? '/ano' : '/mÃªs';

            // ðŸ”¥ INDICADOR DE MODO NO CARD
            const modoBadge = isReal ?
                '<span style="background:#ef4444;color:white;padding:2px 10px;border-radius:12px;font-size:9px;font-weight:700;">ðŸ”´ REAL</span>' :
                '<span style="background:#f59e0b;color:white;padding:2px 10px;border-radius:12px;font-size:9px;font-weight:700;">ðŸŸ¡ SIMULAÃ‡ÃƒO</span>';

            html += `
                <div class="plano-card" style="
                    background: var(--bg-card); 
                    border-radius: 16px; 
                    padding: ${isMobile ? '20px 16px' : '30px 25px'}; 
                    text-align: center; 
                    transition: all 0.3s ease; 
                    border: 2px solid ${isCurrent ? plano.cor : 'var(--border-color)'};
                    box-shadow: ${isCurrent ? `0 10px 40px -5px ${plano.cor}40` : 'var(--shadow)'};
                    position: relative;
                    cursor: pointer;
                "
                onmouseenter="this.style.transform='translateY(-4px)'" 
                onmouseleave="this.style.transform='translateY(0)'"
                onclick="selecionarPlano('${key}')"
                >
                    ${plano.popular ? `
                        <div style="
                            position: absolute; 
                            top: -10px; 
                            left: 50%; 
                            transform: translateX(-50%); 
                            background: linear-gradient(135deg, #f59e0b, #d97706); 
                            color: white; 
                            padding: ${isMobile ? '3px 12px' : '4px 16px'}; 
                            border-radius: 20px; 
                            font-size: ${isMobile ? '10px' : '12px'}; 
                            font-weight: bold; 
                            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
                            white-space: nowrap;
                        ">
                            â­ MAIS POPULAR
                        </div>
                    ` : ''}
                    ${isCurrent ? `
                        <div style="
                            position: absolute; 
                            top: 10px; 
                            right: 10px; 
                            background: #10b981; 
                            color: white; 
                            padding: ${isMobile ? '2px 10px' : '4px 12px'}; 
                            border-radius: 20px; 
                            font-size: ${isMobile ? '9px' : '11px'}; 
                            font-weight: bold;
                        ">
                            âœ… ATUAL
                        </div>
                    ` : ''}
                    
                    <div style="font-size: ${isMobile ? '12px' : '14px'}; color: ${plano.cor}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                        ${plano.nome}
                    </div>
                    
                    <div style="font-size: ${isMobile ? '32px' : '42px'}; font-weight: bold; color: ${plano.cor}; margin: 12px 0 4px 0;">
                        R$ ${valor.toFixed(2)}
                        <span style="font-size: ${isMobile ? '12px' : '14px'}; color: var(--text-muted); font-weight: normal;">${periodoLabel}</span>
                    </div>
                    
                    <div style="
                        font-size: ${isMobile ? '12px' : '14px'}; 
                        background: var(--bg-hover); 
                        padding: ${isMobile ? '6px 10px' : '8px 12px'}; 
                        border-radius: 8px; 
                        margin-bottom: 14px; 
                        display: inline-block;
                    ">
                        ðŸ‘¥ ${plano.profs === 'Ilimitado' ? 'â™¾ï¸ Profissionais Ilimitados' : `AtÃ© ${plano.profs} profissionais`}
                    </div>
                    
                    <ul style="list-style: none; padding: 0; margin: 14px 0; text-align: left;">
                        ${plano.recursos.slice(0, isMobile ? 4 : 6).map(r => `
                            <li style="padding: ${isMobile ? '4px 0' : '6px 0'}; font-size: ${isMobile ? '13px' : '14px'}; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                                <span style="color: #10b981;">âœ…</span> ${r.replace('âœ… ', '')}
                            </li>
                        `).join('')}
                    </ul>
                    
                    ${isCurrent ? `
                        <button disabled style="
                            background: #10b981; 
                            color: white; 
                            padding: ${isMobile ? '10px 20px' : '12px 32px'}; 
                            border: none; 
                            border-radius: 10px; 
                            cursor: default; 
                            font-weight: bold; 
                            width: 100%;
                            font-size: ${isMobile ? '13px' : '14px'};
                        ">
                            âœ… Plano Atual
                        </button>
                    ` : `
                        <button onclick="event.stopPropagation(); escolherPlano('${key}')" 
                            style="
                                background: ${isReal ? 'linear-gradient(135deg, #ef4444, #dc2626)' : `linear-gradient(135deg, ${plano.cor}, ${plano.cor}dd)`}; 
                                color: white; 
                                padding: ${isMobile ? '10px 20px' : '12px 32px'}; 
                                border: none; 
                                border-radius: 10px; 
                                cursor: pointer; 
                                font-weight: bold; 
                                width: 100%; 
                                transition: all 0.3s;
                                font-size: ${isMobile ? '13px' : '14px'};
                            ">
                            <i class="fas ${isReal ? 'fa-credit-card' : 'fa-rocket'}"></i> 
                            ${isReal ? 'Pagar Agora' : 'Escolher Plano'}
                        </button>
                    `}
                </div>
            `;
        }

        html += `
            </div>
            ${gerarTabelaComparativa(isMobile)}
            ${gerarFAQ(isMobile)}
            ${gerarBeneficiosAdicionais(isMobile)}
        </div>
        `;

        document.getElementById('content').innerHTML = html;
        atualizarTogglePeriodo();

    } catch (error) {
        console.error('âŒ Erro ao carregar planos:', error);
        document.getElementById('content').innerHTML = `
            <div class="fade-in">
                <h2 class="page-title">ðŸ’Ž Planos</h2>
                <div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;">
                    <p>âŒ Erro ao carregar planos</p>
                    <button onclick="carregarPlanos()" class="btn-primary" style="margin-top: 10px;">
                        ðŸ”„ Tentar novamente
                    </button>
                </div>
            </div>
        `;
    }
    hideLoading();
}

// ============================================
// FUNÃ‡Ã•ES AUXILIARES
// ============================================

function togglePeriodo(periodo) {
    periodoSelecionado = periodo;
    carregarPlanos();
}

function atualizarTogglePeriodo() {
    const btnMensal = document.getElementById('btnMensal');
    const btnAnual = document.getElementById('btnAnual');

    if (btnMensal && btnAnual) {
        if (periodoSelecionado === 'mensal') {
            btnMensal.style.background = '#667eea';
            btnMensal.style.color = 'white';
            btnAnual.style.background = 'transparent';
            btnAnual.style.color = '#6b7280';
        } else {
            btnAnual.style.background = '#667eea';
            btnAnual.style.color = 'white';
            btnMensal.style.background = 'transparent';
            btnMensal.style.color = '#6b7280';
        }
    }
}

function selecionarPlano(planoId) {
    document.querySelector(`.plano-card[onclick*="${planoId}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

// ============================================
// GERAR TABELA COMPARATIVA
// ============================================

function gerarTabelaComparativa(isMobile) {
    const comparacao = [
        { recurso: 'Chatbot Inteligente', starter: 'âœ…', pro: 'âœ…', business: 'âœ…', enterprise: 'âœ…' },
        { recurso: 'Agendamentos/MÃªs', starter: '100', pro: 'â™¾ï¸', business: 'â™¾ï¸', enterprise: 'â™¾ï¸' },
        { recurso: 'Profissionais', starter: '1', pro: '5', business: '15', enterprise: 'â™¾ï¸' },
        { recurso: 'WhatsApp Business', starter: 'âŒ', pro: 'âœ…', business: 'âœ…', enterprise: 'âœ…' },
        { recurso: 'Dashboard Analytics', starter: 'âŒ', pro: 'âœ…', business: 'âœ…', enterprise: 'âœ…' },
        { recurso: 'RelatÃ³rios', starter: 'âŒ', pro: 'âœ…', business: 'âœ…', enterprise: 'âœ…' },
        { recurso: 'API', starter: 'âŒ', pro: 'âŒ', business: 'âœ…', enterprise: 'âœ…' },
        { recurso: 'Suporte', starter: 'ðŸ“§', pro: 'ðŸ’¬', business: 'ðŸ†˜', enterprise: 'ðŸ‘¨â€ðŸ’¼' },
        { recurso: 'MÃºltiplas Unidades', starter: 'âŒ', pro: 'âŒ', business: 'âœ…', enterprise: 'âœ…' },
    ];

    const valorMensal = {
        starter: 'R$ 29,90',
        pro: 'R$ 59,90',
        business: 'R$ 119,90',
        enterprise: 'R$ 249,90'
    };

    const valorAnual = {
        starter: 'R$ 287,04',
        pro: 'R$ 575,04',
        business: 'R$ 1.151,04',
        enterprise: 'R$ 2.399,04'
    };

    const valores = periodoSelecionado === 'anual' ? valorAnual : valorMensal;

    if (isMobile) {
        let cards = '';
        const planos = ['starter', 'pro', 'business', 'enterprise'];
        const planosNomes = {
            starter: 'Starter',
            pro: 'â­ Pro',
            business: 'Business',
            enterprise: 'Enterprise'
        };
        const planosCores = {
            starter: '#667eea',
            pro: '#f59e0b',
            business: '#8b5cf6',
            enterprise: '#ec4899'
        };

        for (let p of planos) {
            const isPro = p === 'pro';
            cards += `
                <div style="
                    background: ${isPro ? 'var(--bg-hover)' : 'var(--bg-card)'};
                    border-radius: 12px;
                    padding: 14px 16px;
                    border: ${isPro ? '2px solid #f59e0b' : '1px solid var(--border-color)'};
                ">
                    <div style="font-size: 14px; font-weight: 700; color: ${planosCores[p]}; text-align: center; margin-bottom: 8px;">
                        ${planosNomes[p]}
                        ${isPro ? '<span style="display:block;font-size:10px;color:#f59e0b;">â­ MAIS POPULAR</span>' : ''}
                    </div>
                    <div style="font-size: 18px; font-weight: 700; color: var(--text-primary); text-align: center; margin-bottom: 10px;">
                        ${valores[p]}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px;">
                        ${comparacao.map(row => `
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid var(--border-color);">
                                <span style="color: var(--text-muted);">${row.recurso}</span>
                                <span style="font-weight: 500; color: var(--text-primary);">${row[p]}</span>
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="escolherPlano('${p}')" style="
                        width: 100%;
                        margin-top: 10px;
                        padding: 8px;
                        background: ${isPro ? 'linear-gradient(135deg, #f59e0b, #d97706)' : planosCores[p]};
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 13px;
                        cursor: pointer;
                    ">
                        Escolher
                    </button>
                </div>
            `;
        }

        return `
            <div style="margin-top: 32px; background: var(--bg-card); border-radius: 12px; padding: 16px; border: 1px solid var(--border-color);">
                <h3 style="text-align: center; margin-bottom: 16px; font-size: 16px;">
                    ðŸ“Š ComparaÃ§Ã£o de Planos ${periodoSelecionado === 'anual' ? '(Anual)' : '(Mensal)'}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${cards}
                </div>
            </div>
        `;
    } else {
        return `
            <div style="margin-top: 48px; background: var(--bg-card); border-radius: 16px; padding: 24px; border: 1px solid var(--border-color);">
                <h3 style="text-align: center; margin-bottom: 20px;">
                    ðŸ“Š ComparaÃ§Ã£o de Planos ${periodoSelecionado === 'anual' ? '(Anual)' : '(Mensal)'}
                </h3>
                <div style="overflow-x: auto;">
                    <table class="data-table" style="min-width: 600px; font-size: 14px; border-collapse: collapse; width: 100%;">
                        <thead>
                            <tr>
                                <th style="min-width: 180px; text-align: left; padding: 12px 16px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-primary);">Recurso</th>
                                <th style="text-align: center; padding: 12px 16px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-secondary);">Starter</th>
                                <th style="text-align: center; padding: 12px 16px; background: #1e293b; border-bottom: 2px solid #f59e0b; font-weight: 600; color: #f59e0b;">â­ Pro</th>
                                <th style="text-align: center; padding: 12px 16px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-secondary);">Business</th>
                                <th style="text-align: center; padding: 12px 16px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-secondary);">Enterprise</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${comparacao.map((row, index) => `
                                <tr style="${index % 2 === 0 ? 'background: var(--bg-hover);' : 'background: var(--bg-card);'}">
                                    <td style="padding: 10px 16px; font-weight: 500; color: var(--text-primary); border-bottom: 1px solid var(--border-color);">${row.recurso}</td>
                                    <td style="text-align: center; padding: 10px 16px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">${row.starter}</td>
                                    <td style="text-align: center; padding: 10px 16px; background: #fef9e7; color: #92400e; font-weight: 500; border-bottom: 1px solid var(--border-color);">${row.pro}</td>
                                    <td style="text-align: center; padding: 10px 16px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">${row.business}</td>
                                    <td style="text-align: center; padding: 10px 16px; color: var(--text-secondary); border-bottom: 1px solid var(--border-color);">${row.enterprise}</td>
                                </tr>
                            `).join('')}
                            <tr style="font-weight: bold; background: var(--bg-hover);">
                                <td style="padding: 12px 16px; color: var(--text-primary); border-top: 2px solid var(--border-color);">ðŸ’° Valor</td>
                                <td style="text-align: center; padding: 12px 16px; color: #3b82f6; border-top: 2px solid var(--border-color);">${valores.starter}</td>
                                <td style="text-align: center; padding: 12px 16px; background: #fbbf24; color: #1e293b; font-weight: 700; border-top: 2px solid #f59e0b;">
                                    ${valores.pro}
                                    <span style="display: block; font-size: 10px; font-weight: 400; color: #78350f;">â­ Melhor custo-benefÃ­cio</span>
                                </td>
                                <td style="text-align: center; padding: 12px 16px; color: #8b5cf6; border-top: 2px solid var(--border-color);">${valores.business}</td>
                                <td style="text-align: center; padding: 12px 16px; color: #ec4899; border-top: 2px solid var(--border-color);">${valores.enterprise}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

// ============================================
// GERAR FAQ
// ============================================

function gerarFAQ(isMobile) {
    const faqs = [
        { q: 'Posso mudar de plano depois?', a: 'Sim! VocÃª pode fazer upgrade ou downgrade a qualquer momento.' },
        { q: 'O que acontece se meu plano expirar?', a: 'VocÃª volta para o plano Trial com 7 dias de acesso para regularizar.' },
        { q: 'Posso cancelar quando quiser?', a: 'Sim! VocÃª pode cancelar a qualquer momento sem multa.' },
        { q: 'Tem desconto para pagamento anual?', a: 'Sim! Planos anuais tÃªm 20% de desconto.' },
        { q: 'O que Ã© o perÃ­odo de teste?', a: 'VocÃª tem 45 dias de teste grÃ¡tis com acesso a todas as funcionalidades.' }
    ];

    return `
        <div style="margin-top: 32px; background: var(--bg-hover); padding: ${isMobile ? '20px' : '30px'}; border-radius: 16px;">
            <h3 style="text-align: center; margin-bottom: 16px; font-size: ${isMobile ? '18px' : '22px'};">â“ Perguntas Frequentes</h3>
            <div style="max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px;">
                ${faqs.map(faq => `
                    <details style="background: var(--bg-card); padding: ${isMobile ? '12px 16px' : '16px 20px'}; border-radius: 10px; border: 1px solid var(--border-color);">
                        <summary style="font-weight: 600; cursor: pointer; color: var(--text-primary); font-size: ${isMobile ? '14px' : '15px'};">
                            <i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>
                            ${faq.q}
                        </summary>
                        <p style="margin-top: 10px; color: var(--text-secondary); padding-left: 24px; font-size: ${isMobile ? '13px' : '14px'};">
                            ${faq.a}
                        </p>
                    </details>
                `).join('')}
            </div>
        </div>
    `;
}

// ============================================
// GERAR BENEFÃCIOS ADICIONAIS
// ============================================

function gerarBeneficiosAdicionais(isMobile) {
    const beneficios = [
        { icon: 'ðŸ”’', title: 'SeguranÃ§a', desc: 'Dados criptografados e backups automÃ¡ticos' },
        { icon: 'ðŸ“±', title: 'Mobile Ready', desc: 'Acesso completo pelo celular' },
        { icon: 'ðŸ”„', title: 'AtualizaÃ§Ãµes', desc: 'Novas funcionalidades sempre incluÃ­das' },
        { icon: 'ðŸ’³', title: 'Pagamento Seguro', desc: 'Processado via Mercado Pago' }
    ];

    return `
        <div style="margin-top: 32px; display: grid; grid-template-columns: ${isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'}; gap: ${isMobile ? '12px' : '20px'};">
            ${beneficios.map(b => `
                <div style="text-align: center; padding: ${isMobile ? '16px' : '20px'}; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color);">
                    <div style="font-size: ${isMobile ? '28px' : '32px'};">${b.icon}</div>
                    <h4 style="margin: 8px 0 4px 0; font-size: ${isMobile ? '14px' : '16px'}; color: var(--text-primary);">${b.title}</h4>
                    <p style="font-size: ${isMobile ? '12px' : '13px'}; color: var(--text-muted); margin: 0;">${b.desc}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// public/js/pages/planos.js - SUBSTITUIR A FUNÃ‡ÃƒO escolherPlano

// ============================================
// ESCOLHER PLANO - CORRIGIDO (BUSCA MODO DO BACKEND)
// ============================================

async function escolherPlano(planoId) {
    const planoConfig = PLANOS_CONFIG[planoId];
    if (!planoConfig) {
        showToast('Plano nÃ£o encontrado', 'error');
        return;
    }

    const valor = periodoSelecionado === 'anual' ? planoConfig.valor_anual : planoConfig.valor_mensal;
    const periodoLabel = periodoSelecionado === 'anual' ? 'ano' : 'mÃªs';
    const nomePlano = planoConfig.nome;

    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const empresaId = usuario.empresa_id || usuario.empresaId;

    if (!empresaId) {
        showToast('Erro: Empresa nÃ£o identificada.', 'error');
        return;
    }

    // ðŸ”¥ BUSCAR MODO DE PAGAMENTO ATUAL DO BACKEND
    let modoAtual = 'simulation';
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/pagamento/config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                modoAtual = data.data.mode;
                modoPagamento = modoAtual; // Atualizar variÃ¡vel global
            }
        }
    } catch (error) {
        console.warn('âš ï¸ Erro ao buscar modo de pagamento:', error);
    }

    const isReal = modoAtual === 'real';
    const modoLabel = isReal ? 'ðŸ”´ MODO REAL - Pagamentos com cobranÃ§a' : 'ðŸŸ¡ MODO SIMULAÃ‡ÃƒO - Teste sem pagamento real';
    const modoCor = isReal ? '#ef4444' : '#f59e0b';
    const modoBg = isReal ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';
    const modoBorder = isReal ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';

    const modalContent = `
        <div style="padding: 10px;">
            <p>VocÃª estÃ¡ escolhendo o plano <strong>${nomePlano}</strong> por <strong>R$ ${valor.toFixed(2)}/${periodoLabel}</strong>.</p>
            ${periodoSelecionado === 'anual' ? `<p style="color: #10b981;">ðŸŽ‰ Economia de 20% no plano anual!</p>` : ''}
            
            <!-- ðŸ”¥ INDICADOR DO MODO ATUAL -->
            <div style="margin: 16px 0; padding: 12px; border-radius: 8px; background: ${modoBg}; border: 1px solid ${modoBorder};">
                <p style="margin: 0; font-size: 13px; color: ${modoCor};">
                    <strong>${modoLabel}</strong>
                    ${isReal ? ' - O pagamento serÃ¡ processado com cobranÃ§a real no cartÃ£o/PIX/boleto' : ' - Nenhum pagamento real Ã© processado'}
                </p>
            </div>
            
            <button onclick="confirmarUpgrade('${planoId}')" style="
                width: 100%;
                padding: 12px;
                background: ${isReal ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #667eea, #764ba2)'};
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                margin-top: 16px;
            ">
                ${isReal ? 'ðŸ”´ Pagar Agora' : 'âœ… Confirmar Escolha'}
            </button>
        </div>
    `;

    showModal('Confirmar Plano', modalContent, null);
}

// public/js/pages/planos.js - SUBSTITUIR A FUNÃ‡ÃƒO confirmarUpgrade

// ============================================
// CONFIRMAR UPGRADE - COM VERIFICAÃ‡ÃƒO DO MODO
// ============================================

async function confirmarUpgrade(planoId) {
    showLoading();
    fecharModal('modalUpgrade');

    try {
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const empresaId = usuario.empresa_id || usuario.empresaId;

        if (!empresaId) {
            showToast('Erro: Empresa nÃ£o identificada', 'error');
            hideLoading();
            return;
        }

        // ðŸ”¥ VERIFICAR MODO DE PAGAMENTO ATUAL
        let modoAtual = 'simulation';
        try {
            const res = await fetch('/api/pagamento/config', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    modoAtual = data.data.mode;
                }
            }
        } catch (error) {
            console.warn('âš ï¸ Erro ao buscar modo:', error);
        }

        const isReal = modoAtual === 'real';

        if (isReal) {
            showToast('ðŸ”´ Redirecionando para pagamento...', 'info');

            const planoConfig = PLANOS_CONFIG[planoId];
            const valor = periodoSelecionado === 'anual' ? planoConfig.valor_anual : planoConfig.valor_mensal;

            const response = await fetch('/api/pagamento/create-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    plano_id: planoId,
                    plano_nome: planoConfig.nome,
                    valor: valor,
                    periodo: periodoSelecionado
                })
            });

            const result = await response.json();
            hideLoading();

            if (result.success) {
                // ðŸ”¥ USAR O LINK CORRETO
                // Se for REAL, usar init_point
                // Se for SANDBOX, usar sandbox_init_point
                const url = result.link || result.init_point || result.sandbox_init_point;

                if (url) {
                    window.open(url, '_blank');
                    showToast(result.isReal ? 'ðŸ”´ Redirecionando para pagamento REAL...' : 'ðŸŸ¡ Redirecionando para pagamento de teste...', 'info');
                } else {
                    showToast('âŒ Erro ao gerar link de pagamento', 'error');
                }
            } else {
                showToast(result.message || 'âŒ Erro ao criar pagamento', 'error');
            }
            return;
        }

        // ðŸŸ¡ MODO SIMULAÃ‡ÃƒO - Ativar plano imediatamente
        const response = await fetch('/api/planos/empresa', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                plano: planoId,
                assinatura_ativa: true,
                assinatura_valida_ate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
            })
        });

        const result = await response.json();

        hideLoading();

        if (result.success) {
            showToast(`âœ… Plano ${PLANOS_CONFIG[planoId]?.nome || planoId} ativado com sucesso!`, 'success');

            if (usuario) {
                usuario.plano = planoId;
                localStorage.setItem('usuario', JSON.stringify(usuario));
            }

            setTimeout(() => {
                carregarPlanos();
                if (typeof carregarDashboard === 'function') {
                    carregarDashboard();
                }
            }, 500);
        } else {
            showToast('âŒ ' + (result.message || 'Erro ao ativar plano'), 'error');
        }

    } catch (error) {
        console.error('âŒ Erro ao confirmar upgrade:', error);
        hideLoading();
        showToast('âŒ Erro ao processar upgrade', 'error');
    }
}

// ============================================
// CANCELAR ASSINATURA
// ============================================

async function cancelarAssinatura() {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura?')) return;

    showLoading();
    const token = localStorage.getItem('token');

    try {
        // ðŸ”¥ USAR /api/planos/empresa (rota que existe)
        const res = await fetch('/api/planos/empresa', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                plano: 'trial',
                assinatura_ativa: false,
                assinatura_valida_ate: null
            })
        });

        const data = await res.json();
        hideLoading();

        if (data.success) {
            showToast('âœ… Assinatura cancelada. VocÃª estÃ¡ no plano Trial.', 'success');

            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            usuario.plano = 'trial';
            localStorage.setItem('usuario', JSON.stringify(usuario));

            setTimeout(() => {
                carregarPlanos();
                if (typeof carregarDashboard === 'function') {
                    carregarDashboard();
                }
            }, 500);
        } else {
            showToast(data.message || 'âŒ Erro ao cancelar', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        showToast('âŒ Erro ao cancelar assinatura', 'error');
    }
}

// ============================================
// EXPORTAR FUNÃ‡Ã•ES
// ============================================

window.carregarPlanos = carregarPlanos;
window.escolherPlano = escolherPlano;
window.confirmarUpgrade = confirmarUpgrade;
window.cancelarAssinatura = cancelarAssinatura;
window.togglePeriodo = togglePeriodo;
window.selecionarPlano = selecionarPlano;

console.log('âœ… planos.js carregado - Modo simulaÃ§Ã£o');
console.log('ðŸ“Š Planos disponÃ­veis:', Object.keys(PLANOS_CONFIG));