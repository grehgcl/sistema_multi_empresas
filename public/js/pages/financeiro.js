// ============================================
// FINANCEIRO V2 - SEE&AGENDE
// ULTIMA ATUALIZACAO: 19/08/2026
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

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                return partes[2] + '/' + partes[1] + '/' + partes[0];
            }
        }
        if (dataStr.includes('T')) {
            const d = new Date(dataStr);
            return d.toLocaleDateString('pt-BR');
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
// CARREGAR FINANCEIRO - PRINCIPAL
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
// RENDERIZAR FINANCEIRO V2 - CORRIGIDO COM CLASSES CSS
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
                    <button class="btn-action btn-primary" onclick="carregarFinanceiro()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
            </div>

            <!-- TABS -->
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
                <button class="config-tab" onclick="switchFinanceiroTab('fiados')" style="
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
                    <i class="fas fa-hand-holding-usd" style="font-size:${isMobile ? '14px' : '16px'};color:#f59e0b;"></i> ${isMobile ? 'Fiados' : 'Fiados'}
                </button>
            </div>

            <div id="financeiroContent">
                <!-- CARDS PRINCIPAIS -->
                <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(4,1fr)'};gap:${isMobile ? '8px' : '12px'};margin-bottom:${isMobile ? '12px' : '16px'};">
                    <!-- Faturamento -->
                    <div class="card-faturamento">
                        <div>
                            <div class="card-label">💰 Faturamento</div>
                            <div class="card-value">R$ ${faturamentoBruto.toFixed(2)}</div>
                            <div class="card-sub">${totalServicos} serviços • Ticket médio R$ ${ticketMedio.toFixed(2)}</div>
                        </div>
                        <div class="card-footer">
                            ${variacaoFat > 0 ? '📈' : variacaoFat < 0 ? '📉' : '➡️'} 
                            ${variacaoFat > 0 ? '+' : ''}${variacaoFat.toFixed(1)}% vs mês anterior
                        </div>
                    </div>

                    <!-- Despesas -->
                    <div class="card-despesa">
                        <div>
                            <div class="card-label">📉 Despesas</div>
                            <div class="card-value">R$ ${totalDespesas.toFixed(2)}</div>
                            <div class="card-sub">💳 Pagas: R$ ${despesasPagas.toFixed(2)} • ⏳ Pendentes: R$ ${despesasPendentes.toFixed(2)}</div>
                        </div>
                        <div class="card-footer">
                            <span style="color:${variacaoDesp > 0 ? '#ef4444' : '#22c55e'}">
                                ${variacaoDesp > 0 ? '📈' : variacaoDesp < 0 ? '📉' : '➡️'} 
                                ${variacaoDesp > 0 ? '+' : ''}${variacaoDesp.toFixed(1)}% vs mês anterior
                                ${variacaoDesp > 0 ? ' ⚠️' : ' ✅'}
                            </span>
                        </div>
                    </div>

                    <!-- Lucro -->
                    <div class="card-lucro ${lucroLiquido >= 0 ? 'positive' : 'negative'}">
                        <div>
                            <div class="card-label">💎 Lucro Líquido</div>
                            <div class="card-value">R$ ${lucroLiquido.toFixed(2)}</div>
                            <div class="card-sub">${lucroLiquido >= 0 ? '✅ Lucrativo' : '❌ Prejuízo'} • Margem: ${faturamentoBruto > 0 ? ((lucroLiquido / faturamentoBruto) * 100).toFixed(1) : 0}%</div>
                        </div>
                        <div class="card-footer">
                            ${variacaoLucro > 0 ? '📈' : variacaoLucro < 0 ? '📉' : '➡️'} 
                            ${variacaoLucro > 0 ? '+' : ''}${variacaoLucro.toFixed(1)}% vs mês anterior
                        </div>
                    </div>

                    <!-- Comissões -->
                    <div class="card-comissoes">
                        <div>
                            <div class="card-label">👨‍💼 Comissões</div>
                            <div class="card-value">R$ ${totalComissoes.toFixed(2)}</div>
                            <div class="card-sub">Lucro após comissões: R$ ${lucroAposComissoes.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <!-- ANÁLISE RÁPIDA -->
                <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:${isMobile ? '10px' : '16px'};margin-bottom:${isMobile ? '12px' : '16px'};">
                    <div class="analise-card">
                        <h4 style="font-size:${isMobile ? '14px' : '16px'};margin:0 0 ${isMobile ? '8px' : '12px'} 0;display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-lightbulb" style="color:#f59e0b;"></i> Análise de Performance
                        </h4>
                        <div>
                            <div class="analise-item">
                                <span class="analise-label">🎫 Ticket Médio</span>
                                <span class="analise-value positive">R$ ${ticketMedio.toFixed(2)}</span>
                            </div>
                            <div class="analise-item">
                                <span class="analise-label">📅 Média de serviços/dia</span>
                                <span class="analise-value neutral">${(totalServicos / 30).toFixed(1)}</span>
                            </div>
                            <div class="analise-item">
                                <span class="analise-label">📊 Margem de Lucro</span>
                                <span class="analise-value ${faturamentoBruto > 0 && (lucroLiquido / faturamentoBruto) > 0.2 ? 'positive' : 'negative'}">
                                    ${faturamentoBruto > 0 ? ((lucroLiquido / faturamentoBruto) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="analise-card">
                        <h4 style="font-size:${isMobile ? '14px' : '16px'};margin:0 0 ${isMobile ? '8px' : '12px'} 0;display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-bullhorn" style="color:${lucroLiquido >= 0 ? '#22c55e' : '#ef4444'};"></i> 
                            ${lucroLiquido >= 0 ? '📈 Oportunidades de Melhoria' : '⚠️ Alertas e Ações'}
                        </h4>
                        <div>
                            ${totalServicos < 30 ? `
                                <div class="alert-card warning">
                                    <span class="alert-icon">📉</span>
                                    <span class="alert-text">
                                        <strong>Baixo volume:</strong> Apenas ${totalServicos} serviços no mês. <br>
                                        <span class="alert-hint">💡 Invista em marketing para atrair mais clientes.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${ticketMedio < 50 ? `
                                <div class="alert-card warning">
                                    <span class="alert-icon">💰</span>
                                    <span class="alert-text">
                                        <strong>Ticket médio baixo:</strong> R$ ${ticketMedio.toFixed(2)} <br>
                                        <span class="alert-hint">💡 Ofereça combos ou serviços premium.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${despesasPendentes > 0 ? `
                                <div class="alert-card danger">
                                    <span class="alert-icon">⏳</span>
                                    <span class="alert-text">
                                        <strong>Despesas pendentes:</strong> R$ ${despesasPendentes.toFixed(2)} <br>
                                        <span class="alert-hint">⚠️ Regularize para não comprometer o fluxo de caixa.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${faturamentoBruto > 0 && (despesasPendentes === 0 && totalServicos >= 30 && ticketMedio >= 50) ? `
                                <div class="alert-card success">
                                    <span class="alert-icon">🏆</span>
                                    <span class="alert-text">
                                        <strong>Excelente performance!</strong> <br>
                                        <span class="alert-hint">✅ Continue assim! Considere expandir serviços.</span>
                                    </span>
                                </div>
                            ` : ''}
                            ${lucroLiquido < 0 ? `
                                <div class="alert-card danger">
                                    <span class="alert-icon">🚨</span>
                                    <span class="alert-text">
                                        <strong>Prejuízo no mês!</strong> Despesas maiores que faturamento. <br>
                                        <span class="alert-hint">⚠️ Reveja seus custos e aumente o ticket médio.</span>
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
// VISÃO DO PROFISSIONAL - CORRIGIDA COM CLASSES CSS
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
                <!-- Card Total em Comissões -->
                <div class="card-faturamento">
                    <div class="card-label">💰 Total em Comissões</div>
                    <div class="card-value" style="font-size:${isMobile ? '28px' : '36px'};">R$ ${totalComissoes.toFixed(2)}</div>
                    <div class="card-sub">✅ ${totalServicos} serviços concluídos</div>
                </div>

                <!-- Card Ticket Médio -->
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

            <!-- Botão para ver detalhes -->
            <div style="margin-top:${isMobile ? '16px' : '20px'};text-align:center;padding:${isMobile ? '20px' : '30px'};background:var(--bg-hover);border-radius:12px;border:1px dashed var(--border-color);">
                <i class="fas fa-chevron-right" style="font-size:${isMobile ? '24px' : '32px'};color:var(--primary);display:block;margin-bottom:8px;"></i>
                <p style="font-size:${isMobile ? '14px' : '16px'};color:var(--text-secondary);">
                    Veja todos os seus serviços na aba <strong>Comissões</strong>
                </p>
                <button class="btn-action btn-primary" onclick="switchFinanceiroTab('profissionais')" style="margin-top:10px;">
                    <i class="fas fa-arrow-right"></i> Ver Detalhes
                </button>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
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
    const index = ['resumo', 'receitas', 'despesas', 'profissionais', 'analise', 'fiados'].indexOf(tab);
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
        case 'fiados':
            document.getElementById('financeiroContent').innerHTML = renderTabFiados(isMobile);
            carregarFiados();
            break;
        default:
            break;
    }
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
                    <input type="month" id="filtroMesReceitas" value="${filtroAnoReceitas || new Date().getFullYear()}-${filtroMesReceitas || String(new Date().getMonth() + 1).padStart(2, '0')}" 
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
                    <button class="btn btn-success btn-sm" onclick="abrirModalReceitaManual()" style="
                        padding: ${isMobile ? '8px 16px' : '6px 14px'};
                        border-radius: 8px;
                        border: none;
                        background: linear-gradient(135deg, #22c55e, #16a34a);
                        color: white;
                        font-weight: 600;
                        font-size: ${isMobile ? '13px' : '12px'};
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        ${isMobile ? 'flex: 1; justify-content: center;' : ''}
                    ">
                        <i class="fas fa-plus"></i> ${isMobile ? 'Adicionar' : 'Adicionar Receita'}
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
                    <i class="fas fa-plus"></i> ${isMobile ? 'Nova' : 'Nova Despesa'}
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
                <select id="filtroCategoriaDespesa" onchange="carregarDespesasTab()" style="
                    padding: ${isMobile ? '8px 12px' : '6px 12px'};
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-input);
                    color: var(--text-primary);
                    font-size: ${isMobile ? '13px' : '12px'};
                    ${isMobile ? 'flex: 1; min-width: 100px;' : ''}
                ">
                    <option value="">Todas Categorias</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Salários">Salários</option>
                    <option value="Fornecedores">Fornecedores</option>
                    <option value="Contas">Contas</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Outros">Outros</option>
                </select>
                
                <select id="filtroPagoDespesa" onchange="carregarDespesasTab()" style="
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
                
                <input type="month" id="filtroMesDespesaTab" value="${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}" 
                       onchange="carregarDespesasTab()" 
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
                    <input type="month" id="filtroMesAnalise" value="${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}" 
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
// RENDER TAB FIADOS
// ============================================

function renderTabFiados(isMobile) {
    return `
        <div class="card" style="padding: ${isMobile ? '12px' : '20px'};">
            <div class="card-header" style="flex-direction: ${isMobile ? 'column' : 'row'}; align-items: ${isMobile ? 'stretch' : 'center'}; gap: ${isMobile ? '10px' : '0'};">
                <h3 style="font-size: ${isMobile ? '16px' : '18px'}; margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-hand-holding-usd" style="color: #f59e0b;"></i> Fiados Pendentes
                </h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; ${isMobile ? 'width: 100%;' : ''}">
                    <input type="month" id="filtroMesFiados" value="${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}" 
                           onchange="carregarFiados()" 
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
            <div id="fiadosList" style="margin-top: ${isMobile ? '12px' : '0'};">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p style="margin-top:8px;">Carregando fiados...</p>
                </div>
            </div>
        </div>
    `;
}

function criarModalDespesa() {
    if (document.getElementById('modalDespesa')) {
        return;
    }

    const modalHTML = `
        <div id="modalDespesa" class="modal-overlay" style="
            display:none;
            position:fixed;
            top:0;
            left:0;
            width:100%;
            height:100%;
            background:rgba(0,0,0,0.7);
            z-index:9999;
            justify-content:center;
            align-items:center;
            backdrop-filter:blur(4px);
            padding: 16px;
            box-sizing: border-box;
        ">
            <div class="modal-content" style="
                background:var(--bg-card);
                border-radius:16px;
                padding:24px;
                max-width:500px;
                width:100%;
                max-height:90vh;
                overflow-y:auto;
                border:1px solid var(--border-color);
                position:relative;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <button class="modal-close" onclick="fecharModalDespesa()" style="
                    position: absolute;
                    top: 12px;
                    right: 16px;
                    background:transparent;
                    border:none;
                    color:var(--text-muted);
                    font-size:28px;
                    cursor:pointer;
                    padding: 4px 8px;
                    line-height: 1;
                ">&times;</button>
                
                <h3 id="modalDespesaTitulo" style="
                    color:var(--text-primary);
                    margin:0 0 20px 0;
                    font-size:20px;
                    padding-right: 32px;
                ">➕ Nova Despesa</h3>
                
                <form id="formDespesa" onsubmit="event.preventDefault(); salvarDespesa();">
                    <input type="hidden" id="despesaId">
                    
                    <div class="form-group" style="margin-bottom:16px;">
                        <label for="despesaDescricao" style="
                            display:block;
                            color:var(--text-primary);
                            font-size:14px;
                            font-weight:500;
                            margin-bottom:6px;
                        ">Descrição *</label>
                        <input type="text" id="despesaDescricao" placeholder="Ex: Aluguel" required style="
                            width:100%;
                            padding:12px 14px;
                            background:var(--bg-input);
                            color:var(--text-primary);
                            border:1px solid var(--border-color);
                            border-radius:8px;
                            font-size:16px;
                            box-sizing:border-box;
                        ">
                    </div>
                    
                    <div class="form-group" style="margin-bottom:16px;">
                        <label for="despesaCategoria" style="
                            display:block;
                            color:var(--text-primary);
                            font-size:14px;
                            font-weight:500;
                            margin-bottom:6px;
                        ">Categoria *</label>
                        <select id="despesaCategoria" required style="
                            width:100%;
                            padding:12px 14px;
                            background:var(--bg-input);
                            color:var(--text-primary);
                            border:1px solid var(--border-color);
                            border-radius:8px;
                            font-size:16px;
                            box-sizing:border-box;
                            -webkit-appearance: none;
                            appearance: none;
                        ">
                            <option value="">Selecione...</option>
                            <option value="Aluguel">Aluguel</option>
                            <option value="Salários">Salários</option>
                            <option value="Fornecedores">Fornecedores</option>
                            <option value="Contas">Contas (Água, Luz, Internet)</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Manutenção">Manutenção</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div class="form-group">
                            <label for="despesaValor" style="
                                display:block;
                                color:var(--text-primary);
                                font-size:14px;
                                font-weight:500;
                                margin-bottom:6px;
                            ">Valor *</label>
                            <input type="number" id="despesaValor" step="0.01" placeholder="0,00" required style="
                                width:100%;
                                padding:12px 14px;
                                background:var(--bg-input);
                                color:var(--text-primary);
                                border:1px solid var(--border-color);
                                border-radius:8px;
                                font-size:16px;
                                box-sizing:border-box;
                            ">
                        </div>
                        <div class="form-group">
                            <label for="despesaData" style="
                                display:block;
                                color:var(--text-primary);
                                font-size:14px;
                                font-weight:500;
                                margin-bottom:6px;
                            ">Data *</label>
                            <input type="date" id="despesaData" required style="
                                width:100%;
                                padding:12px 14px;
                                background:var(--bg-input);
                                color:var(--text-primary);
                                border:1px solid var(--border-color);
                                border-radius:8px;
                                font-size:16px;
                                box-sizing:border-box;
                            ">
                        </div>
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div class="form-group">
                            <label for="despesaDataVencimento" style="
                                display:block;
                                color:var(--text-primary);
                                font-size:14px;
                                font-weight:500;
                                margin-bottom:6px;
                            ">Data Vencimento</label>
                            <input type="date" id="despesaDataVencimento" style="
                                width:100%;
                                padding:12px 14px;
                                background:var(--bg-input);
                                color:var(--text-primary);
                                border:1px solid var(--border-color);
                                border-radius:8px;
                                font-size:16px;
                                box-sizing:border-box;
                            ">
                        </div>
                        <div class="form-group">
                            <label for="despesaFormaPagamento" style="
                                display:block;
                                color:var(--text-primary);
                                font-size:14px;
                                font-weight:500;
                                margin-bottom:6px;
                            ">Forma Pagamento</label>
                            <select id="despesaFormaPagamento" style="
                                width:100%;
                                padding:12px 14px;
                                background:var(--bg-input);
                                color:var(--text-primary);
                                border:1px solid var(--border-color);
                                border-radius:8px;
                                font-size:16px;
                                box-sizing:border-box;
                            ">
                                <option value="">Selecione...</option>
                                <option value="Dinheiro">💰 Dinheiro</option>
                                <option value="PIX">📱 PIX</option>
                                <option value="Débito">💳 Débito</option>
                                <option value="Crédito">💳 Crédito</option>
                                <option value="Transferência">🏦 Transferência</option>
                                <option value="Boleto">📄 Boleto</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:16px;">
                        <label for="despesaPago" style="
                            display:block;
                            color:var(--text-primary);
                            font-size:14px;
                            font-weight:500;
                            margin-bottom:6px;
                        ">Status</label>
                        <select id="despesaPago" style="
                            width:100%;
                            padding:12px 14px;
                            background:var(--bg-input);
                            color:var(--text-primary);
                            border:1px solid var(--border-color);
                            border-radius:8px;
                            font-size:16px;
                            box-sizing:border-box;
                        ">
                            <option value="0">⏳ Pendente</option>
                            <option value="1">✅ Pago</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:16px;">
                        <label for="despesaObservacao" style="
                            display:block;
                            color:var(--text-primary);
                            font-size:14px;
                            font-weight:500;
                            margin-bottom:6px;
                        ">Observação</label>
                        <textarea id="despesaObservacao" placeholder="Observações adicionais..." style="
                            width:100%;
                            padding:12px 14px;
                            background:var(--bg-input);
                            color:var(--text-primary);
                            border:1px solid var(--border-color);
                            border-radius:8px;
                            font-size:16px;
                            resize:vertical;
                            min-height:60px;
                            box-sizing:border-box;
                            font-family: inherit;
                        "></textarea>
                    </div>
                    
                    <button type="submit" id="btnSalvarDespesa" style="
                        width:100%;
                        padding:14px 24px;
                        background:linear-gradient(135deg,#6366f1,#8b5cf6);
                        color:#fff;
                        border:none;
                        border-radius:10px;
                        cursor:pointer;
                        font-weight:600;
                        font-size:16px;
                        transition:all 0.3s;
                        box-shadow: 0 4px 15px rgba(99,102,241,0.3);
                    ">
                        Salvar Despesa
                    </button>
                </form>
            </div>
        </div>
        
        <style>
            @keyframes modalSlideIn {
                from { opacity:0; transform:scale(0.95) translateY(-20px); }
                to { opacity:1; transform:scale(1) translateY(0); }
            }
            #modalDespesa .modal-content {
                animation: modalSlideIn 0.3s ease;
            }
            #modalDespesa.active { display:flex !important; }

            /* 🔥 RESPONSIVO - MOBILE */
            @media (max-width: 480px) {
                #modalDespesa {
                    padding: 8px;
                    align-items: flex-end;
                }
                #modalDespesa .modal-content {
                    padding: 20px 16px;
                    border-radius: 16px 16px 0 0;
                    max-height: 85vh;
                    margin-bottom: 0;
                }
                #modalDespesa h3 {
                    font-size: 17px;
                }
                #modalDespesa .form-group label {
                    font-size: 13px;
                }
                #modalDespesa input, 
                #modalDespesa select, 
                #modalDespesa textarea {
                    font-size: 15px !important;
                    padding: 14px 12px !important;
                }
                #modalDespesa #btnSalvarDespesa {
                    padding: 16px;
                    font-size: 15px;
                }
                #modalDespesa .grid-2 {
                    grid-template-columns: 1fr !important;
                }
            }
        </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Modal de despesa criado com responsividade');
}

// ============================================
// ABRIR MODAL DESPESA
// ============================================

function abrirModalDespesa(id = null) {
    console.log('🔧 abrirModalDespesa chamado com id:', id);
    
    criarModalDespesa();
    
    const modal = document.getElementById('modalDespesa');
    if (!modal) {
        console.error('❌ Modal de despesa não encontrado');
        criarModalDespesa();
        setTimeout(() => {
            const modalRetry = document.getElementById('modalDespesa');
            if (modalRetry) {
                modalRetry.style.display = 'flex';
                modalRetry.classList.add('active');
            }
        }, 100);
        return;
    }
    
    const titulo = document.getElementById('modalDespesaTitulo');
    const form = document.getElementById('formDespesa');
    const btnSubmit = document.getElementById('btnSalvarDespesa');
    
    if (!form) {
        console.error('❌ Formulário não encontrado');
        return;
    }
    
    form.reset();
    document.getElementById('despesaId').value = '';
    document.getElementById('despesaData').value = new Date().toISOString().split('T')[0];
    document.getElementById('despesaDataVencimento').value = '';
    document.getElementById('despesaPago').value = '0';
    
    if (id) {
        titulo.textContent = '✏️ Editar Despesa';
        btnSubmit.textContent = 'Atualizar Despesa';
        carregarDespesaParaEdicao(id);
    } else {
        titulo.textContent = '➕ Nova Despesa';
        btnSubmit.textContent = 'Salvar Despesa';
    }
    
    modal.style.display = 'flex';
    modal.classList.add('active');
}

window.fecharModalDespesa = function() {
    const modal = document.getElementById('modalDespesa');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
};

// ============================================
// SALVAR DESPESA
// ============================================

async function salvarDespesa() {
    try {
        const id = document.getElementById('despesaId').value;
        
        const dados = {
            descricao: document.getElementById('despesaDescricao').value.trim(),
            categoria: document.getElementById('despesaCategoria').value,
            valor: parseFloat(document.getElementById('despesaValor').value),
            data: document.getElementById('despesaData').value,
            data_vencimento: document.getElementById('despesaDataVencimento').value || null,
            forma_pagamento: document.getElementById('despesaFormaPagamento').value || null,
            pago: document.getElementById('despesaPago').value === '1',
            observacao: document.getElementById('despesaObservacao').value.trim() || null
        };

        console.log('📊 Dados da despesa:', dados);

        if (!dados.descricao) {
            showToast('⚠️ Preencha a descrição da despesa', 'warning');
            document.getElementById('despesaDescricao').focus();
            return;
        }
        
        if (!dados.valor || dados.valor <= 0) {
            showToast('⚠️ Informe um valor válido', 'warning');
            document.getElementById('despesaValor').focus();
            return;
        }
        
        if (!dados.data) {
            showToast('⚠️ Selecione a data da despesa', 'warning');
            document.getElementById('despesaData').focus();
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Faça login novamente', 'error');
            return;
        }

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/despesas/${id}` : '/api/despesas';

        console.log(`📊 ${method} ${url}`);

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dados)
        });

        const result = await response.json();
        console.log('📊 Resultado:', result);

        if (!result.success) {
            showToast(result.message || 'Erro ao salvar despesa', 'error');
            return;
        }

        showToast(id ? '✅ Despesa atualizada com sucesso!' : '✅ Despesa criada com sucesso!', 'success');
        
        fecharModalDespesa();
        await carregarDespesasTab();
        await carregarFinanceiro();

    } catch (error) {
        console.error('❌ Erro ao salvar despesa:', error);
        showToast('Erro ao salvar despesa: ' + error.message, 'error');
    }
}

async function carregarDespesaParaEdicao(id) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/despesas/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (!result.success) {
            showToast('Erro ao carregar despesa', 'error');
            return;
        }
        
        const despesa = result.data;
        document.getElementById('despesaId').value = despesa.id;
        document.getElementById('despesaDescricao').value = despesa.descricao;
        document.getElementById('despesaCategoria').value = despesa.categoria || '';
        document.getElementById('despesaValor').value = despesa.valor;
        document.getElementById('despesaData').value = despesa.data;
        document.getElementById('despesaDataVencimento').value = despesa.data_vencimento || '';
        document.getElementById('despesaFormaPagamento').value = despesa.forma_pagamento || '';
        document.getElementById('despesaPago').value = despesa.pago ? '1' : '0';
        document.getElementById('despesaObservacao').value = despesa.observacao || '';
        
    } catch (error) {
        console.error('Erro ao carregar despesa:', error);
        showToast('Erro ao carregar dados da despesa', 'error');
    }
}

// ============================================
// CARREGAR DESPESAS TAB
// ============================================

async function carregarDespesasTab() {
    console.log('📊 [carregarDespesasTab] Iniciando...');
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ Token não encontrado');
            return;
        }

        const mesSelect = document.getElementById('filtroMesDespesaTab');
        const categoriaSelect = document.getElementById('filtroCategoriaDespesa');
        const pagoSelect = document.getElementById('filtroPagoDespesa');

        let mes = mesSelect?.value || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        let [ano, mesNum] = mes.split('-');
        
        if (!ano || !mesNum) {
            ano = String(new Date().getFullYear());
            mesNum = String(new Date().getMonth() + 1).padStart(2, '0');
        }

        const categoria = categoriaSelect?.value || '';
        const pago = pagoSelect?.value || '';

        let url = `/api/despesas?mes=${mesNum}&ano=${ano}`;
        if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
        if (pago) url += `&pago=${pago}`;

        console.log(`📊 [carregarDespesasTab] URL: ${url}`);

        const container = document.getElementById('despesasList');
        if (!container) {
            console.error('❌ Container #despesasList não encontrado');
            return;
        }

        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-muted);">
                <i class="fas fa-spinner fa-spin" style="font-size:28px;"></i>
                <p style="margin-top:12px;">Carregando despesas...</p>
            </div>
        `;

        const response = await fetch(url, {
            headers: { 
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 [carregarDespesasTab] Status: ${response.status}`);

        const result = await response.json();
        console.log('📊 [carregarDespesasTab] Resultado:', result);

        if (!result.success) {
            console.error('❌ Erro na resposta:', result.message);
            container.innerHTML = `
                <div class="empty-state" style="padding:30px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#ef4444;"></i>
                    <h4 style="margin:10px 0;font-size:16px;">Erro ao carregar despesas</h4>
                    <p style="font-size:13px;color:var(--text-muted);">${result.message || 'Erro desconhecido'}</p>
                    <button onclick="carregarDespesasTab()" style="margin-top:10px;padding:8px 20px;background:var(--gradient);color:#fff;border:none;border-radius:8px;cursor:pointer;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
            return;
        }

        const lista = Array.isArray(result.data) ? result.data : [];
        const totais = result.totais || { total: 0, pago: 0, pendente: 0 };

        console.log(`📊 [carregarDespesasTab] ${lista.length} despesas carregadas`);
        console.log(`📊 [carregarDespesasTab] Totais:`, totais);

        if (lista.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:30px;text-align:center;">
                    <i class="fas fa-receipt" style="font-size:32px;color:var(--text-muted);"></i>
                    <h4 style="margin:10px 0;font-size:16px;">Nenhuma despesa</h4>
                    <p style="font-size:13px;color:var(--text-muted);">Clique em "Nova Despesa" para começar</p>
                </div>
            `;
            return;
        }

        const isMobile = window.innerWidth < 768;
        let html = '';

        html += `
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
                    Total: <span style="color: #ef4444;">R$ ${totais.total.toFixed(2)}</span>
                </span>
                <div style="display: flex; gap: 12px; font-size: ${isMobile ? '11px' : '13px'};">
                    <span style="color: #22c55e;">✅ ${totais.pago.toFixed(2)} pagas</span>
                    <span style="color: #f59e0b;">⏳ ${totais.pendente.toFixed(2)} pendentes</span>
                </div>
            </div>
        `;

if (isMobile) {
    html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
    for (let d of lista) {
        const valor = parseFloat(d.valor) || 0;
        
        // 🔥 CORREÇÃO: Garantir que o ID existe
        // Tenta pegar o id de várias formas
        let id = d.id || d.ID || d.rowid || d._id || 0;
        
        // 🔥 Se ainda for 0, tentar pegar do índice
        if (id === 0 || id === 'undefined' || id === 'null') {
            console.warn('⚠️ Despesa sem ID:', d);
            // Pular esta despesa se não tiver ID
            continue;
        }
        
        // Converter para número
        const idNumber = Number(id);
        if (isNaN(idNumber) || idNumber <= 0) {
            console.warn('⚠️ ID inválido:', id, d);
            continue;
        }
        
        html += `
            <div style="
                background: var(--bg-card);
                border-radius: 12px;
                padding: 14px 16px;
                border: 1px solid ${d.pago ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'};
            ">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;color:var(--text-primary);">
                            ${escapeHtml(d.descricao)}
                        </div>
                        <div style="font-size:12px;color:var(--text-muted);">
                            📂 ${escapeHtml(d.categoria || 'Sem categoria')}
                        </div>
                    </div>
                    <span style="font-size:16px;font-weight:700;color:#ef4444;white-space:nowrap;margin-left:8px;">
                        R$ ${valor.toFixed(2)}
                    </span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:8px;">
                    <span>📅 ${formatarDataBr(d.data)}</span>
                    <span>${d.pago ? '✅ Paga' : '⏳ Pendente'}</span>
                </div>
                <div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color);">
                    <button onclick="abrirModalDespesa(${idNumber})" style="
                        flex:1;
                        padding:10px 12px;
                        border-radius:8px;
                        border:1px solid var(--border-color);
                        background:transparent;
                        color:var(--text-primary);
                        font-size:13px;
                        cursor:pointer;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        gap:4px;
                        touch-action:manipulation;
                    ">
                        ✏️ Editar
                    </button>
                    <button onclick="excluirDespesa(${idNumber})" style="
                        flex:1;
                        padding:10px 12px;
                        border-radius:8px;
                        border:1px solid #ef4444;
                        background:transparent;
                        color:#ef4444;
                        font-size:13px;
                        cursor:pointer;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        gap:4px;
                        touch-action:manipulation;
                    ">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    }
    html += `</div>`;
}else {
            html += `
                <div class="table-responsive">
                    <table class="data-table" style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--bg-hover);">
                                <th style="padding:10px 12px;text-align:left;">📅 Data</th>
                                <th style="padding:10px 12px;text-align:left;">📝 Descrição</th>
                                <th style="padding:10px 12px;text-align:left;">📂 Categoria</th>
                                <th style="padding:10px 12px;text-align:right;">💰 Valor</th>
                                <th style="padding:10px 12px;text-align:center;">📊 Status</th>
                                <th style="padding:10px 12px;text-align:center;">⚡ Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lista.map(d => {
                                const valor = parseFloat(d.valor) || 0;
                                return `
                                    <tr style="border-bottom:1px solid var(--border-color);">
                                        <td style="padding:10px 12px;">${formatarDataBr(d.data)}</td>
                                        <td style="padding:10px 12px;font-weight:500;">${escapeHtml(d.descricao)}</td>
                                        <td style="padding:10px 12px;">
                                            <span style="padding:2px 10px;border-radius:12px;background:rgba(102,126,234,0.1);color:var(--primary);font-size:12px;">
                                                ${escapeHtml(d.categoria || 'Sem categoria')}
                                            </span>
                                        </td>
                                        <td style="padding:10px 12px;text-align:right;font-weight:700;color:#ef4444;">
                                            R$ ${valor.toFixed(2)}
                                        </td>
                                        <td style="padding:10px 12px;text-align:center;">
                                            ${d.pago 
                                                ? '<span style="color:#22c55e;font-weight:600;">✅ Paga</span>' 
                                                : '<span style="color:#f59e0b;font-weight:600;">⏳ Pendente</span>'
                                            }
                                        </td>
                                        <td style="padding:10px 12px;text-align:center;">
                                            <button onclick="abrirModalDespesa(${d.id})" style="padding:4px 10px;border-radius:4px;border:1px solid var(--border-color);background:transparent;color:var(--text-primary);cursor:pointer;font-size:12px;margin-right:4px;">
                                                ✏️
                                            </button>
                                            <button onclick="excluirDespesa(${d.id})" style="padding:4px 10px;border-radius:4px;border:1px solid #ef4444;background:transparent;color:#ef4444;cursor:pointer;font-size:12px;">
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        container.innerHTML = html;
        console.log('✅ [carregarDespesasTab] Concluído com sucesso!');

    } catch (error) {
        console.error('❌ [carregarDespesasTab] Erro:', error);
        const container = document.getElementById('despesasList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding:30px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#ef4444;"></i>
                    <h4 style="margin:10px 0;font-size:16px;">Erro ao carregar despesas</h4>
                    <p style="font-size:13px;color:var(--text-muted);">${error.message}</p>
                    <button onclick="carregarDespesasTab()" style="margin-top:10px;padding:8px 20px;background:var(--gradient);color:#fff;border:none;border-radius:8px;cursor:pointer;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// EXCLUIR DESPESA - CORRIGIDO COMPLETO
// ============================================

async function excluirDespesa(id) {
    console.log('🗑️ excluirDespesa chamado com ID:', id, 'Tipo:', typeof id);
    
    // 🔥 CONVERTER PARA NÚMERO
    let idNumber = Number(id);
    
    // 🔥 SE ID FOR 0, undefined, null, NaN, tentar buscar do evento
    if (!idNumber || idNumber <= 0 || isNaN(idNumber)) {
        console.error('❌ ID inválido recebido:', id);
        showToast('ID da despesa inválido. Recarregue a página.', 'error');
        return;
    }

    console.log(`🗑️ Excluindo despesa ID: ${idNumber}`);

    // 🔥 CONFIRMAR EXCLUSÃO
    const confirmado = await showConfirm(
        'Deseja realmente excluir esta despesa?\n\nEsta ação não poderá ser desfeita!',
        '💰 Excluir Despesa',
        {
            confirmText: '✅ Sim, Excluir',
            cancelText: '❌ Cancelar',
            icon: '💰',
            confirmClass: 'btn-danger'
        }
    );

    if (!confirmado) return;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Faça login novamente', 'error');
            return;
        }

        const response = await fetch(`/api/despesas/${idNumber}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        console.log('📊 Resultado da exclusão:', result);

        if (!result.success) {
            showToast(result.message || '❌ Erro ao excluir despesa', 'error');
            return;
        }

        showToast('🗑️ Despesa excluída com sucesso!', 'success');
        
        // Recarregar listas
        await carregarDespesasTab();
        await carregarFinanceiro();

    } catch (error) {
        console.error('❌ Erro ao excluir despesa:', error);
        showToast('Erro ao excluir despesa: ' + error.message, 'error');
    }
}

// ============================================
// CARREGAR RECEITAS
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
            const porPagamento = result.data?.por_pagamento || {};

            console.log('📊 Receitas por pagamento:', porPagamento);

            if (lista.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding:30px;text-align:center;">
                        <i class="fas fa-coins" style="font-size:32px;color:var(--text-muted);"></i>
                        <h4 style="margin:10px 0;font-size:16px;">Nenhuma receita</h4>
                        <p style="font-size:13px;color:var(--text-muted);">Conclua serviços para gerar receitas</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div style="display: grid; grid-template-columns: ${isMobile ? '1fr 1fr' : 'repeat(5, 1fr)'}; gap: ${isMobile ? '6px' : '8px'}; margin-bottom: ${isMobile ? '12px' : '16px'};">
                    ${[
                        { id: 'dinheiro', label: '💰 Dinheiro', total: porPagamento.dinheiro || 0, color: '#22c55e' },
                        { id: 'pix', label: '📱 Pix', total: porPagamento.pix || 0, color: '#3b82f6' },
                        { id: 'debito', label: '💳 Débito', total: porPagamento.debito || 0, color: '#8b5cf6' },
                        { id: 'credito', label: '💳 Crédito', total: porPagamento.credito || 0, color: '#f59e0b' },
                        { id: 'fiado', label: '📝 Fiado', total: porPagamento.fiado || 0, color: '#ef4444' }
                    ].map(p => `
                        <div style="background: var(--bg-hover); border-radius: ${isMobile ? '8px' : '10px'}; padding: ${isMobile ? '8px' : '12px'}; text-align: center; border: 1px solid ${p.total > 0 ? p.color : 'var(--border-color)'}33;">
                            <div style="font-size: ${isMobile ? '10px' : '11px'}; color: var(--text-muted);">${p.label}</div>
                            <div style="font-size: ${isMobile ? '16px' : '18px'}; font-weight: 700; color: ${p.total > 0 ? p.color : 'var(--text-muted)'};">R$ ${p.total.toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                <div style="padding: ${isMobile ? '10px' : '12px'}; background: var(--bg-hover); border-radius: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <span style="font-weight: 600; font-size: ${isMobile ? '14px' : '16px'};">Total Geral: <span style="color: #22c55e;">R$ ${total.toFixed(2)}</span></span>
                    <span style="font-size: ${isMobile ? '12px' : '14px'}; color: var(--text-muted);">${lista.length} ${lista.length === 1 ? 'serviço' : 'serviços'}</span>
                </div>
            `;

            if (isMobile) {
                html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
                for (let item of lista) {
                    const forma = item.forma_pagamento || '';
                    const label = pagamentoLabels[forma] || '❓ Não informado';
                    const cor = pagamentoCores[forma] || 'var(--text-muted)';
                    html += `
                        <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 16px; border: 1px solid ${cor}33;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(item.cliente_nome || 'Cliente')}</div>
                                    <div style="font-size:12px;color:var(--text-muted);">✂️ ${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</div>
                                </div>
                                <span style="font-size:16px;font-weight:700;color:#22c55e;white-space:nowrap;margin-left:8px;">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:8px;">
                                <span>📅 ${formatarDataBr(item.data)}</span>
                                <span style="color:${cor};font-weight:600;">${label}</span>
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="data-table" style="width:100%;border-collapse:collapse;">
                            <thead>
                                <tr style="background:var(--bg-hover);">
                                    <th style="padding:10px 12px;text-align:left;">📅 Data</th>
                                    <th style="padding:10px 12px;text-align:left;">👤 Cliente</th>
                                    <th style="padding:10px 12px;text-align:left;">✂️ Serviço</th>
                                    <th style="padding:10px 12px;text-align:right;">💰 Valor</th>
                                    <th style="padding:10px 12px;text-align:center;">💳 Pagamento</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lista.map(item => {
                                    const forma = item.forma_pagamento || '';
                                    const label = pagamentoLabels[forma] || '❓ Não informado';
                                    const cor = pagamentoCores[forma] || 'var(--text-muted)';
                                    return `
                                        <tr style="border-bottom:1px solid var(--border-color);">
                                            <td style="padding:10px 12px;">${formatarDataBr(item.data)}</td>
                                            <td style="padding:10px 12px;font-weight:500;">${escapeHtml(item.cliente_nome || 'Cliente')}</td>
                                            <td style="padding:10px 12px;">${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</td>
                                            <td style="padding:10px 12px;text-align:right;font-weight:700;color:#22c55e;">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</td>
                                            <td style="padding:10px 12px;text-align:center;"><span style="color:${cor};font-weight:600;">${label}</span></td>
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
                <div class="empty-state" style="padding:30px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#ef4444;"></i>
                    <h4 style="margin:10px 0;font-size:16px;">Erro ao carregar receitas</h4>
                    <p style="font-size:13px;color:var(--text-muted);">${error.message}</p>
                    <button onclick="carregarReceitas()" style="margin-top:10px;padding:8px 20px;background:var(--gradient);color:#fff;border:none;border-radius:8px;cursor:pointer;">
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
                    <div class="empty-state" style="padding:30px;text-align:center;">
                        <i class="fas fa-check-circle" style="font-size:32px;color:var(--text-muted);"></i>
                        <h4 style="margin:10px 0;font-size:16px;">Nenhum serviço concluído</h4>
                        <p style="font-size:13px;color:var(--text-muted);">Os serviços aparecerão aqui quando forem concluídos</p>
                    </div>
                `;
                return;
            }

            let html = '';

            if (comissoesPorProf.length > 0) {
                if (isMobile) {
                    html += `<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">`;
                    for (let prof of comissoesPorProf) {
                        html += `
                            <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 16px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
                                <div>
                                    <div style="font-weight:600;font-size:14px;color:var(--text-primary);">${escapeHtml(prof.nome)}</div>
                                    <div style="font-size:12px;color:var(--text-muted);">${prof.total_servicos} serviços</div>
                                </div>
                                <div style="font-size:18px;font-weight:700;color:var(--primary);">R$ ${toNumber(prof.total_comissao).toFixed(2)}</div>
                            </div>
                        `;
                    }
                    html += `</div>`;
                } else {
                    html += `
                        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
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
                html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
                for (let item of comissoes) {
                    html += `
                        <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 16px; border: 1px solid var(--border-color);">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                                <div style="flex:1;min-width:0;">
                                    <div style="font-weight:600;color:var(--text-primary);">${escapeHtml(item.cliente_nome || 'Cliente')}</div>
                                    <div style="font-size:12px;color:var(--text-muted);">✂️ ${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</div>
                                </div>
                                <span style="font-size:16px;font-weight:700;color:var(--primary);white-space:nowrap;margin-left:8px;">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:8px;">
                                <span>📅 ${formatarDataBr(item.data)}</span>
                                ${item.profissional_id ? `<span style="color:var(--primary);font-weight:600;">💰 R$ ${toNumber(item.comissao).toFixed(2)}</span>` : ''}
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            } else {
                html += `
                    <div class="table-responsive">
                        <table class="data-table" style="width:100%;border-collapse:collapse;">
                            <thead>
                                <tr style="background:var(--bg-hover);">
                                    <th style="padding:10px 12px;text-align:left;">📅 Data</th>
                                    <th style="padding:10px 12px;text-align:left;">👤 Cliente</th>
                                    <th style="padding:10px 12px;text-align:left;">✂️ Serviço</th>
                                    <th style="padding:10px 12px;text-align:right;">💰 Valor</th>
                                    <th style="padding:10px 12px;text-align:center;">💰 Comissão</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${comissoes.map(item => `
                                    <tr style="border-bottom:1px solid var(--border-color);">
                                        <td style="padding:10px 12px;">${formatarDataBr(item.data)}</td>
                                        <td style="padding:10px 12px;font-weight:500;">${escapeHtml(item.cliente_nome || 'Cliente')}</td>
                                        <td style="padding:10px 12px;">${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</td>
                                        <td style="padding:10px 12px;text-align:right;font-weight:700;">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</td>
                                        <td style="padding:10px 12px;text-align:center;color:var(--primary);font-weight:700;">R$ ${toNumber(item.comissao).toFixed(2)}</td>
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
                <div class="empty-state" style="padding:30px;text-align:center;">
                    <i class="fas fa-exclamation-triangle" style="font-size:32px;color:#ef4444;"></i>
                    <h4 style="margin:10px 0;font-size:16px;">Erro ao carregar comissões</h4>
                    <p style="font-size:13px;color:var(--text-muted);">${error.message}</p>
                    <button onclick="carregarComissoesTab()" style="margin-top:10px;padding:8px 20px;background:var(--gradient);color:#fff;border:none;border-radius:8px;cursor:pointer;">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

// ============================================
// CARREGAR ANÁLISE DIÁRIA - VERSÃO MELHORADA
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

            // Nome do mês em português
            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            const nomeMes = meses[parseInt(mes) - 1] || mes;

            const isMobile = window.innerWidth < 768;

            // Criar mapa de dados por dia
            const mapaDados = {};
            dias.forEach(d => {
                mapaDados[d.dia] = {
                    qtd: parseInt(d.qtd_servicos) || 0,
                    fat: parseFloat(d.faturamento) || 0
                };
            });

            // Calcular dias no mês
            const diasNoMes = new Date(ano, parseInt(mes), 0).getDate();
            const hoje = new Date();
            const diaAtual = hoje.getDate();
            const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
            const anoAtual = String(hoje.getFullYear());
            const isMesAtual = (mes === mesAtual && ano === anoAtual);

            // Gerar dias da semana
            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const primeiroDia = new Date(ano, parseInt(mes) - 1, 1).getDay();

            // 🔥 CONSTRUIR HTML MELHORADO
            let html = `
                <div style="
                    background: var(--bg-card);
                    border-radius: ${isMobile ? '12px' : '16px'};
                    padding: ${isMobile ? '12px' : '16px'};
                    border: 1px solid var(--border-color);
                ">
                    <!-- CABEÇALHO DO MÊS -->
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 16px;
                        padding-bottom: 12px;
                        border-bottom: 2px solid var(--border-color);
                    ">
                        <div>
                            <h4 style="
                                margin: 0;
                                font-size: ${isMobile ? '16px' : '20px'};
                                font-weight: 700;
                                color: var(--text-primary);
                            ">
                                📅 ${nomeMes} ${ano}
                            </h4>
                            <div style="
                                font-size: ${isMobile ? '11px' : '13px'};
                                color: var(--text-muted);
                                margin-top: 2px;
                            ">
                                ${isMesAtual ? '📌 Mês atual' : ''}
                            </div>
                        </div>
                        <div style="
                            text-align: right;
                            font-size: ${isMobile ? '12px' : '14px'};
                            color: var(--text-secondary);
                        ">
                            <div>${totalServicos} serviços</div>
                            <div style="font-weight: 700; color: #22c55e;">R$ ${totalFaturamento.toFixed(2)}</div>
                        </div>
                    </div>

                    <!-- ESTATÍSTICAS RÁPIDAS -->
                    <div style="
                        display: grid;
                        grid-template-columns: ${isMobile ? '1fr 1fr' : 'repeat(4, 1fr)'};
                        gap: ${isMobile ? '6px' : '12px'};
                        margin-bottom: 16px;
                    ">
                        <div style="
                            text-align: center;
                            padding: ${isMobile ? '8px' : '12px'};
                            background: var(--bg-hover);
                            border-radius: 10px;
                        ">
                            <div style="font-size: ${isMobile ? '18px' : '22px'}; font-weight: 700; color: var(--primary);">
                                ${totalServicos}
                            </div>
                            <div style="font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">Total serviços</div>
                        </div>
                        <div style="
                            text-align: center;
                            padding: ${isMobile ? '8px' : '12px'};
                            background: var(--bg-hover);
                            border-radius: 10px;
                        ">
                            <div style="font-size: ${isMobile ? '18px' : '22px'}; font-weight: 700; color: #22c55e;">
                                R$ ${totalFaturamento.toFixed(2)}
                            </div>
                            <div style="font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">Faturamento</div>
                        </div>
                        <div style="
                            text-align: center;
                            padding: ${isMobile ? '8px' : '12px'};
                            background: var(--bg-hover);
                            border-radius: 10px;
                        ">
                            <div style="font-size: ${isMobile ? '18px' : '22px'}; font-weight: 700; color: #8b5cf6;">
                                ${mediaServicos.toFixed(1)}
                            </div>
                            <div style="font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">Média/dia</div>
                        </div>
                        <div style="
                            text-align: center;
                            padding: ${isMobile ? '8px' : '12px'};
                            background: var(--bg-hover);
                            border-radius: 10px;
                        ">
                            <div style="font-size: ${isMobile ? '18px' : '22px'}; font-weight: 700; color: ${diasComServico > 0 ? '#22c55e' : '#ef4444'};">
                                ${diasComServico}
                            </div>
                            <div style="font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">Dias com serviço</div>
                        </div>
                    </div>

                    <!-- CALENDÁRIO -->
                    <div style="
                        background: var(--bg-hover);
                        border-radius: 12px;
                        padding: ${isMobile ? '8px' : '12px'};
                    ">
                        <!-- Dias da semana -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(7, 1fr);
                            gap: ${isMobile ? '2px' : '4px'};
                            margin-bottom: ${isMobile ? '4px' : '8px'};
                        ">
                            ${diasSemana.map(d => `
                                <div style="
                                    text-align: center;
                                    padding: ${isMobile ? '6px 2px' : '8px 4px'};
                                    font-size: ${isMobile ? '10px' : '12px'};
                                    font-weight: 700;
                                    color: var(--text-muted);
                                    letter-spacing: 0.5px;
                                ">
                                    ${d}
                                </div>
                            `).join('')}
                        </div>

                        <!-- Dias do mês -->
                        <div style="
                            display: grid;
                            grid-template-columns: repeat(7, 1fr);
                            gap: ${isMobile ? '2px' : '4px'};
                        ">
                            ${Array.from({ length: primeiroDia }, (_, i) => `
                                <div style="
                                    padding: ${isMobile ? '6px 2px' : '8px 4px'};
                                    text-align: center;
                                    color: var(--text-muted);
                                    font-size: ${isMobile ? '10px' : '12px'};
                                    opacity: 0.3;
                                ">
                                    ${i + 1}
                                </div>
                            `).join('')}

                            ${Array.from({ length: diasNoMes }, (_, i) => {
                                const dia = i + 1;
                                const dados = mapaDados[dia];
                                const qtd = dados?.qtd || 0;
                                const fat = dados?.fat || 0;
                                const isHoje = isMesAtual && dia === diaAtual;

                                // Definir cor baseado na quantidade
                                let bgColor = 'var(--bg-card)';
                                let borderColor = 'var(--border-color)';
                                let textColor = 'var(--text-primary)';

                                if (qtd > 0) {
                                    if (qtd >= 5) {
                                        bgColor = 'rgba(34, 197, 94, 0.2)';
                                        borderColor = '#22c55e';
                                        textColor = '#22c55e';
                                    } else if (qtd >= 3) {
                                        bgColor = 'rgba(34, 197, 94, 0.12)';
                                        borderColor = 'rgba(34, 197, 94, 0.4)';
                                        textColor = 'var(--text-primary)';
                                    } else {
                                        bgColor = 'rgba(34, 197, 94, 0.06)';
                                        borderColor = 'rgba(34, 197, 94, 0.2)';
                                        textColor = 'var(--text-primary)';
                                    }
                                }

                                return `
                                    <div style="
                                        padding: ${isMobile ? '6px 2px' : '8px 4px'};
                                        text-align: center;
                                        background: ${isHoje ? 'var(--gradient)' : bgColor};
                                        border-radius: ${isMobile ? '8px' : '10px'};
                                        border: ${isHoje ? '2px solid var(--primary)' : `1px solid ${borderColor}`};
                                        cursor: default;
                                        transition: all 0.2s;
                                        position: relative;
                                    ">
                                        <div style="
                                            font-size: ${isMobile ? '14px' : '18px'};
                                            font-weight: ${isHoje ? '800' : '600'};
                                            color: ${isHoje ? 'white' : textColor};
                                        ">
                                            ${dia}
                                            ${isHoje ? ' 🔵' : ''}
                                        </div>
                                        ${qtd > 0 ? `
                                            <div style="
                                                font-size: ${isMobile ? '8px' : '10px'};
                                                color: ${isHoje ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'};
                                                margin-top: ${isMobile ? '1px' : '2px'};
                                                font-weight: 500;
                                            ">
                                                ${qtd} serv ${fat > 0 ? `• R$ ${fat.toFixed(0)}` : ''}
                                            </div>
                                        ` : `
                                            <div style="
                                                font-size: ${isMobile ? '8px' : '10px'};
                                                color: var(--text-muted);
                                                margin-top: ${isMobile ? '1px' : '2px'};
                                                opacity: 0.4;
                                            ">
                                                -
                                            </div>
                                        `}
                                        ${isHoje ? `
                                            <div style="
                                                position: absolute;
                                                top: -6px;
                                                right: -6px;
                                                background: #ef4444;
                                                color: white;
                                                border-radius: 50%;
                                                width: ${isMobile ? '16px' : '20px'};
                                                height: ${isMobile ? '16px' : '20px'};
                                                font-size: ${isMobile ? '8px' : '10px'};
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                font-weight: 700;
                                                box-shadow: 0 2px 8px rgba(239,68,68,0.4);
                                            ">
                                                HOJE
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- LEGENDA -->
                        <div style="
                            display: flex;
                            flex-wrap: wrap;
                            gap: ${isMobile ? '8px' : '12px'};
                            margin-top: 12px;
                            padding-top: 12px;
                            border-top: 1px solid var(--border-color);
                            justify-content: center;
                        ">
                            <div style="display: flex; align-items: center; gap: 4px; font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">
                                <span style="display: inline-block; width: 12px; height: 12px; background: rgba(34,197,94,0.2); border-radius: 4px; border: 1px solid #22c55e;"></span>
                                5+ serviços
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px; font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">
                                <span style="display: inline-block; width: 12px; height: 12px; background: rgba(34,197,94,0.12); border-radius: 4px; border: 1px solid rgba(34,197,94,0.4);"></span>
                                1-4 serviços
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px; font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">
                                <span style="display: inline-block; width: 12px; height: 12px; background: var(--bg-card); border-radius: 4px; border: 1px solid var(--border-color);"></span>
                                Sem serviços
                            </div>
                            <div style="display: flex; align-items: center; gap: 4px; font-size: ${isMobile ? '10px' : '12px'}; color: var(--text-muted);">
                                <span style="display: inline-block; width: 12px; height: 12px; background: var(--gradient); border-radius: 4px; border: 2px solid var(--primary);"></span>
                                🔵 Hoje
                            </div>
                        </div>
                    </div>

                    <!-- INSIGHTS -->
                    ${diasComServico === 0 ? `
                        <div style="
                            margin-top: 12px;
                            padding: ${isMobile ? '12px' : '16px'};
                            background: rgba(239,68,68,0.1);
                            border-radius: 10px;
                            border: 1px solid #ef4444;
                            text-align: center;
                        ">
                            <span style="color: #ef4444; font-weight: 600;">
                                ⚠️ Nenhum serviço realizado neste mês
                            </span>
                        </div>
                    ` : diasComServico < diasNoMes * 0.3 ? `
                        <div style="
                            margin-top: 12px;
                            padding: ${isMobile ? '12px' : '16px'};
                            background: rgba(245,158,11,0.1);
                            border-radius: 10px;
                            border: 1px solid #f59e0b;
                            text-align: center;
                        ">
                            <span style="color: #f59e0b; font-weight: 600;">
                                💡 Apenas ${diasComServico} de ${diasNoMes} dias tiveram movimento. 
                                Considere ações de marketing!
                            </span>
                        </div>
                    ` : diasComServico > diasNoMes * 0.7 ? `
                        <div style="
                            margin-top: 12px;
                            padding: ${isMobile ? '12px' : '16px'};
                            background: rgba(34,197,94,0.1);
                            border-radius: 10px;
                            border: 1px solid #22c55e;
                            text-align: center;
                        ">
                            <span style="color: #22c55e; font-weight: 600;">
                                ✅ Ótimo! ${diasComServico} de ${diasNoMes} dias com movimento
                            </span>
                        </div>
                    ` : `
                        <div style="
                            margin-top: 12px;
                            padding: ${isMobile ? '12px' : '16px'};
                            background: rgba(139,92,246,0.1);
                            border-radius: 10px;
                            border: 1px solid #8b5cf6;
                            text-align: center;
                        ">
                            <span style="color: #8b5cf6; font-weight: 600;">
                                📊 ${diasComServico} de ${diasNoMes} dias com movimento (${Math.round((diasComServico/diasNoMes)*100)}%)
                            </span>
                        </div>
                    `}
                </div>
            `;

            container.innerHTML = html;
            console.log('✅ Análise diária renderizada com calendário melhorado!');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar análise diária:', error);
        const container = document.getElementById('analiseDiariaContent');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                    <h4 style="margin: 10px 0;">Erro ao carregar análise</h4>
                    <p style="color: var(--text-muted);">${error.message}</p>
                    <button onclick="carregarAnaliseDiaria()" style="
                        margin-top: 10px;
                        padding: 8px 20px;
                        background: var(--gradient);
                        color: #fff;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                    ">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
}

function aplicarFiltroReceitas() {
    carregarReceitas();
}

// ============================================
// CARREGAR FIADOS - CORRIGIDO
// ============================================

async function carregarFiados() {
    console.log('📊 Carregando fiados pendentes...');
    
    const token = localStorage.getItem('token');
    const mesInput = document.getElementById('filtroMesFiados');
    let mes = mesInput?.value ? mesInput.value.split('-')[1] : new Date().getMonth() + 1;
    let ano = mesInput?.value ? mesInput.value.split('-')[0] : new Date().getFullYear();

    try {
        // 🔥 CORRIGIDO: /api/fiados (em vez de /api/financeiro/fiados)
        const response = await fetch(`/api/fiados?mes=${mes}&ano=${ano}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const result = await response.json();
        if (!result.success) {
            showToast('Erro ao carregar fiados', 'error');
            return;
        }

        const container = document.getElementById('fiadosList');
        if (!container) return;

        const fiados = result.data || [];
        const isMobile = window.innerWidth < 768;

        if (fiados.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 32px; color: #22c55e;"></i>
                    <h4 style="margin: 10px 0;">Nenhum fiado pendente</h4>
                    <p style="color: var(--text-muted);">Todos os fiados foram pagos! 🎉</p>
                </div>
            `;
            return;
        }

        // Cards de resumo
        const atrasados = fiados.filter(f => f.status === 'atrasado');
        const venceHoje = fiados.filter(f => f.status === 'vence_hoje');
        const pendentes = fiados.filter(f => f.status === 'pendente');

        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 16px;">
                <div style="background: #ef4444; border-radius: 10px; padding: 12px; color: white; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700;">${atrasados.length}</div>
                    <div style="font-size: 11px; opacity: 0.8;">⚠️ Em atraso</div>
                </div>
                <div style="background: #f59e0b; border-radius: 10px; padding: 12px; color: white; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700;">${venceHoje.length}</div>
                    <div style="font-size: 11px; opacity: 0.8;">⏳ Vence hoje</div>
                </div>
                <div style="background: #3b82f6; border-radius: 10px; padding: 12px; color: white; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700;">${pendentes.length}</div>
                    <div style="font-size: 11px; opacity: 0.8;">📝 Pendentes</div>
                </div>
                <div style="background: #22c55e; border-radius: 10px; padding: 12px; color: white; text-align: center;">
                    <div style="font-size: 20px; font-weight: 700;">${fiados.length}</div>
                    <div style="font-size: 11px; opacity: 0.8;">💰 Total</div>
                </div>
            </div>
        `;

        // Lista de fiados
        if (isMobile) {
            html += `<div style="display: flex; flex-direction: column; gap: 10px;">`;
            for (const f of fiados) {
                const statusColor = f.status === 'atrasado' ? '#ef4444' : f.status === 'vence_hoje' ? '#f59e0b' : '#3b82f6';
                const statusLabel = f.status === 'atrasado' ? '⚠️ Atrasado' : f.status === 'vence_hoje' ? '⏳ Vence hoje' : '📝 Pendente';
                
                html += `
                    <div style="background: var(--bg-card); border-radius: 12px; padding: 14px 16px; border-left: 4px solid ${statusColor};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary);">${f.cliente_nome || 'Cliente'}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">${f.servico}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; color: ${statusColor};">R$ ${(f.valor_total || 0).toFixed(2)}</div>
                                <div style="font-size: 10px; color: var(--text-muted);">${statusLabel}</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
                            <span>📅 ${formatarDataBr(f.data)}</span>
                            <span>⏳ Vence: ${formatarDataBr(f.data_vencimento)}</span>
                            ${f.dias_atraso > 0 ? `<span style="color: #ef4444;">${f.dias_atraso} dias atraso</span>` : ''}
                        </div>
                        <button onclick="abrirModalBaixarFiado(${f.id})" style="
                            margin-top: 10px;
                            padding: 6px 16px;
                            border-radius: 8px;
                            border: none;
                            background: linear-gradient(135deg, #22c55e, #16a34a);
                            color: white;
                            font-weight: 600;
                            font-size: 12px;
                            cursor: pointer;
                            width: 100%;
                        ">
                            ✅ Dar Baixa no Pagamento
                        </button>
                    </div>
                `;
            }
            html += `</div>`;
        } else {
            html += `
                <div class="table-responsive">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--bg-hover);">
                                <th style="padding: 10px 12px; text-align: left;">📅 Data</th>
                                <th style="padding: 10px 12px; text-align: left;">👤 Cliente</th>
                                <th style="padding: 10px 12px; text-align: left;">✂️ Serviço</th>
                                <th style="padding: 10px 12px; text-align: right;">💰 Valor</th>
                                <th style="padding: 10px 12px; text-align: center;">📅 Vencimento</th>
                                <th style="padding: 10px 12px; text-align: center;">📊 Status</th>
                                <th style="padding: 10px 12px; text-align: center;">⚡ Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${fiados.map(f => {
                                const statusColor = f.status === 'atrasado' ? '#ef4444' : f.status === 'vence_hoje' ? '#f59e0b' : '#3b82f6';
                                const statusLabel = f.status === 'atrasado' ? '⚠️ Atrasado' : f.status === 'vence_hoje' ? '⏳ Vence hoje' : '📝 Pendente';
                                return `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 10px 12px;">${formatarDataBr(f.data)}</td>
                                        <td style="padding: 10px 12px; font-weight: 500;">${f.cliente_nome || 'Cliente'}</td>
                                        <td style="padding: 10px 12px;">${f.servico}</td>
                                        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: ${statusColor};">R$ ${(f.valor_total || 0).toFixed(2)}</td>
                                        <td style="padding: 10px 12px; text-align: center;">${formatarDataBr(f.data_vencimento)}</td>
                                        <td style="padding: 10px 12px; text-align: center;">
                                            <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
                                            ${f.dias_atraso > 0 ? `<span style="display: block; font-size: 10px; color: #ef4444;">${f.dias_atraso} dias atraso</span>` : ''}
                                        </td>
                                        <td style="padding: 10px 12px; text-align: center;">
                                            <button onclick="abrirModalBaixarFiado(${f.id})" style="
                                                padding: 6px 14px;
                                                border-radius: 8px;
                                                border: none;
                                                background: linear-gradient(135deg, #22c55e, #16a34a);
                                                color: white;
                                                font-weight: 600;
                                                font-size: 12px;
                                                cursor: pointer;
                                            ">
                                                ✅ Baixar
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        container.innerHTML = html;
        console.log(`✅ ${fiados.length} fiados carregados`);

    } catch (error) {
        console.error('❌ Erro ao carregar fiados:', error);
        const container = document.getElementById('fiadosList');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 30px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 32px; color: #ef4444;"></i>
                    <h4>Erro ao carregar fiados</h4>
                    <p style="color: var(--text-muted);">${error.message}</p>
                </div>
            `;
        }
    }
}

function criarModalBaixarFiado() {
    if (document.getElementById('modalBaixarFiado')) return;

    const modalHTML = `
        <div id="modalBaixarFiado" class="modal-overlay" style="
            display:none; 
            position:fixed; 
            top:0; 
            left:0; 
            width:100%; 
            height:100%; 
            background:rgba(0,0,0,0.7); 
            z-index:9999; 
            justify-content:center; 
            align-items:center; 
            backdrop-filter:blur(4px);
            padding: 16px;
            box-sizing: border-box;
        ">
            <div class="modal-content" style="
                background: var(--bg-card); 
                border-radius: 16px; 
                padding: 24px; 
                max-width: 450px; 
                width: 100%; 
                max-height: 90vh; 
                overflow-y: auto; 
                border: 1px solid var(--border-color);
                position: relative;
                margin: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            ">
                <button onclick="fecharModalBaixarFiado()" style="
                    position: absolute;
                    top: 12px;
                    right: 16px;
                    background: transparent; 
                    border: none; 
                    color: var(--text-muted); 
                    font-size: 28px; 
                    cursor: pointer;
                    padding: 4px 8px;
                    line-height: 1;
                ">&times;</button>
                
                <h3 style="
                    margin: 0 0 20px 0; 
                    color: var(--text-primary); 
                    font-size: 20px;
                    padding-right: 32px;
                ">
                    <i class="fas fa-hand-holding-usd" style="color: #f59e0b;"></i> 
                    Dar Baixa no Fiado
                </h3>
                
                <input type="hidden" id="fiadoId">
                
                <div class="form-group" style="margin-bottom: 16px;">
                    <label style="
                        display: block; 
                        color: var(--text-primary); 
                        font-weight: 500; 
                        margin-bottom: 6px;
                        font-size: 14px;
                    ">
                        💳 Forma de Pagamento
                    </label>
                    <select id="formaPagamentoBaixa" style="
                        width: 100%; 
                        padding: 12px 14px; 
                        background: var(--bg-input); 
                        color: var(--text-primary); 
                        border: 1px solid var(--border-color); 
                        border-radius: 8px; 
                        font-size: 16px;
                        -webkit-appearance: none;
                        appearance: none;
                        box-sizing: border-box;
                    ">
                        <option value="dinheiro">💰 Dinheiro</option>
                        <option value="pix">📱 PIX</option>
                        <option value="debito">💳 Débito</option>
                        <option value="credito">💳 Crédito</option>
                        <option value="transferencia">🏦 Transferência</option>
                        <option value="boleto">📄 Boleto</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label style="
                        display: flex; 
                        align-items: center; 
                        gap: 10px; 
                        cursor: pointer;
                        font-size: 14px;
                        color: var(--text-primary);
                    ">
                        <input type="checkbox" id="enviarConfirmacao" checked style="
                            width: 18px; 
                            height: 18px; 
                            cursor: pointer;
                            accent-color: #22c55e;
                        ">
                        <span>📱 Enviar confirmação por WhatsApp</span>
                    </label>
                </div>

                <button id="btnConfirmarBaixa" style="
                    width: 100%;
                    padding: 14px 24px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    color: white;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(34,197,94,0.3);
                ">
                    ✅ Confirmar Pagamento
                </button>
            </div>
        </div>
        
        <style>
            @keyframes modalSlideIn {
                from { 
                    opacity: 0; 
                    transform: scale(0.95) translateY(-20px); 
                }
                to { 
                    opacity: 1; 
                    transform: scale(1) translateY(0); 
                }
            }
            
            #modalBaixarFiado .modal-content {
                animation: modalSlideIn 0.3s ease;
            }
            
            #modalBaixarFiado.active {
                display: flex !important;
            }

            /* 🔥 RESPONSIVO - MOBILE */
            @media (max-width: 480px) {
                #modalBaixarFiado {
                    padding: 8px;
                    align-items: flex-end;
                }
                
                #modalBaixarFiado .modal-content {
                    padding: 20px 16px;
                    border-radius: 16px 16px 0 0;
                    max-height: 80vh;
                    margin-bottom: 0;
                }
                
                #modalBaixarFiado h3 {
                    font-size: 17px;
                    margin-bottom: 16px;
                }
                
                #modalBaixarFiado .form-group label {
                    font-size: 13px;
                }
                
                #modalBaixarFiado select {
                    padding: 14px 12px;
                    font-size: 15px;
                }
                
                #modalBaixarFiado #btnConfirmarBaixa {
                    padding: 16px;
                    font-size: 15px;
                }
            }

            @media (max-width: 380px) {
                #modalBaixarFiado .modal-content {
                    padding: 16px 12px;
                }
                
                #modalBaixarFiado h3 {
                    font-size: 15px;
                }
                
                #modalBaixarFiado .form-group {
                    margin-bottom: 12px;
                }
                
                #modalBaixarFiado select {
                    padding: 12px 10px;
                    font-size: 14px;
                }
                
                #modalBaixarFiado #btnConfirmarBaixa {
                    padding: 14px;
                    font-size: 14px;
                }
            }
        </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('✅ Modal de baixa de fiado criado com responsividade');
}

function abrirModalBaixarFiado(id) {
    console.log(`💰 Abrindo modal para baixar fiado ${id}`);
    
    criarModalBaixarFiado();

    const modal = document.getElementById('modalBaixarFiado');
    if (!modal) {
        // Tentar criar novamente
        criarModalBaixarFiado();
        setTimeout(() => {
            const modalRetry = document.getElementById('modalBaixarFiado');
            if (modalRetry) {
                document.getElementById('fiadoId').value = id;
                document.getElementById('formaPagamentoBaixa').value = 'dinheiro';
                document.getElementById('enviarConfirmacao').checked = true;
                document.getElementById('btnConfirmarBaixa').onclick = () => confirmarBaixarFiado(id);
                modalRetry.style.display = 'flex';
                modalRetry.classList.add('active');
            }
        }, 100);
        return;
    }

    document.getElementById('fiadoId').value = id;
    document.getElementById('formaPagamentoBaixa').value = 'dinheiro';
    document.getElementById('enviarConfirmacao').checked = true;

    document.getElementById('btnConfirmarBaixa').onclick = () => confirmarBaixarFiado(id);

    modal.style.display = 'flex';
    modal.classList.add('active');
}

function fecharModalBaixarFiado() {
    const modal = document.getElementById('modalBaixarFiado');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

async function confirmarBaixarFiado(id) {
    try {
        const token = localStorage.getItem('token');
        const formaPagamento = document.getElementById('formaPagamentoBaixa').value;
        const enviarConfirmacao = document.getElementById('enviarConfirmacao').checked;

        console.log(`💰 Confirmando baixa do fiado ${id} - ${formaPagamento}`);

        // 🔥 CORRIGIDO: /api/fiados (em vez de /api/financeiro/fiados)
        const response = await fetch(`/api/fiados/${id}/baixar`, {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                forma_pagamento: formaPagamento,
                enviar_confirmacao: enviarConfirmacao
            })
        });

        const result = await response.json();
        if (!result.success) {
            showToast(result.message || 'Erro ao baixar fiado', 'error');
            return;
        }

        showToast('✅ Fiado baixado com sucesso!', 'success');
        fecharModalBaixarFiado();

        carregarFiados();
        carregarFinanceiro();

    } catch (error) {
        console.error('❌ Erro:', error);
        showToast('Erro ao baixar fiado', 'error');
    }
}

// ============================================
// SHOW TOAST
// ============================================

function showToast(mensagem, tipo = 'info') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = mensagem;
        toast.className = `toast ${tipo}`;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    } else {
        console.log(`[${tipo}] ${mensagem}`);
        alert(mensagem);
    }
}
// ============================================
// ABRIR MODAL DE RECEITA MANUAL
// ============================================

function abrirModalReceitaManual() {
    const isMobile = window.innerWidth < 768;

    // Criar modal se não existir
    if (!document.getElementById('modalReceitaManual')) {
        const modalHTML = `
            <div id="modalReceitaManual" class="modal-overlay" style="
                display:none;
                position:fixed;
                top:0;
                left:0;
                width:100%;
                height:100%;
                background:rgba(0,0,0,0.7);
                z-index:99999;
                justify-content:center;
                align-items:center;
                backdrop-filter:blur(4px);
                padding: 16px;
                box-sizing: border-box;
            ">
                <div class="modal-content" style="
                    background: var(--bg-card);
                    border-radius: 16px;
                    padding: 24px;
                    max-width: 450px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    position: relative;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                ">
                    <button onclick="fecharModalReceitaManual()" style="
                        position: absolute;
                        top: 12px;
                        right: 16px;
                        background: transparent;
                        border: none;
                        color: var(--text-muted);
                        font-size: 28px;
                        cursor: pointer;
                        padding: 4px 8px;
                        line-height: 1;
                    ">&times;</button>
                    
                    <h3 style="
                        margin: 0 0 20px 0;
                        color: var(--text-primary);
                        font-size: 20px;
                        padding-right: 32px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-hand-holding-usd" style="color: #22c55e;"></i>
                        Adicionar Receita Manual
                    </h3>
                    
                    <form id="formReceitaManual" onsubmit="event.preventDefault(); salvarReceitaManual();">
                        <div class="form-group" style="margin-bottom: 16px;">
                            <label style="
                                display: block;
                                color: var(--text-primary);
                                font-weight: 500;
                                margin-bottom: 6px;
                                font-size: 14px;
                            ">📝 Descrição *</label>
                            <input type="text" id="receitaManualDescricao" 
                                   placeholder="Ex: Venda de produtos, Gorjeta, etc." 
                                   required style="
                                width: 100%;
                                padding: 12px 14px;
                                background: var(--bg-input);
                                color: var(--text-primary);
                                border: 1px solid var(--border-color);
                                border-radius: 8px;
                                font-size: 16px;
                                box-sizing: border-box;
                            ">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div class="form-group">
                                <label style="
                                    display: block;
                                    color: var(--text-primary);
                                    font-weight: 500;
                                    margin-bottom: 6px;
                                    font-size: 14px;
                                ">💰 Valor *</label>
                                <input type="number" id="receitaManualValor" step="0.01" 
                                       placeholder="0,00" required style="
                                    width: 100%;
                                    padding: 12px 14px;
                                    background: var(--bg-input);
                                    color: var(--text-primary);
                                    border: 1px solid var(--border-color);
                                    border-radius: 8px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                ">
                            </div>
                            <div class="form-group">
                                <label style="
                                    display: block;
                                    color: var(--text-primary);
                                    font-weight: 500;
                                    margin-bottom: 6px;
                                    font-size: 14px;
                                ">📅 Data *</label>
                                <input type="date" id="receitaManualData" required style="
                                    width: 100%;
                                    padding: 12px 14px;
                                    background: var(--bg-input);
                                    color: var(--text-primary);
                                    border: 1px solid var(--border-color);
                                    border-radius: 8px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                ">
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                            <div class="form-group">
                                <label style="
                                    display: block;
                                    color: var(--text-primary);
                                    font-weight: 500;
                                    margin-bottom: 6px;
                                    font-size: 14px;
                                ">💳 Forma de Pagamento</label>
                                <select id="receitaManualFormaPagamento" style="
                                    width: 100%;
                                    padding: 12px 14px;
                                    background: var(--bg-input);
                                    color: var(--text-primary);
                                    border: 1px solid var(--border-color);
                                    border-radius: 8px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                ">
                                    <option value="dinheiro">💰 Dinheiro</option>
                                    <option value="pix">📱 PIX</option>
                                    <option value="debito">💳 Débito</option>
                                    <option value="credito">💳 Crédito</option>
                                    <option value="transferencia">🏦 Transferência</option>
                                    <option value="boleto">📄 Boleto</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="
                                    display: block;
                                    color: var(--text-primary);
                                    font-weight: 500;
                                    margin-bottom: 6px;
                                    font-size: 14px;
                                ">📂 Categoria</label>
                                <select id="receitaManualCategoria" style="
                                    width: 100%;
                                    padding: 12px 14px;
                                    background: var(--bg-input);
                                    color: var(--text-primary);
                                    border: 1px solid var(--border-color);
                                    border-radius: 8px;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                ">
                                    <option value="Serviços">✂️ Serviços</option>
                                    <option value="Produtos">🧴 Produtos</option>
                                    <option value="Gorjeta">💵 Gorjeta</option>
                                    <option value="Outros">📦 Outros</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 20px;">
                            <label style="
                                display: block;
                                color: var(--text-primary);
                                font-weight: 500;
                                margin-bottom: 6px;
                                font-size: 14px;
                            ">📝 Observação</label>
                            <textarea id="receitaManualObservacao" placeholder="Observações adicionais..." style="
                                width: 100%;
                                padding: 12px 14px;
                                background: var(--bg-input);
                                color: var(--text-primary);
                                border: 1px solid var(--border-color);
                                border-radius: 8px;
                                font-size: 16px;
                                resize: vertical;
                                min-height: 60px;
                                box-sizing: border-box;
                                font-family: inherit;
                            "></textarea>
                        </div>
                        
                        <button type="submit" style="
                            width: 100%;
                            padding: 14px 24px;
                            background: linear-gradient(135deg, #22c55e, #16a34a);
                            color: white;
                            border: none;
                            border-radius: 10px;
                            font-weight: 600;
                            font-size: 16px;
                            cursor: pointer;
                            transition: all 0.3s;
                            box-shadow: 0 4px 15px rgba(34,197,94,0.3);
                        ">
                            ✅ Adicionar Receita
                        </button>
                    </form>
                </div>
            </div>
            
            <style>
                @media (max-width: 480px) {
                    #modalReceitaManual {
                        padding: 8px;
                        align-items: flex-end;
                    }
                    #modalReceitaManual .modal-content {
                        padding: 20px 16px;
                        border-radius: 16px 16px 0 0;
                        max-height: 85vh;
                        margin-bottom: 0;
                    }
                    #modalReceitaManual h3 {
                        font-size: 17px;
                    }
                    #modalReceitaManual input,
                    #modalReceitaManual select,
                    #modalReceitaManual textarea {
                        font-size: 15px !important;
                        padding: 14px 12px !important;
                    }
                    #modalReceitaManual button[type="submit"] {
                        padding: 16px;
                        font-size: 15px;
                    }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // Preencher data atual
    const dataInput = document.getElementById('receitaManualData');
    if (dataInput) {
        dataInput.value = new Date().toISOString().split('T')[0];
    }

    // Mostrar modal
    const modal = document.getElementById('modalReceitaManual');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

// ============================================
// FECHAR MODAL DE RECEITA MANUAL
// ============================================

function fecharModalReceitaManual() {
    const modal = document.getElementById('modalReceitaManual');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

// ============================================
// SALVAR RECEITA MANUAL
// ============================================

async function salvarReceitaManual() {
    try {
        const descricao = document.getElementById('receitaManualDescricao').value.trim();
        const valor = parseFloat(document.getElementById('receitaManualValor').value);
        const data = document.getElementById('receitaManualData').value;
        const forma_pagamento = document.getElementById('receitaManualFormaPagamento').value;
        const categoria = document.getElementById('receitaManualCategoria').value;
        const observacao = document.getElementById('receitaManualObservacao').value.trim();

        if (!descricao) {
            showToast('⚠️ Digite uma descrição', 'warning');
            return;
        }

        if (!valor || valor <= 0) {
            showToast('⚠️ Informe um valor válido', 'warning');
            return;
        }

        if (!data) {
            showToast('⚠️ Selecione uma data', 'warning');
            return;
        }

        const token = localStorage.getItem('token');
        const response = await fetch('/api/financeiro/receitas/manual', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                descricao: descricao,
                valor: valor,
                data: data,
                forma_pagamento: forma_pagamento,
                categoria: categoria,
                observacao: observacao
            })
        });

        const result = await response.json();
        if (!result.success) {
            showToast(result.message || '❌ Erro ao adicionar receita', 'error');
            return;
        }

        showToast('✅ Receita adicionada com sucesso!', 'success');
        fecharModalReceitaManual();

        // Recarregar receitas e financeiro
        await carregarReceitas();
        await carregarFinanceiro();

    } catch (error) {
        console.error('❌ Erro:', error);
        showToast('❌ Erro ao adicionar receita', 'error');
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
window.carregarFiados = carregarFiados;
window.aplicarFiltroReceitas = aplicarFiltroReceitas;
window.abrirModalDespesa = abrirModalDespesa;
window.fecharModalDespesa = window.fecharModalDespesa;
window.salvarDespesa = salvarDespesa;
window.excluirDespesa = excluirDespesa;
window.abrirModalBaixarFiado = abrirModalBaixarFiado;
window.fecharModalBaixarFiado = fecharModalBaixarFiado;
window.confirmarBaixarFiado = confirmarBaixarFiado;
window.abrirModalReceitaManual = abrirModalReceitaManual;
window.fecharModalReceitaManual = fecharModalReceitaManual;
window.salvarReceitaManual = salvarReceitaManual;

console.log('✅ Financeiro V2 - Completo com formas de pagamento e fiados!');