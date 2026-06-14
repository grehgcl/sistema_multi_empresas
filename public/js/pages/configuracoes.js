// Configurações Unificadas - Profissionais + Horários

let profissionaisData = [];

// ============================================
// FUNÇÃO PRINCIPAL (chamada pelo menu)
// ============================================
async function carregarConfiguracoes() {
    ativarBotao('configuracoes');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        // Carregar profissionais e horários em paralelo
        const [profissionaisRes, horariosRes] = await Promise.all([
            fetch('/api/profissionais', {
                headers: { 'Authorization': 'Bearer ' + token }
            }),
            fetch('/api/horarios', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
        ]);

        const profissionaisData_raw = await profissionaisRes.json();
        const horariosData = await horariosRes.json();

        if (profissionaisData_raw.success) {
            profissionaisData = profissionaisData_raw.data;
        }

        let html = `
            <div class="fade-in">
                <h2 class="page-title">⚙️ Configurações</h2>
                
                <!-- TABS -->
                <div class="tabs-container">
                    <button class="tab-btn active" onclick="switchTab('profissionais')">
                        👥 Profissionais
                    </button>
                    <button class="tab-btn" onclick="switchTab('horarios')">
                        ⏰ Horários de Funcionamento
                    </button>
                </div>
                
                <!-- TAB PROFISSIONAIS -->
                <div id="tab-profissionais" class="tab-content active">
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                            <h3 style="margin: 0;">👥 Profissionais da Barbearia</h3>
                            <button class="btn btn-primary" onclick="abrirModalProfissional()">
                                + Novo Profissional
                            </button>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Comissão</th>
                                        <th>Status</th>
                                        <th>Data Cadastro</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="profissionais-list">
                                    ${renderProfissionaisList()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- TAB HORARIOS -->
                <div id="tab-horarios" class="tab-content">
                    <div class="card">
                        <h3>⏰ Horários de Funcionamento</h3>
                        <p class="text-muted">Configure os dias e horários. Os agendamentos respeitarão estas configurações.</p>
                        <p class="text-warning">⚠️ Dica: As alterações são salvas automaticamente</p>
                        
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Dia</th>
                                        <th>Status</th>
                                        <th>Horário</th>
                                        <th>Almoço</th>
                                        <th>Intervalo</th>
                                    </tr>
                                </thead>
                                <tbody id="horarios-list">
                                    ${renderHorariosList(horariosData.data || [])}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;

        // Se tiver dados de horários, inicializar os eventos
        if (horariosData.data) {
            setTimeout(() => inicializarHorariosEvents(), 100);
        }

    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        showToast('Erro ao carregar configurações', 'error');
    }

    hideLoading();
}

// ============================================
// RENDERIZAR LISTA DE PROFISSIONAIS
// ============================================
function renderProfissionaisList() {
    if (!profissionaisData || profissionaisData.length === 0) {
        return `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <span style="font-size: 48px;">👥</span>
                    <p>Nenhum profissional cadastrado</p>
                    <button class="btn btn-primary btn-sm" onclick="abrirModalProfissional()">
                        Adicionar Profissional
                    </button>
                </td>
            </tr>
        `;
    }

    return profissionaisData.map(prof => `
        <tr>
            <td><strong>${escapeHtml(prof.nome)}</strong></td>
            <td>${escapeHtml(prof.email)}</td>
            <td>
                <span class="badge badge-info">${prof.comissao_percent}%</span>
            </td>
            <td>
                ${prof.ativo === 1 || prof.ativo === true ?
            '<span class="badge badge-success">Ativo</span>' :
            '<span class="badge badge-danger">Inativo</span>'
        }
            </td>
            <td>${formatarData(prof.created_at)}</td>
            <td class="actions-cell">
                <button class="btn-icon" onclick="editarProfissional(${prof.id})" title="Editar">
                    ✏️
                </button>
                <button class="btn-icon" onclick="resetarSenhaProfissional(${prof.id}, '${escapeHtml(prof.nome)}')" title="Resetar Senha">
                    🔑
                </button>
                <button class="btn-icon" onclick="alternarStatusProfissional(${prof.id}, ${prof.ativo === 1 ? 'false' : 'true'})" title="${prof.ativo === 1 ? 'Desativar' : 'Ativar'}">
                    ${prof.ativo === 1 ? '🔴' : '🟢'}
                </button>
                <button class="btn-icon btn-danger" onclick="excluirProfissional(${prof.id}, '${escapeHtml(prof.nome)}')" title="Excluir">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// RENDERIZAR LISTA DE HORÁRIOS
// ============================================
function renderHorariosList(horarios) {
    const dias = {
        0: 'Domingo',
        1: 'Segunda-feira',
        2: 'Terça-feira',
        3: 'Quarta-feira',
        4: 'Quinta-feira',
        5: 'Sexta-feira',
        6: 'Sábado'
    };

    // Se não tem horários no banco, criar padrão
    if (!horarios || horarios.length === 0) {
        return [0, 1, 2, 3, 4, 5, 6].map(dia => `
            <tr>
                <td><strong>${dias[dia]}</strong></td>
                <td>
                    <label class="switch">
                        <input type="checkbox" class="status-toggle" data-dia="${dia}" ${dia === 0 ? '' : 'checked'}>
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <input type="time" class="hora-inicio" data-dia="${dia}" value="09:00" ${dia === 0 ? 'disabled' : ''}>
                    às
                    <input type="time" class="hora-fim" data-dia="${dia}" value="18:00" ${dia === 0 ? 'disabled' : ''}>
                </td>
                <td>
                    <input type="time" class="almoco-inicio" data-dia="${dia}" value="12:00" ${dia === 0 ? 'disabled' : ''}>
                    às
                    <input type="time" class="almoco-fim" data-dia="${dia}" value="13:00" ${dia === 0 ? 'disabled' : ''}>
                </td>
                <td>
                    <select class="intervalo-select" data-dia="${dia}" ${dia === 0 ? 'disabled' : ''}>
                        <option value="15">15 min</option>
                        <option value="30" selected>30 min</option>
                        <option value="45">45 min</option>
                        <option value="60">1 hora</option>
                    </select>
                </td>
            </tr>
        `).join('');
    }

    return horarios.map(h => `
        <tr>
            <td><strong>${dias[h.dia_semana]}</strong></td>
            <td>
                <label class="switch">
                    <input type="checkbox" class="status-toggle" data-dia="${h.dia_semana}" ${h.aberto === 1 ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </td>
            <td>
                <input type="time" class="hora-inicio" data-dia="${h.dia_semana}" value="${h.hora_inicio || '09:00'}" ${!h.aberto ? 'disabled' : ''}>
                às
                <input type="time" class="hora-fim" data-dia="${h.dia_semana}" value="${h.hora_fim || '18:00'}" ${!h.aberto ? 'disabled' : ''}>
            </td>
            <td>
                <input type="time" class="almoco-inicio" data-dia="${h.dia_semana}" value="${h.almoco_inicio || '12:00'}" ${!h.aberto ? 'disabled' : ''}>
                às
                <input type="time" class="almoco-fim" data-dia="${h.dia_semana}" value="${h.almoco_fim || '13:00'}" ${!h.aberto ? 'disabled' : ''}>
            </td>
            <td>
                <select class="intervalo-select" data-dia="${h.dia_semana}" ${!h.aberto ? 'disabled' : ''}>
                    <option value="15" ${h.intervalo_minutos === 15 ? 'selected' : ''}>15 min</option>
                    <option value="30" ${h.intervalo_minutos === 30 ? 'selected' : ''}>30 min</option>
                    <option value="45" ${h.intervalo_minutos === 45 ? 'selected' : ''}>45 min</option>
                    <option value="60" ${h.intervalo_minutos === 60 ? 'selected' : ''}>1 hora</option>
                </select>
            </td>
        </tr>
    `).join('');
}

// ============================================
// FUNÇÕES DE PROFISSIONAIS
// ============================================

// Abrir modal para adicionar/editar profissional
function abrirModalProfissional(profissional = null) {
    const isEdit = !!profissional;
    const title = isEdit ? '✏️ Editar Profissional' : '➕ Novo Profissional';

    const modalContent = `
        <form id="form-profissional" onsubmit="salvarProfissional(event, ${isEdit ? profissional.id : 'null'})">
            <div class="form-group">
                <label>Nome completo *</label>
                <input type="text" id="prof-nome" class="form-control" value="${isEdit ? escapeHtml(profissional.nome) : ''}" required>
            </div>
            
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="prof-email" class="form-control" value="${isEdit ? escapeHtml(profissional.email) : ''}" required>
            </div>
            
            ${!isEdit ? `
                <div class="form-group">
                    <label>Senha *</label>
                    <input type="password" id="prof-senha" class="form-control" placeholder="Digite a senha" required>
                    <small class="text-muted">O profissional usará esta senha para acessar o sistema</small>
                </div>
            ` : `
                <div class="form-group">
                    <label>Nova Senha (opcional)</label>
                    <input type="password" id="prof-senha" class="form-control" placeholder="Deixe em branco para manter a atual">
                    <small class="text-muted">Preencha apenas se quiser alterar a senha</small>
                </div>
            `}
            
            <div class="form-group">
                <label>Comissão (%) *</label>
                <input type="number" id="prof-comissao" class="form-control" value="${isEdit ? profissional.comissao_percent : '30'}" min="0" max="100" step="1" required>
                <small class="text-muted">Percentual sobre cada serviço realizado</small>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn btn-secondary" onclick="fecharModalPersonalizado()">Cancelar</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar Alterações' : 'Cadastrar Profissional'}</button>
            </div>
        </form>
    `;

    showModal(title, modalContent);
}

// Fechar modal personalizado
function fecharModalPersonalizado() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

// Salvar profissional (novo ou edição)
async function salvarProfissional(event, id) {
    event.preventDefault();

    const nome = document.getElementById('prof-nome').value;
    const email = document.getElementById('prof-email').value;
    const senha = document.getElementById('prof-senha').value;
    const comissaoPercent = parseInt(document.getElementById('prof-comissao').value);

    if (!nome || !email || !comissaoPercent) {
        showToast('Preencha todos os campos obrigatórios', 'warning');
        return;
    }

    if (comissaoPercent < 0 || comissaoPercent > 100) {
        showToast('Comissão deve ser entre 0 e 100%', 'warning');
        return;
    }

    showLoading();

    try {
        const token = localStorage.getItem('token');
        let url = '/api/profissionais';
        let method = 'POST';
        let body = { nome, email, comissao_percent: comissaoPercent };

        if (id) {
            // Edição
            url = `/api/profissionais/${id}`;
            method = 'PUT';
            if (senha) {
                body.senha = senha;
            }
        } else {
            // Novo
            if (!senha) {
                showToast('Informe a senha do profissional', 'warning');
                hideLoading();
                return;
            }
            body.senha = senha;
        }

        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (data.success) {
            showToast(id ? 'Profissional atualizado com sucesso!' : 'Profissional cadastrado com sucesso!', 'success');
            fecharModalPersonalizado();
            carregarConfiguracoes(); // Recarregar a página
        } else {
            showToast(data.message || 'Erro ao salvar profissional', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar profissional:', error);
        showToast('Erro ao salvar profissional', 'error');
    }

    hideLoading();
}

// Editar profissional
function editarProfissional(id) {
    const profissional = profissionaisData.find(p => p.id === id);
    if (profissional) {
        abrirModalProfissional(profissional);
    } else {
        showToast('Profissional não encontrado', 'error');
    }
}

// Resetar senha do profissional
async function resetarSenhaProfissional(id, nome) {
    const novaSenha = prompt(`Digite a nova senha para ${nome} (mínimo 4 caracteres):`);

    if (!novaSenha) return;

    if (novaSenha.length < 4) {
        showToast('Senha deve ter pelo menos 4 caracteres', 'warning');
        return;
    }

    showLoading();

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/profissionais/${id}/reset-senha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ senha: novaSenha })
        });

        const data = await res.json();

        if (data.success) {
            showToast(`Senha de ${nome} alterada com sucesso!`, 'success');
        } else {
            showToast(data.message || 'Erro ao resetar senha', 'error');
        }
    } catch (error) {
        console.error('Erro ao resetar senha:', error);
        showToast('Erro ao resetar senha', 'error');
    }

    hideLoading();
}

// Alternar status (ativar/desativar)
async function alternarStatusProfissional(id, ativar) {
    const acao = ativar ? 'ativar' : 'desativar';
    const confirmMsg = `Tem certeza que deseja ${ativar ? 'ativar' : 'desativar'} este profissional?`;

    if (!confirm(confirmMsg)) return;

    showLoading();

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/profissionais/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ ativo: ativar ? 1 : 0 })
        });

        const data = await res.json();

        if (data.success) {
            showToast(`Profissional ${ativar ? 'ativado' : 'desativado'} com sucesso!`, 'success');
            carregarConfiguracoes();
        } else {
            showToast(data.message || `Erro ao ${acao} profissional`, 'error');
        }
    } catch (error) {
        console.error(`Erro ao ${acao} profissional:`, error);
        showToast(`Erro ao ${acao} profissional`, 'error');
    }

    hideLoading();
}

// Excluir profissional
async function excluirProfissional(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir ${nome}?\n\nEsta ação não poderá ser desfeita!`)) return;

    showLoading();

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/profissionais/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await res.json();

        if (data.success) {
            showToast(`Profissional ${nome} excluído com sucesso!`, 'success');
            carregarConfiguracoes();
        } else {
            showToast(data.message || 'Erro ao excluir profissional', 'error');
        }
    } catch (error) {
        console.error('Erro ao excluir profissional:', error);
        showToast('Erro ao excluir profissional', 'error');
    }

    hideLoading();
}

// ============================================
// FUNÇÕES DE HORÁRIOS
// ============================================

function inicializarHorariosEvents() {
    // Status toggle
    document.querySelectorAll('.status-toggle').forEach(toggle => {
        toggle.addEventListener('change', async (e) => {
            const dia = e.target.getAttribute('data-dia');
            const aberto = e.target.checked ? 1 : 0;

            // Habilitar/desabilitar campos
            const row = e.target.closest('tr');
            const inputs = row.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input !== e.target) {
                    input.disabled = !aberto;
                }
            });

            await salvarHorario(dia, { aberto });
        });
    });

    // Inputs de horário
    document.querySelectorAll('.hora-inicio, .hora-fim, .almoco-inicio, .almoco-fim, .intervalo-select').forEach(input => {
        input.addEventListener('change', async (e) => {
            const dia = e.target.getAttribute('data-dia');
            const campo = e.target.classList.contains('hora-inicio') ? 'hora_inicio' :
                e.target.classList.contains('hora-fim') ? 'hora_fim' :
                    e.target.classList.contains('almoco-inicio') ? 'almoco_inicio' :
                        e.target.classList.contains('almoco-fim') ? 'almoco_fim' : 'intervalo_minutos';

            const valor = campo === 'intervalo_minutos' ? parseInt(e.target.value) : e.target.value;

            await salvarHorario(dia, { [campo]: valor });
        });
    });
}

async function salvarHorario(dia, dados) {
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`/api/horarios/${dia}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(dados)
        });

        const data = await res.json();

        if (!data.success) {
            showToast('Erro ao salvar horário', 'error');
        }
    } catch (error) {
        console.error('Erro ao salvar horário:', error);
    }
}

// ============================================
// UTILITÁRIOS
// ============================================

function switchTab(tab) {
    // Mudar estilo dos botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Mostrar conteúdo da tab
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.getElementById(`tab-${tab}`).classList.add('active');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
}

// Exportar funções globais
window.carregarConfiguracoes = carregarConfiguracoes;
window.switchTab = switchTab;
window.abrirModalProfissional = abrirModalProfissional;
window.salvarProfissional = salvarProfissional;
window.editarProfissional = editarProfissional;
window.resetarSenhaProfissional = resetarSenhaProfissional;
window.alternarStatusProfissional = alternarStatusProfissional;
window.excluirProfissional = excluirProfissional;
window.fecharModalPersonalizado = fecharModalPersonalizado;