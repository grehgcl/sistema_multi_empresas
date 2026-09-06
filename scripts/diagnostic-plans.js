// scripts/diagnostic-plans.js
// Diagnóstico completo do sistema de planos e pagamentos

const fs = require('fs');
const path = require('path');
const { db } = require('../server/config/database');

async function diagnosticar() {
    console.log('\n🔍 ============================================');
    console.log('🔍 DIAGNÓSTICO DE PLANOS E PAGAMENTOS');
    console.log('🔍 ============================================\n');

    // 1. VERIFICAR CONFIGURAÇÕES
    console.log('📋 1. CONFIGURAÇÕES DO SISTEMA');
    console.log('-------------------------------------------');
    
    const configs = await new Promise((resolve) => {
        db.all('SELECT * FROM configuracoes', [], (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
    
    console.log('📊 Configurações:');
    configs.forEach(c => {
        console.log(`   ${c.chave} = ${c.valor}`);
    });
    console.log();

    // 2. VERIFICAR EMPRESAS
    console.log('📋 2. EMPRESAS');
    console.log('-------------------------------------------');
    
    const empresas = await new Promise((resolve) => {
        db.all('SELECT id, nome, plano, assinatura_ativa, assinatura_valida_ate, trial_expira FROM empresas', [], (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
    
    console.log(`📊 Total de empresas: ${empresas.length}`);
    empresas.forEach(e => {
        const status = e.assinatura_ativa ? '✅ ATIVO' : '❌ INATIVO';
        const validade = e.assinatura_valida_ate || e.trial_expira || 'N/A';
        console.log(`   ID: ${e.id} | ${e.nome} | Plano: ${e.plano} | ${status} | Válido até: ${validade}`);
    });
    console.log();

    // 3. VERIFICAR PLANOS DISPONÍVEIS
    console.log('📋 3. PLANOS DISPONÍVEIS');
    console.log('-------------------------------------------');
    
    const planos = [
        { id: 'trial', nome: 'Trial (Starter)', limite: 1, valor: 0 },
        { id: 'starter', nome: 'Starter', limite: 1, valor: 29.90 },
        { id: 'pro', nome: 'Pro', limite: 5, valor: 59.90 }
    ];
    
    console.log('📊 Planos configurados:');
    planos.forEach(p => {
        console.log(`   ${p.id}: ${p.nome} | R$ ${p.valor.toFixed(2)} | ${p.limite} profissional(is)`);
    });
    console.log();

    // 4. VERIFICAR TRANSAÇÕES DE PAGAMENTO
    console.log('📋 4. TRANSAÇÕES DE PAGAMENTO');
    console.log('-------------------------------------------');
    
    const transacoes = await new Promise((resolve) => {
        db.all('SELECT * FROM transacoes_pagamento ORDER BY id DESC LIMIT 10', [], (err, rows) => {
            if (err) {
                console.log('⚠️ Tabela transacoes_pagamento não existe ou está vazia');
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
    
    if (transacoes.length > 0) {
        console.log(`📊 Últimas ${transacoes.length} transações:`);
        transacoes.forEach(t => {
            console.log(`   ID: ${t.id} | Plano: ${t.plano_nome} | R$ ${t.valor} | ${t.metodo} | Status: ${t.status} | ${t.created_at}`);
        });
    } else {
        console.log('   ℹ️ Nenhuma transação encontrada');
    }
    console.log();

    // 5. VERIFICAR USUÁRIOS
    console.log('📋 5. USUÁRIOS DO SISTEMA');
    console.log('-------------------------------------------');
    
    const usuarios = await new Promise((resolve) => {
        db.all('SELECT id, nome, email, role, empresa_id FROM usuarios ORDER BY id LIMIT 10', [], (err, rows) => {
            if (err) {
                console.error('❌ Erro:', err);
                resolve([]);
            } else {
                resolve(rows || []);
            }
        });
    });
    
    console.log(`📊 Total de usuários: ${usuarios.length}`);
    usuarios.forEach(u => {
        console.log(`   ID: ${u.id} | ${u.nome} | ${u.email} | Role: ${u.role} | Empresa: ${u.empresa_id || 'N/A'}`);
    });
    console.log();

    // 6. VERIFICAR MODO DE PAGAMENTO
    console.log('📋 6. MODO DE PAGAMENTO');
    console.log('-------------------------------------------');
    
    const modeRow = await new Promise((resolve) => {
        db.get('SELECT valor FROM configuracoes WHERE chave = "payment_mode"', [], (err, row) => {
            if (err) {
                console.error('❌ Erro:', err);
                resolve(null);
            } else {
                resolve(row);
            }
        });
    });
    
    const mode = modeRow?.valor || 'simulation';
    console.log(`📊 Modo atual: ${mode === 'real' ? '🔴 REAL (pagamentos reais)' : '🟡 SIMULAÇÃO (testes)'}`);
    console.log();

    // 7. VERIFICAR VARIÁVEIS DE AMBIENTE
    console.log('📋 7. VARIÁVEIS DE AMBIENTE');
    console.log('-------------------------------------------');
    
    const env = {
        NODE_ENV: process.env.NODE_ENV,
        PAYMENT_MODE: process.env.PAYMENT_MODE,
        MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado',
        MERCADOPAGO_PUBLIC_KEY: process.env.MERCADOPAGO_PUBLIC_KEY ? '✅ Configurado' : '❌ Não configurado',
        BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
        PORT: process.env.PORT || 3000
    };
    
    console.log('📊 Variáveis:');
    Object.entries(env).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    console.log();

    // 8. RESUMO
    console.log('📋 8. RESUMO');
    console.log('-------------------------------------------');
    
    const resumo = {
        totalEmpresas: empresas.length,
        empresasAtivas: empresas.filter(e => e.assinatura_ativa).length,
        totalUsuarios: usuarios.length,
        modoPagamento: mode,
        totalTransacoes: transacoes.length,
        planosDisponiveis: planos.length
    };
    
    console.log('📊 Resumo do sistema:');
    Object.entries(resumo).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
    });
    console.log();

    // 9. SUGESTÕES
    console.log('📋 9. SUGESTÕES');
    console.log('-------------------------------------------');
    
    const sugestoes = [];
    
    if (mode === 'real' && !process.env.MERCADOPAGO_ACCESS_TOKEN) {
        sugestoes.push('⚠️ Modo REAL ativado, mas token do MercadoPago não configurado');
    }
    
    if (empresas.length === 0) {
        sugestoes.push('⚠️ Nenhuma empresa cadastrada');
    }
    
    if (transacoes.length === 0 && mode === 'real') {
        sugestoes.push('ℹ️ Nenhuma transação encontrada (modo real ativo)');
    }
    
    if (sugestoes.length === 0) {
        sugestoes.push('✅ Tudo parece estar funcionando corretamente!');
    }
    
    sugestoes.forEach(s => console.log(`   ${s}`));
    console.log();

    console.log('🔍 ============================================');
    console.log('✅ DIAGNÓSTICO CONCLUÍDO!');
    console.log('🔍 ============================================\n');
}

// Executar
diagnosticar().catch(console.error);