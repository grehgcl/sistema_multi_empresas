// adicionar-slug-empresas.js
const { db } = require('./server/config/database');

// Função para criar slug
function criarSlug(nome) {
    if (!nome) return 'empresa';
    return nome
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]+/g, '-') // Substitui espaços e caracteres especiais por -
        .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
}

console.log('🔧 Adicionando coluna slug na tabela empresas...');

// Adicionar coluna slug se não existir
db.run('ALTER TABLE empresas ADD COLUMN slug TEXT', [], (err) => {
    if (err && !err.message.includes('duplicate column name')) {
        console.error('❌ Erro ao adicionar coluna:', err.message);
        process.exit();
        return;
    }
    console.log('✅ Coluna slug verificada/criada');
    
    // Buscar todas as empresas
    db.all('SELECT id, nome FROM empresas', [], (err, empresas) => {
        if (err) {
            console.error('❌ Erro ao buscar empresas:', err);
            process.exit();
            return;
        }
        
        console.log(`📋 ${empresas.length} empresas encontradas`);
        
        if (empresas.length === 0) {
            console.log('✅ Nenhuma empresa para atualizar');
            process.exit();
            return;
        }
        
        let atualizados = 0;
        let total = empresas.length;
        
        for (let emp of empresas) {
            const slug = criarSlug(emp.nome);
            console.log(`📝 ${emp.nome} -> ${slug}`);
            
            db.run('UPDATE empresas SET slug = ? WHERE id = ?', [slug, emp.id], function(err) {
                if (err) {
                    console.error(`❌ Erro ao atualizar empresa ${emp.id}:`, err.message);
                } else {
                    atualizados++;
                    console.log(`✅ ${emp.nome} atualizado (${atualizados}/${total})`);
                }
                
                if (atualizados === total) {
                    console.log(`✅ ${atualizados} empresas atualizadas com sucesso!`);
                    
                    // Verificar o resultado
                    db.all('SELECT id, nome, slug FROM empresas', [], (err, rows) => {
                        if (err) {
                            console.error('❌ Erro ao verificar:', err);
                            process.exit();
                            return;
                        }
                        console.log('\n📋 EMPRESAS COM SLUG:');
                        rows.forEach(r => {
                            console.log(`   ${r.id} - ${r.nome} -> ${r.slug}`);
                        });
                        process.exit();
                    });
                }
            });
        }
    });
});