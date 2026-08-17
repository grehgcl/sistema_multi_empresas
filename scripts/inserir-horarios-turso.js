// scripts/inserir-horarios-turso.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { createClient } = require('@libsql/client');

console.log('Inserindo horarios padrao no Turso...');
console.log('');

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error('Turso nao configurado');
    process.exit(1);
}

const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

const horariosPadrao = [
    [0, 0, null, null, null, null],
    [1, 1, '08:00', '18:00', '12:00', '13:00'],
    [2, 1, '08:00', '18:00', '12:00', '13:00'],
    [3, 1, '08:00', '18:00', '12:00', '13:00'],
    [4, 1, '08:00', '18:00', '12:00', '13:00'],
    [5, 1, '08:00', '18:00', '12:00', '13:00'],
    [6, 1, '08:00', '18:00', '12:00', '13:00']
];

async function inserirHorarios() {
    try {
        const result = await client.execute('SELECT id FROM empresas');
        const empresas = result.rows || [];
        
        console.log('Empresas encontradas:', empresas.length);
        
        for (const empresa of empresas) {
            const empresaId = empresa.id;
            console.log('Inserindo horarios para empresa:', empresaId);
            
            for (const h of horariosPadrao) {
                const sql = 'INSERT OR REPLACE INTO horarios_funcionamento (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim) VALUES (?, ?, ?, ?, ?, ?, ?)';
                
                await client.execute({
                    sql: sql,
                    args: [empresaId, h[0], h[1], h[2], h[3], h[4], h[5]]
                });
            }
            console.log('   Horarios inseridos para empresa', empresaId);
        }
        
        console.log('');
        console.log('Horarios inseridos com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('Erro:', error.message);
        process.exit(1);
    }
}

inserirHorarios();
