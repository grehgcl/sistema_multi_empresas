// resetar-senha.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const email = process.argv[2];
const novaSenha = process.argv[3] || 'senha123';

if (!email) {
    console.error('Uso: node resetar-senha.js email@x.com [novaSenha]');
    process.exit(1);
}

const hash = bcrypt.hashSync(novaSenha, 10);
const pastaDb = path.join(__dirname, 'database');
const arquivos = fs.readdirSync(pastaDb).filter(f => f.endsWith('.db'));

let contador = 0;
let pendentes = arquivos.length;

for (const arq of arquivos) {
    const db = new sqlite3.Database(path.join(pastaDb, arq));
    db.run(
        `UPDATE profissionais SET senha = ?, ativo = 1 WHERE email = ?`,
        [hash, email],
        function (err) {
            if (err) console.error(`❌ Erro em ${arq}:`, err.message);
            else if (this.changes > 0) {
                console.log(`✅ Senha resetada em ${arq} (${this.changes} linha(s))`);
                contador += this.changes;
            }
            db.close();
            pendentes--;
            if (pendentes === 0) {
                console.log(`\n🎉 Total: ${contador} registro(s) atualizado(s)`);
                console.log(`📧 Email: ${email}`);
                console.log(`🔑 Nova senha: ${novaSenha}`);
            }
        }
    );
}