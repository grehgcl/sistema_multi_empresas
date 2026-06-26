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

function renderizarAgendaInteligente() {
    const container = document.getElementById('agendaInteligenteContainer');
    if (!container) return;
    console.log('📅 Data atual da agenda:', agendaInteligenteDate.toISOString().split('T')[0]);

    // ============================================
    // VERIFICAR SE TEM PROFISSIONAIS
    // ============================================
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

    // ============================================
    // VERIFICAR SE TEM HORÁRIOS
    // ============================================
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
    // LEGENDA DE CORES - MELHORADA
    // ============================================
    let html = `
        <div style="margin-bottom:10px;">
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
                <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">👤 Profissionais:</span>
                    ${agendaInteligenteProfissionais.slice(0, 5).map(p => {
        const cor = agendaInteligenteCores[p.id] || '#666';
        const isDono = p.is_dono === true;
        return `
                            <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:14px;font-size:11px;${isDono ? 'border:1px solid #d4af37;' : ''}">
                                <span style="width:12px;height:12px;background:${cor};border-radius:50%;display:inline-block;${isDono ? 'border:2px solid #d4af37;' : ''}"></span>
                                ${p.nome.length > 10 ? p.nome.substring(0, 10) + '…' : p.nome}${isDono ? '👑' : ''}
                            </span>
                        `;
    }).join('')}
                    ${agendaInteligenteProfissionais.length > 5 ? `<span style="font-size:11px;color:var(--text-muted);">+${agendaInteligenteProfissionais.length - 5}</span>` : ''}
                </div>
                <span style="font-size:10px;color:var(--text-muted);">
                    <i class="fas fa-mouse-pointer"></i> Clique na bolinha para agendar
                </span>
            </div>
            <!-- LEGENDA MELHORADA -->
            <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:10px;padding:6px 0;margin-top:4px;border-top:1px solid var(--border-color);">
                <span style="display:flex;align-items:center;gap:4px;">
                    <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid rgba(16,185,129,0.3);"></span>
                    <span style="color:var(--text-muted);">Disponível</span>
                </span>
                <span style="display:flex;align-items:center;gap:4px;">
                    <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid rgba(239,68,68,0.3);"></span>
                    <span style="color:var(--text-muted);">Ocupado</span>
                </span>
                <span style="display:flex;align-items:center;gap:4px;">
                    <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid rgba(245,158,11,0.3);"></span>
                    <span style="color:var(--text-muted);">Almoço</span>
                </span>
                <span style="display:flex;align-items:center;gap:4px;">
                    <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#6b7280;border:2px solid rgba(107,114,128,0.3);"></span>
                    <span style="color:var(--text-muted);">Fechado</span>
                </span>
                <span style="display:flex;align-items:center;gap:4px;border-left:1px solid var(--border-color);padding-left:12px;">
                    <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#d4af37;border:2px solid #d4af37;"></span>
                    <span style="color:var(--text-muted);">👑 Dono</span>
                </span>
            </div>
        </div>
    `;

    // ============================================
    // DIAS DA SEMANA
    // ============================================
    const dias = [];
    const inicioSemana = new Date(agendaInteligenteDate);
    inicioSemana.setDate(agendaInteligenteDate.getDate() - agendaInteligenteDate.getDay());

    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias.push(d);
    }

    const hoje = new Date().toISOString().split('T')[0];

    // ============================================
    // GERAR HORÁRIOS COMPLETOS (08:00 às 18:00 com 30min)
    // ============================================
    const horariosBase = [];
    for (let h = 8; h <= 18; h++) {
        const horaStr = String(h).padStart(2, '0') + ':00';
        horariosBase.push(horaStr);
        if (h < 18) {
            horariosBase.push(String(h).padStart(2, '0') + ':30');
        }
    }

    // ============================================
    // TABELA DO CALENDÁRIO - COM HORÁRIOS DESTACADOS
    // ============================================
    html += `
        <div style="overflow-x:auto;max-height:450px;overflow-y:auto;border-radius:8px;border:1px solid var(--border-color);">
            <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:500px;">
                <thead>
                    <tr>
                        <th style="padding:8px 8px;background:var(--bg-hover);text-align:center;font-weight:700;position:sticky;top:0;z-index:5;font-size:10px;min-width:55px;color:var(--text-muted);border-bottom:2px solid var(--border-color);">
                            <i class="fas fa-clock"></i> Horário
                        </th>
                        ${dias.map(d => {
        const dataStr = d.toISOString().split('T')[0];
        const isHoje = dataStr === hoje;
        const nomeDia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const diaNum = d.getDate();
        return `
                            <th style="padding:8px 4px;
                                       background:${isHoje ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'var(--bg-hover)'};
                                       color:${isHoje ? '#ffffff' : 'var(--text-secondary)'};
                                       text-align:center;
                                       font-weight:${isHoje ? '700' : '600'};
                                       position:sticky;
                                       top:0;
                                       z-index:5;
                                       font-size:10px;
                                       min-width:60px;
                                       border-bottom:${isHoje ? '3px solid #ffffff' : '2px solid var(--border-color)'};
                                       box-shadow:${isHoje ? '0 2px 12px rgba(102, 126, 234, 0.4)' : 'none'};
                                       border-radius:${isHoje ? '8px 8px 0 0' : '0'};">
                                ${nomeDia}
                                <br>
                                <span style="font-size:${isHoje ? '18px' : '14px'};font-weight:${isHoje ? '800' : '700'};display:block;margin-top:2px;${isHoje ? 'text-shadow: 0 1px 4px rgba(0,0,0,0.2);' : ''}">
                                    ${diaNum}
                                </span>
                                ${isHoje ? `<span style="display:block;font-size:8px;margin-top:2px;opacity:0.9;">📌 HOJE</span>` : ''}
                            </th>
                        `;
    }).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    for (let hora of horariosBase) {
        // Destacar horário atual
        const agora = new Date();
        const horaAtual = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');
        const isHorarioAtual = hora === horaAtual;

        // Verificar se é horário de almoço (12:00 às 13:00)
        const isAlmoco = hora >= '12:00' && hora < '13:00';

        html += `<tr style="${isHorarioAtual ? 'background:rgba(102,126,234,0.08);' : ''}">`;

        // 🔥 COLUNA DO HORÁRIO - COM ÍCONE E CORES FORTES
        html += `
        <td style="
            padding: 10px 6px;
            text-align: center;
            border-bottom: 2px solid var(--border-color);
            font-size: ${isHorarioAtual ? '15px' : '12px'};
            font-weight: ${isHorarioAtual ? '800' : '700'};
            color: ${isHorarioAtual ? '#ffffff' : (isAlmoco ? '#d97706' : 'var(--text-primary)')};
            background: ${isHorarioAtual ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : (isAlmoco ? 'rgba(245,158,11,0.15)' : 'var(--bg-hover)')};
            white-space: nowrap;
            border-right: 3px solid ${isHorarioAtual ? 'var(--primary)' : 'var(--border-color)'};
            min-width: 70px;
            position: sticky;
            left: 0;
            z-index: 3;
            box-shadow: ${isHorarioAtual ? '0 2px 16px rgba(102,126,234,0.4)' : '2px 0 8px rgba(0,0,0,0.04)'};
            ${isHorarioAtual ? 'border-radius: 6px 0 0 6px;' : ''}
            transition: all 0.3s ease;
        ">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                ${isHorarioAtual ? `
                    <span style="font-size:10px;background:rgba(255,255,255,0.2);padding:1px 8px;border-radius:10px;color:white;font-weight:600;">
                        ● AGORA
                    </span>
                ` : ''}
                ${isAlmoco ? `
                    <span style="font-size:14px;">🍽️</span>
                ` : `
                    <span style="font-size:10px;opacity:0.5;color:var(--text-muted);">
                        <i class="fas fa-clock"></i>
                    </span>
                `}
                <span style="font-size: ${isHorarioAtual ? '16px' : '13px'}; font-weight: ${isHorarioAtual ? '800' : '700'};">
                    ${hora}
                </span>
                ${isHorarioAtual ? `
                    <span style="font-size:7px;opacity:0.8;color:white;margin-top:-2px;">horário atual</span>
                ` : ''}
                ${isAlmoco ? `
                    <span style="font-size:7px;color:#d97706;font-weight:600;">ALMOÇO</span>
                ` : ''}
            </div>
        </td>
    `;

        for (let d of dias) {
            const dataStr = d.toISOString().split('T')[0];
            const isHoje = dataStr === hoje;
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

            // 🔥 IDENTIFICAR QUEM ESTÁ OCUPADO
            const ocupadosIds = agendamentosHora.map(a => a.profissional_id).filter(id => id !== null && id !== undefined);
            const temAgendamentoDono = agendamentosHora.some(a => a.profissional_id === null || a.profissional_id === '');

            let cellContent = '';
            let bgColor = 'transparent';
            let title = '';

            // 🔥 DESTAQUE DO DIA ATUAL
            if (isHoje) {
                bgColor = 'rgba(102, 126, 234, 0.04)';
            }

            if (!estaAberto) {
                bgColor = isHoje ? 'rgba(102, 126, 234, 0.04)' : 'rgba(107,114,128,0.04)';
                cellContent = `<span style="color:#9ca3af;font-size:14px;">—</span>`;
                title = 'Fechado';
            } else if (noAlmoco) {
                bgColor = isHoje ? 'rgba(102, 126, 234, 0.08)' : 'rgba(245,158,11,0.08)';
                cellContent = `<span style="color:#d97706;font-size:18px;">🍽️</span>`;
                title = 'Horário de almoço';
            } else {
                // 🔥 VERIFICAR DISPONIBILIDADE DE CADA PROFISSIONAL
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
                    bgColor = isHoje ? 'rgba(102, 126, 234, 0.08)' : 'rgba(239,68,68,0.06)';
                    cellContent = `<span style="color:#ef4444;font-size:14px;font-weight:700;">🔴</span>`;
                    title = 'Todos os profissionais ocupados';
                } else {
                    // 🔥 MOSTRAR TODOS OS PROFISSIONAIS COM SEU STATUS
                    const todosProfissionais = profissionaisComStatus;
                    const displayProfs = todosProfissionais.slice(0, 4);
                    const mais = todosProfissionais.length > 4 ? ` +${todosProfissionais.length - 4}` : '';

                    bgColor = isHoje ? 'rgba(102, 126, 234, 0.06)' : 'rgba(16,185,129,0.04)';

                    cellContent = `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
                            <div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;align-items:center;">
                                ${displayProfs.map(p => {
                        const isDono = p.is_dono === true;
                        const cor = agendaInteligenteCores[p.id] || '#666';
                        const isOcupado = p.ocupado;

                        // 🔥 TAMANHO DA BOLINHA: MAIOR SE OCUPADO
                        const size = isOcupado ? '28px' : '22px';
                        const fontSize = isOcupado ? '14px' : '10px';
                        const borderWidth = isOcupado ? '3px' : '2px';
                        const borderColor = isOcupado ? '#ef4444' : (isDono ? '#d4af37' : 'rgba(255,255,255,0.4)');
                        const boxShadow = isOcupado ? '0 0 16px rgba(239,68,68,0.5)' : '0 0 8px rgba(16,185,129,0.3)';
                        const opacidade = isOcupado ? '1' : '1';
                        const cursor = isOcupado ? 'not-allowed' : 'pointer';
                        const statusText = isOcupado ? '🔴 Ocupado' : '✅ Disponível';
                        const tooltipText = isDono ? `👑 ${p.nome} - ${hora} ${statusText}` : `${p.nome} - ${hora} ${statusText}`;

                        return `
                                        <div style="position:relative;display:inline-block;cursor:${cursor};" 
                                             title="${tooltipText}"
                                             onclick="${isOcupado ? '' : `event.stopPropagation(); abrirAgendamentoInteligente('${dataStr}','${hora}','${p.id}')`}">
                                            <span style="display:inline-block;
                                                         width:${size};
                                                         height:${size};
                                                         border-radius:50%;
                                                         background:${isOcupado ? '#ef4444' : cor};
                                                         border:${borderWidth} solid ${borderColor};
                                                         box-shadow: ${boxShadow};
                                                         transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                                                         position:relative;
                                                         ${isOcupado ? 'animation: pulseRed 1.5s infinite;' : ''}
                                                         opacity:${opacidade};"
                                                  ${!isOcupado ? `
                                                      onmouseover="this.style.transform='scale(1.25)';this.style.boxShadow='0 0 20px ${cor}'"
                                                      onmouseout="this.style.transform='scale(1)';this.style.boxShadow='${boxShadow}'"
                                                  ` : ''}
                                                  >
                                                ${isDono ? `<span style="position:absolute;top:-4px;right:-4px;font-size:${isOcupado ? '12px' : '10px'};">👑</span>` : ''}
                                                ${isOcupado ? `
                                                    <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:${fontSize};color:white;font-weight:700;">✕</span>
                                                ` : `
                                                    <span style="position:absolute;bottom:-2px;right:-2px;width:8px;height:8px;background:#10b981;border-radius:50%;border:1px solid white;box-shadow:0 0 4px rgba(16,185,129,0.5);"></span>
                                                `}
                                            </span>
                                            ${isOcupado ? `
                                                <span style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);font-size:7px;color:#ef4444;white-space:nowrap;font-weight:600;">
                                                    🔴
                                                </span>
                                            ` : ''}
                                        </div>
                                    `;
                    }).join('')}
                                ${mais}
                            </div>
                            ${todosProfissionais.length > 1 ? `
                                <span style="font-size:7px;color:var(--text-muted);opacity:0.6;">
                                    ${disponiveis.length}/${todosProfissionais.length} disponíveis
                                </span>
                            ` : ''}
                        </div>
                    `;
                    title = `${hora} - ${disponiveis.length} profissional(is) disponível(eis)`;
                }
            }

            // 🔥 BORDA PARA DESTACAR O DIA ATUAL
            const borderStyle = isHoje ? 'border-left:2px solid var(--primary);border-right:2px solid var(--primary);' : '';
            const borderTop = isHoje && hora === horariosBase[0] ? 'border-top:2px solid var(--primary);' : '';
            const borderBottom = isHoje && hora === horariosBase[horariosBase.length - 1] ? 'border-bottom:2px solid var(--primary);' : '';

            html += `
                <td style="padding:4px 3px;
                           border-bottom:1px solid var(--border-color);
                           background:${bgColor};
                           text-align:center;
                           font-size:9px;
                           min-height:38px;
                           vertical-align:middle;
                           ${borderStyle}
                           ${borderTop}
                           ${borderBottom}
                           ${isHoje ? 'position:relative;' : ''}
                           " 
                    title="${title}">
                    ${isHoje && !cellContent.includes('—') && !cellContent.includes('🍽️') && !cellContent.includes('🔴') ? `
                        <div style="position:absolute;top:0;left:0;right:0;bottom:0;border:1px solid rgba(102,126,234,0.15);border-radius:4px;pointer-events:none;"></div>
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
        </div>
    `;

    // ============================================
    // NAVEGAÇÃO - MELHORADA
    // ============================================
    html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 4px 0;border-top:1px solid var(--border-color);margin-top:10px;font-size:11px;color:var(--text-muted);flex-wrap:wrap;gap:6px;">
            <div style="display:flex;gap:4px;align-items:center;">
                <button onclick="mudarAgendaSemana(-1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:6px;cursor:pointer;padding:6px 12px;color:var(--text-secondary);font-size:12px;transition:all 0.2s;">
                    ◀
                </button>
                <span style="font-weight:600;color:var(--text-primary);font-size:13px;background:var(--bg-hover);padding:4px 14px;border-radius:6px;">
                    📅 ${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} - 
                    ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <button onclick="mudarAgendaSemana(1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:6px;cursor:pointer;padding:6px 12px;color:var(--text-secondary);font-size:12px;transition:all 0.2s;">
                    ▶
                </button>
                <button onclick="irAgendaHoje()" style="background:var(--gradient-primary);border:none;border-radius:6px;cursor:pointer;padding:6px 16px;color:white;font-size:11px;font-weight:600;transition:all 0.2s;box-shadow:0 2px 8px rgba(102,126,234,0.3);">
                    📌 Hoje
                </button>
            </div>
            <div style="display:flex;gap:10px;font-size:9px;flex-wrap:wrap;">
                <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:12px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;"></span>
                    Disponível
                </span>
                <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:12px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;"></span>
                    Ocupado
                </span>
                <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:12px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;"></span>
                    Almoço
                </span>
                <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:12px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#6b7280;"></span>
                    Fechado
                </span>
                <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:12px;border:1px solid var(--primary);">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--primary);"></span>
                    Hoje
                </span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================
// NAVEGAÇÃO DA AGENDA
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
// ABRIR AGENDAMENTO - DIRETO PELA BOLINHA (CORRIGIDO)
// ============================================

function abrirAgendamentoInteligente(data, hora, profissionalId = null) {
    console.log(`📝 Agendamento: ${data} às ${hora}${profissionalId ? ` - Prof: ${profissionalId}` : ''}`);

    // ============================================
    // 🚫 VALIDAR SE DATA/HORA É FUTURA
    // ============================================
    const agora = new Date();
    const dataHoraAgendamento = new Date(`${data}T${hora}:00`);

    if (dataHoraAgendamento < agora) {
        showToast('❌ Este horário já passou. Não é possível agendar.', 'error');
        return;
    }

    // Verificar se é hoje e o horário já passou
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAgendamento = new Date(data);
    dataAgendamento.setHours(0, 0, 0, 0);

    if (dataAgendamento.getTime() === hoje.getTime()) {
        const horaAtual = new Date().getHours();
        const minutoAtual = new Date().getMinutes();
        const horaAgendamento = parseInt(hora.split(':')[0]);
        const minutoAgendamento = parseInt(hora.split(':')[1]);

        if (horaAgendamento < horaAtual ||
            (horaAgendamento === horaAtual && minutoAgendamento <= minutoAtual)) {
            showToast(`❌ O horário ${hora} já passou. Selecione um horário futuro.`, 'error');
            return;
        }
    }

    console.log(`📅 Data recebida: ${data}`);
    console.log(`⏰ Hora recebida: ${hora}`);
    console.log(`👤 Profissional recebido: ${profissionalId}`);

    // ============================================
    // 🔥 GUARDAR DADOS NAS VARIÁVEIS GLOBAIS
    // ============================================
    window.dataAgendamentoForcada = data;
    window.horaAgendamentoForcada = hora;
    window.profissionalAgendamentoForcado = profissionalId;

    // ============================================
    // 🔥 FORÇAR RECARREGAMENTO DOS DADOS ANTES DE ABRIR
    // ============================================
    // Recarregar clientes, serviços e profissionais
    carregarDadosParaAgendamento().then(() => {
        // ============================================
        // 🔥 ABRIR O MODAL
        // ============================================
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