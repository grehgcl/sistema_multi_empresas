// ============================================
// INTERCEPTOR GLOBAL DE FETCH
// Detecta 403 com bloqueado:true e redireciona pra /bloqueado
// ============================================

(function() {
    'use strict';

    // Evita redirecionar múltiplas vezes
    let redirecionando = false;

    // Salva o fetch original
    const fetchOriginal = window.fetch;

    // Substitui por uma versão que intercepta
    window.fetch = function(...args) {
        return fetchOriginal.apply(this, args)
            .then(async (response) => {
                // Só processa se for 403
                if (response.status !== 403) {
                    return response;
                }

                // Clone pra poder ler o body sem consumir
                const clone = response.clone();

                try {
                    const data = await clone.json();

                    // Se tem a flag bloqueado, redireciona
                    if (data && data.bloqueado === true) {
                        // Não redireciona se já tá na tela de bloqueio
                        if (window.location.pathname === '/bloqueado') {
                            return response;
                        }

                        // Evita loop
                        if (redirecionando) {
                            return response;
                        }
                        redirecionando = true;

                        console.log('🔒 Bloqueio detectado:', data.motivo);
                        console.log('🔒 Redirecionando pra /bloqueado...');

                        // Pequeno delay pra deixar logs saírem
                        setTimeout(() => {
                            window.location.href = '/bloqueado';
                        }, 100);
                    }

                } catch (e) {
                    // Se não for JSON, ignora
                }

                return response;
            });
    };

    console.log('🛡️ Interceptor de bloqueio ativo');

})();