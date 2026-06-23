// pages/dashboard.js - Versão Premium com Banner, Ações Rápidas e Onboarding + AGENDA INTELIGENTE
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
    '#2196F3', '#4ade80', '#9c27b0', '#ff9800', '#e91e63',
    '#00bcd4', '#ffc107', '#795548', '#607d8b', '#3f51b5',
    '#009688', '#ff5722', '#8bc34a', '#9e9e9e', '#673ab7'
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

    // ============================================
    // VERIFICAR SE TEM PROFISSIONAIS
    // ============================================
    if (!agendaInteligenteProfissionais || agendaInteligenteProfissionais.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px 10px;">
                <i class="fas fa-users-slash" style="font-size:28px;color:var(--text-muted);opacity:0.5;"></i>
                <p style="margin:8px 0 0;font-size:13px;color:var(--text-muted);">Nenhum profissional cadastrado</p>
                <button onclick="carregarConfiguracoes()" class="btn btn-sm btn-primary" style="margin-top:8px;font-size:11px;">
                    <i class="fas fa-user-plus"></i> Cadastrar
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
            <div style="text-align:center;padding:20px 10px;">
                <i class="fas fa-clock" style="font-size:28px;color:var(--text-muted);opacity:0.5;"></i>
                <p style="margin:8px 0 0;font-size:13px;color:var(--text-muted);">Horários não configurados</p>
                <button onclick="carregarConfiguracoes()" class="btn btn-sm btn-primary" style="margin-top:8px;font-size:11px;">
                    <i class="fas fa-clock"></i> Configurar
                </button>
            </div>
        `;
        return;
    }

    // ============================================
    // LEGENDA DE CORES
    // ============================================
    let html = `
        <div style="margin-bottom:8px;">
            <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;">
                <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;">
                    <span style="font-size:11px;font-weight:600;color:var(--text-secondary);">👤</span>
                    ${agendaInteligenteProfissionais.slice(0, 4).map(p => {
        const cor = agendaInteligenteCores[p.id] || '#666';
        const isDono = p.is_dono === true;
        return `
                            <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:1px 8px;border-radius:12px;font-size:10px;${isDono ? 'border:1px solid #d4af37;' : ''}">
                                <span style="width:10px;height:10px;background:${cor};border-radius:50%;display:inline-block;${isDono ? 'border:2px solid #d4af37;' : ''}"></span>
                                ${p.nome.length > 8 ? p.nome.substring(0, 8) + '…' : p.nome}${isDono ? '👑' : ''}
                            </span>
                        `;
    }).join('')}
                    ${agendaInteligenteProfissionais.length > 4 ? `<span style="font-size:10px;color:var(--text-muted);">+${agendaInteligenteProfissionais.length - 4}</span>` : ''}
                </div>
                <span style="font-size:9px;color:var(--text-muted);">
                    <i class="fas fa-mouse-pointer"></i> Clique na bolinha
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
    // GERAR HORÁRIOS DO DIA (apenas os principais)
    // ============================================
    const horariosBase = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

    // ============================================
    // TABELA DO CALENDÁRIO - ESTILO CLEAN
    // ============================================
    html += `
        <div style="overflow-x:auto;max-height:280px;overflow-y:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:10px;min-width:400px;">
                <thead>
                    <tr>
                        <th style="padding:3px 4px;background:var(--bg-hover);text-align:center;font-weight:600;position:sticky;top:0;z-index:5;font-size:9px;min-width:35px;color:var(--text-muted);">Hora</th>
                        ${dias.map(d => {
        const dataStr = d.toISOString().split('T')[0];
        const isHoje = dataStr === hoje;
        const nomeDia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const diaNum = d.getDate();
        return `
                                <th style="padding:3px 2px;background:${isHoje ? 'var(--primary)' : 'var(--bg-hover)'};color:${isHoje ? '#fff' : 'var(--text-secondary)'};text-align:center;font-weight:600;position:sticky;top:0;z-index:5;font-size:9px;min-width:40px;border-radius:${isHoje ? '4px 4px 0 0' : '0'};">
                                    ${nomeDia}
                                    <br><span style="font-size:11px;font-weight:700;">${diaNum}</span>
                                </th>
                            `;
    }).join('')}
                    </tr>
                </thead>
                <tbody>
    `;

    for (let hora of horariosBase) {
        html += `<tr>`;
        html += `<td style="padding:2px 3px;text-align:center;border-bottom:1px solid var(--border-color);font-size:8px;font-weight:500;color:var(--text-muted);background:var(--bg-card);">${hora}</td>`;

        for (let d of dias) {
            const dataStr = d.toISOString().split('T')[0];
            const diaSemana = d.getDay();
            const horarioDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSemana);

            const estaAberto = horarioDia && horarioDia.aberto === 1;
            const noAlmoco = estaAberto &&
                hora >= (horarioDia?.almoco_inicio || '12:00') &&
                hora < (horarioDia?.almoco_fim || '13:00');

            // ============================================
            // BUSCAR AGENDAMENTOS DO DIA/HORÁRIO
            // ============================================
            const agendamentosHora = agendaInteligenteData.filter(a =>
                a.data === dataStr &&
                a.hora === hora &&
                a.status !== 'cancelado'
            );

            // ============================================
            // PEGAR IDs DOS PROFISSIONAIS OCUPADOS (incluindo Dono = null)
            // ============================================
            const ocupadosIds = agendamentosHora.map(a => a.profissional_id).filter(id => id !== null && id !== undefined);
            const temAgendamentoDono = agendamentosHora.some(a => a.profissional_id === null || a.profissional_id === '');

            let cellContent = '';
            let bgColor = 'transparent';
            let title = '';

            if (!estaAberto) {
                bgColor = 'rgba(107,114,128,0.03)';
                cellContent = `<span style="color:#9ca3af;">—</span>`;
                title = 'Fechado';
            } else if (noAlmoco) {
                bgColor = 'rgba(245,158,11,0.06)';
                cellContent = `<span style="color:#d97706;">🍽️</span>`;
                title = 'Almoço';
            } else {
                // ============================================
                // VERIFICAR DISPONIBILIDADE DE CADA PROFISSIONAL
                // ============================================
                const disponiveis = agendaInteligenteProfissionais.filter(p => {
                    // Se for Dono, verificar se tem agendamento do Dono
                    if (p.is_dono === true) {
                        return !temAgendamentoDono;
                    }
                    // Se for profissional, verificar se está na lista de ocupados
                    return !ocupadosIds.includes(p.id);
                });

                if (disponiveis.length === 0) {
                    bgColor = 'rgba(107,114,128,0.05)';
                    cellContent = `<span style="color:#9ca3af;">⛔</span>`;
                    title = 'Lotado - todos ocupados';
                } else {
                    const displayProfs = disponiveis.slice(0, 3);
                    const mais = disponiveis.length > 3 ? ` +${disponiveis.length - 3}` : '';

                    cellContent = `
                        <div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center;align-items:center;">
                            ${displayProfs.map(p => {
                        const isDono = p.is_dono === true;
                        const cor = agendaInteligenteCores[p.id] || '#666';
                        const tooltipText = isDono ? `👑 ${p.nome} - ${hora}` : `${p.nome} - ${hora}`;
                        return `
                                    <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${cor};border:${isDono ? '2px solid #d4af37' : '2px solid rgba(255,255,255,0.3)'};cursor:pointer;transition:all 0.2s;box-shadow:0 0 3px rgba(16,185,129,0.15);" 
                                          title="${tooltipText}"
                                          onmouseover="this.style.transform='scale(1.2)';this.style.boxShadow='0 0 8px ${cor}'"
                                          onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 0 3px rgba(16,185,129,0.15)'"
                                          onclick="event.stopPropagation(); abrirAgendamentoInteligente('${dataStr}','${hora}','${p.id}')"></span>
                                `;
                    }).join('')}
                            ${mais}
                        </div>
                    `;
                    bgColor = 'rgba(16,185,129,0.03)';
                    title = `${hora} - ${disponiveis.length} disponível(eis)`;
                }
            }

            html += `
                <td style="padding:2px 1px;border-bottom:1px solid var(--border-color);background:${bgColor};text-align:center;font-size:9px;min-height:22px;vertical-align:middle;" 
                    title="${title}">
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
    // NAVEGAÇÃO - CLEAN
    // ============================================
    html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 2px 0;border-top:1px solid var(--border-color);margin-top:6px;font-size:10px;color:var(--text-muted);flex-wrap:wrap;gap:4px;">
            <div style="display:flex;gap:3px;align-items:center;">
                <button onclick="mudarAgendaSemana(-1)" style="background:none;border:1px solid var(--border-color);border-radius:4px;cursor:pointer;padding:2px 8px;color:var(--text-secondary);font-size:10px;">
                    ◀
                </button>
                <span style="font-weight:500;color:var(--text-primary);font-size:11px;">
                    ${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - 
                    ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <button onclick="mudarAgendaSemana(1)" style="background:none;border:1px solid var(--border-color);border-radius:4px;cursor:pointer;padding:2px 8px;color:var(--text-secondary);font-size:10px;">
                    ▶
                </button>
                <button onclick="irAgendaHoje()" style="background:var(--gradient);border:none;border-radius:4px;cursor:pointer;padding:2px 10px;color:white;font-size:9px;font-weight:600;">
                    Hoje
                </button>
            </div>
            <div style="display:flex;gap:6px;font-size:8px;">
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#10b981;vertical-align:middle;margin-right:2px;"></span> Disp.</span>
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#ef4444;vertical-align:middle;margin-right:2px;"></span> Ocup.</span>
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#f59e0b;vertical-align:middle;margin-right:2px;"></span> Alm.</span>
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
// ABRIR AGENDAMENTO - DIRETO PELA BOLINHA (VERSÃO COMPLETA E ESTÁVEL)
// ============================================

function abrirAgendamentoInteligente(data, hora, profissionalId = null) {
    console.log(`📝 Agendamento: ${data} às ${hora}${profissionalId ? ` - Prof: ${profissionalId}` : ''}`);

    const isDono = profissionalId && typeof profissionalId === 'string' && profissionalId.startsWith('dono_');

    // ============================================
    // FUNÇÃO PARA CARREGAR DADOS E ABRIR MODAL
    // ============================================
    async function carregarDadosEAbrirModal() {
        showLoading();

        try {
            const token = localStorage.getItem('token');

            console.log('🔄 Carregando dados para o modal...');

            // ============================================
            // 1. CARREGAR CLIENTES
            // ============================================
            const clientesRes = await fetch('/api/clientes', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const clientesData = await clientesRes.json();
            if (clientesData.success) {
                window.clientesList = clientesData.data || [];
                console.log(`✅ ${window.clientesList.length} clientes carregados`);
            } else {
                window.clientesList = [];
                console.warn('⚠️ Nenhum cliente encontrado');
            }

            // ============================================
            // 2. CARREGAR SERVIÇOS
            // ============================================
            const servicosRes = await fetch('/api/servicos', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const servicosData = await servicosRes.json();
            if (servicosData.success) {
                window.servicosList = servicosData.data || [];
                console.log(`✅ ${window.servicosList.length} serviços carregados`);
            } else {
                window.servicosList = [];
                console.warn('⚠️ Nenhum serviço encontrado');
            }

            // ============================================
            // 3. CARREGAR PROFISSIONAIS
            // ============================================
            const profissionaisRes = await fetch('/api/profissionais', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const profissionaisData = await profissionaisRes.json();
            if (profissionaisData.success) {
                window.profissionaisList = profissionaisData.data || [];
                console.log(`✅ ${window.profissionaisList.length} profissionais carregados`);
            } else {
                window.profissionaisList = [];
                console.warn('⚠️ Nenhum profissional encontrado');
            }

            // ============================================
            // 4. ABRIR O MODAL
            // ============================================
            if (typeof abrirModalAgendamentoDono !== 'function') {
                showToast('❌ Função de agendamento não disponível', 'error');
                hideLoading();
                return;
            }

            console.log('🔄 Abrindo modal de agendamento...');
            abrirModalAgendamentoDono();

            // ============================================
            // 5. FUNÇÃO PARA PREENCHER O MODAL
            // ============================================
            function preencherModalCompleto() {
                console.log('📝 Preenchendo modal completo...');

                // ============================================
                // PREENCHER DATA
                // ============================================
                const dataInput = document.getElementById('dataAgendamentoDono');
                if (dataInput) {
                    dataInput.value = data;
                    console.log(`✅ Data preenchida: ${data}`);
                    if (typeof dataInput.dispatchEvent === 'function') {
                        dataInput.dispatchEvent(new Event('change'));
                    }
                }

                // ============================================
                // PREENCHER PROFISSIONAL
                // ============================================
                const profSelect = document.getElementById('profissionalIdDono');
                if (profSelect) {
                    // Recarregar opções do select com os dados carregados
                    profSelect.innerHTML = '<option value="">Não atribuir</option>';
                    if (window.profissionaisList && window.profissionaisList.length > 0) {
                        window.profissionaisList.forEach(p => {
                            if (p.ativo === 1) {
                                profSelect.innerHTML += `<option value="${p.id}">${p.nome} (${p.comissao_percent}%)</option>`;
                            }
                        });
                        console.log(`✅ Profissionais recarregados no select: ${window.profissionaisList.length}`);
                    }

                    // Selecionar o profissional correto
                    if (isDono) {
                        profSelect.value = '';
                        showToast('👑 Agendando como Dono (sem comissão)', 'info');
                        console.log('✅ Dono selecionado');
                    } else if (profissionalId) {
                        let encontrou = false;
                        for (let opt of profSelect.options) {
                            if (opt.value == profissionalId) {
                                profSelect.value = profissionalId;
                                encontrou = true;
                                console.log(`✅ Profissional ${profissionalId} selecionado`);
                                break;
                            }
                        }
                        if (!encontrou) {
                            console.warn(`⚠️ Profissional ${profissionalId} não encontrado no select`);
                        }
                    }
                }

                // ============================================
                // PREENCHER CLIENTES (recarregar select)
                // ============================================
                const clienteSelect = document.getElementById('clienteIdDono');
                if (clienteSelect) {
                    clienteSelect.innerHTML = '<option value="">Selecione um cliente</option>';
                    if (window.clientesList && window.clientesList.length > 0) {
                        window.clientesList.forEach(c => {
                            clienteSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
                        });
                        console.log(`✅ Clientes recarregados no select: ${window.clientesList.length}`);
                    } else {
                        clienteSelect.innerHTML = '<option value="">Nenhum cliente cadastrado. Clique em "+ Novo Cliente"</option>';
                        console.warn('⚠️ Nenhum cliente para carregar no select');
                    }
                }

                // ============================================
                // PREENCHER SERVIÇOS (recarregar select)
                // ============================================
                const servicoSelect = document.getElementById('servicoIdDono');
                if (servicoSelect) {
                    servicoSelect.innerHTML = '<option value="">Selecione um serviço</option>';
                    if (window.servicosList && window.servicosList.length > 0) {
                        window.servicosList.forEach(s => {
                            servicoSelect.innerHTML += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}">${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
                        });
                        console.log(`✅ Serviços recarregados no select: ${window.servicosList.length}`);
                    } else {
                        servicoSelect.innerHTML = '<option value="">Nenhum serviço cadastrado</option>';
                        console.warn('⚠️ Nenhum serviço para carregar no select');
                    }
                }

                // ============================================
                // FUNÇÃO PARA FORÇAR O PREENCHIMENTO DO HORÁRIO
                // ============================================
                function forcarPreenchimentoHorario() {
                    const horaSelect = document.getElementById('horaAgendamentoDono');
                    if (!horaSelect) {
                        console.warn('⚠️ Select de horário não encontrado');
                        return false;
                    }

                    // Tentar selecionar o horário
                    for (let opt of horaSelect.options) {
                        if (opt.value === hora) {
                            horaSelect.value = hora;
                            console.log(`✅ Horário ${hora} selecionado`);
                            return true;
                        }
                    }

                    // Se não encontrou, tentar adicionar manualmente
                    console.log(`🔄 Horário ${hora} não encontrado, tentando adicionar...`);
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
                        console.log(`✅ Horário ${hora} adicionado manualmente e selecionado`);
                        return true;
                    }

                    return false;
                }

                // ============================================
                // TENTAR SELECIONAR HORÁRIO (múltiplas tentativas)
                // ============================================
                forcarPreenchimentoHorario();
                setTimeout(forcarPreenchimentoHorario, 200);
                setTimeout(forcarPreenchimentoHorario, 500);
                setTimeout(forcarPreenchimentoHorario, 1000);
                setTimeout(forcarPreenchimentoHorario, 2000);

                showToast(`📅 ${formatarDataBr(data)} às ${hora}`, 'info');
                hideLoading();
            }

            // ============================================
            // 6. AGUARDAR MODAL E PREENCHER
            // ============================================
            function aguardarModal(tentativa = 0) {
                const maxTentativas = 20;
                const dataInput = document.getElementById('dataAgendamentoDono');

                if (dataInput || tentativa >= maxTentativas) {
                    preencherModalCompleto();
                } else {
                    console.log(`⏳ Aguardando modal... (${tentativa + 1}/${maxTentativas})`);
                    setTimeout(() => aguardarModal(tentativa + 1), 200);
                }
            }

            setTimeout(aguardarModal, 300);

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            showToast('❌ Erro ao carregar dados do agendamento', 'error');
            hideLoading();
        }
    }

    // Executar
    carregarDadosEAbrirModal();
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
// DASHBOARD DO DONO - COM AGENDA ABAIXO DAS AÇÕES RÁPIDAS
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
    const faturamentoBruto = totais.faturamento_bruto || 0;
    const totalComissoes = totais.total_comissoes || 0;
    const faturamentoLiquido = totais.faturamento_liquido || 0;
    const totalServicosConcluidos = totais.total_servicos || 0;

    const hoje = new Date().toISOString().split('T')[0];
    const agendamentosHoje = agendamentos.filter(a => a.data === hoje);
    const pendentes = agendamentos.filter(a => a.status === 'pendente');
    const concluidos = agendamentos.filter(a => a.status === 'concluido');

    const dataAtual = new Date();
    const primeiroDiaMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1).toISOString().split('T')[0];
    const faturamentoMes = agendamentos.filter(a =>
        a.status === 'concluido' && a.data >= primeiroDiaMes
    ).reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

    const ticketMedio = concluidos.length > 0 ?
        (concluidos.reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0) / concluidos.length).toFixed(2) : 0;

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
    ).reduce((sum, a) => sum + (parseFloat(a.valor) || 0), 0);

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
    // HTML DO DASHBOARD - AGENDA ABAIXO DAS AÇÕES RÁPIDAS
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
            '💡 Dica: Clique em "Novo Agendamento" para começar'}
                        </div>
                    </div>
                    <div class="welcome-date">
                        <span class="day">${dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
                        <span class="date">${dataAtual.toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </div>
            
            <!-- AÇÕES RÁPIDAS -->
            <div class="quick-actions">
                <h3>⚡ Ações Rápidas</h3>
                <div class="quick-actions-grid">
                    <button class="quick-action" onclick="abrirModalAgendamento()">
                        <i class="fas fa-plus-circle"></i>
                        <span>Novo Agendamento</span>
                    </button>
                    <button class="quick-action" onclick="abrirModalCliente()">
                        <i class="fas fa-user-plus"></i>
                        <span>Novo Cliente</span>
                    </button>
                    <button class="quick-action" onclick="carregarAgendamentos()">
                        <i class="fas fa-calendar-day"></i>
                        <span>Ver Agenda</span>
                    </button>
                    <button class="quick-action" onclick="carregarFinanceiro()">
                        <i class="fas fa-chart-simple"></i>
                        <span>Ver Financeiro</span>
                    </button>
                </div>
            </div>

            <!-- ============================================ -->
            <!-- AGENDA INTELIGENTE - LOGO APÓS AÇÕES RÁPIDAS -->
            <!-- ============================================ -->
            <div class="card" style="padding: 10px 14px;">
                <div class="card-header" style="margin-bottom: 4px;">
                    <h3 style="font-size: 14px; margin:0;">
                        <i class="fas fa-calendar-alt" style="color:var(--primary);"></i> 
                        Agenda Inteligente
                        <span style="font-size:9px;font-weight:400;color:var(--text-muted);margin-left:6px;">
                            <i class="fas fa-info-circle"></i> Clique nas bolinhas
                        </span>
                    </h3>
                    <button class="btn btn-sm btn-primary" onclick="carregarAgendamentos()" style="padding:1px 10px;font-size:10px;">
                        <i class="fas fa-expand"></i> Ver Todos
                    </button>
                </div>
                <div id="agendaInteligenteContainer">
                    <div style="text-align:center;padding:10px;">
                        <div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:24px;height:24px;"></div>
                        <p style="margin-top:4px;font-size:11px;color:var(--text-muted);">Carregando agenda...</p>
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
                                <span>Crie seu primeiro <strong>agendamento</strong></span>
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
                            <span class="text-success">+${novosClientesMes} novos</span> este mês
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
                            ${((totalServicosConcluidos / (agendamentos.length || 1)) * 100 || 0).toFixed(1)}% do total
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
                        <button class="btn btn-primary btn-sm" onclick="abrirModalAgendamento()">
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

function formatarMoeda(valor) {
    if (!valor) return '0,00';
    return parseFloat(valor).toFixed(2).replace('.', ',');
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
// AÇÕES RÁPIDAS
// ============================================

function abrirModalAgendamento() {
    console.log('🔄 Abrindo modal de agendamento via ação rápida...');

    if (typeof clientesList === 'undefined' || clientesList.length === 0) {
        carregarDadosAgendamento().then(() => {
            if (typeof abrirModalAgendamentoDono === 'function') {
                abrirModalAgendamentoDono();
            } else {
                showToast('Função de agendamento não disponível', 'warning');
            }
        });
    } else {
        if (typeof abrirModalAgendamentoDono === 'function') {
            abrirModalAgendamentoDono();
        } else {
            showToast('Função de agendamento não disponível', 'warning');
        }
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

// Garantir que as listas estejam disponíveis globalmente
window.clientesList = window.clientesList || [];
window.servicosList = window.servicosList || [];
window.profissionaisList = window.profissionaisList || [];

console.log('✅ dashboard.js carregado com AGENDA INTELIGENTE!');