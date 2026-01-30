/**
 * popup.js - Configurações da Extensão
 */

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-config');
    const statusMsg = document.getElementById('status-msg');

    // Elementos de entrada (Grade Completa)
    const expToggle = document.getElementById('expedition-toggle');
    const shipIds = [
        'sc', 'lc', 'cs', 'rec', 'ep', // Civil
        'lf', 'hf', 'cr', 'bs', 'bc', 'bom', 'des', 'ds', 'rea', 'pf' // Combat
    ];
    const shipElements = {};
    shipIds.forEach(id => {
        shipElements[id] = document.getElementById(`ships-${id}`);
    });

    const expCoords = document.getElementById('exp-coords');
    const randomSys = document.getElementById('random-system');
    const randomRange = document.getElementById('random-range');
    const autoRecycle = document.getElementById('auto-recycle');

    const prodToggle = document.getElementById('production-toggle');
    const resToggle = document.getElementById('research-toggle');

    // Carregar configurações salvas
    chrome.storage.local.get('config', (data) => {
        if (data.config) {
            const c = data.config;
            const exp = c.expedition || {};
            const ships = exp.ships || {};

            expToggle.checked = exp.enabled || false;
            shipIds.forEach(id => {
                if (shipElements[id]) shipElements[id].value = ships[id] || 0;
            });

            expCoords.value = exp.coords || "";
            randomSys.checked = exp.randomSystem || false;
            randomRange.value = exp.randomRange || 0;
            autoRecycle.checked = exp.autoRecycle || false;

            prodToggle.checked = c.production?.enabled || false;
            resToggle.checked = c.research?.enabled || false;
        }
    });

    // Salvar configurações
    saveBtn.addEventListener('click', () => {
        const ships = {};
        shipIds.forEach(id => {
            ships[id] = parseInt(shipElements[id].value) || 0;
        });

        const config = {
            expedition: {
                enabled: expToggle.checked,
                ships: ships,
                coords: expCoords.value,
                randomSystem: randomSys.checked,
                randomRange: parseInt(randomRange.value) || 0,
                autoRecycle: autoRecycle.checked
            },
            production: {
                enabled: prodToggle.checked
            },
            research: {
                enabled: resToggle.checked
            }
        };

        chrome.storage.local.set({ config }, () => {
            statusMsg.textContent = "Configurações salvas!";
            statusMsg.style.color = "#238636";

            setTimeout(() => {
                statusMsg.textContent = "";
            }, 2000);
        });
    });
});
