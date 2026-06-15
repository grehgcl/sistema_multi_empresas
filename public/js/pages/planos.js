// public/js/pages/planos.js

async function carregarPlanos() {
    showLoading();
    const token = localStorage.getItem('token');

    try {
        // Buscar informações do plano atual da empresa
        const resPlano = await fetch('/api/empresa/plano', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const planoData = await resPlano.json();

        console.log('Plano data:', planoData); // Debug

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

        // Mapeamento dos nomes dos planos
        const planosNomes = {
            'trial': 'Trial (Teste Grátis)',
            'starter': 'Starter',
            'pro': 'Pro',
            'business': 'Business',
            'enterprise': 'Enterprise'
        };

        const planosDescricao = {
            'trial': 'Período de teste gratuito',
            'starter': 'Para barbearias individuais',
            'pro': 'Para pequenas barbearias',
            'business': 'Para médias barbearias',
            'enterprise': 'Para grandes redes e franquias'
        };

        const planos = [
            { id: 'starter', nome: 'Starter', valor: 24.90, profs: 1, recursos: ['✅ Chatbot Completo', '✅ Relatórios Básicos', '✅ Suporte por Email', '✅ Até 1 Profissional'] },
            { id: 'pro', nome: 'Pro', valor: 49.90, profs: 5, recursos: ['✅ Chatbot Completo', '✅ Relatórios Avançados', '✅ Suporte WhatsApp', '✅ Até 5 Profissionais', '✅ Dashboard Analytics'] },
            { id: 'business', nome: 'Business', valor: 99.90, profs: 12, recursos: ['✅ Chatbot Premium', '✅ Relatórios Customizáveis', '✅ Suporte Prioritário', '✅ Até 12 Profissionais', '✅ API Básica'] },
            { id: 'enterprise', nome: 'Enterprise', valor: 199.90, profs: 'Ilimitado', recursos: ['✅ Tudo do Business', '✅ API Completa', '✅ Suporte Dedicado', '✅ Profissionais Ilimitados', '✅ Onboarding Personalizado'] }
        ];

        let html = `
            <div class="fade-in">
                <h2 class="page-title">💎 Planos e Assinaturas</h2>
                
                <!-- Plano Atual Card -->
                <div class="plano-atual-card" style="background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 16px; padding: 24px; margin-bottom: 32px; color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                        <div>
                            <h3 style="color: white; margin: 0 0 8px 0;">📋 Seu Plano Atual</h3>
                            <p style="font-size: 28px; font-weight: bold; margin: 0;">${planosNomes[planoAtual] || planoAtual}</p>
                            ${isTrial ?
                `<p style="margin: 8px 0 0 0; opacity: 0.9;">🎯 Período de teste: ${diasRestantes} dias restantes</p>` :
                `<p style="margin: 8px 0 0 0; opacity: 0.9;">📅 Válido até: ${validaAte || 'N/A'}</p>`
            }
                            <p style="margin: 4px 0 0 0; opacity: 0.8;">👥 Limite: ${limiteAtual} profissional(is) ativo(s)</p>
                        </div>
                        ${isTrial ?
                `<div style="text-align: center;">
                                <div style="font-size: 48px; font-weight: bold;">${diasRestantes}</div>
                                <div>dias restantes</div>
                                <div style="font-size: 12px; margin-top: 8px;">do período de teste</div>
                            </div>` :
                `<div style="text-align: center;">
                                <div style="font-size: 14px; opacity: 0.9;">Próxima cobrança</div>
                                <div style="font-size: 18px; font-weight: bold;">${validaAte || 'N/A'}</div>
                            </div>`
            }
                    </div>
                </div>
        `;

        // Mostrar alerta se trial está perto de expirar
        if (isTrial && diasRestantes <= 7 && diasRestantes > 0) {
            html += `
                <div class="alert alert-warning" style="background: #fef3c7; color: #92400e; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px;">
                    ⚠️ <strong>Atenção!</strong> Seu período de teste termina em ${diasRestantes} dias. Escolha um plano abaixo para não perder o acesso.
                </div>
            `;
        }

        html += `<div class="planos-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">`;

        for (let plano of planos) {
            const isCurrent = planoAtual === plano.id;
            const isTrialPlan = planoAtual === 'trial';

            html += `
                <div class="plano-card ${isCurrent ? 'plano-current' : ''}" style="background: var(--card-bg, white); border-radius: 16px; padding: 24px; text-align: center; transition: transform 0.3s, box-shadow 0.3s; border: 2px solid ${isCurrent ? '#667eea' : 'transparent'}; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <h3 style="font-size: 24px; margin-bottom: 8px;">${plano.nome}</h3>
                    <div style="font-size: 32px; font-weight: bold; color: #667eea; margin: 16px 0;">
                        R$ ${plano.valor.toFixed(2)}<span style="font-size: 14px; color: #666;">/mês</span>
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 20px;">
                        👥 ${plano.profs === 'Ilimitado' ? 'Ilimitado' : `Até ${plano.profs} profissionais`}
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 20px 0; text-align: left;">
                        ${plano.recursos.map(r => `<li style="padding: 8px 0; font-size: 14px;">${r}</li>`).join('')}
                    </ul>
                    ${isCurrent ?
                    '<button class="btn-secondary" disabled style="background: #48bb78; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: default;">✅ Plano Atual</button>' :
                    `<button class="btn-primary" onclick="escolherPlano('${plano.id}', ${plano.valor})" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Escolher Plano</button>`
                }
                </div>
            `;
        }

        html += `</div>`;

        // Adicionar informação de suporte
        html += `
            <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 12px;">
                <p style="margin: 0; color: #666;">💬 Precisa de um plano personalizado? Entre em contato com nosso time comercial.</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #999;">* Planos com pagamento recorrente mensal. Cancelamento a qualquer momento.</p>
            </div>
        </div>`;

        document.getElementById('content').innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar planos:', error);
        showToast('Erro ao carregar planos: ' + error.message, 'error');
        document.getElementById('content').innerHTML = `
            <div class="fade-in">
                <h2 class="page-title">💎 Planos e Assinaturas</h2>
                <div class="alert alert-danger">Erro ao carregar planos. Tente novamente mais tarde.</div>
                <button class="btn-primary" onclick="carregarPlanos()">Tentar novamente</button>
            </div>
        `;
    }

    hideLoading();
}

async function escolherPlano(plano, valor) {
    const planosNomes = {
        'starter': 'Starter',
        'pro': 'Pro',
        'business': 'Business',
        'enterprise': 'Enterprise'
    };

    const modalContent = `
        <p>Você está escolhendo o plano <strong>${planosNomes[plano]}</strong> por <strong>R$ ${valor.toFixed(2)}/mês</strong>.</p>
        <p style="margin-top: 10px;">Benefícios do plano:</p>
        <ul style="margin: 10px 0;">
            <li>✓ Chatbot completo</li>
            <li>✓ Sistema de agendamentos</li>
            <li>✓ Relatórios financeiros</li>
            <li>✓ Suporte incluso</li>
        </ul>
        <div class="form-group" style="margin-top: 15px;">
            <label>Forma de pagamento:</label>
            <select id="metodo_pagamento" class="form-control" style="width: 100%; padding: 8px; margin-top: 5px; border-radius: 8px; border: 1px solid #ddd;">
                <option value="cartao">💳 Cartão de Crédito</option>
                <option value="pix">📱 PIX</option>
                <option value="boleto">📄 Boleto Bancário</option>
            </select>
        </div>
        <div class="form-group" style="margin-top: 10px;">
            <label>Comprovante (opcional):</label>
            <input type="text" id="comprovante" class="form-control" placeholder="Código do pagamento" style="width: 100%; padding: 8px; margin-top: 5px; border-radius: 8px; border: 1px solid #ddd;">
        </div>
        <p style="margin-top: 15px; font-size: 12px; color: #666;">🔒 Após a confirmação, seu plano será ativado imediatamente.</p>
    `;

    showModal('Confirmar Upgrade', modalContent, async () => {
        const metodo = document.getElementById('metodo_pagamento').value;
        const comprovante = document.getElementById('comprovante')?.value || '';
        const token = localStorage.getItem('token');

        showLoading();
        try {
            const res = await fetch('/api/upgrade', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    plano: plano,
                    metodo_pagamento: metodo,
                    comprovante: comprovante
                })
            });
            const data = await res.json();
            hideLoading();

            if (data.success) {
                showToast(data.message, 'success');
                // Recarregar informações do usuário
                await recarregarUsuario();
                // Recarregar página de planos
                carregarPlanos();
            } else {
                showToast(data.message, 'error');
            }
        } catch (error) {
            hideLoading();
            showToast('Erro ao processar upgrade: ' + error.message, 'error');
        }
    });
}

async function recarregarUsuario() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        // Buscar dados atualizados do usuário
        const res = await fetch('/api/empresa/plano', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success && data.data) {
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            usuario.plano = data.data.plano;
            usuario.limite_profissionais = data.data.limite_profissionais;
            localStorage.setItem('usuario', JSON.stringify(usuario));

            // Atualizar trialInfo se existir
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

window.carregarPlanos = carregarPlanos;
window.escolherPlano = escolherPlano;