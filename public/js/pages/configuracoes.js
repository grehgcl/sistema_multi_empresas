// Configurações Unificadas - Profissionais + Horários + Chatbot

let profissionaisData = [];
let planoInfo = { plano: 'trial', limite: 1, ativos: 0, podeAdicionar: true };

// ============================================
// FUNÇÃO PRINCIPAL (chamada pelo menu)
// ============================================
async function carregarConfiguracoes() {
    ativarBotao('configuracoes');
    showLoading();

    const token = localStorage.getItem('token');

    try {
        const [profissionaisRes, horariosRes, planoRes] = await Promise.all([
            fetch('/api/profissionais', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/horarios', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/empresa/plano', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);

        const profissionaisData_raw = await profissionaisRes.json();
        const horariosData = await horariosRes.json();
        const planoData = await planoRes.json();

        if (profissionaisData_raw.success) {
            profissionaisData = profissionaisData_raw.data || [];
        }

        if (planoData.success && planoData.data) {
            const ativos = profissionaisData.filter(p => p.ativo === 1).length;
            planoInfo = {
                plano: planoData.data.plano,
                plano_nome: planoData.data.plano_nome || (planoData.data.plano === 'trial' ? 'Trial' : planoData.data.plano),
                limite: planoData.data.limite_profissionais,
                ativos: ativos,
                podeAdicionar: ativos < planoData.data.limite_profissionais,
                is_trial: planoData.data.is_trial,
                dias_restantes: planoData.data.dias_restantes || 0,
                valida_ate: planoData.data.valida_ate
            };
        }

        let html = `
            <div class="fade-in">
                <h2 class="page-title">⚙️ Configurações</h2>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <button id="btnProfissionais" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">👥 Profissionais</button>
                    <button id="btnHorarios" style="padding: 10px 20px; background: #e2e8f0; color: #333; border: none; border-radius: 8px; cursor: pointer;">⏰ Horários</button>
                    <button id="btnChatbot" style="padding: 10px 20px; background: #e2e8f0; color: #333; border: none; border-radius: 8px; cursor: pointer;">🤖 Chatbot</button>
                </div>
                
                <!-- ABA PROFISSIONAIS -->
                <div id="abaProfissionais" style="display: block;">
                    <div class="card">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                            <h3 style="margin: 0;">👥 Profissionais da Barbearia</h3>
                            ${planoInfo.podeAdicionar ?
                `<button class="btn btn-primary" onclick="abrirModalProfissional()">+ Novo Profissional</button>` :
                `<button class="btn btn-secondary" disabled style="opacity: 0.6;">🔒 Limite Atingido</button>`
            }
                        </div>
                        
                        <div style="background: linear-gradient(135deg, ${planoInfo.is_trial ? '#f59e0b20' : '#667eea20'}, ${planoInfo.is_trial ? '#f59e0b20' : '#764ba220'}); padding: 16px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid ${planoInfo.is_trial ? '#f59e0b' : '#667eea'};">
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                                <div>
                                    <strong>📋 Plano ${planoInfo.plano_nome}</strong><br>
                                    <small>Limite: ${planoInfo.limite} profissional(is)</small>
                                    <div style="margin-top: 5px;">
                                        <div style="background: #e2e8f0; border-radius: 10px; height: 6px; width: 200px; overflow: hidden;">
                                            <div style="width: ${(planoInfo.ativos / planoInfo.limite) * 100}%; background: linear-gradient(135deg, #667eea, #764ba2); height: 100%;"></div>
                                        </div>
                                        <small>${planoInfo.ativos} de ${planoInfo.limite} utilizado(s)</small>
                                    </div>
                                </div>
                                <div>
                                    ${planoInfo.is_trial ?
                `<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px;">🎯 Trial: ${planoInfo.dias_restantes} dias</span>` :
                `<span style="background: #48bb78; color: white; padding: 4px 12px; border-radius: 20px;">✅ Válido até: ${planoInfo.valida_ate || 'N/A'}</span>`
            }
                                    ${!planoInfo.podeAdicionar && planoInfo.ativos > 0 ?
                `<button class="btn-primary" onclick="carregarPlanos()" style="margin-left: 10px;">💎 Upgrade</button>` : ''
            }
                                </div>
                            </div>
                        </div>
                        
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead><tr><th>Nome</th><th>Email</th><th>Comissão</th><th>Status</th><th>Data</th><th>Ações</th></tr></thead>
                                <tbody id="profissionaisTableBody">${renderProfissionaisList()}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- ABA HORARIOS -->
                <div id="abaHorarios" style="display: none;">
                    <div class="card">
                        <h3>⏰ Horários de Funcionamento</h3>
                        <p class="text-muted">Configure os dias e horários. As alterações são salvas automaticamente.</p>
                        <div class="table-responsive">
                            <table class="data-table">
                                <thead><tr><th>Dia</th><th>Status</th><th>Horário</th><th>Almoço</th><th>Intervalo</th></tr></thead>
                                <tbody id="horariosTableBody">${renderHorariosList(horariosData.data || [])}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- ABA CHATBOT -->
                <div id="abaChatbot" style="display: none;">
                    <div class="card">
                        <h3>🤖 Chatbot de Agendamento</h3>
                        <p>Compartilhe o link com seus clientes para agendarem automaticamente.</p>
                        
                        <div style="background: #e0e7ff; padding: 20px; border-radius: 16px; margin: 20px 0;">
                            <h4>📋 Regras:</h4>
                            <ul style="margin-left: 20px;">
                                <li>✅ Respeita horários de funcionamento</li>
                                <li>✅ Cliente só agenda 1 vez a cada 20 dias</li>
                                <li>✅ Você pode bloquear clientes na tela de Clientes</li>
                            </ul>
                        </div>
                        
                        <div class="form-group">
                            <label>🔗 Link do Chatbot</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" id="chatbotLink" class="form-control" readonly style="flex:1; background:#f3f4f6;">
                                <button class="btn btn-primary" onclick="copiarLinkChatbot()">📋 Copiar</button>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; padding: 20px; background: #f9fafb; border-radius: 16px;">
                            <p>📱 QR Code:</p>
                            <div id="qrCode" style="display: flex; justify-content: center;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('content').innerHTML = html;

        // Configurar eventos dos botões
        document.getElementById('btnProfissionais').onclick = () => mostrarAba('profissionais');
        document.getElementById('btnHorarios').onclick = () => mostrarAba('horarios');
        document.getElementById('btnChatbot').onclick = () => mostrarAba('chatbot');

        // Inicializar eventos dos horários APÓS o HTML estar no DOM
        inicializarHorariosEvents();

        // Carregar link do chatbot
        carregarLinkChatbot();

    } catch (error) {
        console.error('Erro:', error);
        showToast('Erro ao carregar configurações', 'error');
    }

    hideLoading();
}

function mostrarAba(aba) {
    document.getElementById('abaProfissionais').style.display = 'none';
    document.getElementById('abaHorarios').style.display = 'none';
    document.getElementById('abaChatbot').style.display = 'none';

    document.getElementById(`aba${aba.charAt(0).toUpperCase() + aba.slice(1)}`).style.display = 'block';

    const btnProf = document.getElementById('btnProfissionais');
    const btnHor = document.getElementById('btnHorarios');
    const btnChat = document.getElementById('btnChatbot');

    btnProf.style.background = '#e2e8f0';
    btnProf.style.color = '#333';
    btnHor.style.background = '#e2e8f0';
    btnHor.style.color = '#333';
    btnChat.style.background = '#e2e8f0';
    btnChat.style.color = '#333';

    if (aba === 'profissionais') {
        btnProf.style.background = '#667eea';
        btnProf.style.color = 'white';
    } else if (aba === 'horarios') {
        btnHor.style.background = '#667eea';
        btnHor.style.color = 'white';
    } else if (aba === 'chatbot') {
        btnChat.style.background = '#667eea';
        btnChat.style.color = 'white';
        carregarLinkChatbot();
    }
}

// ============================================
// FUNÇÕES DO CHATBOT
// ============================================
async function carregarLinkChatbot() {
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!usuario.empresa_id) return;

    try {
        const res = await fetch(`/api/chatbot/link/${usuario.empresa_id}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        if (data.success) {
            const linkInput = document.getElementById('chatbotLink');
            if (linkInput) linkInput.value = data.link;
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

function copiarLinkChatbot() {
    const input = document.getElementById('chatbotLink');
    if (input) { input.select(); document.execCommand('copy'); showToast('Link copiado!', 'success'); }
}

// ============================================
// RENDERIZAR LISTAS
// ============================================
function renderProfissionaisList() {
    if (!profissionaisData || profissionaisData.length === 0) {
        return `<tr><td colspan="6" style="text-align:center;">Nenhum profissional cadastrado</td></tr>`;
    }
    return profissionaisData.map(prof => `
        <tr>
            <td><strong>${escapeHtml(prof.nome)}</strong></td>
            <td>${escapeHtml(prof.email)}</td>
            <td><span class="badge">${prof.comissao_percent}%</span></td>
            <td>${prof.ativo === 1 ? '<span class="badge-success">✅ Ativo</span>' : '<span class="badge-danger">❌ Inativo</span>'}</td>
            <td>${formatarData(prof.created_at)}</td>
            <td class="actions-cell">
                <button class="btn-icon" onclick="editarProfissional(${prof.id})">✏️</button>
                <button class="btn-icon" onclick="resetarSenhaProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🔑</button>
                <button class="btn-icon" onclick="alternarStatusProfissional(${prof.id}, ${prof.ativo === 1 ? 'false' : 'true'})">${prof.ativo === 1 ? '🔴' : '🟢'}</button>
                <button class="btn-icon" onclick="excluirProfissional(${prof.id}, '${escapeHtml(prof.nome)}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderHorariosList(horarios) {
    const dias = { 0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado' };

    if (!horarios || horarios.length === 0) {
        return [0, 1, 2, 3, 4, 5, 6].map(dia => `
            <tr>
                <td><strong>${dias[dia]}</strong></td>
                <td><label class="switch"><input type="checkbox" class="status-toggle" data-dia="${dia}" ${dia === 0 ? '' : 'checked'}><span class="slider round"></span></label></td>
                <td><input type="time" class="hora-inicio" data-dia="${dia}" value="09:00" ${dia === 0 ? 'disabled' : ''}> às <input type="time" class="hora-fim" data-dia="${dia}" value="18:00" ${dia === 0 ? 'disabled' : ''}></td>
                <td><input type="time" class="almoco-inicio" data-dia="${dia}" value="12:00" ${dia === 0 ? 'disabled' : ''}> às <input type="time" class="almoco-fim" data-dia="${dia}" value="13:00" ${dia === 0 ? 'disabled' : ''}></td>
                <td><select class="intervalo-select" data-dia="${dia}" ${dia === 0 ? 'disabled' : ''}><option value="30" selected>30 min</option></select></td>
            </tr>
        `).join('');
    }

    return horarios.map(h => `
        <tr>
            <td><strong>${dias[h.dia_semana]}</strong></td>
            <td><label class="switch"><input type="checkbox" class="status-toggle" data-dia="${h.dia_semana}" ${h.aberto === 1 ? 'checked' : ''}><span class="slider round"></span></label></td>
            <td><input type="time" class="hora-inicio" data-dia="${h.dia_semana}" value="${h.hora_inicio || '09:00'}" ${!h.aberto ? 'disabled' : ''}> às <input type="time" class="hora-fim" data-dia="${h.dia_semana}" value="${h.hora_fim || '18:00'}" ${!h.aberto ? 'disabled' : ''}></td>
            <td><input type="time" class="almoco-inicio" data-dia="${h.dia_semana}" value="${h.almoco_inicio || '12:00'}" ${!h.aberto ? 'disabled' : ''}> às <input type="time" class="almoco-fim" data-dia="${h.dia_semana}" value="${h.almoco_fim || '13:00'}" ${!h.aberto ? 'disabled' : ''}></td>
            <td><select class="intervalo-select" data-dia="${h.dia_semana}" ${!h.aberto ? 'disabled' : ''}>
                <option value="30" selected>30 min</option>
            </select></td>
        </tr>
    `).join('');
}

// ============================================
// FUNÇÕES DE HORÁRIOS
// ============================================
function inicializarHorariosEvents() {
    const tbody = document.getElementById('horariosTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('.status-toggle').forEach(toggle => {
        toggle.removeEventListener('change', handleStatusChange);
        toggle.addEventListener('change', handleStatusChange);
    });

    tbody.querySelectorAll('.hora-inicio, .hora-fim, .almoco-inicio, .almoco-fim, .intervalo-select').forEach(input => {
        input.removeEventListener('change', handleHorarioChange);
        input.addEventListener('change', handleHorarioChange);
    });
}

function handleStatusChange(e) {
    const dia = e.target.getAttribute('data-dia');
    const aberto = e.target.checked ? 1 : 0;
    const row = e.target.closest('tr');
    row.querySelectorAll('input, select').forEach(input => {
        if (input !== e.target) input.disabled = !aberto;
    });
    salvarHorario(dia, { aberto });
}

function handleHorarioChange(e) {
    const dia = e.target.getAttribute('data-dia');
    const campo = e.target.classList.contains('hora-inicio') ? 'hora_inicio' :
        e.target.classList.contains('hora-fim') ? 'hora_fim' :
            e.target.classList.contains('almoco-inicio') ? 'almoco_inicio' :
                e.target.classList.contains('almoco-fim') ? 'almoco_fim' : 'intervalo_minutos';
    const valor = campo === 'intervalo_minutos' ? parseInt(e.target.value) : e.target.value;
    salvarHorario(dia, { [campo]: valor });
}

async function salvarHorario(dia, dados) {
    const token = localStorage.getItem('token');
    try {
        await fetch(`/api/horarios/${dia}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(dados)
        });
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ============================================
// FUNÇÕES DE PROFISSIONAIS
// ============================================
function abrirModalProfissional(profissional = null) {
    if (!profissional && !planoInfo.podeAdicionar) {
        showModal('Limite Atingido', `<p>Seu plano ${planoInfo.plano_nome} permite apenas ${planoInfo.limite} profissional(is).</p><button onclick="carregarPlanos()">💎 Ver Planos</button>`);
        return;
    }

    const isEdit = !!profissional;
    const modalContent = `
        <form onsubmit="salvarProfissional(event, ${isEdit ? profissional.id : 'null'})">
            <input type="text" id="prof-nome" placeholder="Nome" value="${isEdit ? escapeHtml(profissional.nome) : ''}" required>
            <input type="email" id="prof-email" placeholder="Email" value="${isEdit ? escapeHtml(profissional.email) : ''}" required>
            <input type="password" id="prof-senha" placeholder="Senha" ${!isEdit ? 'required' : ''}>
            <input type="number" id="prof-comissao" placeholder="Comissão %" value="${isEdit ? profissional.comissao_percent : '30'}" required>
            <button type="submit">Salvar</button>
            <button type="button" onclick="fecharModalPersonalizado()">Cancelar</button>
        </form>
    `;
    showModal(isEdit ? '✏️ Editar' : '➕ Novo Profissional', modalContent);
}

async function salvarProfissional(event, id) {
    event.preventDefault();
    const nome = document.getElementById('prof-nome')?.value;
    const email = document.getElementById('prof-email')?.value;
    const senha = document.getElementById('prof-senha')?.value;
    const comissao = parseInt(document.getElementById('prof-comissao')?.value);

    if (!nome || !email) return showToast('Preencha os campos', 'warning');

    showLoading();
    const token = localStorage.getItem('token');
    const body = { nome, email, comissao_percent: comissao };
    if (!id && senha) body.senha = senha;
    if (id && senha) body.senha = senha;

    const res = await fetch(id ? `/api/profissionais/${id}` : '/api/profissionais', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    hideLoading();

    if (data.success) {
        showToast('Profissional salvo!', 'success');
        fecharModalPersonalizado();
        carregarConfiguracoes();
    } else {
        showToast(data.message || 'Erro', 'error');
    }
}

function editarProfissional(id) {
    const profissional = profissionaisData.find(p => p.id === id);
    if (profissional) abrirModalProfissional(profissional);
}

async function resetarSenhaProfissional(id, nome) {
    const novaSenha = prompt(`Nova senha para ${nome}:`);
    if (!novaSenha || novaSenha.length < 4) return showToast('Senha com 4+ caracteres', 'warning');
    showLoading();
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/profissionais/${id}/reset-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ senha: novaSenha })
    });
    const data = await res.json();
    hideLoading();
    showToast(data.success ? 'Senha alterada!' : data.message, data.success ? 'success' : 'error');
}

async function alternarStatusProfissional(id, ativar) {
    if (!confirm(`Deseja ${ativar ? 'ativar' : 'desativar'}?`)) return;
    showLoading();
    const token = localStorage.getItem('token');
    await fetch(`/api/profissionais/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ ativo: ativar ? 1 : 0 })
    });
    hideLoading();
    carregarConfiguracoes();
}

async function excluirProfissional(id, nome) {
    if (!confirm(`Excluir ${nome}?`)) return;
    showLoading();
    const token = localStorage.getItem('token');
    await fetch(`/api/profissionais/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    hideLoading();
    showToast('Profissional excluído', 'success');
    carregarConfiguracoes();
}

function fecharModalPersonalizado() {
    const modal = document.querySelector('.modal');
    if (modal) modal.remove();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    return new Date(dataStr).toLocaleDateString('pt-BR');
}

// Exportar funções
window.carregarConfiguracoes = carregarConfiguracoes;
window.mostrarAba = mostrarAba;
window.abrirModalProfissional = abrirModalProfissional;
window.salvarProfissional = salvarProfissional;
window.editarProfissional = editarProfissional;
window.resetarSenhaProfissional = resetarSenhaProfissional;
window.alternarStatusProfissional = alternarStatusProfissional;
window.excluirProfissional = excluirProfissional;
window.fecharModalPersonalizado = fecharModalPersonalizado;
window.copiarLinkChatbot = copiarLinkChatbot;
window.carregarLinkChatbot = carregarLinkChatbot;