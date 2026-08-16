// ============================================
// UI FUNCTIONS - SEE&AGENDE v7.2
// ============================================

// ============================================
// CARREGAR CSS DA PÁGINA
// ============================================
function carregarCSS(pagina) {
    const link = document.getElementById('page-css');
    if (link) {
        link.href = `/css/pages/${pagina}.css?v=${Date.now()}`;
        console.log(`🎨 CSS carregado: ${pagina}.css`);
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'info', duration = 4000) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    if (window.innerWidth <= 768) {
        toast.style.top = 'auto';
        toast.style.bottom = '80px';
        toast.style.right = '10px';
        toast.style.left = '10px';
        toast.style.width = 'auto';
        toast.style.textAlign = 'center';
        toast.style.justifyContent = 'center';
    }

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ============================================
// LOADING SPINNER
// ============================================
function showLoading() {
    let spinner = document.getElementById('globalSpinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'globalSpinner';
        spinner.className = 'loading-spinner';
        document.body.appendChild(spinner);
    }
    spinner.style.display = 'block';
}

function hideLoading() {
    const spinner = document.getElementById('globalSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

// ============================================
// MODAL PERSONALIZADO
// ============================================
function showModal(title, content, onConfirm = null) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content glass">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h3>${title}</h3>
            <div style="margin: 20px 0;">${content}</div>
            <div class="modal-buttons">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn-3d btn-confirm">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    if (onConfirm) {
        modal.querySelector('.btn-confirm').onclick = () => {
            onConfirm();
            modal.remove();
        };
    }

    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
}

// ============================================
// SIDEBAR RESPONSIVA COM SWIPE
// ============================================
function initResponsiveSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.menu-mobile-btn');
    const overlay = document.querySelector('.sidebar-overlay');
    let touchStartX = 0;
    let touchEndX = 0;

    if (!menuBtn || !sidebar) return;

    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    sidebar.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    sidebar.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    sidebar.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) {
            closeSidebar();
        }
    });

    menuBtn.onclick = function (e) {
        e.stopPropagation();
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    };

    if (overlay) {
        overlay.onclick = closeSidebar;
    }

    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
}

// ============================================
// FECHAR SIDEBAR MOBILE
// ============================================
function fecharSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (window.innerWidth <= 768) {
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    }
}

// ============================================
// EXECUTAR AÇÃO E FECHAR SIDEBAR
// ============================================
function executarAcao(funcao, id) {
    fecharSidebarMobile();
    ativarBotao(id);
    if (typeof window[funcao] === 'function') {
        window[funcao]();
    } else {
        console.error('Função não encontrada:', funcao);
    }
}

// ============================================
// CONTROLAR MENU
// ============================================
function controlarMenu() {
    const token = localStorage.getItem('token');
    const menuBtn = document.getElementById('menuMobileBtn');
    const overlay = document.getElementById('sidebarOverlay');
    const landingContainer = document.getElementById('landingContainer');

    const isLandingPage = landingContainer && landingContainer.style.display !== 'none';

    if (menuBtn) {
        if (isLandingPage || !token) {
            menuBtn.style.display = 'none';
            menuBtn.style.visibility = 'hidden';
        } else {
            menuBtn.style.display = 'flex';
            menuBtn.style.visibility = 'visible';
        }
    }

    if (overlay) {
        if (isLandingPage || !token) {
            overlay.style.display = 'none';
        } else {
            overlay.style.display = 'block';
        }
    }
}

// ============================================
// FORÇAR CORES DO HEADER - VERSÃO SEGURA
// ============================================
function forcarCoresHeader() {
    try {
        const userNameEl = document.getElementById('userName');
        const userBadgeEl = document.getElementById('userBadge');

        if (userNameEl) {
            userNameEl.style.color = '#ffffff';
            userNameEl.style.fontWeight = '500';
            userNameEl.style.fontSize = '14px';
            userNameEl.style.textShadow = '0 1px 4px rgba(0,0,0,0.3)';
        }

        if (userBadgeEl) {
            let usuario = null;
            try {
                const usuarioStr = localStorage.getItem('usuario');
                if (usuarioStr && usuarioStr !== 'undefined') {
                    usuario = JSON.parse(usuarioStr);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao parsear usuário:', e);
                localStorage.removeItem('usuario');
            }

            if (usuario && usuario.role === 'superadmin') {
                userBadgeEl.innerHTML = '<span style="color:#ef4444;background:rgba(239,68,68,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🔴 SUPER ADMIN</span>';
            } else if (usuario && usuario.role === 'profissional') {
                userBadgeEl.innerHTML = '<span style="color:#667eea;background:rgba(102,126,234,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🔵 PROFISSIONAL</span>';
            } else {
                userBadgeEl.innerHTML = '<span style="color:#f59e0b;background:rgba(245,158,11,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🟠 Proprietário</span>';
            }
        }
    } catch (error) {
        console.warn('⚠️ Erro no forcarCoresHeader:', error);
    }
}

// ============================================
// FORMATAR DATA (CORRIGIDO)
// ============================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        let dataLimpa = dataStr;
        if (typeof dataStr === 'string' && dataStr.includes('T')) {
            dataLimpa = dataStr.split('T')[0];
        }
        if (typeof dataLimpa === 'string' && dataLimpa.includes('-')) {
            const partes = dataLimpa.split('-');
            if (partes.length === 3) {
                return partes[2] + '/' + partes[1] + '/' + partes[0];
            }
        }
        return dataLimpa;
    } catch {
        return dataStr;
    }
}

// ============================================
// MOSTRAR LANDING PAGE (COM CSS)
// ============================================
function mostrarLanding() {
    const landing = document.getElementById('landingContainer');
    const app = document.getElementById('app');

    if (landing) landing.style.display = 'flex';
    if (app) app.style.display = 'none';

    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('landing');
    }
}

// ============================================
// MOSTRAR LOGIN
// ============================================
function mostrarLogin() {
    const login = document.getElementById('loginContainer');
    const cadastro = document.getElementById('cadastroContainer');
    const loginMsg = document.getElementById('loginMessage');
    const cadastroMsg = document.getElementById('cadastroMessage');

    if (login) login.style.display = 'block';
    if (cadastro) cadastro.style.display = 'none';
    if (loginMsg) loginMsg.style.display = 'none';
    if (cadastroMsg) cadastroMsg.style.display = 'none';
}

// ============================================
// MOSTRAR CADASTRO
// ============================================
function mostrarCadastro() {
    const login = document.getElementById('loginContainer');
    const cadastro = document.getElementById('cadastroContainer');
    const loginMsg = document.getElementById('loginMessage');
    const cadastroMsg = document.getElementById('cadastroMessage');

    if (login) login.style.display = 'none';
    if (cadastro) cadastro.style.display = 'block';
    if (loginMsg) loginMsg.style.display = 'none';
    if (cadastroMsg) cadastroMsg.style.display = 'none';
}


// ============================================
// ATUALIZAR STATUS DO WHATSAPP NO MENU - CORRIGIDO
// ============================================
async function atualizarStatusWhatsApp() {
    try {
        const token = localStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null') {
            console.warn('⚠️ Token não encontrado');
            return;
        }

        const indicator = document.getElementById('whatsappStatusIndicator');
        if (!indicator) {
            console.warn('⚠️ Elemento whatsappStatusIndicator não encontrado');
            return;
        }

        // 🔥 VERIFICAR SE É SUPER ADMIN
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const isSuperAdmin = usuario.role === 'super_admin' || usuario.role === 'superadmin';
        
        console.log(`🔄 Atualizando status do WhatsApp... (${isSuperAdmin ? 'Super Admin' : 'Dono'})`);

        const response = await fetch('/api/whatsapp/status', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            console.warn('⚠️ Token expirado ou inválido');
            indicator.className = 'status-dot offline';
            indicator.title = '❌ Sessão expirada';
            indicator.style.background = '#ef4444';
            indicator.style.boxShadow = '0 0 12px rgba(239,68,68,0.4)';
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            indicator.className = 'status-dot';

            if (result.data.connected) {
                indicator.classList.add('online');
                indicator.title = isSuperAdmin ? 
                    `✅ ${result.data.empresa_nome || 'Empresa'} - WhatsApp Conectado` : 
                    '✅ WhatsApp Conectado';
                indicator.style.background = '#22c55e';
                indicator.style.boxShadow = '0 0 12px rgba(34,197,94,0.6)';
                console.log('🟢 WhatsApp Conectado');
            } else if (result.data.status === 'connecting') {
                indicator.classList.add('connecting');
                indicator.title = '⏳ Conectando...';
                indicator.style.background = '#f59e0b';
                indicator.style.boxShadow = '0 0 12px rgba(245,158,11,0.6)';
                console.log('🟡 WhatsApp Conectando...');
            } else {
                indicator.classList.add('offline');
                indicator.title = isSuperAdmin ? 
                    `❌ ${result.data.empresa_nome || 'Nenhuma empresa'} - WhatsApp Desconectado` : 
                    '❌ WhatsApp Desconectado';
                indicator.style.background = '#ef4444';
                indicator.style.boxShadow = '0 0 12px rgba(239,68,68,0.4)';
                console.log('🔴 WhatsApp Desconectado');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar status do WhatsApp:', error);
    }
}

// ============================================
// INICIAR MONITORAMENTO DO WHATSAPP
// ============================================
function iniciarMonitoramentoWhatsApp() {
    let tentativas = 0;
    const maxTentativas = 15;
    
    function verificarERodar() {
        const indicator = document.getElementById('whatsappStatusIndicator');
        if (indicator) {
            console.log('✅ Elemento WhatsApp encontrado, iniciando monitoramento...');
            // Verificar token antes de chamar
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('⚠️ Token não encontrado, aguardando...');
                setTimeout(verificarERodar, 1000);
                return;
            }
            atualizarStatusWhatsApp();
            if (window.whatsappInterval) {
                clearInterval(window.whatsappInterval);
            }
            window.whatsappInterval = setInterval(atualizarStatusWhatsApp, 30000);
        } else {
            tentativas++;
            if (tentativas < maxTentativas) {
                console.log(`⏳ Aguardando menu carregar... (${tentativas}/${maxTentativas})`);
                setTimeout(verificarERodar, 500);
            } else {
                console.warn('⚠️ Elemento WhatsApp não encontrado após várias tentativas');
            }
        }
    }
    
    verificarERodar();
}

// ============================================
// GERAR MENU DINÂMICO - COM INDICADOR WHATSAPP
// ============================================
function gerarMenu(usuario) {
    const isSuperAdmin = usuario.role === 'super_admin' || usuario.role === 'superadmin';
    const isDono = usuario.role === 'dono';
    const isProfissional = usuario.role === 'profissional';

    let menu = '';

    if (isSuperAdmin) {
        menu = `
            <button class="menu-btn" data-page="dashboard" onclick="executarAcao('carregarDashboard', this)">
                <i class="fas fa-chart-pie"></i> Dashboard
            </button>
            <button class="menu-btn" data-page="empresas" onclick="executarAcao('carregarEmpresas', this)">
                <i class="fas fa-building"></i> Empresas
            </button>
            <button class="menu-btn" data-page="whatsapp" onclick="executarAcao('carregarWhatsappConfig', this)">
                <i class="fas fa-whatsapp"></i> WhatsApp
                <span id="whatsappStatusIndicator" class="status-dot offline"></span>
            </button>
            <button class="menu-btn" data-page="planos" onclick="executarAcao('carregarPlanos', this)">
                <i class="fas fa-crown"></i> Planos
            </button>
        `;
    } else if (isDono) {
        menu = `
            <button class="menu-btn" data-page="dashboard" onclick="executarAcao('carregarDashboard', this)">
                <i class="fas fa-chart-pie"></i> Dashboard
            </button>
            <button class="menu-btn" data-page="agendamentos" onclick="executarAcao('carregarAgendamentos', this)">
                <i class="fas fa-calendar-check"></i> Agendamentos
            </button>
            <button class="menu-btn" data-page="servicos" onclick="executarAcao('carregarServicos', this)">
                <i class="fas fa-cut"></i> Serviços
            </button>
            <button class="menu-btn" data-page="financeiro" onclick="executarAcao('carregarFinanceiro', this)">
                <i class="fas fa-coins"></i> Financeiro
            </button>
            <button class="menu-btn" data-page="clientes" onclick="executarAcao('carregarClientes', this)">
                <i class="fas fa-users"></i> Clientes
            </button>
            <button class="menu-btn" data-page="configuracoes" onclick="executarAcao('carregarConfiguracoes', this)">
                <i class="fas fa-cog"></i> Configurações
            </button>
            <button class="menu-btn" data-page="whatsapp" onclick="executarAcao('carregarWhatsappConfig', this)">
                <i class="fas fa-whatsapp"></i> WhatsApp
                <span id="whatsappStatusIndicator" class="status-dot offline"></span>
            </button>
            <button class="menu-btn" data-page="planos" onclick="executarAcao('carregarPlanos', this)">
                <i class="fas fa-crown"></i> Planos
            </button>
        `;
    } else if (isProfissional) {
        menu = `
            <button class="menu-btn" data-page="dashboard" onclick="executarAcao('carregarDashboardProfissional', this)">
                <i class="fas fa-chart-pie"></i> Dashboard
            </button>
            <button class="menu-btn" data-page="agendamentos" onclick="executarAcao('carregarAgendamentosProfissional', this)">
                <i class="fas fa-calendar-check"></i> Agendamentos
            </button>
        `;
    }

    return menu;
}

// ============================================
// INICIAR UI
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    initResponsiveSidebar();
    controlarMenu();
    setTimeout(forcarCoresHeader, 500);

    // Iniciar monitoramento do WhatsApp se estiver logado
    const token = localStorage.getItem('token');
    if (token) {
        setTimeout(iniciarMonitoramentoWhatsApp, 1500);
    }
});

window.addEventListener('storage', function (e) {
    if (e.key === 'token' || e.key === 'usuario') {
        controlarMenu();
        setTimeout(forcarCoresHeader, 500);
        if (e.key === 'token' && e.newValue) {
            setTimeout(iniciarMonitoramentoWhatsApp, 1500);
        }
    }
});

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.carregarCSS = carregarCSS;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showModal = showModal;
window.initResponsiveSidebar = initResponsiveSidebar;
window.controlarMenu = controlarMenu;
window.forcarCoresHeader = forcarCoresHeader;
window.fecharSidebarMobile = fecharSidebarMobile;
window.executarAcao = executarAcao;
window.formatarDataBr = formatarDataBr;
window.mostrarLanding = mostrarLanding;
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.gerarMenu = gerarMenu;
window.atualizarStatusWhatsApp = atualizarStatusWhatsApp;
window.iniciarMonitoramentoWhatsApp = iniciarMonitoramentoWhatsApp;

console.log('✅ UI.js carregado com sucesso - v7.2');