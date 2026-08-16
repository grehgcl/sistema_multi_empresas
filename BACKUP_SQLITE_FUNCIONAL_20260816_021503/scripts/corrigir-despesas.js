const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGINDO DESPESAS NO SERVER.JS...');

const serverPath = path.join(__dirname, '../server.js');
let content = fs.readFileSync(serverPath, 'utf8');

console.log('📝 Aplicando correções...');

// 1. Adicionar logs na rota de despesas
const search1 = `db.all(sql, params, (err, despesas) => {
    if (err) {`;
const replace1 = `db.all(sql, params, (err, despesas) => {
    console.log('📊 Buscando despesas com SQL:', sql);
    console.log('📊 Params:', params);
    if (err) {`;
content = content.replace(search1, replace1);

// 2. Corrigir totalPago
const search2 = `const totalPago = despesas.filter(d => d.pago).reduce`;
const replace2 = `const totalPago = despesas.filter(d => d.pago === true || d.pago === 1).reduce`;
content = content.replace(search2, replace2);

// 3. Corrigir totalPendente
const search3 = `const totalPendente = despesas.filter(d => !d.pago).reduce`;
const replace3 = `const totalPendente = despesas.filter(d => d.pago === false || d.pago === 0).reduce`;
content = content.replace(search3, replace3);

// 4. Adicionar conversão de pago no retorno
const search4 = `res.json({
            success: true,
            data: {
                despesas: despesas,`;
const replace4 = `const despesasFormatadas = despesas.map(d => ({
            ...d,
            pago: d.pago === true || d.pago === 1 ? 1 : 0
        }));
        res.json({
            success: true,
            data: {
                despesas: despesasFormatadas,`;
content = content.replace(search4, replace4);

// 5. Corrigir filtro de pago para PostgreSQL
content = content.replace(
    /const pagoBool = pago === 'true' \? 1 : 0;/g,
    `const pagoBool = pago === 'true';`
);

fs.writeFileSync(serverPath, content);
console.log('✅ Correções aplicadas com sucesso!');
console.log('📝 Faça commit e push.');