/**
 * background.js - OGame Automation
 * Responsável por alarmes e comunicação entre componentes.
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log("OGame Automation instalada com sucesso.");
    
    // Configurações iniciais padrão
    chrome.storage.local.set({
        config: {
            expedition: { enabled: false, ships: "Cargo=10, Explorer=1", coords: "1:1:16" },
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
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "ATAQUE DETECTADO NO OGAME!",
            message: request.message,
            priority: 2
        });
    }
    return true;
});
