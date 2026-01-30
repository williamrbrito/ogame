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

        // Se não estiver na página de frotas, navega até lá
        if (!window.location.href.includes('fleetdispatch')) {
            console.log("[Bot] Navegando para frota...");
            Utils.safeClick(document.querySelector(SELECTORS.fleet.tab));
            return;
        }

        await FleetAutomation.handleFleetFlow(this.config);
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

        // Loop de Rotina de 1 minuto
        setInterval(async () => {
            console.log("[Bot] Rodando ciclo de verificação...");

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
