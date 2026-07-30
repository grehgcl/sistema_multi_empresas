// pages/dashboard.js - Versão com DURAÇÃO DOS SERVIÇOS e MOBILE MELHORADO

let dashboardData = null;
let chartInstance = null;

// ============================================
// AGENDA INTELIGENTE - FUNCIONAL
// ============================================

let agendaInteligenteData = [];
let agendaInteligenteDate = new Date();
let agendaInteligenteHorarios = [];
let agendaInteligenteProfissionais = [];
let agendaInteligenteCores = {};
let agendaInteligenteCarregando = false;
let agendaModoCompleto = false;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function horaParaMinutos(horaStr) {
    if (!horaStr) return 0;
    const [h, m] = horaStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

function minutosParaHora(minutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isHorarioOcupadoComDuracao(agendamentos, profissionalId, data, hora) {
    const horaMin = horaParaMinutos(hora);
    for (let ag of agendamentos) {
        if (ag.profissional_id !== profissionalId) continue;
        if (ag.data !== data) continue;
        if (ag.status === 'cancelado') continue;
        if (!ag.hora) continue;
        const agHoraMin = horaParaMinutos(ag.hora);
        let agDuracao = 30;
        if (ag.servico_id) {
            const servico = window.servicosListGlobal?.find(s => s.id === ag.servico_id);
            if (servico && servico.duracao) agDuracao = servico.duracao;
        }
        const agFimMin = agHoraMin + agDuracao;
        if (horaMin >= agHoraMin && horaMin < agFimMin) return true;
    }
    return false;
}

function isMobileScreen() {
    return window.innerWidth < 768;
}

function atualizarModoAgendaPorTela() {
    const mobile = isMobileScreen();
    const novoModo = !mobile;
    if (agendaModoCompleto !== novoModo) {
        agendaModoCompleto = novoModo;
        const container = document.getElementById('agendaInteligenteContainer');
        if (container && container.innerHTML && !container.innerHTML.includes('Carregando')) {
            renderizarAgendaInteligente();
        }
    }
}

const coresPaleta = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF9FF3', '#54A0FF', '#5F27CD', '#341F97',
    '#00D2D3', '#1DD1A1', '#F368E0', '#FF9F43', '#EE5A24'
];

// ============================================
// FORMATAR DATA BR - CORRIGIDO (SEM TIMEZONE)
// ============================================

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                return partes[2] + '/' + partes[1] + '/' + partes[0];
            }
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

function formatarMoeda(valor) {
    if (valor === undefined || valor === null || isNaN(valor)) return '0,00';
    const num = parseFloat(valor);
    if (isNaN(num)) return '0,00';
    return num.toFixed(2).replace('.', ',');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// CARREGAR AGENDA INTELIGENTE
// ============================================

async function carregarAgendaInteligente() {
    console.log('🔄 CARREGANDO AGENDA DA API...');
    agendaInteligenteData = [];
    agendaInteligenteCarregando = true;
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    try {
        const [horariosRes, profissionaisRes, agendamentosRes, servicosRes] = await Promise.all([
            fetch('/api/horarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/servicos/todos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const servicosData = await servicosRes.json();
        window.servicosListGlobal = servicosData.success ? servicosData.data : [];
        agendaInteligenteHorarios = (await horariosRes.json()).data || [];

        const profs = (await profissionaisRes.json()).data?.filter(p => (p.ativo == 1 || p.ativo == true)) || [];
        const dono = {
            id: 'dono_' + (usuario.empresa_id || 0),
            nome: usuario.nome || 'Dono',
            email: usuario.email || '',
            comissao_percent: 0,
            ativo: 1,
            is_dono: true,
            telefone: usuario.telefone || ''
        };
        agendaInteligenteProfissionais = [dono, ...profs];
        agendaInteligenteCores = {};
        agendaInteligenteCores[dono.id] = '#d4af37';
        profs.forEach((p, idx) => {
            agendaInteligenteCores[p.id] = coresPaleta[idx % coresPaleta.length];
        });

        const agendamentosData = await agendamentosRes.json();
        agendaInteligenteData = agendamentosData.success ? agendamentosData.data : [];
        agendaInteligenteDate = new Date();
        atualizarModoAgendaPorTela();
        renderizarAgendaInteligente();
    } catch (error) {
        console.error('❌ Erro ao carregar agenda:', error);
        const container = document.getElementById('agendaInteligenteContainer');
        if (container) {
            container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);">
                <i class="fas fa-calendar-alt" style="font-size:24px;"></i>
                <p>Erro ao carregar agenda</p>
                <button onclick="carregarAgendaInteligente()" class="btn btn-sm btn-primary">Tentar novamente</button>
            </div>`;
        }
    }
    agendaInteligenteCarregando = false;
}

function isHorarioAlmoco(hora, almocoInicio, almocoFim) {
    if (!almocoInicio || !almocoFim) return false;
    return hora >= almocoInicio && hora < almocoFim;
}

// ============================================
// RENDERIZAR AGENDA INTELIGENTE
// ============================================

function renderizarAgendaInteligente() {
    const isMobile = isMobileScreen();
    const container = document.getElementById('agendaInteligenteContainer');
    if (!container) return;
    if (!agendaInteligenteDate) agendaInteligenteDate = new Date();

    const dataBase = new Date(agendaInteligenteDate);
    const inicioSemana = new Date(dataBase);
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    if (!agendaInteligenteProfissionais || agendaInteligenteProfissionais.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;"><i class="fas fa-users-slash"></i><p>Nenhum profissional</p></div>`;
        return;
    }
    if (!agendaInteligenteHorarios || agendaInteligenteHorarios.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;"><i class="fas fa-clock"></i><p>Horários não configurados</p></div>`;
        return;
    }

    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias.push(d);
    }

    const horaAtual = hoje.getHours();
    const minutoAtual = hoje.getMinutes();
    const diaSemanaHoje = hoje.getDay();
    const horarioConfiguradoHoje = agendaInteligenteHorarios.find(h => h.dia_semana === diaSemanaHoje);

    function gerarHorariosDoDiaConfig(horaInicio, horaFim, almocoInicio, almocoFim) {
        const horarios = [];
        if (!horaInicio || !horaFim) return horarios;
        const [inicioH, inicioM] = horaInicio.split(':').map(Number);
        const [fimH, fimM] = horaFim.split(':').map(Number);
        const [almocoInicioH, almocoInicioM] = (almocoInicio || '12:00').split(':').map(Number);
        const [almocoFimH, almocoFimM] = (almocoFim || '13:00').split(':').map(Number);
        const inicioMin = inicioH * 60 + inicioM;
        const fimMin = fimH * 60 + fimM;
        const almocoInicioMin = almocoInicioH * 60 + almocoInicioM;
        const almocoFimMin = almocoFimH * 60 + almocoFimM;
        for (let minutos = inicioMin; minutos <= fimMin; minutos += 30) {
            if (minutos >= almocoInicioMin && minutos < almocoFimMin) continue;
            const h = Math.floor(minutos / 60);
            const m = minutos % 60;
            horarios.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
        }
        return horarios;
    }

    let horariosBase = [];
    let horarioInicioPadrao = '08:00';
    let horarioFimPadrao = '18:00';
    let almocoInicioPadrao = '12:00';
    let almocoFimPadrao = '13:00';

    if (horarioConfiguradoHoje && (horarioConfiguradoHoje.aberto == 1 || horarioConfiguradoHoje.aberto == true)) {
        horarioInicioPadrao = horarioConfiguradoHoje.hora_inicio || '08:00';
        horarioFimPadrao = horarioConfiguradoHoje.hora_fim || '18:00';
        almocoInicioPadrao = horarioConfiguradoHoje.almoco_inicio || '12:00';
        almocoFimPadrao = horarioConfiguradoHoje.almoco_fim || '13:00';
        horariosBase = gerarHorariosDoDiaConfig(horarioInicioPadrao, horarioFimPadrao, almocoInicioPadrao, almocoFimPadrao);
    }
    if (horariosBase.length === 0) {
        for (let h = 8; h <= 18; h++) {
            horariosBase.push(String(h).padStart(2, '0') + ':00');
            if (h < 18) horariosBase.push(String(h).padStart(2, '0') + ':30');
        }
    }

    let horarioAtualIndex = 0;
    const totalMinutosAtual = horaAtual * 60 + minutoAtual;
    for (let i = 0; i < horariosBase.length; i++) {
        const [h, m] = horariosBase[i].split(':').map(Number);
        if ((h * 60 + m) >= totalMinutosAtual) { horarioAtualIndex = i; break; }
    }

    let diasParaMostrar = dias;
    if (isMobile && !agendaModoCompleto) {
        const hojeIndex = dias.findIndex(d => d.toISOString().split('T')[0] === hojeStr);
        diasParaMostrar = hojeIndex !== -1 ? [dias[hojeIndex]] : [dias[0]];
    }

    // CONSTRUIR HTML
    let html = `<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">`;
    html += `<span style="font-size:11px;font-weight:600;color:var(--text-secondary);">${agendaModoCompleto || !isMobile ? '📅 Semana' : '📆 Hoje'}</span>`;
    if (isMobile) {
        html += `<button onclick="alternarModoAgenda()" style="background:${agendaModoCompleto ? 'rgba(102,126,234,0.15)' : 'var(--primary)'};border:${agendaModoCompleto ? '1px solid var(--border-color)' : 'none'};color:${agendaModoCompleto ? 'var(--text-secondary)' : 'white'};padding:4px 12px;border-radius:20px;font-size:10px;cursor:pointer;">${agendaModoCompleto ? '📱 Ver Hoje' : '📅 Ver Semana'}</button>`;
    }
    html += `</div></div>`;

    const minWidth = isMobile ? (agendaModoCompleto ? '400px' : '200px') : '550px';
    const cellPadding = isMobile ? '4px 2px' : '6px 4px';
    const fontSize = isMobile ? '8px' : '10px';

    html += `<div id="agendaScrollWrapper" style="overflow-x:auto;max-height:${isMobile ? '360px' : '500px'};overflow-y:auto;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-card);">`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:${isMobile ? '9px' : '11px'};min-width:${minWidth};">`;
    html += `<thead><tr><th style="padding:${isMobile ? '4px 2px' : '10px 8px'};background:var(--bg-hover);text-align:center;position:sticky;top:0;z-index:10;font-size:${isMobile ? '7px' : '10px'};min-width:${isMobile ? '32px' : '55px'};"><i class="fas fa-clock"></i></th>`;
    for (let d of diasParaMostrar) {
        const dataStr = d.toISOString().split('T')[0];
        const isHoje = dataStr === hojeStr;
        const nomeDia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const diaNum = d.getDate();
        const agendamentosDia = agendaInteligenteData.filter(a => a.data === dataStr && a.status !== 'cancelado').length;
        let bgTh = isHoje ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg-hover)';
        let colorTh = isHoje ? '#ffffff' : 'var(--text-secondary)';
        html += `<th style="padding:${isMobile ? '4px 2px' : '10px 4px'};background:${bgTh};color:${colorTh};text-align:center;font-weight:${isHoje ? '700' : '600'};position:sticky;top:0;z-index:5;font-size:${isMobile ? '7px' : '10px'};min-width:${isMobile ? '45px' : '70px'};">
            <span style="display:block;font-size:${isMobile ? '6px' : '9px'};text-transform:uppercase;">${nomeDia}</span>
            <span style="font-size:${isHoje ? (isMobile ? '14px' : '18px') : (isMobile ? '11px' : '15px')};font-weight:800;display:block;">${diaNum}</span>
            ${agendamentosDia > 0 ? `<span style="font-size:7px;background:rgba(255,255,255,0.2);padding:1px 4px;border-radius:6px;display:inline-block;">${agendamentosDia} ag.</span>` : ''}
        </th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let idx = 0; idx < horariosBase.length; idx++) {
        const hora = horariosBase[idx];
        const isHorarioAtual = (idx === horarioAtualIndex);
        const isAlmoco = hora >= almocoInicioPadrao && hora < almocoFimPadrao;
        let rowStyle = '';
        if (isHorarioAtual) rowStyle = 'background:linear-gradient(90deg, rgba(102,126,234,0.12), rgba(118,75,162,0.08));border-left:4px solid #667eea;';
        else if (isAlmoco) rowStyle = 'background:rgba(245,158,11,0.04);';
        html += `<tr style="${rowStyle}">`;

        let horarioBg = 'var(--bg-hover)';
        let horarioColor = 'var(--text-primary)';
        let extraContent = '';
        if (isHorarioAtual) {
            horarioBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            horarioColor = '#ffffff';
            extraContent = `<span style="display:block;font-size:7px;background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:8px;margin-bottom:2px;">● AGORA</span>`;
        } else if (isAlmoco) {
            horarioBg = 'rgba(245,158,11,0.1)';
            horarioColor = '#d97706';
            extraContent = `<span style="font-size:12px;">🍽️</span>`;
        }
        html += `<td style="padding:${isMobile ? '3px 2px' : '8px 6px'};text-align:center;border-bottom:1px solid var(--border-color);font-size:${isHorarioAtual ? (isMobile ? '11px' : '14px') : (isMobile ? '9px' : '12px')};font-weight:700;color:${horarioColor};background:${horarioBg};white-space:nowrap;border-right:2px solid ${isHorarioAtual ? '#667eea' : 'var(--border-color)'};min-width:${isMobile ? '32px' : '60px'};position:sticky;left:0;z-index:3;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">${extraContent}<span>${hora}</span></div>
        </td>`;

        for (let d of diasParaMostrar) {
            const dataStr = d.toISOString().split('T')[0];
            const isHoje = dataStr === hojeStr;
            const diaSemana = d.getDay();
            const horarioDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSemana);
            const estaAberto = horarioDia && (horarioDia.aberto == 1 || horarioDia.aberto == true);
            const almocoInicioDia = horarioDia?.almoco_inicio || '12:00';
            const almocoFimDia = horarioDia?.almoco_fim || '13:00';
            const noAlmoco = estaAberto && isHorarioAlmoco(hora, almocoInicioDia, almocoFimDia);

            let dentroExpediente = true;
            if (estaAberto && horarioDia) {
                const [hInicio, mInicio] = (horarioDia.hora_inicio || '08:00').split(':').map(Number);
                const [hFim, mFim] = (horarioDia.hora_fim || '18:00').split(':').map(Number);
                const [hAtual, mAtual] = hora.split(':').map(Number);
                const minAtual = hAtual * 60 + mAtual;
                dentroExpediente = minAtual >= (hInicio * 60 + mInicio) && minAtual <= (hFim * 60 + mFim);
            }

            let cellContent = '';
            let bgColor = 'transparent';
            let title = '';
            let onClick = '';
            const dataObj = new Date(dataStr + 'T00:00:00');
            const hojeObj = new Date();
            hojeObj.setHours(0, 0, 0, 0);
            const dataPassou = dataObj < hojeObj;

            if (!estaAberto || !dentroExpediente) {
                bgColor = 'rgba(107,114,128,0.04)';
                cellContent = `<span style="color:#9ca3af;font-size:12px;">—</span>`;
            } else if (dataPassou) {
                bgColor = 'rgba(107,114,128,0.04)';
                cellContent = `<span style="color:#9ca3af;font-size:12px;opacity:0.3;">⏰</span>`;
            } else if (noAlmoco) {
                bgColor = 'rgba(245,158,11,0.06)';
                cellContent = `<span style="color:#d97706;font-size:14px;">🍽️</span>`;
            } else {
                let ocupados = 0;
                const totalProf = agendaInteligenteProfissionais.length;
                for (let p of agendaInteligenteProfissionais) {
                    let ocupado = false;
                    if (p.is_dono === true) {
                        for (let ag of agendaInteligenteData) {
                            if (ag.data !== dataStr || ag.status === 'cancelado' || (ag.profissional_id !== null && ag.profissional_id !== '') || !ag.hora) continue;
                            const agHoraMin = horaParaMinutos(ag.hora);
                            let agDuracao = 30;
                            if (ag.servico_id) {
                                const servico = window.servicosListGlobal?.find(s => s.id === ag.servico_id);
                                if (servico && servico.duracao) agDuracao = servico.duracao;
                            }
                            if (horaParaMinutos(hora) >= agHoraMin && horaParaMinutos(hora) < (agHoraMin + agDuracao)) { ocupado = true; break; }
                        }
                    } else {
                        ocupado = isHorarioOcupadoComDuracao(agendaInteligenteData, p.id, dataStr, hora);
                    }
                    if (ocupado) ocupados++;
                }
                const livres = totalProf - ocupados;
                const temOcupados = ocupados > 0;
                if (livres === 0) {
                    bgColor = 'rgba(239, 68, 68, 0.12)';
                    cellContent = `<span style="font-size:${isMobile ? '8px' : '10px'};color:#dc2626;font-weight:700;">LOTADO</span>`;
                    title = `${ocupados} ocupados, 0 livres`;
                } else if (temOcupados) {
                    bgColor = 'rgba(245, 158, 11, 0.12)';
                    cellContent = `<span style="font-size:${isMobile ? '8px' : '10px'};color:#d97706;font-weight:600;">${ocupados}/${totalProf}</span>`;
                    title = `${ocupados} ocupados, ${livres} livres`;
                } else {
                    bgColor = 'rgba(16, 185, 129, 0.12)';
                    cellContent = `<span style="font-size:${isMobile ? '8px' : '10px'};color:#059669;font-weight:600;">${livres} ${isMobile ? 'L' : 'Livres'}</span>`;
                    title = `Todos livres (${livres})`;
                }
                if (temOcupados) {
                    onClick = `abrirDetalhesSlot('${dataStr}', '${hora}')`;
                } else {
                    onClick = `abrirAgendamentoInteligente('${dataStr}', '${hora}')`;
                }
            }
            html += `<td style="padding:${cellPadding};border-bottom:1px solid var(--border-color);background:${bgColor};text-align:center;font-size:${fontSize};min-height:${isMobile ? '32px' : '42px'};vertical-align:middle;cursor:${onClick ? 'pointer' : 'default'};${isHoje ? 'border-left:1px solid rgba(102,126,234,0.1);border-right:1px solid rgba(102,126,234,0.1);' : ''}" title="${title}" onclick="${onClick}" onmouseover="this.style.filter='brightness(0.95)'" onmouseout="this.style.filter='none'">${cellContent}</td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table></div>`;

    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:${isMobile ? '6px 2px 0' : '12px 4px 0'};border-top:1px solid var(--border-color);margin-top:8px;font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);flex-wrap:wrap;">
        <div style="display:flex;gap:4px;align-items:center;">
            <button onclick="mudarAgendaSemana(-7)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:4px;cursor:pointer;padding:3px 8px;color:var(--text-secondary);font-size:11px;">◀◀</button>
            <button onclick="mudarAgendaSemana(-1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:4px;cursor:pointer;padding:3px 8px;color:var(--text-secondary);font-size:11px;">◀</button>
            <span style="font-weight:600;color:var(--text-primary);font-size:11px;background:var(--bg-hover);padding:3px 10px;border-radius:4px;border:1px solid var(--border-color);">
                ${(isMobile && !agendaModoCompleto) ? diasParaMostrar[0]?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : `${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
            </span>
            <button onclick="mudarAgendaSemana(1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:4px;cursor:pointer;padding:3px 8px;color:var(--text-secondary);font-size:11px;">▶</button>
            <button onclick="mudarAgendaSemana(7)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:4px;cursor:pointer;padding:3px 8px;color:var(--text-secondary);font-size:11px;">▶▶</button>
            <button onclick="irAgendaHoje()" style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:4px;cursor:pointer;padding:3px 10px;color:white;font-size:10px;font-weight:600;">📌 Hoje</button>
        </div>
    </div>`;

    container.innerHTML = html;
    setTimeout(() => {
        const wrapper = document.getElementById('agendaScrollWrapper');
        if (!wrapper) return;
        const rows = wrapper.querySelectorAll('tbody tr');
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].textContent.includes('● AGORA')) {
                const rowHeight = rows[i]?.offsetHeight || 40;
                const wrapperHeight = wrapper.clientHeight;
                wrapper.scrollTo({ top: Math.max(0, (i * rowHeight) - (wrapperHeight / 2) + (rowHeight / 2)), behavior: 'smooth' });
                break;
            }
        }
    }, 300);
}

// ============================================
// FUNÇÃO: DETALHES DO SLOT
// ============================================

function abrirDetalhesSlot(data, hora) {
    console.log(`🔍 Abrindo detalhes para: ${data} às ${hora}`);
    const horaNormalizada = String(hora).trim();
    const agendamentosNoSlot = agendaInteligenteData.filter(a => {
        if (a.data !== data) return false;
        if (a.status === 'cancelado') return false;
        if (!a.hora) return false;
        return String(a.hora).trim() === horaNormalizada;
    });

    const profissionaisOcupadosIds = agendamentosNoSlot.map(a => a.profissional_id);
    const statusProfissionais = agendaInteligenteProfissionais.map(p => {
        let ocupado = false;
        if (p.is_dono === true) {
            ocupado = agendamentosNoSlot.some(a => a.profissional_id === null || a.profissional_id === '');
        } else {
            ocupado = profissionaisOcupadosIds.includes(p.id);
        }
        return { ...p, ocupado };
    });
    const livres = statusProfissionais.filter(p => !p.ocupado);
    const ocupados = statusProfissionais.filter(p => p.ocupado);

    if (ocupados.length === 0) {
        abrirAgendamentoInteligente(data, hora);
        return;
    }

    let htmlOcupados = ocupados.map(ag => {
        const agendamento = agendamentosNoSlot.find(a => a.profissional_id === ag.id || (ag.is_dono && (a.profissional_id === null || a.profissional_id === '')));
        const nomeCliente = agendamento ? agendamento.cliente_nome : 'Cliente';
        return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-color);font-size:13px;">
            <span style="font-weight:600;">${escapeHtml(nomeCliente)}</span>
            <span style="color:#ef4444;">🔴 ${escapeHtml(ag.nome)}</span>
        </div>`;
    }).join('');

    let htmlLivres = '';
    if (livres.length > 0) {
        htmlLivres = `<div style="margin-top:15px;font-size:12px;color:var(--text-muted);font-weight:600;">PROFISSIONAIS DISPONÍVEIS:</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
            ${livres.map(p => `<button onclick="fecharModalDetalhes(); forcarAgendamento('${data}', '${hora}', '${p.id}')" 
                style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#059669;padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;">
                ✅ ${escapeHtml(p.nome)}
            </button>`).join('')}
        </div>`;
    } else {
        htmlLivres = `<div style="margin-top:10px;color:#ef4444;font-size:12px;font-weight:600;">⚠️ Nenhum profissional disponível neste horário.</div>`;
    }

    const modalHtml = `<div id="modalDetalhesSlot" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">
        <div style="background:var(--bg-card);border-radius:16px;padding:20px;max-width:450px;width:100%;border:1px solid var(--border-color);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="margin:0;font-size:16px;">📅 ${formatarDataBr(data)} às ${hora}</h3>
                <button onclick="document.getElementById('modalDetalhesSlot').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);">×</button>
            </div>
            <div style="margin-bottom:15px;"><div style="font-size:12px;color:var(--text-muted);margin-bottom:5px;">OCUPADOS (${ocupados.length})</div>${htmlOcupados}</div>
            ${htmlLivres}
            <div style="margin-top:15px;padding-top:10px;border-top:1px solid var(--border-color);display:flex;justify-content:flex-end;gap:8px;">
                <button onclick="document.getElementById('modalDetalhesSlot').remove()" style="background:var(--bg-hover);border:1px solid var(--border-color);padding:6px 16px;border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-secondary);">Fechar</button>
                <button onclick="fecharModalDetalhes(); abrirAgendamentoInteligente('${data}', '${hora}')" style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;font-weight:600;">📝 Novo Agendamento</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function fecharModalDetalhes() {
    const modal = document.getElementById('modalDetalhesSlot');
    if (modal) modal.remove();
}

// ============================================
// FUNÇÃO: FORCAR AGENDAMENTO
// ============================================

async function forcarAgendamento(data, hora, profissionalId) {
    console.log(`🔥 Forçando agendamento: ${data} ${hora} com Prof ID: ${profissionalId}`);
    fecharModalDetalhes();
    await abrirAgendamentoInteligente(data, hora, profissionalId);
}

// ============================================
// FUNÇÃO: ABRIR AGENDAMENTO INTELIGENTE
// ============================================

async function abrirAgendamentoInteligente(data, hora, profissionalId = null) {
    console.log(`📝 Abrindo agendamento:`, { data, hora, profissionalId });
    let dataStr = typeof data === 'string' ? data : String(data);
    let horaStr = typeof hora === 'string' ? hora : String(hora);

    if (!dataStr || !dataStr.includes('-')) {
        showToast('❌ Data inválida para agendamento', 'error');
        return;
    }

    const agora = new Date();
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const [horaNum, minutoNum] = horaStr.split(':').map(Number);
    const dataHoraSelecionada = new Date(ano, mes - 1, dia, horaNum || 0, minutoNum || 0, 0, 0);
    if (dataHoraSelecionada < agora) {
        showToast('⏰ Não é possível agendar em datas ou horários que já passaram!', 'warning');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showToast('❌ Sessão expirada', 'error');
        return;
    }

    try {
        if (typeof abrirModalAgendamentoDono !== 'function') {
            showToast('❌ Função de agendamento não disponível', 'error');
            return;
        }
        abrirModalAgendamentoDono();

        let tentativas = 0;
        const maxTentativas = 30;

        function preencherModal() {
            tentativas++;
            const dataInput = document.getElementById('dataAgendamentoDono');
            const horaSelect = document.getElementById('horaAgendamentoDono');
            const profSelect = document.getElementById('profissionalIdDono');

            if (!dataInput || !horaSelect || !profSelect) {
                if (tentativas < maxTentativas) {
                    setTimeout(preencherModal, 200);
                } else {
                    showToast('❌ Erro ao carregar modal', 'error');
                }
                return;
            }

            dataInput.value = dataStr;
            dataInput.dispatchEvent(new Event('change', { bubbles: true }));

            let encontrado = false;
            for (let opt of horaSelect.options) {
                if (opt.value === horaStr) {
                    horaSelect.value = horaStr;
                    encontrado = true;
                    break;
                }
            }
            if (!encontrado) {
                const newOpt = document.createElement('option');
                newOpt.value = horaStr;
                newOpt.textContent = horaStr;
                horaSelect.appendChild(newOpt);
                horaSelect.value = horaStr;
            }
            horaSelect.dispatchEvent(new Event('change', { bubbles: true }));

            if (profissionalId) {
                for (let opt of profSelect.options) {
                    if (opt.value == profissionalId) {
                        profSelect.value = profissionalId;
                        break;
                    }
                }
            }

            showToast(`📅 ${formatarDataBr(dataStr)} às ${horaStr} - Selecione um cliente`, 'info');
        }
        setTimeout(preencherModal, 500);
    } catch (error) {
        console.error('❌ Erro ao abrir agendamento:', error);
        showToast('❌ Erro ao abrir agendamento', 'error');
    }
}

// ============================================
// FUNÇÃO: SALVAR AGENDAMENTO DO MODAL
// ============================================

function salvarAgendamentoDoModal(dataOriginal) {
    const clienteId = document.getElementById('clienteIdDono')?.value;
    const buscaInput = document.getElementById('buscaClienteDono');
    const horaSelect = document.getElementById('horaAgendamentoDono');
    const servicoSelect = document.getElementById('servicoIdDono');
    const valorInput = document.getElementById('valorAgendamentoDono');
    const profSelect = document.getElementById('profissionalIdDono');
    const descInput = document.getElementById('servicoDescricaoDono');

    let cliente_id = clienteId;
    if (!cliente_id && buscaInput && buscaInput.value) {
        const nomeBusca = buscaInput.value.trim();
        if (window.clientesList && window.clientesList.length > 0) {
            const encontrado = window.clientesList.find(c => c.nome.toLowerCase() === nomeBusca.toLowerCase());
            if (encontrado) {
                cliente_id = encontrado.id;
                document.getElementById('clienteIdDono').value = encontrado.id;
            }
        }
    }

    const horaSelecionada = horaSelect?.value;
    if (!cliente_id) {
        showToast('Selecione um cliente na busca', 'warning');
        if (buscaInput) buscaInput.focus();
        return;
    }
    if (!horaSelecionada) {
        showToast('Selecione um horário', 'warning');
        return;
    }

    const agora = new Date();
    const [ano, mes, dia] = dataOriginal.split('-').map(Number);
    const [horaNum, minutoNum] = horaSelecionada.split(':').map(Number);
    const dataHoraSelecionada = new Date(ano, mes - 1, dia, horaNum || 0, minutoNum || 0, 0, 0);
    if (dataHoraSelecionada < agora) {
        showToast('⏰ Não é possível agendar em datas ou horários que já passaram!', 'warning');
        return;
    }

    showLoading();
    const token = localStorage.getItem('token');
    const body = {
        cliente_id: parseInt(cliente_id),
        data: dataOriginal,
        hora: horaSelecionada,
        valor: parseFloat(valorInput?.value) || 0
    };
    if (profSelect?.value && profSelect.value !== '') body.profissional_id = parseInt(profSelect.value);
    if (servicoSelect?.value && servicoSelect.value !== '') body.servico_id = parseInt(servicoSelect.value);
    else if (descInput?.value && descInput.value.trim() !== '') body.servico = descInput.value.trim();

    fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(body)
    })
        .then(r => r.json())
        .then(result => {
            hideLoading();
            if (result.success) {
                showToast('✅ Agendamento criado!', 'success');
                fecharModalAgendamentoDono();
                agendaInteligenteData = [];
                setTimeout(() => carregarAgendaInteligente(), 500);
                if (typeof carregarAgendamentos === 'function') carregarAgendamentos();
            } else {
                showToast('❌ ' + result.message, 'error');
            }
        })
        .catch(err => {
            hideLoading();
            showToast('❌ Erro ao criar agendamento', 'error');
        });
}

// ============================================
// ALTERNAR MODO DA AGENDA
// ============================================

function alternarModoAgenda() {
    agendaModoCompleto = !agendaModoCompleto;
    renderizarAgendaInteligente();
}

function mudarAgendaSemana(direcao) {
    agendaInteligenteDate.setDate(agendaInteligenteDate.getDate() + direcao);
    renderizarAgendaInteligente();
}

function irAgendaHoje() {
    agendaInteligenteDate = new Date();
    if (agendaModoCompleto && isMobileScreen()) agendaModoCompleto = false;
    renderizarAgendaInteligente();
}

function atualizarAgendaAposAgendamento() {
    agendaInteligenteData = [];
    setTimeout(() => carregarAgendaInteligente(), 300);
}

function forcarRecarregarAgenda() {
    agendaInteligenteData = [];
    setTimeout(() => carregarAgendaInteligente(), 500);
}

// ============================================
// FUNÇÃO PRINCIPAL - CARREGAR DASHBOARD
// ============================================

async function carregarDashboard() {
    ativarBotao('dashboard');
    showLoading();
    try {
        const usuarioStr = localStorage.getItem('usuario');
        const usuarioAtual = usuarioStr ? JSON.parse(usuarioStr) : null;
        if (usuarioAtual && usuarioAtual.role === 'superadmin') {
            await carregarDashboardSuperAdmin();
        } else if (usuarioAtual && usuarioAtual.role === 'profissional') {
            await carregarDashboardProfissional();
        } else {
            await carregarDashboardDono();
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showToast('Erro ao carregar dashboard', 'error');
        document.getElementById('content').innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar dashboard.</p><button onclick="carregarDashboard()" class="btn btn-primary">Tentar Novamente</button></div>`;
    }
    hideLoading();
}

// ============================================
// DASHBOARD DO DONO - COMPLETO
// ============================================

async function carregarDashboardDono() {
    const token = localStorage.getItem('token');

    let empresa = { plano: 'trial', assinatura_ativa: 0 };

    try {
        const empresaRes = await fetch('/api/empresa/dados', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const empresaData = await empresaRes.json();
        if (empresaData.success) {
            empresa = empresaData.data;
        }
    } catch (error) {
        console.warn('Não foi possível buscar dados da empresa:', error);
    }

    let despesasMes = { total_despesas: 0, total_pago: 0, total_pendente: 0, por_categoria: [] };
    try {
        const despesasRes = await fetch('/api/despesas/resumo', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const despesasData = await despesasRes.json();
        if (despesasData.success) {
            despesasMes = despesasData.data || despesasMes;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao buscar despesas:', error);
    }

    const [agendamentosRes, clientesRes, servicosRes, financeiroRes, profissionaisRes] = await Promise.all([
        fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/servicos/todos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/financeiro', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const agendamentos = (await agendamentosRes.json()).data || [];
    const clientes = (await clientesRes.json()).data || [];
    const servicos = (await servicosRes.json()).data || [];
    const financeiro = (await financeiroRes.json()).data || {};
    const profissionais = (await profissionaisRes.json()).data || [];

    const planoAtual = empresa.plano || 'trial';
    const assinaturaAtiva = (empresa.assinatura_ativa == 1 || empresa.assinatura_ativa == true);

    let mostrarAvisoTrial = false;
    let diasRestantes = 0;
    let mensagemTrial = '';

    if (!assinaturaAtiva && planoAtual === 'trial') {
        if (empresa.trial_expira) {
            const hoje = new Date();
            const dataExpira = new Date(empresa.trial_expira);
            diasRestantes = Math.ceil((dataExpira - hoje) / (1000 * 60 * 60 * 24));

            if (diasRestantes > 0 && diasRestantes <= 45) {
                mostrarAvisoTrial = true;
                mensagemTrial = `⚠️ Período de teste: ${diasRestantes} dias restantes.`;
            }
        }
    }

    if (assinaturaAtiva) {
        mostrarAvisoTrial = false;
    }

    const totais = financeiro.totais || {};

    const faturamentoBruto = parseFloat(totais.faturamento_bruto) || 0;
    const totalComissoes = parseFloat(totais.total_comissoes) || 0;
    const totalServicosConcluidos = parseInt(totais.total_servicos) || 0;

    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => a.data === hoje);
    const pendentes = agendamentos.filter(a => a.status === 'pendente');
    const concluidos = agendamentos.filter(a => a.status === 'concluido');

    const dataAtual = new Date();
    const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).toISOString().split('T')[0];

    const faturamentoMes = agendamentos.filter(a =>
        a.status === 'concluido' && a.data >= primeiroDiaMes
    ).reduce((sum, a) => {
        const valor = parseFloat(a.valor_total) || parseFloat(a.valor) || 0;
        return sum + valor;
    }, 0);

    const totalDespesas = despesasMes.total_despesas || 0;
    const totalPago = despesasMes.total_pago || 0;
    const totalPendente = despesasMes.total_pendente || 0;
    const categoriasDespesas = despesasMes.por_categoria || [];

    const lucroReal = faturamentoMes - totalDespesas;
    const lucroAposComissoes = faturamentoMes - totalComissoes;
    const margemLucro = faturamentoMes > 0 ? ((lucroReal / faturamentoMes) * 100).toFixed(1) : 0;

    const diasComDados = concluidos.length > 0 ? Math.min(concluidos.length, 30) : 1;
    const mediaDiaria = diasComDados > 0 ? faturamentoMes / diasComDados : 0;
    const projecao30Dias = mediaDiaria * 30;

    let ticketMedio = 0;
    if (concluidos.length > 0) {
        const total = concluidos.reduce((sum, a) => {
            const valor = parseFloat(a.valor_total) || parseFloat(a.valor) || 0;
            return sum + valor;
        }, 0);
        ticketMedio = total / concluidos.length;
    }

    const profissionaisAtivos = profissionais.filter(p => (p.ativo == 1 || p.ativo == true) || p.ativo === true).length;

    const novosClientesMes = clientes.filter(c => {
        const dataCriacao = new Date(c.created_at);
        return dataCriacao >= new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    }).length;

    const proximosAgendamentos = agendamentos
        .filter(a => a.status === 'pendente' && a.data >= hoje)
        .sort((a, b) => (a.data + ' ' + a.hora).localeCompare(b.data + ' ' + b.hora))
        .slice(0, 5);

    const isNewUser = agendamentos.length === 0 && clientes.length === 0;

    const usuarioStr = localStorage.getItem('usuario');
    const usuarioAtual = usuarioStr ? JSON.parse(usuarioStr) : null;
    const nomeUsuario = usuarioAtual?.nome || 'Usuário';

    const isMobile = window.innerWidth < 768;

    // ============================================
    // HTML DO DASHBOARD - COMPLETO
    // ============================================
    const html = `
        <div class="fade-in">
            ${mostrarAvisoTrial ? `
                <div class="trial-banner" style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:10px 20px;border-radius:12px;margin-bottom:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                        <span style="color:white;font-weight:600;font-size:14px;">${mensagemTrial}</span>
                        <button onclick="carregarPlanos()" style="background:white;border:none;padding:6px 16px;border-radius:8px;font-weight:600;color:#d97706;cursor:pointer;">Fazer upgrade →</button>
                    </div>
                </div>
            ` : ''}
            
            <!-- BANNER DE BOAS-VINDAS -->
            <div style="background:linear-gradient(135deg,var(--bg-card),var(--bg-hover));border-radius:16px;padding:${isMobile ? '16px' : '20px 24px'};margin-bottom:16px;border:1px solid var(--border-color);">
                <div style="display:flex;${isMobile ? 'flex-direction:column;text-align:center;' : 'justify-content:space-between;align-items:center;'}flex-wrap:wrap;gap:12px;">
                    <div>
                        <h2 style="font-size:${isMobile ? '18px' : '20px'};margin:0;display:flex;align-items:center;gap:8px;${isMobile ? 'justify-content:center;' : ''}">
                            👋 Olá, ${nomeUsuario}!
                        </h2>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:${isMobile ? '13px' : '14px'};">
                            ${isMobile ? '📊 Resumo do seu negócio' : 'Bem-vindo ao See&Agende. Aqui está o resumo do seu negócio hoje.'}
                        </p>
                        <div style="margin-top:8px;font-size:${isMobile ? '12px' : '13px'};color:var(--text-secondary);background:rgba(102,126,234,0.08);padding:${isMobile ? '6px 12px' : '4px 12px'};border-radius:8px;display:${isMobile ? 'block' : 'inline-block'};text-align:center;">
                            <i class="fas fa-lightbulb" style="color:var(--primary);"></i> 
                            ${isNewUser ? '💡 Comece cadastrando seus serviços!' : '💡 Clique nas bolinhas 🟢 da agenda para agendar'}
                        </div>
                    </div>
                    <div style="text-align:${isMobile ? 'center' : 'right'};${isMobile ? 'width:100%;' : ''}">
                        <span style="display:block;font-weight:600;font-size:${isMobile ? '15px' : '14px'};color:var(--text-primary);">
                            ${dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}
                        </span>
                        <span style="display:block;font-size:${isMobile ? '13px' : '12px'};color:var(--text-muted);">
                            ${dataAtual.toLocaleDateString('pt-BR')}
                        </span>
                        <span style="display:block;font-size:${isMobile ? '13px' : '11px'};color:var(--text-muted);margin-top:6px;background:rgba(16,185,129,0.08);padding:${isMobile ? '6px 12px' : '2px 12px'};border-radius:8px;">
                            💰 ${faturamentoMes > 0 ? `R$ ${formatarMoeda(faturamentoMes)} este mês` : 'Nenhum faturamento ainda'}
                        </span>
                    </div>
                </div>
            </div>

            <!-- CARDS FINANCEIROS -->
            <div style="margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                    <h3 style="font-size:${isMobile ? '14px' : '15px'};margin:0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <i class="fas fa-chart-pie" style="color:var(--primary);"></i> 
                        📊 Financeiro
                        <span style="font-size:${isMobile ? '9px' : '10px'};font-weight:400;color:var(--text-muted);background:var(--bg-hover);padding:2px 10px;border-radius:12px;">
                            ${dataAtual.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                        </span>
                    </h3>
                    <button onclick="carregarFinanceiro()" style="background:var(--bg-hover);border:1px solid var(--border-color);padding:${isMobile ? '4px 10px' : '4px 12px'};border-radius:8px;font-size:${isMobile ? '10px' : '11px'};cursor:pointer;color:var(--text-secondary);">
                        <i class="fas fa-arrow-right"></i> ${isMobile ? 'Detalhes' : 'Ver detalhes'}
                    </button>
                </div>
                
                <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(auto-fit,minmax(180px,1fr))'};gap:${isMobile ? '8px' : '12px'};">
                    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.12),rgba(118,75,162,0.06));border-radius:12px;padding:${isMobile ? '12px 14px' : '14px 16px'};border:1px solid rgba(102,126,234,0.15);">
                        <div style="display:flex;align-items:center;gap:${isMobile ? '8px' : '10px'};">
                            <span style="font-size:${isMobile ? '20px' : '22px'};">💰</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:${isMobile ? '16px' : '18px'};font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(faturamentoMes)}</div>
                                <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Faturamento</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(220,38,38,0.04));border-radius:12px;padding:${isMobile ? '12px 14px' : '14px 16px'};border:1px solid rgba(239,68,68,0.12);">
                        <div style="display:flex;align-items:center;gap:${isMobile ? '8px' : '10px'};">
                            <span style="font-size:${isMobile ? '20px' : '22px'};">📉</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:${isMobile ? '16px' : '18px'};font-weight:700;color:#ef4444;">- R$ ${formatarMoeda(totalDespesas)}</div>
                                <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Despesas</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:linear-gradient(135deg,rgba(34,197,94,0.1),rgba(16,185,129,0.05));border-radius:12px;padding:${isMobile ? '12px 14px' : '14px 16px'};border:1px solid rgba(34,197,94,0.15);">
                        <div style="display:flex;align-items:center;gap:${isMobile ? '8px' : '10px'};">
                            <span style="font-size:${isMobile ? '20px' : '22px'};">💎</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:${isMobile ? '16px' : '18px'};font-weight:700;color:#22c55e;">R$ ${formatarMoeda(lucroReal)}</div>
                                <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Lucro Real</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:${isMobile ? '12px 14px' : '14px 16px'};border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:${isMobile ? '8px' : '10px'};">
                            <span style="font-size:${isMobile ? '20px' : '22px'};">📈</span>
                            <div style="flex:1;min-width:0;">
                                <div style="font-size:${isMobile ? '16px' : '18px'};font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(ticketMedio)}</div>
                                <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Ticket Médio</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${isMobile ? `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:10px;">
                    <div style="background:var(--bg-hover);border-radius:8px;padding:8px 6px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${totalServicosConcluidos}</div>
                        <div style="font-size:9px;color:var(--text-muted);">Serviços</div>
                    </div>
                    <div style="background:var(--bg-hover);border-radius:8px;padding:8px 6px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${clientes.length}</div>
                        <div style="font-size:9px;color:var(--text-muted);">Clientes</div>
                    </div>
                    <div style="background:var(--bg-hover);border-radius:8px;padding:8px 6px;text-align:center;">
                        <div style="font-size:16px;font-weight:700;color:${pendentes.length > 5 ? '#ef4444' : 'var(--text-primary)'};">${pendentes.length}</div>
                        <div style="font-size:9px;color:var(--text-muted);">Pendentes</div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- RESULTADO DETALHADO + DESPESAS -->
            <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:16px;margin-bottom:16px;">
                <div style="background:var(--bg-card);border-radius:12px;padding:${isMobile ? '14px' : '16px 18px'};border:1px solid var(--border-color);">
                    <h4 style="margin:0 0 12px;font-size:${isMobile ? '14px' : '13px'};display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-calculator" style="color:var(--primary);"></i> Resultado Detalhado
                    </h4>
                    <div style="display:flex;flex-direction:column;gap:6px;font-size:${isMobile ? '14px' : '13px'};">
                        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);">
                            <span style="color:var(--text-muted);">📊 Faturamento</span>
                            <span style="font-weight:600;">R$ ${formatarMoeda(faturamentoMes)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);">
                            <span style="color:var(--text-muted);">👨‍💼 Comissões</span>
                            <span style="font-weight:600;color:#f59e0b;">- R$ ${formatarMoeda(totalComissoes)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border-color);">
                            <span style="color:var(--text-muted);">📉 Despesas</span>
                            <span style="font-weight:600;color:#ef4444;">- R$ ${formatarMoeda(totalDespesas)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:4px;background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(16,185,129,0.04));border-radius:8px;padding:8px 12px;">
                            <span style="font-weight:700;color:#22c55e;">🎯 Lucro Real</span>
                            <span style="font-weight:700;font-size:${isMobile ? '18px' : '16px'};color:#22c55e;">R$ ${formatarMoeda(lucroReal)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;padding:4px 0;font-size:${isMobile ? '13px' : '12px'};color:var(--text-muted);">
                            <span>📊 Margem de Lucro</span>
                            <span style="font-weight:600;color:${margemLucro >= 50 ? '#22c55e' : margemLucro >= 30 ? '#f59e0b' : '#ef4444'};">${margemLucro}%</span>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:${isMobile ? '14px' : '16px 18px'};border:1px solid var(--border-color);">
                    <h4 style="margin:0 0 12px;font-size:${isMobile ? '14px' : '13px'};display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <i class="fas fa-tags" style="color:var(--primary);"></i> Despesas por Categoria
                        ${totalDespesas > 0 ? `<span style="font-size:10px;font-weight:400;color:var(--text-muted);background:var(--bg-hover);padding:0 10px;border-radius:12px;">${categoriasDespesas.length} cat.</span>` : ''}
                    </h4>
                    ${categoriasDespesas.length > 0 ? `
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            ${categoriasDespesas.slice(0, 6).map((cat, idx) => {
        const percentual = totalDespesas > 0 ? ((cat.total_valor / totalDespesas) * 100) : 0;
        const cores = ['#667eea', '#764ba2', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6'];
        const cor = cores[idx % cores.length];
        return `
                                    <div>
                                        <div style="display:flex;justify-content:space-between;font-size:${isMobile ? '13px' : '12px'};">
                                            <span style="color:var(--text-primary);">${escapeHtml(cat.categoria)}</span>
                                            <span style="font-weight:600;color:${cor};">R$ ${formatarMoeda(cat.total_valor)} (${Math.round(percentual)}%)</span>
                                        </div>
                                        <div style="height:6px;background:var(--bg-hover);border-radius:4px;overflow:hidden;margin-top:2px;">
                                            <div style="height:100%;width:${Math.min(percentual, 100)}%;background:linear-gradient(90deg,${cor},${cor}dd);border-radius:4px;transition:width 1s ease;"></div>
                                        </div>
                                    </div>
                                `;
    }).join('')}
                            ${categoriasDespesas.length > 6 ? `
                                <div style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:4px;">
                                    + ${categoriasDespesas.length - 6} outras categorias
                                </div>
                            ` : ''}
                        </div>
                    ` : `
                        <div style="text-align:center;padding:20px;color:var(--text-muted);">
                            <i class="fas fa-receipt" style="font-size:24px;opacity:0.3;"></i>
                            <p style="margin:8px 0 0;font-size:13px;">Nenhuma despesa este mês</p>
                            <button onclick="carregarFinanceiro()" style="background:var(--primary);border:none;padding:4px 14px;border-radius:8px;color:white;font-size:11px;cursor:pointer;margin-top:6px;">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        </div>
                    `}
                </div>
            </div>

            <!-- PROJEÇÃO + RESUMO -->
            ${!isNewUser ? `
            <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:16px;margin-bottom:16px;">
                <div style="background:var(--bg-card);border-radius:12px;padding:${isMobile ? '14px' : '16px 18px'};border:1px solid var(--border-color);">
                    <h4 style="margin:0 0 10px;font-size:${isMobile ? '14px' : '13px'};display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-rocket" style="color:var(--primary);"></i> Projeção de Faturamento
                    </h4>
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        <div style="display:flex;justify-content:space-between;font-size:${isMobile ? '14px' : '13px'};padding:6px 0;border-bottom:1px solid var(--border-color);">
                            <span style="color:var(--text-muted);">📊 Média diária</span>
                            <span style="font-weight:600;">R$ ${formatarMoeda(mediaDiaria)}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:${isMobile ? '16px' : '15px'};background:linear-gradient(135deg,rgba(102,126,234,0.06),rgba(118,75,162,0.03));border-radius:8px;padding:8px 12px;">
                            <span style="font-weight:600;color:var(--text-primary);">📈 Projeção 30 dias</span>
                            <span style="font-weight:700;font-size:${isMobile ? '18px' : '17px'};color:#8b5cf6;">R$ ${formatarMoeda(projecao30Dias)}</span>
                        </div>
                        <div style="font-size:${isMobile ? '12px' : '11px'};color:var(--text-muted);display:flex;gap:12px;margin-top:4px;flex-wrap:wrap;">
                            <span>📅 ${diasComDados} dias de dados</span>
                            <span>${projecao30Dias > faturamentoMes ? '📈 Tendência de crescimento' : '📉 Manter média atual'}</span>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:${isMobile ? '14px' : '16px 18px'};border:1px solid var(--border-color);">
                    <h4 style="margin:0 0 10px;font-size:${isMobile ? '14px' : '13px'};display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-chart-simple" style="color:var(--primary);"></i> Resumo do Negócio
                    </h4>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:${isMobile ? '8px' : '12px'};">
                        <div style="background:var(--bg-hover);border-radius:10px;padding:${isMobile ? '10px 8px' : '12px 14px'};text-align:center;">
                            <div style="font-size:${isMobile ? '20px' : '22px'};font-weight:700;color:var(--text-primary);">${agendamentos.length}</div>
                            <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Atendimentos</div>
                            <div style="font-size:${isMobile ? '9px' : '10px'};color:#22c55e;">${concluidos.length} concluídos</div>
                        </div>
                        <div style="background:var(--bg-hover);border-radius:10px;padding:${isMobile ? '10px 8px' : '12px 14px'};text-align:center;">
                            <div style="font-size:${isMobile ? '20px' : '22px'};font-weight:700;color:var(--text-primary);">${clientes.length}</div>
                            <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Clientes</div>
                            <div style="font-size:${isMobile ? '9px' : '10px'};color:#22c55e;">+${novosClientesMes || 0} este mês</div>
                        </div>
                        <div style="background:var(--bg-hover);border-radius:10px;padding:${isMobile ? '10px 8px' : '12px 14px'};text-align:center;">
                            <div style="font-size:${isMobile ? '20px' : '22px'};font-weight:700;color:${pendentes.length > 5 ? '#ef4444' : 'var(--text-primary)'};">${pendentes.length}</div>
                            <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Pendentes</div>
                            <div style="font-size:${isMobile ? '9px' : '10px'};color:${agendamentosHoje.length > 0 ? '#f59e0b' : 'var(--text-muted)'};">${agendamentosHoje.length > 0 ? `${agendamentosHoje.length} hoje` : 'Nenhum hoje'}</div>
                        </div>
                        <div style="background:var(--bg-hover);border-radius:10px;padding:${isMobile ? '10px 8px' : '12px 14px'};text-align:center;">
                            <div style="font-size:${isMobile ? '20px' : '22px'};font-weight:700;color:var(--text-primary);">${profissionaisAtivos}</div>
                            <div style="font-size:${isMobile ? '10px' : '11px'};color:var(--text-muted);">Profissionais</div>
                            <div style="font-size:${isMobile ? '9px' : '10px'};color:var(--text-muted);">${profissionais.length - profissionaisAtivos > 0 ? `⚠️ ${profissionais.length - profissionaisAtivos} inativos` : '✅ Todos ativos'}</div>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- AGENDA INTELIGENTE -->
            <div class="card" style="padding: 16px 20px;background:var(--bg-card);border-radius:16px;border:1px solid var(--border-color);box-shadow:0 4px 24px rgba(0,0,0,0.04);margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <h3 style="font-size:17px; margin:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <i class="fas fa-calendar-alt" style="color:var(--primary);font-size:20px;"></i> 
                        Agenda Inteligente
                        <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:4px;background:var(--bg-hover);padding:2px 12px;border-radius:12px;border:1px solid var(--border-color);">
                            <i class="fas fa-info-circle"></i> Clique 🟢
                        </span>
                    </h3>
                    <button onclick="carregarAgendamentos()" style="background:var(--primary);border:none;padding:5px 18px;border-radius:10px;color:white;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 8px rgba(102,126,234,0.3);">
                        <i class="fas fa-expand"></i> Ver Todos
                    </button>
                </div>
                <div id="agendaInteligenteContainer">
                    <div style="text-align:center;padding:30px;">
                        <div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:32px;height:32px;"></div>
                        <p style="margin-top:10px;font-size:13px;color:var(--text-muted);">Carregando agenda...</p>
                    </div>
                </div>
            </div>
            
            ${isNewUser ? `
            <div style="background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.05));border-radius:16px;padding:20px 24px;margin-bottom:20px;border:1px solid rgba(102,126,234,0.15);">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                    <i class="fas fa-rocket" style="font-size:32px;color:var(--primary);"></i>
                    <div style="flex:1;">
                        <h3 style="margin:0 0 4px;font-size:16px;">🚀 Comece aqui!</h3>
                        <p style="margin:0 0 8px;color:var(--text-muted);font-size:13px;">Parece que você ainda não tem agendamentos. Vamos te ajudar a começar:</p>
                        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;">
                            <span style="display:flex;align-items:center;gap:6px;"><span style="background:var(--primary);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">1</span> Cadastre seus <strong>serviços</strong></span>
                            <span style="display:flex;align-items:center;gap:6px;"><span style="background:var(--primary);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">2</span> Adicione seus <strong>profissionais</strong></span>
                            <span style="display:flex;align-items:center;gap:6px;"><span style="background:var(--primary);color:white;width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">3</span> Crie seu primeiro <strong>agendamento</strong></span>
                        </div>
                    </div>
                    <button onclick="carregarServicos()" style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;padding:8px 20px;border-radius:10px;color:white;font-weight:600;cursor:pointer;transition:all 0.2s;box-shadow:0 2px 12px rgba(102,126,234,0.3);">
                        <i class="fas fa-arrow-right"></i> Começar
                    </button>
                </div>
            </div>
            ` : ''}
            
            <!-- PRÓXIMOS ATENDIMENTOS -->
            <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <h4 style="margin:0;font-size:${isMobile ? '15px' : '14px'};">
                        <i class="fas fa-calendar-alt" style="color:var(--primary);"></i> Próximos Atendimentos
                    </h4>
                    <button onclick="carregarAgendamentos()" style="background:var(--bg-hover);border:1px solid var(--border-color);padding:4px 14px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text-secondary);">Ver Todos →</button>
                </div>
                ${proximosAgendamentos.length > 0 ? `
                    ${isMobile ? `
                    <div style="display:flex;flex-direction:column;gap:8px;">
                        ${proximosAgendamentos.slice(0, 3).map(ag => `
                            <div style="background:var(--bg-hover);border-radius:10px;padding:12px 14px;border:1px solid var(--border-color);">
                                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px;">
                                    <span style="font-weight:600;font-size:14px;color:var(--text-primary);">${escapeHtml(ag.cliente_nome || 'Cliente')}</span>
                                    <span style="font-size:11px;padding:2px 10px;border-radius:12px;${ag.status === 'pendente' ? 'background:#f59e0b;color:white;' : 'background:#22c55e;color:white;'}">
                                        ${ag.status === 'pendente' ? '⏳ Pendente' : '✅ Agendado'}
                                    </span>
                                </div>
                                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;margin-top:6px;font-size:13px;color:var(--text-secondary);">
                                    <span>✂️ ${escapeHtml(ag.servico || '-')}</span>
                                    <span>📅 ${formatarDataBr(ag.data)} às ${ag.hora || '-'}</span>
                                    <span style="font-weight:600;color:var(--primary);">R$ ${formatarMoeda(ag.valor)}</span>
                                </div>
                            </div>
                        `).join('')}
                        ${proximosAgendamentos.length > 3 ? `
                            <div style="text-align:center;font-size:12px;color:var(--text-muted);padding:4px;">
                                + ${proximosAgendamentos.length - 3} mais agendamentos
                            </div>
                        ` : ''}
                    </div>
                    ` : `
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="border-bottom:1px solid var(--border-color);">
                                    <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Cliente</th>
                                    <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Serviço</th>
                                    <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Data</th>
                                    <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Horário</th>
                                    <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Valor</th>
                                    <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${proximosAgendamentos.map(ag => `
                                    <tr style="border-bottom:1px solid var(--border-color);">
                                        <td style="padding:8px 8px;font-weight:600;font-size:12px;">${escapeHtml(ag.cliente_nome || 'Cliente')}</td>
                                        <td style="padding:8px 8px;font-size:12px;color:var(--text-secondary);">${escapeHtml(ag.servico || '-')}</td>
                                        <td style="padding:8px 8px;font-size:12px;color:var(--text-secondary);">${formatarDataBr(ag.data)}</td>
                                        <td style="padding:8px 8px;font-size:12px;"><span style="background:var(--bg-hover);padding:2px 10px;border-radius:6px;font-weight:600;">${ag.hora || '-'}</span></td>
                                        <td style="padding:8px 8px;font-size:12px;font-weight:600;">R$ ${formatarMoeda(ag.valor)}</td>
                                        <td style="padding:8px 8px;">
                                            <span style="font-size:11px;padding:2px 10px;border-radius:12px;${ag.status === 'pendente' ? 'background:#f59e0b;color:white;' : 'background:#22c55e;color:white;'}">
                                                ${ag.status === 'pendente' ? '⏳ Pendente' : '✅ Agendado'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    `}
                ` : `
                    <div style="text-align:center;padding:20px;color:var(--text-muted);">
                        <i class="fas fa-calendar-check" style="font-size:24px;opacity:0.3;"></i>
                        <p style="margin:8px 0 0;font-size:13px;">Nenhum agendamento pendente</p>
                        <button onclick="carregarAgendamentos()" style="background:var(--primary);border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;margin-top:8px;"><i class="fas fa-plus"></i> Novo</button>
                    </div>
                `}
            </div>
            
            <!-- ÚLTIMOS CLIENTES -->
            <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <h4 style="margin:0;font-size:${isMobile ? '15px' : '14px'};">
                        <i class="fas fa-users" style="color:var(--primary);"></i> Últimos Clientes
                    </h4>
                    <button onclick="carregarClientes()" style="background:var(--bg-hover);border:1px solid var(--border-color);padding:4px 14px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text-secondary);">Ver Todos →</button>
                </div>
                ${clientes.length > 0 ? `
                    <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(auto-fill,minmax(160px,1fr))'};gap:8px;">
                        ${clientes.slice(0, isMobile ? 4 : 6).map(cliente => `
                            <div onclick="editarCliente(${cliente.id})" style="display:flex;align-items:center;gap:10px;background:var(--bg-hover);padding:8px 12px;border-radius:10px;cursor:pointer;transition:all 0.2s;border:1px solid transparent;hover:border-color:var(--primary);">
                                <span style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;">${cliente.nome ? cliente.nome.charAt(0).toUpperCase() : '👤'}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:${isMobile ? '12px' : '13px'};font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cliente.nome)}</div>
                                    <div style="font-size:${isMobile ? '9px' : '10px'};color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cliente.telefone || cliente.email || 'Sem contato')}</div>
                                </div>
                                ${(cliente.bloqueado_chatbot == 1 || cliente.bloqueado_chatbot == true) ?
            '<span style="font-size:12px;">🔒</span>' :
            '<span style="font-size:12px;">✅</span>'
        }
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div style="text-align:center;padding:20px;color:var(--text-muted);">
                        <i class="fas fa-user-plus" style="font-size:24px;opacity:0.3;"></i>
                        <p style="margin:8px 0 0;font-size:13px;">Nenhum cliente cadastrado</p>
                        <button onclick="abrirModalCliente()" style="background:var(--primary);border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;margin-top:8px;"><i class="fas fa-plus"></i> Novo Cliente</button>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;

    setTimeout(() => {
        carregarAgendaInteligente();
    }, 150);
}

// ============================================
// DASHBOARD SUPER ADMIN (SIMPLIFICADO)
// ============================================
async function carregarDashboardSuperAdmin() {
    console.log('🏢 Super Admin Dashboard');
    // Mantido igual ao original
    // ... código existente ...
}

// ============================================
// DASHBOARD PROFISSIONAL (SIMPLIFICADO)
// ============================================
async function carregarDashboardProfissional() {
    console.log('👤 Profissional Dashboard');
    // Mantido igual ao original
    // ... código existente ...
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function renderizarGraficoAgendamentos(dias, dados) {
    const canvas = document.getElementById('chartAgendamentos');
    if (!canvas) return;

    if (typeof Chart !== 'undefined') {
        if (chartInstance) chartInstance.destroy();

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)');

        chartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Agendamentos',
                    data: dados,
                    backgroundColor: gradient,
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    borderRadius: 6,
                    hoverBackgroundColor: 'rgba(139, 92, 246, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: (ctx) => `${ctx.raw} agendamentos` },
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: 10 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10 } }
                    }
                },
                animation: { duration: 800, easing: 'easeInOutQuart' }
            }
        });
    }
}

function abrirModalAgendamento() {
    console.log('🔄 Abrindo modal de agendamento...');
    if (typeof carregarDadosAgendamento === 'function') {
        carregarDadosAgendamento().then(() => {
            if (typeof abrirModalAgendamentoDono === 'function') {
                abrirModalAgendamentoDono();
            }
        });
    } else if (typeof abrirModalAgendamentoDono === 'function') {
        abrirModalAgendamentoDono();
    } else {
        showToast('Função de agendamento não disponível', 'warning');
    }
}

async function carregarDadosAgendamento() {
    const token = localStorage.getItem('token');
    try {
        const [clientesRes, servicosRes, profissionaisRes] = await Promise.all([
            fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/servicos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const clientesData = await clientesRes.json();
        const servicosData = await servicosRes.json();
        const profissionaisData = await profissionaisRes.json();

        if (clientesData.success) {
            window.clientesList = clientesData.data || [];
        }
        if (servicosData.success) {
            window.servicosList = servicosData.data || [];
        }
        if (profissionaisData.success) {
            window.profissionaisList = profissionaisData.data || [];
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
    }
}

function abrirModalCliente() {
    console.log('🔄 Abrindo modal de cliente via ação rápida...');

    if (typeof window.abrirModalCliente === 'function' && window.abrirModalCliente !== abrirModalCliente) {
        window.abrirModalCliente();
        return;
    }

    if (typeof abrirModalCliente === 'function') {
        abrirModalCliente();
        return;
    }

    showToast('Carregando clientes...', 'info');
    if (typeof carregarClientes === 'function') {
        carregarClientes();
        setTimeout(() => {
            if (typeof abrirModalCliente === 'function') {
                abrirModalCliente();
            }
        }, 500);
    } else {
        showToast('Função não disponível', 'warning');
    }
}

// ============================================
// LISTENER PARA REDIMENSIONAMENTO DA TELA
// ============================================
let agendaResizeTimeout = null;

window.addEventListener('resize', function () {
    if (agendaResizeTimeout) {
        clearTimeout(agendaResizeTimeout);
    }

    agendaResizeTimeout = setTimeout(function () {
        const mobile = isMobileScreen();
        const novoModo = !mobile;

        if (agendaModoCompleto !== novoModo) {
            agendaModoCompleto = novoModo;
            console.log(`📱 Modo agenda ajustado: ${agendaModoCompleto ? 'Semana Completa' : 'Dia Atual'} (${mobile ? 'Mobile' : 'Desktop'})`);

            const container = document.getElementById('agendaInteligenteContainer');
            if (container && container.innerHTML && !container.innerHTML.includes('Carregando')) {
                renderizarAgendaInteligente();
            }
        }

        agendaResizeTimeout = null;
    }, 300);
});

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.carregarDashboard = carregarDashboard;
window.carregarDashboardSuperAdmin = carregarDashboardSuperAdmin;
window.carregarDashboardProfissional = carregarDashboardProfissional;
window.atualizarDashboard = window.atualizarDashboard;
window.abrirModalAgendamento = abrirModalAgendamento;
window.abrirModalCliente = abrirModalCliente;
window.estenderTrial = window.estenderTrial;
window.carregarAgendaInteligente = carregarAgendaInteligente;
window.abrirAgendamentoInteligente = abrirAgendamentoInteligente;
window.mudarAgendaSemana = mudarAgendaSemana;
window.irAgendaHoje = irAgendaHoje;
window.renderizarAgendaInteligente = renderizarAgendaInteligente;
window.atualizarAgendaAposAgendamento = atualizarAgendaAposAgendamento;
window.alternarModoAgenda = alternarModoAgenda;
window.isMobileScreen = isMobileScreen;
window.atualizarModoAgendaPorTela = atualizarModoAgendaPorTela;
window.forcarRecarregarAgenda = forcarRecarregarAgenda;

window.clientesList = window.clientesList || [];
window.servicosList = window.servicosList || [];
window.profissionaisList = window.profissionaisList || [];

console.log('✅ dashboard.js carregado com DURAÇÃO DOS SERVIÇOS e MOBILE MELHORADO!');