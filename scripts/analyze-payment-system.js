// scripts/analyze-payment-system.js
// Análise do sistema de pagamentos atual

const fs = require('fs');
const path = require('path');

console.log('🔍 Analisando sistema de pagamentos...\n');

// 1. Verificar configurações
const env = fs.readFileSync('.env', 'utf8');
const hasMercadoPago = env.includes('MERCADOPAGO_ACCESS_TOKEN');
const hasStripe = env.includes('STRIPE_SECRET_KEY');

console.log('📊 Configurações:');
console.log(`   ✅ MercadoPago: ${hasMercadoPago ? 'Configurado' : '❌ Não configurado'}`);
console.log(`   ✅ Stripe: ${hasStripe ? 'Configurado' : '❌ Não configurado'}`);

// 2. Verificar rotas de pagamento
const pagamentoRoutes = fs.readFileSync('server/routes/pagamento.routes.js', 'utf8');
const planosRoutes = fs.readFileSync('server/routes/planos.routes.js', 'utf8');

console.log('\n📋 Rotas de Pagamento:');
const endpoints = pagamentoRoutes.match(/router\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g) || [];
endpoints.forEach(e => console.log(`   ${e}`));

console.log('\n📋 Rotas de Planos:');
const planosEndpoints = planosRoutes.match(/router\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g) || [];
planosEndpoints.forEach(e => console.log(`   ${e}`));

console.log('\n✅ Análise concluída!');