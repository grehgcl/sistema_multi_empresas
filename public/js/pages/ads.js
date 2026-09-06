// ============================================
// 📊 ADS - PAINEL DE ANÚNCIOS (VERSÃO OTIMIZADA)
// ============================================

let _adsGraficoOrigens = null;
let _adsGraficoEvolucao = null;
let _adsDadosAtuais = [];
let _adsFiltroEmpresa = null;

// ============================================
// FILTRAR POR EMPRESA
// ============================================
function filtrarPorEmpresa(empresaId) {
    if (!empresaId) return;
    const select = document.getElementById('adsFiltroEmpresa');
    if (select) {
        select.value = empresaId;
        select.dispatchEvent(new Event('change'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof showToast === 'function') {
        showToast('🔍 Filtrando por empresa selecionada', 'info');
    }
}

// ============================================
// FUNÇÃO PRINCIPAL (COMPLETA E CORRIGIDA)
// ============================================
async function _carregarPainelAdsReal(empresaId = null) {
    console.log('📊 Carregando Painel ADS...', empresaId);
    
    if (typeof ativarBotao === 'function') ativarBotao('dashboard');
    if (typeof showLoading === 'function') showLoading();
    const token = localStorage.getItem('token');

    _adsFiltroEmpresa = empresaId;

    try {
        const params = new URLSearchParams();
        if (empresaId) params.append('empresa_id', empresaId);
        
        const [statsRes, empresasRes] = await Promise.all([
            fetch(`/api/admin/ads-stats?${params.toString()}`, { 
                headers: { 'Authorization': 'Bearer ' + token } 
            }),
            fetch('/api/admin/empresas', { 
                headers: { 'Authorization': 'Bearer ' + token } 
            })
        ]);

        const statsData = await statsRes.json();
        const empresas = (await empresasRes.json()).data || [];

        if (!statsData.success) {
            throw new Error(statsData.error || 'Erro ao carregar estatísticas');
        }

        _adsDadosAtuais = statsData.data || [];
        const totals = statsData.totals || {};

        // ============================================
        // MAPEAR EMPRESAS PARA BUSCAR NOMES
        // ============================================
        const mapaEmpresas = {};
        empresas.forEach(e => {
            mapaEmpresas[e.id] = e.nome || `Empresa ${e.id}`;
        });

        // ============================================
        // PROCESSAR DADOS COM NOMES CORRETOS
        // ============================================
        const dadosProcessados = _adsDadosAtuais.map(row => {
            // 🔥 GARANTIR QUE O NOME DA EMPRESA NÃO É UNDEFINED
            let nomeEmpresa = row.empresa_nome || mapaEmpresas[row.empresa_id] || 'Não identificada';
            // Se ainda for undefined ou null, colocar "Não identificada"
            if (!nomeEmpresa || nomeEmpresa === 'undefined' || nomeEmpresa === 'null') {
                nomeEmpresa = 'Não identificada';
            }
            return {
                ...row,
                empresa_nome: nomeEmpresa,
                empresa_id: row.empresa_id || 'desconhecido'
            };
        });

        // ============================================
        // ANÁLISE POR ANÚNCIO
        // ============================================
        const analiseAnuncios = {};
        dadosProcessados.forEach(row => {
            if (!row.campanha || !row.campanha.startsWith('anuncio_')) return;
            
            const nomeAnuncio = row.campanha
                .replace('anuncio_', '')
                .replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            if (!analiseAnuncios[row.campanha]) {
                analiseAnuncios[row.campanha] = {
                    campanha: row.campanha,
                    nome: nomeAnuncio || 'Anúncio',
                    visualizacoes: 0,
                    cliques: 0,
                    empresas: new Set(),
                    clientes: new Set(),
                    ultimo_evento: null
                };
            }
            
            if (row.tipo === 'visualizacao') {
                analiseAnuncios[row.campanha].visualizacoes += (row.total || 1);
            }
            if (row.tipo === 'clique') {
                analiseAnuncios[row.campanha].cliques += (row.total || 1);
            }
            if (row.empresa_id && row.empresa_id !== 'desconhecido' && row.empresa_id !== 'null') {
                analiseAnuncios[row.campanha].empresas.add(row.empresa_id);
            }
            if (row.cliente_id) {
                analiseAnuncios[row.campanha].clientes.add(row.cliente_id);
            }
            if (row.data) {
                analiseAnuncios[row.campanha].ultimo_evento = row.data;
            }
        });

        const anunciosArray = Object.values(analiseAnuncios)
            .map(a => ({
                ...a,
                total_empresas: a.empresas.size,
                total_clientes: a.clientes.size,
                ctr: a.visualizacoes > 0 ? ((a.cliques / a.visualizacoes) * 100).toFixed(1) : '0.0'
            }))
            .sort((a, b) => b.visualizacoes - a.visualizacoes);

        // ============================================
        // ANÁLISE POR EMPRESA
        // ============================================
        const analiseEmpresas = {};
        dadosProcessados.forEach(row => {
            if (!row.campanha || !row.campanha.startsWith('anuncio_')) return;
            
            const empresaId = row.empresa_id || 'desconhecido';
            let empresaNome = row.empresa_nome || 'Não identificada';
            if (!empresaNome || empresaNome === 'undefined' || empresaNome === 'null') {
                empresaNome = 'Não identificada';
            }
            
            if (!analiseEmpresas[empresaId]) {
                analiseEmpresas[empresaId] = {
                    id: empresaId,
                    nome: empresaNome,
                    visualizacoes: 0,
                    cliques: 0,
                    anuncios: new Set(),
                    clientes: new Set(),
                    ultimo_evento: null
                };
            }
            
            if (row.tipo === 'visualizacao') {
                analiseEmpresas[empresaId].visualizacoes += (row.total || 1);
            }
            if (row.tipo === 'clique') {
                analiseEmpresas[empresaId].cliques += (row.total || 1);
            }
            if (row.campanha) {
                analiseEmpresas[empresaId].anuncios.add(row.campanha);
            }
            if (row.cliente_id) {
                analiseEmpresas[empresaId].clientes.add(row.cliente_id);
            }
            if (row.data) {
                analiseEmpresas[empresaId].ultimo_evento = row.data;
            }
        });

        const empresasArray = Object.values(analiseEmpresas)
            .map(e => ({
                ...e,
                total_anuncios: e.anuncios.size,
                total_clientes: e.clientes.size,
                ctr: e.visualizacoes > 0 ? ((e.cliques / e.visualizacoes) * 100).toFixed(1) : '0.0'
            }))
            .sort((a, b) => b.cliques - a.cliques);

        // ============================================
        // CRUZAMENTO ANÚNCIO × EMPRESA
        // ============================================
        const cruzamentoAnuncioEmpresa = {};
        dadosProcessados.forEach(row => {
            if (!row.campanha || !row.campanha.startsWith('anuncio_')) return;
            
            const empresaId = row.empresa_id || 'desconhecido';
            let empresaNome = row.empresa_nome || 'Não identificada';
            if (!empresaNome || empresaNome === 'undefined' || empresaNome === 'null') {
                empresaNome = 'Não identificada';
            }
            
            const chave = `${row.campanha}|${empresaId}`;
            if (!cruzamentoAnuncioEmpresa[chave]) {
                cruzamentoAnuncioEmpresa[chave] = {
                    campanha: row.campanha,
                    campanha_nome: row.campanha.replace('anuncio_', '').replace(/_/g, ' ') || 'Anúncio',
                    empresa_id: empresaId,
                    empresa_nome: empresaNome,
                    visualizacoes: 0,
                    cliques: 0
                };
            }
            if (row.tipo === 'visualizacao') {
                cruzamentoAnuncioEmpresa[chave].visualizacoes += (row.total || 1);
            }
            if (row.tipo === 'clique') {
                cruzamentoAnuncioEmpresa[chave].cliques += (row.total || 1);
            }
        });

        const cruzamentoArray = Object.values(cruzamentoAnuncioEmpresa)
            .sort((a, b) => b.visualizacoes - a.visualizacoes);

        // ============================================
        // RESUMO POR ORIGEM
        // ============================================
        const resumoOrigens = {};
        dadosProcessados.forEach(row => {
            const origem = row.origem || 'outros';
            if (!resumoOrigens[origem]) {
                resumoOrigens[origem] = { visualizacoes: 0, cliques: 0, conversoes: 0, valor: 0, custo: 0 };
            }
            resumoOrigens[origem].visualizacoes += row.total_visualizacoes || 0;
            resumoOrigens[origem].cliques += row.total_cliques || 0;
            resumoOrigens[origem].conversoes += row.total_conversoes || 0;
            resumoOrigens[origem].valor += row.valor_total || 0;
            resumoOrigens[origem].custo += row.custo_total || 0;
        });

        // ============================================
        // GERAR HTML
        // ============================================
        const isMobile = window.innerWidth < 768;

        // HTML - Anúncios
        const anunciosHtml = anunciosArray.length > 0 ? anunciosArray.map(a => `
            <div class="ad-card" style="
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 10px;
                padding: 14px 18px;
                margin-bottom: 10px;
            ">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="font-weight:600;color:#e2e8f0;font-size:15px;">📢 ${a.nome || 'Anúncio'}</div>
                        <div style="font-size:11px;color:#64748b;">Último: ${a.ultimo_evento || 'Nunca'}</div>
                    </div>
                    <div style="display:flex;gap:14px;flex-wrap:wrap;">
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:700;color:#667eea;">${a.visualizacoes || 0}</div>
                            <div style="font-size:9px;color:#94a3b8;">👁️ Visualizações</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:700;color:#8b5cf6;">${a.cliques || 0}</div>
                            <div style="font-size:9px;color:#94a3b8;">👆 Cliques</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:700;color:${parseFloat(a.ctr) > 5 ? '#22c55e' : '#f59e0b'};">${a.ctr || '0.0'}%</div>
                            <div style="font-size:9px;color:#94a3b8;">📈 CTR</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:18px;font-weight:700;color:#ec4899;">${a.total_clientes || 0}</div>
                            <div style="font-size:9px;color:#94a3b8;">👤 Clientes</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top:8px;height:3px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${Math.min(parseFloat(a.ctr) * 2, 100)}%;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:4px;"></div>
                </div>
            </div>
        `).join('') : '<div style="text-align:center;padding:20px;color:#94a3b8;">Nenhum anúncio registrado</div>';

        // HTML - Empresas (com validação do ID)
        const empresasHtml = empresasArray.length > 0 ? empresasArray.map(e => {
            // 🔥 VALIDAR SE O ID É VÁLIDO ANTES DE CRIAR O ONCLICK
            const idValido = e.id && e.id !== 'desconhecido' && e.id !== 'null' && !isNaN(e.id);
            const onclickAttr = idValido ? `onclick="filtrarPorEmpresa(${e.id})"` : '';
            const cursorStyle = idValido ? 'cursor:pointer;' : 'cursor:default;opacity:0.7;';
            
            return `
            <div ${onclickAttr} style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.06);
                border-radius:10px;
                padding:12px 16px;
                margin-bottom:8px;
                ${cursorStyle}
                transition:all 0.3s;
            " ${idValido ? `onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'"` : ''}>
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="font-weight:600;color:#e2e8f0;font-size:14px;">🏢 ${e.nome || 'Não identificada'}</div>
                        <div style="font-size:11px;color:#64748b;">${e.total_anuncios || 0} anúncios • ${e.total_clientes || 0} clientes</div>
                    </div>
                    <div style="display:flex;gap:12px;">
                        <div style="text-align:center;">
                            <div style="font-size:16px;font-weight:700;color:#667eea;">${e.visualizacoes || 0}</div>
                            <div style="font-size:8px;color:#94a3b8;">👁️</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:16px;font-weight:700;color:#8b5cf6;">${e.cliques || 0}</div>
                            <div style="font-size:8px;color:#94a3b8;">👆</div>
                        </div>
                        <div style="text-align:center;">
                            <div style="font-size:16px;font-weight:700;color:${parseFloat(e.ctr) > 5 ? '#22c55e' : '#f59e0b'};">${e.ctr || '0.0'}%</div>
                            <div style="font-size:8px;color:#94a3b8;">📈</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top:6px;height:2px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${Math.min((e.cliques / (e.visualizacoes || 1)) * 100, 100)}%;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:4px;"></div>
                </div>
            </div>
        `}).join('') : '<div style="text-align:center;padding:20px;color:#94a3b8;">Nenhuma empresa registrada</div>';

        // HTML - Cruzamento (com validação de nome)
        const cruzamentoHtml = cruzamentoArray.length > 0 ? cruzamentoArray.slice(0, 15).map(item => {
            const nomeAnuncio = item.campanha_nome || item.campanha || 'Anúncio';
            const nomeEmpresa = item.empresa_nome || 'Não identificada';
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:8px 10px;font-size:13px;color:#e2e8f0;">${nomeAnuncio}</td>
                <td style="padding:8px 10px;font-size:13px;color:#94a3b8;">${nomeEmpresa}</td>
                <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:600;color:#667eea;">${item.visualizacoes || 0}</td>
                <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:600;color:#8b5cf6;">${item.cliques || 0}</td>
                <td style="padding:8px 10px;text-align:center;font-size:13px;font-weight:600;color:${item.cliques > 0 ? '#22c55e' : '#64748b'};">${item.visualizacoes > 0 ? ((item.cliques / item.visualizacoes) * 100).toFixed(1) + '%' : '0%'}</td>
            </tr>
        `}).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">Nenhum dado disponível</td></tr>';

        // HTML - Origens
        const origensHtml = Object.entries(resumoOrigens).map(([origem, dados]) => {
            const roi = dados.custo > 0 ? (dados.valor / dados.custo).toFixed(2) : '0.00';
            return `
                <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px 16px;border:1px solid rgba(255,255,255,0.04);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                        <span style="font-weight:600;color:#e2e8f0;font-size:13px;">${origem || 'outros'}</span>
                        <span style="font-size:12px;color:${roi >= 1 ? '#22c55e' : '#ef4444'};">ROI ${roi}x</span>
                    </div>
                    <div style="display:flex;gap:12px;font-size:12px;color:#94a3b8;">
                        <span>👁️ ${dados.visualizacoes || 0}</span>
                        <span>👆 ${dados.cliques || 0}</span>
                        <span>✅ ${dados.conversoes || 0}</span>
                        <span>💰 R$ ${(dados.valor || 0).toFixed(2)}</span>
                    </div>
                </div>
            `;
        }).join('');

        // HTML - Tabela Detalhada
        const tabelaHtml = dadosProcessados.length > 0 ? dadosProcessados.slice(0, 20).map(row => {
            const nomeEmpresa = row.empresa_nome || 'Não identificada';
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
                <td style="padding:6px 8px;font-size:12px;color:#94a3b8;">${row.data || '-'}</td>
                <td style="padding:6px 8px;font-size:12px;color:#e2e8f0;">${nomeEmpresa}</td>
                <td style="padding:6px 8px;font-size:12px;color:#94a3b8;">${row.campanha || '-'}</td>
                <td style="padding:6px 8px;font-size:12px;"><span style="background:rgba(102,126,234,0.15);padding:2px 8px;border-radius:10px;color:#667eea;font-size:10px;">${row.origem || '-'}</span></td>
                <td style="padding:6px 8px;font-size:12px;"><span style="background:${row.tipo === 'clique' ? 'rgba(139,92,246,0.15)' : row.tipo === 'conversao' ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.15)'};padding:2px 8px;border-radius:10px;color:${row.tipo === 'clique' ? '#8b5cf6' : row.tipo === 'conversao' ? '#22c55e' : '#94a3b8'};font-size:10px;">${row.tipo || '-'}</span></td>
                <td style="padding:6px 8px;font-size:12px;color:#94a3b8;">${row.cliente_nome || row.cliente_id || '-'}</td>
                <td style="padding:6px 8px;text-align:right;font-size:12px;color:#e2e8f0;">R$ ${(row.valor_total || 0).toFixed(2)}</td>
            </tr>
        `}).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">Nenhum registro encontrado</td></tr>';

        // ============================================
        // HTML COMPLETO
        // ============================================
        const html = `
            <div style="padding:16px;max-width:1200px;margin:0 auto;">

                <!-- Voltar -->
                <button onclick="carregarDashboardSuperAdmin()" style="
                    background:transparent;border:none;padding:8px 16px;
                    cursor:pointer;color:#94a3b8;font-size:14px;
                    display:flex;align-items:center;gap:8px;
                    border-radius:8px;margin-bottom:16px;
                " onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                    ← Voltar ao Dashboard
                </button>

                <!-- Cabeçalho -->
                <div style="
                    display:flex;justify-content:space-between;align-items:center;
                    flex-wrap:wrap;gap:12px;padding:16px 20px;
                    background:linear-gradient(135deg,#0f0f1a,#1a1a3e);
                    border-radius:12px;border:1px solid rgba(102,126,234,0.08);
                    margin-bottom:20px;
                ">
                    <div>
                        <h1 style="margin:0;font-size:22px;color:#fff;font-weight:700;">📊 Painel de Anúncios</h1>
                        <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Monitore o desempenho das campanhas de marketing</p>
                    </div>
                    <button onclick="abrirModalRegistroAds()" style="
                        padding:10px 20px;background:#4299e1;border:none;
                        border-radius:8px;color:#fff;font-weight:600;
                        cursor:pointer;display:flex;align-items:center;gap:6px;
                    ">➕ Novo Registro</button>
                </div>

                <!-- Filtros -->
                <div style="
                    display:flex;flex-wrap:wrap;gap:10px;
                    background:rgba(255,255,255,0.03);padding:14px 16px;
                    border-radius:10px;border:1px solid rgba(255,255,255,0.04);
                    margin-bottom:20px;align-items:flex-end;
                ">
                    <div style="flex:1;min-width:120px;">
                        <label style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Empresa</label>
                        <select id="adsFiltroEmpresa" onchange="carregarPainelAds(this.value)" style="
                            width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);
                            border:1px solid rgba(255,255,255,0.08);border-radius:6px;
                            color:#e2e8f0;font-size:13px;
                        ">
                            <option value="">Todas as empresas</option>
                            ${empresas.map(e => `<option value="${e.id}" ${empresaId == e.id ? 'selected' : ''}>${e.nome || 'Empresa ' + e.id}</option>`).join('')}
                        </select>
                    </div>
                    <div style="flex:1;min-width:120px;">
                        <label style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Origem</label>
                        <select id="adsFiltroOrigem" onchange="aplicarFiltrosAds()" style="
                            width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);
                            border:1px solid rgba(255,255,255,0.08);border-radius:6px;
                            color:#e2e8f0;font-size:13px;
                        ">
                            <option value="">Todas</option>
                            <option value="chatbot">Chatbot</option>
                            <option value="chatbot_anuncio">Anúncios do Chatbot</option>
                            <option value="google">Google</option>
                            <option value="facebook">Facebook</option>
                            <option value="instagram">Instagram</option>
                            <option value="whatsapp">WhatsApp</option>
                        </select>
                    </div>
                    <div style="flex:1;min-width:120px;">
                        <label style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Data Início</label>
                        <input type="date" id="adsFiltroDataInicio" onchange="aplicarFiltrosAds()" style="
                            width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);
                            border:1px solid rgba(255,255,255,0.08);border-radius:6px;
                            color:#e2e8f0;font-size:13px;
                        ">
                    </div>
                    <div style="flex:1;min-width:120px;">
                        <label style="font-size:10px;color:#94a3b8;text-transform:uppercase;">Data Fim</label>
                        <input type="date" id="adsFiltroDataFim" onchange="aplicarFiltrosAds()" style="
                            width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);
                            border:1px solid rgba(255,255,255,0.08);border-radius:6px;
                            color:#e2e8f0;font-size:13px;
                        ">
                    </div>
                    <button onclick="aplicarFiltrosAds()" style="
                        padding:8px 24px;background:#48bb78;border:none;
                        border-radius:6px;color:#fff;font-weight:600;
                        cursor:pointer;height:38px;
                    ">🔍 Filtrar</button>
                </div>

                <!-- Cards -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
                    ${[
                        { icon: '👁️', label: 'Visualizações', value: totals.total_visualizacoes || 0, color: '#667eea' },
                        { icon: '👆', label: 'Cliques', value: totals.total_cliques || 0, color: '#8b5cf6' },
                        { icon: '✅', label: 'Conversões', value: totals.total_conversoes || 0, color: '#22c55e' },
                        { icon: '💰', label: 'ROI', value: (totals.total_roi || 0).toFixed(2) + 'x', color: '#f59e0b' },
                        { icon: '📈', label: 'Taxa Conversão', value: (totals.taxa_conversao_media || 0).toFixed(1) + '%', color: '#ec4899' }
                    ].map(metric => `
                        <div style="
                            background:linear-gradient(135deg,#14142a,#1a1a3a);
                            border-radius:10px;padding:14px;text-align:center;
                            border:1px solid rgba(255,255,255,0.04);
                        ">
                            <div style="font-size:20px;">${metric.icon}</div>
                            <div style="font-size:20px;font-weight:700;color:#fff;margin:4px 0;">${metric.value}</div>
                            <div style="font-size:11px;color:#94a3b8;">${metric.label}</div>
                            <div style="height:2px;margin-top:8px;background:linear-gradient(90deg,${metric.color},transparent);border-radius:4px;"></div>
                        </div>
                    `).join('')}
                </div>

                <!-- Gráficos -->
                <div style="display:grid;grid-template-columns:${isMobile ? '1fr' : '1fr 1fr'};gap:16px;margin-bottom:20px;">
                    <div style="background:linear-gradient(135deg,#14142a,#1a1a3a);padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
                        <h3 style="color:#e2e8f0;font-size:14px;margin:0 0 12px;">📊 Conversões por Origem</h3>
                        <canvas id="adsGraficoOrigens" style="max-height:180px;"></canvas>
                    </div>
                    <div style="background:linear-gradient(135deg,#14142a,#1a1a3a);padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,0.04);">
                        <h3 style="color:#e2e8f0;font-size:14px;margin:0 0 12px;">📈 Evolução Diária</h3>
                        <canvas id="adsGraficoEvolucao" style="max-height:180px;"></canvas>
                    </div>
                </div>

                <!-- Anúncios -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius:10px;padding:16px;
                    border:1px solid rgba(255,255,255,0.04);
                    margin-bottom:16px;
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <h3 style="color:#e2e8f0;font-size:15px;margin:0;">📢 Anúncios <span style="font-size:12px;color:#94a3b8;font-weight:normal;">(${anunciosArray.length})</span></h3>
                        <span style="font-size:11px;color:#94a3b8;">Cliques: ${anunciosArray.reduce((s,a) => s + a.cliques, 0)}</span>
                    </div>
                    ${anunciosHtml}
                </div>

                <!-- Empresas -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius:10px;padding:16px;
                    border:1px solid rgba(255,255,255,0.04);
                    margin-bottom:16px;
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <h3 style="color:#e2e8f0;font-size:15px;margin:0;">🏢 Empresas <span style="font-size:12px;color:#94a3b8;font-weight:normal;">(${empresasArray.length})</span></h3>
                        <span style="font-size:11px;color:#94a3b8;">Clique para filtrar</span>
                    </div>
                    ${empresasHtml}
                </div>

                <!-- Cruzamento -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius:10px;padding:16px;
                    border:1px solid rgba(255,255,255,0.04);
                    margin-bottom:16px;
                ">
                    <h3 style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">🔗 Quem viu cada anúncio <span style="font-size:12px;color:#94a3b8;font-weight:normal;">(${cruzamentoArray.length})</span></h3>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:13px;">
                            <thead>
                                <tr style="border-bottom:2px solid rgba(255,255,255,0.06);">
                                    <th style="text-align:left;padding:6px 8px;color:#94a3b8;font-weight:600;font-size:11px;">Anúncio</th>
                                    <th style="text-align:left;padding:6px 8px;color:#94a3b8;font-weight:600;font-size:11px;">Empresa</th>
                                    <th style="text-align:center;padding:6px 8px;color:#94a3b8;font-weight:600;font-size:11px;">👁️</th>
                                    <th style="text-align:center;padding:6px 8px;color:#94a3b8;font-weight:600;font-size:11px;">👆</th>
                                    <th style="text-align:center;padding:6px 8px;color:#94a3b8;font-weight:600;font-size:11px;">📈 CTR</th>
                                </tr>
                            </thead>
                            <tbody>${cruzamentoHtml}</tbody>
                        </table>
                    </div>
                </div>

                <!-- Origens -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius:10px;padding:16px;
                    border:1px solid rgba(255,255,255,0.04);
                    margin-bottom:16px;
                ">
                    <h3 style="color:#e2e8f0;font-size:15px;margin:0 0 12px;">📋 Desempenho por Origem</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">
                        ${origensHtml || '<div style="color:#94a3b8;text-align:center;padding:12px;">Nenhum dado</div>'}
                    </div>
                </div>

                <!-- Tabela Detalhada -->
                <div style="
                    background:linear-gradient(135deg,#14142a,#1a1a3a);
                    border-radius:10px;padding:16px;
                    border:1px solid rgba(255,255,255,0.04);
                ">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <h3 style="color:#e2e8f0;font-size:15px;margin:0;">📋 Detalhamento</h3>
                        <span style="font-size:11px;color:#94a3b8;">${dadosProcessados.length} registros</span>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;font-size:12px;">
                            <thead>
                                <tr style="border-bottom:2px solid rgba(255,255,255,0.06);">
                                    <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:600;font-size:10px;">Data</th>
                                    <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:600;font-size:10px;">Empresa</th>
                                    <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:600;font-size:10px;">Campanha</th>
                                    <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:600;font-size:10px;">Origem</th>
                                    <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:600;font-size:10px;">Tipo</th>
                                    <th style="text-align:left;padding:6px 8px;color:#64748b;font-weight:600;font-size:10px;">Cliente</th>
                                    <th style="text-align:right;padding:6px 8px;color:#64748b;font-weight:600;font-size:10px;">Valor</th>
                                </tr>
                            </thead>
                            <tbody>${tabelaHtml}</tbody>
                        </table>
                    </div>
                </div>

            </div>
        `;

        document.getElementById('content').innerHTML = html;
        if (typeof hideLoading === 'function') hideLoading();

        setTimeout(() => {
            renderizarGraficosAds(dadosProcessados);
        }, 300);

    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Erro:', error);
        document.getElementById('content').innerHTML = `
            <div style="text-align:center;padding:40px;color:#ef4444;">
                <h3>❌ Erro ao carregar painel</h3>
                <p>${error.message}</p>
                <button onclick="carregarPainelAds()" style="padding:10px 24px;background:#4299e1;border:none;border-radius:8px;color:#fff;cursor:pointer;">Tentar Novamente</button>
            </div>
        `;
    }
}
// ============================================
// RENDERIZAR GRÁFICOS
// ============================================
function renderizarGraficosAds(dados) {
    // Origens
    const origens = {};
    dados.forEach(row => {
        if (row.tipo === 'conversao') {
            origens[row.origem] = (origens[row.origem] || 0) + (row.total || 0);
        }
    });

    const ctxOrigens = document.getElementById('adsGraficoOrigens');
    if (ctxOrigens) {
        if (_adsGraficoOrigens) { _adsGraficoOrigens.destroy(); _adsGraficoOrigens = null; }
        try {
            _adsGraficoOrigens = new Chart(ctxOrigens, {
                type: 'bar',
                data: {
                    labels: Object.keys(origens).length ? Object.keys(origens) : ['Sem dados'],
                    datasets: [{
                        label: 'Conversões',
                        data: Object.values(origens).length ? Object.values(origens) : [0],
                        backgroundColor: ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#fc8181']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }
                }
            });
        } catch(e) { console.error('Erro gráfico origens:', e); }
    }

    // Evolução
    const evolucao = {};
    dados.forEach(row => {
        if (row.tipo === 'conversao' || row.tipo === 'clique') {
            const data = row.data || '2024-01-01';
            if (!evolucao[data]) evolucao[data] = { conversoes: 0, cliques: 0 };
            if (row.tipo === 'conversao') evolucao[data].conversoes += (row.total || 0);
            if (row.tipo === 'clique') evolucao[data].cliques += (row.total || 0);
        }
    });

    const ctxEvolucao = document.getElementById('adsGraficoEvolucao');
    if (ctxEvolucao) {
        if (_adsGraficoEvolucao) { _adsGraficoEvolucao.destroy(); _adsGraficoEvolucao = null; }
        const datas = Object.keys(evolucao).sort();
        try {
            _adsGraficoEvolucao = new Chart(ctxEvolucao, {
                type: 'line',
                data: {
                    labels: datas.length ? datas : ['Sem dados'],
                    datasets: [
                        { label: 'Conversões', data: datas.length ? datas.map(d => evolucao[d].conversoes) : [0], borderColor: '#48bb78', tension: 0.4, fill: true, backgroundColor: 'rgba(72,187,120,0.1)' },
                        { label: 'Cliques', data: datas.length ? datas.map(d => evolucao[d].cliques) : [0], borderColor: '#4299e1', tension: 0.4, fill: true, backgroundColor: 'rgba(66,153,225,0.1)' }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { color: '#94a3b8', boxWidth: 10 } } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8', maxTicksLimit: 10 } } }
                }
            });
        } catch(e) { console.error('Erro gráfico evolução:', e); }
    }
}

// ============================================
// APLICAR FILTROS
// ============================================
function aplicarFiltrosAds() {
    const empresa = document.getElementById('adsFiltroEmpresa')?.value || '';
    const origem = document.getElementById('adsFiltroOrigem')?.value || '';
    const dataInicio = document.getElementById('adsFiltroDataInicio')?.value || '';
    const dataFim = document.getElementById('adsFiltroDataFim')?.value || '';

    let dadosFiltrados = _adsDadosAtuais;

    if (empresa) dadosFiltrados = dadosFiltrados.filter(row => row.empresa_id == empresa);
    if (origem) dadosFiltrados = dadosFiltrados.filter(row => row.origem === origem);
    if (dataInicio) dadosFiltrados = dadosFiltrados.filter(row => row.data >= dataInicio);
    if (dataFim) dadosFiltrados = dadosFiltrados.filter(row => row.data <= dataFim);

    // Recalcular totais
    const totals = { total_visualizacoes: 0, total_cliques: 0, total_conversoes: 0, total_valor: 0, total_custo: 0, total_roi: 0, taxa_conversao_media: 0 };
    dadosFiltrados.forEach(row => {
        totals.total_visualizacoes += row.total_visualizacoes || 0;
        totals.total_cliques += row.total_cliques || 0;
        totals.total_conversoes += row.total_conversoes || 0;
        totals.total_valor += row.valor_total || 0;
        totals.total_custo += row.custo_total || 0;
    });
    totals.total_roi = totals.total_custo > 0 ? (totals.total_valor / totals.total_custo) : 0;
    totals.taxa_conversao_media = totals.total_cliques > 0 ? (totals.total_conversoes * 100 / totals.total_cliques) : 0;

    const cards = document.querySelectorAll('.sa-ads-metric-card');
    const valores = [totals.total_visualizacoes, totals.total_cliques, totals.total_conversoes, totals.total_roi.toFixed(2) + 'x', totals.taxa_conversao_media.toFixed(1) + '%'];
    cards.forEach((card, i) => {
        const valueEl = card.querySelector('.sa-ads-metric-value');
        if (valueEl) valueEl.textContent = valores[i] || 0;
    });

    renderizarGraficosAds(dadosFiltrados);
}

// ============================================
// MODAL - REGISTRAR INTERAÇÃO
// ============================================
function abrirModalRegistroAds() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modalRegistroAds';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:450px;">
            <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <h3 style="color:#e2e8f0;font-size:16px;margin:0;">📝 Registrar Interação</h3>
                <button onclick="fecharModal('modalRegistroAds')" style="background:transparent;border:none;color:#94a3b8;font-size:20px;cursor:pointer;">×</button>
            </div>
            <div style="padding:16px;">
                <form id="formRegistroAds" style="display:flex;flex-direction:column;gap:10px;">
                    <div>
                        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Empresa *</label>
                        <select id="adsRegEmpresa" class="form-control" required style="width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;">
                            <option value="">Selecione</option>
                            ${document.querySelector('#adsFiltroEmpresa')?.innerHTML || ''}
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Campanha *</label>
                        <input type="text" id="adsRegCampanha" class="form-control" placeholder="Ex: anuncio_mercado_do_ze" required style="width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Origem *</label>
                        <select id="adsRegOrigem" class="form-control" required style="width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;">
                            <option value="">Selecione</option>
                            <option value="chatbot">Chatbot</option>
                            <option value="chatbot_anuncio">Anúncio do Chatbot</option>
                            <option value="google">Google</option>
                            <option value="facebook">Facebook</option>
                            <option value="instagram">Instagram</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="organico">Orgânico</option>
                            <option value="outros">Outros</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Tipo *</label>
                        <select id="adsRegTipo" class="form-control" required style="width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;">
                            <option value="">Selecione</option>
                            <option value="visualizacao">Visualização</option>
                            <option value="clique">Clique</option>
                            <option value="lead">Lead</option>
                            <option value="conversao">Conversão</option>
                        </select>
                    </div>
                    <div>
                        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Valor (R$)</label>
                        <input type="number" id="adsRegValor" class="form-control" step="0.01" placeholder="0.00" style="width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;">
                    </div>
                    <div>
                        <label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Data da Interação</label>
                        <input type="datetime-local" id="adsRegData" class="form-control" style="width:100%;padding:8px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#e2e8f0;">
                    </div>
                    <div style="display:flex;gap:8px;margin-top:4px;">
                        <button type="submit" style="flex:1;padding:10px;background:#4299e1;border:none;border-radius:6px;color:#fff;font-weight:600;cursor:pointer;">💾 Salvar</button>
                        <button type="button" onclick="fecharModal('modalRegistroAds')" style="padding:10px 16px;background:transparent;border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#94a3b8;cursor:pointer;">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
        const form = document.getElementById('formRegistroAds');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                registrarInteracaoAds();
            });
        }
    }, 100);
}

// ============================================
// REGISTRAR INTERAÇÃO
// ============================================
async function registrarInteracaoAds() {
    const empresa = document.getElementById('adsRegEmpresa')?.value;
    const campanha = document.getElementById('adsRegCampanha')?.value;
    const origem = document.getElementById('adsRegOrigem')?.value;
    const tipo = document.getElementById('adsRegTipo')?.value;
    const valor = parseFloat(document.getElementById('adsRegValor')?.value) || 0;
    const data = document.getElementById('adsRegData')?.value || new Date().toISOString();

    if (!empresa || !campanha || !origem || !tipo) {
        if (typeof showToast === 'function') showToast('Preencha todos os campos obrigatórios (*)', 'warning');
        return;
    }

    if (typeof showLoading === 'function') showLoading();
    const token = localStorage.getItem('token');

    try {
        const res = await fetch('/api/admin/ads-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ empresa_id: empresa, campanha, origem, tipo, valor, custo: 0, data_interacao: data })
        });
        const dataRes = await res.json();
        if (typeof hideLoading === 'function') hideLoading();

        if (dataRes.success) {
            if (typeof showToast === 'function') showToast('✅ Interação registrada com sucesso!', 'success');
            fecharModal('modalRegistroAds');
            carregarPainelAds(_adsFiltroEmpresa);
        } else {
            if (typeof showToast === 'function') showToast('❌ ' + (dataRes.error || 'Erro ao registrar'), 'error');
        }
    } catch (error) {
        if (typeof hideLoading === 'function') hideLoading();
        console.error('❌ Erro:', error);
        if (typeof showToast === 'function') showToast('❌ Erro ao registrar interação', 'error');
    }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================
function fecharModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

function carregarPainelAds(empresaId = null) {
    console.log('📊 carregarPainelAds chamado');
    _carregarPainelAdsReal(empresaId);
}

// ============================================
// EXPORTAR
// ============================================
window._carregarPainelAdsReal = _carregarPainelAdsReal;
window._aplicarFiltrosAds = aplicarFiltrosAds;
window._abrirModalRegistroAds = abrirModalRegistroAds;
window._registrarInteracaoAds = registrarInteracaoAds;
window._renderizarGraficosAds = renderizarGraficosAds;
window._fecharModal = fecharModal;

window.carregarPainelAds = carregarPainelAds;
window.aplicarFiltrosAds = aplicarFiltrosAds;
window.abrirModalRegistroAds = abrirModalRegistroAds;
window.registrarInteracaoAds = registrarInteracaoAds;
window.renderizarGraficosAds = renderizarGraficosAds;
window.fecharModal = fecharModal;
window.filtrarPorEmpresa = filtrarPorEmpresa;

console.log('✅ ADS - Painel otimizado carregado!');