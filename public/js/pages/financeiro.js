// ============================================
// FINANCEIRO V2 - COMPLETO COM FORMAS DE PAGAMENTO
// ============================================

// ============================================
// FUNÇÕES DE COMPATIBILIDADE
// ============================================

function isAberto(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

function isAtivo(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

function toNumber(valor) {
    return parseFloat(valor) || 0;
}

function formatMoney(valor) {
    return toNumber(valor).toFixed(2).replace('.', ',');
}

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let financeiroData = null;
let despesasData = null;
let receitasData = null;
let mesAtual = null;
let mesAnterior = null;
let filtroMesReceitas = null;
let filtroAnoReceitas = null;
let despesaEditandoId = null;

// ============================================
// MAPEAMENTO DE FORMAS DE PAGAMENTO
// ============================================

const pagamentoLabels = {
    'dinheiro': '💰 Dinheiro',
    'pix': '📱 Pix',
    'debito': '💳 Débito',
    'credito': '💳 Crédito',
    'prazo': '📝 Fiado',
    '': '❓ Não informado',
    'null': '❓ Não informado',
    'undefined': '❓ Não informado'
};

const pagamentoCores = {
    'dinheiro': '#22c55e',
    'pix': '#3b82f6',
    'debito': '#8b5cf6',
    'credito': '#f59e0b',
    'prazo': '#ef4444',
    '': 'var(--text-muted)',
    'null': 'var(--text-muted)',
    'undefined': 'var(--text-muted)'
};

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// CARREGAR FINANCEIRO
// ============================================

async function carregarFinanceiro() {
    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('financeiro');
    }
    ativarBotao('financeiro');
    showLoading();

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const hoje = new Date();

    const mesAtualNum = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    mesAtual = String(mesAtualNum).padStart(2, '0');

    const dataAnterior = new Date(hoje);
    dataAnterior.setMonth(dataAnterior.getMonth() - 1);
    mesAnterior = String(dataAnterior.getMonth() + 1).padStart(2, '0');
    const anoAnterior = dataAnterior.getFullYear();

    filtroMesReceitas = filtroMesReceitas || mesAtual;
    filtroAnoReceitas = filtroAnoReceitas || String(anoAtual);

    try {
        const [financeiroRes, despesasRes, receitasRes, comparativoRes] = await Promise.all([
            fetch('/api/financeiro', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/despesas?mes=${mesAtual}&ano=${anoAtual}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/financeiro/receitas?mes=${filtroMesReceitas}&ano=${filtroAnoReceitas}`, { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch(`/api/financeiro/comparativo?mes_atual=${mesAtual}&ano_atual=${anoAtual}&mes_anterior=${mesAnterior}&ano_anterior=${anoAnterior}`, { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const financeiroResult = await financeiroRes.json();
        const despesasResult = await despesasRes.json();
        const receitasResult = await receitasRes.json();
        const comparativoResult = await comparativoRes.json();

        console.log('📊 Financeiro Result:', financeiroResult);
        console.log('📊 Despesas Result:', despesasResult);
        console.log('📊 Receitas Result:', receitasResult);
        console.log('📊 Comparativo Result:', comparativoResult);

        let despesasProcessadas = { totais: { total: 0, pago: 0, pendente: 0 }, despesas: [] };

        if (despesasResult.success) {
            if (Array.isArray(despesasResult.data)) {
                const lista = despesasResult.data;
                let total = 0, pago = 0, pendente = 0;
                for (let d of lista) {
                    const valor = parseFloat(d.valor) || 0;
                    total += valor;
                    if (d.pago === 1 || d.pago === true) {
                        pago += valor;
                    } else {
                        pendente += valor;
                    }
                }
                despesasProcessadas = { despesas: lista, totais: { total, pago, pendente } };
            } else if (despesasResult.data && typeof despesasResult.data === 'object') {
                if (Array.isArray(despesasResult.data.despesas)) {
                    despesasProcessadas = despesasResult.data;
                }
            }
        }

        console.log('📊 Despesas Processadas:', despesasProcessadas);

        let financeiroDataFinal = { totais: {} };
        if (financeiroResult.success) {
            financeiroDataFinal = financeiroResult.data;
        }

        let receitasDataFinal = {};
        if (receitasResult.success) {
            receitasDataFinal = receitasResult.data;
        }

        let comparativoFinal = null;
        if (comparativoResult.success) {
            comparativoFinal = comparativoResult.data;
            if (comparativoFinal) {
                if ((comparativoFinal.mes_atual?.despesas || 0) === 0 && despesasProcessadas.totais.total > 0) {
                    if (!comparativoFinal.mes_atual) comparativoFinal.mes_atual = {};
                    comparativoFinal.mes_atual.despesas = despesasProcessadas.totais.total;
                }
                if ((comparativoFinal.mes_atual?.faturamento || 0) === 0 && receitasDataFinal.total > 0) {
                    if (!comparativoFinal.mes_atual) comparativoFinal.mes_atual = {};
                    comparativoFinal.mes_atual.faturamento = receitasDataFinal.total;
                }
            }
        }

        financeiroData = financeiroDataFinal;
        despesasData = despesasProcessadas;
        receitasData = receitasDataFinal;

        renderizarFinanceiroV2(financeiroData, despesasData, receitasData, comparativoFinal, usuario);

    } catch (error) {
        console.error('❌ Erro:', error);
        document.getElementById('content').innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar financeiro</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarFinanceiro()">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    hideLoading();
}

// ============================================
// RENDERIZAR FINANCEIRO V2
// ============================================

function renderizarFinanceiroV2(financeiro, despesas, receitas, comparativo, usuario) {
    const isMobile = window.innerWidth < 768;
    const isDono = usuario?.role === 'dono';

    if (!isDono) {
        renderizarVisaoProfissional(financeiro, isMobile);
        return;
    }

    const totais = financeiro?.totais || {};
    const despesasTotais = despesas?.totais || {};

    const faturamentoBruto = toNumber(totais.faturamento_bruto);
    const totalDespesas = toNumber(despesasTotais.total);
    const despesasPagas = toNumber(despesasTotais.pago);
    const despesasPendentes = toNumber(despesasTotais.pendente);
    const lucroLiquido = faturamentoBruto - totalDespesas;
    const totalServicos = totais.total_servicos || 0;
    const totalComissoes = toNumber(totais.total_comissoes);
    const lucroAposComissoes = faturamentoBruto - totalComissoes - totalDespesas;

    const comp = comparativo || {};
    const mesAtualData = comp.mes_atual || {};
    const mesAnteriorData = comp.mes_anterior || {};

    const fatAtual = toNumber(mesAtualData.faturamento) || faturamentoBruto;
    const fatAnterior = toNumber(mesAnteriorData.faturamento) || 0;
    const despAtual = toNumber(mesAtualData.despesas) || totalDespesas;
    const despAnterior = toNumber(mesAnteriorData.despesas) || 0;

    const variacaoFat = fatAnterior > 0 ? ((fatAtual - fatAnterior) / fatAnterior * 100) : 0;
    const variacaoDesp = despAnterior > 0 ? ((despAtual - despAnterior) / despAnterior * 100) : 0;
    const variacaoLucro = (fatAnterior - despAnterior) > 0 ?
        ((fatAtual - despAtual - (fatAnterior - despAnterior)) / (fatAnterior - despAnterior) * 100) : 0;

    const ticketMedio = totalServicos > 0 ? faturamentoBruto / totalServicos : 0;

    let html = `
        <div class="fade-in financeiro-container">
            <div class="dashboard-header" style="flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'flex-start' : 'center'}; gap:${isMobile ? '8px' : '0'};">
                <div>
                    <h2 class="page-title" style="font-size:${isMobile ? '20px' : '24px'};">💰 Financeiro</h2>
                    <p class="page-subtitle" style="font-size:${isMobile ? '13px' : '14px'};">
                        <i class="fas fa-chart-line"></i> 
                        Resumo do mês <strong>${mesAtual}/${filtroAnoReceitas}</strong>
                    </p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" onclick="carregarFinanceiro()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
            </div>

            <div class="config-tabs" style="
                display: flex;
                gap: ${isMobile ? '4px' : '8px'};
                margin-bottom: ${isMobile ? '12px' : '16px'};
                flex-wrap: wrap;
                background: var(--bg-card);
                padding: ${isMobile ? '6px' : '8px'};
                border-radius: ${isMobile ? '12px' : '16px'};
                box-shadow: var(--card-shadow);
                border: 1px solid var(--border-color);
                ${isMobile ? 'overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch;' : ''}
            ">
                <button class="config-tab active" onclick="switchFinanceiroTab('resumo')" style="
                    padding: ${isMobile ? '8px 14px' : '10px 20px'};
                    border: none;
                    border-radius: ${isMobile ? '8px' : '12px'};
                    background: var(--gradient);
                    color: white;
                    font-weight: 600;
                    font-size: ${isMobile ? '12px' : '14px'};
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: ${isMobile ? '4px' : '8px'};
                    white-space: nowrap;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(102,126,234,0.3);
                ">
                    <i class="fas fa-chart-pie" style="font-size:${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Resumo' : 'Resumo'}
                </button>
                <button class="config-tab" onclick="switchFinanceiroTab('receitas')" style="
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
                    <i class="fas fa-arrow-up" style="font-size:${isMobile ? '14px' : '16px'};color:#22c55e;"></i> ${isMobile ? 'Receitas' : 'Receitas'}
                </button>
                <button class="config-tab" onclick="switchFinanceiroTab('despesas')" style="
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
                    <i class="fas fa-arrow-down" style="font-size:${isMobile ? '14px' : '16px'};color:#ef4444;"></i> ${isMobile ? 'Despesas' : 'Despesas'}
                </button>
                <button class="config-tab" onclick="switchFinanceiroTab('profissionais')" style="
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
                    <i class="fas fa-users" style="font-size:${isMobile ? '14px' : '16px'};"></i> ${isMobile ? 'Comissões' : 'Comissões'}
                </button>
                <button class="config-tab" onclick="switchFinanceiroTab('analise')" style="
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
                    <i class="fas fa-calendar-day" style="font-size:${isMobile ? '14px' : '16px'};color:#8b5cf6;"></i> ${isMobile ? 'Análise' : 'Análise Diária'}
                </button>
            </div>

            <div id="financeiroContent">
                <!-- CARDS PRINCIPAIS -->
                <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(4,1fr)'};gap:${isMobile ? '8px' : '12px'};margin-bottom:${isMobile ? '12px' : '16px'};">
                    <div style="background:linear-gradient(135deg, #667eea, #764ba2);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px rgba(102,126,234,0.3);">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">💰 Faturamento</div>
                                <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;margin-top:2px;">R$ ${faturamentoBruto.toFixed(2)}</div>
                                <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;margin-top:4px;">
                                    ${totalServicos} serviços • Ticket médio R$ ${ticketMedio.toFixed(2)}
                                </div>
                            </div>
                            <div style="font-size:${isMobile ? '24px' : '36px'};opacity:0.3;">📊</div>
                        </div>
                        <div style="margin-top:${isMobile ? '8px' : '12px'};padding-top:${isMobile ? '8px' : '12px'};border-top:1px solid rgba(255,255,255,0.15);">
                            <span style="font-size:${isMobile ? '11px' : '13px'};">
                                ${variacaoFat > 0 ? '📈' : variacaoFat < 0 ? '📉' : '➡️'} 
                                ${variacaoFat > 0 ? '+' : ''}${variacaoFat.toFixed(1)}% vs mês anterior
                            </span>
                        </div>
                    </div>

                    <div style="background:var(--bg-card);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};border:2px solid #ef4444;box-shadow:0 4px 20px rgba(239,68,68,0.08);">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-size:${isMobile ? '11px' : '13px'};color:#ef4444;font-weight:600;">📉 Despesas</div>
                                <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;color:#ef4444;margin-top:2px;">R$ ${totalDespesas.toFixed(2)}</div>
                                <div style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);margin-top:4px;">
                                    💳 Pagas: R$ ${despesasPagas.toFixed(2)} • ⏳ Pendentes: R$ ${despesasPendentes.toFixed(2)}
                                </div>
                            </div>
                            <div style="font-size:${isMobile ? '24px' : '36px'};opacity:0.3;">📉</div>
                        </div>
                        <div style="margin-top:${isMobile ? '8px' : '12px'};padding-top:${isMobile ? '8px' : '12px'};border-top:1px solid var(--border-color);">
                            <span style="font-size:${isMobile ? '11px' : '13px'};color:${variacaoDesp > 0 ? '#ef4444' : '#22c55e'};">
                                ${variacaoDesp > 0 ? '📈' : variacaoDesp < 0 ? '📉' : '➡️'} 
                                ${variacaoDesp > 0 ? '+' : ''}${variacaoDesp.toFixed(1)}% vs mês anterior
                                ${variacaoDesp > 0 ? ' ⚠️' : ' ✅'}
                            </span>
                        </div>
                    </div>

                    <div style="background:${lucroLiquido >= 0 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px ${lucroLiquido >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'};">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">💎 Lucro Líquido</div>
                                <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;margin-top:2px;">R$ ${lucroLiquido.toFixed(2)}</div>
                                <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;margin-top:4px;">
                                    ${lucroLiquido >= 0 ? '✅ Lucrativo' : '❌ Prejuízo'} • Margem: ${faturamentoBruto > 0 ? ((lucroLiquido / faturamentoBruto) * 100).toFixed(1) : 0}%
                                </div>
                            </div>
                            <div style="font-size:${isMobile ? '24px' : '36px'};opacity:0.3;">💎</div>
                        </div>
                        <div style="margin-top:${isMobile ? '8px' : '12px'};padding-top:${isMobile ? '8px' : '12px'};border-top:1px solid rgba(255,255,255,0.15);">
                            <span style="font-size:${isMobile ? '11px' : '13px'};">
                                ${variacaoLucro > 0 ? '📈' : variacaoLucro < 0 ? '📉' : '➡️'} 
                                ${variacaoLucro > 0 ? '+' : ''}${variacaoLucro.toFixed(1)}% vs mês anterior
                            </span>
                        </div>
                    </div>

                    <div style="background:linear-gradient(135deg, #8b5cf6, #6d28d9);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px rgba(139,92,246,0.3);">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">👨‍💼 Comissões</div>
                                <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;margin-top:2px;">R$ ${totalComissoes.toFixed(2)}</div>
                                <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;margin-top:4px;">
                                    Lucro após comissões: R$ ${lucroAposComissoes.toFixed(2)}
                                </div>
                            </div>
                            <div style="font-size:${isMobile ? '24px' : '36px'};opacity:0.3;">👨‍💼</div>
                        </div>
                    </div>
                </div>

                <!-- ANÁLISE RÁPIDA -->
                <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:${isMobile ? '10px' : '16px'};margin-bottom:${isMobile ? '12px' : '16px'};">
                    <div style="background:var(--bg-card);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};border:1px solid var(--border-color);">
                        <h4 style="font-size:${isMobile ? '14px' : '16px'};margin:0 0 ${isMobile ? '8px' : '12px'} 0;display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-lightbulb" style="color:#f59e0b;"></i> Análise de Performance
                        </h4>
                        <div style="display:flex;flex-direction:column;gap:${isMobile ? '6px' : '8px'};">
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:${isMobile ? '4px 0' : '6px 0'};border-bottom:1px solid var(--border-color);">
                                <span style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-secondary);">🎫 Ticket Médio</span>
                                <span style="font-size:${isMobile ? '15px' : '18px'};font-weight:700;color:#22c55e;">R$ ${ticketMedio.toFixed(2)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:${isMobile ? '4px 0' : '6px 0'};border-bottom:1px solid var(--border-color);">
                                <span style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-secondary);">📅 Média de serviços/dia</span>
                                <span style="font-size:${isMobile ? '15px' : '18px'};font-weight:700;color:var(--text-primary);">${(totalServicos / 30).toFixed(1)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:${isMobile ? '4px 0' : '6px 0'};">
                                <span style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-secondary);">📊 Margem de Lucro</span>
                                <span style="font-size:${isMobile ? '15px' : '18px'};font-weight:700;color:${faturamentoBruto > 0 && (lucroLiquido / faturamentoBruto) > 0.2 ? '#22c55e' : '#f59e0b'};">${faturamentoBruto > 0 ? ((lucroLiquido / faturamentoBruto) * 100).toFixed(1) : 0}%</span>
                            </div>
                        </div>
                    </div>

                    <div style="background:var(--bg-card);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};border:1px solid var(--border-color);">
                        <h4 style="font-size:${isMobile ? '14px' : '16px'};margin:0 0 ${isMobile ? '8px' : '12px'} 0;display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-bullhorn" style="color:${lucroLiquido >= 0 ? '#22c55e' : '#ef4444'};"></i> 
                            ${lucroLiquido >= 0 ? '📈 Oportunidades de Melhoria' : '⚠️ Alertas e Ações'}
                        </h4>
                        <div style="display:flex;flex-direction:column;gap:${isMobile ? '6px' : '8px'};">
                            ${totalServicos < 30 ? `
                                <div style="display:flex;align-items:center;gap:8px;padding:${isMobile ? '6px 10px' : '8px 12px'};background:rgba(245,158,11,0.1);border-radius:8px;border-left:3px solid #f59e0b;">
                                    <span style="font-size:18px;">📉</span>
                                    <span style="font-size:${isMobile ? '12px' : '13px'};color:var(--text-secondary);">
                                        <strong>Baixo volume:</strong> Apenas ${totalServicos} serviços no mês. <br>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#f59e0b;">💡 Invista em marketing para atrair mais clientes.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${ticketMedio < 50 ? `
                                <div style="display:flex;align-items:center;gap:8px;padding:${isMobile ? '6px 10px' : '8px 12px'};background:rgba(245,158,11,0.1);border-radius:8px;border-left:3px solid #f59e0b;">
                                    <span style="font-size:18px;">💰</span>
                                    <span style="font-size:${isMobile ? '12px' : '13px'};color:var(--text-secondary);">
                                        <strong>Ticket médio baixo:</strong> R$ ${ticketMedio.toFixed(2)} <br>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#f59e0b;">💡 Ofereça combos ou serviços premium.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${despesasPendentes > 0 ? `
                                <div style="display:flex;align-items:center;gap:8px;padding:${isMobile ? '6px 10px' : '8px 12px'};background:rgba(239,68,68,0.1);border-radius:8px;border-left:3px solid #ef4444;">
                                    <span style="font-size:18px;">⏳</span>
                                    <span style="font-size:${isMobile ? '12px' : '13px'};color:var(--text-secondary);">
                                        <strong>Despesas pendentes:</strong> R$ ${despesasPendentes.toFixed(2)} <br>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#ef4444;">⚠️ Regularize para não comprometer o fluxo de caixa.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${faturamentoBruto > 0 && (despesasPendentes === 0 && totalServicos >= 30 && ticketMedio >= 50) ? `
                                <div style="display:flex;align-items:center;gap:8px;padding:${isMobile ? '6px 10px' : '8px 12px'};background:rgba(34,197,94,0.1);border-radius:8px;border-left:3px solid #22c55e;">
                                    <span style="font-size:18px;">🏆</span>
                                    <span style="font-size:${isMobile ? '12px' : '13px'};color:var(--text-secondary);">
                                        <strong>Excelente performance!</strong> <br>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#22c55e;">✅ Continue assim! Considere expandir serviços.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${lucroLiquido < 0 ? `
                                <div style="display:flex;align-items:center;gap:8px;padding:${isMobile ? '6px 10px' : '8px 12px'};background:rgba(239,68,68,0.15);border-radius:8px;border-left:3px solid #ef4444;">
                                    <span style="font-size:18px;">🚨</span>
                                    <span style="font-size:${isMobile ? '12px' : '13px'};color:var(--text-secondary);">
                                        <strong>Prejuízo no mês!</strong> Despesas maiores que faturamento. <br>
                                        <span style="font-size:${isMobile ? '10px' : '12px'};color:#ef4444;">⚠️ Reveja seus custos e aumente o ticket médio.</span>
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- COMPARATIVO MENSAL -->
                <div style="background:var(--bg-card);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};border:1px solid var(--border-color);margin-bottom:${isMobile ? '12px' : '16px'};">
                    <h4 style="font-size:${isMobile ? '14px' : '16px'};margin:0 0 ${isMobile ? '8px' : '12px'} 0;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-calendar-alt" style="color:var(--primary);"></i> 
                        Comparativo ${mesAnterior} vs ${mesAtual}
                    </h4>
                    <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr 1fr'};gap:${isMobile ? '8px' : '16px'};">
                        <div style="text-align:center;padding:${isMobile ? '8px' : '12px'};background:var(--bg-hover);border-radius:10px;">
                            <div style="font-size:${isMobile ? '11px' : '13px'};color:var(--text-muted);">💰 Faturamento</div>
                            <div style="display:flex;justify-content:center;gap:${isMobile ? '8px' : '16px'};margin-top:4px;">
                                <div>
                                    <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:700;color:var(--text-primary);">R$ ${fatAtual.toFixed(2)}</div>
                                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Este mês</div>
                                </div>
                                <div style="border-left:1px solid var(--border-color);padding-left:${isMobile ? '8px' : '16px'};">
                                    <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:700;color:var(--text-muted);">R$ ${fatAnterior.toFixed(2)}</div>
                                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Mês anterior</div>
                                </div>
                            </div>
                            <div style="font-size:${isMobile ? '11px' : '13px'};margin-top:4px;color:${variacaoFat >= 0 ? '#22c55e' : '#ef4444'};">
                                ${variacaoFat >= 0 ? '📈' : '📉'} ${variacaoFat > 0 ? '+' : ''}${variacaoFat.toFixed(1)}%
                            </div>
                        </div>
                        <div style="text-align:center;padding:${isMobile ? '8px' : '12px'};background:var(--bg-hover);border-radius:10px;">
                            <div style="font-size:${isMobile ? '11px' : '13px'};color:var(--text-muted);">📉 Despesas</div>
                            <div style="display:flex;justify-content:center;gap:${isMobile ? '8px' : '16px'};margin-top:4px;">
                                <div>
                                    <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:700;color:#ef4444;">R$ ${despAtual.toFixed(2)}</div>
                                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Este mês</div>
                                </div>
                                <div style="border-left:1px solid var(--border-color);padding-left:${isMobile ? '8px' : '16px'};">
                                    <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:700;color:var(--text-muted);">R$ ${despAnterior.toFixed(2)}</div>
                                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Mês anterior</div>
                                </div>
                            </div>
                            <div style="font-size:${isMobile ? '11px' : '13px'};margin-top:4px;color:${variacaoDesp <= 0 ? '#22c55e' : '#ef4444'};">
                                ${variacaoDesp <= 0 ? '📉' : '📈'} ${variacaoDesp > 0 ? '+' : ''}${variacaoDesp.toFixed(1)}%
                            </div>
                        </div>
                        <div style="text-align:center;padding:${isMobile ? '8px' : '12px'};background:var(--bg-hover);border-radius:10px;">
                            <div style="font-size:${isMobile ? '11px' : '13px'};color:var(--text-muted);">💎 Lucro</div>
                            <div style="display:flex;justify-content:center;gap:${isMobile ? '8px' : '16px'};margin-top:4px;">
                                <div>
                                    <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:700;color:${(fatAtual - despAtual) >= 0 ? '#22c55e' : '#ef4444'};">R$ ${(fatAtual - despAtual).toFixed(2)}</div>
                                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Este mês</div>
                                </div>
                                <div style="border-left:1px solid var(--border-color);padding-left:${isMobile ? '8px' : '16px'};">
                                    <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:700;color:${(fatAnterior - despAnterior) >= 0 ? '#22c55e' : '#ef4444'};">R$ ${(fatAnterior - despAnterior).toFixed(2)}</div>
                                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Mês anterior</div>
                                </div>
                            </div>
                            <div style="font-size:${isMobile ? '11px' : '13px'};margin-top:4px;color:${variacaoLucro >= 0 ? '#22c55e' : '#ef4444'};">
                                ${variacaoLucro >= 0 ? '📈' : '📉'} ${variacaoLucro > 0 ? '+' : ''}${variacaoLucro.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
    console.log('✅ Financeiro V2 renderizado com sucesso!');
}

// ============================================
// VISÃO DO PROFISSIONAL
// ============================================

function renderizarVisaoProfissional(financeiro, isMobile) {
    const totais = financeiro?.totais || {};
    const totalComissoes = toNumber(totais.total_comissoes);
    const totalServicos = totais.total_servicos || 0;

    let html = `
        <div class="fade-in financeiro-container">
            <div class="dashboard-header" style="flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'flex-start' : 'center'}; gap:${isMobile ? '8px' : '0'};">
                <div>
                    <h2 class="page-title" style="font-size:${isMobile ? '20px' : '24px'};">💰 Minhas Comissões</h2>
                    <p class="page-subtitle" style="font-size:${isMobile ? '13px' : '14px'};">
                        <i class="fas fa-chart-line"></i> Resumo do mês <strong>${mesAtual}/${filtroAnoReceitas}</strong>
                    </p>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:${isMobile ? '12px' : '16px'};">
                <div style="background:linear-gradient(135deg, #667eea, #764ba2);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '20px' : '24px'};color:white;box-shadow:0 4px 20px rgba(102,126,234,0.3);">
                    <div style="font-size:${isMobile ? '12px' : '14px'};opacity:0.8;">💰 Total em Comissões</div>
                    <div style="font-size:${isMobile ? '28px' : '36px'};font-weight:800;margin-top:4px;">R$ ${totalComissoes.toFixed(2)}</div>
                    <div style="font-size:${isMobile ? '12px' : '14px'};opacity:0.7;margin-top:8px;">
                        ✅ ${totalServicos} serviços concluídos
                    </div>
                </div>

                <div style="background:var(--bg-card);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '20px' : '24px'};border:2px solid #22c55e;">
                    <div style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-muted);">📈 Ticket Médio</div>
                    <div style="font-size:${isMobile ? '28px' : '36px'};font-weight:800;color:#22c55e;margin-top:4px;">
                        R$ ${totalServicos > 0 ? (totalComissoes / totalServicos).toFixed(2) : '0,00'}
                    </div>
                    <div style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-muted);margin-top:8px;">
                        📊 Valor médio por serviço
                    </div>
                </div>
            </div>

            <div style="margin-top:${isMobile ? '16px' : '20px'};text-align:center;padding:${isMobile ? '20px' : '30px'};background:var(--bg-hover);border-radius:12px;border:1px dashed var(--border-color);">
                <i class="fas fa-chevron-right" style="font-size:${isMobile ? '24px' : '32px'};color:var(--primary);display:block;margin-bottom:8px;"></i>
                <p style="font-size:${isMobile ? '14px' : '16px'};color:var(--text-secondary);">
                    Veja todos os seus serviços na aba <strong>Comissões</strong>
                </p>
                <button onclick="switchFinanceiroTab('profissionais')" style="
                    padding:${isMobile ? '8px 20px' : '10px 28px'};
                    background:var(--gradient);
                    color:white;
                    border:none;
                    border-radius:10px;
                    font-weight:600;
                    font-size:${isMobile ? '13px' : '14px'};
                    cursor:pointer;
                    margin-top:10px;
                ">
                    <i class="fas fa-arrow-right"></i> Ver Detalhes
                </button>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
}

// ============================================
// RENDER TABS
// ============================================

function renderTabReceitas(isMobile) {
    return `
        <div class="card" style="padding: ${isMobile ? '12px' : '20px'};">
            <div class="card-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'stretch' : 'center'}; gap: ${isMobile ? '10px' : '0'};">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-arrow-up" style="color: #22c55e;"></i> Receitas
                </h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; ${isMobile ? 'width: 100%;' : ''}">
                    <input type="month" id="filtroMesReceitas" value="${filtroAnoReceitas}-${filtroMesReceitas}" 
                           onchange="aplicarFiltroReceitas()" 
                           style="
                               padding: ${isMobile ? '8px 12px' : '6px 12px'};
                               border-radius: 8px;
                               border: 1px solid var(--border-color);
                               background: var(--bg-input);
                               color: var(--text-primary);
                               font-size: ${isMobile ? '14px' : '12px'};
                               ${isMobile ? 'flex: 1;' : ''}
                           ">
                    <button class="btn btn-outline btn-sm" onclick="carregarReceitas()" style="
                        padding: ${isMobile ? '8px 16px' : '6px 12px'};
                        border-radius: 8px;
                        border: 1px solid var(--border-color);
                        background: var(--bg-hover);
                        color: var(--text-secondary);
                        font-size: ${isMobile ? '13px' : '12px'};
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        ${isMobile ? 'flex: 1; justify-content: center;' : ''}
                    ">
                        <i class="fas fa-sync"></i> ${isMobile ? '' : 'Atualizar'}
                    </button>
                </div>
            </div>
            <div id="receitasList" style="margin-top: ${isMobile ? '12px' : '0'};">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p style="margin-top:8px;">Carregando receitas...</p>
                </div>
            </div>
        </div>
    `;
}

function renderTabDespesas(isMobile) {
    return `
        <div class="card" style="padding: ${isMobile ? '12px' : '20px'};">
            <div class="card-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'stretch' : 'center'}; gap: ${isMobile ? '10px' : '0'};">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-arrow-down" style="color: #ef4444;"></i> Despesas
                </h3>
                <button class="btn btn-primary btn-sm" onclick="abrirModalDespesa()" style="
                    padding: ${isMobile ? '10px 16px' : '8px 16px'};
                    border-radius: 8px;
                    border: none;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    font-weight: 600;
                    font-size: ${isMobile ? '14px' : '13px'};
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    ${isMobile ? 'width: 100%; justify-content: center;' : ''}
                ">
                    <i class="fas fa-plus"></i> ${isMobile ? 'Nova Despesa' : 'Nova Despesa'}
                </button>
            </div>
            
            <div style="
                padding: ${isMobile ? '10px' : '12px'};
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                border-bottom: 1px solid var(--border-color);
                margin-top: ${isMobile ? '8px' : '0'};
            ">
                <select id="filtroCategoriaDespesa" onchange="aplicarFiltrosDespesasTab()" style="
                    padding: ${isMobile ? '8px 12px' : '6px 12px'};
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-size: ${isMobile ? '13px' : '12px'};
                    ${isMobile ? 'flex: 1; min-width: 100px;' : ''}
                ">
                    <option value="">Todas Categorias</option>
                </select>
                
                <select id="filtroPagoDespesa" onchange="aplicarFiltrosDespesasTab()" style="
                    padding: ${isMobile ? '8px 12px' : '6px 12px'};
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-size: ${isMobile ? '13px' : '12px'};
                    ${isMobile ? 'flex: 1; min-width: 80px;' : ''}
                ">
                    <option value="">Todos</option>
                    <option value="true">✅ Pagas</option>
                    <option value="false">⏳ Pendentes</option>
                </select>
                
                <input type="month" id="filtroMesDespesaTab" value="${filtroAnoReceitas || ''}-${filtroMesReceitas || ''}" 
                       onchange="aplicarFiltrosDespesasTab()" 
                       style="
                           padding: ${isMobile ? '8px 12px' : '6px 12px'};
                           border-radius: 8px;
                           border: 1px solid var(--border-color);
                           background: var(--bg-input);
                           color: var(--text-primary);
                           font-size: ${isMobile ? '13px' : '12px'};
                           ${isMobile ? 'flex: 1; min-width: 120px;' : ''}
                       ">
            </div>
            
            <div id="despesasList" style="margin-top: ${isMobile ? '10px' : '12px'};">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p style="margin-top:8px;">Carregando despesas...</p>
                </div>
            </div>
        </div>
    `;
}

function renderTabComissoes(isMobile) {
    return `
        <div class="card" style="padding: ${isMobile ? '12px' : '20px'};">
            <div class="card-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'flex-start' : 'center'}; gap: ${isMobile ? '8px' : '0'};">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-users" style="color: var(--primary);"></i> Comissões por Profissional
                </h3>
                <span class="badge badge-info" style="
                    font-size: ${isMobile ? '11px' : '12px'};
                    padding: ${isMobile ? '4px 12px' : '4px 12px'};
                    border-radius: 20px;
                    background: rgba(102,126,234,0.1);
                    color: var(--primary);
                    border: 1px solid rgba(102,126,234,0.2);
                ">Detalhamento</span>
            </div>
            <div id="comissoesList" style="margin-top: ${isMobile ? '12px' : '0'};">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p style="margin-top:8px;">Carregando comissões...</p>
                </div>
            </div>
        </div>
    `;
}

function renderTabAnaliseDiaria(isMobile) {
    return `
        <div class="card" style="padding: ${isMobile ? '12px' : '20px'};">
            <div class="card-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'stretch' : 'center'}; gap: ${isMobile ? '10px' : '0'};">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-calendar-day" style="color: #8b5cf6;"></i> Análise Diária
                </h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; ${isMobile ? 'width: 100%;' : ''}">
                    <input type="month" id="filtroMesAnalise" value="${filtroAnoReceitas || ''}-${filtroMesReceitas || ''}" 
                           onchange="carregarAnaliseDiaria()" 
                           style="
                               padding: ${isMobile ? '8px 12px' : '6px 12px'};
                               border-radius: 8px;
                               border: 1px solid var(--border-color);
                               background: var(--bg-input);
                               color: var(--text-primary);
                               font-size: ${isMobile ? '14px' : '12px'};
                               ${isMobile ? 'flex: 1;' : ''}
                           ">
                </div>
            </div>
            <div id="analiseDiariaContent" style="margin-top: ${isMobile ? '12px' : '0'};">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p style="margin-top:8px;">Carregando análise diária...</p>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// CARREGAR RECEITAS - COM FORMA DE PAGAMENTO
// ============================================

async function carregarReceitas() {
    const token = localStorage.getItem('token');
    const mesInput = document.getElementById('filtroMesReceitas');

    if (mesInput && mesInput.value) {
        const [ano, mes] = mesInput.value.split('-');
        filtroAnoReceitas = ano;
        filtroMesReceitas = mes;
    }

    try {
        const res = await fetch(`/api/financeiro/receitas?mes=${filtroMesReceitas}&ano=${filtroAnoReceitas}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        const container = document.getElementById('receitasList');
        if (!container) return;

        const isMobile = window.innerWidth < 768;

        if (result.success) {
            const lista = result.data?.receitas || [];
            const total = result.data?.total || 0;

            if (lista.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 30px 20px; text-align: center;">
                        <i class="fas fa-coins" style="font-size: 32px; color: var(--text-muted);"></i>
                        <h4 style="margin: 10px 0 5px 0; font-size: 16px; color: var(--text-primary);">Nenhuma receita</h4>
                        <p style="font-size: 13px; color: var(--text-muted);">Conclua serviços para gerar receitas</p>
                    </div>
                `;
                return;
            }

            // ============================================
            // 🔥 AGRUPAR POR FORMA DE PAGAMENTO
            // ============================================
            const agrupado = {
                dinheiro: { total: 0, count: 0 },
                pix: { total: 0, count: 0 },
                debito: { total: 0, count: 0 },
                credito: { total: 0, count: 0 },
                prazo: { total: 0, count: 0 },
                nao_informado: { total: 0, count: 0 }
            };

            for (let item of lista) {
                const forma = item.forma_pagamento || '';
                const valor = toNumber(item.valor_total) || toNumber(item.valor) || 0;

                if (forma === 'dinheiro') { agrupado.dinheiro.total += valor; agrupado.dinheiro.count++; }
                else if (forma === 'pix') { agrupado.pix.total += valor; agrupado.pix.count++; }
                else if (forma === 'debito') { agrupado.debito.total += valor; agrupado.debito.count++; }
                else if (forma === 'credito') { agrupado.credito.total += valor; agrupado.credito.count++; }
                else if (forma === 'prazo') { agrupado.prazo.total += valor; agrupado.prazo.count++; }
                else { agrupado.nao_informado.total += valor; agrupado.nao_informado.count++; }
            }

            // ============================================
            // 🔥 RESUMO POR FORMA DE PAGAMENTO
            // ============================================
            const resumoHtml = `
                <div style="
                    display: grid;
                    grid-template-columns: ${isMobile ? '1fr 1fr' : 'repeat(5, 1fr)'};
                    gap: ${isMobile ? '6px' : '8px'};
                    margin-bottom: ${isMobile ? '12px' : '16px'};
                ">
                    ${[
                    { id: 'dinheiro', label: '💰 Dinheiro', data: agrupado.dinheiro, color: '#22c55e' },
                    { id: 'pix', label: '📱 Pix', data: agrupado.pix, color: '#3b82f6' },
                    { id: 'debito', label: '💳 Débito', data: agrupado.debito, color: '#8b5cf6' },
                    { id: 'credito', label: '💳 Crédito', data: agrupado.credito, color: '#f59e0b' },
                    { id: 'prazo', label: '📝 Fiado', data: agrupado.prazo, color: '#ef4444' }
                ].map(p => `
                        <div style="
                            background: var(--bg-hover);
                            border-radius: ${isMobile ? '8px' : '10px'};
                            padding: ${isMobile ? '8px' : '12px'};
                            text-align: center;
                            border: 1px solid ${p.data.total > 0 ? p.color : 'var(--border-color)'}33;
                        ">
                            <div style="font-size: ${isMobile ? '10px' : '11px'}; color: var(--text-muted);">${p.label}</div>
                            <div style="font-size: ${isMobile ? '16px' : '18px'}; font-weight: 700; color: ${p.data.total > 0 ? p.color : 'var(--text-muted)'};">
                                R$ ${p.data.total.toFixed(2)}
                            </div>
                            ${p.data.count > 0 ? `<div style="font-size: 9px; color: var(--text-muted);">${p.data.count} serviço(s)</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;

            // Total geral
            let html = resumoHtml;

            html += `
                <div style="
                    padding: ${isMobile ? '10px' : '12px'};
                    background: var(--bg-hover);
                    border-radius: 10px;
                    margin-bottom: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                ">
                    <span style="font-weight: 600; font-size: ${isMobile ? '14px' : '16px'};">
                        Total Geral: <span style="color: #22c55e;">R$ ${total.toFixed(2)}</span>
                    </span>
                    <span style="font-size: ${isMobile ? '12px' : '14px'}; color: var(--text-muted);">
                        ${lista.length} ${lista.length === 1 ? 'serviço' : 'serviços'}
                    </span>
                </div>
            `;

            // ============================================
            // 🔥 LISTA DE RECEITAS COM FORMA DE PAGAMENTO
            // ============================================
            if (isMobile) {
                html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
                for (let item of lista) {
                    const forma = item.forma_pagamento || '';
                    const label = pagamentoLabels[forma] || '❓ Não informado';
                    const cor = pagamentoCores[forma] || 'var(--text-muted)';

                    html += `
                        <div style="
                            background: var(--bg-card);
                            border-radius: 12px;
                            padding: 14px 16px;
                            border: 1px solid ${cor}33;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">
                                        ${escapeHtml(item.cliente_nome || 'Cliente')}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        ✂️ ${escapeHtml(item.servico_nome || item.servico || 'Serviço')}
                                    </div>
                                </div>
                                <span style="font-size: 16px; font-weight: 700; color: #22c55e; white-space: nowrap; margin-left: 8px;">
                                    R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}
                                </span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
                                <span>📅 ${formatarDataBr(item.data)}</span>
                                <span style="color: ${cor}; font-weight: 600;">${label}</span>
                                ${item.profissional_id ? `<span>👨‍💼 ${escapeHtml(item.profissional_nome || 'Profissional')}</span>` : ''}
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>📅 Data</th>
                                    <th>👤 Cliente</th>
                                    <th>✂️ Serviço</th>
                                    <th>💰 Valor</th>
                                    <th>💳 Pagamento</th>
                                    <th>👨‍💼 Profissional</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lista.map(item => {
                    const forma = item.forma_pagamento || '';
                    const label = pagamentoLabels[forma] || '❓ Não informado';
                    const cor = pagamentoCores[forma] || 'var(--text-muted)';
                    return `
                                        <tr>
                                            <td>${formatarDataBr(item.data)}</td>
                                            <td><strong>${escapeHtml(item.cliente_nome || 'Cliente')}</strong></td>
                                            <td>${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</td>
                                            <td><span style="color:#22c55e;font-weight:700;">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</span></td>
                                            <td><span style="color:${cor};font-weight:600;">${label}</span></td>
                                            <td>${item.profissional_id ? escapeHtml(item.profissional_nome || 'Profissional') : '-'}</td>
                                        </tr>
                                    `;
                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar receitas:', error);
        const container = document.getElementById('receitasList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                    <h4 style="margin: 10px 0 5px 0; font-size: 16px; color: var(--text-primary);">Erro ao carregar receitas</h4>
                    <p style="font-size: 13px; color: var(--text-muted);">${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarReceitas()" style="margin-top: 10px;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// SWITCH TABS
// ============================================

function switchFinanceiroTab(tab) {
    document.querySelectorAll('.config-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = 'var(--text-secondary)';
        t.style.boxShadow = 'none';
    });

    const tabs = document.querySelectorAll('.config-tab');
    const index = ['resumo', 'receitas', 'despesas', 'profissionais', 'analise'].indexOf(tab);
    if (tabs[index]) {
        tabs[index].classList.add('active');
        tabs[index].style.background = 'var(--gradient)';
        tabs[index].style.color = 'white';
        tabs[index].style.boxShadow = '0 4px 12px rgba(102,126,234,0.3)';
    }

    const isMobile = window.innerWidth < 768;

    switch (tab) {
        case 'resumo':
            carregarFinanceiro();
            break;
        case 'receitas':
            document.getElementById('financeiroContent').innerHTML = renderTabReceitas(isMobile);
            carregarReceitas();
            break;
        case 'despesas':
            document.getElementById('financeiroContent').innerHTML = renderTabDespesas(isMobile);
            carregarDespesasTab();
            break;
        case 'profissionais':
            document.getElementById('financeiroContent').innerHTML = renderTabComissoes(isMobile);
            carregarComissoesTab();
            break;
        case 'analise':
            document.getElementById('financeiroContent').innerHTML = renderTabAnaliseDiaria(isMobile);
            carregarAnaliseDiaria();
            break;
        default:
            break;
    }
}

// ============================================
// FUNÇÕES AUXILIARES DAS TABS
// ============================================

function aplicarFiltroReceitas() {
    carregarReceitas();
}

function aplicarFiltrosDespesasTab() {
    carregarDespesasTab();
}

// ============================================
// CARREGAR DESPESAS TAB
// ============================================

async function carregarDespesasTab() {
    const token = localStorage.getItem('token');
    const mesSelect = document.getElementById('filtroMesDespesaTab');
    let mes = mesSelect?.value || `${filtroAnoReceitas || ''}-${filtroMesReceitas || ''}`;

    if (mes) {
        const [ano, mesNum] = mes.split('-');
        filtroAnoReceitas = ano;
        filtroMesReceitas = mesNum;
    }

    const categoria = document.getElementById('filtroCategoriaDespesa')?.value || '';
    const pago = document.getElementById('filtroPagoDespesa')?.value || '';

    let url = `/api/despesas?mes=${filtroMesReceitas}&ano=${filtroAnoReceitas}`;
    if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
    if (pago) url += `&pago=${pago}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        const container = document.getElementById('despesasList');
        if (!container) return;

        const isMobile = window.innerWidth < 768;

        if (result.success) {
            const lista = Array.isArray(result.data) ? result.data : [];
            const total = lista.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
            const pagas = lista.filter(d => d.pago).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
            const pendentes = lista.filter(d => !d.pago).reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);

            if (lista.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 30px 20px; text-align: center;">
                        <i class="fas fa-receipt" style="font-size: 32px; color: var(--text-muted);"></i>
                        <h4 style="margin: 10px 0 5px 0; font-size: 16px; color: var(--text-primary);">Nenhuma despesa</h4>
                        <p style="font-size: 13px; color: var(--text-muted);">Clique em "Nova Despesa" para começar</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div style="
                    padding: ${isMobile ? '12px' : '14px'};
                    background: var(--bg-hover);
                    border-radius: 10px;
                    margin-bottom: 14px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                ">
                    <span style="font-weight: 600; font-size: ${isMobile ? '14px' : '16px'};">
                        Total: <span style="color: #ef4444;">R$ ${total.toFixed(2)}</span>
                    </span>
                    <div style="display: flex; gap: 12px; font-size: ${isMobile ? '11px' : '13px'};">
                        <span style="color: #22c55e;">✅ ${pagas.toFixed(2)} pagas</span>
                        <span style="color: #f59e0b;">⏳ ${pendentes.toFixed(2)} pendentes</span>
                    </div>
                </div>
            `;

            if (isMobile) {
                html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
                for (let d of lista) {
                    const valor = parseFloat(d.valor) || 0;
                    html += `
                        <div style="
                            background: var(--bg-card);
                            border-radius: 12px;
                            padding: 14px 16px;
                            border: 1px solid ${d.pago ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'};
                            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">
                                        ${escapeHtml(d.descricao)}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        📂 ${escapeHtml(d.categoria)}
                                    </div>
                                </div>
                                <span style="font-size: 16px; font-weight: 700; color: #ef4444; white-space: nowrap; margin-left: 8px;">
                                    R$ ${valor.toFixed(2)}
                                </span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
                                <span>📅 ${formatarDataBr(d.data)}</span>
                                <span>${d.pago ? '✅ Paga' : '⏳ Pendente'}</span>
                            </div>
                            <div style="display: flex; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); flex-wrap: wrap;">
                                <button onclick="editarDespesa(${d.id})" style="
                                    padding: 6px 14px;
                                    border-radius: 8px;
                                    border: 1px solid var(--border-color);
                                    background: var(--bg-hover);
                                    color: var(--text-primary);
                                    font-size: 12px;
                                    cursor: pointer;
                                    flex: 1;
                                ">
                                    <i class="fas fa-pen"></i> Editar
                                </button>
                                <button onclick="togglePagoDespesa(${d.id}, ${d.pago ? 0 : 1})" style="
                                    padding: 6px 14px;
                                    border-radius: 8px;
                                    border: 1px solid ${d.pago ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};
                                    background: var(--bg-hover);
                                    color: ${d.pago ? '#ef4444' : '#22c55e'};
                                    font-size: 12px;
                                    cursor: pointer;
                                    flex: 1;
                                ">
                                    <i class="fas ${d.pago ? 'fa-undo' : 'fa-check'}"></i> ${d.pago ? 'Desfazer' : 'Pagar'}
                                </button>
                                <button onclick="excluirDespesa(${d.id})" style="
                                    padding: 6px 14px;
                                    border-radius: 8px;
                                    border: 1px solid rgba(239,68,68,0.3);
                                    background: var(--bg-hover);
                                    color: #ef4444;
                                    font-size: 12px;
                                    cursor: pointer;
                                    flex: 1;
                                ">
                                    <i class="fas fa-trash"></i> Excluir
                                </button>
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>📅 Data</th>
                                    <th>📝 Descrição</th>
                                    <th>📂 Categoria</th>
                                    <th>💰 Valor</th>
                                    <th>📊 Status</th>
                                    <th>⚡ Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lista.map(d => `
                                    <tr>
                                        <td>${formatarDataBr(d.data)}</td>
                                        <td>${escapeHtml(d.descricao)}</td>
                                        <td><span class="badge badge-info">${escapeHtml(d.categoria)}</span></td>
                                        <td><span style="color:#ef4444;font-weight:700;">R$ ${(parseFloat(d.valor) || 0).toFixed(2)}</span></td>
                                        <td>
                                            ${d.pago ? '<span class="badge-success">✅ Paga</span>' : '<span class="badge-warning">⏳ Pendente</span>'}
                                        </td>
                                        <td>
                                            <div style="display:flex;gap:4px;">
                                                <button class="btn btn-outline btn-sm" onclick="editarDespesa(${d.id})">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-outline btn-sm" onclick="togglePagoDespesa(${d.id}, ${d.pago ? 0 : 1})">
                                                    <i class="fas ${d.pago ? 'fa-undo' : 'fa-check'}"></i>
                                                </button>
                                                <button class="btn btn-outline btn-sm" onclick="excluirDespesa(${d.id})" style="color:#ef4444;">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar despesas:', error);
        const container = document.getElementById('despesasList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                    <h4 style="margin: 10px 0 5px 0; font-size: 16px; color: var(--text-primary);">Erro ao carregar despesas</h4>
                    <p style="font-size: 13px; color: var(--text-muted);">${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarDespesasTab()" style="margin-top: 10px;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// CARREGAR COMISSÕES TAB
// ============================================

async function carregarComissoesTab() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/financeiro', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        const container = document.getElementById('comissoesList');
        if (!container) return;

        const isMobile = window.innerWidth < 768;

        if (result.success) {
            const comissoes = result.data?.comissoes || [];
            const comissoesPorProf = result.data?.comissoes_por_profissional || [];

            if (comissoes.length === 0 && comissoesPorProf.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: 30px 20px; text-align: center;">
                        <i class="fas fa-check-circle" style="font-size: 32px; color: var(--text-muted);"></i>
                        <h4 style="margin: 10px 0 5px 0; font-size: 16px; color: var(--text-primary);">Nenhum serviço concluído</h4>
                        <p style="font-size: 13px; color: var(--text-muted);">Os serviços aparecerão aqui quando forem concluídos</p>
                    </div>
                `;
                return;
            }

            let html = '';

            if (comissoesPorProf.length > 0) {
                if (isMobile) {
                    html += `<div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">`;
                    for (let prof of comissoesPorProf) {
                        html += `
                            <div style="
                                background: var(--bg-card);
                                border-radius: 12px;
                                padding: 14px 16px;
                                border: 1px solid var(--border-color);
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                            ">
                                <div>
                                    <div style="font-weight: 600; font-size: 14px; color: var(--text-primary);">
                                        ${escapeHtml(prof.nome)}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        ${prof.total_servicos} serviços
                                    </div>
                                </div>
                                <div style="font-size: 18px; font-weight: 700; color: var(--primary);">
                                    R$ ${toNumber(prof.total_comissao).toFixed(2)}
                                </div>
                            </div>
                        `;
                    }
                    html += `</div>`;
                } else {
                    html += `
                        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;margin-bottom:16px;">
                            ${comissoesPorProf.map(prof => `
                                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);text-align:center;">
                                    <div style="font-weight:700;font-size:16px;">${escapeHtml(prof.nome)}</div>
                                    <div style="font-size:13px;color:var(--text-muted);">${prof.total_servicos} serviços</div>
                                    <div style="font-size:18px;font-weight:700;color:var(--primary);margin-top:4px;">R$ ${toNumber(prof.total_comissao).toFixed(2)}</div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }

            if (isMobile) {
                html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
                for (let item of comissoes) {
                    html += `
                        <div style="
                            background: var(--bg-card);
                            border-radius: 12px;
                            padding: 14px 16px;
                            border: 1px solid var(--border-color);
                            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                        ">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">
                                        ${escapeHtml(item.cliente_nome || 'Cliente')}
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted);">
                                        ✂️ ${escapeHtml(item.servico_nome || item.servico || 'Serviço')}
                                    </div>
                                </div>
                                <span style="font-size: 16px; font-weight: 700; color: var(--primary); white-space: nowrap; margin-left: 8px;">
                                    R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}
                                </span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
                                <span>📅 ${formatarDataBr(item.data)}</span>
                                ${item.profissional_id ? `<span>👨‍💼 ${escapeHtml(item.profissional_nome || 'Profissional')}</span>` : ''}
                                ${item.profissional_id ? `<span style="color: var(--primary); font-weight: 600;">💰 R$ ${toNumber(item.comissao).toFixed(2)}</span>` : ''}
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>📅 Data</th>
                                    <th>👤 Cliente</th>
                                    <th>✂️ Serviço</th>
                                    <th>💰 Valor</th>
                                    <th>👨‍💼 Profissional</th>
                                    <th>💰 Comissão</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${comissoes.map(item => `
                                    <tr>
                                        <td>${formatarDataBr(item.data)}</td>
                                        <td><strong>${escapeHtml(item.cliente_nome || 'Cliente')}</strong></td>
                                        <td>${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</td>
                                        <td><span class="valor">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</span></td>
                                        <td>${item.profissional_id ? escapeHtml(item.profissional_nome || 'Profissional') : 'Sem profissional'}</td>
                                        <td>${item.profissional_id ? `<span style="color:var(--primary);font-weight:700;">R$ ${toNumber(item.comissao).toFixed(2)}</span>` : 'R$ 0,00'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Erro ao carregar comissões:', error);
        const container = document.getElementById('comissoesList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                    <h4 style="margin: 10px 0 5px 0; font-size: 16px; color: var(--text-primary);">Erro ao carregar comissões</h4>
                    <p style="font-size: 13px; color: var(--text-muted);">${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarComissoesTab()" style="margin-top: 10px;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// CARREGAR ANÁLISE DIÁRIA
// ============================================

async function carregarAnaliseDiaria() {
    const token = localStorage.getItem('token');
    const mesInput = document.getElementById('filtroMesAnalise');
    let mes, ano;

    if (mesInput && mesInput.value) {
        const [anoVal, mesVal] = mesInput.value.split('-');
        mes = mesVal;
        ano = anoVal;
    } else {
        const hoje = new Date();
        mes = String(hoje.getMonth() + 1).padStart(2, '0');
        ano = String(hoje.getFullYear());
    }

    try {
        const res = await fetch(`/api/financeiro/analise-diaria?mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        const container = document.getElementById('analiseDiariaContent');
        if (!container) return;

        if (result.success && result.dados) {
            const dias = result.dados || [];
            const totalServicos = dias.reduce((acc, d) => acc + (parseInt(d.qtd_servicos) || 0), 0);
            const totalFaturamento = dias.reduce((acc, d) => acc + (parseFloat(d.faturamento) || 0), 0);
            const mediaServicos = dias.length > 0 ? totalServicos / dias.length : 0;
            const diasComServico = dias.filter(d => parseInt(d.qtd_servicos) > 0).length;

            container.innerHTML = `
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
                    <div style="text-align:center;padding:12px;background:var(--bg-hover);border-radius:10px;">
                        <div style="font-size:20px;font-weight:700;">${totalServicos}</div>
                        <div style="font-size:12px;color:var(--text-muted);">Total de serviços</div>
                    </div>
                    <div style="text-align:center;padding:12px;background:var(--bg-hover);border-radius:10px;">
                        <div style="font-size:20px;font-weight:700;color:#22c55e;">R$ ${totalFaturamento.toFixed(2)}</div>
                        <div style="font-size:12px;color:var(--text-muted);">Faturamento total</div>
                    </div>
                    <div style="text-align:center;padding:12px;background:var(--bg-hover);border-radius:10px;">
                        <div style="font-size:20px;font-weight:700;color:#8b5cf6;">${mediaServicos.toFixed(1)}</div>
                        <div style="font-size:12px;color:var(--text-muted);">Média/dia</div>
                    </div>
                    <div style="text-align:center;padding:12px;background:var(--bg-hover);border-radius:10px;">
                        <div style="font-size:20px;font-weight:700;color:${diasComServico > 0 ? '#22c55e' : '#ef4444'};">${diasComServico}</div>
                        <div style="font-size:12px;color:var(--text-muted);">Dias com serviço</div>
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:12px;">
                    ${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `
                        <div style="text-align:center;padding:4px;font-weight:600;color:var(--text-muted);">${d}</div>
                    `).join('')}
                    ${dias.map(d => {
                const qtd = parseInt(d.qtd_servicos) || 0;
                const fat = parseFloat(d.faturamento) || 0;
                return `
                            <div style="text-align:center;padding:8px 2px;border-radius:6px;background:${qtd > 0 ? 'rgba(34,197,94,0.15)' : 'var(--bg-hover)'};border:1px solid ${qtd > 0 ? '#22c55e' : 'var(--border-color)'};">
                                <div style="font-weight:600;">${d.dia}</div>
                                <div style="font-size:10px;color:${qtd > 0 ? '#22c55e' : 'var(--text-muted)'};">${qtd > 0 ? `R$ ${fat.toFixed(0)}` : '-'}</div>
                            </div>
                        `;
            }).join('')}
                </div>
                ${diasComServico === 0 ? `
                    <div style="text-align:center;padding:16px;margin-top:12px;background:rgba(239,68,68,0.1);border-radius:10px;border:1px solid #ef4444;">
                        <span style="color:#ef4444;">⚠️ Nenhum serviço realizado neste mês</span>
                    </div>
                ` : diasComServico < dias.length / 2 ? `
                    <div style="text-align:center;padding:12px;margin-top:12px;background:rgba(245,158,11,0.1);border-radius:10px;border:1px solid #f59e0b;">
                        <span style="color:#f59e0b;">💡 Apenas ${diasComServico} de ${dias.length} dias tiveram movimento. Considere ações de marketing!</span>
                    </div>
                ` : `
                    <div style="text-align:center;padding:12px;margin-top:12px;background:rgba(34,197,94,0.1);border-radius:10px;border:1px solid #22c55e;">
                        <span style="color:#22c55e;">✅ Ótimo! ${diasComServico} de ${dias.length} dias com movimento</span>
                    </div>
                `}
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar análise diária:', error);
        const container = document.getElementById('analiseDiariaContent');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px 20px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                    <h4 style="margin: 10px 0 5px 0; font-size: 16px; color: var(--text-primary);">Erro ao carregar análise</h4>
                    <p style="font-size: 13px; color: var(--text-muted);">${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarAnaliseDiaria()" style="margin-top: 10px;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarFinanceiro = carregarFinanceiro;
window.switchFinanceiroTab = switchFinanceiroTab;
window.carregarReceitas = carregarReceitas;
window.carregarDespesasTab = carregarDespesasTab;
window.carregarComissoesTab = carregarComissoesTab;
window.carregarAnaliseDiaria = carregarAnaliseDiaria;
window.aplicarFiltroReceitas = aplicarFiltroReceitas;
window.aplicarFiltrosDespesasTab = aplicarFiltrosDespesasTab;

console.log('✅ Financeiro V2 - Completo com formas de pagamento!');
// ============================================
// MODAL DESPESAS - CORREÇÃO
// ============================================

function abrirModalDespesa() {
    console.log('📝 Abrindo modal de despesa...');
    
    // Verificar se o modal existe
    let modal = document.getElementById('modalDespesa');
    
    if (!modal) {
        // Criar modal se não existir
        modal = document.createElement('div');
        modal.id = 'modalDespesa';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.overflow = 'auto';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        
        modal.innerHTML = `
            <div style="
                background-color: var(--bg-card, #1a1a2e);
                margin: 10% auto;
                padding: 30px;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                position: relative;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: var(--text-primary, #fff);">Nova Despesa</h3>
                    <button onclick="fecharModalDespesa()" style="
                        background: none;
                        border: none;
                        color: var(--text-muted, #999);
                        font-size: 24px;
                        cursor: pointer;
                    ">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="formDespesa">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">Descrição *</label>
                            <input type="text" id="despesa_descricao" class="form-control" required style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid var(--border-color, #333);
                                background: var(--bg-input, #1a1a2e);
                                color: var(--text-primary, #fff);
                            ">
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">Categoria</label>
                            <select id="despesa_categoria" class="form-control" style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid var(--border-color, #333);
                                background: var(--bg-input, #1a1a2e);
                                color: var(--text-primary, #fff);
                            ">
                                <option value="Aluguel">Aluguel</option>
                                <option value="Água">Água</option>
                                <option value="Luz">Luz</option>
                                <option value="Internet">Internet</option>
                                <option value="Telefone">Telefone</option>
                                <option value="Material">Material</option>
                                <option value="Limpeza">Limpeza</option>
                                <option value="Manutenção">Manutenção</option>
                                <option value="Salário">Salário</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">Valor *</label>
                            <input type="number" id="despesa_valor" class="form-control" step="0.01" required style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid var(--border-color, #333);
                                background: var(--bg-input, #1a1a2e);
                                color: var(--text-primary, #fff);
                            ">
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">Data *</label>
                            <input type="date" id="despesa_data" class="form-control" required style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid var(--border-color, #333);
                                background: var(--bg-input, #1a1a2e);
                                color: var(--text-primary, #fff);
                            ">
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">Data Vencimento</label>
                            <input type="date" id="despesa_vencimento" class="form-control" style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid var(--border-color, #333);
                                background: var(--bg-input, #1a1a2e);
                                color: var(--text-primary, #fff);
                            ">
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">Forma de Pagamento</label>
                            <select id="despesa_forma_pagamento" class="form-control" style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid var(--border-color, #333);
                                background: var(--bg-input, #1a1a2e);
                                color: var(--text-primary, #fff);
                            ">
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Pix">Pix</option>
                                <option value="Débito">Débito</option>
                                <option value="Crédito">Crédito</option>
                                <option value="Boleto">Boleto</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">Observação</label>
                            <textarea id="despesa_observacao" class="form-control" rows="2" style="
                                width: 100%;
                                padding: 10px;
                                border-radius: 8px;
                                border: 1px solid var(--border-color, #333);
                                background: var(--bg-input, #1a1a2e);
                                color: var(--text-primary, #fff);
                            "></textarea>
                        </div>
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--text-secondary, #ccc);">
                                <input type="checkbox" id="despesa_pago"> Já foi pago
                            </label>
                        </div>
                        <button type="submit" class="btn btn-primary" style="
                            width: 100%;
                            padding: 12px;
                            border-radius: 8px;
                            border: none;
                            background: linear-gradient(135deg, #667eea, #764ba2);
                            color: white;
                            font-weight: 600;
                            cursor: pointer;
                        ">Salvar Despesa</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Adicionar evento de submit
        document.getElementById('formDespesa').addEventListener('submit', function(e) {
            e.preventDefault();
            salvarDespesa();
        });
    }
    
    // Preencher data atual
    const hoje = new Date().toISOString().split('T')[0];
    const dataInput = document.getElementById('despesa_data');
    const vencimentoInput = document.getElementById('despesa_vencimento');
    if (dataInput) dataInput.value = hoje;
    if (vencimentoInput) vencimentoInput.value = hoje;
    
    // Limpar campos
    const descricao = document.getElementById('despesa_descricao');
    const valor = document.getElementById('despesa_valor');
    const observacao = document.getElementById('despesa_observacao');
    const pago = document.getElementById('despesa_pago');
    if (descricao) descricao.value = '';
    if (valor) valor.value = '';
    if (observacao) observacao.value = '';
    if (pago) pago.checked = false;
    
    modal.style.display = 'block';
}

function fecharModalDespesa() {
    const modal = document.getElementById('modalDespesa');
    if (modal) {
        modal.style.display = 'none';
    }
}
async function salvarDespesa() {
    try {
        const descricao = document.getElementById('despesa_descricao').value;
        const categoria = document.getElementById('despesa_categoria').value;
        const valor = parseFloat(document.getElementById('despesa_valor').value);
        const data = document.getElementById('despesa_data').value;
        const vencimento = document.getElementById('despesa_vencimento').value;
        const forma_pagamento = document.getElementById('despesa_forma_pagamento').value;
        const observacao = document.getElementById('despesa_observacao').value;
        const pago = document.getElementById('despesa_pago').checked ? 1 : 0;
        
        if (!descricao || !valor || !data) {
            if (typeof showToast === 'function') {
                showToast('Preencha todos os campos obrigatórios', 'error');
            } else {
                alert('Preencha todos os campos obrigatórios');
            }
            return;
        }
        
        const token = localStorage.getItem('token');
        const editandoId = window.despesaEditandoId;
        const url = editandoId ? `/api/despesas/${editandoId}` : '/api/despesas';
        const method = editandoId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                descricao,
                categoria,
                valor,
                data,
                data_vencimento: vencimento || data,
                forma_pagamento,
                observacao,
                pago
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (typeof showToast === 'function') {
                showToast(editandoId ? 'Despesa atualizada com sucesso!' : 'Despesa salva com sucesso!', 'success');
            } else {
                alert(editandoId ? 'Despesa atualizada com sucesso!' : 'Despesa salva com sucesso!');
            }
            
            // Limpar ID de edição
            window.despesaEditandoId = null;
            
            // Resetar título e botão
            const modalTitle = document.querySelector('#modalDespesa h3');
            if (modalTitle) modalTitle.textContent = 'Nova Despesa';
            
            const btnSubmit = document.querySelector('#formDespesa button[type="submit"]');
            if (btnSubmit) btnSubmit.textContent = 'Salvar Despesa';
            
            fecharModalDespesa();
            
            // Recarregar a aba de despesas
            if (typeof carregarDespesasTab === 'function') {
                carregarDespesasTab();
            } else {
                location.reload();
            }
        } else {
            if (typeof showToast === 'function') {
                showToast(result.message || 'Erro ao salvar despesa', 'error');
            } else {
                alert(result.message || 'Erro ao salvar despesa');
            }
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao salvar despesa', 'error');
        } else {
            alert('Erro ao salvar despesa');
        }
    }
}

function editarDespesa(id) {
    console.log('📝 Editando despesa ID:', id);
    
    if (!id) {
        console.error('❌ ID da despesa não informado');
        if (typeof showToast === 'function') {
            showToast('Erro: ID da despesa não encontrado', 'error');
        }
        return;
    }
    
    // Buscar a despesa pelo ID
    const token = localStorage.getItem('token');
    fetch(`/api/despesas/${id}`, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(result => {
        if (result.success && result.data) {
            const d = result.data;
            // Preencher o modal com os dados da despesa
            document.getElementById('despesa_descricao').value = d.descricao || '';
            document.getElementById('despesa_categoria').value = d.categoria || 'Outros';
            document.getElementById('despesa_valor').value = d.valor || '';
            document.getElementById('despesa_data').value = d.data || '';
            document.getElementById('despesa_vencimento').value = d.data_vencimento || '';
            document.getElementById('despesa_forma_pagamento').value = d.forma_pagamento || 'Dinheiro';
            document.getElementById('despesa_observacao').value = d.observacao || '';
            document.getElementById('despesa_pago').checked = d.pago === 1 || d.pago === true;
            
            // Guardar o ID para salvar depois
            window.despesaEditandoId = id;
            
            // Mudar título do modal
            const modalTitle = document.querySelector('#modalDespesa h3');
            if (modalTitle) modalTitle.textContent = 'Editar Despesa';
            
            // Mudar texto do botão
            const btnSubmit = document.querySelector('#formDespesa button[type="submit"]');
            if (btnSubmit) btnSubmit.textContent = 'Atualizar Despesa';
            
            // Abrir o modal
            const modal = document.getElementById('modalDespesa');
            if (modal) modal.style.display = 'block';
            
            if (typeof showToast === 'function') {
                showToast('Editando despesa...', 'info');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('Erro ao carregar despesa', 'error');
            }
        }
    })
    .catch(error => {
        console.error('❌ Erro:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao carregar despesa', 'error');
        }
    });
}

async function togglePagoDespesa(id, pago) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/despesas/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ pago })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (typeof showToast === 'function') {
                showToast(pago ? 'Despesa marcada como paga!' : 'Despesa desmarcada!', 'success');
            }
            carregarDespesasTab();
        } else {
            if (typeof showToast === 'function') {
                showToast(result.message || 'Erro ao atualizar', 'error');
            }
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao atualizar despesa', 'error');
        }
    }
}

async function excluirDespesa(id) {
    console.log('🗑️ Excluindo despesa ID:', id);
    
    if (!id) {
        console.error('❌ ID da despesa não informado');
        if (typeof showToast === 'function') {
            showToast('Erro: ID da despesa não encontrado', 'error');
        }
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/despesas/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (typeof showToast === 'function') {
                showToast('Despesa excluída com sucesso!', 'success');
            } else {
                alert('Despesa excluída com sucesso!');
            }
            carregarDespesasTab();
        } else {
            if (typeof showToast === 'function') {
                showToast(result.message || 'Erro ao excluir', 'error');
            } else {
                alert(result.message || 'Erro ao excluir');
            }
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        if (typeof showToast === 'function') {
            showToast('Erro ao excluir despesa', 'error');
        } else {
            alert('Erro ao excluir despesa');
        }
    }
}

// Adicionar ao escopo global
window.abrirModalDespesa = abrirModalDespesa;
window.fecharModalDespesa = fecharModalDespesa;
window.salvarDespesa = salvarDespesa;
window.editarDespesa = editarDespesa;
window.togglePagoDespesa = togglePagoDespesa;
window.excluirDespesa = excluirDespesa;