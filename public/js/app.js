// app.js - Arquivo principal
let token = null;
let usuario = null;

// Função para ativar botão do menu
function ativarBotao(id) {
    document.querySelectorAll('.sidebar button').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById('btn' + id);
    if (btn) btn.classList.add('active');
}

// Função para fechar modal
window.fecharModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

// Função de logout
window.logout = function() {
    localStorage.clear();
    location.reload();
};

// Exportar funções globais
window.ativarBotao = ativarBotao;
