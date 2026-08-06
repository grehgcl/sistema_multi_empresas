const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO SERVER.JS PARA CONVERTER VALORES...');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Correção 1: Rota de agendamentos
const regexAgendamentos = /app\.get\('\/api\/agendamentos', auth, \(req, res\) => \{\s*const empresa_id = req\.usuario\.empresa_id;\s*if \(!empresa_id\) return res\.json\(\{ success: true, data: \[\] \}\);\s*const sql = isProduction\s*\? `SELECT a\.\*, to_char\(a\.data, 'YYYY-MM-DD'\) as data_formatada, c\.nome as cliente_nome, p\.nome as profissional_nome, s\.nome as servico_nome FROM agendamentos a LEFT JOIN clientes c ON a\.cliente_id = c\.id LEFT JOIN profissionais p ON a\.profissional_id = p\.id LEFT JOIN servicos s ON a\.servico_id = s\.id WHERE a\.empresa_id = \$1 AND \(a\.status IN \('agendado', 'pendente', 'concluido'\) OR a\.status IS NULL OR a\.status = ''\) ORDER BY a\.data DESC, a\.hora ASC`\s*: `SELECT a\.\*, date\(a\.data\) as data_formatada, c\.nome as cliente_nome, p\.nome as profissional_nome, s\.nome as servico_nome FROM agendamentos a LEFT JOIN clientes c ON a\.cliente_id = c\.id LEFT JOIN profissionais p ON a\.profissional_id = p\.id LEFT JOIN servicos s ON a\.servico_id = s\.id WHERE a\.empresa_id = \? AND \(a\.status IN \('agendado', 'pendente', 'concluido'\) OR a\.status IS NULL OR a\.status = ''\) ORDER BY a\.data DESC, a\.hora ASC`;\s*db\.all\(sql, \[empresa_id\], \(err, agendamentos\) => \{\s*if \(err\) \{\s*console\.error\('❌ Erro ao buscar agendamentos:', err\.message\);\s*return res\.json\(\{ success: false, message: err\.message \}\);\s*\}\s*const dadosFormatados = agendamentos\.map\(a => \(\{\s*\.\.\.a,\s*data: a\.data_formatada \|\| a\.data,\s*data_formatada: undefined\s*\}\)\);\s*res\.json\(\{ success: true, data: dadosFormatados \}\);\s*\}\);\s*\}\)/s;

if (regexAgendamentos.test(content)) {
    content = content.replace(regexAgendamentos, `app.get('/api/agendamentos', auth, (req, res) => {
    const empresa_id = req.usuario.empresa_id;
    if (!empresa_id) return res.json({ success: true, data: [] });

    const sql = isProduction
        ? \`SELECT a.*, 
           to_char(a.data, 'YYYY-MM-DD') as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = $1 
           AND (a.status IN ('agendado', 'pendente', 'concluido') OR a.status IS NULL OR a.status = '')
           ORDER BY a.data DESC, a.hora ASC\`
        : \`SELECT a.*, 
           date(a.data) as data_formatada,
           c.nome as cliente_nome, 
           p.nome as profissional_nome, 
           s.nome as servico_nome
           FROM agendamentos a
           LEFT JOIN clientes c ON a.cliente_id = c.id
           LEFT JOIN profissionais p ON a.profissional_id = p.id
           LEFT JOIN servicos s ON a.servico_id = s.id
           WHERE a.empresa_id = ? 
           AND (a.status IN ('agendado', 'pendente', 'concluido') OR a.status IS NULL OR a.status = '')
           ORDER BY a.data DESC, a.hora ASC\`;

    db.all(sql, [empresa_id], (err, agendamentos) => {
        if (err) {
            console.error('❌ Erro ao buscar agendamentos:', err.message);
            return res.json({ success: false, message: err.message });
        }

        const dadosFormatados = agendamentos.map(a => ({
            ...a,
            data: a.data_formatada || a.data,
            data_formatada: undefined,
            valor: parseFloat(a.valor) || 0,
            comissao: parseFloat(a.comissao) || 0
        }));

        res.json({ success: true, data: dadosFormatados });
    });
});`);
    console.log('✅ Agendamentos corrigido');
}

// Correção 2: Rota de serviços ativos
// ... continua

fs.writeFileSync(serverPath, content);
console.log('✅ Correções aplicadas!');
console.log('📝 Faça commit e push');