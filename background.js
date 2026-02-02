/**
 * background.js - OGame Automation
 * Responsável por alarmes e comunicação entre componentes.
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log("OGame Automation instalada com sucesso.");

    // Configurações iniciais padrão
    chrome.storage.local.set({
        config: {
            expedition: {
                enabled: false,
                ships: { sc: 10, pf: 1 },
                coords: "1:1:16",
                origins: "",
                randomSystem: true,
                randomRange: 5
            },
            production: { enabled: false },
            research: { enabled: false }
        }
    });

    // Criar alarme para verificações periódicas (ex: a cada 5 minutos)
    chrome.alarms.create("checkRoutine", { periodInMinutes: 5 });
});

// Listener de alarmes
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "checkRoutine") {
        console.log("Rodando rotina periódica...");
        // Aqui poderíamos notificar o content script em abas abertas
    }
});

// Listener de mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "DETECTION_ATTACK") {
        try {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon128.png", // O Chrome pode falhar silenciosamente se o arquivo não existir, mas o erro de download trava o worker no MV3
                title: "ATAQUE DETECTADO NO OGAME!",
                message: request.message,
                priority: 2
            }, (id) => {
                if (chrome.runtime.lastError) {
                    // Fallback se o ícone falhar: tenta sem ícone ou apenas loga
                    console.warn("[Background] Falha ao criar notificação com ícone, tentando sem...");
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", // 1x1 transparente
                        title: "ATAQUE DETECTADO NO OGAME!",
                        message: request.message,
                        priority: 2
                    });
                }
            });
        } catch (e) {
            console.error("[Background] Erro ao disparar notificação:", e);
        }
    }
    return true;
});
