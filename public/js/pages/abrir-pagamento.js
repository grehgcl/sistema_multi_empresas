
// ============================================
// ?? ABRIR MODAL DE FORMA DE PAGAMENTO
// ============================================

function abrirModalPagamento(agendamentoId) {
    console.log('💰 Abrindo modal de pagamento para:', agendamentoId);
    
    const token = localStorage.getItem('token');
    
    fetch('/api/agendamentos', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(res => res.json())
    .then(data => {
        const agendamento = data.data.find(a => a.id === agendamentoId);
        if (!agendamento) {
            showToast('Agendamento não encontrado', 'error');
            return;
        }
        
        console.log('📋 Agendamento:', agendamento);
        
        // Aqui vai o código do modal...
    })
    .catch(err => {
        console.error('❌ Erro:', err);
        showToast('Erro ao carregar agendamento', 'error');
    });
}
