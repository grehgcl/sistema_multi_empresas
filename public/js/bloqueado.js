// ============================================
// TELA DE BLOQUEIO — SEE&AGENDE
// ============================================

(function() {
    'use strict';

    const $ = (id) => document.getElementById(id);

    // ============================================
    // VERIFICA SE TEM TOKEN
    // ============================================
    const token = localStorage.getItem('token');
    if (!token) {
        // Sem token → volta pra login
        window.location.href = '/';
        return;
    }

    // ============================================
    // HELPERS
    // ============================================
    function formatarMoeda(valor) {
        if (valor === null || valor === undefined) return 'R$ 0,00';
        return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
    }

    function formatarData(dataISO) {
        if (!dataISO) return '—';
        try {
            // "2026-10-05" → "05/10/2026"
            const partes = dataISO.split('-');
            if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
            return dataISO;
        } catch {
            return dataISO;
        }
    }

    // ============================================
    // CARREGA DADOS DA ASSINATURA
    // ============================================
    async function carregarDados() {
        try {
            const res = await fetch('/api/empresa/assinatura', {
                headers: { 'Authorization': 'Bearer ' + token }
            });

            const json = await res.json();

            if (!json.success) {
                throw new Error(json.message || 'Erro ao carregar dados');
            }

            const dados = json.data;

            // Se NÃO tá bloqueado, redireciona pro sistema
            if (!dados.bloqueado) {
                window.location.href = '/';
                return;
            }

            renderizarTela(dados);

        } catch (err) {
            console.error('❌ Erro ao carregar dados:', err);
            renderizarErro(err.message);
        }
    }

    // ============================================
    // RENDERIZA TELA COM DADOS
    // ============================================
    function renderizarTela(dados) {
        const motivo = dados.motivo || 'suspensa';
        const assinatura = dados.assinatura || {};
        const pagamentos = dados.pagamentos_abertos || [];

        // Ícone + título + subtítulo por motivo
        const config = {
            'suspensa': {
                icon: '🔒',
                titulo: 'Acesso Suspenso',
                sub: 'Sua assinatura está suspensa porque a mensalidade está em atraso. Pague agora para retomar o acesso.'
            },
            'vencida': {
                icon: '⛔',
                titulo: 'Assinatura Vencida',
                sub: 'Sua assinatura venceu. Regularize para continuar usando o sistema.'
            },
            'trial-expirado': {
                icon: '⏰',
                titulo: 'Teste Expirado',
                sub: 'Seu período de teste terminou. Assine um plano para continuar usando.'
            }
        };

        const cfg = config[motivo] || {
            icon: '⚠️',
            titulo: 'Acesso Bloqueado',
            sub: 'Sua conta precisa ser regularizada.'
        };

        $('bloqueioIcon').textContent = cfg.icon;
        $('bloqueioTitulo').textContent = cfg.titulo;
        $('bloqueioSubtitulo').textContent = cfg.sub;

        // Info da assinatura
        $('infoPlano').textContent = assinatura.plano
            ? assinatura.plano.charAt(0).toUpperCase() + assinatura.plano.slice(1)
            : '—';

        $('infoValor').textContent = formatarMoeda(dados.valor_em_aberto);

        // Pega a data de vencimento mais antiga dos pagamentos em aberto
        let dataVenc = assinatura.data_vencimento;
        if (pagamentos.length > 0) {
            const maisAntigo = pagamentos.reduce((a, b) =>
                new Date(a.data_vencimento) < new Date(b.data_vencimento) ? a : b
            );
            dataVenc = maisAntigo.data_vencimento;
        }
        $('infoVencimento').textContent = formatarData(dataVenc);

        // Meses em atraso
        const mesesDevendo = assinatura.meses_devendo || pagamentos.length || 1;
        $('infoMeses').textContent = mesesDevendo === 1
            ? '1 mês'
            : `${mesesDevendo} meses`;

        // Mostra box de info
        $('bloqueioInfo').style.display = 'block';

        // Configura botões
        configurarBotoes(dados);
    }

    // ============================================
    // CONFIGURA BOTÕES
    // ============================================
    function configurarBotoes(dados) {
// Botão Pagar — chama Mercado Pago
$('btnPagar').addEventListener('click', async () => {
    const btn = $('btnPagar');
    const textoOriginal = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '⏳ Gerando link...';

    try {
        console.log('🔗 Chamando /api/pagamento/mensalidade...');

        const res = await fetch('/api/pagamento/mensalidade', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        const json = await res.json();
        console.log('📥 Resposta:', json);

        if (!json.success) {
            // Se não tem cobrança, tenta recarregar a página
            if (json.message && json.message.includes('Nenhuma cobrança')) {
                btn.innerHTML = '🔄 Recarregando...';
                setTimeout(() => window.location.reload(), 1000);
                return;
            }
            throw new Error(json.message || 'Erro ao gerar link');
        }

        if (!json.link) {
            throw new Error('Link não retornado pelo sistema');
        }

        console.log('✅ Link gerado:', json.link);

        sessionStorage.setItem('payment_status', 'pending');
        sessionStorage.setItem('payment_tipo', 'mensalidade');
        sessionStorage.setItem('payment_pagamento_id', json.pagamento_id);

        if (typeof showToast === 'function') {
            showToast('🔗 Redirecionando pro Mercado Pago...', 'info');
        }

        // Abre link
        window.open(json.link, '_blank', 'noopener,noreferrer');

        btn.innerHTML = '💳 Pagar agora';
        btn.disabled = false;

        monitorarPagamento();

    } catch (err) {
        console.error('❌ Erro ao gerar link:', err);
        if (typeof showToast === 'function') {
            showToast('❌ ' + err.message, 'error');
        } else {
            alert('Erro: ' + err.message);
        }
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
});
        // Botão Suporte (WhatsApp)
        $('btnSuporte').addEventListener('click', () => {
            const numeroSuporte = '5511999999999'; // ajuste depois
            const msg = encodeURIComponent(
                `Olá! Estou com minha conta bloqueada no SEE&AGENDE. ` +
                `Motivo: ${dados.motivo}. Valor em aberto: R$ ${dados.valor_em_aberto}. ` +
                `Como posso regularizar?`
            );
            window.open(`https://wa.me/${numeroSuporte}?text=${msg}`, '_blank');
        });

        // Botão Sair
        $('btnSair').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/';
        });
    }

    // ============================================
    // RENDERIZA ERRO
    // ============================================
    function renderizarErro(msg) {
        $('bloqueioIcon').textContent = '❌';
        $('bloqueioTitulo').textContent = 'Erro ao carregar';
        $('bloqueioSubtitulo').textContent = msg || 'Não foi possível carregar as informações. Tente novamente.';

        $('btnPagar').innerHTML = '<i class="fas fa-redo"></i> Tentar novamente';
        $('btnPagar').onclick = () => window.location.reload();

        $('btnSuporte').style.display = 'none';
    }

    // ============================================
    // INICIALIZA
    // ============================================
    carregarDados();

    // ============================================
// MONITORAR PAGAMENTO (a cada 10s)
// ============================================
function monitorarPagamento() {
    console.log('🔍 Monitorando pagamento...');

    let tentativas = 0;
    const MAX_TENTATIVAS = 60; // 10 minutos (60 * 10s)

    const intervalo = setInterval(async () => {
        tentativas++;

        if (tentativas > MAX_TENTATIVAS) {
            clearInterval(intervalo);
            console.log('⏰ Monitoramento encerrado (timeout)');
            return;
        }

        try {
            const res = await fetch('/api/empresa/assinatura', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const json = await res.json();

            if (json.success && !json.data.bloqueado) {
                clearInterval(intervalo);
                console.log('✅ Pagamento detectado! Recarregando...');
                
                if (typeof showToast === 'function') {
                    showToast('✅ Pagamento confirmado! Liberando acesso...', 'success');
                }

                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            } else {
                console.log(`⏳ Aguardando pagamento... (${tentativas}/${MAX_TENTATIVAS})`);
            }
        } catch (err) {
            console.error('❌ Erro ao verificar:', err);
        }
    }, 10000); // 10 segundos

    // Guarda referência global pra parar se precisar
    window._monitorInterval = intervalo;
}
})();