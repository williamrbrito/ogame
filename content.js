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
        continueBtn: '#continueToStep2, #continueToStep3',
        sendBtn: '#sendFleet',
        coordG: 'input[name="galaxy"]',
        coordS: 'input[name="system"]',
        coordP: 'input[name="position"]',
        targetDebris: '#pbtn_2, .debris-field',
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

    // Simula clique real
    safeClick(element) {
        if (!element) return;
        const event = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });
        element.dispatchEvent(event);
    }
};

/**
 * Módulo de Monitoramento de Ataques
 */
class AttackMonitor {
    constructor() {
        this.observer = null;
    }

    init() {
        this.observer = new MutationObserver(() => this.check());
        this.observer.observe(document.body, { childList: true, subtree: true });
        console.log("[Bot] Monitor de Ataques ativo.");
        this.check(); // Primeira verificação
    }

    check() {
        const alert = document.querySelector(SELECTORS.events.attack);
        // Verifica se o elemento existe e é visível/ativo no DOM
        if (alert && (alert.classList.contains('active') || alert.offsetParent !== null)) {
            chrome.runtime.sendMessage({
                type: "DETECTION_ATTACK",
                message: "Possível ataque detectado visualmente no menu superior!"
            });
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
            // Apenas registra a intenção. Em um bot real, clicaria no menu.
            return;
        }

        // Procura botões de construção disponíveis
        const buildBtns = document.querySelectorAll(SELECTORS.production.buildBtn);
        if (buildBtns.length > 0) {
            console.log("[Bot] Iniciando produção de item disponível...");
            // Utils.safeClick(buildBtns[0]); // Comentado para segurança educacional
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
        // Lógica similar à produção
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
        return coordEl ? `${coordEl.textContent.trim()}[${isMoon ? 'M' : 'P'}]` : "";
    }

    static async scanOrigins() {
        const planets = document.querySelectorAll(SELECTORS.sidebar.planets);
        const detected = [];

        planets.forEach(p => {
            const coordEl = p.querySelector(SELECTORS.sidebar.coords);
            const nameEl = p.querySelector('.planet-name');
            if (coordEl) {
                // Limpar coordenadas: remove '[', ']' e espaços
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
            console.log("[Bot] Nenhuma origem detectada na barra lateral. Verifique se o seletor está correto.");
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

        // Etapa 1: Seleção de Naves
        if (url.includes('component=fleetdispatch') && !document.querySelector('#fleet2')) {
            console.log("[Bot] Etapa 1: Selecionando naves...");

            const ships = isRecycle ? { pf: (config.ships?.pf || 1) } : (config.ships || {});
            let shipsSelected = false;

            for (const [key, qty] of Object.entries(ships)) {
                const id = FleetUtils.SHIP_IDS[key];
                const input = document.querySelector(`input[name="ship${id}"]`);
                if (input) {
                    const available = parseInt(input.getAttribute('data-available') || "0");
                    const amount = Math.min(qty, available);
                    if (amount > 0) {
                        input.value = amount;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        shipsSelected = true;
                    }
                }
            }

            if (shipsSelected) {
                await Utils.wait(1000);
                Utils.safeClick(document.querySelector(SELECTORS.fleet.continueBtn));
                return true;
            } else {
                console.log("[Bot] Sem naves configuradas disponíveis nesta origem.");
                return false;
            }
        }
        // Etapa 2: Coordenadas
        else if (document.querySelector('#fleet2')) {
            console.log("[Bot] Etapa 2: Definindo coordenadas...");
            const coords = FleetUtils.parseCoords(config.coords);

            const galaxyIn = document.querySelector(SELECTORS.fleet.coordG);
            const systemIn = document.querySelector(SELECTORS.fleet.coordS);
            const posIn = document.querySelector(SELECTORS.fleet.coordP);

            if (galaxyIn && systemIn && posIn) {
                galaxyIn.value = coords.g;

                let targetSystem = parseInt(coords.s) || 1;
                if (config.randomSystem) {
                    const delta = parseInt(config.randomRange) || 0;
                    targetSystem = Utils.randomRange(
                        Math.max(1, targetSystem - delta),
                        Math.min(499, targetSystem + delta)
                    );
                }
                systemIn.value = targetSystem;
                posIn.value = coords.p;

                galaxyIn.dispatchEvent(new Event('change', { bubbles: true }));
                systemIn.dispatchEvent(new Event('change', { bubbles: true }));
                posIn.dispatchEvent(new Event('change', { bubbles: true }));

                // Se for reciclagem, selecionar alvo Destroços
                if (isRecycle) {
                    const debrisBtn = document.querySelector(SELECTORS.fleet.targetDebris);
                    if (debrisBtn) Utils.safeClick(debrisBtn);
                }

                await Utils.wait(1000);
                Utils.safeClick(document.querySelector(SELECTORS.fleet.continueBtn));
            }
        }

        // Etapa 3: Missão e Envio
        else if (document.querySelector('#fleet3')) {
            console.log("[Bot] Etapa 3: Selecionando missão e enviando...");

            const expMission = document.querySelector(SELECTORS.fleet.missionExp);
            const recycleMission = document.querySelector(SELECTORS.fleet.missionRec); // Alvo destroços

            if (isRecycle) {
                if (recycleMission) Utils.safeClick(recycleMission);
                else if (expMission) Utils.safeClick(expMission);
            } else {
                if (expMission) Utils.safeClick(expMission);
            }

            await Utils.wait(1200);
            const sendBtn = document.querySelector(SELECTORS.fleet.sendBtn);
            if (sendBtn) {
                console.log("[Bot] MISSÃO PRONTA PARA ENVIO!");
                // Utils.safeClick(sendBtn); // Mantido comentado para segurança educacional
            }
        }
        return true;
    }
}

/**
 * Lógica Principal da Expedição Expandida
 */
class ExpeditionBot {
    constructor(config) {
        this.config = config;
    }

    async run() {
        if (!this.config.enabled) return;

        // 1. Verificar Origens
        const origins = (this.config.origins || "").split(',').map(o => o.trim()).filter(o => o);

        if (origins.length > 0) {
            const data = await chrome.storage.local.get('originIndex');
            let idx = data.originIndex || 0;
            if (idx >= origins.length) idx = 0;

            const current = await OriginManager.getCurrentCoords();
            const target = origins[idx];

            if (current && !target.includes(current)) {
                const switched = await OriginManager.switchTo(target);
                if (switched) {
                    console.log(`[Bot] Trocando para origem configurada: ${target}`);
                    return; // Aguarda reload
                }
            }

            // Se chegou aqui, está na origem correta. Tenta enviar.
            const status = await FleetAutomation.handleFleetFlow(this.config);

            // Se falhou (ex: sem naves), pula para a próxima origem no próximo ciclo
            if (status === false || (status === true && document.querySelector('#fleet3'))) {
                const nextIdx = (idx + 1) % origins.length;
                await chrome.storage.local.set({ originIndex: nextIdx });
                console.log(`[Bot] Ciclo concluído/impossível nesta origem. Próxima: ${origins[nextIdx]}`);
            }
        } else {
            // Comportamento padrão (origem atual)
            if (!window.location.href.includes('fleetdispatch')) {
                Utils.safeClick(document.querySelector(SELECTORS.fleet.tab));
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
    constructor(config) {
        this.config = config;
        this.lastCombatMsg = "";
    }

    async check() {
        if (!this.config.enabled || !this.config.autoRecycle) return;

        const eventList = document.querySelector(SELECTORS.events.list);
        if (eventList) {
            const combatEvent = Array.from(eventList.querySelectorAll('.eventFleet')).find(el =>
                el.textContent.toLowerCase().includes('combate')
            );

            if (combatEvent && combatEvent.textContent !== this.lastCombatMsg) {
                console.log("[Bot] Novo combate detectado! Iniciando reciclagem...");
                this.lastCombatMsg = combatEvent.textContent;
                this.initiateRecycle();
            }
        }
    }

    async initiateRecycle() {
        if (!window.location.href.includes('fleetdispatch')) {
            console.log("[Bot] Navegando para frota para reciclar...");
            Utils.safeClick(document.querySelector(SELECTORS.fleet.tab));
            return;
        }
        await FleetAutomation.handleFleetFlow(this.config, true);
    }
}

// Inicialização Centralizada
(async () => {
    try {
        const data = await chrome.storage.local.get('config');
        const config = data.config;

        if (!config) {
            console.log("[Bot] Configurações não encontradas.");
            return;
        }

        // Iniciar Monitor de Ataques (Sempre ativo se a extensão estiver rodando)
        const monitor = new AttackMonitor();
        monitor.init();

        // Escanear origens imediatamente
        await OriginManager.scanOrigins();

        // Loop de Rotina de 1 minuto
        setInterval(async () => {
            console.log("[Bot] Rodando ciclo de verificação...");

            // Escanear origens para o popup
            await OriginManager.scanOrigins();

            if (config.expedition && config.expedition.enabled) {
                await new ExpeditionBot(config.expedition).run();
                await new RecycleBot(config.expedition).check();
            }

            if (config.production && config.production.enabled) {
                await ProductionManager.checkAndProduce(config.production);
            }

            if (config.research && config.research.enabled) {
                await ResearchManager.checkAndResearch(config.research);
            }
        }, 60000);

    } catch (e) {
        console.error("[Bot] Falha na inicialização:", e);
    }
})();
