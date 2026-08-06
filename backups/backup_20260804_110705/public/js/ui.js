// ============================================
// UI FUNCTIONS - SEE&AGENDE v7.0
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
// FORÇAR CORES DO HEADER
// ============================================
function forcarCoresHeader() {
    const userNameEl = document.getElementById('userName');
    const userBadgeEl = document.getElementById('userBadge');

    if (userNameEl) {
        userNameEl.style.color = '#ffffff';
        userNameEl.style.fontWeight = '500';
        userNameEl.style.fontSize = '14px';
        userNameEl.style.textShadow = '0 1px 4px rgba(0,0,0,0.3)';
    }

    if (userBadgeEl) {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (usuario.role === 'superadmin') {
            userBadgeEl.innerHTML = '<span style="color:#ef4444;background:rgba(239,68,68,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🔴 SUPER ADMIN</span>';
        } else if (usuario.role === 'profissional') {
            userBadgeEl.innerHTML = '<span style="color:#667eea;background:rgba(102,126,234,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🔵 PROFISSIONAL</span>';
        } else {
            userBadgeEl.innerHTML = '<span style="color:#f59e0b;background:rgba(245,158,11,0.15);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🟠 Proprietário</span>';
        }
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

    // 🔥 CARREGAR CSS DA LANDING
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
// INICIAR UI
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    initResponsiveSidebar();
    controlarMenu();
    setTimeout(forcarCoresHeader, 500);
});

window.addEventListener('storage', function (e) {
    if (e.key === 'token' || e.key === 'usuario') {
        controlarMenu();
        setTimeout(forcarCoresHeader, 500);
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

console.log('✅ UI.js carregado com sucesso - v7.0');