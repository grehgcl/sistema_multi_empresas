// public/js/pages/planos.js - Versão Corrigida

let currentPaymentId = null;
let modoSimulacao = true; // Coloque false para usar Mercado Pago real

async function escolherPlano(plano, valor) {
    const planosNomes = {
        'starter': 'Starter',
        'pro': 'Pro',
        'business': 'Business',
        'enterprise': 'Enterprise'
    };

    const modalContent = `
        <div style="padding: 10px;">
            <p>Você está escolhendo o plano <strong>${planosNomes[plano]}</strong> por <strong>R$ ${valor.toFixed(2)}/mês</strong>.</p>
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
                    mostrarFormularioCartaoSimulado(plano, valor, planosNomes);
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
                            valor: valor,
                            metodo_pagamento: metodo
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
                            valor: valor
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
                            valor: valor
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
                            valor: valor,
                            cpf: cpf.replace(/\D/g, '')
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
                            valor: valor,
                            cpf: cpf.replace(/\D/g, '')
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

// Função principal para carregar a página de planos
// Adicione esta função no final do arquivo planos.js (ANTES dos window.exports)

async function carregarPlanos() {
    console.log('carregarPlanos chamado');
    showLoading();
    const token = localStorage.getItem('token');

    try {
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

        const planosNomes = {
            'trial': 'Trial (Teste Grátis)',
            'starter': 'Starter',
            'pro': 'Pro',
            'business': 'Business',
            'enterprise': 'Enterprise'
        };

        const planos = [
            {
                id: 'starter', nome: 'Starter', valor: 24.90, profs: 1, popular: false,
                recursos: ['✓ Chatbot Completo', '✓ Relatórios Básicos', '✓ Suporte por Email', '✓ Até 1 Profissional']
            },
            {
                id: 'pro', nome: 'Pro', valor: 49.90, profs: 5, popular: true,
                recursos: ['✓ Chatbot Completo', '✓ Relatórios Avançados', '✓ Suporte WhatsApp', '✓ Até 5 Profissionais', '✓ Dashboard Analytics']
            },
            {
                id: 'business', nome: 'Business', valor: 99.90, profs: 12, popular: false,
                recursos: ['✓ Chatbot Premium', '✓ Relatórios Customizáveis', '✓ Suporte Prioritário', '✓ Até 12 Profissionais', '✓ API Básica']
            },
            {
                id: 'enterprise', nome: 'Enterprise', valor: 199.90, profs: 'Ilimitado', popular: false,
                recursos: ['✓ Tudo do Business', '✓ API Completa', '✓ Suporte Dedicado', '✓ Profissionais Ilimitados', '✓ Onboarding Personalizado']
            }
        ];

        let html = `
            <div class="fade-in">
                <h2 class="page-title">💎 Planos e Assinaturas</h2>
                <div style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 24px; margin-bottom: 32px; color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                        <div>
                            <h3 style="color: white; margin: 0 0 8px 0;">📋 Seu Plano Atual</h3>
                            <p style="font-size: 28px; font-weight: bold; margin: 0;">${planosNomes[planoAtual] || planoAtual}</p>
                            ${isTrial ? `<p style="margin: 8px 0 0 0; opacity: 0.9;">🎯 Período de teste: ${diasRestantes} dias restantes</p>` : `<p style="margin: 8px 0 0 0; opacity: 0.9;">📅 Válido até: ${validaAte || 'N/A'}</p>`}
                            <p style="margin: 4px 0 0 0; opacity: 0.8;">👥 Limite: ${limiteAtual} profissional(is)</p>
                        </div>
                        ${isTrial ? `<div style="text-align: center; background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 12px;"><div style="font-size: 48px; font-weight: bold;">${diasRestantes}</div><div>dias restantes</div></div>` : ''}
                    </div>
                </div>
        `;

        if (isTrial && diasRestantes <= 7 && diasRestantes > 0) {
            html += `<div style="background: #fef3c7; color: #92400e; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">⚠️ <strong>Atenção!</strong> Seu período de teste termina em ${diasRestantes} dias. Escolha um plano abaixo para não perder o acesso.</div>`;
        }

        if (!isTrial) {
            html += `
                <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                    <button onclick="cancelarAssinatura()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                        ❌ Cancelar Assinatura
                    </button>
                </div>
            `;
        }

        html += `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">`;

        for (let plano of planos) {
            const isCurrent = planoAtual === plano.id;
            html += `
                <div style="background: white; border-radius: 20px; padding: 28px; text-align: center; transition: all 0.3s; border: 2px solid ${isCurrent ? '#667eea' : '#e5e7eb'}; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); position: relative;">
                    ${plano.popular ? '<div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">⭐ MAIS POPULAR</div>' : ''}
                    <h3 style="font-size: 26px; margin-bottom: 8px; color: #1f2937;">${plano.nome}</h3>
                    <div style="font-size: 42px; font-weight: bold; color: #667eea; margin: 20px 0;">
                        R$ ${plano.valor.toFixed(2)}<span style="font-size: 14px; color: #6b7280;">/mês</span>
                    </div>
                    <div style="font-size: 14px; background: #f3f4f6; padding: 8px; border-radius: 8px; margin-bottom: 20px;">
                        👥 ${plano.profs === 'Ilimitado' ? 'Profissionais Ilimitados' : `Até ${plano.profs} profissionais`}
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 20px 0; text-align: left;">
                        ${plano.recursos.map(r => `<li style="padding: 8px 0; font-size: 14px; color: #374151;">${r}</li>`).join('')}
                    </ul>
                    ${isCurrent ?
                    '<button disabled style="background: #10b981; color: white; padding: 12px 24px; border: none; border-radius: 12px; cursor: default; font-weight: bold;">✅ Plano Atual</button>' :
                    `<button onclick="escolherPlano('${plano.id}', ${plano.valor})" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 24px; border: none; border-radius: 12px; cursor: pointer; font-weight: bold;">Escolher Plano</button>`
                }
                </div>
            `;
        }
        html += `</div></div>`;
        document.getElementById('content').innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar planos:', error);
        document.getElementById('content').innerHTML = `<div class="fade-in"><h2 class="page-title">💎 Planos</h2><div style="background: #fee2e2; padding: 20px; border-radius: 8px;">Erro ao carregar planos. <button onclick="carregarPlanos()">Tentar novamente</button></div></div>`;
    }
    hideLoading();
}

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

// Garantir que as funções estejam disponíveis globalmente
window.carregarPlanos = carregarPlanos;
window.cancelarAssinatura = cancelarAssinatura;
window.confirmarCancelamento = confirmarCancelamento;

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
            localStorage.setItem('usuario', JSON.stringify(usuario));
            if (data.data.is_trial && data.data.dias_restantes > 0) {
                const trialInfo = document.getElementById('trialInfo');
                if (trialInfo) {
                    trialInfo.style.display = 'block';
                    trialInfo.innerHTML = `⚠️ Período de teste: ${data.data.dias_restantes} dias restantes. <a href="#" onclick="carregarPlanos()">Fazer upgrade →</a>`;
                }
            } else if (!data.data.is_trial) {
                const trialInfo = document.getElementById('trialInfo');
                if (trialInfo) trialInfo.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erro ao recarregar usuário:', error);
    }
}

// EXPORTAR FUNÇÕES PARA O ESCOPO GLOBAL
window.carregarPlanos = carregarPlanos;
window.escolherPlano = escolherPlano;
window.mostrarPixQRCode = mostrarPixQRCode;
window.mostrarBoleto = mostrarBoleto;
window.verificarPagamentoPIX = verificarPagamentoPIX;
window.verificarPagamentoBoleto = verificarPagamentoBoleto;
window.copiarPix = copiarPix;
window.recarregarUsuario = recarregarUsuario;
window.processarPagamentoCartaoSimulado = processarPagamentoCartaoSimulado;

console.log('planos.js carregado - Modo simulação:', modoSimulacao);