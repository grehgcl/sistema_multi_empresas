// Página de Agendamentos do DONO - COM FILTROS, EDIÇÃO E HORÁRIOS DISPONÍVEIS
let profissionaisList = [];
let clientesList = [];
let servicosList = [];

async function carregarAgendamentos() {
    ativarBotao("agendamentos");
    showLoading();
    const token = localStorage.getItem("token");

    try {
        const [profRes, clientesRes, servicosRes] = await Promise.all([
            fetch("/api/profissionais", { headers: { "Authorization": "Bearer " + token } }),
            fetch("/api/clientes", { headers: { "Authorization": "Bearer " + token } }),
            fetch("/api/servicos", { headers: { "Authorization": "Bearer " + token } })
        ]);

        const profResult = await profRes.json();
        if (profResult.success) profissionaisList = profResult.data || [];
        else profissionaisList = [];

        const clientesResult = await clientesRes.json();
        if (clientesResult.success) clientesList = clientesResult.data || [];
        else clientesList = [];

        const servicosResult = await servicosRes.json();
        if (servicosResult.success) servicosList = servicosResult.data || [];
        else servicosList = [];

        console.log("Dados carregados:", {
            clientes: clientesList.length,
            profissionais: profissionaisList.length,
            servicos: servicosList.length
        });
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        showToast("Erro ao carregar dados", "error");
        profissionaisList = [];
        clientesList = [];
        servicosList = [];
    }

    let profissionaisOptions = "";
    if (profissionaisList.length > 0) {
        for (let p of profissionaisList) {
            if (p.ativo === 1) {
                profissionaisOptions += `<option value="${p.id}">${p.nome} (${p.comissao_percent}%)</option>`;
            }
        }
    }

    let html = `
        <div class="fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 class="page-title">📅 Agendamentos</h2>
                <button class="btn btn-primary" onclick="abrirModalAgendamentoDono()">+ Novo Agendamento</button>
            </div>
            
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;">
                    <div>
                        <label>Data Início</label>
                        <input type="date" id="filtroDataInicio" class="form-control" style="width: auto;">
                    </div>
                    <div>
                        <label>Data Fim</label>
                        <input type="date" id="filtroDataFim" class="form-control" style="width: auto;">
                    </div>
                    <div>
                        <label>Status</label>
                        <select id="filtroStatus" class="form-control" style="width: auto;">
                            <option value="todos">Todos</option>
                            <option value="pendente">Pendente</option>
                            <option value="concluido">Concluído</option>
                        </select>
                    </div>
                    <div>
                        <label>Profissional</label>
                        <select id="filtroProfissional" class="form-control" style="width: auto;">
                            <option value="todos">Todos</option>
                            ${profissionaisOptions}
                        </select>
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="aplicarFiltrosAgendamentos()">🔍 Filtrar</button>
                        <button class="btn btn-secondary" onclick="limparFiltrosAgendamentos()">🗑️ Limpar</button>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Cliente</th>
                                <th>Profissional</th>
                                <th>Serviço</th>
                                <th>Valor</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="listaAgendamentos"></tbody>
                    60
                </div>
            </div>
        </div>
    `;

    document.getElementById("content").innerHTML = html;
    await carregarListaAgendamentosComFiltro();
    hideLoading();
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

        if (dataInicio) agendamentos = agendamentos.filter(a => a.data >= dataInicio);
        if (dataFim) agendamentos = agendamentos.filter(a => a.data <= dataFim);
        if (statusFilter && statusFilter !== "todos") agendamentos = agendamentos.filter(a => a.status === statusFilter);
        if (profissionalFilter && profissionalFilter !== "todos") agendamentos = agendamentos.filter(a => a.profissional_id == profissionalFilter);

        agendamentos.sort((a, b) => new Date(b.data) - new Date(a.data));

        const tbody = document.getElementById("listaAgendamentos");
        if (!tbody) return;

        if (agendamentos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <span style="font-size: 48px;">📅</span>
                        <p>Nenhum agendamento encontrado</p>
                    </td>
                </tr>
            `;
        } else {
            let rows = "";
            for (let a of agendamentos) {
                rows += `
                    <tr>
                        <td>${formatarDataBr(a.data)} ${a.hora || ""}</
                        <td><strong>${escapeHtml(a.cliente_nome || "N/A")}</strong></
                        <td>${escapeHtml(a.profissional_nome || "Não atribuído")}</
                        <td>${escapeHtml(a.servico_nome || a.servico || "N/A")}</
                        <td>R$ ${(a.valor || 0).toFixed(2)}</
                        <td>${a.status === "concluido" ? '<span class="badge badge-success">Concluído</span>' : '<span class="badge badge-warning">Pendente</span>'}</
                        <td class="actions-cell">
                            <button class="btn-icon" onclick="editarAgendamento(${a.id})" title="Editar">✏️</button>
                            ${a.status !== "concluido" ? `<button class="btn-icon" onclick="concluirAgendamento(${a.id})" title="Concluir" style="color:#10b981;">✅</button>` : ""}
                            <button class="btn-icon" onclick="excluirAgendamento(${a.id})" title="Excluir" style="color:#ef4444;">🗑️</button>
                        </
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

// Função para abrir modal de novo cliente
function abrirModalNovoCliente() {
    const modalHtml = `
        <div id="modalNovoCliente" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 400px; width: 90%;">
                <h3>➕ Novo Cliente</h3>
                <form id="formNovoCliente" onsubmit="salvarNovoCliente(event)">
                    <div class="form-group">
                        <label>Nome *</label>
                        <input type="text" id="novoClienteNome" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="text" id="novoClienteTelefone" class="form-control" placeholder="(00) 00000-0000">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="novoClienteEmail" class="form-control" placeholder="cliente@email.com">
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="fecharModalNovoCliente()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Cliente</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("modalNovoCliente");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function fecharModalNovoCliente() {
    const modal = document.getElementById("modalNovoCliente");
    if (modal) modal.remove();
}

async function salvarNovoCliente(event) {
    event.preventDefault();

    const nome = document.getElementById("novoClienteNome").value;
    const telefone = document.getElementById("novoClienteTelefone").value;
    const email = document.getElementById("novoClienteEmail").value;

    if (!nome) {
        showToast("Nome é obrigatório", "warning");
        return;
    }

    showLoading();

    const token = localStorage.getItem("token");

    try {
        const res = await fetch("/api/clientes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ nome, telefone, email })
        });

        const result = await res.json();

        if (result.success) {
            showToast("Cliente cadastrado com sucesso!", "success");

            // Recarregar a lista de clientes
            const clientesRes = await fetch("/api/clientes", {
                headers: { "Authorization": "Bearer " + token }
            });
            const clientesResult = await clientesRes.json();
            if (clientesResult.success) clientesList = clientesResult.data || [];

            fecharModalNovoCliente();

            // Reabrir o modal de agendamento com a lista atualizada
            fecharModalAgendamentoDono();
            abrirModalAgendamentoDono();
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        console.error("Erro ao salvar cliente:", error);
        showToast("Erro ao salvar cliente", "error");
    }

    hideLoading();
}

async function carregarHorariosDisponiveisDono() {
    const data = document.getElementById("dataAgendamentoDono").value;
    const profissional_id = document.getElementById("profissionalIdDono").value;
    const horaSelect = document.getElementById("horaAgendamentoDono");

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
            body: JSON.stringify({ data: data, profesional_id: profissional_id || null })
        });
        const result = await res.json();

        if (result.success && result.data && result.data.horarios && result.data.horarios.length > 0) {
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
        console.error("Erro ao buscar horários:", error);
        horaSelect.innerHTML = '<option value="">Erro ao carregar horários</option>';
    }
}

function formatarHoraCompleta(hora) {
    if (!hora) return "";
    if (/^\d{2}:\d{2}$/.test(hora)) return hora;
    if (/^\d{1,2}$/.test(hora)) return hora.padStart(2, '0') + ":00";
    return hora;
}

async function abrirModalAgendamentoDono() {
    // Garantir que clientesList é um array
    const clientes = Array.isArray(clientesList) ? clientesList : [];
    const servicos = Array.isArray(servicosList) ? servicosList : [];
    const profissionais = Array.isArray(profissionaisList) ? profissionaisList : [];

    console.log("Abrindo modal - Clientes:", clientes.length);

    let clientesOptions = '<option value="">Selecione...</option>';
    if (clientes.length > 0) {
        for (let c of clientes) {
            clientesOptions += `<option value="${c.id}">${escapeHtml(c.nome)}</option>`;
        }
    } else {
        clientesOptions = '<option value="">Nenhum cliente cadastrado. Clique em "+ Novo Cliente"</option>';
    }

    let servicosOptions = '<option value="">Selecione um serviço</option>';
    if (servicos.length > 0) {
        for (let s of servicos) {
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}">${escapeHtml(s.nome)} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
        }
    }

    let profissionaisOptions = '<option value="">Não atribuir</option>';
    if (profissionais.length > 0) {
        for (let p of profissionais) {
            if (p.ativo === 1) {
                profissionaisOptions += `<option value="${p.id}">${escapeHtml(p.nome)} (${p.comissao_percent}%)</option>`;
            }
        }
    }

    const modalHtml = `
        <div id="modalAgendamentoDono" class="modal" style="display: flex;">
            <div class="modal-content" style="max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h3>➕ Novo Agendamento</h3>
                
                <div class="form-group">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <label>Cliente *</label>
                        <button type="button" class="btn btn-sm btn-success" onclick="abrirModalNovoCliente()" style="padding: 4px 12px; font-size: 12px;">
                            + Novo Cliente
                        </button>
                    </div>
                    <select id="clienteIdDono" class="form-control" required>
                        ${clientesOptions}
                    </select>
                    <small class="text-muted">Não encontrou o cliente? Clique em "+ Novo Cliente"</small>
                </div>
                
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="dataAgendamentoDono" class="form-control" onchange="carregarHorariosDisponiveisDono()">
                </div>
                
                <div class="form-group">
                    <label>Horário *</label>
                    <select id="horaAgendamentoDono" class="form-control">
                        <option value="">Selecione uma data primeiro</option>
                    </select>
                    <small class="text-muted">Horários disponíveis de 30 em 30 minutos</small>
                </div>
                
                <div class="form-group">
                    <label>Serviço</label>
                    <select id="servicoIdDono" class="form-control" onchange="atualizarValorPorServicoDono()">
                        ${servicosOptions}
                    </select>
                    <input type="text" id="servicoDescricaoDono" class="form-control" style="margin-top: 10px;" placeholder="Ou digite o serviço manualmente">
                </div>
                
                <div class="form-group">
                    <label>Valor (R$)</label>
                    <input type="number" id="valorAgendamentoDono" class="form-control" step="0.01" placeholder="0,00">
                </div>
                
                <div class="form-group">
                    <label>Profissional</label>
                    <select id="profissionalIdDono" class="form-control" onchange="carregarHorariosDisponiveisDono()">
                        ${profissionaisOptions}
                    </select>
                    <small class="text-muted">Se não escolher, o agendamento ficará sem profissional</small>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="fecharModalAgendamentoDono()">Cancelar</button>
                    <button type="button" class="btn btn-primary" onclick="salvarAgendamentoDono()">Salvar</button>
                </div>
            </div>
        </div>
    `;

    const existingModal = document.getElementById("modalAgendamentoDono");
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
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
        showToast("Cliente e data são obrigatórios", "warning");
        return;
    }

    if (!hora) {
        showToast("Selecione um horário", "warning");
        return;
    }

    showLoading();

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
            fecharModalAgendamentoDono();
            carregarAgendamentos();
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        showToast("Erro ao criar agendamento", "error");
    }

    hideLoading();
}

async function concluirAgendamento(id) {
    if (!confirm("Concluir este agendamento?")) return;

    showLoading();
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`/api/agendamentos/${id}/concluir`, {
            method: "PUT",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();

        if (result.success) {
            showToast(result.message, "success");
            carregarAgendamentos();
            if (typeof carregarFinanceiro === "function") {
                const btnFinanceiro = document.getElementById("btnFinanceiro");
                if (btnFinanceiro && btnFinanceiro.classList.contains("active")) {
                    carregarFinanceiro();
                }
            }
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        showToast("Erro ao concluir agendamento", "error");
    }

    hideLoading();
}

async function excluirAgendamento(id) {
    if (!confirm("Excluir este agendamento?")) return;

    showLoading();
    const token = localStorage.getItem("token");

    try {
        const res = await fetch(`/api/agendamentos/${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();

        if (result.success) {
            showToast("Agendamento removido", "success");
            carregarAgendamentos();
        } else {
            showToast("Erro: " + result.message, "error");
        }
    } catch (error) {
        showToast("Erro ao excluir agendamento", "error");
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

// Funções de edição
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

        const clientes = Array.isArray(clientesList) ? clientesList : [];
        const servicos = Array.isArray(servicosList) ? servicosList : [];
        const profissionais = Array.isArray(profissionaisList) ? profissionaisList : [];

        let clientesOptions = "";
        for (let c of clientes) {
            const selected = c.id === agendamento.cliente_id ? "selected" : "";
            clientesOptions += `<option value="${c.id}" ${selected}>${c.nome}</option>`;
        }

        let servicosOptions = '<option value="">Selecione um serviço</option>';
        for (let s of servicos) {
            const selected = s.id === agendamento.servico_id ? "selected" : "";
            servicosOptions += `<option value="${s.id}" data-valor="${s.valor}" data-nome="${s.nome}" ${selected}>${s.nome} - R$ ${s.valor.toFixed(2)} (${s.duracao}min)</option>`;
        }

        let profissionaisOptions = '<option value="">Não atribuir</option>';
        for (let p of profissionais) {
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

// Exportar funções
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
window.abrirModalNovoCliente = abrirModalNovoCliente;
window.fecharModalNovoCliente = fecharModalNovoCliente;
window.salvarNovoCliente = salvarNovoCliente;