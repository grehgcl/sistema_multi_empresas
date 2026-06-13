// Agendamentos do Profissional - COM FILTROS, EDIÇÃO E HORÁRIOS DISPONÍVEIS
let clientesListProf = [];
let servicosListProf = [];

async function carregarAgendamentosProfissional() {
    ativarBotao("agendamentos");
    const token = localStorage.getItem("token");

    try {
        const resClientes = await fetch("/api/clientes", {
            headers: { "Authorization": "Bearer " + token }
        });
        const clientesResult = await resClientes.json();
        if (clientesResult.success) {
            clientesListProf = clientesResult.data;
        }

        const resServicos = await fetch("/api/servicos", {
            headers: { "Authorization": "Bearer " + token }
        });
        const servicosResult = await resServicos.json();
        if (servicosResult.success) {
            servicosListProf = servicosResult.data;
        }
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>📅 Meus Agendamentos</h2>
            <button class="btn-green" onclick="abrirModalAgendamentoProfissional()" style="background:#48bb78; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">+ Novo Agendamento</button>
        </div>
        
        <div class="card" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;">
                <div>
                    <label>Data Início</label>
                    <input type="date" id="filtroDataInicioProf" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Data Fim</label>
                    <input type="date" id="filtroDataFimProf" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Status</label>
                    <select id="filtroStatusProf" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="todos">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="concluido">Concluído</option>
                    </select>
                </div>
                <div>
                    <button onclick="aplicarFiltrosAgendamentosProf()" style="background:#667eea;">🔍 Filtrar</button>
                    <button onclick="limparFiltrosAgendamentosProf()" style="background:#a0aec0;">🗑️ Limpar</button>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div style="overflow-x: auto;">
                <table style="width:100%">
                    <thead>
                        <tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Sua Comissão</th><th>Status</th><th>Ações</th></tr>
                    </thead>
                    <tbody id="listaAgendamentosProf"></tbody>
                点化的
            </div>
        </div>
    `;

    document.getElementById("content").innerHTML = html;
    await carregarListaAgendamentosProfComFiltro();
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

            if (dataInicio) {
                agendamentos = agendamentos.filter(a => a.data >= dataInicio);
            }
            if (dataFim) {
                agendamentos = agendamentos.filter(a => a.data <= dataFim);
            }
            if (statusFilter && statusFilter !== "todos") {
                agendamentos = agendamentos.filter(a => a.status === statusFilter);
            }

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
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${new Date(a.data).toLocaleDateString()} ${a.hora || ""}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.cliente_nome || "N/A"}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.servico_nome || a.servico || "N/A"}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">R$ ${(a.valor || 0).toFixed(2)}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.status === "concluido" ? "<strong>R$ " + comissaoProfissional.toFixed(2) + "</strong>" : "--"}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.status === "concluido" ? "<span style='background:#48bb78; color:white; padding:4px 8px; border-radius:4px;'>Concluído</span>" : "<span style='background:#ed8936; color:white; padding:4px 8px; border-radius:4px;'>Pendente</span>"}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #ddd;">
                                <button onclick="editarAgendamentoProfissional(${a.id})" style="background:#4299e1; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️ Editar</button>
                                ${a.status !== "concluido" ? `<button onclick="concluirAgendamentoProfissional(${a.id})" style="background:#48bb78; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">✅ Concluir</button>` : ""}
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

async function editarAgendamentoProfissional(id) {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/profissional/agendamentos", {
        headers: { "Authorization": "Bearer " + token }
    });
    const result = await res.json();

    if (result.success) {
        const agendamento = result.data.find(a => a.id === id);
        if (!agendamento) {
            alert("Agendamento não encontrado");
            return;
        }

        if (agendamento.status === "concluido") {
            alert("Agendamentos concluídos não podem ser editados");
            return;
        }

        let clientesOptions = "";
        for (let c of clientesListProf) {
            const selected = c.id === agendamento.cliente_id ? "selected" : "";
            clientesOptions += `<option value="${c.id}" ${selected}>${c.nome}</option>`;
        }

        let servicosOptions = '<option value="">Selecione um serviço</option>';
        for (let s of servicosListProf) {
            const selected = s.id === agendamento.servico_id ? "selected" : "";
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" ${selected}>${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
        }

        const modalDiv = document.createElement("div");
        modalDiv.id = "modalEditarAgendamentoProf";
        modalDiv.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;";

        modalDiv.innerHTML = `
            <div style="background: white; border-radius: 10px; padding: 25px; width: 450px; max-width: 90%;">
                <h3 style="margin-bottom: 20px;">✏️ Editar Meu Agendamento</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Cliente *</label>
                    <select id="editClienteIdProf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        ${clientesOptions}
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Data *</label>
                    <input type="date" id="editDataAgendamentoProf" value="${agendamento.data}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Hora</label>
                    <input type="time" id="editHoraAgendamentoProf" value="${agendamento.hora || ""}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Serviço</label>
                    <select id="editServicoIdProf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="atualizarValorPorServicoEditProf()">
                        ${servicosOptions}
                    </select>
                    <input type="text" id="editServicoAgendamentoProf" value="${agendamento.servico || ""}" style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ou digite o serviço manualmente">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Valor (R$)</label>
                    <input type="number" id="editValorAgendamentoProf" step="0.01" value="${agendamento.valor}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button onclick="fecharModalEditarAgendamentoProf()" style="background: #ddd; color: #333; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    <button onclick="salvarEdicaoAgendamentoProf(${id})" style="background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
    }
}

function fecharModalEditarAgendamentoProf() {
    const modal = document.getElementById("modalEditarAgendamentoProf");
    if (modal) modal.remove();
}

function atualizarValorPorServicoEditProf() {
    const select = document.getElementById("editServicoIdProf");
    const selectedOption = select.options[select.selectedIndex];
    const valor = selectedOption.getAttribute("data-valor");
    const nome = selectedOption.text.split(" - ")[0];

    if (valor) {
        document.getElementById("editValorAgendamentoProf").value = parseFloat(valor).toFixed(2);
        document.getElementById("editServicoAgendamentoProf").value = nome;
    }
}

async function salvarEdicaoAgendamentoProf(id) {
    const cliente_id = document.getElementById("editClienteIdProf").value;
    const data = document.getElementById("editDataAgendamentoProf").value;
    const hora = document.getElementById("editHoraAgendamentoProf").value;
    const servico_id = document.getElementById("editServicoIdProf").value;
    const servico = document.getElementById("editServicoAgendamentoProf").value;
    const valor = document.getElementById("editValorAgendamentoProf").value;

    if (!cliente_id || !data) {
        alert("Cliente e data são obrigatórios");
        return;
    }

    const token = localStorage.getItem("token");

    const body = {
        cliente_id: parseInt(cliente_id),
        data: data,
        hora: hora,
        valor: parseFloat(valor) || 0
    };

    if (servico_id) {
        body.servico_id = parseInt(servico_id);
    } else {
        body.servico = servico;
    }

    const res = await fetch(`/api/profissional/agendamentos/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(body)
    });

    const result = await res.json();

    if (result.success) {
        alert("Agendamento atualizado!");
        fecharModalEditarAgendamentoProf();
        await carregarListaAgendamentosProfComFiltro();
    } else {
        alert("Erro: " + result.message);
    }
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
                options += `<option value="${hora}">${hora}</option>`;
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

function abrirModalAgendamentoProfissional() {
    let clientesOptions = "";
    for (let c of clientesListProf) {
        clientesOptions += `<option value="${c.id}">${c.nome}</option>`;
    }

    let servicosOptions = "";
    for (let s of servicosListProf) {
        servicosOptions += `<option value="${s.id}" data-valor="${s.valor}">${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
    }

    const modalDiv = document.createElement("div");
    modalDiv.id = "modalAgendamentoProfissional";
    modalDiv.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;";

    modalDiv.innerHTML = `
        <div style="background: white; border-radius: 10px; padding: 25px; width: 450px; max-width: 90%;">
            <h3 style="margin-bottom: 20px;">Novo Agendamento</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Cliente *</label>
                <select id="clienteIdProf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">Selecione...</option>
                    ${clientesOptions}
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Data *</label>
                <input type="date" id="dataAgendamentoProf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="carregarHorariosDisponiveisProf()">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Hora</label>
                <select id="horaAgendamentoProf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">Selecione uma data primeiro</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Serviço</label>
                <select id="servicoIdProf" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="atualizarValorPorServicoProf()">
                    <option value="">Selecione um serviço</option>
                    ${servicosOptions}
                </select>
                <input type="text" id="servicoAgendamentoProf" style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ou digite o serviço manualmente">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Valor (R$)</label>
                <input type="number" id="valorAgendamentoProf" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="0,00">
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button onclick="fecharModalAgendamentoProfissional()" style="background: #ddd; color: #333; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                <button onclick="salvarAgendamentoProfissional()" style="background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);
}

function fecharModalAgendamentoProfissional() {
    const modal = document.getElementById("modalAgendamentoProfissional");
    if (modal) modal.remove();
}

async function salvarAgendamentoProfissional() {
    const cliente_id = document.getElementById("clienteIdProf").value;
    const data = document.getElementById("dataAgendamentoProf").value;
    const hora = document.getElementById("horaAgendamentoProf").value;
    const servico_id = document.getElementById("servicoIdProf").value;
    const servico = document.getElementById("servicoAgendamentoProf").value;
    const valor = document.getElementById("valorAgendamentoProf").value;

    if (!cliente_id || !data) {
        alert("Cliente e data são obrigatórios");
        return;
    }

    if (!hora) {
        alert("Selecione um horário");
        return;
    }

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
    } else {
        body.servico = servico;
    }

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
        alert("Agendamento criado!");
        fecharModalAgendamentoProfissional();
        await carregarListaAgendamentosProfComFiltro();
        if (typeof carregarDashboardProfissional === "function") {
            carregarDashboardProfissional();
        }
    } else {
        alert("Erro: " + result.message);
    }
}

async function concluirAgendamentoProfissional(id) {
    if (!confirm("Concluir este agendamento?")) return;

    const token = localStorage.getItem("token");
    try {
        const res = await fetch(`/api/profissional/agendamentos/${id}/concluir`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();

        if (result.success) {
            alert(result.message);
            await carregarListaAgendamentosProfComFiltro();
            if (typeof carregarDashboardProfissional === "function") {
                carregarDashboardProfissional();
            }
        } else {
            alert("Erro: " + result.message);
        }
    } catch (error) {
        alert("Erro: " + error.message);
    }
}

window.carregarAgendamentosProfissional = carregarAgendamentosProfissional;
window.abrirModalAgendamentoProfissional = abrirModalAgendamentoProfissional;
window.fecharModalAgendamentoProfissional = fecharModalAgendamentoProfissional;
window.salvarAgendamentoProfissional = salvarAgendamentoProfissional;
window.concluirAgendamentoProfissional = concluirAgendamentoProfissional;
window.atualizarValorPorServicoProf = atualizarValorPorServicoProf;
window.aplicarFiltrosAgendamentosProf = aplicarFiltrosAgendamentosProf;
window.limparFiltrosAgendamentosProf = limparFiltrosAgendamentosProf;
window.editarAgendamentoProfissional = editarAgendamentoProfissional;
window.fecharModalEditarAgendamentoProf = fecharModalEditarAgendamentoProf;
window.salvarEdicaoAgendamentoProf = salvarEdicaoAgendamentoProf;
window.atualizarValorPorServicoEditProf = atualizarValorPorServicoEditProf;
window.carregarHorariosDisponiveisProf = carregarHorariosDisponiveisProf;