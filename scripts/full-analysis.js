// scripts/full-analysis.js
// Script completo para analisar o sistema SEE&AGENDE
// ULTIMA ATUALIZACAO: 19/08/2026

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando análise completa do SEE&AGENDE...\n');
console.log('📊 Isso pode levar alguns minutos...\n');

// Executar análise do sistema
exec('node scripts/analyze-system.js', (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Erro na análise do sistema: ${error}`);
        return;
    }
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    // Executar análise da lógica de negócio
    exec('node scripts/analyze-business-logic.js', (error2, stdout2, stderr2) => {
        if (error2) {
            console.error(`❌ Erro na análise da lógica de negócio: ${error2}`);
            return;
        }
        console.log(stdout2);
        if (stderr2) console.error(stderr2);
        
        console.log('\n✅ Análise completa finalizada!');
        console.log('📁 Relatórios salvos em: analysis/');
    });
});