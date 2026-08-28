// ============================================
// PLANOS.JS - VERSÃO SIMPLIFICADA (2 PLANOS)
// ULTIMA ATUALIZACAO: 22/08/2026
// ============================================

let periodoSelecionado = 'mensal';
let modoPagamento = 'simulation';

// ============================================
// PLANOS DISPONÍVEIS (SIMPLIFICADO)
// ============================================

const PLANOS_CONFIG = {
    trial: {
        id: 'trial',
        nome: 'Trial (Starter)',
        valor_mensal: 0,
        valor_anual: 0,
        profs: 1,
        agendamentos: '100/mês',
        popular: false,
        cor: '#6b7280',
        recursos: [
            '✅ Até 1 profissional',
            '✅ 100 agendamentos por mês',
            '✅ Dashboard básico',
            '✅ Suporte por email'
        ],
        limitacoes: [
            '❌ Sem WhatsApp',
            '❌ Sem envio de promoções',
            '❌ Sem fiados'
        ]
    },
    starter: {
        id: 'starter',
        nome: 'Starter',
        valor_mensal: 29.90,
        valor_anual: 287.04,
        profs: 1,
        agendamentos: '100/mês',
        popular: false,
        cor: '#667eea',
        recursos: [
            '✅ Até 1 profissional',
            '✅ 100 agendamentos por mês',
            '✅ Dashboard básico',
            '✅ Suporte por email'
        ],
        limitacoes: [
            '❌ Sem WhatsApp',
            '❌ Sem envio de promoções',
            '❌ Sem fiados'
        ]
    },
    pro: {
        id: 'pro',
        nome: 'Pro',
        valor_mensal: 59.90,
        valor_anual: 575.04,
        profs: 5,
        agendamentos: '♾️ Ilimitado',
        popular: true,
        cor: '#f59e0b',
        recursos: [
            '✅ Até 5 profissionais',
            '✅ Agendamentos ilimitados',
            '✅ WhatsApp Business',
            '✅ Envio de promoções',
            '✅ Sistema de fiados',
            '✅ Dashboard completo',
            '✅ Relatórios avançados'
        ],
        limitacoes: []
    }
};

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
                console.log(`💳 Modo de pagamento atual: ${modoPagamento}`);
                return modoPagamento;
            }
        }
        return 'simulation';
    } catch (error) {
        console.warn('⚠️ Erro ao buscar modo de pagamento:', error);
        return 'simulation';
    }
}

// ============================================
// CARREGAR PLANOS
// ============================================

async function carregarPlanos() {
    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('planos');
    }
    console.log('🔄 Carregando planos...');
    showLoading();

    const token = localStorage.getItem('token');
    const isMobile = window.innerWidth < 768;

    try {
        // Buscar modo de pagamento
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
                    console.log(`💳 Modo de pagamento: ${modoAtual === 'real' ? '🔴 REAL' : '🟡 SIMULAÇÃO'}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao buscar modo de pagamento:', error);
        }

        // Buscar plano atual da empresa
        const resPlano = await fetch('/api/planos/empresa', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const planoData = await resPlano.json();

        let planoAtual = 'trial';
        let limiteAtual = 1;
        let diasRestantes = 0;
        let validaAte = 'N/A';
        let isTrial = true;
        let agendamentosMes = 0;
        let planoNome = 'Trial (Starter)';
        let whatsappHabilitado = false;

        if (planoData.success && planoData.data) {
            planoAtual = planoData.data.plano || 'trial';
            limiteAtual = planoData.data.limite_profissionais || 1;
            diasRestantes = planoData.data.dias_restantes || 0;
            
            // 🔥 CORREÇÃO: PEGAR DATA DE VALIDADE
            if (planoData.data.data_validade_formatada) {
                validaAte = planoData.data.data_validade_formatada;
            } else if (planoData.data.assinatura_valida_ate) {
                try {
                    validaAte = new Date(planoData.data.assinatura_valida_ate).toLocaleDateString('pt-BR');
                } catch {
                    validaAte = planoData.data.assinatura_valida_ate || 'N/A';
                }
            } else if (planoData.data.trial_expira) {
                try {
                    validaAte = new Date(planoData.data.trial_expira).toLocaleDateString('pt-BR');
                } catch {
                    validaAte = planoData.data.trial_expira || 'N/A';
                }
            }
            
            isTrial = planoData.data.is_trial || (planoAtual === 'trial');
            agendamentosMes = planoData.data.agendamentos_mes || 0;
            planoNome = planoData.data.plano_display || planoData.data.plano_nome || planoAtual;
            whatsappHabilitado = planoData.data.whatsapp?.habilitado || false;
        }

        const isReal = modoAtual === 'real';
        const modoLabel = isReal ? '🔴 Pagamentos Reais' : '🟡 Modo Simulação';
        const modoCor = isReal ? '#ef4444' : '#f59e0b';
        const modoBg = isReal ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';
        const modoBorder = isReal ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';

        const planoInfo = PLANOS_CONFIG[planoAtual] || PLANOS_CONFIG.trial;

        // ==========================================
        // HTML
        // ==========================================
        let html = `
            <div class="fade-in">
                <div class="dashboard-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'flex-start' : 'center'}; gap: ${isMobile ? '8px' : '0'};">
                    <div>
                        <h2 class="page-title" style="font-size: ${isMobile ? '20px' : '24px'};">💎 Planos e Assinaturas</h2>
                        <p class="page-subtitle" style="font-size: ${isMobile ? '13px' : '14px'};">
                            <i class="fas fa-rocket"></i> Escolha o plano ideal para o seu negócio
                        </p>
                    </div>
                </div>

                <!-- Modo de Pagamento -->
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
                        <span style="font-size: 24px;">${isReal ? '🔴' : '🟡'}</span>
                        <div>
                            <div style="font-size: ${isMobile ? '14px' : '16px'}; font-weight: 600; color: var(--text-primary);">
                                💳 Modo de Pagamento: <span style="color: ${modoCor};">${modoLabel}</span>
                            </div>
                            <div style="font-size: ${isMobile ? '11px' : '13px'}; color: var(--text-muted); margin-top: 2px;">
                                ${isReal ? '⚠️ Pagamentos REAIS estão ativos!' : '🔸 Modo SIMULAÇÃO ativo. Nenhum pagamento real é processado.'}
                            </div>
                        </div>
                    </div>
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
                                ${isTrial ? '🎯 Trial (Teste Grátis)' : planoInfo?.nome || planoAtual}
                            </p>
                            ${isTrial ? `
                                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: ${isMobile ? '14px' : '16px'};">
                                    ⏳ ${diasRestantes} dias restantes de teste
                                </p>
                            ` : `
                                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: ${isMobile ? '14px' : '16px'};">
                                    📅 Válido até: <strong>${validaAte}</strong>
                                </p>
                            `}
                            <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: ${isMobile ? '13px' : '14px'};">
                                👥 ${limiteAtual} profissional(is) ativo(s)
                            </p>
                            ${whatsappHabilitado ? `
                                <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: ${isMobile ? '13px' : '14px'};">
                                    📱 <span style="color: #22c55e;">✅ WhatsApp habilitado</span>
                                </p>
                            ` : `
                                <p style="margin: 4px 0 0 0; opacity: 0.6; font-size: ${isMobile ? '13px' : '14px'};">
                                    📱 <span style="color: #f59e0b;">⚠️ WhatsApp não habilitado</span>
                                </p>
                            `}
                            ${!isTrial && planoInfo?.agendamentos ? `
                                <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: ${isMobile ? '13px' : '14px'};">
                                    📊 ${planoInfo.agendamentos} agendamentos
                                </p>
                            ` : ''}
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
                                ❌ Cancelar Assinatura
                            </button>
                        `}
                    </div>
                </div>

                <!-- Aviso Trial -->
                ${isTrial && diasRestantes <= 7 && diasRestantes > 0 ? `
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: ${isMobile ? '12px 16px' : '15px 20px'}; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #92400e; font-size: ${isMobile ? '13px' : '14px'};">
                            ⚠️ <strong>Atenção!</strong> Seu período de teste termina em <strong>${diasRestantes} dias</strong>. 
                            Escolha um plano abaixo para não perder o acesso ao sistema.
                        </p>
                    </div>
                ` : ''}

                <!-- Toggle Mensal/Anual -->
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

                <!-- Cards dos Planos -->
                <div id="planosContainer" style="display: grid; grid-template-columns: ${isMobile ? '1fr' : '1fr 1fr'}; gap: ${isMobile ? '16px' : '24px'}; max-width: 800px; margin: 0 auto;">
        `;

        // Mostrar Starter e Pro (esconder Trial)
        const planosParaMostrar = ['starter', 'pro'];

        for (const key of planosParaMostrar) {
            const plano = PLANOS_CONFIG[key];
            const isCurrent = planoAtual === key;
            const valor = periodoSelecionado === 'anual' ? plano.valor_anual : plano.valor_mensal;
            const periodoLabel = periodoSelecionado === 'anual' ? '/ano' : '/mês';
            const isPro = key === 'pro';

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
                    ${isPro ? 'transform: scale(1.02);' : ''}
                    ${isPro ? 'border-color: #f59e0b;' : ''}
                "
                onmouseenter="this.style.transform='translateY(-4px)${isPro ? ' scale(1.02)' : ''}'" 
                onmouseleave="this.style.transform='translateY(0)${isPro ? ' scale(1.02)' : ''}'"
                onclick="selecionarPlano('${key}')"
                >
                    ${isPro ? `
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
                    
                    <div style="font-size: ${isMobile ? '16px' : '20px'}; font-weight: 700; color: ${plano.cor}; margin-bottom: 4px;">
                        ${plano.nome}
                    </div>
                    
                    <div style="font-size: ${isMobile ? '32px' : '42px'}; font-weight: bold; color: ${plano.cor}; margin: 8px 0 4px 0;">
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
                        👥 ${plano.profs === 1 ? '1 profissional' : `Até ${plano.profs} profissionais`}
                        ${plano.agendamentos ? ` • 📊 ${plano.agendamentos}` : ''}
                    </div>
                    
                    <ul style="list-style: none; padding: 0; margin: 14px 0; text-align: left;">
                        ${plano.recursos.map(r => `
                            <li style="padding: ${isMobile ? '4px 0' : '6px 0'}; font-size: ${isMobile ? '13px' : '14px'}; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                                <span style="color: #10b981;">✅</span> ${r.replace('✅ ', '')}
                            </li>
                        `).join('')}
                        ${plano.limitacoes.map(l => `
                            <li style="padding: ${isMobile ? '4px 0' : '6px 0'}; font-size: ${isMobile ? '13px' : '14px'}; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; opacity: 0.6;">
                                <span style="color: #ef4444;">❌</span> ${l.replace('❌ ', '')}
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
                            ✅ Plano Atual
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
                
                <!-- Tabela Comparativa -->
                <div style="margin-top: 32px; background: var(--bg-card); border-radius: 16px; padding: ${isMobile ? '16px' : '24px'}; border: 1px solid var(--border-color);">
                    <h3 style="text-align: center; margin-bottom: 16px; font-size: ${isMobile ? '16px' : '18px'};">
                        📊 Comparação de Planos ${periodoSelecionado === 'anual' ? '(Anual)' : '(Mensal)'}
                    </h3>
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: ${isMobile ? '12px' : '14px'};">
                            <thead>
                                <tr>
                                    <th style="text-align: left; padding: 10px 12px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color);">Recurso</th>
                                    <th style="text-align: center; padding: 10px 12px; background: var(--bg-hover); border-bottom: 2px solid var(--border-color); color: #667eea;">Starter</th>
                                    <th style="text-align: center; padding: 10px 12px; background: #1e293b; border-bottom: 2px solid #f59e0b; color: #f59e0b;">⭐ Pro</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-weight: 500;">💰 Valor</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color);">R$ ${periodoSelecionado === 'anual' ? '287,04' : '29,90'}</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-weight: 700; color: #f59e0b; background: #fef9e7;">R$ ${periodoSelecionado === 'anual' ? '575,04' : '59,90'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">👥 Profissionais</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color);">1</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-weight: 600;">Até 5</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">📊 Agendamentos</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color);">100/mês</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); font-weight: 600; color: #10b981;">♾️ Ilimitado</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">📱 WhatsApp</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); color: #ef4444;">❌</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); color: #10b981; font-weight: 600;">✅</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">📢 Envio de Promoções</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); color: #ef4444;">❌</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); color: #10b981; font-weight: 600;">✅</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; border-bottom: 1px solid var(--border-color);">💰 Sistema de Fiados</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); color: #ef4444;">❌</td>
                                    <td style="text-align: center; padding: 8px 12px; border-bottom: 1px solid var(--border-color); color: #10b981; font-weight: 600;">✅</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
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
// ESCOLHER PLANO
// ============================================

async function escolherPlano(planoId) {
    const planoConfig = PLANOS_CONFIG[planoId];
    if (!planoConfig) {
        showToast('Plano não encontrado', 'error');
        return;
    }

    const valor = periodoSelecionado === 'anual' ? planoConfig.valor_anual : planoConfig.valor_mensal;
    const periodoLabel = periodoSelecionado === 'anual' ? 'ano' : 'mês';
    const nomePlano = planoConfig.nome;

    // Verificar modo de pagamento
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
            }
        }
    } catch (error) {
        console.warn('⚠️ Erro ao buscar modo:', error);
    }

    const isReal = modoAtual === 'real';

    const modalContent = `
        <div style="padding: 10px;">
            <p style="font-size: 16px; margin-bottom: 8px;">
                Você está escolhendo o plano <strong style="color: ${planoConfig.cor};">${nomePlano}</strong>
            </p>
            <p style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">
                R$ ${valor.toFixed(2)} / ${periodoLabel}
            </p>
            ${periodoSelecionado === 'anual' ? `<p style="color: #10b981;">🎉 Economia de 20% no plano anual!</p>` : ''}
            
            <div style="margin: 16px 0; padding: 12px; border-radius: 8px; background: ${isReal ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'}; border: 1px solid ${isReal ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'};">
                <p style="margin: 0; font-size: 13px; color: ${isReal ? '#ef4444' : '#f59e0b'};">
                    <strong>${isReal ? '🔴 MODO REAL' : '🟡 MODO SIMULAÇÃO'}</strong>
                    ${isReal ? ' - O pagamento será processado com cobrança real' : ' - Nenhum pagamento real é processado'}
                </p>
            </div>
            
            <button onclick="confirmarUpgrade('${planoId}')" style="
                width: 100%;
                padding: 12px;
                background: ${isReal ? 'linear-gradient(135deg, #ef4444, #dc2626)' : `linear-gradient(135deg, ${planoConfig.cor}, ${planoConfig.cor}dd)`};
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                cursor: pointer;
                margin-top: 16px;
            ">
                ${isReal ? '🔴 Pagar Agora' : '✅ Confirmar Escolha'}
            </button>
        </div>
    `;

    showModal('Confirmar Plano', modalContent, null);
}

// ============================================
// CONFIRMAR UPGRADE
// ============================================

async function confirmarUpgrade(planoId) {
    showLoading();
    fecharModal('modalUpgrade');

    try {
        const token = localStorage.getItem('token');
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const empresaId = usuario.empresa_id || usuario.empresaId;

        if (!empresaId) {
            showToast('Erro: Empresa não identificada', 'error');
            hideLoading();
            return;
        }

        // Verificar modo de pagamento
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
            console.warn('⚠️ Erro ao buscar modo:', error);
        }

        const isReal = modoAtual === 'real';

        if (isReal) {
            showToast('🔴 Redirecionando para pagamento...', 'info');

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
                const url = result.link || result.init_point || result.sandbox_init_point;
                if (url) {
                    window.open(url, '_blank');
                    showToast(result.isReal ? '🔴 Redirecionando para pagamento REAL...' : '🟡 Redirecionando para pagamento de teste...', 'info');
                } else {
                    showToast('❌ Erro ao gerar link de pagamento', 'error');
                }
            } else {
                showToast(result.message || '❌ Erro ao criar pagamento', 'error');
            }
            return;
        }

        // Modo SIMULAÇÃO
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
            showToast(`✅ Plano ${PLANOS_CONFIG[planoId]?.nome || planoId} ativado com sucesso!`, 'success');

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
            showToast('❌ ' + (result.message || 'Erro ao ativar plano'), 'error');
        }

    } catch (error) {
        console.error('❌ Erro ao confirmar upgrade:', error);
        hideLoading();
        showToast('❌ Erro ao processar upgrade', 'error');
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
            showToast('✅ Assinatura cancelada. Você está no plano Trial.', 'success');

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
            showToast(data.message || '❌ Erro ao cancelar', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Erro:', error);
        showToast('❌ Erro ao cancelar assinatura', 'error');
    }
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
// EXPORTAR FUNÇÕES
// ============================================

window.carregarPlanos = carregarPlanos;
window.escolherPlano = escolherPlano;
window.confirmarUpgrade = confirmarUpgrade;
window.cancelarAssinatura = cancelarAssinatura;
window.togglePeriodo = togglePeriodo;
window.selecionarPlano = selecionarPlano;

console.log('✅ planos.js carregado - Versão simplificada com 2 planos');
console.log('📊 Planos disponíveis:', Object.keys(PLANOS_CONFIG));