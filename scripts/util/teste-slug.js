require('dotenv').config();
const w = require('./server/services/whatsapp');

console.log('\n=== TESTE gerarSlug ===');
console.log('"Salão da Sandra"  →', w.gerarSlug('Salão da Sandra'));
console.log('"Barbearia do Zé"  →', w.gerarSlug('Barbearia do Zé'));
console.log('"salao sandrinha2" →', w.gerarSlug('salao sandrinha2'));
console.log('"Lipe barba"       →', w.gerarSlug('Lipe barba'));

console.log('\n=== TESTE montarLinkChatbot ===');
console.log('Empresa 14:', w.montarLinkChatbot({ id: 14, nome: 'Salão da Sandra' }));
console.log('Empresa 6: ', w.montarLinkChatbot({ id: 6, nome: 'Lipe barba' }));
console.log('Sem nome:  ', w.montarLinkChatbot({ id: 99 }));