// ============================================
// FUNÇÕES AUXILIARES - NÃO MEXER!
// ============================================

function horaParaMinutos(horaStr) {
    if (!horaStr) return 0;
    const partes = horaStr.split(':');
    return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

function minutosParaHora(minutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getDiaSemanaFromDate(dataStr) {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const dataUTC = new Date(Date.UTC(ano, mes - 1, dia));
    return dataUTC.getUTCDay();
}

function gerarSenhaTemporaria() {
    return Math.random().toString(36).slice(-8);
}

module.exports = {
    horaParaMinutos,
    minutosParaHora,
    getDiaSemanaFromDate,
    gerarSenhaTemporaria
};