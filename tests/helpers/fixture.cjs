"use strict";

const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function fixture(options = {}) {
  let time = options.time || 0;
  const timers = new Map(), draws = [], nodes = new Map(), spoken = [], warnings = [], errors = [];
  const storage = new Map(options.data ? [["cortex.v1", typeof options.data === "string" ? options.data : JSON.stringify(options.data)]] : []);
  const sessionStorage = new Map();
  let writes = 0;
  const context2d = new Proxy({}, {
    get(target, key) {
      if (key === "measureText") return text => ({ width: String(text).length * 9 });
      return key in target ? target[key] : (...args) => draws.push({ method: key, args, color: target.fillStyle });
    }
  });
  const env = {};
  let seed = options.seed ?? 123456789;
  const randomMath = Object.create(Math);
  randomMath.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const element = (tag = "div") => {
    let markup = "", ids = [];
    const node = Object.assign(new EventTarget(), {
    tagName: tag.toUpperCase(), style: {}, dataset: {}, attributes: {}, children: [], hidden: false, textContent: "",
    classList: { toggle() {}, add() {}, remove() {} },
    getContext: () => context2d,
    getBoundingClientRect() {
      return { left: parseFloat(this.style.left) || 0, top: parseFloat(this.style.top) || 0,
        width: parseFloat(this.style.width) || env.innerWidth, height: parseFloat(this.style.height) || env.innerHeight };
    },
    append(...children) { this.children.push(...children); children.forEach(child => { if (typeof child === "object") child.parentElement = this; }); },
    replaceChildren(...children) { this.children = []; this.append(...children); },
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); },
    setAttribute(key, value) { this.attributes[key] = String(value); },
    removeAttribute(key) { delete this.attributes[key]; },
    getAttribute(key) { return this.attributes[key] ?? null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {}, scrollIntoView() {}
    });
    Object.defineProperty(node, "innerHTML", {
      get: () => markup,
      set(value) {
        for (const id of ids) nodes.delete(id);
        markup = String(value);
        const entries = [...markup.matchAll(/<([a-z\d-]+)\b[^>]*\bid="([^"]+)"/gi)];
        ids = entries.map(match => match[2]);
        for (const match of entries) nodes.set(match[2], element(match[1]));
      }
    });
    if (tag === "template") Object.defineProperty(node, "content", {
      get: () => ({ textContent: markup, querySelectorAll: () => [] })
    });
    return node;
  };
  const speech = Object.assign(new EventTarget(), {
    voices: [{ lang: "en-US", localService: true }, { lang: "de-DE", localService: true }],
    getVoices() { return this.voices; },
    speak(utterance) {
      spoken.push(utterance);
      if (options.autoSpeech) setImmediate(() => { utterance.onstart?.(); utterance.onend?.(); });
    },
    cancel() {}
  });
  const width = options.width || 1024, height = options.height || 768;
  const events = new EventTarget(), document = Object.assign(new EventTarget(), {
    documentElement: element("html"), body: element("body"), hidden: false,
    createElement: element, createElementNS: (_, tag) => element(tag),
    querySelector() { return null; }, querySelectorAll() { return []; },
    getElementById: id => nodes.get(id) || null
  });
  Object.assign(env, {
    console: { log() {}, info() {}, warn: (...args) => warnings.push(args), error: (...args) => errors.push(args) },
    Intl, DOMException, AbortController, Event, EventTarget, URL, URLSearchParams, Blob, TextEncoder,
    Math: randomMath, crypto: globalThis.crypto,
    navigator: { language: options.language || "en", maxTouchPoints: options.touch ? 5 : 0, onLine: options.online ?? false },
    performance: { timeOrigin: options.epoch || Date.UTC(2026, 0, 1), now: () => time },
    innerWidth: width, innerHeight: height, devicePixelRatio: options.dpr || 1,
    screen: { width, height, orientation: Object.assign(new EventTarget(), { type: width > height ? "landscape-primary" : "portrait-primary" }) },
    matchMedia: query => Object.assign(new EventTarget(), { matches: query.includes("pointer") && Boolean(options.touch) }),
    localStorage: {
      getItem(key) { if (options.blocked) throw new DOMException("Storage blocked", "SecurityError"); return storage.get(key) || null; },
      setItem(key, value) {
        if (options.blocked) throw new DOMException("Storage blocked", "SecurityError");
        if (options.quota) throw new DOMException("Storage full", "QuotaExceededError");
        writes++; storage.set(key, value);
      },
      removeItem(key) { storage.delete(key); }
    },
    sessionStorage: {
      getItem: key => sessionStorage.get(key) || null,
      setItem: (key, value) => sessionStorage.set(key, value),
      removeItem: key => sessionStorage.delete(key)
    },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    document, location: { hash: "", search: "", protocol: "http:" }, scrollTo() {}, confirm: () => true,
    getComputedStyle: () => ({ getPropertyValue: name => name, paddingTop: "0", paddingBottom: "0", paddingLeft: "0", paddingRight: "0" }),
    speechSynthesis: speech,
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    setTimeout(fn, ms) { const token = {}; timers.set(token, { fn, ms }); return token; },
    clearTimeout(token) { timers.delete(token); },
    setInterval(fn, ms) { const token = {}; timers.set(token, { fn, ms, interval: true }); return token; },
    clearInterval(token) { timers.delete(token); },
    requestAnimationFrame(fn) {
      return setImmediate(() => { time += 16; env.onFrame?.(time); fn(time); });
    }
  });
  env.window = env;
  vm.createContext(env);
  const root = path.join(__dirname, "..", ".."), html = readFileSync(path.join(root, "index.html"), "utf8");
  for (const match of html.matchAll(/<([a-z\d-]+)\b[^>]*\bid="([^"]+)"/gi)) nodes.set(match[2], element(match[1]));
  for (const file of [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1])) {
    vm.runInContext(readFileSync(path.join(root, file), "utf8"), env, { filename: file });
  }
  const C = env.Cortex;
  C.Draw.init(); C.Timing.refreshHz = 60;
  const task = C.Tasks.find(entry => entry.id === "dual-nback");
  function runner(mode = "training", input = options.touch ? "touch" : "keyboard", selected = task, params = selected.params) {
    const ctx = new C.Runner(selected, { ...params }, mode, options.language || "en", input);
    ctx.phase = "block";
    return ctx;
  }
  function panel(ctx) {
    return ctx.prepareOptions([{ value: 0, label: "Position match", key: "a" }, { value: 1, label: "Audio match", key: "l" }], "matches");
  }
  function key(ctx, value, properties = {}) {
    ctx.keyHandler({ key: value, code: `Key${value.toUpperCase()}`, preventDefault() {}, ...properties });
  }
  return { C, env, document, events, speech, spoken, draws, timers, storage, nodes, task, runner, panel, key, warnings, errors,
    get writes() { return writes; },
    expire(ms) { for (const [token, timer] of [...timers]) if (timer.ms === ms) {
      if (!timer.interval) timers.delete(token);
      timer.fn();
    } },
    setTime(value) { time = value; }
  };
}

module.exports = { fixture };
