// fix-horarios.js - Corrigir horários de donos existentes
const { db } = require('./server/config/database');

console.log('🔧 Corrigindo horários de funcionamento...');

// Buscar todas as empresas
db.all('SELECT id, nome FROM empresas', [], (err, empresas) => {
    if (err) {
        console.error('❌ Erro ao buscar empresas:', err.message);
        process.exit(1);
    }

    console.log(`📝 Encontradas ${empresas.length} empresas`);

    for (const empresa of empresas) {
        // Verificar se já tem horários
        db.get('SELECT COUNT(*) as total FROM horarios_funcionamento WHERE empresa_id = ?', [empresa.id], (err, result) => {
            if (err) {
                console.error(`❌ Erro ao verificar empresa ${empresa.id}:`, err.message);
                return;
            }

            if (result.total === 0) {
                console.log(`📝 Inserindo horários para empresa: ${empresa.nome} (ID: ${empresa.id})`);

                const dias = [0, 1, 2, 3, 4, 5, 6];
                let inseridos = 0;

                for (const dia of dias) {
                    const sql = `INSERT OR IGNORE INTO horarios_funcionamento 
                        (empresa_id, dia_semana, aberto, hora_inicio, hora_fim, almoco_inicio, almoco_fim, intervalo_minutos) 
                        VALUES (?, ?, 1, '09:00', '18:00', '12:00', '13:00', 30)`;

                    db.run(sql, [empresa.id, dia], function (err) {
                        if (err) {
                            console.error(`❌ Erro ao inserir dia ${dia}:`, err.message);
                        } else {
                            inseridos++;
                            if (inseridos === 7) {
                                console.log(`✅ 7 horários inseridos para empresa ${empresa.nome}`);
                            }
                        }
                    });
                }
            } else {
                console.log(`✅ Empresa ${empresa.nome} já tem ${result.total} horários`);
            }
        });
    }

    console.log('✅ Processo concluído!');
    setTimeout(() => process.exit(0), 2000);
});