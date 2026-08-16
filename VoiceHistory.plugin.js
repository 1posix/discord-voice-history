/**
 * @name VoiceHistory
 * @author 1posix
 * @version 0.10.0
 * @description Keeps a local history of users who recently left your current voice channel and displays the latest departure below active users.
 * @source https://github.com/1posix/discord-voice-history
 */

const PLUGIN_NAME = "VoiceHistory";
const HISTORY_KEY = "history";
const SETTINGS_KEY = "settings";
const HISTORY_VERSION = 3;
const PLUGIN_VERSION = "0.10.0";
const COMPAT_HEALTH_INTERVAL_MS = 30_000;
const COMPAT_PERIODIC_RESCAN_MS = 5 * 60_000;
const COMPAT_REPAIR_COOLDOWN_MS = 20_000;
const CHANNEL_NULL_GRACE_MS = 5_000;
const DEPARTURE_CONFIRM_MS = 650;
const DEPARTURE_CONFIRM_COUNT = 2;

const DEFAULT_SETTINGS = Object.freeze({
    retentionHours: 24,
    showBots: true,
    persistHistory: true,
    showRelativeTime: true,
    showSeparator: false,
    opacity: 45,
    sortOrder: "recent",
    diagnosticToasts: true,
    debugLogs: false,
    autoRepairCompatibility: true
});

const STYLE = `
.vh-recent-list {
    box-sizing: border-box;
    display: block !important;
    width: auto;
    min-width: 0;
    margin: 1px 8px 3px 32px;
    padding: 0;
    position: relative;
    z-index: 1;
    list-style: none !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
}

.vh-recent-separator {
    box-sizing: border-box;
    padding: 3px 8px 2px;
    color: var(--channels-default, #949ba4);
    font-size: 10px;
    font-weight: 700;
    line-height: 14px;
    text-transform: uppercase;
    opacity: .7;
}

.vh-recent-user {
    box-sizing: border-box;
    display: flex !important;
    align-items: center;
    gap: 7px;
    width: 100%;
    min-width: 0;
    min-height: 28px;
    padding: 2px 8px;
    border-radius: 4px;
    color: var(--channels-default, #949ba4);
    user-select: none;
}

.vh-recent-user:hover {
    background: var(--background-mod-subtle, rgba(255,255,255,.04));
}

.vh-recent-user[data-voice-history-user-id] {
    cursor: pointer;
}

.vh-recent-user[data-voice-history-user-id]:focus-visible,
.vh-history-entry[data-voice-history-user-id]:focus-visible {
    outline: 2px solid var(--brand-500, #5865f2);
    outline-offset: -2px;
}

.vh-recent-avatar,
.vh-recent-avatar-fallback {
    box-sizing: border-box;
    flex: 0 0 20px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
}

.vh-recent-avatar {
    display: block;
    object-fit: cover;
}

.vh-recent-avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-modifier-active, rgba(255,255,255,.12));
    color: var(--text-muted, #949ba4);
    font-size: 10px;
    font-weight: 700;
}

.vh-recent-name {
    min-width: 0;
    overflow: hidden;
    flex: 1 1 auto;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 14px;
    line-height: 18px;
    font-weight: 500;
}

.vh-recent-time {
    flex: 0 0 auto;
    max-width: 105px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--text-muted, #949ba4);
    font-size: 10px;
    line-height: 14px;
}


.vh-history-button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    flex: 0 0 auto;
    min-width: 22px;
    height: 22px;
    padding: 0 4px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--interactive-normal, #b5bac1);
    cursor: pointer;
    opacity: .9;
}

.vh-history-button:hover {
    background: var(--background-modifier-hover, rgba(255,255,255,.06));
    color: var(--interactive-hover, #dbdee1);
}

.vh-history-button:active {
    background: var(--background-modifier-active, rgba(255,255,255,.08));
}

.vh-history-button svg {
    display: block;
    width: 14px;
    height: 14px;
    flex: 0 0 14px;
}

.vh-history-count {
    min-width: 8px;
    color: inherit;
    font-size: 9px;
    font-weight: 700;
    line-height: 12px;
    text-align: center;
}

.vh-history-popover {
    box-sizing: border-box;
    position: fixed !important;
    z-index: 2147483000 !important;
    width: 286px;
    max-width: calc(100vw - 24px);
    max-height: min(360px, calc(100vh - 24px));
    overflow: hidden;
    border: 1px solid var(--background-modifier-accent, rgba(255,255,255,.08));
    border-radius: 8px;
    background: var(--background-floating, #111214);
    color: var(--text-normal, #dbdee1);
    box-shadow: 0 10px 30px rgba(0,0,0,.45);
}

.vh-history-popover-header {
    box-sizing: border-box;
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--background-modifier-accent, rgba(255,255,255,.08));
    color: var(--header-primary, #f2f3f5);
    font-size: 12px;
    font-weight: 700;
}

.vh-history-popover-list {
    box-sizing: border-box;
    max-height: 315px;
    overflow-y: auto;
    padding: 6px;
}

.vh-history-entry {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 5px 6px;
    border-radius: 5px;
}

.vh-history-entry:hover {
    background: var(--background-modifier-hover, rgba(255,255,255,.06));
}

.vh-history-entry[data-voice-history-user-id] {
    cursor: pointer;
}

.vh-history-entry-avatar,
.vh-history-entry-avatar-fallback {
    box-sizing: border-box;
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
}

.vh-history-entry-avatar {
    display: block;
    object-fit: cover;
}

.vh-history-entry-avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--background-modifier-active, rgba(255,255,255,.12));
    color: var(--text-muted, #949ba4);
    font-size: 10px;
    font-weight: 700;
}

.vh-history-entry-main {
    min-width: 0;
    flex: 1 1 auto;
}

.vh-history-entry-name {
    overflow: hidden;
    color: var(--text-normal, #dbdee1);
    font-size: 13px;
    font-weight: 600;
    line-height: 16px;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.vh-history-entry-time {
    margin-top: 1px;
    color: var(--text-muted, #949ba4);
    font-size: 10px;
    line-height: 13px;
}

.vh-debug-test {
    outline: 2px dashed #f0b232 !important;
    outline-offset: -2px;
    background: rgba(240, 178, 50, .10) !important;
}

.vh-debug-overlay {
    position: fixed !important;
    left: 88px !important;
    top: 88px !important;
    z-index: 2147483647 !important;
    max-width: 360px !important;
    padding: 12px 14px !important;
    border: 2px solid #f23f42 !important;
    border-radius: 8px !important;
    background: #111214 !important;
    color: #f2f3f5 !important;
    box-shadow: 0 8px 28px rgba(0,0,0,.45) !important;
    font: 600 13px/1.4 sans-serif !important;
}

.vh-settings {
    color: var(--text-normal);
}

.vh-settings-section {
    margin-bottom: 24px;
}

.vh-settings-section h3 {
    margin: 0 0 12px;
    color: var(--header-primary);
    font-size: 16px;
}

.vh-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    min-height: 42px;
    padding: 8px 0;
    border-bottom: 1px solid var(--background-modifier-accent);
}

.vh-setting-text {
    min-width: 0;
    flex: 1 1 auto;
}

.vh-setting-name {
    color: var(--header-primary);
    font-weight: 600;
}

.vh-setting-note {
    margin-top: 3px;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 16px;
}

.vh-setting-control {
    flex: 0 0 auto;
}

.vh-settings input[type="number"],
.vh-settings select {
    box-sizing: border-box;
    min-width: 120px;
    height: 32px;
    padding: 0 8px;
    border: 1px solid var(--input-border, transparent);
    border-radius: 4px;
    outline: none;
    background: var(--input-background, var(--background-tertiary));
    color: var(--text-normal);
}

.vh-settings input[type="range"] {
    width: 150px;
}

.vh-settings button {
    min-height: 32px;
    padding: 6px 12px;
    border: 0;
    border-radius: 4px;
    background: var(--button-secondary-background, var(--background-modifier-selected));
    color: var(--text-normal);
    cursor: pointer;
    font-weight: 600;
}

.vh-settings button.vh-danger {
    background: var(--button-danger-background, #da373c);
    color: white;
}

.vh-debug-box {
    margin: 8px 0 14px;
    padding: 10px 12px;
    border-radius: 6px;
    background: var(--background-secondary);
    color: var(--text-muted);
    font-size: 12px;
    line-height: 18px;
    white-space: pre-wrap;
    word-break: break-word;
}
`;

module.exports = class VoiceHistory {
    constructor() {
        this.api = new BdApi(PLUGIN_NAME);
        this.settings = {...DEFAULT_SETTINGS};
        this.history = this.emptyHistory();

        this.VoiceStateStore = null;
        this.SortedVoiceStateStore = null;
        this.ChannelStore = null;
        this.SelectedChannelStore = null;
        this.SelectedGuildStore = null;
        this.RTCConnectionStore = null;
        this.UserStore = null;
        this.UserProfileActions = null;
        this.GuildMemberStore = null;
        this.FluxDispatcher = null;

        this.currentChannelId = null;
        this.currentGuildId = null;
        this.activeSnapshot = new Set();
        this.lastKnownChannelByUser = new Map();

        this.pollTimer = null;
        this.refreshTimer = null;
        this.compatTimer = null;
        this.renderTimer = null;
        this.domObserver = null;
        this.started = false;
        this.isRendering = false;
        this.lastTargetDetails = "aucun";
        this.lastChannelSource = "aucune";
        this.lastVoiceUsersSource = "aucune";
        this.lastVoiceUsersAuthoritative = false;
        this.lastVoiceUsersConfidence = "aucune";
        this.lastGoodChannelAt = 0;
        this.channelNullSince = null;
        this.pendingDepartures = new Map();

        this.boundVoiceStore = null;
        this.boundSelectedGuildStore = null;
        this.boundSelectedChannelStore = null;
        this.boundFluxDispatcher = null;
        this.compatRepairScheduled = false;
        this.compat = {
            generation: 0,
            lastResolveAt: null,
            lastHealthAt: null,
            lastRepairAt: null,
            lastRepairReason: "aucune",
            repairs: 0,
            degraded: false,
            channelFailureStreak: 0,
            voiceFailureStreak: 0,
            moduleSources: {},
            warnings: []
        };

        this.lastVoiceEventAt = null;
        this.lastJoinAt = null;
        this.lastDepartureAt = null;
        this.lastSyncAt = null;
        this.lastRenderMode = "aucun";
        this.lastRenderError = null;
        this.lastActiveCount = 0;
        this.historyPopover = null;
        this.historyPopoverAnchor = null;
        this.historyPopoverCleanup = null;

        this.voiceStoreHandler = () => this.syncVoiceState();
        this.navigationStoreHandler = () => this.onNavigationContextChanged();
        this.fluxVoiceHandler = (event) => this.onVoiceStateUpdates(event);
    }

    emptyHistory() {
        return {version: HISTORY_VERSION, channels: {}};
    }

    start() {
        this.started = true;
        this.loadSettings();
        this.loadHistory();
        this.purgeExpired();
        this.resolveModules("startup");

        BdApi.DOM.addStyle(PLUGIN_NAME, STYLE);
        this.bindRuntimeHooks();

        if (!this.ChannelStore || !this.UserStore || (!this.VoiceStateStore && !this.SortedVoiceStateStore)) {
            this.compat.degraded = true;
            BdApi.UI.showToast("VoiceHistory: compatibilité Discord dégradée, fallbacks actifs.", {type: "warning", timeout: 5000});
            console.warn(`[${PLUGIN_NAME}] Certains modules Discord sont introuvables; la couche de compatibilité va tenter de se réparer.`, this.getCompatibilityStatus());
        }

        this.pollTimer = setInterval(() => this.syncVoiceState(), 1500);

        // Le tracking reste réactif. Les libellés de temps sont mis à jour
        // toutes les 10 secondes sans reconstruire la sidebar.
        this.refreshTimer = setInterval(() => {
            const changed = this.purgeExpired();
            if (changed) {
                this.saveHistory();
                this.scheduleRender();
            }
            else {
                this.updateRelativeTimesInPlace();
            }
        }, 10_000);

        // V0.9 : auto-réparation de la couche Discord interne. Si Discord fait
        // un hot-reload ou remplace ses stores, on redécouvre les références.
        this.compatTimer = setInterval(() => this.compatibilityHealthCheck(), COMPAT_HEALTH_INTERVAL_MS);

        this.startDomObserver();
        this.syncVoiceState(true);
        this.scheduleRender();

        BdApi.UI.showToast(`VoiceHistory ${PLUGIN_VERSION} activé`, {type: "success"});
        console.info(`[${PLUGIN_NAME}] Démarré`, this.getDebugStatus());
    }

    stop() {
        this.started = false;
        this.unbindRuntimeHooks();

        if (this.pollTimer) clearInterval(this.pollTimer);
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        if (this.compatTimer) clearInterval(this.compatTimer);
        if (this.renderTimer) clearTimeout(this.renderTimer);
        this.pollTimer = null;
        this.refreshTimer = null;
        this.compatTimer = null;
        this.renderTimer = null;

        if (this.domObserver) this.domObserver.disconnect();
        this.domObserver = null;

        this.closeHistoryPopover();
        this.removeRenderedLists();
        BdApi.DOM.removeStyle(PLUGIN_NAME);

        this.currentChannelId = null;
        this.currentGuildId = null;
        this.activeSnapshot.clear();
        this.lastKnownChannelByUser.clear();
        this.pendingDepartures.clear();
        this.channelNullSince = null;
        this.compatRepairScheduled = false;
    }

    debugLog(...args) {
        if (this.settings.debugLogs) console.debug(`[${PLUGIN_NAME}]`, ...args);
    }

    getModuleName(module) {
        if (!module) return "inconnu";
        try {
            return String(
                module?.constructor?.displayName
                ?? module?.constructor?.persistKey
                ?? module?.getName?.()
                ?? module?.constructor?.name
                ?? "module"
            );
        }
        catch {
            return "module";
        }
    }

    collectStorePool() {
        try {
            const modules = BdApi.Webpack.getModules?.((module) => Boolean(
                module && (module?._dispatchToken || typeof module?.addChangeListener === "function")
            ));
            return Array.isArray(modules) ? modules : [];
        }
        catch (error) {
            this.debugLog("Impossible d'énumérer les stores", error);
            return [];
        }
    }

    resolveStoreCompat(name, {keys = [], validator = null, hints = [], pool = []} = {}) {
        const {Webpack} = BdApi;
        const isValid = (candidate) => {
            if (!candidate || typeof candidate !== "object") return false;
            if (!validator) return true;
            try { return Boolean(validator(candidate)); }
            catch { return false; }
        };

        try {
            const named = Webpack.getStore?.(name);
            if (isValid(named)) return {module: named, source: `getStore(${name})`};
        }
        catch (error) {
            this.debugLog(`getStore(${name}) a échoué`, error);
        }

        for (const group of keys) {
            try {
                const candidate = Webpack.getByKeys?.(...group);
                if (isValid(candidate)) return {module: candidate, source: `getByKeys(${group.join(",")})`};
            }
            catch (error) {
                this.debugLog(`getByKeys(${group.join(",")}) a échoué`, error);
            }
        }

        if (validator) {
            const structural = pool.find((candidate) => isValid(candidate));
            if (structural) return {module: structural, source: `scan-capacités:${this.getModuleName(structural)}`};
        }

        if (hints.length) {
            const fuzzy = pool.find((candidate) => {
                const label = this.getModuleName(candidate).toLowerCase();
                return hints.every((hint) => label.includes(String(hint).toLowerCase()));
            });
            if (fuzzy) return {module: fuzzy, source: `scan-nom:${this.getModuleName(fuzzy)}`};
        }

        return {module: null, source: "introuvable"};
    }

    resolveModules(reason = "manual") {
        const pool = this.collectStorePool();
        const sources = {};
        const assign = (property, result) => {
            this[property] = result.module;
            sources[property] = result.source;
        };

        assign("VoiceStateStore", this.resolveStoreCompat("VoiceStateStore", {
            pool,
            keys: [
                ["getVoiceStateForUser", "getAllVoiceStates"],
                ["getUserVoiceChannelId", "getVoiceStateForUser"],
                ["getVoiceStatesForChannel", "getVoiceStateForUser"]
            ],
            validator: (m) => typeof m.getVoiceStateForUser === "function"
                || typeof m.getAllVoiceStates === "function"
                || typeof m.getUserVoiceChannelId === "function",
            hints: ["voice", "state"]
        }));

        assign("SortedVoiceStateStore", this.resolveStoreCompat("SortedVoiceStateStore", {
            pool,
            keys: [["getVoiceStatesForChannel", "getVoiceStatesForChannelAlt"]],
            validator: (m) => typeof m.getVoiceStatesForChannel === "function"
                && (typeof m.getVoiceStatesForChannelAlt === "function" || this.getModuleName(m).toLowerCase().includes("sorted")),
            hints: ["sorted", "voice"]
        }));

        assign("ChannelStore", this.resolveStoreCompat("ChannelStore", {
            pool,
            keys: [["getChannel", "getDMFromUserId"], ["getChannel", "getMutableGuildChannelsForGuild"]],
            validator: (m) => typeof m.getChannel === "function"
                && (typeof m.getDMFromUserId === "function" || typeof m.getMutableGuildChannelsForGuild === "function" || this.getModuleName(m).toLowerCase().includes("channelstore")),
            hints: ["channel", "store"]
        }));

        assign("SelectedChannelStore", this.resolveStoreCompat("SelectedChannelStore", {
            pool,
            keys: [["getVoiceChannelId", "getChannelId"]],
            validator: (m) => typeof m.getVoiceChannelId === "function"
                || (typeof m.getChannelId === "function" && this.getModuleName(m).toLowerCase().includes("selected")),
            hints: ["selected", "channel"]
        }));

        assign("SelectedGuildStore", this.resolveStoreCompat("SelectedGuildStore", {
            pool,
            keys: [["getGuildId", "getLastSelectedGuildId"]],
            validator: (m) => typeof m.getGuildId === "function"
                && (typeof m.getLastSelectedGuildId === "function" || this.getModuleName(m).toLowerCase().includes("selected")),
            hints: ["selected", "guild"]
        }));

        assign("RTCConnectionStore", this.resolveStoreCompat("RTCConnectionStore", {
            pool,
            keys: [["getChannelId", "isConnected"]],
            validator: (m) => typeof m.getChannelId === "function"
                && (typeof m.isConnected === "function" || this.getModuleName(m).toLowerCase().includes("rtc")),
            hints: ["rtc", "connection"]
        }));

        assign("UserStore", this.resolveStoreCompat("UserStore", {
            pool,
            keys: [["getCurrentUser", "getUser"]],
            validator: (m) => typeof m.getCurrentUser === "function" && typeof m.getUser === "function",
            hints: ["user", "store"]
        }));

        assign("GuildMemberStore", this.resolveStoreCompat("GuildMemberStore", {
            pool,
            keys: [["getMember", "getMembers"]],
            validator: (m) => typeof m.getMember === "function",
            hints: ["guild", "member"]
        }));

        const {Webpack} = BdApi;

        // Action non-store : ouverture du profil utilisateur. On privilégie le
        // nom connu puis on scanne les exports par capacité pour survivre aux
        // déplacements de modules Discord.
        let profileActions = null;
        let profileActionsSource = "introuvable";
        const profileAttempts = [
            ["getByKeys(openUserProfileModal)", () => Webpack.getByKeys?.("openUserProfileModal")],
            ["scan openUserProfileModal", () => Webpack.getModule?.((module) => typeof module?.openUserProfileModal === "function")],
            ["scan default.openUserProfileModal", () => Webpack.getModule?.((module) => typeof module?.default?.openUserProfileModal === "function")?.default],
            ["scan profile-modal action", () => Webpack.getModule?.((module) => Boolean(
                module && Object.keys(module).some((key) => typeof module[key] === "function" && /open.*user.*profile.*modal|open.*profile.*modal/i.test(key))
            ))],
            ["scan default profile-modal action", () => Webpack.getModule?.((module) => Boolean(
                module?.default && Object.keys(module.default).some((key) => typeof module.default[key] === "function" && /open.*user.*profile.*modal|open.*profile.*modal/i.test(key))
            ))?.default]
        ];
        for (const [label, read] of profileAttempts) {
            try {
                const candidate = read();
                if (candidate && Object.keys(candidate).some((key) => typeof candidate[key] === "function" && /open.*user.*profile.*modal|open.*profile.*modal/i.test(key))) {
                    profileActions = candidate;
                    profileActionsSource = label;
                    break;
                }
            }
            catch (error) {
                this.debugLog(`${label} a échoué`, error);
            }
        }
        this.UserProfileActions = profileActions;
        sources.UserProfileActions = profileActionsSource;
        let dispatcher = null;
        let dispatcherSource = "introuvable";
        const dispatcherAttempts = [
            ["getByKeys(actionLogger)", () => Webpack.getByKeys?.("actionLogger")],
            ["getByKeys(dispatch,subscribe,unsubscribe)", () => Webpack.getByKeys?.("dispatch", "subscribe", "unsubscribe")],
            ["scan dispatcher", () => Webpack.getModule?.((module) => Boolean(
                module?._actionHandlers
                && typeof module?.dispatch === "function"
                && typeof module?.subscribe === "function"
                && typeof module?.unsubscribe === "function"
            ))],
            ["scan dispatcher.default", () => Webpack.getModule?.((module) => Boolean(
                module?.default?._actionHandlers
                && typeof module?.default?.dispatch === "function"
                && typeof module?.default?.subscribe === "function"
                && typeof module?.default?.unsubscribe === "function"
            ))?.default]
        ];
        for (const [label, read] of dispatcherAttempts) {
            try {
                const candidate = read();
                if (candidate && typeof candidate.subscribe === "function" && typeof candidate.unsubscribe === "function") {
                    dispatcher = candidate;
                    dispatcherSource = label;
                    break;
                }
            }
            catch (error) {
                this.debugLog(`${label} a échoué`, error);
            }
        }
        this.FluxDispatcher = dispatcher;
        sources.FluxDispatcher = dispatcherSource;

        this.compat.generation += 1;
        this.compat.lastResolveAt = Date.now();
        this.compat.moduleSources = sources;
        this.compat.degraded = !this.ChannelStore
            || !this.UserStore
            || (!this.VoiceStateStore && !this.SortedVoiceStateStore);
        this.compat.warnings = [
            !this.ChannelStore ? "ChannelStore absent" : null,
            !this.UserStore ? "UserStore absent" : null,
            (!this.VoiceStateStore && !this.SortedVoiceStateStore) ? "stores vocaux absents" : null,
            !this.SelectedGuildStore ? "SelectedGuildStore absent (ancrage DOM strict limité)" : null,
            !this.UserProfileActions ? "action profil absente (clic profil indisponible)" : null,
            !this.FluxDispatcher ? "FluxDispatcher absent (polling actif)" : null
        ].filter(Boolean);
        this.debugLog(`Résolution compatibilité #${this.compat.generation} (${reason})`, sources);
    }

    bindRuntimeHooks() {
        this.boundVoiceStore = null;
        this.boundSelectedGuildStore = null;
        this.boundSelectedChannelStore = null;
        this.boundFluxDispatcher = null;

        if (typeof this.VoiceStateStore?.addChangeListener === "function") {
            try {
                this.VoiceStateStore.addChangeListener(this.voiceStoreHandler);
                this.boundVoiceStore = this.VoiceStateStore;
            }
            catch (error) {
                this.debugLog("addChangeListener VoiceStateStore indisponible", error);
            }
        }

        if (typeof this.SelectedGuildStore?.addChangeListener === "function") {
            try {
                this.SelectedGuildStore.addChangeListener(this.navigationStoreHandler);
                this.boundSelectedGuildStore = this.SelectedGuildStore;
            }
            catch (error) {
                this.debugLog("addChangeListener SelectedGuildStore indisponible", error);
            }
        }

        if (typeof this.SelectedChannelStore?.addChangeListener === "function") {
            try {
                this.SelectedChannelStore.addChangeListener(this.navigationStoreHandler);
                this.boundSelectedChannelStore = this.SelectedChannelStore;
            }
            catch (error) {
                this.debugLog("addChangeListener SelectedChannelStore indisponible", error);
            }
        }

        if (typeof this.FluxDispatcher?.subscribe === "function") {
            try {
                this.FluxDispatcher.subscribe("VOICE_STATE_UPDATES", this.fluxVoiceHandler);
                this.boundFluxDispatcher = this.FluxDispatcher;
            }
            catch (error) {
                this.debugLog("subscribe VOICE_STATE_UPDATES indisponible", error);
            }
        }
    }

    unbindRuntimeHooks() {
        if (this.boundVoiceStore?.removeChangeListener) {
            try { this.boundVoiceStore.removeChangeListener(this.voiceStoreHandler); }
            catch (error) { this.debugLog("removeChangeListener a échoué", error); }
        }
        if (this.boundSelectedGuildStore?.removeChangeListener) {
            try { this.boundSelectedGuildStore.removeChangeListener(this.navigationStoreHandler); }
            catch (error) { this.debugLog("removeChangeListener SelectedGuildStore a échoué", error); }
        }
        if (this.boundSelectedChannelStore?.removeChangeListener) {
            try { this.boundSelectedChannelStore.removeChangeListener(this.navigationStoreHandler); }
            catch (error) { this.debugLog("removeChangeListener SelectedChannelStore a échoué", error); }
        }
        if (this.boundFluxDispatcher?.unsubscribe) {
            try { this.boundFluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", this.fluxVoiceHandler); }
            catch (error) { this.debugLog("unsubscribe VOICE_STATE_UPDATES a échoué", error); }
        }
        this.boundVoiceStore = null;
        this.boundSelectedGuildStore = null;
        this.boundSelectedChannelStore = null;
        this.boundFluxDispatcher = null;
    }

    compatibilityHealthCheck() {
        if (!this.started) return;
        this.compat.lastHealthAt = Date.now();

        const hardMissing = !this.ChannelStore
            || !this.UserStore
            || (!this.VoiceStateStore && !this.SortedVoiceStateStore);
        const staleResolution = !this.compat.lastResolveAt
            || (Date.now() - this.compat.lastResolveAt >= COMPAT_PERIODIC_RESCAN_MS);
        const repeatedFailures = this.compat.channelFailureStreak >= 3 || this.compat.voiceFailureStreak >= 3;

        if (hardMissing || repeatedFailures || staleResolution) {
            const reason = hardMissing
                ? "module essentiel manquant"
                : repeatedFailures
                    ? `échecs répétés channel=${this.compat.channelFailureStreak} voice=${this.compat.voiceFailureStreak}`
                    : "rescan périodique";
            this.requestCompatibilityRepair(reason);
        }
    }

    requestCompatibilityRepair(reason) {
        if (!this.started || !this.settings.autoRepairCompatibility || this.compatRepairScheduled) return;
        const since = this.compat.lastRepairAt ? Date.now() - this.compat.lastRepairAt : Infinity;
        if (since < COMPAT_REPAIR_COOLDOWN_MS) return;

        this.compatRepairScheduled = true;
        setTimeout(() => {
            this.compatRepairScheduled = false;
            if (this.started) this.repairCompatibility(reason);
        }, 0);
    }

    repairCompatibility(reason = "manuel", force = false) {
        if (!this.started && !force) return;
        const now = Date.now();
        if (!force && this.compat.lastRepairAt && now - this.compat.lastRepairAt < COMPAT_REPAIR_COOLDOWN_MS) return;

        this.unbindRuntimeHooks();
        this.resolveModules(`repair:${reason}`);
        this.bindRuntimeHooks();
        this.compat.lastRepairAt = now;
        this.compat.lastRepairReason = reason;
        this.compat.repairs += 1;
        this.compat.channelFailureStreak = 0;
        this.compat.voiceFailureStreak = 0;

        if (this.started) {
            this.syncVoiceState(true);
            this.scheduleRender();
        }
        this.debugLog(`Auto-réparation effectuée: ${reason}`, this.getCompatibilityStatus());
    }

    getCompatibilityStatus() {
        const formatTime = (value) => value ? new Date(value).toLocaleTimeString() : "jamais";
        return {
            generation: this.compat.generation,
            degraded: this.compat.degraded,
            repairs: this.compat.repairs,
            lastResolveAt: formatTime(this.compat.lastResolveAt),
            lastHealthAt: formatTime(this.compat.lastHealthAt),
            lastRepairAt: formatTime(this.compat.lastRepairAt),
            lastRepairReason: this.compat.lastRepairReason,
            channelFailureStreak: this.compat.channelFailureStreak,
            voiceFailureStreak: this.compat.voiceFailureStreak,
            moduleSources: {...this.compat.moduleSources},
            warnings: [...this.compat.warnings],
            voiceSnapshotAuthoritative: this.lastVoiceUsersAuthoritative,
            voiceSnapshotConfidence: this.lastVoiceUsersConfidence
        };
    }

    loadSettings() {
        let saved = null;
        try {
            saved = this.api.Data.load(SETTINGS_KEY);
        }
        catch (error) {
            console.warn(`[${PLUGIN_NAME}] Impossible de charger les paramètres; valeurs par défaut utilisées.`, error);
        }
        this.settings = saved && typeof saved === "object"
            ? {...DEFAULT_SETTINGS, ...saved}
            : {...DEFAULT_SETTINGS};
        this.normalizeSettings();
    }

    normalizeSettings() {
        this.settings.retentionHours = this.clampNumber(this.settings.retentionHours, 1, 168, 24);
        this.settings.opacity = this.clampNumber(this.settings.opacity, 20, 80, 45);
        this.settings.showBots = Boolean(this.settings.showBots);
        this.settings.persistHistory = Boolean(this.settings.persistHistory);
        this.settings.showRelativeTime = Boolean(this.settings.showRelativeTime);
        this.settings.showSeparator = Boolean(this.settings.showSeparator);
        this.settings.diagnosticToasts = Boolean(this.settings.diagnosticToasts);
        this.settings.debugLogs = Boolean(this.settings.debugLogs);
        this.settings.autoRepairCompatibility = this.settings.autoRepairCompatibility !== false;
        this.settings.sortOrder = this.settings.sortOrder === "oldest" ? "oldest" : "recent";
    }

    clampNumber(value, min, max, fallback) {
        const number = Number(value);
        if (!Number.isFinite(number)) return fallback;
        return Math.min(max, Math.max(min, number));
    }

    saveSettings() {
        try {
            this.api.Data.save(SETTINGS_KEY, this.settings);
        }
        catch (error) {
            console.warn(`[${PLUGIN_NAME}] Impossible d'enregistrer les paramètres.`, error);
        }
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.normalizeSettings();
        this.saveSettings();

        if (key === "persistHistory") {
            if (this.settings.persistHistory) this.saveHistory();
            else {
                try { this.api.Data.delete(HISTORY_KEY); }
                catch (error) { console.warn(`[${PLUGIN_NAME}] Impossible de supprimer l'historique persistant.`, error); }
            }
        }

        if (key === "retentionHours") {
            const changed = this.purgeExpired();
            if (changed) this.saveHistory();
        }

        this.scheduleRender();
    }

    loadHistory() {
        if (!this.settings.persistHistory) {
            this.history = this.emptyHistory();
            return;
        }

        let saved = null;
        try {
            saved = this.api.Data.load(HISTORY_KEY);
        }
        catch (error) {
            console.warn(`[${PLUGIN_NAME}] Impossible de charger l'historique; démarrage avec un historique vide.`, error);
        }
        if (!saved || typeof saved !== "object" || typeof saved.channels !== "object" || Array.isArray(saved.channels)) {
            this.history = this.emptyHistory();
            return;
        }

        // Migration v1/v2 -> v3 : les records utilisateurs restent compatibles.
        this.history = {version: HISTORY_VERSION, channels: saved.channels};
        this.purgeExpired();
    }

    saveHistory() {
        if (!this.settings.persistHistory) return;
        try {
            this.api.Data.save(HISTORY_KEY, this.history);
        }
        catch (error) {
            console.warn(`[${PLUGIN_NAME}] Impossible d'enregistrer l'historique.`, error);
        }
    }

    clearHistory() {
        this.history = this.emptyHistory();
        if (this.settings.persistHistory) this.saveHistory();
        else {
            try { this.api.Data.delete(HISTORY_KEY); }
            catch (error) { console.warn(`[${PLUGIN_NAME}] Impossible de supprimer l'historique.`, error); }
        }
        this.scheduleRender();
    }

    retentionMs() {
        return this.settings.retentionHours * 60 * 60 * 1000;
    }

    purgeExpired() {
        const cutoff = Date.now() - this.retentionMs();
        let changed = false;

        for (const [channelId, channelRecord] of Object.entries(this.history.channels)) {
            if (!channelRecord?.users || typeof channelRecord.users !== "object") {
                delete this.history.channels[channelId];
                changed = true;
                continue;
            }

            for (const [userId, entry] of Object.entries(channelRecord.users)) {
                if (!entry || !Number.isFinite(entry.leftAt) || entry.leftAt < cutoff) {
                    delete channelRecord.users[userId];
                    changed = true;
                }
            }

            if (Object.keys(channelRecord.users).length === 0) {
                delete this.history.channels[channelId];
                changed = true;
            }
        }

        return changed;
    }

    getCurrentUserId() {
        const normalize = (value) => {
            const raw = value?.id ?? value?.userId ?? value?.user_id ?? value;
            const id = raw != null ? String(raw) : "";
            return /^\d{15,22}$/.test(id) ? id : null;
        };

        const stores = [this.UserStore];
        try {
            const fallback = BdApi.Webpack.getByKeys?.("getCurrentUser");
            if (fallback && fallback !== this.UserStore) stores.push(fallback);
        }
        catch {}

        for (const store of stores) {
            const known = this.callReadMethod?.(
                store,
                ["getCurrentUser", "getSelf", "getCurrentUserId", "getSelfUser"],
                [[]],
                (value) => Boolean(normalize(value))
            );
            const knownId = normalize(known?.value);
            if (knownId) return knownId;

            const dynamic = this.getReadableMethodNames?.(store, (name, fn) => {
                const lower = name.toLowerCase();
                return fn.length === 0 && ((lower.includes("current") && lower.includes("user")) || lower.includes("selfuser"));
            }) ?? [];
            const discovered = this.callReadMethod?.(store, dynamic, [[]], (value) => Boolean(normalize(value)));
            const discoveredId = normalize(discovered?.value);
            if (discoveredId) return discoveredId;
        }
        return null;
    }

    getUserById(userId) {
        if (!userId || !this.UserStore) return null;
        const wanted = String(userId);
        const known = this.callReadMethod(
            this.UserStore,
            ["getUser", "getUserById", "findUser"],
            [[wanted]],
            (value) => value && String(value?.id ?? "") === wanted
        );
        if (known?.value) return known.value;

        const dynamic = this.getReadableMethodNames(this.UserStore, (name, fn) => {
            const lower = name.toLowerCase();
            return lower.startsWith("get") && lower.includes("user") && !lower.includes("current") && fn.length <= 1;
        });
        return this.callReadMethod(
            this.UserStore,
            dynamic,
            [[wanted]],
            (value) => value && String(value?.id ?? "") === wanted
        )?.value ?? null;
    }

    getGuildMemberById(guildId, userId) {
        if (!guildId || !userId || !this.GuildMemberStore) return null;
        const guild = String(guildId);
        const user = String(userId);
        const known = this.callReadMethod(
            this.GuildMemberStore,
            ["getMember", "getGuildMember", "getMemberById"],
            [[guild, user], [user, guild]],
            (value) => Boolean(value)
        );
        if (known?.value) return known.value;

        const dynamic = this.getReadableMethodNames(this.GuildMemberStore, (name, fn) => {
            const lower = name.toLowerCase();
            return lower.startsWith("get") && lower.includes("member") && fn.length <= 2;
        });
        return this.callReadMethod(
            this.GuildMemberStore,
            dynamic,
            [[guild, user], [user, guild]],
            (value) => Boolean(value)
        )?.value ?? null;
    }

    getReadableMethodNames(object, matcher = null) {
        if (!object) return [];
        const names = new Set();
        let current = object;
        for (let depth = 0; current && depth < 3; depth++, current = Object.getPrototypeOf(current)) {
            for (const name of Object.getOwnPropertyNames(current)) {
                if (name === "constructor" || names.has(name)) continue;
                let value;
                try { value = object[name]; }
                catch { continue; }
                if (typeof value !== "function") continue;
                if (!/^(get|find|query|select|has|is|count)/i.test(name)) continue;
                if (matcher && !matcher(name, value)) continue;
                names.add(name);
            }
        }
        return [...names];
    }

    callReadMethod(object, names, argVariants = [[]], validator = null) {
        if (!object) return null;
        for (const name of names) {
            const fn = object?.[name];
            if (typeof fn !== "function") continue;
            for (const args of argVariants) {
                try {
                    const value = fn.apply(object, args);
                    if (!validator || validator(value)) return {value, method: name};
                }
                catch (error) {
                    this.debugLog(`${this.getModuleName(object)}.${name}(${args.length}) indisponible`, error);
                }
            }
        }
        return null;
    }

    normalizeChannelCandidate(value) {
        const raw = value?.channelId ?? value?.channel_id ?? value?.id ?? value;
        if (raw == null) return null;
        const id = String(raw);
        if (!/^\d{15,22}$/.test(id)) return null;

        const channel = this.getChannel(id);
        if (!channel) return id;
        const type = Number(channel?.type);
        const vocalByMethod = Boolean(
            channel?.isGuildVocal?.()
            || channel?.isVoice?.()
            || channel?.isStageVoice?.()
        );
        if (vocalByMethod || type === 2 || type === 13) return id;
        return null;
    }

    getSelectedGuildId() {
        const direct = this.callReadMethod(
            this.SelectedGuildStore,
            ["getGuildId", "getSelectedGuildId"],
            [[]],
            (value) => value == null || /^\d{15,22}$/.test(String(value))
        );
        if (direct?.value) return String(direct.value);

        // Fallback : déduire le serveur depuis le canal texte actuellement
        // sélectionné. En DM le canal n'a pas de guildId => null.
        const selected = this.callReadMethod(
            this.SelectedChannelStore,
            ["getCurrentlySelectedChannelId", "getChannelId", "getLastSelectedChannelId"],
            [[]],
            (value) => value == null || /^\d{15,22}$/.test(String(value))
        );
        const selectedChannel = selected?.value ? this.getChannel(String(selected.value)) : null;
        try {
            return selectedChannel?.guild_id ?? selectedChannel?.guildId ?? selectedChannel?.getGuildId?.() ?? null;
        }
        catch {
            return selectedChannel?.guild_id ?? selectedChannel?.guildId ?? null;
        }
    }

    isTrackedGuildCurrentlyVisible() {
        if (!this.currentChannelId || !this.currentGuildId) return false;
        const selectedGuildId = this.getSelectedGuildId();
        return Boolean(selectedGuildId && String(selectedGuildId) === String(this.currentGuildId));
    }

    onNavigationContextChanged() {
        if (!this.started) return;

        // La connexion vocale reste active lorsqu'on visite un autre serveur
        // ou les DM. Dans ce contexte la vraie liste du salon suivi n'est plus
        // affichée : VoiceHistory se masque au lieu de migrer près du panneau
        // « Voice Connected » ou du profil local.
        if (!this.isTrackedGuildCurrentlyVisible()) {
            this.closeHistoryPopover();
            this.removeRenderedLists();
            this.lastRenderMode = "masqué-navigation";
            this.lastTargetDetails = "serveur vocal suivi non affiché";
            return;
        }

        this.scheduleRender();
    }

    getProfileActionMethods() {
        if (!this.UserProfileActions) return [];
        const preferred = ["openUserProfileModal", "openUserProfile", "openProfileModal"];
        const dynamic = Object.keys(this.UserProfileActions).filter((key) => (
            typeof this.UserProfileActions[key] === "function"
            && /open.*user.*profile.*modal|open.*profile.*modal/i.test(key)
        ));
        return [...new Set([...preferred, ...dynamic])].filter((name) => typeof this.UserProfileActions?.[name] === "function");
    }

    openUserProfile(userId) {
        const id = String(userId ?? "");
        if (!/^\d{15,22}$/.test(id)) return false;

        if (!this.UserProfileActions) {
            this.repairCompatibility("action profil utilisateur introuvable", true);
        }

        const methods = this.getProfileActionMethods();
        const payload = {
            userId: id,
            guildId: this.currentGuildId ?? undefined,
            channelId: this.currentChannelId ?? undefined
        };

        for (const method of methods) {
            try {
                this.UserProfileActions[method](payload);
                this.debugLog("Profil utilisateur ouvert", {userId: id, method});
                return true;
            }
            catch (error) {
                this.debugLog(`Ouverture profil via ${method} impossible`, error);
            }
        }

        BdApi.UI.showToast("VoiceHistory: impossible d'ouvrir ce profil sur ce build Discord.", {type: "warning", timeout: 3500});
        return false;
    }

    makeProfileClickable(element, userId) {
        const id = String(userId ?? "");
        if (!(element instanceof HTMLElement) || !/^\d{15,22}$/.test(id)) return;

        element.dataset.voiceHistoryUserId = id;
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");

        const activate = (event) => {
            if (event?.target?.closest?.(".vh-history-button")) return;
            event?.preventDefault?.();
            event?.stopPropagation?.();

            // Fermer d'abord l'historique : le modal de profil Discord doit
            // toujours passer au premier plan sans conserver notre popover
            // au-dessus de lui.
            this.closeHistoryPopover();
            this.openUserProfile(id);
        };
        element.addEventListener("click", activate);
        element.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            activate(event);
        });
    }

    getCurrentVoiceChannelId() {
        const me = this.getCurrentUserId();
        const attempts = [];
        const addMethods = (label, store, names, args = [[]], validator = (value) => value != null) => {
            attempts.push([label, () => this.callReadMethod(store, names, args, validator)]);
        };

        addMethods(
            "VoiceStateStore",
            this.VoiceStateStore,
            ["getCurrentClientVoiceChannelId", "getCurrentVoiceChannelId", "getCurrentVoiceChannel"],
            [[]]
        );
        addMethods(
            "SelectedChannelStore",
            this.SelectedChannelStore,
            ["getVoiceChannelId", "getSelectedVoiceChannelId", "getVoiceChannel"],
            [[]]
        );
        addMethods(
            "RTCConnectionStore",
            this.RTCConnectionStore,
            ["getChannelId", "getVoiceChannelId", "getChannel"],
            [[]]
        );
        if (me) {
            addMethods(
                "VoiceStateStore(self)",
                this.VoiceStateStore,
                ["getUserVoiceChannelId", "getVoiceChannelIdForUser", "getVoiceStateForUser"],
                [[me]]
            );
        }

        // Si un nom de fonction change mais reste descriptif, on découvre
        // automatiquement les getters contenant voice/channel.
        for (const [label, store] of [
            ["VoiceStateStore:auto", this.VoiceStateStore],
            ["SelectedChannelStore:auto", this.SelectedChannelStore],
            ["RTCConnectionStore:auto", this.RTCConnectionStore]
        ]) {
            const dynamic = this.getReadableMethodNames(store, (name, fn) => {
                const lower = name.toLowerCase();
                return lower.includes("channel") && (lower.includes("voice") || lower.includes("rtc")) && fn.length <= 1;
            });
            if (dynamic.length) addMethods(label, store, dynamic, me ? [[], [me]] : [[]]);
        }

        for (const [sourcePrefix, read] of attempts) {
            try {
                const result = read();
                if (!result) continue;
                const id = this.normalizeChannelCandidate(
                    result.method.toLowerCase().includes("voicestate") || result.method.toLowerCase().includes("stateforuser")
                        ? (this.getStateChannelId(result.value) ?? result.value)
                        : result.value
                );
                if (id) {
                    this.lastChannelSource = `${sourcePrefix}.${result.method}`;
                    this.lastGoodChannelAt = Date.now();
                    this.channelNullSince = null;
                    this.compat.channelFailureStreak = 0;
                    return id;
                }
            }
            catch (error) {
                this.debugLog(`${sourcePrefix} indisponible`, error);
            }
        }

        this.compat.channelFailureStreak += 1;
        if (!this.channelNullSince) this.channelNullSince = Date.now();
        if (this.compat.channelFailureStreak >= 3) this.requestCompatibilityRepair("canal vocal introuvable");

        // Garde de 5 s contre les null transitoires pendant les reconnects ou
        // le remplacement à chaud des stores Discord. On ne change jamais de
        // salon sur un null unique.
        if (this.currentChannelId && Date.now() - this.channelNullSince < CHANNEL_NULL_GRACE_MS) {
            this.lastChannelSource = `grâce anti-null (${Math.ceil((CHANNEL_NULL_GRACE_MS - (Date.now() - this.channelNullSince)) / 1000)}s)`;
            return this.currentChannelId;
        }

        this.lastChannelSource = "aucune source valide";
        return null;
    }

    getChannel(channelId) {
        if (!channelId || !this.ChannelStore) return null;
        const wanted = String(channelId);
        const result = this.callReadMethod(
            this.ChannelStore,
            ["getChannel", "getChannelById"],
            [[wanted]],
            (value) => !value || String(value?.id ?? wanted) === wanted
        );
        if (result?.value) return result.value;

        const dynamic = this.getReadableMethodNames(this.ChannelStore, (name, fn) => {
            const lower = name.toLowerCase();
            return lower.startsWith("get") && lower.includes("channel") && fn.length <= 1;
        });
        const fallback = this.callReadMethod(
            this.ChannelStore,
            dynamic,
            [[wanted]],
            (value) => value && String(value?.id ?? "") === wanted
        );
        return fallback?.value ?? null;
    }

    getGuildIdForChannel(channelId) {
        const channel = this.getChannel(channelId);
        try {
            return channel?.guild_id ?? channel?.guildId ?? channel?.getGuildId?.() ?? null;
        }
        catch {
            return channel?.guild_id ?? channel?.guildId ?? null;
        }
    }

    getStateUserId(state, fallback = null) {
        if (!state || typeof state !== "object") return fallback ? String(fallback) : null;
        const value = state.userId
            ?? state.user_id
            ?? state.user?.id
            ?? state.member?.user?.id
            ?? state.voiceState?.userId
            ?? state.voiceState?.user_id
            ?? state.voiceState?.user?.id
            ?? fallback;
        return value != null ? String(value) : null;
    }

    getStateChannelId(state) {
        if (!state || typeof state !== "object") return null;
        const value = state.channelId
            ?? state.channel_id
            ?? state.channel?.id
            ?? state.voiceState?.channelId
            ?? state.voiceState?.channel_id
            ?? state.voiceState?.channel?.id
            ?? null;
        return value != null ? String(value) : null;
    }

    getStateChannelUpdate(state) {
        if (!state || typeof state !== "object") return {present: false, channelId: null};
        const own = (object, key) => object && Object.prototype.hasOwnProperty.call(object, key);

        if (own(state, "channelId")) {
            return {present: true, channelId: state.channelId != null ? String(state.channelId) : null};
        }
        if (own(state, "channel_id")) {
            return {present: true, channelId: state.channel_id != null ? String(state.channel_id) : null};
        }
        if (own(state, "channel")) {
            return {present: true, channelId: state.channel?.id != null ? String(state.channel.id) : null};
        }
        if (state.voiceState && typeof state.voiceState === "object") {
            return this.getStateChannelUpdate(state.voiceState);
        }
        return {present: false, channelId: null};
    }

    extractVoiceUserIds(value, channelId, {strictChannel = false} = {}) {
        const wantedChannel = String(channelId);
        const result = new Set();
        const visited = new WeakSet();
        const snowflake = (v) => /^\d{15,22}$/.test(String(v ?? ""));

        const visit = (node, keyHint = null, depth = 0) => {
            if (node == null || depth > 7) return;

            if (Array.isArray(node)) {
                for (const item of node) visit(item, null, depth + 1);
                return;
            }
            if (node instanceof Map) {
                for (const [key, item] of node.entries()) visit(item, key, depth + 1);
                return;
            }
            if (node instanceof Set) {
                for (const item of node.values()) visit(item, null, depth + 1);
                return;
            }
            if (typeof node !== "object") return;
            if (visited.has(node)) return;
            visited.add(node);

            const userId = this.getStateUserId(node, snowflake(keyHint) ? keyHint : null);
            const stateChannelId = this.getStateChannelId(node);
            const channelMatches = strictChannel
                ? stateChannelId === wantedChannel
                : (!stateChannelId || stateChannelId === wantedChannel);

            if (userId && channelMatches) result.add(String(userId));

            for (const [key, child] of Object.entries(node)) {
                if (child && typeof child === "object") visit(child, key, depth + 1);
            }
        };

        visit(value);
        return result;
    }

    isVoiceSnapshotConfident(ids, channelId) {
        if (!(ids instanceof Set)) return false;
        const me = this.getCurrentUserId();
        if (!me) return ids.size > 0;
        if (String(channelId) !== String(this.currentChannelId ?? channelId)) return ids.size > 0;
        return ids.has(String(me));
    }

    extractUserIdsFromReactValue(value, result, excluded, depth = 0, visited = new WeakSet()) {
        if (value == null || depth > 5) return;
        if (Array.isArray(value)) {
            for (const item of value) this.extractUserIdsFromReactValue(item, result, excluded, depth + 1, visited);
            return;
        }
        if (typeof value !== "object") return;
        if (visited.has(value)) return;
        visited.add(value);

        const candidates = [
            value.userId,
            value.user_id,
            value?.user?.id,
            value?.member?.user?.id,
            value?.voiceState?.userId,
            value?.voiceState?.user_id,
            value?.voiceState?.user?.id
        ];
        for (const candidate of candidates) {
            const id = candidate != null ? String(candidate) : "";
            if (/^\d{15,22}$/.test(id) && !excluded.has(id)) result.add(id);
        }

        // Ne parcourir que des propriétés React/props plausibles pour éviter
        // de remonter accidentellement tout l'arbre de l'application.
        const keys = ["memoizedProps", "pendingProps", "props", "children", "child", "sibling"];
        for (const key of keys) {
            let child;
            try { child = value[key]; }
            catch { child = null; }
            if (child && typeof child === "object") {
                this.extractUserIdsFromReactValue(child, result, excluded, depth + 1, visited);
            }
        }
    }

    getDomVoiceUserIds(channelId) {
        const result = new Set();
        const channelElement = this.findChannelElement?.(channelId, this.getGuildIdForChannel(channelId));
        const channelItem = channelElement ? this.findChannelListItem?.(channelElement) : null;
        if (!(channelItem instanceof Element)) return result;

        const excluded = new Set([
            String(channelId),
            String(this.getGuildIdForChannel(channelId) ?? "")
        ]);
        const addSnowflakes = (raw) => {
            for (const match of String(raw ?? "").matchAll(/\d{15,22}/g)) {
                const id = String(match[0]);
                if (!excluded.has(id)) result.add(id);
            }
        };

        const nodes = [channelItem, ...channelItem.querySelectorAll("[data-user-id], [data-list-item-id], [data-member-id]")];
        for (const node of nodes) {
            addSnowflakes(node.getAttribute?.("data-user-id"));
            addSnowflakes(node.getAttribute?.("data-member-id"));
            addSnowflakes(node.getAttribute?.("data-list-item-id"));
        }

        // Dernier secours : extraire les userId des props React exposées par
        // BetterDiscord. Utilisé seulement quand les stores ciblés ont cassé.
        try {
            const ReactUtils = BdApi.ReactUtils;
            if (ReactUtils?.getInternalInstance) {
                const sample = [channelItem, ...channelItem.querySelectorAll("[data-list-item-id], [data-user-id], img, span")].slice(0, 120);
                for (const node of sample) {
                    const fiber = ReactUtils.getInternalInstance(node);
                    if (fiber) this.extractUserIdsFromReactValue(fiber, result, excluded);
                }
            }
        }
        catch (error) {
            this.debugLog("Fallback React voice users indisponible", error);
        }

        // Quand UserStore est disponible, éliminer les snowflakes qui ne sont
        // manifestement pas des utilisateurs (channel/message ids, etc.).
        if (this.UserStore) {
            for (const id of [...result]) {
                try {
                    if (!this.getUserById(id)) result.delete(id);
                }
                catch {
                    // En cas de changement de signature UserStore, garder l'id.
                }
            }
        }
        return result;
    }

    getVoiceUserIds(channelId) {
        this.lastVoiceUsersAuthoritative = false;
        this.lastVoiceUsersConfidence = "aucune";
        if (!channelId) return new Set();

        const wanted = String(channelId);
        const channel = this.getChannel(wanted);
        const targetedAttempts = [];
        const addTargeted = (label, store, names, variants) => {
            if (!store) return;
            targetedAttempts.push([label, store, names, variants]);
        };

        addTargeted(
            "SortedVoiceStateStore",
            this.SortedVoiceStateStore,
            ["getVoiceStatesForChannel", "getVoiceStatesForChannelAlt", "getStatesForChannel"],
            channel ? [[channel], [wanted]] : [[wanted]]
        );
        addTargeted(
            "VoiceStateStore",
            this.VoiceStateStore,
            ["getVoiceStatesForChannel", "getStatesForChannel", "getChannelVoiceStates"],
            channel ? [[wanted], [channel]] : [[wanted]]
        );

        // Découverte automatique des getters si Discord renomme la méthode
        // tout en gardant un nom descriptif.
        for (const [label, store] of [
            ["SortedVoiceStateStore:auto", this.SortedVoiceStateStore],
            ["VoiceStateStore:auto", this.VoiceStateStore]
        ]) {
            const dynamic = this.getReadableMethodNames(store, (name, fn) => {
                const lower = name.toLowerCase();
                return lower.includes("channel")
                    && (lower.includes("voice") || lower.includes("state"))
                    && fn.length <= 2;
            });
            if (dynamic.length) addTargeted(label, store, dynamic, channel ? [[channel], [wanted]] : [[wanted]]);
        }

        let lowConfidence = null;
        for (const [label, store, names, variants] of targetedAttempts) {
            for (const name of names) {
                const fn = store?.[name];
                if (typeof fn !== "function") continue;
                for (const args of variants) {
                    try {
                        const value = fn.apply(store, args);
                        if (value === undefined || value === null) continue;
                        const ids = this.extractVoiceUserIds(value, wanted);
                        const confident = this.isVoiceSnapshotConfident(ids, wanted);
                        const source = `${label}.${name}(${args[0] === channel ? "channel" : "id"})`;
                        if (confident) {
                            this.lastVoiceUsersSource = `${source} (${ids.size}) [autoritaire]`;
                            this.lastVoiceUsersAuthoritative = true;
                            this.lastVoiceUsersConfidence = "haute";
                            this.lastActiveCount = ids.size;
                            this.compat.voiceFailureStreak = 0;
                            return ids;
                        }
                        if (!lowConfidence || ids.size > lowConfidence.ids.size) lowConfidence = {ids, source};
                    }
                    catch (error) {
                        this.debugLog(`${label}.${name} indisponible`, error);
                    }
                }
            }
        }

        // Fallback global sécurisé : contrairement aux premières versions du
        // plugin, un état global n'est accepté QUE si son channelId correspond
        // explicitement au salon suivi.
        const globalMethods = ["getAllVoiceStates", "getVoiceStates", "getAllStates"];
        for (const name of globalMethods) {
            const fn = this.VoiceStateStore?.[name];
            if (typeof fn !== "function") continue;
            try {
                const value = fn.call(this.VoiceStateStore);
                const ids = this.extractVoiceUserIds(value, wanted, {strictChannel: true});
                if (this.isVoiceSnapshotConfident(ids, wanted)) {
                    this.lastVoiceUsersSource = `VoiceStateStore.${name}() strict (${ids.size}) [autoritaire]`;
                    this.lastVoiceUsersAuthoritative = true;
                    this.lastVoiceUsersConfidence = "haute/global-strict";
                    this.lastActiveCount = ids.size;
                    this.compat.voiceFailureStreak = 0;
                    return ids;
                }
                if (!lowConfidence || ids.size > lowConfidence.ids.size) lowConfidence = {ids, source: `VoiceStateStore.${name}() strict`};
            }
            catch (error) {
                this.debugLog(`VoiceStateStore.${name} global indisponible`, error);
            }
        }

        const domIds = this.getDomVoiceUserIds(wanted);
        if (domIds.size > 0 && this.isVoiceSnapshotConfident(domIds, wanted)) {
            this.lastVoiceUsersSource = `DOM/React (${domIds.size}) [fallback autoritaire]`;
            this.lastVoiceUsersAuthoritative = true;
            this.lastVoiceUsersConfidence = "moyenne/dom-react";
            this.lastActiveCount = domIds.size;
            this.compat.voiceFailureStreak = 0;
            return domIds;
        }
        if (domIds.size > 0 && (!lowConfidence || domIds.size > lowConfidence.ids.size)) {
            lowConfidence = {ids: domIds, source: "DOM/React"};
        }

        // Cache Flux en dernier recours. Il sert à conserver une continuité
        // mais n'est jamais autorisé à générer des départs à lui seul.
        const fluxFallback = new Set();
        for (const [userId, knownChannelId] of this.lastKnownChannelByUser.entries()) {
            if (knownChannelId === wanted) fluxFallback.add(String(userId));
        }
        if (fluxFallback.size > 0 && (!lowConfidence || fluxFallback.size > lowConfidence.ids.size)) {
            lowConfidence = {ids: fluxFallback, source: "cache événements Flux"};
        }

        const fallback = lowConfidence?.ids ?? new Set();
        this.lastVoiceUsersSource = `${lowConfidence?.source ?? "aucune source"} (${fallback.size}) [non autoritaire]`;
        this.lastVoiceUsersAuthoritative = false;
        this.lastVoiceUsersConfidence = fallback.size ? "faible" : "aucune";
        this.lastActiveCount = fallback.size;
        this.compat.voiceFailureStreak += 1;
        if (this.compat.voiceFailureStreak >= 3) this.requestCompatibilityRepair("snapshot vocal non autoritaire");
        return fallback;
    }

    onVoiceStateUpdates(event) {
        if (!this.started) return;
        this.lastVoiceEventAt = Date.now();

        try {
            const raw = event?.voiceStates ?? event?.voice_states ?? event?.states ?? [];
            const updates = Array.isArray(raw) ? raw : Object.values(raw || {});
            const currentUserId = this.getCurrentUserId();

            for (const state of updates) {
                const userId = this.getStateUserId(state);
                if (!userId) continue;

                const channelUpdate = this.getStateChannelUpdate(state);
                // Une mise à jour sans champ de salon explicite peut être un
                // mute/deaf/stream ou un changement de structure Discord. Elle
                // ne doit jamais être interprétée comme un départ.
                if (!channelUpdate.present) continue;
                const nextChannelId = channelUpdate.channelId;
                const previousKnown = this.lastKnownChannelByUser.get(userId) ?? null;
                this.lastKnownChannelByUser.set(userId, nextChannelId);

                if (userId === currentUserId) {
                    if ((nextChannelId ?? null) !== (this.currentChannelId ?? null)) {
                        this.lastChannelSource = "VOICE_STATE_UPDATES(self)";
                        this.switchTrackedChannel(nextChannelId);
                    }
                    continue;
                }
                if (!this.currentChannelId) continue;

                const tracked = String(this.currentChannelId);
                const wasTracked = this.activeSnapshot.has(userId) || previousKnown === tracked;
                const isTracked = nextChannelId === tracked;

                if (wasTracked && !isTracked) {
                    this.clearPendingDeparture(tracked, userId);
                    const changed = this.markUserLeft(tracked, this.currentGuildId, userId);
                    this.activeSnapshot.delete(userId);
                    if (changed) this.saveHistory();
                }
                else if (isTracked) {
                    this.clearPendingDeparture(tracked, userId);
                    this.activeSnapshot.add(userId);
                    if (this.removeHistoricalUser(tracked, userId)) this.saveHistory();
                }
            }
        }
        catch (error) {
            console.error(`[${PLUGIN_NAME}] Erreur VOICE_STATE_UPDATES`, error, event);
        }

        // Le dispatcher peut s'exécuter pendant la mutation des stores : réconciliation juste après.
        setTimeout(() => this.syncVoiceState(), 0);
        setTimeout(() => this.syncVoiceState(), 250);
    }

    pendingDepartureKey(channelId, userId) {
        return `${String(channelId)}:${String(userId)}`;
    }

    clearPendingDeparture(channelId, userId) {
        this.pendingDepartures.delete(this.pendingDepartureKey(channelId, userId));
    }

    confirmPendingDeparture(channelId, userId) {
        const key = this.pendingDepartureKey(channelId, userId);
        const now = Date.now();
        const pending = this.pendingDepartures.get(key);
        if (!pending) {
            this.pendingDepartures.set(key, {firstMissingAt: now, confirmations: 1});
            return false;
        }
        pending.confirmations += 1;
        const confirmed = pending.confirmations >= DEPARTURE_CONFIRM_COUNT
            && now - pending.firstMissingAt >= DEPARTURE_CONFIRM_MS;
        if (confirmed) this.pendingDepartures.delete(key);
        return confirmed;
    }

    syncVoiceState(force = false) {
        if (!this.started) return;
        this.lastSyncAt = Date.now();

        const nextChannelId = this.getCurrentVoiceChannelId();
        if (force || nextChannelId !== this.currentChannelId) {
            this.switchTrackedChannel(nextChannelId);
            return;
        }
        if (!nextChannelId) return;

        const nextActive = this.getVoiceUserIds(nextChannelId);
        const authoritative = this.lastVoiceUsersAuthoritative;
        const currentUserId = this.getCurrentUserId();
        const previousActive = new Set(this.activeSnapshot);
        const nextSnapshot = authoritative ? new Set(nextActive) : new Set([...previousActive, ...nextActive]);
        let changed = false;

        // Les arrivées sont sans risque : même un fallback partiel peut confirmer
        // qu'un utilisateur est bien là. Toute présence annule un départ pending.
        for (const userId of nextActive) {
            this.clearPendingDeparture(nextChannelId, userId);
            this.lastKnownChannelByUser.set(userId, String(nextChannelId));
            if (!previousActive.has(userId)) {
                this.lastJoinAt = Date.now();
                let user = null;
                let member = null;
                try { user = this.getUserById(userId); } catch {}
                try { member = this.currentGuildId ? this.getGuildMemberById(this.currentGuildId, userId) : null; } catch {}
                const displayName = member?.nick || user?.globalName || user?.displayName || user?.username || String(userId);
                this.debugLog("Arrivée détectée", {
                    channelId: String(nextChannelId),
                    userId: String(userId),
                    displayName,
                    activeBefore: previousActive.size,
                    activeAfter: nextActive.size
                });
                changed = this.removeHistoricalUser(nextChannelId, userId) || changed;
            }
            else {
                // Même si l'utilisateur était encore conservé dans un snapshot
                // de sécurité, son retour doit supprimer une éventuelle entrée.
                changed = this.removeHistoricalUser(nextChannelId, userId) || changed;
            }
        }

        if (authoritative) {
            for (const userId of previousActive) {
                if (userId === currentUserId) continue;
                if (nextActive.has(userId)) continue;

                // Deux lectures cohérentes espacées sont nécessaires avant de
                // conclure à un départ. Pendant ce délai l'utilisateur reste
                // dans activeSnapshot, ce qui permet la seconde confirmation.
                if (!this.confirmPendingDeparture(nextChannelId, userId)) {
                    nextSnapshot.add(userId);
                    continue;
                }

                this.lastKnownChannelByUser.delete(userId);
                changed = this.markUserLeft(nextChannelId, this.currentGuildId, userId) || changed;
            }
        }
        else {
            // Snapshot douteux = interdiction absolue de fabriquer des départs.
            // On conserve l'ancien état jusqu'à ce qu'une source fiable revienne.
            this.debugLog("Snapshot vocal non autoritaire: départs suspendus", {
                source: this.lastVoiceUsersSource,
                previous: previousActive.size,
                observed: nextActive.size
            });
        }

        if (previousActive.size !== nextSnapshot.size) {
            this.debugLog("Snapshot vocal", {
                channelId: String(nextChannelId),
                before: previousActive.size,
                after: nextSnapshot.size,
                observed: nextActive.size,
                authoritative,
                source: this.lastVoiceUsersSource
            });
        }

        this.activeSnapshot = nextSnapshot;
        if (changed) {
            this.saveHistory();
            this.scheduleRender();
        }
    }

    switchTrackedChannel(nextChannelId) {
        const normalizedNext = nextChannelId ? String(nextChannelId) : null;
        if (normalizedNext !== this.currentChannelId) {
            this.closeHistoryPopover();
            this.pendingDepartures.clear();
        }

        this.currentChannelId = normalizedNext;
        this.currentGuildId = this.currentChannelId ? this.getGuildIdForChannel(this.currentChannelId) : null;
        this.activeSnapshot = this.currentChannelId ? this.getVoiceUserIds(this.currentChannelId) : new Set();

        let changed = false;
        if (this.currentChannelId) {
            for (const userId of this.activeSnapshot) {
                this.lastKnownChannelByUser.set(userId, this.currentChannelId);
                changed = this.removeHistoricalUser(this.currentChannelId, userId) || changed;
            }
        }

        if (changed) this.saveHistory();
        this.scheduleRender();
        this.debugLog("Salon suivi", {
            channelId: this.currentChannelId,
            guildId: this.currentGuildId,
            activeUsers: [...this.activeSnapshot],
            source: this.lastChannelSource,
            voiceSource: this.lastVoiceUsersSource
        });
    }

    ensureChannelRecord(channelId, guildId) {
        if (!this.history.channels[channelId]) {
            this.history.channels[channelId] = {
                guildId: guildId ?? null,
                updatedAt: Date.now(),
                users: {}
            };
        }

        const record = this.history.channels[channelId];
        record.guildId = guildId ?? record.guildId ?? null;
        record.updatedAt = Date.now();
        if (!record.users || typeof record.users !== "object") record.users = {};
        return record;
    }

    markUserLeft(channelId, guildId, userId) {
        if (!userId || userId === this.getCurrentUserId()) return false;

        let user = null;
        try {
            user = this.getUserById(userId);
        }
        catch {
            user = null;
        }

        const member = guildId ? this.getGuildMemberById(guildId, userId) : null;
        const displayName = member?.nick
            || user?.globalName
            || user?.displayName
            || user?.username
            || `Utilisateur ${userId}`;
        const username = user?.username || displayName;

        const record = this.ensureChannelRecord(channelId, guildId);
        record.users[userId] = {
            userId: String(userId),
            username,
            displayName,
            avatarUrl: user ? this.getAvatarUrl(user, guildId) : null,
            bot: Boolean(user?.bot),
            leftAt: Date.now()
        };

        this.lastDepartureAt = Date.now();
        this.debugLog("Départ détecté", {channelId, userId, displayName});

        if (this.settings.diagnosticToasts) {
            BdApi.UI.showToast(`VoiceHistory: ${displayName} a quitté le vocal`, {type: "info", timeout: 3500});
        }

        this.scheduleRender();
        return true;
    }

    removeHistoricalUser(channelId, userId) {
        const record = this.history.channels[channelId];
        if (!record?.users?.[userId]) return false;

        delete record.users[userId];
        record.updatedAt = Date.now();
        if (Object.keys(record.users).length === 0) delete this.history.channels[channelId];
        this.scheduleRender();
        return true;
    }

    getAvatarUrl(user, guildId) {
        try {
            if (typeof user?.getAvatarURL === "function") {
                return user.getAvatarURL(guildId, 64, true)
                    || user.getAvatarURL(null, 64, true)
                    || null;
            }
        }
        catch {
            // fallback CDN
        }

        if (user?.id && user?.avatar) {
            const extension = String(user.avatar).startsWith("a_") ? "gif" : "png";
            return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=64`;
        }
        return null;
    }

    getRecentUsersForCurrentChannel() {
        if (!this.currentChannelId) return [];
        const record = this.history.channels[this.currentChannelId];
        if (!record?.users) return [];

        const cutoff = Date.now() - this.retentionMs();
        // Le rendu ne relit pas les internals Discord : il se base sur le
        // snapshot suivi, déjà validé par la couche de compatibilité.
        const active = new Set(this.activeSnapshot);
        const users = Object.values(record.users).filter((entry) => {
            if (!entry || !Number.isFinite(entry.leftAt)) return false;
            if (entry.leftAt < cutoff) return false;
            if (active.has(String(entry.userId))) return false;
            if (!this.settings.showBots && entry.bot) return false;
            return true;
        });

        users.sort((a, b) => this.settings.sortOrder === "oldest"
            ? a.leftAt - b.leftAt
            : b.leftAt - a.leftAt);
        return users;
    }

    formatRelative(timestamp) {
        const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
        if (seconds < 10) return "à l'instant";
        if (seconds < 60) {
            const bucket = Math.floor(seconds / 10) * 10;
            return `il y a ${bucket} s`;
        }
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `il y a ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `il y a ${hours} h`;
        return `il y a ${Math.floor(hours / 24)} j`;
    }

    formatExact(timestamp) {
        try {
            return new Intl.DateTimeFormat("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }).format(new Date(timestamp));
        }
        catch {
            return new Date(timestamp).toLocaleTimeString();
        }
    }

    startDomObserver() {
        if (!document.body) return;
        this.domObserver = new MutationObserver((records) => {
            if (this.isRendering) return;

            const relevant = records.some((record) => {
                const nodes = [...record.addedNodes, ...record.removedNodes].filter((node) => node?.nodeType === Node.ELEMENT_NODE);
                if (nodes.length > 0 && nodes.every((node) => node.matches?.(".vh-recent-list, .vh-debug-overlay, .vh-history-popover") || node.closest?.(".vh-recent-list, .vh-debug-overlay, .vh-history-popover"))) {
                    return false;
                }
                const target = record.target?.nodeType === Node.ELEMENT_NODE
                    ? record.target
                    : record.target?.parentElement;
                if (target?.closest?.(".vh-recent-list, .vh-debug-overlay, .vh-history-popover")) return false;
                return true;
            });
            if (!relevant || !this.currentChannelId) return;

            const hasRecentUsers = this.getRecentUsersForCurrentChannel().length > 0;
            const hasRenderedList = [...document.querySelectorAll(".vh-recent-list")].some(
                (node) => node.dataset.voiceHistoryChannel === String(this.currentChannelId)
            );

            // Quand on visite un autre serveur ou les DM, Discord conserve la
            // connexion vocale en bas de la sidebar. On retire notre bloc : il
            // ne doit jamais s'accrocher à ce panneau ou au profil local.
            if (!this.isTrackedGuildCurrentlyVisible()) {
                if (hasRenderedList) {
                    this.closeHistoryPopover();
                    this.removeRenderedLists();
                }
                return;
            }

            // Discord reconstruit parfois la liste des salons. On ne rerend que
            // si notre bloc a réellement disparu, pas à chaque mutation du DOM.
            if (hasRecentUsers && !hasRenderedList) this.scheduleRender();
        });
        this.domObserver.observe(document.body, {childList: true, subtree: true});
    }

    scheduleRender() {
        if (!this.started) return;
        if (this.renderTimer) clearTimeout(this.renderTimer);
        this.renderTimer = setTimeout(() => {
            this.renderTimer = null;
            this.renderRecentUsers();
        }, 120);
    }

    removeRenderedLists() {
        document.querySelectorAll(".vh-recent-list, .vh-debug-overlay").forEach((node) => node.remove());
    }

    isVisibleElement(element) {
        if (!(element instanceof Element)) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (rect.bottom < 0 || rect.top > window.innerHeight) return false;
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) !== 0;
    }

    findVisibleTextElements(text, {leftOnly = true} = {}) {
        const wanted = String(text ?? "").trim();
        if (!wanted) return [];

        const result = [];
        const nodes = document.querySelectorAll("span, div, strong, p");
        for (const node of nodes) {
            if (!this.isVisibleElement(node)) continue;
            const value = String(node.textContent ?? "").trim();
            if (value !== wanted) continue;

            const rect = node.getBoundingClientRect();
            if (leftOnly && rect.left > 460) continue;
            result.push(node);
        }

        result.sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            const aa = ar.width * ar.height;
            const ba = br.width * br.height;
            return aa - ba || ar.left - br.left;
        });
        return result;
    }

    getChannelName(channelId) {
        const channel = this.getChannel(channelId);
        return channel?.name ? String(channel.name) : null;
    }

    getDisplayNameForUser(userId) {
        let user = null;
        try {
            user = this.getUserById(userId);
        }
        catch {
            user = null;
        }
        const member = this.currentGuildId ? this.getGuildMemberById(this.currentGuildId, userId) : null;
        return member?.nick || user?.globalName || user?.displayName || user?.username || null;
    }

    normalizeSidebarRow(element) {
        if (!element) return null;
        let current = element;
        let best = null;

        for (let depth = 0; current && depth < 8; depth++, current = current.parentElement) {
            if (!this.isVisibleElement(current)) continue;
            const rect = current.getBoundingClientRect();
            const parent = current.parentElement;
            if (!parent || !this.isVisibleElement(parent)) continue;
            const parentRect = parent.getBoundingClientRect();

            const sidebarSized = rect.left < 460 && rect.width >= 120 && rect.width <= 430;
            const rowSized = rect.height >= 18 && rect.height <= 72;
            const parentLarger = parentRect.height > rect.height + 8;
            if (sidebarSized && rowSized && parentLarger) best = current;
        }

        return best || element;
    }

    findChannelElement(channelId, guildId, {strict = false} = {}) {
        if (!channelId) return null;
        const id = String(channelId);
        const escaped = CSS.escape(id);

        const directSelectors = [
            `[data-list-item-id="channels___${escaped}"]`,
            `[data-channel-id="${escaped}"]`,
            `[data-list-item-id$="${escaped}"]`
        ];
        for (const selector of directSelectors) {
            try {
                const found = document.querySelector(selector);
                if (found && this.isVisibleElement(found)) return found;
            }
            catch {
                // Continuer avec les autres stratégies.
            }
        }

        const exactPath = guildId ? `/channels/${guildId}/${id}` : null;
        if (exactPath) {
            const anchor = [...document.querySelectorAll('a[href*="/channels/"]')].find((node) => {
                const href = node.getAttribute("href") || "";
                return href === exactPath || href.endsWith(`/${id}`);
            });
            if (anchor && this.isVisibleElement(anchor)) return anchor;
        }

        if (strict) return null;

        // Fallback historique : recherche par texte. Il n'est jamais utilisé
        // pour l'ancrage principal car le même nom peut apparaître dans le
        // panneau de connexion vocale ou sur un autre serveur.
        const channelName = this.getChannelName(channelId);
        const byText = this.findVisibleTextElements(channelName);
        if (byText.length > 0) return byText[0];

        return null;
    }

    findActiveVoiceRows(channelId) {
        // Le rendu utilise le snapshot déjà validé par le tracker. Il ne relit
        // jamais les internals Discord uniquement pour positionner le DOM.
        const activeIds = String(channelId) === String(this.currentChannelId)
            ? [...this.activeSnapshot]
            : [...this.getVoiceUserIds(channelId)];
        const rows = [];

        for (const userId of activeIds) {
            let found = null;
            const escaped = CSS.escape(String(userId));
            const idSelectors = [
                `[data-list-item-id*="${escaped}"]`,
                `[data-user-id="${escaped}"]`
            ];
            for (const selector of idSelectors) {
                try {
                    const node = document.querySelector(selector);
                    if (node && this.isVisibleElement(node) && node.getBoundingClientRect().left < 460) {
                        found = this.normalizeSidebarRow(node);
                        break;
                    }
                }
                catch {
                    // fallback texte
                }
            }

            if (!found) {
                const name = this.getDisplayNameForUser(userId);
                const matches = this.findVisibleTextElements(name);
                if (matches.length > 0) found = this.normalizeSidebarRow(matches[0]);
            }

            if (found && !rows.includes(found)) rows.push(found);
        }

        rows.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
        return rows;
    }

    findCommonParent(rows) {
        if (!rows.length) return null;
        const firstAncestors = [];
        let current = rows[0];
        for (let i = 0; current && i < 8; i++, current = current.parentElement) firstAncestors.push(current);

        for (const candidate of firstAncestors) {
            if (!candidate?.parentElement) continue;
            if (rows.every((row) => candidate === row || candidate.contains(row))) {
                const rect = candidate.getBoundingClientRect();
                if (rect.left < 460 && rect.width <= 430 && rect.height < 500) return candidate;
            }
        }
        return null;
    }

    getDirectChildUnder(parent, node) {
        if (!parent || !node) return null;
        let current = node;
        for (let depth = 0; current?.parentElement && depth < 14; depth++, current = current.parentElement) {
            if (current.parentElement === parent) return current;
        }
        return null;
    }

    findChannelListItem(channelElement) {
        let current = channelElement;
        for (let depth = 0; current && depth < 12; depth++, current = current.parentElement) {
            if (!(current instanceof Element)) continue;
            const cls = String(current.className || "");
            if (current.tagName === "LI" || cls.includes("containerDefault")) return current;
        }
        return null;
    }

    findRenderCandidates(channelId, guildId) {
        const candidates = [];
        const seen = new Set();
        const add = (mode, mount, after, details) => {
            if (!(mount instanceof Element)) return;
            if (after && after.parentElement !== mount) return;
            const key = `${mode}:${this.elementDebugKey(mount)}:${after ? this.elementDebugKey(after) : "append"}`;
            if (seen.has(key)) return;
            seen.add(key);
            candidates.push({mode, mount, after: after || null, details});
        };

        // Ancrage strict : uniquement dans le serveur réellement affiché.
        const selectedGuildId = this.getSelectedGuildId();
        if (!selectedGuildId || !guildId || String(selectedGuildId) !== String(guildId)) {
            this.lastTargetDetails = `ancrage refusé: serveur affiché=${selectedGuildId || "DM/aucun"}, serveur vocal=${guildId || "inconnu"}`;
            return candidates;
        }

        const activeRows = this.findActiveVoiceRows(channelId);
        const channelElement = this.findChannelElement(channelId, guildId, {strict: true});
        if (!channelElement) {
            this.lastTargetDetails = "ancrage refusé: ligne exacte du salon vocal absente";
            return candidates;
        }

        const channelItem = this.findChannelListItem(channelElement);
        const listParent = channelItem?.parentElement;
        if (!channelItem || !listParent || channelItem.tagName !== "LI" || !["UL", "OL"].includes(listParent.tagName)) {
            this.lastTargetDetails = `ancrage refusé: structure salon non sûre (${this.elementDebugKey(channelItem)} -> ${this.elementDebugKey(listParent)})`;
            return candidates;
        }

        let after = channelItem;
        for (const row of activeRows) {
            const direct = this.getDirectChildUnder(listParent, row);
            if (!direct || direct === channelItem || channelItem.contains(direct)) continue;
            const relation = channelItem.compareDocumentPosition(direct);
            if (!(relation & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
            if (after === channelItem || (after.compareDocumentPosition(direct) & Node.DOCUMENT_POSITION_FOLLOWING)) after = direct;
        }

        add(
            "strict-channel-list",
            listParent,
            after,
            `selectedGuild=${selectedGuildId}; channelItem=${this.elementDebugKey(channelItem)}; after=${this.elementDebugKey(after)}; activeRows=${activeRows.length}`
        );

        if (!candidates.length) this.lastTargetDetails = "aucun candidat DOM strict valide";
        return candidates;
    }

    elementDebugKey(element) {
        if (!(element instanceof Element)) return "null";
        const cls = String(element.className || "").trim().split(/\s+/).slice(0, 2).join(".");
        return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${cls ? `.${cls}` : ""}`;
    }

    rootTagForTarget(target) {
        const parentTag = target?.mount?.tagName;
        const siblingTag = target?.after?.tagName;
        if (parentTag === "UL" || parentTag === "OL" || siblingTag === "LI") return "li";
        return "div";
    }

    isInjectedListVisible(list) {
        if (!(list instanceof Element) || !document.contains(list)) return false;
        const rect = list.getBoundingClientRect();
        const style = getComputedStyle(list);
        return rect.width >= 40
            && rect.height >= 18
            && rect.left < 480
            && rect.right > 0
            && rect.bottom > 0
            && rect.top < window.innerHeight
            && style.display !== "none"
            && style.visibility !== "hidden";
    }

    insertListUsingCandidates(users, {debug = false} = {}) {
        const candidates = this.findRenderCandidates(this.currentChannelId, this.currentGuildId);
        if (!candidates.length) return null;

        const attempts = [];
        for (const target of candidates) {
            const list = this.buildRecentList(users, this.rootTagForTarget(target));
            if (debug) list.classList.add("vh-debug-test");

            try {
                if (target.after?.parentElement === target.mount) target.after.after(list);
                else target.mount.appendChild(list);

                // Force un calcul de layout : on ne considère plus "injecté" si l'élément est clippé/0x0.
                const rect = list.getBoundingClientRect();
                const visible = this.isInjectedListVisible(list);
                attempts.push(`${target.mode}:${Math.round(rect.width)}x${Math.round(rect.height)}:${visible ? "visible" : "invisible"}`);
                if (visible) {
                    this.lastTargetDetails = `${target.details}; ${attempts.join(" | ")}`;
                    return {target, list, attempts};
                }
            }
            catch (error) {
                attempts.push(`${target.mode}:erreur=${String(error?.message || error)}`);
            }

            list.remove();
        }

        this.lastTargetDetails = attempts.join(" | ") || "candidats testés sans résultat";
        return null;
    }

    renderRecentUsers() {
        if (this.isRendering) return;
        this.isRendering = true;
        try {
            const popoverWasOpen = Boolean(this.historyPopover && document.contains(this.historyPopover));
            this.removeRenderedLists();
            if (!this.currentChannelId) {
                if (popoverWasOpen) this.closeHistoryPopover();
                return;
            }

            if (!this.isTrackedGuildCurrentlyVisible()) {
                if (popoverWasOpen) this.closeHistoryPopover();
                this.lastRenderMode = "masqué-navigation";
                this.lastRenderError = null;
                this.lastTargetDetails = "serveur vocal suivi non affiché";
                return;
            }

            const users = this.getRecentUsersForCurrentChannel();
            if (users.length === 0) {
                if (popoverWasOpen) this.closeHistoryPopover();
                return;
            }

            const result = this.insertListUsingCandidates(users);
            if (!result) {
                this.lastRenderMode = "introuvable";
                this.lastRenderError = `Tous les points d'insertion sont invisibles (${this.lastTargetDetails})`;
                console.warn(`[${PLUGIN_NAME}] Historique détecté mais aucun point visible`, this.getDebugStatus());
                return;
            }

            this.lastRenderMode = result.target.mode;
            this.lastRenderError = null;

            // Si le popover était ouvert avant une reconstruction réelle de la
            // sidebar, on le rattache au nouveau bouton au lieu de le perdre.
            if (popoverWasOpen) {
                const ordered = [...users].sort((a, b) => b.leftAt - a.leftAt);
                const previousEntries = ordered.slice(1);
                const newAnchor = result.list.querySelector(".vh-history-button");
                if (newAnchor && previousEntries.length > 0) {
                    this.openHistoryPopover(newAnchor, previousEntries);
                }
                else {
                    this.closeHistoryPopover();
                }
            }

            this.debugLog("Liste rendue et visible", {
                mode: result.target.mode,
                details: this.lastTargetDetails,
                channelId: this.currentChannelId,
                count: users.length,
                mount: result.target.mount,
                after: result.target.after,
                rect: result.list.getBoundingClientRect()
            });
        }
        catch (error) {
            this.lastRenderMode = "erreur";
            this.lastRenderError = String(error?.message || error);
            console.error(`[${PLUGIN_NAME}] Erreur de rendu`, error);
        }
        finally {
            setTimeout(() => { this.isRendering = false; }, 0);
        }
    }

    buildRecentList(users, rootTag = "div") {
        const list = document.createElement(rootTag === "li" ? "li" : "div");
        list.className = "vh-recent-list";
        list.dataset.voiceHistoryChannel = this.currentChannelId;

        if (this.settings.showSeparator) {
            const separator = document.createElement("div");
            separator.className = "vh-recent-separator";
            separator.textContent = "Récemment présents";
            list.appendChild(separator);
        }

        // V0.8 : la ligne visible est TOUJOURS le départ le plus récent.
        // Les départs précédents restent dans l'historique mais sont accessibles
        // via le bouton horloge afin de ne pas saturer la liste du salon vocal.
        const ordered = [...users].sort((a, b) => b.leftAt - a.leftAt);
        const visibleEntry = ordered[0];
        const previousEntries = ordered.slice(1);
        if (!visibleEntry) return list;

        const row = document.createElement("div");
        row.className = "vh-recent-user";
        row.dataset.voiceHistoryLeftAt = String(visibleEntry.leftAt);
        row.style.opacity = String(this.settings.opacity / 100);

        const relative = this.formatRelative(visibleEntry.leftAt);
        const exact = this.formatExact(visibleEntry.leftAt);
        row.title = `A quitté ${relative}\nDépart : ${exact}`;

        this.appendRecentAvatar(row, visibleEntry);

        const name = document.createElement("span");
        name.className = "vh-recent-name";
        name.textContent = visibleEntry.displayName || visibleEntry.username || visibleEntry.userId;
        row.appendChild(name);

        if (previousEntries.length > 0) {
            const historyButton = this.createHistoryButton(previousEntries);
            row.appendChild(historyButton);
        }

        if (this.settings.showRelativeTime) {
            const time = document.createElement("span");
            time.className = "vh-recent-time";
            time.dataset.voiceHistoryTime = "relative";
            time.textContent = relative;
            row.appendChild(time);
        }

        this.makeProfileClickable(row, visibleEntry.userId);
        list.appendChild(row);
        return list;
    }

    appendRecentAvatar(parent, entry) {
        if (entry.avatarUrl) {
            const avatar = document.createElement("img");
            avatar.className = "vh-recent-avatar";
            avatar.src = entry.avatarUrl;
            avatar.alt = "";
            avatar.draggable = false;
            avatar.addEventListener("error", () => avatar.replaceWith(this.createAvatarFallback(entry.displayName)), {once: true});
            parent.appendChild(avatar);
            return;
        }
        parent.appendChild(this.createAvatarFallback(entry.displayName));
    }

    createHistoryButton(previousEntries) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "vh-history-button";
        button.dataset.voiceHistoryAction = "open-history";
        const count = previousEntries.length;
        button.title = `${count} départ${count > 1 ? "s" : ""} précédent${count > 1 ? "s" : ""} — cliquer pour afficher`;
        button.setAttribute("aria-label", button.title);
        button.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7v5l3 2"></path>
                <path d="M3.6 7.5 6 5.2"></path>
            </svg>
            <span class="vh-history-count">${count}</span>
        `;

        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (this.historyPopover && this.historyPopoverAnchor === button && document.contains(this.historyPopover)) {
                this.closeHistoryPopover();
                return;
            }
            this.openHistoryPopover(button, previousEntries);
        });
        return button;
    }

    openHistoryPopover(anchor, entries) {
        this.closeHistoryPopover();
        if (!(anchor instanceof Element) || !Array.isArray(entries) || entries.length === 0) return;

        const ordered = [...entries].sort((a, b) => b.leftAt - a.leftAt);
        const popover = document.createElement("div");
        popover.className = "vh-history-popover";
        popover.dataset.voiceHistoryPopover = "true";

        const header = document.createElement("div");
        header.className = "vh-history-popover-header";
        header.textContent = `${ordered.length} départ${ordered.length > 1 ? "s" : ""} précédent${ordered.length > 1 ? "s" : ""}`;
        popover.appendChild(header);

        const historyList = document.createElement("div");
        historyList.className = "vh-history-popover-list";

        for (const entry of ordered) {
            const item = document.createElement("div");
            item.className = "vh-history-entry";
            item.dataset.voiceHistoryLeftAt = String(entry.leftAt);
            const relative = this.formatRelative(entry.leftAt);
            const exact = this.formatExact(entry.leftAt);
            item.title = `A quitté ${relative}\nDépart : ${exact}`;

            if (entry.avatarUrl) {
                const avatar = document.createElement("img");
                avatar.className = "vh-history-entry-avatar";
                avatar.src = entry.avatarUrl;
                avatar.alt = "";
                avatar.draggable = false;
                avatar.addEventListener("error", () => avatar.replaceWith(this.createHistoryAvatarFallback(entry.displayName)), {once: true});
                item.appendChild(avatar);
            }
            else {
                item.appendChild(this.createHistoryAvatarFallback(entry.displayName));
            }

            const main = document.createElement("div");
            main.className = "vh-history-entry-main";

            const name = document.createElement("div");
            name.className = "vh-history-entry-name";
            name.textContent = entry.displayName || entry.username || entry.userId;
            main.appendChild(name);

            const time = document.createElement("div");
            time.className = "vh-history-entry-time";
            time.dataset.voiceHistoryTime = "history";
            time.textContent = `${relative} · ${exact}`;
            main.appendChild(time);

            item.appendChild(main);
            this.makeProfileClickable(item, entry.userId);
            historyList.appendChild(item);
        }

        popover.appendChild(historyList);
        document.body.appendChild(popover);

        const anchorRect = anchor.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();
        const margin = 8;
        let left = anchorRect.right + margin;
        if (left + popoverRect.width > window.innerWidth - 12) {
            left = anchorRect.left - popoverRect.width - margin;
        }
        left = Math.max(12, Math.min(left, window.innerWidth - popoverRect.width - 12));

        let top = anchorRect.top - 6;
        if (top + popoverRect.height > window.innerHeight - 12) {
            top = window.innerHeight - popoverRect.height - 12;
        }
        top = Math.max(12, top);

        popover.style.left = `${Math.round(left)}px`;
        popover.style.top = `${Math.round(top)}px`;

        this.historyPopover = popover;
        this.historyPopoverAnchor = anchor;

        const onPointerDown = (event) => {
            if (!popover.contains(event.target) && !anchor.contains(event.target)) this.closeHistoryPopover();
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") this.closeHistoryPopover();
        };
        const onViewportChange = () => this.closeHistoryPopover();

        document.addEventListener("mousedown", onPointerDown, true);
        document.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("resize", onViewportChange, {passive: true});

        this.historyPopoverCleanup = () => {
            document.removeEventListener("mousedown", onPointerDown, true);
            document.removeEventListener("keydown", onKeyDown, true);
            window.removeEventListener("resize", onViewportChange);
        };
    }

    updateRelativeTimesInPlace() {
        const updateNode = (node, historyMode = false) => {
            const timestamp = Number(node?.dataset?.voiceHistoryLeftAt);
            if (!Number.isFinite(timestamp)) return;

            const relative = this.formatRelative(timestamp);
            const exact = this.formatExact(timestamp);
            node.title = `A quitté ${relative}\nDépart : ${exact}`;

            if (historyMode) {
                const time = node.querySelector(".vh-history-entry-time");
                if (time) time.textContent = `${relative} · ${exact}`;
            }
            else {
                const time = node.querySelector(".vh-recent-time");
                if (time) time.textContent = relative;
            }
        };

        document.querySelectorAll(".vh-recent-user[data-voice-history-left-at]").forEach((node) => updateNode(node, false));
        document.querySelectorAll(".vh-history-entry[data-voice-history-left-at]").forEach((node) => updateNode(node, true));
    }

    closeHistoryPopover() {
        if (this.historyPopoverCleanup) {
            try { this.historyPopoverCleanup(); } catch {}
        }
        this.historyPopoverCleanup = null;

        if (this.historyPopover?.remove) this.historyPopover.remove();
        this.historyPopover = null;
        this.historyPopoverAnchor = null;
    }

    createHistoryAvatarFallback(displayName) {
        const fallback = document.createElement("div");
        fallback.className = "vh-history-entry-avatar-fallback";
        fallback.textContent = String(displayName || "?").trim().charAt(0).toUpperCase() || "?";
        return fallback;
    }

    createAvatarFallback(displayName) {
        const fallback = document.createElement("div");
        fallback.className = "vh-recent-avatar-fallback";
        fallback.textContent = String(displayName || "?").trim().charAt(0).toUpperCase() || "?";
        return fallback;
    }

    showDebugOverlay(message) {
        document.querySelectorAll(".vh-debug-overlay").forEach((node) => node.remove());
        const overlay = document.createElement("div");
        overlay.className = "vh-debug-overlay";
        overlay.textContent = message;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 12000);
    }

    runDisplayTest() {
        if (!this.currentChannelId) {
            BdApi.UI.alert("VoiceHistory — test", "Le plugin ne détecte aucun salon vocal courant. Rejoins un vocal puis relance le test.");
            return;
        }

        this.isRendering = true;
        try {
            this.removeRenderedLists();
            const fake = [{
                userId: "voicehistory-test",
                displayName: "VoiceHistory — TEST V0.9.1",
                username: "VoiceHistory",
                avatarUrl: null,
                bot: false,
                leftAt: Date.now() - 3 * 60 * 1000
            }];

            const result = this.insertListUsingCandidates(fake, {debug: true});
            if (!result) {
                this.lastRenderMode = "TEST:overlay-fallback";
                this.lastRenderError = `Tous les candidats sont invisibles : ${this.lastTargetDetails}`;
                this.showDebugOverlay(`VoiceHistory V0.9.1 fonctionne, mais tous les points d'insertion testés sont invisibles.\n${this.lastTargetDetails}`);
                BdApi.UI.alert(
                    "VoiceHistory — diagnostic V0.9.1",
                    `Le test a essayé plusieurs niveaux DOM, mais aucun n'a produit une ligne visible.\n\n${this.lastTargetDetails}`
                );
                console.error(`[${PLUGIN_NAME}] Test affichage: aucun candidat visible`, this.getDebugStatus());
                return;
            }

            this.lastRenderMode = `TEST:${result.target.mode}`;
            this.lastRenderError = null;
            const rect = result.list.getBoundingClientRect();
            BdApi.UI.alert(
                "VoiceHistory — test V0.9.1 visible",
                `La ligne TEST a une surface visible (${Math.round(rect.width)}×${Math.round(rect.height)} px).\n\nMode : ${result.target.mode}\nDétails : ${this.lastTargetDetails}`
            );
            console.info(`[${PLUGIN_NAME}] Test affichage V0.9.1 visible`, {
                mode: result.target.mode,
                details: this.lastTargetDetails,
                mount: result.target.mount,
                after: result.target.after,
                rect
            });
        }
        catch (error) {
            this.lastRenderMode = "TEST:erreur";
            this.lastRenderError = String(error?.message || error);
            this.showDebugOverlay(`VoiceHistory V0.9.1 : erreur pendant le test.\n${this.lastRenderError}`);
            console.error(`[${PLUGIN_NAME}] Test affichage: erreur`, error);
        }
        finally {
            setTimeout(() => { this.isRendering = false; }, 0);
        }
    }

    getDebugStatus() {
        const recent = this.currentChannelId ? this.getRecentUsersForCurrentChannel().length : 0;
        return {
            version: PLUGIN_VERSION,
            started: this.started,
            currentChannelId: this.currentChannelId,
            currentGuildId: this.currentGuildId,
            activeCount: this.lastActiveCount,
            snapshotCount: this.activeSnapshot.size,
            recentCount: recent,
            voiceStore: Boolean(this.VoiceStateStore),
            sortedVoiceStore: Boolean(this.SortedVoiceStateStore),
            selectedChannelStore: Boolean(this.SelectedChannelStore),
            selectedGuildStore: Boolean(this.SelectedGuildStore),
            selectedGuildId: this.getSelectedGuildId(),
            trackedGuildVisible: this.isTrackedGuildCurrentlyVisible(),
            rtcConnectionStore: Boolean(this.RTCConnectionStore),
            userProfileActions: Boolean(this.UserProfileActions),
            channelSource: this.lastChannelSource,
            voiceUsersSource: this.lastVoiceUsersSource,
            voiceUsersAuthoritative: this.lastVoiceUsersAuthoritative,
            voiceUsersConfidence: this.lastVoiceUsersConfidence,
            pendingDepartures: this.pendingDepartures.size,
            fluxDispatcher: Boolean(this.FluxDispatcher),
            compatibility: this.getCompatibilityStatus(),
            lastVoiceEventAt: this.lastVoiceEventAt ? new Date(this.lastVoiceEventAt).toLocaleTimeString() : "jamais",
            lastSyncAt: this.lastSyncAt ? new Date(this.lastSyncAt).toLocaleTimeString() : "jamais",
            lastJoinAt: this.lastJoinAt ? new Date(this.lastJoinAt).toLocaleTimeString() : "jamais",
            lastDepartureAt: this.lastDepartureAt ? new Date(this.lastDepartureAt).toLocaleTimeString() : "jamais",
            renderMode: this.lastRenderMode,
            targetDetails: this.lastTargetDetails,
            renderError: this.lastRenderError || "aucune"
        };
    }

    getSettingsPanel() {
        const plugin = this;
        const React = BdApi.React;

        function SettingsPanel() {
            const [settings, setSettings] = React.useState({...plugin.settings});
            const [debug, setDebug] = React.useState(plugin.getDebugStatus());

            React.useEffect(() => {
                const timer = setInterval(() => setDebug(plugin.getDebugStatus()), 10_000);
                return () => clearInterval(timer);
            }, []);

            const setValue = (key, value) => {
                plugin.updateSetting(key, value);
                setSettings({...plugin.settings});
                setDebug(plugin.getDebugStatus());
            };

            const row = (name, note, control) => React.createElement(
                "div",
                {className: "vh-setting-row"},
                React.createElement(
                    "div",
                    {className: "vh-setting-text"},
                    React.createElement("div", {className: "vh-setting-name"}, name),
                    React.createElement("div", {className: "vh-setting-note"}, note)
                ),
                React.createElement("div", {className: "vh-setting-control"}, control)
            );

            const checkbox = (key) => React.createElement("input", {
                type: "checkbox",
                checked: Boolean(settings[key]),
                onChange: (event) => setValue(key, event.target.checked)
            });

            return React.createElement(
                "div",
                {className: "vh-settings"},

                React.createElement(
                    "div",
                    {className: "vh-settings-section"},
                    React.createElement("h3", null, "Diagnostic V0.9.1"),
                    React.createElement(
                        "div",
                        {className: "vh-debug-box"},
                        `Salon suivi : ${debug.currentChannelId || "aucun"}\n` +
                        `Source salon : ${debug.channelSource}\n` +
                        `Source utilisateurs : ${debug.voiceUsersSource}\n` +
                        `Snapshot fiable : ${debug.voiceUsersAuthoritative ? "OUI" : "NON"} (${debug.voiceUsersConfidence})\n` +
                        `Utilisateurs actifs : ${debug.activeCount} (snapshot ${debug.snapshotCount})\n` +
                        `Départs en confirmation : ${debug.pendingDepartures}\n` +
                        `Utilisateurs récents : ${debug.recentCount}\n` +
                        `Flux VOICE_STATE_UPDATES : ${debug.fluxDispatcher ? "OK" : "INTROUVABLE"}\n` +
                        `Compatibilité : ${debug.compatibility.degraded ? "DÉGRADÉE" : "OK"} — génération ${debug.compatibility.generation}\n` +
                        `Auto-réparations : ${debug.compatibility.repairs} — dernière: ${debug.compatibility.lastRepairAt} (${debug.compatibility.lastRepairReason})\n` +
                        `Dernier événement vocal : ${debug.lastVoiceEventAt}\n` +
                        `Dernier polling : ${debug.lastSyncAt}\n` +
                        `Dernière arrivée détectée : ${debug.lastJoinAt}\n` +
                        `Dernier départ détecté : ${debug.lastDepartureAt}\n` +
                        `Rendu : ${debug.renderMode}\n` +
                        `Cible : ${debug.targetDetails}\n` +
                        `Erreur rendu : ${debug.renderError}`
                    ),
                    row(
                        "Tester l'affichage",
                        "Injecte une fausse ligne grisée sous le salon vocal courant sans modifier l'historique.",
                        React.createElement("button", {onClick: () => plugin.runDisplayTest()}, "Lancer le test")
                    ),
                    row(
                        "Toasts de diagnostic",
                        "Affiche un toast lorsqu'un départ est réellement détecté. À désactiver une fois le plugin validé.",
                        checkbox("diagnosticToasts")
                    ),
                    row(
                        "Logs debug",
                        "Active les logs détaillés de tracking/rendu dans la console. Désactivé par défaut pour éviter le spam.",
                        checkbox("debugLogs")
                    )
                ),

                React.createElement(
                    "div",
                    {className: "vh-settings-section"},
                    React.createElement("h3", null, "Historique"),
                    row(
                        "Durée de conservation",
                        "De 1 à 168 heures. 24 heures par défaut.",
                        React.createElement("input", {
                            type: "number",
                            min: 1,
                            max: 168,
                            value: settings.retentionHours,
                            onChange: (event) => setValue("retentionHours", Number(event.target.value))
                        })
                    ),
                    row("Afficher les bots", "Inclut les bots dans les utilisateurs récemment partis.", checkbox("showBots")),
                    row("Conserver après redémarrage", "Stocke l'historique localement via BdApi.Data.", checkbox("persistHistory"))
                ),

                React.createElement(
                    "div",
                    {className: "vh-settings-section"},
                    React.createElement("h3", null, "Apparence"),
                    row("Afficher le temps relatif", "Affiche « il y a 20 min » à droite du pseudo.", checkbox("showRelativeTime")),
                    row("Afficher le séparateur", "Ajoute « Récemment présents » au-dessus des utilisateurs grisés.", checkbox("showSeparator")),
                    row(
                        `Opacité (${settings.opacity} %)`,
                        "Règle l'atténuation de l'utilisateur parti.",
                        React.createElement("input", {
                            type: "range",
                            min: 20,
                            max: 80,
                            step: 5,
                            value: settings.opacity,
                            onChange: (event) => setValue("opacity", Number(event.target.value))
                        })
                    ),
                    row(
                        "Tri",
                        "Ordre des utilisateurs récemment partis.",
                        React.createElement(
                            "select",
                            {
                                value: settings.sortOrder,
                                onChange: (event) => setValue("sortOrder", event.target.value)
                            },
                            React.createElement("option", {value: "recent"}, "Plus récent d'abord"),
                            React.createElement("option", {value: "oldest"}, "Plus ancien d'abord")
                        )
                    )
                ),

                React.createElement(
                    "div",
                    {className: "vh-settings-section"},
                    React.createElement("h3", null, "Compatibilité Discord"),
                    row(
                        "Auto-réparation",
                        "Redécouvre automatiquement les stores et pointeurs Discord si une mise à jour ou un hot-reload les remplace.",
                        checkbox("autoRepairCompatibility")
                    ),
                    row(
                        "Relancer la détection",
                        "Force immédiatement une redécouverte des modules internes sans redémarrer Discord.",
                        React.createElement(
                            "button",
                            {
                                onClick: () => {
                                    plugin.repairCompatibility("manuel depuis paramètres", true);
                                    setDebug(plugin.getDebugStatus());
                                    BdApi.UI.showToast("VoiceHistory: compatibilité rescannée", {type: "success"});
                                }
                            },
                            "Rescanner"
                        )
                    )
                ),

                React.createElement(
                    "div",
                    {className: "vh-settings-section"},
                    React.createElement("h3", null, "Maintenance"),
                    row(
                        "Effacer l'historique",
                        "Supprime toutes les entrées VoiceHistory enregistrées localement.",
                        React.createElement(
                            "button",
                            {
                                className: "vh-danger",
                                onClick: () => {
                                    plugin.clearHistory();
                                    setDebug(plugin.getDebugStatus());
                                    BdApi.UI.showToast("Historique VoiceHistory effacé", {type: "success"});
                                }
                            },
                            "Effacer"
                        )
                    )
                )
            );
        }

        return React.createElement(SettingsPanel);
    }
};
