// server/routes/index.js
const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./auth.routes');
const empresasRoutes = require('./empresas.routes');
const servicosRoutes = require('./servicos.routes');
const horariosRoutes = require('./horarios.routes');
const profissionaisRoutes = require('./profissionais.routes');
const clientesRoutes = require('./clientes.routes'); // ✅ DEVE EXISTIR
const despesasRoutes = require('./despesas.routes');
const agendamentosRoutes = require('./agendamentos.routes');
const financeiroRoutes = require('./financeiro.routes');
const adminRoutes = require('./admin.routes');
const whatsappRoutes = require('./whatsapp.routes');
const chatbotRoutes = require('./chatbot.routes');
const pagamentoRoutes = require('./pagamento.routes');
const planosRoutes = require('./planos.routes');

// ✅ Montar rotas
router.use('/auth', authRoutes);
router.use('/empresa', empresasRoutes);
router.use('/servicos', servicosRoutes);
router.use('/horarios', horariosRoutes);
router.use('/profissionais', profissionaisRoutes);
router.use('/clientes', clientesRoutes); // ✅ /api/clientes
router.use('/despesas', despesasRoutes);
router.use('/agendamentos', agendamentosRoutes);
router.use('/financeiro', financeiroRoutes);
router.use('/admin', adminRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/pagamento', pagamentoRoutes);
router.use('/planos', planosRoutes);

module.exports = router;