// ============================================
// 2. ADICIONAR empresaDb NAS ROTAS (SEM DUPLICAR)
// ============================================

// Padrão para encontrar rotas GET/POST/PUT/DELETE
const routePattern = /(router\.(get|post|put|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*auth\s*,\s*\(req,\s*res\)\s*=>\s*\{)/g;

if (content.match(routePattern)) {
    // Verificar se já tem empresaDb
    if (!content.includes('const empresaDb = getEmpresaDb')) {
        // Verificar se já tem empresaId
        if (!content.includes('const empresaId = req.usuario.empresa_id')) {
            // Adicionar ambos
            content = content.replace(
                /(router\.(get|post|put|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*auth\s*,\s*\(req,\s*res\)\s*=>\s*\{)/g,
                '$1\n    const empresaId = req.usuario.empresa_id;\n    const empresaDb = getEmpresaDb(empresaId);'
            );
            modified = true;
            console.log(`✅ ${file}: empresaId e empresaDb adicionados`);
        } else {
            // Só adicionar empresaDb
            content = content.replace(
                /(const\s+empresaId\s*=\s*req\.usuario\.empresa_id;)/g,
                '$1\n    const empresaDb = getEmpresaDb(empresaId);'
            );
            modified = true;
            console.log(`✅ ${file}: empresaDb adicionado (empresaId já existia)`);
        }
    }
}