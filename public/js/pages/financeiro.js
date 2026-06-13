// Financeiro - Dono e Profissional
async function carregarFinanceiro() {
    ativarBotao('financeiro');
    const token = localStorage.getItem('token');
    const usuario = JSON.parse(localStorage.getItem('usuario'));

    try {
        const res = await fetch('/api/financeiro', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            const data = result.data;
            const totais = data.totais;

            let html = '<h2>💰 Financeiro</h2>';

            // Cards de totais gerais (apenas para Dono)
            if (usuario.role === 'dono') {
                html += '<div class="card-grid">';
                html += `
                    <div class="stat-card">
                        <div class="stat-value">R$ ${(totais.faturamento_bruto || 0).toFixed(2)}</div>
                        <div>Faturamento Bruto</div>
                        <small style="color:#48bb78;">📈 Total de serviços</small>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">R$ ${(totais.total_comissoes || 0).toFixed(2)}</div>
                        <div>💰 Comissões a Pagar</div>
                        <small style="color:#ed8936;">Apenas serviços com profissional</small>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">R$ ${(totais.faturamento_liquido || 0).toFixed(2)}</div>
                        <div>📊 Faturamento Líquido</div>
                        <small style="color:#667eea;">Bruto - Comissões</small>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${totais.total_servicos || 0}</div>
                        <div>✅ Serviços Concluídos</div>
                        <small>Total realizados</small>
                    </div>
                `;
                html += '</div>';

                // Cards por profissional (apenas para Dono)
                if (data.comissoes_por_profissional && data.comissoes_por_profissional.length > 0) {
                    html += '<div class="card" style="margin-top: 20px;">';
                    html += '<h3>👥 Comissões por Profissional</h3>';
                    html += '<div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">';

                    for (let i = 0; i < data.comissoes_por_profissional.length; i++) {
                        const prof = data.comissoes_por_profissional[i];
                        html += `
                            <div class="stat-card" style="background: #f8f9fa;">
                                <div style="font-size: 18px; font-weight: bold; color: #4299e1;">👤 ${prof.nome}</div>
                                <div class="stat-value" style="font-size: 24px; color: #ed8936;">R$ ${(prof.total_comissao || 0).toFixed(2)}</div>
                                <div>💰 Total a Pagar</div>
                                <small>${prof.total_servicos} serviço(s) concluído(s)</small>
                            </div>
                        `;
                    }
                    html += '</div></div>';
                }
            } else {
                // Profissional - mostra apenas suas comissões
                html += '<div class="card-grid">';
                html += `
                    <div class="stat-card">
                        <div class="stat-value">R$ ${(totais.total_comissoes || 0).toFixed(2)}</div>
                        <div>💰 Total em Comissões</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${totais.total_servicos || 0}</div>
                        <div>✅ Serviços Concluídos</div>
                    </div>
                `;
                html += '</div>';
            }

            // Tabela de histórico
            html += '<div class="card">';
            html += '<h3>📋 Histórico de Serviços Concluídos</h3>';
            html += '<div style="overflow-x: auto;">';
            html += '<table style="width:100%">';
            html += '<thead><td><th>Data</th><th>Cliente</th><th>Serviço</th><th>Valor</th><th>Profissional</th><th>Comissão</th></tr></thead>';
            html += '<tbody id="listaFinanceiro">';

            if (data.comissoes.length === 0) {
                html += '<tr><td colspan="6" style="text-align:center">Nenhum serviço concluído ainda</td</tr>';
            } else {
                for (let i = 0; i < data.comissoes.length; i++) {
                    const item = data.comissoes[i];
                    let profissionalDisplay = item.profissional_nome || 'N/A';
                    let comissaoDisplay = 'R$ 0,00';

                    if (!item.profissional_id) {
                        profissionalDisplay = '<span style="color:#999;">Sem profissional</span>';
                        comissaoDisplay = '<span style="color:#999;">R$ 0,00</span>';
                    } else if (item.comissao && item.comissao > 0) {
                        comissaoDisplay = 'R$ ' + (item.comissao || 0).toFixed(2);
                    }

                    html += '</tr>';
                    html += '<td style="padding: 12px; border-bottom: 1px solid #ddd;">' + new Date(item.data).toLocaleDateString() + '</td>';
                    html += '<td style="padding: 12px; border-bottom: 1px solid #ddd;">' + (item.cliente_nome || 'N/A') + '</td>';
                    html += '<td style="padding: 12px; border-bottom: 1px solid #ddd;">' + (item.servico_nome || item.servico || 'N/A') + '</td>';
                    html += '<td style="padding: 12px; border-bottom: 1px solid #ddd;">R$ ' + (item.valor || 0).toFixed(2) + '</td>';
                    html += '<td style="padding: 12px; border-bottom: 1px solid #ddd;">' + profissionalDisplay + '</td>';
                    html += '<td style="padding: 12px; border-bottom: 1px solid #ddd;">' + comissaoDisplay + '</td>';
                    html += '</tr>';
                }
            }

            html += '</tbody>点心</div></div>';
            document.getElementById('content').innerHTML = html;
        } else {
            document.getElementById('content').innerHTML = '<div class="card"><div class="card-body" style="color:red">Erro ao carregar financeiro: ' + result.message + '</div></div>';
        }
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('content').innerHTML = '<div class="card"><div class="card-body" style="color:red">Erro ao carregar financeiro: ' + error.message + '</div></div>';
    }
}

window.carregarFinanceiro = carregarFinanceiro;