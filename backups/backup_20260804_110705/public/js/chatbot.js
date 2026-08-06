// js/chatbot.js - Versão Completa com Profissionais e Calendário
// ============================================
// CHATBOT INTELIGENTE - SEE&AGENDE
// ============================================

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let estado = 'inicio';
let clienteAtual = null;
let agendamentoAtual = {};
let empresaId = null;
let servicosList = [];
let profissionaisList = [];
let dadosEmpresa = null;
let datasDisponiveis = [];
let horariosDisponiveis = [];
let calendarioAtual = new Date();
let nomeCliente = '';
let telefoneCliente = '';
let isClienteExistente = false;

// ============================================
// INICIALIZAR
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    empresaId = params.get('empresa') || '1';

    console.log('🚀 Iniciando chatbot para empresa:', empresaId);

    carregarDadosEmpresa();

    document.getElementById('chatInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            enviarMensagem();
        }
    });

    setTimeout(() => {
        document.getElementById('chatInput').focus();
    }, 500);
});

// ============================================
// CARREGAR DADOS DA EMPRESA
// ============================================
async function carregarDadosEmpresa() {
    try {
        const res = await fetch(`/api/chatbot/empresa/${empresaId}`);
        const data = await res.json();

        if (data.success) {
            dadosEmpresa = data.data || data.empresa;
            document.getElementById('empresaNome').textContent = dadosEmpresa.nome || 'See&Agende';

            await carregarServicos();
            await carregarProfissionais();

            // ✅ USA O NOME DA EMPRESA DINAMICAMENTE (NADA DE "barbearia")
            const nomeEmpresa = dadosEmpresa.nome || 'nossa empresa';

            // ✅ MENSAGEM ÚNICA (sem duplicação do "Olá") e PERSONALIZADA
            adicionarMensagemComBotoes(
                `Olá! 👋 Seja bem-vindo à <strong>${nomeEmpresa}</strong>!<br><br>` +
                `Posso ajudar você a agendar um horário de forma rápida e fácil.<br><br>` +
                `<strong>Você já é cliente da ${nomeEmpresa}?</strong>`,
                [
                    { label: '✅ Sim, já sou cliente', valor: 'sim', primary: true },
                    { label: '➕ Não, sou novo cliente', valor: 'não', primary: false }
                ]
            );
            estado = 'aguardando_cliente';
        } else {
            // ✅ MENSAGEM DE ERRO TAMBÉM PERSONALIZADA
            adicionarMensagem('❌ Não foi possível carregar a empresa. Link inválido.', 'bot');
        }
    } catch (error) {
        console.error('Erro ao carregar empresa:', error);
        adicionarMensagem('❌ Erro ao carregar. Tente novamente mais tarde.', 'bot');
    }
}

// ============================================
// CARREGAR SERVIÇOS - CORRIGIDO
// ============================================
async function carregarServicos() {
    try {
        console.log('🔍 Buscando serviços para empresa:', empresaId);
        const res = await fetch(`/api/chatbot/servicos/${empresaId}`);
        const data = await res.json();
        console.log('📦 Resposta serviços (RAW):', JSON.stringify(data, null, 2));

        if (data.success) {
            // 🔥 O BACKEND RETORNA COMO "servicos" (plural)
            servicosList = data.servicos || data.data || [];
            console.log(`✅ ${servicosList.length} serviços carregados`);

            // 🔥 LOG DE CADA SERVIÇO
            servicosList.forEach((s, i) => {
                console.log(`  ${i + 1}. ${s.nome} - R$ ${s.valor}`);
            });
        } else {
            servicosList = [];
            console.warn('⚠ Nenhum serviço encontrado - success: false');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar serviços:', error);
        servicosList = [];
    }

    // 🔥 SE NÃO TIVER SERVIÇOS, TENTA BUSCAR DE OUTRA FORMA (FALLBACK)
    if (servicosList.length === 0) {
        console.log('🔄 Tentando buscar serviços via rota alternativa...');
        try {
            const res2 = await fetch(`/api/servicos?empresa_id=${empresaId}`);
            const data2 = await res2.json();
            console.log('📦 Resposta rota alternativa:', data2);
            if (data2.success && data2.data) {
                servicosList = data2.data;
                console.log(`✅ ${servicosList.length} serviços carregados via rota alternativa`);
            }
        } catch (e) {
            console.error('❌ Rota alternativa também falhou:', e);
        }
    }
}

// ============================================
// CARREGAR PROFISSIONAIS - CORRIGIDO
// ============================================
async function carregarProfissionais() {
    try {
        console.log('🔍 Buscando profissionais para empresa:', empresaId);

        let token = localStorage.getItem('token');
        let profissionaisEncontrados = [];

        if (token) {
            try {
                const res = await fetch(`/api/profissionais`, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                const data = await res.json();
                console.log('📦 Resposta profissionais (com token):', data);

                if (data.success && data.data && data.data.length > 0) {
                    profissionaisEncontrados = data.data;
                }
            } catch (e) {
                console.warn('Erro ao buscar profissionais com token:', e);
            }
        }

        if (profissionaisEncontrados.length === 0) {
            try {
                const res = await fetch(`/api/chatbot/profissionais/${empresaId}`);
                const data = await res.json();
                console.log('📦 Resposta profissionais (chatbot):', data);

                if (data.success) {
                    profissionaisEncontrados = data.profissionais || data.data || [];
                }
            } catch (e) {
                console.warn('Erro ao buscar profissionais do chatbot:', e);
            }
        }

        profissionaisList = [];

        if (profissionaisEncontrados.length > 0) {
            const ativos = profissionaisEncontrados.filter(p => p.ativo === 1 || p.ativo === true);
            console.log(`✅ ${ativos.length} profissionais ativos encontrados`);

            for (let p of ativos) {
                profissionaisList.push({
                    id: p.id,
                    nome: p.nome,
                    comissao_percent: p.comissao_percent || 0,
                    ativo: p.ativo
                });
            }
        }

        const donoNome = dadosEmpresa?.nome_dono || 'Dono';
        const jaExisteDono = profissionaisList.some(p => p.isDono === true || p.nome.includes('(Dono)'));

        if (!jaExisteDono) {
            profissionaisList.push({
                id: 'dono_' + Date.now(),
                nome: donoNome + ' (Dono)',
                comissao_percent: 0,
                isDono: true,
                ativo: 1
            });
            console.log(`✅ Dono "${donoNome}" adicionado como profissional`);
        }

        if (profissionaisList.length === 0) {
            profissionaisList.push({
                id: 'dono_fallback',
                nome: 'Dono (Proprietário)',
                comissao_percent: 0,
                isDono: true,
                ativo: 1
            });
            console.log('✅ Dono adicionado via fallback');
        }

        console.log(`✅ ${profissionaisList.length} profissionais disponíveis:`, profissionaisList.map(p => p.nome));

    } catch (error) {
        console.error('❌ Erro ao carregar profissionais:', error);
        profissionaisList = [{
            id: 'dono_fallback',
            nome: 'Dono (Proprietário)',
            comissao_percent: 0,
            isDono: true,
            ativo: 1
        }];
        console.log('✅ Dono adicionado via fallback (erro)');
    }
}

// ============================================
// FUNÇÕES DE MENSAGEM
// ============================================
function enviarMensagem() {
    const input = document.getElementById('chatInput');
    const texto = input.value.trim();
    if (!texto) return;

    adicionarMensagem(texto, 'user');
    input.value = '';
    document.getElementById('inputOptions').style.display = 'none';
    processarResposta(texto);
}

function adicionarMensagem(texto, tipo, extra = null) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `message ${tipo}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = tipo === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';

    const text = document.createElement('div');
    text.className = 'message-text';
    text.innerHTML = texto;

    const time = document.createElement('span');
    time.className = 'message-time';
    const now = new Date();
    time.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    content.appendChild(text);
    if (extra) content.appendChild(extra);
    content.appendChild(time);

    div.appendChild(avatar);
    div.appendChild(content);
    container.appendChild(div);

    container.scrollTop = container.scrollHeight;
    document.getElementById('chatInput').focus();
}

function adicionarMensagemComBotoes(texto, botoes) {
    const container = document.getElementById('chatMessages');

    const div = document.createElement('div');
    div.className = 'message bot';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-robot"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';

    const text = document.createElement('div');
    text.className = 'message-text';
    text.innerHTML = texto;

    const time = document.createElement('span');
    time.className = 'message-time';
    const now = new Date();
    time.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const botoesDiv = document.createElement('div');
    botoesDiv.className = 'message-buttons';

    for (let btn of botoes) {
        const botao = document.createElement('button');
        botao.className = `message-btn ${btn.primary ? 'btn-primary' : ''}`;
        botao.textContent = btn.label;
        botao.onclick = function () {
            this.parentElement.remove();
            adicionarMensagem(btn.label, 'user');
            processarResposta(btn.valor);
        };
        botoesDiv.appendChild(botao);
    }

    content.appendChild(text);
    content.appendChild(botoesDiv);
    content.appendChild(time);

    div.appendChild(avatar);
    div.appendChild(content);
    container.appendChild(div);

    container.scrollTop = container.scrollHeight;
    document.getElementById('chatInput').focus();
}

// ============================================
// PROCESSAR RESPOSTA
// ============================================
function processarResposta(texto) {
    const mensagem = texto.trim().toLowerCase();
    console.log('📝 Processando:', texto, 'Estado:', estado);

    switch (estado) {
        case 'aguardando_cliente': {
            const isSim = mensagem === 'sim' || mensagem === '✅ sim' || mensagem === '✅ Sim' || mensagem === 'sim' || mensagem.includes('sim');
            const isNao = mensagem === 'não' || mensagem === '❌ não' || mensagem === '❌ Não' || mensagem === 'nao' || mensagem.includes('não') || mensagem.includes('nao');

            if (isSim) {
                isClienteExistente = true;
                estado = 'aguardando_telefone_cliente';
                adicionarMensagem('Ótimo! 👍<br><br>Por favor, digite seu número de <strong>telefone</strong> com DDD para encontrarmos seus dados:<br><br><em>Ex: 11999999999</em>', 'bot');
            } else if (isNao) {
                isClienteExistente = false;
                estado = 'aguardando_nome_novo';
                adicionarMensagem('Tudo bem! Vamos fazer seu cadastro rapidinho. ✨<br><br>Por favor, digite seu <strong>nome completo</strong>:', 'bot');
            } else {
                adicionarMensagemComBotoes(
                    `Por favor, escolha uma das opções:`,
                    [
                        { label: '✅ Sim, já sou cliente', valor: 'sim', primary: true },
                        { label: '➕ Não, sou novo cliente', valor: 'não', primary: false }
                    ]
                );
            }
            break;
        }

        case 'aguardando_telefone_cliente': {
            const telefone = texto.replace(/\D/g, '');
            if (telefone.length >= 10 && telefone.length <= 11) {
                telefoneCliente = telefone;
                buscarClientePorTelefone(telefoneCliente);
            } else {
                adicionarMensagem('⚠️ Por favor, informe um telefone válido com DDD (ex: 11999999999):', 'bot');
            }
            break;
        }

        case 'aguardando_nome_novo':
            if (mensagem.length >= 3) {
                nomeCliente = texto.trim();
                estado = 'aguardando_telefone_novo';
                adicionarMensagem(`Prazer, <strong>${nomeCliente}</strong>! ✨<br><br>Agora, me informe seu <strong>telefone</strong> com DDD para contato (ex: 11999999999):`, 'bot');
            } else {
                adicionarMensagem('Por favor, digite seu <strong>nome completo</strong> (mínimo 3 caracteres):', 'bot');
            }
            break;

        case 'aguardando_telefone_novo': {
            const telefone = texto.replace(/\D/g, '');
            if (telefone.length >= 10 && telefone.length <= 11) {
                telefoneCliente = telefone;
                cadastrarNovoCliente(nomeCliente, telefoneCliente);
            } else {
                adicionarMensagem('⚠️ Por favor, informe um telefone válido com DDD (ex: 11999999999):', 'bot');
            }
            break;
        }

        case 'aguardando_servico': {
            if (servicosList.length === 0) {
                adicionarMensagem('❌ Desculpe, não há serviços disponíveis no momento.<br><br>Por favor, entre em contato com a barbearia.', 'bot');
                estado = 'inicio';
                return;
            }

            let servicoEncontrado = servicosList.find(s =>
                s.nome.toLowerCase() === mensagem ||
                s.nome.toLowerCase().includes(mensagem)
            );

            if (!servicoEncontrado) {
                servicoEncontrado = servicosList.find(s =>
                    s.nome.toLowerCase().includes(mensagem) ||
                    mensagem.includes(s.nome.toLowerCase())
                );
            }

            if (servicoEncontrado) {
                agendamentoAtual.servico_id = servicoEncontrado.id;
                agendamentoAtual.servico_nome = servicoEncontrado.nome;
                agendamentoAtual.valor = servicoEncontrado.valor;
                agendamentoAtual.duracao = servicoEncontrado.duracao || 30;

                estado = 'aguardando_profissional';
                perguntarProfissional();
            } else {
                mostrarServicos();
            }
            break;
        }

        case 'aguardando_profissional': {
            if (mensagem === 'qualquer' || mensagem === 'tanto faz' || mensagem === 'qualquer um' || mensagem === 'nao' || mensagem === 'não') {
                agendamentoAtual.profissional_id = null;
                agendamentoAtual.profissional_nome = 'Qualquer profissional';
                estado = 'aguardando_data';
                perguntarData();
            } else {
                const profissional = profissionaisList.find(p =>
                    p.nome.toLowerCase() === mensagem ||
                    p.nome.toLowerCase().includes(mensagem)
                );
                if (profissional) {
                    if (profissional.isDono) {
                        agendamentoAtual.profissional_id = null;
                        agendamentoAtual.profissional_nome = profissional.nome;
                    } else {
                        agendamentoAtual.profissional_id = profissional.id;
                        agendamentoAtual.profissional_nome = profissional.nome;
                    }
                    estado = 'aguardando_data';
                    perguntarData();
                } else {
                    perguntarProfissional();
                }
            }
            break;
        }

        case 'aguardando_data': {
            const dataSelecionada = texto.match(/\d{4}-\d{2}-\d{2}/);
            if (dataSelecionada) {
                agendamentoAtual.data = dataSelecionada[0];
                estado = 'aguardando_horario';
                perguntarHorario(agendamentoAtual.data);
            } else {
                adicionarMensagem('⚠️ Por favor, clique em uma data disponível no calendário.<br><br>As datas em <strong>verde</strong> estão disponíveis.', 'bot');
            }
            break;
        }

        case 'aguardando_horario': {
            const horarioSelecionado = horariosDisponiveis.find(h => h === texto);
            if (horarioSelecionado) {
                agendamentoAtual.hora = horarioSelecionado;
                estado = 'confirmando';
                confirmarAgendamento();
            } else {
                let textoHorarios = '🕐 <strong>Horários disponíveis:</strong><br><br>';
                for (let h of horariosDisponiveis) {
                    textoHorarios += `• ${h}<br>`;
                }
                textoHorarios += '<br>Digite o horário que você prefere (ex: 10:00):';
                adicionarMensagem(textoHorarios, 'bot');
            }
            break;
        }

        case 'confirmando': {
            const isSimConfirm = mensagem === 'sim' || mensagem === '✅ sim' || mensagem === 'sim' || mensagem.includes('sim') || mensagem === 'confirmar';
            if (isSimConfirm) {
                verificarEConfirmar();
            } else if (mensagem === 'não' || mensagem === '❌ não' || mensagem === 'nao' || mensagem.includes('não') || mensagem.includes('nao')) {
                estado = 'inicio';
                agendamentoAtual = {};
                adicionarMensagem('❌ Agendamento cancelado. Se quiser tentar novamente, recarregue a página.', 'bot');
            } else {
                adicionarMensagemComBotoes(
                    `Por favor, confirme se os dados estão corretos:`,
                    [
                        { label: '✅ Sim, confirmar', valor: 'sim', primary: true },
                        { label: '❌ Não, cancelar', valor: 'não', primary: false }
                    ]
                );
            }
            break;
        }

        default:
            adicionarMensagem('⚠️ Desculpe, não entendi. Vamos começar novamente.', 'bot');
            estado = 'inicio';
            const nomeEmpresa = dadosEmpresa?.nome || 'nossa barbearia';
            setTimeout(() => {
                adicionarMensagemComBotoes(
                    `Olá! 👋 Seja bem-vindo à <strong>${nomeEmpresa}</strong>!<br><br><strong>Você já é cliente da barbearia?</strong>`,
                    [
                        { label: '✅ Sim, já sou cliente', valor: 'sim', primary: true },
                        { label: '➕ Não, sou novo cliente', valor: 'não', primary: false }
                    ]
                );
                estado = 'aguardando_cliente';
            }, 500);
            break;
    }
}

// ============================================
// BUSCAR CLIENTE POR TELEFONE - COM BLOQUEIO GERAL
// ============================================
async function buscarClientePorTelefone(telefone) {
    try {
        const res = await fetch('/api/chatbot/cliente/buscar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telefone: telefone,
                empresaId: empresaId
            })
        });
        const data = await res.json();

        if (data.success && data.cliente) {
            clienteAtual = data.cliente;

            if (clienteAtual.bloqueado_chatbot === 1) {
                adicionarMensagem(
                    '⚠️ Desculpe, mas você está <strong>bloqueado</strong> para agendamentos online.<br><br>Entre em contato com a barbearia para mais informações.',
                    'bot'
                );
                estado = 'inicio';
                return;
            }

            // ============================================
            // 🔥 VERIFICAR LIMITE COM BLOQUEIO GERAL
            // ============================================
            const podeAgendar = await verificarLimiteAgendamentos(clienteAtual.id);
            if (!podeAgendar) {
                // Buscar quantos dias estão configurados no bloqueio geral
                let diasBloqueioGeral = 0;
                try {
                    const resEmpresa = await fetch('/api/empresa/dados', {
                        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
                    });
                    const dataEmpresa = await resEmpresa.json();
                    if (dataEmpresa.success && dataEmpresa.data) {
                        diasBloqueioGeral = dataEmpresa.data.dias_bloqueio_geral || 0;
                    }
                } catch (e) {
                    console.warn('Erro ao buscar bloqueio geral:', e);
                }

                const mensagem = diasBloqueioGeral > 0
                    ? `⚠️ Você já fez um agendamento nos últimos <strong>${diasBloqueioGeral} dias</strong>.<br><br>Por favor, aguarde para fazer um novo agendamento.`
                    : `⚠️ Você já possui um agendamento para este dia. Cada cliente só pode fazer UM agendamento por dia.`;

                adicionarMensagem(mensagem, 'bot');
                estado = 'inicio';
                return;
            }

            adicionarMensagem(
                `✅ Cliente encontrado!<br><br>Bem-vindo de volta, <strong>${clienteAtual.nome}</strong>! ✨<br><br>Vamos prosseguir com seu agendamento.`,
                'bot'
            );
            estado = 'aguardando_servico';
            mostrarServicos();
        } else {
            adicionarMensagem(
                '❌ Não encontramos nenhum cliente com este telefone.<br><br>Vamos fazer seu cadastro! 📝<br><br>Por favor, digite seu <strong>nome completo</strong>:',
                'bot'
            );
            estado = 'aguardando_nome_novo';
        }
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        adicionarMensagem('❌ Erro ao buscar cliente. Tente novamente.', 'bot');
    }
}

// ============================================
// CADASTRAR NOVO CLIENTE
// ============================================
async function cadastrarNovoCliente(nome, telefone) {
    try {
        const res = await fetch('/api/chatbot/cliente/criar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome: nome,
                telefone: telefone,
                email: '',
                empresaId: empresaId
            })
        });
        const data = await res.json();

        if (data.success) {
            clienteAtual = { id: data.clienteId, nome: nome, telefone: telefone };
            adicionarMensagem(
                `🎉 <strong>Cadastro realizado com sucesso!</strong><br><br>Bem-vindo(a), <strong>${nome}</strong>!<br><br>Vamos prosseguir com seu agendamento.`,
                'bot'
            );
            estado = 'aguardando_servico';
            mostrarServicos();
        } else {
            adicionarMensagem('❌ Erro ao cadastrar cliente. Tente novamente.', 'bot');
            estado = 'inicio';
        }
    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error);
        adicionarMensagem('❌ Erro ao cadastrar cliente. Tente novamente.', 'bot');
        estado = 'inicio';
    }
}

// ============================================
// VERIFICAR LIMITE DE AGENDAMENTOS (USANDO DIAS_BLOQUEIO_GERAL)
// ============================================
async function verificarLimiteAgendamentos(clienteId) {
    try {
        // ============================================
        // 🔥 BUSCAR DIAS_BLOQUEIO_GERAL DA EMPRESA
        // ============================================
        const resEmpresa = await fetch('/api/empresa/dados', {
            headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
        });
        const dataEmpresa = await resEmpresa.json();

        let diasBloqueioGeral = 0;

        if (dataEmpresa.success && dataEmpresa.data) {
            diasBloqueioGeral = dataEmpresa.data.dias_bloqueio_geral || 0;
        }

        console.log(`📋 Empresa - Dias de bloqueio geral: ${diasBloqueioGeral} dias`);

        // Se for 0, não tem restrição (apenas a regra de 1 agendamento por dia, que é validada no backend)
        if (diasBloqueioGeral === 0) {
            console.log('✅ Sem bloqueio geral, permitindo agendamento (respeitando 1 por dia)');
            return true;
        }

        // ============================================
        // BUSCAR ÚLTIMO AGENDAMENTO DO CLIENTE
        // ============================================
        const res = await fetch(`/api/agendamentos?cliente=${clienteId}`, {
            headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
        });
        const data = await res.json();

        if (data.success && data.data) {
            const agora = new Date();
            const dataLimite = new Date(agora);
            dataLimite.setDate(dataLimite.getDate() - diasBloqueioGeral);

            const agendamentosRecentes = data.data.filter(a =>
                a.status === 'concluido' || a.status === 'pendente' || a.status === 'agendado'
            );

            for (let ag of agendamentosRecentes) {
                const dataAg = new Date(ag.data);
                if (dataAg >= dataLimite) {
                    console.log(`❌ Cliente tem agendamento em ${ag.data} (${diasBloqueioGeral} dias de bloqueio)`);
                    return false;
                }
            }
        }
        return true;
    } catch (error) {
        console.error('Erro ao verificar limite:', error);
        return true;
    }
}

// ============================================
// MOSTRAR SERVIÇOS - CORRIGIDO
// ============================================
function mostrarServicos() {
    if (servicosList.length === 0) {
        adicionarMensagem(
            '❌ Desculpe, não há serviços disponíveis no momento. Por favor, entre em contato com a barbearia.',
            'bot'
        );
        estado = 'inicio';
        return;
    }

    var botoesServicos = [];
    for (var i = 0; i < servicosList.length; i++) {
        var s = servicosList[i];
        var valor = parseFloat(s.valor) || 0;
        var valorFormatado = valor.toFixed(2).replace('.', ',');
        botoesServicos.push({
            label: s.nome + ' - R$ ' + valorFormatado,
            valor: s.nome
        });
    }

    adicionarMensagemComBotoes(
        '📋 <strong>Escolha o serviço desejado:</strong>',
        botoesServicos
    );
}

// ============================================
// PERGUNTAR PROFISSIONAL
// ============================================
function perguntarProfissional() {
    if (profissionaisList.length === 0) {
        agendamentoAtual.profissional_id = null;
        agendamentoAtual.profissional_nome = 'Qualquer profissional';
        estado = 'aguardando_data';
        perguntarData();
        return;
    }

    var botoesProfissionais = [];
    for (var i = 0; i < profissionaisList.length; i++) {
        var p = profissionaisList[i];
        botoesProfissionais.push({
            label: p.nome,
            valor: p.nome
        });
    }

    botoesProfissionais.push({
        label: '👤 Qualquer profissional',
        valor: 'qualquer'
    });

    adicionarMensagemComBotoes(
        '💇 <strong>Escolha o profissional que deseja atender você:</strong>',
        botoesProfissionais
    );
}

// ============================================
// PERGUNTAR DATA
// ============================================
async function perguntarData() {
    var hoje = new Date();
    var mesAtual = hoje.getMonth() + 1;
    var anoAtual = hoje.getFullYear();

    await carregarDatasDisponiveis(mesAtual, anoAtual);

    console.log('📅 Datas disponíveis:', datasDisponiveis);

    if (datasDisponiveis.length === 0) {
        adicionarMensagem(
            '⚠️ <strong>Não encontrei datas disponíveis para este mês.</strong><br><br>' +
            'Tente os próximos dias ou entre em contato com a barbearia.<br><br>' +
            '📞 <strong>Telefone:</strong> (11) 99999-9999',
            'bot'
        );
        estado = 'aguardando_data';
        return;
    }

    var datasOrdenadas = [...datasDisponiveis].sort();
    var primeiraData = datasOrdenadas[0];
    var partes = primeiraData.split('-');
    var mesData = parseInt(partes[1]);
    var anoData = parseInt(partes[0]);

    calendarioAtual = new Date(anoData, mesData - 1, 1);

    console.log('📅 Calendário ajustado para:', calendarioAtual.getMonth() + 1, '/', calendarioAtual.getFullYear());

    var textoDatas = '📅 <strong>Datas disponíveis:</strong><br><br>';
    var maxDatas = Math.min(datasOrdenadas.length, 10);
    for (var i = 0; i < maxDatas; i++) {
        textoDatas += '• ' + formatarDataBr(datasOrdenadas[i]) + '<br>';
    }
    if (datasOrdenadas.length > 10) {
        textoDatas += '... e mais ' + (datasOrdenadas.length - 10) + ' datas';
    }
    textoDatas += '<br><br>Selecione uma data no calendário abaixo:';

    adicionarMensagem(textoDatas, 'bot');

    var calendario = renderizarCalendario();
    adicionarMensagem('📅 <strong>Calendário:</strong>', 'bot', calendario);

    estado = 'aguardando_data';
}

// ============================================
// CARREGAR DATAS DISPONÍVEIS - COM FALLBACK
// ============================================
async function carregarDatasDisponiveis(mes, ano) {
    var mesAtual = parseInt(mes) || new Date().getMonth() + 1;
    var anoAtual = parseInt(ano) || new Date().getFullYear();

    try {
        console.log('🔍 Buscando datas para ' + mesAtual + '/' + anoAtual);

        var res = await fetch('/api/chatbot/datas-disponiveis-mes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresaId: empresaId,
                mes: mesAtual,
                ano: anoAtual
            })
        });
        var data = await res.json();
        console.log('📦 Resposta datas:', data);

        if (data.success && data.diasDisponiveis && data.diasDisponiveis.length > 0) {
            datasDisponiveis = data.diasDisponiveis;
            console.log('✅ ' + datasDisponiveis.length + ' datas disponíveis');
        } else {
            console.warn('⚠ Nenhuma data da API, usando fallback...');
            datasDisponiveis = gerarDatasFallback(mesAtual, anoAtual);
            console.log('📦 ' + datasDisponiveis.length + ' datas de fallback');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar datas:', error);
        datasDisponiveis = gerarDatasFallback(mesAtual, anoAtual);
        console.log('📦 ' + datasDisponiveis.length + ' datas de fallback (erro)');
    }
}

// ============================================
// GERAR DATAS FALLBACK
// ============================================
function gerarDatasFallback(mes, ano) {
    var datas = [];
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (var i = 1; i <= 15; i++) {
        var data = new Date(hoje);
        data.setDate(data.getDate() + i);
        var dataStr = data.toISOString().split('T')[0];
        datas.push(dataStr);
    }

    return datas;
}

// ============================================
// RENDERIZAR CALENDÁRIO - CORRIGIDO
// ============================================
function renderizarCalendario() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const mes = calendarioAtual.getMonth();
    const ano = calendarioAtual.getFullYear();

    console.log(`📅 Renderizando calendário: ${mes + 1}/${ano}`);
    console.log(`📅 Datas disponíveis:`, datasDisponiveis);

    const datasDoMes = datasDisponiveis.filter(function (data) {
        const partes = data.split('-');
        return parseInt(partes[1]) === mes + 1 && parseInt(partes[0]) === ano;
    });

    console.log(`📅 Datas disponíveis no mês ${mes + 1}: ${datasDoMes.length}`);

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasNoMes = ultimoDia.getDate();
    const primeiroDiaSemana = primeiroDia.getDay();

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const container = document.createElement('div');
    container.className = 'calendario-container';

    const header = document.createElement('div');
    header.className = 'calendario-header';
    header.innerHTML = `
        <button class="calendario-nav" onclick="mudarMesCalendario(-1)">◀</button>
        <span style="font-weight:bold;font-size:16px;">${meses[mes]} ${ano}</span>
        <button class="calendario-nav" onclick="mudarMesCalendario(1)">▶</button>
    `;
    container.appendChild(header);

    const semanaDiv = document.createElement('div');
    semanaDiv.className = 'calendario-semana';
    for (let dia of diasSemana) {
        const span = document.createElement('span');
        span.className = 'calendario-dia-semana';
        span.textContent = dia;
        semanaDiv.appendChild(span);
    }
    container.appendChild(semanaDiv);

    const diasDiv = document.createElement('div');
    diasDiv.className = 'calendario-dias';

    for (let i = 0; i < primeiroDiaSemana; i++) {
        const vazio = document.createElement('div');
        vazio.className = 'calendario-dia vazio';
        diasDiv.appendChild(vazio);
    }

    const hojeStr = hoje.toISOString().split('T')[0];
    let temDataDisponivel = false;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataAtual = new Date(ano, mes, dia);
        const dataStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const isPassado = dataAtual < hoje;
        const isDisponivel = datasDoMes.includes(dataStr) && !isPassado;
        const isHoje = dataStr === hojeStr;

        const diaDiv = document.createElement('div');
        diaDiv.className = 'calendario-dia';
        diaDiv.textContent = dia;

        if (isDisponivel) {
            temDataDisponivel = true;
            diaDiv.classList.add('calendario-data-disponivel');
            diaDiv.style.cursor = 'pointer';
            diaDiv.style.backgroundColor = '#10b981';
            diaDiv.style.color = 'white';
            diaDiv.style.borderRadius = '50%';
            diaDiv.style.fontWeight = 'bold';
            diaDiv.style.width = '36px';
            diaDiv.style.height = '36px';
            diaDiv.style.display = 'flex';
            diaDiv.style.alignItems = 'center';
            diaDiv.style.justifyContent = 'center';
            diaDiv.title = 'Disponível - Clique para selecionar';

            // 🔥 CORREÇÃO: Capturar o valor correto da data usando closure
            (function (dataSelecionada) {
                diaDiv.onclick = function () {
                    selecionarDataCalendario(dataSelecionada);
                };
            })(dataStr);

            diaDiv.onmouseover = function () {
                this.style.transform = 'scale(1.1)';
                this.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
            };
            diaDiv.onmouseout = function () {
                this.style.transform = 'scale(1)';
                this.style.boxShadow = 'none';
            };
        } else {
            diaDiv.classList.add('indisponivel');
            diaDiv.style.color = '#9ca3af';
            diaDiv.style.width = '36px';
            diaDiv.style.height = '36px';
            diaDiv.style.display = 'flex';
            diaDiv.style.alignItems = 'center';
            diaDiv.style.justifyContent = 'center';
            if (isPassado) {
                diaDiv.title = 'Data passada';
            } else {
                diaDiv.title = 'Indisponível';
            }
        }

        if (isHoje) {
            diaDiv.classList.add('hoje');
            diaDiv.style.border = '2px solid #667eea';
            diaDiv.style.backgroundColor = '#e0e7ff';
            diaDiv.style.color = '#667eea';
            diaDiv.style.fontWeight = 'bold';
        }

        diasDiv.appendChild(diaDiv);
    }

    container.appendChild(diasDiv);

    if (!temDataDisponivel) {
        const hojeMes = new Date().getMonth();
        const hojeAno = new Date().getFullYear();
        const isMesAtual = (mes === hojeMes && ano === hojeAno);

        let mensagemAviso = `⚠️ <strong>Nenhuma data disponível em ${meses[mes]} ${ano}.</strong><br>`;

        if (isMesAtual) {
            mensagemAviso += '📅 As próximas datas disponíveis são a partir do <strong>próximo mês</strong>.<br>';
            mensagemAviso += '👉 <strong>Clique em "Ver próximo mês"</strong> para ver as datas disponíveis.';
        } else {
            mensagemAviso += '👉 <strong>Clique em "Ver próximo mês"</strong> para ver outras datas.';
        }

        const aviso = document.createElement('div');
        aviso.style.cssText = `
            text-align: center;
            padding: 14px;
            color: #92400e;
            font-size: 14px;
            margin-top: 12px;
            background: #fef3c7;
            border-radius: 8px;
            border: 1px solid #f59e0b;
            line-height: 1.6;
        `;
        aviso.innerHTML = mensagemAviso + `<br><br>
            <button onclick="mudarMesCalendario(1)" style="background:#667eea;color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:14px;">
                📅 Ver próximo mês →
            </button>
        `;
        container.appendChild(aviso);
    }

    const legenda = document.createElement('div');
    legenda.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #6b7280;
        flex-wrap: wrap;
    `;
    legenda.innerHTML = `
        <span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#10b981;margin-right:4px;"></span> Disponível</span>
        <span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#e5e7eb;margin-right:4px;"></span> Indisponível</span>
        <span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:2px solid #667eea;margin-right:4px;"></span> Hoje</span>
    `;
    container.appendChild(legenda);

    return container;
}
// ============================================
// MUDAR MÊS DO CALENDÁRIO
// ============================================
window.mudarMesCalendario = function (delta) {
    calendarioAtual.setMonth(calendarioAtual.getMonth() + delta);
    var mes = calendarioAtual.getMonth() + 1;
    var ano = calendarioAtual.getFullYear();

    console.log('🔄 Mudando para mês: ' + mes + '/' + ano);

    carregarDatasDisponiveis(mes, ano).then(function () {
        var containers = document.querySelectorAll('.calendario-container');
        var ultimoContainer = containers[containers.length - 1];
        if (ultimoContainer) {
            var parent = ultimoContainer.closest('.message-content');
            if (parent) {
                var novoCalendario = renderizarCalendario();
                parent.innerHTML = '';
                var newText = document.createElement('div');
                newText.className = 'message-text';
                newText.innerHTML = '📅 <strong>Calendário:</strong>';
                parent.appendChild(newText);
                parent.appendChild(novoCalendario);
                var timeDiv = document.createElement('span');
                timeDiv.className = 'message-time';
                timeDiv.textContent = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                parent.appendChild(timeDiv);
            }
        }
    });
};

// ============================================
// SELECIONAR DATA DO CALENDÁRIO
// ============================================
function selecionarDataCalendario(dataStr) {
    adicionarMensagem('📅 ' + formatarDataBr(dataStr), 'user');
    processarResposta(dataStr);
}

// ============================================
// PERGUNTAR HORÁRIO - COM FILTRO DE HORÁRIOS PASSADOS
// ============================================
async function perguntarHorario(data) {
    try {
        var body = {
            empresaId: empresaId,
            data: data
        };

        if (agendamentoAtual.profissional_id && agendamentoAtual.profissional_id !== 'dono_') {
            body.profissionalId = agendamentoAtual.profissional_id;
        }

        var res = await fetch('/api/chatbot/horarios-disponiveis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        var result = await res.json();

        if (result.success && result.horarios && result.horarios.length > 0) {
            // 🔥 FILTRAR HORÁRIOS QUE JÁ PASSARAM (SE FOR HOJE)
            let horarios = result.horarios;
            const hoje = new Date();
            const hojeStr = hoje.toISOString().split('T')[0];
            const horaAtual = hoje.getHours();
            const minutoAtual = hoje.getMinutes();

            if (data === hojeStr) {
                horarios = horarios.filter(h => {
                    const [hNum, mNum] = h.split(':').map(Number);
                    return hNum > horaAtual || (hNum === horaAtual && mNum >= minutoAtual);
                });
                console.log(`🕐 Filtrados ${horarios.length} horários válidos para hoje`);
            }

            if (horarios.length === 0) {
                adicionarMensagem(
                    '⏰ <strong>Nenhum horário disponível para hoje.</strong><br><br>' +
                    'Por favor, selecione outra data.',
                    'bot'
                );
                estado = 'aguardando_data';
                perguntarData();
                return;
            }

            horariosDisponiveis = horarios;
            var dataFormatada = formatarDataBr(data);

            var botoesHorarios = [];
            for (var i = 0; i < horariosDisponiveis.length; i++) {
                var h = horariosDisponiveis[i];
                botoesHorarios.push({
                    label: h,
                    valor: h
                });
            }

            adicionarMensagemComBotoes(
                '⏰ Para o dia <strong>' + dataFormatada + '</strong>, escolha o horário desejado:',
                botoesHorarios
            );
        } else {
            adicionarMensagem(
                '❌ Não há horários disponíveis para este profissional nesta data.<br><br>Por favor, escolha outra data ou outro profissional.',
                'bot'
            );
            estado = 'aguardando_data';
            perguntarData();
        }
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        adicionarMensagem('❌ Erro ao carregar horários. Tente novamente.', 'bot');
    }
}

// ============================================
// CONFIRMAR AGENDAMENTO - CORRIGIDO
// ============================================
function confirmarAgendamento() {
    var nomeProfissional = agendamentoAtual.profissional_nome || 'Não definido';
    var servico = agendamentoAtual.servico_nome || 'Não definido';
    var valor = parseFloat(agendamentoAtual.valor) || 0;
    var valorFormatado = valor.toFixed(2).replace('.', ',');
    var data = formatarDataBr(agendamentoAtual.data);
    var hora = agendamentoAtual.hora;

    adicionarMensagemComBotoes(
        '📋 <strong>Confirme os dados do agendamento:</strong><br><br>' +
        '👤 <strong>Cliente:</strong> ' + clienteAtual.nome + '<br>' +
        '📞 <strong>Telefone:</strong> ' + clienteAtual.telefone + '<br>' +
        '✂️ <strong>Serviço:</strong> ' + servico + '<br>' +
        '💰 <strong>Valor:</strong> R$ ' + valorFormatado + '<br>' +
        '⏱️ <strong>Duração:</strong> ' + (agendamentoAtual.duracao || 30) + 'min<br>' +
        '👨‍💼 <strong>Profissional:</strong> ' + nomeProfissional + '<br>' +
        '📅 <strong>Data:</strong> ' + data + '<br>' +
        '⏰ <strong>Horário:</strong> ' + hora + '<br><br>' +
        '<strong>Deseja confirmar o agendamento?</strong>',
        [
            { label: '✅ SIM, confirmar', valor: 'sim', primary: true },
            { label: '❌ NÃO, cancelar', valor: 'não', primary: false }
        ]
    );
}

// ============================================
// VERIFICAR E CONFIRMAR AGENDAMENTO
// ============================================
async function verificarEConfirmar() {
    try {
        var res = await fetch('/api/chatbot/horarios-disponiveis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresaId: empresaId,
                profissionalId: agendamentoAtual.profissional_id,
                data: agendamentoAtual.data
            })
        });
        var result = await res.json();

        if (result.success && result.horarios && result.horarios.includes(agendamentoAtual.hora)) {
            await finalizarAgendamento();
        } else {
            adicionarMensagem(
                '😔 Puts, alguém acabou de agendar esse horário enquanto você confirmava.<br><br>Mas relaxa, vamos escolher outro:',
                'bot'
            );
            estado = 'aguardando_horario';
            perguntarHorario(agendamentoAtual.data);
        }
    } catch (error) {
        console.error('Erro ao verificar horário:', error);
        await finalizarAgendamento();
    }
}
// ============================================
// VALIDAR DATA/HORA - NÃO PERMITIR PASSADO
// ============================================

function validarDataHora(data, hora) {
    if (!data || !hora) {
        return {
            valido: false,
            mensagem: '⚠️ Data e hora são obrigatórias.'
        };
    }

    const agora = new Date();
    const [ano, mes, dia] = data.split('-').map(Number);
    const [horaNum, minutoNum] = hora.split(':').map(Number);

    // Criar data selecionada
    const dataSelecionada = new Date(ano, mes - 1, dia, horaNum || 0, minutoNum || 0, 0, 0);

    // 🔥 VERIFICAR SE A DATA/HORA JÁ PASSOU
    if (dataSelecionada < agora) {
        // Verificar se é hoje
        const hoje = new Date();
        const isHoje = dataSelecionada.getDate() === hoje.getDate() &&
            dataSelecionada.getMonth() === hoje.getMonth() &&
            dataSelecionada.getFullYear() === hoje.getFullYear();

        let mensagem = '⏰ Não é possível agendar em datas ou horários que já passaram!';
        if (isHoje) {
            mensagem = '⏰ Este horário já passou hoje! Por favor, selecione um horário futuro.';
        } else {
            mensagem = '⏰ Esta data já passou! Por favor, selecione uma data futura.';
        }

        return {
            valido: false,
            mensagem: mensagem
        };
    }

    return {
        valido: true,
        mensagem: '✅ Data e hora válidas!'
    };
}
// ============================================
// FINALIZAR AGENDAMENTO - CORRIGIDO (COM VALIDAÇÃO DE DATA/HORA)
// ============================================
async function finalizarAgendamento() {
    try {
        console.log('🔍 INICIANDO FINALIZAR AGENDAMENTO');
        console.log('  - clienteAtual:', clienteAtual);
        console.log('  - agendamentoAtual:', agendamentoAtual);
        console.log('  - empresaId:', empresaId);

        // ============================================
        // 🔥 VALIDAR DATA/HORA ANTES DE AGENDAR
        // ============================================
        const validacao = validarDataHora(agendamentoAtual.data, agendamentoAtual.hora);
        if (!validacao.valido) {
            adicionarMensagem(`❌ ${validacao.mensagem}`, 'bot');
            // Voltar para escolher outro horário
            estado = 'aguardando_horario';
            perguntarHorario(agendamentoAtual.data);
            return;
        }

        if (!clienteAtual || !clienteAtual.id) {
            console.log('⚠️ Cliente não identificado, tentando buscar...');

            if (telefoneCliente) {
                console.log('🔍 Buscando cliente pelo telefone:', telefoneCliente);
                try {
                    var res = await fetch('/api/chatbot/cliente/buscar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            telefone: telefoneCliente,
                            empresaId: empresaId
                        })
                    });
                    var data = await res.json();
                    console.log('📦 Resposta da busca:', data);

                    if (data.success && data.cliente) {
                        clienteAtual = data.cliente;
                        console.log('✅ Cliente encontrado novamente:', clienteAtual);
                    }
                } catch (error) {
                    console.error('❌ Erro ao buscar cliente:', error);
                }
            }

            if (!clienteAtual || !clienteAtual.id) {
                try {
                    var res2 = await fetch('/api/clientes', {
                        headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('token') || '') }
                    });
                    var data2 = await res2.json();
                    if (data2.success && data2.data) {
                        var encontrado = data2.data.find(function (c) {
                            return c.nome.toLowerCase() === nomeCliente?.toLowerCase();
                        });
                        if (encontrado) {
                            clienteAtual = encontrado;
                            console.log('✅ Cliente encontrado pelo nome:', clienteAtual);
                        }
                    }
                } catch (error) {
                    console.error('❌ Erro ao buscar cliente pelo nome:', error);
                }
            }
        }

        if (!clienteAtual || !clienteAtual.id) {
            console.log('❌ Cliente ainda não identificado após tentativas');
            adicionarMensagem('❌ Erro: Cliente não identificado. Tente novamente.', 'bot');
            estado = 'inicio';
            return;
        }

        if (!agendamentoAtual.servico_id) {
            adicionarMensagem('❌ Erro: Serviço não identificado. Tente novamente.', 'bot');
            estado = 'inicio';
            return;
        }

        if (!agendamentoAtual.data || !agendamentoAtual.hora) {
            adicionarMensagem('❌ Erro: Data ou horário não selecionados. Tente novamente.', 'bot');
            estado = 'inicio';
            return;
        }

        // ============================================
        // 🔥 CORREÇÃO: GARANTIR QUE O VALOR ESTÁ CORRETO
        // ============================================
        let valorFinal = 0;

        // 1. Tentar pegar do agendamentoAtual
        if (agendamentoAtual.valor && parseFloat(agendamentoAtual.valor) > 0) {
            valorFinal = parseFloat(agendamentoAtual.valor);
            console.log(`💰 Valor obtido do agendamentoAtual: R$ ${valorFinal}`);
        }

        // 2. Se ainda for 0, buscar do banco pelo ID do serviço
        if (valorFinal === 0 && agendamentoAtual.servico_id) {
            try {
                console.log('🔍 Buscando valor do serviço no banco (ID:', agendamentoAtual.servico_id, ')');
                const resServico = await fetch(`/api/chatbot/servico/${agendamentoAtual.servico_id}`);
                const dataServico = await resServico.json();
                console.log('📦 Resposta do serviço:', dataServico);

                if (dataServico.success && dataServico.servico) {
                    valorFinal = parseFloat(dataServico.servico.valor) || 0;
                    if (dataServico.servico.nome) {
                        agendamentoAtual.servico_nome = dataServico.servico.nome;
                    }
                    console.log(`💰 Valor obtido do banco: R$ ${valorFinal}`);
                }
            } catch (e) {
                console.warn('⚠️ Erro ao buscar valor do serviço:', e);
            }
        }

        // 3. Se ainda for 0, buscar da lista de serviços carregada
        if (valorFinal === 0 && servicosList.length > 0) {
            const servicoEncontrado = servicosList.find(s =>
                s.id == agendamentoAtual.servico_id ||
                s.nome === agendamentoAtual.servico_nome
            );
            if (servicoEncontrado) {
                valorFinal = parseFloat(servicoEncontrado.valor) || 0;
                if (servicoEncontrado.nome) {
                    agendamentoAtual.servico_nome = servicoEncontrado.nome;
                }
                console.log(`💰 Valor encontrado na lista de serviços: R$ ${valorFinal}`);
            }
        }

        // 4. Atualizar o valor no agendamentoAtual
        agendamentoAtual.valor = valorFinal;
        console.log(`💰 Valor final a ser enviado: R$ ${valorFinal}`);

        var empresaIdFinal = empresaId;
        if (!empresaIdFinal) {
            var params = new URLSearchParams(window.location.search);
            empresaIdFinal = params.get('empresa') || '1';
            console.log('🏢 empresaId recuperado da URL:', empresaIdFinal);
        }

        var profissionalId = agendamentoAtual.profissional_id;

        if (profissionalId && typeof profissionalId === 'string' && profissionalId.includes('dono')) {
            profissionalId = null;
            console.log('👨‍💼 Profissional é o Dono, enviando como null');
        }

        if (agendamentoAtual.profissional_nome === 'Qualquer profissional') {
            profissionalId = null;
        }

        var body = {
            clienteId: parseInt(clienteAtual.id),
            servicoId: parseInt(agendamentoAtual.servico_id),
            profissionalId: profissionalId ? parseInt(profissionalId) : null,
            data: agendamentoAtual.data,
            hora: agendamentoAtual.hora,
            empresaId: parseInt(empresaIdFinal),
            valor: valorFinal,
            servicoNome: agendamentoAtual.servico_nome || ''
        };

        console.log('📤 Enviando agendamento:', JSON.stringify(body, null, 2));

        var res3 = await fetch('/api/chatbot/agendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        var result3 = await res3.json();
        console.log('📥 Resposta do servidor:', result3);

        if (result3.success) {
            var dataFormatada = formatarDataBr(agendamentoAtual.data);
            var nomeProfissional = agendamentoAtual.profissional_nome || 'Não definido';
            var valorExibicao = parseFloat(agendamentoAtual.valor) || 0;
            var valorFinalFormatado = valorExibicao.toFixed(2).replace('.', ',');

            adicionarMensagem(
                '✅ <strong>AGENDAMENTO CONFIRMADO, ' + clienteAtual.nome + '!</strong><br><br>' +
                '📋 <strong>Resumo:</strong><br>' +
                '📅 Data: ' + dataFormatada + ' às ' + agendamentoAtual.hora + '<br>' +
                '👨‍💼 Profissional: ' + nomeProfissional + '<br>' +
                '✂️ Serviço: ' + agendamentoAtual.servico_nome + '<br>' +
                '💰 Valor: R$ ' + valorFinalFormatado + '<br><br>' +
                '🔔 Você receberá um lembrete próximo ao horário.<br><br>' +
                'Obrigado por escolher a ' + (dadosEmpresa?.nome || 'nossa barbearia') + '! ✨',
                'bot'
            );
            estado = 'inicio';
            agendamentoAtual = {};
        } else {
            adicionarMensagem(
                '❌ Erro ao confirmar agendamento: ' + result3.message + '<br><br>Tente novamente.',
                'bot'
            );
            estado = 'inicio';
        }
    } catch (error) {
        console.error('❌ Erro ao finalizar agendamento:', error);
        adicionarMensagem('❌ Erro ao confirmar agendamento. Tente novamente.', 'bot');
        estado = 'inicio';
    }
}

// ============================================
// FORMATAR DATA BR - CHATBOT (SEM TIMEZONE)
// ============================================

function formatarDataBr(dataStr) {
    if (!dataStr) return '-';
    try {
        if (typeof dataStr === 'string' && dataStr.includes('-')) {
            const partes = dataStr.split('-');
            if (partes.length === 3) {
                return partes[2] + '/' + partes[1] + '/' + partes[0];
            }
        }
        return dataStr;
    } catch {
        return dataStr;
    }
}

// ============================================
// EXPORTAR FUNÇÕES GLOBAIS
// ============================================
window.enviarMensagem = enviarMensagem;
window.mudarMesCalendario = window.mudarMesCalendario;

console.log('✅ chatbot.js carregado com BLOQUEIO GERAL!');