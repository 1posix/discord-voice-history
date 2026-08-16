/**
 * @name VoiceHistoryLoader
 * @author 1posix
 * @version 1.2.0
 * @description Minimal auto-loader for VoiceHistory.
 * @source https://github.com/1posix/discord-voice-history
 */

const NAME = "VoiceHistoryLoader";
const URL = "https://raw.githubusercontent.com/1posix/discord-voice-history/main/VoiceHistory.plugin.js";
const CACHE_KEY = "runtime";
const CHECK_EVERY = 15 * 60 * 1000;

module.exports = class VoiceHistoryLoader {
    constructor() {
        this.api = new BdApi(NAME);
        this.cache = null;
        this.runtime = null;
        this.timer = null;
        this.startupTimer = null;
        this.started = false;
    }

    start() {
        if (this.started) return;
        this.started = true;
        this.boot();
    }

    stop() {
        this.started = false;
        clearTimeout(this.startupTimer);
        clearInterval(this.timer);
        this.stopRuntime();
    }

    async boot() {
        this.cache = this.api.Data.load(CACHE_KEY);

        // Start instantly from the last working local copy.
        if (this.cache?.code) {
            try {
                await this.startRuntime(this.cache.code);
            } catch (error) {
                console.warn(`[${NAME}] cache invalid`, error);
                this.runtime = null;
            }
        }

        // First install needs GitHub; later starts do not.
        if (!this.runtime) {
            try {
                await this.update(true);
            } catch (error) {
                this.fail("Impossible de télécharger VoiceHistory", error);
                return;
            }
        }

        // Check shortly after startup, then every 15 minutes.
        this.startupTimer = setTimeout(() => this.update(), 5000);
        this.timer = setInterval(() => this.update(), CHECK_EVERY);
    }

    async update(force = false) {
        try {
            const code = await this.download();
            if (!this.started) return;

            // Exact content comparison: every changed GitHub push is detected.
            if (!force && this.cache?.code === code) return;

            const old = this.cache;
            this.validate(code);
            this.stopRuntime();

            try {
                await this.startRuntime(code);
                this.cache = {code, version: this.version(code), updatedAt: Date.now()};
                this.api.Data.save(CACHE_KEY, this.cache);
                BdApi.UI.showToast(`VoiceHistory ${this.cache.version} mis à jour`, {
                    type: "success",
                    timeout: 4000
                });
            } catch (error) {
                // New version failed: restart the last working copy.
                if (old?.code) {
                    await this.startRuntime(old.code);
                    this.cache = old;
                }
                throw error;
            }
        } catch (error) {
            // Network/update failures must never stop an already running cache.
            console.warn(`[${NAME}] update skipped`, error);
        }
    }

    async download() {
        const response = await BdApi.Net.fetch(`${URL}?t=${Date.now()}`);
        if (!response?.ok) throw new Error(`GitHub HTTP ${response?.status ?? "?"}`);
        return response.text();
    }

    validate(code) {
        if (typeof code !== "string" || code.length < 1000) throw new Error("runtime invalide");
        if (!/@name\s+VoiceHistory\b/.test(code)) throw new Error("mauvais plugin");
        if (!code.includes("module.exports")) throw new Error("module.exports absent");
        if (!this.version(code)) throw new Error("version absente");
    }

    version(code) {
        return code.match(/@version\s+([^\s*]+)/)?.[1] || "unknown";
    }

    compile(code) {
        this.validate(code);
        const module = {exports: {}};
        new Function("module", "exports", "require", "BdApi", code)(
            module,
            module.exports,
            require,
            BdApi
        );
        if (typeof module.exports !== "function") throw new Error("export invalide");
        return module.exports;
    }

    async startRuntime(code) {
        const Runtime = this.compile(code);
        const instance = new Runtime();
        try {
            await instance.start?.();
            this.runtime = instance;
        } catch (error) {
            try { instance.stop?.(); } catch {}
            throw error;
        }
    }

    stopRuntime() {
        if (!this.runtime) return;
        try { this.runtime.stop?.(); } catch {}
        this.runtime = null;
    }

    fail(message, error) {
        console.error(`[${NAME}]`, error);
        BdApi.UI.showToast(message, {type: "error", timeout: 8000});
    }
};
