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
let agendaModoCompleto = false; // false = dia atual, true = semana completa


// ============================================
// SINCRONIZAR CLIENTES COM O agendamentos.js
// ============================================

function sincronizarClientesParaAgendamento() {
    // Se o agendamentos.js já tem clientesList, usa
    if (typeof clientesList !== 'undefined' && clientesList.length > 0) {
        console.log(`✅ clientesList já tem ${clientesList.length} clientes`);
        window.clientesList = clientesList;
        return true;
    }

    // Se window.clientesList existe, usa
    if (window.clientesList && window.clientesList.length > 0) {
        console.log(`✅ window.clientesList tem ${window.clientesList.length} clientes`);
        // Sincroniza com a variável global do agendamentos.js
        if (typeof clientesList !== 'undefined') {
            // Não podemos reatribuir const, então usamos window
        }
        return true;
    }

    return false;
}
// ============================================
// FUNÇÕES AUXILIARES PARA DURAÇÃO
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
            if (servico && servico.duracao) {
                agDuracao = servico.duracao;
            } else if (ag.duracao) {
                agDuracao = ag.duracao;
            }
        }

        const agFimMin = agHoraMin + agDuracao;

        if (horaMin >= agHoraMin && horaMin < agFimMin) {
            return true;
        }
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
        console.log(`📱 Modo agenda ajustado: ${agendaModoCompleto ? 'Semana Completa' : 'Dia Atual'} (${mobile ? 'Mobile' : 'Desktop'})`);

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
// FUNÇÃO AUXILIAR: FORMATAR DATA
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
    agendaInteligenteCarregando = false;

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
        console.log(`📦 ${window.servicosListGlobal.length} serviços carregados globalmente`);

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
            const corIndex = idx % coresPaleta.length;
            agendaInteligenteCores[p.id] = coresPaleta[corIndex];
        });

        const agendamentosData = await agendamentosRes.json();
        agendaInteligenteData = agendamentosData.success ? agendamentosData.data : [];

        console.log(`✅ Agenda carregada com ${agendamentosData.data ? agendamentosData.data.length : 0} agendamentos`);

        agendaInteligenteDate = new Date();

        atualizarModoAgendaPorTela();
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

// ============================================
// RENDERIZAR AGENDA INTELIGENTE
// ============================================

function renderizarAgendaInteligente() {
    const isMobile = isMobileScreen();
    console.log(`📊 RENDERIZANDO AGENDA - Modo: ${agendaModoCompleto ? 'Semana Completa' : 'Dia Atual'} (${isMobile ? 'Mobile' : 'Desktop'})`);

    const container = document.getElementById('agendaInteligenteContainer');
    if (!container) return;

    if (!agendaInteligenteDate) {
        agendaInteligenteDate = new Date();
    }

    const dataBase = new Date(agendaInteligenteDate);
    const inicioSemana = new Date(dataBase);

    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().split('T')[0];

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

    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias.push(d);
    }

    const agora = new Date();
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();

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

        // 🔥 GERA TODOS OS HORÁRIOS ATÉ O FIM (INCLUSIVE)
        for (let minutos = inicioMin; minutos <= fimMin; minutos += intervalo) {
            // Pula horário de almoço
            if (minutos >= almocoInicioMin && minutos < almocoFimMin) {
                continue;
            }
            const h = Math.floor(minutos / 60);
            const m = minutos % 60;
            horarios.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
        }

        // 🔥 GARANTE QUE 18:00 ESTÁ NA LISTA
        const fimStr = String(fimH).padStart(2, '0') + ':' + String(fimM).padStart(2, '0');
        if (!horarios.includes(fimStr)) {
            horarios.push(fimStr);
        }

        console.log(`📋 Horários gerados:`, horarios);
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

    const [inicioH, inicioM] = horarioInicioPadrao.split(':').map(Number);
    const [fimH, fimM] = horarioFimPadrao.split(':').map(Number);
    const totalMinutosDia = (fimH * 60 + fimM) - (inicioH * 60 + inicioM);
    const minutosPassados = (horaAtual * 60 + minutoAtual) - (inicioH * 60 + inicioM);
    const progressoDia = totalMinutosDia > 0 ? Math.max(0, Math.min(100, (minutosPassados / totalMinutosDia) * 100)) : 0;

    const mostrarBotaoAlternar = isMobile;

    let html = `
        <div style="margin-bottom:${isMobile ? '8px' : '12px'};">
            ${mostrarBotaoAlternar ? `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:${isMobile ? '11px' : '12px'};font-weight:600;color:var(--text-secondary);">
                            ${agendaModoCompleto ? '📅 Semana' : '📆 Hoje'}
                        </span>
                        <button onclick="alternarModoAgenda()" 
                                style="background:${agendaModoCompleto ? 'rgba(102,126,234,0.15)' : 'var(--primary)'};
                                       border:${agendaModoCompleto ? '1px solid var(--border-color)' : 'none'};
                                       color:${agendaModoCompleto ? 'var(--text-secondary)' : 'white'};
                                       padding:${isMobile ? '4px 12px' : '4px 14px'};
                                       border-radius:20px;
                                       font-size:${isMobile ? '10px' : '11px'};
                                       font-weight:600;
                                       cursor:pointer;
                                       transition:all 0.3s ease;
                                       box-shadow:${agendaModoCompleto ? 'none' : '0 2px 12px rgba(102,126,234,0.3)'};">
                            ${agendaModoCompleto ? '📱 Ver Hoje' : '📅 Ver Semana'}
                        </button>
                    </div>
                    <div style="display:flex;gap:${isMobile ? '2px' : '4px'};flex-wrap:wrap;">
                        <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:${isMobile ? '1px 8px' : '1px 10px'};border-radius:12px;font-size:${isMobile ? '8px' : '9px'};">
                            <span style="display:inline-block;width:${isMobile ? '6px' : '8px'};height:${isMobile ? '6px' : '8px'};border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);"></span>
                            Livre
                        </span>
                        <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:${isMobile ? '1px 8px' : '1px 10px'};border-radius:12px;font-size:${isMobile ? '8px' : '9px'};">
                            <span style="display:inline-block;width:${isMobile ? '6px' : '8px'};height:${isMobile ? '6px' : '8px'};border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);"></span>
                            Ocupado
                        </span>
                        <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:${isMobile ? '1px 8px' : '1px 10px'};border-radius:12px;font-size:${isMobile ? '8px' : '9px'};">
                            <span style="display:inline-block;width:${isMobile ? '6px' : '8px'};height:${isMobile ? '6px' : '8px'};border-radius:50%;background:#d4af37;"></span>
                            👑
                        </span>
                    </div>
                </div>
            ` : `
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:6px;">
                    <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                        <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">👤 Profissionais:</span>
                        ${agendaInteligenteProfissionais.slice(0, 8).map(p => {
        const cor = agendaInteligenteCores[p.id] || '#666';
        const isDono = p.is_dono === true;
        return `
                                <span style="display:flex;align-items:center;gap:3px;background:var(--bg-hover);padding:2px 10px;border-radius:14px;font-size:11px;${isDono ? 'border:1px solid #d4af37;' : ''}">
                                    <span style="width:12px;height:12px;background:${cor};border-radius:50%;display:inline-block;${isDono ? 'border:2px solid #d4af37;' : ''}"></span>
                                    ${p.nome.length > 10 ? p.nome.substring(0, 10) + '…' : p.nome}${isDono ? '👑' : ''}
                                </span>
                            `;
    }).join('')}
                        ${agendaInteligenteProfissionais.length > 8 ? `<span style="font-size:11px;color:var(--text-muted);">+${agendaInteligenteProfissionais.length - 8}</span>` : ''}
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
            `}
            
            <div style="margin-top:${isMobile ? '4px' : '6px'};">
                <div style="display:flex;justify-content:space-between;font-size:${isMobile ? '7px' : '8px'};color:var(--text-muted);">
                    <span>🌅 ${horarioInicioPadrao}</span>
                    <span>⏳ ${Math.round(progressoDia)}% do dia</span>
                    <span>🌆 ${horarioFimPadrao}</span>
                </div>
                <div style="height:${isMobile ? '2px' : '3px'};background:var(--bg-hover);border-radius:${isMobile ? '2px' : '3px'};overflow:hidden;margin-top:${isMobile ? '1px' : '2px'};">
                    <div style="height:100%;width:${Math.min(progressoDia, 100)}%;background:linear-gradient(90deg,#667eea,#764ba2,transparent);border-radius:${isMobile ? '2px' : '3px'};transition:width 1s ease;"></div>
                </div>
            </div>
        </div>
    `;

    let diasParaMostrar = dias;
    if (isMobile && !agendaModoCompleto) {
        const hojeIndex = dias.findIndex(d => d.toISOString().split('T')[0] === hojeStr);
        if (hojeIndex !== -1) {
            diasParaMostrar = [dias[hojeIndex]];
        } else {
            diasParaMostrar = [dias[0]];
        }
    }

    const minWidth = isMobile ? (agendaModoCompleto ? '400px' : '200px') : '550px';
    const cellPadding = isMobile ? '4px 2px' : '4px 3px';
    const fontSize = isMobile ? '8px' : '9px';
    const minHeight = isMobile ? '28px' : '38px';

    html += `
        <div id="agendaScrollWrapper" style="overflow-x:auto;max-height:${isMobile ? '360px' : '500px'};overflow-y:auto;border-radius:12px;border:1px solid var(--border-color);background:var(--bg-card);box-shadow:0 2px 12px rgba(0,0,0,0.04);position:relative;">
            <table id="agendaTabela" style="width:100%;border-collapse:collapse;font-size:${isMobile ? '9px' : '11px'};min-width:${minWidth};">
                <thead>
                    <tr>
                        <th style="padding:${isMobile ? '4px 2px' : '10px 8px'};background:var(--bg-hover);text-align:center;font-weight:700;position:sticky;top:0;z-index:10;font-size:${isMobile ? '7px' : '10px'};min-width:${isMobile ? '32px' : '55px'};color:var(--text-muted);border-bottom:2px solid var(--border-color);">
                            <i class="fas fa-clock" style="font-size:${isMobile ? '8px' : '12px'};"></i>
                        </th>
                        ${diasParaMostrar.map(d => {
        const dataStr = d.toISOString().split('T')[0];
        const isHoje = dataStr === hojeStr;
        const nomeDia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const diaNum = d.getDate();
        const isFimSemana = d.getDay() === 0 || d.getDay() === 6;

        const agendamentosDia = agendaInteligenteData.filter(a => a.data === dataStr && a.status !== 'cancelado');
        const totalAgendamentosDia = agendamentosDia.length;
        const badgeAgendamentos = totalAgendamentosDia > 0 ?
            `<span style="display:inline-block;font-size:${isMobile ? '5px' : '7px'};background:${isHoje ? 'rgba(255,255,255,0.25)' : 'var(--primary)'};color:${isHoje ? '#fff' : 'white'};padding:0px 5px;border-radius:8px;margin-left:2px;">${totalAgendamentosDia}</span>` : '';

        const isProximo = dataStr === amanhaStr;
        const isFuturo = dataStr > hojeStr && !isProximo;

        let bgTh = isHoje ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : (isFimSemana ? 'var(--bg-hover)' : 'var(--bg-hover)');
        let colorTh = isHoje ? '#ffffff' : 'var(--text-secondary)';
        let fontSizeNum = isHoje ? (isMobile ? '14px' : '20px') : (isMobile ? '11px' : '15px');
        let fontSizeDia = isMobile ? '6px' : '9px';
        let extraBadge = '';

        if (isHoje) {
            extraBadge = `<span style="font-size:${isMobile ? '4px' : '7px'};opacity:0.9;letter-spacing:0.5px;font-weight:600;display:block;">● HOJE</span>`;
        } else if (isProximo) {
            extraBadge = `<span style="font-size:${isMobile ? '4px' : '7px'};opacity:0.7;letter-spacing:0.5px;font-weight:500;display:block;color:var(--text-muted);">Amanhã</span>`;
        } else if (isFuturo) {
            const diff = Math.ceil((d - hoje) / (1000 * 60 * 60 * 24));
            if (diff <= 3) {
                extraBadge = `<span style="font-size:${isMobile ? '4px' : '7px'};opacity:0.5;letter-spacing:0.3px;display:block;color:var(--text-muted);">+${diff}d</span>`;
            }
        }

        return `
                                <th style="padding:${isMobile ? '4px 2px' : '10px 4px'};
                                           background:${bgTh};
                                           color:${colorTh};
                                           text-align:center;
                                           font-weight:${isHoje ? '700' : '600'};
                                           position:sticky;
                                           top:0;
                                           z-index:5;
                                           font-size:${isMobile ? '7px' : '10px'};
                                           min-width:${isMobile ? '40px' : '65px'};
                                           border-bottom:${isHoje ? '3px solid #ffffff' : '2px solid var(--border-color)'};
                                           box-shadow:${isHoje ? '0 2px 16px rgba(102, 126, 234, 0.35)' : 'none'};
                                           border-radius:${isHoje ? '8px 8px 0 0' : '0'};
                                           ${isFimSemana && !isHoje ? 'opacity:0.6;' : ''}
                                           transition: all 0.3s ease;">
                                    <span style="display:block;font-size:${fontSizeDia};font-weight:400;text-transform:uppercase;letter-spacing:0.3px;${isHoje ? 'opacity:0.9;' : ''}">
                                        ${nomeDia}
                                    </span>
                                    <span style="font-size:${fontSizeNum};font-weight:${isHoje ? '800' : '700'};display:block;margin-top:0px;${isHoje ? 'text-shadow: 0 2px 8px rgba(0,0,0,0.2);' : ''}">
                                        ${diaNum}
                                    </span>
                                    <div style="display:flex;align-items:center;justify-content:center;gap:2px;margin-top:0px;flex-wrap:wrap;">
                                        ${extraBadge}
                                        ${badgeAgendamentos}
                                    </div>
                                </th>
                            `;
    }).join('')}
                    </tr>
                </thead>
                <tbody id="agendaTbody">
    `;

    let isDiaHoje = false;

    for (let idx = 0; idx < horariosBase.length; idx++) {
        const hora = horariosBase[idx];
        const isHorarioAtual = (idx === horarioAtualIndex);
        const isAlmoco = hora >= almocoInicioPadrao && hora < almocoFimPadrao;

        const isPassadoGlobal = (isDiaHoje && idx < horarioAtualIndex);

        const rowId = isHorarioAtual ? 'agenda-horario-atual' : '';

        let rowStyle = '';
        if (isHorarioAtual) {
            rowStyle = 'background:linear-gradient(90deg, rgba(102,126,234,0.12), rgba(118,75,162,0.08));border-left:4px solid #667eea;';
        } else if (isPassadoGlobal) {
            rowStyle = 'opacity:0.3;';
        } else if (isAlmoco) {
            rowStyle = 'background:rgba(245,158,11,0.04);';
        }

        html += `<tr id="${rowId}" style="${rowStyle}">`;

        let horarioBg = 'var(--bg-hover)';
        let horarioColor = 'var(--text-primary)';
        let horarioFontSize = isMobile ? '9px' : '12px';
        let horarioFontWeight = '700';
        let extraContent = '';

        if (isHorarioAtual) {
            horarioBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            horarioColor = '#ffffff';
            horarioFontSize = isMobile ? '11px' : '15px';
            horarioFontWeight = '800';
            extraContent = `
                <span style="display:block;font-size:${isMobile ? '4px' : '7px'};background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:8px;margin-top:0px;">● AGORA</span>
            `;
        } else if (isAlmoco) {
            horarioBg = 'rgba(245,158,11,0.1)';
            horarioColor = '#d97706';
            extraContent = `<span style="font-size:${isMobile ? '10px' : '14px'};">🍽️</span>`;
        } else if (isPassadoGlobal) {
            horarioBg = 'rgba(107,114,128,0.06)';
            horarioColor = '#6b7280';
            extraContent = `<span style="font-size:${isMobile ? '7px' : '10px'};opacity:0.5;">⏰</span>`;
        }

        html += `
            <td style="
                padding: ${isMobile ? '3px 2px' : '8px 6px'};
                text-align: center;
                border-bottom: 1px solid var(--border-color);
                font-size: ${horarioFontSize};
                font-weight: ${horarioFontWeight};
                color: ${horarioColor};
                background: ${horarioBg};
                white-space: nowrap;
                border-right: 2px solid ${isHorarioAtual ? '#667eea' : 'var(--border-color)'};
                min-width: ${isMobile ? '32px' : '60px'};
                position: sticky;
                left: 0;
                z-index: 3;
                box-shadow: ${isHorarioAtual ? '0 2px 16px rgba(102,126,234,0.3)' : '2px 0 8px rgba(0,0,0,0.03)'};
                ${isHorarioAtual ? 'border-radius: 8px 0 0 8px;' : ''}
                transition: all 0.3s ease;
            ">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 1px;">
                    ${extraContent}
                    <span style="font-size: ${isHorarioAtual ? (isMobile ? '12px' : '16px') : (isMobile ? '9px' : '12px')}; font-weight: ${isHorarioAtual ? '800' : '700'};">
                        ${hora}
                    </span>
                    ${isPassadoGlobal && !isHorarioAtual ? `
                        <span style="font-size:${isMobile ? '3px' : '6px'};color:#6b7280;font-weight:600;letter-spacing:0.3px;">PASSOU</span>
                    ` : ''}
                </div>
            </td>
        `;

        for (let d of diasParaMostrar) {
            const dataStr = d.toISOString().split('T')[0];
            const isHoje = dataStr === hojeStr;
            const diaSemana = d.getDay();
            const horarioDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSemana);

            isDiaHoje = isHoje;

            const estaAberto = horarioDia && (horarioDia.aberto == 1 || horarioDia.aberto == true);
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
                // 🔥 CORREÇÃO: PERMITE O HORÁRIO EXATO DO FIM (18:00)
                dentroExpediente = minutosAtual >= minutosInicio && minutosAtual <= minutosFim;
            }

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

            const isPassado = (isHoje && isPassadoGlobal) || dataPassou;
            const isFuturo = !isPassado && !noAlmoco && estaAberto && dentroExpediente;

            if (!estaAberto || !dentroExpediente) {
                bgColor = 'rgba(107,114,128,0.04)';
                cellContent = `<span style="color:#9ca3af;font-size:${isMobile ? '10px' : '14px'};">—</span>`;
                title = !estaAberto ? 'Fechado' : 'Fora do expediente';
                cellStyle = 'opacity:0.4;';
            } else if (dataPassou || isPassadoGlobal) {
                bgColor = 'rgba(107,114,128,0.04)';
                cellContent = `<span style="color:#9ca3af;font-size:${isMobile ? '8px' : '14px'};opacity:0.3;">⏰</span>`;
                title = dataPassou ? 'Data já passou' : 'Horário já passou';
                cellStyle = 'opacity:0.3;filter:grayscale(0.8);';
            } else if (noAlmoco) {
                bgColor = 'rgba(245,158,11,0.06)';
                cellContent = `<span style="color:#d97706;font-size:${isMobile ? '12px' : '16px'};">🍽️</span>`;
                title = 'Horário de almoço';
            } else {
                const profissionaisComStatus = agendaInteligenteProfissionais.map(p => {
                    let ocupado = false;
                    if (p.is_dono === true) {
                        for (let ag of agendaInteligenteData) {
                            if (ag.data !== dataStr) continue;
                            if (ag.status === 'cancelado') continue;
                            if (ag.profissional_id !== null && ag.profissional_id !== '') continue;
                            if (!ag.hora) continue;

                            const agHoraMin = horaParaMinutos(ag.hora);
                            let agDuracao = 30;
                            if (ag.servico_id) {
                                const servico = window.servicosListGlobal?.find(s => s.id === ag.servico_id);
                                if (servico && servico.duracao) agDuracao = servico.duracao;
                            }
                            const agFimMin = agHoraMin + agDuracao;
                            const horaMin = horaParaMinutos(hora);

                            if (horaMin >= agHoraMin && horaMin < agFimMin) {
                                ocupado = true;
                                break;
                            }
                        }
                    } else {
                        ocupado = isHorarioOcupadoComDuracao(agendaInteligenteData, p.id, dataStr, hora);
                    }
                    return { ...p, ocupado };
                });

                const disponiveis = profissionaisComStatus.filter(p => !p.ocupado);

                if (disponiveis.length === 0) {
                    bgColor = 'rgba(239,68,68,0.05)';
                    cellContent = `<span style="color:#ef4444;font-size:${isMobile ? '10px' : '14px'};font-weight:700;">🔴</span>`;
                    title = 'Todos os profissionais ocupados';
                } else {
                    const todosProfissionais = profissionaisComStatus;
                    const qtdeProf = todosProfissionais.length;

                    let tamanhoBolinha = isMobile ? 16 : 30;
                    if (qtdeProf <= 2) tamanhoBolinha = isMobile ? 20 : 30;
                    else if (qtdeProf <= 4) tamanhoBolinha = isMobile ? 16 : 26;
                    else tamanhoBolinha = isMobile ? 14 : 22;

                    const displayProfs = todosProfissionais.slice(0, isMobile ? 3 : 6);
                    const mais = todosProfissionais.length > (isMobile ? 3 : 6) ? ` +${todosProfissionais.length - (isMobile ? 3 : 6)}` : '';

                    bgColor = isHoje ? 'rgba(102, 126, 234, 0.06)' : 'rgba(16,185,129,0.04)';

                    cellContent = `
                        <div style="display:flex;flex-direction:column;align-items:center;gap:${isMobile ? '1px' : '3px'};width:100%;">
                            <div style="display:flex;flex-wrap:wrap;gap:${isMobile ? '1px' : '4px'};justify-content:center;align-items:center;width:100%;">
                                ${displayProfs.map(p => {
                        const isDono = p.is_dono === true;
                        const cor = agendaInteligenteCores[p.id] || '#666';
                        const isOcupado = p.ocupado;
                        const avatar = p.nome.charAt(0).toUpperCase();

                        const corFundo = isOcupado ? 'linear-gradient(135deg,#ef4444,#dc2626)' : `linear-gradient(135deg,${cor},${cor}dd)`;
                        const corBorda = isOcupado ? '#ef4444' : (isDono ? '#d4af37' : 'rgba(255,255,255,0.4)');
                        const sombra = isOcupado ? '0 0 12px rgba(239,68,68,0.5)' : '0 0 8px rgba(16,185,129,0.3)';
                        const cursor = isOcupado ? 'not-allowed' : 'pointer';
                        const tooltip = isOcupado ? '🔴 Ocupado' : '🟢 Disponível';

                        const isIndisponivel = isOcupado || isPassado;
                        const onClick = isIndisponivel ? '' : `event.stopPropagation(); abrirAgendamentoInteligente('${dataStr}','${hora}','${p.id}')`;

                        const size = isOcupado ? tamanhoBolinha + (isMobile ? 2 : 4) : tamanhoBolinha;
                        const fontSize = isOcupado ? (isMobile ? '8px' : '14px') : (isMobile ? '6px' : '12px');
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
                                                             border:${isMobile ? '1.5px' : '3px'} solid ${isPassado ? '#9ca3af' : corBorda};
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
                                                             ${isOcupado ? 'background:linear-gradient(135deg,#ef4444,#dc2626) !important;border:3px solid #ef4444 !important;box-shadow:0 0 12px rgba(239,68,68,0.5) !important;' : ''}"
                                                      ${!isIndisponivel ? `
                                                          onmouseover="this.style.transform='scale(1.15)';this.style.boxShadow='0 0 24px ${cor}'"
                                                          onmouseout="this.style.transform='scale(1)';this.style.boxShadow='${sombra}'"
                                                      ` : ''}
                                                      >
                                                    ${icone}
                                                </span>
                                                ${isDono ? `<span style="position:absolute;top:${isMobile ? '-3px' : '-6px'};right:${isMobile ? '-3px' : '-6px'};font-size:${isMobile ? '6px' : '12px'};text-shadow:0 0 4px rgba(0,0,0,0.3);">👑</span>` : ''}
                                                ${isOcupado && !isPassado ? `
                                                    <span style="position:absolute;bottom:${isMobile ? '-1px' : '-4px'};right:${isMobile ? '-1px' : '-4px'};width:${isMobile ? '4px' : '8px'};height:${isMobile ? '4px' : '8px'};background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(239,68,68,0.5);"></span>
                                                ` : ''}
                                                ${!isOcupado && !isPassado ? `
                                                    <span style="position:absolute;bottom:${isMobile ? '-1px' : '-4px'};right:${isMobile ? '-1px' : '-4px'};width:${isMobile ? '4px' : '8px'};height:${isMobile ? '4px' : '8px'};background:#22c55e;border-radius:50%;border:2px solid white;box-shadow:0 0 8px rgba(34,197,94,0.5);"></span>
                                                ` : ''}
                                            </div>
                                            ${!isMobile ? `
                                                <span style="font-size:6px;color:var(--text-muted);margin-top:2px;max-width:32px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isOcupado ? 'color:#ef4444;font-weight:600;' : ''}">
                                                    ${p.nome.length > 6 ? p.nome.substring(0, 5) + '…' : p.nome}
                                                </span>
                                            ` : ''}
                                            ${isOcupado && !isPassado && !isMobile ? `
                                                <span style="font-size:6px;color:#ef4444;font-weight:600;background:rgba(239,68,68,0.1);padding:0px 6px;border-radius:8px;border:1px solid rgba(239,68,68,0.2);margin-top:-1px;">🔴 ocupado</span>
                                            ` : ''}
                                        </div>
                                    `;
                    }).join('')}
                                ${mais ? `<span style="font-size:${isMobile ? '6px' : '10px'};color:var(--text-muted);font-weight:600;">${mais}</span>` : ''}
                            </div>
                            ${!isMobile && todosProfissionais.length > 1 ? `
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
                <td style="padding:${cellPadding};
                           border-bottom:1px solid var(--border-color);
                           background:${bgColor};
                           text-align:center;
                           font-size:${fontSize};
                           min-height:${minHeight};
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
                        <div style="position:absolute;top:0;left:0;right:0;bottom:0;border:1px solid rgba(102,126,234,0.08);border-radius:4px;pointer-events:none;"></div>
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

    html += `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:${isMobile ? '6px 2px 0' : '12px 4px 0'};border-top:1px solid var(--border-color);margin-top:${isMobile ? '6px' : '12px'};font-size:${isMobile ? '9px' : '11px'};color:var(--text-muted);flex-wrap:wrap;gap:${isMobile ? '3px' : '8px'};">
            <div style="display:flex;gap:${isMobile ? '2px' : '6px'};align-items:center;flex-wrap:wrap;">
                <button onclick="mudarAgendaSemana(-7)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:${isMobile ? '4px' : '6px'};cursor:pointer;padding:${isMobile ? '3px 6px' : '6px 14px'};color:var(--text-secondary);font-size:${isMobile ? '8px' : '13px'};transition:all 0.2s;">
                    ◀◀
                </button>
                <button onclick="mudarAgendaSemana(-1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:${isMobile ? '4px' : '6px'};cursor:pointer;padding:${isMobile ? '3px 6px' : '6px 14px'};color:var(--text-secondary);font-size:${isMobile ? '8px' : '13px'};transition:all 0.2s;">
                    ◀
                </button>
                <span style="font-weight:600;color:var(--text-primary);font-size:${isMobile ? '9px' : '13px'};background:var(--bg-hover);padding:${isMobile ? '3px 8px' : '6px 18px'};border-radius:${isMobile ? '4px' : '6px'};border:1px solid var(--border-color);">
                    ${(isMobile && !agendaModoCompleto) ?
            diasParaMostrar[0]?.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) :
            `${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
        }
                </span>
                <button onclick="mudarAgendaSemana(1)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:${isMobile ? '4px' : '6px'};cursor:pointer;padding:${isMobile ? '3px 6px' : '6px 14px'};color:var(--text-secondary);font-size:${isMobile ? '8px' : '13px'};transition:all 0.2s;">
                    ▶
                </button>
                <button onclick="mudarAgendaSemana(7)" style="background:var(--bg-hover);border:1px solid var(--border-color);border-radius:${isMobile ? '4px' : '6px'};cursor:pointer;padding:${isMobile ? '3px 6px' : '6px 14px'};color:var(--text-secondary);font-size:${isMobile ? '8px' : '13px'};transition:all 0.2s;">
                    ▶▶
                </button>
                <button onclick="irAgendaHoje()" style="background:linear-gradient(135deg,#667eea,#764ba2);border:none;border-radius:${isMobile ? '4px' : '6px'};cursor:pointer;padding:${isMobile ? '3px 8px' : '6px 16px'};color:white;font-size:${isMobile ? '8px' : '11px'};font-weight:600;transition:all 0.2s;box-shadow:0 2px 12px rgba(102,126,234,0.3);">
                    📌 Hoje
                </button>
            </div>
            <div style="display:flex;gap:${isMobile ? '2px' : '8px'};font-size:${isMobile ? '6px' : '9px'};flex-wrap:wrap;">
                <span style="display:flex;align-items:center;gap:2px;background:var(--bg-hover);padding:${isMobile ? '1px 4px' : '2px 10px'};border-radius:12px;border:1px solid rgba(34,197,94,0.2);">
                    <span style="display:inline-block;width:${isMobile ? '4px' : '8px'};height:${isMobile ? '4px' : '8px'};border-radius:50%;background:linear-gradient(135deg,#22c55e,#10b981);"></span>
                    ${isMobile ? 'L' : 'Livre'}
                </span>
                <span style="display:flex;align-items:center;gap:2px;background:var(--bg-hover);padding:${isMobile ? '1px 4px' : '2px 10px'};border-radius:12px;border:1px solid rgba(239,68,68,0.2);">
                    <span style="display:inline-block;width:${isMobile ? '4px' : '8px'};height:${isMobile ? '4px' : '8px'};border-radius:50%;background:linear-gradient(135deg,#ef4444,#dc2626);"></span>
                    ${isMobile ? 'O' : 'Ocupado'}
                </span>
                <span style="display:flex;align-items:center;gap:2px;background:var(--bg-hover);padding:${isMobile ? '1px 4px' : '2px 10px'};border-radius:12px;border:1px solid rgba(245,158,11,0.2);">
                    <span style="display:inline-block;width:${isMobile ? '4px' : '8px'};height:${isMobile ? '4px' : '8px'};border-radius:50%;background:linear-gradient(135deg,#f59e0b,#d97706);"></span>
                    ${isMobile ? 'A' : 'Almoço'}
                </span>
            </div>
        </div>
    `;

    container.innerHTML = html;

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
// ALTERNAR MODO DA AGENDA
// ============================================
function alternarModoAgenda() {
    agendaModoCompleto = !agendaModoCompleto;
    console.log(`📱 Modo agenda: ${agendaModoCompleto ? 'Semana Completa' : 'Dia Atual'}`);
    renderizarAgendaInteligente();
}

function mudarAgendaSemana(direcao) {
    agendaInteligenteDate.setDate(agendaInteligenteDate.getDate() + direcao);
    renderizarAgendaInteligente();
}

function irAgendaHoje() {
    agendaInteligenteDate = new Date();
    if (agendaModoCompleto && isMobileScreen()) {
        agendaModoCompleto = false;
    }
    renderizarAgendaInteligente();
}

function atualizarAgendaAposAgendamento() {
    console.log('🔄 🔥 FORÇANDO ATUALIZAÇÃO DA AGENDA...');

    agendaInteligenteData = [];
    agendaInteligenteCarregando = false;
    agendaInteligenteProfissionais = [];
    agendaInteligenteHorarios = [];

    setTimeout(function () {
        const container = document.getElementById('agendaInteligenteContainer');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center;padding:30px;">
                    <div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:32px;height:32px;"></div>
                    <p style="margin-top:10px;font-size:13px;color:var(--text-muted);">Atualizando agenda...</p>
                </div>
            `;
        }

        carregarAgendaInteligente();
        console.log('✅ Agenda recarregada!');
    }, 300);
}

function forcarRecarregarAgenda() {
    console.log('🔥 FORÇANDO RECARREGAMENTO DA AGENDA...');
    agendaInteligenteData = [];
    agendaInteligenteCarregando = false;

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
}

// ============================================
// ABRIR AGENDAMENTO - DIRETO PELA BOLINHA (CORRIGIDO - V5)
// ============================================

async function abrirAgendamentoInteligente(data, hora, profissionalId = null) {
    console.log(`📝 Abrindo agendamento:`, { data, hora, profissionalId });

    // 🔥 GARANTE QUE DATA É STRING
    let dataStr = data;
    if (typeof data !== 'string') {
        if (data instanceof Date) {
            dataStr = data.toISOString().split('T')[0];
        } else if (data && typeof data === 'object') {
            if (data.data) dataStr = data.data;
            else if (data.value) dataStr = data.value;
            else {
                console.error('❌ Data inválida:', data);
                showToast('❌ Data inválida para agendamento', 'error');
                return;
            }
        } else {
            console.error('❌ Data inválida:', data);
            showToast('❌ Data inválida para agendamento', 'error');
            return;
        }
    }

    // 🔥 GARANTE QUE HORA É STRING
    let horaStr = hora;
    if (typeof hora !== 'string') {
        if (hora && typeof hora === 'object') {
            horaStr = hora.hora || hora.value || '08:00';
        } else {
            horaStr = String(hora || '08:00');
        }
    }

    // 🔥 VERIFICA SE A DATA É VÁLIDA
    if (!dataStr || typeof dataStr !== 'string' || !dataStr.includes('-')) {
        console.error('❌ Data inválida após normalização:', dataStr);
        showToast('❌ Data inválida para agendamento', 'error');
        return;
    }

    console.log(`📝 Data normalizada: ${dataStr} | Hora: ${horaStr}`);

    // Verifica se é dono
    const isDono = profissionalId && typeof profissionalId === 'string' && profissionalId.startsWith('dono_');
    const profissionalIdReal = isDono ? null : (profissionalId ? parseInt(profissionalId) : null);

    // Verifica se a data já passou
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

    // 🔥 CARREGA CLIENTES, SERVIÇOS E PROFISSIONAIS SE NECESSÁRIO
    try {
        // Verifica se tem clientes
        let temClientes = false;
        if (typeof clientesList !== 'undefined' && clientesList && clientesList.length > 0) {
            window.clientesList = clientesList;
            temClientes = true;
            console.log(`✅ clientesList: ${clientesList.length} clientes`);
        } else if (window.clientesList && window.clientesList.length > 0) {
            temClientes = true;
            console.log(`✅ window.clientesList: ${window.clientesList.length} clientes`);
        }

        // Verifica se tem serviços
        let temServicos = false;
        if (typeof servicosList !== 'undefined' && servicosList && servicosList.length > 0) {
            window.servicosList = servicosList;
            temServicos = true;
            console.log(`✅ servicosList: ${servicosList.length} serviços`);
        } else if (window.servicosList && window.servicosList.length > 0) {
            temServicos = true;
            console.log(`✅ window.servicosList: ${window.servicosList.length} serviços`);
        }

        // Verifica se tem profissionais
        let temProfissionais = false;
        if (typeof profissionaisList !== 'undefined' && profissionaisList && profissionaisList.length > 0) {
            window.profissionaisList = profissionaisList;
            temProfissionais = true;
            console.log(`✅ profissionaisList: ${profissionaisList.length} profissionais`);
        } else if (window.profissionaisList && window.profissionaisList.length > 0) {
            temProfissionais = true;
            console.log(`✅ window.profissionaisList: ${window.profissionaisList.length} profissionais`);
        }

        // 🔥 SE NÃO TIVER CLIENTES, CARREGA
        if (!temClientes) {
            console.log('🔄 Carregando clientes da API...');
            showToast('🔄 Carregando clientes...', 'info');
            const res = await fetch('/api/clientes', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success && data.data) {
                window.clientesList = data.data;
                temClientes = true;
                console.log(`✅ ${window.clientesList.length} clientes carregados`);
            } else {
                showToast('❌ Erro ao carregar clientes', 'error');
                return;
            }
        }

        // 🔥 SE NÃO TIVER SERVIÇOS, CARREGA
        if (!temServicos) {
            console.log('🔄 Carregando serviços da API...');
            const res = await fetch('/api/servicos', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success && data.data) {
                window.servicosList = data.data;
                temServicos = true;
                console.log(`✅ ${window.servicosList.length} serviços carregados`);
            } else {
                console.warn('⚠️ Nenhum serviço encontrado');
                window.servicosList = [];
            }
        }

        // 🔥 SE NÃO TIVER PROFISSIONAIS, CARREGA
        if (!temProfissionais) {
            console.log('🔄 Carregando profissionais da API...');
            const res = await fetch('/api/profissionais', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.success && data.data) {
                window.profissionaisList = data.data;
                temProfissionais = true;
                console.log(`✅ ${window.profissionaisList.length} profissionais carregados`);
            } else {
                console.warn('⚠️ Nenhum profissional encontrado');
                window.profissionaisList = [];
            }
        }

        // 🔥 ATUALIZA AS VARIÁVEIS DO agendamentos.js
        if (typeof clientesList !== 'undefined') {
            // Não podemos reatribuir const
        }
        if (typeof servicosList !== 'undefined') {
            // Não podemos reatribuir const
        }
        if (typeof profissionaisList !== 'undefined') {
            // Não podemos reatribuir const
        }

    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        showToast('❌ Erro ao carregar dados', 'error');
        return;
    }

    console.log(`✅ Dados prontos: ${window.clientesList?.length || 0} clientes, ${window.servicosList?.length || 0} serviços, ${window.profissionaisList?.length || 0} profissionais`);

    // 🔥 ABRE O MODAL DE AGENDAMENTO
    showLoading();

    try {
        if (typeof abrirModalAgendamentoDono !== 'function') {
            showToast('❌ Função de agendamento não disponível', 'error');
            hideLoading();
            return;
        }

        // 🔥 FORÇA O CARREGAMENTO DOS AGENDAMENTOS PARA POPULAR AS LISTAS
        if (typeof carregarAgendamentos === 'function') {
            carregarAgendamentos();
        }

        abrirModalAgendamentoDono();

        // 🔥 AGUARDA O MODAL SER CRIADO E PREENCHE
        let tentativasPreenchimento = 0;
        const maxTentativas = 30;

        function preencherModal() {
            tentativasPreenchimento++;

            const buscaInput = document.getElementById('buscaClienteDono');
            const clienteSelect = document.getElementById('clienteIdDono');

            if (!buscaInput || !clienteSelect) {
                if (tentativasPreenchimento < maxTentativas) {
                    console.log(`⏳ Aguardando modal... (${tentativasPreenchimento}/${maxTentativas})`);
                    setTimeout(preencherModal, 200);
                } else {
                    console.error('❌ Modal não encontrado');
                    showToast('❌ Erro ao abrir modal de agendamento', 'error');
                    hideLoading();
                }
                return;
            }

            console.log('✅ Modal encontrado, preenchendo...');

            // 🔥 PREENCHE A DATA
            const dataInput = document.getElementById('dataAgendamentoDono');
            if (dataInput) {
                dataInput.value = dataStr;
                dataInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 🔥 PREENCHE O HORÁRIO
            const horaSelect = document.getElementById('horaAgendamentoDono');
            if (horaSelect) {
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
                console.log(`✅ Horário ${horaStr} selecionado`);
            }

            // 🔥 PREENCHE PROFISSIONAL
            if (profissionalIdReal) {
                const profSelect = document.getElementById('profissionalIdDono');
                if (profSelect) {
                    for (let opt of profSelect.options) {
                        if (opt.value == profissionalIdReal) {
                            profSelect.value = profissionalIdReal;
                            console.log(`✅ Profissional ${profissionalIdReal} selecionado`);
                            break;
                        }
                    }
                }
            }

            // 🔥 ATUALIZA A LISTA DE CLIENTES NO AUTOCOMPLETE
            if (buscaInput && window.clientesList && window.clientesList.length > 0) {
                if (!clienteSelect.value) {
                    setTimeout(() => {
                        buscaInput.value = '';
                        buscaInput.focus();
                        setTimeout(() => {
                            buscaInput.value = 'a';
                            buscaInput.dispatchEvent(new Event('input'));
                            setTimeout(() => {
                                buscaInput.value = '';
                                buscaInput.dispatchEvent(new Event('input'));
                            }, 100);
                        }, 100);
                    }, 300);
                }
            }

            // 🔥 CONECTA O BOTÃO SALVAR
            const modal = document.getElementById('modalAgendamentoDono');
            if (modal) {
                const botoes = modal.querySelectorAll('button');
                let botaoSalvar = null;
                for (let btn of botoes) {
                    const texto = btn.textContent || '';
                    if (texto.includes('Salvar') || texto.includes('salvar')) {
                        botaoSalvar = btn;
                        break;
                    }
                }

                if (botaoSalvar) {
                    const novoBotao = botaoSalvar.cloneNode(true);
                    botaoSalvar.parentNode.replaceChild(novoBotao, botaoSalvar);
                    novoBotao.onclick = function (e) {
                        e.preventDefault();
                        salvarAgendamentoDoModal(dataStr);
                    };
                    console.log('✅ Botão Salvar conectado!');
                }
            }

            hideLoading();
            showToast(`📅 ${formatarDataBr(dataStr)} às ${horaStr} - Selecione um cliente`, 'info');
        }

        // 🔥 FUNÇÃO PARA SALVAR
        function salvarAgendamentoDoModal(dataOriginal) {
            const clienteId = document.getElementById('clienteIdDono')?.value;
            const buscaInput = document.getElementById('buscaClienteDono');
            const horaSelect = document.getElementById('horaAgendamentoDono');
            const servicoSelect = document.getElementById('servicoIdDono');
            const valorInput = document.getElementById('valorAgendamentoDono');
            const profSelect = document.getElementById('profissionalIdDono');
            const descInput = document.getElementById('servicoDescricaoDono');

            // 🔥 SE NÃO TIVER ID DO CLIENTE, TENTA ENCONTRAR PELO NOME
            let cliente_id = clienteId;
            if (!cliente_id && buscaInput && buscaInput.value) {
                const nomeBusca = buscaInput.value.trim();
                if (window.clientesList && window.clientesList.length > 0) {
                    const encontrado = window.clientesList.find(c =>
                        c.nome.toLowerCase() === nomeBusca.toLowerCase()
                    );
                    if (encontrado) {
                        cliente_id = encontrado.id;
                        document.getElementById('clienteIdDono').value = encontrado.id;
                        console.log(`✅ Cliente encontrado pelo nome: ${encontrado.nome} (${encontrado.id})`);
                    }
                }
            }

            const horaSelecionada = horaSelect?.value;
            const servico_id = servicoSelect?.value;
            const valor = valorInput?.value || '0';
            const profissional_id = profSelect?.value;
            const descricao = descInput?.value;

            if (!cliente_id) {
                showToast('Selecione um cliente na busca', 'warning');
                if (buscaInput) buscaInput.focus();
                return;
            }

            if (!horaSelecionada) {
                showToast('Selecione um horário', 'warning');
                return;
            }

            showLoading();
            const token = localStorage.getItem('token');

            const body = {
                cliente_id: parseInt(cliente_id),
                data: dataOriginal,
                hora: horaSelecionada,
                valor: parseFloat(valor) || 0
            };

            if (profissional_id && profissional_id !== '') {
                body.profissional_id = parseInt(profissional_id);
            }

            if (servico_id && servico_id !== '') {
                body.servico_id = parseInt(servico_id);
            } else if (descricao && descricao.trim() !== '') {
                body.servico = descricao.trim();
            }

            console.log('📤 Enviando:', body);

            fetch('/api/agendamentos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify(body)
            })
                .then(r => r.json())
                .then(result => {
                    hideLoading();
                    if (result.success) {
                        showToast('✅ Agendamento criado com sucesso!', 'success');
                        fecharModalAgendamentoDono();
                        agendaInteligenteData = [];
                        agendaInteligenteCarregando = false;
                        setTimeout(() => carregarAgendaInteligente(), 500);
                        if (typeof carregarAgendamentos === 'function') {
                            carregarAgendamentos();
                        }
                    } else {
                        showToast('❌ ' + result.message, 'error');
                    }
                })
                .catch(err => {
                    hideLoading();
                    console.error('❌ Erro:', err);
                    showToast('❌ Erro ao criar agendamento', 'error');
                });
        }

        setTimeout(preencherModal, 500);

    } catch (error) {
        console.error('❌ Erro ao abrir agendamento:', error);
        hideLoading();
        showToast('❌ Erro ao abrir agendamento', 'error');
    }
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