/**
 * content.js - OGame Automation Logic
 * Atuação direta no DOM do jogo para automação educacional.
 */

console.log("%c[OGame Bot] Script Ativo", "color: #58a6ff; font-weight: bold;");

// Configurações e Seletores (Genéricos para adaptação fácil)
const SELECTORS = {
    fleet: {
        tab: 'a[href*="page=ingame&component=fleetdispatch"]',
        ships: '.ship-item',
        continueTo2: '#continueToStep2, #continueToFleet2',
        continueTo3: '#continueToStep3, #continueToFleet3',
        sendBtn: '#sendFleet, .btn_blue.sendFleet, button.sendFleet',
        coordG: 'input[name="galaxy"]',
        coordS: 'input[name="system"]',
        coordP: 'input[name="position"]',
        targetPlanet: '#pbtn_1',
        targetDebris: '#pbtn_2',
        targetMoon: '#pbtn_3',
        missionExp: '#missionExpedition',
        missionRec: '#missionRecycle'
    },
    resources: {
        metal: '#resources_metal',
        crystal: '#resources_crystal',
        deuterium: '#resources_deuterium'
    },
    production: {
        tab: 'a[href*="page=ingame&component=shipyard"], a[href*="page=ingame&component=defenses"]',
        buildBtn: '.build-it',
        queue: '#productionbox'
    },
    research: {
        tab: 'a[href*="page=ingame&component=research"]',
        activeIndicator: '.research-active'
    },
    events: {
        attack: '.attack_alert, #attack_alert',
        list: '#eventContent'
    },
    sidebar: {
        planets: '#planetList .smallplanet',
        coords: '.planet-koords',
        moon: '.moonlink'
    }
};

/**
 * Utilitários Adicionais
 */
const FleetUtils = {
    // IDs comuns no OGame (podem variar, mas seguem um padrão)
    SHIP_IDS: {
        sc: '202', // Cargueiro Pequeno
        lc: '203', // Cargueiro Grande
        cs: '208', // Colonizador
        rec: '209', // Reciclador
        ep: '210', // Sonda
        lf: '204', // Caça Ligeiro
        hf: '205', // Caça Pesado
        cr: '206', // Cruzador
        bs: '207', // Nave de Batalha
        bc: '215', // Interceptor
        bom: '211', // Bombardeiro
        des: '213', // Destruidor
        ds: '214', // Estrela da Morte
        rea: '218', // Ceifeira
        pf: '219'  // Explorador
    },

    parseCoords(coordStr) {
        const parts = coordStr.split(':');
        return {
            g: parts[0] || '1',
            s: parts[1] || '1',
            p: parts[2] || '16'
        };
    }
};

/**
 * Utilitários para Simulação de Ações Humanas
 */
const Utils = {
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    randomRange: (min, max) => Math.floor(Math.random() * (max - min + 1) + min),

    // Simula clique real com fallback
    safeClick(element) {
        if (!element) return;
        try {
            if (typeof element.click === 'function') {
                element.click();
            }
            const event = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(event);
        } catch (e) {
            console.warn("[Bot] Erro ao clicar no elemento:", e);
        }
    },

    async humanWait(config) {
        const min = config.minDelay || 1000;
        const max = config.maxDelay || 3000;
        const delay = Math.floor(Math.random() * (max - min + 1) + min);
        console.log(`[Bot] Espera humana: ${delay}ms`);
        return this.wait(delay);
    }
};

/**
 * Módulo de Monitoramento de Ataques
 */
class AttackMonitor {
    constructor() {
        this.observer = null;
        this.lastAlertState = false;
    }

    init() {
        this.observer = new MutationObserver(() => this.check());
        this.observer.observe(document.body, { childList: true, subtree: true });
        console.log("[Bot] Monitor de Ataques ativo.");
        this.check(); // Primeira verificação
    }

    check() {
        const alert = document.querySelector(SELECTORS.events.attack);
        if (alert && alert.classList.contains('alert') && alert.offsetParent !== null) {
            if (this.lastAlertState === true) return;
            this.lastAlertState = true;

            console.log("[Bot] ALERTA DE ATAQUE CONFIRMADO!");
            chrome.runtime.sendMessage({
                type: "DETECTION_ATTACK",
                message: "ATAQUE REAL DETECTADO! O ícone de alerta no menu superior está ativo."
            });
        } else {
            this.lastAlertState = false;
        }
    }
}

/**
 * Gerenciador de Produção (Naves/Defesas/Edifícios)
 */
class ProductionManager {
    static async checkAndProduce(config) {
        if (!config.enabled) return;

        // Se já houver algo em produção, ignorar
        if (document.querySelector(SELECTORS.production.queue)) return;

        console.log("[Bot] Verificando fila de produção...");

        // Simulação: Navegar até o estaleiro
        if (!window.location.href.includes('shipyard') && !window.location.href.includes('defenses')) {
            return;
        }

        // Procura botões de construção disponíveis
        const buildBtns = document.querySelectorAll(SELECTORS.production.buildBtn);
        if (buildBtns.length > 0) {
            console.log("[Bot] Iniciando produção de item disponível...");
        }
    }
}

/**
 * Gerenciador de Pesquisas
 */
class ResearchManager {
    static async checkAndResearch(config) {
        if (!config.enabled) return;

        // Verifica se há pesquisa ativa
        const active = document.querySelector(SELECTORS.research.activeIndicator);
        if (active) return;

        console.log("[Bot] Verificando novas pesquisas...");
    }
}

/**
 * Gerenciador de Origens (Troca de Planetas/Luas)
 */
class OriginManager {
    static async getCurrentCoords() {
        const activePlanet = document.querySelector('.smallplanet .planetlink.active, .smallplanet .moonlink.active');
        if (!activePlanet) return "";

        const coordEl = activePlanet.closest('.smallplanet').querySelector(SELECTORS.sidebar.coords);
        const isMoon = activePlanet.classList.contains('moonlink');

        if (!coordEl) return "";
        const coords = coordEl.textContent.trim().replace(/[\[\]]/g, '');
        return `${coords}[${isMoon ? 'M' : 'P'}]`;
    }

    static async scanOrigins() {
        const planets = document.querySelectorAll(SELECTORS.sidebar.planets);
        const detected = [];

        planets.forEach(p => {
            const coordEl = p.querySelector(SELECTORS.sidebar.coords);
            const nameEl = p.querySelector('.planet-name');
            if (coordEl) {
                const coords = coordEl.textContent.trim().replace(/[\[\]]/g, '');
                const name = nameEl ? nameEl.textContent.trim() : "Planeta";
                detected.push({ id: `${coords}[P]`, name: name, type: 'P' });

                const moon = p.querySelector(SELECTORS.sidebar.moon);
                if (moon) {
                    detected.push({ id: `${coords}[M]`, name: `Lua (${name})`, type: 'M' });
                }
            }
        });

        if (detected.length > 0) {
            await chrome.storage.local.set({ detectedOrigins: detected });
            console.log(`[Bot] ${detected.length} origens detectadas:`, detected);
        } else {
            console.log("[Bot] Nenhuma origem detectada na barra lateral.");
        }
    }

    static async switchTo(targetCoordStr) {
        console.log(`[Bot] Tentando trocar para origem: ${targetCoordStr}`);
        const planets = document.querySelectorAll(SELECTORS.sidebar.planets);

        for (const p of planets) {
            const coordEl = p.querySelector(SELECTORS.sidebar.coords);
            if (coordEl) {
                const currentCoords = coordEl.textContent.trim().replace(/[\[\]]/g, '');
                if (targetCoordStr.includes(currentCoords)) {
                    const isMoonTarget = targetCoordStr.includes('[M]');
                    const link = isMoonTarget ? p.querySelector(SELECTORS.sidebar.moon) : p.querySelector('.planetlink');

                    if (link) {
                        Utils.safeClick(link);
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

/**
 * Lógica de Fluxo de Frota (State Machine)
 */
class FleetAutomation {
    static async handleFleetFlow(config, isRecycle = false) {
        const url = window.location.href;
        const f1 = document.querySelector('#fleet1');
        const f2 = document.querySelector('#fleet2');
        const f3 = document.querySelector('#fleet3');

        // Etapa 1: Seleção de Naves
        if (url.includes('component=fleetdispatch') && ((f1 && f1.offsetParent !== null) || (!f2 || f2.offsetParent === null))) {
            console.log("[Bot] Etapa 1: Selecionando naves...");

            const ships = isRecycle ? { pf: (config.ships?.pf || 1) } : (config.ships || {});
            console.log("[Bot] Inventário configurado:", JSON.stringify(ships));

            let anyShipSelected = false;
            const shipItems = Array.from(document.querySelectorAll('.ship-item, li[data-technology]'));

            for (const [key, qty] of Object.entries(ships)) {
                if (qty <= 0) continue;

                const id = FleetUtils.SHIP_IDS[key];
                let item = shipItems.find(el =>
                    el.getAttribute('data-technology') === id ||
                    el.getAttribute('data-unit-id') === id ||
                    el.classList.contains(`ship${id}`)
                );

                if (!item) {
                    const inputFallback = document.querySelector(`input[id*="${id}"], input[name*="${id}"]`);
                    item = inputFallback?.closest('.ship-item, li');
                }

                if (item) {
                    const input = item.querySelector('input') || document.querySelector(`input[name="am${id}"]`);
                    const availableRaw = item.getAttribute('data-available') ||
                        item.getAttribute('data-amount') ||
                        item.querySelector('.amount')?.getAttribute('data-value') ||
                        item.querySelector('.amount')?.innerText ||
                        item.querySelector('.count')?.innerText ||
                        input?.getAttribute('data-available') ||
                        "0";

                    let available = 0;
                    const cleanStr = availableRaw.toString().toLowerCase().trim();
                    if (cleanStr.includes('k')) available = parseFloat(cleanStr.replace('k', '')) * 1000;
                    else if (cleanStr.includes('m')) available = parseFloat(cleanStr.replace('m', '')) * 1000000;
                    else available = parseInt(cleanStr.replace(/\D/g, '')) || 0;

                    const amount = Math.min(qty, available);

                    if (amount > 0 && input) {
                        console.log(`[Bot] Nave ${key} (ID ${id}): selecionando ${amount}.`);
                        input.value = amount;
                        ['input', 'change', 'keyup', 'blur'].forEach(ev => input.dispatchEvent(new Event(ev, { bubbles: true })));
                        anyShipSelected = true;
                    }
                }
            }

            if (anyShipSelected) {
                console.log("[Bot] Seleção concluída. Aguardando cronômetro para avançar...");
                await Utils.humanWait(config);
                let btn = document.querySelector(SELECTORS.fleet.continueTo2);
                if (!btn || btn.offsetParent === null) {
                    btn = Array.from(document.querySelectorAll('button, a, .btn_blue')).find(b => (b.innerText.toLowerCase().includes('próximo') || b.innerText.toLowerCase().includes('continuar')) && b.offsetParent !== null);
                }
                if (btn) {
                    console.log("[Bot] Clicando em Próximo (Passo 2)...");
                    Utils.safeClick(btn);
                    return true;
                }
            } else {
                console.warn("[Bot] Nenhuma nave disponível.");
                return false;
            }
        }

        // Lógica Unificada para Coordenadas, Missão e Envio (Etapas 2 e 3)
        const isF2Visible = f2 && f2.offsetParent !== null;
        const isF3Visible = f3 && f3.offsetParent !== null;

        if (isF2Visible || isF3Visible) {
            // 1. Processar Coordenadas (Sempre que F2 ou F3 estiverem minimamente presentes)
            const galaxyIn = document.querySelector('#galaxy, input[name="galaxy"]');
            const systemIn = document.querySelector('#system, input[name="system"]');
            const posIn = document.querySelector('#position, input[name="position"]');

            if (galaxyIn && systemIn && posIn) {
                const coords = FleetUtils.parseCoords(config.coords);
                const currentOrigin = await OriginManager.getCurrentCoords();
                let bG = coords.g;
                let bS = coords.s;
                let bP = isRecycle ? coords.p : "16";

                if ((!config.coords || config.coords === "1:1:16") && currentOrigin) {
                    const parts = currentOrigin.split('[')[0].split(':');
                    bG = parts[0]; bS = parts[1];
                }

                if (config.randomSystem) {
                    const delta = parseInt(config.randomRange) || 0;
                    bS = Utils.randomRange(Math.max(1, parseInt(bS) - delta), Math.min(499, parseInt(bS) + delta));
                }

                if (galaxyIn.value != bG || systemIn.value != bS || posIn.value != bP) {
                    console.log(`[Bot] Ajustando alvo: ${bG}:${bS}:${bP}`);
                    galaxyIn.value = bG;
                    systemIn.value = bS;
                    posIn.value = bP;
                    [galaxyIn, systemIn, posIn].forEach(el => {
                        ['input', 'change', 'keyup', 'blur'].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
                    });
                    await Utils.humanWait(config);
                }

                // GARANTIR TIPO DE ALVO (Independente se as coordenadas mudaram ou não)
                const targetBtnSelector = isRecycle ? SELECTORS.fleet.targetDebris : SELECTORS.fleet.targetPlanet;
                const targetBtn = document.querySelector(targetBtnSelector);

                // Verifica se já está selecionado para evitar cliques redundantes (Verificação tripla)
                const isTargetSelected = targetBtn?.classList.contains('selected') ||
                    targetBtn?.classList.contains('active') ||
                    targetBtn?.classList.contains('on') ||
                    !!targetBtn?.querySelector('.selected, .active, .on');

                if (targetBtn && !isTargetSelected) {
                    console.log(`[Bot] Forçando tipo de alvo: ${isRecycle ? 'Destroços' : 'Planeta'}`);
                    Utils.safeClick(targetBtn);
                    await Utils.humanWait(config);
                }
            }

            // 2. Transição Etapa 2 -> 3
            if (isF2Visible && !isF3Visible) {
                let btn = document.querySelector(SELECTORS.fleet.continueTo3);
                if (!btn || btn.offsetParent === null) {
                    btn = Array.from(document.querySelectorAll('button, a, .btn_blue')).find(b => (b.innerText.toLowerCase().includes('próximo') || b.innerText.toLowerCase().includes('continuar')) && b.offsetParent !== null && !b.id.includes('Step2'));
                }
                if (btn) {
                    console.log("[Bot] Alvo configurado. Aguardando cronômetro para Missão...");
                    await Utils.humanWait(config);
                    Utils.safeClick(btn);
                    return true;
                }
            }

            // 3. Processar Missão e Envio Final (Etapa 3)
            if (isF3Visible) {
                console.log("[Bot] Verificando Missão...");
                const mID = isRecycle ? "8" : "15"; // Exp=15, Rec=8
                const missionSelectors = [
                    `#mission${mID}`, `li[data-mission-id="${mID}"]`, `a[data-mission-id="${mID}"]`,
                    `.mission_item[data-mission-id="${mID}"]`, `#mission${isRecycle ? 'Recycle' : 'Expedition'}`
                ];

                let mBtn = null;
                for (const s of missionSelectors) {
                    mBtn = document.querySelector(s);
                    if (mBtn && mBtn.offsetParent !== null) break;
                }

                if (!mBtn) {
                    const terms = isRecycle ? ['reciclar', 'recycle', 'reci'] : ['expedição', 'explorar', 'expedition', 'expe', 'explo'];
                    mBtn = Array.from(document.querySelectorAll('a, li, button')).find(el => {
                        const txt = (el.innerText || el.textContent || "").toLowerCase();
                        return terms.some(t => txt.includes(t)) && el.offsetParent !== null;
                    });
                }

                if (mBtn) {
                    const isSelected = mBtn.classList.contains('selected') ||
                        mBtn.classList.contains('active') ||
                        mBtn.classList.contains('on') ||
                        !!mBtn.querySelector('.selected, .active, .on');
                    if (!isSelected) {
                        console.log(`[Bot] Selecionando missão ${isRecycle ? 'Reciclar' : 'Expedição'}...`);
                        Utils.safeClick(mBtn);
                        await Utils.humanWait(config);
                    }
                }

                let sendBtn = document.querySelector(SELECTORS.fleet.sendBtn);
                if (!sendBtn || sendBtn.offsetParent === null) {
                    const terms = ['enviar', 'fleet', 'enviar frota', 'mande', 'fly'];
                    sendBtn = Array.from(document.querySelectorAll('button, a, .btn_blue')).find(el => {
                        const t = (el.innerText || el.textContent || el.value || "").toLowerCase();
                        return terms.some(term => t.includes(term)) && el.offsetParent !== null;
                    });
                }

                if (sendBtn && !sendBtn.classList.contains('disabled') && !sendBtn.classList.contains('off')) {
                    console.log("[Bot] CONDIÇÕES OK! ENVIANDO AGORA...");
                    Utils.safeClick(sendBtn);
                    await Utils.wait(2000); // Espera o jogo processar o comando de saída
                    return "SENT";
                } else if (sendBtn) {
                    console.log("[Bot] Botão de envio detectado, mas desabilitado. Aguardando...");
                }
            }
        }
        return true;
    }
}

/**
 * Lógica Principal da Expedição
 */
class ExpeditionBot {
    constructor(config) { this.config = config; }

    async run() {
        if (!this.config.enabled) return;
        const origins = (this.config.origins || "").split(',').map(o => o.trim()).filter(o => o);
        if (origins.length > 0) {
            const storage = await chrome.storage.local.get('originIndex');
            let idx = storage.originIndex || 0;
            if (idx >= origins.length) idx = 0;

            const currentCoords = await OriginManager.getCurrentCoords();
            const targetOriginCoords = origins[idx];

            if (currentCoords && !targetOriginCoords.includes(currentCoords)) {
                console.log(`[Bot] Mudando para : ${targetOriginCoords}`);
                if (await OriginManager.switchTo(targetOriginCoords)) return;
            }

            if (!window.location.href.includes('fleetdispatch')) {
                console.log("[Bot] Navegando para Frota... Aguardando cronômetro inicial.");
                Utils.safeClick(document.querySelector(SELECTORS.fleet.tab));
                await Utils.humanWait(this.config);
                return;
            }

            const status = await FleetAutomation.handleFleetFlow(this.config);
            if (status === "SENT" || status === false) {
                const nextIdx = (idx + 1) % origins.length;
                await chrome.storage.local.set({ originIndex: nextIdx });
                if (status === "SENT") {
                    await Utils.wait(3000);
                    await OriginManager.switchTo(origins[nextIdx]);
                }
            }
        } else {
            if (!window.location.href.includes('fleetdispatch')) {
                console.log("[Bot] Navegando para Frota... Aguardando cronômetro inicial.");
                Utils.safeClick(document.querySelector(SELECTORS.fleet.tab));
                await Utils.humanWait(this.config);
                return;
            }
            await FleetAutomation.handleFleetFlow(this.config);
        }
    }
}

/**
 * Monitor de Combate e Reciclagem
 */
class RecycleBot {
    constructor(config) { this.config = config; this.lastCombatMsg = ""; }

    async check() {
        if (!this.config.enabled || !this.config.autoRecycle) return;
        const eventList = document.querySelector(SELECTORS.events.list);
        if (eventList) {
            const combatEvent = Array.from(eventList.querySelectorAll('.eventFleet')).find(el => el.textContent.toLowerCase().includes('combate'));
            if (combatEvent && combatEvent.textContent !== this.lastCombatMsg) {
                this.lastCombatMsg = combatEvent.textContent;
                this.initiateRecycle();
            }
        }
    }

    async initiateRecycle() {
        if (!window.location.href.includes('fleetdispatch')) {
            Utils.safeClick(document.querySelector(SELECTORS.fleet.tab));
            return;
        }
        await FleetAutomation.handleFleetFlow(this.config, true);
    }
}

(async () => {
    try {
        const monitor = new AttackMonitor();
        monitor.init();
        await OriginManager.scanOrigins();

        setInterval(async () => {
            const storage = await chrome.storage.local.get('config');
            const config = storage.config;
            if (!config) return;

            await OriginManager.scanOrigins();
            if (config.expedition && config.expedition.enabled) {
                await new ExpeditionBot(config.expedition).run();
                await new RecycleBot(config.expedition).check();
            }
        }, 60000);
    } catch (e) { console.error("[Bot] Erro:", e); }
})();
