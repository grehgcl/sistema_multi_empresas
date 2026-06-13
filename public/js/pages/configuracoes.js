// Página de Configurações Unificada (Geral + Horários)
let horariosAtuaisConfig = [];

async function carregarConfiguracoes() {
    ativarBotao("configuracoes");
    const token = localStorage.getItem("token");
    
    try {
        const res = await fetch("/api/horarios", {
            headers: { "Authorization": "Bearer " + token }
        });
        const result = await res.json();
        
        if (result.success) {
            horariosAtuaisConfig = result.data;
            renderizarConfiguracoes();
        }
    } catch (error) {
        console.error("Erro:", error);
        document.getElementById("content").innerHTML = "<div class='card' style='color:red'>Erro ao carregar configurações</div>";
    }
}

function renderizarConfiguracoes() {
    const dias = [
        { id: 0, nome: "Domingo" },
        { id: 1, nome: "Segunda-feira" },
        { id: 2, nome: "Terça-feira" },
        { id: 3, nome: "Quarta-feira" },
        { id: 4, nome: "Quinta-feira" },
        { id: 5, nome: "Sexta-feira" },
        { id: 6, nome: "Sábado" }
    ];
    
    const intervalos = [
        { value: 15, label: "15 min" },
        { value: 30, label: "30 min" },
        { value: 45, label: "45 min" },
        { value: 60, label: "1 hora" }
    ];
    
    let html = `
        <h2>⚙️ Configurações</h2>
        
        <div class="card" style="margin-bottom: 20px;">
            <h3>👥 Profissionais</h3>
            <p style="color: #666; margin-bottom: 10px;">Gerencie os profissionais da sua barbearia</p>
            <button onclick="carregarConfiguracoesOriginais()" style="background:#4299e1;">Gerenciar Profissionais</button>
        </div>
        
        <div class="card">
            <h3>⏰ Horários de Funcionamento</h3>
            <p style="color: #666; margin-bottom: 20px;">Configure os dias e horários. Os agendamentos respeitarão estas configurações.</p>
            
            <div style="overflow-x: auto;">
                <table style="width:100%">
                    <thead>
                        <tr><th>Dia</th><th>Status</th><th>Horário</th><th>Almoço</th><th>Intervalo</th></tr>
                    </thead>
                    <tbody>
    `;
    
    for (let i = 0; i < dias.length; i++) {
        const dia = dias[i];
        const horario = horariosAtuaisConfig.find(function(h) { return h.dia_semana === dia.id; }) || {};
        const isAberto = horario.aberto === 1;
        
        html += `<tr>`;
        html += `<td style="padding: 12px; border-bottom: 1px solid #ddd;"><strong>${dia.nome}</strong></td>`;
        
        html += `<td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <label style="position: relative; display: inline-block; width: 50px; height: 24px;">
                <input type="checkbox" id="toggle_${dia.id}" onchange="toggleHorarioDia(${dia.id})" ${isAberto ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isAberto ? '#48bb78' : '#ccc'}; border-radius: 24px;"></span>
                <span style="position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: .3s; transform: ${isAberto ? 'translateX(26px)' : 'none'};"></span>
            </label>
        </td>`;
        
        const disabled = !isAberto ? 'disabled' : '';
        const horaInicio = (horario.hora_inicio || '09:00').substring(0, 5);
        const horaFim = (horario.hora_fim || '18:00').substring(0, 5);
        
        html += `<td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <input type="time" id="inicio_${dia.id}" value="${horaInicio}" ${disabled} style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" onchange="salvarHorarioDia(${dia.id})">
            às
            <input type="time" id="fim_${dia.id}" value="${horaFim}" ${disabled} style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" onchange="salvarHorarioDia(${dia.id})">
        </td>`;
        
        const almocoInicio = (horario.almoco_inicio || '12:00').substring(0, 5);
        const almocoFim = (horario.almoco_fim || '13:00').substring(0, 5);
        
        html += `<td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <input type="time" id="almoco_inicio_${dia.id}" value="${almocoInicio}" ${disabled} style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" onchange="salvarHorarioDia(${dia.id})">
            às
            <input type="time" id="almoco_fim_${dia.id}" value="${almocoFim}" ${disabled} style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;" onchange="salvarHorarioDia(${dia.id})">
        </td>`;
        
        let optionsHtml = "";
        for (let j = 0; j < intervalos.length; j++) {
            const intv = intervalos[j];
            const selected = (horario.intervalo_minutos === intv.value) ? 'selected' : '';
            optionsHtml += `<option value="${intv.value}" ${selected}>${intv.label}</option>`;
        }
        
        html += `<td style="padding: 12px; border-bottom: 1px solid #ddd;">
            <select id="intervalo_${dia.id}" ${disabled} style="padding: 6px; border: 1px solid #ddd; border-radius: 4px;" onchange="salvarHorarioDia(${dia.id})">
                ${optionsHtml}
            </select>
        </td>`;
        
        html += `</tr>`;
    }
    
    html += `
                    </tbody>
                点化的
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #888;">💡 Dica: As alterações são salvas automaticamente</p>
        </div>
    `;
    
    document.getElementById("content").innerHTML = html;
}

async function toggleHorarioDia(dia) {
    const isChecked = document.getElementById("toggle_" + dia).checked;
    
    const campos = ["inicio", "fim", "almoco_inicio", "almoco_fim", "intervalo"];
    for (let i = 0; i < campos.length; i++) {
        const el = document.getElementById(campos[i] + "_" + dia);
        if (el) el.disabled = !isChecked;
    }
    
    const toggleSpan = document.querySelector("#toggle_" + dia + " + span");
    if (isChecked) {
        toggleSpan.style.backgroundColor = "#48bb78";
    } else {
        toggleSpan.style.backgroundColor = "#ccc";
    }
    
    await salvarHorarioDia(dia);
}

async function salvarHorarioDia(dia) {
    const token = localStorage.getItem("token");
    const aberto = document.getElementById("toggle_" + dia)?.checked ? 1 : 0;
    let hora_inicio = document.getElementById("inicio_" + dia)?.value || "09:00";
    let hora_fim = document.getElementById("fim_" + dia)?.value || "18:00";
    let almoco_inicio = document.getElementById("almoco_inicio_" + dia)?.value || "12:00";
    let almoco_fim = document.getElementById("almoco_fim_" + dia)?.value || "13:00";
    const intervalo_minutos = parseInt(document.getElementById("intervalo_" + dia)?.value || 30);
    
    // Garantir formato HH:MM
    hora_inicio = hora_inicio.substring(0, 5);
    hora_fim = hora_fim.substring(0, 5);
    almoco_inicio = almoco_inicio.substring(0, 5);
    almoco_fim = almoco_fim.substring(0, 5);
    
    try {
        await fetch("/api/horarios/" + dia, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ aberto: aberto, hora_inicio: hora_inicio, hora_fim: hora_fim, almoco_inicio: almoco_inicio, almoco_fim: almoco_fim, intervalo_minutos: intervalo_minutos })
        });
    } catch (error) {
        console.error("Erro ao salvar:", error);
    }
}

function carregarConfiguracoesOriginais() {
    if (typeof window.carregarConfiguracoesProfissionais === "function") {
        window.carregarConfiguracoesProfissionais();
    } else {
        alert("Use o menu Configurações original para gerenciar profissionais");
    }
}

window.carregarConfiguracoes = carregarConfiguracoes;
window.toggleHorarioDia = toggleHorarioDia;
window.salvarHorarioDia = salvarHorarioDia;
window.carregarConfiguracoesOriginais = carregarConfiguracoesOriginais;
