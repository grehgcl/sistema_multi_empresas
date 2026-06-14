// ============================================
// UI FUNCTIONS - BARBEARIA PRO v2.0
// ============================================

// Inicializar UI quando o DOM carregar
document.addEventListener('DOMContentLoaded', function () {
    initResponsiveSidebar();
});

// Sidebar Responsiva com Swipe
function initResponsiveSidebar() {
    // Criar botão menu mobile
    const menuBtn = document.createElement('button');
    menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
    menuBtn.className = 'menu-mobile-btn';
    document.body.appendChild(menuBtn);

    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    const sidebar = document.querySelector('.sidebar');
    let touchStartX = 0;
    let touchEndX = 0;

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }

    // Detectar swipe para fechar
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

    overlay.onclick = closeSidebar;

    // Fechar sidebar ao clicar em link no mobile
    if (sidebar) {
        sidebar.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', function () {
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            });
        });
    }

    // Fechar ao redimensionar para desktop
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
}

// Toast Notification melhorado
function showToast(message, type = 'success') {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type]}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);

    // Ajuste para mobile
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
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Loading Spinner
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

// Modal helper melhorado
function showModal(title, content, onConfirm = null) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${title}</h3>
            <div style="margin: 20px 0;">${content}</div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('.modal').remove()">Cancelar</button>
                <button class="btn-confirm" style="background: linear-gradient(135deg, #48bb78, #38a169);">Confirmar</button>
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

// Funções globais para acesso em todas as páginas
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showModal = showModal;