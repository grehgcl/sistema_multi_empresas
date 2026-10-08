const { getEmpresaDb } = require('./server/config/database');
const db = getEmpresaDb(14);

const agora = new Date();
console.log('Agora:', agora.toLocaleString('pt-BR'));
console.log('Hora ISO:', agora.toISOString());

// Janela: 3h30 até 4h30 daqui
const janelaInicio = new Date(agora.getTime() + 3.5 * 60 * 60 * 1000);
const janelaFim    = new Date(agora.getTime() + 4.5 * 60 * 60 * 1000);

console.log('\n📅 Janela normal (4h antes):');
console.log('De:', janelaInicio.toLocaleString('pt-BR'));
console.log('Até:', janelaFim.toLocaleString('pt-BR'));

// Lista todos agendamentos pendentes de hoje e amanhã
db.all(
    `SELECT id, data, hora, status, lembrete_enviado, cliente_id 
     FROM agendamentos 
     WHERE status = 'pendente' 
       AND (lembrete_enviado = 0 OR lembrete_enviado IS NULL)
     ORDER BY data, hora`,
    [],
    (e, r) => {
        if (e) return console.error(e);
        console.log('\n📋 Agendamentos pendentes (não enviados):');
        console.table(r);

        // Simula a query da janela normal
        const dataInicio = janelaInicio.toISOString().split('T')[0];
        const horaInicio = janelaInicio.toTimeString().slice(0, 5);
        const dataFim = janelaFim.toISOString().split('T')[0];
        const horaFim = janelaFim.toTimeString().slice(0, 5);

        console.log('\n🔍 Buscando com janela:', dataInicio, horaInicio, '→', dataFim, horaFim);

        db.all(`
            SELECT id, data, hora 
            FROM agendamentos 
            WHERE status = 'pendente'
              AND (lembrete_enviado = 0 OR lembrete_enviado IS NULL)
              AND (
                    (data = ? AND hora >= ? AND hora <= ?)
                 OR (data = ? AND hora >= ? AND hora <= ?)
              )
        `, [dataInicio, horaInicio, '23:59', dataFim, '00:00', horaFim], (e2, r2) => {
            if (e2) return console.error(e2);
            console.log('\n✅ Agendamentos que a janela normal pega:');
            console.table(r2);
        });
    }
);