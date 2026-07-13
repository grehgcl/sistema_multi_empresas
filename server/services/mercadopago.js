const axios = require('axios');

// Carregar variáveis de ambiente do .env.local
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

class MercadoPagoService {
    constructor() {
        this.token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        console.log('🔑 Token do Mercado Pago:', this.token ? '✅ Configurado' : '❌ NÃO CONFIGURADO');
        console.log('📌 Token:', this.token ? this.token.substring(0, 20) + '...' : 'N/A');
        this.url = 'https://api.mercadopago.com';
    }
    // ... resto do código
}

module.exports = new MercadoPagoService();
class MercadoPagoService {
    constructor() {
        this.token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        this.url = 'https://api.mercadopago.com';
    }

    // 🔥 GERAR CHAVE IDEMPOTENTE ÚNICA
    gerarIdempotencyKey() {
        return `idemp-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
    }

    // 🔥 EMAIL DE TESTE VÁLIDO DO MERCADO PAGO
    getEmailTeste() {
        // Usar email genérico válido
        return 'cliente@teste.com';
    }

    // CRIAR PREFERÊNCIA DE PAGAMENTO (CHECKOUT PRO)
    async criarPreferencia(preferenceData) {
        try {
            if (!this.token) {
                return {
                    success: false,
                    message: 'Token do Mercado Pago não configurado. Configure MERCADOPAGO_ACCESS_TOKEN no .env.local'
                };
            }

            // 🔥 CORREÇÃO: Usar email válido do usuário ou email genérico
            if (preferenceData.payer && preferenceData.payer.email) {
                const email = preferenceData.payer.email;
                // Se for email fictício, usar email genérico válido
                if (email.includes('@seeagende.com') || email.includes('@testuser.com')) {
                    preferenceData.payer.email = this.getEmailTeste();
                }
            } else {
                preferenceData.payer = {
                    email: this.getEmailTeste()
                };
            }

            console.log('📧 Email do payer:', preferenceData.payer.email);

            const res = await axios.post(`${this.url}/checkout/preferences`, preferenceData, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': this.gerarIdempotencyKey()
                }
            });

            const preference = res.data;

            return {
                success: true,
                preference_id: preference.id.toString(),
                init_point: preference.init_point,
                sandbox_init_point: preference.sandbox_init_point,
                external_reference: preference.external_reference
            };
        } catch (e) {
            console.error('❌ Erro ao criar preferencia:', e.response?.data || e.message);
            return {
                success: false,
                message: e.response?.data?.message || 'Erro ao criar preferencia de pagamento'
            };
        }
    }

    // PIX REAL - 🔥 CORRIGIDO
    async criarPix(empresaId, planoId, planoNome, valor, periodo, emailUsuario) {
        try {
            if (!this.token) {
                return { success: false, message: 'Token do Mercado Pago não configurado' };
            }

            // 🔥 USAR EMAIL DO USUÁRIO LOGADO OU EMAIL GENÉRICO
            const emailPayer = emailUsuario || this.getEmailTeste();

            console.log('💳 Criando PIX:', { empresaId, planoId, valor, email: emailPayer });

            const payload = {
                transaction_amount: parseFloat(valor),
                description: `Plano ${planoNome}`,
                payment_method_id: 'pix',
                payer: {
                    email: emailPayer,
                    first_name: 'Cliente',
                    last_name: 'Teste'
                },
                external_reference: `emp_${empresaId}_${Date.now()}`
            };

            const idempotencyKey = this.gerarIdempotencyKey();
            console.log('🔑 Idempotency Key:', idempotencyKey);

            const res = await axios.post(`${this.url}/v1/payments`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey
                }
            });

            const p = res.data;
            console.log('✅ PIX criado com sucesso! ID:', p.id);

            return {
                success: true,
                payment_id: p.id.toString(),
                qr_code: p.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: p.point_of_interaction.transaction_data.qr_code_base64,
                status: p.status
            };
        } catch (e) {
            console.error('❌ Erro ao criar PIX:', e.response?.data || e.message);

            let mensagemErro = 'Erro ao criar PIX';
            if (e.response?.status === 400) {
                mensagemErro = e.response?.data?.message || 'Dados inválidos no PIX';
            } else if (e.response?.status === 401) {
                mensagemErro = 'Token do Mercado Pago inválido';
            } else if (e.response?.status === 403) {
                mensagemErro = 'Conta não autorizada. Verifique as credenciais.';
            }

            return {
                success: false,
                message: mensagemErro,
                error_details: e.response?.data
            };
        }
    }

    // BOLETO REAL - 🔥 CORRIGIDO
    async criarBoleto(empresaId, planoId, planoNome, valor, cpf, nome, emailUsuario) {
        try {
            if (!this.token) {
                return { success: false, message: 'Token do Mercado Pago não configurado' };
            }

            const emailPayer = emailUsuario || this.getEmailTeste();

            const payload = {
                transaction_amount: parseFloat(valor),
                description: `Plano ${planoNome}`,
                payment_method_id: 'bolbradesco',
                payer: {
                    name: nome || 'Cliente Teste',
                    email: emailPayer,
                    identification: { type: 'CPF', number: cpf.replace(/\D/g, '') },
                    address: {
                        zip_code: '01310100',
                        street_name: 'Rua Teste',
                        street_number: 123
                    }
                },
                external_reference: `emp_${empresaId}_${Date.now()}`,
                date_of_expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            };

            const idempotencyKey = this.gerarIdempotencyKey();

            const res = await axios.post(`${this.url}/v1/payments`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey
                }
            });

            const p = res.data;
            return {
                success: true,
                payment_id: p.id.toString(),
                boleto_url: p.transaction_details?.external_resource_url || p.point_of_interaction?.transaction_data?.ticket_url,
                status: p.status
            };
        } catch (e) {
            console.error('❌ Erro ao criar boleto:', e.response?.data || e.message);
            return { success: false, message: e.response?.data?.message || 'Erro no boleto' };
        }
    }

    // CARTÃO REAL - 🔥 CORRIGIDO
    async criarCartao(empresaId, planoId, planoNome, valor, tokenCartao, emailUsuario) {
        try {
            if (!this.token) {
                return { success: false, message: 'Token do Mercado Pago não configurado' };
            }

            const emailPayer = emailUsuario || this.getEmailTeste();

            const payload = {
                transaction_amount: parseFloat(valor),
                description: `Plano ${planoNome}`,
                payment_method_id: 'credit_card',
                token: tokenCartao,
                installments: 1,
                payer: { email: emailPayer },
                external_reference: `emp_${empresaId}_${Date.now()}`
            };

            const idempotencyKey = this.gerarIdempotencyKey();

            const res = await axios.post(`${this.url}/v1/payments`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey
                }
            });

            const p = res.data;
            return {
                success: true,
                payment_id: p.id.toString(),
                status: p.status
            };
        } catch (e) {
            console.error('❌ Erro ao criar cartão:', e.response?.data || e.message);
            return { success: false, message: e.response?.data?.message || 'Erro no cartão' };
        }
    }

    // CONSULTAR PAGAMENTO
    async consultarPagamento(paymentId) {
        try {
            const res = await axios.get(`${this.url}/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            return {
                success: true,
                status: res.data.status,
                external_reference: res.data.external_reference
            };
        } catch (e) {
            return { success: false };
        }
    }
}

module.exports = new MercadoPagoService();