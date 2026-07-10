// ============================================
// WHATSAPP CONFIG - COM SUPER ADMIN OVERRIDE
// ============================================

async function carregarConfigWhatsApp() {
  ativarBotao('whatsapp');
  showLoading();

  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/empresa/whatsapp/info', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const { data } = await res.json();

    let html = `<div class="fade-in"><h2 class="page-title"> WhatsApp</h2>`;

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
                    
                    <button onclick="irParaPlanos()" class="btn btn-primary">
    💎 Ver Planos
</button>
                </div>
            `;
    }

    //  CENÁRIO 2: Plano permite MAS Super Admin NÃO habilitou
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
      } else if (!data.connected) {
        // Instância criada, precisa conectar
        html += `
                    <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">📷</div>
                        <h3>Conecte seu WhatsApp</h3>
                        <p style="color: var(--text-muted);">
                            Escaneie o QR Code com o WhatsApp da sua empresa
                        </p>
                        <div id="qrcode-container" style="margin: 20px auto; background: white; padding: 20px; border-radius: 12px; display: inline-block;">
                            <div class="loading-spinner"></div>
                        </div>
                        <div style="margin-top: 20px;">
                            <button onclick="buscarQrCode()" class="btn btn-secondary">🔄 Atualizar</button>
                            <button onclick="verificarStatus()" class="btn btn-primary">✅ Já Conectei</button>
                        </div>
                    </div>
                `;
        setTimeout(buscarQrCode, 500);
      } else {
        // Conectado com sucesso
        html += `
                    <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;">
                        <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                        <h3 style="color: var(--success);">WhatsApp Exclusivo Ativo!</h3>
                        <div style="background: rgba(72, 187, 120, 0.1); padding: 20px; border-radius: 12px; margin: 20px 0;">
                            <p style="font-size: 18px; margin: 0;"> <strong>${data.number || 'Conectado'}</strong></p>
                            <p style="font-size: 14px; color: var(--text-muted); margin-top: 10px;">
                                As mensagens saem do WhatsApp da SUA empresa
                            </p>
                        </div>
                        <button onclick="desconectarWhatsApp()" class="btn btn-danger">
                            🔌 Desconectar
                        </button>
                    </div>
                `;
      }
    }

    html += `</div>`;
    document.getElementById('content').innerHTML = html;

  } catch (error) {
    showToast('Erro ao carregar configuração', 'error');
    console.error(error);
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
    const res = await fetch('/api/empresa/whatsapp/criar-instancia', {
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
    const res = await fetch('/api/empresa/whatsapp/qrcode', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();

    if (data.success && data.qrCode) {
      document.getElementById('qrcode-container').innerHTML = `<img src="${data.qrCode}" style="width: 256px; height: 256px;">`;
    } else {
      document.getElementById('qrcode-container').innerHTML = '<p style="color: var(--danger);">Erro ao gerar QR Code</p>';
    }
  } catch (error) {
    document.getElementById('qrcode-container').innerHTML = '<p style="color: var(--danger);">Erro ao buscar QR Code</p>';
  }
}

// ============================================
// VERIFICAR STATUS
// ============================================
async function verificarStatus() {
  showLoading();
  const token = localStorage.getItem('token');

  try {
    const res = await fetch('/api/empresa/whatsapp/status', {
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
// DESCONECTAR WHATSAPP
// ============================================
async function desconectarWhatsApp() {
  if (!confirm('Deseja realmente desconectar o WhatsApp?')) return;

  showLoading();
  const token = localStorage.getItem('token');

  try {
    const res = await fetch('/api/empresa/whatsapp/disconnect', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    hideLoading();

    if (data.success) {
      showToast('WhatsApp desconectado', 'success');
      carregarConfigWhatsApp();
    } else {
      showToast(data.message, 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Erro ao desconectar', 'error');
  }
}

// ============================================
// IR PARA PÁGINA DE PLANOS
// ============================================
function irParaPlanos() {
  // Ativa o botão do menu
  ativarBotao('planos');

  // Chama a função do arquivo planos.js
  if (typeof window.carregarPlanos === 'function') {
    window.carregarPlanos();
  } else {
    console.error('❌ Função carregarPlanos não encontrada no planos.js');
    showToast('Erro ao carregar página de planos', 'error');
  }
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================
window.carregarConfigWhatsApp = carregarConfigWhatsApp;
window.criarInstancia = criarInstancia;
window.buscarQrCode = buscarQrCode;
window.verificarStatus = verificarStatus;
window.desconectarWhatsApp = desconectarWhatsApp;
window.carregarPlanos = carregarPlanos;

console.log('✅ whatsapp-config.js carregado!');