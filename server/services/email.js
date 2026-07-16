// server/services/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

console.log('📧 Serviço de email carregado!');

// ============================================
// EMAIL DE BOAS-VINDAS COMPLETO
// ============================================
async function enviarBoasVindas(email, nome, empresaNome) {
    try {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao See&Agende</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: #f0f2f5; 
            margin: 0; 
            padding: 20px; 
            color: #1a1a2e;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 16px; 
            padding: 0; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 30px 30px 20px 30px;
            text-align: center;
        }
        .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700;
        }
        .header p { 
            margin: 8px 0 0 0; 
            opacity: 0.9; 
            font-size: 16px;
        }
        .content { 
            padding: 30px; 
        }
        .content h2 {
            color: #1a1a2e;
            font-size: 22px;
            margin: 0 0 8px 0;
        }
        .content .subtitle {
            color: #666;
            font-size: 14px;
            margin: 0 0 24px 0;
        }
        .dica {
            background: #f8f9ff;
            border-left: 4px solid #667eea;
            padding: 16px 18px;
            margin: 16px 0;
            border-radius: 8px;
        }
        .dica h4 {
            margin: 0 0 4px 0;
            color: #667eea;
            font-size: 15px;
        }
        .dica .passo {
            color: #555;
            font-size: 13px;
            margin: 4px 0 0 0;
            line-height: 1.6;
        }
        .dica .passo strong {
            color: #333;
        }
        .dica .exemplo {
            background: #eef0f7;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            color: #555;
            margin: 6px 0 0 0;
            font-family: monospace;
        }
        .highlight-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px 18px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .highlight-box h4 {
            margin: 0 0 4px 0;
            color: #92400e;
            font-size: 14px;
        }
        .highlight-box p {
            margin: 4px 0 0 0;
            font-size: 13px;
            color: #78350f;
            line-height: 1.6;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 28px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            margin: 8px 0;
        }
        .btn:hover {
            opacity: 0.9;
        }
        .footer {
            text-align: center;
            padding: 20px 30px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #999;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .emoji-big {
            font-size: 32px;
        }
        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 12px 0;
        }
        @media (max-width: 480px) {
            .grid-2 {
                grid-template-columns: 1fr;
            }
            .header h1 { font-size: 22px; }
            .content { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <div style="font-size: 40px; margin-bottom: 6px;">💎</div>
            <h1>See&Agende</h1>
            <p>Sua agenda inteligente</p>
        </div>
        
        <!-- CONTENT -->
        <div class="content">
            <h2>Olá ${nome}! 👋</h2>
            <p class="subtitle">Seja bem-vindo ao <strong>See&Agende</strong>! Sua empresa <strong>${empresaNome}</strong> foi cadastrada com sucesso.</p>
            
            <p style="font-size: 14px; color: #555;">Para começar a usar o sistema, siga os passos abaixo:</p>
            
            <!-- DICA 1 -->
            <div class="dica">
                <h4>📋 1. Adicione seus serviços</h4>
                <div class="passo">
                    <strong>Como fazer:</strong><br>
                    1. Clique em <strong>"Serviços"</strong> no menu lateral<br>
                    2. Clique em <strong>"Novo Serviço"</strong><br>
                    3. Preencha: <strong>Nome</strong> (ex: Corte de Cabelo), <strong>Valor</strong> (ex: R$ 50,00) e <strong>Duração</strong> (ex: 30 min)<br>
                    4. Clique em <strong>"Salvar"</strong>
                </div>
                <div class="exemplo">💡 Exemplo: Corte de Cabelo - R$ 50,00 - 30 min</div>
            </div>
            
            <!-- DICA 2 -->
            <div class="dica">
                <h4>⏰ 2. Configure seus horários de trabalho</h4>
                <div class="passo">
                    <strong>Como fazer:</strong><br>
                    1. Clique em <strong>"Configurações"</strong> no menu lateral<br>
                    2. Vá na aba <strong>"Horários"</strong><br>
                    3. Para cada dia da semana, ative/desative e ajuste:<br>
                    &nbsp;&nbsp;• <strong>Horário de início</strong> (ex: 09:00)<br>
                    &nbsp;&nbsp;• <strong>Horário de fim</strong> (ex: 18:00)<br>
                    &nbsp;&nbsp;• <strong>Horário de almoço</strong> (ex: 12:00 às 13:00)<br>
                    4. As alterações são salvas <strong>automaticamente</strong>
                </div>
            </div>
            
            <!-- DICA 3 -->
            <div class="dica">
                <h4>🤖 3. Ative seu Chatbot</h4>
                <div class="passo">
                    <strong>Como fazer:</strong><br>
                    1. Clique em <strong>"Configurações"</strong> no menu lateral<br>
                    2. Vá na aba <strong>"Chatbot"</strong><br>
                    3. Copie o link gerado para o seu estabelecimento<br>
                    4. Envie o link para seus clientes via <strong>WhatsApp, Instagram ou redes sociais</strong><br>
                    5. Seus clientes vão poder agendar <strong>24h por dia</strong> automaticamente!
                </div>
                <div class="exemplo">📱 Link do Chatbot: https://seusite.com/chatbot?empresa=123</div>
            </div>
            
            <!-- DICA 4 -->
            <div class="dica">
                <h4>👤 4. Cadastre seus clientes</h4>
                <div class="passo">
                    <strong>Como fazer:</strong><br>
                    1. Clique em <strong>"Clientes"</strong> no menu lateral<br>
                    2. Clique em <strong>"Novo Cliente"</strong><br>
                    3. Preencha: <strong>Nome</strong>, <strong>Telefone</strong> (importante!) e <strong>Email</strong><br>
                    4. Clique em <strong>"Salvar"</strong>
                </div>
                <div class="exemplo">💡 Dica: Ao enviar o link do chatbot, seus clientes podem se cadastrar sozinhos!</div>
            </div>
            
            <!-- DICA EXTRA -->
            <div class="highlight-box">
                <h4>🌟 Dica especial sobre o Chatbot</h4>
                <p>
                    Ao enviar o link do chatbot para seus clientes, eles farão o <strong>primeiro agendamento</strong> se cadastrando como <strong>"não sou cliente"</strong>.
                    No <strong>segundo agendamento</strong>, eles já podem selecionar <strong>"já sou cliente"</strong> e o sistema vai reconhecê-los automaticamente! 📱
                </p>
            </div>
            
            <!-- BOTÃO -->
            <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${process.env.BASE_URL}" class="btn">🚀 Acessar o Sistema</a>
            </div>
            
            <div style="background: #f0f4ff; padding: 16px; border-radius: 10px; text-align: center; margin-top: 16px;">
                <p style="margin: 0; font-size: 13px; color: #555;">
                    📅 Você tem <strong>45 dias de teste grátis</strong>! Aproveite para explorar todas as funcionalidades.
                </p>
            </div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
            <p style="margin: 0 0 4px 0;">
                <strong>See&Agende</strong> - Sua agenda inteligente
            </p>
            <p style="margin: 0;">
                © 2026 See&Agende. Todos os direitos reservados.<br>
                Dúvidas? Responda este email ou entre em contato pelo suporte.
            </p>
        </div>
    </div>
</body>
</html>
        `;

        await transporter.sendMail({
            from: `"See&Agende" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎉 Bem-vindo ao See&Agende - Sua agenda inteligente!',
            html: html
        });

        console.log(`✅ Email de boas-vindas enviado para ${email}`);
        return { success: true };

    } catch (error) {
        console.error('❌ Erro ao enviar email de boas-vindas:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// EMAIL DE BOLETO
// ============================================
async function enviarBoleto(email, nome, planoNome, valor, boletoUrl) {
    try {
        const html = `
            <h2>📄 Seu boleto foi gerado!</h2>
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Seu boleto para o plano <strong>${planoNome}</strong> foi gerado.</p>
            <p><strong>💰 Valor:</strong> R$ ${valor.toFixed(2)}</p>
            <p><a href="${boletoUrl}" style="background: #667eea; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">📄 Visualizar Boleto</a></p>
        `;

        await transporter.sendMail({
            from: `"See&Agende" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `📄 Boleto gerado - Plano ${planoNome}`,
            html: html
        });

        console.log(`✅ Email de boleto enviado para ${email}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao enviar email de boleto:', error.message);
        return { success: false };
    }
}

// ============================================
// EMAIL DE PIX
// ============================================
async function enviarPix(email, nome, planoNome, valor, qrCode, qrCodeBase64) {
    try {
        const html = `
            <h2>📱 Seu PIX foi gerado!</h2>
            <p>Olá <strong>${nome}</strong>,</p>
            <p>Seu PIX para o plano <strong>${planoNome}</strong> foi gerado.</p>
            <p><strong>💰 Valor:</strong> R$ ${valor.toFixed(2)}</p>
            ${qrCodeBase64 ? `<img src="data:image/png;base64,${qrCodeBase64}" style="width: 200px; height: 200px; border-radius: 12px; margin: 10px 0;">` : ''}
            <p><strong>📋 Código PIX:</strong></p>
            <p style="background: #f3f4f6; padding: 10px; border-radius: 8px; font-family: monospace; word-break: break-all;">${qrCode}</p>
        `;

        await transporter.sendMail({
            from: `"See&Agende" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `📱 PIX gerado - Plano ${planoNome}`,
            html: html
        });

        console.log(`✅ Email de PIX enviado para ${email}`);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao enviar email de PIX:', error.message);
        return { success: false };
    }
}

module.exports = {
    enviarBoasVindas,
    enviarBoleto,
    enviarPix
};