// pages/financeiro.js - Versão Mobile Friendly com Cards
let financeiroData = null;

async function carregarFinanceiro() {
    ativarBotao('financeiro');
    showLoading();

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    try {
        const res = await fetch('/api/financeiro', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            financeiroData = result.data;
            renderizarFinanceiro(financeiroData, usuario);
        } else {
            document.getElementById('content').innerHTML = `
                <div class="card">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Erro ao carregar financeiro</h4>
                        <p>${result.message || 'Tente novamente mais tarde.'}</p>
                        <button class="btn btn-primary btn-sm" onclick="carregarFinanceiro()">
                            <i class="fas fa-sync"></i> Tentar Novamente
                        </button>
                    </div>
                </div>
            `;
        }
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
// RENDERIZAR FINANCEIRO
// ============================================

function renderizarFinanceiro(data, usuario) {
    const totais = data.totais || {};
    const isMobile = window.innerWidth < 768;
    const isDono = usuario.role === 'dono';

    let html = `
        <div class="fade-in">
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
        // CARDS DO DONO
        // ============================================
        html += `
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${(totais.faturamento_bruto || 0).toFixed(2)}</div>
                        <div class="stat-label">Faturamento Bruto</div>
                        <div class="stat-sub">📈 Total de serviços</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon pink">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${(totais.total_comissoes || 0).toFixed(2)}</div>
                        <div class="stat-label">Comissões a Pagar</div>
                        <div class="stat-sub">Apenas serviços com profissional</div>
                    </div>
                </div>
                
                <div class="stat-card premium">
                    <div class="stat-icon">💎</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${(totais.faturamento_liquido || 0).toFixed(2)}</div>
                        <div class="stat-label">Faturamento Líquido</div>
                        <div class="stat-sub">Bruto - Comissões</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon green">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${totais.total_servicos || 0}</div>
                        <div class="stat-label">Serviços Concluídos</div>
                        <div class="stat-sub">Total realizados</div>
                    </div>
                </div>
            </div>
        `;

        // ============================================
        // COMISSÕES POR PROFISSIONAL (DONO)
        // ============================================
        if (data.comissoes_por_profissional && data.comissoes_por_profissional.length > 0) {
            html += `
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-users"></i> Comissões por Profissional</h3>
                        <span class="badge badge-info">${data.comissoes_por_profissional.length} profissionais</span>
                    </div>
            `;

            if (isMobile) {
                // ============================================
                // VERSÃO MOBILE - CARDS DE PROFISSIONAIS
                // ============================================
                html += `<div class="profissionais-cards-mobile">`;
                for (let prof of data.comissoes_por_profissional) {
                    html += `
                        <div class="profissional-card-mobile">
                            <div class="profissional-avatar">${prof.nome ? prof.nome.charAt(0).toUpperCase() : '?'}</div>
                            <div class="profissional-info">
                                <div class="profissional-nome">${escapeHtml(prof.nome)}</div>
                                <div class="profissional-stats">
                                    <span>${prof.total_servicos} serviços</span>
                                    <span class="profissional-comissao">R$ ${(prof.total_comissao || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
                html += `</div>`;
            } else {
                // ============================================
                // VERSÃO DESKTOP - TABELA DE PROFISSIONAIS
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
                                ${data.comissoes_por_profissional.map(prof => `
                                    <tr>
                                        <td><strong>${escapeHtml(prof.nome)}</strong></td>
                                        <td>${prof.total_servicos} serviço(s)</td>
                                        <td><span class="valor">R$ ${(prof.total_comissao || 0).toFixed(2)}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            html += `</div>`;
        }

    } else {
        // ============================================
        // CARDS DO PROFISSIONAL
        // ============================================
        html += `
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${(totais.total_comissoes || 0).toFixed(2)}</div>
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
    // HISTÓRICO DE SERVIÇOS CONCLUÍDOS
    // ============================================
    const comissoes = data.comissoes || [];

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
        // ============================================
        // VERSÃO MOBILE - CARDS DE HISTÓRICO
        // ============================================
        html += `<div class="historico-cards-mobile">`;
        for (let item of comissoes) {
            const profissionalDisplay = item.profissional_nome || 'Sem profissional';
            const comissaoDisplay = item.comissao && item.comissao > 0 ?
                `R$ ${(item.comissao || 0).toFixed(2)}` :
                '<span style="color: var(--gray);">R$ 0,00</span>';
            const temProfissional = item.profissional_id ? true : false;

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
                            <span class="info-value valor-mobile">R$ ${(item.valor || 0).toFixed(2)}</span>
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
        // ============================================
        // VERSÃO DESKTOP - TABELA DE HISTÓRICO
        // ============================================
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
            const profissionalDisplay = item.profissional_nome || 'Sem profissional';
            const comissaoDisplay = item.comissao && item.comissao > 0 ?
                `R$ ${(item.comissao || 0).toFixed(2)}` :
                '<span style="color: var(--gray);">R$ 0,00</span>';
            const temProfissional = item.profissional_id ? true : false;

            return `
                                <tr>
                                    <td>${formatarDataBr(item.data)}</td>
                                    <td>${escapeHtml(item.cliente_nome || 'N/A')}</td>
                                    <td>${escapeHtml(item.servico_nome || item.servico || 'N/A')}</td>
                                    <td><span class="valor">R$ ${(item.valor || 0).toFixed(2)}</span></td>
                                    <td class="${!temProfissional ? 'text-muted' : ''}">${escapeHtml(profissionalDisplay)}</td>
                                    <td><span class="${temProfissional ? 'valor' : 'text-muted'}">${comissaoDisplay}</span></td>
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
// FUNÇÕES AUXILIARES
// ============================================

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        const data = new Date(dataStr + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
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
// ATUALIZAR AO REDIMENSIONAR A TELA
// ============================================

let resizeTimeoutFinanceiro;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeoutFinanceiro);
    resizeTimeoutFinanceiro = setTimeout(function () {
        if (document.querySelector('.financeiro-container') || document.getElementById('content')) {
            // Recarregar se estiver na página de financeiro
            const content = document.getElementById('content');
            if (content && content.innerHTML.includes('💰 Financeiro')) {
                const usuario = JSON.parse(localStorage.getItem('usuario'));
                if (financeiroData) {
                    renderizarFinanceiro(financeiroData, usuario);
                }
            }
        }
    }, 300);
});

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarFinanceiro = carregarFinanceiro;