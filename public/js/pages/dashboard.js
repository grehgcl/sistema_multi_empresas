// pages/dashboard.js - Versão Premium com TODAS AS MELHORIAS VISUAIS + CORREÇÃO DE TIMEZONE + RECARREGAMENTO DA AGENDA
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

const coresPaleta = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF9FF3', '#54A0FF', '#5F27CD', '#341F97',
    '#00D2D3', '#1DD1A1', '#F368E0', '#FF9F43', '#EE5A24'
];

// Ícones por horário
const iconesHorarios = {
    '08:00': '🌅', '08:30': '🌅',
    '09:00': '☀️', '09:30': '☀️',
    '10:00': '☀️', '10:30': '☀️',
    '11:00': '☀️', '11:30': '☀️',
    '12:00': '🍽️', '12:30': '🍽️',
    '13:00': '🌤️', '13:30': '🌤️',
    '14:00': '🌤️', '14:30': '🌤️',
    '15:00': '🌤️', '15:30': '🌤️',
    '16:00': '🌤️', '16:30': '🌤️',
    '17:00': '🌆', '17:30': '🌆',
    '18:00': '🌆'
};

// ============================================
// FUNÇÃO AUXILIAR: FORMATAR DATA PARA EXIBIÇÃO
// ============================================
function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                const ano = parseInt(partes[0]);
                const mes = parseInt(partes[1]) - 1;
                const dia = parseInt(partes[2]);
                const data = new Date(Date.UTC(ano, mes, dia));
                return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            }
        }
        const data = new Date(dataStr);
        if (!isNaN(data.getTime())) {
            return data.toLocaleDateString('pt-BR');
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

// ============================================
// FUNÇÃO AUXILIAR: FORMATAR MOEDA
// ============================================
function formatarMoeda(valor) {
    if (valor === undefined || valor === null || isNaN(valor)) {
        return '0,00';
    }
    const num = parseFloat(valor);
    if (isNaN(num)) {
        return '0,00';
    }
    return num.toFixed(2).replace('.', ',');
}

async function carregarAgendaInteligente() {
    console.log('🔄 CARREGANDO AGENDA DA API...');

    // 🔥 FORÇAR LIMPEZA
    agendaInteligenteData = [];
    agendaInteligenteCarregando = false;

    agendaInteligenteCarregando = true;

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    try {
        const [horariosRes, profissionaisRes, agendamentosRes] = await Promise.all([
            fetch('/api/horarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        agendaInteligenteHorarios = (await horariosRes.json()).data || [];

        const profs = (await profissionaisRes.json()).data?.filter(p => p.ativo === 1) || [];

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
            const corIndex = idx % coresPaleta.length;
            agendaInteligenteCores[p.id] = coresPaleta[corIndex];
        });

        const agendamentosData = await agendamentosRes.json();
        agendaInteligenteData = agendamentosData.success ? agendamentosData.data : [];

        console.log(`✅ Agenda carregada com ${agendamentosData.data ? agendamentosData.data.length : 0} agendamentos`);

        agendaInteligenteDate = new Date();
        renderizarAgendaInteligente();

    } catch (error) {
        console.error('❌ Erro ao carregar agenda inteligente:', error);
        const container = document.getElementById('agendaInteligenteContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:20px;color:var(--text-muted);">
                    <i class="fas fa-calendar-alt" style="font-size:24px;"></i>
                    <p style="margin:8px 0 0;font-size:13px;">Erro ao carregar agenda</p>
                    <button onclick="carregarAgendaInteligente()" class="btn btn-sm btn-primary" style="margin-top:10px;">Tentar novamente</button>
                </div>
            `;
        }
    }

    agendaInteligenteCarregando = false;
}

function isHorarioAlmoco(hora, almocoInicio, almocoFim) {
    if (!almocoInicio || !almocoFim) return false;
    return hora >= almocoInicio && hora < almocoFim;
}

function renderizarAgendaInteligente() {
    console.log('📊 RENDERIZANDO AGENDA - Dados:', agendaInteligenteData.length);
    const container = document.getElementById('agendaInteligenteContainer');
    if (!container) return;

    // ============================================
    // 🔥 USAR A DATA DO agendaInteligenteDate (NÃO FORÇAR HOJE)
    // ============================================
    if (!agendaInteligenteDate) {
        agendaInteligenteDate = new Date();
    }

    const dataBase = new Date(agendaInteligenteDate);
    const inicioSemana = new Date(dataBase);

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    if (!agendaInteligenteProfissionais || agendaInteligenteProfissionais.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:30px 10px;">
                <i class="fas fa-users-slash" style="font-size:32px;color:var(--text-muted);opacity:0.5;"></i>
                <p style="margin:8px 0 0;font-size:14px;color:var(--text-muted);">Nenhum profissional cadastrado</p>
                <button onclick="carregarConfiguracoes()" class="btn btn-sm btn-primary" style="margin-top:10px;font-size:12px;">
                    <i class="fas fa-user-plus"></i> Cadastrar Profissional
                </button>
            </div>
        `;
        return;
    }

    if (!agendaInteligenteHorarios || agendaInteligenteHorarios.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:30px 10px;">
                <i class="fas fa-clock" style="font-size:32px;color:var(--text-muted);opacity:0.5;"></i>
                <p style="margin:8px 0 0;font-size:14px;color:var(--text-muted);">Horários não configurados</p>
                <button onclick="carregarConfiguracoes()" class="btn btn-sm btn-primary" style="margin-top:10px;font-size:12px;">
                    <i class="fas fa-clock"></i> Configurar Horários
                </button>
            </div>
        `;
        return;
    }

    // ============================================
    // DIAS DA SEMANA - USANDO A DATA SELECIONADA
    // ============================================
    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias.push(d);
    }

    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

    // ============================================
    // BUSCAR CONFIGURAÇÃO DO DIA ATUAL
    // ============================================
    const diaSemanaHoje = hoje.getDay();
    const horarioConfiguradoHoje = agendaInteligenteHorarios.find(h => h.dia_semana === diaSemanaHoje);

    function gerarHorariosDoDiaConfig(horaInicio, horaFim, almocoInicio, almocoFim) {
        const horarios = [];
        if (!horaInicio || !horaFim) return horarios;

        const [inicioH, inicioM] = horaInicio.split(':').map(Number);
        const [fimH, fimM] = horaFim.split(':').map(Number);
        const [almocoInicioH, almocoInicioM] = (almocoInicio || '12:00').split(':').map(Number);
        const [almocoFimH, almocoFimM] = (almocoFim || '13:00').split(':').map(Number);
        const intervalo = 30;

        const inicioMin = inicioH * 60 + inicioM;
        const fimMin = fimH * 60 + fimM;
        const almocoInicioMin = almocoInicioH * 60 + almocoInicioM;
        const almocoFimMin = almocoFimH * 60 + almocoFimM;

        for (let minutos = inicioMin; minutos < fimMin; minutos += intervalo) {
            if (minutos >= almocoInicioMin && minutos < almocoFimMin) {
                continue;
            }
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

    if (horarioConfiguradoHoje && horarioConfiguradoHoje.aberto === 1) {
        horarioInicioPadrao = horarioConfiguradoHoje.hora_inicio || '08:00';
        horarioFimPadrao = horarioConfiguradoHoje.hora_fim || '18:00';
        almocoInicioPadrao = horarioConfiguradoHoje.almoco_inicio || '12:00';
        almocoFimPadrao = horarioConfiguradoHoje.almoco_fim || '13:00';

        horariosBase = gerarHorariosDoDiaConfig(
            horarioInicioPadrao,
            horarioFimPadrao,
            almocoInicioPadrao,
            almocoFimPadrao
        );
    }

    if (horariosBase.length === 0) {
        for (let h = 8; h <= 18; h++) {
            const horaStr = String(h).padStart(2, '0') + ':00';
            horariosBase.push(horaStr);
            if (h < 18) {
                horariosBase.push(String(h).padStart(2, '0') + ':30');
            }
        }
    }

    // ============================================
    // ENCONTRAR O ÍNDICE DO HORÁRIO ATUAL
    // ============================================
    let horarioAtualIndex = 0;
    const totalMinutosAtual = horaAtual * 60 + minutoAtual;

    for (let i = 0; i < horariosBase.length; i++) {
        const [h, m] = horariosBase[i].split(':').map(Number);
        const totalMinutos = h * 60 + m;
        if (totalMinutos >= totalMinutosAtual) {
            horarioAtualIndex = i;
            break;
        }
    }
    if (horarioAtualIndex >= horariosBase.length - 2) {
        horarioAtualIndex = Math.max(0, horariosBase.length - 5);
    }

    // ============================================
    // BARRA DE PROGRESSO
    // ============================================
    const [inicioH, inicioM] = horarioInicioPadrao.split(':').map(Number);
    const [fimH, fimM] = horarioFimPadrao.split(':').map(Number);
    const totalMinutosDia = (fimH * 60 + fimM) - (inicioH * 60 + inicioM);
    const minutosPassados = (horaAtual * 60 + minutoAtual) - (inicioH * 60 + inicioM);
    const progressoDia = totalMinutosDia > 0 ? Math.max(0, Math.min(100, (minutosPassados / totalMinutosDia) * 100)) : 0;

    // ============================================
    // LEGENDA DE CORES
    // ============================================
    let html = `
        <div style="margin-bottom:14px;">
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
                <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">👤 Profissionais:</span>
                    ${agendaInteligenteProfissionais.slice(0, 6).map(p => {
        const cor = agendaInteligenteCores[p.id] || '#666';
        const isDono = p.is_dono === true;
        return `
                            <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:14px;font-size:11px;${isDono ? 'border:1px solid #d4af37;' : ''}">
                                <span style="width:12px;height:12px;background:${cor};border-radius:50%;display:inline-block;${isDono ? 'border:2px solid #d4af37;' : ''}"></span>
                                ${p.nome.length > 10 ? p.nome.substring(0, 10) + '…' : p.nome}${isDono ? '👑' : ''}
                            </span>
                        `;
    }).join('')}
                    ${agendaInteligenteProfissionais.length > 6 ? `<span style="font-size:11px;color:var(--text-muted);">+${agendaInteligenteProfissionais.length - 6}</span>` : ''}
                </div>
                <span style="font-size:10px;color:var(--text-muted);">
                    <i class="fas fa-mouse-pointer"></i> Clique na bolinha 🟢
                </span>
            </div>
            
            <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:10px;padding:8px 0 4px;margin-top:4px;border-top:1px solid var(--border-color);">
                <span style="display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,rgba(34,197,94,0.12),rgba(16,185,129,0.08));padding:2px 12px 2px 8px;border-radius:12px;border:1px solid rgba(34,197,94,0.2);">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);box-shadow:0 0 8px rgba(16,185,129,0.3);"></span>
                    <span style="color:var(--text-muted);">Disponível</span>
                </span>
                <span style="display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,rgba(239,68,68,0.12),rgba(220,38,38,0.08));padding:2px 12px 2px 8px;border-radius:12px;border:1px solid rgba(239,68,68,0.2);">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 0 8px rgba(239,68,68,0.3);"></span>
                    <span style="color:var(--text-muted);">Ocupado</span>
                </span>
                <span style="display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.08));padding:2px 12px 2px 8px;border-radius:12px;border:1px solid rgba(245,158,11,0.2);">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 0 8px rgba(245,158,11,0.3);"></span>
                    <span style="color:var(--text-muted);">Almoço</span>
                </span>
                <span style="display:flex;align-items:center;gap:5px;background:rgba(107,114,128,0.08);padding:2px 12px 2px 8px;border-radius:12px;border:1px solid rgba(107,114,128,0.2);">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#6b7280;box-shadow:0 0 8px rgba(107,114,128,0.3);"></span>
                    <span style="color:var(--text-muted);">Fechado</span>
                </span>
                <span style="display:flex;align-items:center;gap:5px;background:linear-gradient(135deg,rgba(212,175,55,0.15),rgba(184,142,47,0.1));padding:2px 12px 2px 8px;border-radius:12px;border:1px solid rgba(212,175,55,0.3);">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:linear-gradient(135deg,#d4af37,#b88e2f);box-shadow:0 0 8px rgba(212,175,55,0.3);"></span>
                    <span style="color:var(--text-muted);">👑 Dono</span>
                </span>
                <span style="display:flex;align-items:center;gap:5px;background:rgba(107,114,128,0.06);padding:2px 12px 2px 8px;border-radius:12px;border:1px dashed #6b7280;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#9ca3af;opacity:0.5;"></span>
                    <span style="color:var(--text-muted);">⏰ Passou</span>
                </span>
            </div>
            
            <div style="margin-top:6px;">
                <div style="display:flex;justify-content:space-between;font-size:8px;color:var(--text-muted);">
                    <span>🌅 ${horarioInicioPadrao}</span>
                    <span>⏳ ${Math.round(progressoDia)}% do dia</span>
                    <span>🌆 ${horarioFimPadrao}</span>
                </div>
                <div style="height:3px;background:var(--bg-hover);border-radius:3px;overflow:hidden;margin-top:2px;">
                    <div style="height:100%;width:${Math.min(progressoDia, 100)}%;background:linear-gradient(90deg,#667eea,#764ba2,transparent);border-radius:3px;transition:width 1s ease;"></div>
                </div>
            </div>
        </div>
    `;

    // ============================================
    // TABELA DO CALENDÁRIO
    // ============================================
    html += `
        <div id="agendaScrollWrapper" style="overflow-x:auto;max-height:500px;overflow-y:auto;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-card);box-shadow:0 2px 12px rgba(0,0,0,0.04);position:relative;">
            <table id="agendaTabela" style="width:100%;border-collapse:collapse;font-size:11px;min-width:550px;">
                <thead>
                    <tr>
                        <th style="padding:10px 8px;background:var(--bg-hover);text-align:center;font-weight:700;position:sticky;top:0;z-index:10;font-size:10px;min-width:55px;color:var(--text-muted);border-bottom:2px solid var(--border-color);">
                            <i class="fas fa-clock" style="font-size:12px;"></i>
                        </th>
                        ${dias.map(d => {
        const dataStr = d.toISOString().split('T')[0];
        const isHoje = dataStr === hojeStr;
        const nomeDia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const diaNum = d.getDate();
        const mesNum = d.getMonth() + 1;
        const isFimSemana = d.getDay() === 0 || d.getDay() === 6;
        const mesStr = mesNum !== new Date(hoje).getMonth() + 1 ? `/${String(mesNum).padStart(2, '0')}` : '';

        const agendamentosDia = agendaInteligenteData.filter(a => a.data === dataStr && a.status !== 'cancelado');
        const totalAgendamentosDia = agendamentosDia.length;
        const badgeAgendamentos = totalAgendamentosDia > 0 ?
            `<span style="display:inline-block;font-size:7px;background:${isHoje ? 'rgba(255,255,255,0.25)' : 'var(--primary)'};color:${isHoje ? '#fff' : 'white'};padding:0px 6px;border-radius:8px;margin-left:2px;">${totalAgendamentosDia}</span>` : '';

        return `
                            <th style="padding:10px 4px;
                                       background:${isHoje ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : (isFimSemana ? 'var(--bg-hover)' : 'var(--bg-hover)')};
                                       color:${isHoje ? '#ffffff' : 'var(--text-secondary)'};
                                       text-align:center;
                                       font-weight:${isHoje ? '700' : '600'};
                                       position:sticky;
                                       top:0;
                                       z-index:5;
                                       font-size:10px;
                                       min-width:65px;
                                       border-bottom:${isHoje ? '3px solid #ffffff' : '2px solid var(--border-color)'};
                                       box-shadow:${isHoje ? '0 2px 16px rgba(102, 126, 234, 0.35)' : 'none'};
                                       border-radius:${isHoje ? '10px 10px 0 0' : '0'};
                                       ${isFimSemana && !isHoje ? 'opacity:0.7;' : ''}
                                       transition: all 0.3s ease;
                                       cursor:default;">
                                <span style="display:block;font-size:9px;font-weight:400;text-transform:uppercase;letter-spacing:0.5px;${isHoje ? 'opacity:0.9;' : ''}">
                                    ${nomeDia}
                                </span>
                                <span style="font-size:${isHoje ? '20px' : '15px'};font-weight:${isHoje ? '800' : '700'};display:block;margin-top:1px;${isHoje ? 'text-shadow: 0 2px 8px rgba(0,0,0,0.2);' : ''}">
                                    ${diaNum}${mesStr}
                                </span>
                                <div style="display:flex;align-items:center;justify-content:center;gap:3px;margin-top:1px;">
                                    ${isHoje ? `<span style="font-size:7px;opacity:0.9;letter-spacing:1px;font-weight:600;">● HOJE</span>` : ''}
                                    ${badgeAgendamentos}
                                </div>
                            </th>
                        `;
    }).join('')}
                    </tr>
                </thead>
                <tbody id="agendaTbody">
    `;

    // ============================================
    // RENDERIZAR HORÁRIOS
    // ============================================
    for (let idx = 0; idx < horariosBase.length; idx++) {
        const hora = horariosBase[idx];
        const isHorarioAtual = (idx === horarioAtualIndex);
        const isAlmoco = hora >= almocoInicioPadrao && hora < almocoFimPadrao;
        const isPassadoGlobal = idx < horarioAtualIndex;

        const rowId = isHorarioAtual ? 'agenda-horario-atual' : '';

        let rowStyle = '';
        if (isHorarioAtual) {
            rowStyle = 'background:linear-gradient(90deg, rgba(102,126,234,0.12), rgba(118,75,162,0.08));border-left:4px solid #667eea;';
        } else if (isPassadoGlobal) {
            rowStyle = 'opacity:0.4;';
        } else if (isAlmoco) {
            rowStyle = 'background:rgba(245,158,11,0.04);';
        }

        html += `<tr id="${rowId}" style="${rowStyle}">`;

        let horarioBg = 'var(--bg-hover)';
        let horarioColor = 'var(--text-primary)';
        let horarioFontSize = '12px';
        let horarioFontWeight = '700';
        let extraContent = '';

        if (isHorarioAtual) {
            horarioBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            horarioColor = '#ffffff';
            horarioFontSize = '15px';
            horarioFontWeight = '800';
            extraContent = `
                <span style="display:block;font-size:7px;background:rgba(255,255,255,0.2);padding:1px 10px;border-radius:10px;margin-top:1px;">● AGORA</span>
            `;
        } else if (isAlmoco) {
            horarioBg = 'rgba(245,158,11,0.1)';
            horarioColor = '#d97706';
            extraContent = `<span style="font-size:14px;">🍽️</span>`;
        } else if (isPassadoGlobal) {
            horarioBg = 'rgba(107,114,128,0.06)';
            horarioColor = '#6b7280';
            extraContent = `<span style="font-size:10px;opacity:0.5;">⏰</span>`;
        }

        html += `
        <td style="
            padding: 8px 6px;
            text-align: center;
            border-bottom: 1px solid var(--border-color);
            font-size: ${horarioFontSize};
            font-weight: ${horarioFontWeight};
            color: ${horarioColor};
            background: ${horarioBg};
            white-space: nowrap;
            border-right: 2px solid ${isHorarioAtual ? '#667eea' : 'var(--border-color)'};
            min-width: 60px;
            position: sticky;
            left: 0;
            z-index: 3;
            box-shadow: ${isHorarioAtual ? '0 2px 16px rgba(102,126,234,0.3)' : '2px 0 8px rgba(0,0,0,0.03)'};
            ${isHorarioAtual ? 'border-radius: 8px 0 0 8px;' : ''}
            transition: all 0.3s ease;
        ">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 1px;">
                ${extraContent}
                <span style="font-size: ${isHorarioAtual ? '16px' : '12px'}; font-weight: ${isHorarioAtual ? '800' : '700'};">
                    ${hora}
                </span>
                ${isPassadoGlobal && !isHorarioAtual ? `
                    <span style="font-size:6px;color:#6b7280;font-weight:600;letter-spacing:0.5px;">PASSOU</span>
                ` : ''}
            </div>
        </td>
    `;

        for (let d of dias) {
            const dataStr = d.toISOString().split('T')[0];
            const isHoje = dataStr === hojeStr;
            const diaSemana = d.getDay();
            const horarioDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSemana);

            const estaAberto = horarioDia && horarioDia.aberto === 1;
            const almocoInicioDia = horarioDia?.almoco_inicio || '12:00';
            const almocoFimDia = horarioDia?.almoco_fim || '13:00';
            const noAlmoco = estaAberto && isHorarioAlmoco(hora, almocoInicioDia, almocoFimDia);

            let dentroExpediente = true;
            if (estaAberto && horarioDia) {
                const horaInicioDia = horarioDia.hora_inicio || '08:00';
                const horaFimDia = horarioDia.hora_fim || '18:00';
                const [hInicio, mInicio] = horaInicioDia.split(':').map(Number);
                const [hFim, mFim] = horaFimDia.split(':').map(Number);
                const [hAtual, mAtual] = hora.split(':').map(Number);
                const minutosAtual = hAtual * 60 + mAtual;
                const minutosInicio = hInicio * 60 + mInicio;
                const minutosFim = hFim * 60 + mFim;
                dentroExpediente = minutosAtual >= minutosInicio && minutosAtual < minutosFim;
            }

            const agendamentosHora = agendaInteligenteData.filter(a =>
                a.data === dataStr &&
                a.hora === hora &&
                a.status !== 'cancelado'
            );

            const ocupadosIds = agendamentosHora.map(a => a.profissional_id).filter(id => id !== null && id !== undefined);
            const temAgendamentoDono = agendamentosHora.some(a => a.profissional_id === null || a.profissional_id === '');

            let cellContent = '';
            let bgColor = 'transparent';
            let title = '';
            let cellStyle = '';

            if (isHoje) {
                bgColor = 'rgba(102, 126, 234, 0.04)';
            }

            const dataObj = new Date(dataStr + 'T00:00:00');
            const hojeObj = new Date();
            hojeObj.setHours(0, 0, 0, 0);
            const dataPassou = dataObj < hojeObj;

            const isPassado = isPassadoGlobal || dataPassou;
            const isFuturo = !isPassado && !noAlmoco && estaAberto && dentroExpediente;

            if (!estaAberto || !dentroExpediente) {
                bgColor = 'rgba(107,114,128,0.04)';
                cellContent = `<span style="color:#9ca3af;font-size:14px;">—</span>`;
                title = !estaAberto ? 'Fechado' : 'Fora do expediente';
                cellStyle = 'opacity:0.4;';
            } else if (dataPassou || isPassadoGlobal) {
                bgColor = 'rgba(107,114,128,0.04)';
                cellContent = `<span style="color:#9ca3af;font-size:14px;opacity:0.3;">⏰</span>`;
                title = dataPassou ? 'Data já passou' : 'Horário já passou';
                cellStyle = 'opacity:0.3;filter:grayscale(0.8);';
            } else if (noAlmoco) {
                bgColor = 'rgba(245,158,11,0.06)';
                cellContent = `<span style="color:#d97706;font-size:16px;">🍽️</span>`;
                title = 'Horário de almoço';
            } else {
                const profissionaisComStatus = agendaInteligenteProfissionais.map(p => {
                    let ocupado = false;
                    if (p.is_dono === true) {
                        ocupado = temAgendamentoDono;
                    } else {
                        ocupado = ocupadosIds.includes(p.id);
                    }
                    return { ...p, ocupado };
                });

                const disponiveis = profissionaisComStatus.filter(p => !p.ocupado);

                if (disponiveis.length === 0) {
                    bgColor = 'rgba(239,68,68,0.05)';
                    cellContent = `<span style="color:#ef4444;font-size:14px;font-weight:700;">🔴</span>`;
                    title = 'Todos os profissionais ocupados';
                } else {
                    const todosProfissionais = profissionaisComStatus;
                    const qtdeProf = todosProfissionais.length;
                    const tamanhoBolinha = qtdeProf <= 2 ? 30 : qtdeProf <= 4 ? 26 : 22;
                    const displayProfs = todosProfissionais.slice(0, 6);
                    const mais = todosProfissionais.length > 6 ? ` +${todosProfissionais.length - 6}` : '';

                    bgColor = isHoje ? 'rgba(102, 126, 234, 0.06)' : 'rgba(16,185,129,0.04)';

                    cellContent = `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:100%;">
                            <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;align-items:center;width:100%;">
                                ${displayProfs.map(p => {
                        const isDono = p.is_dono === true;
                        const cor = agendaInteligenteCores[p.id] || '#666';
                        const isOcupado = p.ocupado;
                        const avatar = p.nome.charAt(0).toUpperCase();

                        // 🔥 FORÇAR A COR VERMELHA SE ESTIVER OCUPADO
                        const corFundo = isOcupado ? 'linear-gradient(135deg,#ef4444,#dc2626)' : `linear-gradient(135deg,${cor},${cor}dd)`;
                        const corBorda = isOcupado ? '#ef4444' : (isDono ? '#d4af37' : 'rgba(255,255,255,0.4)');
                        const sombra = isOcupado ? '0 0 20px rgba(239,68,68,0.6)' : '0 0 12px rgba(16,185,129,0.3)';
                        const cursor = isOcupado ? 'not-allowed' : 'pointer';
                        const tooltip = isOcupado ? '🔴 Ocupado' : '🟢 Disponível';

                        const isIndisponivel = isOcupado || isPassado;
                        const onClick = isIndisponivel ? '' : `event.stopPropagation(); abrirAgendamentoInteligente('${dataStr}','${hora}','${p.id}')`;

                        // 🔥 TAMANHO DA BOLINHA
                        const size = isOcupado ? tamanhoBolinha + 4 : tamanhoBolinha;
                        const fontSize = isOcupado ? '14px' : '12px';
                        const icone = isPassado ? '⏰' : (isOcupado ? '✕' : avatar);

                        return `
    <div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;cursor:${cursor};${isIndisponivel ? 'filter: grayscale(0.6);opacity:0.4;' : ''}" 
         title="${isPassado ? '⏰ Horário já passou' : tooltip}"
         onclick="${onClick}">
        <div style="position:relative;">
            <span style="display:flex;
                         width:${size}px;
                         height:${size}px;
                         border-radius:50%;
                         background:${isPassado ? '#9ca3af' : corFundo};
                         border:3px solid ${isPassado ? '#9ca3af' : corBorda};
                         box-shadow: ${isPassado ? 'none' : sombra};
                         transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                         position:relative;
                         ${isOcupado && !isPassado ? 'animation: pulseRed 1.5s infinite;' : ''}
                         ${!isIndisponivel ? 'cursor:pointer;' : ''}
                         align-items:center;
                         justify-content:center;
                         color:white;
                         font-weight:700;
                         font-size:${fontSize};
                         text-shadow:0 1px 3px rgba(0,0,0,0.2);
                         ${isOcupado ? 'background:linear-gradient(135deg,#ef4444,#dc2626) !important;border:3px solid #ef4444 !important;box-shadow:0 0 20px rgba(239,68,68,0.6) !important;' : ''}"
                  ${!isIndisponivel ? `
                      onmouseover="this.style.transform='scale(1.2)';this.style.boxShadow='0 0 32px ${cor}'"
                      onmouseout="this.style.transform='scale(1)';this.style.boxShadow='${sombra}'"
                  ` : ''}
                  >
                ${icone}
            </span>
            ${isDono ? `<span style="position:absolute;top:-6px;right:-6px;font-size:${size * 0.35}px;text-shadow:0 0 4px rgba(0,0,0,0.3);">👑</span>` : ''}
            ${isOcupado && !isPassado ? `
                <span style="position:absolute;bottom:-4px;right:-4px;width:8px;height:8px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(239,68,68,0.5);"></span>
            ` : ''}
            ${!isOcupado && !isPassado ? `
                <span style="position:absolute;bottom:-4px;right:-4px;width:8px;height:8px;background:#22c55e;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(34,197,94,0.5);animation:pulse-green 2s infinite;"></span>
            ` : ''}
        </div>
        <span style="font-size:6px;color:var(--text-muted);margin-top:2px;max-width:32px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isOcupado ? 'color:#ef4444;font-weight:600;' : ''}">
            ${p.nome.length > 6 ? p.nome.substring(0, 5) + '…' : p.nome}
        </span>
        ${isOcupado ? `
            <span style="font-size:6px;color:#ef4444;font-weight:600;background:rgba(239,68,68,0.1);padding:0px 6px;border-radius:8px;border:1px solid rgba(239,68,68,0.2);margin-top:-1px;">🔴 ocupado</span>
        ` : ''}
        ${isPassado ? `
            <span style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);font-size:6px;color:#6b7280;white-space:nowrap;font-weight:600;">
                ⏰ passou
            </span>
        ` : ''}
    </div>
`;
                    }).join('')}
                                ${mais ? `<span style="font-size:8px;color:var(--text-muted);font-weight:600;">${mais}</span>` : ''}
                            </div>
                            ${todosProfissionais.length > 1 ? `
                                <div style="display:flex;gap:8px;font-size:6px;color:var(--text-muted);opacity:0.6;margin-top:1px;background:var(--bg-hover);padding:1px 10px;border-radius:10px;">
                                    <span>🟢 ${disponiveis.length} livre</span>
                                    <span>🔴 ${todosProfissionais.length - disponiveis.length} ocupado</span>
                                </div>
                            ` : ''}
                        </div>
                    `;
                    title = `${hora} - ${disponiveis.length} profissional(is) disponível(eis)`;
                }
            }

            const borderStyle = isHoje ? 'border-left:2px solid rgba(102,126,234,0.3);border-right:2px solid rgba(102,126,234,0.3);' : '';
            const borderTop = isHoje && hora === horariosBase[0] ? 'border-top:2px solid rgba(102,126,234,0.3);' : '';
            const borderBottom = isHoje && hora === horariosBase[horariosBase.length - 1] ? 'border-bottom:2px solid rgba(102,126,234,0.3);' : '';

            html += `
                <td style="padding:4px 3px;
                           border-bottom:1px solid var(--border-color);
                           background:${bgColor};
                           text-align:center;
                           font-size:9px;
                           min-height:42px;
                           vertical-align:middle;
                           ${borderStyle}
                           ${borderTop}
                           ${borderBottom}
                           ${isHoje ? 'position:relative;' : ''}
                           ${cellStyle}
                           transition: background 0.2s ease;
                           " 
                    title="${title}">
                    ${isHoje && isFuturo && !cellContent.includes('—') && !cellContent.includes('🍽️') && !cellContent.includes('🔴') && !cellContent.includes('⏰') ? `
                        <div style="position:absolute;top:0;left:0;right:0;bottom:0;border:1px solid rgba(102,126,234,0.08);border-radius:6px;pointer-events:none;"></div>
                    ` : ''}
                    ${cellContent}
                </td>
            `;
        }

        html += `</tr>`;
    }

    html += `
                </tbody>
            </table>
            
            <div style="position:sticky;bottom:0;height:20px;background:linear-gradient(transparent,var(--bg-card));pointer-events:none;border-radius:0 0 12px 12px;"></div>
        </div>
    `;

    // ============================================
    // NAVEGAÇÃO
    // ============================================
    html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 4px 0;border-top:1px solid var(--border-color);margin-top:12px;font-size:11px;color:var(--text-muted);flex-wrap:wrap;gap:8px;">
            <div style="display:flex;gap:6px;align-items:center;">
                <button onclick="mudarAgendaSemana(-7)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:8px;cursor:pointer;padding:6px 14px;color:var(--text-secondary);font-size:13px;transition:all 0.2s;">
                    ◀◀
                </button>
                <button onclick="mudarAgendaSemana(-1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:8px;cursor:pointer;padding:6px 14px;color:var(--text-secondary);font-size:13px;transition:all 0.2s;">
                    ◀
                </button>
                <span style="font-weight:600;color:var(--text-primary);font-size:13px;background:linear-gradient(135deg,var(--bg-hover),var(--bg-card));padding:6px 18px;border-radius:8px;border:1px solid var(--border-color);box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                    📅 ${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} - 
                    ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <button onclick="mudarAgendaSemana(1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:8px;cursor:pointer;padding:6px 14px;color:var(--text-secondary);font-size:13px;transition:all 0.2s;">
                    ▶
                </button>
                <button onclick="mudarAgendaSemana(7)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:8px;cursor:pointer;padding:6px 14px;color:var(--text-secondary);font-size:13px;transition:all 0.2s;">
                    ▶▶
                </button>
                <button onclick="irAgendaHoje()" style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:8px;cursor:pointer;padding:6px 16px;color:white;font-size:11px;font-weight:600;transition:all 0.2s;box-shadow:0 2px 12px rgba(102,126,234,0.3);">
                    📌 Hoje
                </button>
            </div>
            <div style="display:flex;gap:8px;font-size:9px;flex-wrap:wrap;">
                <span style="display:flex;align-items:center;gap:4px;background:var(--bg-hover);padding:3px 12px;border-radius:14px;border:1px solid rgba(34,197,94,0.2);">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);box-shadow:0 0 4px rgba(16,185,129,0.3);"></span>
                    Livre
                </span>
                <span style="display:flex;align-items:center;gap:4px;background:var(--bg-hover);padding:3px 12px;border-radius:14px;border:1px solid rgba(239,68,68,0.2);">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 0 4px rgba(239,68,68,0.3);"></span>
                    Ocupado
                </span>
                <span style="display:flex;align-items:center;gap:4px;background:var(--bg-hover);padding:3px 12px;border-radius:14px;border:1px solid rgba(245,158,11,0.2);">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 0 4px rgba(245,158,11,0.3);"></span>
                    Almoço
                </span>
                <span style="display:flex;align-items:center;gap:4px;background:var(--bg-hover);padding:3px 12px;border-radius:14px;border:1px solid rgba(107,114,128,0.2);">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#6b7280;"></span>
                    Fechado
                </span>
                <span style="display:flex;align-items:center;gap:4px;background:linear-gradient(135deg,rgba(102,126,234,0.15),rgba(118,75,162,0.1));padding:3px 12px;border-radius:14px;border:1px solid rgba(102,126,234,0.3);">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:3px;background:linear-gradient(135deg,#667eea,#764ba2);"></span>
                    Hoje
                </span>
                <span style="display:flex;align-items:center;gap:4px;background:var(--bg-hover);padding:3px 12px;border-radius:14px;border:1px dashed #6b7280;opacity:0.6;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#9ca3af;"></span>
                    ⏰
                </span>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // ============================================
    // SCROLL PARA O HORÁRIO ATUAL
    // ============================================
    setTimeout(() => {
        const wrapper = document.getElementById('agendaScrollWrapper');
        if (!wrapper) return;

        const rows = wrapper.querySelectorAll('tbody tr');
        let targetIndex = -1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.id === 'agenda-horario-atual' || row.textContent.includes('● AGORA')) {
                targetIndex = i;
                break;
            }
        }

        if (targetIndex === -1) {
            for (let i = 0; i < rows.length; i++) {
                const text = rows[i].textContent;
                if (!text.includes('PASSOU') && !text.includes('⏰') && !text.includes('🍽️') && text.includes(':')) {
                    targetIndex = i;
                    break;
                }
            }
        }

        if (targetIndex !== -1) {
            const rowHeight = rows[targetIndex]?.offsetHeight || 40;
            const wrapperHeight = wrapper.clientHeight;
            const targetPosition = (targetIndex * rowHeight) - (wrapperHeight / 2) + (rowHeight / 2);

            wrapper.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
        }
    }, 500);
}

// ============================================
// NAVEGAÇÃO DA AGENDA
// ============================================

function mudarAgendaSemana(direcao) {
    agendaInteligenteDate.setDate(agendaInteligenteDate.getDate() + direcao);
    renderizarAgendaInteligente();
}

function irAgendaHoje() {
    agendaInteligenteDate = new Date();
    renderizarAgendaInteligente();
}

// ============================================
// 🔥 ATUALIZAR AGENDA APÓS AGENDAMENTO - CORRIGIDO
// ============================================
function atualizarAgendaAposAgendamento() {
    console.log('🔄 🔥 FORÇANDO ATUALIZAÇÃO DA AGENDA...');

    // 🔥 ZERAR TUDO
    agendaInteligenteData = [];
    agendaInteligenteCarregando = false;
    agendaInteligenteProfissionais = [];
    agendaInteligenteHorarios = [];

    // 🔥 RECARREGAR COMPLETAMENTE
    setTimeout(function () {
        // 🔥 FORÇAR LIMPEZA DO CONTAINER
        const container = document.getElementById('agendaInteligenteContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:30px;">
                    <div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:32px;height:32px;"></div>
                    <p style="margin-top:10px;font-size:13px;color:var(--text-muted);">Atualizando agenda...</p>
                </div>
            `;
        }

        // 🔥 RECARREGAR
        carregarAgendaInteligente();
        console.log('✅ Agenda recarregada!');
    }, 300);
}

// ============================================
// 🔥 ABRIR AGENDAMENTO - DIRETO PELA BOLINHA (CORRIGIDO - TIMEZONE + RECARREGAMENTO)
// ============================================

function abrirAgendamentoInteligente(data, hora, profissionalId = null) {
    // 🔥 CORREÇÃO: Ajustar a data para compensar o timezone do backend
    const dataParts = data.split('-').map(Number);
    const dataObj = new Date(dataParts[0], dataParts[1] - 1, dataParts[2]);
    dataObj.setDate(dataObj.getDate() + 1);
    const dataCorrigida = dataObj.getFullYear() + '-' +
        String(dataObj.getMonth() + 1).padStart(2, '0') + '-' +
        String(dataObj.getDate()).padStart(2, '0');

    console.log(`📝 Data original: ${data} → Data enviada: ${dataCorrigida}`);

    const agora = new Date();
    const [ano, mes, dia] = data.split('-').map(Number);
    const [horaNum, minutoNum] = hora.split(':').map(Number);
    const dataHoraSelecionada = new Date(ano, mes - 1, dia, horaNum, minutoNum, 0, 0);

    if (dataHoraSelecionada < agora) {
        showToast('⏰ Não é possível agendar em datas ou horários que já passaram!', 'warning');
        return;
    }

    console.log(`📝 Agendamento: ${data} às ${hora}${profissionalId ? ` - Prof: ${profissionalId}` : ''}`);

    const isDono = profissionalId && typeof profissionalId === 'string' && profissionalId.startsWith('dono_');

    // 🔥 VARIÁVEL PARA CONTROLAR SE JÁ FOI ABERTO
    let modalAberto = false;

    async function carregarDadosEAbrirModal() {
        // 🔥 SE JÁ ESTIVER ABERTO, NÃO ABRE NOVAMENTE
        if (modalAberto) return;
        modalAberto = true;

        showLoading();

        try {
            const token = localStorage.getItem('token');

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
            } else {
                window.clientesList = [];
            }

            if (servicosData.success) {
                window.servicosList = servicosData.data || [];
            } else {
                window.servicosList = [];
            }

            if (profissionaisData.success) {
                window.profissionaisList = profissionaisData.data || [];
            } else {
                window.profissionaisList = [];
            }

            if (typeof abrirModalAgendamentoDono !== 'function') {
                showToast('❌ Função de agendamento não disponível', 'error');
                hideLoading();
                modalAberto = false;
                return;
            }

            // 🔥 ABRIR O MODAL
            abrirModalAgendamentoDono();

            function preencherModalCompleto() {
                const dataInput = document.getElementById('dataAgendamentoDono');
                if (dataInput) {
                    dataInput.value = data;
                    const event = new Event('change', { bubbles: true });
                    dataInput.dispatchEvent(event);
                }

                const profSelect = document.getElementById('profissionalIdDono');
                if (profSelect) {
                    profSelect.innerHTML = '<option value="">Não atribuir</option>';
                    if (window.profissionaisList && window.profissionaisList.length > 0) {
                        window.profissionaisList.forEach(p => {
                            if (p.ativo === 1) {
                                profSelect.innerHTML += `<option value="${p.id}">${p.nome} (${p.comissao_percent}%)</option>`;
                            }
                        });
                    }

                    if (isDono) {
                        profSelect.value = '';
                        showToast('👑 Agendando como Dono (sem comissão)', 'info');
                    } else if (profissionalId) {
                        for (let opt of profSelect.options) {
                            if (opt.value == profissionalId) {
                                profSelect.value = profissionalId;
                                break;
                            }
                        }
                    }
                }

                const clienteSelect = document.getElementById('clienteIdDono');
                if (clienteSelect) {
                    clienteSelect.innerHTML = '<option value="">Selecione um cliente</option>';
                    if (window.clientesList && window.clientesList.length > 0) {
                        window.clientesList.forEach(c => {
                            clienteSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
                        });
                    }
                }

                const servicoSelect = document.getElementById('servicoIdDono');
                if (servicoSelect) {
                    servicoSelect.innerHTML = '<option value="">Selecione um serviço</option>';
                    if (window.servicosList && window.servicosList.length > 0) {
                        window.servicosList.forEach(s => {
                            servicoSelect.innerHTML += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}">${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
                        });
                    }
                }

                function forcarPreenchimentoHorario() {
                    const horaSelect = document.getElementById('horaAgendamentoDono');
                    if (!horaSelect) return false;

                    for (let opt of horaSelect.options) {
                        if (opt.value === hora) {
                            horaSelect.value = hora;
                            return true;
                        }
                    }

                    const horariosExistentes = [];
                    for (let opt of horaSelect.options) {
                        if (opt.value) horariosExistentes.push(opt.value);
                    }

                    if (!horariosExistentes.includes(hora)) {
                        const newOption = document.createElement('option');
                        newOption.value = hora;
                        newOption.textContent = hora;
                        horaSelect.appendChild(newOption);
                        horaSelect.value = hora;
                        return true;
                    }

                    return false;
                }

                forcarPreenchimentoHorario();
                setTimeout(forcarPreenchimentoHorario, 200);
                setTimeout(forcarPreenchimentoHorario, 500);
                setTimeout(forcarPreenchimentoHorario, 1000);

                // 🔥 FUNÇÃO DE SALVAR COM DATA CORRIGIDA
                function salvarAgendamentoComDataCorrigida(dataCorrigida, dataOriginal) {
                    const cliente_id = document.getElementById('clienteIdDono').value;
                    const hora = document.getElementById('horaAgendamentoDono').value;
                    const servico_id = document.getElementById('servicoIdDono').value;
                    const servico_descricao = document.getElementById('servicoDescricaoDono').value;
                    const valor = document.getElementById('valorAgendamentoDono').value;
                    const profissional_id = document.getElementById('profissionalIdDono').value;

                    if (!cliente_id || !dataOriginal) {
                        showToast("Cliente e data são obrigatórios", "warning");
                        return;
                    }

                    if (!hora || hora === '') {
                        showToast("Selecione um horário", "warning");
                        return;
                    }

                    showLoading();

                    const token = localStorage.getItem("token");
                    const body = {
                        cliente_id: parseInt(cliente_id),
                        data: dataCorrigida,
                        hora: hora,
                        valor: parseFloat(valor) || 0,
                        profissional_id: profissional_id ? parseInt(profissional_id) : null
                    };

                    if (servico_id && servico_id !== '') {
                        body.servico_id = parseInt(servico_id);
                    } else if (servico_descricao && servico_descricao.trim() !== '') {
                        body.servico = servico_descricao.trim();
                    }

                    console.log('📤 Enviando data corrigida:', dataCorrigida);

                    fetch("/api/agendamentos", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + token
                        },
                        body: JSON.stringify(body)
                    })
                        .then(res => res.json())
                        .then(result => {
                            hideLoading();

                            if (result.success) {
                                showToast("Agendamento criado com sucesso!", "success");
                                fecharModalAgendamentoDono();

                                // 🔥🔥🔥 FORÇAR RECARREGAMENTO DA AGENDA 🔥🔥🔥
                                if (typeof window.forcarRecarregarAgenda === 'function') {
                                    window.forcarRecarregarAgenda();
                                } else {
                                    // Fallback: recarregar direto
                                    agendaInteligenteData = [];
                                    agendaInteligenteCarregando = false;
                                    setTimeout(function () {
                                        carregarAgendaInteligente();
                                    }, 500);
                                }

                                carregarAgendamentos();
                            } else {
                                if (result.message && result.message.includes('já possui um agendamento para este dia')) {
                                    showToast('⚠️ ' + result.message, 'warning');
                                } else if (result.message && result.message.includes('Não é possível agendar em datas')) {
                                    showToast('⏰ ' + result.message, 'warning');
                                } else {
                                    showToast("Erro: " + result.message, "error");
                                }
                            }
                        })
                        .catch(error => {
                            hideLoading();
                            console.error("❌ Erro ao criar agendamento:", error);
                            showToast("Erro ao criar agendamento", "error");
                        });
                }

                // 🔥 SALVAR A REFERÊNCIA DO BOTÃO ORIGINAL
                const botoes = document.querySelectorAll('#modalAgendamentoDono .btn-primary');
                let botaoSalvar = null;
                for (let btn of botoes) {
                    if (btn.textContent.includes('Salvar') || btn.textContent.includes('salvar')) {
                        botaoSalvar = btn;
                        break;
                    }
                }

                // 🔥 SE ENCONTROU O BOTÃO, SUBSTITUIR O ONCLICK
                if (botaoSalvar) {
                    const novoBotao = botaoSalvar.cloneNode(true);
                    botaoSalvar.parentNode.replaceChild(novoBotao, botaoSalvar);

                    novoBotao.onclick = function () {
                        // 🔥 CHAMAR A FUNÇÃO DE SALVAR COM A DATA CORRIGIDA
                        salvarAgendamentoComDataCorrigida(dataCorrigida, data);
                    };
                }

                showToast(`📅 ${formatarDataBr(data)} às ${hora}`, 'info');
                hideLoading();
                modalAberto = false;
            }

            function aguardarModal(tentativa = 0) {
                const maxTentativas = 20;
                const dataInput = document.getElementById('dataAgendamentoDono');

                if (dataInput || tentativa >= maxTentativas) {
                    preencherModalCompleto();
                } else {
                    setTimeout(() => aguardarModal(tentativa + 1), 200);
                }
            }

            setTimeout(aguardarModal, 300);

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            showToast('❌ Erro ao carregar dados do agendamento', 'error');
            hideLoading();
            modalAberto = false;
        }
    }

    carregarDadosEAbrirModal();
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
        document.getElementById('content').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dashboard. Tente novamente.</p>
                <button onclick="carregarDashboard()" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
    }

    hideLoading();
}

// ============================================
// DASHBOARD DO DONO
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

    // ============================================
    // VERIFICAR TRIAL
    // ============================================
    const planoAtual = empresa.plano || 'trial';
    const assinaturaAtiva = empresa.assinatura_ativa === 1;

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

    // ============================================
    // CÁLCULOS
    // ============================================
    const totais = financeiro.totais || {};

    const faturamentoBruto = parseFloat(totais.faturamento_bruto) || 0;
    const totalComissoes = parseFloat(totais.total_comissoes) || 0;
    const faturamentoLiquido = parseFloat(totais.faturamento_liquido) || 0;
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
        const valor = parseFloat(a.valor) || 0;
        return sum + valor;
    }, 0);

    let ticketMedio = 0;
    if (concluidos.length > 0) {
        const total = concluidos.reduce((sum, a) => {
            const valor = parseFloat(a.valor) || 0;
            return sum + valor;
        }, 0);
        ticketMedio = total / concluidos.length;
    }

    const profissionaisAtivos = profissionais.filter(p => p.ativo === 1 || p.ativo === true).length;

    const novosClientesMes = clientes.filter(c => {
        const dataCriacao = new Date(c.created_at);
        return dataCriacao >= new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    }).length;

    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const agendamentosPorDia = [0, 0, 0, 0, 0, 0, 0];
    agendamentos.forEach(ag => {
        const data = new Date(ag.data + 'T00:00:00');
        const diaSemana = data.getDay();
        agendamentosPorDia[diaSemana]++;
    });

    const servicosPopulares = {};
    concluidos.forEach(ag => {
        const nomeServico = ag.servico || 'Serviço';
        servicosPopulares[nomeServico] = (servicosPopulares[nomeServico] || 0) + 1;
    });
    const topServicos = Object.entries(servicosPopulares)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const proximosAgendamentos = agendamentos
        .filter(a => a.status === 'pendente' && a.data >= hoje)
        .sort((a, b) => (a.data + ' ' + a.hora).localeCompare(b.data + ' ' + b.hora))
        .slice(0, 5);

    const mesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1);
    const primeiroDiaMesAnterior = mesAnterior.toISOString().split('T')[0];
    const ultimoDiaMesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 0).toISOString().split('T')[0];
    const faturamentoMesAnterior = agendamentos.filter(a =>
        a.status === 'concluido' && a.data >= primeiroDiaMesAnterior && a.data <= ultimoDiaMesAnterior
    ).reduce((sum, a) => {
        const valor = parseFloat(a.valor) || 0;
        return sum + valor;
    }, 0);

    const variacaoPercentual = faturamentoMesAnterior > 0 ?
        ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior * 100).toFixed(1) : 0;
    const variacaoSinal = variacaoPercentual >= 0 ? '+' : '';
    const variacaoClasse = variacaoPercentual >= 0 ? 'trend-up' : 'trend-down';
    const variacaoIcone = variacaoPercentual >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';

    const isNewUser = agendamentos.length === 0 && clientes.length === 0;

    const usuarioStr = localStorage.getItem('usuario');
    const usuarioAtual = usuarioStr ? JSON.parse(usuarioStr) : null;
    const nomeUsuario = usuarioAtual?.nome || 'Usuário';

    // ============================================
    // HTML DO DASHBOARD
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
            <div class="welcome-banner" style="background:linear-gradient(135deg,var(--bg-card),var(--bg-hover));border-radius:16px;padding:20px 24px;margin-bottom:20px;border:1px solid var(--border-color);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                    <div>
                        <h2 style="font-size:20px;margin:0;display:flex;align-items:center;gap:8px;">👋 Olá, ${nomeUsuario}!</h2>
                        <p style="margin:4px 0 0;color:var(--text-muted);font-size:14px;">Bem-vindo ao See&Agende. Aqui está o resumo do seu negócio hoje.</p>
                        <div style="margin-top:6px;font-size:13px;color:var(--text-secondary);background:rgba(102,126,234,0.08);padding:4px 12px;border-radius:8px;display:inline-block;">
                            <i class="fas fa-lightbulb" style="color:var(--primary);"></i> 
                            ${isNewUser ?
            '💡 Dica: Comece cadastrando seus serviços!' :
            '💡 Dica: Use a <strong>Agenda Inteligente</strong> abaixo para agendar rapidamente clicando nas bolinhas coloridas dos profissionais disponíveis.'}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span style="display:block;font-weight:600;font-size:14px;color:var(--text-primary);">${dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
                        <span style="display:block;font-size:12px;color:var(--text-muted);">${dataAtual.toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            <!-- AGENDA INTELIGENTE -->
            <div class="card" style="padding: 16px 20px;background:var(--bg-card);border-radius:16px;border:1px solid var(--border-color);box-shadow:0 4px 24px rgba(0,0,0,0.04);margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <h3 style="font-size:17px; margin:0;display:flex;align-items:center;gap:10px;">
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
            
            <!-- ONBOARDING PARA NOVOS USUÁRIOS -->
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
            
            <!-- Cards Principais - Linha 1 -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:16px;">
                <div style="background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.05));border-radius:12px;padding:16px 20px;border:1px solid rgba(102,126,234,0.1);">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:24px;">💰</span>
                        <div>
                            <div style="font-size:20px;font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(faturamentoMes)}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Faturamento do Mês</div>
                            <div style="font-size:11px;color:${variacaoPercentual >= 0 ? '#22c55e' : '#ef4444'};display:flex;align-items:center;gap:4px;">
                                <i class="fas ${variacaoIcone}"></i> ${variacaoSinal}${variacaoPercentual}%
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:24px;">✂️</span>
                        <div>
                            <div style="font-size:20px;font-weight:700;color:var(--text-primary);">${agendamentos.length}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Total Atendimentos</div>
                            <div style="font-size:11px;display:flex;gap:8px;color:var(--text-muted);">
                                <span style="color:#22c55e;">${concluidos.length} ✅</span>
                                ${pendentes.length > 0 ? `<span style="color:#f59e0b;">${pendentes.length} ⏳</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:24px;">👥</span>
                        <div>
                            <div style="font-size:20px;font-weight:700;color:var(--text-primary);">${clientes.length}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Clientes</div>
                            <div style="font-size:11px;color:#22c55e;">+${novosClientesMes || 0} este mês</div>
                        </div>
                    </div>
                </div>
                
                <div style="background:${pendentes.length > 5 ? 'rgba(239,68,68,0.08)' : 'var(--bg-card)'};border-radius:12px;padding:16px 20px;border:1px solid ${pendentes.length > 5 ? 'rgba(239,68,68,0.2)' : 'var(--border-color)'};">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:24px;">⏳</span>
                        <div>
                            <div style="font-size:20px;font-weight:700;color:${pendentes.length > 5 ? '#ef4444' : 'var(--text-primary)'};">${pendentes.length}</div>
                            <div style="font-size:12px;color:var(--text-muted);">Pendentes</div>
                            <div style="font-size:11px;color:${agendamentosHoje.length > 0 ? '#f59e0b' : 'var(--text-muted)'};">${agendamentosHoje.length > 0 ? `${agendamentosHoje.length} hoje` : 'Nenhum hoje'}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cards Performance - Linha 2 -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
                <div style="background:var(--bg-card);border-radius:12px;padding:12px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:20px;">🎫</span>
                        <div>
                            <div style="font-size:16px;font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(ticketMedio)}</div>
                            <div style="font-size:11px;color:var(--text-muted);">Ticket Médio</div>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:12px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:20px;">✅</span>
                        <div>
                            <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${totalServicosConcluidos}</div>
                            <div style="font-size:11px;color:var(--text-muted);">Concluídos</div>
                            <div style="font-size:10px;color:var(--text-muted);">${agendamentos.length > 0 ? ((totalServicosConcluidos / agendamentos.length) * 100).toFixed(1) : 0}% do total</div>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:12px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:20px;">💸</span>
                        <div>
                            <div style="font-size:16px;font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(totalComissoes)}</div>
                            <div style="font-size:11px;color:var(--text-muted);">Comissões</div>
                            <div style="font-size:10px;color:var(--text-muted);"><i class="fas fa-users"></i> ${profissionaisAtivos} profissionais</div>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:12px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:20px;">📦</span>
                        <div>
                            <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${servicos.length}</div>
                            <div style="font-size:11px;color:var(--text-muted);">Serviços</div>
                            <div style="font-size:10px;color:var(--text-muted);">${servicos.filter(s => s.ativo).length} ativos</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cards Extras - Linha 3 -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
                <div style="background:var(--bg-card);border-radius:12px;padding:12px 16px;border:1px solid var(--border-color);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:20px;">📊</span>
                        <div>
                            <div style="font-size:16px;font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(faturamentoBruto)}</div>
                            <div style="font-size:11px;color:var(--text-muted);">Faturamento Bruto</div>
                        </div>
                    </div>
                </div>
                
                <div style="background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.05));border-radius:12px;padding:12px 16px;border:1px solid rgba(102,126,234,0.1);">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-size:20px;">💎</span>
                        <div>
                            <div style="font-size:16px;font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(faturamentoLiquido)}</div>
                            <div style="font-size:11px;color:var(--text-muted);">Faturamento Líquido</div>
                            <div style="font-size:10px;color:var(--text-muted);">Bruto - Comissões</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Gráficos -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                    <h4 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-chart-line" style="color:var(--primary);"></i> Agendamentos por Dia</h4>
                    <canvas id="chartAgendamentos" style="max-height:220px;width:100%;"></canvas>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                    <h4 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-trophy" style="color:var(--primary);"></i> Serviços Mais Populares</h4>
                    ${topServicos.length > 0 ? `
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            ${topServicos.map(([nome, qtd], idx) => `
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <span style="font-weight:700;font-size:13px;color:${idx === 0 ? '#d4af37' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'var(--text-muted)'};">${idx + 1}º</span>
                                    <div style="flex:1;">
                                        <div style="display:flex;justify-content:space-between;font-size:12px;">
                                            <span style="color:var(--text-primary);">${escapeHtml(nome)}</span>
                                            <span style="color:var(--text-muted);">${qtd}</span>
                                        </div>
                                        <div style="height:6px;background:var(--bg-hover);border-radius:4px;overflow:hidden;margin-top:2px;">
                                            <div style="height:100%;width:${(qtd / (topServicos[0]?.[1] || 1)) * 100}%;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:4px;"></div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div style="text-align:center;padding:20px;color:var(--text-muted);">
                            <i class="fas fa-cut" style="font-size:24px;opacity:0.3;"></i>
                            <p style="margin:8px 0 0;font-size:13px;">Nenhum serviço concluído</p>
                        </div>
                    `}
                </div>
            </div>
            
            <!-- Próximos Agendamentos -->
            <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <h4 style="margin:0;font-size:14px;"><i class="fas fa-calendar-alt" style="color:var(--primary);"></i> Próximos Atendimentos</h4>
                    <button onclick="carregarAgendamentos()" style="background:var(--bg-hover);border:1px solid var(--border-color);padding:4px 14px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text-secondary);">Ver Todos →</button>
                </div>
                ${proximosAgendamentos.length > 0 ? `
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
                ` : `
                    <div style="text-align:center;padding:20px;color:var(--text-muted);">
                        <i class="fas fa-calendar-check" style="font-size:24px;opacity:0.3;"></i>
                        <p style="margin:8px 0 0;font-size:13px;">Nenhum agendamento pendente</p>
                        <button onclick="carregarAgendamentos()" style="background:var(--primary);border:none;padding:6px 16px;border-radius:8px;color:white;font-size:12px;cursor:pointer;margin-top:8px;"><i class="fas fa-plus"></i> Novo</button>
                    </div>
                `}
            </div>
            
            <!-- Últimos Clientes -->
            <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                    <h4 style="margin:0;font-size:14px;"><i class="fas fa-users" style="color:var(--primary);"></i> Últimos Clientes</h4>
                    <button onclick="carregarClientes()" style="background:var(--bg-hover);border:1px solid var(--border-color);padding:4px 14px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text-secondary);">Ver Todos →</button>
                </div>
                ${clientes.length > 0 ? `
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;">
                        ${clientes.slice(0, 6).map(cliente => `
                            <div onclick="editarCliente(${cliente.id})" style="display:flex;align-items:center;gap:10px;background:var(--bg-hover);padding:8px 12px;border-radius:10px;cursor:pointer;transition:all 0.2s;border:1px solid transparent;hover:border-color:var(--primary);">
                                <span style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;">${cliente.nome ? cliente.nome.charAt(0).toUpperCase() : '👤'}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cliente.nome)}</div>
                                    <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cliente.telefone || cliente.email || 'Sem contato')}</div>
                                </div>
                                ${cliente.bloqueado_chatbot === 1 ?
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
        renderizarGraficoAgendamentos(diasSemana, agendamentosPorDia);
    }, 100);

    setTimeout(() => {
        carregarAgendaInteligente();
    }, 150);
}

// ============================================
// DASHBOARD SUPER ADMIN
// ============================================
async function carregarDashboardSuperAdmin() {
    const token = localStorage.getItem('token');

    try {
        const [statsRes, empresasRes] = await Promise.all([
            fetch('/api/admin/stats', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/empresas', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const stats = (await statsRes.json()).data || {};
        const empresas = (await empresasRes.json()).data || [];

        const empresasTrial = empresas.filter(e => e.plano === 'trial').length;
        const empresasPagas = empresas.filter(e => e.plano !== 'trial' && e.plano !== null).length;

        const html = `
            <div class="fade-in">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                    <h2 style="margin:0;font-size:22px;">🏢 Dashboard Super Admin</h2>
                    <span style="background:var(--bg-hover);padding:4px 14px;border-radius:8px;font-size:12px;color:var(--text-muted);"><i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:20px;">
                    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.05));border-radius:12px;padding:16px 20px;border:1px solid rgba(102,126,234,0.1);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">🏢</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${stats.empresas || 0}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Total de Empresas</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">👨‍💼</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${stats.donos || 0}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Donos</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">👥</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${stats.clientes || 0}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Total Clientes</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">✂️</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${stats.agendamentos || 0}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Agendamentos</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                        <h4 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-chart-pie" style="color:var(--primary);"></i> Distribuição de Planos</h4>
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <div>
                                <div style="display:flex;justify-content:space-between;font-size:13px;">
                                    <span>Trial</span>
                                    <span style="font-weight:600;">${empresasTrial}</span>
                                </div>
                                <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;margin-top:2px;">
                                    <div style="height:100%;width:${(empresasTrial / (empresas.length || 1)) * 100}%;background:#f59e0b;border-radius:4px;"></div>
                                </div>
                            </div>
                            <div>
                                <div style="display:flex;justify-content:space-between;font-size:13px;">
                                    <span>Planos Pagos</span>
                                    <span style="font-weight:600;">${empresasPagas}</span>
                                </div>
                                <div style="height:8px;background:var(--bg-hover);border-radius:4px;overflow:hidden;margin-top:2px;">
                                    <div style="height:100%;width:${(empresasPagas / (empresas.length || 1)) * 100}%;background:linear-gradient(90deg,#22c55e,#10b981);border-radius:4px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                        <h4 style="margin:0 0 12px;font-size:14px;"><i class="fas fa-clock" style="color:var(--primary);"></i> Empresas em Trial</h4>
                        <div style="max-height:250px;overflow-y:auto;">
                            ${empresas.filter(e => e.plano === 'trial').slice(0, 5).map(emp => `
                                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);">
                                    <div>
                                        <div style="font-weight:600;font-size:13px;">${escapeHtml(emp.nome)}</div>
                                        <div style="font-size:11px;color:var(--text-muted);">Expira: ${formatarDataBr(emp.trial_expira)}</div>
                                    </div>
                                    <button onclick="estenderTrial(${emp.id})" style="background:var(--primary);border:none;padding:4px 14px;border-radius:6px;color:white;font-size:11px;cursor:pointer;">+30 dias</button>
                                </div>
                            `).join('')}
                            ${empresas.filter(e => e.plano === 'trial').length === 0 ?
                '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Nenhuma empresa em trial</div>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar dashboard super admin:', error);
        document.getElementById('content').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dashboard Super Admin</p>
                <button onclick="carregarDashboard()" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
    }
}

// ============================================
// DASHBOARD PROFISSIONAL
// ============================================
async function carregarDashboardProfissional() {
    const token = localStorage.getItem('token');

    try {
        const [agendamentosRes, financeiroRes] = await Promise.all([
            fetch('/api/profissional/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissional/financeiro', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const agendamentos = (await agendamentosRes.json()).data || [];
        const financeiro = (await financeiroRes.json()).data || {};

        const pendentes = agendamentos.filter(a => a.status === 'pendente');
        const concluidos = agendamentos.filter(a => a.status === 'concluido');
        const totalComissoes = financeiro.total_comissoes || 0;

        const html = `
            <div class="fade-in">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
                    <h2 style="margin:0;font-size:22px;">📊 Meu Dashboard</h2>
                    <span style="background:var(--bg-hover);padding:4px 14px;border-radius:8px;font-size:12px;color:var(--text-muted);"><i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:20px;">
                    <div style="background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.05));border-radius:12px;padding:16px 20px;border:1px solid rgba(102,126,234,0.1);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">💰</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary);">R$ ${formatarMoeda(totalComissoes)}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Total em Comissões</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">✂️</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${agendamentos.length}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Total Atendimentos</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">⏳</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:${pendentes.length > 3 ? '#ef4444' : 'var(--text-primary)'};">${pendentes.length}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Pendentes</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background:var(--bg-card);border-radius:12px;padding:16px 20px;border:1px solid var(--border-color);">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px;">✅</span>
                            <div>
                                <div style="font-size:24px;font-weight:700;color:var(--text-primary);">${concluidos.length}</div>
                                <div style="font-size:12px;color:var(--text-muted);">Concluídos</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="background:var(--bg-card);border-radius:12px;padding:16px;border:1px solid var(--border-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
                        <h4 style="margin:0;font-size:14px;"><i class="fas fa-calendar-alt" style="color:var(--primary);"></i> Meus Próximos Atendimentos</h4>
                        <button onclick="carregarAgendamentosProfissional()" style="background:var(--bg-hover);border:1px solid var(--border-color);padding:4px 14px;border-radius:8px;font-size:12px;cursor:pointer;color:var(--text-secondary);">Ver Todos</button>
                    </div>
                    ${pendentes.length > 0 ? `
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                <thead>
                                    <tr style="border-bottom:1px solid var(--border-color);">
                                        <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Cliente</th>
                                        <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Serviço</th>
                                        <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Data/Hora</th>
                                        <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Valor</th>
                                        <th style="text-align:left;padding:8px 8px;font-size:11px;color:var(--text-muted);font-weight:600;">Comissão</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendentes.slice(0, 5).map(ag => `
                                        <tr style="border-bottom:1px solid var(--border-color);">
                                            <td style="padding:8px 8px;font-weight:600;font-size:12px;">${escapeHtml(ag.cliente_nome || 'Cliente')}</td>
                                            <td style="padding:8px 8px;font-size:12px;color:var(--text-secondary);">${escapeHtml(ag.servico || '-')}</td>
                                            <td style="padding:8px 8px;font-size:12px;color:var(--text-secondary);">${formatarDataBr(ag.data)} ${ag.hora || ''}</td>
                                            <td style="padding:8px 8px;font-size:12px;font-weight:600;">R$ ${formatarMoeda(ag.valor)}</td>
                                            <td style="padding:8px 8px;font-size:12px;color:#22c55e;font-weight:600;">R$ ${formatarMoeda(ag.comissao || 0)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Nenhum atendimento pendente</div>'}
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;
    } catch (error) {
        console.error('Erro ao carregar dashboard profissional:', error);
        document.getElementById('content').innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar dashboard do profissional</p>
                <button onclick="carregarDashboard()" class="btn btn-primary">Tentar Novamente</button>
            </div>
        `;
    }
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.atualizarDashboard = function () {
    showToast('🔄 Atualizando dados...', 'info');
    carregarDashboard();
};

window.estenderTrial = async function (empresaId) {
    if (!confirm('Estender trial por mais 30 dias?')) return;

    showLoading();
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/empresas/${empresaId}/extender-trial`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        if (data.success) {
            showToast('Trial estendido com sucesso!', 'success');
            carregarDashboard();
        } else {
            showToast(data.message || 'Erro ao estender trial', 'error');
        }
    } catch (error) {
        showToast('Erro ao estender trial', 'error');
    }
    hideLoading();
};

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
// 🔥 FUNÇÃO PARA FORÇAR RECARREGAMENTO DA AGENDA
// ============================================
window.forcarRecarregarAgenda = function () {
    console.log('🔥 FORÇANDO RECARREGAMENTO DA AGENDA...');
    agendaInteligenteData = [];
    agendaInteligenteCarregando = false;

    // 🔥 FORÇAR LIMPEZA DO CONTAINER
    const container = document.getElementById('agendaInteligenteContainer');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:32px;height:32px;"></div>
                <p style="margin-top:10px;font-size:13px;color:var(--text-muted);">Atualizando agenda...</p>
            </div>
        `;
    }

    setTimeout(function () {
        carregarAgendaInteligente();
        console.log('✅ Agenda recarregada!');
    }, 500);
};

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
window.forcarRecarregarAgenda = window.forcarRecarregarAgenda;

window.clientesList = window.clientesList || [];
window.servicosList = window.servicosList || [];
window.profissionaisList = window.profissionaisList || [];

console.log('✅ dashboard.js carregado com TODAS AS MELHORIAS VISUAIS + CORREÇÃO DE TIMEZONE + RECARREGAMENTO DA AGENDA!');