// public/js/pages/planos.js - Versão COMPLETA com todas as melhorias

let currentPaymentId = null;
let modoSimulacao = true;
let periodoSelecionado = 'mensal';
let planoSelecionado = null;

// ============================================
// CONFIGURAÇÕES DOS PLANOS
// ============================================

const PLANOS_CONFIG = {
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
// FUNÇÃO PRINCIPAL - CARREGAR PLANOS
// ============================================

async function carregarPlanos() {
    console.log('🔄 Carregando planos...');
    showLoading();
    const token = localStorage.getItem('token');

    try {
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

        // Gerar HTML
        let html = `
            <div class="fade-in">
                <!-- Título -->
                <div class="dashboard-header">
                    <div>
                        <h2 class="page-title">💎 Planos e Assinaturas</h2>
                        <p class="page-subtitle">
                            <i class="fas fa-rocket"></i> 
                            Escolha o plano ideal para o seu negócio
                        </p>
                    </div>
                </div>

                <!-- Plano Atual -->
                <div class="plano-atual-card" style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 30px; margin-bottom: 32px; color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                        <div>
                            <h3 style="color: white; margin: 0 0 8px 0; font-size: 18px;">
                                <i class="fas fa-crown"></i> Plano Atual
                            </h3>
                            <p style="font-size: 32px; font-weight: bold; margin: 0;">
                                ${isTrial ? '🎯 Trial (Teste Grátis)' : PLANOS_CONFIG[planoAtual]?.nome || planoAtual}
                            </p>
                            ${isTrial ? `
                                <p style="margin: 8px 0 0 0; opacity: 0.9;">
                                    ⏳ ${diasRestantes} dias restantes de teste
                                </p>
                            ` : `
                                <p style="margin: 8px 0 0 0; opacity: 0.9;">
                                    📅 Válido até: ${validaAte || 'N/A'}
                                </p>
                            `}
                            <p style="margin: 4px 0 0 0; opacity: 0.8;">
                                👥 ${limiteAtual} profissional(is) ativo(s)
                            </p>
                        </div>
                        ${isTrial ? `
                            <div style="text-align: center; background: rgba(255,255,255,0.2); padding: 20px 30px; border-radius: 12px;">
                                <div style="font-size: 48px; font-weight: bold;">${diasRestantes}</div>
                                <div style="font-size: 14px; opacity: 0.9;">dias restantes</div>
                            </div>
                        ` : ''}
                        ${!isTrial ? `
                            <button onclick="cancelarAssinatura()" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                                ❌ Cancelar Assinatura
                            </button>
                        ` : ''}
                    </div>
                </div>
        `;

        // Aviso de trial próximo do fim
        if (isTrial && diasRestantes <= 7 && diasRestantes > 0) {
            html += `
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400e;">
                        ⚠️ <strong>Atenção!</strong> Seu período de teste termina em <strong>${diasRestantes} dias</strong>. 
                        Escolha um plano abaixo para não perder o acesso ao sistema.
                    </p>
                </div>
            `;
        }

        // Toggle Mensal/Anual
        html += `
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-flex; gap: 10px; background: #f3f4f6; padding: 6px; border-radius: 30px;">
                    <button onclick="togglePeriodo('mensal')" id="btnMensal" 
                        style="padding: 10px 24px; border: none; border-radius: 24px; background: #667eea; color: white; cursor: pointer; font-weight: bold; transition: all 0.3s;">
                        📅 Mensal
                    </button>
                    <button onclick="togglePeriodo('anual')" id="btnAnual" 
                        style="padding: 10px 24px; border: none; border-radius: 24px; background: transparent; color: #6b7280; cursor: pointer; transition: all 0.3s;">
                        📆 Anual 
                        <span style="background: #10b981; color: white; padding: 2px 10px; border-radius: 12px; font-size: 11px; margin-left: 4px;">
                            -20%
                        </span>
                    </button>
                </div>
            </div>
        `;

        // Cards dos Planos
        html += `
            <div id="planosContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
        `;

        for (const [key, plano] of Object.entries(PLANOS_CONFIG)) {
            const isCurrent = planoAtual === key;
            const valor = periodoSelecionado === 'anual' ? plano.valor_anual : plano.valor_mensal;
            const periodoLabel = periodoSelecionado === 'anual' ? '/ano' : '/mês';
            const economia = periodoSelecionado === 'anual' ?
                Math.round(((plano.valor_mensal * 12 - plano.valor_anual) / (plano.valor_mensal * 12)) * 100) : 0;

            html += `
                <div class="plano-card" style="
                    background: white; 
                    border-radius: 20px; 
                    padding: 30px 25px; 
                    text-align: center; 
                    transition: all 0.3s ease; 
                    border: 2px solid ${isCurrent ? plano.cor : '#e5e7eb'};
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
                    position: relative;
                    ${isCurrent ? `box-shadow: 0 10px 40px -5px ${plano.cor}40;` : ''}
                    cursor: pointer;
                "
                onmouseenter="this.style.transform='translateY(-8px)'" 
                onmouseleave="this.style.transform='translateY(0)'"
                onclick="selecionarPlano('${key}')"
                >
                    ${plano.popular ? `
                        <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 4px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);">
                            ⭐ MAIS POPULAR
                        </div>
                    ` : ''}
                    ${isCurrent ? `
                        <div style="position: absolute; top: 12px; right: 12px; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                            ✅ ATUAL
                        </div>
                    ` : ''}
                    
                    <div style="font-size: 14px; color: ${plano.cor}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        ${plano.nome}
                    </div>
                    
                    <div style="font-size: 42px; font-weight: bold; color: ${plano.cor}; margin: 16px 0 4px 0;">
                        R$ ${valor.toFixed(2)}
                        <span style="font-size: 14px; color: #6b7280; font-weight: normal;">${periodoLabel}</span>
                    </div>
                    
                    ${periodoSelecionado === 'anual' && plano.valor_mensal ? `
                        <div style="font-size: 13px; color: #10b981; margin-bottom: 12px;">
                            Economia de ${economia}% (R$ ${(plano.valor_mensal * 12 - plano.valor_anual).toFixed(2)}/ano)
                        </div>
                    ` : ''}
                    
                    <div style="font-size: 14px; background: #f3f4f6; padding: 8px 12px; border-radius: 8px; margin-bottom: 20px; display: inline-block;">
                        👥 ${plano.profs === 'Ilimitado' ? '♾️ Profissionais Ilimitados' : `Até ${plano.profs} profissionais`}
                    </div>
                    
                    <ul style="list-style: none; padding: 0; margin: 20px 0; text-align: left;">
                        ${plano.recursos.map(r => `<li style="padding: 6px 0; font-size: 14px; color: #374151;">${r}</li>`).join('')}
                    </ul>
                    
                    ${plano.limitacoes.length > 0 ? `
                        <ul style="list-style: none; padding: 0; margin: 10px 0 20px 0; text-align: left; border-top: 1px solid #e5e7eb; padding-top: 10px;">
                            ${plano.limitacoes.map(r => `<li style="padding: 4px 0; font-size: 13px; color: #9ca3af;">${r}</li>`).join('')}
                        </ul>
                    ` : ''}
                    
                    ${isCurrent ? `
                        <button disabled style="background: #10b981; color: white; padding: 12px 32px; border: none; border-radius: 12px; cursor: default; font-weight: bold; width: 100%;">
                            ✅ Plano Atual
                        </button>
                    ` : `
                        <button onclick="event.stopPropagation(); escolherPlano('${key}')" 
                            style="background: linear-gradient(135deg, ${plano.cor}, ${plano.cor}dd); color: white; padding: 12px 32px; border: none; border-radius: 12px; cursor: pointer; font-weight: bold; width: 100%; transition: all 0.3s;">
                            <i class="fas fa-rocket"></i> Escolher Plano
                        </button>
                    `}
                </div>
            `;
        }

        html += `
            </div>
        `;

        // Tabela Comparativa
        html += gerarTabelaComparativa();

        // FAQ
        html += gerarFAQ();

        // Benefícios Adicionais
        html += gerarBeneficiosAdicionais();

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
// GERAR TABELA COMPARATIVA - CORRIGIDA
// ============================================

function gerarTabelaComparativa() {
    const comparacao = [
        { recurso: 'Chatbot Inteligente', starter: '✅', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'Agendamentos/Mês', starter: '100', pro: '♾️ Ilimitado', business: '♾️ Ilimitado', enterprise: '♾️ Ilimitado' },
        { recurso: 'Profissionais', starter: '1', pro: '5', business: '15', enterprise: '♾️ Ilimitado' },
        { recurso: 'WhatsApp Business', starter: '❌', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'Dashboard Analytics', starter: '❌', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'Relatórios Avançados', starter: '❌', pro: '✅', business: '✅', enterprise: '✅' },
        { recurso: 'API', starter: '❌', pro: '❌', business: '✅ Básica', enterprise: '✅ Completa' },
        { recurso: 'Suporte', starter: '📧 Email', pro: '💬 WhatsApp', business: '🆘 Prioritário', enterprise: '👨‍💼 Dedicado' },
        { recurso: 'Múltiplas Unidades', starter: '❌', pro: '❌', business: '✅', enterprise: '✅' },
        { recurso: 'SLA Garantido', starter: '❌', pro: '❌', business: '❌', enterprise: '✅' },
        { recurso: 'Treinamento', starter: '❌', pro: '❌', business: '❌', enterprise: '✅' }
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

    return `
        <div style="margin-top: 48px; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
            <h3 style="text-align: center; margin-bottom: 20px;">
                📊 Comparação de Planos ${periodoSelecionado === 'anual' ? '(Anual)' : '(Mensal)'}
            </h3>
            <div style="overflow-x: auto;">
                <table class="data-table" style="min-width: 600px; font-size: 14px; border-collapse: collapse; width: 100%;">
                    <thead>
                        <tr>
                            <th style="min-width: 180px; text-align: left; padding: 12px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #1e293b;">Recurso</th>
                            <th style="text-align: center; padding: 12px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Starter</th>
                            <th style="text-align: center; padding: 12px 16px; background: #1e293b; border-bottom: 2px solid #f59e0b; font-weight: 600; color: #f59e0b; position: relative;">
                                ⭐ Pro
                                <span style="display: block; font-size: 10px; color: #94a3b8; font-weight: 400;">MAIS POPULAR</span>
                            </th>
                            <th style="text-align: center; padding: 12px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Business</th>
                            <th style="text-align: center; padding: 12px 16px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569;">Enterprise</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${comparacao.map((row, index) => `
                            <tr style="${index % 2 === 0 ? 'background: #fafbfc;' : 'background: white;'}">
                                <td style="padding: 10px 16px; font-weight: 500; color: #1e293b; border-bottom: 1px solid #f1f5f9;">${row.recurso}</td>
                                <td style="text-align: center; padding: 10px 16px; color: #475569; border-bottom: 1px solid #f1f5f9;">${row.starter}</td>
                                <td style="text-align: center; padding: 10px 16px; background: #fef9e7; color: #92400e; font-weight: 500; border-bottom: 1px solid #f1f5f9;">${row.pro}</td>
                                <td style="text-align: center; padding: 10px 16px; color: #475569; border-bottom: 1px solid #f1f5f9;">${row.business}</td>
                                <td style="text-align: center; padding: 10px 16px; color: #475569; border-bottom: 1px solid #f1f5f9;">${row.enterprise}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight: bold; background: #f1f5f9;">
                            <td style="padding: 12px 16px; color: #1e293b; border-top: 2px solid #e2e8f0;">💰 Valor</td>
                            <td style="text-align: center; padding: 12px 16px; color: #3b82f6; border-top: 2px solid #e2e8f0;">${valores.starter}</td>
                            <td style="text-align: center; padding: 12px 16px; background: #fbbf24; color: #1e293b; font-weight: 700; border-top: 2px solid #f59e0b; border-radius: 0 0 8px 8px;">
                                ${valores.pro}
                                <span style="display: block; font-size: 10px; font-weight: 400; color: #78350f;">⭐ Melhor custo-benefício</span>
                            </td>
                            <td style="text-align: center; padding: 12px 16px; color: #8b5cf6; border-top: 2px solid #e2e8f0;">${valores.business}</td>
                            <td style="text-align: center; padding: 12px 16px; color: #ec4899; border-top: 2px solid #e2e8f0;">${valores.enterprise}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style="text-align: center; margin-top: 16px; font-size: 13px; color: #6b7280;">
                <i class="fas fa-info-circle"></i> 
                ${periodoSelecionado === 'anual' ? '💰 Plano anual com 20% de desconto!' : '📅 Planos mensais sem fidelidade'}
            </div>
        </div>
    `;
}

// ============================================
// GERAR FAQ
// ============================================

function gerarFAQ() {
    return `
        <div style="margin-top: 48px; background: #f9fafb; padding: 30px; border-radius: 16px;">
            <h3 style="text-align: center; margin-bottom: 24px;">❓ Perguntas Frequentes</h3>
            <div style="max-width: 700px; margin: 0 auto;">
                <details style="margin-bottom: 12px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <summary style="font-weight: 600; cursor: pointer; color: #1f2937;">
                        <i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>
                        Posso mudar de plano depois?
                    </summary>
                    <p style="margin-top: 12px; color: #4b5563; padding-left: 24px;">
                        Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O valor é proporcional aos dias utilizados.
                    </p>
                </details>
                <details style="margin-bottom: 12px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <summary style="font-weight: 600; cursor: pointer; color: #1f2937;">
                        <i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>
                        O que acontece se meu plano expirar?
                    </summary>
                    <p style="margin-top: 12px; color: #4b5563; padding-left: 24px;">
                        Você volta para o plano Trial com 7 dias de acesso para regularizar sua assinatura. Seus dados são mantidos.
                    </p>
                </details>
                <details style="margin-bottom: 12px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <summary style="font-weight: 600; cursor: pointer; color: #1f2937;">
                        <i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>
                        Posso cancelar quando quiser?
                    </summary>
                    <p style="margin-top: 12px; color: #4b5563; padding-left: 24px;">
                        Sim! Você pode cancelar sua assinatura a qualquer momento sem multa ou fidelidade.
                    </p>
                </details>
                <details style="margin-bottom: 12px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <summary style="font-weight: 600; cursor: pointer; color: #1f2937;">
                        <i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>
                        Tem desconto para pagamento anual?
                    </summary>
                    <p style="margin-top: 12px; color: #4b5563; padding-left: 24px;">
                        Sim! Planos anuais têm <strong>20% de desconto</strong>, o que equivale a 2 meses grátis no ano.
                    </p>
                </details>
                <details style="margin-bottom: 12px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <summary style="font-weight: 600; cursor: pointer; color: #1f2937;">
                        <i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>
                        O que é o período de teste?
                    </summary>
                    <p style="margin-top: 12px; color: #4b5563; padding-left: 24px;">
                        Você tem <strong>45 dias de teste grátis</strong> com acesso a todas as funcionalidades do plano Starter.
                    </p>
                </details>
                <details style="margin-bottom: 12px; background: white; padding: 16px 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <summary style="font-weight: 600; cursor: pointer; color: #1f2937;">
                        <i class="fas fa-chevron-right" style="color: #667eea; margin-right: 8px;"></i>
                        Como funciona o suporte?
                    </summary>
                    <p style="margin-top: 12px; color: #4b5563; padding-left: 24px;">
                        <strong>Starter:</strong> Suporte por Email<br>
                        <strong>Pro:</strong> Suporte via WhatsApp<br>
                        <strong>Business:</strong> Suporte Prioritário 24/7<br>
                        <strong>Enterprise:</strong> Suporte Dedicado com gerente de conta
                    </p>
                </details>
            </div>
        </div>
    `;
}

// ============================================
// GERAR BENEFÍCIOS ADICIONAIS
// ============================================

function gerarBeneficiosAdicionais() {
    return `
        <div style="margin-top: 48px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
            <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="font-size: 32px;">🔒</div>
                <h4 style="margin: 8px 0;">Segurança</h4>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">Dados criptografados e backups automáticos</p>
            </div>
            <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="font-size: 32px;">📱</div>
                <h4 style="margin: 8px 0;">Mobile Ready</h4>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">Acesso completo pelo celular ou tablet</p>
            </div>
            <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="font-size: 32px;">🔄</div>
                <h4 style="margin: 8px 0;">Atualizações</h4>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">Novas funcionalidades sempre incluídas</p>
            </div>
            <div style="text-align: center; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="font-size: 32px;">💳</div>
                <h4 style="margin: 8px 0;">Pagamento Seguro</h4>
                <p style="font-size: 13px; color: #6b7280; margin: 0;">Processado via Mercado Pago com criptografia</p>
            </div>
        </div>
    `;
}

// ============================================
// FUNÇÃO DE ESCOLHER PLANO (MANTIDA)
// ============================================

async function escolherPlano(plano, valor) {
    const planosNomes = {
        'starter': 'Starter',
        'pro': 'Pro',
        'business': 'Business',
        'enterprise': 'Enterprise'
    };

    const planoConfig = PLANOS_CONFIG[plano];
    const valorFinal = periodoSelecionado === 'anual' ? planoConfig.valor_anual : planoConfig.valor_mensal;
    const periodoLabel = periodoSelecionado === 'anual' ? 'ano' : 'mês';

    const modalContent = `
        <div style="padding: 10px;">
            <p>Você está escolhendo o plano <strong>${planosNomes[plano]}</strong> por <strong>R$ ${valorFinal.toFixed(2)}/${periodoLabel}</strong>.</p>
            ${periodoSelecionado === 'anual' ? `<p style="color: #10b981; font-size: 14px;">🎉 Economia de 20% no plano anual!</p>` : ''}
            <div class="form-group" style="margin-top: 20px;">
                <label style="font-weight: 500;">Forma de pagamento:</label>
                <select id="metodo_pagamento" class="form-control" style="width: 100%; padding: 10px; margin-top: 8px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px;">
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
            ${modoSimulacao ? `
            <div style="margin-top: 20px; padding: 10px; background: #fef3c7; border-radius: 8px;">
                <p style="margin: 0; font-size: 12px; color: #92400e;">🔧 MODO SIMULAÇÃO ATIVO - Para teste sem pagamento real</p>
            </div>
            ` : ''}
        </div>
    `;

    showModal('Forma de Pagamento', modalContent, async () => {
        const metodo = document.getElementById('metodo_pagamento').value;
        const cpf = document.getElementById('cpf')?.value || '';
        const token = localStorage.getItem('token');

        showLoading();

        try {
            if (metodo === 'cartao') {
                if (modoSimulacao) {
                    mostrarFormularioCartaoSimulado(plano, valorFinal, planosNomes);
                    hideLoading();
                    fecharModal('modalUpgrade');
                } else {
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
                            metodo_pagamento: metodo,
                            periodo: periodoSelecionado
                        })
                    });
                    const data = await res.json();
                    if (data.success) {
                        window.open(data.init_point, '_blank');
                        showToast('Redirecionando para pagamento...', 'info');
                        setTimeout(() => verificarPagamento(), 5000);
                        fecharModal('modalUpgrade');
                    } else {
                        showToast('Erro ao processar pagamento', 'error');
                    }
                    hideLoading();
                }
            } else if (metodo === 'pix') {
                if (modoSimulacao) {
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

                if (modoSimulacao) {
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
                document.getElementById('cardField').style.display = this.value === 'cartao' ? 'block' : 'none';
                document.getElementById('pixField').style.display = this.value === 'pix' ? 'block' : 'none';
                document.getElementById('boletoField').style.display = this.value === 'boleto' ? 'block' : 'none';
            });
        }
    }, 100);
}

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
    const modalContent = `
        <div style="text-align: center; padding: 20px;">
            <h3>📱 Pagamento via PIX</h3>
            <p>Escaneie o QR Code abaixo com seu banco:</p>
            ${qrCodeBase64 ? `<img src="data:image/png;base64,${qrCodeBase64}" style="width: 200px; height: 200px; margin: 20px auto; display: block;">` : ''}
            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 12px; margin: 0;">Código PIX:</p>
                <p style="font-family: monospace; font-size: 12px; word-break: break-all;">${qrCode}</p>
                <button onclick="copiarPix('${qrCode}')" class="btn-secondary" style="margin-top: 10px; padding: 8px 16px;">📋 Copiar código</button>
            </div>
            <div class="status-pagamento" id="statusPagamento">
                <p>⏳ Aguardando pagamento...</p>
                <div class="loading-spinner" style="margin: 10px auto;"></div>
            </div>
            <button onclick="verificarPagamentoPIX('${paymentId}')" class="btn-primary">🔄 Verificar pagamento</button>
            <button onclick="fecharModal('modalUpgrade')" class="btn-secondary">Fechar</button>
        </div>
    `;
    showModal('Pagamento PIX', modalContent, null);
    const interval = setInterval(() => {
        verificarPagamentoPIX(paymentId, interval);
    }, 5000);
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
    const statusDiv = document.getElementById('statusPagamento');

    if (statusDiv && !document.getElementById('btnConfirmarPagamento')) {
        const btnConfirmar = document.createElement('button');
        btnConfirmar.id = 'btnConfirmarPagamento';
        btnConfirmar.innerHTML = '✅ Simular pagamento aprovado (teste)';
        btnConfirmar.className = 'btn-primary';
        btnConfirmar.style.marginTop = '15px';
        btnConfirmar.style.width = '100%';
        btnConfirmar.onclick = () => confirmarPagamentoSimulado(paymentId, interval);
        statusDiv.appendChild(btnConfirmar);
    }

    try {
        const res = await fetch(`/api/check-payment/${paymentId}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success && data.status === 'approved') {
            if (interval) clearInterval(interval);
            showToast('Pagamento confirmado!', 'success');
            setTimeout(() => {
                fecharModal('modalUpgrade');
                recarregarUsuario();
                carregarPlanos();
                if (typeof carregarDashboard === 'function') carregarDashboard();
            }, 2000);
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
            showToast('Pagamento confirmado!', 'success');
            setTimeout(() => {
                fecharModal('modalUpgrade');
                recarregarUsuario();
                carregarPlanos();
                if (typeof carregarDashboard === 'function') carregarDashboard();
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
                showToast('Plano ativado com sucesso!', 'success');
                recarregarUsuario();
                carregarPlanos();
                if (typeof carregarDashboard === 'function') carregarDashboard();
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

console.log('✅ planos.js carregado - Modo simulação:', modoSimulacao);
console.log('📊 Planos disponíveis:', Object.keys(PLANOS_CONFIG));