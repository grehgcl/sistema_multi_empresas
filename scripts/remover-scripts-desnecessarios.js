const fs = require('fs');
const path = require('path');

console.log('🧹 ===== REMOVENDO SCRIPTS DESNECESSÁRIOS =====\n');

// ============================================
// SCRIPTS PARA REMOVER (DESNECESSÁRIOS)
// ============================================
const scriptsParaRemover = [
    // Corrigidos no código principal
    'corrigir-booleanos.js',
    'corrigir-tofixed.js',
    'corrigir-placeholders.js',
    'corrigir-coalesce.js',
    'corrigir-rotas-completo.js',
    'corrigir-rotas-final.js',
    'corrigir-rotas-sqlite.js',
    'corrigir-valores-server.js',
    'corrigir-valores-sqlite.js',
    'corrigir-tudo.js',
    'corrigir-tudo-definitivo.js',
    'corrigir-tudo-frontend.js',
    'corrigir-frontend-final.js',
    'corrigir-final.js',
    'corrigir-manual.js',
    'corrigir-seguro.js',

    // Fixes antigos
    'fix-cliente-null.js',
    'fix-fiado.js',
    'fix-fiado-sqlite.js',
    'fix-lembretes.js',
    'fix-render-db.js',
    'fix.js',

    // Testes específicos
    'test-connection.js',
    'testar-sql.js',

    // Verificações pontuais
    'verificar-agendamentos-ocultos.js',
    'verificar-cliente-9078.js',
    'verificar-colunas-empresas.js',
    'verificar-empresa5.js',
    'verificar-pendentes.js',
    'verificar-sqlite.js',
    'verificar-todos-agendamentos.js',
    'verificar.js',

    // Remoções específicas
    'remover-359-definitivo.js',
    'remover-agendamento-359.js',
    'remover-cliente-9078.js',
    'remover-cliente-digregorio.js',
    'remover-duplicatas-empresaId.js',
    'remover-plano-teste.js',

    // Migrações antigas
    'migrar-para-sqlite-por-empresa.js',
    'migrar-pg-para-sqlite.js',
    'migrar-vip-para-premium.js',
    'migrate-despesas.js',
    'migrate-grupos.js',
    'migrate-localizacao.js',
    'migrate-pagamento-pg.js',
    'migrate-render.js',
    'migrate-whatsapp-habilitado.js',
    'migrate-whatsapp-pg.js',
    'migrate-whatsapp.js',
    'migrate.js',

    // Análises antigas
    'analisar-backup.js',

    // Atualizações antigas
    'atualizar-nomes-clientes.js',
    'atualizar-telefone-donos.js',

    // Criações específicas
    'criar-agendamentos-empresa5.js',
    'criar-empresa.js',
    'criar-sqlite-por-empresa-local.js',
    'criar-todos-clientes-faltantes.js',

    // Outros desnecessários
    'clonar-banco-vps.js',
    'copiar-agendamento.js',
    'exportar-estrutura.js',
    'importar-para-render.js',
    'inserir-horarios.js',
    'investigar-agendamento.js',
    'ix-total.js',
    'limpar-hoje.js',
    'limpar-tudo-agendamentos.js',
    'recriar-banco-render.js',
    'recriar-tabela-agendamentos.js',
    'renomear-bancos-com-nome.js',
    'seed-servicos.js',
    'toggle-plano-teste.js',
    'update-values.js'
];

// ============================================
// REMOVER OS SCRIPTS
// ============================================
let removidos = 0;
let naoEncontrados = 0;

console.log('🗑️ Removendo scripts desnecessários...\n');

for (const script of scriptsParaRemover) {
    const caminho = path.join('scripts', script);
    try {
        if (fs.existsSync(caminho)) {
            fs.unlinkSync(caminho);
            console.log(`✅ Removido: ${script}`);
            removidos++;
        } else {
            console.log(`⚠️ Não encontrado: ${script}`);
            naoEncontrados++;
        }
    } catch (e) {
        console.log(`❌ Erro ao remover ${script}: ${e.message}`);
    }
}

// ============================================
// RELATÓRIO
// ============================================
console.log('\n📊 ===== RELATÓRIO =====');
console.log(`✅ Scripts removidos: ${removidos}`);
console.log(`⚠️ Scripts não encontrados: ${naoEncontrados}`);
console.log('');

// Listar o que sobrou
console.log('📂 Scripts mantidos:');
const sobraram = fs.readdirSync('scripts').filter(f => f.endsWith('.js'));
for (const script of sobraram) {
    console.log(`  📄 ${script}`);
}

console.log('');
console.log(`📊 Total mantido: ${sobraram.length} scripts`);
console.log('');
console.log('🔧 ===== FIM =====');