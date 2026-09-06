// public/js/pages/planos.js
// ============================================
// PLANOS.JS - SEE&AGENDE
// Versão melhorada com pagamento real
// ============================================

let periodoSelecionado = 'mensal';
let modoPagamento = null;
// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    // Remover toasts existentes
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        padding: 18px 28px;
        background: ${colors[type] || '#22c55e'};
        color: white;
        border-radius: 14px;
        font-weight: 600;
        font-size: 15px;
        z-index: 99999;
        box-shadow: 0 8px 30px rgba(0,0,0,0.25);
        animation: slideInRight 0.4s ease;
        max-width: 450px;
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border: 1px solid rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
    `;
    
    toast.innerHTML = `
        <span style="font-size: 24px;">${icons[type] || '✅'}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Adicionar estilo de animação se não existir
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remover após 4 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 4000);
}
const PLANOS_CONFIG = {
    teste: {
        id: 'teste',
        nome: '💰 Teste R$ 1,00',
        valor_mensal: 1.00,
        valor_anual: 12.00,
        profs: 1,
        agendamentos: '10/mês',
        cor: '#10b981',
        popular: false,
        recursos: [
            '✅ Plano de teste',
            '✅ Apenas R$ 1,00',
            '✅ Para validar pagamento',
            '✅ Válido por 1 dia'
        ],
        limitacoes: [
            '❌ Apenas 1 profissional',
            '❌ 10 agendamentos/mês',
            '❌ Sem WhatsApp',
            '❌ Sem promoções',
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
        cor: '#667eea',
        popular: false,
        recursos: [
            'Até 1 profissional',
            '100 agendamentos por mês',
            'Dashboard básico',
            'Suporte por email'
        ],
        limitacoes: [
            'Sem WhatsApp',
            'Sem envio de promoções',
            'Sem fiados'
        ]
    },
    pro: {
        id: 'pro',
        nome: 'Pro',
        valor_mensal: 59.90,
        valor_anual: 575.04,
        profs: 5,
        agendamentos: 'Ilimitado',
        cor: '#f59e0b',
        popular: true,
        recursos: [
            'Até 5 profissionais',
            'Agendamentos ilimitados',
            'WhatsApp Business',
            'Envio de promoções',
            'Sistema de fiados',
            'Dashboard completo',
            'Relatórios avançados'
        ],
        limitacoes: []
    }
};

function tokenAtual() {
    return localStorage.getItem('token');
}

async function requisicao(url, options = {}) {
    const resposta = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            'Authorization': 'Bearer ' + tokenAtual(),
            ...(options.headers || {})
        }
    });
    let dados = {};
    try {
        dados = await resposta.json();
    } catch (_) {}
    if (!resposta.ok) throw new Error(dados.message || 'Não foi possível concluir a operação');
    return dados;
}

async function buscarModoPagamento() {
    try {
        const dados = await requisicao('/api/planos/payment-mode');
        modoPagamento = dados?.data?.mode === 'real' ? 'real' : 'simulation';
        return modoPagamento;
    } catch (erro) {
        modoPagamento = null;
        console.error('Modo de pagamento indisponível:', erro);
        return null;
    }
}

async function carregarPlanos() {
    if (typeof window.carregarCSS === 'function') window.carregarCSS('planos');
    if (typeof showLoading === 'function') showLoading();
    
    try {
        const [modo, respostaPlano] = await Promise.all([
            buscarModoPagamento(),
            requisicao('/api/planos/empresa')
        ]);
        
        const dados = respostaPlano.data || {};
        const planoAtual = String(dados.plano || 'trial').toLowerCase();
        const configAtual = PLANOS_CONFIG[planoAtual];
        const isTrial = planoAtual === 'trial' || dados.is_trial === true;
        const modoDisponivel = modo !== null;
        const modoTexto = !modoDisponivel ? 'Indisponível' : 
                         modo === 'real' ? '🟢 Pagamentos reais (MercadoPago)' : '🟡 Modo simulação';
        const validade = dados.data_validade_formatada || 'N/A';
        const diasRestantes = dados.dias_restantes || 0;
        
        // Montar cards dos planos
        const cards = Object.values(PLANOS_CONFIG).map(plano => {
            const atual = plano.id === planoAtual;
            const valor = periodoSelecionado === 'anual' ? plano.valor_anual : plano.valor_mensal;
            const valorFormatado = valor.toFixed(2).replace('.', ',');
            const periodoTexto = periodoSelecionado === 'anual' ? 'ano' : 'mês';
            
            const recursos = plano.recursos.map(item => 
                `<li><span class="check">✅</span> ${item}</li>`
            ).join('');
            
            const limitacoes = plano.limitacoes.map(item => 
                `<li><span class="xmark">❌</span> ${item}</li>`
            ).join('');
            
            const podeContratar = !atual && modoDisponivel;
            const botaoTexto = atual ? '✅ Plano atual' : 
                              !modoDisponivel ? 'Pagamento indisponível' :
                              modo === 'real' ? '💳 Pagar agora' : 'Escolher plano';
            
            const isPopular = plano.popular ? 'plano-popular' : '';
            
            return `
                <article class="plano-card ${isPopular}">
                    ${plano.popular ? '<strong class="selo">⭐ Mais popular</strong>' : ''}
                    ${atual ? '<span class="badge-atual">ATUAL</span>' : ''}
                    <h3 class="nome">${plano.nome}</h3>
                    <div class="preco">
                        R$ ${valorFormatado}
                        <small>/${periodoTexto}</small>
                    </div>
                    <p class="subtitle">👥 ${plano.profs} profissional(is) · 📊 ${plano.agendamentos}</p>
                    <ul class="features">
                        ${recursos}${limitacoes}
                    </ul>
                    <button class="btn-plano ${atual ? 'atual' : ''}" 
                            ${!podeContratar ? 'disabled' : ''} 
                            onclick="escolherPlano('${plano.id}')">
                        ${botaoTexto}
                    </button>
                </article>
            `;
        }).join('');
        
        // Montar HTML completo (SEM CSS INLINE)
        document.getElementById('content').innerHTML = `
            <section class="plans-page">
                <header>
                    <h2>💎 Planos e assinaturas</h2>
                    <p>Escolha o plano ideal para o seu negócio. Comece grátis com Trial de 45 dias!</p>
                </header>
                
                <div class="modo-pagamento">
                    💳 <strong>${modoTexto}</strong>
                    ${modo === 'real' ? ' — a cobrança será processada pelo MercadoPago.' : ''}
                    ${modo === 'simulation' ? ' — ativação imediata para testes.' : ''}
                </div>
                
                <div class="plano-atual">
                    <h3>📋 Plano Atual: ${isTrial ? '🆓 Trial (Starter)' : (configAtual?.nome || planoAtual)}</h3>
                    ${isTrial ? `
                        <p>⏳ <strong>${diasRestantes}</strong> dias restantes de Trial</p>
                        <p>📅 Expira em: ${validade}</p>
                    ` : `
                        <p>📅 Válido até: <strong>${validade}</strong></p>
                        <p>👥 ${dados.limite_profissionais || 1} profissional(is)</p>
                    `}
                    <p>📱 WhatsApp: ${dados.whatsapp?.habilitado ? '✅ habilitado' : '⚠️ não habilitado'}</p>
                    ${!isTrial ? '<button class="btn-cancelar" onclick="cancelarAssinatura()">❌ Cancelar assinatura</button>' : ''}
                </div>
                
                <div class="periodos">
                    <button onclick="togglePeriodo('mensal')" class="${periodoSelecionado === 'mensal' ? 'ativo' : ''}">
                        📆 Mensal
                    </button>
                    <button onclick="togglePeriodo('anual')" class="${periodoSelecionado === 'anual' ? 'ativo' : ''}">
                        📅 Anual — 20% OFF
                    </button>
                </div>
                
                <div class="planos-grid">
                    ${cards}
                </div>
            </section>
        `;
        
    } catch (erro) {
        console.error('Erro ao carregar planos:', erro);
        document.getElementById('content').innerHTML = `
            <div class="erro-planos">
                ❌ ${erro.message}
                <br>
                <button onclick="carregarPlanos()">Tentar novamente</button>
            </div>
        `;
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}
async function escolherPlano(planoId) {
    const plano = PLANOS_CONFIG[planoId];
    if (!plano) return showToast?.('Plano não encontrado', 'error');
    if (!modoPagamento) return showToast?.('Modo de pagamento indisponível', 'error');
    
    const valor = periodoSelecionado === 'anual' ? plano.valor_anual : plano.valor_mensal;
    const valorFormatado = valor.toFixed(2).replace('.', ',');
    const periodoTexto = periodoSelecionado === 'anual' ? 'ano' : 'mês';
    
    if (!confirm(`📋 Escolher ${plano.nome}?\n\n💰 R$ ${valorFormatado} / ${periodoTexto}\n${modoPagamento === 'real' ? '💳 Pagamento via MercadoPago' : '🟡 Ativação imediata (simulação)'}`)) {
        return;
    }
    
    await confirmarUpgrade(planoId);
}

async function confirmarUpgrade(planoId) {
    if (typeof showLoading === 'function') showLoading();
    
    try {
        const modo = await buscarModoPagamento();
        if (!modo) throw new Error('Modo de pagamento indisponível');
        
        const plano = PLANOS_CONFIG[planoId];
        
        if (modo === 'real') {
            // Pagamento REAL via MercadoPago
            const valor = periodoSelecionado === 'anual' ? plano.valor_anual : plano.valor_mensal;
            
            const resultado = await requisicao('/api/pagamento/create-payment', {
                method: 'POST',
                body: JSON.stringify({
                    plano_id: planoId,
                    plano_nome: plano.nome,
                    valor: valor,
                    periodo: periodoSelecionado
                })
            });
            
            // Verificar diferentes formatos de resposta
            const linkPagamento = resultado.link || 
                                 resultado.init_point || 
                                 resultado.sandbox_init_point ||
                                 resultado.payment_url;
            
            if (!linkPagamento) {
                throw new Error('O provedor não retornou um link de pagamento');
            }
            
            // 🔥 SALVAR NO SESSION STORAGE QUE O PAGAMENTO FOI INICIADO
            sessionStorage.setItem('payment_status', 'pending');
            sessionStorage.setItem('payment_plan', plano.nome);
            
            // Abrir em nova janela
            window.open(linkPagamento, '_blank', 'noopener,noreferrer');
            showToast?.('🔗 Redirecionando para o MercadoPago...', 'info');
            
            // 🔥 MONITORAR O PAGAMENTO EM BACKGROUND
            monitorarPagamento();
            
            return;
        }
        
        // Modo SIMULAÇÃO (ativação imediata)
        await requisicao('/api/planos/empresa', {
            method: 'PUT',
            body: JSON.stringify({
                plano: planoId,
                periodo: periodoSelecionado
            })
        });
        
        showToast?.(`✅ Plano ${plano.nome} ativado com sucesso!`, 'success');
        atualizarUsuarioLocal(planoId);
        setTimeout(carregarPlanos, 500);
        
    } catch (erro) {
        console.error('Erro ao confirmar upgrade:', erro);
        showToast?.(erro.message || 'Erro ao processar upgrade', 'error');
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

// 🔥 NOVA FUNÇÃO: MONITORAR O PAGAMENTO
function monitorarPagamento() {
    console.log('🔍 Monitorando status do pagamento...');
    
    // Verificar a cada 5 segundos se o plano foi ativado
    const interval = setInterval(async () => {
        try {
            const response = await fetch('/api/planos/empresa', {
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });
            const data = await response.json();
            
            if (data.data?.assinatura_ativa === true) {
                console.log('✅ Pagamento confirmado! Plano ativado!');
                clearInterval(interval);
                sessionStorage.removeItem('payment_status');
                
                // Mostrar mensagem de sucesso
                showToast?.('✅ Pagamento aprovado! Plano ativado com sucesso!', 'success');
                
                // Recarregar a página de planos
                setTimeout(() => {
                    carregarPlanos();
                }, 1500);
            }
        } catch (error) {
            console.error('Erro ao monitorar pagamento:', error);
        }
    }, 5000); // Verificar a cada 5 segundos
    
    // Parar após 5 minutos (timeout)
    setTimeout(() => {
        clearInterval(interval);
        console.log('⏰ Monitoramento finalizado por timeout');
    }, 300000);
}

// 🔥 VERIFICAR SE O PAGAMENTO FOI CONCLUÍDO AO CARREGAR A PÁGINA
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário voltou de um pagamento
    const paymentStatus = sessionStorage.getItem('payment_status');
    if (paymentStatus === 'pending') {
        console.log('🔄 Verificando status do pagamento pendente...');
        monitorarPagamento();
    }
});
async function cancelarAssinatura() {
    if (!confirm('⚠️ Tem certeza que deseja cancelar sua assinatura?\n\nVocê terá 7 dias de Trial gratuito.')) return;
    
    if (typeof showLoading === 'function') showLoading();
    
    try {
        await requisicao('/api/planos/cancel-subscription', {
            method: 'POST',
            body: JSON.stringify({})
        });
        
        showToast?.('✅ Assinatura cancelada. Você está no plano Trial por 7 dias.', 'success');
        atualizarUsuarioLocal('trial');
        setTimeout(carregarPlanos, 500);
        
    } catch (erro) {
        showToast?.(erro.message || 'Erro ao cancelar assinatura', 'error');
    } finally {
        if (typeof hideLoading === 'function') hideLoading();
    }
}

function atualizarUsuarioLocal(plano) {
    try {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        usuario.plano = plano;
        localStorage.setItem('usuario', JSON.stringify(usuario));
    } catch (_) {}
}

function togglePeriodo(periodo) {
    periodoSelecionado = periodo === 'anual' ? 'anual' : 'mensal';
    carregarPlanos();
}

// Expor funções globalmente
window.carregarPlanos = carregarPlanos;
window.escolherPlano = escolherPlano;
window.confirmarUpgrade = confirmarUpgrade;
window.cancelarAssinatura = cancelarAssinatura;
window.togglePeriodo = togglePeriodo;
window.selecionarPlano = escolherPlano;
window.showToast = showToast;

console.log('📦 planos.js carregado — versão com pagamento real');