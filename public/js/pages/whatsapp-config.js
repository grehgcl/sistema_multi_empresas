// ============================================
// WHATSAPP CONFIG - COM SUPER ADMIN OVERRIDE E LÓGICA BINÁRIA CORRIGIDA
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
    // ✅ CORREÇÃO: URL CORRETA
    const res = await fetch('/api/whatsapp/info', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message || 'Erro ao carregar configuração');
    }

    const data = result.data;

    let html = `<div class="fade-in"><h2 class="page-title">📱 WhatsApp</h2>`;

    // 🔥 CENÁRIO 1: Super Admin NÃO habilitou E plano não permite
    if (!data.superAdminHabilitou && !data.planoPermitido) {
      html += `
                <div class="card" style="max-width: 650px; margin: 0 auto; text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 20px;">💎</div>
                    <h3>WhatsApp Exclusivo</h3>
                    <p style="color: var(--text-muted); margin: 20px 0;">
                        O WhatsApp com <strong>seu próprio número</strong> está disponível apenas nos planos 
                        <strong>Business</strong> e <strong>Enterprise</strong>.
                    </p>
                    
                    <div style="background: rgba(102, 126, 234, 0.1); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: left;">
                        <h4 style="margin-top: 0;">💎 Vantagens do WhatsApp Exclusivo</h4>
                        <ul style="margin: 15px 0; padding-left: 20px;">
                            <li>✅ Mensagens saem do <strong>SEU número</strong></li>
                            <li>✅ Clientes veem sua marca, não "See&Agende"</li>
                            <li>✅ Histórico separado e profissional</li>
                            <li>✅ Branding 100% da sua empresa</li>
                        </ul>
                    </div>
                    
                    <button onclick="irParaPlanos()" class="btn btn-primary">💎 Ver Planos</button>
                </div>
            `;
    }

    // 🔥 CENÁRIO 2: Plano permite MAS Super Admin NÃO habilitou
    else if (data.planoPermitido && !data.superAdminHabilitou) {
      html += `
                <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 20px;">⏳</div>
                    <h3>WhatsApp Exclusivo</h3>
                    <p style="color: var(--text-muted); margin: 20px 0;">
                        Seu plano <strong>${data.plano}</strong> tem direito ao WhatsApp Exclusivo, 
                        mas ele ainda não foi <strong>habilitado pelo administrador</strong> da plataforma.
                    </p>
                    <div style="background: rgba(237, 137, 54, 0.1); padding: 15px; border-radius: 12px; margin: 20px 0;">
                        <p style="margin: 0; color: var(--text-muted);">
                            📧 Entre em contato com o suporte para ativar este recurso.
                        </p>
                    </div>
                </div>
            `;
    }

    // 🔥 CENÁRIO 3: Super Admin habilitou OU plano permite → PODE USAR!
    else {
      const isConectado = data.connected || data.state === 'open' || data.state === 'connected';

      if (!data.instanceName) {
        // Instância não criada ainda
        html += `
                    <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">💎</div>
                        <h3>WhatsApp Exclusivo Disponível!</h3>
                        <p style="color: var(--text-muted); margin: 15px 0;">
                            ${data.superAdminHabilitou
            ? 'O administrador habilitou o WhatsApp Exclusivo para sua empresa!'
            : `Seu plano <strong>${data.plano}</strong> inclui WhatsApp com <strong>seu próprio número</strong>!`
          }
                        </p>
                        <button onclick="criarInstancia()" class="btn btn-primary">
                            🚀 Ativar Meu WhatsApp
                        </button>
                    </div>
                `;
      }
      else if (!isConectado) {
        // ✅ DESCONECTADO: Mostra QR Code e botões
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
                                <i class="fas fa-sync-alt"></i> Verificar Conexão
                            </button>

                            <button onclick="confirmarConexao()" class="btn btn-success" style="padding: 10px 20px; border-radius: 8px; border: none; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="fas fa-check-circle"></i> Já Conectei
                            </button>
                        </div>
                    </div>
                `;

        if (!data.qrCode) setTimeout(buscarQrCode, 500);
      }
      else {
        // ✅ CONECTADO
        html += `
                    <div class="card fade-in" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 40px 20px;">
                        <div style="width: 80px; height: 80px; background: rgba(37,211,102,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                            <i class="fab fa-whatsapp" style="font-size: 40px; color: #25D366;"></i>
                        </div>
                        <h3 style="color: var(--text-primary); margin-bottom: 8px;">WhatsApp Conectado!</h3>
                        <p style="color: var(--text-muted); margin-bottom: 24px; font-size: 14px;">
                            Número ativo: <strong style="color: var(--text-primary);">${data.number || 'Carregando...'}</strong>
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
    console.error('❌ Erro ao carregar config WhatsApp:', error);
    showToast('Erro ao carregar configuração do WhatsApp: ' + error.message, 'error');
  }

  hideLoading();
}

// ============================================
// CRIAR INSTÂNCIA
// ============================================
async function criarInstancia() {
  showLoading();
  const token = localStorage.getItem('token');

  try {
    // ✅ CORRIGIDO: URL CORRETA
    const res = await fetch('/api/whatsapp/criar-instancia', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    hideLoading();

    if (data.success) {
      showToast('Instância criada! Conecte seu WhatsApp', 'success');
      carregarConfigWhatsApp();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao criar instância', 'error');
  }
}

// ============================================
// BUSCAR QR CODE
// ============================================
async function buscarQrCode() {
  const token = localStorage.getItem('token');

  try {
    // ✅ CORRIGIDO: URL CORRETA
    const res = await fetch('/api/whatsapp/qrcode', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (data.success && data.qrCode) {
      const container = document.getElementById('qrcode-container');
      if (container) {
        container.innerHTML = `<img src="${data.qrCode}" style="width: 256px; height: 256px;">`;
      }
    } else if (data.alreadyConnected) {
      const container = document.getElementById('qrcode-container');
      if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <p style="color: var(--success); font-size: 18px;">✅ WhatsApp já está conectado!</p>
              <button onclick="carregarConfigWhatsApp()" class="btn btn-primary" style="margin-top: 10px;">
                🔄 Atualizar Página
              </button>
            </div>
          `;
      }
    } else {
      const container = document.getElementById('qrcode-container');
      if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <p style="color: var(--warning);">${data.message || 'QR Code não disponível'}</p>
              <button onclick="verificarStatus()" class="btn btn-primary" style="margin-top: 10px;">
                ✅ Verificar Conexão
              </button>
            </div>
          `;
      }
    }
  } catch (error) {
    const container = document.getElementById('qrcode-container');
    if (container) {
      container.innerHTML = '<p style="color: var(--danger);">Erro ao buscar QR Code</p>';
    }
  }
}

// ============================================
// VERIFICAR STATUS
// ============================================
async function verificarStatus() {
  showLoading();
  const token = localStorage.getItem('token');

  try {
    // ✅ CORRIGIDO: URL CORRETA
    const res = await fetch('/api/whatsapp/status', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    hideLoading();

    if (data.data.connected) {
      showToast('WhatsApp conectado com sucesso!', 'success');
      carregarConfigWhatsApp();
    } else {
      showToast('Ainda não conectado. Escaneie o QR Code.', 'warning');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao verificar status', 'error');
  }
}

// ============================================
// CONFIRMAR CONEXÃO MANUAL
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
    } catch (e) { console.error('Erro ao decodificar token', e); }
  }

  try {
    // ✅ CORRIGIDO: URL CORRETA
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
    console.error('❌ Erro na desconexão:', error);
    showToast('Erro de conexão. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
}

// ============================================
// IR PARA PÁGINA DE PLANOS
// ============================================
function irParaPlanos() {
  ativarBotao('planos');
  if (typeof window.carregarPlanos === 'function') {
    window.carregarPlanos();
  } else {
    console.error('❌ Função carregarPlanos não encontrada no planos.js');
    showToast('Erro ao carregar página de planos', 'error');
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
// EXPORTAR TODAS AS FUNÇÕES PARA O ESCOPO GLOBAL
// ============================================
window.carregarConfigWhatsApp = carregarConfigWhatsApp;
window.carregarWhatsappConfig = carregarConfigWhatsApp; // 🔥 ALIAS PARA O MENU
window.criarInstancia = criarInstancia;
window.buscarQrCode = buscarQrCode;
window.gerarQrCode = gerarQrCode;
window.verificarStatus = verificarStatus;
window.verificarConexao = verificarConexao;
window.confirmarConexao = confirmarConexao;
window.desconectarWhatsApp = desconectarWhatsApp;
window.irParaPlanos = irParaPlanos;

console.log('✅ whatsapp-config.js carregado com todas as funções globais!');