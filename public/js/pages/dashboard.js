// pages/dashboard.js - Versão Premium com Banner, Onboarding + AGENDA INTELIGENTE (EXPANDIDA)
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

async function carregarAgendaInteligente() {
    if (agendaInteligenteCarregando) return;
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

        // Criar objeto do Dono como profissional
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

        agendaInteligenteData = (await agendamentosRes.json()).data || [];

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

// ============================================
// RENDERIZAR AGENDA - VERSÃO COMPLETA E CORRIGIDA
// ============================================
function renderizarAgendaInteligente() {
    const container = document.getElementById('agendaInteligenteContainer');
    if (!container) return;

    console.log('📅 Renderizando agenda...');

    // --- Verificações iniciais ---
    if (!agendaInteligenteProfissionais || agendaInteligenteProfissionais.length === 0) {
        container.innerHTML = `
            <div class="agenda-empty-state">
                <i class="fas fa-users-slash"></i>
                <p>Nenhum profissional cadastrado</p>
                <button onclick="carregarConfiguracoes()" class="btn btn-sm btn-primary">
                    <i class="fas fa-user-plus"></i> Cadastrar Profissional
                </button>
            </div>
        `;
        return;
    }

    if (!agendaInteligenteHorarios || agendaInteligenteHorarios.length === 0) {
        container.innerHTML = `
            <div class="agenda-empty-state">
                <i class="fas fa-clock"></i>
                <p>Horários não configurados</p>
                <button onclick="carregarConfiguracoes()" class="btn btn-sm btn-primary">
                    <i class="fas fa-clock"></i> Configurar Horários
                </button>
            </div>
        `;
        return;
    }

    // --- 1. Calcular os dias da semana a partir de HOJE ---
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Data de referência para navegação
    let dataReferencia = new Date(agendaInteligenteDate);
    dataReferencia.setHours(0, 0, 0, 0);

    // Se a data de referência for anterior a hoje, força para hoje
    if (dataReferencia < hoje) {
        dataReferencia = new Date(hoje);
        agendaInteligenteDate = new Date(hoje);
    }

    // Encontra a SEGUNDA-FEIRA mais próxima a partir da data de referência
    let inicioSemana = new Date(dataReferencia);
    while (inicioSemana.getDay() !== 1) { // 1 = Segunda-feira
        inicioSemana.setDate(inicioSemana.getDate() - 1);
    }

    // Gera os 7 dias da semana (Segunda a Domingo)
    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias.push(d);
    }

    // --- 2. Filtrar apenas dias a partir de HOJE ---
    const hojeStr = hoje.toISOString().split('T')[0];
    const diasFiltrados = dias.filter(d => d.getTime() >= hoje.getTime());

    // Se não houver dias futuros, exibe mensagem
    if (diasFiltrados.length === 0) {
        container.innerHTML = `
            <div class="agenda-empty-state">
                <i class="fas fa-calendar-check"></i>
                <p>Não há dias disponíveis para agendamento</p>
                <button onclick="irAgendaHoje()" class="btn btn-sm btn-primary">
                    <i class="fas fa-calendar-day"></i> Ver Hoje
                </button>
            </div>
        `;
        return;
    }

    // --- 3. Gerar Horários (08:00 às 18:00) ---
    const horariosBase = [];
    for (let h = 8; h <= 18; h++) {
        horariosBase.push(`${String(h).padStart(2, '0')}:00`);
        if (h < 18) horariosBase.push(`${String(h).padStart(2, '0')}:30`);
    }

    // --- 4. Construir o HTML da Agenda ---
    let html = `
        <div class="agenda-premium">
            <!-- CABEÇALHO -->
            <div class="agenda-header-premium">
                <div class="agenda-title">
                    <i class="fas fa-calendar-alt" style="color: var(--primary);"></i>
                    <span>Agenda da Semana</span>
                    <span class="agenda-badge">${diasFiltrados.length} dias disponíveis</span>
                </div>
                <div class="agenda-nav-premium">
                    <button onclick="mudarAgendaSemana(-1)" class="agenda-nav-btn" title="Semana anterior">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button onclick="irAgendaHoje()" class="agenda-nav-btn today-btn">
                        <i class="fas fa-calendar-day"></i> Hoje
                    </button>
                    <button onclick="mudarAgendaSemana(1)" class="agenda-nav-btn" title="Próxima semana">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            <!-- LEGENDA -->
            <div class="agenda-legend">
                <span class="legend-item"><span class="legend-dot available"></span> Disponível</span>
                <span class="legend-item"><span class="legend-dot occupied"></span> Ocupado</span>
                <span class="legend-item"><span class="legend-dot lunch"></span> Almoço</span>
                <span class="legend-item"><span class="legend-dot closed"></span> Fechado</span>
                <span class="legend-item"><span class="legend-dot owner"></span> Dono</span>
            </div>

            <!-- TABELA -->
            <div class="agenda-table-wrapper">
                <table class="agenda-table">
                    <thead>
                        <tr>
                            <th class="agenda-time-col">Horário</th>
                            ${diasFiltrados.map(d => {
        const dataStr = d.toISOString().split('T')[0];
        const isHoje = dataStr === hojeStr;
        const nomeDia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const diaNum = d.getDate();
        const mesNum = d.getMonth() + 1;
        return `
                                    <th class="${isHoje ? 'agenda-day-today' : 'agenda-day'}">
                                        <span class="day-name">${nomeDia}</span>
                                        <span class="day-number">${diaNum}</span>
                                        <span class="day-month">/${String(mesNum).padStart(2, '0')}</span>
                                        ${isHoje ? '<span class="day-today-badge">HOJE</span>' : ''}
                                    </th>
                                `;
    }).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${horariosBase.map(hora => {
        const isAlmoco = hora >= '12:00' && hora < '13:00';
        const agora = new Date();
        const horaAtual = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');
        const isHorarioAtual = hora === horaAtual;

        return `
                                <tr class="${isHorarioAtual ? 'agenda-row-current' : ''}">
                                    <td class="agenda-time-cell ${isHorarioAtual ? 'current-time' : ''} ${isAlmoco ? 'lunch-time' : ''}">
                                        ${isHorarioAtual ? '<span class="now-badge">● AGORA</span>' : ''}
                                        ${isAlmoco ? '🍽️' : ''}
                                        <span class="time-text">${hora}</span>
                                    </td>
                                    ${diasFiltrados.map(d => {
            const dataStr = d.toISOString().split('T')[0];
            const isHoje = dataStr === hojeStr;
            const diaSemana = d.getDay();
            const horarioDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSemana);

            const estaAberto = horarioDia && horarioDia.aberto === 1;
            const noAlmoco = estaAberto &&
                hora >= (horarioDia?.almoco_inicio || '12:00') &&
                hora < (horarioDia?.almoco_fim || '13:00');

            const agendamentosHora = agendaInteligenteData.filter(a =>
                a.data === dataStr &&
                a.hora === hora &&
                a.status !== 'cancelado'
            );

            const ocupadosIds = agendamentosHora.map(a => a.profissional_id).filter(id => id !== null && id !== undefined);
            const temAgendamentoDono = agendamentosHora.some(a => a.profissional_id === null || a.profissional_id === '');

            let cellContent = '';
            let cellClass = 'agenda-cell';

            if (!estaAberto) {
                cellClass += ' closed';
                cellContent = `<span class="cell-status">🔒</span>`;
            } else if (noAlmoco) {
                cellClass += ' lunch';
                cellContent = `<span class="cell-status">🍽️</span>`;
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
                    cellClass += ' fully-occupied';
                    cellContent = `<span class="cell-status">🔴</span>`;
                } else {
                    cellClass += ' available';
                    const displayProfs = profissionaisComStatus.slice(0, 3);
                    const mais = profissionaisComStatus.length > 3 ? `+${profissionaisComStatus.length - 3}` : '';

                    cellContent = `
                                                    <div class="professionals-row">
                                                        ${displayProfs.map(p => {
                        const isDono = p.is_dono === true;
                        const cor = agendaInteligenteCores[p.id] || '#666';
                        const isOcupado = p.ocupado;
                        const size = isOcupado ? '22px' : '18px';

                        if (isOcupado) {
                            return `
                                                                    <div class="prof-circle occupied" style="width:${size};height:${size};background:#ef4444;" title="${p.nome} - Ocupado">
                                                                        <span style="font-size:8px;font-weight:700;color:#fff;">✕</span>
                                                                    </div>
                                                                `;
                        }

                        return `
                                                                <div class="prof-circle available" 
                                                                     style="width:${size};height:${size};background:${cor};${isDono ? 'border:2px solid #d4af37;' : ''}"
                                                                     onclick="abrirAgendamentoInteligente('${dataStr}','${hora}','${p.id}')"
                                                                     title="${p.nome} - Disponível">
                                                                    ${isDono ? '<span style="position:absolute;top:-4px;right:-4px;font-size:8px;">👑</span>' : ''}
                                                                    <span style="font-size:7px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);">${p.nome.charAt(0).toUpperCase()}</span>
                                                                    <span style="position:absolute;bottom:-2px;right:-2px;width:6px;height:6px;background:#10b981;border-radius:50%;border:1.5px solid var(--bg-card, #1a1a2e);"></span>
                                                                </div>
                                                            `;
                    }).join('')}
                                                        ${mais ? `<span class="more-profs">${mais}</span>` : ''}
                                                    </div>
                                                    <span class="avail-count">${disponiveis.length} disp.</span>
                                                `;
                }
            }

            if (isHoje) {
                cellClass += ' today';
            }

            return `<td class="${cellClass}">${cellContent}</td>`;
        }).join('')}
                                </tr>
                            `;
    }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Adiciona CSS se não existir
    if (!document.getElementById('agenda-premium-style')) {
        const style = document.createElement('style');
        style.id = 'agenda-premium-style';
        style.textContent = `
            /* ============================================
               AGENDA PREMIUM - ESTILOS
               ============================================ */
            .agenda-premium {
                background: var(--bg-card, #1a1a2e);
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            }
            .agenda-header-premium {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: var(--bg-hover, #16213e);
                border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.06));
                flex-wrap: wrap;
                gap: 10px;
            }
            .agenda-title {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary, #fff);
            }
            .agenda-badge {
                font-size: 10px;
                font-weight: 400;
                background: var(--primary, #667eea);
                color: #fff;
                padding: 2px 10px;
                border-radius: 20px;
                opacity: 0.8;
            }
            .agenda-nav-premium {
                display: flex;
                gap: 6px;
                align-items: center;
            }
            .agenda-nav-btn {
                background: var(--bg-card, #1a1a2e);
                border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                border-radius: 8px;
                padding: 6px 12px;
                color: var(--text-secondary, #a0a0b0);
                cursor: pointer;
                transition: all 0.2s;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .agenda-nav-btn:hover {
                background: var(--primary, #667eea);
                color: #fff;
                border-color: var(--primary, #667eea);
                transform: translateY(-1px);
            }
            .agenda-nav-btn.today-btn {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: #fff;
                border: none;
                font-weight: 600;
                font-size: 12px;
            }
            .agenda-nav-btn.today-btn:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }
            .agenda-nav-btn i {
                font-size: 12px;
            }
            .agenda-legend {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                padding: 10px 20px;
                background: var(--bg-card, #1a1a2e);
                border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.04));
            }
            .legend-item {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                color: var(--text-muted, #8888aa);
            }
            .legend-dot {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                display: inline-block;
                border: 2px solid transparent;
            }
            .legend-dot.available { background: #10b981; }
            .legend-dot.occupied { background: #ef4444; }
            .legend-dot.lunch { background: #f59e0b; }
            .legend-dot.closed { background: #6b7280; }
            .legend-dot.owner { background: #d4af37; border-color: #d4af37; }
            .agenda-table-wrapper {
                overflow-x: auto;
                max-height: 520px;
                overflow-y: auto;
                padding: 4px;
            }
            .agenda-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 2px;
                font-size: 12px;
                min-width: 600px;
            }
            .agenda-table thead th {
                padding: 10px 6px;
                text-align: center;
                font-weight: 700;
                font-size: 11px;
                color: var(--text-muted, #8888aa);
                background: var(--bg-hover, #16213e);
                border-radius: 8px 8px 0 0;
                position: sticky;
                top: 0;
                z-index: 5;
            }
            .agenda-time-col {
                min-width: 60px;
                background: var(--bg-hover, #16213e) !important;
                border-radius: 8px 0 0 8px !important;
            }
            .agenda-day {
                min-width: 65px;
            }
            .agenda-day-today {
                min-width: 65px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                color: #fff !important;
                border-radius: 8px 8px 0 0 !important;
                box-shadow: 0 4px 16px rgba(102,126,234,0.3);
            }
            .agenda-day-today .day-name,
            .agenda-day-today .day-number,
            .agenda-day-today .day-month {
                color: #fff !important;
            }
            .day-name {
                display: block;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .day-number {
                display: block;
                font-size: 20px;
                font-weight: 800;
                margin-top: 2px;
            }
            .day-month {
                font-size: 10px;
                opacity: 0.6;
            }
            .day-today-badge {
                display: inline-block;
                font-size: 8px;
                background: rgba(255,255,255,0.2);
                color: #fff;
                padding: 1px 8px;
                border-radius: 10px;
                margin-top: 2px;
                font-weight: 600;
            }
            .agenda-cell {
                padding: 4px 3px;
                text-align: center;
                background: var(--bg-card, #1a1a2e);
                border-radius: 4px;
                min-height: 40px;
                min-width: 60px;
                vertical-align: middle;
                transition: all 0.2s;
            }
            .agenda-cell.today {
                background: rgba(102,126,234,0.06);
                border: 1px solid rgba(102,126,234,0.12);
            }
            .agenda-cell.closed {
                background: rgba(107,114,128,0.06);
            }
            .agenda-cell.lunch {
                background: rgba(245,158,11,0.08);
            }
            .agenda-cell.fully-occupied {
                background: rgba(239,68,68,0.06);
            }
            .agenda-cell.available {
                background: rgba(16,185,129,0.04);
            }
            .agenda-cell.available:hover {
                background: rgba(16,185,129,0.08);
            }
            .cell-status {
                font-size: 16px;
                opacity: 0.7;
            }
            .agenda-row-current .agenda-cell {
                background: rgba(102,126,234,0.05) !important;
                border-left: 2px solid var(--primary, #667eea);
            }
            .agenda-time-cell {
                padding: 8px 6px;
                text-align: center;
                background: var(--bg-hover, #16213e);
                border-radius: 4px;
                font-weight: 600;
                font-size: 13px;
                color: var(--text-secondary, #a0a0b0);
                white-space: nowrap;
                min-width: 55px;
                position: sticky;
                left: 0;
                z-index: 2;
            }
            .agenda-time-cell.current-time {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: #fff;
                font-weight: 800;
                box-shadow: 0 2px 12px rgba(102,126,234,0.3);
            }
            .agenda-time-cell.lunch-time {
                background: rgba(245,158,11,0.15);
                color: #d97706;
            }
            .now-badge {
                display: block;
                font-size: 7px;
                background: rgba(255,255,255,0.2);
                padding: 1px 6px;
                border-radius: 8px;
                color: #fff;
                font-weight: 600;
                margin-bottom: 2px;
            }
            .time-text {
                font-size: 13px;
                font-weight: 700;
            }
            .professionals-row {
                display: flex;
                flex-wrap: wrap;
                gap: 3px;
                justify-content: center;
                align-items: center;
            }
            .prof-circle {
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                position: relative;
                flex-shrink: 0;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 2px solid rgba(255,255,255,0.1);
            }
            .prof-circle.available:hover {
                transform: scale(1.35);
                box-shadow: 0 0 20px rgba(16,185,129,0.4);
                z-index: 3;
            }
            .prof-circle.occupied {
                cursor: not-allowed;
                opacity: 0.8;
                animation: pulseRed 1.5s infinite;
            }
            .more-profs {
                font-size: 8px;
                color: var(--text-muted, #8888aa);
                font-weight: 600;
            }
            .avail-count {
                display: block;
                font-size: 7px;
                color: var(--text-muted, #8888aa);
                margin-top: 1px;
                opacity: 0.6;
            }
            .agenda-empty-state {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-muted, #8888aa);
            }
            .agenda-empty-state i {
                font-size: 36px;
                opacity: 0.3;
                margin-bottom: 12px;
                display: block;
            }
            .agenda-empty-state p {
                font-size: 14px;
                margin-bottom: 12px;
            }
            @keyframes pulseRed {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.08); }
            }
            @media (max-width: 768px) {
                .agenda-header-premium {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 8px;
                    padding: 12px 14px;
                }
                .agenda-title { font-size: 13px; justify-content: center; }
                .agenda-nav-premium { justify-content: center; }
                .agenda-nav-btn { padding: 4px 10px; font-size: 11px; }
                .agenda-legend { justify-content: center; gap: 8px; padding: 8px 12px; }
                .legend-item { font-size: 9px; }
                .legend-dot { width: 10px; height: 10px; }
                .agenda-table { font-size: 10px; min-width: 450px; }
                .agenda-table thead th { padding: 6px 3px; font-size: 9px; }
                .agenda-day .day-number { font-size: 14px; }
                .agenda-day-today .day-number { font-size: 16px; }
                .agenda-time-col { min-width: 40px; }
                .agenda-time-cell { font-size: 10px; padding: 4px 3px; min-width: 40px; }
                .time-text { font-size: 10px; }
                .agenda-cell { min-height: 30px; min-width: 40px; padding: 2px; }
                .prof-circle { width: 18px !important; height: 18px !important; }
                .cell-status { font-size: 12px; }
                .agenda-table-wrapper { max-height: 400px; }
            }
            @media (max-width: 480px) {
                .agenda-table { min-width: 350px; font-size: 9px; }
                .agenda-day .day-number { font-size: 12px; }
                .agenda-day-today .day-number { font-size: 14px; }
                .agenda-time-cell { font-size: 9px; padding: 3px 2px; min-width: 32px; }
                .time-text { font-size: 9px; }
                .agenda-cell { min-height: 24px; min-width: 32px; padding: 1px; }
                .prof-circle { width: 14px !important; height: 14px !important; }
                .more-profs { font-size: 6px; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// NAVEGAÇÃO DA AGENDA (CORRIGIDAS)
// ============================================
function mudarAgendaSemana(direcao) {
    agendaInteligenteDate.setDate(agendaInteligenteDate.getDate() + (direcao * 7));
    renderizarAgendaInteligente();
}

function irAgendaHoje() {
    agendaInteligenteDate = new Date();
    renderizarAgendaInteligente();
}

// ============================================
// 🔥 ATUALIZAR AGENDA APÓS AGENDAMENTO
// ============================================

function atualizarAgendaAposAgendamento() {
    console.log('🔄 Atualizando agenda após agendamento...');

    // Pequeno delay para garantir que o agendamento foi salvo
    setTimeout(() => {
        agendaInteligenteData = [];
        agendaInteligenteCarregando = false;
        carregarAgendaInteligente();
    }, 500);
}

// ============================================
// ABRIR AGENDAMENTO - VALIDAÇÃO CORRIGIDA
// ============================================

// ============================================
// ABRIR AGENDAMENTO - VALIDAÇÃO CORRIGIDA
// ============================================

// ============================================
// ABRIR AGENDAMENTO - VALIDAÇÃO CORRIGIDA
// ============================================

// ============================================
// ABRIR AGENDAMENTO - VERSÃO SIMPLIFICADA
// ============================================

// ============================================
// ABRIR AGENDAMENTO - VALIDAÇÃO CORRIGIDA
// ============================================

function abrirAgendamentoInteligente(data, hora, profissionalId = null) {
    console.log(`📝 Agendamento: ${data} às ${hora}${profissionalId ? ` - Prof: ${profissionalId}` : ''}`);

    // ============================================
    // 🔥 VALIDAÇÃO SIMPLES E INFALÍVEL
    // ============================================
    const agora = new Date();

    // Criar data do agendamento no formato correto
    const [ano, mes, dia] = data.split('-').map(Number);
    const [horaStr, minutoStr] = hora.split(':').map(Number);

    // Data do agendamento como objeto Date (sem fuso horário)
    const dataAgendamento = new Date(ano, mes - 1, dia);
    dataAgendamento.setHours(0, 0, 0, 0);

    // Data de hoje (sem hora)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Verificar se a data é anterior a hoje
    if (dataAgendamento < hoje) {
        showToast('❌ Esta data já passou. Não é possível agendar.', 'error');
        return;
    }

    // Se for hoje, verificar horário
    if (dataAgendamento.getTime() === hoje.getTime()) {
        const horaAtual = agora.getHours();
        const minutoAtual = agora.getMinutes();
        const horaAgendamentoMin = horaStr * 60 + minutoStr;
        const horaAtualMin = horaAtual * 60 + minutoAtual;

        if (horaAgendamentoMin <= horaAtualMin) {
            showToast(`❌ O horário ${hora} já passou hoje. Selecione um horário futuro.`, 'error');
            return;
        }
    }

    // 🔥 SE A DATA É FUTURA, PERMITE QUALQUER HORÁRIO
    if (dataAgendamento > hoje) {
        console.log(`✅ Data futura (${data}) - Horário permitido: ${hora}`);
    }

    console.log(`✅ Data/Hora válida: ${data} ${hora}`);

    // ============================================
    // 🔥 GUARDAR DADOS NAS VARIÁVEIS GLOBAIS
    // ============================================
    window.dataAgendamentoForcada = data;
    window.horaAgendamentoForcada = hora;
    window.profissionalAgendamentoForcado = profissionalId;

    // ============================================
    // 🔥 ABRIR MODAL
    // ============================================
    carregarDadosParaAgendamento().then(() => {
        if (typeof abrirModalAgendamentoDono === 'function') {
            abrirModalAgendamentoDono();
        } else {
            showToast('❌ Função de agendamento não disponível', 'error');
        }
    }).catch((err) => {
        console.error('❌ Erro ao carregar dados:', err);
        showToast('❌ Erro ao carregar dados para agendamento', 'error');
    });
}


// ============================================
// 🔥 NOVA FUNÇÃO: CARREGAR DADOS PARA AGENDAMENTO
// ============================================
async function carregarDadosParaAgendamento() {
    const token = localStorage.getItem('token');
    console.log('🔄 Carregando dados para agendamento...');

    try {
        // Carregar clientes
        const clientesRes = await fetch('/api/clientes', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const clientesData = await clientesRes.json();
        if (clientesData.success) {
            window.clientesList = clientesData.data || [];
            console.log(`✅ ${window.clientesList.length} clientes carregados`);
        }

        // Carregar serviços
        const servicosRes = await fetch('/api/servicos', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const servicosData = await servicosRes.json();
        if (servicosData.success) {
            window.servicosList = servicosData.data || [];
            console.log(`✅ ${window.servicosList.length} serviços carregados`);
        }

        // Carregar profissionais
        const profissionaisRes = await fetch('/api/profissionais', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const profissionaisData = await profissionaisRes.json();
        if (profissionaisData.success) {
            window.profissionaisList = profissionaisData.data || [];
            console.log(`✅ ${window.profissionaisList.length} profissionais carregados`);
        }

        return true;
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        throw error;
    }
}

// ============================================
// FUNÇÃO AUXILIAR: FORMATAR MOEDA (CORRIGIDA)
// ============================================
function formatarMoeda(valor) {
    // Verificar se valor é válido
    if (valor === undefined || valor === null || isNaN(valor)) {
        return '0,00';
    }
    // Converter para número e formatar
    const num = parseFloat(valor);
    if (isNaN(num)) {
        return '0,00';
    }
    return num.toFixed(2).replace('.', ',');
}

// ============================================
// FUNÇÃO PRINCIPAL
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
// DASHBOARD DO DONO - SEM AÇÕES RÁPIDAS, COM AGENDA EXPANDIDA
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
    // CÁLCULOS - CORRIGIDOS
    // ============================================
    const totais = financeiro.totais || {};

    // Garantir que os valores sejam números
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

    // Calcular faturamento do mês diretamente dos agendamentos
    const faturamentoMes = agendamentos.filter(a =>
        a.status === 'concluido' && a.data >= primeiroDiaMes
    ).reduce((sum, a) => {
        const valor = parseFloat(a.valor) || 0;
        return sum + valor;
    }, 0);

    // Calcular ticket médio
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
    // HTML DO DASHBOARD - SEM AÇÕES RÁPIDAS, AGENDA EXPANDIDA
    // ============================================
    const html = `
        <div class="fade-in">
            ${mostrarAvisoTrial ? `
                <div class="trial-banner">
                    <div class="trial-content">
                        <span>${mensagemTrial}</span>
                        <button onclick="carregarPlanos()" class="btn-upgrade">Fazer upgrade →</button>
                    </div>
                </div>
            ` : ''}
            
            <!-- BANNER DE BOAS-VINDAS -->
            <div class="welcome-banner">
                <div class="welcome-content">
                    <div>
                        <h2>👋 Olá, ${nomeUsuario}!</h2>
                        <p>Bem-vindo ao See&Agende. Aqui está o resumo do seu negócio hoje.</p>
                        <div class="welcome-tips">
                            <i class="fas fa-lightbulb"></i> 
                            ${isNewUser ?
            '💡 Dica: Comece cadastrando seus serviços!' :
            '💡 Dica: Use a <strong>Agenda Inteligente</strong> abaixo para agendar rapidamente clicando nas bolinhas coloridas dos profissionais disponíveis.'}
                        </div>
                    </div>
                    <div class="welcome-date">
                        <span class="day">${dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
                        <span class="date">${dataAtual.toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>

            <!-- ============================================ -->
            <!-- AGENDA INTELIGENTE - EXPANDIDA (SEM AÇÕES RÁPIDAS) -->
            <!-- ============================================ -->
            <div class="card" style="padding: 14px 18px;">
                <div class="card-header" style="margin-bottom: 6px;">
                    <h3 style="font-size: 16px; margin:0;">
                        <i class="fas fa-calendar-alt" style="color:var(--primary);"></i> 
                        Agenda Inteligente
                        <span style="font-size:11px;font-weight:400;color:var(--text-muted);margin-left:8px;">
                            <i class="fas fa-info-circle"></i> Clique na bolinha 🟢 para agendar
                        </span>
                    </h3>
                    <button class="btn btn-sm btn-primary" onclick="carregarAgendamentos()" style="padding:3px 14px;font-size:11px;">
                        <i class="fas fa-expand"></i> Ver Todos os Agendamentos
                    </button>
                </div>
                <div id="agendaInteligenteContainer">
                    <div style="text-align:center;padding:20px;">
                        <div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:30px;height:30px;"></div>
                        <p style="margin-top:8px;font-size:13px;color:var(--text-muted);">Carregando agenda...</p>
                    </div>
                </div>
            </div>
            
            <!-- ONBOARDING PARA NOVOS USUÁRIOS -->
            ${isNewUser ? `
                <div class="onboarding-card">
                    <div class="onboarding-content">
                        <i class="fas fa-rocket"></i>
                        <h3>🚀 Comece aqui!</h3>
                        <p>Parece que você ainda não tem agendamentos. Vamos te ajudar a começar:</p>
                        <div class="onboarding-steps">
                            <div class="step">
                                <span class="step-number">1</span>
                                <span>Cadastre seus <strong>serviços</strong></span>
                            </div>
                            <div class="step">
                                <span class="step-number">2</span>
                                <span>Adicione seus <strong>profissionais</strong></span>
                            </div>
                            <div class="step">
                                <span class="step-number">3</span>
                                <span>Crie seu primeiro <strong>agendamento</strong> pela Agenda Inteligente</span>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="carregarServicos()">
                            <i class="fas fa-arrow-right"></i> Começar Agora
                        </button>
                    </div>
                </div>
            ` : ''}
            
            <!-- Cards Principais - Linha 1 -->
            <div class="card-grid">
                <div class="stat-card premium">
                    <div class="stat-icon">💰</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoMes)}</div>
                        <div class="stat-label">Faturamento do Mês</div>
                        <div class="stat-trend ${variacaoClasse}">
                            <i class="fas ${variacaoIcone}"></i> ${variacaoSinal}${variacaoPercentual}% vs mês anterior
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon purple">✂️</div>
                    <div class="stat-content">
                        <div class="stat-value">${agendamentos.length}</div>
                        <div class="stat-label">Total de Atendimentos</div>
                        <div class="stat-sub">
                            <span class="text-success">${concluidos.length} concluídos</span>
                            ${pendentes.length > 0 ? ` · <span class="text-warning">${pendentes.length} pendentes</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon blue">👥</div>
                    <div class="stat-content">
                        <div class="stat-value">${clientes.length}</div>
                        <div class="stat-label">Clientes</div>
                        <div class="stat-sub">
                            <span class="text-success">+${novosClientesMes || 0} novos</span> este mês
                        </div>
                    </div>
                </div>
                
                <div class="stat-card ${pendentes.length > 5 ? 'warning' : ''}">
                    <div class="stat-icon orange">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${pendentes.length}</div>
                        <div class="stat-label">Pendentes</div>
                        <div class="stat-sub">
                            ${agendamentosHoje.length > 0 ?
            `<span class="text-warning">${agendamentosHoje.length} hoje</span>` :
            'Nenhum hoje'}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cards Performance - Linha 2 -->
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-icon teal">🎫</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(ticketMedio)}</div>
                        <div class="stat-label">Ticket Médio</div>
                        <div class="stat-sub">${concluidos.length} atendimentos</div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon green">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${totalServicosConcluidos}</div>
                        <div class="stat-label">Serviços Concluídos</div>
                        <div class="stat-sub">
                            ${agendamentos.length > 0 ?
            ((totalServicosConcluidos / agendamentos.length) * 100).toFixed(1) : 0}% do total
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon pink">💸</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(totalComissoes)}</div>
                        <div class="stat-label">Comissões a Pagar</div>
                        <div class="stat-sub">
                            <i class="fas fa-users"></i> ${profissionaisAtivos} profissionais
                        </div>
                    </div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-icon indigo">📦</div>
                    <div class="stat-content">
                        <div class="stat-value">${servicos.length}</div>
                        <div class="stat-label">Serviços</div>
                        <div class="stat-sub">
                            ${servicos.filter(s => s.ativo).length} ativos
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Cards Extras - Linha 3 -->
            <div class="card-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoBruto)}</div>
                        <div class="stat-label">Faturamento Bruto</div>
                        <div class="stat-sub">Total de serviços concluídos</div>
                    </div>
                </div>
                
                <div class="stat-card premium">
                    <div class="stat-icon">💎</div>
                    <div class="stat-content">
                        <div class="stat-value">R$ ${formatarMoeda(faturamentoLiquido)}</div>
                        <div class="stat-label">Faturamento Líquido</div>
                        <div class="stat-sub">Bruto - Comissões</div>
                    </div>
                </div>
            </div>
            
            <!-- Gráficos -->
            <div class="card-grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-chart-line"></i> Agendamentos por Dia</h3>
                    </div>
                    <canvas id="chartAgendamentos" style="max-height: 280px; width: 100%"></canvas>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-trophy"></i> Serviços Mais Populares</h3>
                    </div>
                    ${topServicos.length > 0 ? `
                        <div class="top-servicos-list">
                            ${topServicos.map(([nome, qtd], idx) => `
                                <div class="servico-rank-item">
                                    <div class="rank-number ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}">
                                        ${idx + 1}º
                                    </div>
                                    <div class="servico-rank-info">
                                        <div class="servico-rank-nome">${escapeHtml(nome)}</div>
                                        <div class="servico-rank-stats">
                                            <span class="qtd">${qtd} atendimento${qtd !== 1 ? 's' : ''}</span>
                                            <span class="percent">${((qtd / (totalServicosConcluidos || 1)) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div class="rank-bar">
                                        <div class="fill" style="width: ${(qtd / (topServicos[0]?.[1] || 1)) * 100}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-cut"></i>
                            <h4>Nenhum serviço concluído</h4>
                            <p>Os serviços aparecerão aqui quando forem concluídos</p>
                        </div>
                    `}
                </div>
            </div>
            
            <!-- Próximos Agendamentos -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-calendar-alt"></i> Próximos Atendimentos</h3>
                    <button class="btn btn-sm btn-primary" onclick="carregarAgendamentos()">
                        Ver Todos <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                ${proximosAgendamentos.length > 0 ? `
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Serviço</th>
                                    <th>Data</th>
                                    <th>Horário</th>
                                    <th>Profissional</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${proximosAgendamentos.map(ag => `
                                    <tr>
                                        <td><strong>${escapeHtml(ag.cliente_nome || 'Cliente')}</strong></td>
                                        <td>${escapeHtml(ag.servico || '-')}</td>
                                        <td>${formatarDataBr(ag.data)}</td>
                                        <td><span class="hora-badge">${ag.hora || '-'}</span></td>
                                        <td>${escapeHtml(ag.profissional_nome || '-')}</td>
                                        <td><strong>R$ ${formatarMoeda(ag.valor)}</strong></td>
                                        <td>
                                            <span class="status-badge ${ag.status}">
                                                <span class="dot"></span>
                                                ${ag.status === 'agendado' ? 'Agendado' :
                    ag.status === 'pendente' ? 'Pendente' :
                        ag.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-calendar-check"></i>
                        <h4>Nenhum agendamento pendente</h4>
                        <p>Que tal criar um novo agendamento?</p>
                        <button class="btn btn-primary btn-sm" onclick="carregarAgendamentos()">
                            <i class="fas fa-plus"></i> Novo Agendamento
                        </button>
                    </div>
                `}
            </div>
            
            <!-- Últimos Clientes -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-users"></i> Últimos Clientes</h3>
                    <button class="btn btn-sm btn-secondary" onclick="carregarClientes()">
                        Ver Todos <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                ${clientes.length > 0 ? `
                    <div class="ultimos-clientes-grid">
                        ${clientes.slice(0, 6).map(cliente => `
                            <div class="cliente-card-item" onclick="editarCliente(${cliente.id})">
                                <div class="cliente-avatar-icon">
                                    ${cliente.nome ? cliente.nome.charAt(0).toUpperCase() : '👤'}
                                </div>
                                <div class="cliente-info-data">
                                    <div class="cliente-nome-completo">${escapeHtml(cliente.nome)}</div>
                                    <div class="cliente-contato-info">
                                        ${escapeHtml(cliente.telefone || cliente.email || 'Sem contato')}
                                    </div>
                                </div>
                                ${cliente.bloqueado_chatbot === 1 ?
                                '<span class="badge badge-danger">🔒</span>' :
                                '<span class="badge badge-success">✅</span>'
                            }
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-user-plus"></i>
                        <h4>Nenhum cliente cadastrado</h4>
                        <p>Comece adicionando seus primeiros clientes</p>
                        <button class="btn btn-primary btn-sm" onclick="abrirModalCliente()">
                            <i class="fas fa-plus"></i> Novo Cliente
                        </button>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;

    setTimeout(() => {
        renderizarGraficoAgendamentos(diasSemana, agendamentosPorDia);
    }, 100);

    // ============================================
    // CARREGAR A AGENDA INTELIGENTE
    // ============================================
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
                <div class="dashboard-header">
                    <h2 class="page-title">🏢 Dashboard Super Admin</h2>
                    <div class="date-range">
                        <span class="badge badge-info">
                            <i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                </div>
                
                <div class="card-grid">
                    <div class="stat-card premium">
                        <div class="stat-icon">🏢</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.empresas || 0}</div>
                            <div class="stat-label">Total de Empresas</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon purple">👨‍💼</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.donos || 0}</div>
                            <div class="stat-label">Donos</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon blue">👥</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.clientes || 0}</div>
                            <div class="stat-label">Total Clientes</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">✂️</div>
                        <div class="stat-content">
                            <div class="stat-value">${stats.agendamentos || 0}</div>
                            <div class="stat-label">Agendamentos</div>
                        </div>
                    </div>
                </div>
                
                <div class="card-grid-2">
                    <div class="card">
                        <h3><i class="fas fa-chart-pie"></i> Distribuição de Planos</h3>
                        <div style="padding: 20px;">
                            <div class="progress-item">
                                <div class="progress-label">
                                    <span>Trial</span>
                                    <span>${empresasTrial}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(empresasTrial / (empresas.length || 1)) * 100}%; background: #f59e0b;"></div>
                                </div>
                            </div>
                            <div class="progress-item">
                                <div class="progress-label">
                                    <span>Planos Pagos</span>
                                    <span>${empresasPagas}</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${(empresasPagas / (empresas.length || 1)) * 100}%; background: #10b981;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3><i class="fas fa-clock"></i> Empresas em Trial</h3>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${empresas.filter(e => e.plano === 'trial').slice(0, 5).map(emp => `
                                <div class="empresa-trial-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e5e7eb;">
                                    <div>
                                        <strong>${escapeHtml(emp.nome)}</strong>
                                        <div class="text-muted small">Expira: ${formatarDataBr(emp.trial_expira)}</div>
                                    </div>
                                    <button class="btn btn-sm btn-primary" onclick="estenderTrial(${emp.id})">
                                        +30 dias
                                    </button>
                                </div>
                            `).join('')}
                            ${empresas.filter(e => e.plano === 'trial').length === 0 ?
                '<p class="text-muted" style="padding: 20px; text-align: center;">Nenhuma empresa em trial</p>' : ''}
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
                <div class="dashboard-header">
                    <h2 class="page-title">📊 Meu Dashboard</h2>
                    <div class="date-range">
                        <span class="badge badge-info">
                            <i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                </div>
                
                <div class="card-grid">
                    <div class="stat-card premium">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value">R$ ${formatarMoeda(totalComissoes)}</div>
                            <div class="stat-label">Total em Comissões</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon purple">✂️</div>
                        <div class="stat-content">
                            <div class="stat-value">${agendamentos.length}</div>
                            <div class="stat-label">Total Atendimentos</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon orange">⏳</div>
                        <div class="stat-content">
                            <div class="stat-value">${pendentes.length}</div>
                            <div class="stat-label">Pendentes</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">✅</div>
                        <div class="stat-content">
                            <div class="stat-value">${concluidos.length}</div>
                            <div class="stat-label">Concluídos</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3><i class="fas fa-calendar-alt"></i> Meus Próximos Atendimentos</h3>
                        <button class="btn btn-sm btn-primary" onclick="carregarAgendamentosProfissional()">
                            Ver Todos
                        </button>
                    </div>
                    ${pendentes.length > 0 ? `
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr><th>Cliente</th><th>Serviço</th><th>Data</th><th>Hora</th><th>Valor</th><th>Comissão</th></tr>
                                </thead>
                                <tbody>
                                    ${pendentes.slice(0, 5).map(ag => `
                                        <tr>
                                            <td>${escapeHtml(ag.cliente_nome || 'Cliente')}</td>
                                            <td>${escapeHtml(ag.servico || '-')}</td>
                                            <td>${formatarDataBr(ag.data)}</td>
                                            <td>${ag.hora || '-'}</td>
                                            <td>R$ ${formatarMoeda(ag.valor)}</td>
                                            <td>R$ ${formatarMoeda(ag.comissao || 0)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p class="text-muted" style="padding: 40px; text-align: center;">Nenhum atendimento pendente</p>'}
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
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
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
                    borderRadius: 8,
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
                        ticks: { stepSize: 1, font: { size: 11 } },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false } }
                },
                animation: { duration: 800, easing: 'easeInOutQuart' }
            }
        });
    }
}

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        const data = new Date(dataStr + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    } catch {
        return dataStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Atualizar dashboard (recarregar)
window.atualizarDashboard = function () {
    showToast('🔄 Atualizando dados...', 'info');
    carregarDashboard();
};

// Função para estender trial (Super Admin)
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

// ============================================
// AÇÕES RÁPIDAS (mantidas para compatibilidade)
// ============================================

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

        console.log('✅ Dados carregados:', {
            clientes: window.clientesList.length,
            servicos: window.servicosList.length,
            profissionais: window.profissionaisList.length
        });
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

// Garantir que as listas estejam disponíveis globalmente
window.clientesList = window.clientesList || [];
window.servicosList = window.servicosList || [];
window.profissionaisList = window.profissionaisList || [];

console.log('✅ dashboard.js carregado com AGENDA INTELIGENTE EXPANDIDA!');