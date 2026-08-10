// ============================================
// DASHBOARD.JS - VERSÃO FINAL CORRIGIDA
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
// 🔥 FUNÇÕES DE DATA CORRIGIDAS (SEM UTC)
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
// RENDERIZAR AGENDA INTELIGENTE - CORRIGIDO
// ============================================

function renderizarAgendaInteligente() {
    const isMobile = isMobileScreen();
    const container = document.getElementById('agendaInteligenteContainer');
    if (!container) return;
    if (!agendaInteligenteDate) agendaInteligenteDate = new Date();

    const hoje = new Date();
    const hojeLocalObj = hojeLocal();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

    if (!agendaInteligenteProfissionais || agendaInteligenteProfissionais.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;"><p>Nenhum profissional</p></div>`;
        return;
    }
    if (!agendaInteligenteHorarios || agendaInteligenteHorarios.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;"><p>Horários não configurados</p></div>`;
        return;
    }

    // Gerar dias da semana usando data local
    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(agendaInteligenteDate);
        d.setDate(agendaInteligenteDate.getDate() + i);
        dias.push(d);
    }

    if (isMobile && !agendaModoCompleto) {
        const dia = dias.find(d => {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return ds === hojeStr;
        }) || dias[0];
        const dataStr = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
        const diaSem = dia.getDay();
        const horDia = agendaInteligenteHorarios.find(h => h.dia_semana === diaSem);
        const aberto = horDia && (horDia.aberto == 1 || horDia.aberto == true);

        if (!aberto) {
            container.innerHTML = `<div style="text-align:center;padding:40px;"><div style="font-size:48px;">🚫</div><h3 style="margin:10px 0;">${dia.toLocaleDateString('pt-BR', { weekday: 'long' })} Fechado</h3><p style="color:var(--text-muted);">Esse dia está bloqueado nas configurações</p><button onclick="mudarAgendaSemana(1)" class="agenda-nav-btn" style="margin-top:12px;">Ver próximo dia →</button></div>`;
            return;
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
        const totalAg = agendaInteligenteData.filter(a => a.data === dataStr && a.status !== 'cancelado').length;
        let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><div><div style="font-size:18px;font-weight:800;text-transform:capitalize;">${dia.toLocaleDateString('pt-BR', { weekday: 'long' })}</div><div style="font-size:12px;color:var(--text-muted);">${dia.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} • ${totalAg} ag.</div></div><button onclick="alternarModoAgenda()" style="background:var(--bg-card);border:1px solid var(--border-color);padding:8px 14px;border-radius:20px;font-size:12px;font-weight:700;">📅 Semana</button></div><div class="agenda-mobile-list">`;

        for (let hora of base) {
            const alm = horDia && hora >= (horDia.almoco_inicio || '12:00') && hora < (horDia.almoco_fim || '13:00');
            if (alm) {
                html += `<div class="agenda-mobile-card is-almoco"><span>🍽 ${hora} — Almoço</span></div>`;
                continue;
            }
            let ocup = 0;
            const hm = horaParaMinutos(hora);
            for (let p of agendaInteligenteProfissionais) {
                let oc = false;
                if (p.is_dono) {
                    for (let ag of agendaInteligenteData) {
                        if (ag.data !== dataStr || ag.status === 'cancelado' || (ag.profissional_id !== null && ag.profissional_id !== '' && ag.profissional_id !== undefined) || !ag.hora) continue;
                        const agH = horaParaMinutos(ag.hora);
                        let dur = 30;
                        if (ag.servico_id) {
                            const s = window.servicosListGlobal?.find(x => x.id === ag.servico_id);
                            if (s && s.duracao) dur = parseInt(s.duracao);
                        }
                        if (hm >= agH && hm < agH + dur) { oc = true; break; }
                    }
                } else {
                    oc = isHorarioOcupadoComDuracao(agendaInteligenteData, p.id, dataStr, hora);
                }
                if (oc) ocup++;
            }
            const tot = agendaInteligenteProfissionais.length;
            const liv = tot - ocup;
            const cls = liv === 0 ? 'lotado' : ocup > 0 ? 'parcial' : 'livre';
            const txt = liv === 0 ? 'LOTADO' : liv === tot ? `${liv} LIVRE` : `${ocup}/${tot} OCUP.`;
            const sub = liv === 0 ? 'Toque para ver detalhes' : liv === tot ? 'Toque para agendar' : `${liv} vagas`;
            html += `<div class="agenda-mobile-card is-${cls}" onclick="abrirDetalhesSlot('${dataStr}','${hora}')"><div class="m-card-left"><span class="m-hora">${hora}</span><span class="m-status-dot dot-${cls}"></span></div><div class="m-card-center"><span class="m-status-text text-${cls}">${txt}</span><span class="m-sub">${sub}</span></div><div class="m-card-right"><i class="fas fa-chevron-right"></i></div></div>`;
        }
        html += `</div><div style="display:flex;gap:8px;margin-top:12px;"><button onclick="mudarAgendaSemana(-1)" class="agenda-nav-btn" style="flex:1;padding:12px;">◀️ Ontem</button><button onclick="irAgendaHoje()" class="agenda-today-btn" style="flex:1;padding:12px;">📌 Hoje</button><button onclick="mudarAgendaSemana(1)" class="agenda-nav-btn" style="flex:1;padding:12px;">Amanhã ▶️</button></div>`;
        container.innerHTML = html;
        return;
    }

    // ============================================
    // DESKTOP - CORRIGIDO
    // ============================================

    const horaAtual = hoje.getHours();
    const minAtual = hoje.getMinutes();
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
    let idxAtual = 0;
    const totMin = horaAtual * 60 + minAtual;
    for (let i = 0; i < base.length; i++) {
        const [h, m] = base[i].split(':').map(Number);
        if ((h * 60 + m) >= totMin) { idxAtual = i; break; }
    }
    const cellPad = isMobile ? '6px 4px' : '10px 8px';
    const fSize = isMobile ? '10px' : '12px';
    const minW = isMobile ? '500px' : '750px';

    let html = `<div style="margin-bottom:10px;"><span style="font-size:13px;font-weight:600;color:var(--text-secondary);"><i class="fas fa-calendar-day"></i> 📅 Semana</span></div>`;
    html += `<div id="agendaScrollWrapper" class="agenda-scroll-wrapper"><table style="width:100%;border-collapse:collapse;font-size:${fSize};min-width:${minW};"><thead><tr><th style="padding:12px 10px;background:var(--bg-hover);text-align:center;position:sticky;top:0;z-index:10;min-width:70px;"><i class="fas fa-clock"></i></th>`;

    for (let d of dias) {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const isH = ds === hojeStr;
        const nd = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const dn = d.getDate();
        const diaSem = d.getDay();
        const horD = agendaInteligenteHorarios.find(h => h.dia_semana === diaSem);
        const ab = horD && (horD.aberto == 1 || horD.aberto == true);
        const bg = isH ? 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' : ab ? 'var(--bg-hover)' : 'rgba(239,68,68,0.08)';
        const col = isH ? '#fff' : ab ? 'var(--text-secondary)' : '#ef4444';
        const agD = agendaInteligenteData.filter(a => a.data === ds && a.status !== 'cancelado').length;
        html += `<th style="padding:12px 6px;background:${bg};color:${col};text-align:center;position:sticky;top:0;z-index:5;min-width:90px;"><span style="display:block;font-size:10px;opacity:0.7;">${nd}</span><span style="font-size:${isH ? '22px' : '18px'};font-weight:800;display:block;">${dn}</span>${!ab ? '<span style="font-size:8px;color:#ef4444;display:block;">🚫 FECHADO</span>' : ''}${ab && agD > 0 ? `<span style="font-size:8px;background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:8px;">${agD} ag.</span>` : ''}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let idx = 0; idx < base.length; idx++) {
        const hora = base[idx];
        const isAgora = (idx === idxAtual);
        html += `<tr data-hora="${hora}" style="${isAgora ? 'background:linear-gradient(90deg,rgba(102,126,234,0.12),transparent);' : ''}"><td style="padding:${cellPad};text-align:center;border-bottom:1px solid var(--border-color);font-weight:700;background:${isAgora ? 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' : 'var(--bg-hover)'};color:${isAgora ? '#fff' : 'var(--text-primary)'};position:sticky;left:0;z-index:3;min-width:70px;">${isAgora ? '<span style="font-size:8px;display:block;background:rgba(255,255,255,0.25);padding:2px 6px;border-radius:10px;margin-bottom:2px;">● AGORA</span>' : ''}${hora}</td>`;

        for (let d of dias) {
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const diaS = d.getDay();
            const horD = agendaInteligenteHorarios.find(h => h.dia_semana === diaS);
            const ab = horD && (horD.aberto == 1 || horD.aberto == true);
            let dentro = true;
            if (ab && horD) {
                const [hI, mI] = (horD.hora_inicio || '08:00').split(':').map(Number);
                const [hF, mF] = (horD.hora_fim || '18:00').split(':').map(Number);
                const [hA, mA] = hora.split(':').map(Number);
                dentro = (hA * 60 + mA) >= (hI * 60 + mI) && (hA * 60 + mA) <= (hF * 60 + mF);
            }
            let cont = '', bg = 'transparent', click = '';

            // 🔥 CORREÇÃO: Comparação usando data local
            const dataLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const passou = dataLocal < hojeLocalObj;

            const alm = ab && hora >= (horD?.almoco_inicio || '12:00') && hora < (horD?.almoco_fim || '13:00');

            if (!ab || !dentro) {
                bg = 'rgba(107,114,128,0.04)';
                cont = `<span style="color:#9ca3af;">—</span>`;
            } else if (passou) {
                bg = 'rgba(107,114,128,0.04)';
                cont = `<span style="opacity:0.3;">⏰</span>`;
            } else if (alm) {
                bg = 'rgba(245,158,11,0.06)';
                cont = `🍽`;
                click = '';
            } else {
                let ocup = 0;
                const hm = horaParaMinutos(hora);
                for (let p of agendaInteligenteProfissionais) {
                    let oc = false;
                    if (p.is_dono) {
                        for (let ag of agendaInteligenteData) {
                            if (ag.data !== ds || ag.status === 'cancelado' || (ag.profissional_id !== null && ag.profissional_id !== '' && ag.profissional_id !== undefined) || !ag.hora) continue;
                            const agH = horaParaMinutos(ag.hora);
                            let dur = 30;
                            if (ag.servico_id) {
                                const s = window.servicosListGlobal?.find(x => x.id === ag.servico_id);
                                if (s && s.duracao) dur = parseInt(s.duracao);
                            }
                            if (hm >= agH && hm < agH + dur) { oc = true; break; }
                        }
                    } else {
                        oc = isHorarioOcupadoComDuracao(agendaInteligenteData, p.id, ds, hora);
                    }
                    if (oc) ocup++;
                }
                const liv = agendaInteligenteProfissionais.length - ocup;
                if (liv === 0) {
                    bg = 'rgba(239,68,68,0.14)';
                    cont = `<span style="color:#dc2626;font-weight:800;">🔴 LOTADO</span>`;
                    click = `abrirDetalhesSlot('${ds}','${hora}')`;
                } else if (ocup > 0) {
                    bg = 'rgba(245,158,11,0.14)';
                    cont = `<span style="color:#d97706;font-weight:800;">${ocup}/${agendaInteligenteProfissionais.length}</span>`;
                    click = `abrirDetalhesSlot('${ds}','${hora}')`;
                } else {
                    bg = 'rgba(16,185,129,0.14)';
                    cont = `<span style="color:#059669;font-weight:800;">🟢 ${liv}</span>`;
                    click = `abrirDetalhesSlot('${ds}','${hora}')`;
                }
            }
            html += `<td style="padding:${cellPad};border-bottom:1px solid var(--border-color);background:${bg};text-align:center;${click ? 'cursor:pointer;' : ''}font-weight:700;" onclick="${click}">${cont}</td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table></div><div class="agenda-footer-bar"><div class="agenda-nav-group"><button onclick="mudarAgendaSemana(-7)" class="agenda-nav-btn">◀️◀️</button><button onclick="mudarAgendaSemana(-1)" class="agenda-nav-btn">◀️</button><span class="agenda-nav-range">${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span><button onclick="mudarAgendaSemana(1)" class="agenda-nav-btn">▶️</button><button onclick="mudarAgendaSemana(7)" class="agenda-nav-btn">▶️▶️</button><button onclick="irAgendaHoje()" class="agenda-today-btn">📌 Hoje</button></div><div class="agenda-legend"><span>🟢 Livre</span><span>🟡 Parcial</span><span>🔴 Lotado</span></div></div>`;
    container.innerHTML = html;
}

// ============================================
// ABRIR DETALHES DO SLOT - CORRIGIDO
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
            htmlO += `<div style="display:flex;justify-content:space-between;padding:10px 12px;background:rgba(239,68,68,0.08);border-radius:10px;margin-bottom:6px;"><div><b>🔴 ${p.nome || p.name}</b><div style="font-size:11px;color:var(--text-muted);">${ag?.cliente_nome || 'Cliente'} • ${ag?.hora} (${dur}min)</div></div></div>`;
        } else {
            htmlD += `<div onclick="agendarNoHorarioDisponivel('${dataStr}','${hora}','${p.id}')" style="display:flex;justify-content:space-between;padding:10px 12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);border-radius:10px;margin-bottom:6px;cursor:pointer;"><span>✅ ${p.nome || p.name}</span><span style="font-size:11px;color:#059669;font-weight:700;">Agendar às ${hora} →</span></div>`;
        }
    }

    // 🔥 CORREÇÃO: Usar criarDataLocal() em vez de new Date(dataStr+'T00:00:00')
    const dataLocal = criarDataLocal(dataStr);
    const modal = `<div id="modalDetalhesSlot" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target.id==='modalDetalhesSlot') fecharModalDetalhesSlot()"><div style="background:var(--bg-card);border-radius:16px;padding:20px;width:100%;max-width:380px;max-height:80vh;overflow:auto;"><div style="display:flex;justify-content:space-between;margin-bottom:16px;"><h3 style="margin:0;">📅 ${dataLocal.toLocaleDateString('pt-BR')} às ${hora}</h3><button onclick="fecharModalDetalhesSlot()" style="background:none;border:none;font-size:22px;cursor:pointer;">×</button></div><div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:800;color:var(--text-muted);">OCUPADOS (${ids.size})</div>${htmlO}</div><div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:800;color:var(--text-muted);">DISPONÍVEIS:</div>${htmlD || '<p style="font-size:12px;color:var(--text-muted);">Nenhum</p>'}</div><button onclick="fecharModalDetalhesSlot()" style="width:100%;padding:12px;background:var(--bg-hover);border:1px solid var(--border-color);border-radius:10px;font-weight:700;">Fechar</button></div></div>`;
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
// ABRIR AGENDAMENTO INTELIGENTE - CORRIGIDO
// ============================================

async function abrirAgendamentoInteligente(data, hora, profissionalIdPre = null) {
    let dataStr = typeof data === 'string' ? data : String(data);
    let horaStr = typeof hora === 'string' ? hora : String(hora);

    if (!dataStr || !dataStr.includes('-')) {
        showToast('❌ Data inválida', 'error');
        return;
    }

    const agora = new Date();
    const [a, me, d] = dataStr.split('-').map(Number);
    const [hN, mN] = horaStr.split(':').map(Number);
    const sel = new Date(a, me - 1, d, hN || 0, mN || 0, 0, 0);

    if (sel < agora) {
        showToast('⏰ Horário já passou!', 'warning');
        return;
    }

    const diaSem = sel.getDay();
    const cfg = agendaInteligenteHorarios.find(h => h.dia_semana === diaSem);
    if (!cfg || !(cfg.aberto == 1 || cfg.aberto == true)) {
        showToast('🚫 Esse dia está fechado nas configurações!', 'error');
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

function mudarAgendaSemana(dir) {
    agendaInteligenteDate.setDate(agendaInteligenteDate.getDate() + dir);
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
// SALVAR AGENDAMENTO DO MODAL
// ============================================

function salvarAgendamentoDoModal(dataOriginal) {
    const cid = document.getElementById('clienteIdDono')?.value;
    const busca = document.getElementById('buscaClienteDono');
    const horaSel = document.getElementById('horaAgendamentoDono');
    const servSel = document.getElementById('servicoIdDono');
    const val = document.getElementById('valorAgendamentoDono');
    const prof = document.getElementById('profissionalIdDono');
    const desc = document.getElementById('servicoDescricaoDono');

    let cliente_id = cid;
    if (!cliente_id && busca && busca.value) {
        const nb = busca.value.trim();
        if (window.clientesList && window.clientesList.length > 0) {
            const enc = window.clientesList.find(c => c.nome.toLowerCase() === nb.toLowerCase());
            if (enc) {
                cliente_id = enc.id;
                document.getElementById('clienteIdDono').value = enc.id;
            }
        }
    }
    if (!cliente_id) { showToast('Selecione um cliente', 'warning'); return; }
    if (!horaSel?.value) { showToast('Selecione horário', 'warning'); return; }

    const agora = new Date();
    const [an, me, di] = dataOriginal.split('-').map(Number);
    const [hN, mN] = horaSel.value.split(':').map(Number);
    const sel = new Date(an, me - 1, di, hN || 0, mN || 0, 0, 0);
    if (sel < agora) { showToast('⏰ Não pode no passado!', 'warning'); return; }

    showLoading();
    const token = localStorage.getItem('token');
    const body = {
        cliente_id: parseInt(cliente_id),
        data: dataOriginal,
        hora: horaSel.value,
        valor: parseFloat(val?.value) || 0
    };
    if (prof?.value) body.profissional_id = parseInt(prof.value);
    if (servSel?.value) body.servico_id = parseInt(servSel.value);
    else if (desc?.value) body.servico = desc.value.trim();

    fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(body)
    }).then(r => r.json()).then(res => {
        hideLoading();
        if (res.success) {
            showToast('✅ Criado!', 'success');
            fecharModalAgendamentoDono();
            agendaInteligenteData = [];
            setTimeout(() => carregarAgendaInteligente(), 500);
        } else showToast('❌ ' + res.message, 'error');
    }).catch(() => {
        hideLoading();
        showToast('❌ Erro', 'error');
    });
}

// public/js / pages / dashboard.js

// ============================================
// CARREGAR DASHBOARD - CORRIGIDO PARA SUPER ADMIN
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
            // 🔥 SUPER ADMIN - Carregar visão de administração
            await carregarDashboardSuperAdmin();
        } else {
            // Dono ou Profissional - Carregar visão normal
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

async function carregarDashboardDono() {
    if (typeof window.carregarCSS === 'function') window.carregarCSS('dashboard');
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
            msgTrial = `⚠️ Período de teste: ${diasRest} dias restantes.`;
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

    const faturamentoMes = agendamentos.filter(a => a.status === 'concluido' && a.data >= primeiroDiaStr).reduce((s, a) => s + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);
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

    const faturamentoHoje = agendamentos.filter(a => a.data === hojeStr && a.status === 'concluido').reduce((s, a) => s + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);
    const lucroHoje = faturamentoHoje - despesasHoje;
    const agHojeCount = agendamentos.filter(a => a.data === hojeStr).length;
    const agPendHoje = agendamentos.filter(a => a.data === hojeStr && a.status === 'pendente').length;

    let ticketMedio = 0;
    if (concluidos.length > 0) {
        const tot = concluidos.reduce((s, a) => s + (parseFloat(a.valor_total) || parseFloat(a.valor) || 0), 0);
        ticketMedio = tot / concluidos.length;
    }
    const clientesHoje = new Set(agendamentos.filter(a => a.data === hojeStr).map(a => a.cliente_id)).size;

    let html = `<div class="fade-in">${mostrarAviso ? `<div class="dash-alert dash-alert-warning"><span style="font-weight:600;font-size:14px;">${msgTrial}</span><button onclick="carregarPlanos()" class="dash-btn dash-btn-light">Fazer upgrade →</button></div>` : ''}
    ${vencidos.length > 0 ? `<div class="dash-alert dash-alert-danger"><div class="dash-alert-left"><span class="dash-alert-icon"><i class="fas fa-clock" style="color:#ef4444;"></i></span><div><span class="dash-alert-title" style="color:#ef4444;">${vencidos.length} vencido${vencidos.length > 1 ? 's' : ''}</span><span class="dash-alert-sub">⏰ Pendentes</span></div></div><button onclick="concluirAgendamentosVencidos()" class="dash-btn dash-btn-danger"><i class="fas fa-check-double"></i> ${isMobile ? 'Concluir' : 'Concluir Todos'}</button></div>` : ''}
    <div class="dash-welcome"><div><h2 class="dash-welcome-title">👋 Olá, ${escapeHtml(nomeUsuario)}!</h2><p class="dash-welcome-sub">${isNewUser ? '💡 Comece cadastrando seus serviços!' : '📊 Seu negócio em um só lugar'}</p></div><div class="dash-welcome-meta"><span class="dash-welcome-date">${dataAtual.toLocaleDateString('pt-BR', { weekday: 'short' })}, ${dataAtual.toLocaleDateString('pt-BR')}</span><span class="dash-welcome-revenue">💰 ${faturamentoMes > 0 ? `R$ ${formatarMoeda(faturamentoMes)} este mês` : 'Nenhum faturamento ainda'}</span></div></div>
    <div class="dash-kpi-grid"><div class="dash-kpi kpi-green"><div class="dash-kpi-icon"><i class="fas fa-sack-dollar"></i></div><div><div class="dash-kpi-value">R$ ${formatarMoeda(faturamentoHoje)}</div><div class="dash-kpi-label">Faturamento Hoje</div></div></div><div class="dash-kpi kpi-red"><div class="dash-kpi-icon"><i class="fas fa-arrow-trend-down"></i></div><div><div class="dash-kpi-value">R$ ${formatarMoeda(despesasHoje)}</div><div class="dash-kpi-label">Despesas Hoje</div></div></div><div class="dash-kpi kpi-purple"><div class="dash-kpi-icon"><i class="fas fa-gem"></i></div><div><div class="dash-kpi-value" style="${lucroHoje < 0 ? 'color:#ef4444;' : ''}">R$ ${formatarMoeda(lucroHoje)}</div><div class="dash-kpi-label">${lucroHoje >= 0 ? 'Lucro Hoje' : 'Prejuízo Hoje'}</div></div></div><div class="dash-kpi kpi-blue"><div class="dash-kpi-icon"><i class="fas fa-clipboard-list"></i></div><div><div class="dash-kpi-value" style="${agPendHoje > 0 ? 'color:#f59e0b;' : ''}">${agHojeCount}</div><div class="dash-kpi-label">Agendamentos Hoje</div>${agPendHoje > 0 ? `<div class="dash-kpi-note" style="color:#f59e0b;">⏳ ${agPendHoje} pendentes</div>` : `<div class="dash-kpi-note" style="color:#22c55e;">✅ Todos concluídos</div>`}</div></div></div>
    <div class="dash-mini-grid"><div class="dash-mini"><div class="dash-mini-value">R$ ${formatarMoeda(ticketMedio)}</div><div class="dash-mini-label">🎯 Ticket Médio</div></div><div class="dash-mini"><div class="dash-mini-value">${clientesHoje}</div><div class="dash-mini-label">👤 Clientes Hoje</div></div><div class="dash-mini" style="${isMobile ? 'display:none;' : ''}"><div class="dash-mini-value">${pendentes.length}</div><div class="dash-mini-label">⏳ Pendentes Total</div></div></div>
    <div class="dash-section"><div class="dash-section-header"><h3 class="dash-section-title"><i class="fas fa-calendar-alt"></i> Agenda Inteligente <span class="dash-tag"><i class="fas fa-info-circle"></i> Clique 🟢</span></h3><button onclick="carregarAgendamentos()" class="dash-link-btn"><i class="fas fa-expand"></i> ${isMobile ? '' : 'Ver Todos'}</button></div><div id="agendaInteligenteContainer"><div style="text-align:center;padding:30px;"><div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:32px;height:32px;"></div><p style="margin-top:10px;font-size:13px;color:var(--text-muted);">Carregando agenda...</p></div></div></div>
    ${isNewUser ? `<div class="dash-onboarding"><i class="fas fa-rocket rocket"></i><div style="flex:1;min-width:180px;"><h4>🚀 Comece aqui!</h4><p>Cadastre serviços, profissionais e crie seu primeiro agendamento.</p></div><button onclick="carregarServicos()" class="dash-btn dash-btn-primary"><i class="fas fa-arrow-right"></i> Começar</button></div>` : ''}
    <div class="dash-section"><div class="dash-section-header"><h4 class="dash-section-title" style="font-size:14px;"><i class="fas fa-calendar-alt"></i> Próximos Atendimentos</h4><button onclick="carregarAgendamentos()" class="dash-link-btn">Ver →</button></div>${agendamentos.filter(a => a.status === 'pendente' && a.data >= hojeStr).length > 0 ? `<div class="dash-list">${agendamentos.filter(a => a.status === 'pendente' && a.data >= hojeStr).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).slice(0, isMobile ? 2 : 4).map(ag => `<div class="dash-list-item"><span class="dash-list-name">${escapeHtml(ag.cliente_nome || 'Cliente')}</span><span class="dash-list-meta">${formatarDataLocal(ag.data)} ${ag.hora || ''}</span><span class="dash-pill ${ag.status === 'pendente' ? 'dash-pill-pending' : 'dash-pill-done'}">${ag.status === 'pendente' ? '⏳' : '✅'}</span></div>`).join('')}</div>` : `<div class="dash-empty"><i class="fas fa-calendar-check"></i> Nenhum pendente</div>`}</div>
    <div class="dash-section" style="margin-bottom:0;"><div class="dash-section-header"><h4 class="dash-section-title" style="font-size:14px;"><i class="fas fa-users"></i> Últimos Clientes</h4><button onclick="carregarClientes()" class="dash-link-btn">Ver →</button></div>${clientes.length > 0 ? `<div class="dash-clients-grid">${clientes.slice(0, isMobile ? 4 : 6).map(c => `<div onclick="editarCliente(${c.id})" class="dash-client-card"><span class="dash-avatar">${c.nome ? c.nome.charAt(0).toUpperCase() : '👤'}</span><div style="flex:1;min-width:0;"><div class="dash-client-name">${escapeHtml(c.nome)}</div><div class="dash-client-sub">${escapeHtml(c.telefone || c.email || 'Sem contato')}</div></div></div>`).join('')}</div>` : `<div class="dash-empty"><i class="fas fa-user-plus"></i> Nenhum cliente</div>`}</div></div>`;
    document.getElementById('content').innerHTML = html;
    setTimeout(() => carregarAgendaInteligente(), 150);
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
        // Buscar dados do Super Admin
        const [empresasRes, usuariosRes, estatisticasRes] = await Promise.all([
            fetch('/api/admin/empresas', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch('/api/admin/usuarios', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch('/api/admin/estatisticas', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
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

    // Calcular estatísticas
    const totalEmpresas = empresas.length;
    const totalUsuarios = usuarios.length;
    const empresasAtivas = empresas.filter(e => e.assinatura_ativa || e.plano !== 'trial').length;
    const empresasTrial = empresas.filter(e => e.plano === 'trial').length;

    // Total de clientes em todas as empresas
    const totalClientes = empresas.reduce((acc, e) => acc + (e.total_clientes || 0), 0);
    const totalAgendamentos = empresas.reduce((acc, e) => acc + (e.total_agendamentos || 0), 0);

    // Contar por plano
    const planosCount = {};
    empresas.forEach(e => {
        const plano = e.plano || 'trial';
        planosCount[plano] = (planosCount[plano] || 0) + 1;
    });

    // Faturamento total
    const faturamentoTotal = estatisticas.faturamento_total || 0;

    let html = `
        <div class="fade-in">
            <!-- HEADER -->
            <div class="dashboard-header" style="flex-direction:${isMobile ? 'column' : 'row'}; align-items:${isMobile ? 'flex-start' : 'center'}; gap:${isMobile ? '8px' : '0'};">
                <div>
                    <h2 class="page-title" style="font-size:${isMobile ? '20px' : '24px'};">
                        👑 Dashboard Administrativo
                    </h2>
                    <p class="page-subtitle" style="font-size:${isMobile ? '13px' : '14px'};">
                        <i class="fas fa-chart-line"></i> 
                        Visão geral de todas as empresas do sistema
                    </p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="carregarDashboardSuperAdmin()">
                        <i class="fas fa-sync"></i> Atualizar
                    </button>
                    <button class="btn btn-success btn-sm" onclick="executarAcao('carregarEmpresas')">
                        <i class="fas fa-building"></i> Gerenciar Empresas
                    </button>
                </div>
            </div>

            <!-- CARDS DE ESTATÍSTICAS -->
            <div style="display:grid;grid-template-columns:${isMobile ? '1fr 1fr' : 'repeat(5,1fr)'};gap:${isMobile ? '8px' : '12px'};margin-bottom:${isMobile ? '12px' : '16px'};">
                
                <!-- Empresas -->
                <div style="background:linear-gradient(135deg, #667eea, #764ba2);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px rgba(102,126,234,0.3);">
                    <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">🏢 Empresas</div>
                    <div style="font-size:${isMobile ? '24px' : '32px'};font-weight:800;margin-top:2px;">${totalEmpresas}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;">${empresasAtivas} ativas • ${empresasTrial} trial</div>
                </div>
                
                <!-- Usuários -->
                <div style="background:linear-gradient(135deg, #22c55e, #16a34a);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px rgba(34,197,94,0.3);">
                    <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">👥 Usuários</div>
                    <div style="font-size:${isMobile ? '24px' : '32px'};font-weight:800;margin-top:2px;">${totalUsuarios}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;">Donos e profissionais</div>
                </div>
                
                <!-- Clientes -->
                <div style="background:linear-gradient(135deg, #f59e0b, #d97706);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px rgba(245,158,11,0.3);">
                    <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">👤 Clientes</div>
                    <div style="font-size:${isMobile ? '24px' : '32px'};font-weight:800;margin-top:2px;">${totalClientes}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;">Em todas as empresas</div>
                </div>
                
                <!-- Agendamentos -->
                <div style="background:linear-gradient(135deg, #8b5cf6, #6d28d9);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px rgba(139,92,246,0.3);">
                    <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">📅 Agendamentos</div>
                    <div style="font-size:${isMobile ? '24px' : '32px'};font-weight:800;margin-top:2px;">${totalAgendamentos}</div>
                    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;">+${estatisticas.agendamentos_mes || 0} este mês</div>
                </div>
                
                <!-- Faturamento -->
<div style="background:linear-gradient(135deg, #ec4899, #be185d);border-radius:${isMobile ? '12px' : '16px'};padding:${isMobile ? '14px' : '18px'};color:white;box-shadow:0 4px 20px rgba(236,72,153,0.3);">
    <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;">💰 Faturamento</div>
    <div style="font-size:${isMobile ? '24px' : '32px'};font-weight:800;margin-top:2px;">
        R$ ${(parseFloat(estatisticas.faturamento_total) || 0).toFixed(2)}
    </div>
    <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;">${estatisticas.empresas_pagas || 0} empresas pagas</div>
</div>

            <!-- GRÁFICOS -->
            <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:${isMobile ? '12px' : '16px'};margin-bottom:${isMobile ? '12px' : '16px'};">
                
                <!-- Gráfico: Empresas por Plano -->
                <div class="card" style="padding:${isMobile ? '12px' : '16px'};">
                    <h4 style="margin:0 0 12px 0;font-size:${isMobile ? '14px' : '16px'};display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-chart-pie" style="color:var(--primary);"></i> Empresas por Plano
                    </h4>
                    <canvas id="graficoPlanos" style="max-height:200px;max-width:100%;"></canvas>
                </div>

                <!-- Gráfico: Crescimento -->
                <div class="card" style="padding:${isMobile ? '12px' : '16px'};">
                    <h4 style="margin:0 0 12px 0;font-size:${isMobile ? '14px' : '16px'};display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-chart-line" style="color:var(--primary);"></i> Crescimento de Empresas
                    </h4>
                    <canvas id="graficoCrescimento" style="max-height:200px;max-width:100%;"></canvas>
                </div>
            </div>

            <!-- LISTA DE EMPRESAS (RESUMO) -->
            <div class="card" style="padding:${isMobile ? '12px' : '16px'};">
                <div class="card-header" style="flex-direction:${isMobile ? 'column' : 'row'};align-items:${isMobile ? 'flex-start' : 'center'};gap:${isMobile ? '8px' : '0'};">
                    <h3 style="font-size:${isMobile ? '16px' : '18px'};margin:0;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-building"></i> Empresas Cadastradas
                        <span style="font-size:12px;color:var(--text-muted);font-weight:400;">(${totalEmpresas})</span>
                    </h3>
                    <button class="btn btn-primary btn-sm" onclick="executarAcao('carregarEmpresas')">
                        <i class="fas fa-arrow-right"></i> Ver Todas
                    </button>
                </div>
                
                <div style="overflow-x:auto;margin-top:12px;">
                    <table class="data-table" style="font-size:13px;width:100%;min-width:600px;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Empresa</th>
                                <th>Plano</th>
                                <th>👤 Usuários</th>
                                <th>👥 Clientes</th>
                                <th>📅 Agend.</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${empresas.slice(0, 10).map(e => `
                                <tr>
                                    <td>${e.id}</td>
                                    <td><strong>${escapeHtml(e.nome || 'Sem nome')}</strong></td>
                                    <td>
                                        <span class="badge" style="background:${e.plano === 'pro' ? '#f59e0b' : e.plano === 'business' ? '#8b5cf6' : e.plano === 'enterprise' ? '#ec4899' : '#6b7280'};color:white;padding:2px 10px;border-radius:12px;font-size:11px;">
                                            ${e.plano || 'trial'}
                                        </span>
                                    </td>
                                    <td>${e.total_usuarios || 0}</td>
                                    <td>${e.total_clientes || 0}</td>
                                    <td>${e.total_agendamentos || 0}</td>
                                    <td>
                                        <span style="padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${e.assinatura_ativa ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${e.assinatura_ativa ? '#22c55e' : '#ef4444'};">
                                            ${e.assinatura_ativa ? '✅ Ativo' : '⏳ Inativo'}
                                        </span>
                                    </td>
                                    <td>
                                        <button onclick="editarEmpresa(${e.id})" class="btn-icon btn-edit" style="padding:4px 8px;border:none;background:rgba(102,126,234,0.1);border-radius:4px;cursor:pointer;color:#667eea;">
                                            <i class="fas fa-pen"></i>
                                        </button>
                                        <button onclick="verDetalhesEmpresa(${e.id})" class="btn-icon btn-view" style="padding:4px 8px;border:none;background:rgba(34,197,94,0.1);border-radius:4px;cursor:pointer;color:#22c55e;">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                            ${empresas.length === 0 ? `
                                <tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted);">Nenhuma empresa cadastrada</td></tr>
                            ` : ''}
                            ${empresas.length > 10 ? `
                                <tr><td colspan="8" style="text-align:center;padding:8px;font-size:12px;color:var(--text-muted);">
                                    + ${empresas.length - 10} outras empresas
                                </td></tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.getElementById('content').innerHTML = html;

    // 🔥 CRIAR GRÁFICOS
    setTimeout(() => {
        criarGraficoPlanos(planosCount);
        criarGraficoCrescimento(empresas);
    }, 300);

    console.log('✅ Dashboard Super Admin renderizado com sucesso!');
}

// ============================================
// FUNÇÃO PARA EDITAR EMPRESA (Super Admin)
// ============================================

async function editarEmpresa(id) {
    // Redirecionar para a página de empresas
    executarAcao('empresas');
    // Se a função carregarEmpresas existir, chamar com o ID para editar
    if (typeof carregarEmpresas === 'function') {
        setTimeout(() => {
            carregarEmpresas(id);
        }, 300);
    }
}
async function carregarDashboardProfissional() {
    console.log('👤 Profissional');
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
// GRÁFICO: EMPRESAS POR PLANO
// ============================================

function criarGraficoPlanos(planosCount) {
    const canvas = document.getElementById('graficoPlanos');
    if (!canvas) return;

    const labels = ['Trial', 'Starter', 'Pro', 'Business', 'Enterprise'];
    const data = labels.map(label => planosCount[label.toLowerCase()] || 0);

    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#6b7280', '#f59e0b', '#667eea', '#8b5cf6', '#ec4899'],
                borderWidth: 2,
                borderColor: '#1e1e2e'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e0e0e0',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

// ============================================
// GRÁFICO: CRESCIMENTO DE EMPRESAS
// ============================================

function criarGraficoCrescimento(empresas) {
    const canvas = document.getElementById('graficoCrescimento');
    if (!canvas) return;

    // Agrupar empresas por data de criação
    const datas = {};
    empresas.forEach(e => {
        if (e.created_at) {
            const data = e.created_at.split('T')[0];
            datas[data] = (datas[data] || 0) + 1;
        }
    });

    const sortedDates = Object.keys(datas).sort();
    const cumulative = [];
    let total = 0;
    sortedDates.forEach(date => {
        total += datas[date];
        cumulative.push(total);
    });

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: sortedDates.map(d => d.split('-')[2] + '/' + d.split('-')[1]),
            datasets: [{
                label: 'Empresas Cadastradas',
                data: cumulative,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102,126,234,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0', font: { size: 10 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#a0a0a0', font: { size: 9 } }
                },
                x: {
                    ticks: { color: '#a0a0a0', font: { size: 9 }, maxTicksLimit: 10 }
                }
            }
        }
    });
}
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// ============================================
// VER DETALHES DA EMPRESA (Super Admin)
// ============================================

function verDetalhesEmpresa(id) {
    showToast(`📊 Carregando detalhes da empresa ${id}...`, 'info');
    // Abrir a página de empresas com o ID selecionado
    executarAcao('carregarEmpresas');
    setTimeout(() => {
        // Tentar selecionar a empresa na lista
        const rows = document.querySelectorAll('#tabelaEmpresas tbody tr');
        rows.forEach(row => {
            if (row.dataset.id == id) {
                row.style.background = 'rgba(102,126,234,0.2)';
                row.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }, 500);
}

// Exportar função global
window.verDetalhesEmpresa = verDetalhesEmpresa;
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
window.salvarAgendamentoDoModal = salvarAgendamentoDoModal;
window.criarDataLocal = criarDataLocal;
window.formatarDataLocal = formatarDataLocal;

console.log('✅ dashboard.js V12 - CORRIGIDO (sem UTC)');