/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./lib/api.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.API = void 0;
// License: MIT
const constants_1 = __webpack_require__("./lib/constants.ts");
const filters_1 = __webpack_require__("./lib/filters.ts");
const prefs_1 = __webpack_require__("./lib/prefs.ts");
// eslint-disable-next-line no-unused-vars
const item_1 = __webpack_require__("./lib/item.ts");
const man_1 = __webpack_require__("./lib/manager/man.ts");
const select_1 = __webpack_require__("./lib/select.ts");
const single_1 = __webpack_require__("./lib/single.ts");
const notifications_1 = __webpack_require__("./lib/notifications.ts");
const recentlist_1 = __webpack_require__("./lib/recentlist.ts");
const man_2 = __webpack_require__("./lib/manager/man.ts");
const i18n_1 = __webpack_require__("./lib/i18n.ts");
const MAX_BATCH = 10000;
exports.API = new class APIImpl {
    async filter(arr, type) {
        return await (await filters_1.filters()).filterItemsByType(arr, type);
    }
    async queue(items, options) {
        await Promise.all([recentlist_1.MASK.init(), recentlist_1.SUBFOLDER.init()]);
        const { mask = recentlist_1.MASK.current } = options;
        const { subfolder = recentlist_1.SUBFOLDER.current } = options;
        const { paused = false } = options;
        let currentBatch = parseInt(await prefs_1.Prefs.get("currentBatch", 0), 10) || 0;
        if (!isFinite(currentBatch) || ++currentBatch >= MAX_BATCH) {
            currentBatch = 1;
        }
        const defaults = {
            _idx: 0,
            get idx() {
                return ++this._idx;
            },
            referrer: null,
            usableReferrer: null,
            fileName: null,
            title: "",
            description: "",
            startDate: new Date(),
            private: false,
            postData: null,
            mask,
            subfolder,
            date: Date.now(),
            batch: currentBatch,
            paused
        };
        items = items.map(i => {
            delete i.idx;
            return new item_1.Item(i, defaults);
        });
        if (!items) {
            return;
        }
        await prefs_1.Prefs.set("currentBatch", currentBatch);
        await prefs_1.Prefs.save();
        const manager = await man_1.getManager();
        await manager.addNewDownloads(items);
        if (await prefs_1.Prefs.get("queue-notification")) {
            if (items.length === 1) {
                new notifications_1.Notification(null, i18n_1._("queued-download"));
            }
            else {
                new notifications_1.Notification(null, i18n_1._("queued-downloads", items.length));
            }
        }
        if (await prefs_1.Prefs.get("open-manager-on-queue")) {
            await man_2.openManager(false);
        }
    }
    sanity(links, media) {
        if (!links.length && !media.length) {
            new notifications_1.Notification(null, i18n_1._("no-links"));
            return false;
        }
        return true;
    }
    async turbo(links, media) {
        if (!this.sanity(links, media)) {
            return false;
        }
        const type = await prefs_1.Prefs.get("last-type", "links");
        const items = await (async () => {
            if (type === "links") {
                return await exports.API.filter(links, constants_1.TYPE_LINK);
            }
            return await exports.API.filter(media, constants_1.TYPE_MEDIA);
        })();
        const selected = item_1.makeUniqueItems([items]);
        if (!selected.length) {
            return await this.regular(links, media);
        }
        return await this.queue(selected, { paused: await prefs_1.Prefs.get("add-paused") });
    }
    async regularInternal(selected, options) {
        if (options.mask && !options.maskOnce) {
            await recentlist_1.MASK.init();
            await recentlist_1.MASK.push(options.mask);
        }
        if (typeof options.fast === "string" && !options.fastOnce) {
            await recentlist_1.FASTFILTER.init();
            await recentlist_1.FASTFILTER.push(options.fast);
        }
        if (typeof options.subfolder === "string" && !options.subfolderOnce) {
            await recentlist_1.SUBFOLDER.init();
            await recentlist_1.SUBFOLDER.push(options.subfolder);
        }
        if (typeof options.type === "string") {
            await prefs_1.Prefs.set("last-type", options.type);
        }
        return await this.queue(selected, options);
    }
    async regular(links, media) {
        if (!this.sanity(links, media)) {
            return false;
        }
        const { items, options } = await select_1.select(links, media);
        return this.regularInternal(items, options);
    }
    async singleTurbo(item) {
        return await this.queue([item], { paused: await prefs_1.Prefs.get("add-paused") });
    }
    async singleRegular(item) {
        const { items, options } = await single_1.single(item);
        return this.regularInternal(items, options);
    }
}();


/***/ }),

/***/ "./lib/audio.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.playAudio = void 0;
const browser_1 = __webpack_require__("./lib/browser.ts");
function playAudioPlain(name) {
    const audio = new Audio(browser_1.runtime.getURL(`/style/${name}.opus`));
    audio.addEventListener("canplaythrough", () => audio.play());
    audio.addEventListener("ended", () => document.body.removeChild(audio));
    audio.addEventListener("error", () => document.body.removeChild(audio));
    document.body.appendChild(audio);
}
function playAudioV3(name) {
    chrome.offscreen.createDocument({
        url: `${browser_1.runtime.getURL("/windows/offscreen_audio.html")}?name=${name}`,
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play a sound"
    });
}
function playAudio(name) {
    if (chrome && chrome.offscreen && chrome.offscreen.createDocument) {
        playAudioV3(name);
    }
    else {
        playAudioPlain(name);
    }
}
exports.playAudio = playAudio;


/***/ }),

/***/ "./lib/background.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
// License: MIT
// This is the main background script used by the service_worker
// See service_worker.js
const constants_1 = __webpack_require__("./lib/constants.ts");
const api_1 = __webpack_require__("./lib/api.ts");
const item_1 = __webpack_require__("./lib/item.ts");
const prefs_1 = __webpack_require__("./lib/prefs.ts");
const i18n_1 = __webpack_require__("./lib/i18n.ts");
const windowutils_1 = __webpack_require__("./lib/windowutils.ts");
const man_1 = __webpack_require__("./lib/manager/man.ts");
const filters_1 = __webpack_require__("./lib/filters.ts");
const man_2 = __webpack_require__("./lib/manager/man.ts");
const browser_1 = __webpack_require__("./lib/browser.ts");
const bus_1 = __webpack_require__("./lib/bus.ts");
const util_1 = __webpack_require__("./lib/util.ts");
const db_1 = __webpack_require__("./lib/db.ts");
const menus = typeof (browser_1.menus) !== "undefined" && browser_1.menus || browser_1.contextMenus;
const { action } = chrome;
const GATHER = "/bundles/content-gather.js";
const CHROME_CONTEXTS = Object.freeze(new Set([
    "all",
    "audio",
    "action",
    "editable",
    "frame",
    "image",
    "launcher",
    "link",
    "page",
    "page_action",
    "action",
    "selection",
    "video",
]));
async function runContentJob(tab, file, msg) {
    try {
        if (tab && tab.incognito && msg) {
            msg.private = tab.incognito;
        }
        const res = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            files: [file],
            injectImmediately: true
        });
        if (!msg) {
            return res;
        }
        const promises = [];
        const results = [];
        for (const frame of await browser_1.webNavigation.getAllFrames({ tabId: tab.id })) {
            promises.push(browser_1.tabs.sendMessage(tab.id, msg, {
                frameId: frame.frameId
            }).then(function (res) {
                results.push(res);
            }).catch(console.error));
        }
        await Promise.all(promises);
        return results;
    }
    catch (ex) {
        console.error("Failed to execute content script", file, ex.message || ex.toString(), ex);
        return [];
    }
}
class Handler {
    async processResults(turbo = false, results) {
        const links = this.makeUnique(results, "links");
        const media = this.makeUnique(results, "media");
        await api_1.API[turbo ? "turbo" : "regular"](links, media);
    }
    makeUnique(results, what) {
        return item_1.makeUniqueItems(results.filter(e => e[what]).map(e => {
            const finisher = new item_1.Finisher(e);
            return util_1.filterInSitu(e[what].
                map((item) => finisher.finish(item)), e => !!e);
        }));
    }
    async performSelection(options) {
        try {
            const tabOptions = {
                currentWindow: true,
                discarded: false,
            };
            if (!browser_1.CHROME) {
                tabOptions.hidden = false;
            }
            const selectedTabs = options.allTabs ?
                await browser_1.tabs.query(tabOptions) :
                [options.tab];
            const textLinks = await prefs_1.Prefs.get("text-links", true);
            const gatherOptions = {
                type: "DTA:gather",
                selectionOnly: options.selectionOnly,
                textLinks,
                schemes: Array.from(constants_1.ALLOWED_SCHEMES.values()),
                transferable: constants_1.TRANSFERABLE_PROPERTIES,
            };
            const results = await Promise.all(selectedTabs.
                map((tab) => runContentJob(tab, GATHER, gatherOptions)));
            await this.processResults(options.turbo, results.flat());
        }
        catch (ex) {
            console.error(ex.toString(), ex.stack, ex);
        }
    }
}
function getMajor(version) {
    if (!version) {
        return "";
    }
    const match = version.match(/^\d+\.\d+/);
    if (!match) {
        return "";
    }
    return match[0];
}
browser_1.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
    const { version } = browser_1.runtime.getManifest();
    const major = getMajor(version);
    const prevMajor = getMajor(previousVersion);
    if (reason === "update" && major !== prevMajor) {
        browser_1.tabs.create({
            url: `https://about.downthemall.org/changelog/?cur=${major}&prev=${prevMajor}`,
        });
    }
    else if (reason === "install") {
        browser_1.tabs.create({
            url: `https://about.downthemall.org/4.0/?cur=${major}`,
        });
    }
});
const menuHandler = new class Menus extends Handler {
    constructor() {
        super();
        menus.removeAll();
        this.onClicked = this.onClicked.bind(this);
        menus.onClicked.addListener(this.onClicked);
        i18n_1.locale.then(() => this.installMenus());
    }
    installMenus() {
        const alls = new Map();
        const menuCreate = (options) => {
            if (browser_1.CHROME) {
                delete options.icons;
                options.contexts = options.contexts.
                    filter((e) => CHROME_CONTEXTS.has(e));
                if (!options.contexts.length) {
                    return;
                }
            }
            if (options.contexts.includes("all")) {
                alls.set(options.id, options.contexts);
            }
            menus.create(options);
        };
        menuCreate({
            id: "DTARegularLink",
            contexts: ["link"],
            icons: {
                16: "/style/button-regular.png",
                32: "/style/button-regular@2x.png",
            },
            title: i18n_1._("dta.regular.link"),
        });
        menuCreate({
            id: "DTATurboLink",
            contexts: ["link"],
            icons: {
                16: "/style/button-turbo.png",
                32: "/style/button-turbo@2x.png",
            },
            title: i18n_1._("dta.turbo.link"),
        });
        menuCreate({
            id: "DTARegularImage",
            contexts: ["image"],
            icons: {
                16: "/style/button-regular.png",
                32: "/style/button-regular@2x.png",
            },
            title: i18n_1._("dta.regular.image"),
        });
        menuCreate({
            id: "DTATurboImage",
            contexts: ["image"],
            icons: {
                16: "/style/button-turbo.png",
                32: "/style/button-turbo@2x.png",
            },
            title: i18n_1._("dta.turbo.image"),
        });
        menuCreate({
            id: "DTARegularMedia",
            contexts: ["video", "audio"],
            icons: {
                16: "/style/button-regular.png",
                32: "/style/button-regular@2x.png",
            },
            title: i18n_1._("dta.regular.media"),
        });
        menuCreate({
            id: "DTATurboMedia",
            contexts: ["video", "audio"],
            icons: {
                16: "/style/button-turbo.png",
                32: "/style/button-turbo@2x.png",
            },
            title: i18n_1._("dta.turbo.media"),
        });
        menuCreate({
            id: "DTARegularSelection",
            contexts: ["selection"],
            icons: {
                16: "/style/button-regular.png",
                32: "/style/button-regular@2x.png",
            },
            title: i18n_1._("dta.regular.selection"),
        });
        menuCreate({
            id: "DTATurboSelection",
            contexts: ["selection"],
            icons: {
                16: "/style/button-turbo.png",
                32: "/style/button-turbo@2x.png",
            },
            title: i18n_1._("dta.turbo.selection"),
        });
        menuCreate({
            id: "DTARegular",
            contexts: ["all", "action", "tools_menu"],
            icons: {
                16: "/style/button-regular.png",
                32: "/style/button-regular@2x.png",
            },
            title: i18n_1._("dta.regular"),
        });
        menuCreate({
            id: "DTATurbo",
            contexts: ["all", "action", "tools_menu"],
            icons: {
                16: "/style/button-turbo.png",
                32: "/style/button-turbo@2x.png",
            },
            title: i18n_1._("dta.turbo"),
        });
        menuCreate({
            id: "sep-1",
            contexts: ["all", "action", "tools_menu"],
            type: "separator"
        });
        menuCreate({
            id: "DTARegularAll",
            contexts: ["all", "action", "tools_menu"],
            icons: {
                16: "/style/button-regular.png",
                32: "/style/button-regular@2x.png",
            },
            title: i18n_1._("dta-regular-all"),
        });
        menuCreate({
            id: "DTATurboAll",
            contexts: ["all", "action", "tools_menu"],
            icons: {
                16: "/style/button-turbo.png",
                32: "/style/button-turbo@2x.png",
            },
            title: i18n_1._("dta-turbo-all"),
        });
        const sep2ctx = menus.ACTION_MENU_TOP_LEVEL_LIMIT === 6 ?
            ["all", "tools_menu"] :
            ["all", "action", "tools_menu"];
        menuCreate({
            id: "sep-2",
            contexts: sep2ctx,
            type: "separator"
        });
        menuCreate({
            id: "DTAAdd",
            contexts: ["all", "action", "tools_menu"],
            icons: {
                16: "/style/add.svg",
                32: "/style/add.svg",
                64: "/style/add.svg",
                128: "/style/add.svg",
            },
            title: i18n_1._("add-download"),
        });
        menuCreate({
            id: "sep-3",
            contexts: ["all", "action", "tools_menu"],
            type: "separator"
        });
        menuCreate({
            id: "DTAManager",
            contexts: ["all", "action", "tools_menu"],
            icons: {
                16: "/style/button-manager.png",
                32: "/style/button-manager@2x.png",
            },
            title: i18n_1._("manager.short"),
        });
        menuCreate({
            id: "DTAPrefs",
            contexts: ["all", "action", "tools_menu"],
            icons: {
                16: "/style/settings.svg",
                32: "/style/settings.svg",
                64: "/style/settings.svg",
                128: "/style/settings.svg",
            },
            title: i18n_1._("prefs.short"),
        });
        Object.freeze(alls);
        const adjustMenus = (v) => {
            for (const [id, contexts] of alls.entries()) {
                const adjusted = v ?
                    contexts.filter(e => e !== "all") :
                    contexts;
                menus.update(id, {
                    contexts: adjusted
                });
            }
        };
        prefs_1.Prefs.get("hide-context", false).then((v) => {
            // This is the initial load, so no need to adjust when visible already
            if (!v) {
                return;
            }
            adjustMenus(v);
        });
        prefs_1.Prefs.on("hide-context", (prefs, key, value) => {
            adjustMenus(value);
        });
    }
    *makeSingleItemList(url, results) {
        for (const result of results) {
            const finisher = new item_1.Finisher(result);
            for (const list of [result.links, result.media]) {
                for (const e of list) {
                    if (e.url !== url) {
                        continue;
                    }
                    const finished = finisher.finish(e);
                    if (!finished) {
                        continue;
                    }
                    yield finished;
                }
            }
        }
    }
    async findSingleItem(tab, url, turbo = false) {
        if (!url) {
            return;
        }
        const results = await runContentJob(tab, GATHER, {
            type: "DTA:gather",
            selectionOnly: false,
            schemes: Array.from(constants_1.ALLOWED_SCHEMES.values()),
            transferable: constants_1.TRANSFERABLE_PROPERTIES,
        });
        const found = Array.from(this.makeSingleItemList(url, results));
        const unique = item_1.makeUniqueItems([found]);
        if (!unique.length) {
            return;
        }
        const [item] = unique;
        api_1.API[turbo ? "singleTurbo" : "singleRegular"](item);
    }
    onClicked(info, tab) {
        if (!tab.id) {
            return;
        }
        const { menuItemId } = info;
        const { [`onClicked${menuItemId}`]: handler } = this;
        if (!handler) {
            console.error("Invalid Handler for", menuItemId);
            return;
        }
        const rv = handler.call(this, info, tab);
        if (rv && rv.catch) {
            rv.catch(console.error);
        }
    }
    async emulate(action) {
        const tab = await browser_1.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (!tab || !tab.length) {
            return;
        }
        this.onClicked({
            menuItemId: action
        }, tab[0]);
    }
    async onClickedDTARegular(info, tab) {
        return await this.performSelection({
            selectionOnly: false,
            allTabs: false,
            turbo: false,
            tab,
        });
    }
    async onClickedDTARegularAll(info, tab) {
        return await this.performSelection({
            selectionOnly: false,
            allTabs: true,
            turbo: false,
            tab,
        });
    }
    async onClickedDTARegularSelection(info, tab) {
        return await this.performSelection({
            selectionOnly: true,
            allTabs: false,
            turbo: false,
            tab,
        });
    }
    async onClickedDTATurbo(info, tab) {
        return await this.performSelection({
            selectionOnly: false,
            allTabs: false,
            turbo: true,
            tab,
        });
    }
    async onClickedDTATurboAll(info, tab) {
        return await this.performSelection({
            selectionOnly: false,
            allTabs: true,
            turbo: true,
            tab,
        });
    }
    async onClickedDTATurboSelection(info, tab) {
        return await this.performSelection({
            selectionOnly: true,
            allTabs: false,
            turbo: true,
            tab,
        });
    }
    async onClickedDTARegularLink(info, tab) {
        if (!info.linkUrl) {
            return;
        }
        await this.findSingleItem(tab, info.linkUrl, false);
    }
    async onClickedDTATurboLink(info, tab) {
        if (!info.linkUrl) {
            return;
        }
        await this.findSingleItem(tab, info.linkUrl, true);
    }
    async onClickedDTARegularImage(info, tab) {
        if (!info.srcUrl) {
            return;
        }
        await this.findSingleItem(tab, info.srcUrl, false);
    }
    async onClickedDTATurboImage(info, tab) {
        if (!info.srcUrl) {
            return;
        }
        await this.findSingleItem(tab, info.srcUrl, true);
    }
    async onClickedDTARegularMedia(info, tab) {
        if (!info.srcUrl) {
            return;
        }
        await this.findSingleItem(tab, info.srcUrl, false);
    }
    async onClickedDTATurboMedia(info, tab) {
        if (!info.srcUrl) {
            return;
        }
        await this.findSingleItem(tab, info.srcUrl, true);
    }
    onClickedDTAAdd() {
        api_1.API.singleRegular(null);
    }
    async onClickedDTAManager() {
        await man_1.openManager();
    }
    async onClickedDTAPrefs() {
        await windowutils_1.openPrefs();
    }
}();
bus_1.Bus.on("do-regular", () => menuHandler.emulate("DTARegular"));
bus_1.Bus.on("do-regular-all", () => menuHandler.emulate("DTARegularAll"));
bus_1.Bus.on("do-turbo", () => menuHandler.emulate("DTATurbo"));
bus_1.Bus.on("do-turbo-all", () => menuHandler.emulate("DTATurboAll"));
bus_1.Bus.on("do-single", () => api_1.API.singleRegular(null));
bus_1.Bus.on("open-manager", () => man_1.openManager(true));
bus_1.Bus.on("open-prefs", () => windowutils_1.openPrefs());
new class Action extends Handler {
    constructor() {
        super();
        this.onClicked = this.onClicked.bind(this);
        action.onClicked.addListener(this.onClicked);
        prefs_1.Prefs.get("button-type", false).then(v => this.adjust(v));
        prefs_1.Prefs.on("button-type", (prefs, key, value) => {
            this.adjust(value);
        });
    }
    adjust(type) {
        action.setPopup({
            popup: type !== "popup" ? "" : "/windows/popup.html"
        });
        let icons;
        switch (type) {
            case "popup":
                icons = {
                    16: "/style/icon16.png",
                    32: "/style/icon32.png",
                    48: "/style/icon48.png",
                    64: "/style/icon64.png",
                    128: "/style/icon128.png",
                    256: "/style/icon256.png"
                };
                break;
            case "dta":
                icons = {
                    16: "/style/button-regular.png",
                    32: "/style/button-regular@2x.png",
                };
                break;
            case "turbo":
                icons = {
                    16: "/style/button-turbo.png",
                    32: "/style/button-turbo@2x.png",
                };
                break;
            case "manager":
                icons = {
                    16: "/style/button-manager.png",
                    32: "/style/button-manager@2x.png",
                };
                break;
        }
        action.setIcon({ path: icons });
    }
    async onClicked() {
        switch (await prefs_1.Prefs.get("button-type")) {
            case "popup":
                break;
            case "dta":
                menuHandler.emulate("DTARegular");
                break;
            case "turbo":
                menuHandler.emulate("DTATurbo");
                break;
            case "manager":
                menuHandler.emulate("DTAManager");
                break;
        }
    }
}();
try {
    const urlBase = browser_1.runtime.getURL("");
    try {
        browser_1.history.onVisited.addListener(({ url }) => {
            if (!url || !url.startsWith(urlBase)) {
                return;
            }
            browser_1.history.deleteUrl({ url });
        });
        (async function () {
            const results = await browser_1.history.search({ text: urlBase });
            for (const { url } of results) {
                if (!url) {
                    continue;
                }
                browser_1.history.deleteUrl({ url });
            }
        })().catch(ex => console.error("failed to run history cleaner", ex));
    }
    catch (ex) {
        console.error("Failed to clean history", ex);
    }
    if (!browser_1.CHROME) {
        try {
            const sessionRemover = async () => {
                for (const s of await browser_1.sessions.getRecentlyClosed()) {
                    try {
                        if (s.tab && s.tab.url && s.tab.sessionId) {
                            if (s.tab.url.startsWith(urlBase)) {
                                await browser_1.sessions.forgetClosedTab(s.tab.windowId, s.tab.sessionId);
                            }
                            continue;
                        }
                        if (!s.window || !s.window.tabs || s.window.tabs.length > 1) {
                            continue;
                        }
                        const [tab] = s.window.tabs;
                        if (tab.url.startsWith(urlBase) && s.window.sessionId) {
                            await browser_1.sessions.forgetClosedWindow(s.window.sessionId);
                        }
                    }
                    catch (ex) {
                        console.error("failed to remove session entry", ex);
                    }
                }
            };
            browser_1.sessions.onChanged.addListener(sessionRemover);
            sessionRemover().catch(ex => console.error("failed to run session remover", ex));
        }
        catch (ex) {
            console.error("failed to install session remover", ex);
        }
    }
}
catch (ex) {
    console.error("failed to install history/session watchers", ex);
}
i18n_1.locale.then(() => {
    (async function init() {
        try {
            await db_1.DB.init();
        }
        catch (ex) {
            console.error("db init", ex.toString(), ex.message, ex.stack, ex);
        }
        await prefs_1.Prefs.set("last-run", new Date());
        await filters_1.filters();
        await man_2.getManager();
    })().catch(ex => {
        console.error("Failed to init components", ex.toString(), ex.stack, ex);
    });
});


/***/ }),

/***/ "./lib/bus.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Bus = exports.Port = void 0;
// License: MIT
const events_1 = __webpack_require__("./lib/events.ts");
// eslint-disable-next-line no-unused-vars
const browser_1 = __webpack_require__("./lib/browser.ts");
class Port extends events_1.EventEmitter {
    constructor(port) {
        super();
        this.disconnected = false;
        this.paused = false;
        this.pausedMessages = [];
        this.port = port;
        // Nasty firefox bug, thus listen for tab removal explicitly
        if (port.sender && port.sender.tab && port.sender.tab.id) {
            const otherTabId = port.sender.tab.id;
            const tabListener = (tabId) => {
                if (tabId !== otherTabId) {
                    return;
                }
                this.disconnect();
            };
            browser_1.tabs.onRemoved.addListener(tabListener);
        }
        port.onMessage.addListener(this.onMessage.bind(this));
        port.onDisconnect.addListener(this.disconnect.bind(this));
    }
    suspend() {
        this.paused = true;
    }
    resume() {
        if (!this.paused) {
            return;
        }
        this.paused = false;
        this.pausedMessages.forEach(m => this.passMessage(m));
        this.pausedMessages.length = 0;
    }
    disconnect() {
        if (this.disconnected) {
            return;
        }
        this.disconnected = true;
        const { port } = this;
        this.port = null; // Break the cycle
        this.emit("disconnect", this, port);
    }
    get name() {
        if (!this.port) {
            return null;
        }
        return this.port.name;
    }
    get id() {
        if (!this.port || !this.port.sender) {
            return null;
        }
        return this.port.sender.id;
    }
    get isSelf() {
        return this.id === browser_1.runtime.id;
    }
    post(msg, ...data) {
        if (!this.port) {
            return;
        }
        if (!data) {
            this.port.postMessage({ msg });
            return;
        }
        if (data.length === 1) {
            [data] = data;
        }
        this.port.postMessage({ msg, data });
    }
    onMessage(message) {
        if (!this.port) {
            return;
        }
        if (Array.isArray(message)) {
            message.forEach(this.onMessage, this);
            return;
        }
        if (this.paused) {
            this.pausedMessages.push(message);
            return;
        }
        this.passMessage(message);
    }
    passMessage(message) {
        if (!this.port) {
            return;
        }
        if (Object.keys(message).includes("msg")) {
            this.emit(message.msg, message);
            return;
        }
        if (typeof message === "string") {
            this.emit(message);
            return;
        }
        console.error(`Unhandled message in ${this.port.name}:`, message);
    }
}
exports.Port = Port;
exports.Bus = new class extends events_1.EventEmitter {
    constructor() {
        super();
        this.ports = new events_1.EventEmitter();
        this.onPort = this.ports.on.bind(this.ports);
        this.offPort = this.ports.off.bind(this.ports);
        this.oncePort = this.ports.once.bind(this.ports);
        browser_1.runtime.onMessage.addListener(this.onMessage.bind(this));
        browser_1.runtime.onConnect.addListener(this.onConnect.bind(this));
    }
    onMessage(msg, sender, callback) {
        let { type = null } = msg;
        if (!type) {
            type = msg;
        }
        this.emit(type, msg, callback);
    }
    onConnect(port) {
        if (!port.name) {
            port.disconnect();
            return;
        }
        const wrapped = new Port(port);
        if (!this.ports.emit(port.name, wrapped)) {
            wrapped.disconnect();
        }
    }
}();


/***/ }),

/***/ "./lib/cdheaderparser.ts":
/***/ ((__unused_webpack_module, exports) => {

/**
 * (c) 2017 Rob Wu <rob@robwu.nl> (https://robwu.nl)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CDHeaderParser = void 0;
/* eslint-disable max-len,no-magic-numbers */
// License: MPL-2
/**
  * This typescript port was done by Nils Maier based on
  * https://github.com/Rob--W/open-in-browser/blob/83248155b633ed41bc9cdb1205042653e644abd2/extension/content-disposition.js
  * Special thanks goes to Rob doing all the heavy lifting and putting
  * it together in a reuseable, open source'd library.
  */
const R_RFC6266 = /(?:^|;)\s*filename\*\s*=\s*([^";\s][^;\s]*|"(?:[^"\\]|\\"?)+"?)/i;
const R_RFC5987 = /(?:^|;)\s*filename\s*=\s*([^";\s][^;\s]*|"(?:[^"\\]|\\"?)+"?)/i;
function unquoteRFC2616(value) {
    if (!value.startsWith("\"")) {
        return value;
    }
    const parts = value.slice(1).split("\\\"");
    // Find the first unescaped " and terminate there.
    for (let i = 0; i < parts.length; ++i) {
        const quotindex = parts[i].indexOf("\"");
        if (quotindex !== -1) {
            parts[i] = parts[i].slice(0, quotindex);
            // Truncate and stop the iteration.
            parts.length = i + 1;
        }
        parts[i] = parts[i].replace(/\\(.)/g, "$1");
    }
    value = parts.join("\"");
    return value;
}
class CDHeaderParser {
    constructor() {
        // We need to keep this per instance, because of the global flag.
        // Hence we need to reset it after a use.
        this.R_MULTI = /(?:^|;)\s*filename\*((?!0\d)\d+)(\*?)\s*=\s*([^";\s][^;\s]*|"(?:[^"\\]|\\"?)+"?)/gi;
    }
    /**
     * Parse a content-disposition header, with relaxed spec tolerance
     *
     * @param {string} header Header to parse
     * @returns {string} Parsed header
     */
    parse(header) {
        this.needsFixup = true;
        // filename*=ext-value ("ext-value" from RFC 5987, referenced by RFC 6266).
        {
            const match = R_RFC6266.exec(header);
            if (match) {
                const [, tmp] = match;
                let filename = unquoteRFC2616(tmp);
                filename = unescape(filename);
                filename = this.decodeRFC5897(filename);
                filename = this.decodeRFC2047(filename);
                return this.maybeFixupEncoding(filename);
            }
        }
        // Continuations (RFC 2231 section 3, referenced by RFC 5987 section 3.1).
        // filename*n*=part
        // filename*n=part
        {
            const tmp = this.getParamRFC2231(header);
            if (tmp) {
                // RFC 2047, section
                const filename = this.decodeRFC2047(tmp);
                return this.maybeFixupEncoding(filename);
            }
        }
        // filename=value (RFC 5987, section 4.1).
        {
            const match = R_RFC5987.exec(header);
            if (match) {
                const [, tmp] = match;
                let filename = unquoteRFC2616(tmp);
                filename = this.decodeRFC2047(filename);
                return this.maybeFixupEncoding(filename);
            }
        }
        return "";
    }
    maybeDecode(encoding, value) {
        if (!encoding) {
            return value;
        }
        const bytes = Array.from(value, c => c.charCodeAt(0));
        if (!bytes.every(code => code <= 0xff)) {
            return value;
        }
        try {
            value = new TextDecoder(encoding, { fatal: true }).
                decode(new Uint8Array(bytes));
            this.needsFixup = false;
        }
        catch {
            // TextDecoder constructor threw - unrecognized encoding.
        }
        return value;
    }
    maybeFixupEncoding(value) {
        if (!this.needsFixup && /[\x80-\xff]/.test(value)) {
            return value;
        }
        // Maybe multi-byte UTF-8.
        value = this.maybeDecode("utf-8", value);
        if (!this.needsFixup) {
            return value;
        }
        // Try iso-8859-1 encoding.
        return this.maybeDecode("iso-8859-1", value);
    }
    getParamRFC2231(value) {
        const matches = [];
        // Iterate over all filename*n= and filename*n*= with n being an integer
        // of at least zero. Any non-zero number must not start with '0'.
        let match;
        this.R_MULTI.lastIndex = 0;
        while ((match = this.R_MULTI.exec(value)) !== null) {
            const [, num, quot, part] = match;
            const n = parseInt(num, 10);
            if (n in matches) {
                // Ignore anything after the invalid second filename*0.
                if (n === 0) {
                    break;
                }
                continue;
            }
            matches[n] = [quot, part];
        }
        const parts = [];
        for (let n = 0; n < matches.length; ++n) {
            if (!(n in matches)) {
                // Numbers must be consecutive. Truncate when there is a hole.
                break;
            }
            const [quot, rawPart] = matches[n];
            let part = unquoteRFC2616(rawPart);
            if (quot) {
                part = unescape(part);
                if (n === 0) {
                    part = this.decodeRFC5897(part);
                }
            }
            parts.push(part);
        }
        return parts.join("");
    }
    decodeRFC2047(value) {
        // RFC 2047-decode the result. Firefox tried to drop support for it, but
        // backed out because some servers use it - https://bugzil.la/875615
        // Firefox's condition for decoding is here:
        // eslint-disable-next-line max-len
        // https://searchfox.org/mozilla-central/rev/4a590a5a15e35d88a3b23dd6ac3c471cf85b04a8/netwerk/mime/nsMIMEHeaderParamImpl.cpp#742-748
        // We are more strict and only recognize RFC 2047-encoding if the value
        // starts with "=?", since then it is likely that the full value is
        // RFC 2047-encoded.
        // Firefox also decodes words even where RFC 2047 section 5 states:
        // "An 'encoded-word' MUST NOT appear within a 'quoted-string'."
        // eslint-disable-next-line no-control-regex
        if (!value.startsWith("=?") || /[\x00-\x19\x80-\xff]/.test(value)) {
            return value;
        }
        // RFC 2047, section 2.4
        // encoded-word = "=?" charset "?" encoding "?" encoded-text "?="
        // charset = token (but let's restrict to characters that denote a
        //           possibly valid encoding).
        // encoding = q or b
        // encoded-text = any printable ASCII character other than ? or space.
        //                ... but Firefox permits ? and space.
        return value.replace(/=\?([\w-]*)\?([QqBb])\?((?:[^?]|\?(?!=))*)\?=/g, (_, charset, encoding, text) => {
            if (encoding === "q" || encoding === "Q") {
                // RFC 2047 section 4.2.
                text = text.replace(/_/g, " ");
                text = text.replace(/=([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
                return this.maybeDecode(charset, text);
            }
            // else encoding is b or B - base64 (RFC 2047 section 4.1)
            try {
                text = atob(text);
            }
            catch {
                // ignored
            }
            return this.maybeDecode(charset, text);
        });
    }
    decodeRFC5897(extValue) {
        // Decodes "ext-value" from RFC 5987.
        const extEnd = extValue.indexOf("'");
        if (extEnd < 0) {
            // Some servers send "filename*=" without encoding'language' prefix,
            // e.g. in https://github.com/Rob--W/open-in-browser/issues/26
            // Let's accept the value like Firefox (57) (Chrome 62 rejects it).
            return extValue;
        }
        const encoding = extValue.slice(0, extEnd);
        const langvalue = extValue.slice(extEnd + 1);
        // Ignore language (RFC 5987 section 3.2.1, and RFC 6266 section 4.1 ).
        return this.maybeDecode(encoding, langvalue.replace(/^[^']*'/, ""));
    }
}
exports.CDHeaderParser = CDHeaderParser;


/***/ }),

/***/ "./lib/db.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DB = exports.IDB = void 0;
const state_1 = __webpack_require__("./lib/manager/state.ts");
const browser_1 = __webpack_require__("./lib/browser.ts");
const sorting_1 = __webpack_require__("./lib/sorting.ts");
const VERSION = 1;
const STORE = "queue";
class IDB {
    constructor() {
        this.db = undefined;
        this.getAllInternal = this.getAllInternal.bind(this);
    }
    async init() {
        if (this.db) {
            return;
        }
        await new Promise((resolve, reject) => {
            const req = indexedDB.open("downloads", VERSION);
            req.onupgradeneeded = evt => {
                const db = req.result;
                switch (evt.oldVersion) {
                    case 0: {
                        const queueStore = db.createObjectStore(STORE, {
                            keyPath: "dbId",
                            autoIncrement: true
                        });
                        queueStore.createIndex("by_position", "position", { unique: false });
                        break;
                    }
                }
            };
            req.onerror = ex => reject(ex);
            req.onsuccess = () => {
                this.db = req.result;
                resolve();
            };
        });
    }
    getAllInternal(resolve, reject) {
        if (!this.db) {
            reject(new Error("db closed"));
            return;
        }
        const items = [];
        const transaction = this.db.transaction(STORE, "readonly");
        transaction.onerror = ex => reject(ex);
        const store = transaction.objectStore(STORE);
        const index = store.index("by_position");
        index.openCursor().onsuccess = event => {
            const cursor = event.target.result;
            if (!cursor) {
                resolve(items);
                return;
            }
            items.push(cursor.value);
            cursor.continue();
        };
    }
    async getAll() {
        await this.init();
        return await new Promise(this.getAllInternal);
    }
    saveItemsInternal(items, resolve, reject) {
        if (!items || !items.length || !this.db) {
            resolve();
            return;
        }
        try {
            const transaction = this.db.transaction(STORE, "readwrite");
            transaction.onerror = ex => reject(ex);
            transaction.oncomplete = () => resolve();
            const store = transaction.objectStore(STORE);
            for (const item of items) {
                if (item.private) {
                    continue;
                }
                const json = item.toJSON();
                if (item.state === state_1.RUNNING || item.state === state_1.RETRYING) {
                    json.state = state_1.QUEUED;
                }
                const req = store.put(json);
                if (!("dbId" in item) || item.dbId < 0) {
                    req.onsuccess = () => item.dbId = req.result;
                }
            }
        }
        catch (ex) {
            reject(ex);
        }
    }
    async saveItems(items) {
        await this.init();
        return await new Promise(this.saveItemsInternal.bind(this, items));
    }
    deleteItemsInternal(items, resolve, reject) {
        if (!items || !items.length || !this.db) {
            resolve();
            return;
        }
        try {
            const transaction = this.db.transaction(STORE, "readwrite");
            transaction.onerror = ex => reject(ex);
            transaction.oncomplete = () => resolve();
            const store = transaction.objectStore(STORE);
            for (const item of items) {
                if (item.private) {
                    continue;
                }
                if (!("dbId" in item)) {
                    continue;
                }
                store.delete(item.dbId);
            }
        }
        catch (ex) {
            console.error(ex.message, ex);
            reject(ex);
        }
    }
    async deleteItems(items) {
        if (!items.length) {
            return;
        }
        await this.init();
        await new Promise(this.deleteItemsInternal.bind(this, items));
    }
}
exports.IDB = IDB;
class StorageDB {
    constructor() {
        this.counter = 1;
    }
    async init() {
        const { db = null } = await browser_1.storage.local.get("db");
        if (!db || !db.counter) {
            return;
        }
        this.counter = db.counter;
    }
    async saveItems(items) {
        const db = { items: [] };
        for (const item of items) {
            if (!item.dbId) {
                item.dbId = ++this.counter;
            }
            db.items.push(item.toJSON());
        }
        db.counter = this.counter;
        await browser_1.storage.local.set({ db });
    }
    async deleteItems(items) {
        const gone = new Set(items.map(i => i.dbId));
        const { db = null } = await browser_1.storage.local.get("db");
        if (!db) {
            return;
        }
        db.items = db.items.filter((i) => !gone.has(i.dbId));
        await browser_1.storage.local.set({ db });
    }
    async getAll() {
        const { db = null } = await browser_1.storage.local.get("db");
        if (!db || !Array.isArray(db.items)) {
            return [];
        }
        return sorting_1.sort(db.items, (i) => i.position);
    }
}
class MemoryDB {
    constructor() {
        this.counter = 1;
        this.items = new Map();
    }
    init() {
        return Promise.resolve();
    }
    saveItems(items) {
        for (const item of items) {
            if (item.private) {
                continue;
            }
            if (!item.dbId) {
                item.dbId = ++this.counter;
            }
            this.items.set(item.dbId, item.toJSON());
        }
        return Promise.resolve();
    }
    deleteItems(items) {
        for (const item of items) {
            if (!("dbId" in item)) {
                continue;
            }
            this.items.delete(item.dbId);
        }
        return Promise.resolve();
    }
    getAll() {
        return Promise.resolve(Array.from(this.items.values()));
    }
}
exports.DB = new class DBWrapper {
    async saveItems(items) {
        await this.init();
        return this.db.saveItems(items);
    }
    async deleteItems(items) {
        await this.init();
        return this.db.deleteItems(items);
    }
    async getAll() {
        await this.init();
        return this.db.getAll();
    }
    async init() {
        if (this.db) {
            return;
        }
        try {
            this.db = new IDB();
            await this.db.init();
        }
        catch (ex) {
            console.warn("Failed to initialize idb backend, using storage db fallback", ex);
            try {
                this.db = new StorageDB();
                await this.db.init();
            }
            catch (ex) {
                console.warn("Failed to initialize storage backend, using memory db fallback", ex);
                this.db = new MemoryDB();
                await this.db.init();
            }
        }
    }
}();


/***/ }),

/***/ "./lib/manager/basedownload.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BaseDownload = void 0;
const tslib_1 = __webpack_require__("./node_modules/tslib/tslib.es6.js");
// License: MIT
// eslint-disable-next-line no-unused-vars
const util_1 = __webpack_require__("./lib/util.ts");
const state_1 = __webpack_require__("./lib/manager/state.ts");
const renamer_1 = tslib_1.__importDefault(__webpack_require__("./lib/manager/renamer.ts"));
const SAVEDPROPS = [
    "state",
    "url",
    "usable",
    "referrer",
    "usableReferrer",
    "fileName",
    "mask",
    "subfolder",
    "date",
    // batches
    "batch",
    "idx",
    // meta data
    "description",
    "title",
    "postData",
    // progress
    "totalSize",
    "written",
    // server stuff
    "serverName",
    "browserName",
    "mime",
    "prerolled",
    // other options
    "private",
    "pageTitle",
    // db
    "manId",
    "dbId",
    "position",
];
const DEFAULTS = {
    state: state_1.QUEUED,
    error: "",
    serverName: "",
    browserName: "",
    fileName: "",
    totalSize: 0,
    written: 0,
    manId: 0,
    mime: "",
    prerolled: false,
    retries: 0,
    deadline: 0
};
let sessionId = 0;
class BaseDownload {
    constructor(options) {
        Object.assign(this, DEFAULTS);
        this.assign(options);
        if (this.state === state_1.RUNNING) {
            this.state = state_1.QUEUED;
        }
        this.sessionId = ++sessionId;
        this.renamer = new renamer_1.default(this);
        this.retries = 0;
    }
    assign(options) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const other = options;
        for (const prop of SAVEDPROPS) {
            if (prop in options) {
                self[prop] = other[prop];
            }
        }
        this.uURL = new URL(this.url);
        this.uReferrer = (this.referrer && new URL(this.referrer));
        this.startDate = new Date(options.startDate || Date.now());
        if (options.paused) {
            this.state = state_1.PAUSED;
        }
        if (!this.startDate) {
            this.startDate = new Date(Date.now());
        }
    }
    get finalName() {
        return this.fileName ||
            this.serverName ||
            this.browserName ||
            this.urlName ||
            "index.html";
    }
    get currentName() {
        return this.browserName || this.dest.name || this.finalName;
    }
    get urlName() {
        const path = util_1.parsePath(this.uURL);
        if (path.name) {
            return path.name;
        }
        return util_1.parsePath(path.path).name;
    }
    get dest() {
        return util_1.parsePath(this.renamer.toString());
    }
    toString() {
        return `Download(${this.url})`;
    }
    toJSON() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const rv = {};
        for (const prop of SAVEDPROPS) {
            if (prop in self) {
                rv[prop] = self[prop];
            }
        }
        rv.startDate = +self.startDate;
        return rv;
    }
    toMsg() {
        const rv = this.toJSON();
        rv.sessionId = this.sessionId;
        rv.finalName = this.finalName;
        const { dest } = this;
        rv.destName = dest.name;
        rv.destPath = dest.path;
        rv.destFull = dest.full;
        rv.currentName = this.browserName || rv.destName || rv.finalName;
        rv.currentFull = `${dest.path}/${rv.currentName}`;
        rv.error = this.error;
        rv.ext = this.renamer.p_ext;
        rv.retries = this.retries;
        return rv;
    }
}
exports.BaseDownload = BaseDownload;


/***/ }),

/***/ "./lib/manager/download.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Download = void 0;
const tslib_1 = __webpack_require__("./node_modules/tslib/tslib.es6.js");
// License: MIT
// eslint-disable-next-line no-unused-vars
const browser_1 = __webpack_require__("./lib/browser.ts");
const prefs_1 = __webpack_require__("./lib/prefs.ts");
const pserializer_1 = __webpack_require__("./lib/pserializer.ts");
const util_1 = __webpack_require__("./lib/util.ts");
const basedownload_1 = __webpack_require__("./lib/manager/basedownload.ts");
const renamer_1 = tslib_1.__importDefault(__webpack_require__("./lib/manager/renamer.ts"));
const state_1 = __webpack_require__("./lib/manager/state.ts");
// eslint-disable-next-line no-unused-vars
const preroller_1 = __webpack_require__("./lib/manager/preroller.ts");
function isRecoverable(error) {
    switch (error) {
        case "SERVER_FAILED":
            return true;
        default:
            return error.startsWith("NETWORK_");
    }
}
const RETRIES = new prefs_1.PrefWatcher("retries", 5);
const RETRY_TIME = new prefs_1.PrefWatcher("retry-time", 5);
class Download extends basedownload_1.BaseDownload {
    constructor(manager, options) {
        super(options);
        this.manager = manager;
        this.start = pserializer_1.PromiseSerializer.wrapNew(1, this, this.start);
        this.removed = false;
        this.position = -1;
        this.updateStateFromBrowser().catch(console.error);
    }
    markDirty() {
        this.renamer = new renamer_1.default(this);
        this.manager.setDirty(this);
    }
    changeState(newState) {
        const oldState = this.state;
        if (oldState === newState) {
            return;
        }
        this.state = newState;
        this.error = "";
        this.manager.changedState(this, oldState, this.state);
        this.markDirty();
    }
    async start() {
        if (this.state !== state_1.QUEUED) {
            throw new Error("invalid state");
        }
        if (this.manId) {
            const { manId: id } = this;
            try {
                const state = (await browser_1.downloads.search({ id })).pop() || {};
                if (state.state === "in_progress" && !state.error && !state.paused) {
                    this.changeState(state_1.RUNNING);
                    this.updateStateFromBrowser();
                    return;
                }
                if (state.state === "complete") {
                    this.changeState(state_1.DONE);
                    this.updateStateFromBrowser();
                    return;
                }
                if (!state.canResume) {
                    throw new Error("Cannot resume");
                }
                // Cannot await here
                // Firefox bug: will not return until download is finished
                browser_1.downloads.resume(id).catch(console.error);
                this.changeState(state_1.RUNNING);
                return;
            }
            catch (ex) {
                console.error("cannot resume", ex);
                this.manager.removeManId(this.manId);
                this.removeFromBrowser();
            }
        }
        if (this.state !== state_1.QUEUED) {
            throw new Error("invalid state");
        }
        console.log("starting", this.toString(), this.toMsg());
        this.changeState(state_1.RUNNING);
        // Do NOT await
        this.reallyStart();
    }
    async reallyStart() {
        try {
            if (!this.prerolled) {
                await this.maybePreroll();
                if (this.state !== state_1.RUNNING) {
                    // Aborted by preroll
                    return;
                }
            }
            this.conflictAction = await prefs_1.Prefs.get("conflict-action");
            const options = {
                conflictAction: this.conflictAction,
                saveAs: false,
                url: this.url,
                headers: [],
            };
            if (!browser_1.CHROME) {
                options.filename = this.dest.full;
            }
            if (!browser_1.CHROME && this.private) {
                options.incognito = true;
            }
            if (this.postData) {
                options.body = this.postData;
                options.method = "POST";
            }
            if (!browser_1.CHROME && this.referrer) {
                options.headers.push({
                    name: "Referer",
                    value: this.referrer
                });
            }
            if (this.manId) {
                this.manager.removeManId(this.manId);
            }
            try {
                this.manager.addManId(this.manId = await browser_1.downloads.download(options), this);
            }
            catch (ex) {
                if (!this.referrer) {
                    throw ex;
                }
                // Re-attempt without referrer
                util_1.filterInSitu(options.headers, h => h.name !== "Referer");
                this.manager.addManId(this.manId = await browser_1.downloads.download(options), this);
            }
            this.markDirty();
        }
        catch (ex) {
            console.error("failed to start download", ex.toString(), ex);
            this.changeState(state_1.CANCELED);
            this.error = ex.toString();
        }
    }
    async maybePreroll() {
        try {
            if (this.prerolled) {
                // Check again, just in case, async and all
                return;
            }
            const roller = new preroller_1.Preroller(this);
            if (!roller.shouldPreroll) {
                return;
            }
            const res = await roller.roll();
            if (!res) {
                return;
            }
            this.adoptPrerollResults(res);
        }
        catch (ex) {
            console.error("Failed to preroll", this, ex.toString(), ex.stack, ex);
        }
        finally {
            if (this.state === state_1.RUNNING) {
                this.prerolled = true;
                this.markDirty();
            }
        }
    }
    adoptPrerollResults(res) {
        if (res.mime) {
            this.mime = res.mime;
        }
        if (res.name) {
            this.serverName = res.name;
        }
        if (res.error) {
            this.cancelAccordingToError(res.error);
        }
    }
    resume(forced = false) {
        if (!(state_1.FORCABLE & this.state)) {
            return;
        }
        if (this.state !== state_1.QUEUED) {
            this.changeState(state_1.QUEUED);
        }
        if (forced) {
            this.manager.startDownload(this);
        }
    }
    async pause(retry) {
        if (!(state_1.PAUSEABLE & this.state)) {
            return;
        }
        if (!retry) {
            this.retries = 0;
            this.deadline = 0;
        }
        else {
            // eslint-disable-next-line no-magic-numbers
            this.deadline = Date.now() + RETRY_TIME.value * 60 * 1000;
        }
        if (this.state === state_1.RUNNING && this.manId) {
            try {
                await browser_1.downloads.pause(this.manId);
            }
            catch (ex) {
                console.error("pause", ex.toString(), ex);
                this.cancel();
                return;
            }
        }
        this.changeState(retry ? state_1.RETRYING : state_1.PAUSED);
    }
    reset() {
        this.prerolled = false;
        this.manId = 0;
        this.written = this.totalSize = 0;
        this.mime = this.serverName = this.browserName = "";
        this.retries = 0;
        this.deadline = 0;
    }
    async removeFromBrowser() {
        const { manId: id } = this;
        try {
            await browser_1.downloads.cancel(id);
        }
        catch (ex) {
            // ignored
        }
        await new Promise(r => setTimeout(r, 1000));
        try {
            await browser_1.downloads.erase({ id });
        }
        catch (ex) {
            console.error(id, ex.toString(), ex);
            // ignored
        }
    }
    cancel() {
        if (!(state_1.CANCELABLE & this.state)) {
            return;
        }
        if (this.manId) {
            this.manager.removeManId(this.manId);
            this.removeFromBrowser();
        }
        this.reset();
        this.changeState(state_1.CANCELED);
    }
    async cancelAccordingToError(error) {
        if (!isRecoverable(error) || ++this.retries > RETRIES.value) {
            this.cancel();
            this.error = error;
            return;
        }
        await this.pause(true);
        this.error = error;
    }
    setMissing() {
        if (this.manId) {
            this.manager.removeManId(this.manId);
            this.removeFromBrowser();
        }
        this.reset();
        this.changeState(state_1.MISSING);
    }
    async maybeMissing() {
        if (!this.manId) {
            return null;
        }
        const { manId: id } = this;
        try {
            const dls = await browser_1.downloads.search({ id });
            if (!dls.length) {
                this.setMissing();
                return this;
            }
        }
        catch (ex) {
            console.error("oops", id, ex.toString(), ex);
            this.setMissing();
            return this;
        }
        return null;
    }
    adoptSize(state) {
        const { bytesReceived, totalBytes, fileSize } = state;
        this.written = Math.max(0, bytesReceived);
        this.totalSize = Math.max(0, fileSize >= 0 ? fileSize : totalBytes);
    }
    async updateStateFromBrowser() {
        try {
            if (!this.manId) {
                return;
            }
            const state = (await browser_1.downloads.search({ id: this.manId })).pop();
            if (!state) {
                throw Error(`No state for ${this.manId}: ${this}`);
            }
            const { filename, error } = state;
            const path = util_1.parsePath(filename);
            this.browserName = path.name;
            this.adoptSize(state);
            if (!this.mime && state.mime) {
                this.mime = state.mime;
            }
            this.markDirty();
            switch (state.state) {
                case "in_progress":
                    if (state.paused) {
                        this.changeState(state_1.PAUSED);
                    }
                    else if (error) {
                        this.cancelAccordingToError(error);
                    }
                    else {
                        this.changeState(state_1.RUNNING);
                    }
                    break;
                case "interrupted":
                    if (state.paused) {
                        this.changeState(state_1.PAUSED);
                    }
                    else if (error) {
                        this.cancelAccordingToError(error);
                    }
                    else {
                        this.cancel();
                        this.error = error || "";
                    }
                    break;
                case "complete":
                    this.changeState(state_1.DONE);
                    break;
            }
        }
        catch (ex) {
            console.error("failed to handle state", ex.toString(), ex.stack, ex);
            this.setMissing();
        }
    }
    updateFromSuggestion(state) {
        const res = {};
        if (state.mime) {
            res.mime = state.mime;
        }
        if (state.filename) {
            res.name = state.filename;
        }
        if (state.finalUrl) {
            res.finalURL = state.finalUrl;
            const detected = preroller_1.Preroller.maybeFindNameFromSearchParams(this, res);
            if (detected) {
                res.name = detected;
            }
        }
        try {
            this.adoptPrerollResults(res);
        }
        finally {
            this.markDirty();
        }
    }
}
exports.Download = Download;


/***/ }),

/***/ "./lib/manager/man.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.openManager = exports.getManager = exports.Manager = void 0;
// License: MIT
const events_1 = __webpack_require__("./lib/events.ts");
const notifications_1 = __webpack_require__("./lib/notifications.ts");
const db_1 = __webpack_require__("./lib/db.ts");
const state_1 = __webpack_require__("./lib/manager/state.ts");
// eslint-disable-next-line no-unused-vars
const bus_1 = __webpack_require__("./lib/bus.ts");
const sorting_1 = __webpack_require__("./lib/sorting.ts");
const prefs_1 = __webpack_require__("./lib/prefs.ts");
const i18n_1 = __webpack_require__("./lib/i18n.ts");
const util_1 = __webpack_require__("./lib/util.ts");
const pserializer_1 = __webpack_require__("./lib/pserializer.ts");
const download_1 = __webpack_require__("./lib/manager/download.ts");
const port_1 = __webpack_require__("./lib/manager/port.ts");
const scheduler_1 = __webpack_require__("./lib/manager/scheduler.ts");
const limits_1 = __webpack_require__("./lib/manager/limits.ts");
const browser_1 = __webpack_require__("./lib/browser.ts");
const audio_1 = __webpack_require__("./lib/audio.ts");
const windowstatetracker_1 = __webpack_require__("./lib/windowstatetracker.ts");
const windowutils_1 = __webpack_require__("./lib/windowutils.ts");
const US = browser_1.runtime.getURL("");
const MANAGER_URL = "/windows/manager.html";
const AUTOSAVE_TIMEOUT = 2000;
const DIRTY_TIMEOUT = 100;
// eslint-disable-next-line no-magic-numbers
const MISSING_TIMEOUT = 12 * 1000;
const RELOAD_TIMEOUT = 10 * 1000;
const FINISH_NOTIFICATION_PAUSE = 10 * 1000;
const setShelfEnabled = browser_1.downloads.setShelfEnabled || function () {
    // ignored
};
const FINISH_NOTIFICATION = new prefs_1.PrefWatcher("finish-notification", true);
const SOUNDS = new prefs_1.PrefWatcher("sounds", false);
class Manager extends events_1.EventEmitter {
    constructor() {
        super();
        this.initialChangeIds = [];
        this.initialEraseIds = [];
        this.initialized = false;
        this.active = true;
        this.installedNameListener = false;
        this.shouldReload = false;
        this.notifiedFinished = true;
        this.items = [];
        this.saveQueue = new util_1.CoalescedUpdate(AUTOSAVE_TIMEOUT, this.save.bind(this));
        this.dirty = new util_1.CoalescedUpdate(DIRTY_TIMEOUT, this.processDirty.bind(this));
        this.processDeadlines = this.processDeadlines.bind(this);
        this.sids = new Map();
        this.manIds = new Map();
        this.ports = new Set();
        this.scheduler = null;
        this.running = new Set();
        this.retrying = new Set();
        this.startNext = pserializer_1.PromiseSerializer.wrapNew(1, this, this.startNext);
        this.onChangedInitial = this.onChangedInitial.bind(this);
        this.onChanged = this.onChanged.bind(this);
        this.onErasedInitial = this.onErasedInitial.bind(this);
        this.onErased = this.onErased.bind(this);
        this.onDeterminingFilename = this.onDeterminingFilename.bind(this);
        browser_1.downloads.onChanged.addListener(this.onChangedInitial);
        browser_1.downloads.onErased.addListener(this.onErasedInitial);
        // Setup the port
        const handleNewPort = (port) => {
            const managerPort = new port_1.ManagerPort(this, port);
            port.on("disconnect", () => {
                this.ports.delete(managerPort);
            });
            if (!this.initialized) {
                port.suspend();
            }
            this.ports.add(managerPort);
            return true;
        };
        bus_1.Bus.onPort("manager", handleNewPort);
        limits_1.Limits.on("changed", () => {
            this.resetScheduler();
        });
        /**
         * Fixme
         */
        /*
        if (CHROME) {
          webRequest.onBeforeSendHeaders.addListener(
            this.stuffReferrer.bind(this),
            {urls: ["<all_urls>"]},
            ["requestHeaders", "extraHeaders"]
          );
        }
        */
    }
    async init() {
        const items = await db_1.DB.getAll();
        items.forEach((i, idx) => {
            const rv = new download_1.Download(this, i);
            rv.position = idx;
            this.sids.set(rv.sessionId, rv);
            if (rv.manId) {
                this.manIds.set(rv.manId, rv);
            }
            this.items.push(rv);
        });
        setTimeout(() => this.checkMissing(), MISSING_TIMEOUT);
        browser_1.runtime.onUpdateAvailable.addListener(() => {
            if (this.running.size) {
                this.shouldReload = true;
                return;
            }
            browser_1.runtime.reload();
        });
        browser_1.downloads.onChanged.removeListener(this.onChangedInitial);
        browser_1.downloads.onErased.removeListener(this.onErasedInitial);
        browser_1.downloads.onChanged.addListener(this.onChanged);
        browser_1.downloads.onErased.addListener(this.onErased);
        this.initialChangeIds.forEach(id => this.onChanged({ id }));
        this.initialChangeIds.length = 0;
        this.initialEraseIds.forEach(id => this.onErased(id));
        this.initialEraseIds.length = 0;
        // Do not wait for the scheduler
        this.resetScheduler();
        this.emit("initialized");
        this.initialized = true;
        // Resume ports
        this.ports.forEach(p => p.resume());
        return this;
    }
    async checkMissing() {
        const serializer = new pserializer_1.PromiseSerializer(2);
        const missing = await Promise.all(this.items.map(item => serializer.scheduleWithContext(item, item.maybeMissing)));
        if (!(await prefs_1.Prefs.get("remove-missing-on-init"))) {
            return;
        }
        this.remove(util_1.filterInSitu(missing, e => !!e));
    }
    onChangedInitial(changes) {
        if (changes && isFinite(changes.id)) {
            this.initialChangeIds.push(changes.id);
        }
    }
    onChanged(changes) {
        const item = this.manIds.get(changes.id);
        if (!item) {
            return;
        }
        item.updateStateFromBrowser();
    }
    onErasedInitial(downloadId) {
        if (downloadId !== undefined) {
            this.initialEraseIds.push(downloadId);
        }
    }
    onErased(downloadId) {
        const item = this.manIds.get(downloadId);
        if (!item) {
            return;
        }
        item.setMissing();
        this.manIds.delete(downloadId);
    }
    onDeterminingFilename(state, suggest) {
        const download = this.manIds.get(state.id);
        if (!download) {
            return false;
        }
        try {
            download.updateFromSuggestion(state);
        }
        finally {
            const suggestion = {
                filename: download.dest.full,
                conflictAction: download.conflictAction
            };
            suggest(suggestion);
        }
        return false;
    }
    async resetScheduler() {
        this.scheduler = null;
        await this.startNext();
    }
    async startNext() {
        if (!this.active) {
            return;
        }
        while (this.running.size < limits_1.Limits.concurrent) {
            if (!this.scheduler) {
                this.scheduler = new scheduler_1.Scheduler(this.items);
            }
            const next = await this.scheduler.next(this.running);
            if (!next) {
                this.maybeRunFinishActions();
                break;
            }
            if (this.running.has(next) || next.state !== state_1.QUEUED) {
                continue;
            }
            try {
                await this.startDownload(next);
            }
            catch (ex) {
                next.changeState(state_1.CANCELED);
                next.error = ex.toString();
                console.error(ex.toString(), ex);
            }
        }
    }
    maybeInstallNameListener() {
        if (this.installedNameListener ||
            !browser_1.CHROME ||
            !browser_1.downloads.onDeterminingFilename) {
            return;
        }
        browser_1.downloads.onDeterminingFilename.addListener(this.onDeterminingFilename);
        this.installedNameListener = true;
    }
    async startDownload(download) {
        // Add to running first, so we don't confuse the scheduler and other parts
        this.running.add(download);
        this.maybeInstallNameListener();
        setShelfEnabled(false);
        await download.start();
        this.notifiedFinished = false;
    }
    maybeRunFinishActions() {
        if (this.running.size) {
            return;
        }
        if (this.installedNameListener && browser_1.downloads.onDeterminingFilename) {
            browser_1.downloads.onDeterminingFilename.removeListener(this.onDeterminingFilename);
            this.installedNameListener = false;
        }
        this.maybeNotifyFinished();
        if (this.shouldReload) {
            this.saveQueue.trigger();
            setTimeout(() => {
                if (this.running.size) {
                    return;
                }
                browser_1.runtime.reload();
            }, RELOAD_TIMEOUT);
        }
        setShelfEnabled(true);
    }
    maybeNotifyFinished() {
        if (this.notifiedFinished || this.running.size || this.retrying.size) {
            return;
        }
        if (SOUNDS.value && !browser_1.OPERA) {
            audio_1.playAudio("done");
        }
        if (FINISH_NOTIFICATION.value) {
            if (!this.lastFinishNotification ||
                Date.now() > this.lastFinishNotification + FINISH_NOTIFICATION_PAUSE) {
                new notifications_1.Notification(null, i18n_1._("queue-finished"));
                this.lastFinishNotification = Date.now();
            }
        }
        this.notifiedFinished = true;
    }
    addManId(id, download) {
        this.manIds.set(id, download);
    }
    removeManId(id) {
        this.manIds.delete(id);
    }
    addNewDownloads(items) {
        if (!items || !items.length) {
            return;
        }
        items = items.map(i => {
            const dl = new download_1.Download(this, i);
            dl.position = this.items.push(dl) - 1;
            this.sids.set(dl.sessionId, dl);
            dl.markDirty();
            return dl;
        });
        prefs_1.Prefs.get("nagging", 0).
            then(v => {
            return prefs_1.Prefs.set("nagging", (v || 0) + items.length);
        }).
            catch(console.error);
        this.scheduler = null;
        this.save(items);
        this.startNext();
    }
    setDirty(item) {
        this.dirty.add(item);
    }
    removeDirty(item) {
        this.dirty.delete(item);
    }
    processDirty(items) {
        items = items.filter(i => !i.removed);
        items.forEach(item => this.saveQueue.add(item));
        this.emit("dirty", items);
    }
    save(items) {
        db_1.DB.saveItems(items.filter(i => !i.removed)).
            catch(console.error);
    }
    setPositions() {
        const items = this.items.filter((e, idx) => {
            if (e.position === idx) {
                return false;
            }
            e.position = idx;
            e.markDirty();
            return true;
        });
        if (!items.length) {
            return;
        }
        this.save(items);
        this.resetScheduler();
    }
    forEach(sids, cb) {
        sids.forEach(sid => {
            const download = this.sids.get(sid);
            if (!download) {
                return;
            }
            cb.call(this, download);
        });
    }
    resumeDownloads(sids, forced = false) {
        this.forEach(sids, download => download.resume(forced));
    }
    pauseDownloads(sids) {
        this.forEach(sids, download => download.pause());
    }
    cancelDownloads(sids) {
        this.forEach(sids, download => download.cancel());
    }
    setMissing(sid) {
        this.forEach([sid], download => download.setMissing());
    }
    changedState(download, oldState, newState) {
        if (oldState === state_1.RUNNING) {
            this.running.delete(download);
        }
        else if (oldState === state_1.RETRYING) {
            this.retrying.delete(download);
            this.findDeadline();
        }
        if (newState === state_1.QUEUED) {
            this.resetScheduler();
            this.startNext().catch(console.error);
        }
        else if (newState === state_1.RUNNING) {
            // Usually we already added it. But if a user uses the built-in
            // download manager to restart
            // a download, we have not, so make sure it is added either way
            this.running.add(download);
        }
        else {
            if (newState === state_1.RETRYING) {
                this.addRetry(download);
            }
            else if (newState === state_1.FINISHING) {
                setShelfEnabled(false);
            }
            else if (newState === state_1.DONE) {
                setShelfEnabled(false);
            }
            this.startNext().catch(console.error);
        }
    }
    addRetry(download) {
        this.retrying.add(download);
        this.findDeadline();
    }
    findDeadline() {
        let deadline = Array.from(this.retrying).
            reduce((deadline, item) => {
            if (deadline) {
                return item.deadline ? Math.min(deadline, item.deadline) : deadline;
            }
            return item.deadline;
        }, 0);
        if (deadline <= 0) {
            return;
        }
        deadline -= Date.now();
        if (deadline <= 0) {
            return;
        }
        if (this.deadlineTimer) {
            window.clearTimeout(this.deadlineTimer);
        }
        this.deadlineTimer = window.setTimeout(this.processDeadlines, deadline);
    }
    processDeadlines() {
        this.deadlineTimer = 0;
        try {
            const now = Date.now();
            this.items.forEach(item => {
                if (item.deadline && Math.abs(item.deadline - now) < 1000) {
                    this.retrying.delete(item);
                    item.resume(false);
                }
            });
        }
        finally {
            this.findDeadline();
        }
    }
    sorted(sids) {
        try {
            // Construct new items
            const currentSids = new Map(this.sids);
            let items = util_1.mapFilterInSitu(sids, sid => {
                const item = currentSids.get(sid);
                if (!item) {
                    return null;
                }
                currentSids.delete(sid);
                return item;
            }, e => !!e);
            if (currentSids.size) {
                items = items.concat(sorting_1.sort(Array.from(currentSids.values()), i => i.position));
            }
            this.items = items;
            this.setPositions();
        }
        catch (ex) {
            console.error("sorted", "sids", sids, "ex", ex.message, ex);
        }
    }
    remove(items) {
        if (!items.length) {
            return;
        }
        items.forEach(item => {
            item.removed = true;
            if (!item.manId) {
                return;
            }
            this.removeManId(item.manId);
            item.cancel();
        });
        db_1.DB.deleteItems(items).then(() => {
            const sids = items.map(item => item.sessionId);
            sids.forEach(sid => this.sids.delete(sid));
            sorting_1.sort(items.map(item => item.position)).
                reverse().
                forEach(idx => this.items.splice(idx, 1));
            this.emit("removed", sids);
            this.setPositions();
            this.resetScheduler();
        }).catch(console.error);
    }
    removeBySids(sids) {
        const items = util_1.mapFilterInSitu(sids, sid => this.sids.get(sid), e => !!e);
        return this.remove(items);
    }
    toggleActive() {
        this.active = !this.active;
        if (this.active) {
            this.startNext();
        }
        this.emit("active", this.active);
    }
    async getMsgItems() {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        await manager;
        return this.items.map(e => e.toMsg());
    }
    stuffReferrer(details) {
        if (details.tabId > 0 && !US.startsWith(details.initiator)) {
            return undefined;
        }
        const sidx = details.requestHeaders.findIndex((e) => e.name.toLowerCase() === "x-dta-id");
        if (sidx < 0) {
            return undefined;
        }
        const sid = parseInt(details.requestHeaders[sidx].value, 10);
        details.requestHeaders.splice(sidx, 1);
        const item = this.sids.get(sid);
        if (!item) {
            return undefined;
        }
        details.requestHeaders.push({
            name: "Referer",
            value: (item.uReferrer || item.uURL).toString()
        });
        const rv = {
            requestHeaders: details.requestHeaders
        };
        return rv;
    }
}
exports.Manager = Manager;
const manager = new Manager().init();
function getManager() {
    return manager;
}
exports.getManager = getManager;
async function openManager(focus = true) {
    try {
        await getManager();
    }
    catch (ex) {
        console.error(ex.toString(), ex);
    }
    const url = browser_1.runtime.getURL(MANAGER_URL);
    const openInPopup = await prefs_1.Prefs.get("manager-in-popup");
    if (openInPopup) {
        const etabs = await browser_1.tabs.query({
            url
        });
        if (etabs.length) {
            if (!focus) {
                return;
            }
            const tab = etabs.pop();
            await browser_1.tabs.update(tab.id, { active: true });
            await browser_1.windows.update(tab.windowId, { focused: true });
            return;
        }
        const tracker = new windowstatetracker_1.WindowStateTracker("manager", {
            minWidth: 700,
            minHeight: 500,
        });
        await tracker.init();
        const windowOptions = tracker.getOptions({
            url,
            type: "popup",
        });
        const window = await browser_1.windows.create(windowOptions);
        tracker.track(window.id);
        try {
            if (!browser_1.CHROME) {
                browser_1.windows.update(window.id, tracker.getOptions({}));
            }
            const port = await Promise.race([
                new Promise(resolve => bus_1.Bus.oncePort("manager", port => {
                    resolve(port);
                    return true;
                })),
                util_1.timeout(5 * 1000)
            ]);
            if (!port.isSelf) {
                throw Error("Invalid sender connected");
            }
            tracker.track(window.id, port);
        }
        catch (ex) {
            console.error("couldn't track manager", ex);
        }
        return;
    }
    if (focus) {
        await windowutils_1.openInTabOrFocus(browser_1.runtime.getURL(MANAGER_URL), false);
    }
    else {
        await windowutils_1.maybeOpenInTab(browser_1.runtime.getURL(MANAGER_URL), false);
    }
}
exports.openManager = openManager;


/***/ }),

/***/ "./lib/manager/port.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ManagerPort = void 0;
// License: MIT
const windowutils_1 = __webpack_require__("./lib/windowutils.ts");
const api_1 = __webpack_require__("./lib/api.ts");
class ManagerPort {
    constructor(manager, port) {
        this.manager = manager;
        this.port = port;
        this.onDirty = this.onDirty.bind(this);
        this.onRemoved = this.onRemoved.bind(this);
        this.onMsgRemoveSids = this.onMsgRemoveSids.bind(this);
        this.manager.on("inited", () => this.sendAll());
        this.manager.on("dirty", this.onDirty);
        this.manager.on("removed", this.onRemoved);
        this.manager.on("active", (active) => {
            this.port.post("active", active);
        });
        port.on("donate", () => {
            windowutils_1.donate();
        });
        port.on("prefs", () => {
            windowutils_1.openPrefs();
        });
        port.on("import", ({ items }) => {
            api_1.API.regular(items, []);
        });
        port.on("all", () => this.sendAll());
        port.on("removeSids", this.onMsgRemoveSids);
        port.on("showSingle", async () => {
            await api_1.API.singleRegular(null);
        });
        port.on("toggle-active", () => {
            this.manager.toggleActive();
        });
        port.on("sorted", ({ sids }) => this.manager.sorted(sids));
        port.on("resume", ({ sids, forced }) => this.manager.resumeDownloads(sids, forced));
        port.on("pause", ({ sids }) => this.manager.pauseDownloads(sids));
        port.on("cancel", ({ sids }) => this.manager.cancelDownloads(sids));
        port.on("missing", ({ sid }) => this.manager.setMissing(sid));
        port.on("ping", () => port.post("pong"));
        this.port.on("disconnect", () => {
            this.manager.off("dirty", this.onDirty);
            this.manager.off("removed", this.onRemoved);
            port.off("removeSids", this.onMsgRemoveSids);
            delete this.manager;
            delete this.port;
        });
    }
    onDirty(items) {
        this.port.post("dirty", items.map(item => item.toMsg()));
    }
    onRemoved(sids) {
        this.port.post("removed", sids);
    }
    onMsgRemoveSids({ sids }) {
        this.manager.removeBySids(sids);
    }
    async sendAll() {
        const items = await this.manager.getMsgItems();
        this.port.post("all", items);
        this.port.post("active", this.manager.active);
    }
    resume() {
        this.port?.resume();
    }
}
exports.ManagerPort = ManagerPort;


/***/ }),

/***/ "./lib/manager/preroller.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Preroller = void 0;
const tslib_1 = __webpack_require__("./node_modules/tslib/tslib.es6.js");
// License: MIT
const whatwg_mimetype_1 = tslib_1.__importDefault(__webpack_require__("./node_modules/whatwg-mimetype/lib/mime-type.js"));
const browser_1 = __webpack_require__("./lib/browser.ts");
const cdheaderparser_1 = __webpack_require__("./lib/cdheaderparser.ts");
const util_1 = __webpack_require__("./lib/util.ts");
const mime_1 = __webpack_require__("./lib/mime.ts");
const PREROLL_HEURISTICS = /dl|attach|download|name|file|get|retr|^n$|\.(php|asp|py|pl|action|htm|shtm)/i;
const PREROLL_HOSTS = /4cdn|chan/;
const PREROLL_TIMEOUT = 10000;
const PREROLL_NOPE = new Set();
/* eslint-disable no-magic-numbers */
const NOPE_STATUSES = Object.freeze(new Set([
    400,
    401,
    402,
    405,
    416,
]));
/* eslint-enable no-magic-numbers */
const PREROLL_SEARCHEXTS = Object.freeze(new Set([
    "php",
    "asp",
    "aspx",
    "inc",
    "py",
    "pl",
    "action",
    "htm",
    "html",
    "shtml"
]));
const NAME_TESTER = /\.[a-z0-9]{1,5}$/i;
const CDPARSER = new cdheaderparser_1.CDHeaderParser();
class Preroller {
    constructor(download) {
        this.download = download;
    }
    get shouldPreroll() {
        if (browser_1.CHROME) {
            return false;
        }
        const { uURL, renamer } = this.download;
        const { pathname, search, host } = uURL;
        if (PREROLL_NOPE.has(host)) {
            return false;
        }
        if (!renamer.p_ext) {
            return true;
        }
        if (search.length) {
            return true;
        }
        if (uURL.pathname.endsWith("/")) {
            return true;
        }
        if (PREROLL_HEURISTICS.test(pathname)) {
            return true;
        }
        if (PREROLL_HOSTS.test(host)) {
            return true;
        }
        return false;
    }
    async roll() {
        try {
            return await (browser_1.CHROME ? this.prerollChrome() : this.prerollFirefox());
        }
        catch (ex) {
            console.error("Failed to preroll", this, ex.toString(), ex.stack, ex);
        }
        return null;
    }
    async prerollFirefox() {
        const controller = new AbortController();
        const { signal } = controller;
        const { uURL, uReferrer } = this.download;
        const res = await fetch(uURL.toString(), {
            method: "GET",
            headers: new Headers({
                Range: "bytes=0-1",
            }),
            mode: "same-origin",
            signal,
            referrer: (uReferrer || uURL).toString(),
        });
        if (res.body) {
            res.body.cancel();
        }
        controller.abort();
        const { headers } = res;
        return this.finalize(headers, res);
    }
    async prerollChrome() {
        let rid = "";
        const { uURL, uReferrer } = this.download;
        const rurl = uURL.toString();
        let listener;
        const wr = new Promise(resolve => {
            listener = (details) => {
                const { url, requestId, statusCode } = details;
                if (rid !== requestId && url !== rurl) {
                    return;
                }
                // eslint-disable-next-line no-magic-numbers
                if (statusCode >= 300 && statusCode < 400) {
                    // Redirect, continue tracking;
                    rid = requestId;
                    return;
                }
                resolve(details.responseHeaders);
            };
            browser_1.webRequest.onHeadersReceived.addListener(listener, { urls: ["<all_urls>"] }, ["responseHeaders"]);
        });
        const p = Promise.race([
            wr,
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), PREROLL_TIMEOUT))
        ]);
        p.finally(() => {
            browser_1.webRequest.onHeadersReceived.removeListener(listener);
        });
        const controller = new AbortController();
        const { signal } = controller;
        const res = await fetch(rurl, {
            method: "GET",
            headers: new Headers({
                "Range": "bytes=0-1",
                "X-DTA-ID": this.download.sessionId.toString(),
            }),
            signal,
            referrer: (uReferrer || uURL).toString(),
        });
        if (res.body) {
            res.body.cancel();
        }
        controller.abort();
        const headers = await p;
        return this.finalize(new Headers(headers.map(i => [i.name, i.value])), res);
    }
    finalize(headers, res) {
        const rv = {};
        const type = whatwg_mimetype_1.default.parse(headers.get("content-type") || "");
        if (type) {
            rv.mime = type.essence;
        }
        if (res.redirected) {
            try {
                const { name } = util_1.parsePath(new URL(res.url));
                if (name) {
                    rv.name = name;
                }
            }
            catch (ex) {
                console.error("failed to parse path from redirect", ex);
            }
        }
        const dispHeader = headers.get("content-disposition");
        let validDispHeader = false;
        if (dispHeader) {
            const file = CDPARSER.parse(dispHeader);
            if (file && file.length) {
                const name = util_1.sanitizePath(file.replace(/[/\\]+/g, "-"));
                if (name && name.length) {
                    rv.name = name;
                    validDispHeader = true;
                }
            }
        }
        if (!validDispHeader) {
            const detected = Preroller.maybeFindNameFromSearchParams(this.download, rv);
            if (detected) {
                rv.name = detected;
            }
        }
        rv.finalURL = res.url;
        /* eslint-disable no-magic-numbers */
        const { status } = res;
        if (status === 404) {
            rv.error = "SERVER_BAD_CONTENT";
        }
        else if (status === 403) {
            // Disable for now
            // seems some servers will refuse range requests but not full requests
            //rv.error = "SERVER_FORBIDDEN";
        }
        else if (status === 402 || status === 407) {
            rv.error = "SERVER_UNAUTHORIZED";
        }
        else if (NOPE_STATUSES.has(status)) {
            PREROLL_NOPE.add(this.download.uURL.host);
            if (PREROLL_NOPE.size > 1000) {
                PREROLL_NOPE.delete(PREROLL_NOPE.keys().next().value);
            }
        }
        else if (status > 400 && status < 500) {
            rv.error = "SERVER_FAILED";
        }
        /* eslint-enable no-magic-numbers */
        return rv;
    }
    static maybeFindNameFromSearchParams(download, res) {
        const { p_ext: ext } = download.renamer;
        if (ext && !PREROLL_SEARCHEXTS.has(ext.toLocaleLowerCase("en-US"))) {
            return undefined;
        }
        return Preroller.findNameFromSearchParams(download.uURL, res.mime);
    }
    static findNameFromSearchParams(url, mimetype) {
        const { searchParams } = url;
        let detected = "";
        for (const [, value] of searchParams) {
            if (!NAME_TESTER.test(value)) {
                continue;
            }
            const p = util_1.parsePath(value);
            if (!p.base || !p.ext) {
                continue;
            }
            if (!mime_1.MimeDB.hasExtension(p.ext)) {
                continue;
            }
            if (mimetype) {
                const mime = mime_1.MimeDB.getMime(mimetype);
                if (mime && !mime.extensions.has(p.ext.toLowerCase())) {
                    continue;
                }
            }
            const sanitized = util_1.sanitizePath(p.name);
            if (sanitized.length <= detected.length) {
                continue;
            }
            detected = sanitized;
        }
        return detected;
    }
}
exports.Preroller = Preroller;


/***/ }),

/***/ "./lib/manager/scheduler.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Scheduler = void 0;
// License: MIT
const state_1 = __webpack_require__("./lib/manager/state.ts");
const limits_1 = __webpack_require__("./lib/manager/limits.ts");
const util_1 = __webpack_require__("./lib/util.ts");
const REFILTER_COUNT = 50;
function queuedFilter(d) {
    return d.state === state_1.QUEUED && !d.removed;
}
class Scheduler {
    constructor(queue) {
        this.queue = Array.from(queue).filter(queuedFilter);
        this.runCount = 0;
    }
    async next(running) {
        if (!this.queue.length) {
            return null;
        }
        if (this.runCount > REFILTER_COUNT) {
            util_1.filterInSitu(this.queue, queuedFilter);
            if (!this.queue.length) {
                return null;
            }
        }
        const hosts = Object.create(null);
        for (const d of running) {
            const { domain } = d.uURL;
            if (domain in hosts) {
                hosts[domain]++;
            }
            else {
                hosts[domain] = 1;
            }
        }
        await limits_1.Limits.load();
        for (const d of this.queue) {
            if (d.state !== state_1.QUEUED || d.removed) {
                continue;
            }
            const { domain } = d.uURL;
            const limit = limits_1.Limits.getConcurrentFor(domain);
            const cur = hosts[domain] || 0;
            if (limit <= cur) {
                continue;
            }
            this.runCount++;
            return d;
        }
        return null;
    }
    destroy() {
        this.queue.length = 0;
    }
}
exports.Scheduler = Scheduler;


/***/ }),

/***/ "./lib/notifications.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Notification = void 0;
// License: MIT
const browser_1 = __webpack_require__("./lib/browser.ts");
const events_1 = __webpack_require__("./lib/events.ts");
const DEFAULTS = {
    type: "basic",
    iconUrl: browser_1.runtime.getURL("/style/icon64.png"),
    title: "DownThemAll!",
    message: "message",
};
const TIMEOUT = 4000;
let gid = 1;
class Notification extends events_1.EventEmitter {
    constructor(id, options = {}) {
        super();
        this.generated = !id;
        id = id || `DownThemAll-notification${++gid}`;
        if (typeof options === "string") {
            options = { message: options };
        }
        options = Object.assign(Object.assign({}, DEFAULTS), options);
        this.opened = this.opened.bind(this);
        this.closed = this.closed.bind(this);
        this.clicked = this.clicked.bind(this);
        this.notification = browser_1.notifications.create(id, options);
        this.notification.then(this.opened).catch(console.error);
        browser_1.notifications.onClosed.addListener(this.closed);
        browser_1.notifications.onClicked.addListener(this.clicked);
        browser_1.notifications.onButtonClicked.addListener(this.clicked);
    }
    opened(notification) {
        this.notification = notification;
        this.emit("opened", this);
        if (this.generated) {
            setTimeout(() => {
                browser_1.notifications.clear(notification);
            }, TIMEOUT);
        }
    }
    clicked(notification, button) {
        // We can only be clicked, when we were opened, at which point the
        // notification id is available
        if (notification !== this.notification) {
            return;
        }
        if (typeof button === "number") {
            this.emit("button", this, button);
            return;
        }
        this.emit("clicked", this);
        console.log("clicked", notification);
    }
    async closed(notification) {
        if (notification !== await this.notification) {
            return;
        }
        browser_1.notifications.onClosed.removeListener(this.closed);
        browser_1.notifications.onClicked.removeListener(this.clicked);
        this.emit("closed", this);
    }
}
exports.Notification = Notification;


/***/ }),

/***/ "./lib/select.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.select = void 0;
// License: MIT
// eslint-disable-next-line no-unused-vars
const bus_1 = __webpack_require__("./lib/bus.ts");
const prefs_1 = __webpack_require__("./lib/prefs.ts");
const util_1 = __webpack_require__("./lib/util.ts");
const windowutils_1 = __webpack_require__("./lib/windowutils.ts");
// eslint-disable-next-line no-unused-vars
const filters_1 = __webpack_require__("./lib/filters.ts");
const windowstatetracker_1 = __webpack_require__("./lib/windowstatetracker.ts");
const browser_1 = __webpack_require__("./lib/browser.ts");
function computeSelection(filters, items, onlyFast) {
    let ws = items.map((item, idx) => {
        item.idx = item.idx || idx;
        item.sidx = item.sidx || idx;
        const { matched = null } = item;
        item.prevMatched = matched;
        item.matched = null;
        return item;
    });
    for (const filter of filters) {
        ws = ws.filter(item => {
            if (filter.matchItem(item)) {
                if (filter.id === filters_1.FAST) {
                    item.matched = "fast";
                }
                else if (!onlyFast && typeof filter.id === "string") {
                    item.matched = filter.id;
                }
                else {
                    item.matched = null;
                }
            }
            return !item.matched;
        });
    }
    return items.filter(item => item.prevMatched !== item.matched).map(item => {
        return {
            idx: item.sidx,
            matched: item.matched
        };
    });
}
function* computeActiveFiltersGen(filters, activeOverrides) {
    for (const filter of filters) {
        if (typeof filter.id !== "string") {
            continue;
        }
        const override = activeOverrides.get(filter.id);
        if (typeof override === "boolean") {
            if (override) {
                yield filter;
            }
            continue;
        }
        if (filter.active) {
            yield filter;
        }
    }
}
function computeActiveFilters(filters, activeOverrides) {
    return Array.from(computeActiveFiltersGen(filters, activeOverrides));
}
function filtersToDescs(filters) {
    return filters.map(f => f.descriptor);
}
async function select(links, media) {
    const fm = await filters_1.filters();
    const tracker = new windowstatetracker_1.WindowStateTracker("select", {
        minWidth: 700,
        minHeight: 500,
    });
    await tracker.init();
    const windowOptions = tracker.getOptions({
        url: "/windows/select.html",
        type: "popup",
    });
    const window = await browser_1.windows.create(windowOptions);
    tracker.track(window.id);
    try {
        if (!browser_1.CHROME) {
            browser_1.windows.update(window.id, tracker.getOptions({}));
        }
        const port = await Promise.race([
            new Promise(resolve => bus_1.Bus.oncePort("select", port => {
                resolve(port);
                return true;
            })),
            util_1.timeout(5 * 1000)
        ]);
        if (!port.isSelf) {
            throw Error("Invalid sender connected");
        }
        tracker.track(window.id, port);
        const overrides = new Map();
        let fast = null;
        let onlyFast;
        try {
            fast = await fm.getFastFilter();
        }
        catch (ex) {
            // ignored
        }
        const sendFilters = function (delta = false) {
            const { linkFilters, mediaFilters } = fm;
            const alink = computeActiveFilters(linkFilters, overrides);
            const amedia = computeActiveFilters(mediaFilters, overrides);
            const sactiveFilters = new Set();
            [alink, amedia].forEach(a => a.forEach(filter => sactiveFilters.add(filter.id)));
            const activeFilters = Array.from(sactiveFilters);
            const linkFilterDescs = filtersToDescs(linkFilters);
            const mediaFilterDescs = filtersToDescs(mediaFilters);
            port.post("filters", { linkFilterDescs, mediaFilterDescs, activeFilters });
            if (fast) {
                alink.unshift(fast);
                amedia.unshift(fast);
            }
            const deltaLinks = computeSelection(alink, links, onlyFast);
            const deltaMedia = computeSelection(amedia, media, onlyFast);
            if (delta) {
                port.post("item-delta", { deltaLinks, deltaMedia });
            }
        };
        const done = new util_1.Promised();
        port.on("disconnect", () => {
            done.reject(new Error("Prematurely disconnected"));
        });
        port.on("cancel", () => {
            done.reject(new Error("User canceled"));
        });
        port.on("queue", (msg) => {
            done.resolve(msg);
        });
        port.on("filter-changed", (spec) => {
            overrides.set(spec.id, spec.value);
            sendFilters(true);
        });
        port.on("fast-filter", ({ fastFilter }) => {
            if (fastFilter) {
                try {
                    fast = fm.getFastFilterFor(fastFilter);
                }
                catch (ex) {
                    console.error(ex);
                    fast = null;
                }
            }
            else {
                fast = null;
            }
            sendFilters(true);
        });
        port.on("onlyfast", ({ fast }) => {
            onlyFast = fast;
            sendFilters(true);
        });
        port.on("donate", () => {
            windowutils_1.donate();
        });
        port.on("prefs", () => {
            windowutils_1.openPrefs();
        });
        port.on("openUrls", ({ urls, incognito }) => {
            windowutils_1.openUrls(urls, incognito);
        });
        try {
            fm.on("changed", () => sendFilters(true));
            sendFilters(false);
            const type = await prefs_1.Prefs.get("last-type", "links");
            port.post("items", { type, links, media });
            const { items, options } = await done;
            const selectedIndexes = new Set(items);
            const selectedList = (options.type === "links" ? links : media);
            const selectedItems = selectedList.filter((item, idx) => selectedIndexes.has(idx));
            // Select only the first matching media item
            const finalItems = options.type === "media" && selectedItems.length > 0
                ? [selectedItems[0]]
                : selectedItems;
            for (const [filter, override] of overrides) {
                const f = fm.get(filter);
                if (f) {
                    f.active = override;
                }
            }
            await fm.save();
            return { items: finalItems, options };
        }
        finally {
            fm.off("changed", sendFilters);
        }
    }
    finally {
        try {
            await tracker.finalize();
        }
        catch (ex) {
            // window might be gone; ignored
        }
        try {
            await browser_1.windows.remove(window.id);
        }
        catch (ex) {
            // window might be gone; ignored
        }
    }
}
exports.select = select;


/***/ }),

/***/ "./lib/single.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.single = void 0;
// License: MIT
// eslint-disable-next-line no-unused-vars
const bus_1 = __webpack_require__("./lib/bus.ts");
const windowstatetracker_1 = __webpack_require__("./lib/windowstatetracker.ts");
const util_1 = __webpack_require__("./lib/util.ts");
const windowutils_1 = __webpack_require__("./lib/windowutils.ts");
const browser_1 = __webpack_require__("./lib/browser.ts");
async function single(item) {
    const tracker = new windowstatetracker_1.WindowStateTracker("single", {
        minWidth: 750,
        minHeight: 550
    });
    await tracker.init();
    const windowOptions = tracker.getOptions({
        url: "/windows/single.html",
        type: "popup",
    });
    const window = await browser_1.windows.create(windowOptions);
    tracker.track(window.id);
    try {
        if (!browser_1.CHROME) {
            browser_1.windows.update(window.id, tracker.getOptions({}));
        }
        const port = await Promise.race([
            new Promise(resolve => bus_1.Bus.oncePort("single", port => {
                resolve(port);
                return true;
            })),
            util_1.timeout(5 * 1000)
        ]);
        if (!port.isSelf) {
            throw Error("Invalid sender connected");
        }
        tracker.track(window.id, port);
        const done = new util_1.Promised();
        port.on("disconnect", () => {
            done.reject(new Error("Prematurely disconnected"));
        });
        port.on("queue", msg => {
            done.resolve(msg);
        });
        port.on("cancel", () => {
            done.reject(new Error("User canceled"));
        });
        port.on("donate", () => {
            windowutils_1.donate();
        });
        if (item) {
            port.post("item", { item });
        }
        return await done;
    }
    finally {
        try {
            await tracker.finalize();
        }
        catch (ex) {
            // window might be gone; ignored
        }
        try {
            await browser_1.windows.remove(window.id);
        }
        catch (ex) {
            // window might be gone; ignored
        }
    }
}
exports.single = single;


/***/ }),

/***/ "./lib/windowstatetracker.ts":
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WindowStateTracker = void 0;
// License: MIT
const prefs_1 = __webpack_require__("./lib/prefs.ts");
const browser_1 = __webpack_require__("./lib/browser.ts");
const VALID_WINDOW_STATES = Object.freeze(new Set(["normal", "maximized"]));
class WindowStateTracker {
    constructor(windowType, constraints) {
        // eslint-disable-next-line no-magic-numbers
        const { minWidth = 500, minHeight = 400, left = -1, top = -1 } = constraints;
        this.width = this.minWidth = minWidth;
        this.height = this.minHeight = minHeight;
        this.left = left;
        this.top = top;
        this.state = "normal";
        this.key = `window-state-${windowType}`;
        this.update = this.update.bind(this);
    }
    async init() {
        const initialState = await prefs_1.Prefs.get(this.key);
        if (initialState) {
            Object.assign(this, initialState);
        }
        this.validate();
    }
    getOptions(options) {
        const result = Object.assign(options, {
            state: this.state,
        });
        if (result.state !== "maximized") {
            result.width = this.width;
            result.height = this.height;
            if (this.top >= 0) {
                result.top = this.top;
                result.left = this.left;
            }
        }
        return result;
    }
    validate() {
        this.width = Math.max(this.minWidth, this.width) || this.minWidth;
        this.height = Math.max(this.minHeight, this.height) || this.minHeight;
        this.top = Math.max(-1, this.top) || -1;
        this.left = Math.max(-1, this.left) || -1;
        this.state = VALID_WINDOW_STATES.has(this.state) ? this.state : "normal";
    }
    async update() {
        if (!this.windowId) {
            return;
        }
        try {
            const window = await browser_1.windows.get(this.windowId);
            if (!VALID_WINDOW_STATES.has(window.state)) {
                return;
            }
            const previous = JSON.stringify(this);
            this.width = window.width;
            this.height = window.height;
            this.left = window.left;
            this.top = window.top;
            this.state = window.state;
            this.validate();
            if (previous === JSON.stringify(this)) {
                // Nothing changed
                return;
            }
            await this.save();
        }
        catch {
            // ignored
        }
    }
    track(windowId, port) {
        if (port) {
            port.on("resized", this.update);
            port.on("unload", e => this.finalize(e));
            port.on("disconnect", this.finalize.bind(this));
        }
        this.windowId = windowId;
    }
    async finalize(state) {
        if (state) {
            if (state.left > 0) {
                this.left = state.left;
            }
            if (state.top > 0) {
                this.top = state.top;
            }
        }
        await this.update();
        this.windowId = 0;
        if (state) {
            await this.save();
        }
    }
    async save() {
        await prefs_1.Prefs.set(this.key, this.toJSON());
    }
    toJSON() {
        return {
            width: this.width,
            height: this.height,
            top: this.top,
            left: this.left,
            state: this.state,
        };
    }
}
exports.WindowStateTracker = WindowStateTracker;


/***/ }),

/***/ "./node_modules/whatwg-mimetype/lib/mime-type-parameters.js":
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const {
  asciiLowercase,
  solelyContainsHTTPTokenCodePoints,
  soleyContainsHTTPQuotedStringTokenCodePoints
} = __webpack_require__("./node_modules/whatwg-mimetype/lib/utils.js");

module.exports = class MIMETypeParameters {
  constructor(map) {
    this._map = map;
  }

  get size() {
    return this._map.size;
  }

  get(name) {
    name = asciiLowercase(String(name));
    return this._map.get(name);
  }

  has(name) {
    name = asciiLowercase(String(name));
    return this._map.has(name);
  }

  set(name, value) {
    name = asciiLowercase(String(name));
    value = String(value);

    if (!solelyContainsHTTPTokenCodePoints(name)) {
      throw new Error(`Invalid MIME type parameter name "${name}": only HTTP token code points are valid.`);
    }
    if (!soleyContainsHTTPQuotedStringTokenCodePoints(value)) {
      throw new Error(`Invalid MIME type parameter value "${value}": only HTTP quoted-string token code points are ` +
                      `valid.`);
    }

    return this._map.set(name, value);
  }

  clear() {
    this._map.clear();
  }

  delete(name) {
    name = asciiLowercase(String(name));
    return this._map.delete(name);
  }

  forEach(callbackFn, thisArg) {
    this._map.forEach(callbackFn, thisArg);
  }

  keys() {
    return this._map.keys();
  }

  values() {
    return this._map.values();
  }

  entries() {
    return this._map.entries();
  }

  [Symbol.iterator]() {
    return this._map[Symbol.iterator]();
  }
};


/***/ }),

/***/ "./node_modules/whatwg-mimetype/lib/mime-type.js":
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const MIMETypeParameters = __webpack_require__("./node_modules/whatwg-mimetype/lib/mime-type-parameters.js");
const parse = __webpack_require__("./node_modules/whatwg-mimetype/lib/parser.js");
const serialize = __webpack_require__("./node_modules/whatwg-mimetype/lib/serializer.js");
const {
  asciiLowercase,
  solelyContainsHTTPTokenCodePoints
} = __webpack_require__("./node_modules/whatwg-mimetype/lib/utils.js");

module.exports = class MIMEType {
  constructor(string) {
    string = String(string);
    const result = parse(string);
    if (result === null) {
      throw new Error(`Could not parse MIME type string "${string}"`);
    }

    this._type = result.type;
    this._subtype = result.subtype;
    this._parameters = new MIMETypeParameters(result.parameters);
  }

  static parse(string) {
    try {
      return new this(string);
    } catch (e) {
      return null;
    }
  }

  get essence() {
    return `${this.type}/${this.subtype}`;
  }

  get type() {
    return this._type;
  }

  set type(value) {
    value = asciiLowercase(String(value));

    if (value.length === 0) {
      throw new Error("Invalid type: must be a non-empty string");
    }
    if (!solelyContainsHTTPTokenCodePoints(value)) {
      throw new Error(`Invalid type ${value}: must contain only HTTP token code points`);
    }

    this._type = value;
  }

  get subtype() {
    return this._subtype;
  }

  set subtype(value) {
    value = asciiLowercase(String(value));

    if (value.length === 0) {
      throw new Error("Invalid subtype: must be a non-empty string");
    }
    if (!solelyContainsHTTPTokenCodePoints(value)) {
      throw new Error(`Invalid subtype ${value}: must contain only HTTP token code points`);
    }

    this._subtype = value;
  }

  get parameters() {
    return this._parameters;
  }

  toString() {
    // The serialize function works on both "MIME type records" (i.e. the results of parse) and on this class, since
    // this class's interface is identical.
    return serialize(this);
  }

  isJavaScript({ prohibitParameters = false } = {}) {
    switch (this._type) {
      case "text": {
        switch (this._subtype) {
          case "ecmascript":
          case "javascript":
          case "javascript1.0":
          case "javascript1.1":
          case "javascript1.2":
          case "javascript1.3":
          case "javascript1.4":
          case "javascript1.5":
          case "jscript":
          case "livescript":
          case "x-ecmascript":
          case "x-javascript": {
            return !prohibitParameters || this._parameters.size === 0;
          }
          default: {
            return false;
          }
        }
      }
      case "application": {
        switch (this._subtype) {
          case "ecmascript":
          case "javascript":
          case "x-ecmascript":
          case "x-javascript": {
            return !prohibitParameters || this._parameters.size === 0;
          }
          default: {
            return false;
          }
        }
      }
      default: {
        return false;
      }
    }
  }
  isXML() {
    return (this._subtype === "xml" && (this._type === "text" || this._type === "application")) ||
           this._subtype.endsWith("+xml");
  }
  isHTML() {
    return this._subtype === "html" && this._type === "text";
  }
};


/***/ }),

/***/ "./node_modules/whatwg-mimetype/lib/parser.js":
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const {
  removeLeadingAndTrailingHTTPWhitespace,
  removeTrailingHTTPWhitespace,
  isHTTPWhitespaceChar,
  solelyContainsHTTPTokenCodePoints,
  soleyContainsHTTPQuotedStringTokenCodePoints,
  asciiLowercase,
  collectAnHTTPQuotedString
} = __webpack_require__("./node_modules/whatwg-mimetype/lib/utils.js");

module.exports = input => {
  input = removeLeadingAndTrailingHTTPWhitespace(input);

  let position = 0;
  let type = "";
  while (position < input.length && input[position] !== "/") {
    type += input[position];
    ++position;
  }

  if (type.length === 0 || !solelyContainsHTTPTokenCodePoints(type)) {
    return null;
  }

  if (position >= input.length) {
    return null;
  }

  // Skips past "/"
  ++position;

  let subtype = "";
  while (position < input.length && input[position] !== ";") {
    subtype += input[position];
    ++position;
  }

  subtype = removeTrailingHTTPWhitespace(subtype);

  if (subtype.length === 0 || !solelyContainsHTTPTokenCodePoints(subtype)) {
    return null;
  }

  const mimeType = {
    type: asciiLowercase(type),
    subtype: asciiLowercase(subtype),
    parameters: new Map()
  };

  while (position < input.length) {
    // Skip past ";"
    ++position;

    while (isHTTPWhitespaceChar(input[position])) {
      ++position;
    }

    let parameterName = "";
    while (position < input.length && input[position] !== ";" && input[position] !== "=") {
      parameterName += input[position];
      ++position;
    }
    parameterName = asciiLowercase(parameterName);

    if (position < input.length) {
      if (input[position] === ";") {
        continue;
      }

      // Skip past "="
      ++position;
    }

    let parameterValue = null;
    if (input[position] === "\"") {
      [parameterValue, position] = collectAnHTTPQuotedString(input, position);

      while (position < input.length && input[position] !== ";") {
        ++position;
      }
    } else {
      parameterValue = "";
      while (position < input.length && input[position] !== ";") {
        parameterValue += input[position];
        ++position;
      }

      parameterValue = removeTrailingHTTPWhitespace(parameterValue);

      if (parameterValue === "") {
        continue;
      }
    }

    if (parameterName.length > 0 &&
        solelyContainsHTTPTokenCodePoints(parameterName) &&
        soleyContainsHTTPQuotedStringTokenCodePoints(parameterValue) &&
        !mimeType.parameters.has(parameterName)) {
      mimeType.parameters.set(parameterName, parameterValue);
    }
  }

  return mimeType;
};


/***/ }),

/***/ "./node_modules/whatwg-mimetype/lib/serializer.js":
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


const { solelyContainsHTTPTokenCodePoints } = __webpack_require__("./node_modules/whatwg-mimetype/lib/utils.js");

module.exports = mimeType => {
  let serialization = `${mimeType.type}/${mimeType.subtype}`;

  if (mimeType.parameters.size === 0) {
    return serialization;
  }

  for (let [name, value] of mimeType.parameters) {
    serialization += ";";
    serialization += name;
    serialization += "=";

    if (!solelyContainsHTTPTokenCodePoints(value) || value.length === 0) {
      value = value.replace(/(["\\])/ug, "\\$1");
      value = `"${value}"`;
    }

    serialization += value;
  }

  return serialization;
};


/***/ }),

/***/ "./node_modules/whatwg-mimetype/lib/utils.js":
/***/ ((__unused_webpack_module, exports) => {



exports.removeLeadingAndTrailingHTTPWhitespace = string => {
  return string.replace(/^[ \t\n\r]+/u, "").replace(/[ \t\n\r]+$/u, "");
};

exports.removeTrailingHTTPWhitespace = string => {
  return string.replace(/[ \t\n\r]+$/u, "");
};

exports.isHTTPWhitespaceChar = char => {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
};

exports.solelyContainsHTTPTokenCodePoints = string => {
  return /^[-!#$%&'*+.^_`|~A-Za-z0-9]*$/u.test(string);
};

exports.soleyContainsHTTPQuotedStringTokenCodePoints = string => {
  return /^[\t\u0020-\u007E\u0080-\u00FF]*$/u.test(string);
};

exports.asciiLowercase = string => {
  return string.replace(/[A-Z]/ug, l => l.toLowerCase());
};

// This variant only implements it with the extract-value flag set.
exports.collectAnHTTPQuotedString = (input, position) => {
  let value = "";

  position++;

  while (true) {
    while (position < input.length && input[position] !== "\"" && input[position] !== "\\") {
      value += input[position];
      ++position;
    }

    if (position >= input.length) {
      break;
    }

    const quoteOrBackslash = input[position];
    ++position;

    if (quoteOrBackslash === "\\") {
      if (position >= input.length) {
        value += "\\";
        break;
      }

      value += input[position];
      ++position;
    } else {
      break;
    }
  }

  return [value, position];
};


/***/ }),

/***/ "crypto":
/***/ ((module) => {

module.exports = crypto;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"background": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkdtalite"] = self["webpackChunkdtalite"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, ["common"], () => (__webpack_require__("./lib/background.ts")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;
//# sourceMappingURL=background.js.map