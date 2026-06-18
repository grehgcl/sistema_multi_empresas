// ============================================
// CHATBOT INTELIGENTE - BARBEARIA PRO
// VERSÃO COM VERIFICAÇÃO DE CLIENTE EXISTENTE E CALENDÁRIO
// ============================================

let conversationState = {
    step: 'verificacao',
    clienteId: null,
    nome: null,
    telefone: null,
    email: null,
    servicoId: null,
    profissionalId: null,
    data: null,
    hora: null,
    empresaId: null,
    empresaNome: null,
    isClienteExistente: false
};

let servicosList = [];
let profissionaisList = [];
let horariosDisponiveis = [];
let mesAtual = new Date();

// Obter empresa da URL
const urlParams = new URLSearchParams(window.location.search);
const empresaId = urlParams.get('empresa');

if (!empresaId) {
    document.getElementById('chatMessages').innerHTML = `
        <div class="message bot">
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <div class="message-text" style="color: #ef4444;">
                    ❌ Link inválido. Por favor, solicite um novo link de agendamento.
                </div>
            </div>
        </div>
    `;
} else {
    carregarEmpresa();
}

async function carregarEmpresa() {
    try {
        const res = await fetch(`/api/chatbot/empresa/${empresaId}`);
        const data = await res.json();

        if (data.success) {
            conversationState.empresaId = data.empresa.id;
            conversationState.empresaNome = data.empresa.nome;
            document.getElementById('empresaNome').innerText = data.empresa.nome;

            await carregarServicos();
            await carregarProfissionais();

            const botoesOpcao = [
                { label: '✅ Sim, já sou cliente', valor: 'sim' },
                { label: '➕ Não, sou novo cliente', valor: 'nao' }
            ];
            mostrarMensagemBot('Olá! 👋 Seja bem-vindo à ' + conversationState.empresaNome + '!\n\nVocê já é cliente da barbearia?', botoesOpcao);
        } else {
            mostrarMensagemBot('❌ Não foi possível carregar a barbearia. Link inválido.');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagemBot('❌ Erro ao carregar. Tente novamente mais tarde.');
    }
}

async function carregarServicos() {
    const res = await fetch(`/api/chatbot/servicos/${conversationState.empresaId}`);
    const data = await res.json();
    if (data.success) {
        servicosList = data.servicos;
    }
}

async function carregarProfissionais() {
    const res = await fetch(`/api/chatbot/profissionais/${conversationState.empresaId}`);
    const data = await res.json();
    if (data.success) {
        profissionaisList = data.profissionais;

        const donoRes = await fetch(`/api/chatbot/dono/${conversationState.empresaId}`);
        const donoData = await donoRes.json();
        if (donoData.success && donoData.dono) {
            profissionaisList.unshift({
                id: 'dono_' + donoData.dono.id,
                nome: donoData.dono.nome + ' (Dono)',
                isDono: true
            });
        }
    }
}

function mostrarMensagemBot(mensagem, options = null) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    messageDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="message-text">${mensagem}</div>
        </div>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    if (options) {
        mostrarOpcoes(options);
    }
}

function mostrarMensagemUsuario(mensagem) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user';
    messageDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-user"></i></div>
        <div class="message-content">
            <div class="message-text">${mensagem}</div>
        </div>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function mostrarOpcoes(opcoes) {
    const optionsDiv = document.getElementById('inputOptions');
    optionsDiv.innerHTML = '';

    opcoes.forEach(opcao => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opcao.label;
        btn.onclick = () => {
            document.getElementById('chatInput').value = opcao.valor;
            enviarMensagem();
        };
        optionsDiv.appendChild(btn);
    });

    optionsDiv.style.display = 'flex';
}

function esconderOpcoes() {
    document.getElementById('inputOptions').style.display = 'none';
}

function mostrarTyping() {
    const messagesDiv = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messagesDiv.appendChild(typingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function esconderTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

async function enviarMensagem() {
    const input = document.getElementById('chatInput');
    const mensagem = input.value.trim();

    if (!mensagem) return;

    mostrarMensagemUsuario(mensagem);
    input.value = '';
    esconderOpcoes();

    mostrarTyping();

    setTimeout(async () => {
        esconderTyping();
        await processarMensagem(mensagem);
    }, 500);
}

async function processarMensagem(mensagem) {
    switch (conversationState.step) {
        case 'verificacao':
            await processarVerificacao(mensagem);
            break;
        case 'buscarCliente':
            await processarBuscarCliente(mensagem);
            break;
        case 'nome':
            await processarNome(mensagem);
            break;
        case 'telefone':
            await processarTelefone(mensagem);
            break;
        case 'servico':
            await processarServico(mensagem);
            break;
        case 'profissional':
            await processarProfissional(mensagem);
            break;
        case 'data':
            await processarData(mensagem);
            break;
        case 'hora':
            await processarHora(mensagem);
            break;
        case 'confirmacao':
            await processarConfirmacao(mensagem);
            break;
        default:
            mostrarMensagemBot('Desculpe, não entendi. Vamos recomeçar?');
            resetarConversa();
    }
}

async function processarVerificacao(mensagem) {
    if (mensagem.toLowerCase() === 'sim') {
        conversationState.step = 'buscarCliente';
        mostrarMensagemBot('Ótimo! 👍\n\nPor favor, digite seu número de telefone com DDD para encontrarmos seus dados:\n(ex: 11999999999)');
    } else {
        conversationState.isClienteExistente = false;
        conversationState.step = 'nome';
        mostrarMensagemBot('Tudo bem! Vamos fazer seu cadastro rapidinho. ✨\n\nPor favor, digite seu nome completo:');
    }
}

async function processarBuscarCliente(telefone) {
    const telefoneLimpo = telefone.replace(/\D/g, '');

    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagemBot('Por favor, digite um telefone válido com DDD (ex: 11999999999):');
        return;
    }

    mostrarTyping();

    try {
        const res = await fetch('/api/chatbot/cliente/buscar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telefone: telefoneLimpo,
                empresaId: conversationState.empresaId
            })
        });
        const data = await res.json();

        esconderTyping();

        if (data.success && data.cliente) {
            conversationState.clienteId = data.cliente.id;
            conversationState.nome = data.cliente.nome;
            conversationState.telefone = data.cliente.telefone;
            conversationState.isClienteExistente = true;

            mostrarMensagemBot(`✅ Cliente encontrado!\n\nBem-vindo de volta, ${conversationState.nome}! ✨\n\nVamos prosseguir com seu agendamento.`);
            conversationState.step = 'servico';

            if (servicosList.length === 0) {
                mostrarMensagemBot('❌ Desculpe, não há serviços disponíveis no momento.');
                return;
            }

            const botoesServicos = servicosList.map(s => ({
                label: `${s.nome} - R$ ${s.valor.toFixed(2)}`,
                valor: s.nome
            }));
            mostrarMensagemBot('📋 Escolha o serviço desejado:', botoesServicos);

        } else {
            mostrarMensagemBot('❌ Não encontramos nenhum cliente com este telefone.\n\nVamos fazer seu cadastro! 📝\n\nPor favor, digite seu nome completo:');
            conversationState.step = 'nome';
            conversationState.isClienteExistente = false;
        }
    } catch (error) {
        esconderTyping();
        mostrarMensagemBot('Erro ao buscar cliente. Tente novamente.');
    }
}

async function processarNome(nome) {
    if (nome.length < 3) {
        mostrarMensagemBot('Por favor, digite seu nome completo (mínimo 3 caracteres):');
        return;
    }

    conversationState.nome = nome;
    conversationState.step = 'telefone';

    mostrarMensagemBot(`Prazer, ${nome}! ✨\n\nAgora, me informe seu telefone com DDD para contato (ex: 11999999999):`);
}

async function processarTelefone(telefone) {
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        mostrarMensagemBot('Por favor, digite um telefone válido com DDD (ex: 11999999999):');
        return;
    }

    conversationState.telefone = telefoneLimpo;
    conversationState.step = 'servico';

    const clienteValido = await criarOuAtualizarCliente();
    if (!clienteValido) return;

    if (servicosList.length === 0) {
        mostrarMensagemBot('❌ Desculpe, não há serviços disponíveis no momento.');
        return;
    }

    const botoesServicos = servicosList.map(s => ({
        label: `${s.nome} - R$ ${s.valor.toFixed(2)}`,
        valor: s.nome
    }));

    mostrarMensagemBot('📋 Escolha o serviço desejado:', botoesServicos);
}

async function criarOuAtualizarCliente() {
    try {
        const res = await fetch('/api/chatbot/cliente/criar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: conversationState.nome,
                telefone: conversationState.telefone,
                email: conversationState.email,
                empresaId: conversationState.empresaId
            })
        });
        const data = await res.json();

        if (data.success) {
            conversationState.clienteId = data.clienteId;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Erro:', error);
        return false;
    }
}

async function processarServico(mensagem) {
    let servicoEncontrado = servicosList.find(s =>
        s.nome.toLowerCase().includes(mensagem.toLowerCase())
    );

    if (!servicoEncontrado) {
        const botoesServicos = servicosList.map(s => ({
            label: `${s.nome} - R$ ${s.valor.toFixed(2)}`,
            valor: s.nome
        }));
        mostrarMensagemBot('Serviço não encontrado. Por favor, escolha um serviço da lista:', botoesServicos);
        return;
    }

    conversationState.servicoId = servicoEncontrado.id;
    conversationState.step = 'profissional';

    if (profissionaisList.length === 0) {
        mostrarMensagemBot('Não há profissionais disponíveis no momento.');
        return;
    }

    const botoesProfissionais = profissionaisList.map(p => ({
        label: p.nome,
        valor: p.nome
    }));

    mostrarMensagemBot('💇 Escolha o profissional que deseja atender você:', botoesProfissionais);
}

async function processarProfissional(mensagem) {
    let profissionalEncontrado = profissionaisList.find(p =>
        p.nome.toLowerCase().includes(mensagem.toLowerCase())
    );

    if (!profissionalEncontrado) {
        const botoesProfissionais = profissionaisList.map(p => ({
            label: p.nome,
            valor: p.nome
        }));
        mostrarMensagemBot('Profissional não encontrado. Por favor, escolha um da lista:', botoesProfissionais);
        return;
    }

    conversationState.profissionalId = profissionalEncontrado.id;
    conversationState.step = 'data';

    await mostrarCalendario();
}

async function mostrarCalendario() {
    mostrarTyping();

    try {
        const res = await fetch('/api/chatbot/datas-disponiveis-mes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresaId: conversationState.empresaId,
                mes: mesAtual.getMonth(),
                ano: mesAtual.getFullYear()
            })
        });
        const data = await res.json();

        esconderTyping();

        if (data.success) {
            const calendarioHtml = gerarCalendario(mesAtual, data.diasDisponiveis || []);

            const mensagemCalendario = `
📅 **Selecione a data desejada no calendário abaixo:**

${calendarioHtml}

*Clique em qualquer data disponível (em verde) para selecionar*
            `;

            mostrarMensagemBot(mensagemCalendario);

            setTimeout(() => {
                document.querySelectorAll('.calendario-data-disponivel').forEach(el => {
                    el.removeEventListener('click', handleDataClick);
                    el.addEventListener('click', handleDataClick);
                });

                document.querySelectorAll('.calendario-nav').forEach(el => {
                    el.removeEventListener('click', handleNavClick);
                    el.addEventListener('click', handleNavClick);
                });
            }, 100);
        } else {
            mostrarMensagemBot('❌ Não há datas disponíveis neste mês.');
        }
    } catch (error) {
        esconderTyping();
        mostrarMensagemBot('Erro ao buscar datas. Tente novamente.');
    }
}

function handleDataClick(e) {
    const dataSelecionada = e.currentTarget.getAttribute('data-data');
    document.getElementById('chatInput').value = dataSelecionada;
    enviarMensagem();
}

function handleNavClick(e) {
    const delta = parseInt(e.currentTarget.getAttribute('data-delta'));
    mudarMes(delta);
}

function gerarCalendario(data, diasDisponiveis) {
    const ano = data.getFullYear();
    const mes = data.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const primeiroDiaSemana = primeiroDia.getDay();

    // NOVO: Pega hoje sem horas
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const diasSemana = ['D', 'S', 'T', 'Q', 'S', 'S'];

    let html = '<div class="calendario-container">';
    html += '<div class="calendario-header">';
    html += '<button class="calendario-nav" data-delta="-1">◀</button>';
    html += '<span>' + meses[mes] + ' ' + ano + '</span>';
    html += '<button class="calendario-nav" data-delta="1">▶</button>';
    html += '</div>';

    html += '<div class="calendario-semana">';
    for (let i = 0; i < diasSemana.length; i++) {
        html += '<div class="calendario-dia-semana">' + diasSemana[i] + '</div>';
    }
    html += '</div>';

    html += '<div class="calendario-dias">';

    for (let i = 0; i < primeiroDiaSemana; i++) {
        html += '<div class="calendario-dia vazio"></div>';
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataAtual = new Date(ano, mes, dia);
        const dataStr = ano + '-' + (mes + 1).toString().padStart(2, '0') + '-' + dia.toString().padStart(2, '0');

        // NOVO: Checa se é passado
        const isPassado = dataAtual < hoje;
        const isDisponivel = diasDisponiveis.includes(dataStr) && !isPassado;
        const isHoje = dataStr === new Date().toISOString().split('T')[0];

        let classe = 'calendario-dia';
        if (isDisponivel) classe += ' calendario-data-disponivel';
        if (!isDisponivel || isPassado) classe += ' indisponivel';
        if (isHoje) classe += ' hoje';

        html += '<div class="' + classe + '" data-data="' + dataStr + '" title="' + (isDisponivel ? 'Disponível' : 'Indisponível') + '">' + dia + '</div>';
    }

    html += '</div></div>';
    return html;
}

function mudarMes(delta) {
    mesAtual.setMonth(mesAtual.getMonth() + delta);
    mostrarCalendario();
}

async function processarData(mensagem) {
    const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dataRegex.test(mensagem)) {
        mostrarMensagemBot('Por favor, clique em uma data disponível no calendário.');
        return;
    }

    conversationState.data = mensagem;
    conversationState.step = 'hora';

    await carregarHorariosDisponiveis();
}

async function carregarHorariosDisponiveis() {
    mostrarTyping();

    try {
        const res = await fetch('/api/chatbot/horarios-disponiveis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresaId: conversationState.empresaId,
                profissionalId: conversationState.profissionalId,
                data: conversationState.data
            })
        });
        const data = await res.json();

        esconderTyping();

        if (data.success && data.horarios.length > 0) {
            const botoesHorarios = data.horarios.map(h => ({
                label: h,
                valor: h
            }));

            const dataFormatada = formatarDataBr(conversationState.data);
            mostrarMensagemBot(`⏰ Para o dia ${dataFormatada}, escolha o horário desejado:`, botoesHorarios);
            conversationState.horariosDisponiveis = data.horarios;
        } else {
            mostrarMensagemBot('❌ Não há horários disponíveis nesta data. Por favor, escolha outra data.');
            conversationState.step = 'data';
            await mostrarCalendario();
        }
    } catch (error) {
        esconderTyping();
        mostrarMensagemBot('Erro ao buscar horários. Tente novamente.');
    }
}

async function processarHora(mensagem) {
    const horaEncontrada = conversationState.horariosDisponiveis.find(h => h === mensagem);

    if (!horaEncontrada) {
        const botoesHorarios = conversationState.horariosDisponiveis.map(h => ({
            label: h,
            valor: h
        }));
        mostrarMensagemBot('Horário inválido. Por favor, escolha um horário da lista:', botoesHorarios);
        return;
    }

    conversationState.hora = horaEncontrada;
    conversationState.step = 'confirmacao';

    const servico = servicosList.find(s => s.id === conversationState.servicoId);
    const profissional = profissionaisList.find(p => p.id === conversationState.profissionalId);
    const dataFormatada = formatarDataBr(conversationState.data);

    const mensagemConfirmacao = `
📋 **Confirme os dados do agendamento:**

👤 Cliente: ${conversationState.nome}
📞 Telefone: ${conversationState.telefone}
✂️ Serviço: ${servico.nome}
💰 Valor: R$ ${servico.valor.toFixed(2)}
⏱️ Duração: ${servico.duracao}min
💇 Profissional: ${profissional ? profissional.nome : 'Qualquer profissional'}
📅 Data: ${dataFormatada}
⏰ Horário: ${conversationState.hora}

Deseja confirmar o agendamento?
    `;

    const botoesConfirmacao = [
        { label: '✅ SIM, confirmar', valor: 'sim' },
        { label: '❌ NÃO, cancelar', valor: 'nao' }
    ];

    mostrarMensagemBot(mensagemConfirmacao, botoesConfirmacao);
}

async function processarConfirmacao(mensagem) {
    if (mensagem.toLowerCase() === 'sim' || mensagem.toLowerCase() === 'confirmar') {
        // REVALIDA HORÁRIO ANTES DE GRAVAR
        mostrarTyping();
        const aindaLivre = await verificarHorarioAindaDisponivel();
        esconderTyping();

        if (!aindaLivre) {
            mostrarMensagemBot('😔 Puts, alguém acabou de agendar esse horário enquanto você confirmava.\n\nMas relaxa, vamos escolher outro:');
            conversationState.step = 'hora';
            await carregarHorariosDisponiveis();
            return;
        }

        await confirmarAgendamento();
    } else {
        mostrarMensagemBot('❌ Agendamento cancelado. Se quiser tentar novamente, recarregue a página.');
        resetarConversa();
    }
}

// NOVA FUNÇÃO: Verifica se horário ainda tá livre
async function verificarHorarioAindaDisponivel() {
    try {
        const res = await fetch('/api/chatbot/horarios-disponiveis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresaId: conversationState.empresaId,
                profissionalId: conversationState.profissionalId,
                data: conversationState.data
            })
        });
        const data = await res.json();
        return data.success && data.horarios.includes(conversationState.hora);
    } catch {
        return false;
    }
}

async function confirmarAgendamento() {
    mostrarTyping();

    try {
        const res = await fetch('/api/chatbot/agendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clienteId: conversationState.clienteId,
                servicoId: conversationState.servicoId,
                profissionalId: conversationState.profissionalId,
                data: conversationState.data,
                hora: conversationState.hora,
                empresaId: conversationState.empresaId
            })
        });
        const data = await res.json();

        esconderTyping();

        if (data.success) {
            const dataFormatada = formatarDataBr(conversationState.data);
            mostrarMensagemBot(`
✅ **AGENDAMENTO CONFIRMADO, ${conversationState.nome}!**

📋 Resumo:
- Data: ${dataFormatada} às ${conversationState.hora}
- Profissional: ${data.profissionalNome}
- Serviço: ${data.servicoNome}
- Valor: R$ ${data.valor}

🔔 Você receberá um lembrete próximo ao horário.

Obrigado por escolher a ${conversationState.empresaNome}! ✨
            `);
        } else {
            mostrarMensagemBot(`❌ Erro ao confirmar agendamento: ${data.message}`);
        }
    } catch (error) {
        esconderTyping();
        mostrarMensagemBot('❌ Erro ao confirmar agendamento. Tente novamente.');
    }
}

function resetarConversa() {
    conversationState = {
        step: 'verificacao',
        clienteId: null,
        nome: null,
        telefone: null,
        email: null,
        servicoId: null,
        profissionalId: null,
        data: null,
        hora: null,
        empresaId: conversationState.empresaId,
        empresaNome: conversationState.empresaNome,
        isClienteExistente: false
    };

    const botoesOpcao = [
        { label: '✅ Sim, já sou cliente', valor: 'sim' },
        { label: '➕ Não, sou novo cliente', valor: 'nao' }
    ];
    mostrarMensagemBot('Olá! 👋 Seja bem-vindo à ' + conversationState.empresaNome + '!\n\nVocê já é cliente da barbearia?', botoesOpcao);
}

function formatarDataBr(dataStr) {
    if (!dataStr) return '';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Enviar com Enter
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        enviarMensagem();
    }
});