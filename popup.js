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
    const originListContainer = document.getElementById('origin-selection-list');
    const randomSys = document.getElementById('random-system');
    const randomRange = document.getElementById('random-range');
    const autoRecycle = document.getElementById('auto-recycle');

    const prodToggle = document.getElementById('production-toggle');
    const resToggle = document.getElementById('research-toggle');

    const minDelay = document.getElementById('min-delay');
    const maxDelay = document.getElementById('max-delay');

    // Função para renderizar lista de origens
    const renderOrigins = (detected, selectedStr) => {
        originListContainer.innerHTML = '';
        const selected = selectedStr ? selectedStr.split(',') : [];

        if (!detected || detected.length === 0) {
            originListContainer.innerHTML = '<p class="info" style="font-size: 0.7rem; color: #f85149;">Nenhuma origem detectada. Abra o jogo!</p>';
            return;
        }

        detected.forEach(item => {
            const div = document.createElement('div');
            div.className = 'origin-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item.id;
            checkbox.checked = selected.includes(item.id);
            checkbox.id = `origin-${item.id}`;

            const label = document.createElement('label');
            label.htmlFor = `origin-${item.id}`;
            label.textContent = `${item.name} [${item.id.split('[')[0]}]`;

            div.appendChild(checkbox);
            div.appendChild(label);
            originListContainer.appendChild(div);
        });
    };

    // Carregar configurações salvas
    chrome.storage.local.get(['config', 'detectedOrigins'], (data) => {
        const c = data.config || {};
        const detected = data.detectedOrigins || [];
        const exp = c.expedition || {};
        const ships = exp.ships || {};

        expToggle.checked = exp.enabled || false;
        shipIds.forEach(id => {
            if (shipElements[id]) shipElements[id].value = ships[id] || 0;
        });

        expCoords.value = exp.coords || "";
        renderOrigins(detected, exp.origins || "");

        randomSys.checked = exp.randomSystem || false;
        randomRange.value = exp.randomRange || 0;
        autoRecycle.checked = exp.autoRecycle || false;

        prodToggle.checked = c.production?.enabled || false;
        resToggle.checked = c.research?.enabled || false;

        minDelay.value = exp.minDelay || 1000;
        maxDelay.value = exp.maxDelay || 3000;
    });

    // Escutar mudanças no storage (para atualizar origens se o scan completar com popup aberto)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.detectedOrigins) {
            chrome.storage.local.get('config', (data) => {
                const originsStr = data.config?.expedition?.origins || "";
                renderOrigins(changes.detectedOrigins.newValue, originsStr);
            });
        }
    });

    // Salvar configurações
    saveBtn.addEventListener('click', () => {
        const ships = {};
        shipIds.forEach(id => {
            ships[id] = parseInt(shipElements[id].value) || 0;
        });

        // Coletar origens selecionadas
        const selectedOrigins = Array.from(originListContainer.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value)
            .join(',');

        const config = {
            expedition: {
                enabled: expToggle.checked,
                ships: ships,
                coords: expCoords.value,
                origins: selectedOrigins,
                randomSystem: randomSys.checked,
                randomRange: parseInt(randomRange.value) || 0,
                autoRecycle: autoRecycle.checked,
                minDelay: parseInt(minDelay.value) || 1000,
                maxDelay: parseInt(maxDelay.value) || 3000
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
