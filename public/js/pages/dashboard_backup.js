// ============================================
// DASHBOARD.JS - VERSÃO MINIMALISTA COM AGENDA EM DESTAQUE
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
// RENDERIZAR AGENDA INTELIGENTE - CORRIGIDA (TODOS OS HORÁRIOS)
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
        container.innerHTML = `<div style="text-align:center;padding:30px;"><p style="color:var(--text-muted);">👨‍💼 Nenhum profissional cadastrado</p></div>`;
        return;
    }
    if (!agendaInteligenteHorarios || agendaInteligenteHorarios.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:30px;"><p style="color:var(--text-muted);">⏰ Horários não configurados</p></div>`;
        return;
    }

    // Gerar dias da semana
    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(agendaInteligenteDate);
        d.setDate(agendaInteligenteDate.getDate() + i);
        dias.push(d);
    }

    // ============================================
    // VERSÃO MOBILE - TODOS OS HORÁRIOS
    // ============================================
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
            container.innerHTML = `<div style="text-align:center;padding:30px;"><div style="font-size:40px;">🚫</div><p style="margin-top:8px;font-weight:600;">${dia.toLocaleDateString('pt-BR', { weekday: 'long' })} Fechado</p><p style="font-size:12px;color:var(--text-muted);">Configure o horário de funcionamento</p></div>`;
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

        let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div>
                    <div style="font-size:16px;font-weight:700;">${dia.toLocaleDateString('pt-BR', { weekday: 'long' })}</div>
                    <div style="font-size:12px;color:var(--text-muted);">${dia.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</div>
                </div>
                <button onclick="alternarModoAgenda()" style="background:var(--bg-card);border:1px solid var(--border-color);padding:6px 12px;border-radius:16px;font-size:11px;font-weight:600;cursor:pointer;">📅 Semana</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;max-height:400px;overflow-y:auto;padding-right:4px;">
        `;

        // 🔥 MOSTRAR TODOS OS HORÁRIOS (não apenas os primeiros 6)
        for (let hora of base) {
            const alm = horDia && hora >= (horDia.almoco_inicio || '12:00') && hora < (horDia.almoco_fim || '13:00');
            if (alm) {
                html += `<div style="background:rgba(245,158,11,0.08);border-radius:8px;padding:8px 12px;border-left:3px solid #f59e0b;font-size:13px;color:#f59e0b;">🍽 ${hora} — Almoço</div>`;
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
            const txt = liv === 0 ? '🔴 LOTADO' : liv === tot ? '🟢 LIVRE' : `🟡 ${ocup}/${tot}`;
            
            html += `
                <div onclick="abrirDetalhesSlot('${dataStr}','${hora}')" style="
                    background:${cls === 'livre' ? 'rgba(34,197,94,0.06)' : cls === 'parcial' ? 'rgba(245,158,11,0.06)' : 'rgba(239,68,68,0.06)'};
                    border-radius:8px;
                    padding:8px 12px;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    cursor:pointer;
                    border-left:3px solid ${cls === 'livre' ? '#22c55e' : cls === 'parcial' ? '#f59e0b' : '#ef4444'};
                ">
                    <span style="font-weight:600;font-size:14px;">${hora}</span>
                    <span style="font-weight:700;font-size:12px;color:${cls === 'livre' ? '#22c55e' : cls === 'parcial' ? '#f59e0b' : '#ef4444'};">${txt}</span>
                </div>
            `;
        }

        html += `
            </div>
            <div style="display:flex;gap:6px;margin-top:10px;">
                <button onclick="mudarAgendaSemana(-1)" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border-color);background:transparent;font-size:11px;cursor:pointer;">◀️ Ontem</button>
                <button onclick="irAgendaHoje()" style="flex:1;padding:8px;border-radius:8px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:11px;font-weight:600;cursor:pointer;">📌 Hoje</button>
                <button onclick="mudarAgendaSemana(1)" style="flex:1;padding:8px;border-radius:8px;border:1px solid var(--border-color);background:transparent;font-size:11px;cursor:pointer;">Amanhã ▶️</button>
            </div>
        `;
        container.innerHTML = html;
        return;
    }

    // ============================================
    // VERSÃO DESKTOP - TODOS OS HORÁRIOS
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

    let html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-size:13px;font-weight:600;color:var(--text-secondary);">
                📅 ${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
            <div style="display:flex;gap:4px;">
                <button onclick="mudarAgendaSemana(-7)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border-color);background:transparent;font-size:10px;cursor:pointer;">◀◀</button>
                <button onclick="mudarAgendaSemana(-1)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border-color);background:transparent;font-size:10px;cursor:pointer;">◀</button>
                <button onclick="irAgendaHoje()" style="padding:4px 10px;border-radius:4px;border:none;background:linear-gradient(135deg,#667eea,#764ba2);color:white;font-size:10px;font-weight:600;cursor:pointer;">Hoje</button>
                <button onclick="mudarAgendaSemana(1)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border-color);background:transparent;font-size:10px;cursor:pointer;">▶</button>
                <button onclick="mudarAgendaSemana(7)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--border-color);background:transparent;font-size:10px;cursor:pointer;">▶▶</button>
            </div>
        </div>
        <div id="agendaScrollWrapper" style="overflow-x:auto;max-height:500px;overflow-y:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:650px;">
                <thead>
                    <tr>
                        <th style="padding:6px 4px;background:var(--bg-hover);text-align:center;position:sticky;top:0;z-index:10;min-width:55px;font-weight:700;font-size:11px;">⏰</th>
    `;

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
        html += `
            <th style="padding:6px 4px;background:${bg};color:${col};text-align:center;position:sticky;top:0;z-index:5;min-width:65px;">
                <span style="display:block;font-size:9px;opacity:0.7;">${nd}</span>
                <span style="font-size:${isH ? '16px' : '13px'};font-weight:800;display:block;">${dn}</span>
                ${!ab ? '<span style="font-size:7px;color:#ef4444;display:block;">🚫</span>' : ''}
            </th>
        `;
    }
    html += `</tr></thead><tbody>`;

    // 🔥 MOSTRAR TODOS OS HORÁRIOS (sem filtro)
    for (let idx = 0; idx < base.length; idx++) {
        const hora = base[idx];
        const isAgora = (idx === idxAtual);
        html += `
            <tr style="${isAgora ? 'background:rgba(102,126,234,0.06);' : ''}">
                <td style="padding:4px 4px;text-align:center;border-bottom:1px solid var(--border-color);font-weight:700;background:${isAgora ? 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' : 'var(--bg-hover)'};color:${isAgora ? '#fff' : 'var(--text-primary)'};position:sticky;left:0;z-index:3;min-width:55px;font-size:11px;">
                    ${isAgora ? '<span style="font-size:7px;display:block;background:rgba(255,255,255,0.25);padding:1px 4px;border-radius:6px;margin-bottom:2px;">AGORA</span>' : ''}
                    ${hora}
                </td>
    `;

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

            const dataLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const passou = dataLocal < hojeLocalObj;
            const alm = ab && hora >= (horD?.almoco_inicio || '12:00') && hora < (horD?.almoco_fim || '13:00');

            if (!ab || !dentro) {
                bg = 'rgba(107,114,128,0.03)';
                cont = `<span style="color:#9ca3af;">—</span>`;
            } else if (passou) {
                bg = 'rgba(107,114,128,0.03)';
                cont = `<span style="opacity:0.2;">✓</span>`;
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
                    bg = 'rgba(239,68,68,0.08)';
                    cont = `<span style="color:#dc2626;font-weight:700;font-size:13px;">🔴</span>`;
                    click = `abrirDetalhesSlot('${ds}','${hora}')`;
                } else if (ocup > 0) {
                    bg = 'rgba(245,158,11,0.06)';
                    cont = `<span style="color:#d97706;font-weight:700;font-size:13px;">🟡</span>`;
                    click = `abrirDetalhesSlot('${ds}','${hora}')`;
                } else {
                    bg = 'rgba(34,197,94,0.06)';
                    cont = `<span style="color:#22c55e;font-weight:700;font-size:13px;">🟢</span>`;
                    click = `abrirDetalhesSlot('${ds}','${hora}')`;
                }
            }
            html += `
                <td style="padding:4px 4px;border-bottom:1px solid var(--border-color);background:${bg};text-align:center;${click ? 'cursor:pointer;' : ''}font-weight:700;font-size:13px;" onclick="${click}">
                    ${cont}
                </td>
            `;
        }
        html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    html += `
        <div style="display:flex;justify-content:center;gap:16px;margin-top:8px;font-size:10px;color:var(--text-muted);">
            <span>🟢 Livre</span>
            <span>🟡 Parcial</span>
            <span>🔴 Lotado</span>
        </div>
    `;
    container.innerHTML = html;
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
            htmlO += `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(239,68,68,0.08);border-radius:8px;margin-bottom:4px;font-size:13px;"><span>🔴 ${p.nome}</span><span style="color:var(--text-muted);">${ag?.cliente_nome || 'Cliente'} ${ag?.hora}</span></div>`;
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
// ABRIR AGENDAMENTO INTELIGENTE
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

function mudarAgendaSemana(dir) {
    agendaInteligenteDate.setDate(agendaInteligenteDate.getDate() + dir);
    renderizarAgendaInteligente();
}

function irAgendaHoje() {
    agendaInteligenteDate = new Date();
    if (agendaModoCompleto && isMobileScreen()) agendaModoCompleto = false;
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
// CARREGAR DASHBOARD DONO - VERSÃO MINIMALISTA
// ============================================

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

    // ==========================================
    // HTML - MINIMALISTA COM AGENDA EM DESTAQUE
    // ==========================================
    
    let html = `<div class="fade-in" style="padding: 4px 0 80px 0;">`;

    // ALERTAS (apenas se necessário)
    if (mostrarAviso) {
        html += `
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:10px;padding:10px 14px;margin-bottom:12px;color:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                <span style="font-weight:600;font-size:${isMobile ? '12px' : '14px'};">${msgTrial}</span>
                <button onclick="carregarPlanos()" style="background:rgba(255,255,255,0.2);border:none;padding:4px 14px;border-radius:6px;color:white;font-weight:600;cursor:pointer;font-size:${isMobile ? '11px' : '13px'};">Upgrade →</button>
            </div>
        `;
    }

    if (vencidos.length > 0) {
        html += `
            <div style="background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:10px;padding:10px 14px;margin-bottom:12px;color:white;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                <span style="font-weight:600;font-size:${isMobile ? '12px' : '14px'};">⏰ ${vencidos.length} vencido${vencidos.length > 1 ? 's' : ''}</span>
                <button onclick="concluirAgendamentosVencidos()" style="background:rgba(255,255,255,0.2);border:none;padding:4px 14px;border-radius:6px;color:white;font-weight:600;cursor:pointer;font-size:${isMobile ? '11px' : '13px'};">Concluir</button>
            </div>
        `;
    }

    // ==========================================
    // HEADER SIMPLES
    // ==========================================
    html += `
        <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: ${isMobile ? '14px 16px' : '16px 24px'};
            margin-bottom: 14px;
            color: white;
            display:flex;
            justify-content:space-between;
            align-items:center;
            flex-wrap:wrap;
            gap:8px;
        ">
            <div>
                <div style="font-size:${isMobile ? '16px' : '18px'};font-weight:700;display:flex;align-items:center;gap:6px;">
                    👋 Olá, ${escapeHtml(nomeUsuario)}
                </div>
                <div style="font-size:${isMobile ? '11px' : '13px'};opacity:0.8;margin-top:2px;">
                    ${dataAtual.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:700;">
                    R$ ${formatarMoeda(faturamentoHoje)}
                </div>
                <div style="font-size:${isMobile ? '10px' : '12px'};opacity:0.7;">
                    <i class="fas fa-calendar-day"></i> Hoje
                </div>
            </div>
        </div>
    `;

    // ==========================================
    // RESUMO RÁPIDO - 3 CARDS
    // ==========================================
    html += `
        <div style="
            display: grid;
            grid-template-columns: ${isMobile ? '1fr 1fr 1fr' : 'repeat(3, 1fr)'};
            gap: ${isMobile ? '6px' : '12px'};
            margin-bottom: 14px;
        ">
            <div style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;padding:${isMobile ? '10px 8px' : '12px 16px'};color:white;text-align:center;">
                <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:700;">${agHojeCount}</div>
                <div style="font-size:${isMobile ? '9px' : '11px'};opacity:0.8;">📋 Agendamentos</div>
                ${agPendHoje > 0 ? `<div style="font-size:${isMobile ? '8px' : '10px'};opacity:0.7;">${agPendHoje} pendente${agPendHoje > 1 ? 's' : ''}</div>` : ''}
            </div>
            <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:10px;padding:${isMobile ? '10px 8px' : '12px 16px'};color:white;text-align:center;">
                <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:700;">R$ ${formatarMoeda(ticketMedio)}</div>
                <div style="font-size:${isMobile ? '9px' : '11px'};opacity:0.8;">🎯 Ticket Médio</div>
            </div>
            <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:10px;padding:${isMobile ? '10px 8px' : '12px 16px'};color:white;text-align:center;">
                <div style="font-size:${isMobile ? '18px' : '24px'};font-weight:700;">${clientes.length}</div>
                <div style="font-size:${isMobile ? '9px' : '11px'};opacity:0.8;">👤 Clientes</div>
            </div>
        </div>
    `;

    // ==========================================
    // AGENDA INTELIGENTE - EM DESTAQUE
    // ==========================================
    html += `
        <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <h3 style="font-size:${isMobile ? '15px' : '17px'};margin:0;display:flex;align-items:center;gap:6px;color:var(--text-primary);">
                    <i class="fas fa-calendar-alt" style="color:#8b5cf6;"></i> Agenda do Dia
                </h3>
                <button onclick="carregarAgendamentos()" style="background:transparent;border:none;color:var(--text-muted);font-size:${isMobile ? '11px' : '13px'};cursor:pointer;">
                    Ver todos →
                </button>
            </div>
            <div id="agendaInteligenteContainer" style="background:var(--bg-card);border-radius:12px;padding:${isMobile ? '10px' : '14px'};border:1px solid var(--border-color);">
                <div style="text-align:center;padding:20px;">
                    <div class="loading-spinner" style="display:block;position:relative;top:0;left:0;transform:none;margin:0 auto;width:28px;height:28px;"></div>
                    <p style="margin-top:8px;font-size:12px;color:var(--text-muted);">Carregando agenda...</p>
                </div>
            </div>
        </div>
    `;

    // ==========================================
    // PRÓXIMOS ATENDIMENTOS (resumido)
    // ==========================================
    const proximos = agendamentos
        .filter(a => a.status === 'pendente' && a.data >= hojeStr)
        .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
        .slice(0, isMobile ? 2 : 3);

    if (proximos.length > 0) {
        html += `
            <div style="background:var(--bg-card);border-radius:10px;padding:${isMobile ? '10px 12px' : '12px 16px'};border:1px solid var(--border-color);">
                <div style="font-size:${isMobile ? '11px' : '13px'};font-weight:600;color:var(--text-muted);margin-bottom:8px;">
                    <i class="fas fa-clock" style="color:#f59e0b;"></i> Próximos
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${proximos.map(ag => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg-hover);border-radius:6px;border-left:3px solid #8b5cf6;">
                            <span style="font-weight:500;font-size:${isMobile ? '12px' : '13px'};">
                                ${escapeHtml(ag.cliente_nome || 'Cliente')}
                            </span>
                            <span style="font-size:${isMobile ? '10px' : '12px'};color:var(--text-muted);">
                                ${formatarDataLocal(ag.data)} ${ag.hora || ''}
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ==========================================
    // ONBOARDING (para novos usuários)
    // ==========================================
    if (isNewUser) {
        html += `
            <div style="
                margin-top:14px;
                background:linear-gradient(135deg,#667eea,#764ba2);
                border-radius:12px;
                padding:${isMobile ? '14px' : '16px 20px'};
                color:white;
                display:flex;
                justify-content:space-between;
                align-items:center;
                flex-wrap:wrap;
                gap:10px;
            ">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:28px;">🚀</span>
                    <div>
                        <h4 style="margin:0;font-size:${isMobile ? '14px' : '16px'};">Comece aqui!</h4>
                        <p style="margin:2px 0 0 0;opacity:0.8;font-size:${isMobile ? '11px' : '13px'};">Cadastre serviços e crie seu primeiro agendamento</p>
                    </div>
                </div>
                <button onclick="carregarServicos()" style="background:rgba(255,255,255,0.2);border:none;padding:6px 16px;border-radius:8px;color:white;font-weight:700;font-size:${isMobile ? '12px' : '14px'};cursor:pointer;">
                    Começar →
                </button>
            </div>
        `;
    }

    html += `</div>`;

    document.getElementById('content').innerHTML = html;
    
    // Carregar agenda
    setTimeout(() => carregarAgendaInteligente(), 200);

    console.log('✅ Dashboard minimalista renderizado com sucesso!');
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
window.carregarServicos = carregarServicos;
window.carregarAgendamentos = carregarAgendamentos;
window.carregarClientes = carregarClientes;
window.carregarPlanos = carregarPlanos;

console.log('✅ dashboard.js MINIMALISTA - Agenda em destaque');