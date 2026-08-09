-- Corrigir todos os pendentes que têm forma_pagamento
UPDATE agendamentos 
SET status = 'concluido' 
WHERE forma_pagamento IS NOT NULL 
  AND forma_pagamento != '' 
  AND status = 'pendente';

-- Ver resultado
SELECT COUNT(*) as corrigidos FROM agendamentos WHERE status = 'concluido';
