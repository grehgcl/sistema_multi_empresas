// scripts/analisar-backup.js
const fs = require('fs');
const path = require('path');

const backupPath = path.join(__dirname, '../backup_completo.sql');
const content = fs.readFileSync(backupPath, 'utf8');

// Verificar agendamentos da empresa 10 (Studio Sandro)
const agendamentos = content.match(/INSERT INTO agendamentos.*?10,/g);
console.log(`📊 Total de agendamentos do Studio Sandro: ${agendamentos ? agendamentos.length : 0}`);

// Verificar clientes da empresa 10
const clientes = content.match(/INSERT INTO clientes.*?10,/g);
console.log(`👤 Total de clientes do Studio Sandro: ${clientes ? clientes.length : 0}`);

// Verificar empresas
const empresas = content.match(/INSERT INTO empresas.*?Studio Sandro/g);
console.log(`🏢 Empresas encontradas: ${empresas ? empresas.length : 0}`);