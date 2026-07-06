
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
// FINANCEIRO COMPLETO - COM DESPESAS
// ============================================

let financeiroData = null;
let despesasData = null;
let filtroMesAtual = null;
let filtroAnoAtual = null;
let filtroCategoriaAtual = null;
let filtroPagoAtual = null;
let despesaEditandoId = null;

// ============================================
// CARREGAR FINANCEIRO
// ============================================

async function carregarFinanceiro() {
    ativarBotao('financeiro');
    showLoading();

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    const hoje = new Date();
    filtroMesAtual = filtroMesAtual || String(hoje.getMonth() + 1).padStart(2, '0');
    filtroAnoAtual = filtroAnoAtual || String(hoje.getFullYear());

    try {
        const [financeiroRes, despesasRes, categoriasRes] = await Promise.all([
            fetch('/api/financeiro', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch(`/api/despesas?mes=${filtroMesAtual}&ano=${filtroAnoAtual}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch('/api/despesas/categorias', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
        ]);

        const financeiroResult = await financeiroRes.json();
        const despesasResult = await despesasRes.json();
        const categoriasResult = await categoriasRes.json();

        if (financeiroResult.success) {
            financeiroData = financeiroResult.data;
        }

        if (despesasResult.success) {
            despesasData = despesasResult.data;
            // 🔥 CORRIGIR: Garantir que totais sejam números
            if (despesasData.totais) {
                despesasData.totais.total = parseFloat(despesasData.totais.total) || 0;
                despesasData.totais.pago = parseFloat(despesasData.totais.pago) || 0;
                despesasData.totais.pendente = parseFloat(despesasData.totais.pendente) || 0;
            }
        }

        const categorias = categoriasResult.success ? categoriasResult.data : [];

        renderizarFinanceiroCompleto(financeiroData, despesasData, categorias, usuario);

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
// RENDERIZAR FINANCEIRO COMPLETO
// ============================================

function renderizarFinanceiroCompleto(financeiro, despesas, categorias, usuario) {
    const totais = financeiro?.totais || {};
    const isMobile = window.innerWidth < 768;
    const isDono = usuario.role === 'dono';

    let html = `
        <div class="fade-in financeiro-container">
            <!-- Header -->
            <div class="dashboard-header">
                <div>
                    <h2 class="page-title">💰 Financeiro</h2>
                    <p class="page-subtitle">
                        <i class="fas fa-chart-line"></i> 
                        ${isDono ? 'Visão completa das finanças' : 'Suas comissões'}
                    </p>
                </div>
                <div class="dashboard-actions">
                    <button class="btn btn-outline btn-sm" onclick="carregarFinanceiro()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                </div>
            </div>
    `;

    if (isDono) {
        // ============================================
        // CARDS DO DONO (RECEITAS)
        // ============================================
        const despesasTotais = despesas?.totais || {};

        html += `
            <div style="margin-bottom: 8px;">
                <h3 style="font-size:14px;color:var(--text-muted);margin-bottom:12px;">
                    📊 RESULTADO DO MÊS
                </h3>
                <div class="card-grid">
                    <div class="stat-card premium">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-value">R$ ${(parseFloat(totais.faturamento_bruto) || 0).toFixed(2)}</div>
                            <div class="stat-label">Faturamento Bruto</div>
                            <div class="stat-sub">📈 Total de serviços</div>
                        </div>
                    </div>
                    
                    <div class="stat-card" style="border-left: 4px solid #e53e3e;">
                        <div class="stat-icon" style="background: #fee2e2;color:#dc2626;">📉</div>
                        <div class="stat-content">
                            <div class="stat-value" style="color:#dc2626;">- R$ ${(parseFloat(despesasTotais.total) || 0).toFixed(2) || '0.00'}</div>
                            <div class="stat-label">Total de Despesas</div>
                            <div class="stat-sub">${despesasTotais.quantidade || 0} despesas</div>
                        </div>
                    </div>
                    
                    <div class="stat-card premium" style="border-left: 4px solid #16a34a;">
                        <div class="stat-icon" style="background: #dcfce7;color:#16a34a;">💰</div>
                        <div class="stat-content">
                            <div class="stat-value" style="color:#16a34a;">
                                R$ ${((parseFloat(totais.faturamento_bruto) || 0) - (parseFloat(despesasTotais.total) || 0)).toFixed(2)}
                            </div>
                            <div class="stat-label">Lucro Líquido</div>
                            <div class="stat-sub">Bruto - Despesas</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">💎</div>
                        <div class="stat-content">
                            <div class="stat-value">R$ ${(parseFloat(totais.faturamento_liquido) || 0).toFixed(2)}</div>
                            <div class="stat-label">Lucro após Comissões</div>
                            <div class="stat-sub">Bruto - Comissões</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ============================================
        // DETALHES DE RECEITAS E DESPESAS
        // ============================================
        html += `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-arrow-up" style="color:#16a34a;"></i> Receitas</h3>
                        <span class="badge badge-success">R$ ${(parseFloat(totais.faturamento_bruto) || 0).toFixed(2)}</span>
                    </div>
                    <div style="padding:12px;">
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                            <span>✅ Serviços Concluídos</span>
                            <span><strong>${totais.total_servicos || 0}</strong></span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:8px 0;">
                            <span>💰 Valor Médio por Serviço</span>
                            <span><strong>R$ ${(totais.total_servicos ? (totais.faturamento_bruto || 0) / totais.total_servicos : 0).toFixed(2)}</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-arrow-down" style="color:#dc2626;"></i> Despesas</h3>
                        <span class="badge badge-danger">R$ ${(parseFloat(despesasTotais.total) || 0).toFixed(2) || '0.00'}</span>
                    </div>
                    <div style="padding:12px;">
                        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
                            <span>💳 Pagas</span>
                            <span><strong>R$ ${(parseFloat(despesasTotais.pago) || 0).toFixed(2) || '0.00'}</strong></span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:8px 0;">
                            <span>⏳ Pendentes</span>
                            <span><strong style="color:#dc2626;">R$ ${(parseFloat(despesasTotais.pendente) || 0).toFixed(2) || '0.00'}</strong></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // ============================================
        // COMISSÕES POR PROFISSIONAL
        // ============================================
        if (financeiro?.comissoes_por_profissional && financeiro.comissoes_por_profissional.length > 0) {
            const isMobileComissoes = window.innerWidth < 768;

            html += `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-users"></i> Comissões por Profissional</h3>
                <span class="badge badge-info">${financeiro.comissoes_por_profissional.length} profissionais</span>
            </div>
    `;

            if (isMobileComissoes) {
                // ============================================
                // VERSÃO MOBILE - CARDS DE COMISSÕES
                // ============================================
                html += `<div class="comissoes-cards-mobile">`;

                for (let prof of financeiro.comissoes_por_profissional) {
                    const inicial = prof.nome ? prof.nome.charAt(0).toUpperCase() : '?';
                    const totalComissao = parseFloat(prof.total_comissao) || 0;

                    html += `
                <div class="comissao-card-mobile">
                    <div class="comissao-avatar">${inicial}</div>
                    <div class="comissao-info">
                        <span class="comissao-nome">${escapeHtml(prof.nome)}</span>
                        <span class="comissao-detalhes">${prof.total_servicos} serviço(s)</span>
                    </div>
                    <div class="comissao-valor">R$ ${totalComissao.toFixed(2)}</div>
                </div>
            `;
                }

                html += `</div>`;
            } else {
                // ============================================
                // VERSÃO DESKTOP - TABELA
                // ============================================
                html += `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Profissional</th>
                            <th>Serviços</th>
                            <th>Total Comissão</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${financeiro.comissoes_por_profissional.map(prof => `
                            <tr>
                                <td><strong>${escapeHtml(prof.nome)}</strong></td>
                                <td>${prof.total_servicos} serviço(s)</td>
                                <td><span class="valor">R$ ${(parseFloat(prof.total_comissao) || 0).toFixed(2)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
            }

            html += `</div>`;
        }
        // ============================================
        // DESPESAS - LISTA COMPLETA
        // ============================================
        html += `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-receipt"></i> Despesas</h3>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" onclick="abrirModalDespesa()">
                            <i class="fas fa-plus"></i> Nova Despesa
                        </button>
                    </div>
                </div>
                
                <!-- Filtros -->
                <div style="padding:12px;display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--border);">
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <select id="filtroCategoriaDespesa" onchange="aplicarFiltrosDespesas()" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;">
                            <option value="">Todas Categorias</option>
                            ${categorias.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('')}
                        </select>
                        
                        <select id="filtroPagoDespesa" onchange="aplicarFiltrosDespesas()" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;">
                            <option value="">Todos</option>
                            <option value="true">✅ Pagas</option>
                            <option value="false">⏳ Pendentes</option>
                        </select>
                        
                        <input type="month" id="filtroMesDespesa" value="${filtroAnoAtual}-${filtroMesAtual}" 
                               onchange="aplicarFiltrosDespesas()" 
                               style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;">
                    </div>
                </div>
        `;

        // Tabela de Despesas
        const despesasLista = despesas?.despesas || [];
        const isMobile = window.innerWidth < 768;

        if (despesasLista.length === 0) {
            html += `
        <div class="empty-state">
            <i class="fas fa-receipt"></i>
            <h4>Nenhuma despesa cadastrada</h4>
            <p>Clique em "Nova Despesa" para começar a controlar seus custos</p>
        </div>
    `;
        } else if (isMobile) {
            // ============================================
            // VERSÃO MOBILE - CARDS DE DESPESAS
            // ============================================
            html += `<div class="despesas-cards-mobile">`;

            for (let d of despesasLista) {
                const statusClass = d.pago ? 'pago' : 'pendente';
                const statusLabel = d.pago ? '✅ Paga' : '⏳ Pendente';
                const formaPagamento = d.forma_pagamento || 'Não informado';

                html += `
            <div class="despesa-card-mobile">
                <div class="despesa-header">
                    <div class="despesa-info">
                        <span class="despesa-descricao">${escapeHtml(d.descricao)}</span>
                        <span class="despesa-categoria">📂 ${escapeHtml(d.categoria)}</span>
                        <span class="despesa-data">📅 ${formatarDataBr(d.data)}</span>
                    </div>
                    <span class="despesa-status ${statusClass}">${statusLabel}</span>
                </div>
                
                <div class="despesa-valor">R$ ${(parseFloat(d.valor) || 0).toFixed(2)}</div>
                
                <div class="despesa-pagamento">
                    <span class="pagamento-icon">💳</span>
                    ${escapeHtml(formaPagamento)}
                    ${d.data_vencimento ? `| 📅 Venc: ${formatarDataBr(d.data_vencimento)}` : ''}
                </div>
                
                <div class="despesa-actions">
                    <button class="btn-icon btn-edit" onclick="editarDespesa(${d.id})" title="Editar">
                        <i class="fas fa-pen"></i> Editar
                    </button>
                    <button class="btn-icon btn-toggle ${statusClass}" onclick="togglePagoDespesa(${d.id}, ${d.pago ? 0 : 1})" title="${d.pago ? 'Marcar como pendente' : 'Marcar como paga'}">
                        <i class="fas ${d.pago ? 'fa-undo' : 'fa-check'}"></i> ${d.pago ? 'Desfazer' : 'Pagar'}
                    </button>
                    <button class="btn-icon btn-delete" onclick="excluirDespesa(${d.id})" title="Excluir">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;
            }

            html += `</div>`;
        } else {
            // ============================================
            // VERSÃO DESKTOP - TABELA
            // ============================================
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
                    ${despesasLista.map(d => `
                        <tr>
                            <td>${formatarDataBr(d.data)}</td>
                            <td>${escapeHtml(d.descricao)}</td>
                            <td><span class="badge badge-info">${escapeHtml(d.categoria)}</span></td>
                            <td><span class="valor">R$ ${(parseFloat(d.valor) || 0).toFixed(2)}</span></td>
                            <td>
                                ${d.pago
                    ? '<span class="badge badge-success">✅ Paga</span>'
                    : `<span class="badge badge-warning">⏳ Pendente</span>`
                }
                            </td>
                            <td>
                                <div style="display:flex;gap:4px;">
                                    <button class="btn btn-outline btn-sm" onclick="editarDespesa(${d.id})" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="togglePagoDespesa(${d.id}, ${d.pago ? 0 : 1})" title="${d.pago ? 'Marcar como pendente' : 'Marcar como paga'}">
                                        <i class="fas ${d.pago ? 'fa-undo' : 'fa-check'}"></i>
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="excluirDespesa(${d.id})" title="Excluir" style="color:#dc2626;">
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

        html += `</div>`;

    } else {
        // ============================================
        // PROFISSIONAL - CARDS SIMPLES
        // ============================================
        html += `
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${(parseFloat(totais.total_comissoes) || 0).toFixed(2)}</div>
                        <div class="stat-label">Total em Comissões</div>
                        <div class="stat-sub">Todos os serviços concluídos</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon green">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${totais.total_servicos || 0}</div>
                        <div class="stat-label">Serviços Concluídos</div>
                        <div class="stat-sub">Total realizados por você</div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================
    // HISTÓRICO DE SERVIÇOS (comum para todos)
    // ============================================
    const comissoes = financeiro?.comissoes || [];

    html += `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-history"></i> Histórico de Serviços Concluídos</h3>
                <span class="badge badge-info">${comissoes.length} registros</span>
            </div>
    `;

    if (comissoes.length === 0) {
        html += `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <h4>Nenhum serviço concluído ainda</h4>
                <p>Os serviços aparecerão aqui quando forem concluídos</p>
            </div>
        `;
    } else if (isMobile) {
        html += `<div class="historico-cards-mobile">`;
        for (let item of comissoes) {
            const temProfissional = item.profissional_id ? true : false;
            const profissionalDisplay = item.profissional_nome || 'Sem profissional';
            let comissaoDisplay = '<span style="color: var(--gray);">R$ 0,00</span>';
            if (temProfissional) {
                comissaoDisplay = `R$ ${(parseFloat(item.comissao) || 0).toFixed(2)}`;
            }

            html += `
                <div class="historico-card-mobile">
                    <div class="historico-card-header">
                        <div>
                            <span class="historico-cliente">${escapeHtml(item.cliente_nome || 'N/A')}</span>
                            <span class="historico-servico">${escapeHtml(item.servico_nome || item.servico || 'N/A')}</span>
                        </div>
                        <span class="historico-data">${formatarDataBr(item.data)}</span>
                    </div>
                    <div class="historico-card-body">
                        <div class="info-row">
                            <span class="info-label">💰 Valor</span>
                            <span class="info-value valor-mobile">R$ ${(parseFloat(item.valor) || 0).toFixed(2)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">👨‍💼 Profissional</span>
                            <span class="info-value ${!temProfissional ? 'text-muted' : ''}">${escapeHtml(profissionalDisplay)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">💰 Comissão</span>
                            <span class="info-value ${temProfissional ? 'valor-mobile' : 'text-muted'}">${comissaoDisplay}</span>
                        </div>
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
            const temProfissional = item.profissional_id ? true : false;
            let comissaoDisplay = '<span style="color: var(--gray);">R$ 0,00</span>';
            if (temProfissional) {
                comissaoDisplay = `<span class="valor">R$ ${(parseFloat(item.comissao) || 0).toFixed(2)}</span>`;
            }
            return `
                                <tr>
                                    <td>${formatarDataBr(item.data)}</td>
                                    <td>${escapeHtml(item.cliente_nome || 'N/A')}</td>
                                    <td>${escapeHtml(item.servico_nome || item.servico || 'N/A')}</td>
                                    <td><span class="valor">R$ ${(parseFloat(item.valor) || 0).toFixed(2)}</span></td>
                                    <td class="${!temProfissional ? 'text-muted' : ''}">${escapeHtml(item.profissional_nome || 'Sem profissional')}</td>
                                    <td>${comissaoDisplay}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    html += `</div></div>`;

    document.getElementById('content').innerHTML = html;
}

// ============================================
// FUNÇÕES DE FILTRO
// ============================================

function aplicarFiltrosDespesas() {
    const mes = document.getElementById('filtroMesDespesa').value;
    if (mes) {
        const [ano, mesNum] = mes.split('-');
        filtroAnoAtual = ano;
        filtroMesAtual = mesNum;
    }

    const categoria = document.getElementById('filtroCategoriaDespesa').value;
    filtroCategoriaAtual = categoria || null;

    const pago = document.getElementById('filtroPagoDespesa').value;
    filtroPagoAtual = pago || null;

    carregarFinanceiro();
}

// ============================================
// MODAL DE DESPESA
// ============================================

function abrirModalDespesa(despesa = null) {
    const isEdit = !!despesa;
    despesaEditandoId = despesa?.id || null;

    const hoje = new Date().toISOString().split('T')[0];

    // 🔥 CORES FIXAS PARA O TEMA ESCURO
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
                        <select id="despCategoria" style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgSelect};color:${textLight};font-size:14px;appearance:auto;-webkit-appearance:auto;" required>
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
                        <select id="despPago" style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgSelect};color:${textLight};font-size:14px;appearance:auto;-webkit-appearance:auto;">
                            <option value="0" ${!despesa?.pago ? 'selected' : ''} style="background:${bgDark};color:${textLight};">⏳ Pendente</option>
                            <option value="1" ${despesa?.pago ? 'selected' : ''} style="background:${bgDark};color:${textLight};">✅ Paga</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom:14px;">
                        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:4px;color:#c0c0d0;">💳 Forma de Pagamento</label>
                        <select id="despFormaPagamento" style="width:100%;padding:10px 12px;border:1px solid ${borderDark};border-radius:8px;background:${bgSelect};color:${textLight};font-size:14px;appearance:auto;-webkit-appearance:auto;">
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

    // Listener para nova categoria
    setTimeout(() => {
        const select = document.getElementById('despCategoria');
        if (select) {
            select.addEventListener('change', function () {
                if (this.value === '__nova__') {
                    const novaCat = prompt('Digite o nome da nova categoria:');
                    if (novaCat && novaCat.trim()) {
                        // Adicionar ao select
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

// ============================================
// SALVAR DESPESA
// ============================================

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

// ============================================
// EDIÇÃO E EXCLUSÃO DE DESPESAS
// ============================================

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

// ============================================
// FECHAR MODAL
// ============================================

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
window.abrirModalDespesa = abrirModalDespesa;
window.salvarDespesa = salvarDespesa;
window.editarDespesa = editarDespesa;
window.togglePagoDespesa = togglePagoDespesa;
window.excluirDespesa = excluirDespesa;
window.fecharModalDespesa = fecharModalDespesa;
window.aplicarFiltrosDespesas = aplicarFiltrosDespesas;

// ============================================
// ATUALIZAR AO REDIMENSIONAR
// ============================================

let resizeTimeoutFinanceiro;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeoutFinanceiro);
    resizeTimeoutFinanceiro = setTimeout(function () {
        if (document.querySelector('.financeiro-container')) {
            const usuario = JSON.parse(localStorage.getItem('usuario'));
            if (financeiroData) {
                renderizarFinanceiroCompleto(financeiroData, despesasData, categoriasDisponiveis, usuario);
            }
        }
    }, 300);
});