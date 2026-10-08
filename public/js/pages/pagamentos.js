// ============================================
// PÁGINA: PAGAMENTOS — SUPER ADMIN
// ============================================

let pagamentosData = [];
let pagamentosStats = {};

// ============================================
// RENDER PRINCIPAL
// ============================================
async function carregarPagamentos() {
    console.log('💰 Carregando página de Pagamentos...');
    if (typeof ativarBotao === 'function') ativarBotao('pagamentos');
    if (typeof showLoading === 'function') showLoading();

    const content = document.getElementById('content');
    if (!content) return;

    // Skeleton
    content.innerHTML = `
        <div style="padding: 28px; max-width: 1200px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #14142a, #1a1a3a); border-radius: 20px; padding: 32px; border: 1px solid rgba(255,255,255,0.04);">
                <div style="color: #94a3b8; font-size: 16px;">💰 Carregando pagamentos...</div>
            </div>
        </div>
    `;

    const token = localStorage.getItem('token');

    try {
        const [pagRes, statsRes] = await Promise.all([
            fetch('/api/admin/pagamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/pagamentos/stats', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const pagJson = await pagRes.json();
        const statsJson = await statsRes.json();

        pagamentosData = pagJson.data || [];
        pagamentosStats = statsJson.data || {};

        renderizarPagina();

        if (typeof hideLoading === 'function') hideLoading();
    } catch (err) {
        console.error('❌ Erro:', err);
        content.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                <h3 style="color: #ef4444; margin: 0 0 8px;">Erro ao carregar</h3>
                <p style="color: #94a3b8;">${err.message}</p>
                <button onclick="carregarPagamentos()" style="margin-top: 16px; background: #667eea; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Tentar novamente</button>
            </div>
        `;
        if (typeof hideLoading === 'function') hideLoading();
    }
}

// ============================================
// RENDERIZA
// ============================================
function renderizarPagina() {
    const isMobile = window.innerWidth < 768;
    const isVeryMobile = window.innerWidth < 480;

    const stats = pagamentosStats;
    const lista = pagamentosData;

    const html = `
        <div style="padding: ${isVeryMobile ? '16px' : isMobile ? '20px' : '28px'}; max-width: 1400px; margin: 0 auto; font-family: 'Inter', -apple-system, sans-serif;">

            <!-- Header -->
            <div style="margin-bottom: 24px;">
                <h1 style="margin: 0; font-size: ${isVeryMobile ? '24px' : isMobile ? '28px' : '32px'}; color: #fff; font-weight: 700;">
                    💰 Pagamentos
                </h1>
                <p style="margin: 8px 0 0; color: #94a3b8; font-size: ${isMobile ? '14px' : '16px'};">
                    Gerencie as mensalidades das empresas
                </p>
            </div>

            <!-- Stats cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${renderStatCard('📋', 'Total', stats.total || 0, '#667eea', isMobile)}
                ${renderStatCard('✅', 'Pagos', stats.pagos || 0, '#22c55e', isMobile)}
                ${renderStatCard('⏳', 'Pendentes', stats.pendentes || 0, '#f59e0b', isMobile)}
                ${renderStatCard('🔴', 'Atrasados', stats.atrasados || 0, '#ef4444', isMobile)}
                ${renderStatCard('💰', 'Em aberto', 'R$ ' + formatarMoeda(stats.valor_aberto || 0), '#ec4899', isMobile)}
            </div>

            <!-- Tabela -->
            <div style="background: linear-gradient(135deg, #14142a, #1a1a3a); border-radius: 16px; border: 1px solid rgba(255,255,255,0.04); overflow: hidden;">
                <div style="padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 style="margin: 0; color: #fff; font-size: 18px; font-weight: 600;">
                        Lista de Pagamentos <span style="color: #94a3b8; font-weight: 400;">(${lista.length})</span>
                    </h3>
                    <button onclick="carregarPagamentos()" style="background: rgba(102,126,234,0.15); border: 1px solid rgba(102,126,234,0.3); color: #667eea; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        🔄 Atualizar
                    </button>
                </div>

                ${lista.length === 0 ? `
                    <div style="padding: 60px 24px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                        <h3 style="color: #fff; margin: 0 0 8px; font-weight: 600;">Nenhum pagamento encontrado</h3>
                        <p style="color: #94a3b8; margin: 0;">Os pagamentos aparecem aqui quando o job de cobrança gera</p>
                    </div>
                ` : `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; min-width: ${isMobile ? '700px' : 'auto'};">
                            <thead>
                                <tr style="background: rgba(255,255,255,0.02);">
                                    <th style="padding: 14px 20px; text-align: left; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Empresa</th>
                                    <th style="padding: 14px 20px; text-align: left; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Mês</th>
                                    <th style="padding: 14px 20px; text-align: right; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Valor</th>
                                    <th style="padding: 14px 20px; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Vence</th>
                                    <th style="padding: 14px 20px; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                                    <th style="padding: 14px 20px; text-align: center; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lista.map(p => renderLinhaPagamento(p, isMobile)).join('')}
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
}

// ============================================
// HELPERS
// ============================================
function renderStatCard(icon, label, value, color, isMobile) {
    return `
        <div style="background: linear-gradient(135deg, #14142a, #1a1a3a); border-radius: 14px; padding: ${isMobile ? '16px' : '20px'}; border: 1px solid rgba(255,255,255,0.04); position: relative; overflow: hidden;">
            <div style="font-size: ${isMobile ? '24px' : '28px'}; margin-bottom: 8px;">${icon}</div>
            <div style="color: #94a3b8; font-size: ${isMobile ? '12px' : '13px'}; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
            <div style="color: ${color}; font-size: ${isMobile ? '22px' : '26px'}; font-weight: 700; margin-top: 4px;">${value}</div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, ${color}, transparent);"></div>
        </div>
    `;
}

function renderLinhaPagamento(p, isMobile) {
    const statusCfg = {
        'pago': { label: '✅ Pago', bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
        'pendente': { label: '⏳ Pendente', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
        'atrasado': { label: '🔴 Atrasado', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
        'reembolsado': { label: '↩️ Reembolsado', bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
        'cancelado': { label: '❌ Cancelado', bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' }
    };
    const st = statusCfg[p.status] || { label: p.status, bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' };

    const podeMarcarPago = p.status === 'atrasado' || p.status === 'pendente';

    return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
            <td style="padding: 14px 20px; color: #e2e8f0; font-weight: 500; font-size: 14px;">
                ${escapeHtml(p.empresa_nome)}
                ${p.plano_nome ? `<div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">Plano: ${escapeHtml(p.plano_nome)}</div>` : ''}
            </td>
            <td style="padding: 14px 20px; color: #94a3b8; font-size: 14px;">${p.mes_referencia}</td>
            <td style="padding: 14px 20px; color: #fff; font-weight: 600; text-align: right; font-size: 14px;">R$ ${formatarMoeda(p.valor)}</td>
            <td style="padding: 14px 20px; color: #94a3b8; text-align: center; font-size: 13px; white-space: nowrap;">${formatarDataBr(p.data_vencimento)}</td>
            <td style="padding: 14px 20px; text-align: center;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; background: ${st.bg}; color: ${st.color}; white-space: nowrap;">${st.label}</span>
            </td>
            <td style="padding: 14px 20px; text-align: center;">
                ${podeMarcarPago ? `
                    <button onclick="abrirModalMarcarPago(${p.id})" style="background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; white-space: nowrap; transition: all 0.2s;" onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'">
                        ✅ Marcar pago
                    </button>
                ` : `
                    <span style="color: #64748b; font-size: 12px;">
                        ${p.data_pagamento ? 'Pago em ' + new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '—'}
                    </span>
                `}
            </td>
        </tr>
    `;
}

// ============================================
// MODAL — MARCAR COMO PAGO
// ============================================
function abrirModalMarcarPago(pagamentoId) {
    const pagamento = pagamentosData.find(p => p.id === pagamentoId);
    if (!pagamento) return;

    const modalAntigo = document.getElementById('modalMarcarPago');
    if (modalAntigo) modalAntigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modalMarcarPago';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
    `;
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a3e, #0f0f1a); border-radius: 20px; padding: 28px; max-width: 480px; width: 90%; border: 1px solid rgba(34,197,94,0.2); box-shadow: 0 20px 60px rgba(0,0,0,0.9);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="color:#fff;font-size:22px;margin:0;">💰 Marcar como pago</h3>
                <button onclick="fecharModalMarcarPago()" style="background:transparent;border:none;color:#94a3b8;font-size:28px;cursor:pointer;padding:0 10px;">&times;</button>
            </div>

            <div style="background:rgba(255,255,255,0.03);border-radius:12px;padding:16px;margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:#94a3b8;font-size:14px;">Empresa</span>
                    <span style="color:#fff;font-weight:600;font-size:14px;">${escapeHtml(pagamento.empresa_nome)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:#94a3b8;font-size:14px;">Mês</span>
                    <span style="color:#fff;font-weight:600;font-size:14px;">${pagamento.mes_referencia}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
                    <span style="color:#94a3b8;font-size:14px;">Venceu em</span>
                    <span style="color:#fff;font-weight:600;font-size:14px;">${formatarDataBr(pagamento.data_vencimento)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px 0 4px;">
                    <span style="color:#94a3b8;font-size:14px;font-weight:600;">Valor</span>
                    <span style="color:#22c55e;font-weight:700;font-size:20px;">R$ ${formatarMoeda(pagamento.valor)}</span>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <label style="display:block;color:#e2e8f0;font-weight:500;font-size:14px;margin-bottom:8px;">Forma de pagamento</label>
                <select id="metodoPagamento" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:15px;outline:none;">
                    <option value="pix">🔷 PIX</option>
                    <option value="boleto">📄 Boleto</option>
                    <option value="cartao">💳 Cartão</option>
                    <option value="dinheiro">💵 Dinheiro</option>
                    <option value="transferencia">🏦 Transferência</option>
                    <option value="manual">✍️ Outro (manual)</option>
                </select>
            </div>

            <div style="margin-bottom:20px;">
                <label style="display:block;color:#e2e8f0;font-weight:500;font-size:14px;margin-bottom:8px;">Observação (opcional)</label>
                <input type="text" id="observacaoPagamento" placeholder="Ex: Pago via PIX direto" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:14px;outline:none;box-sizing:border-box;">
            </div>

            <div style="display:flex;gap:12px;">
                <button onclick="fecharModalMarcarPago()" style="flex:1;padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#94a3b8;cursor:pointer;font-size:15px;font-weight:600;">Cancelar</button>
                <button onclick="confirmarMarcarPago(${pagamento.id})" id="btnConfirmarPagamento" style="flex:2;padding:14px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:15px;cursor:pointer;">
                    ✅ Confirmar pagamento
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function fecharModalMarcarPago() {
    const modal = document.getElementById('modalMarcarPago');
    if (modal) modal.remove();
}

// ============================================
// CONFIRMAR PAGAMENTO
// ============================================
async function confirmarMarcarPago(pagamentoId) {
    const btn = document.getElementById('btnConfirmarPagamento');
    const metodo = document.getElementById('metodoPagamento')?.value || 'manual';
    const observacao = document.getElementById('observacaoPagamento')?.value || '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Processando...';
    }

    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/admin/pagamentos/${pagamentoId}/marcar-pago`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ metodo, observacao })
        });

        const data = await res.json();

        if (data.success) {
            if (typeof showToast === 'function') {
                showToast('✅ Pagamento confirmado! Empresa liberada.', 'success');
            }
            fecharModalMarcarPago();
            setTimeout(() => carregarPagamentos(), 600);
        } else {
            if (typeof showToast === 'function') {
                showToast('❌ ' + (data.message || 'Erro ao confirmar'), 'error');
            }
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '✅ Confirmar pagamento';
            }
        }
    } catch (err) {
        console.error('❌ Erro:', err);
        if (typeof showToast === 'function') {
            showToast('❌ Erro de conexão', 'error');
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '✅ Confirmar pagamento';
        }
    }
}

// ============================================
// EXPORTAR GLOBAL
// ============================================
window.carregarPagamentos = carregarPagamentos;
window.abrirModalMarcarPago = abrirModalMarcarPago;
window.fecharModalMarcarPago = fecharModalMarcarPago;
window.confirmarMarcarPago = confirmarMarcarPago;

console.log('✅ pagamentos.js carregado');