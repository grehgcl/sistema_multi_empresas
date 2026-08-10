// ============================================
// MERCADO PAGO SERVICE
// ============================================

// Carregar variÃ¡veis de ambiente ANTES de tudo
require('dotenv').config({ path: '.env.local' });

const axios = require('axios');

class MercadoPagoService {
    constructor() {
        // ForÃ§ar leitura do .env.local
        require('dotenv').config({ path: '.env.local' });

        this.token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        this.mode = process.env.PAYMENT_MODE || 'sandbox';
        this.url = 'https://api.mercadopago.com';
        console.log('ðŸ”‘ Modo FORÃ‡ADO:', this.mode);
        console.log('ðŸ”‘ Token configurado:', this.token ? 'âœ… Sim' : 'âŒ NÃ£o');
    }

    // ðŸ”¥ GERAR CHAVE IDEMPOTENTE ÃšNICA
    gerarIdempotencyKey() {
        return `idemp-${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;
    }

    // ðŸ”¥ EMAIL DE TESTE VÃLIDO DO MERCADO PAGO
    getEmailTeste() {
        return 'cliente@teste.com';
    }

    // CRIAR PREFERÃŠNCIA DE PAGAMENTO (CHECKOUT PRO)
    async criarPreferencia(preferenceData) {
        try {
            if (!this.token) {
                return {
                    success: false,
                    message: 'Token do Mercado Pago nÃ£o configurado. Configure MERCADOPAGO_ACCESS_TOKEN no .env.local'
                };
            }

            if (preferenceData.payer && preferenceData.payer.email) {
                const email = preferenceData.payer.email;
                if (email.includes('@seeagende.com') || email.includes('@testuser.com')) {
                    preferenceData.payer.email = this.getEmailTeste();
                }
            } else {
                preferenceData.payer = {
                    email: this.getEmailTeste()
                };
            }

            console.log('ðŸ“§ Email do payer:', preferenceData.payer.email);

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
            console.error('âŒ Erro ao criar preferencia:', e.response?.data || e.message);
            return {
                success: false,
                message: e.response?.data?.message || 'Erro ao criar preferencia de pagamento'
            };
        }
    }

    // PIX REAL
    async criarPix(empresaId, planoId, planoNome, valor, periodo, emailUsuario) {
        try {
            if (!this.token) {
                return { success: false, message: 'Token do Mercado Pago nÃ£o configurado' };
            }

            const emailPayer = emailUsuario || this.getEmailTeste();

            console.log('ðŸ’³ Criando PIX:', { empresaId, planoId, valor, email: emailPayer });

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

            const res = await axios.post(`${this.url}/v1/payments`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey
                }
            });

            const p = res.data;
            console.log('âœ… PIX criado com sucesso! ID:', p.id);

            return {
                success: true,
                payment_id: p.id.toString(),
                qr_code: p.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: p.point_of_interaction.transaction_data.qr_code_base64,
                status: p.status
            };
        } catch (e) {
            console.error('âŒ Erro ao criar PIX:', e.response?.data || e.message);

            let mensagemErro = 'Erro ao criar PIX';
            if (e.response?.status === 400) {
                mensagemErro = e.response?.data?.message || 'Dados invÃ¡lidos no PIX';
            } else if (e.response?.status === 401) {
                mensagemErro = 'Token do Mercado Pago invÃ¡lido';
            } else if (e.response?.status === 403) {
                mensagemErro = 'Conta nÃ£o autorizada. Verifique as credenciais.';
            }

            return {
                success: false,
                message: mensagemErro,
                error_details: e.response?.data
            };
        }
    }

    // ðŸ”¹ BOLETO REAL - CORRIGIDO (com first_name e last_name)
    async criarBoleto(empresaId, planoId, planoNome, valor, cpf, nome, emailUsuario) {
        try {
            if (!this.token) {
                return { success: false, message: 'Token do Mercado Pago nÃ£o configurado' };
            }

            const emailPayer = emailUsuario || this.getEmailTeste();
            const cpfLimpo = cpf.replace(/\D/g, '');

            // ðŸ”¥ Separar nome em primeiro e Ãºltimo nome
            const nomeCompleto = nome || 'Cliente';
            const nomeParts = nomeCompleto.trim().split(' ');
            const firstName = nomeParts[0] || 'Cliente';
            const lastName = nomeParts.slice(1).join(' ') || 'Teste';

            const payload = {
                transaction_amount: parseFloat(valor),
                description: `Plano ${planoNome}`,
                payment_method_id: 'bolbradesco',
                payer: {
                    email: emailPayer,
                    first_name: firstName,   // â† OBRIGATÃ“RIO
                    last_name: lastName,     // â† OBRIGATÃ“RIO
                    identification: {
                        type: 'CPF',
                        number: cpfLimpo
                    },
                    address: {
                        zip_code: '01310100',
                        street_name: 'Rua Teste',
                        street_number: 123,
                        neighborhood: 'Centro',
                        city: 'SÃ£o Paulo',
                        federal_unit: 'SP'
                    }
                },
                external_reference: `emp_${empresaId}_${Date.now()}`,
                date_of_expiration: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            };

            console.log('ðŸ“¤ Payload do boleto:', JSON.stringify(payload, null, 2));

            const response = await axios.post(`${this.url}/v1/payments`, payload, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': this.gerarIdempotencyKey()
                }
            });

            const p = response.data;
            console.log('âœ… Boleto criado! ID:', p.id);

            return {
                success: true,
                payment_id: p.id.toString(),
                boleto_url: p.transaction_details?.external_resource_url ||
                    p.point_of_interaction?.transaction_data?.ticket_url,
                status: p.status
            };
        } catch (e) {
            console.error('âŒ Erro ao criar boleto:', e.response?.data || e.message);
            return {
                success: false,
                message: e.response?.data?.message || 'Erro ao criar boleto'
            };
        }
    }
    // CARTÃƒO REAL
    async criarCartao(empresaId, planoId, planoNome, valor, tokenCartao, emailUsuario) {
        try {
            if (!this.token) {
                return { success: false, message: 'Token do Mercado Pago nÃ£o configurado' };
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
            console.error('âŒ Erro ao criar cartÃ£o:', e.response?.data || e.message);
            return { success: false, message: e.response?.data?.message || 'Erro no cartÃ£o' };
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