// ============================================
// WHATSAPP CONFIG - COM SUPER ADMIN OVERRIDE E LÃ“GICA BINÃRIA CORRIGIDA
// ============================================

// public/js/pages/whatsapp-config.js
async function carregarConfigWhatsApp() {
  if (typeof window.carregarCSS === 'function') {
    window.carregarCSS('empresas');
  }
  ativarBotao('whatsapp');
  showLoading();

  try {
    const token = localStorage.getItem('token');
    // âœ… CORREÃ‡ÃƒO: URL CORRETA
    const res = await fetch('/api/whatsapp/info', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message || 'Erro ao carregar configuraÃ§Ã£o');
    }

    const data = result.data;

    let html = `<div class="fade-in"><h2 class="page-title">ðŸ“± WhatsApp</h2>`;

    // ðŸ”¥ CENÃRIO 1: Super Admin NÃƒO habilitou E plano nÃ£o permite
    if (!data.superAdminHabilitou && !data.planoPermitido) {
      html += `
                <div class="card" style="max-width: 650px; margin: 0 auto; text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 20px;">ðŸ’Ž</div>
                    <h3>WhatsApp Exclusivo</h3>
                    <p style="color: var(--text-muted); margin: 20px 0;">
                        O WhatsApp com <strong>seu prÃ³prio nÃºmero</strong> estÃ¡ disponÃ­vel apenas nos planos 
                        <strong>Business</strong> e <strong>Enterprise</strong>.
                    </p>
                    
                    <div style="background: rgba(102, 126, 234, 0.1); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: left;">
                        <h4 style="margin-top: 0;">ðŸ’Ž Vantagens do WhatsApp Exclusivo</h4>
                        <ul style="margin: 15px 0; padding-left: 20px;">
                            <li>âœ… Mensagens saem do <strong>SEU nÃºmero</strong></li>
                            <li>âœ… Clientes veem sua marca, nÃ£o "See&Agende"</li>
                            <li>âœ… HistÃ³rico separado e profissional</li>
                            <li>âœ… Branding 100% da sua empresa</li>
                        </ul>
                    </div>
                    
                    <button onclick="irParaPlanos()" class="btn btn-primary">ðŸ’Ž Ver Planos</button>
                </div>
            `;
    }

    // ðŸ”¥ CENÃRIO 2: Plano permite MAS Super Admin NÃƒO habilitou
    else if (data.planoPermitido && !data.superAdminHabilitou) {
      html += `
                <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 20px;">â³</div>
                    <h3>WhatsApp Exclusivo</h3>
                    <p style="color: var(--text-muted); margin: 20px 0;">
                        Seu plano <strong>${data.plano}</strong> tem direito ao WhatsApp Exclusivo, 
                        mas ele ainda nÃ£o foi <strong>habilitado pelo administrador</strong> da plataforma.
                    </p>
                    <div style="background: rgba(237, 137, 54, 0.1); padding: 15px; border-radius: 12px; margin: 20px 0;">
                        <p style="margin: 0; color: var(--text-muted);">
                            ðŸ“§ Entre em contato com o suporte para ativar este recurso.
                        </p>
                    </div>
                </div>
            `;
    }

    // ðŸ”¥ CENÃRIO 3: Super Admin habilitou OU plano permite â†’ PODE USAR!
    else {
      const isConectado = data.connected || data.state === 'open' || data.state === 'connected';

      if (!data.instanceName) {
        // InstÃ¢ncia nÃ£o criada ainda
        html += `
                    <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">ðŸ’Ž</div>
                        <h3>WhatsApp Exclusivo DisponÃ­vel!</h3>
                        <p style="color: var(--text-muted); margin: 15px 0;">
                            ${data.superAdminHabilitou
            ? 'O administrador habilitou o WhatsApp Exclusivo para sua empresa!'
            : `Seu plano <strong>${data.plano}</strong> inclui WhatsApp com <strong>seu prÃ³prio nÃºmero</strong>!`
          }
                        </p>
                        <button onclick="criarInstancia()" class="btn btn-primary">
                            ðŸš€ Ativar Meu WhatsApp
                        </button>
                    </div>
                `;
      }
      else if (!isConectado) {
        // âœ… DESCONECTADO: Mostra QR Code e botÃµes
        html += `
                    <div class="card fade-in" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 30px 20px;">
                        <h3 style="color: var(--text-primary); margin-bottom: 8px;">Conecte seu WhatsApp</h3>
                        <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 14px;">
                            Escaneie o QR Code com o WhatsApp da sua empresa
                        </p>

                        <!-- Container do QR Code -->
                        <div id="qrcode-container" style="background: white; padding: 15px; border-radius: 12px; display: inline-block; margin-bottom: 24px; min-width: 250px; min-height: 250px; display: flex; align-items: center; justify-content: center;">
                            ${data.qrCode
            ? `<img src="${data.qrCode}" alt="QR Code WhatsApp" style="max-width: 220px; max-height: 220px;" />`
            : '<p style="color: #666; font-size: 12px;">Clique em "Gerar QR Code" abaixo</p>'
          }
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                            <button onclick="gerarQrCode()" class="btn btn-primary" style="padding: 10px 20px; border-radius: 8px; border: none; background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="fas fa-qrcode"></i> Gerar QR Code
                            </button>
                            
                            <button onclick="verificarConexao()" class="btn btn-outline" style="padding: 10px 20px; border-radius: 8px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="fas fa-sync-alt"></i> Verificar ConexÃ£o
                            </button>

                            <button onclick="confirmarConexao()" class="btn btn-success" style="padding: 10px 20px; border-radius: 8px; border: none; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="fas fa-check-circle"></i> JÃ¡ Conectei
                            </button>
                        </div>
                    </div>
                `;

        if (!data.qrCode) setTimeout(buscarQrCode, 500);
      }
      else {
        // âœ… CONECTADO
        html += `
                    <div class="card fade-in" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 40px 20px;">
                        <div style="width: 80px; height: 80px; background: rgba(37,211,102,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fab fa-whatsapp" style="font-size: 40px; color: #25D366;"></i>
                        </div>
                        <h3 style="color: var(--text-primary); margin-bottom: 8px;">WhatsApp Conectado!</h3>
                        <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 14px;">
                            NÃºmero ativo: <strong style="color: var(--text-primary);">${data.number || 'Carregando...'}</strong>
                        </p>
                        
                        <button onclick="desconectarWhatsApp()" class="btn btn-danger" style="padding: 12px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 16px rgba(239,68,68,0.25);">
                            <i class="fas fa-power-off"></i> Desconectar WhatsApp
                        </button>
                    </div>
                `;
      }
    }

    html += `</div>`;
    document.getElementById('content').innerHTML = html;

  } catch (error) {
    console.error('âŒ Erro ao carregar config WhatsApp:', error);
    showToast('Erro ao carregar configuraÃ§Ã£o do WhatsApp: ' + error.message, 'error');
  }

  hideLoading();
}

// ============================================
// CRIAR INSTÃ‚NCIA
// ============================================
async function criarInstancia() {
  showLoading();
  const token = localStorage.getItem('token');

  try {
    // âœ… CORRIGIDO: URL CORRETA
    const res = await fetch('/api/whatsapp/criar-instancia', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    hideLoading();

    if (data.success) {
      showToast('InstÃ¢ncia criada! Conecte seu WhatsApp', 'success');
      carregarConfigWhatsApp();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao criar instÃ¢ncia', 'error');
  }
}

// ============================================
// BUSCAR QR CODE - CORRIGIDO
// ============================================
async function buscarQrCode() {
  const token = localStorage.getItem('token');
  try {
    console.log('ðŸ“± Buscando QR Code...');
    const res = await fetch('/api/whatsapp/qrcode', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    console.log('ðŸ“¥ Resposta do QR Code:', data);

    // ðŸ”¥ VERIFICAR SE O QR CODE Ã‰ UM OBJETO OU STRING
    let qrCode = data.qrCode;

    // Se for um objeto, extrair o base64 ou code
    if (typeof qrCode === 'object' && qrCode !== null) {
      if (qrCode.base64) {
        qrCode = qrCode.base64;
      } else if (qrCode.code) {
        qrCode = qrCode.code;
      } else {
        qrCode = null;
      }
    }

    if (qrCode) {
      const container = document.getElementById('qrcode-container');
      if (container) {
        // ðŸ”¥ SE FOR BASE64, EXIBIR COMO IMAGEM
        let qrImage = qrCode;
        // Se nÃ£o comeÃ§ar com data:image, adicionar o prefixo
        if (typeof qrImage === 'string' && !qrImage.startsWith('data:image')) {
          qrImage = `data:image/png;base64,${qrImage}`;
        }
        container.innerHTML = `<img src="${qrImage}" style="width: 256px; height: 256px; border-radius: 12px; background: white; padding: 10px;">`;
        showToast('QR Code gerado! Escaneie com o WhatsApp.', 'success');
      }
    } else if (data.alreadyConnected) {
      const container = document.getElementById('qrcode-container');
      if (container) {
        container.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p style="color: var(--success); font-size: 18px;">âœ… WhatsApp jÃ¡ estÃ¡ conectado!</p>
          </div>
        `;
      }
    } else {
      const container = document.getElementById('qrcode-container');
      if (container) {
        container.innerHTML = `<p style="color: var(--warning);">${data.message || 'QR Code nÃ£o disponÃ­vel'}</p>`;
      }
      showToast(data.message || 'Erro ao gerar QR Code', 'warning');
    }
  } catch (error) {
    console.error('âŒ Erro ao buscar QR Code:', error);
    showToast('Erro ao buscar QR Code', 'error');
  }
}

// ============================================
// VERIFICAR STATUS
// ============================================
async function verificarStatus() {
  showLoading();
  const token = localStorage.getItem('token');

  try {
    // âœ… CORRIGIDO: URL CORRETA
    const res = await fetch('/api/whatsapp/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    hideLoading();

    if (data.data.connected) {
      showToast('WhatsApp conectado com sucesso!', 'success');
      carregarConfigWhatsApp();
    } else {
      showToast('Ainda nÃ£o conectado. Escaneie o QR Code.', 'warning');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao verificar status', 'error');
  }
}

// ============================================
// CONFIRMAR CONEXÃƒO MANUAL
// ============================================
async function confirmarConexao() {
  await verificarStatus();
}

// ============================================
// DESCONECTAR WHATSAPP
// ============================================
async function desconectarWhatsApp() {
  if (!confirm('Tem certeza que deseja desconectar este WhatsApp?')) return;

  showLoading();
  const token = localStorage.getItem('token');

  let empresaId = window.empresaId;
  if (!empresaId && token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      empresaId = payload.empresa_id;
    } catch (e) {
      console.error('Erro ao decodificar token', e);
    }
  }

  try {
    // âœ… URL CORRETA
    const res = await fetch('/api/whatsapp/disconnect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ empresa_id: empresaId })
    });

    if (!res.ok) {
      throw new Error(`Erro HTTP: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'WhatsApp desconectado!', 'success');
      if (typeof carregarConfigWhatsApp === 'function') {
        await carregarConfigWhatsApp();
      } else {
        location.reload();
      }
    } else {
      showToast(data.message || 'Falha ao desconectar.', 'error');
    }
  } catch (error) {
    console.error('âŒ Erro na desconexÃ£o:', error);
    showToast('Erro de conexÃ£o. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================
// IR PARA PÃGINA DE PLANOS
// ============================================
function irParaPlanos() {
  ativarBotao('planos');
  if (typeof window.carregarPlanos === 'function') {
    window.carregarPlanos();
  } else {
    console.error('âŒ FunÃ§Ã£o carregarPlanos nÃ£o encontrada no planos.js');
    showToast('Erro ao carregar pÃ¡gina de planos', 'error');
  }
}

// ============================================
// ALIASES PARA COMPATIBILIDADE
// ============================================
function gerarQrCode() {
  if (typeof buscarQrCode === 'function') {
    return buscarQrCode();
  }
}

function verificarConexao() {
  if (typeof verificarStatus === 'function') {
    return verificarStatus();
  }
}

// ============================================
// EXPORTAR TODAS AS FUNÃ‡Ã•ES PARA O ESCOPO GLOBAL
// ============================================
window.carregarConfigWhatsApp = carregarConfigWhatsApp;
window.carregarWhatsappConfig = carregarConfigWhatsApp; // ðŸ”¥ ALIAS PARA O MENU
window.criarInstancia = criarInstancia;
window.buscarQrCode = buscarQrCode;
window.gerarQrCode = gerarQrCode;
window.verificarStatus = verificarStatus;
window.verificarConexao = verificarConexao;
window.confirmarConexao = confirmarConexao;
window.desconectarWhatsApp = desconectarWhatsApp;
window.irParaPlanos = irParaPlanos;

console.log('âœ… whatsapp-config.js carregado com todas as funÃ§Ãµes globais!');