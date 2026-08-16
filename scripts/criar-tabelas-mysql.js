// scripts/criar-tabelas-mysql.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Verificar se o .env foi carregado
console.log('DB_TYPE:', process.env.DB_TYPE);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('RENDER:', process.env.RENDER);

const { db } = require('../server/config/database');

async function criarTabelas() {
    console.log('Criando tabelas no MariaDB...');

    // 1. EMPRESAS
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS empresas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                plano VARCHAR(50) DEFAULT 'trial',
                limite_profissionais INT DEFAULT 1,
                trial_expira DATETIME,
                assinatura_ativa BOOLEAN DEFAULT TRUE,
                assinatura_valida_ate DATETIME,
                agendamentos_mes INT DEFAULT 0,
                mes_referencia VARCHAR(7),
                dias_bloqueio_geral TEXT,
                telefone_dono VARCHAR(20),
                endereco TEXT,
                whatsapp_instance VARCHAR(100),
                whatsapp_connected BOOLEAN DEFAULT FALSE,
                whatsapp_number VARCHAR(20),
                whatsapp_connected_at DATETIME,
                whatsapp_proprio_habilitado BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela empresas');
    } catch (err) {
        console.log('❌ Erro empresas:', err.message);
    }

    // 2. USUARIOS
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'dono',
                empresa_id INT,
                telefone VARCHAR(20),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela usuarios');
    } catch (err) {
        console.log('❌ Erro usuarios:', err.message);
    }

    // 3. CLIENTES
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS clientes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                telefone VARCHAR(20),
                email VARCHAR(255),
                empresa_id INT NOT NULL,
                bloqueado_chatbot BOOLEAN DEFAULT FALSE,
                dias_bloqueio TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela clientes');
    } catch (err) {
        console.log('❌ Erro clientes:', err.message);
    }

    // 4. SERVICOS
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS servicos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                valor DECIMAL(10,2),
                duracao INT DEFAULT 30,
                ativo BOOLEAN DEFAULT TRUE,
                empresa_id INT NOT NULL,
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela servicos');
    } catch (err) {
        console.log('❌ Erro servicos:', err.message);
    }

    // 5. PROFISSIONAIS
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS profissionais (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                senha VARCHAR(255),
                comissao_percent INT DEFAULT 0,
                empresa_id INT NOT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                telefone VARCHAR(20),
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela profissionais');
    } catch (err) {
        console.log('❌ Erro profissionais:', err.message);
    }

    // 6. AGENDAMENTOS
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS agendamentos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                cliente_id INT,
                data DATE NOT NULL,
                hora VARCHAR(10) NOT NULL,
                servico_id INT,
                servico VARCHAR(255),
                valor DECIMAL(10,2),
                duracao INT DEFAULT 30,
                status VARCHAR(50) DEFAULT 'pendente',
                comissao DECIMAL(10,2),
                empresa_id INT NOT NULL,
                profissional_id INT,
                lembrete_enviado BOOLEAN DEFAULT FALSE,
                valor_total DECIMAL(10,2),
                servicos_extras TEXT,
                valor_extras DECIMAL(10,2),
                forma_pagamento VARCHAR(50),
                prazo_dias INT,
                data_vencimento DATE,
                descricao_pagamento TEXT,
                FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
                FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL,
                FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL,
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela agendamentos');
    } catch (err) {
        console.log('❌ Erro agendamentos:', err.message);
    }

    // 7. DESPESAS
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS despesas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                empresa_id INT NOT NULL,
                descricao VARCHAR(255) NOT NULL,
                categoria VARCHAR(100),
                valor DECIMAL(10,2) NOT NULL,
                data DATE NOT NULL,
                data_vencimento DATE,
                pago BOOLEAN DEFAULT FALSE,
                forma_pagamento VARCHAR(50),
                observacao TEXT,
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela despesas');
    } catch (err) {
        console.log('❌ Erro despesas:', err.message);
    }

    // 8. HORARIOS_FUNCIONAMENTO
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS horarios_funcionamento (
                id INT PRIMARY KEY AUTO_INCREMENT,
                empresa_id INT NOT NULL,
                dia_semana INT NOT NULL,
                aberto BOOLEAN DEFAULT TRUE,
                hora_inicio VARCHAR(10),
                hora_fim VARCHAR(10),
                almoco_inicio VARCHAR(10),
                almoco_fim VARCHAR(10),
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela horarios_funcionamento');
    } catch (err) {
        console.log('❌ Erro horarios_funcionamento:', err.message);
    }

    // 9. CONFIGURACOES
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                chave VARCHAR(100) UNIQUE NOT NULL,
                valor TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabela configuracoes');
    } catch (err) {
        console.log('❌ Erro configuracoes:', err.message);
    }

    // 10. ACESSOS
    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS acessos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                empresa_id INT,
                usuario_id INT,
                data_acesso DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip VARCHAR(50),
                user_agent TEXT,
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabela acessos');
    } catch (err) {
        console.log('❌ Erro acessos:', err.message);
    }

    console.log('Tabelas criadas com sucesso!');
    process.exit(0);
}

criarTabelas();