// ============================================
// FUNÇÕES DE COMPATIBILIDADE POSTGRESQL
// ============================================

// Converter aberto (true/false ou 1/0)
function isAberto(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

// Converter ativo (true/false ou 1/0)
function isAtivo(valor) {
    if (typeof valor === 'boolean') return valor;
    if (typeof valor === 'number') return valor === 1;
    if (typeof valor === 'string') return valor === '1' || valor === 'true';
    return false;
}

// Converter valor para número
function toNumber(valor) {
    return parseFloat(valor) || 0;
}

// Formatar moeda
function formatMoney(valor) {
    return toNumber(valor).toFixed(2).replace('.', ',');
}

// ============================================
// FINANCEIRO COMPLETO - ESTILO CONFIGURAÇÕES
// ============================================

let financeiroData = null;
let despesasData = null;
let receitasData = null;
let mesAtual = null;
let mesAnterior = null;
let filtroMesReceitas = null;
let filtroAnoReceitas = null;
let filtroCategoriaAtual = null;
let filtroPagoAtual = null;
let despesaEditandoId = null;

// ============================================
// CARREGAR FINANCEIRO (CORRIGIDO)
// ============================================

async function carregarFinanceiro() {
    ativarBotao('financeiro');
    showLoading();

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const hoje = new Date();

    // Data atual e mês anterior
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
        const [financeiroRes, despesasRes, receitasRes, categoriasRes, comparativoRes] = await Promise.all([
            fetch('/api/financeiro', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch(`/api/despesas?mes=${mesAtual}&ano=${anoAtual}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch(`/api/financeiro/receitas?mes=${filtroMesReceitas}&ano=${filtroAnoReceitas}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch('/api/despesas/categorias', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch(`/api/financeiro/comparativo?mes_atual=${mesAtual}&ano_atual=${anoAtual}&mes_anterior=${mesAnterior}&ano_anterior=${anoAnterior}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            })
        ]);

        const financeiroResult = await financeiroRes.json();
        const despesasResult = await despesasRes.json();
        const receitasResult = await receitasRes.json();
        const categoriasResult = await categoriasRes.json();
        const comparativoResult = await comparativoRes.json();

        // 🔥 DEBUG: Ver o que está chegando
        console.log('📊 Financeiro Result:', financeiroResult);
        console.log('📊 Receitas Result:', receitasResult);

        // 🔥 CORREÇÃO: Se o financeiro veio zerado mas a rota de receitas tem dados, usa os dados da rota de receitas
        if (financeiroResult.success && financeiroResult.data) {
            const fatBruto = financeiroResult.data.totais?.faturamento_bruto || 0;
            const totalServicos = financeiroResult.data.totais?.total_servicos || 0;

            // Se o financeiro veio com 0 serviços mas a rota de receitas tem dados
            if (totalServicos === 0 && receitasResult.success && receitasResult.data) {
                console.log('⚠️ Financeiro veio zerado, usando dados da rota de receitas');
                const receitas = receitasResult.data.receitas || [];
                let total = 0;
                receitas.forEach(r => {
                    total += parseFloat(r.valor_total) || parseFloat(r.valor) || 0;
                });

                // Atualizar os totais do financeiro com os dados das receitas
                if (!financeiroResult.data.totais) {
                    financeiroResult.data.totais = {};
                }
                financeiroResult.data.totais.faturamento_bruto = total;
                financeiroResult.data.totais.total_servicos = receitas.length;

                // Atualizar comissoes também
                financeiroResult.data.comissoes = receitas.map(r => ({
                    ...r,
                    valor_total: parseFloat(r.valor_total) || parseFloat(r.valor) || 0,
                    comissao: parseFloat(r.comissao) || 0
                }));

                console.log('✅ Financeiro corrigido:', financeiroResult.data.totais);
            }
        }

        // Se o financeiroResult não tiver sucesso, cria dados vazios
        if (!financeiroResult.success) {
            console.warn('⚠️ Financeiro não retornou sucesso, criando dados vazios');
            financeiroResult.data = {
                totais: {
                    faturamento_bruto: 0,
                    total_servicos: 0,
                    total_comissoes: 0,
                    faturamento_liquido: 0
                },
                comissoes: [],
                comissoes_por_profissional: []
            };
            financeiroResult.success = true;
        }

        if (financeiroResult.success) {
            financeiroData = financeiroResult.data;
        }

        if (despesasResult.success) {
            despesasData = despesasResult.data;
            if (despesasData.totais) {
                despesasData.totais.total = parseFloat(despesasData.totais.total) || 0;
                despesasData.totais.pago = parseFloat(despesasData.totais.pago) || 0;
                despesasData.totais.pendente = parseFloat(despesasData.totais.pendente) || 0;
            }
        }

        if (receitasResult.success) {
            receitasData = receitasResult.data;
        }

        const comparativo = comparativoResult.success ? comparativoResult.data : null;
        const categorias = categoriasResult.success ? categoriasResult.data : [];

        renderizarFinanceiroCompleto(financeiroData, despesasData, receitasData, categorias, usuario, comparativo);

    } catch (error) {
        console.error('Erro:', error);
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
// RENDERIZAR FINANCEIRO COMPLETO (CORRIGIDO COM FORÇA)
// ============================================

function renderizarFinanceiroCompleto(financeiro, despesas, receitas, categorias, usuario, comparativo) {
    const isMobile = window.innerWidth < 768;
    const isDono = usuario?.role === 'dono';
    const temaSalvo = localStorage.getItem('theme') || 'light';

    // 🔥 CORREÇÃO: Extrair dados do comparativo corretamente
    const comp = comparativo || {};
    let mesAtualData = comp.mes_atual || {};
    let mesAnteriorData = comp.mes_anterior || {};

    // 🔥 FALLBACK 1: Se o comparativo veio vazio, usar os dados das receitas
    if (Object.keys(mesAtualData).length === 0 && receitas && receitas.total) {
        console.log('⚠️ Comparativo vazio, usando dados das receitas como fallback');
        const totalReceitas = parseFloat(receitas.total) || 0;
        const totalDespesasFallback = despesas?.totais?.total || 0;

        mesAtualData = {
            faturamento: totalReceitas,
            despesas: totalDespesasFallback,
            lucro: totalReceitas - totalDespesasFallback
        };
        mesAnteriorData = {
            faturamento: 0,
            despesas: 0,
            lucro: 0
        };
    }

    // 🔥 FALLBACK 2: Se ainda estiver zerado, usar os dados do resumo (financeiro)
    const fatResumo = toNumber(financeiro?.totais?.faturamento_bruto) || 0;
    const despResumo = toNumber(despesas?.totais?.total) || 0;

    if (isDono && (mesAtualData.faturamento === 0 || mesAtualData.faturamento === undefined) && fatResumo > 0) {
        console.log('⚠️ Comparativo ainda zerado, usando dados do resumo como fallback');
        console.log('📊 Fat Resumo:', fatResumo, 'Desp Resumo:', despResumo);

        mesAtualData = {
            faturamento: fatResumo,
            despesas: despResumo,
            lucro: fatResumo - despResumo
        };
        mesAnteriorData = {
            faturamento: 0,
            despesas: 0,
            lucro: 0
        };
    }

    // 🔥 FORÇAR valores numéricos
    const fatAtual = parseFloat(mesAtualData.faturamento) || 0;
    const fatAnterior = parseFloat(mesAnteriorData.faturamento) || 0;
    const despesasAtual = parseFloat(mesAtualData.despesas) || 0;
    const despesasAnterior = parseFloat(mesAnteriorData.despesas) || 0;
    const lucroAtual = parseFloat(mesAtualData.lucro) || 0;
    const lucroAnterior = parseFloat(mesAnteriorData.lucro) || 0;

    // 🔥 DEBUG: Ver o que está chegando
    console.log('📊 Comparativo - Mes Atual:', mesAtualData);
    console.log('📊 Comparativo - Mes Anterior:', mesAnteriorData);
    console.log('📊 Fat Atual:', fatAtual, 'Fat Anterior:', fatAnterior);
    console.log('📊 Fat Resumo:', fatResumo, 'Desp Resumo:', despResumo);

    // Variações percentuais
    const variacaoFat = fatAnterior > 0 ? ((fatAtual - fatAnterior) / fatAnterior * 100) : 0;
    const variacaoDesp = despesasAnterior > 0 ? ((despesasAtual - despesasAnterior) / despesasAnterior * 100) : 0;
    const variacaoLucro = lucroAnterior > 0 ? ((lucroAtual - lucroAnterior) / lucroAnterior * 100) : 0;

    const totais = financeiro?.totais || {};
    const despesasTotais = despesas?.totais || {};
    const faturamentoBruto = toNumber(totais.faturamento_bruto);
    const totalDespesas = toNumber(despesasTotais.total);
    const lucroLiquido = faturamentoBruto - totalDespesas;
    const faturamentoLiquido = toNumber(totais.faturamento_liquido);
    const totalServicos = totais.total_servicos || 0;

    let html = `
        <div class="fade-in financeiro-container">
            <!-- Header -->
            <div class="dashboard-header" style="flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'flex-start' : 'center'}; gap:${isMobile ? '8px' : '0'};">
                <div>
                    <h2 class="page-title" style="font-size:${isMobile ? '20px' : '24px'};">💰 Financeiro</h2>
                    <p class="page-subtitle" style="font-size:${isMobile ? '13px' : '14px'};">
                        <i class="fas fa-chart-line"></i> 
                        ${isDono ? 'Visão completa das finanças' : 'Suas comissões'}
                    </p>
                </div>
                <div class="dashboard-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" onclick="carregarFinanceiro()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
            </div>
            
            <!-- TABS -->
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
                <!-- 🔥 NOVA TAB: ANÁLISE DIÁRIA -->
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
    `;

    // ============================================
    // TAB: RESUMO (PADRÃO) - COM DADOS DO COMPARATIVO
    // ============================================
    if (isDono) {
        html += renderTabResumo(
            isMobile,
            fatAtual, fatAnterior, variacaoFat,
            despesasAtual, despesasAnterior, variacaoDesp,
            lucroAtual, lucroAnterior, variacaoLucro,
            faturamentoBruto, totalDespesas, lucroLiquido,
            faturamentoLiquido, totalServicos, despesasTotais
        );
    } else {
        html += renderTabResumoProfissional(isMobile, totais);
    }

    html += `
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
    console.log('✅ Financeiro renderizado com sucesso!');
}

// ============================================
// RENDER TAB RESUMO (DONO)
// ============================================

function renderTabResumo(isMobile, fatAtual, fatAnterior, variacaoFat, despesasAtual, despesasAnterior, variacaoDesp, lucroAtual, lucroAnterior, variacaoLucro, faturamentoBruto, totalDespesas, lucroLiquido, faturamentoLiquido, totalServicos, despesasTotais) {
    // Função para cor da variação
    const corVariacao = (valor) => {
        if (valor > 0) return '#22c55e';
        if (valor < 0) return '#ef4444';
        return '#f59e0b';
    };
    const iconeVariacao = (valor) => {
        if (valor > 0) return '📈';
        if (valor < 0) return '📉';
        return '➡️';
    };

    return `
        <!-- CARDS DE COMPARATIVO MENSAL -->
        <div style="margin-bottom:20px;">
            <h3 style="font-size:${isMobile ? '15px' : '18px'};color:var(--text-primary);margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-calendar-alt" style="color:var(--primary);"></i>
                Comparativo Mensal
                <span style="font-size:${isMobile ? '11px' : '13px'};color:var(--text-muted);font-weight:400;">
                    (${mesAnterior} vs ${mesAtual})
                </span>
            </h3>
            
            <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : 'repeat(3,1fr)'};gap:12px;margin-bottom:16px;">
                <!-- Faturamento -->
                <div style="background:var(--bg-card);border-radius:16px;padding:${isMobile ? '14px' : '18px'};border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-muted);">💰 Faturamento</span>
                        <span style="font-size:${isMobile ? '12px' : '14px'};font-weight:700;color:${corVariacao(variacaoFat)};">
                            ${iconeVariacao(variacaoFat)} ${variacaoFat > 0 ? '+' : ''}${variacaoFat.toFixed(1)}%
                        </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;">
                        <div>
                            <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;color:var(--text-primary);">R$ ${fatAtual.toFixed(2)}</div>
                            <span style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Este mês</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:600;color:var(--text-muted);">R$ ${fatAnterior.toFixed(2)}</div>
                            <span style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Mês anterior</span>
                        </div>
                    </div>
                </div>
                
                <!-- Despesas -->
                <div style="background:var(--bg-card);border-radius:16px;padding:${isMobile ? '14px' : '18px'};border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-muted);">📉 Despesas</span>
                        <span style="font-size:${isMobile ? '12px' : '14px'};font-weight:700;color:${corVariacao(variacaoDesp)};">
                            ${iconeVariacao(variacaoDesp)} ${variacaoDesp > 0 ? '+' : ''}${variacaoDesp.toFixed(1)}%
                        </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;">
                        <div>
                            <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;color:#ef4444;">- R$ ${despesasAtual.toFixed(2)}</div>
                            <span style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Este mês</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:600;color:var(--text-muted);">- R$ ${despesasAnterior.toFixed(2)}</div>
                            <span style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Mês anterior</span>
                        </div>
                    </div>
                </div>
                
                <!-- Lucro -->
                <div style="background:var(--bg-card);border-radius:16px;padding:${isMobile ? '14px' : '18px'};border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-muted);">💎 Lucro</span>
                        <span style="font-size:${isMobile ? '12px' : '14px'};font-weight:700;color:${corVariacao(variacaoLucro)};">
                            ${iconeVariacao(variacaoLucro)} ${variacaoLucro > 0 ? '+' : ''}${variacaoLucro.toFixed(1)}%
                        </span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:8px;">
                        <div>
                            <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;color:${lucroAtual >= 0 ? '#22c55e' : '#ef4444'};">R$ ${lucroAtual.toFixed(2)}</div>
                            <span style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Este mês</span>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:${isMobile ? '14px' : '18px'};font-weight:600;color:${lucroAnterior >= 0 ? '#22c55e' : '#ef4444'};">R$ ${lucroAnterior.toFixed(2)}</div>
                            <span style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Mês anterior</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- CARDS DO MÊS ATUAL -->
        <div style="margin-bottom:16px;">
            <h3 style="font-size:${isMobile ? '15px' : '18px'};color:var(--text-primary);margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-chart-simple" style="color:var(--primary);"></i>
                Resumo do Mês Atual
            </h3>
            <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(4,1fr)'};gap:12px;margin-bottom:16px;">
                <!-- Card 1: Faturamento Bruto -->
                <div style="background:var(--gradient-primary);border-radius:16px;padding:${isMobile ? '14px' : '16px'};color:white;box-shadow:0 4px 20px rgba(102,126,234,0.3);">
                    <div style="font-size:20px;margin-bottom:4px;">📊</div>
                    <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;">R$ ${faturamentoBruto.toFixed(2)}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.8;">Faturamento Bruto</div>
                    <div style="font-size:${isMobile ? '9px' : '11px'};opacity:0.6;">📈 ${totalServicos} serviços</div>
                </div>
                
                <!-- Card 2: Despesas -->
                <div style="background:var(--bg-card);border-radius:16px;padding:${isMobile ? '14px' : '16px'};border:1px solid var(--border-color);border-left:4px solid #ef4444;">
                    <div style="font-size:20px;margin-bottom:4px;">📉</div>
                    <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;color:#ef4444;">- R$ ${totalDespesas.toFixed(2)}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Total de Despesas</div>
                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">${despesasTotais.quantidade || 0} despesas</div>
                </div>
                
                <!-- Card 3: Lucro Líquido -->
                <div style="background:var(--bg-card);border-radius:16px;padding:${isMobile ? '14px' : '16px'};border:1px solid var(--border-color);border-left:4px solid #22c55e;">
                    <div style="font-size:20px;margin-bottom:4px;">💰</div>
                    <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;color:#22c55e;">R$ ${lucroLiquido.toFixed(2)}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Lucro Líquido</div>
                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Bruto - Despesas</div>
                </div>
                
                <!-- Card 4: Lucro após Comissões -->
                <div style="background:var(--bg-card);border-radius:16px;padding:${isMobile ? '14px' : '16px'};border:1px solid var(--border-color);border-left:4px solid var(--primary);">
                    <div style="font-size:20px;margin-bottom:4px;">💎</div>
                    <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:800;color:var(--primary);">R$ ${faturamentoLiquido.toFixed(2)}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">Lucro após Comissões</div>
                    <div style="font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);">Bruto - Comissões</div>
                </div>
            </div>
        </div>
        
        <!-- DETALHES RÁPIDOS -->
        <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:16px;margin-bottom:16px;">
            <div class="card">
                <div class="card-header">
                    <h3 style="font-size:${isMobile ? '14px' : '16px'};"><i class="fas fa-arrow-up" style="color:#16a34a;"></i> Receitas</h3>
                    <span class="badge badge-success">R$ ${faturamentoBruto.toFixed(2)}</span>
                </div>
                <div style="padding:${isMobile ? '10px' : '12px'};">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:${isMobile ? '13px' : '14px'};">
                        <span>✅ Serviços Concluídos</span>
                        <span><strong>${totalServicos}</strong></span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:${isMobile ? '13px' : '14px'};">
                        <span>💰 Valor Médio por Serviço</span>
                        <span><strong>R$ ${totalServicos > 0 ? (faturamentoBruto / totalServicos).toFixed(2) : '0,00'}</strong></span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3 style="font-size:${isMobile ? '14px' : '16px'};"><i class="fas fa-arrow-down" style="color:#dc2626;"></i> Despesas</h3>
                    <span class="badge badge-danger">R$ ${totalDespesas.toFixed(2)}</span>
                </div>
                <div style="padding:${isMobile ? '10px' : '12px'};">
                    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:${isMobile ? '13px' : '14px'};">
                        <span>💳 Pagas</span>
                        <span><strong>R$ ${(toNumber(despesasTotais.pago) || 0).toFixed(2)}</strong></span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:${isMobile ? '13px' : '14px'};">
                        <span>⏳ Pendentes</span>
                        <span><strong style="color:#dc2626;">R$ ${(toNumber(despesasTotais.pendente) || 0).toFixed(2)}</strong></span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// RENDER TAB RESUMO (PROFISSIONAL)
// ============================================

function renderTabResumoProfissional(isMobile, totais) {
    return `
        <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:16px;margin-bottom:20px;">
            <div style="background:var(--gradient-primary);border-radius:16px;padding:${isMobile ? '18px' : '24px'};color:white;box-shadow:0 4px 20px rgba(102,126,234,0.3);">
                <div style="font-size:${isMobile ? '28px' : '36px'};margin-bottom:4px;">💰</div>
                <div style="font-size:${isMobile ? '24px' : '32px'};font-weight:800;">R$ ${(toNumber(totais.total_comissoes) || 0).toFixed(2)}</div>
                <div style="font-size:${isMobile ? '14px' : '16px'};opacity:0.8;">Total em Comissões</div>
                <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.6;">Todos os serviços concluídos</div>
            </div>
            
            <div style="background:var(--bg-card);border-radius:16px;padding:${isMobile ? '18px' : '24px'};border:1px solid var(--border-color);border-left:4px solid #22c55e;">
                <div style="font-size:${isMobile ? '28px' : '36px'};margin-bottom:4px;">✅</div>
                <div style="font-size:${isMobile ? '24px' : '32px'};font-weight:800;color:#22c55e;">${totais.total_servicos || 0}</div>
                <div style="font-size:${isMobile ? '14px' : '16px'};color:var(--text-muted);">Serviços Concluídos</div>
                <div style="font-size:${isMobile ? '11px' : '13px'};color:var(--text-muted);">Total realizados por você</div>
            </div>
        </div>
        
        <!-- Histórico de serviços (será carregado na tab Comissões) -->
        <div class="card">
            <div class="card-header">
                <h3 style="font-size:${isMobile ? '14px' : '16px'};"><i class="fas fa-history"></i> Histórico de Serviços</h3>
                <span class="badge badge-info">Acesse a tab "Comissões"</span>
            </div>
            <div style="padding:${isMobile ? '14px' : '20px'};text-align:center;color:var(--text-muted);">
                <i class="fas fa-chevron-right" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                <p>Veja todos os seus serviços e comissões na aba <strong>Comissões</strong></p>
            </div>
        </div>
    `;
}

// ============================================
// SWITCH FINANCEIRO TABS
// ============================================

function switchFinanceiroTab(tab) {
    // Atualizar tabs
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

    // Carregar conteúdo
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const isDono = usuario?.role === 'dono';
    const isMobile = window.innerWidth < 768;

    switch (tab) {
        case 'resumo':
            carregarFinanceiro();
            break;
        case 'receitas':
            if (isDono) {
                document.getElementById('financeiroContent').innerHTML = renderTabReceitas(isMobile);
                carregarReceitas();
            } else {
                showToast('Apenas o dono pode ver receitas', 'warning');
                carregarFinanceiro();
            }
            break;
        case 'despesas':
            if (isDono) {
                document.getElementById('financeiroContent').innerHTML = renderTabDespesas(isMobile);
                carregarDespesasTab();
            } else {
                showToast('Apenas o dono pode ver despesas', 'warning');
                carregarFinanceiro();
            }
            break;
        case 'profissionais':
            document.getElementById('financeiroContent').innerHTML = renderTabComissoes(isMobile);
            carregarComissoesTab();
            break;
        case 'analise':
            if (isDono) {
                document.getElementById('financeiroContent').innerHTML = renderTabAnaliseDiaria(isMobile);
                carregarAnaliseDiaria();
            } else {
                showToast('Apenas o dono pode ver análise diária', 'warning');
                carregarFinanceiro();
            }
            break;
        default:
            break;
    }
}

// ============================================
// RENDER TAB RECEITAS
// ============================================

function renderTabReceitas(isMobile) {
    return `
        <div class="card" style="padding:${isMobile ? '14px' : '20px'};">
            <div class="card-header" style="flex-direction:${isMobile ? 'column' : 'row'};align-items:${isMobile ? 'stretch' : 'center'};gap:${isMobile ? '10px' : '0'};">
                <h3 style="font-size:${isMobile ? '16px' : '18px'};margin:0;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-arrow-up" style="color:#22c55e;"></i> Receitas
                </h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <input type="month" id="filtroMesReceitas" value="${filtroAnoReceitas}-${filtroMesReceitas}" 
                           onchange="aplicarFiltroReceitas()" 
                           style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:12px;">
                    <button class="btn btn-outline btn-sm" onclick="carregarReceitas()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
            </div>
            <div id="receitasList">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p>Carregando receitas...</p>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// CARREGAR RECEITAS
// ============================================

async function carregarReceitas() {
    const token = localStorage.getItem('token');
    const mes = document.getElementById('filtroMesReceitas')?.value || `${filtroAnoReceitas}-${filtroMesReceitas}`;
    if (mes) {
        const [ano, mesNum] = mes.split('-');
        filtroAnoReceitas = ano;
        filtroMesReceitas = mesNum;
    }

    try {
        const res = await fetch(`/api/financeiro/receitas?mes=${filtroMesReceitas}&ano=${filtroAnoReceitas}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            receitasData = result.data;
            renderizarReceitas(receitasData);
        } else {
            document.getElementById('receitasList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar receitas</h4>
                    <p>${result.message || 'Tente novamente'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('receitasList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Erro ao carregar receitas</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function aplicarFiltroReceitas() {
    carregarReceitas();
}

function renderizarReceitas(receitas) {
    const isMobile = window.innerWidth < 768;
    const lista = receitas?.receitas || [];
    const total = toNumber(receitas?.total);

    if (lista.length === 0) {
        document.getElementById('receitasList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-coins"></i>
                <h4>Nenhuma receita neste período</h4>
                <p>Conclua serviços para gerar receitas</p>
            </div>
        `;
        return;
    }

    let html = `
        <div style="
            background:var(--bg-hover);
            padding:${isMobile ? '10px' : '14px'};
            border-radius:10px;
            margin-bottom:14px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            flex-wrap:wrap;
            gap:8px;
        ">
            <span style="font-weight:600;font-size:${isMobile ? '14px' : '16px'};">
                Total: <span style="color:#22c55e;">R$ ${total.toFixed(2)}</span>
            </span>
            <span style="font-size:${isMobile ? '12px' : '14px'};color:var(--text-muted);">
                ${lista.length} serviços
            </span>
        </div>
    `;

    if (isMobile) {
        html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
        for (let item of lista) {
            const valor = toNumber(item.valor_total) || toNumber(item.valor) || 0;
            const comissao = toNumber(item.comissao);
            const temProfissional = item.profissional_id ? true : false;
            html += `
                <div style="background:var(--bg-card);border-radius:12px;padding:14px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                        <div>
                            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${escapeHtml(item.cliente_nome || 'Cliente')}</div>
                            <div style="font-size:12px;color:var(--text-muted);">✂️ ${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</div>
                        </div>
                        <span style="font-size:16px;font-weight:700;color:#22c55e;">R$ ${valor.toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:8px;margin-top:8px;">
                        <span>📅 ${formatarDataBr(item.data)}</span>
                        <span>👨‍💼 ${temProfissional ? escapeHtml(item.profissional_nome || 'Profissional') : 'Sem profissional'}</span>
                        ${temProfissional ? `<span>💰 Comissão: R$ ${comissao.toFixed(2)}</span>` : ''}
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
                        ${lista.map(item => {
            const temProf = item.profissional_id ? true : false;
            return `
                                <tr>
                                    <td>${formatarDataBr(item.data)}</td>
                                    <td><strong>${escapeHtml(item.cliente_nome || 'Cliente')}</strong></td>
                                    <td>${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</td>
                                    <td><span style="color:#22c55e;font-weight:700;">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</span></td>
                                    <td class="${!temProf ? 'text-muted' : ''}">${temProf ? escapeHtml(item.profissional_nome || 'Profissional') : 'Sem profissional'}</td>
                                    <td>${temProf ? `R$ ${toNumber(item.comissao).toFixed(2)}` : 'R$ 0,00'}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    document.getElementById('receitasList').innerHTML = html;
}

// ============================================
// RENDER TAB DESPESAS
// ============================================

function renderTabDespesas(isMobile) {
    const token = localStorage.getItem('token');

    fetch('/api/despesas/categorias', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                const select = document.getElementById('filtroCategoriaDespesa');
                if (select) {
                    select.innerHTML = `
                    <option value="">Todas Categorias</option>
                    ${result.data.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('')}
                `;
                }
            }
        })
        .catch(console.error);

    return `
        <div class="card" style="padding:${isMobile ? '14px' : '20px'};">
            <div class="card-header" style="flex-direction:${isMobile ? 'column' : 'row'};align-items:${isMobile ? 'stretch' : 'center'};gap:${isMobile ? '10px' : '0'};">
                <h3 style="font-size:${isMobile ? '16px' : '18px'};margin:0;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-arrow-down" style="color:#ef4444;"></i> Despesas
                </h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="abrirModalDespesa()">
                        <i class="fas fa-plus"></i> Nova Despesa
                    </button>
                </div>
            </div>
            
            <div style="padding:${isMobile ? '8px' : '12px'};display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--border-color);">
                <select id="filtroCategoriaDespesa" onchange="aplicarFiltrosDespesasTab()" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:12px;">
                    <option value="">Todas Categorias</option>
                </select>
                
                <select id="filtroPagoDespesa" onchange="aplicarFiltrosDespesasTab()" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:12px;">
                    <option value="">Todos</option>
                    <option value="true">✅ Pagas</option>
                    <option value="false">⏳ Pendentes</option>
                </select>
                
                <input type="month" id="filtroMesDespesaTab" value="${filtroAnoReceitas || ''}-${filtroMesReceitas || ''}" 
                       onchange="aplicarFiltrosDespesasTab()" 
                       style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:12px;">
            </div>
            
            <div id="despesasList">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p>Carregando despesas...</p>
                </div>
            </div>
        </div>
    `;
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

        if (result.success) {
            despesasData = result.data;
            renderizarDespesasTab(despesasData);
        } else {
            document.getElementById('despesasList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar despesas</h4>
                    <p>${result.message || 'Tente novamente'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('despesasList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Erro ao carregar despesas</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function aplicarFiltrosDespesasTab() {
    carregarDespesasTab();
}

function renderizarDespesasTab(despesas) {
    const isMobile = window.innerWidth < 768;
    const lista = despesas?.despesas || [];
    const totais = despesas?.totais || {};

    if (lista.length === 0) {
        document.getElementById('despesasList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <h4>Nenhuma despesa cadastrada</h4>
                <p>Clique em "Nova Despesa" para começar</p>
            </div>
        `;
        return;
    }

    let html = `
        <div style="
            background:var(--bg-hover);
            padding:${isMobile ? '10px' : '14px'};
            border-radius:10px;
            margin-bottom:14px;
            display:flex;
            justify-content:space-between;
            align-items:center;
            flex-wrap:wrap;
            gap:8px;
        ">
            <span style="font-weight:600;font-size:${isMobile ? '14px' : '16px'};">
                Total: <span style="color:#ef4444;">R$ ${(toNumber(totais.total) || 0).toFixed(2)}</span>
            </span>
            <div style="display:flex;gap:12px;font-size:${isMobile ? '12px' : '14px'};">
                <span>✅ Pagas: R$ ${(toNumber(totais.pago) || 0).toFixed(2)}</span>
                <span style="color:#f59e0b;">⏳ Pendentes: R$ ${(toNumber(totais.pendente) || 0).toFixed(2)}</span>
            </div>
        </div>
    `;

    if (isMobile) {
        html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
        for (let d of lista) {
            const valor = toNumber(d.valor);
            const statusLabel = d.pago ? '✅ Paga' : '⏳ Pendente';
            html += `
                <div style="background:var(--bg-card);border-radius:12px;padding:14px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                        <div>
                            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${escapeHtml(d.descricao)}</div>
                            <div style="font-size:12px;color:var(--text-muted);">📂 ${escapeHtml(d.categoria)}</div>
                        </div>
                        <span style="font-size:16px;font-weight:700;color:#ef4444;">R$ ${valor.toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);border-top:1px solid var(--border-color);padding-top:8px;margin-top:8px;">
                        <span>📅 ${formatarDataBr(d.data)}</span>
                        <span>${statusLabel}</span>
                    </div>
                    <div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color);flex-wrap:wrap;">
                        <button onclick="editarDespesa(${d.id})" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-hover);color:var(--text-primary);font-size:12px;cursor:pointer;flex:1;">
                            <i class="fas fa-pen"></i> Editar
                        </button>
                        <button onclick="togglePagoDespesa(${d.id}, ${d.pago ? 0 : 1})" style="padding:6px 14px;border-radius:8px;border:1px solid ${d.pago ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'};background:var(--bg-hover);color:${d.pago ? '#ef4444' : '#22c55e'};font-size:12px;cursor:pointer;flex:1;">
                            <i class="fas ${d.pago ? 'fa-undo' : 'fa-check'}"></i> ${d.pago ? 'Desfazer' : 'Pagar'}
                        </button>
                        <button onclick="excluirDespesa(${d.id})" style="padding:6px 14px;border-radius:8px;border:1px solid rgba(239,68,68,0.3);background:var(--bg-hover);color:#ef4444;font-size:12px;cursor:pointer;flex:1;">
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
                                <td><span style="color:#ef4444;font-weight:700;">R$ ${toNumber(d.valor).toFixed(2)}</span></td>
                                <td>
                                    ${d.pago
                ? '<span class="badge badge-success">✅ Paga</span>'
                : '<span class="badge badge-warning">⏳ Pendente</span>'
            }
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

    document.getElementById('despesasList').innerHTML = html;
}

// ============================================
// RENDER TAB COMISSÕES
// ============================================

function renderTabComissoes(isMobile) {
    return `
        <div class="card" style="padding:${isMobile ? '14px' : '20px'};">
            <div class="card-header">
                <h3 style="font-size:${isMobile ? '16px' : '18px'};margin:0;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-users" style="color:var(--primary);"></i> Comissões por Profissional
                </h3>
                <span class="badge badge-info">Detalhamento</span>
            </div>
            <div id="comissoesList">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p>Carregando comissões...</p>
                </div>
            </div>
        </div>
    `;
}

async function carregarComissoesTab() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const isDono = usuario?.role === 'dono';

    try {
        const res = await fetch('/api/financeiro', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success && result.data) {
            const data = result.data;
            renderizarComissoesTab(data, isDono);
        } else {
            document.getElementById('comissoesList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar comissões</h4>
                    <p>${result.message || 'Tente novamente'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('comissoesList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Erro ao carregar comissões</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderizarComissoesTab(data, isDono) {
    const isMobile = window.innerWidth < 768;
    const comissoes = data.comissoes || [];
    const comissoesPorProf = data.comissoes_por_profissional || [];

    comissoes.sort((a, b) => new Date(b.data) - new Date(a.data));

    let html = '';

    if (isDono && comissoesPorProf.length > 0) {
        html += `
            <div style="margin-bottom:16px;">
                <h4 style="font-size:14px;font-weight:700;color:var(--text-primary);margin:0 0 10px 0;display:flex;align-items:center;gap:8px;padding-bottom:8px;border-bottom:2px solid var(--border-color);">
                    <i class="fas fa-crown" style="color:#f59e0b;font-size:16px;"></i>
                    Profissionais
                    <span style="font-size:11px;font-weight:400;color:var(--text-muted);background:var(--bg-hover);padding:2px 10px;border-radius:12px;">
                        ${comissoesPorProf.length}
                    </span>
                </h4>
            </div>
        `;

        if (isMobile) {
            html += `<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">`;
            for (let prof of comissoesPorProf) {
                const totalComissao = toNumber(prof.total_comissao);
                const totalServicos = prof.total_servicos || 0;
                const inicial = prof.nome ? prof.nome.charAt(0).toUpperCase() : '?';
                const cores = ['#667eea', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                const corIndex = comissoesPorProf.indexOf(prof) % cores.length;
                const corProfissional = cores[corIndex];

                html += `
                    <div style="background:var(--bg-card);border-radius:14px;padding:16px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border-color);">
                            <div style="width:48px;height:48px;border-radius:50%;background:${corProfissional};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:20px;flex-shrink:0;">
                                ${inicial}
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${escapeHtml(prof.nome)}</div>
                                <div style="font-size:12px;color:var(--text-muted);">📋 ${totalServicos} serviço(s)</div>
                            </div>
                            <div style="font-size:18px;font-weight:800;color:var(--primary);background:rgba(102,126,234,0.08);padding:6px 16px;border-radius:12px;flex-shrink:0;">
                                R$ ${totalComissao.toFixed(2)}
                            </div>
                        </div>
                        <div style="margin-top:4px;">
                            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-muted);margin-bottom:4px;">
                                <span>Serviços realizados</span>
                                <span>${totalServicos} de ${comissoes.length}</span>
                            </div>
                            <div style="background:var(--bg-hover);border-radius:8px;height:6px;overflow:hidden;">
                                <div style="width:${comissoes.length > 0 ? (totalServicos / comissoes.length * 100) : 0}%;height:100%;background:${corProfissional};border-radius:8px;"></div>
                            </div>
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        } else {
            html += `
                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;margin-bottom:20px;">
                    ${comissoesPorProf.map(prof => {
                const totalComissao = toNumber(prof.total_comissao);
                return `
                            <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);text-align:center;">
                                <div style="width:48px;height:48px;border-radius:50%;background:var(--gradient-primary);display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px;margin-bottom:8px;">
                                    ${prof.nome ? prof.nome.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div style="font-size:16px;font-weight:600;color:var(--text-primary);">${escapeHtml(prof.nome)}</div>
                                <div style="font-size:13px;color:var(--text-muted);">${prof.total_servicos} serviços</div>
                                <div style="font-size:20px;font-weight:700;color:var(--primary);margin-top:6px;">R$ ${totalComissao.toFixed(2)}</div>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }
    }

    if (comissoes.length === 0) {
        html += `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h4>Nenhum serviço concluído ainda</h4>
                <p>Os serviços aparecerão aqui quando forem concluídos</p>
            </div>
        `;
    } else if (isMobile) {
        html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
        for (let item of comissoes) {
            const temProfissional = item.profissional_id ? true : false;
            const valor = toNumber(item.valor_total) || toNumber(item.valor) || 0;
            const comissao = toNumber(item.comissao);
            const clienteNome = item.cliente_nome || 'Cliente';
            const servicoNome = item.servico_nome || item.servico || 'Serviço';
            const inicial = clienteNome.charAt(0).toUpperCase();

            html += `
                <div style="background:var(--bg-card);border-radius:12px;padding:14px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border-color);">
                        <div style="width:40px;height:40px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0;">${inicial}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${escapeHtml(clienteNome)}</div>
                            <div style="font-size:12px;color:var(--text-muted);">✂️ ${escapeHtml(servicoNome)}</div>
                        </div>
                        <div style="font-size:14px;font-weight:700;color:var(--primary);">R$ ${valor.toFixed(2)}</div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);">
                        <span>📅 ${formatarDataBr(item.data)}</span>
                        <span>👨‍💼 ${temProfissional ? escapeHtml(item.profissional_nome || 'Profissional') : 'Sem profissional'}</span>
                        ${temProfissional ? `<span style="color:var(--primary);font-weight:600;">💰 R$ ${comissao.toFixed(2)}</span>` : ''}
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
                        ${comissoes.map(item => {
            const temProf = item.profissional_id ? true : false;
            return `
                                <tr>
                                    <td>${formatarDataBr(item.data)}</td>
                                    <td><strong>${escapeHtml(item.cliente_nome || 'Cliente')}</strong></td>
                                    <td>${escapeHtml(item.servico_nome || item.servico || 'Serviço')}</td>
                                    <td><span class="valor">R$ ${(toNumber(item.valor_total) || toNumber(item.valor) || 0).toFixed(2)}</span></td>
                                    <td class="${!temProf ? 'text-muted' : ''}">${temProf ? escapeHtml(item.profissional_nome || 'Profissional') : 'Sem profissional'}</td>
                                    <td>${temProf ? `<span style="color:var(--primary);font-weight:700;">R$ ${toNumber(item.comissao).toFixed(2)}</span>` : 'R$ 0,00'}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    document.getElementById('comissoesList').innerHTML = html;
}

// ============================================
// FUNÇÕES DE DESPESAS (MODAL E CRUD)
// ============================================

function abrirModalDespesa(despesa = null) {
    const isEdit = !!despesa;
    despesaEditandoId = despesa?.id || null;

    const hoje = new Date().toISOString().split('T')[0];
    const bgDark = '#1a1a2e';
    const textLight = '#e0e0e0';
    const borderDark = '#2d2d44';
    const bgSelect = '#1a1a2e';

    let html = `
        <div style="padding:4px 0;">
            <form id="formDespesa" onsubmit="salvarDespesa(event)">
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">📝 Descrição *</label>
                    <input type="text" id="despDescricao" value="${escapeHtml(despesa?.descricao || '')}" 
                           style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgDark};color:${textLight};font-size:14px;" required>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">📂 Categoria *</label>
                        <select id="despCategoria" style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgSelect};color:${textLight};font-size:14px;" required>
                            <option value="">Selecione...</option>
                            ${categoriasDisponiveis.map(cat => `
                                <option value="${escapeHtml(cat)}" ${despesa?.categoria === cat ? 'selected' : ''} style="background:${bgDark};color:${textLight};">
                                    ${escapeHtml(cat)}
                                </option>
                            `).join('')}
                            <option value="__nova__" style="background:${bgDark};color:${textLight};">➕ Nova categoria</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">💰 Valor *</label>
                        <input type="number" step="0.01" id="despValor" value="${despesa?.valor || ''}" 
                               style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgDark};color:${textLight};font-size:14px;" required>
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">📅 Data *</label>
                        <input type="date" id="despData" value="${despesa?.data || hoje}" 
                               style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgDark};color:${textLight};font-size:14px;" required>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">📅 Data Vencimento</label>
                        <input type="date" id="despVencimento" value="${despesa?.data_vencimento || ''}" 
                               style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgDark};color:${textLight};font-size:14px;">
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">📊 Status</label>
                        <select id="despPago" style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgSelect};color:${textLight};font-size:14px;">
                            <option value="0" ${!despesa?.pago ? 'selected' : ''} style="background:${bgDark};color:${textLight};">⏳ Pendente</option>
                            <option value="1" ${despesa?.pago ? 'selected' : ''} style="background:${bgDark};color:${textLight};">✅ Paga</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">💳 Forma de Pagamento</label>
                        <select id="despFormaPagamento" style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgSelect};color:${textLight};font-size:14px;">
                            <option value="" style="background:${bgDark};color:${textLight};">Selecione...</option>
                            <option value="Dinheiro" ${despesa?.forma_pagamento === 'Dinheiro' ? 'selected' : ''} style="background:${bgDark};color:${textLight};">Dinheiro</option>
                            <option value="Cartão de Crédito" ${despesa?.forma_pagamento === 'Cartão de Crédito' ? 'selected' : ''} style="background:${bgDark};color:${textLight};">Cartão de Crédito</option>
                            <option value="Cartão de Débito" ${despesa?.forma_pagamento === 'Cartão de Débito' ? 'selected' : ''} style="background:${bgDark};color:${textLight};">Cartão de Débito</option>
                            <option value="PIX" ${despesa?.forma_pagamento === 'PIX' ? 'selected' : ''} style="background:${bgDark};color:${textLight};">PIX</option>
                            <option value="Boleto" ${despesa?.forma_pagamento === 'Boleto' ? 'selected' : ''} style="background:${bgDark};color:${textLight};">Boleto</option>
                            <option value="Transferência" ${despesa?.forma_pagamento === 'Transferência' ? 'selected' : ''} style="background:${bgDark};color:${textLight};">Transferência</option>
                            <option value="Outros" ${despesa?.forma_pagamento === 'Outros' ? 'selected' : ''} style="background:${bgDark};color:${textLight};">Outros</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group" style="margin-bottom:14px;">
                    <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">📝 Observação</label>
                    <textarea id="despObservacao" rows="2" 
                              style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgDark};color:${textLight};font-size:14px;resize:vertical;">${escapeHtml(despesa?.observacao || '')}</textarea>
                </div>
                
                <div style="display:flex;gap:8px;margin-top:16px;">
                    <button type="submit" class="btn btn-primary" style="flex:1;">
                        <i class="fas fa-save"></i> ${isEdit ? 'Atualizar' : 'Salvar'} Despesa
                    </button>
                    <button type="button" class="btn btn-outline" onclick="fecharModalDespesa()">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;

    showModal(
        isEdit ? '✏️ Editar Despesa' : '➕ Nova Despesa',
        html,
        () => { }
    );

    setTimeout(() => {
        const select = document.getElementById('despCategoria');
        if (select) {
            select.addEventListener('change', function () {
                if (this.value === '__nova__') {
                    const novaCat = prompt('Digite o nome da nova categoria:');
                    if (novaCat && novaCat.trim()) {
                        const option = document.createElement('option');
                        option.value = novaCat.trim();
                        option.textContent = novaCat.trim();
                        option.style = `background:#1a1a2e;color:#e0e0e0;`;
                        option.selected = true;
                        this.insertBefore(option, this.querySelector('option[value="__nova__"]'));
                        this.value = novaCat.trim();
                    } else {
                        this.value = '';
                    }
                }
            });
        }
    }, 100);
}

async function salvarDespesa(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const descricao = document.getElementById('despDescricao').value.trim();
    const categoria = document.getElementById('despCategoria').value;
    const valor = parseFloat(document.getElementById('despValor').value);
    const data = document.getElementById('despData').value;
    const data_vencimento = document.getElementById('despVencimento').value || null;
    const pago = document.getElementById('despPago').value === '1';
    const forma_pagamento = document.getElementById('despFormaPagamento').value || null;
    const observacao = document.getElementById('despObservacao').value.trim() || null;

    if (!descricao || !categoria || !valor || !data) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }

    if (valor <= 0) {
        showToast('O valor deve ser maior que zero', 'error');
        return;
    }

    showLoading();

    try {
        const body = { descricao, categoria, valor, data, data_vencimento, pago, forma_pagamento, observacao };
        let url = '/api/despesas';
        let method = 'POST';

        if (despesaEditandoId) {
            url = `/api/despesas/${despesaEditandoId}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });

        const result = await res.json();

        if (result.success) {
            showToast(result.message, 'success');
            fecharModalDespesa();
            carregarFinanceiro();
        } else {
            showToast(result.message || 'Erro ao salvar despesa', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao salvar despesa', 'error');
    }

    hideLoading();
}

function editarDespesa(id) {
    const despesa = despesasData?.despesas?.find(d => d.id === id);
    if (despesa) {
        abrirModalDespesa(despesa);
    }
}

async function togglePagoDespesa(id, pago) {
    const token = localStorage.getItem('token');
    const despesa = despesasData?.despesas?.find(d => d.id === id);
    if (!despesa) return;

    showLoading();

    try {
        const body = {
            ...despesa,
            pago: pago === 1
        };
        delete body.id;
        delete body.created_at;
        delete body.updated_at;

        const res = await fetch(`/api/despesas/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });

        const result = await res.json();

        if (result.success) {
            showToast(result.message, 'success');
            carregarFinanceiro();
        } else {
            showToast(result.message || 'Erro ao atualizar status', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao atualizar status', 'error');
    }

    hideLoading();
}

async function excluirDespesa(id) {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;

    const token = localStorage.getItem('token');
    showLoading();

    try {
        const res = await fetch(`/api/despesas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const result = await res.json();

        if (result.success) {
            showToast(result.message, 'success');
            carregarFinanceiro();
        } else {
            showToast(result.message || 'Erro ao excluir despesa', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao excluir despesa', 'error');
    }

    hideLoading();
}

function fecharModalDespesa() {
    despesaEditandoId = null;
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string') {
            const match = dataStr.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (match) {
                const ano = parseInt(match[1]);
                const mes = parseInt(match[2]) - 1;
                const dia = parseInt(match[3]);
                const data = new Date(Date.UTC(ano, mes, dia));
                return data.toLocaleDateString('pt-BR');
            }
            const data = new Date(dataStr);
            if (!isNaN(data.getTime())) {
                return data.toLocaleDateString('pt-BR');
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
// TAB: ANÁLISE DIÁRIA
// ============================================

function renderTabAnaliseDiaria(isMobile) {
    return `
        <div class="card" style="padding:${isMobile ? '14px' : '20px'};">
            <div class="card-header" style="flex-direction:${isMobile ? 'column' : 'row'};align-items:${isMobile ? 'stretch' : 'center'};gap:${isMobile ? '10px' : '0'};">
                <h3 style="font-size:${isMobile ? '16px' : '18px'};margin:0;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-calendar-day" style="color:#8b5cf6;"></i> Análise Diária
                </h3>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <input type="month" id="filtroMesAnalise" value="${filtroAnoReceitas || ''}-${filtroMesReceitas || ''}" 
                           onchange="carregarAnaliseDiaria()" 
                           style="padding:6px 12px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-primary);font-size:12px;">
                    <button class="btn btn-outline btn-sm" onclick="carregarAnaliseDiaria()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
            </div>
            <div id="analiseDiariaContent">
                <div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-spinner fa-spin" style="font-size:24px;"></i>
                    <p>Carregando análise diária...</p>
                </div>
            </div>
        </div>
    `;
}

async function carregarAnaliseDiaria() {
    const token = localStorage.getItem('token');
    const mesInput = document.getElementById('filtroMesAnalise');
    let mes = mesInput?.value || `${filtroAnoReceitas || ''}-${filtroMesReceitas || ''}`;

    let mesNum, anoNum;
    if (mes) {
        const parts = mes.split('-');
        anoNum = parts[0];
        mesNum = parts[1];
    } else {
        const hoje = new Date();
        mesNum = String(hoje.getMonth() + 1).padStart(2, '0');
        anoNum = hoje.getFullYear();
    }

    try {
        const res = await fetch(`/api/financeiro/analise-diaria?mes=${mesNum}&ano=${anoNum}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            renderizarAnaliseDiaria(result.data, mesNum, anoNum);
        } else {
            document.getElementById('analiseDiariaContent').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar análise</h4>
                    <p>${result.message || 'Tente novamente'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('analiseDiariaContent').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Erro ao carregar análise</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderizarAnaliseDiaria(data, mesNum, anoNum) {
    const isMobile = window.innerWidth < 768;
    const dias = data.dias || [];
    const resumo = data.resumo || {};
    const sugestoes = data.sugestoes || [];

    // Resumo rápido
    let html = `
        <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(4,1fr)'};gap:12px;margin-bottom:16px;">
            <div style="background:var(--bg-card);border-radius:12px;padding:12px;border:1px solid var(--border-color);text-align:center;">
                <div style="font-size:20px;">📊</div>
                <div style="font-size:${isMobile ? '18px' : '22px'};font-weight:700;">${resumo.total_servicos || 0}</div>
                <div style="font-size:11px;color:var(--text-muted);">Total de serviços</div>
            </div>
            <div style="background:var(--bg-card);border-radius:12px;padding:12px;border:1px solid var(--border-color);text-align:center;">
                <div style="font-size:20px;">💰</div>
                <div style="font-size:${isMobile ? '18px' : '22px'};font-weight:700;color:#22c55e;">R$ ${(resumo.total_faturamento || 0).toFixed(2)}</div>
                <div style="font-size:11px;color:var(--text-muted);">Faturamento total</div>
            </div>
            <div style="background:var(--bg-card);border-radius:12px;padding:12px;border:1px solid var(--border-color);text-align:center;">
                <div style="font-size:20px;">📈</div>
                <div style="font-size:${isMobile ? '18px' : '22px'};font-weight:700;color:#8b5cf6;">${(resumo.media_servicos_por_dia || 0).toFixed(1)}</div>
                <div style="font-size:11px;color:var(--text-muted);">Média de serviços/dia</div>
            </div>
            <div style="background:var(--bg-card);border-radius:12px;padding:12px;border:1px solid var(--border-color);text-align:center;">
                <div style="font-size:20px;">⚠️</div>
                <div style="font-size:${isMobile ? '18px' : '22px'};font-weight:700;color:${resumo.dias_ruins > 0 ? '#ef4444' : '#22c55e'};">${resumo.dias_ruins || 0}</div>
                <div style="font-size:11px;color:var(--text-muted);">Dias com baixo movimento</div>
            </div>
        </div>
    `;

    // Calendário visual
    const diasNoMes = new Date(anoNum, mesNum, 0).getDate();
    const primeiroDiaSemana = new Date(anoNum, mesNum - 1, 1).getDay();

    html += `
        <div style="margin-bottom:16px;">
            <h4 style="font-size:14px;color:var(--text-primary);margin-bottom:8px;">
                📅 Mês ${String(mesNum).padStart(2, '0')}/${anoNum} - Dias
            </h4>
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:12px;">
                ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => `
                    <div style="text-align:center;padding:4px 0;font-weight:600;color:var(--text-muted);">${isMobile ? d.substring(0, 1) : d}</div>
                `).join('')}
                ${Array.from({ length: primeiroDiaSemana }, (_, i) => `
                    <div style="padding:4px;border-radius:6px;background:transparent;"></div>
                `).join('')}
                ${dias.map(d => {
        const isRuim = sugestoes.some(s => s.dia === d.dia);
        const fat = d.faturamento || 0;
        const corFundo = fat === 0 ? 'var(--bg-hover)' : (fat > resumo.media_faturamento_por_dia ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)');
        const corTexto = fat === 0 ? 'var(--text-muted)' : (fat > resumo.media_faturamento_por_dia ? '#22c55e' : '#ef4444');
        return `
                        <div style="
                            padding:${isMobile ? '6px 2px' : '8px 4px'}; 
                            border-radius:6px; 
                            text-align:center; 
                            background:${corFundo};
                            border: ${isRuim ? '2px solid #ef4444' : '1px solid var(--border-color)'};
                            cursor: default;
                            transition: 0.2s;
                        ">
                            <div style="font-weight:600;font-size:${isMobile ? '11px' : '14px'};color:var(--text-primary);">${d.dia}</div>
                            <div style="font-size:${isMobile ? '9px' : '11px'};color:${corTexto};">R$ ${fat.toFixed(2)}</div>
                            <div style="font-size:${isMobile ? '8px' : '10px'};color:var(--text-muted);">${d.qtd_servicos} serv.</div>
                            ${isRuim ? `<div style="font-size:9px;color:#ef4444;font-weight:700;">⚠️</div>` : ''}
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;

    // Sugestões de promoção
    if (sugestoes.length > 0) {
        html += `
            <div style="
                background:linear-gradient(135deg, rgba(239,68,68,0.1), rgba(139,92,246,0.1));
                border-radius:12px;
                padding:16px;
                border:1px solid rgba(239,68,68,0.3);
                margin-top:12px;
            ">
                <h4 style="font-size:14px;color:#ef4444;margin:0 0 8px 0;">
                    <i class="fas fa-bullhorn"></i> Sugestões de Promoção
                </h4>
                <ul style="list-style:none;padding:0;margin:0;">
                    ${sugestoes.map(s => `
                        <li style="padding:8px 12px;border-bottom:1px solid var(--border-color);display:flex;gap:8px;align-items:center;">
                            <span style="font-size:18px;">📢</span>
                            <span style="font-size:13px;color:var(--text-primary);">${s.sugestao}</span>
                        </li>
                    `).join('')}
                </ul>
                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="enviarPromocaoDiasRuins()" class="btn btn-primary btn-sm">
                        <i class="fas fa-paper-plane"></i> Enviar promoção para clientes
                    </button>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="
                background:rgba(34,197,94,0.1);
                border-radius:12px;
                padding:16px;
                border:1px solid rgba(34,197,94,0.3);
                text-align:center;
            ">
                <i class="fas fa-check-circle" style="color:#22c55e;font-size:20px;"></i>
                <p style="color:var(--text-primary);margin:4px 0 0;">Ótimo! Nenhum dia com baixo movimento neste mês. 👏</p>
            </div>
        `;
    }

    document.getElementById('analiseDiariaContent').innerHTML = html;
}

async function enviarPromocaoDiasRuins() {
    showToast('Funcionalidade em desenvolvimento: em breve você poderá enviar promoções automáticas!', 'info');
}

// ============================================
// LISTA DE CATEGORIAS (global)
// ============================================

const categoriasDisponiveis = [
    'Aluguel',
    'Água',
    'Energia Elétrica',
    'Internet',
    'Telefone',
    'Material de Consumo',
    'Equipamentos',
    'Manutenção',
    'Impostos',
    'Salários',
    'Comissões',
    'Marketing',
    'Limpeza',
    'Alimentação',
    'Transporte',
    'Outros'
];

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarFinanceiro = carregarFinanceiro;
window.switchFinanceiroTab = switchFinanceiroTab;
window.abrirModalDespesa = abrirModalDespesa;
window.salvarDespesa = salvarDespesa;
window.editarDespesa = editarDespesa;
window.togglePagoDespesa = togglePagoDespesa;
window.excluirDespesa = excluirDespesa;
window.fecharModalDespesa = fecharModalDespesa;
window.carregarReceitas = carregarReceitas;
window.aplicarFiltroReceitas = aplicarFiltroReceitas;
window.carregarDespesasTab = carregarDespesasTab;
window.aplicarFiltrosDespesasTab = aplicarFiltrosDespesasTab;
window.carregarComissoesTab = carregarComissoesTab;
window.carregarAnaliseDiaria = carregarAnaliseDiaria;
window.enviarPromocaoDiasRuins = enviarPromocaoDiasRuins;

console.log('✅ financeiro.js atualizado com TABS estilo configurações, COMPARATIVO MENSAL e ANÁLISE DIÁRIA!');

// ============================================
// ATUALIZAR AO REDIMENSIONAR
// ============================================

let resizeTimeoutFinanceiro;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeoutFinanceiro);
    resizeTimeoutFinanceiro = setTimeout(function () {
        if (document.querySelector('.financeiro-container')) {
            const activeTab = document.querySelector('.config-tab.active');
            if (activeTab) {
                const tabs = ['resumo', 'receitas', 'despesas', 'profissionais', 'analise'];
                const index = Array.from(document.querySelectorAll('.config-tab')).indexOf(activeTab);
                if (index >= 0 && index < tabs.length) {
                    switchFinanceiroTab(tabs[index]);
                }
            }
        }
    }, 300);
});