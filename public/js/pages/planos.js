// public/js/pages/planos.js - Versão COMPLETA com todas as melhorias

let currentPaymentId = null;
let modoSimulacao = true;
let periodoSelecionado = 'mensal';
let planoSelecionado = null;


// ============================================
// MODO DE PAGAMENTO
// ============================================

let modoPagamento = 'simulation';

async function carregarModoPagamento() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/payment/config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            modoPagamento = data.data.mode;
            console.log(`💳 Modo de pagamento: ${modoPagamento}`);
        }
    } catch (error) {
        console.error('Erro ao carregar modo de pagamento:', error);
    }
}
// ============================================
// CONFIGURAÇÕES DOS PLANOS
// ============================================

const PLANOS_CONFIG = {
    teste: {  // ← ADICIONE ESTE NOVO PLANO
        id: 'teste',
        nome: 'Teste R$ 1,00',
        valor_mensal: 1.00,
        valor_anual: 12.00,
        profs: 1,
        popular: false,
        cor: '#10b981',
        recursos: [
            '✅ Teste de pagamento real',
            '✅ Apenas R$ 1,00',
            '✅ Plano Starter por 1 mês'
        ],
        limitacoes: []
    },
    starter: {
        id: 'starter',
        nome: 'Starter',
        valor_mensal: 29.90,
        valor_anual: 287.04, // 20% desconto
        profs: 1,
        popular: false,
        cor: '#667eea',
        recursos: [
            '✅ Chatbot Inteligente',
            '✅ Gestão de Agendamentos',
            '✅ Até 100 agendamentos/mês',
            '✅ 1 Profissional',
            '✅ Suporte por Email'
        ],
        limitacoes: [
            '❌ Sem WhatsApp Business',
            '❌ Sem Relatórios Avançados',
            '❌ Sem API'
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
            '✅ Tudo do Starter',
            '✅ Agendamentos Ilimitados',
            '✅ Até 5 Profissionais',
            '✅ Dashboard Analytics',
            '✅ Relatórios Avançados',
            '✅ Suporte WhatsApp'
        ],
        limitacoes: [
            '❌ Sem API',
            '❌ Sem Múltiplas Unidades'
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
            '✅ Tudo do Pro',
            '✅ Até 15 Profissionais',
            '✅ API Básica',
            '✅ Suporte Prioritário 24/7',
            '✅ Relatórios Customizáveis',
            '✅ Chatbot Premium',
            '✅ Múltiplas Unidades'
        ],
        limitacoes: [
            '❌ Limite de 15 profissionais'
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
            '✅ Tudo do Business',
            '✅ Profissionais Ilimitados',
            '✅ API Completa',
            '✅ Suporte Dedicado',
            '✅ Onboarding Personalizado',
            '✅ SLA Garantido',
            '✅ Treinamento da Equipe'
        ],
        limitacoes: []
    }
};

// ============================================
// FUNÇÃO PRINCIPAL - CARREGAR PLANOS (MOBILE MELHORADO)
// ============================================

async function carregarPlanos() {
    console.log('🔄 Carregando planos...');
    showLoading();
    const token = localStorage.getItem('token');
    const isMobile = window.innerWidth < 768;

    try {
        // 🔥 Carregar modo de pagamento
        let modoPagamento = 'simulation';
        let modoLabel = '🟡 Modo Simulação';
        try {
            const resModo = await fetch('/api/payment/config', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const dataModo = await resModo.json();
            if (dataModo.success) {
                modoPagamento = dataModo.data.mode;
                modoLabel = dataModo.data.label;
            }
        } catch (error) {
            console.error('Erro ao carregar modo de pagamento:', error);
        }

        const isReal = modoPagamento === 'real';

        // Buscar plano atual
        const resPlano = await fetch('/api/empresa/plano', {
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

        // Gerar HTML - MOBILE MELHORADO
        let html = `
            <div class="fade-in">
                <!-- Título -->
                <div class="dashboard-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'flex-start' : 'center'}; gap: ${isMobile ? '8px' : '0'};">
                    <div>
                        <h2 class="page-title" style="font-size: ${isMobile ? '20px' : '24px'};">💎 Planos e Assinaturas</h2>
                        <p class="page-subtitle" style="font-size: ${isMobile ? '13px' : '14px'};">
                            <i class="fas fa-rocket"></i> 
                            Escolha o plano ideal para o seu negócio
                        </p>
                    </div>
                </div>

                <!-- 🔥 MODO DE PAGAMENTO - INDICADOR -->
                <div style="
                    margin-bottom: 20px; 
                    padding: ${isMobile ? '10px 14px' : '12px 20px'}; 
                    border-radius: 10px; 
                    background: ${isReal ? '#dbeafe' : '#fef3c7'}; 
                    border: 1px solid ${isReal ? '#93c5fd' : '#fcd34d'};
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    flex-wrap: wrap;
                    gap: 8px;
                ">
                    <div>
                        <span style="font-weight: 600; font-size: ${isMobile ? '13px' : '14px'}; color: ${isReal ? '#1e40af' : '#92400e'};">
                            💳 ${modoLabel}
                        </span>
                        <span style="font-size: ${isMobile ? '11px' : '12px'}; color: ${isReal ? '#1e40af' : '#92400e'}; opacity: 0.8; display: block; margin-top: 2px;">
                            ${isReal ? 'Pagamentos reais com cobrança' : 'Teste sem pagamento real'}
                        </span>
                    </div>
                    ${usuario?.role === 'superadmin' ? `
                        <button onclick="alternarModoPagamento()" style="
                            padding: ${isMobile ? '6px 12px' : '8px 16px'}; 
                            border: none; 
                            border-radius: 8px; 
                            background: ${isReal ? '#ef4444' : '#22c55e'}; 
                            color: white; 
                            font-weight: 600; 
                            font-size: ${isMobile ? '11px' : '12px'}; 
                            cursor: pointer;
                        ">
                            ${isReal ? '🔴 Desativar Pagamentos Reais' : '🟢 Ativar Pagamentos Reais'}
                        </button>
                    ` : ''}
                </div>

                <!-- Plano Atual - MOBILE MELHORADO -->
                <div style="
                    background: linear-gradient(135deg, #667eea, #764ba2); 
                    border-radius: 16px; 
                    padding: ${isMobile ? '20px' : '30px'}; 
                    margin-bottom: 24px; 
                    color: white;
                ">
                    <div style="display: flex; flex-direction: ${isMobile ? 'column' : 'row'}; justify-content: space-between; align-items: ${isMobile ? 'center' : 'center'}; gap: ${isMobile ? '16px' : '20px'}; text-align: ${isMobile ? 'center' : 'left'};">
                        <div style="${isMobile ? 'width: 100%;' : ''}">
                            <h3 style="color: white; margin: 0 0 8px 0; font-size: ${isMobile ? '16px' : '18px'};">
                                <i class="fas fa-crown"></i> Plano Atual
                            </h3>
                            <p style="font-size: ${isMobile ? '24px' : '32px'}; font-weight: bold; margin: 0;">
                                ${isTrial ? '🎯 Trial (Teste Grátis)' : PLANOS_CONFIG[planoAtual]?.nome || planoAtual}
                            </p>
                            ${isTrial ? `
                                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: ${isMobile ? '14px' : '16px'};">
                                    ⏳ ${diasRestantes} dias restantes de teste
                                </p>
                            ` : `
                                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: ${isMobile ? '14px' : '16px'};">
                                    📅 Válido até: ${validaAte || 'N/A'}
                                </p>
                            `}
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: ${isMobile ? '13px' : '14px'};">
                                👥 ${limiteAtual} profissional(is) ativo(s)
                            </p>
                        </div>
                        ${isTrial ? `
                            <div style="
                                text-align: center; 
                                background: rgba(255,255,255,0.2); 
                                padding: ${isMobile ? '16px 24px' : '20px 30px'}; 
                                border-radius: 12px;
                                ${isMobile ? 'width: 100%;' : ''}
                            ">
                                <div style="font-size: ${isMobile ? '36px' : '48px'}; font-weight: bold;">${diasRestantes}</div>
                                <div style="font-size: ${isMobile ? '12px' : '14px'}; opacity: 0.9;">dias restantes</div>
                            </div>
                        ` : ''}
                        ${!isTrial ? `
                            <button onclick="cancelarAssinatura()" style="
                                background: rgba(255,255,255,0.2); 
                                color: white; 
                                border: 1px solid rgba(255,255,255,0.3); 
                                padding: ${isMobile ? '10px 20px' : '10px 20px'}; 
                                border-radius: 8px; 
                                cursor: pointer;
                                ${isMobile ? 'width: 100%;' : ''}
                            ">
                                ❌ Cancelar Assinatura
                            </button>
                        ` : ''}
                    </div>
                </div>
        `;

        // Aviso de trial próximo do fim
        if (isTrial && diasRestantes <= 7 && diasRestantes > 0) {
            html += `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: ${isMobile ? '12px 16px' : '15px 20px'}; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #92400e; font-size: ${isMobile ? '13px' : '14px'};">
                        ⚠️ <strong>Atenção!</strong> Seu período de teste termina em <strong>${diasRestantes} dias</strong>. 
                        Escolha um plano abaixo para não perder o acesso ao sistema.
                    </p>
                </div>
            `;
        }

        // Toggle Mensal/Anual - MOBILE MELHORADO
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
                        📅 Mensal
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
                        📆 Anual 
                        <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: ${isMobile ? '9px' : '11px'}; margin-left: 4px;">
                            -20%
                        </span>
                    </button>
                </div>
            </div>
        `;

        // Cards dos Planos - MOBILE MELHORADO
        html += `
            <div id="planosContainer" style="display: grid; grid-template-columns: ${isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))'}; gap: ${isMobile ? '16px' : '24px'};">
        `;

        for (const [key, plano] of Object.entries(PLANOS_CONFIG)) {
            const isCurrent = planoAtual === key;
            const valor = periodoSelecionado === 'anual' ? plano.valor_anual : plano.valor_mensal;
            const periodoLabel = periodoSelecionado === 'anual' ? '/ano' : '/mês';
            const economia = periodoSelecionado === 'anual' ?
                Math.round(((plano.valor_mensal * 12 - plano.valor_anual) / (plano.valor_mensal * 12)) * 100) : 0;

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
                            ⭐ MAIS POPULAR
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
                            ✅ ATUAL
                        </div>
                    ` : ''}
                    
                    <div style="font-size: ${isMobile ? '12px' : '14px'}; color: ${plano.cor}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                        ${plano.nome}
                    </div>
                    
                    <div style="font-size: ${isMobile ? '32px' : '42px'}; font-weight: bold; color: ${plano.cor}; margin: 12px 0 4px 0;">
                        R$ ${valor.toFixed(2)}
                        <span style="font-size: ${isMobile ? '12px' : '14px'}; color: var(--text-muted); font-weight: normal;">${periodoLabel}</span>
                    </div>
                    
                    ${periodoSelecionado === 'anual' && plano.valor_mensal ? `
                        <div style="font-size: ${isMobile ? '11px' : '13px'}; color: #10b981; margin-bottom: 8px;">
                            Economia de ${economia}%
                        </div>
                    ` : ''}
                    
                    <div style="
                        font-size: ${isMobile ? '12px' : '14px'}; 
                        background: var(--bg-hover); 
                        padding: ${isMobile ? '6px 10px' : '8px 12px'}; 
                        border-radius: 8px; 
                        margin-bottom: 14px; 
                        display: inline-block;
                    ">
                        👥 ${plano.profs === 'Ilimitado' ? '♾️ Profissionais Ilimitados' : `Até ${plano.profs} profissionais`}
                    </div>
                    
                    <ul style="list-style: none; padding: 0; margin: 14px 0; text-align: left;">
                        ${plano.recursos.slice(0, isMobile ? 4 : 6).map(r => `
                            <li style="padding: ${isMobile ? '4px 0' : '6px 0'}; font-size: ${isMobile ? '13px' : '14px'}; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                                <span style="color: #10b981;">✅</span> ${r.replace('✅ ', '')}
                            </li>
                        `).join('')}
                        ${plano.recursos.length > (isMobile ? 4 : 6) ? `
                            <li style="padding: 4px 0; font-size: 12px; color: var(--text-muted); text-align: center;">
                                + ${plano.recursos.length - (isMobile ? 4 : 6)} outros benefícios
                            </li>
                        ` : ''}
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
                            ✅ Plano Atual
                        </button>
                    ` : `
                        <button onclick="event.stopPropagation(); escolherPlano('${key}')" 
                            style="
                                background: linear-gradient(135deg, ${plano.cor}, ${plano.cor}dd); 
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
                            <i class="fas fa-rocket"></i> Escolher Plano
                        </button>
                    `}
                </div>
            `;
        }

        html += `
            </div>
        `;

        // Tabela Comparativa - MOBILE MELHORADA (rolagem horizontal)
        html += gerarTabelaComparativaMobile(isMobile);

        // FAQ
        html += gerarFAQMobile(isMobile);

        // Benefícios Adicionais - MOBILE MELHORADO
        html += gerarBeneficiosAdicionaisMobile(isMobile);

        html += `</div>`;

        document.getElementById('content').innerHTML = html;

        // Atualizar botão de toggle
        atualizarTogglePeriodo();

    } catch (error) {
        console.error('❌ Erro ao carregar planos:', error);
        document.getElementById('content').innerHTML = `
            <div class="fade-in">
                <h2 class="page-title">💎 Planos</h2>
                <div style="background: #fee2e2; padding: 20px; border-radius: 8px; text-align: center;">
                    <p>❌ Erro ao carregar planos</p>
                    <button onclick="carregarPlanos()" class="btn-primary" style="margin-top: 10px;">
                        🔄 Tentar novamente
                    </button>
                </div>
            </div>
        `;
    }
    hideLoading();
}

// ============================================
// FUNÇÕES AUXILIARES
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
// GERAR TABELA COMPARATIVA - MOBILE MELHORADA
// ============================================

function gerarTabelaComparativaMobile(isMobile) {
    const comparacao = [
        { recurso: 'Chatbot Inteligente', starter: '✅', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'Agendamentos/Mês', starter: '100', pro: '♾️', business: '♾️', enterprise: '♾️' },
        { recurso: 'Profissionais', starter: '1', pro: '5', business: '15', enterprise: '♾️' },
        { recurso: 'WhatsApp Business', starter: '❌', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'Dashboard Analytics', starter: '❌', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'Relatórios', starter: '❌', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'API', starter: '❌', pro: '❌', business: '✅', enterprise: '✅' },
        { recurso: 'Suporte', starter: '📧', pro: '💬', business: '🆘', enterprise: '👨‍💼' },
        { recurso: 'Múltiplas Unidades', starter: '❌', pro: '❌', business: '✅', enterprise: '✅' },
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
        // ============================================
        // VERSÃO MOBILE - CARDS COMPARATIVOS
        // ============================================
        let cards = '';
        const planos = ['starter', 'pro', 'business', 'enterprise'];
        const planosNomes = {
            starter: 'Starter',
            pro: '⭐ Pro',
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
                    ${isPro ? 'box-shadow: 0 4px 12px rgba(245,158,11,0.15);' : ''}
                ">
                    <div style="
                        font-size: 14px;
                        font-weight: 700;
                        color: ${planosCores[p]};
                        text-align: center;
                        margin-bottom: 8px;
                        ${isPro ? 'font-size: 16px;' : ''}
                    ">
                        ${planosNomes[p]}
                        ${isPro ? '<span style="display:block;font-size:10px;color:#f59e0b;">⭐ MAIS POPULAR</span>' : ''}
                    </div>
                    <div style="
                        font-size: 18px;
                        font-weight: 700;
                        color: var(--text-primary);
                        text-align: center;
                        margin-bottom: 10px;
                    ">
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
                    📊 Comparação de Planos ${periodoSelecionado === 'anual' ? '(Anual)' : '(Mensal)'}
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${cards}
                </div>
                <div style="text-align: center; margin-top: 12px; font-size: 12px; color: var(--text-muted);">
                    <i class="fas fa-info-circle"></i> 
                    ${periodoSelecionado === 'anual' ? '💰 Plano anual com 20% de desconto!' : '📅 Planos mensais sem fidelidade'}
                </div>
            </div>
        `;
    } else {
        // ============================================
        // VERSÃO DESKTOP - TABELA
        // ============================================
        return `
            <div style="margin-top: 48px; background: var(--bg-card); border-radius: 16px; padding: 24px; border: 1px solid var(--border-color);">
                <h3 style="text-align: center; margin-bottom: 20px;">
                    📊 Comparação de Planos ${periodoSelecionado === 'anual' ? '(Anual)' : '(Mensal)'}
                </h3>
                <div style="overflow-x: auto;">
                    <table class="data-table" style="min-width: 600px; font-size: 14px; border-collapse: collapse; width: 100%;">
                        <thead>
                            <tr>
                                <th style="min-width: 180px; text-align: left; padding: 12px 16px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-primary);">Recurso</th>
                                <th style="text-align: center; padding: 12px 16px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color); font-weight: 600; color: var(--text-secondary);">Starter</th>
                                <th style="text-align: center; padding: 12px 16px; background: #1e293b; border-bottom: 2px solid #f59e0b; font-weight: 600; color: #f59e0b; position: relative;">
                                    ⭐ Pro
                                    <span style="display: block; font-size: 10px; color: #94a3b8; font-weight: 400;">MAIS POPULAR</span>
                                </th>
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
                                <td style="padding: 12px 16px; color: var(--text-primary); border-top: 2px solid var(--border-color);">💰 Valor</td>
                                <td style="text-align: center; padding: 12px 16px; color: #3b82f6; border-top: 2px solid var(--border-color);">${valores.starter}</td>
                                <td style="text-align: center; padding: 12px 16px; background: #fbbf24; color: #1e293b; font-weight: 700; border-top: 2px solid #f59e0b; border-radius: 0 0 8px 8px;">
                                    ${valores.pro}
                                    <span style="display: block; font-size: 10px; font-weight: 400; color: #78350f;">⭐ Melhor custo-benefício</span>
                                </td>
                                <td style="text-align: center; padding: 12px 16px; color: #8b5cf6; border-top: 2px solid var(--border-color);">${valores.business}</td>
                                <td style="text-align: center; padding: 12px 16px; color: #ec4899; border-top: 2px solid var(--border-color);">${valores.enterprise}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="text-align: center; margin-top: 16px; font-size: 13px; color: var(--text-muted);">
                    <i class="fas fa-info-circle"></i> 
                    ${periodoSelecionado === 'anual' ? '💰 Plano anual com 20% de desconto!' : '📅 Planos mensais sem fidelidade'}
                </div>
            </div>
        `;
    }
}

// ============================================
// GERAR FAQ - MOBILE MELHORADA
// ============================================

function gerarFAQMobile(isMobile) {
    const faqs = [
        {
            q: 'Posso mudar de plano depois?',
            a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O valor é proporcional aos dias utilizados.'
        },
        {
            q: 'O que acontece se meu plano expirar?',
            a: 'Você volta para o plano Trial com 7 dias de acesso para regularizar sua assinatura. Seus dados são mantidos.'
        },
        {
            q: 'Posso cancelar quando quiser?',
            a: 'Sim! Você pode cancelar sua assinatura a qualquer momento sem multa ou fidelidade.'
        },
        {
            q: 'Tem desconto para pagamento anual?',
            a: 'Sim! Planos anuais têm 20% de desconto, o que equivale a 2 meses grátis no ano.'
        },
        {
            q: 'O que é o período de teste?',
            a: 'Você tem 45 dias de teste grátis com acesso a todas as funcionalidades do plano Starter.'
        }
    ];

    return `
        <div style="margin-top: 32px; background: var(--bg-hover); padding: ${isMobile ? '20px' : '30px'}; border-radius: 16px;">
            <h3 style="text-align: center; margin-bottom: 16px; font-size: ${isMobile ? '18px' : '22px'};">❓ Perguntas Frequentes</h3>
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
// GERAR BENEFÍCIOS ADICIONAIS - MOBILE MELHORADO
// ============================================

function gerarBeneficiosAdicionaisMobile(isMobile) {
    const beneficios = [
        { icon: '🔒', title: 'Segurança', desc: 'Dados criptografados e backups automáticos' },
        { icon: '📱', title: 'Mobile Ready', desc: 'Acesso completo pelo celular ou tablet' },
        { icon: '🔄', title: 'Atualizações', desc: 'Novas funcionalidades sempre incluídas' },
        { icon: '💳', title: 'Pagamento Seguro', desc: 'Processado via Mercado Pago com criptografia' }
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

// ============================================
// FUNÇÃO DE ESCOLHER PLANO (COM TOGGLE REAL/SIMULAÇÃO)
// ============================================

async function escolherPlano(plano, valor) {
    const planosNomes = {
        'teste': 'Teste R$ 1,00',  // ← ADICIONE ESTA LINHA
        'starter': 'Starter',
        'pro': 'Pro',
        'business': 'Business',
        'enterprise': 'Enterprise'
    };

    const planoConfig = PLANOS_CONFIG[plano];
    const valorFinal = periodoSelecionado === 'anual' ? planoConfig.valor_anual : planoConfig.valor_mensal;
    const periodoLabel = periodoSelecionado === 'anual' ? 'ano' : 'mês';

    // 🔥 Buscar modo de pagamento atual
    let modoAtual = 'simulation';
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/payment/config', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            modoAtual = data.data.mode;
        }
    } catch (error) {
        console.error('Erro ao buscar modo de pagamento:', error);
    }

    const isReal = modoAtual === 'real';

    const modalContent = `
    <div style="padding: 10px;">
        <p>Você está escolhendo o plano <strong>${planosNomes[plano]}</strong> por <strong>R$ ${valorFinal.toFixed(2)}/${periodoLabel}</strong>.</p>
        ${periodoSelecionado === 'anual' ? `<p style="color: #10b981; font-size: 14px;">🎉 Economia de 20% no plano anual!</p>` : ''}
        
        <!-- 🔥 INDICADOR DO MODO DE PAGAMENTO -->
        <div style="margin: 16px 0; padding: 12px; border-radius: 8px; background: ${isReal ? '#dbeafe' : '#fef3c7'}; border: 1px solid ${isReal ? '#93c5fd' : '#fcd34d'};">
            <p style="margin: 0; font-size: 13px; color: ${isReal ? '#1e40af' : '#92400e'};">
                <strong>${isReal ? '🔴 MODO REAL' : '🟡 MODO SIMULAÇÃO'}</strong>
                ${isReal ? '- Pagamentos processados com cobrança real' : '- Teste sem pagamento real'}
            </p>
        </div>
        
        <div class="form-group" style="margin-top: 20px;">
            <label style="font-weight: 500;">Forma de pagamento:</label>
            <select id="metodo_pagamento" class="form-control" style="width: 100%; padding: 10px; margin-top: 8px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px;">
                <option value="checkout">💳 Checkout Mercado Pago (Recomendado)</option>
                <option value="cartao">💳 Cartão de Crédito</option>
                <option value="pix">📱 PIX</option>
                <option value="boleto">📄 Boleto Bancário</option>
            </select>
        </div>
        
        <div id="cpfField" style="display: none; margin-top: 15px;">
            <label style="font-weight: 500;">CPF (obrigatório para boleto):</label>
            <input type="text" id="cpf" class="form-control" placeholder="000.000.000-00" style="width: 100%; padding: 10px; margin-top: 8px; border-radius: 8px; border: 1px solid #ddd;">
        </div>
        
        <div id="cardField" style="display: none; margin-top: 20px;">
            <p style="color: #667eea; margin-bottom: 10px;">🔒 Você será redirecionado para o ambiente seguro do Mercado Pago</p>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px;">✓ Aceitamos Visa, Mastercard, Elo, Hipercard e American Express</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;">✓ Parcelamento em até 12x</p>
            </div>
        </div>
        
        <div id="pixField" style="display: none; margin-top: 20px;">
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px;">📱 Após confirmar, você receberá um QR Code PIX para pagamento</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;">✓ Pagamento instantâneo</p>
                <p style="margin: 0; font-size: 13px;">✓ Sem taxas adicionais</p>
            </div>
        </div>
        
        <div id="boletoField" style="display: none; margin-top: 20px;">
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px;">
                <p style="margin: 0; font-size: 13px;">📄 O boleto será gerado e você poderá pagar em qualquer banco</p>
                <p style="margin: 5px 0 0 0; font-size: 13px;">✓ Vencimento em 3 dias úteis</p>
                <p style="margin: 0; font-size: 13px;">✓ Sem taxas adicionais</p>
            </div>
        </div>
        
        ${isReal ? `
            <div style="margin-top: 16px; padding: 10px; background: #dbeafe; border-radius: 8px; border: 1px solid #93c5fd;">
                <p style="margin: 0; font-size: 12px; color: #1e40af;">🔴 MODO REAL - Você será cobrado no cartão/PIX/boleto</p>
            </div>
        ` : `
            <div style="margin-top: 16px; padding: 10px; background: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
                <p style="margin: 0; font-size: 12px; color: #92400e;">🟡 MODO SIMULAÇÃO - Para teste sem pagamento real</p>
            </div>
        `}
    </div>
`;

    showModal('Forma de Pagamento', modalContent, async () => {
        const metodo = document.getElementById('metodo_pagamento').value;
        const cpf = document.getElementById('cpf')?.value || '';
        const token = localStorage.getItem('token');

        showLoading();

        try {
            if (metodo === 'checkout' || metodo === 'cartao') {
                if (!isReal) {
                    // 🟡 MODO SIMULAÇÃO - Checkout Simulado
                    const res = await fetch('/api/simulate-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            plano_id: plano,
                            plano_nome: planosNomes[plano],
                            valor: valorFinal,
                            periodo: periodoSelecionado
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        showToast('✅ Pagamento simulado aprovado!', 'success');
                        setTimeout(() => {
                            recarregarUsuario();
                            carregarPlanos();
                            if (typeof carregarDashboard === 'function') carregarDashboard();
                        }, 1500);
                        fecharModal('modalUpgrade');
                    } else {
                        showToast('Erro no pagamento simulado', 'error');
                    }
                    hideLoading();
                } else {
                    // 🔴 MODO REAL - Checkout Mercado Pago
                    console.log('📤 Enviando para /api/create-payment:', {
                        plano_id: plano,
                        plano_nome: planosNomes[plano],
                        valor: valorFinal,
                        metodo_pagamento: 'checkout',
                        periodo: periodoSelecionado
                    });

                    const res = await fetch('/api/create-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            plano_id: plano,
                            plano_nome: planosNomes[plano],
                            valor: valorFinal,
                            metodo_pagamento: 'checkout',
                            periodo: periodoSelecionado
                        })
                    });
                    const data = await res.json();

                    console.log('📥 Resposta do /api/create-payment:', data);

                    if (data.success) {
                        // Abrir o checkout do Mercado Pago
                        const url = data.sandbox_init_point || data.init_point;
                        if (url) {
                            window.open(url, '_blank');
                            showToast('Redirecionando para pagamento...', 'info');
                            setTimeout(() => verificarPagamento(), 5000);
                        } else {
                            showToast('URL de pagamento não gerada', 'error');
                        }
                        fecharModal('modalUpgrade');
                    } else {
                        showToast(data.message || 'Erro ao processar pagamento', 'error');
                    }
                    hideLoading();
                }
            } else if (metodo === 'pix') {
                if (!isReal) {
                    // 🟡 MODO SIMULAÇÃO - PIX Simulado
                    const res = await fetch('/api/simulate-pix', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            plano_id: plano,
                            plano_nome: planosNomes[plano],
                            valor: valorFinal,
                            periodo: periodoSelecionado
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        currentPaymentId = data.payment_id;
                        mostrarPixQRCode(data.qr_code, data.qr_code_base64, data.payment_id);
                    } else {
                        showToast('Erro ao gerar PIX simulado', 'error');
                    }
                    hideLoading();
                    fecharModal('modalUpgrade');
                } else {
                    // 🔴 MODO REAL - PIX Real
                    const res = await fetch('/api/create-pix', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            plano_id: plano,
                            plano_nome: planosNomes[plano],
                            valor: valorFinal,
                            periodo: periodoSelecionado
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        currentPaymentId = data.payment_id;
                        mostrarPixQRCode(data.qr_code, data.qr_code_base64, data.payment_id);
                    } else {
                        showToast('Erro ao gerar PIX', 'error');
                    }
                    hideLoading();
                    fecharModal('modalUpgrade');
                }
            } else if (metodo === 'boleto') {
                if (!cpf || cpf.length < 11) {
                    showToast('CPF é obrigatório para boleto', 'warning');
                    hideLoading();
                    return;
                }

                if (!isReal) {
                    // 🟡 MODO SIMULAÇÃO - Boleto Simulado
                    const res = await fetch('/api/simulate-boleto', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            plano_id: plano,
                            plano_nome: planosNomes[plano],
                            valor: valorFinal,
                            cpf: cpf.replace(/\D/g, ''),
                            periodo: periodoSelecionado
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        mostrarBoleto(data.boleto_url, data.payment_id);
                    } else {
                        showToast('Erro ao gerar boleto simulado', 'error');
                    }
                    hideLoading();
                    fecharModal('modalUpgrade');
                } else {
                    // 🔴 MODO REAL - Boleto Real
                    const res = await fetch('/api/create-boleto', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({
                            plano_id: plano,
                            plano_nome: planosNomes[plano],
                            valor: valorFinal,
                            cpf: cpf.replace(/\D/g, ''),
                            periodo: periodoSelecionado
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        mostrarBoleto(data.boleto_url, data.payment_id);
                    } else {
                        showToast('Erro ao gerar boleto', 'error');
                    }
                    hideLoading();
                    fecharModal('modalUpgrade');
                }
            }
        } catch (error) {
            console.error('Erro:', error);
            showToast('Erro ao processar pagamento', 'error');
            hideLoading();
        }
    });

    setTimeout(() => {
        const metodoSelect = document.getElementById('metodo_pagamento');
        if (metodoSelect) {
            metodoSelect.addEventListener('change', function () {
                document.getElementById('cpfField').style.display = this.value === 'boleto' ? 'block' : 'none';
                document.getElementById('cardField').style.display = (this.value === 'cartao' || this.value === 'checkout') ? 'block' : 'none';
                document.getElementById('pixField').style.display = this.value === 'pix' ? 'block' : 'none';
                document.getElementById('boletoField').style.display = this.value === 'boleto' ? 'block' : 'none';
            });
        }
    }, 100);

    // ============================================
    // FUNÇÕES DE PAGAMENTO (MANTIDAS)
    // ============================================

    function mostrarFormularioCartaoSimulado(plano, valor, planosNomes) {
        const modalContent = `
        <div style="padding: 20px;">
            <h3 style="margin-bottom: 20px;">💳 Pagamento com Cartão (SIMULAÇÃO)</h3>
            <div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px;">🔧 MODO DE TESTE</p>
                <p style="margin: 5px 0 0 0; font-size: 12px;">Use qualquer número de cartão para testar</p>
            </div>
            <div style="margin-top: 20px;">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Número do Cartão (teste: 4111 1111 1111 1111)</label>
                    <input type="text" id="cardNumber" class="form-control" placeholder="4111 1111 1111 1111" value="4111111111111111" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label>Validade</label>
                        <input type="text" id="cardExpiry" class="form-control" placeholder="12/28" value="12/28" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                    </div>
                    <div>
                        <label>CVV</label>
                        <input type="text" id="cardCvv" class="form-control" placeholder="123" value="123" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>Nome no Cartão</label>
                    <input type="text" id="cardName" class="form-control" placeholder="Nome do titular" value="Cliente Teste" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ddd;">
                </div>
            </div>
            <button onclick="processarPagamentoCartaoSimulado('${plano}', ${valor})" class="btn-primary" style="width: 100%; padding: 12px; margin-top: 20px;">
                💳 Pagar (Simulação)
            </button>
        </div>
    `;
        showModal('Pagamento com Cartão (Simulação)', modalContent, null);
    }

    async function processarPagamentoCartaoSimulado(plano, valor) {
        const token = localStorage.getItem('token');
        showLoading();
        showToast('🔧 Modo simulação: Processando pagamento...', 'info');

        try {
            const res = await fetch('/api/simulate-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    plano_id: plano,
                    plano_nome: plano === 'starter' ? 'Starter' : plano === 'pro' ? 'Pro' : plano === 'business' ? 'Business' : 'Enterprise',
                    valor: valor,
                    periodo: periodoSelecionado,
                    card_data: { simulado: true }
                })
            });
            const data = await res.json();
            hideLoading();

            if (data.success && data.status === 'approved') {
                showToast('✅ Pagamento aprovado! Seu plano foi ativado.', 'success');
                fecharModal('modalUpgrade');
                setTimeout(() => {
                    recarregarUsuario();
                    carregarPlanos();
                    if (typeof carregarDashboard === 'function') carregarDashboard();
                }, 1500);
            } else {
                showToast('Erro no pagamento simulado', 'error');
            }
        } catch (error) {
            hideLoading();
            showToast('Erro ao processar pagamento', 'error');
        }
    }

    function mostrarPixQRCode(qrCode, qrCodeBase64, paymentId) {
        // 🔥 VERIFICAR SE ESTÁ EM SANDBOX
        const isSandbox = window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        // 🔥 FECHAR QUALQUER MODAL ABERTO
        const modalExistente = document.querySelector('.modal-overlay');
        if (modalExistente) modalExistente.remove();

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
            max-width: 420px;
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
            
            <h3 style="text-align: center; margin-bottom: 16px;">📱 Pagamento via PIX</h3>
            
            <p style="text-align: center; font-size: 14px; color: var(--text-muted); margin-bottom: 16px;">
                Escaneie o QR Code abaixo com seu banco:
            </p>
            
            ${qrCodeBase64 ? `<img src="data:image/png;base64,${qrCodeBase64}" style="width: 180px; height: 180px; margin: 0 auto 16px; display: block; border-radius: 12px;">` : ''}
            
            <div style="background: var(--bg-hover); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <p style="font-size: 11px; margin: 0; color: var(--text-muted);">Código PIX:</p>
                <p style="font-family: monospace; font-size: 11px; word-break: break-all; margin: 4px 0 0;">${qrCode}</p>
                <button onclick="copiarPix('${qrCode}')" style="margin-top: 8px; padding: 6px 16px; font-size: 12px; background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 6px; cursor: pointer; color: var(--text-primary);">
                    📋 Copiar código
                </button>
            </div>
            
            <div id="statusPagamento" style="text-align: center; margin: 16px 0;">
                <p style="font-size: 14px;">⏳ Aguardando pagamento...</p>
                <div style="margin: 10px auto; width: 30px; height: 30px; border: 3px solid var(--border-color); border-top: 3px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
            
            ${isSandbox ? `
                <button onclick="simularPagamentoPIX('${paymentId}')" style="
                    background: #f59e0b;
                    color: white;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    width: 100%;
                    font-size: 14px;
                    margin-bottom: 10px;
                ">
                    🟡 Simular pagamento aprovado (TESTE)
                </button>
            ` : ''}
            
            <div style="display: flex; gap: 10px;">
                <button onclick="verificarPagamentoPIX('${paymentId}')" style="
                    flex: 1;
                    padding: 10px;
                    background: var(--gradient);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                ">
                    🔄 Verificar
                </button>
                <button onclick="fecharModalPersonalizado()" style="
                    flex: 1;
                    padding: 10px;
                    background: var(--bg-hover);
                    color: var(--text-primary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                ">
                    Fechar
                </button>
            </div>
        </div>
    `;

        document.body.appendChild(overlay);

        // 🔥 VERIFICAÇÃO AUTOMÁTICA (só em produção)
        if (!isSandbox) {
            const interval = setInterval(() => {
                verificarPagamentoPIX(paymentId, interval);
            }, 5000);
        }
    }
    // ============================================
    // SIMULAR PAGAMENTO PIX (APENAS PARA TESTE)
    // ============================================
    async function simularPagamentoPIX(paymentId) {
        const token = localStorage.getItem('token');
        showLoading();

        try {
            const res = await fetch(`/api/confirm-simulated-payment/${paymentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    status: 'approved',
                    plano: 'teste'
                })
            });
            const data = await res.json();
            hideLoading();

            if (data.success) {
                // 🔥 FECHAR MODAL
                fecharModalPersonalizado();

                showToast('✅ Pagamento aprovado! Plano ativado!', 'success');
                await recarregarUsuario();
                await carregarPlanos();

                if (typeof carregarDashboard === 'function') {
                    carregarDashboard();
                }

                setTimeout(() => {
                    if (window.location.hash !== '#dashboard') {
                        window.location.hash = 'dashboard';
                    }
                }, 1500);
            } else {
                showToast('❌ Erro ao simular pagamento', 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Erro:', error);
            showToast('❌ Erro ao simular pagamento', 'error');
        }
    }
    function mostrarBoleto(boletoUrl, paymentId) {
        const modalContent = `
        <div style="text-align: center; padding: 20px;">
            <h3>📄 Boleto Bancário</h3>
            <p>Clique no botão abaixo para visualizar e pagar seu boleto:</p>
            <a href="${boletoUrl}" target="_blank" class="btn-primary" style="display: inline-block; margin: 20px 0; text-decoration: none;">📄 Visualizar Boleto</a>
            <div class="status-pagamento" id="statusPagamento">
                <p>⏳ Aguardando confirmação de pagamento...</p>
                <p style="font-size: 12px; color: #666;">O boleto pode levar até 2 dias úteis para ser compensado</p>
            </div>
            <button onclick="verificarPagamentoBoleto('${paymentId}')" class="btn-primary">🔄 Verificar pagamento</button>
            <button onclick="fecharModal('modalUpgrade')" class="btn-secondary">Fechar</button>
        </div>
    `;
        showModal('Boleto Bancário', modalContent, null);
    }

    async function verificarPagamentoPIX(paymentId, interval = null) {
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`/api/check-payment/${paymentId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();

            if (data.success && data.status === 'approved') {
                if (interval) clearInterval(interval);

                // 🔥 FECHAR MODAL
                fecharModalPersonalizado();

                showToast('✅ Pagamento confirmado! Plano ativado!', 'success');
                await recarregarUsuario();
                await carregarPlanos();

                if (typeof carregarDashboard === 'function') {
                    carregarDashboard();
                }

                setTimeout(() => {
                    if (window.location.hash !== '#dashboard') {
                        window.location.hash = 'dashboard';
                    }
                }, 1500);
            }
        } catch (error) {
            console.error('Erro ao verificar:', error);
        }
    }
    async function confirmarPagamentoSimulado(paymentId, interval) {
        const token = localStorage.getItem('token');
        showLoading();
        try {
            const res = await fetch(`/api/confirm-simulated-payment/${paymentId}`, {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success) {
                if (interval) clearInterval(interval);
                showToast('✅ Pagamento confirmado manualmente!', 'success');
                setTimeout(() => {
                    fecharModal('modalUpgrade');
                    recarregarUsuario();
                    carregarPlanos();
                    if (typeof carregarDashboard === 'function') carregarDashboard();
                }, 2000);
            } else {
                showToast('Erro ao confirmar pagamento', 'error');
            }
        } catch (error) {
            showToast('Erro ao confirmar', 'error');
        }
        hideLoading();
    }

    async function verificarPagamentoBoleto(paymentId) {
        const token = localStorage.getItem('token');
        showLoading();
        try {
            const res = await fetch(`/api/check-payment/${paymentId}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success && data.status === 'approved') {
                // 🔥 FECHAR MODAL
                fecharModal('modalUpgrade');
                showToast('✅ Pagamento confirmado! Plano ativado!', 'success');
                await recarregarUsuario();
                await carregarPlanos();
                if (typeof carregarDashboard === 'function') {
                    carregarDashboard();
                }
                setTimeout(() => {
                    if (window.location.hash !== '#dashboard') {
                        window.location.hash = 'dashboard';
                    }
                }, 2000);
            } else {
                showToast('Pagamento ainda não confirmado', 'info');
            }
        } catch (error) {
            showToast('Erro ao verificar pagamento', 'error');
        }
        hideLoading();
    }

    function copiarPix(codigo) {
        navigator.clipboard.writeText(codigo);
        showToast('Código PIX copiado!', 'success');
    }

    async function verificarPagamento() {
        setTimeout(async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch('/api/empresa/plano', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                const data = await res.json();
                if (data.success && !data.data.is_trial) {
                    // 🔥 FECHAR MODAL
                    fecharModal('modalUpgrade');
                    showToast('✅ Plano ativado com sucesso!', 'success');
                    recarregarUsuario();
                    carregarPlanos();
                    if (typeof carregarDashboard === 'function') {
                        carregarDashboard();
                    }
                    setTimeout(() => {
                        if (window.location.hash !== '#dashboard') {
                            window.location.hash = 'dashboard';
                        }
                    }, 2000);
                }
            } catch (error) {
                console.error('Erro ao verificar plano:', error);
            }
        }, 10000);
    }

    // ============================================
    // CANCELAR ASSINATURA
    // ============================================

    async function cancelarAssinatura() {
        const modalContent = `
        <div style="padding: 20px;">
            <h3 style="text-align: center;">❌ Cancelar Assinatura</h3>
            <p>Tem certeza que deseja cancelar sua assinatura?</p>
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0; font-size: 13px;">📋 Ao cancelar:</p>
                <ul style="margin: 5px 0 0 20px; font-size: 13px;">
                    <li>✓ Você terá 7 dias de acesso ao plano Trial</li>
                    <li>✓ Seus dados serão mantidos</li>
                    <li>✓ Poderá reassinar qualquer plano a qualquer momento</li>
                    <li>✓ Seu limite voltará para 1 profissional</li>
                </ul>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="fecharModal('modalUpgrade')" style="flex: 1; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer;">Voltar</button>
                <button onclick="confirmarCancelamento()" style="flex: 1; padding: 10px; background: #dc2626; color: white; border: none; border-radius: 8px; cursor: pointer;">Confirmar Cancelamento</button>
            </div>
        </div>
    `;
        showModal('Cancelar Assinatura', modalContent, null);
    }

    async function confirmarCancelamento() {
        const token = localStorage.getItem('token');
        showLoading();

        try {
            const res = await fetch('/api/cancel-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ motivo: 'Usuário cancelou manualmente' })
            });

            const data = await res.json();
            hideLoading();

            if (data.success) {
                showToast(data.message, 'success');
                fecharModal('modalUpgrade');
                await recarregarUsuario();
                await carregarPlanos();
                if (typeof carregarDashboard === 'function') {
                    carregarDashboard();
                }
            } else {
                showToast(data.message || 'Erro ao cancelar assinatura', 'error');
            }
        } catch (error) {
            hideLoading();
            console.error('Erro no cancelamento:', error);
            showToast('Erro ao cancelar assinatura. Tente novamente.', 'error');
        }
    }

    // ============================================
    // RECARREGAR USUÁRIO
    // ============================================

    async function recarregarUsuario() {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch('/api/empresa/plano', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success && data.data) {
                const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
                usuario.plano = data.data.plano;
                usuario.limite_profissionais = data.data.limite_profissionais;
                usuario.is_trial = data.data.is_trial;
                usuario.dias_restantes = data.data.dias_restantes;
                localStorage.setItem('usuario', JSON.stringify(usuario));
            }
        } catch (error) {
            console.error('Erro ao recarregar usuário:', error);
        }
    }

    // ============================================
    // FECHAR MODAL PERSONALIZADO
    // ============================================
    function fecharModalPersonalizado() {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.remove();
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.remove());
    }

    // ============================================
    // EXPORTAR FUNÇÕES
    // ============================================

    window.carregarPlanos = carregarPlanos;
    window.escolherPlano = escolherPlano;
    window.mostrarPixQRCode = mostrarPixQRCode;
    window.mostrarBoleto = mostrarBoleto;
    window.verificarPagamentoPIX = verificarPagamentoPIX;
    window.verificarPagamentoBoleto = verificarPagamentoBoleto;
    window.copiarPix = copiarPix;
    window.recarregarUsuario = recarregarUsuario;
    window.processarPagamentoCartaoSimulado = processarPagamentoCartaoSimulado;
    window.cancelarAssinatura = cancelarAssinatura;
    window.confirmarCancelamento = confirmarCancelamento;
    window.togglePeriodo = togglePeriodo;
    window.selecionarPlano = selecionarPlano;
    window.simularPagamentoPIX = simularPagamentoPIX;
    window.fecharModalPersonalizado = fecharModalPersonalizado;

    console.log('✅ planos.js carregado - Modo simulação:', modoSimulacao);
    console.log('📊 Planos disponíveis:', Object.keys(PLANOS_CONFIG));

    // Fechamento final - GARANTA QUE TENHA ESTA CHAVE
}  // ← Fecha a função principal se existir