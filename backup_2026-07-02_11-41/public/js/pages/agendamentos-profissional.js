// Agendamentos do Profissional - COM FILTROS, EDIÇÃO E HORÁRIOS DISPONÍVEIS
let clientesListProf = [];
let servicosListProf = [];

async function carregarAgendamentosProfissional() {
    ativarBotao("agendamentos");
    showLoading();
    const token = localStorage.getItem("token");

    try {
        const [clientesRes, servicosRes] = await Promise.all([
            fetch("/api/clientes", { headers: { "Authorization": "Bearer " + token } }),
            fetch("/api/servicos", { headers: { "Authorization": "Bearer " + token } })
        ]);

        const clientesResult = await clientesRes.json();
        if (clientesResult.success) clientesListProf = clientesResult.data;

        const servicosResult = await servicosRes.json();
        if (servicosResult.success) servicosListProf = servicosResult.data;
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        showToast("Erro ao carregar dados", "error");
    }

    let html = `
        <div class="fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 class="page-title">📅 Meus Agendamentos</h2>
                <button class="btn btn-primary" onclick="abrirModalAgendamentoProfissional()">+ Novo Agendamento</button>
            </div>
            
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;">
                    <div>
                        <label>Data Início</label>
                        <input type="date" id="filtroDataInicioProf" class="form-control" style="width: auto;">
                    </div>
                    <div>
                        <label>Data Fim</label>
                        <input type="date" id="filtroDataFimProf" class="form-control" style="width: auto;">
                    </div>
                    <div>
                        <label>Status</label>
                        <select id="filtroStatusProf" class="form-control" style="width: auto;">
                            <option value="todos">Todos</option>
                            <option value="pendente">Pendente</option>
                            <option value="concluido">Concluído</option>
                        </select>
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="aplicarFiltrosAgendamentosProf()">🔍 Filtrar</button>
                        <button class="btn btn-secondary" onclick="limparFiltrosAgendamentosProf()">🗑️ Limpar</button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr><th>Data/Hora</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Sua Comissão</th><th>Status</th><th>Ações</th></tr>
                        </thead>
                        <tbody id="listaAgendamentosProf"></tbody>
                    60
                </div>
            </div>
        </div>
    `;

    document.getElementById("content").innerHTML = html;
    await carregarListaAgendamentosProfComFiltro();
    hideLoading();
}

async function carregarListaAgendamentosProfComFiltro() {
    const token = localStorage.getItem("token");
    const dataInicio = document.getElementById("filtroDataInicioProf")?.value;
    const dataFim = document.getElementById("filtroDataFimProf")?.value;
    const statusFilter = document.getElementById("filtroStatusProf")?.value;

    try {
        const res = await fetch("/api/profissional/agendamentos", {
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();

        if (result.success) {
            let agendamentos = result.data;

            if (dataInicio) agendamentos = agendamentos.filter(a => a.data >= dataInicio);
            if (dataFim) agendamentos = agendamentos.filter(a => a.data <= dataFim);
            if (statusFilter && statusFilter !== "todos") agendamentos = agendamentos.filter(a => a.status === statusFilter);

            agendamentos.sort((a, b) => new Date(b.data) - new Date(a.data));

            const tbody = document.getElementById("listaAgendamentosProf");
            if (!tbody) return;

            if (agendamentos.length === 0) {
                tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>Nenhum agendamento encontrado</td></tr>";
            } else {
                let rows = "";
                for (let a of agendamentos) {
                    let comissaoProfissional = 0;
                    if (a.status === "concluido") {
                        const percent = a.comissao_percent || 30;
                        comissaoProfissional = (a.valor || 0) * (percent / 100);
                    }
                    rows += `
                        <tr>
                            <td>${formatarDataBr(a.data)} ${a.hora || ""}</td>
                            <td><strong>${escapeHtml(a.cliente_nome || "N/A")}</strong></td>
                            <td>${escapeHtml(a.servico_nome || a.servico || "N/A")}</td>
                            <td>R$ ${(a.valor || 0).toFixed(2)}</td>
                            <td>${a.status === "concluido" ? "<strong>R$ " + comissaoProfissional.toFixed(2) + "</strong>" : "--"}</td>
                            <td>${a.status === "concluido" ? '<span class="badge badge-success">Concluído</span>' : '<span class="badge badge-warning">Pendente</span>'}</td>
                            <td class="actions-cell">
                                <button class="btn-icon" onclick="editarAgendamentoProfissional(${a.id})" title="Editar">✏️</button>
                                ${a.status !== "concluido" ? `<button class="btn-icon" onclick="concluirAgendamentoProfissional(${a.id})" title="Concluir" style="color:#10b981;">✅</button>` : ""}
                            </td>
                        </tr>
                    `;
                }
                tbody.innerHTML = rows;
            }
        }
    } catch (error) {
        console.error("Erro:", error);
    }
}

function aplicarFiltrosAgendamentosProf() {
    carregarListaAgendamentosProfComFiltro();
}

function limparFiltrosAgendamentosProf() {
    if (document.getElementById("filtroDataInicioProf")) document.getElementById("filtroDataInicioProf").value = "";
    if (document.getElementById("filtroDataFimProf")) document.getElementById("filtroDataFimProf").value = "";
    if (document.getElementById("filtroStatusProf")) document.getElementById("filtroStatusProf").value = "todos";
    carregarListaAgendamentosProfComFiltro();
}

// MELHORADO: Carregar horários disponíveis com formatação correta
async function carregarHorariosDisponiveisProf() {
    const data = document.getElementById("dataAgendamentoProf").value;
    const horaSelect = document.getElementById("horaAgendamentoProf");

    if (!data) {
        horaSelect.innerHTML = '<option value="">Selecione uma data primeiro</option>';
        return;
    }

    horaSelect.innerHTML = '<option value="">Carregando...</option>';

    const token = localStorage.getItem("token");
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    try {
        const res = await fetch("/api/horarios/disponiveis", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ data: data, profissional_id: usuario.id })
        });
        const result = await res.json();

        if (result.success && result.data.horarios.length > 0) {
            let options = '<option value="">Selecione um horário</option>';
            for (let hora of result.data.horarios) {
                const horaFormatada = formatarHoraCompleta(hora);
                options += `<option value="${horaFormatada}">${horaFormatada}</option>`;
            }
            horaSelect.innerHTML = options;
        } else {
            horaSelect.innerHTML = '<option value="">Nenhum horário disponível neste dia</option>';
        }
    } catch (error) {
        console.error("Erro:", error);
        horaSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
    }
}

function formatarHoraCompleta(hora) {
    if (!hora) return "";
    if (/^\d{2}:\d{2}$/.test(hora)) return hora;
    if (/^\d{1,2}$/.test(hora)) return hora.padStart(2, '0') + ":00";
    return hora;
}

function abrirModalAgendamentoProfissional() {
    let clientesOptions = '<option value="">Selecione...</option>';
    for (let c of clientesListProf) {
        clientesOptions += `<option value="${c.id}">${escapeHtml(c.nome)}</option>`;
    }

    let servicosOptions = '<option value="">Selecione um serviço</option>';
    for (let s of servicosListProf) {
        servicosOptions += `<option value="${s.id}" data-valor="${s.valor}">${escapeHtml(s.nome)} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
    }

    const modalHtml = `
        <div id="modalAgendamentoProfissional" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px; width: 90%;">
                <h3>➕ Novo Agendamento</h3>
                
                <div class="form-group">
                    <label>Cliente *</label>
                    <select id="clienteIdProf" class="form-control" required>
                        ${clientesOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="dataAgendamentoProf" class="form-control" onchange="carregarHorariosDisponiveisProf()">
                </div>
                
                <div class="form-group">
                    <label>Horário *</label>
                    <select id="horaAgendamentoProf" class="form-control">
                        <option value="">Selecione uma data primeiro</option>
                    </select>
                    <small class="text-muted">Horários disponíveis de 30 em 30 minutos</small>
                </div>
                
                <div class="form-group">
                    <label>Serviço</label>
                    <select id="servicoIdProf" class="form-control" onchange="atualizarValorPorServicoProf()">
                        ${servicosOptions}
                    </select>
                    <input type="text" id="servicoAgendamentoProf" class="form-control" style="margin-top: 10px;" placeholder="Ou digite o serviço manualmente">
                </div>
                
                <div class="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" id="valorAgendamentoProf" class="form-control" step="0.01" placeholder="0,00">
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="fecharModalAgendamentoProfissional()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="salvarAgendamentoProfissional()">Salvar</button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("modalAgendamentoProfissional");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function fecharModalAgendamentoProfissional() {
    const modal = document.getElementById("modalAgendamentoProfissional");
    if (modal) modal.remove();
}

function atualizarValorPorServicoProf() {
    const select = document.getElementById("servicoIdProf");
    const selectedOption = select.options[select.selectedIndex];
    const valor = selectedOption.getAttribute("data-valor");
    const nome = selectedOption.text.split(" - ")[0];

    if (valor) {
        document.getElementById("valorAgendamentoProf").value = parseFloat(valor).toFixed(2);
        document.getElementById("servicoAgendamentoProf").value = nome;
    }
}

async function salvarAgendamentoProfissional() {
    const cliente_id = document.getElementById("clienteIdProf").value;
    const data = document.getElementById("dataAgendamentoProf").value;
    const hora = document.getElementById("horaAgendamentoProf").value;
    const servico_id = document.getElementById("servicoIdProf").value;
    const servico = document.getElementById("servicoAgendamentoProf").value;
    const valor = document.getElementById("valorAgendamentoProf").value;

    if (!cliente_id || !data) {
        showToast("Cliente e data são obrigatórios", "warning");
        return;
    }

    if (!hora) {
        showToast("Selecione um horário", "warning");
        return;
    }

    showLoading();

    const token = localStorage.getItem("token");
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const body = {
        cliente_id: parseInt(cliente_id),
        data: data,
        hora: hora,
        valor: parseFloat(valor) || 0,
        profissional_id: usuario.id
    };

    if (servico_id) {
        body.servico_id = parseInt(servico_id);
    } else if (servico) {
        body.servico = servico;
    }

    try {
        const res = await fetch("/api/agendamentos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(body)
        });

        const result = await res.json();

        if (result.success) {
            showToast("Agendamento criado com sucesso!", "success");
            fecharModalAgendamentoProfissional();
            await carregarListaAgendamentosProfComFiltro();
            if (typeof carregarDashboardProfissional === "function") {
                carregarDashboardProfissional();
            }
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        showToast("Erro ao criar agendamento", "error");
    }

    hideLoading();
}

async function concluirAgendamentoProfissional(id) {
    if (!confirm("Concluir este agendamento?")) return;

    showLoading();
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`/api/profissional/agendamentos/${id}/concluir`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();

        if (result.success) {
            showToast(result.message, "success");
            await carregarListaAgendamentosProfComFiltro();
            if (typeof carregarDashboardProfissional === "function") {
                carregarDashboardProfissional();
            }
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        showToast("Erro ao concluir agendamento", "error");
    }

    hideLoading();
}

// Funções auxiliares
function formatarDataBr(dataStr) {
    if (!dataStr) return "-";
    const data = new Date(dataStr + "T00:00:00");
    return data.toLocaleDateString("pt-BR");
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Exportar funções
window.carregarAgendamentosProfissional = carregarAgendamentosProfissional;
window.abrirModalAgendamentoProfissional = abrirModalAgendamentoProfissional;
window.fecharModalAgendamentoProfissional = fecharModalAgendamentoProfissional;
window.salvarAgendamentoProfissional = salvarAgendamentoProfissional;
window.concluirAgendamentoProfissional = concluirAgendamentoProfissional;
window.atualizarValorPorServicoProf = atualizarValorPorServicoProf;
window.aplicarFiltrosAgendamentosProf = aplicarFiltrosAgendamentosProf;
window.limparFiltrosAgendamentosProf = limparFiltrosAgendamentosProf;
window.carregarHorariosDisponiveisProf = carregarHorariosDisponiveisProf;