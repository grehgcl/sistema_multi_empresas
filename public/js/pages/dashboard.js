// pages/dashboard.js
async function carregarDashboard() {
    ativarBotao('dashboard');
    
    if (usuario.role === 'superadmin') {
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const stats = (await res.json()).data || {};
        
        let html = `
            <h2>🏢 Dashboard Super Admin</h2>
            <div class="card-grid">
                <div class="stat-card"><div class="stat-value">${stats.empresas || 0}</div><div>Empresas</div></div>
                <div class="stat-card"><div class="stat-value">${stats.donos || 0}</div><div>Donos</div></div>
                <div class="stat-card"><div class="stat-value">${stats.clientes || 0}</div><div>Clientes</div></div>
                <div class="stat-card"><div class="stat-value">${stats.agendamentos || 0}</div><div>Agendamentos</div></div>
            </div>
        `;
        document.getElementById('content').innerHTML = html;
    } else {
        const [agRes, cliRes] = await Promise.all([
            fetch('/api/agendamentos', { headers: { 'Authorization': 'Bearer ' + token } }),
            fetch('/api/clientes', { headers: { 'Authorization': 'Bearer ' + token } })
        ]);
        const agendamentos = (await agRes.json()).data || [];
        const clientes = (await cliRes.json()).data || [];
        const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
        
        let html = `
            <h2>📊 Dashboard</h2>
            <div class="card-grid">
                <div class="stat-card"><div class="stat-value">${clientes.length}</div><div>Clientes</div></div>
                <div class="stat-card"><div class="stat-value">${agendamentos.length}</div><div>Agendamentos</div></div>
                <div class="stat-card"><div class="stat-value">${pendentes}</div><div>Pendentes</div></div>
            </div>
        `;
        document.getElementById('content').innerHTML = html;
    }
}

window.carregarDashboard = carregarDashboard;
