// Página de Agendamentos do DONO - COM FILTROS, EDIÇÃO E HORÁRIOS DISPONÍVEIS
let profissionaisList = [];
let clientesList = [];
let servicosList = [];

async function carregarAgendamentos() {
    ativarBotao("agendamentos");
    const token = localStorage.getItem("token");

    const resProf = await fetch("/api/profissionais", {
        headers: { "Authorization": "Bearer " + token }
    });
    const profResult = await resProf.json();
    if (profResult.success) {
        profissionaisList = profResult.data;
    }

    const resClientes = await fetch("/api/clientes", {
        headers: { "Authorization": "Bearer " + token }
    });
    const clientesResult = await resClientes.json();
    if (clientesResult.success) {
        clientesList = clientesResult.data;
    }

    const resServicos = await fetch("/api/servicos", {
        headers: { "Authorization": "Bearer " + token }
    });
    const servicosResult = await resServicos.json();
    if (servicosResult.success) {
        servicosList = servicosResult.data;
    }

    let profissionaisOptions = "";
    for (let p of profissionaisList) {
        if (p.ativo === 1) {
            profissionaisOptions += `<option value="${p.id}">${p.nome} (${p.comissao_percent}%)</option>`;
        }
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2>📅 Agendamentos</h2>
            <button class="btn-green" onclick="abrirModalAgendamentoDono()" style="background:#48bb78; color:white; border:none; padding:10px 20px; border-radius:5px; cursor:pointer;">+ Novo Agendamento</button>
        </div>
        
        <div class="card" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;">
                <div>
                    <label>Data Início</label>
                    <input type="date" id="filtroDataInicio" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Data Fim</label>
                    <input type="date" id="filtroDataFim" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label>Status</label>
                    <select id="filtroStatus" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="todos">Todos</option>
                        <option value="pendente">Pendente</option>
                        <option value="concluido">Concluído</option>
                    </select>
                </div>
                <div>
                    <label>Profissional</label>
                    <select id="filtroProfissional" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="todos">Todos</option>
                        ${profissionaisOptions}
                    </select>
                </div>
                <div>
                    <button onclick="aplicarFiltrosAgendamentos()" style="background:#667eea;">🔍 Filtrar</button>
                    <button onclick="limparFiltrosAgendamentos()" style="background:#a0aec0;">🗑️ Limpar</button>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div style="overflow-x: auto;">
                <table style="width:100%">
                    <thead>
                        <tr><th>Data</th><th>Cliente</th><th>Profissional</th><th>Serviço</th><th>Valor</th><th>Status</th><th>Ações</th></tr>
                    </thead>
                    <tbody id="listaAgendamentos"></tbody>
                点化的
            </div>
        </div>
    `;

    document.getElementById("content").innerHTML = html;
    await carregarListaAgendamentosComFiltro();
}

async function carregarListaAgendamentosComFiltro() {
    const token = localStorage.getItem("token");
    const dataInicio = document.getElementById("filtroDataInicio")?.value;
    const dataFim = document.getElementById("filtroDataFim")?.value;
    const statusFilter = document.getElementById("filtroStatus")?.value;
    const profissionalFilter = document.getElementById("filtroProfissional")?.value;

    const res = await fetch("/api/agendamentos", {
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
        if (profissionalFilter && profissionalFilter !== "todos") {
            agendamentos = agendamentos.filter(a => a.profissional_id == profissionalFilter);
        }

        agendamentos.sort((a, b) => new Date(b.data) - new Date(a.data));

        const tbody = document.getElementById("listaAgendamentos");
        if (agendamentos.length === 0) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>Nenhum agendamento encontrado</td></tr>";
        } else {
            let rows = "";
            for (let a of agendamentos) {
                rows += `
                    <tr>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${new Date(a.data).toLocaleDateString()} ${a.hora || ""}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.cliente_nome || "N/A"}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.profissional_nome || "Não atribuído"}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.servico_nome || a.servico || "N/A"}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">R$ ${(a.valor || 0).toFixed(2)}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">${a.status === "concluido" ? "<span style='background:#48bb78; color:white; padding:4px 8px; border-radius:4px;'>Concluído</span>" : "<span style='background:#ed8936; color:white; padding:4px 8px; border-radius:4px;'>Pendente</span>"}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #ddd;">
                            <button onclick="editarAgendamento(${a.id})" style="background:#4299e1; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; margin-right:5px;">✏️ Editar</button>
                            ${a.status !== "concluido" ? `<button onclick="concluirAgendamento(${a.id})" style="background:#48bb78; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">✅ Concluir</button>` : ""}
                            <button onclick="excluirAgendamento(${a.id})" style="background:#e53e3e; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">🗑️ Excluir</button>
                        </td>
                    </tr>
                `;
            }
            tbody.innerHTML = rows;
        }
    }
}

function aplicarFiltrosAgendamentos() {
    carregarListaAgendamentosComFiltro();
}

function limparFiltrosAgendamentos() {
    if (document.getElementById("filtroDataInicio")) document.getElementById("filtroDataInicio").value = "";
    if (document.getElementById("filtroDataFim")) document.getElementById("filtroDataFim").value = "";
    if (document.getElementById("filtroStatus")) document.getElementById("filtroStatus").value = "todos";
    if (document.getElementById("filtroProfissional")) document.getElementById("filtroProfissional").value = "todos";
    carregarListaAgendamentosComFiltro();
}

async function carregarHorariosDisponiveisDono() {
    const data = document.getElementById("dataAgendamentoDono").value;
    const profissional_id = document.getElementById("profissionalIdDono").value;
    const horaSelect = document.getElementById("horaAgendamentoDono");

    console.log("=== CARREGANDO HORARIOS ===");
    console.log("Data selecionada:", data);
    console.log("Profissional ID:", profissional_id);

    if (!data) {
        horaSelect.innerHTML = '<option value="">Selecione uma data primeiro</option>';
        return;
    }

    horaSelect.innerHTML = '<option value="">Carregando...</option>';

    const token = localStorage.getItem("token");
    try {
        const res = await fetch("/api/horarios/disponiveis", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ data: data, profissional_id: profissional_id || null })
        });
        const result = await res.json();

        console.log("Resposta da API:", result);

        if (result.success && result.data && result.data.horarios && result.data.horarios.length > 0) {
            let options = '<option value="">Selecione um horário</option>';
            for (let hora of result.data.horarios) {
                options += `<option value="${hora}">${hora}</option>`;
            }
            horaSelect.innerHTML = options;
            console.log("Horarios carregados:", result.data.horarios.length);
        } else {
            console.log("Nenhum horario disponivel. Motivo:", result.data?.disponivel === false ? "Dia fechado" : "Sem horarios");
            horaSelect.innerHTML = '<option value="">Nenhum horário disponível neste dia</option>';
        }
    } catch (error) {
        console.error("Erro ao buscar horários:", error);
        horaSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
    }
}

function abrirModalAgendamentoDono() {
    let clientesOptions = "";
    for (let c of clientesList) {
        clientesOptions += `<option value="${c.id}">${c.nome}</option>`;
    }

    let servicosOptions = "";
    for (let s of servicosList) {
        servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}">${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
    }

    let profissionaisOptions = '<option value="">Não atribuir</option>';
    for (let p of profissionaisList) {
        if (p.ativo === 1) {
            profissionaisOptions += `<option value="${p.id}">${p.nome} (${p.comissao_percent}%)</option>`;
        }
    }

    const modalDiv = document.createElement("div");
    modalDiv.id = "modalAgendamentoDono";
    modalDiv.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;";

    modalDiv.innerHTML = `
        <div style="background: white; border-radius: 10px; padding: 25px; width: 450px; max-width: 90%;">
            <h3 style="margin-bottom: 20px;">Novo Agendamento</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Cliente *</label>
                <select id="clienteIdDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">Selecione...</option>
                    ${clientesOptions}
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Data *</label>
                <input type="date" id="dataAgendamentoDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="carregarHorariosDisponiveisDono()">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Hora</label>
                <select id="horaAgendamentoDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="">Selecione uma data primeiro</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Serviço</label>
                <select id="servicoIdDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="atualizarValorPorServicoDono()">
                    <option value="">Selecione um serviço</option>
                    ${servicosOptions}
                </select>
                <input type="text" id="servicoDescricaoDono" style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ou digite o serviço manualmente">
                <small style="color:#666;">Selecione um serviço da lista ou digite manualmente</small>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Valor (R$)</label>
                <input type="number" id="valorAgendamentoDono" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="0,00">
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Profissional</label>
                <select id="profissionalIdDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="carregarHorariosDisponiveisDono()">
                    ${profissionaisOptions}
                </select>
                <small style="color:#666;">Se não escolher, o agendamento ficará sem profissional</small>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button onclick="fecharModalAgendamentoDono()" style="background: #ddd; color: #333; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                <button onclick="salvarAgendamentoDono()" style="background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);
}

function fecharModalAgendamentoDono() {
    const modal = document.getElementById("modalAgendamentoDono");
    if (modal) modal.remove();
}

function atualizarValorPorServicoDono() {
    const select = document.getElementById("servicoIdDono");
    const selectedOption = select.options[select.selectedIndex];
    const valor = selectedOption.getAttribute("data-valor");
    const nome = selectedOption.getAttribute("data-nome");

    if (valor) {
        document.getElementById("valorAgendamentoDono").value = parseFloat(valor).toFixed(2);
        document.getElementById("servicoDescricaoDono").value = nome;
    }
}

async function salvarAgendamentoDono() {
    const cliente_id = document.getElementById("clienteIdDono").value;
    const data = document.getElementById("dataAgendamentoDono").value;
    const hora = document.getElementById("horaAgendamentoDono").value;
    const servico_id = document.getElementById("servicoIdDono").value;
    const servico_descricao = document.getElementById("servicoDescricaoDono").value;
    const valor = document.getElementById("valorAgendamentoDono").value;
    const profissional_id = document.getElementById("profissionalIdDono").value;

    if (!cliente_id || !data) {
        alert("Cliente e data são obrigatórios");
        return;
    }

    if (!hora) {
        alert("Selecione um horário");
        return;
    }

    const token = localStorage.getItem("token");

    const body = {
        cliente_id: parseInt(cliente_id),
        data: data,
        hora: hora,
        valor: parseFloat(valor) || 0,
        profissional_id: profissional_id ? parseInt(profissional_id) : null
    };

    if (servico_id) {
        body.servico_id = parseInt(servico_id);
    } else if (servico_descricao) {
        body.servico = servico_descricao;
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
        fecharModalAgendamentoDono();
        carregarAgendamentos();
    } else {
        alert("Erro: " + result.message);
    }
}

async function concluirAgendamento(id) {
    if (!confirm("Concluir este agendamento?")) return;

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/agendamentos/${id}/concluir`, {
        method: "PUT",
        headers: { "Authorization": "Bearer " + token }
    });
    const result = await res.json();

    if (result.success) {
        alert(result.message);
        carregarAgendamentos();
        if (typeof carregarFinanceiro === "function") {
            const btnFinanceiro = document.getElementById("btnFinanceiro");
            if (btnFinanceiro && btnFinanceiro.classList.contains("active")) {
                carregarFinanceiro();
            }
        }
    } else {
        alert("Erro: " + result.message);
    }
}

async function excluirAgendamento(id) {
    if (!confirm("Excluir este agendamento?")) return;

    const token = localStorage.getItem("token");
    const res = await fetch(`/api/agendamentos/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
    });
    const result = await res.json();

    if (result.success) {
        alert("Agendamento removido");
        carregarAgendamentos();
    } else {
        alert("Erro: " + result.message);
    }
}

async function editarAgendamento(id) {
    const token = localStorage.getItem("token");

    const res = await fetch("/api/agendamentos", {
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
        for (let c of clientesList) {
            const selected = c.id === agendamento.cliente_id ? "selected" : "";
            clientesOptions += `<option value="${c.id}" ${selected}>${c.nome}</option>`;
        }

        let servicosOptions = '<option value="">Selecione um serviço</option>';
        for (let s of servicosList) {
            const selected = s.id === agendamento.servico_id ? "selected" : "";
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" ${selected}>${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
        }

        let profissionaisOptions = '<option value="">Não atribuir</option>';
        for (let p of profissionaisList) {
            if (p.ativo === 1) {
                const selected = p.id === agendamento.profissional_id ? "selected" : "";
                profissionaisOptions += `<option value="${p.id}" ${selected}>${p.nome} (${p.comissao_percent}%)</option>`;
            }
        }

        const modalDiv = document.createElement("div");
        modalDiv.id = "modalEditarAgendamentoDono";
        modalDiv.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;";

        modalDiv.innerHTML = `
            <div style="background: white; border-radius: 10px; padding: 25px; width: 450px; max-width: 90%;">
                <h3 style="margin-bottom: 20px;">✏️ Editar Agendamento</h3>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Cliente *</label>
                    <select id="editClienteIdDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        ${clientesOptions}
                    </select>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Data *</label>
                    <input type="date" id="editDataAgendamentoDono" value="${agendamento.data}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Hora</label>
                    <input type="time" id="editHoraAgendamentoDono" value="${agendamento.hora || ""}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Serviço</label>
                    <select id="editServicoIdDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" onchange="atualizarValorPorServicoEditDono()">
                        ${servicosOptions}
                    </select>
                    <input type="text" id="editServicoDescricaoDono" value="${agendamento.servico || ""}" style="width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Ou digite o serviço manualmente">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Valor (R$)</label>
                    <input type="number" id="editValorAgendamentoDono" step="0.01" value="${agendamento.valor}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Profissional</label>
                    <select id="editProfissionalIdDono" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        ${profissionaisOptions}
                    </select>
                </div>
                
                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button onclick="fecharModalEditarAgendamentoDono()" style="background: #ddd; color: #333; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    <button onclick="salvarEdicaoAgendamentoDono(${id})" style="background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Salvar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
    }
}

function fecharModalEditarAgendamentoDono() {
    const modal = document.getElementById("modalEditarAgendamentoDono");
    if (modal) modal.remove();
}

function atualizarValorPorServicoEditDono() {
    const select = document.getElementById("editServicoIdDono");
    const selectedOption = select.options[select.selectedIndex];
    const valor = selectedOption.getAttribute("data-valor");
    const nome = selectedOption.getAttribute("data-nome");

    if (valor) {
        document.getElementById("editValorAgendamentoDono").value = parseFloat(valor).toFixed(2);
        document.getElementById("editServicoDescricaoDono").value = nome;
    }
}

async function salvarEdicaoAgendamentoDono(id) {
    const cliente_id = document.getElementById("editClienteIdDono").value;
    const data = document.getElementById("editDataAgendamentoDono").value;
    const hora = document.getElementById("editHoraAgendamentoDono").value;
    const servico_id = document.getElementById("editServicoIdDono").value;
    const servico_descricao = document.getElementById("editServicoDescricaoDono").value;
    const valor = document.getElementById("editValorAgendamentoDono").value;
    const profissional_id = document.getElementById("editProfissionalIdDono").value;

    if (!cliente_id || !data) {
        alert("Cliente e data são obrigatórios");
        return;
    }

    const token = localStorage.getItem("token");

    const body = {
        cliente_id: parseInt(cliente_id),
        data: data,
        hora: hora,
        valor: parseFloat(valor) || 0,
        profissional_id: profissional_id ? parseInt(profissional_id) : null
    };

    if (servico_id) {
        body.servico_id = parseInt(servico_id);
    } else if (servico_descricao) {
        body.servico = servico_descricao;
    }

    const res = await fetch(`/api/agendamentos/${id}`, {
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
        fecharModalEditarAgendamentoDono();
        carregarAgendamentos();
    } else {
        alert("Erro: " + result.message);
    }
}

window.carregarAgendamentos = carregarAgendamentos;
window.abrirModalAgendamentoDono = abrirModalAgendamentoDono;
window.fecharModalAgendamentoDono = fecharModalAgendamentoDono;
window.salvarAgendamentoDono = salvarAgendamentoDono;
window.concluirAgendamento = concluirAgendamento;
window.excluirAgendamento = excluirAgendamento;
window.atualizarValorPorServicoDono = atualizarValorPorServicoDono;
window.aplicarFiltrosAgendamentos = aplicarFiltrosAgendamentos;
window.limparFiltrosAgendamentos = limparFiltrosAgendamentos;
window.editarAgendamento = editarAgendamento;
window.fecharModalEditarAgendamentoDono = fecharModalEditarAgendamentoDono;
window.salvarEdicaoAgendamentoDono = salvarEdicaoAgendamentoDono;
window.atualizarValorPorServicoEditDono = atualizarValorPorServicoEditDono;
window.carregarHorariosDisponiveisDono = carregarHorariosDisponiveisDono;