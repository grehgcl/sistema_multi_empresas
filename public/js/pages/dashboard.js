// ============================================
// DASHBOARD.JS - VERSÃO COMPLETA COM CORREÇÕES
// ULTIMA ATUALIZACAO: 22/08/2026
// ============================================

let dashboardData = null;
let chartInstance = null;
let agendaInteligenteData = [];
let agendaInteligenteDate = new Date();
let agendaInteligenteHorarios = [];
let agendaInteligenteProfissionais = [];
let agendaInteligenteCores = {};
let agendaInteligenteCarregando = false;
let agendaModoCompleto = false;
const coresPaleta = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF9FF3', '#54A0FF', '#5F27CD', '#341F97', '#00D2D3', '#1DD1A1', '#F368E0', '#FF9F43', '#EE5A24'];

// ============================================
// FUNÇÕES DE DATA
// ============================================

function criarDataLocal(dataStr) {
    if (!dataStr) return new Date();
    const partes = dataStr.split('-').map(Number);
    if (partes.length !== 3) return new Date();
    return new Date(partes[0], partes[1] - 1, partes[2]);
}

function hojeLocal() {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function formatarDataLocal(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const p = dataStr.split('-');
            if (p.length === 3) return p[2] + '/' + p[1] + '/' + p[0];
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

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

function isMobileScreen() {
    return window.innerWidth < 768;
}

function formatarMoeda(valor) {
    if (valor === undefined || valor === null || isNaN(valor)) return '0,00';
    const n = parseFloat(valor);
    return isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// VERIFICAÇÃO DE HORÁRIO OCUPADO
// ============================================

function isHorarioOcupadoComDuracao(agendamentos, profissionalId, data, hora) {
    const horaMin = horaParaMinutos(hora);
    for (let ag of agendamentos) {
        if (String(ag.profissional_id) !== String(profissionalId)) continue;
        if (ag.data !== data) continue;
        if (ag.status === 'cancelado') continue;
        if (!ag.hora) continue;
        const agHoraMin = horaParaMinutos(ag.hora);
        let agDuracao = 30;
        if (ag.servico_id) {
            const s = window.servicosListGlobal?.find(x => x.id === ag.servico_id);
            if (s && s.duracao) agDuracao = parseInt(s.duracao);
        }
        if (horaMin >= agHoraMin && horaMin < agHoraMin + agDuracao) return true;
    }
    return false;
}

function gerarHorariosDoDiaConfig(hi, hf, ai, af) {
    const h = [];
    if (!hi || !hf) return h;
    const [h1, m1] = hi.split(':').map(Number);
    const [h2, m2] = hf.split(':').map(Number);
    const [a1, a2] = (ai || '12:00').split(':').map(Number);
    const [a3, a4] = (af || '13:00').split(':').map(Number);
    const i = h1 * 60 + m1;
    const f = h2 * 60 + m2;
    const alI = a1 * 60 + a2;
    const alF = a3 * 60 + a4;
    for (let min = i; min <= f; min += 30) {
        if (min >= alI && min < alF) continue;
        h.push(String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'));
    }
    return h;
}

function atualizarModoAgendaPorTela() {
    const m = isMobileScreen();
    const n = !m;
    if (agendaModoCompleto !== n) {
        agendaModoCompleto = n;
        const c = document.getElementById('agendaInteligenteContainer');
        if (c && c.innerHTML && !c.innerHTML.includes('Carregando')) renderizarAgendaInteligente();
    }
}

// ============================================
// IR PARA O PRÓXIMO DIA DISPONÍVEL
// ============================================

function irParaDiaDisponivel(dataStr) {
    if (!dataStr) return;
    const partes = dataStr.split('-').map(Number);
    if (partes.length !== 3) return;
    agendaInteligenteDate = new Date(partes[0], partes[1] - 1, partes[2]);
    renderizarAgendaInteligente();
}

// ============================================
// MUDAR AGENDA - PULAR DIAS FECHADOS
// ============================================

function mudarAgendaSemana(dir) {
    let novaData = new Date(agendaInteligenteDate);
    novaData.setDate(novaData.getDate() + dir);
    
    const diaSem = novaData.getDay();
    const horDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSem);
    const aberto = horDia && (horDia.aberto == 1 || horDia.aberto == true);
    
    if (!aberto) {
        let encontrou = false;
        let dataTeste = new Date(novaData);
        
        for (let i = 1; i <= 7; i++) {
            dataTeste = new Date(novaData);
            dataTeste.setDate(novaData.getDate() + (dir > 0 ? i : -i));
            const testDiaSem = dataTeste.getDay();
            const testHorDia = agendaInteligenteHorarios.find(h => h.dia_semana === testDiaSem);
            const testAberto = testHorDia && (testHorDia.aberto == 1 || testHorDia.aberto == true);
            if (testAberto) {
                encontrou = true;
                break;
            }
        }
        
        if (encontrou) {
            const dataFormatada = dataTeste.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
            const diaOriginal = novaData.toLocaleDateString('pt-BR', { weekday: 'long' });
            showToast(`⏭️ ${diaOriginal} está fechado. Indo para ${dataFormatada}`, 'info');
            agendaInteligenteDate = dataTeste;
        } else {
            showToast('⚠️ Nenhum dia disponível nos próximos 7 dias', 'warning');
            return;
        }
    } else {
        agendaInteligenteDate = novaData;
    }
    
    if (agendaModoCompleto && isMobileScreen()) agendaModoCompleto = false;
    renderizarAgendaInteligente();
}

// ============================================
// CONCLUIR AGENDAMENTOS VENCIDOS
// ============================================

async function concluirAgendamentosVencidos() {
    const t = localStorage.getItem('token');
    if (!t) { showToast('❌ Sessão expirada', 'error'); return; }
    try {
        showLoading();
        const r = await fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + t } });
        const d = await r.json();
        const ag = d.data || [];
        const hoje = hojeLocal();
        const venc = ag.filter(a => {
            if (a.status !== 'pendente') return false;
            const dataAg = criarDataLocal(a.data);
            return dataAg < hoje;
        });
        hideLoading();
        if (venc.length === 0) { showToast('✅ Nenhum vencido!', 'success'); return; }
        const ok = confirm(`🔴 ${venc.length} vencidos.\n\n` +
            venc.slice(0, 5).map(a => `📅 ${formatarDataLocal(a.data)} ${a.hora || ''} - ${a.cliente_nome || 'Cliente'}`).join('\n') +
            `\n\nMarcar como CONCLUÍDOS?`);
        if (!ok) return;
        showLoading();
        let c = 0, e = 0;
        for (const ag2 of venc) {
            try {
                const rc = await fetch(`/api/agendamentos/${ag2.id}/concluir`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }
                });
                const rj = await rc.json();
                if (rj.success) c++;
                else e++;
            } catch { e++; }
        }
        hideLoading();
        showToast(`✅ ${c} concluídos! ${e > 0 ? `⚠️ ${e} erros` : ''}`, e > 0 ? 'warning' : 'success');
        setTimeout(() => carregarDashboard(), 500);
    } catch (err) {
        console.error(err);
        hideLoading();
        showToast('❌ Erro', 'error');
    }
}

// ============================================
// CARREGAR AGENDA INTELIGENTE
// ============================================

async function carregarAgendaInteligente() {
    agendaInteligenteData = [];
    agendaInteligenteCarregando = true;
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    try {
        const [hr, pr, ag, sr] = await Promise.all([
            fetch('/api/horarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/servicos/todos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);
        const sd = await sr.json();
        window.servicosListGlobal = sd.success ? sd.data : [];
        agendaInteligenteHorarios = (await hr.json()).data || [];
        const profs = (await pr.json()).data?.filter(p => p.ativo == 1 || p.ativo == true) || [];
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
        profs.forEach((p, i) => agendaInteligenteCores[p.id] = coresPaleta[i % coresPaleta.length]);
        const agd = await ag.json();
        agendaInteligenteData = agd.success ? agd.data : [];
        agendaInteligenteDate = new Date();
        atualizarModoAgendaPorTela();
        renderizarAgendaInteligente();
    } catch (e) {
        console.error(e);
        const c = document.getElementById('agendaInteligenteContainer');
        if (c) c.innerHTML = `<div style="text-align:center;padding:20px;"><p>Erro ao carregar agenda</p><button onclick="carregarAgendaInteligente()" class="btn btn-sm btn-primary">Tentar</button></div>`;
    }
    agendaInteligenteCarregando = false;
}

// ============================================
// VARIÁVEL DE VISÃO
// ============================================

let agendaModoVisao = localStorage.getItem('agendaModoVisao') || (isMobileScreen() ? 'dia' : 'semana');

// ============================================
// RENDERIZAR AGENDA INTELIGENTE - 3 VISÕES
// ============================================

function renderizarAgendaInteligente() {
    const isMobile = isMobileScreen();
    const container = document.getElementById('agendaInteligenteContainer');
    if (!container) return;
    if (!agendaInteligenteDate) agendaInteligenteDate = new Date();

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    if (!agendaInteligenteProfissionais || agendaInteligenteProfissionais.length === 0) {
        container.innerHTML = `<div class="agenda-mobile-fechado"><span class="agenda-mobile-fechado-icon">👨‍💼</span><div class="agenda-mobile-fechado-titulo">Nenhum profissional cadastrado</div></div>`;
        return;
    }
    if (!agendaInteligenteHorarios || agendaInteligenteHorarios.length === 0) {
        container.innerHTML = `<div class="agenda-mobile-fechado"><span class="agenda-mobile-fechado-icon">⏰</span><div class="agenda-mobile-fechado-titulo">Horários não configurados</div></div>`;
        return;
    }

    // ============================================
    // FUNÇÕES AUXILIARES
    // ============================================

    window._agendaGetCorIndex = function(profissional) {
        const idx = agendaInteligenteProfissionais.findIndex(p => String(p.id) === String(profissional.id));
        return idx >= 0 ? idx % 15 : 0;
    };

    window._agendaGetAgendamentosDoSlot = function(dataStr, horaStr, profId) {
        const hm = horaParaMinutos(horaStr);
        const result = [];
        for (let ag of agendaInteligenteData) {
            if (ag.data !== dataStr || ag.status === 'cancelado' || !ag.hora) continue;
            const agH = horaParaMinutos(ag.hora);
            let dur = 30;
            if (ag.servico_id) {
                const s = window.servicosListGlobal?.find(x => x.id === ag.servico_id);
                if (s && s.duracao) dur = parseInt(s.duracao);
            }
            if (hm >= agH && hm < agH + dur) {
                if (profId === 'dono') {
                    if (ag.profissional_id === null || ag.profissional_id === '' || ag.profissional_id === undefined) {
                        result.push(ag);
                    }
                } else {
                    if (String(ag.profissional_id) === String(profId)) {
                        result.push(ag);
                    }
                }
            }
        }
        return result;
    };

    window._agendaRenderBloco = function(ag, prof) {
        const corIdx = window._agendaGetCorIndex(prof);
        const cliente = escapeHtml(ag.cliente_nome || 'Cliente');
        const servico = escapeHtml(ag.servico_nome || ag.servico || '');
        const hora = ag.hora || '';
        const statusIcon = ag.status === 'concluido' ? '✓' :
                          ag.status === 'pendente' ? '⏳' : '';
        return `
            <div class="agenda-bloco agenda-cor-${corIdx}"
                 onclick="event.stopPropagation(); abrirDetalhesSlot('${ag.data}','${hora}')"
                 title="${cliente} · ${servico} · ${hora}">
                <span class="agenda-bloco-cliente">
                    ${cliente}
                    ${statusIcon ? `<span class="agenda-bloco-status">${statusIcon}</span>` : ''}
                </span>
                <span class="agenda-bloco-info">${servico || prof.nome} · ${hora}</span>
            </div>
        `;
    };

    // ============================================
    // HEADER DE NAVEGAÇÃO
    // ============================================

    function renderHeaderNav() {
        const diaRef = agendaInteligenteDate;
        let tituloRange = '';

        if (agendaModoVisao === 'dia') {
            tituloRange = diaRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        } else if (agendaModoVisao === 'semana') {
            const fimSemana = new Date(diaRef);
            fimSemana.setDate(diaRef.getDate() + 6);
            tituloRange = `${diaRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${fimSemana.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
        } else {
            tituloRange = diaRef.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }

        return `
            <div class="agenda-header-bar">
                <div class="agenda-header-titulo">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${tituloRange}</span>
                </div>
                <div class="agenda-header-actions">
                    <div class="agenda-view-switcher">
                        <button class="agenda-view-btn ${agendaModoVisao === 'dia' ? 'active' : ''}"
                                onclick="mudarVisaoAgenda('dia')" title="Dia">
                            <i class="fas fa-calendar-day"></i><span>Dia</span>
                        </button>
                        <button class="agenda-view-btn ${agendaModoVisao === 'semana' ? 'active' : ''}"
                                onclick="mudarVisaoAgenda('semana')" title="Semana">
                            <i class="fas fa-calendar-week"></i><span>Semana</span>
                        </button>
                        <button class="agenda-view-btn ${agendaModoVisao === 'mes' ? 'active' : ''}"
                                onclick="mudarVisaoAgenda('mes')" title="Mês">
                            <i class="fas fa-calendar-alt"></i><span>Mês</span>
                        </button>
                    </div>
                    <button class="agenda-btn-nav" onclick="navegarAgenda(-1)">◀</button>
                    <button class="agenda-btn-hoje" onclick="irAgendaHoje()">📌 Hoje</button>
                    <button class="agenda-btn-nav" onclick="navegarAgenda(1)">▶</button>
                </div>
            </div>
        `;
    }

    // ============================================
    // VISÃO DIA
    // ============================================

    function renderVisaoDia() {
        const dia = new Date(agendaInteligenteDate);
        const dataStr = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
        const diaSem = dia.getDay();
        const horDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSem);
        const aberto = horDia && (horDia.aberto == 1 || horDia.aberto == true);

        if (!aberto) {
            return `
                <div class="agenda-google">
                    ${renderHeaderNav()}
                    <div class="agenda-mobile-fechado" style="padding:2rem 1rem;">
                        <span class="agenda-mobile-fechado-icon">🚫</span>
                        <div class="agenda-mobile-fechado-titulo">${dia.toLocaleDateString('pt-BR', { weekday: 'long' })} — Fechado</div>
                        <p style="font-size:0.75rem;">Este dia não está disponível para agendamentos</p>
                    </div>
                </div>
            `;
        }

        let base = gerarHorariosDoDiaConfig(
            horDia.hora_inicio || '08:00',
            horDia.hora_fim || '18:00',
            horDia.almoco_inicio || '12:00',
            horDia.almoco_fim || '13:00'
        );
        if (base.length === 0) {
            for (let h = 8; h <= 18; h++) {
                base.push(String(h).padStart(2, '0') + ':00');
                if (h < 18) base.push(String(h).padStart(2, '0') + ':30');
            }
        }

        const totalProf = agendaInteligenteProfissionais.length;
        let slotsHtml = '';

        for (let hora of base) {
            const almoco = hora >= (horDia.almoco_inicio || '12:00') && hora < (horDia.almoco_fim || '13:00');
            const isAgora = hojeStr === dataStr &&
                hoje.getHours() === parseInt(hora.split(':')[0]) &&
                hoje.getMinutes() >= parseInt(hora.split(':')[1]) &&
                hoje.getMinutes() < parseInt(hora.split(':')[1]) + 30;

            if (almoco) {
                slotsHtml += `
                    <div class="agenda-dia-slot agenda-slot-almoco">
                        <div class="agenda-dia-hora">
                            <span>${hora}</span>
                        </div>
                        <div class="agenda-dia-blocos">
                            <span class="agenda-dia-vazio">🍽 Almoço</span>
                        </div>
                    </div>
                `;
                continue;
            }

            let ocupados = 0;
            const blocosSlot = [];
            for (let p of agendaInteligenteProfissionais) {
                const ags = window._agendaGetAgendamentosDoSlot(dataStr, hora, p.is_dono ? 'dono' : p.id);
                if (ags.length > 0) {
                    ocupados++;
                    for (let ag of ags) {
                        blocosSlot.push(window._agendaRenderBloco(ag, p));
                    }
                }
            }

            const livres = totalProf - ocupados;
            let slotClass = '';
            let statusText = '';
            let statusColor = '';

            if (livres === 0) {
                slotClass = 'agenda-slot-lotado';
                statusText = `🔴 ${ocupados}/${totalProf}`;
                statusColor = '#ef4444';
            } else if (ocupados > 0) {
                slotClass = 'agenda-slot-parcial';
                statusText = `🟡 ${livres} livre${livres > 1 ? 's' : ''}`;
                statusColor = '#f59e0b';
            } else {
                slotClass = 'agenda-slot-livre';
                statusText = `🟢 ${totalProf} livre${totalProf > 1 ? 's' : ''}`;
                statusColor = '#22c55e';
            }

            slotsHtml += `
                <div class="agenda-dia-slot ${slotClass} agenda-slot-clicavel"
                     onclick="abrirDetalhesSlot('${dataStr}','${hora}')">
                    <div class="agenda-dia-hora">
                        ${isAgora ? '<span class="agora-badge">AGORA</span>' : ''}
                        <span>${hora}</span>
                        <span class="status-resumo" style="color:${statusColor};">${statusText}</span>
                    </div>
                    <div class="agenda-dia-blocos">
                        ${blocosSlot.length > 0
                            ? blocosSlot.join('')
                            : '<span class="agenda-dia-vazio">Disponível</span>'
                        }
                    </div>
                </div>
            `;
        }

        return `
            <div class="agenda-google">
                ${renderHeaderNav()}
                <div class="agenda-dia-wrap">
                    <div class="agenda-dia-titulo">
                        <div class="agenda-dia-titulo-texto">
                            ${dia.toLocaleDateString('pt-BR', { weekday: 'long' })}
                            <small>${dia.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</small>
                        </div>
                    </div>
                    <div class="agenda-dia-lista">${slotsHtml}</div>
                </div>
            </div>
        `;
    }

    // ============================================
    // VISÃO SEMANA
    // ============================================

    function renderVisaoSemana() {
        const dias = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(agendaInteligenteDate);
            d.setDate(agendaInteligenteDate.getDate() + i);
            dias.push(d);
        }

        const cfgHoje = agendaInteligenteHorarios.find(h => h.dia_semana === hoje.getDay());
        let base = [];
        if (cfgHoje && (cfgHoje.aberto == 1 || cfgHoje.aberto == true)) {
            base = gerarHorariosDoDiaConfig(
                cfgHoje.hora_inicio || '08:00',
                cfgHoje.hora_fim || '18:00',
                cfgHoje.almoco_inicio || '12:00',
                cfgHoje.almoco_fim || '13:00'
            );
        }
        if (base.length === 0) {
            for (let h = 8; h <= 18; h++) {
                base.push(String(h).padStart(2, '0') + ':00');
                if (h < 18) base.push(String(h).padStart(2, '0') + ':30');
            }
        }

        const totMinAgora = hoje.getHours() * 60 + hoje.getMinutes();
        let idxAgora = -1;
        for (let i = 0; i < base.length; i++) {
            const [h, m] = base[i].split(':').map(Number);
            if ((h * 60 + m) >= totMinAgora) { idxAgora = i; break; }
        }

        let html = `<div class="agenda-google">${renderHeaderNav()}`;
        html += `<div class="agenda-grade-wrap"><table class="agenda-grade">`;

        html += `<thead><tr><th class="agenda-th-hora">⏰</th>`;
        for (let d of dias) {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const isHoje = ds === hojeStr;
            const horD = agendaInteligenteHorarios.find(h => h.dia_semana === d.getDay());
            const ab = horD && (horD.aberto == 1 || horD.aberto == true);
            const classes = ['agenda-th-dia'];
            if (isHoje) classes.push('agenda-th-hoje');
            if (!ab) classes.push('agenda-th-fechado');

            html += `<th class="${classes.join(' ')}">
                <span class="agenda-dia-semana">${d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
                <span class="agenda-dia-numero">${d.getDate()}</span>
                ${!ab ? '<span class="agenda-dia-fechado">🚫</span>' : ''}
            </th>`;
        }
        html += `</tr></thead><tbody>`;

        for (let idx = 0; idx < base.length; idx++) {
            const hora = base[idx];
            const isAgora = idx === idxAgora;
            html += `<tr class="${isAgora ? 'agenda-tr-agora' : ''}">`;
            html += `<td class="agenda-td-hora ${isAgora ? 'agenda-hora-agora' : ''}">
                ${isAgora ? '<span class="agenda-hora-agora-badge">AGORA</span>' : ''}
                ${hora}
            </td>`;

            for (let d of dias) {
                const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const horD = agendaInteligenteHorarios.find(h => h.dia_semana === d.getDay());
                const ab = horD && (horD.aberto == 1 || horD.aberto == true);

                let dentro = true;
                if (ab && horD) {
                    const [hI, mI] = (horD.hora_inicio || '08:00').split(':').map(Number);
                    const [hF, mF] = (horD.hora_fim || '18:00').split(':').map(Number);
                    const [hA, mA] = hora.split(':').map(Number);
                    dentro = (hA * 60 + mA) >= (hI * 60 + mI) && (hA * 60 + mA) <= (hF * 60 + mF);
                }

                const almoco = ab && horD &&
                    hora >= (horD.almoco_inicio || '12:00') &&
                    hora < (horD.almoco_fim || '13:00');

                const classes = ['agenda-td-slot'];
                if (!ab || !dentro) classes.push('agenda-slot-fechado');
                else if (almoco) classes.push('agenda-slot-almoco');
                else classes.push('agenda-slot-clicavel');

                let blocosHtml = '';
                if (ab && dentro && !almoco) {
                    for (let p of agendaInteligenteProfissionais) {
                        const ags = window._agendaGetAgendamentosDoSlot(ds, hora, p.is_dono ? 'dono' : p.id);
                        for (let ag of ags) {
                            blocosHtml += window._agendaRenderBloco(ag, p);
                        }
                    }
                }

                const clickAttr = (ab && dentro && !almoco)
                    ? `onclick="abrirDetalhesSlot('${ds}','${hora}')"`
                    : '';

                html += `<td class="${classes.join(' ')}" ${clickAttr}>${blocosHtml}</td>`;
            }
            html += `</tr>`;
        }

        html += `</tbody></table></div>`;

        html += `
            <div class="agenda-legenda">
                ${agendaInteligenteProfissionais.slice(0, 6).map(p => `
                    <span class="agenda-legenda-item">
                        <span class="agenda-legenda-cor agenda-cor-${window._agendaGetCorIndex(p)}"></span>
                        ${escapeHtml(p.nome)}
                    </span>
                `).join('')}
            </div>
        `;

        html += `</div>`;
        return html;
    }

    // ============================================
    // VISÃO MÊS
    // ============================================

    function renderVisaoMes() {
        const ref = new Date(agendaInteligenteDate);
        const ano = ref.getFullYear();
        const mes = ref.getMonth();

        const primeiroDiaMes = new Date(ano, mes, 1);
        const ultimoDiaMes = new Date(ano, mes + 1, 0);

        const inicioGrid = new Date(primeiroDiaMes);
        inicioGrid.setDate(inicioGrid.getDate() - inicioGrid.getDay());

        const fimGrid = new Date(ultimoDiaMes);
        fimGrid.setDate(fimGrid.getDate() + (6 - fimGrid.getDay()));

        const countPorDia = {};
        const coresPorDia = {};
        for (let ag of agendaInteligenteData) {
            if (ag.status === 'cancelado') continue;
            if (!ag.data) continue;
            countPorDia[ag.data] = (countPorDia[ag.data] || 0) + 1;
            if (!coresPorDia[ag.data]) coresPorDia[ag.data] = new Set();
            const prof = agendaInteligenteProfissionais.find(p =>
                p.is_dono ? (!ag.profissional_id) : String(p.id) === String(ag.profissional_id)
            );
            if (prof) coresPorDia[ag.data].add(window._agendaGetCorIndex(prof));
        }

        let html = `<div class="agenda-google">${renderHeaderNav()}`;
        html += `<div class="agenda-mes-wrap">`;
        html += `<div class="agenda-mes-titulo">${ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</div>`;
        html += `<div class="agenda-mes-grade">`;

        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].forEach(d => {
            html += `<div class="agenda-mes-dia-semana">${d}</div>`;
        });

        const cursor = new Date(inicioGrid);
        while (cursor <= fimGrid) {
            const ds = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
            const foraDoMes = cursor.getMonth() !== mes;
            const isHoje = ds === hojeStr;
            const horD = agendaInteligenteHorarios.find(h => h.dia_semana === cursor.getDay());
            const ab = horD && (horD.aberto == 1 || horD.aberto == true);

            const count = countPorDia[ds] || 0;
            const cores = coresPorDia[ds] ? Array.from(coresPorDia[ds]).slice(0, 4) : [];

            const classes = ['agenda-mes-cell'];
            if (foraDoMes) classes.push('fora-do-mes');
            if (isHoje) classes.push('hoje');
            if (!ab) classes.push('fechado');

            let pontosHtml = '';
            if (count > 0 && cores.length > 0) {
                pontosHtml = cores.map(c => `<span class="agenda-mes-ponto agenda-cor-${c}"></span>`).join('');
            }

            const clickAttr = (!foraDoMes && ab)
                ? `onclick="irParaDiaEspecifico('${ds}')"`
                : '';

            html += `
                <div class="${classes.join(' ')}" ${clickAttr}>
                    <div class="agenda-mes-cell-numero">${cursor.getDate()}</div>
                    ${pontosHtml ? `<div class="agenda-mes-cell-pontos">${pontosHtml}</div>` : ''}
                    ${count > 0 ? `<div class="agenda-mes-cell-count">${count} agend.</div>` : ''}
                </div>
            `;

            cursor.setDate(cursor.getDate() + 1);
        }

        html += `</div></div></div>`;
        return html;
    }

    // ============================================
    // RENDER FINAL
    // ============================================

    let html = '';
    if (agendaModoVisao === 'dia') {
        html = renderVisaoDia();
    } else if (agendaModoVisao === 'mes') {
        html = renderVisaoMes();
    } else {
        html = renderVisaoSemana();
    }

    container.innerHTML = html;
}
// ============================================
// FUNÇÕES DE NAVEGAÇÃO DE VISÃO
// ============================================

function mudarVisaoAgenda(visao) {
    agendaModoVisao = visao;
    localStorage.setItem('agendaModoVisao', visao);
    if (visao === 'semana') agendaModoCompleto = true;
    if (visao === 'dia') agendaModoCompleto = false;
    renderizarAgendaInteligente();
}

function navegarAgenda(dir) {
    if (agendaModoVisao === 'dia') {
        const d = new Date(agendaInteligenteDate);
        d.setDate(d.getDate() + dir);
        agendaInteligenteDate = d;
    } else if (agendaModoVisao === 'semana') {
        const d = new Date(agendaInteligenteDate);
        d.setDate(d.getDate() + (dir * 7));
        agendaInteligenteDate = d;
    } else {
        const d = new Date(agendaInteligenteDate);
        d.setMonth(d.getMonth() + dir);
        agendaInteligenteDate = d;
    }
    renderizarAgendaInteligente();
}

function irParaDiaEspecifico(dataStr) {
    const partes = dataStr.split('-').map(Number);
    if (partes.length === 3) {
        agendaInteligenteDate = new Date(partes[0], partes[1] - 1, partes[2]);
        agendaModoVisao = 'dia';
        localStorage.setItem('agendaModoVisao', 'dia');
        agendaModoCompleto = false;
        renderizarAgendaInteligente();
    }
}

// ============================================
// IR PARA HOJE - RESPEITA A VISÃO ATUAL
// ============================================

function irAgendaHoje() {
    agendaInteligenteDate = new Date();
    if (agendaModoVisao === 'semana') {
        agendaModoCompleto = true;
    } else if (agendaModoVisao === 'dia') {
        agendaModoCompleto = false;
    }
    renderizarAgendaInteligente();
}
// ============================================
// ABRIR DETALHES DO SLOT
// ============================================

function abrirDetalhesSlot(dataStr, hora) {
    const hmC = horaParaMinutos(hora);
    const noSlot = [];
    const ids = new Set();

    for (let ag of agendaInteligenteData) {
        if (ag.data !== dataStr || ag.status === 'cancelado' || !ag.hora) continue;
        const ini = horaParaMinutos(ag.hora);
        let dur = 30;
        if (ag.servico_id) {
            const s = window.servicosListGlobal?.find(x => x.id === ag.servico_id);
            if (s && s.duracao) dur = parseInt(s.duracao);
        }
        if (hmC >= ini && hmC < ini + dur) {
            noSlot.push(ag);
            if (ag.profissional_id) {
                ids.add(String(ag.profissional_id));
            } else {
                const dono = agendaInteligenteProfissionais.find(p => p.is_dono);
                if (dono) ids.add(String(dono.id));
            }
        }
    }

    if (noSlot.length === 0) {
        abrirAgendamentoInteligente(dataStr, hora);
        return;
    }

    let htmlO = '', htmlD = '';
    for (let p of agendaInteligenteProfissionais) {
        const oc = ids.has(String(p.id));
        const ag = noSlot.find(a =>
            (a.profissional_id && String(a.profissional_id) === String(p.id)) ||
            (!a.profissional_id && p.is_dono)
        );
        if (oc) {
            const dur = ag ? (() => {
                let d = 30;
                const s = window.servicosListGlobal?.find(x => x.id === ag.servico_id);
                if (s && s.duracao) d = parseInt(s.duracao);
                return d;
            })() : 30;
            htmlO += `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(239,68,68,0.08);border-radius:8px;margin-bottom:4px;font-size:13px;"><span>🔴 ${p.nome}</span><span style="color:var(--text-muted);">${ag?.cliente_nome || 'Cliente'} ${ag?.hora} (${dur}min)</span></div>`;
        } else {
            htmlD += `<div onclick="agendarNoHorarioDisponivel('${dataStr}','${hora}','${p.id}')" style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.15);border-radius:8px;margin-bottom:4px;cursor:pointer;font-size:13px;"><span>🟢 ${p.nome}</span><span style="color:#22c55e;font-weight:600;">Agendar →</span></div>`;
        }
    }

    const dataLocal = criarDataLocal(dataStr);
    const modal = `
        <div id="modalDetalhesSlot" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target.id==='modalDetalhesSlot') fecharModalDetalhesSlot()">
            <div style="background:var(--bg-card);border-radius:16px;padding:20px;width:100%;max-width:360px;max-height:80vh;overflow:auto;">
                <div style="display:flex;justify-content:space-between;margin-bottom:14px;">
                    <h3 style="margin:0;font-size:18px;">📅 ${dataLocal.toLocaleDateString('pt-BR')}</h3>
                    <h3 style="margin:0;font-size:18px;color:var(--text-muted);">${hora}</h3>
                    <button onclick="fecharModalDetalhesSlot()" style="background:none;border:none;font-size:22px;cursor:pointer;">×</button>
                </div>
                <div style="margin-bottom:8px;">
                    <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">OCUPADOS</div>
                    ${htmlO}
                </div>
                <div style="margin-bottom:12px;">
                    <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">DISPONÍVEIS</div>
                    ${htmlD || '<p style="font-size:12px;color:var(--text-muted);text-align:center;">Nenhum disponível</p>'}
                </div>
                <button onclick="fecharModalDetalhesSlot()" style="width:100%;padding:10px;background:var(--bg-hover);border:1px solid var(--border-color);border-radius:8px;font-weight:600;cursor:pointer;">Fechar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
}

function fecharModalDetalhesSlot() {
    const m = document.getElementById('modalDetalhesSlot');
    if (m) m.remove();
}

function agendarNoHorarioDisponivel(dataStr, hora, profId) {
    fecharModalDetalhesSlot();
    setTimeout(() => abrirAgendamentoInteligente(dataStr, hora, profId), 150);
}

// ============================================
// ABRIR AGENDAMENTO INTELIGENTE - CORRIGIDA
// ============================================

async function abrirAgendamentoInteligente(data, hora, profissionalIdPre = null) {
    let dataStr = typeof data === 'string' ? data : String(data);
    let horaStr = typeof hora === 'string' ? hora : String(hora);

    if (!dataStr || !dataStr.includes('-')) {
        showToast('❌ Data inválida', 'error');
        return;
    }

    // 🔥 FIX: adicionar T00:00:00 para evitar bug de fuso horário (UTC vs local)
    const diaSem = new Date(dataStr + 'T00:00:00').getDay();
    const cfg = agendaInteligenteHorarios.find(h => h.dia_semana === diaSem);
    if (!cfg || !(cfg.aberto == 1 || cfg.aberto == true)) {
        showToast('🚫 Esse dia está fechado!', 'error');
        return;
    }

    if (typeof window.abrirModalAgendamentoDono === 'function') {
        window.abrirModalAgendamentoDono(dataStr, horaStr, profissionalIdPre);
    } else {
        showToast('❌ Modal não carregado', 'error');
    }
}
// ============================================
// FUNÇÕES DE NAVEGAÇÃO DA AGENDA
// ============================================

function alternarModoAgenda() {
    agendaModoCompleto = !agendaModoCompleto;
    renderizarAgendaInteligente();
}

// ============================================
// CARREGAR DASHBOARD PRINCIPAL
// ============================================

async function carregarDashboard() {
    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('dashboard');
    }
    ativarBotao('dashboard');
    showLoading();

    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const isSuperAdmin = usuario.role === 'super_admin' || usuario.role === 'superadmin';

    try {
        if (isSuperAdmin) {
            await carregarDashboardSuperAdmin();
        } else {
            await carregarDashboardDono();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        document.getElementById('content').innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar dashboard</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarDashboard()">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    hideLoading();
}

// ============================================
// CARREGAR DASHBOARD DONO - VERSÃO LIMPA (SEM INLINE)
// ============================================

async function carregarDashboardDono() {
    // 🔥 FORÇAR CARREGAMENTO DO CSS (com cache-busting)
    let cssLink = document.querySelector('link[href*="dashboard.css"]');
    const novaUrl = '/css/pages/dashboard.css?v=' + Date.now();

    if (cssLink) {
        cssLink.href = novaUrl;
    } else {
        cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = novaUrl;
        document.head.appendChild(cssLink);
    }

    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('dashboard');
    }

    const token = localStorage.getItem('token');
    let empresa = { plano: 'trial', assinatura_ativa: 0 };

    try {
        const er = await fetch('/api/empresa/dados', { headers: { 'Authorization': 'Bearer ' + token } });
        const ed = await er.json();
        if (ed.success) empresa = ed.data;
    } catch { }

    let despesasHoje = 0;
    try {
        const dr = await fetch('/api/despesas/resumo', { headers: { 'Authorization': 'Bearer ' + token } });
        const dd = await dr.json();
        if (dd.success) despesasHoje = dd.data?.total_despesas || 0;
    } catch { }

    const [agR, clR, fiR, prR] = await Promise.all([
        fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/financeiro', { headers: { 'Authorization': 'Bearer ' + token } }),
        fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const agendamentos = (await agR.json()).data || [];
    const clientes = (await clR.json()).data || [];
    const financeiro = (await fiR.json()).data || {};
    const profissionais = (await prR.json()).data || [];

    const planoAtual = empresa.plano || 'trial';
    const assinaturaAtiva = (empresa.assinatura_ativa == 1 || empresa.assinatura_ativa == true);

    let mostrarAviso = false, diasRest = 0, msgTrial = '';
    if (!assinaturaAtiva && planoAtual === 'trial' && empresa.trial_expira) {
        const hoje = new Date();
        const exp = new Date(empresa.trial_expira);
        diasRest = Math.ceil((exp - hoje) / (1000 * 60 * 60 * 24));
        if (diasRest > 0 && diasRest <= 45) {
            mostrarAviso = true;
            msgTrial = `⚠️ ${diasRest} dias restantes de teste.`;
        }
    }
    if (assinaturaAtiva) mostrarAviso = false;

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const pendentes = agendamentos.filter(a => a.status === 'pendente');
    const concluidos = agendamentos.filter(a => a.status === 'concluido');

    const dataAtual = new Date();
    const primeiroDia = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
    const primeiroDiaStr = `${primeiroDia.getFullYear()}-${String(primeiroDia.getMonth() + 1).padStart(2, '0')}-${String(primeiroDia.getDate()).padStart(2, '0')}`;

    const faturamentoMes = agendamentos
        .filter(a => a.status === 'concluido' && a.data >= primeiroDiaStr)
        .reduce((s, a) => s + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);

    const isNewUser = agendamentos.length === 0 && clientes.length === 0;
    const usuarioAtual = JSON.parse(localStorage.getItem('usuario') || '{}');
    const nomeUsuario = usuarioAtual?.nome || 'Usuário';
    const isMobile = window.innerWidth < 768;

    const hojeObj = hojeLocal();
    const vencidos = agendamentos.filter(a => {
        if (a.status !== 'pendente') return false;
        const dataAg = criarDataLocal(a.data);
        return dataAg < hojeObj;
    });

    const faturamentoHoje = agendamentos
        .filter(a => a.data === hojeStr && a.status === 'concluido')
        .reduce((s, a) => s + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);
    const lucroHoje = faturamentoHoje - despesasHoje;
    const agHojeCount = agendamentos.filter(a => a.data === hojeStr).length;
    const agPendHoje = agendamentos.filter(a => a.data === hojeStr && a.status === 'pendente').length;

    let ticketMedio = 0;
    if (concluidos.length > 0) {
        const tot = concluidos.reduce((s, a) => s + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);
        ticketMedio = tot / concluidos.length;
    }

    // ==========================================
    // HTML - SEM ESTILOS INLINE (CSS EXTERNO MANDA)
    // ==========================================

    let html = `<div class="fade-in dash-wrapper">`;

    // ALERTAS
    if (mostrarAviso) {
        html += `
            <div class="dash-alert dash-alert-warning">
                <div class="dash-alert-content">
                    <span class="dash-alert-icon">⚠️</span>
                    <span class="dash-alert-title">${msgTrial}</span>
                </div>
                <button class="dash-btn" onclick="carregarPlanos()">Upgrade →</button>
            </div>
        `;
    }

    if (vencidos.length > 0) {
        html += `
            <div class="dash-alert dash-alert-danger">
                <div class="dash-alert-content">
                    <span class="dash-alert-icon">⏰</span>
                    <span class="dash-alert-title">${vencidos.length} vencido${vencidos.length > 1 ? 's' : ''}</span>
                </div>
                <button class="dash-btn" onclick="concluirAgendamentosVencidos()">Concluir</button>
            </div>
        `;
    }

    // HEADER BEM-VINDO
    html += `
        <div class="dash-welcome">
            <div class="dash-welcome-left">
                <div class="greeting-text">
                    👋 Olá, <strong>${escapeHtml(nomeUsuario)}</strong>
                    <span class="greeting-emoji">🎉</span>
                </div>
                <div class="date-text">
                    📅 ${dataAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>
            <div class="revenue-box">
                <div class="revenue-value">R$ ${formatarMoeda(faturamentoHoje)}</div>
                <div class="revenue-label">
                    <i class="fas fa-calendar-day"></i> Faturamento de hoje
                </div>
            </div>
        </div>
    `;

    // CARDS DE RESUMO
    html += `
        <div class="dash-cards-grid">
            <div class="dash-card-green">
                <div class="card-number">${agHojeCount}</div>
                <div class="card-label">📋 Agendamentos</div>
                ${agPendHoje > 0 ? `<div class="card-sub">${agPendHoje} pendente${agPendHoje > 1 ? 's' : ''}</div>` : ''}
            </div>
            <div class="dash-card-purple">
                <div class="card-number">R$ ${formatarMoeda(ticketMedio)}</div>
                <div class="card-label">🎯 Ticket Médio</div>
            </div>
            <div class="dash-card-yellow">
                <div class="card-number">${clientes.length}</div>
                <div class="card-label">👤 Clientes</div>
            </div>
        </div>
    `;

    // AGENDA DO DIA
    html += `
        <div class="agenda-section">
            <div class="agenda-header">
                <h3 class="agenda-title">
                    <i class="fas fa-calendar-alt"></i> Agenda do Dia
                    <span class="count">${agHojeCount} hoje</span>
                </h3>
                <button class="btn-ver-todos" onclick="carregarAgendamentos()">
                    Ver todos →
                </button>
            </div>
            <div id="agendaInteligenteContainer" class="agenda-container">
                <div class="agenda-loading">
                    <div class="loading-spinner"></div>
                    <p>Carregando agenda...</p>
                </div>
            </div>
        </div>
    `;

    // PRÓXIMOS ATENDIMENTOS
    const proximos = agendamentos
        .filter(a => a.status === 'pendente' && a.data >= hojeStr)
        .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
        .slice(0, isMobile ? 2 : 4);

    if (proximos.length > 0) {
        html += `
            <div class="proximos-container">
                <div class="proximos-header">
                    <i class="fas fa-clock"></i> Próximos Atendimentos
                    <span class="count">(${proximos.length})</span>
                </div>
                <div class="proximos-list">
                    ${proximos.map(ag => `
                        <div class="proximo-item">
                            <div class="proximo-cliente-info">
                                <span class="proximo-cliente">${escapeHtml(ag.cliente_nome || 'Cliente')}</span>
                                <span class="proximo-servico">${escapeHtml(ag.servico_nome || ag.servico || 'Serviço')}</span>
                            </div>
                            <div class="proximo-info">
                                <span class="proximo-data">${formatarDataLocal(ag.data)} ${ag.hora || ''}</span>
                                <span class="proximo-status">⏳</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ONBOARDING
    if (isNewUser) {
        html += `
            <div class="onboarding-container">
                <div class="onboarding-content">
                    <span class="onboarding-icon">🚀</span>
                    <div>
                        <h4 class="onboarding-title">Comece aqui!</h4>
                        <p class="onboarding-desc">Cadastre serviços e crie seu primeiro agendamento</p>
                    </div>
                </div>
                <button class="onboarding-btn" onclick="carregarServicos()">
                    Começar →
                </button>
            </div>
        `;
    }

    html += `</div>`;

    document.getElementById('content').innerHTML = html;

    setTimeout(() => carregarAgendaInteligente(), 200);

    console.log('✅ Dashboard renderizado com sucesso!');
}
// ============================================
// CARREGAR DASHBOARD SUPER ADMIN
// ============================================

async function carregarDashboardSuperAdmin() {
    if (typeof window.carregarCSS === 'function') {
        window.carregarCSS('dashboard');
    }
    ativarBotao('dashboard');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        const [empresasRes, usuariosRes, estatisticasRes] = await Promise.all([
            fetch('/api/admin/empresas', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/usuarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/admin/estatisticas', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const empresasData = await empresasRes.json();
        const usuariosData = await usuariosRes.json();
        const estatisticasData = await estatisticasRes.json();

        const empresas = empresasData.data || [];
        const usuarios = usuariosData.data || [];
        const estatisticas = estatisticasData.data || {};

        renderizarDashboardSuperAdmin(empresas, usuarios, estatisticas);

    } catch (error) {
        console.error('❌ Erro ao carregar dashboard Super Admin:', error);
        document.getElementById('content').innerHTML = `
            <div class="card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar dashboard</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary btn-sm" onclick="carregarDashboardSuperAdmin()">
                        <i class="fas fa-sync"></i> Tentar Novamente
                    </button>
                </div>
            </div>
        `;
    }

    hideLoading();
}

// ============================================
// RENDERIZAR DASHBOARD SUPER ADMIN
// ============================================

function renderizarDashboardSuperAdmin(empresas, usuarios, estatisticas) {
    const isMobile = window.innerWidth < 768;

    const totalEmpresas = empresas.length;
    const totalUsuarios = usuarios.length;
    const empresasAtivas = empresas.filter(e => e.assinatura_ativa || e.plano !== 'trial').length;
    const empresasTrial = empresas.filter(e => e.plano === 'trial').length;
    const totalClientes = empresas.reduce((acc, e) => acc + (e.total_clientes || 0), 0);
    const totalAgendamentos = empresas.reduce((acc, e) => acc + (e.total_agendamentos || 0), 0);

    const planosCount = {};
    empresas.forEach(e => {
        const plano = e.plano || 'trial';
        planosCount[plano] = (planosCount[plano] || 0) + 1;
    });

    const faturamentoTotal = estatisticas.faturamento_total || 0;

    let html = `
        <div class="fade-in">
            <div class="dashboard-header" style="flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'flex-start' : 'center'}; gap:${isMobile ? '8px' : '0'};">
                <div>
                    <h2 class="page-title" style="font-size:${isMobile ? '20px' : '24px'};">👑 Dashboard Administrativo</h2>
                    <p class="page-subtitle" style="font-size:${isMobile ? '13px' : '14px'};">Visão geral de todas as empresas do sistema</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="carregarDashboardSuperAdmin()"><i class="fas fa-sync"></i> Atualizar</button>
                    <button class="btn btn-success btn-sm" onclick="executarAcao('carregarEmpresas')"><i class="fas fa-building"></i> Gerenciar</button>
                </div>
            </div>

            <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(5,1fr)'};gap:${isMobile ? '8px' : '12px'};margin-bottom:${isMobile ? '12px' : '16px'};">
                <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;padding:${isMobile ? '12px' : '16px'};color:white;text-align:center;">
                    <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;">${totalEmpresas}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.8;">🏢 Empresas</div>
                    <div style="font-size:${isMobile ? '8px' : '10px'};opacity:0.6;">${empresasAtivas} ativas</div>
                </div>
                <div style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:12px;padding:${isMobile ? '12px' : '16px'};color:white;text-align:center;">
                    <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;">${totalUsuarios}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.8;">👥 Usuários</div>
                </div>
                <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px;padding:${isMobile ? '12px' : '16px'};color:white;text-align:center;">
                    <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;">${totalClientes}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.8;">👤 Clientes</div>
                </div>
                <div style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);border-radius:12px;padding:${isMobile ? '12px' : '16px'};color:white;text-align:center;">
                    <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;">${totalAgendamentos}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.8;">📅 Agend.</div>
                </div>
                <div style="background:linear-gradient(135deg,#ec4899,#be185d);border-radius:12px;padding:${isMobile ? '12px' : '16px'};color:white;text-align:center;">
                    <div style="font-size:${isMobile ? '20px' : '28px'};font-weight:800;">R$ ${faturamentoTotal.toFixed(2)}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.8;">💰 Faturamento</div>
                </div>
            </div>

            <div class="card" style="padding:${isMobile ? '12px' : '16px'};">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <h3 style="font-size:${isMobile ? '15px' : '17px'};margin:0;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-building"></i> Empresas
                        <span style="font-size:12px;color:var(--text-muted);font-weight:400;">(${totalEmpresas})</span>
                    </h3>
                    <button class="btn btn-primary btn-sm" onclick="executarAcao('carregarEmpresas')">
                        <i class="fas fa-arrow-right"></i> Ver Todas
                    </button>
                </div>
                <div style="overflow-x:auto;">
                    <table class="data-table" style="font-size:12px;width:100%;min-width:500px;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Empresa</th>
                                <th>Plano</th>
                                <th>👥</th>
                                <th>📅</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${empresas.slice(0, 8).map(e => `
                                <tr>
                                    <td>${e.id}</td>
                                    <td><strong>${escapeHtml(e.nome || 'Sem nome')}</strong></td>
                                    <td>
                                        <span style="background:${e.plano === 'pro' ? '#f59e0b' : e.plano === 'business' ? '#8b5cf6' : e.plano === 'enterprise' ? '#ec4899' : '#6b7280'};color:white;padding:1px 8px;border-radius:10px;font-size:10px;">
                                            ${e.plano || 'trial'}
                                        </span>
                                    </td>
                                    <td>${e.total_clientes || 0}</td>
                                    <td>${e.total_agendamentos || 0}</td>
                                    <td>
                                        <span style="padding:1px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${e.assinatura_ativa ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${e.assinatura_ativa ? '#22c55e' : '#ef4444'};">
                                            ${e.assinatura_ativa ? '✅' : '⏳'}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                            ${empresas.length === 0 ? `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Nenhuma empresa</td></tr>` : ''}
                            ${empresas.length > 8 ? `<tr><td colspan="6" style="text-align:center;padding:6px;font-size:11px;color:var(--text-muted);">+ ${empresas.length - 8} outras</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;
    console.log('✅ Dashboard Super Admin renderizado');
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function carregarServicos() {
    executarAcao('servicos');
}

function carregarAgendamentos() {
    executarAcao('agendamentos');
}

function carregarClientes() {
    executarAcao('clientes');
}

function carregarPlanos() {
    executarAcao('planos');
}

// ============================================
// RESIZE EVENT
// ============================================

let agendaResizeTimeout = null;
window.addEventListener('resize', function () {
    if (agendaResizeTimeout) clearTimeout(agendaResizeTimeout);
    agendaResizeTimeout = setTimeout(function () {
        const mobile = isMobileScreen();
        const novo = !mobile;
        if (agendaModoCompleto !== novo) {
            agendaModoCompleto = novo;
            const c = document.getElementById('agendaInteligenteContainer');
            if (c && c.innerHTML && !c.innerHTML.includes('Carregando')) renderizarAgendaInteligente();
        }
        agendaResizeTimeout = null;
    }, 300);
});

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================

window.carregarDashboard = carregarDashboard;
window.carregarAgendaInteligente = carregarAgendaInteligente;
window.abrirAgendamentoInteligente = abrirAgendamentoInteligente;
window.abrirDetalhesSlot = abrirDetalhesSlot;
window.fecharModalDetalhesSlot = fecharModalDetalhesSlot;
window.agendarNoHorarioDisponivel = agendarNoHorarioDisponivel;
window.mudarAgendaSemana = mudarAgendaSemana;
window.irAgendaHoje = irAgendaHoje;
window.renderizarAgendaInteligente = renderizarAgendaInteligente;
window.alternarModoAgenda = alternarModoAgenda;
window.concluirAgendamentosVencidos = concluirAgendamentosVencidos;
window.irParaDiaDisponivel = irParaDiaDisponivel;
window.carregarServicos = carregarServicos;
window.carregarAgendamentos = carregarAgendamentos;
window.carregarClientes = carregarClientes;
window.carregarPlanos = carregarPlanos;


console.log('✅ dashboard.js COMPLETO - Agenda em destaque com navegação inteligente');