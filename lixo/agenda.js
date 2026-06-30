// ============================================
// AGENDA VISUAL - ESTILO MICROSOFT OUTLOOK
// Versão 2.0 - Integrada ao Dashboard
// ============================================

let agendaData = [];
let viewMode = 'dia';
let currentDate = new Date();
let horariosFuncionamento = [];
let profissionaisAtivos = [];
let agendaClientes = [];
let agendaServicos = [];
let agendaLimiteProfissionais = 1;
let agendaCarregando = false;

// ============================================
// CARREGAR AGENDA (DENTRO DO DASHBOARD)
// ============================================

async function carregarAgenda() {
    ativarBotao('agenda');
    showLoading();
    agendaCarregando = true;
    const token = localStorage.getItem('token');

    try {
        // Buscar dados necessários
        const [horariosRes, profissionaisRes, empresaRes, clientesRes, servicosRes, agendamentosRes] = await Promise.all([
            fetch('/api/horarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/empresa/dados', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/servicos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        horariosFuncionamento = (await horariosRes.json()).data || [];
        profissionaisAtivos = (await profissionaisRes.json()).data?.filter(p => p.ativo === 1) || [];
        agendaClientes = (await clientesRes.json()).data || [];
        agendaServicos = (await servicosRes.json()).data || [];
        agendaData = (await agendamentosRes.json()).data || [];

        const empresaData = await empresaRes.json();
        agendaLimiteProfissionais = empresaData.success ? (empresaData.data.limite_profissionais || 1) : 1;

        // Renderizar HTML da Agenda
        const html = gerarHTMLAgenda();
        document.getElementById('content').innerHTML = html;

        // Renderizar a grade
        renderizarGrade();

    } catch (error) {
        console.error('❌ Erro ao carregar agenda:', error);
        document.getElementById('content').innerHTML = `
            <div class="fade-in">
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar agenda</p>
                    <button onclick="carregarAgenda()" class="btn btn-primary">Tentar Novamente</button>
                </div>
            </div>
        `;
    }

    hideLoading();
    agendaCarregando = false;
}

// ============================================
// GERAR HTML DA AGENDA - ESTILO OUTLOOK
// ============================================

function gerarHTMLAgenda() {
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    const dataAtual = currentDate;
    const titulo = viewMode === 'dia'
        ? `${diasSemana[dataAtual.getDay()]}, ${dataAtual.getDate()} de ${meses[dataAtual.getMonth()]} ${dataAtual.getFullYear()}`
        : viewMode === 'semana'
            ? `Semana de ${dataAtual.toLocaleDateString('pt-BR')}`
            : `${meses[dataAtual.getMonth()]} ${dataAtual.getFullYear()}`;

    const totalProfissionais = profissionaisAtivos.length;

    return `
        <div class="fade-in">
            <!-- CABEÇALHO DA AGENDA -->
            <div class="agenda-outlook-header">
                <div class="agenda-titulo-area">
                    <h2 class="page-title" style="font-size: 22px; margin: 0;">
                        <i class="fas fa-calendar-alt" style="color: var(--primary);"></i> 
                        Agenda
                    </h2>
                    <span class="agenda-data-titulo">${titulo}</span>
                    <span class="agenda-prof-count">
                        <i class="fas fa-users"></i> ${totalProfissionais} prof.
                    </span>
                </div>
                <div class="agenda-acoes">
                    <button class="btn btn-primary btn-sm" onclick="abrirModalAgendamentoDono()" style="padding: 6px 14px; font-size: 12px;">
                        <i class="fas fa-plus"></i> Novo
                    </button>
                </div>
            </div>

            <!-- BARRA DE NAVEGAÇÃO -->
            <div class="agenda-outlook-nav">
                <div class="nav-left">
                    <button class="btn-nav-outlook" onclick="navegarAgenda(-1)" title="Anterior">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="btn-nav-outlook btn-hoje" onclick="irParaHoje()" title="Hoje">
                        <i class="fas fa-calendar-day"></i> Hoje
                    </button>
                    <button class="btn-nav-outlook" onclick="navegarAgenda(1)" title="Próximo">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="nav-right">
                    <button class="agenda-view-btn ${viewMode === 'dia' ? 'active' : ''}" onclick="mudarView('dia')">Dia</button>
                    <button class="agenda-view-btn ${viewMode === 'semana' ? 'active' : ''}" onclick="mudarView('semana')">Semana</button>
                    <button class="agenda-view-btn ${viewMode === 'mes' ? 'active' : ''}" onclick="mudarView('mes')">Mês</button>
                </div>
            </div>

            <!-- CORPO DA AGENDA -->
            <div class="card agenda-outlook-card" style="padding: 0; overflow: hidden; margin-bottom: 12px;">
                <div id="agendaGradeContainer" style="overflow-x: auto; overflow-y: auto; max-height: 520px;">
                    <!-- Renderizado via JavaScript -->
                </div>
            </div>

            <!-- LEGENDA -->
            <div class="agenda-outlook-legenda">
                <span><span class="legenda-dot disponivel"></span> Disponível</span>
                <span><span class="legenda-dot ocupado"></span> Ocupado</span>
                <span><span class="legenda-dot almoco"></span> Almoço</span>
                <span><span class="legenda-dot fechado"></span> Fechado</span>
                <span><span class="legenda-dot lotado"></span> Lotado</span>
                <span style="margin-left: auto; font-size: 12px; color: var(--text-muted);">
                    <i class="fas fa-mouse-pointer"></i> Clique no horário para agendar
                </span>
            </div>
        </div>
    `;
}

// ============================================
// RENDERIZAR GRADE
// ============================================

function renderizarGrade() {
    const container = document.getElementById('agendaGradeContainer');
    if (!container) return;

    if (viewMode === 'dia') {
        renderizarDiaOutlook(container);
    } else if (viewMode === 'semana') {
        renderizarSemanaOutlook(container);
    } else {
        renderizarMesOutlook(container);
    }
}

// ============================================
// RENDERIZAR DIA - ESTILO OUTLOOK
// ============================================

function renderizarDiaOutlook(container) {
    const dataStr = currentDate.toISOString().split('T')[0];
    const diaSemana = currentDate.getDay();

    const horarioDia = horariosFuncionamento.find(h => h.dia_semana === diaSemana);

    if (!horarioDia || !horarioDia.aberto) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;">
                <i class="fas fa-store-slash" style="font-size:48px;color:var(--text-muted);opacity:0.3;"></i>
                <h3 style="margin:16px 0 8px;color:var(--text-secondary);">Estabelecimento Fechado</h3>
                <p style="color:var(--text-muted);">${currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
        `;
        return;
    }

    const horaInicio = horarioDia.hora_inicio || '08:00';
    const horaFim = horarioDia.hora_fim || '18:00';
    const almocoInicio = horarioDia.almoco_inicio || '12:00';
    const almocoFim = horarioDia.almoco_fim || '13:00';

    const horarios = gerarHorariosDoDia(horaInicio, horaFim, almocoInicio, almocoFim);
    const profs = profissionaisAtivos;
    const totalProfs = profs.length;

    // Mapear ocupações
    const agendamentosDia = agendaData.filter(a => a.data === dataStr && a.status !== 'cancelado');
    const ocupacoes = {};
    const clientesPorHorario = {};

    for (let ag of agendamentosDia) {
        if (!ocupacoes[ag.hora]) ocupacoes[ag.hora] = [];
        if (ag.profissional_id) {
            ocupacoes[ag.hora].push(ag.profissional_id);
            clientesPorHorario[ag.hora + '_' + ag.profissional_id] = ag.cliente_nome || 'Cliente';
        }
    }

    // Verificar se tem almoço
    const temAlmoco = almocoInicio && almocoFim;

    let html = `
        <table class="agenda-outlook-table">
            <thead>
                <tr>
                    <th class="agenda-col-hora">Horário</th>
                    ${profs.map(p => `
                        <th class="agenda-col-prof">
                            <span class="prof-avatar">${p.nome.charAt(0).toUpperCase()}</span>
                            <span class="prof-nome">${p.nome.length > 10 ? p.nome.substring(0, 10) + '…' : p.nome}</span>
                        </th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    for (let hora of horarios) {
        const ocupados = ocupacoes[hora] || [];
        const totalOcupados = ocupados.length;
        const isAlmoco = temAlmoco && hora >= almocoInicio && hora < almocoFim;

        html += `<tr>`;
        html += `<td class="agenda-cell-hora ${isAlmoco ? 'almoco' : ''}">${hora}</td>`;

        for (let prof of profs) {
            const ocupado = ocupados.includes(prof.id);
            const disponivel = totalOcupados < totalProfs && !ocupado && !isAlmoco;
            const cliente = clientesPorHorario[hora + '_' + prof.id] || '';

            let classe = 'agenda-cell-prof';
            let status = '';
            let onClick = '';
            let title = '';

            if (isAlmoco) {
                classe += ' almoco';
                status = '🍽️';
                title = 'Horário de almoço';
                onClick = '';
            } else if (!disponivel && !ocupado) {
                classe += ' lotado';
                status = '⛔';
                title = 'Todos os profissionais ocupados';
                onClick = '';
            } else if (ocupado) {
                classe += ' ocupado';
                status = '🔴';
                title = `${hora} - ${cliente || 'Ocupado'}`;
                onClick = '';
            } else {
                classe += ' disponivel';
                status = '🟢';
                title = `${hora} - Disponível`;
                onClick = `onclick="abrirAgendamentoRapido('${dataStr}','${hora}','${prof.id}')"`;
            }

            html += `
                <td class="${classe}" ${onClick} title="${title}">
                    <span class="status-icon">${status}</span>
                    ${ocupado ? `<span class="cliente-nome">${cliente.substring(0, 12)}</span>` : ''}
                    ${disponivel ? `<span class="disponivel-text">Disponível</span>` : ''}
                    ${isAlmoco ? `<span class="almoco-text">Almoço</span>` : ''}
                    ${!disponivel && !ocupado && !isAlmoco ? `<span class="lotado-text">Lotado</span>` : ''}
                </td>
            `;
        }

        html += `</tr>`;
    }

    html += `
            </tbody>
        </table>
    `;

    // Adicionar resumo
    const totalAgendamentos = agendamentosDia.length;
    const totalHorarios = horarios.length;
    const ocupadosCount = Object.values(ocupacoes).reduce((sum, arr) => sum + arr.filter(id => id).length, 0);

    html += `
        <div class="agenda-outlook-resumo">
            <span><strong>${totalAgendamentos}</strong> agendamentos</span>
            <span><strong>${ocupadosCount}</strong> horários ocupados</span>
            <span><strong>${totalHorarios - ocupadosCount}</strong> disponíveis</span>
        </div>
    `;

    container.innerHTML = html;
}

// ============================================
// RENDERIZAR SEMANA - ESTILO OUTLOOK
// ============================================

function renderizarSemanaOutlook(container) {
    const inicioSemana = new Date(currentDate);
    inicioSemana.setDate(currentDate.getDate() - currentDate.getDay());

    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioSemana);
        d.setDate(inicioSemana.getDate() + i);
        dias.push(d);
    }

    const horariosBase = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00'];

    const hoje = new Date().toISOString().split('T')[0];

    let html = `
        <table class="agenda-outlook-table agenda-semana">
            <thead>
                <tr>
                    <th class="agenda-col-hora">Horário</th>
                    ${dias.map(d => {
        const dataStr = d.toISOString().split('T')[0];
        const isHoje = dataStr === hoje;
        return `
                            <th class="agenda-col-dia ${isHoje ? 'hoje' : ''}">
                                <span class="dia-semana">${d.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                                <span class="dia-numero">${d.getDate()}</span>
                            </th>
                        `;
    }).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    for (let hora of horariosBase) {
        html += `<tr>`;
        html += `<td class="agenda-cell-hora">${hora}</td>`;

        for (let d of dias) {
            const dataStr = d.toISOString().split('T')[0];
            const diaSemana = d.getDay();
            const horarioDia = horariosFuncionamento.find(h => h.dia_semana === diaSemana);
            const estaAberto = horarioDia && horarioDia.aberto;

            const noAlmoco = estaAberto && hora >= (horarioDia?.almoco_inicio || '12:00') && hora < (horarioDia?.almoco_fim || '13:00');

            const agendamentosDia = agendaData.filter(a => a.data === dataStr && a.status !== 'cancelado');
            const ocupado = agendamentosDia.some(a => a.hora === hora);
            const totalOcupados = agendamentosDia.filter(a => a.hora === hora).length;
            const disponivel = estaAberto && !noAlmoco && !ocupado && totalOcupados < profissionaisAtivos.length;

            let classe = 'agenda-cell-semana';
            let status = '';
            let onClick = '';
            let title = '';

            if (!estaAberto) {
                classe += ' fechado';
                status = '🔒';
                title = 'Fechado';
            } else if (noAlmoco) {
                classe += ' almoco';
                status = '🍽️';
                title = 'Almoço';
            } else if (ocupado) {
                classe += ' ocupado';
                status = '🔴';
                title = `${hora} - Ocupado`;
            } else if (disponivel) {
                classe += ' disponivel';
                status = '🟢';
                title = `${hora} - Disponível`;
                onClick = `onclick="abrirAgendamentoRapido('${dataStr}','${hora}')"`;
            } else {
                classe += ' lotado';
                status = '⛔';
                title = 'Lotado';
            }

            html += `
                <td class="${classe}" ${onClick} title="${title}">
                    <span class="status-icon">${status}</span>
                </td>
            `;
        }

        html += `</tr>`;
    }

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// ============================================
// RENDERIZAR MÊS - ESTILO OUTLOOK
// ============================================

function renderizarMesOutlook(container) {
    const ano = currentDate.getFullYear();
    const mes = currentDate.getMonth();

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const primeiroDiaSemana = primeiroDia.getDay();

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hoje = new Date().toISOString().split('T')[0];

    let html = `
        <table class="agenda-outlook-table agenda-mes">
            <thead>
                <tr>
                    ${diasSemana.map(d => `<th class="agenda-mes-cabecalho">${d}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;

    let diaAtual = 1;
    let primeiraLinha = true;

    while (diaAtual <= diasNoMes) {
        html += `<tr>`;

        for (let i = 0; i < 7; i++) {
            if (primeiraLinha && i < primeiroDiaSemana) {
                html += `<td class="agenda-mes-vazio"></td>`;
            } else if (diaAtual > diasNoMes) {
                html += `<td class="agenda-mes-vazio"></td>`;
            } else {
                const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
                const isHoje = dataStr === hoje;
                const diaSemana = new Date(ano, mes, diaAtual).getDay();
                const horarioDia = horariosFuncionamento.find(h => h.dia_semana === diaSemana);
                const estaAberto = horarioDia && horarioDia.aberto;

                const agendamentosDia = agendaData.filter(a => a.data === dataStr && a.status !== 'cancelado');
                const totalAgendamentos = agendamentosDia.length;

                let classes = 'agenda-mes-dia';
                if (isHoje) classes += ' hoje';
                if (!estaAberto) classes += ' fechado';
                if (totalAgendamentos > 0) classes += ' com-agendamento';

                html += `
                    <td class="${classes}" onclick="mudarViewParaDia('${dataStr}')">
                        <span class="dia-numero">${diaAtual}</span>
                        ${totalAgendamentos > 0 ? `<span class="dia-badge">${totalAgendamentos}</span>` : ''}
                        ${!estaAberto ? `<span class="dia-fechado-icon">🔒</span>` : ''}
                    </td>
                `;
                diaAtual++;
            }
        }

        html += `</tr>`;
        primeiraLinha = false;
    }

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

// ============================================
// ABRIR AGENDAMENTO RÁPIDO (COM DATA/HORA PRÉ-SET)
// ============================================

function abrirAgendamentoRapido(data, hora, profissionalId = null) {
    console.log(`📝 Agendamento rápido: ${data} às ${hora}${profissionalId ? ` - Prof: ${profissionalId}` : ''}`);

    // Usar a função existente do agendamentos.js
    if (typeof abrirModalAgendamentoDono === 'function') {

        // Primeiro, garantir que os dados estão carregados
        if (typeof carregarDadosAgendamento === 'function') {
            carregarDadosAgendamento().then(() => {
                abrirModalComDadosPreSet(data, hora, profissionalId);
            });
        } else {
            abrirModalComDadosPreSet(data, hora, profissionalId);
        }

    } else {
        showToast('Função de agendamento não disponível', 'warning');
    }
}

function abrirModalComDadosPreSet(data, hora, profissionalId) {
    // Abrir o modal
    abrirModalAgendamentoDono();

    // Definir os valores após o modal ser renderizado
    setTimeout(() => {
        const dataInput = document.getElementById('dataAgendamentoDono');
        const horaSelect = document.getElementById('horaAgendamentoDono');
        const profSelect = document.getElementById('profissionalIdDono');

        // Definir data
        if (dataInput) {
            dataInput.value = data;
            // Disparar evento para carregar horários
            if (typeof dataInput.dispatchEvent === 'function') {
                dataInput.dispatchEvent(new Event('change'));
            }
        }

        // Definir profissional (se veio)
        if (profSelect && profissionalId) {
            setTimeout(() => {
                for (let opt of profSelect.options) {
                    if (opt.value == profissionalId) {
                        profSelect.value = profissionalId;
                        break;
                    }
                }
            }, 100);
        }

        // Definir horário
        setTimeout(() => {
            if (horaSelect) {
                // Primeiro, tentar selecionar diretamente
                let encontrou = false;
                for (let opt of horaSelect.options) {
                    if (opt.value === hora) {
                        horaSelect.value = hora;
                        encontrou = true;
                        break;
                    }
                }

                // Se não encontrou, recarregar horários
                if (!encontrou && typeof carregarHorariosDisponiveisDono === 'function') {
                    carregarHorariosDisponiveisDono();
                    setTimeout(() => {
                        for (let opt of horaSelect.options) {
                            if (opt.value === hora) {
                                horaSelect.value = hora;
                                break;
                            }
                        }
                    }, 400);
                }
            }
        }, 300);

        showToast(`📅 Agendamento para ${formatarDataBr(data)} às ${hora}`, 'info');

    }, 200);
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
// ============================================

function navegarAgenda(direcao) {
    if (viewMode === 'dia') {
        currentDate.setDate(currentDate.getDate() + direcao);
    } else if (viewMode === 'semana') {
        currentDate.setDate(currentDate.getDate() + (direcao * 7));
    } else {
        currentDate.setMonth(currentDate.getMonth() + direcao);
    }
    carregarAgenda();
}

function irParaHoje() {
    currentDate = new Date();
    carregarAgenda();
}

function mudarView(modo) {
    viewMode = modo;
    carregarAgenda();
}

function mudarViewParaDia(dataStr) {
    currentDate = new Date(dataStr + 'T00:00:00');
    viewMode = 'dia';
    carregarAgenda();
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function gerarHorariosDoDia(horaInicio, horaFim, almocoInicio, almocoFim) {
    const horarios = [];
    if (!horaInicio || !horaFim) return horarios;

    const inicioMin = horaParaMinutos(horaInicio);
    const fimMin = horaParaMinutos(horaFim);
    const almocoInicioMin = horaParaMinutos(almocoInicio || '12:00');
    const almocoFimMin = horaParaMinutos(almocoFim || '13:00');
    const intervalo = 30;

    for (let minutos = inicioMin; minutos < fimMin; minutos += intervalo) {
        if (minutos >= almocoInicioMin && minutos < almocoFimMin) continue;
        horarios.push(minutosParaHora(minutos));
    }
    return horarios;
}

function horaParaMinutos(hora) {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
}

function minutosParaHora(minutos) {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    return `${h}:${m}`;
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

function carregarDadosAgendamento() {
    // Função já existe no dashboard.js
    if (typeof window.carregarDadosAgendamento === 'function') {
        return window.carregarDadosAgendamento();
    }
    return Promise.resolve();
}

// ============================================
// EXPORTAR FUNÇÕES
// ============================================

window.carregarAgenda = carregarAgenda;
window.carregarAgendaVisual = carregarAgenda;
window.navegarAgenda = navegarAgenda;
window.irParaHoje = irParaHoje;
window.mudarView = mudarView;
window.mudarViewParaDia = mudarViewParaDia;
window.abrirAgendamentoRapido = abrirAgendamentoRapido;

console.log('✅ agenda.js (estilo Outlook) carregado!');