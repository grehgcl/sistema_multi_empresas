// server/jobs/email-cron.js
const cron = require('node-cron');
const emailService = require('../services/email');

// ============================================
// ENVIAR DICAS (7 DIAS APÓS CADASTRO)
// ============================================
async function enviarDicas() {
    console.log('📧 Verificando usuários para enviar dicas...');

    const sql = `
        SELECT u.id, u.email, u.nome, u.created_at 
        FROM usuarios u
        WHERE u.role = 'dono' 
        AND u.dicas_enviadas = false
        AND u.created_at <= datetime('now', '-7 days')
    `;

    // Buscar e enviar
    // ...
}

// ============================================
// VERIFICAR TRIAL EXPIRANDO
// ============================================
async function verificarTrial() {
    console.log('📧 Verificando trials expirando...');

    const sql = `
        SELECT u.email, u.nome, e.trial_expira 
        FROM usuarios u
        JOIN empresas e ON u.empresa_id = e.id
        WHERE u.role = 'dono' 
        AND e.plano = 'trial'
        AND e.trial_expira IS NOT NULL
        AND julianday(e.trial_expira) - julianday('now') BETWEEN 1 AND 3
    `;

    // Buscar e enviar
    // ...
}

// Agendar jobs
function start() {
    // Todos os dias às 10:00
    cron.schedule('0 10 * * *', () => {
        enviarDicas();
        verificarTrial();
    });

    console.log('📧 Job de emails agendado (10:00 todos os dias)');
}

module.exports = { start };