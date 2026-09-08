"use strict";

window.Cortex = {};

/* Wall-clock dates are derived from the same monotonic clock as trial timestamps. */
(() => {
  const C = window.Cortex;
  C.now = () => performance.now();
  C.iso = () => new Date(performance.timeOrigin + C.now()).toISOString();
  C.today = () => {
    const date = new Date(performance.timeOrigin + C.now());
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  C.validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
  C.validTimestamp = value => typeof value === "string" && C.validDate(value.slice(0, 10)) &&
    /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
  C.clone = value => JSON.parse(JSON.stringify(value));
  C.clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  C.rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  C.pick = values => values[C.rand(0, values.length - 1)];
  C.shuffle = values => {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = C.rand(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  C.uid = () => typeof crypto.randomUUID === "function" ? crypto.randomUUID() :
    `${performance.timeOrigin}-${C.now()}-${Math.random().toString(36).slice(2)}`;
  C.canonical = value => JSON.stringify(value, function (key, entry) {
    return entry && !Array.isArray(entry) && typeof entry === "object" ?
      Object.fromEntries(Object.keys(entry).sort().map(k => [k, entry[k]])) : entry;
  });
  C.device = () => {
    const coarse = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1;
    return !coarse ? "desktop" : Math.min(screen.width, screen.height) < 600 ? "phone" : "tablet";
  };
  C.input = matchMedia("(pointer: coarse)").matches ? "touch" : "keyboard";
  C.download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  };
  C.csvCell = value => {
    let text = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
    if (/^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const empty = () => ({
    schemaVersion: 1,
    settings: { language: navigator.language.toLowerCase().startsWith("de") ? "de" : "en",
      mode: "training", vibration: false, taskParams: {}, staircases: {}, notices: {} },
    sessions: [], trials: {}, itemHashes: {}, forecasts: []
  });
  let root = empty();
  let storageWarning = null;
  let dirty = false;
  let corrupt = false;
  let unreadableOriginal = null;
  const listeners = [];
  const warn = (key, details = "") => {
    storageWarning = { key, details };
    listeners.forEach(fn => fn(storageWarning));
  };
  const migrate = value => {
    // Future schema migrations belong here; never reinterpret an unknown version.
    if (value.schemaVersion !== 1) throw new Error("data.schema");
    return value;
  };
  const validObject = value => value && typeof value === "object" && !Array.isArray(value);
  const sanitize = value => {
    if (Array.isArray(value)) return value.map(sanitize);
    if (validObject(value)) return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !["__proto__", "constructor", "prototype"].includes(key))
      .map(([key, item]) => [key, sanitize(item)]));
    return value;
  };
  const validateForecast = entry => {
    if (!validObject(entry) || typeof entry.id !== "string" || !entry.id ||
      ["__proto__", "constructor", "prototype"].includes(entry.id) ||
      typeof entry.claim !== "string" || !entry.claim.trim() || entry.claim.length > 2000 ||
      typeof entry.topic !== "string" || entry.topic.length > 80 ||
      !Number.isFinite(entry.probability) || entry.probability < 0 || entry.probability > 1 ||
      !C.validDate(entry.resolveBy) || !C.validTimestamp(entry.createdAt) ||
      !["en", "de"].includes(entry.language) || !["open", "resolved", "void", "conflict"].includes(entry.status) ||
      ![null, 0, 1].includes(entry.outcome) ||
      entry.resolvedAt !== null && !C.validTimestamp(entry.resolvedAt) ||
      entry.resolvedAt !== null && Date.parse(entry.resolvedAt) < Date.parse(entry.createdAt) ||
      entry.status === "resolved" && (entry.outcome === null || entry.resolvedAt === null) ||
      entry.status === "open" && (entry.outcome !== null || entry.resolvedAt !== null) ||
      entry.conflictOf !== undefined && (typeof entry.conflictOf !== "string" || entry.conflictOf === entry.id) ||
      entry.status === "conflict" && !entry.conflictOf) throw new Error("forecast.invalid");
    return entry;
  };
  const validate = value => {
    if (!validObject(value)) throw new Error("data.invalid");
    migrate(value);
    if (!Array.isArray(value.sessions) || !validObject(value.settings) ||
      !validObject(value.trials) || !validObject(value.itemHashes || {})) throw new Error("data.invalid");
    const preferences = value.settings;
    if (preferences.language !== undefined && !["en", "de"].includes(preferences.language) ||
      preferences.mode !== undefined && !["training", "assessment"].includes(preferences.mode) ||
      preferences.vibration !== undefined && typeof preferences.vibration !== "boolean" ||
      ["taskParams", "staircases", "notices"].some(key => preferences[key] !== undefined && !validObject(preferences[key]))) {
      throw new Error("data.invalid");
    }
    const ids = new Set();
    value.sessions.forEach(session => {
      if (!validObject(session) || typeof session.id !== "string" || ids.has(session.id) ||
        ["__proto__", "constructor", "prototype"].includes(session.id) ||
        typeof session.taskId !== "string" || !["training", "assessment"].includes(session.mode) ||
        !Number.isFinite(Date.parse(session.startedAt)) || !Number.isFinite(session.durationMs) ||
        session.durationMs < 0 || !validObject(session.params) || !validObject(session.score) ||
        !["en", "de"].includes(session.language) ||
        !["desktop", "tablet", "phone"].includes(session.deviceClass) ||
        !["keyboard", "touch", "mouse"].includes(session.inputMethod) ||
        !Number.isFinite(session.refreshHz) || !validObject(session.viewport) ||
        typeof session.invalid !== "boolean") throw new Error("data.invalid");
      ids.add(session.id);
    });
    for (const [id, rows] of Object.entries(value.trials)) {
      if (!ids.has(id) || !Array.isArray(rows) || rows.some(row => !validObject(row))) {
        throw new Error("data.invalid");
      }
    }
    for (const hashes of Object.values(value.itemHashes || {})) {
      if (!Array.isArray(hashes) || hashes.some(hash => typeof hash !== "string")) throw new Error("data.invalid");
    }
    if (value.forecasts !== undefined && !Array.isArray(value.forecasts)) throw new Error("forecast.invalid");
    const forecastIds = new Set();
    for (const entry of value.forecasts || []) {
      validateForecast(entry);
      if (forecastIds.has(entry.id)) throw new Error("forecast.invalid");
      forecastIds.add(entry.id);
    }
    return sanitize({ ...value, forecasts: value.forecasts || [] });
  };
  const pruneExpired = () => {
    const cutoff = performance.timeOrigin + C.now() - 90 * 86400000;
    const keep = new Set(root.sessions.filter(s => Date.parse(s.startedAt) >= cutoff).map(s => s.id));
    for (const id of Object.keys(root.trials)) if (!keep.has(id)) delete root.trials[id];
  };
  const persist = () => {
    dirty = true;
    if (corrupt) { warn("data.corrupt"); return false; }
    try {
      localStorage.setItem("cortex.v1", JSON.stringify(root));
      dirty = false;
      storageWarning = null;
      listeners.forEach(fn => fn(null));
      return true;
    } catch (error) {
      const quota = error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED";
      warn(quota ? "data.quota" : "data.unavailable", error.message);
      return false; // The entire pending state remains exportable in memory.
    }
  };
  try {
    const raw = localStorage.getItem("cortex.v1");
    unreadableOriginal = raw;
    if (raw) {
      root = validate(JSON.parse(raw));
      root.settings = { ...empty().settings, ...root.settings };
      root.itemHashes ||= {};
      root.forecasts ||= [];
      pruneExpired();
      persist();
    }
    unreadableOriginal = null;
  } catch (error) {
    corrupt = error instanceof SyntaxError || /^(data|forecast)\./.test(error.message);
    warn(corrupt ? "data.corrupt" : "data.unavailable", error.message);
  }
  C.Storage = {
    migrate,
    onWarning(fn) { listeners.push(fn); fn(storageWarning); },
    get pending() { return dirty; },
    get hasUnreadableOriginal() { return unreadableOriginal !== null; },
    exportOriginal() {
      if (unreadableOriginal === null) throw new Error("data.invalid");
      C.download(`cortex-recovery-${C.iso().slice(0, 10)}.json`, unreadableOriginal, "application/json");
    },
    getSettings: () => C.clone(root.settings),
    setSettings(settings) { root.settings = { ...root.settings, ...sanitize(C.clone(settings)) }; return persist(); },
    appendSession(summary) {
      if (root.sessions.some(s => s.id === summary.id)) throw new Error("data.duplicate");
      root.sessions.push(C.clone(summary));
      pruneExpired();
      const saved = persist();
      if (root.sessions.length % 50 === 0) C.notice?.("data.reminder");
      return saved;
    },
    appendTrials(id, rows) {
      if (!root.sessions.some(s => s.id === id)) throw new Error("data.invalid");
      root.trials[id] = [...(root.trials[id] || []), ...C.clone(rows)];
      pruneExpired();
      return persist();
    },
    getSessions(taskId, filter = {}, limit) {
      const rows = root.sessions.filter(s => (!taskId || s.taskId === taskId) &&
        Object.entries(filter || {}).every(([key, value]) => value === undefined || s[key] === value))
        .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      return C.clone(limit ? rows.slice(0, limit) : rows);
    },
    getTrials: id => C.clone(root.trials[id] || []),
    getItemHashes: task => [...(root.itemHashes[task] || [])],
    reserveItems(task, hashes) {
      root.itemHashes[task] = [...new Set([...(root.itemHashes[task] || []), ...hashes])];
      return persist();
    },
    getForecasts: () => C.clone(root.forecasts).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    createForecast({ claim, topic = "", probability, resolveBy, language }) {
      if (typeof claim !== "string" || typeof topic !== "string") throw new Error("forecast.invalid");
      if (!C.validDate(resolveBy) || resolveBy < C.today()) throw new Error("forecast.futureDate");
      const entry = validateForecast({ id: C.uid(), claim: claim.trim(), topic: topic.trim(), probability,
        resolveBy, createdAt: C.iso(), language, status: "open", outcome: null, resolvedAt: null });
      root.forecasts.push(entry);
      return { entry: C.clone(entry), saved: persist() };
    },
    resolveForecast(id, outcome) {
      const entry = root.forecasts.find(item => item.id === id);
      if (!entry || entry.status !== "open" || ![0, 1].includes(outcome)) throw new Error("forecast.invalidResolution");
      const update = validateForecast({ ...entry, outcome, resolvedAt: C.iso(), status: "resolved" });
      Object.assign(entry, update);
      return persist();
    },
    voidForecast(id) {
      const entry = root.forecasts.find(item => item.id === id);
      if (!entry || entry.status === "void") throw new Error("forecast.invalidResolution");
      entry.status = "void"; entry.voidedAt = C.iso();
      return persist();
    },
    acceptForecastConflict(id) {
      const entry = root.forecasts.find(item => item.id === id);
      if (!entry || entry.status !== "conflict") throw new Error("forecast.invalidResolution");
      for (const original of root.forecasts) {
        if (original !== entry && (original.id === entry.conflictOf || original.conflictOf === entry.conflictOf) &&
          original.status !== "conflict") { original.status = "void"; original.voidedAt = C.iso(); }
      }
      entry.status = entry.sourceStatus === "void" ? "void" : entry.outcome === null ? "open" : "resolved";
      entry.reviewedAt = C.iso();
      return persist();
    },
    snapshot: () => C.clone(root),
    exportAll() {
      const text = JSON.stringify(root, null, 2);
      C.download(`cortex-${C.iso().slice(0, 10)}.json`, text, "application/json");
      return text;
    },
    async importAll(file) {
      const incoming = validate(JSON.parse(await file.text()));
      const wasEmpty = root.sessions.length === 0 && root.forecasts.length === 0;
      let added = 0, conflicts = 0, forecastsAdded = 0, forecastsUpdated = 0, forecastConflicts = 0;
      const mappings = new Map();
      for (const session of incoming.sessions) {
        const existing = root.sessions.find(s => s.id === session.id);
        if (existing && C.canonical(existing) === C.canonical(session)) {
          mappings.set(session.id, session.id);
          continue;
        }
        const next = C.clone(session);
        if (existing) { next.id = C.uid(); conflicts++; }
        mappings.set(session.id, next.id);
        root.sessions.push(next);
        added++;
      }
      for (const [id, rows] of Object.entries(incoming.trials)) {
        const mapped = mappings.get(id);
        const existing = root.trials[mapped] || [];
        const keys = new Set(existing.map(C.canonical));
        root.trials[mapped] = [...existing, ...rows.filter(row => !keys.has(C.canonical(row)))];
      }
      // Local preferences and existing staircases win; the import report makes this explicit.
      const fresh = wasEmpty;
      if (fresh) root.settings = { ...empty().settings, ...incoming.settings };
      else {
        root.settings.staircases = { ...incoming.settings.staircases, ...root.settings.staircases };
      }
      for (const [task, hashes] of Object.entries(incoming.itemHashes || {})) {
        root.itemHashes[task] = [...new Set([...(root.itemHashes[task] || []), ...hashes])];
      }
      const identity = entry => C.canonical(Object.fromEntries(
        ["claim", "topic", "probability", "resolveBy", "createdAt", "language"].map(key => [key, entry[key]])));
      for (const entry of incoming.forecasts) {
        const existing = root.forecasts.find(item => item.id === entry.id);
        if (!existing) { root.forecasts.push(C.clone(entry)); forecastsAdded++; continue; }
        if (C.canonical(existing) === C.canonical(entry)) continue;
        if (identity(existing) === identity(entry)) {
          if (existing.status === "open" && entry.status === "resolved") {
            existing.status = "resolved"; existing.outcome = entry.outcome; existing.resolvedAt = entry.resolvedAt;
            forecastsUpdated++; continue;
          }
          if (existing.status === "resolved" && (entry.status === "open" ||
            entry.status === "resolved" && existing.outcome === entry.outcome)) continue;
        }
        const fingerprint = C.canonical(entry);
        if (root.forecasts.some(item => item.importFingerprint === fingerprint)) continue;
        root.forecasts.push({ ...C.clone(entry), id: C.uid(), status: "conflict", conflictOf: entry.id,
          sourceStatus: entry.status, importFingerprint: fingerprint });
        forecastConflicts++;
      }
      pruneExpired();
      return { added, conflicts, forecastsAdded, forecastsUpdated, forecastConflicts, saved: persist(), localSettingsKept: !fresh };
    },
    prune() { root.trials = {}; return persist(); },
    wipe(confirmation) {
      if (confirmation !== "DELETE") throw new Error("data.confirmError");
      root = empty();
      corrupt = false;
      unreadableOriginal = null;
      return persist();
    }
  };
  addEventListener("beforeunload", event => {
    if (dirty || C.active) { event.preventDefault(); event.returnValue = ""; }
  });

  const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const correlation = (x, y) => {
    if (x.length !== y.length || x.length < 3) return null;
    const mx = mean(x), my = mean(y);
    let numerator = 0, xx = 0, yy = 0;
    for (let i = 0; i < x.length; i++) {
      numerator += (x[i] - mx) * (y[i] - my);
      xx += (x[i] - mx) ** 2;
      yy += (y[i] - my) ** 2;
    }
    return xx && yy ? numerator / Math.sqrt(xx * yy) : null;
  };
  // Acklam's inverse standard-normal CDF approximation.
  const z = p => {
    if (!(p > 0 && p < 1)) throw new RangeError("Normal probability must be between zero and one");
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    if (p < 0.02425 || p > 0.97575) {
      const q = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
      const value = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
      return p < 0.5 ? value : -value;
    }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  C.Stats = {
    mean, median, correlation, z,
    dPrime(hits, misses, falseAlarms, correctRejections) {
      return z((hits + 0.5) / (hits + misses + 1)) - z((falseAlarms + 0.5) / (falseAlarms + correctRejections + 1));
    },
    cowan(setSize, hits, misses, falseAlarms, correctRejections) {
      if (!hits && !misses || !falseAlarms && !correctRejections) return null;
      return setSize * (hits / (hits + misses) - falseAlarms / (falseAlarms + correctRejections));
    },
    exclude(trials) {
      const rts = trials.filter(t => Number.isFinite(t.rtMs) && t.rtMs >= 150 && !t.falseStart && !t.unscored).map(t => t.rtMs);
      const center = median(rts);
      return trials.map(row => ({ ...row, excluded: !!row.forcedExclusion || (row.unscored || row.falseStart ? false :
        Number.isFinite(row.rtMs) && (row.rtMs < 150 || center !== null && row.rtMs > 3 * center)) }));
    },
    eligible: trials => trials.filter(t => !t.excluded && !t.unscored && !t.falseStart),
    accuracy(trials) {
      const valid = this.eligible(trials);
      return mean(valid.map(t => Number(t.correct)));
    },
    processingAccuracy(rows) {
      const processing = rows.flatMap(row => row.processing || []);
      return processing.length ? this.eligible(this.exclude(processing)).filter(row => row.correct).length / processing.length : null;
    },
    span(trials) {
      const valid = this.eligible(trials);
      const recalled = valid.reduce((sum, row) => sum + (row.recallCorrect || 0), 0);
      const presented = valid.reduce((sum, row) => sum + row.length, 0);
      return {
        partialCredit: recalled,
        partialCreditLoad: presented ? recalled / presented : null,
        absoluteScore: valid.filter(row => row.correct).reduce((sum, row) => sum + row.length, 0),
        span: Math.max(0, ...valid.filter(row => row.correct).map(row => row.length)),
        totalCorrect: valid.filter(row => row.correct).length
      };
    },
    splitHalf(trials) {
      // Correlate successive odd/even item pairs within conditions. Not a validated population coefficient.
      const valid = this.eligible(trials), groups = new Map(), x = [], y = [];
      for (const row of valid) {
        const key = row.condition ?? row.setSize ?? row.length ?? row.level ?? "all";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(Number.isFinite(row.reliabilityValue) ? row.reliabilityValue : Number(row.correct));
      }
      for (const values of groups.values()) {
        for (let i = 0; i + 1 < values.length; i += 2) { x.push(values[i]); y.push(values[i + 1]); }
      }
      if (x.length < 6) return null;
      const r = correlation(x, y);
      return r === null ? null : r <= -1 ? -1 : C.clamp(2 * r / (1 + r), -1, 1);
    },
    fixedThreshold(trials, target = Math.SQRT1_2) {
      const groups = new Map();
      for (const row of this.eligible(trials)) {
        if (!groups.has(row.durationMs)) groups.set(row.durationMs, { duration: row.durationMs, n: 0, hits: 0 });
        const group = groups.get(row.durationMs); group.n++; group.hits += Number(row.correct);
      }
      const blocks = [];
      // Pool adjacent violations to obtain a monotone, fixed-grid psychometric estimate.
      for (const group of [...groups.values()].sort((a, b) => a.duration - b.duration)) {
        blocks.push({ ...group, logSum: Math.log(group.duration) * group.n });
        while (blocks.length > 1 && blocks.at(-2).hits / blocks.at(-2).n > blocks.at(-1).hits / blocks.at(-1).n) {
          const right = blocks.pop(), left = blocks.pop();
          blocks.push({ n: left.n + right.n, hits: left.hits + right.hits, logSum: left.logSum + right.logSum });
        }
      }
      const points = blocks.map(block => ({ x: block.logSum / block.n, p: block.hits / block.n }));
      if (points.length < 2 || points[0].p > target || points.at(-1).p < target) return null;
      for (let i = 1; i < points.length; i++) if (points[i].p >= target) {
        const a = points[i - 1], b = points[i];
        return Math.exp(a.x + (b.x - a.x) * (target - a.p) / (b.p - a.p || 1));
      }
      return null;
    }
  };

  C.Adaptive = {
    key(task, device, input, language, variant = "") {
      return [task, device, input, language, variant].join("|");
    },
    create(type, config = {}) {
      const continuous = type === "oneUpTwoDown" || type === "oneUpThreeDown";
      const min = config.min ?? (continuous ? 16 : type === "deadline" ? 300 : 1);
      const max = config.max ?? (continuous ? 500 : type === "deadline" ? 3000 : 9);
      return { type, value: C.clamp(config.start ?? (continuous ? 300 : type === "deadline" ? 1000 : 2), min, max),
        min, max, step: config.step ?? Math.log(1.4),
        streak: 0, direction: 0, reversals: [], reversalCount: 0, updates: 0 };
    },
    update(state, result) {
      const next = C.clone(state);
      let direction = 0;
      if (state.type === "stopDelay") {
        direction = result.correct ? 1 : -1;
        next.value = C.clamp(state.value + direction * state.step, state.min, state.max);
      } else if (state.type === "stepwise") {
        if (result.accuracy >= (result.up ?? 0.9) && (result.errors ?? 0) <= 3) direction = 1;
        else if ((result.errors ?? 0) >= (result.downErrors ?? 5) || result.accuracy <= (result.down ?? 0.6)) direction = -1;
        next.value = C.clamp(state.value + direction, state.min, state.max);
      } else if (state.type === "deadline") {
        if (result.accuracy >= 0.9 && result.fast) direction = -1;
        else if (result.accuracy < 0.75) direction = 1;
        next.value = C.clamp(state.value + direction * 50, state.min, state.max);
      } else {
        const required = state.type === "oneUpThreeDown" ? 3 : 2;
        next.streak = result.correct ? state.streak + 1 : 0;
        if (!result.correct) direction = 1;
        else if (next.streak >= required) { direction = -1; next.streak = 0; }
        if (direction && state.direction && direction !== state.direction) {
          next.reversals.push(state.value);
          next.reversalCount = (state.reversalCount ?? state.reversals.length) + 1;
          if (next.reversalCount <= 3) next.step /= 2;
          next.reversals = next.reversals.slice(-6);
        }
        next.value = C.clamp(state.value * Math.exp(direction * next.step), state.min, state.max);
      }
      if (direction) next.direction = direction;
      next.updates++;
      return next;
    },
    threshold: state => state.reversals.length >= 6 ? mean(state.reversals.slice(-6)) : null,
    load(key, type, config) {
      const saved = C.Storage.getSettings().staircases[key];
      return saved && saved.type === type && Number.isFinite(saved.value) && Number.isFinite(saved.step) &&
        Array.isArray(saved.reversals) && saved.reversals.every(Number.isFinite) &&
        Number.isFinite(saved.streak) && Number.isFinite(saved.updates) ? { ...saved, min: config.min, max: config.max,
        reversals: saved.reversals.slice(-6), reversalCount: saved.reversalCount ?? saved.reversals.length,
        value: C.clamp(saved.value, config.min, config.max) } : this.create(type, config);
    },
    save(key, state) {
      const settings = C.Storage.getSettings();
      settings.staircases[key] = state;
      C.Storage.setSettings(settings);
    }
  };
  C.Timing = {
    refreshHz: 0,
    async measure() {
      const timestamps = [];
      await new Promise(resolve => {
        const sample = time => {
          timestamps.push(time);
          if (time - timestamps[0] >= 500) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      this.refreshHz = (timestamps.length - 1) * 1000 / (timestamps.at(-1) - timestamps[0]);
      return this.refreshHz;
    },
    frame: () => new Promise(resolve => requestAnimationFrame(resolve)),
    async wait(ms, signal, paint) {
      const start = await this.frame();
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      paint?.(start);
      let time = start;
      while (time - start < ms) {
        time = await this.frame();
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      }
      return start;
    }
  };
  C.Tasks = [];
  C.register = task => {
    if (C.Tasks.some(entry => entry.id === task.id)) throw new Error("Duplicate task");
    C.Tasks.push({ supportsAssessment: true, touchSupport: "full", languageDependent: false,
      landscape: false, staircase: "stepwise", ...task });
  };
  C.parameter = {
    p: (value, min, max, step = 1) => ({ value, min, max, step }),
    choice: values => ({ value: values[0], choices: values })
  };
  C.define = (id, domain, schema, rest) => C.register({
    id, domain, nameKey: `task.${id}.name`, descKey: `task.${id}.desc`,
    instructionKey: `task.${id}.instructions`, keyMapKey: `task.${id}.keys`,
    paramSchema: schema, params: Object.fromEntries(Object.entries(schema).map(([key, entry]) => [key, entry.value])), ...rest
  });
  C.parameterError = (task, params) => {
    for (const [key, schema] of Object.entries(task.paramSchema)) {
      const value = params[key];
      if (schema.type === "text") {
        if (typeof value !== "string" || value.length > schema.maxLength) return "settings.invalidValue";
      } else if (schema.choices) {
        if (!schema.choices.includes(value)) return "settings.invalidValue";
      } else if (!Number.isFinite(value) || value < schema.min || value > schema.max ||
        Math.abs((value - schema.min) / schema.step - Math.round((value - schema.min) / schema.step)) > 1e-7) {
        return "settings.invalidValue";
      }
    }
    const ranges = [["startLength","maxLength"], ["minOperand","maxOperand"], ["fixationMinMs","fixationMaxMs"],
      ["minIsiMs","maxIsiMs"], ["durationMinMs","durationMaxMs"], ["minLevel","maxLevel"]];
    if (ranges.some(([min, max]) => min in params && max in params && params[min] > params[max])) return "settings.rangeError";
    return task.validateParams?.(params) || null;
  };
  C.accuracyScore = rows => ({
    accuracy: C.Stats.accuracy(rows), correct: C.Stats.eligible(rows).filter(t => t.correct).length
  });
  C.language = C.Storage.getSettings().language;
  C.t = (key, vars = {}) => window.CortexI18n.t(key, vars, C.language);
  const numberFormats = new Map(["en", "de"].flatMap(language => [0, 2].map(digits =>
    [`${language}|${digits}`, new Intl.NumberFormat(language, { maximumFractionDigits: digits })])));
  C.number = (value, digits = 2) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return C.t("common.unknown");
    const key = `${C.language}|${digits}`;
    if (!numberFormats.has(key)) numberFormats.set(key, new Intl.NumberFormat(C.language, { maximumFractionDigits: digits }));
    return numberFormats.get(key).format(value);
  };
  C.date = value => new Intl.DateTimeFormat(C.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
})();

(() => {
  const C = window.Cortex;
  const font = '"Segoe UI", Aptos, Calibri, sans-serif';
  const colors = () => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries(["task-bg", "task-fg", "task-panel", "stim-red", "stim-green", "stim-blue", "stim-yellow",
      "stim-gray", "accent", "border", "surface", "text", "text-muted"].map(name =>
      [name, style.getPropertyValue(`--cp-${name}`).trim()]));
  };
  C.Draw = {
    palette: null,
    init() { this.palette = colors(); },
    scene(paint, width = 420, height = 240) {
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const g = canvas.getContext("2d");
      g.fillStyle = this.palette["task-bg"]; g.fillRect(0, 0, width, height);
      g.fillStyle = this.palette["task-fg"]; g.strokeStyle = this.palette["task-fg"];
      g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 2;
      paint(g, width, height);
      return canvas;
    },
    text(value, size = 54, color) {
      return this.scene((g, w, h) => {
        g.font = `600 ${size}px ${font}`;
        g.fillStyle = color || this.palette["task-fg"];
        g.fillText(String(value), w / 2, h / 2, w - 24);
      }, 420, 140);
    },
    series(values) {
      const terms = [...values, "?"];
      const split = terms.join("   ").length > 34;
      const middle = Math.ceil(terms.length / 2);
      const lines = split ? [terms.slice(0, middle), terms.slice(middle)] : [terms];
      return this.scene((g, w, h) => {
        g.font = `600 32px ${font}`;
        lines.forEach((line, i) => g.fillText(line.join("   "), w / 2, h * (i + 1) / (lines.length + 1), w - 24));
      }, 420, split ? 180 : 140);
    },
    grid(size, active = [], color, irregular = false) {
      return this.scene((g, w, h) => {
        const positions = irregular ? [[.13,.15],[.5,.12],[.8,.22],[.31,.35],[.63,.4],
          [.12,.65],[.43,.68],[.82,.65],[.64,.86]] :
          Array.from({ length: size * size }, (_, i) => [((i % size) + .5) / size, (Math.floor(i / size) + .5) / size]);
        const cell = irregular ? 40 : Math.floor(220 / size) - 8;
        positions.forEach(([x, y], i) => {
          g.fillStyle = active.includes(i) ? color || this.palette["stim-red"] : this.palette["task-panel"];
          g.strokeStyle = this.palette["stim-gray"];
          g.fillRect(x * w - cell / 2, y * h - cell / 2, cell, cell);
          g.strokeRect(x * w - cell / 2, y * h - cell / 2, cell, cell);
        });
      }, irregular ? 360 : 240, 240);
    },
    mask: () => C.Draw.scene((g, w, h) => {
      g.strokeStyle = C.Draw.palette["stim-gray"];
      for (let i = 0; i < 100; i++) {
        g.beginPath(); g.moveTo(C.rand(0, w), C.rand(0, h)); g.lineTo(C.rand(0, w), C.rand(0, h)); g.stroke();
      }
    }),
    vehicle(truck, g, x, y, size = 32) {
      g.fillStyle = this.palette["task-fg"];
      g.fillRect(x - size / 2, y - 5, size, 12);
      if (truck) g.fillRect(x - size / 2, y - 17, size * .6, 15);
      else { g.beginPath(); g.moveTo(x - 11, y - 5); g.lineTo(x - 5, y - 14); g.lineTo(x + 8, y - 14); g.lineTo(x + 14, y - 5); g.fill(); }
      for (const dx of [-size / 3, size / 3]) { g.beginPath(); g.arc(x + dx, y + 9, 5, 0, Math.PI * 2); g.fill(); }
    },
    matrixCell(cell, g, x, y, width, height) {
      g.save(); g.translate(x, y);
      if (cell.bits !== undefined) {
        const unit = Math.min(width, height) / 4;
        for (let i = 0; i < 9; i++) if (cell.bits & (1 << i)) {
          g.fillStyle = this.palette["task-fg"];
          g.fillRect((i % 3 - 1) * unit - unit * .3, (Math.floor(i / 3) - 1) * unit - unit * .3, unit * .6, unit * .6);
        }
      } else {
        const count = cell.count, radius = Math.min(width / (count * 2.4), height / 2.8) * (.5 + cell.size * .2);
        for (let i = 0; i < count; i++) {
          g.save(); g.translate((i - (count - 1) / 2) * width / (count + .2), 0);
          g.rotate(cell.orientation * Math.PI / 2);
          g.beginPath();
          const sides = cell.shape + 3;
          for (let v = 0; v < sides; v++) {
            const angle = v * Math.PI * 2 / sides - Math.PI / 2;
            const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
            if (!v) g.moveTo(px, py); else g.lineTo(px, py);
          }
          g.closePath();
          g.fillStyle = cell.shade === 0 ? this.palette["task-bg"] :
            cell.shade === 1 ? this.palette["stim-gray"] : this.palette["task-fg"];
          g.strokeStyle = this.palette["task-fg"]; g.lineWidth = 1.5; g.fill(); g.stroke();
          // A small directional stem disambiguates rotations of symmetric polygons.
          g.beginPath(); g.moveTo(0, -radius); g.lineTo(0, -radius * 1.4); g.stroke();
          g.restore();
        }
      }
      g.restore();
    },
    svgCell(cell, x, y, width, height) {
      let content = "";
      if (cell.bits !== undefined) {
        const unit = Math.min(width, height) / 4;
        for (let i = 0; i < 9; i++) if (cell.bits & (1 << i)) content +=
          `<rect x="${(i % 3 - 1) * unit - unit * .3}" y="${(Math.floor(i / 3) - 1) * unit - unit * .3}"
            width="${unit * .6}" height="${unit * .6}" fill="var(--cp-task-fg)"/>`;
      } else {
        const count = cell.count, radius = Math.min(width / (count * 2.4), height / 2.8) * (.5 + cell.size * .2);
        for (let i = 0; i < count; i++) {
          const sides = cell.shape + 3, points = Array.from({ length: sides }, (_, v) => {
            const angle = v * Math.PI * 2 / sides - Math.PI / 2;
            return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
          }).join(" ");
          const fill = cell.shade === 0 ? "--cp-task-bg" : cell.shade === 1 ? "--cp-stim-gray" : "--cp-task-fg";
          content += `<g transform="translate(${(i - (count - 1) / 2) * width / (count + .2)} 0) rotate(${cell.orientation * 90})">
            <polygon points="${points}" fill="var(${fill})" stroke="var(--cp-task-fg)" stroke-width="1.5"/>
            <path d="M0 ${-radius}v${-radius * .4}" stroke="var(--cp-task-fg)" stroke-width="1.5"/></g>`;
        }
      }
      return `<g transform="translate(${x} ${y})">${content}</g>`;
    },
    options(labels, keys, pictures) {
      return labels.map((label, i) => ({ value: i, label, key: keys?.[i] || String(i + 1), picture: pictures?.[i] }));
    }
  };

  C.Audio = {
    context: null, voice: null, stimulusSet: "tones", cache: [],
    unlock(language, preserveSet = false) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.context ||= new AudioContext();
        this.context.resume().catch(error => {
          C.notice("audio.unavailable", error.message);
          C.active?.invalidate("audio.unavailable");
        });
      }
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        if (!preserveSet) this.voice = speechSynthesis.getVoices().find(v => v.localService && v.lang.toLowerCase().startsWith(language));
        if (this.voice) {
          const silent = new SpeechSynthesisUtterance(" ");
          silent.voice = this.voice; silent.volume = 0; silent.lang = language === "de" ? "de-DE" : "en-US";
          speechSynthesis.speak(silent);
        }
      }
      this.stimulusSet = this.voice ? `speech-${language}` : "tones";
      return this.context || this.voice;
    },
    prepare(values, language) {
      const letters = language === "de" ? ["F","H","K","L","M","R","S","W"] : ["C","H","K","L","Q","R","S","T"];
      return values.map(value => {
        if (this.voice) {
          const utterance = new SpeechSynthesisUtterance(letters[value]);
          utterance.voice = this.voice; utterance.lang = this.voice.lang; utterance.rate = 1;
          return { utterance, value };
        }
        if (!this.context) return { value };
        const length = Math.ceil(this.context.sampleRate * .25), buffer = this.context.createBuffer(1, length, this.context.sampleRate);
        const samples = buffer.getChannelData(0), frequency = 400 * 4 ** (value / 7);
        for (let i = 0; i < length; i++) {
          const envelope = Math.min(1, i / 240, (length - i) / 480);
          samples[i] = Math.sin(2 * Math.PI * frequency * i / this.context.sampleRate) * .15 * envelope;
        }
        const source = this.context.createBufferSource();
        source.buffer = buffer; source.connect(this.context.destination);
        return { source, value };
      });
    },
    play(sound, trial) {
      if (sound.utterance) {
        sound.utterance.onstart = () => { trial.audioOnset = C.now(); };
        sound.utterance.onerror = event => {
          if (event.error !== "interrupted" && event.error !== "canceled") {
            C.active?.invalidate("audio.failed");
          }
        };
        speechSynthesis.speak(sound.utterance);
      } else if (sound.source) {
        if (this.context.state !== "running") C.active?.invalidate("audio.failed");
        else {
          sound.source.start();
          trial.audioOnset = C.now(); // Scheduling time; browser/device output latency is not measurable here.
        }
      } else C.active?.invalidate("audio.unavailable");
    },
    stop() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
  };

  class Runner {
    constructor(task, params, mode, language, input) {
      const parameterError = C.parameterError(task, params);
      if (parameterError) throw new Error(parameterError);
      this.task = task; this.params = params; this.mode = mode; this.language = language; this.input = input;
      this.vibration = C.Storage.getSettings().vibration;
      this.controller = new AbortController(); this.signal = this.controller.signal;
      this.trials = []; this.practiceTrials = []; this.invalid = false; this.reasons = [];
      this.phase = "instructions"; this.current = null; this.pointers = new Set(); this.states = new Map();
      this.svgScenes = [];
      this.startedAt = C.iso(); this.startTime = C.now();
      this.canvas = document.getElementById("stage"); this.g = this.canvas.getContext("2d");
      const runnerStyle = getComputedStyle(document.getElementById("runner"));
      this.safeBottom = parseFloat(runnerStyle.paddingBottom) || 0;
      this.safeSide = Math.max(parseFloat(runnerStyle.paddingLeft) || 0, parseFloat(runnerStyle.paddingRight) || 0);
      this.w = Math.floor(innerWidth); this.h = Math.floor(innerHeight);
      this.canvas.width = this.w; this.canvas.height = this.h;
      this.stimulusHeight = Math.floor(this.h * .57);
      this.palette = C.Draw.palette;
      this.viewport = { width: this.w, height: this.h, dpr: devicePixelRatio };
      this.deviceClass = C.device(); this.refreshHz = C.Timing.refreshHz;
      this.orientation = screen.orientation?.type || (innerWidth > innerHeight ? "landscape" : "portrait");
      this.frameDuration = 0; this.frameCount = 0;
      this.keyHandler = event => {
        if (event.code === "Escape") {
          event.preventDefault(); this.abort();
          if (this.phase === "between") void C.UI.finish(this);
          return;
        }
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
        if (this.current) {
          const key = event.key === " " ? "space" : event.key.toLowerCase();
          const option = this.current.options.find(o => o.key.toLowerCase() === key ||
            (key === "enter" && o.key === "Enter") || (key === "backspace" && o.key === "Backspace"));
          if (option || this.current.anywhere && (key === "space" || key === "enter")) {
            event.preventDefault(); this.respond(option?.value ?? 0, "keyboard");
          }
        }
      };
      this.pointerHandler = event => {
        event.preventDefault();
        this.pointers.add(event.pointerId);
        if (this.pointers.size >= 2) { this.abort(); return; }
        if (!this.current) return;
        const x = event.clientX, y = event.clientY;
        const zone = this.current.zones.find(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
        if (zone || this.current.anywhere) this.respond(zone?.value ?? 0, event.pointerType === "touch" ? "touch" : "mouse");
      };
      this.releaseHandler = event => this.pointers.delete(event.pointerId);
      this.focusHandler = () => { if (this.phase === "block" || this.phase === "practice") this.abort("runner.focus"); };
      this.visibilityHandler = () => { if (document.hidden) this.focusHandler(); };
      this.orientationHandler = () => {
        const orientation = screen.orientation?.type || (innerWidth > innerHeight ? "landscape" : "portrait");
        const aspectChanged = (innerWidth > innerHeight) !== (this.w > this.h);
        if ((orientation !== this.orientation || aspectChanged) && ["block", "practice"].includes(this.phase)) this.abort("runner.rotation");
      };
      addEventListener("keydown", this.keyHandler);
      this.canvas.addEventListener("pointerdown", this.pointerHandler);
      addEventListener("pointerup", this.releaseHandler); addEventListener("pointercancel", this.releaseHandler);
      addEventListener("blur", this.focusHandler); addEventListener("visibilitychange", this.visibilityHandler);
      screen.orientation?.addEventListener("change", this.orientationHandler);
      addEventListener("orientationchange", this.orientationHandler);
      addEventListener("resize", this.orientationHandler);
      if (this.refreshHz < 50) this.invalidate("runner.refresh");
      this.blank = C.Draw.text("");
      this.feedbackImages = [C.Draw.text("0"), C.Draw.text("1")];
      this.digits = Array.from({ length: 10 }, (_, i) => C.Draw.text(i, 48));
      this.countdownImages = [1, 2, 3].map(n => C.Draw.text(n, 64));
    }
    invalidate(reason) {
      this.invalid = true;
      if (!this.reasons.includes(reason)) this.reasons.push(reason);
      if (this.reasons.length === 1) {
        document.getElementById("runner-message").textContent = C.t(reason);
      }
    }
    abort(reason = "runner.aborted") {
      this.invalidate(reason);
      this.controller.abort();
      this.current = null;
      // Hidden tabs can suspend rAF indefinitely, so persist cancellation before waiting for another frame.
      if (["practice", "block", "between"].includes(this.phase)) void C.UI.finish(this);
    }
    check() { if (this.signal.aborted) throw new DOMException("Aborted", "AbortError"); }
    prepareOptions(options, layout = "standard") {
      const w = this.w, h = this.h, margin = Math.max(12, this.safeSide + 8), gap = 8;
      let cols = options.length <= 3 ? options.length : options.length <= 8 ? 4 : 4;
      if (layout === "words" && w < 600 && h >= w) {
        // Longer labels get more horizontal space without shrinking hit targets.
        cols = options.length <= 8 ? 2 : 3;
      }
      let rows = Math.ceil(options.length / cols);
      const available = Math.min(h * (layout === "words" ? .6 : .41), rows * (layout === "pictures" ? 96 : 60) + gap * (rows - 1));
      const cellH = Math.max(48, (available - gap * (rows - 1)) / rows);
      const cellW = Math.min(180, (w - margin * 2 - gap * (cols - 1)) / cols);
      const bottomMargin = Math.max(12, this.safeBottom + 8, h * .025);
      const top = h - rows * cellH - gap * (rows - 1) - bottomMargin;
      const left = (w - cols * cellW - gap * (cols - 1)) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = Math.ceil(h - top);
      const g = canvas.getContext("2d");
      g.textAlign = "center"; g.textBaseline = "middle";
      const zones = options.map((option, i) => {
        let x = left + (i % cols) * (cellW + gap), y = top + Math.floor(i / cols) * (cellH + gap);
        if (layout === "radial") {
          const radius = Math.min(w / 2 - margin - 36, (h - bottomMargin) / 2 - 66), angle = i * Math.PI / 4 - Math.PI / 2;
          return { ...option, x: w / 2 + Math.cos(angle) * radius - 24,
            y: (h + 32) / 2 + Math.sin(angle) * radius - 24, w: 48, h: 48 };
        }
        if (layout === "corsi") {
          const positions = [[0,0],[2,.12],[4,0],[1,1],[3,1.15],[0,2.15],[2,2.05],[4,2.15],[3,3.15]];
          const unit = Math.min(56, (w - 2 * Math.max(16, margin) - 4 * gap) / 5), pitch = unit + gap;
          x = (w - 5 * unit - 4 * gap) / 2 + positions[i][0] * pitch;
          y = h - 3.15 * 56 - 48 - bottomMargin + positions[i][1] * 56;
          return { ...option, x, y, w: unit, h: 48 };
        }
        return { ...option, x, y, w: cellW, h: cellH };
      });
      // Corsi's irregular response panel is taller than the standard option grid.
      const panelTop = ["corsi", "radial"].includes(layout) ? Math.min(...zones.map(z => z.y)) : top;
      if (["corsi", "radial"].includes(layout)) canvas.height = Math.ceil(h - panelTop);
      for (const zone of zones) {
        const y = zone.y - panelTop;
        g.fillStyle = this.palette["task-panel"]; g.strokeStyle = this.palette["stim-gray"]; g.lineWidth = 1;
        g.fillRect(zone.x, y, zone.w, zone.h); g.strokeRect(zone.x, y, zone.w, zone.h);
        if (zone.picture) {
          g.drawImage(zone.picture, zone.x + 6, y + 4, zone.w - 12, zone.h - 24);
        }
        g.fillStyle = this.palette["task-fg"];
        const pictureLabel = zone.picture || layout === "pictures";
        g.font = `500 ${pictureLabel ? 13 : 18}px ${font}`;
        const label = this.input === "keyboard" && !zone.picture && zone.key.length === 1 && zone.label !== zone.key ?
          `${zone.key.toUpperCase()}  ${zone.label}` : zone.label;
        g.fillText(label, zone.x + zone.w / 2, y + (pictureLabel ? zone.h - 11 : zone.h / 2), zone.w - 10);
      }
      return { canvas, zones, top: panelTop, options };
    }
    prepareMatrix(item, panel) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${this.w} ${this.h}`);
      svg.setAttribute("aria-hidden", "true");
      Object.assign(svg.style, { position: "absolute", inset: "0", width: `${this.w}px`, height: `${this.h}px`,
        pointerEvents: "none", visibility: "hidden" });
      const top = this.w < 600 && this.h >= this.w ? 80 : 30;
      const available = Math.min(this.stimulusHeight - top - 12, panel.top - top - 24);
      const size = Math.min(330, available, this.w - 32), cell = size / 3;
      const left = (this.w - size) / 2;
      let markup = "";
      for (let i = 0; i < 9; i++) {
        const x = left + (i % 3) * cell, y = top + Math.floor(i / 3) * cell;
        markup += `<rect x="${x + 2}" y="${y + 2}" width="${cell - 4}" height="${cell - 4}" fill="var(--cp-task-bg)" stroke="var(--cp-stim-gray)"/>`;
        markup += i === 8 ? `<text x="${x + cell / 2}" y="${y + cell * .65}" text-anchor="middle" font-size="${cell / 2}" fill="var(--cp-task-fg)">?</text>` :
          C.Draw.svgCell(item.cells[i], x + cell / 2, y + cell / 2, cell - 10, cell - 10);
      }
      for (let i = 0; i < panel.zones.length; i++) {
        const zone = panel.zones[i];
        markup += C.Draw.svgCell(item.options[i], zone.x + zone.w / 2, zone.y + (zone.h - 20) / 2, zone.w - 12, zone.h - 28);
      }
      svg.innerHTML = markup;
      document.getElementById("runner").append(svg);
      this.svgScenes.push(svg);
      return { svg };
    }
    paint(scene, panel, entered = [], counter = null) {
      const g = this.g;
      g.fillStyle = this.palette["task-bg"]; g.fillRect(0, 0, this.w, this.h);
      if (this.visibleSvg) this.visibleSvg.style.visibility = "hidden";
      this.visibleSvg = scene?.svg || null;
      if (this.visibleSvg) this.visibleSvg.style.visibility = "visible";
      if (scene && !scene.svg) {
        const areaHeight = Math.min(this.stimulusHeight, panel ? panel.top - 42 : this.stimulusHeight);
        const topMargin = this.w < 600 && this.h >= this.w ? 80 : 24;
        const maxH = Math.max(20, areaHeight - topMargin - 12);
        const scale = Math.min(1, (this.w - 24) / scene.width, maxH / scene.height);
        const width = scene.width * scale, height = scene.height * scale;
        const x = (this.w - width) / 2, y = topMargin + Math.max(0, (areaHeight - topMargin - height) / 2);
        if (scene.layers) {
          for (const layer of scene.layers) g.drawImage(layer.scene, x + layer.x * scale, y + layer.y * scale,
            layer.width * scale, layer.height * scale);
        } else g.drawImage(scene, x, y, width, height);
      }
      if (panel) g.drawImage(panel.canvas, 0, panel.top);
      if (entered.length) {
        const text = entered.map(value => typeof value === "number" ? C.number(value) :
          value === "." ? C.t("response.decimal") : value).join(" ");
        g.fillStyle = this.palette["task-fg"]; g.textAlign = "center"; g.font = `28px ${font}`;
        g.fillText(text, this.w / 2, panel ? panel.top - 16 : this.stimulusHeight + 30, this.w - 24);
      }
      if (counter !== null) {
        g.fillStyle = this.palette["task-fg"]; g.font = `54px Consolas, monospace`; g.textAlign = "center";
        g.fillText(C.number(Math.floor(counter)), this.w / 2, this.stimulusHeight / 2);
      }
    }
    async countdown() {
      for (let i = 2; i >= 0; i--) await C.Timing.wait(1000, this.signal, () => this.paint(this.countdownImages[i]));
    }
    async show(scene, ms, panel) {
      return C.Timing.wait(ms, this.signal, () => this.paint(scene, panel));
    }
    respond(value, method) {
      const current = this.current;
      if (!current || current.done && !current.multi) return;
      if (method !== this.input) { this.invalidate("runner.inputChanged"); }
      const time = C.now();
      if (current.falseStartPhase) { current.falseStarts.push(time); return; }
      if (time - current.startedAt >= current.deadline) {
        current.lateResponses.push({ value, time });
        return;
      }
      if (current.interact) {
        const update = current.interact(value, time, current, current.trial);
        if (!update || typeof update !== "object") throw new TypeError("Interactive response must return a state update");
        if (update.accepted !== false) current.responses.push({ value: update.recordValue ?? value, time });
        if (update.scene) current.scene = update.scene;
        if (update.panel) {
          current.panel = update.panel; current.options = update.panel.options; current.zones = update.panel.zones;
        }
        if (update.done) { current.done = true; current.submittedAt = time; }
        this.paint(current.scene, current.panel, update.entered || []);
      } else if (current.multi) {
        if (!current.responses.some(r => r.value === value)) current.responses.push({ value, time });
      } else if (current.sequence) {
        if (value === "back") current.responses.pop();
        else if (value === "done") { current.done = true; current.submittedAt = time; }
        else current.responses.push({ value, time });
        if (current.maxLength && current.responses.length >= current.maxLength) current.done = true;
        this.paint(current.scene, current.panel, current.responses.map(r => current.displayResponse ? current.displayResponse(r.value) : r.value));
      } else {
        current.responses.push({ value, time }); current.done = true;
      }
    }
    async trial(spec) {
      this.check();
      if (!Number.isFinite(spec.deadline) || spec.deadline <= 0) throw new RangeError("Trial deadline must be positive");
      if ((spec.timeline || []).some((event, index, events) => !Number.isFinite(event.atMs) || event.atMs < 0 ||
        event.atMs >= spec.deadline || index > 0 && event.atMs < events[index - 1].atMs)) {
        throw new RangeError("Trial timeline must be ordered within its response window");
      }
      const trial = { ...spec.meta, stimulusOnset: null, responseTime: null, rtMs: null, correct: false };
      let firstOnset = null, stimulusOnset = null;
      trial.phaseOnsets = [];
      for (const phase of spec.phases || []) {
        const onset = await this.show(phase.scene, phase.ms, phase.panel);
        firstOnset ??= onset;
        if (phase.stimulus) stimulusOnset = onset;
        trial.phaseOnsets.push({ onset, requestedMs: phase.ms, actualMs: C.now() - onset });
      }
      const panel = spec.panel;
      const current = { options: panel?.options || [], zones: panel?.zones || [], panel,
        responses: [], done: false, multi: spec.multi, sequence: spec.sequence,
        maxLength: spec.maxLength, anywhere: spec.anywhere, scene: spec.scene, falseStarts: [],
        falseStartPhase: spec.falseStartPhase, lateResponses: [], deadline: spec.deadline,
        interact: spec.interact, displayResponse: spec.displayResponse, trial };
      const start = await C.Timing.frame(); this.check();
      current.startedAt = start;
      this.current = current;
      trial.stimulusOnset = stimulusOnset ?? start;
      trial.rtReferenceOnset = spec.rtFromFirst ? firstOnset ?? start : start;
      trial.presentationOnset = firstOnset ?? start;
      trial.responseWindowOnset = start;
      if (spec.counter) this.paint(null, null, [], 0);
      else this.paint(spec.scene, panel);
      spec.onset?.(trial);
      const timeline = spec.timeline || [];
      let eventIndex = 0;
      const advanceTimeline = time => {
        while (eventIndex < timeline.length && time - start >= timeline[eventIndex].atMs) {
          const event = timeline[eventIndex++];
          if (time - start >= spec.deadline) { trial.forcedExclusion = true; continue; }
          if (event.scene) current.scene = event.scene;
          if (event.panel) {
            current.panel = event.panel; current.options = event.panel.options; current.zones = event.panel.zones;
          }
          this.paint(current.scene, current.panel);
          event.onset?.(trial, time);
        }
      };
      advanceTimeline(start);
      let frame = start, hidden = false;
      while (frame - start < spec.deadline && (!current.done || spec.multi || spec.waitFullWindow)) {
        const previousFrame = frame;
        frame = await C.Timing.frame(); this.check();
        this.frameDuration += frame - previousFrame; this.frameCount++;
        if (this.frameDuration >= 500) {
          const measured = this.frameCount * 1000 / this.frameDuration;
          this.minimumRefreshHz = Math.min(this.minimumRefreshHz ?? this.refreshHz, measured);
          if (measured < 50) this.invalidate("runner.refresh");
          this.frameDuration = 0; this.frameCount = 0;
        }
        if (spec.visibleMs !== undefined && !hidden && frame - start >= spec.visibleMs) {
          current.scene = spec.mask || this.blank;
          this.paint(current.scene, panel); hidden = true;
        }
        advanceTimeline(frame);
        if (spec.counter) this.paint(null, null, [], frame - start);
        if (spec.feedbackAt !== undefined && frame - start >= spec.feedbackAt &&
          (this.mode === "training" || this.phase === "practice")) {
          const correct = spec.evaluate(current.responses.map(response => response.value), trial);
          this.paint(this.feedbackImages[Number(correct)], panel);
        }
      }
      this.current = null;
      trial.responses = current.responses;
      trial.lateResponses = current.lateResponses;
      trial.responseTime = spec.rtOnSubmit ? current.submittedAt ?? null : current.responses[0]?.time ?? null;
      trial.rtMs = trial.responseTime === null ? null : trial.responseTime - trial.rtReferenceOnset;
      trial.elapsedMs = frame - start;
      trial.response = current.responses.map(r => r.value);
      trial.correct = spec.evaluate ? spec.evaluate(trial.response, trial) : trial.response[0] === spec.answer;
      if (spec.rtOnSubmit && current.submittedAt === undefined) trial.correct = false;
      if (spec.enrich) spec.enrich(trial);
      const collection = this.phase === "practice" ? this.practiceTrials : this.trials;
      if (!spec.noRecord) collection.push(trial);
      if ((this.mode === "training" || this.phase === "practice") && !spec.noFeedback && !spec.noRecord) {
        await this.show(this.feedbackImages[Number(trial.correct)], 250);
        if (this.vibration && navigator.vibrate) navigator.vibrate(15);
      }
      return trial;
    }
    state(variant, type, config) {
      const key = C.Adaptive.key(this.task.id, this.deviceClass, this.input, this.language,
        `${C.canonical(this.params)}|${variant}`);
      if (!this.states.has(key)) this.states.set(key, { key, state: this.mode === "assessment" || this.phase === "practice" ?
        C.Adaptive.create(type, config) : C.Adaptive.load(key, type, config) });
      return this.states.get(key);
    }
    adapt(entry, result) {
      if (this.mode === "training" && this.phase !== "practice") entry.state = C.Adaptive.update(entry.state, result);
      return entry.state.value;
    }
    async close() {
      this.current = null; C.Audio.stop();
      this.svgScenes.forEach(svg => svg.remove());
      removeEventListener("keydown", this.keyHandler);
      this.canvas.removeEventListener("pointerdown", this.pointerHandler);
      removeEventListener("pointerup", this.releaseHandler); removeEventListener("pointercancel", this.releaseHandler);
      removeEventListener("blur", this.focusHandler); removeEventListener("visibilitychange", this.visibilityHandler);
      screen.orientation?.removeEventListener("change", this.orientationHandler);
      removeEventListener("orientationchange", this.orientationHandler);
      removeEventListener("resize", this.orientationHandler);
      if (this.wakeLock) await this.wakeLock.release().catch(error => console.warn("Wake lock release:", error));
    }
  }
  C.Runner = Runner;
})();

(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p, choice } = C.parameter;
  const gridKeys = ["1","2","3","4","5","6","7","8","9","q","w","e","r","t","y","u"];
  C.keypad = ctx => ctx.prepareOptions([
    ...[1,2,3,4,5,6,7,8,9,0].map(n => ({ value: n, label: C.number(n), key: String(n) })),
    { value: ".", label: C.t("response.decimal"), key: ctx.language === "de" ? "," : "." },
    { value: "-", label: "-", key: "-" },
    { value: "back", label: C.t("response.back"), key: "Backspace" },
    { value: "done", label: C.t("response.enter"), key: "Enter" }
  ]);
  C.digitRecallPanel = ctx => ctx.prepareOptions([
    ...Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i), key: String(i) })),
    { value: "back", label: C.t("response.back"), key: "Backspace" },
    { value: "done", label: C.t("response.enter"), key: "Enter" }
  ]);
  C.define("symmetry-span", "working-memory", { processingMs: p(3000, 500, 8000, 100),
    memoryMs: p(650, 300, 2000, 50), recallMs: p(20000, 5000, 60000, 1000) }, {
    landscape: true, primaryMetric: "partialCreditLoad", staircase: "deadline",
    async run(ctx) {
      const practice = ctx.phase === "practice", q = ctx.params;
      const processPanel = ctx.prepareOptions(D.options([C.t("response.symmetric"), C.t("response.asymmetric")], ["a","l"]));
      const recallPanel = ctx.prepareOptions(Array.from({ length: 16 }, (_, i) => ({ value: i, label: gridKeys[i].toUpperCase(), key: gridKeys[i] })));
      const sizes = practice ? Array(8).fill(2) : C.shuffle([2,2,2,3,3,3,4,4,4,5,5,5]);
      const practiceRTs = ctx.practiceTrials.flatMap(row => row.processing || []).filter(row => row.correct && row.rtMs >= 150).map(row => row.rtMs);
      const calibrated = practiceRTs.length >= 4 ? C.clamp(S.mean(practiceRTs) * 2.5, 750, 8000) : q.processingMs;
      // Keep the assessment measuring stick fixed; calibration is used only for training.
      const deadline = practice || ctx.mode === "assessment" ? q.processingMs : calibrated;
      const items = sizes.map(length => ({
        length, sequence: C.shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, length),
        patterns: Array.from({ length }, () => {
          const symmetric = Math.random() < .5;
          const bits = Array.from({ length: 64 }, () => false);
          for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) bits[y * 8 + x] = bits[y * 8 + 7 - x] = Math.random() < .45;
          if (!symmetric) { const index = C.rand(0, 63); bits[index] = !bits[index]; }
          const scene = D.scene((g, w, h) => {
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
              g.fillStyle = bits[y * 8 + x] ? D.palette["task-fg"] : D.palette["task-panel"];
              g.fillRect(w / 2 - 100 + x * 25, h / 2 - 100 + y * 25, 23, 23);
            }
          }, 240, 240);
          return { symmetric, bits, scene };
        })
      }));
      const memories = Array.from({ length: 16 }, (_, i) => D.grid(4, [i]));
      const blankGrid = D.grid(4);
      await ctx.countdown();
      for (const item of items) {
        const processing = [];
        for (let i = 0; i < item.length; i++) {
          const row = await ctx.trial({ scene: item.patterns[i].scene, panel: processPanel, deadline,
            answer: item.patterns[i].symmetric ? 0 : 1, noRecord: true,
            meta: { symmetric: item.patterns[i].symmetric, pattern: item.patterns[i].bits } });
          processing.push(row);
          await ctx.show(memories[item.sequence[i]], q.memoryMs);
          await ctx.show(ctx.blank, 350);
        }
        await ctx.trial({ scene: blankGrid, panel: recallPanel, sequence: true, maxLength: item.length, deadline: q.recallMs,
          displayResponse: value => gridKeys[value].toUpperCase(),
          meta: { length: item.length, sequence: item.sequence, processing, processingDeadlineMs: deadline },
          evaluate: response => response.length === item.length && response.every((n, i) => n === item.sequence[i]),
          enrich: row => { row.recallCorrect = row.response.filter((n, i) => n === item.sequence[i]).length;
            row.reliabilityValue = row.recallCorrect / item.length; }
        });
      }
      const rows = practice ? ctx.practiceTrials : ctx.trials;
      const processingAccuracy = S.processingAccuracy(rows);
      if (!practice && (processingAccuracy ?? 0) < .85) ctx.invalidate("runner.processing");
      return { processingDeadlineMs: deadline, score: { processingAccuracy } };
    },
    score(rows) {
      return { ...S.span(rows), processingAccuracy: S.processingAccuracy(rows) };
    }
  });

  for (const id of ["corsi", "digit-span"]) {
    C.define(id, "working-memory", { direction: choice(["forward","backward"]), startLength: p(2, 2, 8),
      maxLength: p(id === "corsi" ? 9 : 12, 3, id === "corsi" ? 9 : 16),
      flashMs: p(700, 300, 900, 50), intervalMs: p(1000, 1000, 2000, 100),
      recallMs: p(20000, 5000, 60000, 1000) }, {
      landscape: id === "corsi", primaryMetric: "span", metrics: ["span","partialCreditLoad"], staircase: "stepwise",
      async run(ctx) {
        const practice = ctx.phase === "practice", q = ctx.params, corsi = id === "corsi";
        const state = ctx.state("length", "stepwise", { start: q.startLength, min: 2, max: q.maxLength });
        const start = practice ? 2 : ctx.mode === "training" ? Math.round(state.state.value) : q.startLength;
        const panel = corsi ? ctx.prepareOptions(Array.from({ length: 9 }, (_, i) => ({
          value: i, label: String(i + 1), key: String(i + 1) })), "corsi") :
          C.digitRecallPanel(ctx);
        const flashes = corsi ? Array.from({ length: 9 }, (_, i) => {
          const canvas = document.createElement("canvas"); canvas.width = panel.canvas.width; canvas.height = panel.canvas.height;
          const g = canvas.getContext("2d"); g.drawImage(panel.canvas, 0, 0);
          const zone = panel.zones[i]; g.fillStyle = D.palette["stim-red"];
          g.fillRect(zone.x + 2, zone.y - panel.top + 2, zone.w - 4, zone.h - 4);
          return { ...panel, canvas };
        }) : Array.from({ length: 10 }, (_, i) => D.text(i));
        const count = practice ? 8 : Math.max(1, q.maxLength - start + 1) * 2;
        const items = Array.from({ length: count }, (_, i) => {
          const length = practice ? 2 : start + Math.floor(i / 2);
          const sequence = corsi ? C.shuffle([0,1,2,3,4,5,6,7,8]).slice(0, length) :
            Array.from({ length }, () => C.rand(0, 9));
          const expected = q.direction === "backward" ? [...sequence].reverse() : sequence;
          return { length, sequence, expected };
        });
        const titles = new Map(items.map(item => [item.length,
          D.text(C.t("stim.spanLevel", { length: C.number(item.length), direction: C.t(`choice.${q.direction}`) }), 30)]));
        await ctx.countdown();
        let pairCorrect = 0;
        for (let index = 0; index < items.length; index++) {
          const item = items[index];
          if (index % 2 === 0) await ctx.show(titles.get(item.length), 1200);
          for (const value of item.sequence) {
            await ctx.show(corsi ? ctx.blank : flashes[value], q.flashMs, corsi ? flashes[value] : null);
            await ctx.show(ctx.blank, q.intervalMs - q.flashMs, corsi ? panel : null);
          }
          const row = await ctx.trial({ scene: ctx.blank, panel, sequence: true, maxLength: corsi ? item.length : null, rtOnSubmit: !corsi,
            displayResponse: value => corsi ? value + 1 : value,
            deadline: q.recallMs, meta: { length: item.length, sequence: item.sequence, expected: item.expected, direction: q.direction },
            evaluate: response => response.length === item.length && response.every((n, i) => n === item.expected[i]),
            enrich: trial => { trial.recallCorrect = trial.response.filter((n, i) => n === item.expected[i]).length;
              trial.reliabilityValue = trial.recallCorrect / item.length; } });
          if (row.correct) pairCorrect++;
          if (!practice && index % 2 === 1) {
            ctx.adapt(state, { accuracy: pairCorrect / 2, up: .5, down: 0, downErrors: 2, errors: 2 - pairCorrect });
            if (!pairCorrect) break;
            pairCorrect = 0;
          }
        }
        return {};
      },
      score: rows => S.span(rows)
    });
  }

  C.define("mental-arithmetic", "reasoning", { minOperand: p(1, 0, 100), maxOperand: p(20, 2, 1000),
    operations: choice(["mixed","add","subtract","multiply","divide"]), chained: choice(["yes","no"]),
    percentages: choice(["yes","no"]), durationSeconds: p(90, 30, 300, 10), deadlineMs: p(10000, 2000, 30000, 500) }, {
    primaryMetric: "correctPerMinute", staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", panel = C.keypad(ctx);
      const magnitude = ctx.state("magnitude", "stepwise", { start: q.maxOperand, min: 2, max: 1000 });
      const deadlineState = ctx.state("deadline", "deadline", { start: q.deadlineMs, min: 2000, max: 30000 });
      const limit = practice ? q.maxOperand : Math.round(magnitude.state.value);
      const count = practice ? 8 : Math.ceil(q.durationSeconds * 1000 / 150) + 1;
      const items = Array.from({ length: count }, () => {
        const a = C.rand(Math.min(q.minOperand, limit), limit), b = C.rand(1, Math.max(2, limit));
        const op = q.operations === "mixed" ? C.pick(["add","subtract","multiply","divide"]) : q.operations;
        let expression, answer;
        if (q.percentages === "yes" && Math.random() < .2) {
          const percent = C.pick([5,10,15,20,25,50,75]);
          answer = Math.round(a * percent) / 100; expression = C.t("stim.percent", { percent: C.number(percent), value: C.number(a) });
        } else {
          if (op === "add") { answer = a + b; expression = `${C.number(a)} + ${C.number(b)}`; }
          if (op === "subtract") { answer = a - b; expression = `${C.number(a)} − ${C.number(b)}`; }
          if (op === "multiply") { answer = a * b; expression = `${C.number(a)} × ${C.number(b)}`; }
          if (op === "divide") { answer = a; expression = `${C.number(a * b)} ÷ ${C.number(b)}`; }
          if (q.chained === "yes" && Math.random() < .35) {
            const next = C.rand(1, Math.max(2, limit));
            expression = `(${expression}) + ${C.number(next)}`; answer += next;
          }
        }
        return { expression, answer, scene: D.text(expression, 36) };
      });
      await ctx.countdown();
      const start = C.now(), recent = [];
      for (const item of items) {
        const remaining = practice ? Infinity : q.durationSeconds * 1000 - (C.now() - start);
        if (remaining <= 0) break;
        const deadline = Math.min(practice || ctx.mode === "assessment" ? q.deadlineMs : deadlineState.state.value, remaining);
        const row = await ctx.trial({ scene: item.scene, panel, sequence: true, deadline, noFeedback: true, rtOnSubmit: true,
          meta: { expression: item.expression, answer: item.answer, magnitude: limit, deadlineMs: deadline },
          evaluate: response => response.length > 0 && Math.abs(Number(response.join("")) - item.answer) < .000001 });
        recent.push(row);
        if (practice || ctx.mode === "training") {
          const feedbackMs = Math.min(200, practice ? 200 : q.durationSeconds * 1000 - (C.now() - start));
          if (feedbackMs > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackMs);
        }
        if (recent.length === 5) {
          const accuracy = S.accuracy(S.exclude(recent));
          ctx.adapt(deadlineState, { accuracy, fast: S.median(recent.map(r => r.rtMs).filter(Number.isFinite)) < deadline * .75 });
          ctx.adapt(magnitude, { accuracy, errors: recent.filter(r => !r.correct).length });
          recent.length = 0;
        }
      }
      return {};
    },
    score: (rows, q) => ({ ...C.accuracyScore(rows), correctPerMinute: S.eligible(rows).filter(t => t.correct).length * 60 / q.durationSeconds })
  });

  C.define("pvt-b", "vigilance", { durationSeconds: p(180, 180, 180), minIsiMs: p(1000, 1000, 4000, 100),
    maxIsiMs: p(4000, 1000, 8000, 100), lapseMs: p(355, 355, 355), responseMs: p(10000, 2000, 10000, 500) }, {
    touchSupport: "degraded", primaryMetric: "meanReciprocalRT", staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const isis = Array.from({ length: practice ? 8 : 181 }, () => C.rand(q.minIsiMs, Math.max(q.minIsiMs, q.maxIsiMs)));
      const responseOption = [{ value: 0, label: C.t("response.respond"), key: "space" }];
      const invisiblePanel = { options: responseOption, zones: [], canvas: document.createElement("canvas"), top: ctx.h };
      await ctx.countdown();
      const start = C.now();
      for (const isi of isis) {
        const remaining = practice ? Infinity : q.durationSeconds * 1000 - (C.now() - start);
        if (remaining <= 0) break;
        const waiting = { options: responseOption, zones: [], responses: [], falseStarts: [], anywhere: true, falseStartPhase: true };
        ctx.current = waiting;
        await ctx.show(ctx.blank, Math.min(isi, remaining));
        ctx.current = null;
        for (const time of waiting.falseStarts) {
          (practice ? ctx.practiceTrials : ctx.trials).push({ stimulusOnset: null, responseTime: time, rtMs: null,
            correct: false, falseStart: true, response: [0], isiMs: isi });
        }
        const available = practice ? q.responseMs : Math.min(q.responseMs, q.durationSeconds * 1000 - (C.now() - start));
        if (available <= 0) break;
        const row = await ctx.trial({ scene: ctx.blank, panel: invisiblePanel, anywhere: true, counter: true,
          deadline: available, noFeedback: true, answer: 0, meta: { isiMs: isi },
          enrich: trial => { trial.unscored = trial.rtMs === null && available < q.lapseMs;
            trial.lapse = !trial.unscored && (trial.rtMs === null || trial.rtMs > q.lapseMs);
            trial.reliabilityValue = trial.rtMs && trial.rtMs >= 150 ? 1000 / trial.rtMs : 0; } });
        if (row.rtMs !== null && row.rtMs < 150) row.falseStart = true;
        // Keep the stopped counter briefly visible, without extending the fixed three-minute run.
        const hold = Math.min(500, practice ? 500 : q.durationSeconds * 1000 - (C.now() - start));
        if (hold > 0) await C.Timing.wait(hold, ctx.signal, () => ctx.paint(null, null, [], row.rtMs ?? q.responseMs));
      }
      return {};
    },
    score(rows) {
      const valid = S.eligible(rows), rts = valid.map(t => t.rtMs).filter(Number.isFinite);
      return { meanReciprocalRT: S.mean(rts.map(rt => 1000 / rt)), meanRT: S.mean(rts),
        lapses: valid.filter(t => t.lapse).length, falseStarts: rows.filter(t => t.falseStart).length,
        accuracy: S.accuracy(rows) };
    }
  });
})();

(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats;
  const { p, choice } = C.parameter;
  const options = (ctx, keys, labels) => ctx.prepareOptions(D.options(labels.map(key => C.t(key)), keys));
  const accuracyScore = C.accuracyScore;

  function nbackStream(n, count, targets, alphabet, lureShare, operand = 0) {
    const values = [], lures = [];
    for (let i = 0; i < count; i++) {
      const expected = i >= n ? values[i - n] + operand : null;
      if (targets.has(i)) values.push(expected);
      else {
        const offsets = C.shuffle([n - 1, n + 1]).filter(offset => offset > 0 && i >= offset);
        const lure = offsets.map(offset => values[i - offset] + operand).find(value =>
          value !== expected && alphabet.includes(value));
        const lureValues = offsets.map(offset => values[i - offset] + operand);
        const nonLures = alphabet.filter(value => value !== expected && !lureValues.includes(value));
        values.push(lure !== undefined && Math.random() < lureShare ? lure : C.pick(nonLures));
      }
      lures.push(!targets.has(i) && [n - 1, n + 1].some(offset =>
        offset > 0 && i >= offset && values[i] === values[i - offset] + operand));
    }
    return { values, lures };
  }
  C.nbackStream = nbackStream;
  C.define("dual-nback", "working-memory", {
    variant: choice(["dual", "position", "audio", "arithmetic"]), n: p(2, 1, 9),
    stimulusMs: p(500, 200, 1500, 50), isiMs: p(2500, 500, 5000, 100),
    lureShare: p(.2, 0, .8, .05), operand: p(2, 1, 9), blocks: p(2, 1, 8)
  }, {
    languageDependent: true, landscape: true, primaryMetric: "nLevelMean", staircase: "stepwise",
    async run(ctx) {
      const practice = ctx.phase === "practice", q = ctx.params;
      const state = ctx.state("n", "stepwise", { start: q.n, min: 1, max: 9 });
      const usePosition = q.variant !== "audio", useAudio = ["dual", "audio"].includes(q.variant);
      const arithmetic = q.variant === "arithmetic";
      const panel = ctx.prepareOptions([
        ...(usePosition ? [{ value: 0, label: C.t(arithmetic ? "response.match" : "response.position"), key: "a" }] : []),
        ...(useAudio ? [{ value: 1, label: C.t("response.audio"), key: "l" }] : [])
      ]);
      for (let block = 0; block < (practice ? 1 : q.blocks); block++) {
        const n = practice ? Math.min(2, q.n) : Math.round(state.state.value), count = practice ? 8 : 20 + n;
        const targetCount = practice ? 2 : 6, indices = C.shuffle(Array.from({ length: count - n }, (_, i) => i + n));
        const positions = new Set(indices.slice(0, targetCount));
        const audioTargets = new Set([...indices.slice(0, practice ? 1 : 2),
          ...indices.slice(targetCount, targetCount + (practice ? 1 : 4))]);
        const position = nbackStream(n, count, positions, Array.from({ length: arithmetic ? 50 : 9 }, (_, i) => i),
          q.lureShare, arithmetic ? q.operand : 0);
        const audio = nbackStream(n, count, audioTargets, [0,1,2,3,4,5,6,7], q.lureShare);
        const sounds = useAudio ? C.Audio.prepare(audio.values, ctx.language) : [];
        const scenes = position.values.map(value => usePosition ? arithmetic ? D.text(C.number(value)) : D.grid(3, [value]) : ctx.blank);
        const title = D.text(C.t("stim.nbackLevel", { n: C.number(n), variant: C.t(`choice.${q.variant}`) }), 30);
        await ctx.show(title, 1500);
        await ctx.countdown();
        const rows = [];
        for (let i = 0; i < count; i++) {
          rows.push(await ctx.trial({
            scene: scenes[i], panel, deadline: q.stimulusMs + q.isiMs, visibleMs: q.stimulusMs, multi: true,
            noFeedback: true, feedbackAt: q.stimulusMs + q.isiMs - 250,
            meta: { block, index: i, n, unscored: i < n, position: position.values[i], audio: audio.values[i],
              positionTarget: positions.has(i), audioTarget: audioTargets.has(i),
              positionLure: position.lures[i], audioLure: audio.lures[i],
              isLure: usePosition && position.lures[i] || useAudio && audio.lures[i], usePosition, useAudio },
            onset: trial => { if (useAudio) C.Audio.play(sounds[i], trial); },
            evaluate: responses => (!usePosition || responses.includes(0) === positions.has(i)) &&
              (!useAudio || responses.includes(1) === audioTargets.has(i))
          }));
        }
        const scored = this.score(S.exclude(rows), q);
        const total = scored.hits + scored.misses;
        ctx.adapt(state, { accuracy: total ? scored.hits / total : 0,
          errors: scored.falseAlarms + scored.misses, down: -1, downErrors: 5 });
      }
      return { stimulusSet: useAudio ? C.Audio.stimulusSet : arithmetic ? "digits" : "spatial" };
    },
    score(rows) {
      const valid = S.eligible(rows), result = { hits: 0, falseAlarms: 0, misses: 0, correctRejections: 0,
        nLevelMean: S.mean(valid.map(t => t.n)), accuracy: S.accuracy(rows) };
      let lureFA = 0, lureN = 0;
      for (const [stream, button, flag] of [["position", 0, "usePosition"], ["audio", 1, "useAudio"]]) {
        const counts = { hits: 0, falseAlarms: 0, misses: 0, correctRejections: 0 };
        for (const row of valid.filter(t => t[flag])) {
          const yes = row.response.includes(button), target = row[`${stream}Target`];
          counts[target ? yes ? "hits" : "misses" : yes ? "falseAlarms" : "correctRejections"]++;
          if (row[`${stream}Lure`]) { lureN++; if (yes) lureFA++; }
        }
        if (valid.some(t => t[flag])) result[`${stream}DPrime`] = S.dPrime(counts.hits, counts.misses, counts.falseAlarms, counts.correctRejections);
        for (const key of Object.keys(counts)) result[key] += counts[key];
      }
      result.lureFalseAlarmRate = lureN ? lureFA / lureN : null;
      return result;
    }
  });

  C.define("ufov", "processing-speed", {
    durationMs: p(300, 16, 500), durationMinMs: p(16, 16, 250), durationMaxMs: p(500, 251, 500),
    assessmentLevels: p(6, 3, 10), trialsPerSubtest: p(36, 12, 100), responseMs: p(5000, 1000, 10000, 100)
  }, {
    touchSupport: "degraded", landscape: true, staircase: "oneUpTwoDown", primaryMetric: "centralThreshold",
    metrics: ["centralThreshold", "dividedThreshold", "selectiveThreshold"], combineMetrics: true,
    async run(ctx) {
      const practice = ctx.phase === "practice", q = ctx.params;
      const centralPanel = options(ctx, ["a","l"], ["response.car","response.truck"]);
      const radialPanel = ctx.prepareOptions(D.options(Array.from({ length: 8 }, (_, i) => String(i + 1))), "radial");
      const mask = D.mask(), thresholds = {};
      const kinds = ["central", "divided", "selective"];
      for (let subtest = 0; subtest < 3; subtest++) {
        const count = practice ? [3,3,2][subtest] : q.trialsPerSubtest;
        const state = ctx.state(kinds[subtest], "oneUpTwoDown", { start: C.clamp(q.durationMs, q.durationMinMs, q.durationMaxMs),
          min: q.durationMinMs, max: q.durationMaxMs });
        const stimuli = Array.from({ length: count }, () => {
          const truck = C.rand(0, 1), location = C.rand(0, 7);
          const scene = D.scene((g, w, h) => {
            if (subtest === 2) {
              // Six eccentricity rings x eight spokes, with the target replacing one triangle.
              for (let i = 0; i < 48; i++) {
                if (i === location + 32) continue;
                const angle = (i % 8) * Math.PI / 4 - Math.PI / 2;
                const radius = 35 + Math.floor(i / 8) * 13;
                const x = w / 2 + Math.cos(angle) * radius * 1.5, y = h / 2 + Math.sin(angle) * radius;
                g.strokeStyle = D.palette["task-fg"]; g.beginPath();
                g.moveTo(x, y - 5); g.lineTo(x - 5, y + 5); g.lineTo(x + 5, y + 5); g.closePath(); g.stroke();
              }
            }
            D.vehicle(truck, g, w / 2, h / 2);
            if (subtest > 0) {
              const angle = location * Math.PI / 4 - Math.PI / 2;
              g.strokeRect(w / 2 + Math.cos(angle) * 87 * 1.5 - 6, h / 2 + Math.sin(angle) * 87 - 6, 12, 12);
            }
          });
          return { truck, location, scene };
        });
        const fixedDurations = C.shuffle(Array.from({ length: count }, (_, i) =>
          q.durationMinMs * (q.durationMaxMs / q.durationMinMs) ** ((i % q.assessmentLevels) / (q.assessmentLevels - 1))));
        const title = D.text(C.t(`stim.ufov.${kinds[subtest]}`), 30);
        await ctx.show(title, 1500);
        await ctx.countdown();
        for (let index = 0; index < stimuli.length; index++) {
          const item = stimuli[index];
          const duration = practice ? q.durationMs : ctx.mode === "assessment" ? fixedDurations[index] : state.state.value;
          const row = await ctx.trial({ phases: [{ scene: item.scene, ms: duration, stimulus: true }, { scene: mask, ms: 100 }],
            scene: ctx.blank, panel: centralPanel, deadline: q.responseMs, answer: item.truck, noFeedback: subtest > 0,
            meta: { subtest: kinds[subtest], condition: subtest, durationMs: duration, truck: item.truck, location: item.location } });
          if (subtest > 0) {
            const peripheral = await ctx.trial({ scene: ctx.blank, panel: radialPanel, deadline: q.responseMs,
              answer: item.location, noRecord: true });
            row.centralCorrect = row.correct; row.peripheralCorrect = peripheral.correct;
            row.peripheralResponse = peripheral.response; row.peripheralRtMs = peripheral.rtMs;
            row.forcedExclusion = S.exclude([peripheral])[0].excluded;
            row.correct = row.correct && peripheral.correct;
            if (ctx.mode === "training" || practice) await ctx.show(ctx.feedbackImages[Number(row.correct)], 250);
          }
          ctx.adapt(state, { correct: row.correct && !S.exclude([row])[0].excluded });
        }
        thresholds[`${kinds[subtest]}Threshold`] = ctx.mode === "assessment" ?
          S.fixedThreshold(S.exclude(ctx.trials.filter(row => row.subtest === kinds[subtest]))) : C.Adaptive.threshold(state.state);
      }
      return { score: thresholds };
    },
    score(rows) {
      const result = accuracyScore(rows);
      for (const kind of ["central","divided","selective"]) {
        const group = S.eligible(rows).filter(t => t.subtest === kind);
        result[`${kind}Accuracy`] = S.mean(group.map(t => Number(t.correct)));
        result[`${kind}Threshold`] = null;
      }
      return result;
    }
  });

  for (const id of ["stroop-squared", "flanker-squared", "simon-squared"]) {
    C.define(id, "attention", { durationSeconds: p(90, 90, 90), deadlineMs: p(1000, 300, 3000, 50),
      blocks: p(id === "stroop-squared" ? 2 : 1, 1, 4) }, {
      languageDependent: id === "stroop-squared", staircase: "deadline", primaryMetric: "correctPer90",
      async run(ctx) {
        const practice = ctx.phase === "practice", q = ctx.params;
        const state = ctx.state("deadline", "deadline", { start: q.deadlineMs, min: 300, max: 3000 });
        const ink = ["stim-red","stim-green","stim-blue","stim-yellow"];
        const keys = ["a","l"];
        const blocks = practice ? 1 : q.blocks;
        for (let block = 0; block < blocks; block++) {
          const rule = block % 2 === 0 ? "word" : "ink";
          const count = practice ? 8 : 610;
          const cache = new Map();
          const items = Array.from({ length: count }, (_, i) => {
            const congruent = i % 2 === 0;
            let target, alternate, scene, labels, signature;
            if (id === "stroop-squared") {
              const word = C.rand(0, 3), color = congruent ? word : C.pick([0,1,2,3].filter(n => n !== word));
              target = rule === "word" ? word : color; alternate = C.pick([0,1,2,3].filter(n => n !== target));
              signature = `${word}-${color}`;
              if (!cache.has(signature)) cache.set(signature, D.text(C.t(`color.${word}`).toUpperCase(), 52, D.palette[ink[color]]));
              scene = cache.get(signature);
              labels = [target, alternate].map(value => C.t(`color.${value}`));
            } else if (id === "flanker-squared") {
              target = C.rand(0, 1); alternate = 1 - target;
              const middle = target ? ">" : "<", side = congruent ? middle : target ? "<" : ">";
              signature = `${middle}${side}`;
              if (!cache.has(signature)) cache.set(signature, D.text(`${side}${side}${middle}${side}${side}`, 60));
              scene = cache.get(signature); labels = [target, alternate].map(n => n ? ">" : "<");
            } else {
              target = C.rand(0, 1); alternate = 1 - target;
              const side = congruent ? target : 1 - target; signature = `${target}${side}`;
              if (!cache.has(signature)) cache.set(signature, D.scene((g, w, h) => {
                g.fillStyle = D.palette[ink[target]];
                g.beginPath(); g.arc(w * (side ? .8 : .2), h / 2, 25, 0, 2 * Math.PI); g.fill();
              }, 420, 120));
              scene = cache.get(signature);
              labels = [C.t("color.0"), C.t("color.1")];
            }
            // Simon has fixed color-to-side mapping; shuffling would destroy spatial congruency.
            const order = id === "simon-squared" ? [0,1] : C.shuffle([0,1]);
            const optionLabels = order.map(n => labels[n]);
            const answer = id === "simon-squared" ? target : order.indexOf(0);
            const panelKey = `panel:${optionLabels.join("|")}`;
            if (!cache.has(panelKey)) cache.set(panelKey, ctx.prepareOptions(D.options(optionLabels, keys)));
            return { scene, panel: cache.get(panelKey), answer, congruent, rule };
          });
          const instruction = D.text(C.t(id === "stroop-squared" ? `response.${rule}` : "response.choose"), 30);
          await ctx.show(instruction, 1500);
          await ctx.countdown();
          const start = C.now(), recent = [];
          for (const item of items) {
            const remaining = practice ? Infinity : 90000 - (C.now() - start);
            if (remaining <= 0) break;
            const deadline = Math.min(practice || ctx.mode === "assessment" ? q.deadlineMs : state.state.value, remaining);
            const row = await ctx.trial({ ...item, deadline, noFeedback: true,
              meta: { block, rule: item.rule, congruent: item.congruent, condition: `${block}-${item.congruent}`, deadlineMs: deadline } });
            recent.push(row);
            if (ctx.mode === "training" || practice) {
              const feedbackTime = Math.min(200, practice ? 200 : 90000 - (C.now() - start));
              if (feedbackTime > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackTime);
            }
            if (recent.length === 10) {
              const eligible = S.exclude(recent);
              ctx.adapt(state, { accuracy: S.accuracy(eligible), fast: S.median(recent.map(r => r.rtMs).filter(Number.isFinite)) < state.state.value * .75 });
              recent.length = 0;
            }
          }
        }
        return {};
      },
      score(rows, q) {
        const result = accuracyScore(rows);
        result.correctPer90 = result.correct / q.blocks;
        return result;
      }
    });
  }

  C.define("antisaccade", "attention", { trials: p(72, 24, 144), fixationMinMs: p(1000, 500, 3000, 100),
    fixationMaxMs: p(3000, 1000, 5000, 100), cueMs: p(100, 16, 200), targetMs: p(100, 16, 200),
    responseMs: p(3000, 1000, 10000, 100) }, {
    touchSupport: "degraded", landscape: true, staircase: "oneUpThreeDown", primaryMetric: "accuracy",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const state = ctx.state("target", "oneUpThreeDown", { start: q.targetMs, min: 16, max: 200 });
      const panel = ctx.prepareOptions(D.options(["B","P","R"], ["b","p","r"]));
      const fixation = D.text("+", 30), mask = D.text("###                 ###", 36);
      const items = Array.from({ length: practice ? 8 : q.trials }, () => {
        const side = C.rand(0, 1), answer = C.rand(0, 2);
        const cue = D.scene((g, w, h) => { g.fillRect(w * (side ? .85 : .15) - 8, h / 2 - 8, 16, 16); }, 500, 140);
        const target = D.scene((g, w, h) => {
          g.font = "bold 32px monospace"; g.fillText(["B","P","R"][answer], w * (side ? .15 : .85), h / 2);
        }, 500, 140);
        return { side, answer, cue, target, fixationMs: C.rand(q.fixationMinMs, Math.max(q.fixationMinMs, q.fixationMaxMs)) };
      });
      await ctx.countdown();
      for (const item of items) {
        const targetMs = practice || ctx.mode === "assessment" ? q.targetMs : state.state.value;
        const row = await ctx.trial({
          phases: [{ scene: fixation, ms: item.fixationMs }, { scene: item.cue, ms: q.cueMs },
            { scene: item.target, ms: targetMs, stimulus: true }, { scene: mask, ms: 100 }],
          scene: mask, panel, deadline: q.responseMs, answer: item.answer,
          meta: { side: item.side, targetMs, fixationMs: item.fixationMs } });
        ctx.adapt(state, { correct: row.correct });
      }
      return {};
    },
    score: accuracyScore
  });

  C.define("visual-arrays", "working-memory", { trials: p(72, 24, 144, 12), exposureMs: p(250, 50, 1000, 10),
    retentionMs: p(900, 200, 3000, 50), responseMs: p(3000, 500, 10000, 100) }, {
    landscape: true, staircase: "oneUpThreeDown", primaryMetric: "kMean", metrics: ["k4","k6","k8","kMean"],
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const panel = options(ctx, ["a","l"], ["response.same","response.different"]);
      const state = ctx.state("exposure", "oneUpThreeDown", { start: q.exposureMs, min: 50, max: 1000 });
      const palette = ["stim-red","stim-green","stim-blue","stim-yellow"];
      const conditions = C.shuffle(Array.from({ length: practice ? 8 : q.trials }, (_, i) => ({
        setSize: [4,6,8][i % 3], changed: Math.floor(i / 3) % 2 === 1, distractors: Math.floor(i / 6) % 2 === 1
      })));
      const items = conditions.map(condition => {
        const cells = C.shuffle(Array.from({ length: 24 }, (_, i) => i));
        const values = Array.from({ length: condition.setSize }, () => C.rand(0, 3)), probeIndex = C.rand(0, values.length - 1);
        const probeColor = condition.changed ? C.pick([0,1,2,3].filter(n => n !== values[probeIndex])) : values[probeIndex];
        const square = (g, cell, color) => {
          g.fillStyle = D.palette[color]; g.fillRect(35 + (cell % 6) * 56, 20 + Math.floor(cell / 6) * 54, 24, 24);
        };
        const scene = D.scene(g => {
          values.forEach((value, i) => square(g, cells[i], palette[value]));
          if (condition.distractors) for (let i = condition.setSize; i < condition.setSize + 4; i++) square(g, cells[i], "stim-gray");
        });
        const probe = D.scene(g => square(g, cells[probeIndex], palette[probeColor]));
        return { ...condition, scene, probe, cells: cells.slice(0, condition.setSize), values, probeIndex, probeColor };
      });
      await ctx.countdown();
      for (const item of items) {
        const exposureMs = practice || ctx.mode === "assessment" ? q.exposureMs : state.state.value;
        const row = await ctx.trial({ phases: [{ scene: item.scene, ms: exposureMs }, { scene: ctx.blank, ms: q.retentionMs }],
          scene: item.probe, panel, deadline: q.responseMs, answer: Number(item.changed),
          meta: { setSize: item.setSize, changed: item.changed, distractors: item.distractors, exposureMs,
            cells: item.cells, values: item.values, probeIndex: item.probeIndex, probeColor: item.probeColor } });
        ctx.adapt(state, { correct: row.correct });
      }
      return {};
    },
    score(rows) {
      const result = accuracyScore(rows);
      for (const size of [4,6,8]) {
        const group = S.eligible(rows).filter(t => t.setSize === size);
        const hits = group.filter(t => t.changed && t.response[0] === 1).length;
        const misses = group.filter(t => t.changed && t.response[0] !== 1).length;
        const fas = group.filter(t => !t.changed && t.response[0] !== 0).length;
        const crs = group.filter(t => !t.changed && t.response[0] === 0).length;
        result[`k${size}`] = S.cowan(size, hits, misses, fas, crs);
      }
      result.kMean = S.mean([result.k4, result.k6, result.k8].filter(Number.isFinite));
      return result;
    }
  });
})();

(() => {
  const C = window.Cortex, S = C.Stats;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  C.escape = esc;
  const text = (key, vars) => esc(C.t(key, vars));
  const app = () => document.getElementById("app");
  const settings = () => C.Storage.getSettings();
  let lastSession = null, queue = [], selectedTask = "dual-nback";
  let filterDevice = C.device(), filterInput = C.input, overlay = false;
  const taskParams = task => {
    const saved = settings().taskParams?.[task.id] || {};
    return Object.fromEntries(Object.entries(task.paramSchema).map(([key, schema]) => {
      const value = saved[key] ?? schema.value;
      if (schema.type === "text") return [key, typeof value === "string" ? value.slice(0, schema.maxLength) : schema.value];
      return [key, schema.choices ? schema.choices.includes(value) ? value : schema.value :
        typeof value === "number" && Number.isFinite(value) ?
          Number(C.clamp(schema.min + Math.round((value - schema.min) / schema.step) * schema.step, schema.min, schema.max).toFixed(10)) : schema.value];
    }));
  };
  C.taskParams = taskParams;
  C.notice = (key, details = "") => {
    const container = document.getElementById("notifications");
    if (!container) return;
    const item = document.createElement("div"); item.className = "notice";
    const message = document.createElement("span"); message.textContent = C.t(key);
    if (details) { const detail = document.createElement("small"); detail.textContent = details; message.append(" ", detail); }
    const close = document.createElement("button"); close.textContent = C.t("common.dismiss");
    close.addEventListener("click", () => item.remove());
    item.append(message, close); container.append(item);
  };
  const cooldown = taskId => {
    const latest = C.Storage.getSessions(taskId, { mode: "assessment" }).find(s => !s.practiceOnly);
    if (!latest) return null;
    const next = Date.parse(latest.startedAt) + 14 * 86400000;
    return next > performance.timeOrigin + C.now() ? next : null;
  };
  const taskSelect = (id, current = selectedTask, includeJournals = false) => `<select id="${id}">${C.Tasks.filter(task =>
    includeJournals || task.kind !== "journal").map(task =>
    `<option value="${task.id}" ${task.id === current ? "selected" : ""}>${text(task.nameKey)}</option>`).join("")}</select>`;
  const modeButtons = () => `<div class="mode-toggle" role="group" aria-label="${text("results.mode")}">
    ${["training","assessment"].map(mode => `<button data-mode="${mode}" class="${settings().mode === mode ? "selected" : ""}"
      aria-pressed="${settings().mode === mode}">${text(`mode.${mode}`)}</button>`).join("")}</div>`;
  const header = () => {
    document.documentElement.lang = C.language;
    document.title = "Cortex";
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = C.t(node.dataset.i18n); });
    document.getElementById("language").value = C.language;
    document.querySelectorAll("nav a").forEach(link => {
      if (link.hash === (location.hash || "#home")) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };
  const domainLabel = task => `<span class="task-domain">${text(`domain.${task.domain}`)}</span>`;
  const taskCard = task => {
    const exposures = task.exposureCount ? task.exposureCount() : C.Storage.getSessions(task.id).filter(s => !s.practiceOnly).length;
    const next = settings().mode === "assessment" && task.supportsAssessment ? cooldown(task.id) : null;
    return `<article class="card task-card"><div class="inline">${domainLabel(task)}${task.tier === 2 ? `<span class="tag">${text("tier.two")}</span>` : ""}</div>
      <h3 class="task-title">${text(task.nameKey)}</h3><p class="task-desc">${text(task.descKey)}</p>
      <div class="task-actions"><span class="muted">${text(task.exposureKey || "home.exposures", { count: C.number(exposures) })}</span>
      <a class="button ${next ? "secondary" : "primary"}" href="#task/${task.id}">${text(next ? "common.view" : task.startKey || "common.start")}</a></div>
      ${next ? `<small>${text("home.assessmentWait", { date: C.date(next) })}</small>` : ""}</article>`;
  };
  function home() {
    const sessions = C.Storage.getSessions(), epoch = performance.timeOrigin + C.now();
    const localDay = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const days = new Set(sessions.filter(s => !s.invalid && !s.practiceOnly).map(s => localDay(new Date(s.startedAt))));
    let streak = 0, date = new Date(epoch);
    if (!days.has(localDay(date))) date.setDate(date.getDate() - 1);
    while (days.has(localDay(date))) { streak++; date.setDate(date.getDate() - 1); }
    const rest = C.Tasks.filter(t => t.id !== "pvt-b" && t.kind !== "journal");
    const offset = Math.floor(epoch / 86400000) % rest.length;
    const suggested = [C.Tasks.find(t => t.id === "pvt-b"), ...[0,1,2].map(i => rest[(offset + i) % rest.length])];
    app().innerHTML = `<section class="hero"><div><span class="eyebrow">${text("home.eyebrow")}</span>
      <h1>${text("home.title")}</h1><p>${text("home.subtitle", { count: C.number(C.Tasks.length) })}</p>${modeButtons()}
      <p class="muted">${text(`mode.${settings().mode}Help`)}</p></div>
      <div class="metrics"><div class="metric"><strong>${C.number(streak)}</strong><span>${text("home.streak", { count: C.number(streak) })}</span></div>
      <div class="metric"><strong>${C.number(sessions.filter(s => !s.practiceOnly).length)}</strong><span>${text("data.sessions")}</span></div>
      <div class="metric"><strong>${C.number(C.Tasks.length)}</strong><span>${text("home.allTasks")}</span></div></div></section>
      <section class="card suggested"><div class="section-heading"><div><span class="eyebrow">${text("home.suggested")}</span>
      <h2>${suggested.map(t => text(t.nameKey)).join(" · ")}</h2></div><button class="primary" id="start-suggested">${text("home.startSuggested")}</button></div>
      <p class="muted">${text("home.stateCheck")}</p></section>
      <div class="section-heading"><h2>${text("home.allTasks")}</h2><span class="muted">${text("app.localOnly")}</span></div>
      <section class="cards">${C.Tasks.map(taskCard).join("")}</section>`;
    document.getElementById("start-suggested").onclick = () => {
      queue = suggested.filter(task => settings().mode !== "assessment" || task.supportsAssessment && !cooldown(task.id)).map(task => task.id);
      if (queue.length) location.hash = `task/${queue.shift()}`;
      else C.notice("home.done");
    };
  }
  function instructions(task) {
    selectedTask = task.id;
    if (task.renderView) { task.renderView(app()); return; }
    const next = settings().mode === "assessment" ? cooldown(task.id) : null;
    const q = taskParams(task), mobile = C.device() !== "desktop";
    const settingsState = settings();
    const degraded = mobile && task.touchSupport === "degraded" && !settingsState.notices[`mobile-${task.id}`];
    app().innerHTML = `<section class="hero"><div>${domainLabel(task)}<h1>${text(task.nameKey)}</h1>
      <p>${text(task.descKey)}</p>${modeButtons()}</div></section>
      <section class="card stack"><h2>${text("runner.instructions")}</h2><p class="prose">${text(task.instructionKey, task.instructionVars?.(q))}</p>
      <div class="toolbar"><span>${text("results.input")}</span>${["keyboard","touch","mouse"].map(method =>
        `<button data-input="${method}" class="${C.input === method ? "selected" : ""}" aria-pressed="${C.input === method}">${text(`input.${method}`)}</button>`).join("")}</div>
      <p class="key-map">${text(C.input === "keyboard" ? task.keyMapKey : "runner.touch")}</p>
      <p class="muted">${text("runner.escape")}</p><p>${text("runner.practiceIntro")}</p>
      ${settings().mode === "assessment" ? `<p class="notice">${text("runner.noFeedback")}</p>` : ""}
      ${degraded ? `<div class="notice"><span>${text(`mobile.${task.id}`)}</span><button id="dismiss-mobile">${text("common.dismiss")}</button></div>` : ""}
      ${task.id === "ufov" && innerWidth < 600 ? `<p class="warning">${text("mobile.ufov")}</p>` : ""}
      ${task.id === "dual-nback" && ["dual","audio"].includes(q.variant) ? `<p class="muted">${text("runner.audioNote")}</p>` : ""}
      ${task.id.includes("squared") ? `<p class="muted">${text("about.modesText")}</p>` : ""}
      <div class="actions"><button class="primary" id="start-practice" ${next ? "disabled" : ""}>${text("runner.practice")}</button>
      <button id="task-settings">${text("settings.title")}</button><a href="#home" class="button">${text("common.back")}</a></div>
      ${next ? `<p class="warning">${text("home.assessmentWait", { date: C.date(next) })}</p>` : ""}</section>`;
    document.getElementById("start-practice").onclick = () => startPractice(task);
    document.getElementById("task-settings").onclick = () => openSettings(task.id);
    document.getElementById("dismiss-mobile")?.addEventListener("click", () => {
      const value = settings(); value.notices[`mobile-${task.id}`] = true; C.Storage.setSettings(value); instructions(task);
    });
  }
  function running(on) {
    document.getElementById("runner").hidden = !on;
    document.documentElement.classList.toggle("running", on);
    document.body.classList.toggle("running", on);
    if (on) document.getElementById("stage").focus();
  }
  async function acquireScreen(task) {
    const element = document.documentElement;
    if (element.requestFullscreen && !document.fullscreenElement) {
      try { await element.requestFullscreen(); }
      catch (error) { console.info("Fullscreen unavailable:", error.name); }
    }
    if (task.landscape && C.device() !== "desktop" && screen.orientation?.lock) {
      try { await screen.orientation.lock("landscape"); }
      catch (error) { console.info("Orientation lock unavailable:", error.name); }
    }
  }
  async function wake(ctx) {
    if ("wakeLock" in navigator) {
      try { ctx.wakeLock = await navigator.wakeLock.request("screen"); }
      catch (error) { console.info("Wake lock unavailable:", error.name); }
    }
  }
  async function startPractice(task, acceptPortrait = false) {
    if (C.active || C.starting) return;
    if (task.kind === "journal") { instructions(task); return; }
    if (settings().mode === "assessment" && !task.supportsAssessment) { C.notice("runner.trainingOnly"); return; }
    if (settings().mode === "assessment" && cooldown(task.id)) { instructions(task); return; }
    const q = taskParams(task);
    const parameterError = C.parameterError(task, q);
    if (parameterError) { C.notice(parameterError); return; }
    if (task.id === "dual-nback" && ["dual","audio"].includes(q.variant) && !C.Audio.unlock(C.language)) {
      C.notice("runner.unsupportedAudio"); return;
    }
    if (task.landscape && C.device() !== "desktop" && innerWidth < innerHeight && !acceptPortrait) {
      app().innerHTML = `<section class="card stack"><h1>${text("runner.rotate")}</h1><p>${text("runner.rotateHelp")}</p>
        <button class="primary" id="rotate-continue">${text("common.continue")}</button></section>`;
      document.getElementById("rotate-continue").onclick = () => startPractice(task, true);
      return;
    }
    document.getElementById("runner-message").textContent = "";
    C.starting = true;
    running(true);
    await acquireScreen(task);
    const ctx = new C.Runner(task, q, settings().mode, C.language, C.input);
    C.starting = false;
    C.active = ctx; ctx.phase = "practice";
    document.getElementById("runner-description").textContent = `${C.t(task.instructionKey, task.instructionVars?.(q))} ${C.t(task.keyMapKey)}`;
    await wake(ctx);
    try {
      await task.run(ctx);
      ctx.phase = "between";
      ctx.states.clear();
      running(false);
      app().innerHTML = `<section class="card stack"><span class="eyebrow">${text(task.nameKey)}</span>
        <h1>${text("runner.practiceDone")}</h1><p>${text("runner.practiceCount", { count: C.number(ctx.practiceTrials.length) })}</p>
        <p>${text(ctx.mode === "assessment" ? "runner.noFeedback" : "mode.trainingHelp")}</p>
        <button class="primary" id="start-main">${text("runner.startBlock")}</button>
        <button id="cancel-practice">${text("common.cancel")}</button></section>`;
      document.getElementById("start-main").onclick = () => runMain(ctx);
      document.getElementById("cancel-practice").onclick = async () => { ctx.abort(); await finish(ctx); };
    } catch (error) { await handleRunError(ctx, error); }
  }
  async function runMain(ctx) {
    if (ctx.phase !== "between") return;
    ctx.w = Math.floor(innerWidth); ctx.h = Math.floor(innerHeight);
    ctx.canvas.width = ctx.w; ctx.canvas.height = ctx.h;
    ctx.stimulusHeight = Math.floor(ctx.h * .57);
    ctx.viewport = { width: ctx.w, height: ctx.h, dpr: devicePixelRatio };
    ctx.orientation = screen.orientation?.type || (innerWidth > innerHeight ? "landscape" : "portrait");
    ctx.phase = "block"; ctx.mainStartTime = C.now(); ctx.mainStartedAt = C.iso();
    // Practice interference does not invalidate a newly stable measured block.
    if (!ctx.signal.aborted) { ctx.invalid = false; ctx.reasons = []; if (ctx.refreshHz < 50) ctx.invalidate("runner.refresh"); }
    if (ctx.task.id === "dual-nback") C.Audio.unlock(ctx.language, true);
    running(true);
    try { ctx.extra = await ctx.task.run(ctx); await finish(ctx); }
    catch (error) { await handleRunError(ctx, error); }
  }
  async function handleRunError(ctx, error) {
    if (error.name !== "AbortError") {
      console.error(error);
      ctx.invalidate("runner.failure"); C.notice("runner.failure");
    }
    await finish(ctx);
  }
  async function finish(ctx) {
    if (ctx.finished) return;
    ctx.finished = true; ctx.phase = "finished";
    const trials = S.exclude(ctx.trials);
    const score = { ...ctx.task.score(trials, ctx.params), ...ctx.extra?.score,
      excluded: trials.filter(t => t.excluded).length };
    const summary = {
      id: C.uid(), taskId: ctx.task.id, mode: ctx.mode, startedAt: ctx.mainStartedAt || ctx.startedAt,
      durationMs: C.now() - (ctx.mainStartTime || ctx.startTime), params: ctx.params, language: ctx.language,
      deviceClass: ctx.deviceClass, inputMethod: ctx.input, refreshHz: ctx.refreshHz, viewport: ctx.viewport,
      invalid: ctx.invalid || !ctx.mainStartTime, invalidReasons: ctx.reasons, score,
      practiceOnly: !ctx.mainStartTime, practiceCount: ctx.practiceTrials.length, splitHalf: S.splitHalf(trials),
      stimulusSet: ctx.extra?.stimulusSet || (ctx.task.id === "dual-nback" && ["dual","audio"].includes(ctx.params.variant) ?
        C.Audio.stimulusSet : "visual"),
      mobileLimitations: ctx.deviceClass !== "desktop" && ctx.task.touchSupport === "degraded" ?
        [`mobile.${ctx.task.id}`] : [],
      minimumRefreshHz: ctx.minimumRefreshHz ?? ctx.refreshHz,
      processingDeadlineMs: ctx.extra?.processingDeadlineMs ?? null
    };
    if (!summary.invalid && ctx.mode === "training") {
      for (const entry of ctx.states.values()) C.Adaptive.save(entry.key, entry.state);
    }
    C.Storage.appendSession(summary);
    C.Storage.appendTrials(summary.id, [
      ...ctx.practiceTrials.map(row => ({ ...row, phase: "practice" })),
      ...trials.map(row => ({ ...row, phase: "main" }))
    ]);
    await ctx.close(); C.active = null; running(false);
    if (screen.orientation?.unlock) screen.orientation.unlock();
    if (document.fullscreenElement) await document.exitFullscreen().catch(error => console.info(error.name));
    lastSession = summary; selectedTask = ctx.task.id;
    location.hash = "results";
    render();
  }

  const seriesKey = (task, session) => C.canonical({
    params: session.params, device: session.deviceClass, input: session.inputMethod,
    language: task.languageDependent ? session.language : "neutral", stimulusSet: session.stimulusSet
  });
  C.seriesKey = seriesKey;
  function chart(task, mode, metric) {
    const metrics = Array.isArray(metric) ? metric : [metric];
    const all = C.Storage.getSessions(task.id).filter(s => !s.practiceOnly);
    const rows = all.filter(s => s.mode === mode && !s.invalid &&
      (overlay || s.deviceClass === filterDevice && s.inputMethod === filterInput)).reverse()
      .flatMap(row => metrics.filter(key => Number.isFinite(row.score[key]))
        .map(key => ({ ...row, plottedMetric: key, plottedValue: row.score[key] })));
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.plottedMetric}|${seriesKey(task, row)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const title = metrics.map(key => C.t(`score.${key}`)).join(" / ");
    const heading = `<div class="section-heading"><h3>${esc(title)}</h3>
      <span class="muted">${text("home.exposures", { count: C.number(all.length) })}</span></div>`;
    if (!rows.length) return `<article class="card chart-card">${heading}<p class="empty">${text("results.empty")}</p></article>`;
    const values = rows.map(s => s.plottedValue), min = Math.min(...values), max = Math.max(...values);
    const pad = max === min ? Math.max(Math.abs(min) * .1, .5) : (max - min) * .12;
    const yMin = min - pad, yMax = max + pad, plotW = 530, plotH = 180;
    const times = rows.map(s => Date.parse(s.startedAt)), xMin = Math.min(...times), xMax = Math.max(...times);
    const x = row => 66 + (xMax === xMin ? .5 : (Date.parse(row.startedAt) - xMin) / (xMax - xMin)) * plotW;
    const y = value => 24 + plotH - (value - yMin) / (yMax - yMin) * plotH;
    let svg = `<svg viewBox="0 0 640 270" width="640" height="270" role="img" aria-label="${esc(title)}">`;
    for (let i = 0; i < 5; i++) {
      const value = yMin + (yMax - yMin) * i / 4;
      svg += `<line x1="66" x2="596" y1="${y(value)}" y2="${y(value)}" stroke="var(--cp-border)"/>
        <text x="56" y="${y(value) + 4}" text-anchor="end" fill="var(--cp-text-muted)" font-size="12">${esc(C.number(value))}</text>`;
    }
    const legend = [];
    let seriesIndex = 0;
    for (const group of groups.values()) {
      const sample = group[0], other = sample.deviceClass !== filterDevice || sample.inputMethod !== filterInput;
      const color = ["--cp-accent","--cp-link","--cp-success","--cp-warning"][seriesIndex % 4];
      const opacity = other ? .3 : mode === "training" ? .55 : 1;
      const label = `${C.t("results.series")} ${++seriesIndex} · ${C.t(`score.${sample.plottedMetric}`)} · ${C.t(`device.${sample.deviceClass}`)} / ${C.t(`input.${sample.inputMethod}`)}${task.languageDependent ? ` · ${sample.language.toUpperCase()}` : ""} · ${C.t(`stimulus.${sample.stimulusSet}`)}`;
      svg += `<polyline fill="none" stroke="var(${color})" opacity="${opacity}" stroke-width="2" points="${group.map(row => `${x(row)},${y(row.plottedValue)}`).join(" ")}"/>`;
      for (const row of group) svg += `<circle cx="${x(row)}" cy="${y(row.plottedValue)}" r="4" fill="var(${color})" opacity="${opacity}">
        <title>${esc(`${C.date(row.startedAt)} · ${label} · ${C.number(row.plottedValue)}`)}</title></circle>`;
      legend.push(`<li><span style="color:var(${color})">${esc(label)}</span>
        <details><summary>${text("results.parameters")}</summary><code>${esc(C.canonical(sample.params))}</code></details></li>`);
    }
    svg += `<text x="66" y="231" fill="var(--cp-text-muted)" font-size="12">${esc(C.date(xMin))}</text>
      <text x="596" y="231" text-anchor="end" fill="var(--cp-text-muted)" font-size="12">${esc(C.date(xMax))}</text>
      <text x="330" y="258" text-anchor="middle" fill="var(--cp-text-muted)" font-size="12">${text("results.date")}</text></svg>`;
    return `<article class="card chart-card">${heading}<div class="chart-scroll">${svg}</div>
      <ul class="chart-legend">${legend.join("")}</ul></article>`;
  }
  function filterBar() {
    return `<div class="toolbar"><label class="field">${text("results.task")}${taskSelect("result-task")}</label>
      <label class="field">${text("results.device")}<select id="filter-device">${["desktop","tablet","phone"].map(value =>
        `<option value="${value}" ${value === filterDevice ? "selected" : ""}>${text(`device.${value}`)}</option>`).join("")}</select></label>
      <label class="field">${text("results.input")}<select id="filter-input">${["keyboard","touch","mouse"].map(value =>
        `<option value="${value}" ${value === filterInput ? "selected" : ""}>${text(`input.${value}`)}</option>`).join("")}</select></label>
      <label class="inline"><input id="overlay" type="checkbox" ${overlay ? "checked" : ""}>${text("results.overlay")}</label></div>`;
  }
  function bindFilters(fn) {
    document.getElementById("result-task").onchange = event => { selectedTask = event.target.value; fn(); };
    document.getElementById("filter-device").onchange = event => { filterDevice = event.target.value; fn(); };
    document.getElementById("filter-input").onchange = event => { filterInput = event.target.value; fn(); };
    document.getElementById("overlay").onchange = event => { overlay = event.target.checked; fn(); };
  }
  const metricsHTML = score => `<div class="metrics">${Object.entries(score).filter(([key, value]) =>
    key !== "ssrtReasonKey" && (typeof value === "number" || value === null))
    .map(([key, value]) => `<div class="metric"><strong>${esc(C.number(value))}</strong><span>${text(`score.${key}`)}</span></div>`).join("")}</div>
    ${score.ssrtReasonKey ? `<p class="warning">${text(score.ssrtReasonKey)}</p>` : ""}`;
  function results() {
    const task = C.Tasks.find(t => t.id === selectedTask && t.kind !== "journal") || C.Tasks.find(t => t.kind !== "journal");
    selectedTask = task.id;
    const rows = C.Storage.getSessions(task.id).filter(s => overlay || s.deviceClass === filterDevice && s.inputMethod === filterInput);
    const metrics = task.metrics || [task.primaryMetric];
    const charts = mode => task.combineMetrics ? chart(task, mode, metrics) : metrics.map(metric => chart(task, mode, metric)).join("");
    const latest = lastSession?.taskId === task.id ? lastSession : null;
    const reliabilityValue = rows.find(s => !s.invalid && Number.isFinite(s.splitHalf))?.splitHalf;
    app().innerHTML = `<section class="hero"><div><span class="eyebrow">${text("nav.results")}</span><h1>${text("results.title")}</h1>
      <p>${text("results.subtitle")}</p></div></section>${latest ? `<section class="card stack"><h2>${text(latest.invalid ? "runner.invalid" : "runner.complete")}: ${text(task.nameKey)}</h2>
      ${latest.invalidReasons.map(key => `<p class="warning">${text(key)}</p>`).join("")}${metricsHTML(latest.score)}
      <p class="muted">${text("results.excluded", { count: C.number(latest.score.excluded) })}</p>
      ${queue.length ? `<button id="next-suggested" class="primary">${text("common.continue")} · ${text(C.Tasks.find(t => t.id === queue[0]).nameKey)}</button>` : ""}
      </section>` : ""}
      ${filterBar()}<p class="muted">${text("results.parameterNote")}</p>
      ${task.languageDependent ? `<p class="notice">${text("results.languageNote")}</p>` : ""}
      ${overlay ? `<p class="warning">${text("results.notComparable")}</p>` : ""}
      ${task.id === "ufov" ? `<p class="notice">${text("results.thresholdNote")}</p>` : ""}
      ${Number.isFinite(reliabilityValue) && reliabilityValue < .7 ? `<p class="warning">⚠ ${text("reliability.warning")}</p>` : ""}
      <h2>${text("results.assessmentChart")}</h2><div class="stack">${charts("assessment")}</div>
      <h2>${text("results.trainingChart")}</h2><div class="stack">${charts("training")}</div>
      <section class="card"><h2>${text("data.sessions")}</h2><div class="table-scroll"><table><thead><tr>
      ${["results.date","results.mode","results.score","results.duration","results.validity","results.details"].map(key => `<th>${text(key)}</th>`).join("")}
      </tr></thead><tbody>${rows.map(row => `<tr><td>${esc(C.date(row.startedAt))}</td><td>${text(`mode.${row.mode}`)}</td>
      <td>${esc(C.number(row.score[task.primaryMetric]))}</td><td>${esc(C.number(row.durationMs / 1000, 0))} ${text("common.unitSeconds")}</td>
      <td>${text(row.invalid ? "results.invalid" : "results.valid")}</td><td><button data-session="${esc(row.id)}">${text("results.details")}</button></td></tr>`).join("")}
      </tbody></table></div>${!rows.length ? `<p class="empty">${text("results.empty")}</p>` : ""}</section><div id="session-details"></div>`;
    bindFilters(results);
    document.getElementById("next-suggested")?.addEventListener("click", () => { location.hash = `task/${queue.shift()}`; });
    app().querySelectorAll("[data-session]").forEach(button => button.onclick = () => {
      const row = rows.find(s => s.id === button.dataset.session);
      const trials = C.Storage.getTrials(row.id);
      document.getElementById("session-details").innerHTML = `<section class="card"><h2>${esc(C.date(row.startedAt))}</h2>
        ${metricsHTML(row.score)}<p>${text("results.excluded", { count: C.number(row.score.excluded || 0) })}</p>
        <p>${text(trials.length ? "results.retained" : "results.noTrials")}</p><pre></pre></section>`;
      document.querySelector("#session-details pre").textContent = JSON.stringify(row, null, 2);
    });
  }
  function reliability() {
    const task = C.Tasks.find(t => t.id === selectedTask && t.kind !== "journal") || C.Tasks.find(t => t.kind !== "journal");
    selectedTask = task.id;
    const rows = C.Storage.getSessions(task.id).filter(s => !s.invalid && !s.practiceOnly && s.deviceClass === filterDevice &&
      s.inputMethod === filterInput).reverse();
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.mode}|${seriesKey(task, row)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const cards = [...groups.values()].map((group, index) => {
      const halves = group.map(s => s.splitHalf).filter(Number.isFinite), last = group.at(-1);
      const assessments = group.filter(s => s.mode === "assessment" && Number.isFinite(s.score[task.primaryMetric]));
      const x = assessments.slice(0, -1).map(s => s.score[task.primaryMetric]), y = assessments.slice(1).map(s => s.score[task.primaryMetric]);
      const retest = assessments.length >= 4 ? S.correlation(x, y) : null;
      const latest = last.splitHalf, runningMedian = S.median(halves);
      const low = [latest, runningMedian, retest].some(v => Number.isFinite(v) && v < .7);
      return `<article class="card"><h3>${text("results.series")} ${index + 1} · ${text(`mode.${last.mode}`)} · ${last.language.toUpperCase()}</h3>
        <p>${text("home.exposures", { count: C.number(group.length) })}</p><div class="metrics">
        ${[["reliability.splitHalf",latest],["reliability.runningMedian",runningMedian],["reliability.retest",retest]].map(([key, value]) =>
          `<div class="metric"><strong>${esc(C.number(value))}</strong><span>${text(key)}</span></div>`).join("")}</div>
        ${low ? `<p class="warning">⚠ ${text("reliability.warning")}</p>` : ""}
        ${latest === null || retest === null ? `<p class="muted">${text("reliability.needData")}</p>` : ""}
        <details><summary>${text("results.parameters")}</summary><code>${esc(C.canonical(last.params))}</code></details></article>`;
    });
    app().innerHTML = `<section class="hero"><div><h1>${text("reliability.title")}</h1><p>${text("reliability.subtitle")}</p></div></section>
      ${filterBar()}<p class="notice">${text("reliability.deviceNote")}</p><div class="stack">${cards.join("") ||
        `<p class="empty">${text("reliability.needData")}</p>`}</div><section class="card prose"><h2>${text("about.reliability")}</h2>
      <p>${text("reliability.method")}</p></section>`;
    bindFilters(reliability);
  }
  function dataView() {
    const snapshot = C.Storage.snapshot(), count = Object.values(snapshot.trials).reduce((sum, rows) => sum + rows.length, 0);
    app().innerHTML = `<section class="hero"><div><h1>${text("data.title")}</h1><p>${text("data.subtitle")}</p></div></section>
      <section class="card"><div class="metrics"><div class="metric"><strong>${C.number(snapshot.sessions.length)}</strong><span>${text("data.sessions")}</span></div>
      <div class="metric"><strong>${C.number(count)}</strong><span>${text("data.rawRows")}</span></div>
      <div class="metric"><strong>${C.number(snapshot.forecasts.length)}</strong><span>${text("forecast.entries")}</span></div>
      <div class="metric"><strong>${C.number(new Blob([JSON.stringify(snapshot)]).size / 1024)} KB</strong><span>${text("data.size")}</span></div></div>
      ${C.Storage.pending ? `<p class="warning">${text("data.pending")}</p>` : ""}
      <div class="actions"><button id="export-json" class="primary">${text("data.exportJSON")}</button>
      <button id="export-csv">${text("data.exportCSV")}</button>
      ${C.Storage.hasUnreadableOriginal ? `<button id="export-original">${text("data.exportOriginal")}</button>` : ""}</div></section>
      <section class="card stack"><h2>${text("data.import")}</h2><p>${text("data.importHelp")}</p>
      <label class="field">${text("data.import")}<input id="import-file" type="file" accept=".json,application/json"></label>
      <p id="import-status" role="status"></p></section>
      <section class="card stack"><h2>${text("data.prune")}</h2><p>${text("data.pruneHelp")}</p>
      <button id="prune-data">${text("data.prune")}</button></section>
      <section class="card stack"><h2>${text("data.wipe")}</h2><p>${text("data.wipeHelp")}</p>
      <label class="field">${text("data.confirmLabel")}<input id="wipe-confirm" autocomplete="off" spellcheck="false"></label>
      <button class="danger" id="wipe-data">${text("data.wipe")}</button></section>`;
    document.getElementById("export-json").onclick = () => C.Storage.exportAll();
    document.getElementById("export-csv").onclick = exportCSV;
    document.getElementById("export-original")?.addEventListener("click", () => C.Storage.exportOriginal());
    document.getElementById("import-file").onchange = async event => {
      const file = event.target.files[0]; if (!file) return;
      try {
        const report = await C.Storage.importAll(file);
        C.language = settings().language;
        header();
        dataView();
        document.getElementById("import-status").textContent = C.t("data.imported", report) + " " + C.t("forecast.imported", report);
        if (!report.saved) C.notice("data.pending");
      } catch (error) {
        console.warn("Import rejected:", error);
        document.getElementById("import-status").textContent = C.t(/^(data|forecast)\./.test(error.message) ? error.message : "data.invalid");
      }
    };
    document.getElementById("prune-data").onclick = () => {
      const saved = C.Storage.prune(); dataView(); C.notice(saved ? "data.pruned" : "data.pending");
    };
    document.getElementById("wipe-data").onclick = () => {
      try {
        const saved = C.Storage.wipe(document.getElementById("wipe-confirm").value); lastSession = null; queue = [];
        C.Tasks.forEach(task => task.onWipe?.());
        C.language = settings().language; render(); C.notice(saved ? "data.wiped" : "data.pending");
      } catch (error) { C.notice(error.message); }
    };
  }
  function exportCSV() {
    const rows = C.Storage.getSessions();
    const keys = ["id","taskId","mode","startedAt","durationMs","language","deviceClass","inputMethod","refreshHz","viewport","invalid","params","score"];
    C.download(`cortex-${C.iso().slice(0,10)}.csv`, "\ufeff" + [keys.map(C.csvCell).join(","),
      ...rows.map(row => keys.map(key => C.csvCell(row[key])).join(","))].join("\r\n"), "text/csv;charset=utf-8");
  }
  function about() {
    app().innerHTML = `<section class="hero"><div><h1>${text("about.title")}</h1><p>${text("app.localOnly")}</p></div></section>
      <section class="card prose">${["evidence","ufov","measurement","modes","reliability","devices","limitations","privacy","tierTwo"].map(key =>
        `<h2>${text(`about.${key}`)}</h2><p>${text(`about.${key}Text`)}</p>`).join("")}</section>`;
  }
  function openSettings(taskId = selectedTask) {
    if (C.active) { C.notice("runner.abort"); return; }
    const dialog = document.getElementById("settings-dialog"), form = document.getElementById("settings-form");
    const task = C.Tasks.find(t => t.id === taskId) || C.Tasks[0], values = taskParams(task);
    form.innerHTML = `<h2>${text("settings.title")}</h2><p class="muted">${text("settings.seriesBreak")}</p>
      <label class="field">${text("settings.task")}${taskSelect("settings-task", task.id, true)}</label>
      <div class="settings-grid">${Object.entries(task.paramSchema).map(([key, schema]) => `<label class="field parameter">
      ${text(`param.${key}`)}${schema.type === "text" ? `<textarea name="${key}" rows="${schema.rows || 3}" maxlength="${schema.maxLength}">${esc(values[key])}</textarea>` :
        schema.choices ? `<select name="${key}">${schema.choices.map(value =>
        `<option value="${value}" ${values[key] === value ? "selected" : ""}>${text(`choice.${value}`)}</option>`).join("")}</select>` :
        `<input name="${key}" type="number" value="${values[key]}" min="${schema.min}" max="${schema.max}" step="${schema.step}" required>`}
      <small>${text("settings.defaults", { value: schema.type === "text" ? schema.value || C.t("common.none") :
        schema.choices ? C.t(`choice.${schema.value}`) : C.number(schema.value) })}</small></label>`).join("")}</div>
      <p id="settings-error" class="warning" role="alert" hidden></p>
      <label class="inline"><input name="vibration" type="checkbox" ${settings().vibration ? "checked" : ""}>${text("settings.vibration")}</label>
      <div class="actions"><button class="primary" type="submit">${text("common.save")}</button><button id="reset-params" type="button">${text("settings.reset")}</button></div>`;
    document.getElementById("settings-task").onchange = event => openSettings(event.target.value);
    const parameterError = key => {
      const target = document.getElementById("settings-error");
      target.textContent = C.t(key); target.hidden = false; target.scrollIntoView({ block: "nearest" });
    };
    form.oninput = () => { document.getElementById("settings-error").hidden = true; };
    document.getElementById("reset-params").onclick = () => {
      for (const [key, schema] of Object.entries(task.paramSchema)) form.elements.namedItem(key).value = schema.value;
      document.getElementById("settings-error").hidden = true;
    };
    form.onsubmit = event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const next = {};
      for (const [key, schema] of Object.entries(task.paramSchema)) {
        const value = form.elements.namedItem(key).value;
        next[key] = schema.choices || schema.type === "text" ? value : Number(value);
      }
      const validationError = C.parameterError(task, next);
      if (validationError) { parameterError(validationError); return; }
      const value = settings(); value.taskParams[task.id] = next;
      value.vibration = form.elements.namedItem("vibration").checked;
      const saved = C.Storage.setSettings(value); dialog.close(); render(); C.notice(saved ? "settings.saved" : "data.pending");
    };
    if (!dialog.open) dialog.showModal();
  }
  function render() {
    if (C.active) return;
    header();
    const [route, id] = (location.hash.slice(1) || "home").split("/");
    if (route === "task") {
      const task = C.Tasks.find(t => t.id === id);
      if (task) instructions(task); else home();
    } else ({ home, results, reliability, data: dataView, about }[route] || home)();
  }
  C.UI = { render, startPractice, runMain, finish, cooldown, chart, openSettings };
  document.addEventListener("DOMContentLoaded", async () => {
    C.Draw.init();
    // Keep the registry as the only source of navigation; order is declared here only for the home presentation.
    const order = ["dual-nback","ufov","stroop-squared","flanker-squared","simon-squared","antisaccade",
      "visual-arrays","symmetry-span","corsi","digit-span","matrix-reasoning","number-series","mental-arithmetic","pvt-b"];
    const rank = task => task.kind === "journal" ? Infinity : order.includes(task.id) ? order.indexOf(task.id) : order.length;
    C.Tasks.sort((a, b) => rank(a) - rank(b));
    C.Storage.onWarning(warning => {
      document.getElementById("storage-warning")?.remove();
      if (warning) {
        C.notice(warning.key);
        document.getElementById("notifications").lastElementChild.id = "storage-warning";
      }
    });
    document.getElementById("language").onchange = event => {
      if (C.active) { event.target.value = C.language; return; }
      C.language = event.target.value; C.Storage.setSettings({ language: C.language }); render();
      document.getElementById("notifications").replaceChildren();
      if (C.Storage.pending) C.notice("data.pending");
    };
    document.getElementById("open-settings").onclick = () => openSettings();
    document.getElementById("close-settings").onclick = () => document.getElementById("settings-dialog").close();
    document.getElementById("abort").onclick = () => C.active?.abort();
    document.getElementById("abort").onpointerdown = event => { event.preventDefault(); C.active?.abort(); };
    app().addEventListener("click", event => {
      const modeButton = event.target.closest("[data-mode]");
      if (modeButton) { C.Storage.setSettings({ mode: modeButton.dataset.mode }); render(); }
      const inputButton = event.target.closest("[data-input]");
      if (inputButton) { C.input = inputButton.dataset.input; filterInput = C.input; render(); }
    });
    addEventListener("hashchange", async () => {
      if (C.active) {
        const ctx = C.active;
        ctx.abort();
        if (ctx.phase === "between") await finish(ctx);
      } else render();
    });
    await C.Timing.measure();
    render();
  });
})();

(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p } = C.parameter;
  for (const id of ["matrix-reasoning", "number-series"]) {
    C.define(id, "reasoning", { trials: p(30, 10, 100, 5), startLevel: p(1, 1, 5),
      minLevel: p(1, 1, 5), maxLevel: p(5, 1, 5), responseMs: p(30000, 5000, 120000, 1000) }, {
      landscape: id === "matrix-reasoning", staircase: "stepwise", primaryMetric: "estimatedThreshold",
      metrics: ["estimatedThreshold","accuracy"],
      async run(ctx) {
        const practice = ctx.phase === "practice", q = ctx.params, matrix = id === "matrix-reasoning";
        const count = practice ? 8 : q.trials;
        const minLevel = Math.min(q.minLevel, q.maxLevel), maxLevel = Math.max(q.minLevel, q.maxLevel);
        const state = ctx.state("difficulty", "stepwise", { start: q.startLevel, min: minLevel, max: maxLevel });
        const used = new Set(C.Storage.getItemHashes(id)), hashes = [], banks = new Map();
        const levels = practice ? [1] : Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => minLevel + i);
        const matrixPanel = matrix ? ctx.prepareOptions(D.options(Array.from({ length: 8 }, (_, i) => String(i + 1))), "pictures") : null;
        for (const level of levels) {
          const bank = [];
          for (let i = 0; i < count; i++) {
            const item = matrix ? C.Generators.matrix(level, used) : C.Generators.series(level, used);
            hashes.push(item.hash);
            const panel = matrix ? matrixPanel : ctx.prepareOptions(D.options(item.options.map(option =>
              typeof option === "number" ? C.number(option) : String(option))));
            const scene = matrix ? ctx.prepareMatrix(item, panel) : D.series(item.sequence.map(value =>
              typeof value === "number" ? C.number(value) : value));
            bank.push({ item, panel, scene });
          }
          banks.set(level, bank);
        }
        C.Storage.reserveItems(id, hashes);
        const fixedLevels = C.shuffle(Array.from({ length: count }, (_, i) => levels[i % levels.length]));
        const recent = [];
        await ctx.countdown();
        for (let index = 0; index < count; index++) {
          const level = practice ? 1 : ctx.mode === "assessment" ? fixedLevels[index] : Math.round(state.state.value);
          const { item, scene, panel } = banks.get(level).pop();
          const row = await ctx.trial({ scene, panel, deadline: q.responseMs, answer: item.answer,
            meta: { level, itemHash: item.hash, family: item.family, answer: item.answer,
              rules: item.rules, cells: item.cells, sequence: item.sequence, options: item.options,
              ruleCount: item.ruleCount, directions: item.directions, operatorCount: item.operatorCount, periodLength: item.periodLength } });
          recent.push(row);
          if (recent.length === 5) {
            ctx.adapt(state, { accuracy: S.accuracy(S.exclude(recent)), errors: recent.filter(t => !t.correct).length,
              up: .8, down: .4, downErrors: 3 });
            recent.length = 0;
          }
        }
        return { stimulusSet: matrix ? "visual" : "mixed" };
      },
      score(rows) {
        const valid = S.eligible(rows), score = C.accuracyScore(rows);
        const passed = [];
        for (let level = 1; level <= 5; level++) {
          const group = valid.filter(row => row.level === level);
          score[`bin${level}`] = S.mean(group.map(row => Number(row.correct)));
          if (group.length >= 3 && score[`bin${level}`] >= .7) passed.push(level);
        }
        score.estimatedThreshold = passed.length ? Math.max(...passed) : null;
        return score;
      }
    });
  }
})();

(() => {
  'use strict';

  const C = window.Cortex = window.Cortex || {};
  const ATTRIBUTES = [
    { name: 'shape', minimum: 0, modulus: 5 },
    { name: 'shade', minimum: 0, modulus: 3 },
    { name: 'orientation', minimum: 0, modulus: 4 },
    { name: 'size', minimum: 0, modulus: 3 },
    { name: 'count', minimum: 1, modulus: 4 }
  ];
  const MATRIX_BINS = [1, 2, 3, 4, 6];
  const MAX_VALUE = 1_000_000;
  const mod = (value, modulus) => ((value % modulus) + modulus) % modulus;
  const random = (minimum, maximum) => C.rand(minimum, maximum);
  const pick = values => C.pick(values);
  const shuffled = values => {
    const copy = [...values];
    return C.shuffle(copy) || copy;
  };
  const signed = (minimum, maximum) => random(minimum, maximum) * pick([-1, 1]);
  const equal = (left, right) => C.canonical(left) === C.canonical(right);
  const requireInvariant = (condition, message) => {
    if (!condition) throw new Error(`Cortex generator invariant: ${message}`);
  };

  function validateArguments(level, usedSet) {
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      throw new RangeError('Difficulty must be an integer from 1 through 5.');
    }
    if (!usedSet || typeof usedSet.has !== 'function' || typeof usedSet.add !== 'function') {
      throw new TypeError('usedSet must support has(hash) and add(hash).');
    }
  }

  function packCell(cell) {
    return 'bits' in cell
      ? cell.bits
      : ((((cell.shape * 3 + cell.shade) * 3 + cell.size) * 4 + cell.count - 1) * 4 + cell.orientation);
  }

  function matrixHash(family, cells) {
    const packed = cells.map(packCell);
    const transposed = packed.map((_, index) => packed[(index % 3) * 3 + Math.floor(index / 3)]);
    const keys = [packed.slice(0, 8), transposed.slice(0, 8)].map(values => String(C.canonical(values)));
    // An exact compact content key avoids digest collisions; transpose and option order are presentation.
    return `matrix:${family}:${keys.sort()[0]}`;
  }

  function profile(level) {
    if (level === 2) return pick([[2, 1], [1, 2]]);
    return ({ 1: [1, 1], 3: [3, 1], 4: [2, 2], 5: [3, 2] })[level];
  }

  function transformValue(rule, row, column) {
    const offset = rule.axis === 'both'
      ? rule.origin + row * rule.stepDownColumn + column * rule.stepAcrossRow
      : rule.lineStarts[rule.axis === 'row' ? row : column]
        + (rule.axis === 'row' ? column : row) * rule.step;
    return rule.minimum + mod(offset, rule.modulus);
  }

  function transformation(level, ruleCount, directions) {
    const axis = directions === 2 ? 'both' : pick(['row', 'column']);
    const selected = shuffled(ATTRIBUTES).slice(0, ruleCount);
    const fixed = { shape: random(0, 4), shade: random(0, 2), orientation: random(0, 3), size: random(0, 2), count: random(1, 4) };
    const attributes = selected.map(({ name, minimum, modulus }) => {
      const rule = { type: 'modular-attribute-progression', attribute: name, minimum, modulus, axis };
      if (directions === 2) {
        Object.assign(rule, {
          origin: random(0, modulus - 1),
          stepAcrossRow: random(1, modulus - 1),
          stepDownColumn: random(1, modulus - 1)
        });
      } else {
        const first = random(0, modulus - 1);
        const second = random(0, modulus - 1);
        const forbidden = mod(2 * second - first, modulus);
        const third = pick(Array.from({ length: modulus }, (_, i) => i).filter(value => value !== forbidden));
        Object.assign(rule, { step: random(1, modulus - 1), lineStarts: [first, second, third] });
      }
      return rule;
    });
    const cells = Array.from({ length: 9 }, (_, index) => {
      const cell = { ...fixed };
      for (const rule of attributes) cell[rule.attribute] = transformValue(rule, Math.floor(index / 3), index % 3);
      return cell;
    });
    for (const { name } of selected) delete fixed[name];
    return {
      level, family: 'transformation', ruleCount, directions, cells,
      rules: {
        kind: 'attribute-progressions',
        axis,
        attributes,
        fixedAttributes: fixed,
        orientationPolicy: 'Directional stems distinguish all four rotations, including symmetric polygons.',
        equation: 'minimum + modulo(origin + row*stepDownColumn + column*stepAcrossRow, modulus); one-direction rules use independent lineStarts instead.',
        complexity: { ruleCount, directions, bin: ruleCount * directions }
      }
    };
  }

  function bitOperation(operator, left, right, mask) {
    switch (operator) {
      case 'and': return (left & right) & mask;
      case 'or':
      case 'add': return (left | right) & mask;
      case 'xor': return (left ^ right) & mask;
      case 'subtract': return (left & ~right) & mask;
      default: throw new Error(`Unknown bit operator: ${operator}`);
    }
  }

  function regionMasks(ruleCount) {
    if (ruleCount === 1) return [511];
    const strips = pick([[7, 56, 448], [73, 146, 292]]);
    if (ruleCount === 3) return shuffled(strips);
    const single = pick([strips[0], strips[2]]);
    return shuffled([single, 511 ^ single]);
  }

  function visibleLines(axis) {
    const rows = [[0, 1, 2], [3, 4, 5]];
    const columns = [[0, 3, 6], [1, 4, 7]];
    return axis === 'both' ? [...rows, ...columns] : axis === 'row' ? rows : columns;
  }

  function compatibleOperators(values, mask, axis) {
    return ['and', 'or', 'xor', 'subtract'].filter(operator => {
      if (!visibleLines(axis).every(([a, b, result]) => bitOperation(operator, values[a], values[b], mask) === values[result])) return false;
      const across = bitOperation(operator, values[6], values[7], mask);
      const down = bitOperation(operator, values[2], values[5], mask);
      if (axis === 'both' && across !== down) return false;
      return true;
    });
  }

  function makeRegion(operator, mask, axis) {
    const values = Array(9).fill(0);
    if (axis !== 'both') {
      for (let line = 0; line < 3; line++) {
        const left = random(0, 511) & mask;
        const right = random(0, 511) & (operator === 'add' ? mask & ~left : mask);
        const result = bitOperation(operator, left, right, mask);
        const indices = axis === 'row' ? [line * 3, line * 3 + 1, line * 3 + 2] : [line, line + 3, line + 6];
        [left, right, result].forEach((value, index) => { values[indices[index]] = value; });
      }
      const perpendicular = axis === 'row' ? [[0, 3, 6], [1, 4, 7], [2, 5, 8]] : [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
      if (perpendicular.every(([a, b, result]) => bitOperation(operator, values[a], values[b], mask) === values[result])) return null;
    } else {
      const positions = shuffled(Array.from({ length: 9 }, (_, index) => index).filter(index => mask & (1 << index)));
      let patterns;
      switch (operator) {
        case 'and': patterns = [15, pick([3, 5, 10, 12]), pick([1, 2, 4, 8])]; break;
        case 'or': patterns = [0, 15, pick([1, 2, 4, 8])]; break;
        case 'xor': patterns = [pick([1, 2, 4, 7, 8, 11, 13, 14]), pick([3, 5, 6, 9, 10, 12, 15]), random(0, 15)]; break;
        case 'add': patterns = [0, ...shuffled([1, 2, 4, 8]).slice(0, 2)]; break;
        case 'subtract': patterns = [1, pick([2, 4, 6]), 7]; break;
      }
      const seeds = [0, 0, 0, 0];
      positions.forEach((position, index) => {
        const pattern = index < patterns.length ? patterns[index]
          : operator === 'add' ? pick([0, 1, 2, 4, 8])
            : random(0, operator === 'subtract' ? 7 : 15);
        for (let seed = 0; seed < 4; seed++) {
          if (pattern & (1 << seed)) seeds[seed] |= 1 << position;
        }
      });
      [values[0], values[1], values[3], values[4]] = seeds;
      values[2] = bitOperation(operator, values[0], values[1], mask);
      values[5] = bitOperation(operator, values[3], values[4], mask);
      values[6] = bitOperation(operator, values[0], values[3], mask);
      values[7] = bitOperation(operator, values[1], values[4], mask);
      values[8] = bitOperation(operator, values[6], values[7], mask);
      if (values[8] !== bitOperation(operator, values[2], values[5], mask)) return null;
    }
    const compatible = compatibleOperators(values, mask, axis);
    if (!compatible.length) return null;
    for (const alternative of compatible) {
      const prediction = axis === 'column'
        ? bitOperation(alternative, values[2], values[5], mask)
        : bitOperation(alternative, values[6], values[7], mask);
      if (prediction !== values[8]) return null;
    }
    if (new Set(values.slice(0, 8)).size < 3) return null;
    return { values, compatible };
  }

  function logic(level, ruleCount, directions) {
    const axis = directions === 2 ? 'both' : pick(['row', 'column']);
    const operators = shuffled(['and', 'or', 'xor', 'subtract']).slice(0, ruleCount);
    // Set addition equals OR (and XOR on disjoint inputs); do not count equivalent partitions twice.
    if (operators.includes('or') && !operators.includes('xor') && random(0, 1)) {
      operators[operators.indexOf('or')] = 'add';
    }
    const masks = regionMasks(ruleCount);
    const regions = [];
    const values = Array(9).fill(0);
    for (let index = 0; index < ruleCount; index++) {
      let region = null;
      for (let attempt = 0; attempt < 96; attempt++) {
        const candidate = makeRegion(operators[index], masks[index], axis);
        if (candidate && regions.every(previous => !previous.compatibleOperators.some(operator => candidate.compatible.includes(operator)))) {
          region = candidate;
          break;
        }
      }
      if (!region) return null;
      region.values.forEach((value, cell) => { values[cell] |= value; });
      const operator = operators[index];
      regions.push({
        mask: masks[index], operator, axis,
        compatibleOperators: region.compatible,
        seedCells: axis === 'both'
          ? [region.values[0], region.values[1], region.values[3], region.values[4]]
          : (axis === 'row' ? [[0, 1], [3, 4], [6, 7]] : [[0, 3], [1, 4], [2, 5]]).map(pair => pair.map(cell => region.values[cell])),
        meaning: operator === 'add'
          ? 'Disjoint set addition: occupy positions present in either operand; operands never overlap, so there is no carry.'
          : operator === 'subtract'
            ? 'Set subtraction A \\ B: remove positions named by B from A; removing an absent position is a no-op, with no borrowing.'
            : `Position-wise ${operator.toUpperCase()} within this mask.`,
        construction: axis !== 'both' ? 'Three independent operand pairs, one per line.'
          : operator === 'subtract'
            ? 'Top-left 2x2 seeds A,B,C,0. The empty fourth seed makes both compositions equal A \\ (B union C), including non-subset removals.'
            : operator === 'add'
              ? 'Four pairwise-disjoint top-left 2x2 seeds; both directions produce their union.'
              : 'Four top-left 2x2 seeds; the operator is applied across rows and down columns. Associativity and commutativity make both paths agree.'
      });
    }
    if (values[8] === 0 || values[8] === 511 || new Set(values.slice(0, 8)).size < 4) return null;
    return {
      level, family: 'logic', ruleCount, directions,
      cells: values.map(bits => ({ bits })),
      rules: {
        kind: 'partitioned-bit-logic', axis, regions,
        partition: 'Disjoint full rows or columns of the mini-grid; masks cover all nine positions.',
        equation: 'Third cell = operator(first cell, second cell), separately within each mask; combine region outputs by union.',
        complexity: { ruleCount, directions, bin: ruleCount * directions }
      }
    };
  }

  function transformCell(cell, attribute, amount = 1) {
    return { ...cell, [attribute.name]: attribute.minimum + mod(cell[attribute.name] - attribute.minimum + amount, attribute.modulus) };
  }

  function randomTransformCell() {
    return { shape: random(0, 4), shade: random(0, 2), orientation: random(0, 3), size: random(0, 2), count: random(1, 4) };
  }

  function matrixOptions(item) {
    const correct = item.cells[8];
    const entries = [{ cell: { ...correct }, source: 'correct' }];
    const seen = new Set([packCell(correct)]);
    const existing = new Set(item.cells.map(packCell));
    const add = (cell, source) => {
      const key = packCell(cell);
      if (source === 'novel-feature-combination' && existing.has(key)) return false;
      if (entries.length < 8 && !seen.has(key)) {
        seen.add(key);
        entries.push({ cell: { ...cell }, source });
        return true;
      }
      return false;
    };
    const strategy = (source, produce) => {
      for (let attempt = 0; attempt < 24; attempt++) {
        if (add(produce(), source)) break;
      }
    };
    strategy('existing-entry', () => pick(item.cells.slice(0, 8)));
    if (item.family === 'transformation') {
      requireInvariant(item.rules.attributes.length === item.ruleCount, 'attribute rule count');
      strategy('transformed-entry', () => transformCell(pick(item.cells.slice(0, 8)), pick(ATTRIBUTES)));
      strategy('transformed-correct', () => transformCell(correct, pick(ATTRIBUTES)));
      strategy('feature-recombination', () => {
        const cell = { orientation: 0 };
        for (const { name } of ATTRIBUTES) cell[name] = pick(item.cells.slice(0, 8))[name];
        return cell;
      });
      strategy('novel-feature-combination', randomTransformCell);
      for (let attempt = 0; entries.length < 8 && attempt < 128; attempt++) add(randomTransformCell(), 'novel-feature-combination');
      for (let encoded = 0; entries.length < 8 && encoded < 180; encoded++) {
        let value = encoded;
        const count = value % 4 + 1; value = Math.floor(value / 4);
        const size = value % 3; value = Math.floor(value / 3);
        const shade = value % 3; value = Math.floor(value / 3);
        add({ shape: value, shade, size, count, orientation: 0 }, 'novel-feature-combination');
      }
    } else {
      requireInvariant(item.rules.regions.length === item.ruleCount, 'logic rule count');
      strategy('transformed-entry', () => ({ bits: pick(item.cells.slice(0, 8)).bits ^ (1 << random(0, 8)) }));
      strategy('transformed-correct', () => ({ bits: correct.bits ^ (1 << random(0, 8)) }));
      strategy('feature-recombination', () => {
        const mask = pick([7, 56, 448, 73, 146, 292]);
        return { bits: (pick(item.cells.slice(0, 8)).bits & mask) | (pick(item.cells.slice(0, 8)).bits & (511 ^ mask)) };
      });
      strategy('novel-feature-combination', () => ({ bits: random(0, 511) }));
      for (let attempt = 0; entries.length < 8 && attempt < 128; attempt++) add({ bits: random(0, 511) }, 'novel-feature-combination');
      for (let bits = 0; entries.length < 8 && bits <= 511; bits++) add({ bits }, 'novel-feature-combination');
    }
    const options = shuffled(entries);
    item.options = options.map(entry => entry.cell);
    item.answer = options.findIndex(entry => entry.source === 'correct');
    item.rules.distractorSources = options.map(entry => entry.source);
  }

  function auditMatrix(item) {
    requireInvariant(item.cells.length === 9 && item.options.length === 8, 'matrix dimensions');
    requireInvariant(item.ruleCount * item.directions === MATRIX_BINS[item.level - 1], 'matrix difficulty bin');
    for (const cell of [...item.cells, ...item.options]) {
      if (item.family === 'logic') requireInvariant(Number.isInteger(cell.bits) && cell.bits >= 0 && cell.bits <= 511, 'bit range');
      else {
        requireInvariant(Number.isInteger(cell.orientation) && cell.orientation >= 0 && cell.orientation < 4, 'orientation range');
        for (const attribute of ATTRIBUTES) {
          requireInvariant(Number.isInteger(cell[attribute.name]) && cell[attribute.name] >= attribute.minimum
            && cell[attribute.name] < attribute.minimum + attribute.modulus, 'attribute range');
        }
      }
    }
    requireInvariant(new Set(item.options.map(packCell)).size === 8, 'distinct matrix options');
    requireInvariant(equal(item.options[item.answer], item.cells[8]), 'matrix answer');
    if (item.family === 'transformation') {
      for (const rule of item.rules.attributes) {
        item.cells.forEach((cell, index) => requireInvariant(cell[rule.attribute] === transformValue(rule, Math.floor(index / 3), index % 3), 'attribute rule'));
      }
    } else {
      requireInvariant(item.rules.regions.reduce((mask, region) => mask | region.mask, 0) === 511, 'complete partition');
      for (const region of item.rules.regions) {
        const lines = [...visibleLines(region.axis)];
        if (region.axis !== 'column') lines.push([6, 7, 8]);
        if (region.axis !== 'row') lines.push([2, 5, 8]);
        for (const [a, b, result] of lines) {
          requireInvariant(bitOperation(region.operator, item.cells[a].bits, item.cells[b].bits, region.mask) === (item.cells[result].bits & region.mask), 'logic composition');
          if (region.operator === 'add') requireInvariant((item.cells[a].bits & item.cells[b].bits & region.mask) === 0, 'disjoint addition');
        }
      }
    }
  }

  function matrix(level, usedSet = new Set()) {
    validateArguments(level, usedSet);
    for (let attempt = 0; attempt < 4096; attempt++) {
      const [ruleCount, directions] = profile(level);
      const item = random(0, 99) < 55 ? transformation(level, ruleCount, directions) : logic(level, ruleCount, directions);
      if (!item) continue;
      item.hash = matrixHash(item.family, item.cells);
      if (usedSet.has(item.hash)) continue;
      matrixOptions(item);
      auditMatrix(item);
      usedSet.add(item.hash);
      return item;
    }
    throw new RangeError('Unable to find an unseen matrix after 4096 attempts.');
  }

  const operation = (type, operand) => ({ type, operand });
  const applyOperations = (value, operations) => operations.reduce((result, op) => op.type === 'add' ? result + op.operand : result * op.operand, value);

  function recurrentTerms(initial, phases, length) {
    const terms = [initial];
    while (terms.length < length) terms.push(applyOperations(terms.at(-1), phases[(terms.length - 1) % phases.length]));
    return terms;
  }

  function affinePhase(multiplier) {
    return [operation('multiply', multiplier), operation('add', signed(1, 9))];
  }

  function numericRecurrence(level, family, initial, phases, length) {
    return {
      level, family, operatorCount: phases.reduce((count, phase) => count + phase.length, 0), periodLength: phases.length,
      terms: recurrentTerms(initial, phases, length + 1),
      rules: {
        kind: 'periodic-operations', initial, phases,
        indexing: 'Transition from term i to term i+1 uses phases[i % periodLength], starting at i=0. Operations within a phase are applied in order.'
      }
    };
  }

  function alternating(level) {
    if (level === 2) {
      const amount = random(2, 12);
      const other = pick(Array.from({ length: 11 }, (_, i) => i + 2).filter(value => value !== amount));
      const phases = shuffled([
        [operation('add', amount)],
        [pick([operation('multiply', random(2, 4)), operation('add', -other)])]
      ]);
      return numericRecurrence(level, 'alternating', random(15, 60), phases, random(6, 8));
    }
    if (level === 3) {
      const phases = shuffled([
        [operation('add', random(2, 12))],
        [operation('multiply', random(2, 4))],
        [operation('add', -random(2, 12))]
      ]);
      return numericRecurrence(level, 'alternating', random(8, 30), phases, random(7, 8));
    }
    const period = level === 4 ? 2 : 3;
    const phases = shuffled([2, 3, 4]).slice(0, period).map(affinePhase);
    return numericRecurrence(level, 'alternating', random(8, 25), phases, level === 5 ? 8 : random(7, 8));
  }

  function secondDifferences(level) {
    const initial = random(5, 80);
    const initialDifference = random(1, 12);
    const secondDifference = signed(1, 6);
    const length = random(7, 8);
    const terms = [initial];
    let difference = initialDifference;
    while (terms.length <= length) {
      terms.push(terms.at(-1) + difference);
      difference += secondDifference;
    }
    return {
      level, family: 'second-differences', terms, operatorCount: 2, periodLength: 1,
      rules: {
        kind: 'second-differences', initial, initialDifference, secondDifference,
        operations: ['nextValue = value + difference', 'nextDifference = difference + secondDifference'],
        indexing: 'The initialDifference is used to obtain term 1 from term 0, before incrementing the difference.'
      }
    };
  }

  function interleaved(level) {
    const lanes = [0, 1].map((_, index) => {
      const operations = level === 4 ? affinePhase(pick([2, 3]))
        : index === 0 || random(0, 1) ? [operation('add', signed(2, 12))]
          : [operation('multiply', random(2, 4))];
      return { initial: random(5, 35) + index * random(5, 25), operations };
    });
    if (equal(lanes[0].operations, lanes[1].operations)) return null;
    const values = lanes.map(lane => lane.initial);
    const terms = [];
    for (let index = 0; index < 9; index++) {
      const lane = index % 2;
      terms.push(values[lane]);
      values[lane] = applyOperations(values[lane], lanes[lane].operations);
    }
    return {
      level, family: 'interleaved', terms, operatorCount: lanes.reduce((total, lane) => total + lane.operations.length, 0), periodLength: 2,
      rules: {
        kind: 'interleaved', lanes,
        indexing: 'Zero-based even and odd positions form separate lanes. Each lane advances only when that lane is visited; its listed operations apply in order.'
      }
    };
  }

  function alphabet(level) {
    const periodLength = level;
    const offsets = shuffled([-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]).slice(0, periodLength);
    const initial = random(0, 25);
    const length = level === 1 ? random(5, 8) : level === 2 ? random(6, 8) : 8;
    const indices = [initial];
    while (indices.length <= length) indices.push(mod(indices.at(-1) + offsets[(indices.length - 1) % periodLength], 26));
    return {
      level, family: 'alphabet', terms: indices.map(index => String.fromCharCode(65 + index)),
      operatorCount: periodLength, periodLength,
      rules: {
        kind: 'alphabet-offsets', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', initial, offsets, modulus: 26,
        indexing: 'A=0 through Z=25. Transition i uses offsets[i % periodLength]; wrap modulo 26, in either direction.'
      }
    };
  }

  function seriesCandidate(level) {
    const family = level === 1 ? pick(['addition', 'multiplication', 'alphabet'])
      : level === 2 ? pick(['alternating', 'second-differences', 'alphabet'])
        : level === 3 ? pick(['alternating', 'interleaved', 'alphabet'])
          : level === 4 ? pick(['alternating', 'interleaved', 'alphabet'])
            : 'alternating';
    if (family === 'addition') return numericRecurrence(level, family, random(1, 100), [[operation('add', signed(1, 12))]], random(5, 8));
    if (family === 'multiplication') return numericRecurrence(level, family, random(1, 12), [[operation('multiply', random(2, 4))]], random(5, 7));
    if (family === 'alphabet') return alphabet(level);
    if (family === 'interleaved') return interleaved(level);
    if (family === 'second-differences') return secondDifferences(level);
    return alternating(level);
  }

  function replaySeries(rules, length) {
    if (rules.kind === 'periodic-operations') return recurrentTerms(rules.initial, rules.phases, length);
    if (rules.kind === 'second-differences') {
      return Array.from({ length }, (_, index) => rules.initial + index * rules.initialDifference + index * (index - 1) / 2 * rules.secondDifference);
    }
    if (rules.kind === 'interleaved') {
      const values = rules.lanes.map(lane => lane.initial);
      return Array.from({ length }, (_, index) => {
        const lane = index % rules.lanes.length;
        const value = values[lane];
        values[lane] = applyOperations(value, rules.lanes[lane].operations);
        return value;
      });
    }
    const values = [rules.initial];
    while (values.length < length) values.push(mod(values.at(-1) + rules.offsets[(values.length - 1) % rules.offsets.length], 26));
    return values.map(value => String.fromCharCode(65 + value));
  }

  function isSafeSeries(item) {
    if (!item) return false;
    const { terms, rules } = item;
    if (item.family === 'alphabet') return true;
    if (!terms.every(value => Number.isSafeInteger(value) && Math.abs(value) <= MAX_VALUE)) return false;
    if (item.family === 'alternating' && new Set(terms).size !== terms.length) return false;
    if (item.operatorCount > 1) {
      const differences = terms.slice(1).map((value, index) => value - terms[index]);
      if (new Set(differences).size === 1) return false;
      if (terms.slice(1).every((value, index) => terms[index] !== 0 && value * terms[0] === terms[1] * terms[index])) return false;
    }
    if (rules.kind === 'interleaved') {
      for (let lane = 0; lane < rules.lanes.length; lane++) {
        const values = terms.filter((_, index) => index % rules.lanes.length === lane);
        if (new Set(values).size !== values.length) return false;
      }
    }
    if (rules.kind === 'periodic-operations') {
      if (terms.slice(1).some((value, index) => value === terms[index])) return false;
      if (rules.phases.some(phase => phase.length > 1)) {
        for (let phase = 0; phase < rules.phases.length; phase++) {
          const inputs = [];
          for (let index = phase; index < terms.length - 2; index += rules.phases.length) inputs.push(terms[index]);
          if (new Set(inputs).size < 2) return false;
        }
      }
    }
    return true;
  }

  function seriesOptions(item) {
    const correct = item.correctAnswer;
    const entries = [{ value: correct, source: 'correct' }];
    const seen = new Set([correct]);
    const letters = item.family === 'alphabet';
    const add = (value, source) => {
      if (letters && typeof value === 'number') value = String.fromCharCode(65 + mod(value, 26));
      const valid = letters ? typeof value === 'string' && /^[A-Z]$/.test(value)
        : Number.isSafeInteger(value) && Math.abs(value) <= MAX_VALUE;
      if (valid && entries.length < 6 && !seen.has(value)) {
        seen.add(value);
        entries.push({ value, source });
      }
    };
    const last = item.sequence.at(-1);
    if (letters) {
      const lastIndex = last.charCodeAt(0) - 65;
      const nextOffset = item.rules.offsets[(item.sequence.length - 1) % item.periodLength];
      add(lastIndex - nextOffset, 'reversed-offset');
      for (const offset of shuffled(item.rules.offsets)) add(lastIndex + offset, 'wrong-phase');
      add(correct.charCodeAt(0) - 65 + 1, 'one-position-too-far');
      add(correct.charCodeAt(0) - 65 - 1, 'one-position-too-short');
      add(last, 'repeated-entry');
      for (const index of shuffled(Array.from({ length: 26 }, (_, i) => i))) add(index, 'other-letter');
    } else {
      const difference = last - item.sequence.at(-2);
      if (item.rules.kind === 'periodic-operations') {
        for (const phase of shuffled(item.rules.phases)) {
          add(applyOperations(last, phase), 'wrong-phase');
          if (phase.length > 1) {
            add(applyOperations(last, phase.slice(0, 1)), 'omitted-operation');
            add(applyOperations(last, [...phase].reverse()), 'reversed-composition');
          }
        }
      } else if (item.rules.kind === 'interleaved') {
        for (const lane of shuffled(item.rules.lanes)) add(applyOperations(last, lane.operations), 'wrong-lane');
      } else {
        add(last + difference - item.rules.secondDifference, 'reversed-second-difference');
        add(last + difference + 2 * item.rules.secondDifference, 'advanced-difference-twice');
      }
      add(last + difference, 'repeated-last-difference');
      add(correct + pick([-1, 1]), 'off-by-one');
      add(last, 'repeated-entry');
      for (let distance = 1; entries.length < 6 && distance < 20; distance++) {
        add(correct + distance, 'nearby-value');
        add(correct - distance, 'nearby-value');
      }
    }
    const options = shuffled(entries);
    item.options = options.map(entry => entry.value);
    item.answer = options.findIndex(entry => entry.source === 'correct');
    item.rules.distractorSources = options.map(entry => entry.source);
  }

  function auditSeries(item) {
    requireInvariant(item.sequence.length >= 5 && item.sequence.length <= 8, 'series length');
    requireInvariant(item.options.length === 6 && new Set(item.options).size === 6, 'distinct series options');
    requireInvariant(item.options[item.answer] === item.correctAnswer, 'series answer');
    requireInvariant(equal(replaySeries(item.rules, item.sequence.length + 1), [...item.sequence, item.correctAnswer]), 'series rule replay');
    const operators = item.rules.kind === 'periodic-operations'
      ? item.rules.phases.reduce((total, phase) => total + phase.length, 0)
      : item.rules.kind === 'interleaved' ? item.rules.lanes.reduce((total, lane) => total + lane.operations.length, 0)
        : item.rules.kind === 'alphabet-offsets' ? item.rules.offsets.length : 2;
    requireInvariant(item.operatorCount === operators, 'actual operator count');
  }

  function series(level, usedSet = new Set()) {
    validateArguments(level, usedSet);
    for (let attempt = 0; attempt < 4096; attempt++) {
      const candidate = seriesCandidate(level);
      if (!isSafeSeries(candidate)) continue;
      const { terms, ...item } = candidate;
      item.sequence = terms.slice(0, -1);
      item.correctAnswer = terms.at(-1);
      // Neither metadata nor shuffled choices may turn the same visible sequence into a new item.
      item.hash = `series:${C.canonical(item.sequence)}`;
      if (usedSet.has(item.hash)) continue;
      item.rules.complexity = { operatorCount: item.operatorCount, periodLength: item.periodLength, score: item.operatorCount + item.periodLength };
      seriesOptions(item);
      auditSeries(item);
      usedSet.add(item.hash);
      return item;
    }
    throw new RangeError('Unable to find an unseen series after 4096 attempts.');
  }

  C.Generators = { matrix, series };
})();

(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p, choice } = C.parameter;
  const keys = ["1","2","3","4","5","6","7","8","9","q","w","e","r","t","y","u"];
  const digits = Array.from({ length: 10 }, (_, i) => i);
  const numericScenes = () => digits.map(value => D.text(value));
  const words = () => C.t("stim.memory.words").split("|");
  const recallScore = rows => ({ ...S.span(rows), accuracy: S.accuracy(rows) });
  const recallFields = (row, expected) => {
    row.recallCorrect = row.response.filter((value, index) => value === expected[index]).length;
    row.reliabilityValue = row.recallCorrect / expected.length;
  };
  S.recognition = rows => {
    const valid = S.eligible(rows), answered = valid.filter(row => [0, 1].includes(row.response[0]));
    const hits = answered.filter(row => row.isTarget && row.response[0] === 0).length;
    const misses = answered.filter(row => row.isTarget && row.response[0] === 1).length;
    const falseAlarms = answered.filter(row => !row.isTarget && row.response[0] === 0).length;
    const correctRejections = answered.filter(row => !row.isTarget && row.response[0] === 1).length;
    return { ...C.accuracyScore(rows), hits, misses, falseAlarms, correctRejections,
      recognitionOmissions: valid.length - answered.length,
      dPrime: hits + misses && falseAlarms + correctRejections ? S.dPrime(hits, misses, falseAlarms, correctRejections) : null };
  };

  C.define("running-span", "working-memory", {
    trials: p(12, 4, 40), recallLength: p(3, 2, 8), maxRecall: p(6, 2, 8),
    minStreamLength: p(8, 4, 24), maxStreamLength: p(14, 5, 32),
    presentationMs: p(600, 200, 2000, 50), recallMs: p(15000, 3000, 60000, 1000)
  }, {
    tier: 2, primaryMetric: "partialCreditLoad", metrics: ["partialCreditLoad","span"], staircase: "stepwise",
    validateParams: q => q.recallLength > q.maxRecall || q.maxRecall >= q.minStreamLength ||
      q.minStreamLength > q.maxStreamLength ? "running.invalidRange" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", panel = C.digitRecallPanel(ctx);
      const state = ctx.state("tail-length", "stepwise", { start: q.recallLength, min: 2, max: q.maxRecall });
      const scenes = numericScenes();
      const titles = Array.from({ length: 9 }, (_, n) => D.text(C.t("stim.runningRecall", { count: C.number(n) }), 30));
      const items = Array.from({ length: practice ? 8 : q.trials }, () => {
        const length = practice ? C.rand(4, 7) : C.rand(q.minStreamLength, q.maxStreamLength);
        return Array.from({ length }, () => C.rand(0, 9));
      });
      await ctx.countdown();
      const recent = [];
      for (const stream of items) {
        const load = practice ? 2 : ctx.mode === "assessment" ? q.recallLength : Math.round(state.state.value);
        await ctx.show(titles[load], 1000);
        const onsets = [];
        for (const value of stream) {
          onsets.push(await ctx.show(scenes[value], q.presentationMs * .8));
          await ctx.show(ctx.blank, q.presentationMs * .2);
        }
        const expected = stream.slice(-load);
        const row = await ctx.trial({ scene: ctx.blank, panel, sequence: true, rtOnSubmit: true, deadline: q.recallMs,
          meta: { length: load, stream, streamLength: stream.length, expected, itemOnsets: onsets, condition: load },
          evaluate: response => response.length === load && response.every((value, i) => value === expected[i]),
          enrich: result => recallFields(result, expected) });
        recent.push(row);
        if (recent.length === 2) {
          ctx.adapt(state, { accuracy: S.mean(recent.map(t => t.reliabilityValue)), errors: recent.reduce((n, t) => n + t.length - t.recallCorrect, 0) });
          recent.length = 0;
        }
      }
      return { stimulusSet: "digits" };
    },
    score: recallScore
  });

  C.define("operation-span", "working-memory", {
    minSet: p(2, 2, 7), maxSet: p(5, 2, 8), repetitions: p(3, 1, 5),
    maxOperand: p(12, 2, 99), operations: choice(["mixed","add","multiply"]),
    processingMs: p(4000, 750, 12000, 250), calibrationFactor: p(2.5, 1.5, 4, .1),
    minProcessingAccuracy: p(.85, .5, 1, .05), memoryMs: p(800, 300, 2000, 100),
    recallMs: p(20000, 5000, 60000, 1000), distractorCount: p(3, 0, 4)
  }, {
    tier: 2, primaryMetric: "partialCreditLoad", staircase: "deadline",
    instructionVars: q => ({ criterion: C.number(q.minProcessingAccuracy * 100, 0) }),
    validateParams: q => q.minSet > q.maxSet ? "settings.rangeError" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const alphabet = C.t("stim.spanAlphabet").split("");
      const memoryScenes = new Map(alphabet.map(letter => [letter, D.text(letter)]));
      const processingPanel = ctx.prepareOptions(D.options([C.t("response.true"), C.t("response.false")], ["a","l"]));
      const practiceRTs = ctx.practiceTrials.flatMap(row => row.processing || [])
        .filter(row => row.correct && row.rtMs >= 150).map(row => row.rtMs);
      const calibrated = practiceRTs.length >= 4 ? C.clamp(S.mean(practiceRTs) * q.calibrationFactor, 750, 12000) : q.processingMs;
      const state = ctx.state("processing-deadline", "deadline", { start: calibrated, min: 750, max: 12000 });
      const sizes = practice ? Array(8).fill(2) : C.shuffle(Array.from({ length: (q.maxSet - q.minSet + 1) * q.repetitions },
        (_, i) => q.minSet + i % (q.maxSet - q.minSet + 1)));
      const items = sizes.map(length => {
        const letters = C.shuffle(alphabet).slice(0, length + q.distractorCount);
        const sequence = letters.slice(0, length), choices = C.shuffle(letters), expected = sequence.map(letter => choices.indexOf(letter));
        const processing = sequence.map(() => {
          const a = C.rand(1, q.maxOperand), b = C.rand(1, q.maxOperand), c = C.rand(1, q.maxOperand);
          const multiply = q.operations === "multiply" || q.operations === "mixed" && Math.random() < .5;
          const answer = (multiply ? a * b : a + b) + c, isTrue = Math.random() < .5;
          const proposed = isTrue ? answer : answer + C.pick([-1, 1]) * C.rand(1, 5);
          return { isTrue, expression: `(${C.number(a)} ${multiply ? "×" : "+"} ${C.number(b)}) + ${C.number(c)} = ${C.number(proposed)}` };
        });
        return { length, sequence, expected, choices,
          memories: sequence.map(letter => memoryScenes.get(letter)),
          processing: processing.map(item => ({ ...item, scene: D.text(item.expression, 34) })),
          panel: ctx.prepareOptions(D.options(choices, keys)) };
      });
      await ctx.countdown();
      for (const item of items) {
        const processing = [], memoryOnsets = [];
        const deadline = practice || ctx.mode === "assessment" ? q.processingMs : state.state.value;
        for (let i = 0; i < item.length; i++) {
          const problem = item.processing[i];
          processing.push(await ctx.trial({ scene: problem.scene, panel: processingPanel, deadline,
            answer: problem.isTrue ? 0 : 1, noRecord: true, meta: { expression: problem.expression, isTrue: problem.isTrue } }));
          memoryOnsets.push(await ctx.show(item.memories[i], q.memoryMs));
          await ctx.show(ctx.blank, 200);
        }
        await ctx.trial({ scene: ctx.blank, panel: item.panel, sequence: true, maxLength: item.length, deadline: q.recallMs,
          displayResponse: value => item.choices[value],
          meta: { length: item.length, letterSequence: item.sequence, choices: item.choices, expected: item.expected,
            processing, processingDeadlineMs: deadline, memoryOnsets, condition: item.length },
          evaluate: response => response.length === item.length && response.every((value, i) => value === item.expected[i]),
          enrich: row => recallFields(row, item.expected) });
        ctx.adapt(state, { accuracy: S.accuracy(S.exclude(processing)),
          fast: (S.median(processing.map(row => row.rtMs).filter(Number.isFinite)) ?? Infinity) < deadline * .75 });
      }
      const rows = practice ? ctx.practiceTrials : ctx.trials;
      if (!practice && (S.processingAccuracy(rows) ?? 0) < q.minProcessingAccuracy) ctx.invalidate("runner.operationProcessing");
      return { stimulusSet: "letters", processingDeadlineMs: ctx.mode === "assessment" ? q.processingMs :
        S.mean(rows.map(row => row.processingDeadlineMs)) };
    },
    score: rows => ({ ...recallScore(rows), processingAccuracy: S.processingAccuracy(rows) })
  });

  C.define("sternberg", "working-memory", {
    trials: p(48, 12, 120, 4), minSet: p(2, 1, 8), maxSet: p(6, 1, 8),
    targetShare: p(.5, .25, .75, .05), studyMs: p(1000, 250, 5000, 50),
    retentionMs: p(500, 100, 3000, 50), responseMs: p(1500, 500, 10000, 100)
  }, {
    tier: 2, primaryMetric: "accuracy", metrics: ["accuracy","meanRT"], staircase: "deadline",
    validateParams: q => q.minSet > q.maxSet ? "settings.rangeError" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", count = practice ? 8 : q.trials;
      const probeScenes = numericScenes();
      const panel = ctx.prepareOptions(D.options([C.t("response.present"), C.t("response.absent")], ["a","l"]));
      const state = ctx.state("search-deadline", "deadline", { start: q.responseMs, min: 500, max: 10000 });
      const targetFlags = C.shuffle(Array.from({ length: count }, (_, i) => i < Math.round(count * q.targetShare)));
      const conditions = C.shuffle(Array.from({ length: count }, (_, i) => ({ isTarget: targetFlags[i],
        setSize: practice ? 2 + i % 2 : q.minSet + i % (q.maxSet - q.minSet + 1) })));
      const items = conditions.map(condition => {
        const memory = C.shuffle(digits).slice(0, condition.setSize);
        const probe = C.pick(condition.isTarget ? memory : digits.filter(digit => !memory.includes(digit)));
        return { ...condition, memory, probe, study: D.text(memory.map(n => C.number(n)).join("   "), 42), scene: probeScenes[probe] };
      });
      await ctx.countdown();
      const recent = [];
      for (const item of items) {
        const deadline = practice || ctx.mode === "assessment" ? q.responseMs : state.state.value;
        const row = await ctx.trial({ phases: [{ scene: item.study, ms: q.studyMs }, { scene: ctx.blank, ms: q.retentionMs }],
          scene: item.scene, panel, deadline, answer: item.isTarget ? 0 : 1,
          meta: { isTarget: item.isTarget, setSize: item.setSize, memory: item.memory, probe: item.probe,
            deadlineMs: deadline, condition: `${item.setSize}/${item.isTarget}` } });
        recent.push(row);
        if (recent.length === 8) {
          ctx.adapt(state, { accuracy: S.accuracy(S.exclude(recent)),
            fast: (S.median(recent.map(t => t.rtMs).filter(Number.isFinite)) ?? Infinity) < deadline * .75 });
          recent.length = 0;
        }
      }
      return { stimulusSet: "digits" };
    },
    score: rows => ({ ...S.recognition(rows), meanRT: S.mean(S.eligible(rows).filter(row => row.correct).map(row => row.rtMs).filter(Number.isFinite)) })
  });

  C.define("paired-associates", "learning", {
    pairs: p(8, 3, 12), maxPairs: p(12, 3, 12), blocks: p(2, 1, 5), recognitionRepeats: p(1, 1, 3),
    studyMs: p(1800, 500, 8000, 100), retentionMs: p(1000, 0, 10000, 100), responseMs: p(4000, 750, 15000, 250)
  }, {
    tier: 2, languageDependent: true, primaryMetric: "dPrime", metrics: ["dPrime","accuracy"], staircase: "stepwise",
    validateParams: q => q.pairs > q.maxPairs ? "settings.rangeError" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", vocabulary = words();
      const state = ctx.state("pair-load", "stepwise", { start: q.pairs, min: 3, max: q.maxPairs });
      const panel = ctx.prepareOptions(D.options([C.t("response.intact"), C.t("response.recombined")], ["a","l"]));
      const studyTitle = D.text(C.t("stim.studyPairs"), 30), recognitionTitle = D.text(C.t("stim.recognizePairs"), 30);
      for (let block = 0; block < (practice ? 1 : q.blocks); block++) {
        const load = practice ? 4 : ctx.mode === "assessment" ? q.pairs : Math.round(state.state.value);
        const selected = C.shuffle(vocabulary).slice(0, load * 2);
        const pairs = Array.from({ length: load }, (_, i) => [selected[i], selected[i + load]]);
        const formatPair = pair => D.text(C.t("stim.pairFormat", { left: pair[0], right: pair[1] }), 34);
        const studies = pairs.map(formatPair), repeats = practice ? 1 : q.recognitionRepeats;
        const probes = C.shuffle(Array.from({ length: load * 2 * repeats }, (_, i) => {
          const index = i % load, isTarget = Math.floor(i / load) % 2 === 0;
          const other = (index + C.rand(1, load - 1)) % load;
          const pair = [pairs[index][0], pairs[isTarget ? index : other][1]];
          return { isTarget, pair, scene: formatPair(pair) };
        }));
        await ctx.show(studyTitle, 1200); await ctx.countdown();
        const studyOnsets = [];
        for (const scene of studies) studyOnsets.push(await ctx.show(scene, q.studyMs));
        await ctx.show(ctx.blank, q.retentionMs);
        await ctx.show(recognitionTitle, 1000);
        const recent = [];
        for (const probe of probes) recent.push(await ctx.trial({ scene: probe.scene, panel, deadline: q.responseMs,
          answer: probe.isTarget ? 0 : 1, meta: { block, pairCount: load, isTarget: probe.isTarget, pair: probe.pair, pairs,
            studyOnsets, condition: probe.isTarget ? "intact" : "recombined" } }));
        ctx.adapt(state, { accuracy: S.accuracy(S.exclude(recent)), errors: recent.filter(row => !row.correct).length });
      }
      return { stimulusSet: "words" };
    },
    score: rows => ({ ...S.recognition(rows), pairLoadMean: S.mean(S.eligible(rows).map(row => row.pairCount)) })
  });

  const parseLoci = q => q.route === "custom" ? q.customLoci.split(/\r?\n/).map(text => text.trim().normalize("NFC")).filter(Boolean) :
    C.t(`stim.loci.${q.route}`).split("|");
  C.define("method-loci", "learning", {
    trials: p(5, 2, 20), loci: p(4, 2, 12), maxLoci: p(8, 2, 12),
    route: choice(["home","walk","custom"]), customLoci: { value: "", type: "text", maxLength: 1200, rows: 5 },
    studyMs: p(2500, 750, 10000, 250), recallMs: p(25000, 5000, 90000, 1000), distractorCount: p(3, 0, 4)
  }, {
    tier: 2, languageDependent: true, primaryMetric: "partialCreditLoad", staircase: "stepwise",
    validateParams(q) {
      if (q.loci > q.maxLoci || q.maxLoci + q.distractorCount > 16) return "loci.invalidRange";
      const route = parseLoci(q);
      if (route.length < q.maxLoci || route.some(name => name.length > 60) ||
        new Set(route.map(name => name.toLocaleLowerCase(C.language))).size !== route.length) return "loci.invalidRoute";
      return null;
    },
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", route = parseLoci(q), vocabulary = words();
      const state = ctx.state("route-load", "stepwise", { start: q.loci, min: 2, max: q.maxLoci });
      const count = practice ? 8 : q.trials;
      const locusScenes = route.slice(0, q.maxLoci).map((name, i) => D.scene((g, w, h) => {
        g.font = '500 25px "Segoe UI", sans-serif'; g.fillText(`${C.number(i + 1)}. ${name}`, w / 2, h / 2, w - 24);
      }, 420, 60));
      const wordScenes = new Map(vocabulary.map(word => [word, D.text(word, 44)]));
      const banks = new Map();
      for (let load = 2; load <= (practice ? 2 : q.maxLoci); load++) {
        banks.set(load, Array.from({ length: count }, () => {
          const selected = C.shuffle(vocabulary).slice(0, load + q.distractorCount);
          const sequence = selected.slice(0, load), choices = C.shuffle(selected), expected = sequence.map(word => choices.indexOf(word));
          const scenes = sequence.map((word, i) => ({ width: 420, height: 190, layers: [
            { scene: locusScenes[i], x: 0, y: 0, width: 420, height: 60 },
            { scene: wordScenes.get(word), x: 0, y: 60, width: 420, height: 130 }
          ] }));
          return { sequence, choices, expected, scenes, panel: ctx.prepareOptions(D.options(choices, keys), "words") };
        }));
      }
      const studyTitle = D.text(C.t("stim.lociStudy"), 30);
      await ctx.countdown();
      for (let index = 0; index < count; index++) {
        const load = practice ? 2 : ctx.mode === "assessment" ? q.loci : Math.round(state.state.value);
        const item = banks.get(load).pop(), onsets = [];
        await ctx.show(studyTitle, 1000);
        for (const scene of item.scenes) onsets.push(await ctx.show(scene, practice ? Math.min(q.studyMs, 1500) : q.studyMs));
        const row = await ctx.trial({ scene: ctx.blank, panel: item.panel, sequence: true, maxLength: load, deadline: q.recallMs,
          displayResponse: value => item.choices[value],
          meta: { length: load, locusNames: route.slice(0, load), words: item.sequence, choices: item.choices,
            expected: item.expected, studyOnsets: onsets, condition: load },
          evaluate: response => response.length === load && response.every((value, i) => value === item.expected[i]),
          enrich: result => recallFields(result, item.expected) });
        ctx.adapt(state, { accuracy: row.reliabilityValue, errors: load - row.recallCorrect });
      }
      return { stimulusSet: "words" };
    },
    score: recallScore
  });
})();

(() => {
  const C = window.Cortex, S = C.Stats, { p } = C.parameter;
  S.forecasting = (entries, bins = 10) => {
    if (!Number.isInteger(bins) || bins < 2 || bins > 20) throw new Error("forecast.invalidBins");
    const resolved = entries.filter(entry => entry.status === "resolved" && [0, 1].includes(entry.outcome) &&
      Number.isFinite(entry.probability) && entry.probability >= 0 && entry.probability <= 1);
    const calibration = Array.from({ length: bins }, (_, index) => {
      const group = resolved.filter(entry => Math.min(bins - 1, Math.floor(entry.probability * bins)) === index);
      return { lower: index / bins, upper: (index + 1) / bins, count: group.length,
        meanProbability: S.mean(group.map(entry => entry.probability)),
        observedFrequency: S.mean(group.map(entry => entry.outcome)),
        meanBrier: S.mean(group.map(entry => (entry.probability - entry.outcome) ** 2)) };
    });
    return { resolved: resolved.length, meanBrier: S.mean(resolved.map(entry => (entry.probability - entry.outcome) ** 2)), calibration };
  };
  let statusFilter = "all", topicFilter = "", pageIndex = 0, draft = null;
  const text = (key, vars) => C.escape(C.t(key, vars));
  const percent = value => `${C.number(value * 100, 1)}%`;
  const dueDate = days => {
    const date = new Date(`${C.today()}T12:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const dateLabel = date => new Intl.DateTimeFormat(C.language, { dateStyle: "medium" }).format(new Date(`${date}T12:00:00`));
  function calibrationChart(stats) {
    if (!stats.resolved) return `<p class="empty">${text("forecast.emptyCalibration")}</p>`;
    const x = value => 76 + value * 476, y = value => 252 - value * 204;
    let svg = `<svg viewBox="0 0 640 330" width="640" height="330" role="img" aria-label="${text("forecast.calibration")}">`;
    for (let i = 0; i <= 5; i++) {
      const value = i / 5;
      svg += `<path d="M76 ${y(value)}H552M${x(value)} 48V252" stroke="var(--cp-border)" fill="none"/>
        <text x="64" y="${y(value) + 4}" text-anchor="end" fill="var(--cp-text-muted)" font-size="12">${C.escape(percent(value))}</text>
        <text x="${x(value)}" y="277" text-anchor="middle" fill="var(--cp-text-muted)" font-size="12">${C.escape(percent(value))}</text>`;
    }
    svg += `<path d="M76 252L552 48" stroke="var(--cp-border-strong)" stroke-dasharray="5 5" fill="none"/>`;
    const points = stats.calibration.filter(bin => bin.count);
    svg += `<polyline points="${points.map(bin => `${x(bin.meanProbability)},${y(bin.observedFrequency)}`).join(" ")}"
      stroke="var(--cp-accent)" stroke-width="2" fill="none"/>`;
    for (const bin of points) svg += `<circle cx="${x(bin.meanProbability)}" cy="${y(bin.observedFrequency)}"
      r="${Math.min(12, 3 + Math.sqrt(bin.count))}" fill="var(--cp-accent)"><title>${text("forecast.binTooltip",
        { count: C.number(bin.count), predicted: percent(bin.meanProbability), observed: percent(bin.observedFrequency) })}</title></circle>`;
    svg += `<text x="314" y="315" text-anchor="middle" fill="var(--cp-text)" font-size="13">${text("forecast.predicted")}</text>
      <text x="76" y="23" fill="var(--cp-text)" font-size="13">${text("forecast.observed")}</text></svg>`;
    return `<div class="chart-scroll">${svg}</div>`;
  }
  function exportForecasts() {
    const fields = ["id","claim","topic","probability","resolveBy","createdAt","language","status","outcome","resolvedAt","conflictOf"];
    const rows = C.Storage.getForecasts();
    const csv = "\ufeff" + [fields.map(C.csvCell).join(","), ...rows.map(row => fields.map(key => C.csvCell(row[key])).join(","))].join("\r\n");
    C.download(`cortex-forecasts-${C.iso().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
  }
  const task = {
    tier: 2, kind: "journal", supportsAssessment: false, staircase: null, languageDependent: true,
    primaryMetric: "meanBrier", startKey: "forecast.open", exposureKey: "forecast.count",
    exposureCount: () => C.Storage.getForecasts().length,
    onWipe() { draft = null; statusFilter = "all"; topicFilter = ""; pageIndex = 0; },
    renderView(container) {
      const registry = C.Tasks.find(entry => entry.id === "forecasting"), q = C.taskParams(registry);
      const entries = C.Storage.getForecasts(), topics = [...new Set(entries.map(entry => entry.topic).filter(Boolean))].sort();
      if (topicFilter && !topics.includes(topicFilter)) topicFilter = "";
      const inTopic = entries.filter(entry => !topicFilter || entry.topic === topicFilter);
      const visible = inTopic.filter(entry => statusFilter === "all" || entry.status === statusFilter);
      pageIndex = Math.min(pageIndex, Math.max(0, Math.ceil(visible.length / q.pageSize) - 1));
      const page = visible.slice(pageIndex * q.pageSize, (pageIndex + 1) * q.pageSize);
      const stats = S.forecasting(inTopic, q.calibrationBins);
      const open = inTopic.filter(entry => entry.status === "open"), conflicts = entries.filter(entry => entry.status === "conflict").length;
      container.innerHTML = `<section class="hero"><div><span class="eyebrow">${text("domain.calibration")}</span>
        <h1>${text("task.forecasting.name")}</h1><p>${text("task.forecasting.desc")}</p></div></section>
        <p class="notice">${text("forecast.journalNote")}</p>
        <div class="actions"><button id="forecast-settings">${text("settings.title")}</button>
        <button id="forecast-json">${text("data.exportJSON")}</button><button id="forecast-csv">${text("forecast.exportCSV")}</button></div>
        ${conflicts ? `<p class="warning">${text("forecast.conflictNotice", { count: C.number(conflicts) })}</p>` : ""}
        <section class="card stack"><h2>${text("forecast.new")}</h2><p class="muted">${text("forecast.immutable")}</p>
        <form id="forecast-form" class="stack">
        <label class="field">${text("forecast.claim")}<textarea name="claim" rows="3" maxlength="${q.claimMaxLength}" required>${C.escape(draft?.claim || "")}</textarea></label>
        <div class="settings-grid"><label class="field">${text("forecast.probability")}<input type="number" name="probability"
          min="0" max="100" step="0.1" value="${C.escape(draft?.probability ?? q.defaultProbability)}" required></label>
        <label class="field">${text("forecast.resolveBy")}<input type="date" name="resolveBy" min="${C.today()}" value="${C.escape(draft?.resolveBy || dueDate(q.defaultDeadlineDays))}" required></label>
        <label class="field">${text("forecast.topic")}<input name="topic" maxlength="80" value="${C.escape(draft?.topic || "")}"></label></div>
        <button type="submit" class="primary">${text("forecast.add")}</button></form><p id="forecast-status" role="status"></p></section>
        <div class="toolbar"><label class="field">${text("forecast.topic")}<select id="forecast-topic"><option value="">${text("common.all")}</option>
          ${topics.map(topic => `<option value="${C.escape(topic)}" ${topic === topicFilter ? "selected" : ""}>${C.escape(topic)}</option>`).join("")}</select></label>
        <label class="field">${text("forecast.status")}<select id="forecast-filter">${["all","open","resolved","void","conflict"].map(status =>
          `<option value="${status}" ${status === statusFilter ? "selected" : ""}>${text(status === "all" ? "common.all" : `forecast.status.${status}`)}</option>`).join("")}</select></label></div>
        <section class="card"><div class="metrics"><div class="metric"><strong>${C.number(stats.resolved)}</strong><span>${text("forecast.resolvedCount")}</span></div>
        <div class="metric"><strong>${C.number(stats.meanBrier, 4)}</strong><span>${text("forecast.brier")}</span></div>
        <div class="metric"><strong>${C.number(open.length)}</strong><span>${text("forecast.status.open")}</span></div></div>
        <h2>${text("forecast.calibration")}</h2><p class="muted">${text("forecast.calibrationNote")}</p>${calibrationChart(stats)}</section>
        <section class="card stack"><h2>${text("forecast.entries")}</h2><p class="muted">${text("forecast.pagination",
          { from: C.number(visible.length ? pageIndex * q.pageSize + 1 : 0), to: C.number(Math.min(visible.length, (pageIndex + 1) * q.pageSize)), total: C.number(visible.length) })}</p>
        <div class="table-scroll"><table class="forecast-table"><thead><tr>${["forecast.claim","forecast.probability","forecast.resolveBy","forecast.status","forecast.outcome","forecast.brier","forecast.actions"]
          .map(key => `<th>${text(key)}</th>`).join("")}</tr></thead><tbody>${page.map(entry => {
            const outcome = entry.outcome === null ? C.t("common.unknown") : C.t(entry.outcome ? "forecast.yes" : "forecast.no");
            const overdue = entry.status === "open" && entry.resolveBy < C.today();
            return `<tr><td class="forecast-claim">${C.escape(entry.claim)}${entry.topic ? `<br><small class="muted">${C.escape(entry.topic)}</small>` : ""}</td>
              <td>${C.escape(percent(entry.probability))}</td><td>${C.escape(dateLabel(entry.resolveBy))}
              ${overdue ? `<br><span class="warning">${text("forecast.overdue")}</span>` : ""}</td>
              <td>${text(`forecast.status.${entry.status}`)}</td><td>${C.escape(outcome)}</td>
              <td>${C.number(entry.status === "resolved" ? (entry.probability - entry.outcome) ** 2 : null, 4)}</td>
              <td><div class="actions">${entry.status === "open" ? `<button data-forecast-resolve="${C.escape(entry.id)}" data-outcome="1">${text("forecast.resolveYes")}</button>
              <button data-forecast-resolve="${C.escape(entry.id)}" data-outcome="0">${text("forecast.resolveNo")}</button>` : ""}
              ${entry.status === "conflict" ? `<button data-forecast-accept="${C.escape(entry.id)}">${text("forecast.acceptConflict")}</button>` : ""}
              ${entry.status !== "void" ? `<button data-forecast-void="${C.escape(entry.id)}">${text("forecast.void")}</button>` : ""}</div></td></tr>`;
          }).join("")}</tbody></table></div>${!visible.length ? `<p class="empty">${text("forecast.noEntries")}</p>` : ""}
        <div class="actions"><button id="forecast-prev" ${pageIndex === 0 ? "disabled" : ""}>${text("forecast.previous")}</button>
          <button id="forecast-next" ${(pageIndex + 1) * q.pageSize >= visible.length ? "disabled" : ""}>${text("forecast.next")}</button></div></section>`;
      const redraw = () => task.renderView(container);
      const report = (saved, key) => {
        redraw();
        document.getElementById("forecast-status").textContent = C.t(saved ? key : "data.pending");
      };
      const error = exception => {
        console.warn("Forecast action rejected:", exception);
        document.getElementById("forecast-status").textContent = C.t(
          String(exception.message).startsWith("forecast.") ? exception.message : "forecast.invalid");
      };
      document.getElementById("forecast-form").oninput = event => {
        const form = event.currentTarget;
        draft = Object.fromEntries(["claim","topic","probability","resolveBy"].map(key => [key, form.elements[key].value]));
      };
      document.getElementById("forecast-form").onsubmit = event => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        try {
          const result = C.Storage.createForecast({ claim: form.elements.claim.value, topic: form.elements.topic.value,
            probability: Number(form.elements.probability.value) / 100, resolveBy: form.elements.resolveBy.value, language: C.language });
          draft = null; statusFilter = "all"; topicFilter = ""; pageIndex = 0; report(result.saved, "forecast.saved");
        } catch (exception) { error(exception); }
      };
      document.getElementById("forecast-settings").onclick = () => C.UI.openSettings("forecasting");
      document.getElementById("forecast-json").onclick = () => C.Storage.exportAll();
      document.getElementById("forecast-csv").onclick = exportForecasts;
      document.getElementById("forecast-topic").onchange = event => { topicFilter = event.target.value; pageIndex = 0; redraw(); };
      document.getElementById("forecast-filter").onchange = event => { statusFilter = event.target.value; pageIndex = 0; redraw(); };
      document.getElementById("forecast-prev").onclick = () => { pageIndex--; redraw(); };
      document.getElementById("forecast-next").onclick = () => { pageIndex++; redraw(); };
      container.querySelectorAll("[data-forecast-resolve]").forEach(button => button.onclick = () => {
        const entry = entries.find(item => item.id === button.dataset.forecastResolve), outcome = Number(button.dataset.outcome);
        const message = C.t("forecast.confirmResolve", { claim: entry.claim, outcome: C.t(outcome ? "forecast.yes" : "forecast.no") }) +
          (entry.resolveBy > C.today() ? "\n\n" + C.t("forecast.earlyResolution") : "");
        if (!confirm(message)) return;
        try { report(C.Storage.resolveForecast(entry.id, outcome), "forecast.resolved"); } catch (exception) { error(exception); }
      });
      container.querySelectorAll("[data-forecast-void]").forEach(button => button.onclick = () => {
        if (!confirm(C.t("forecast.confirmVoid"))) return;
        try { report(C.Storage.voidForecast(button.dataset.forecastVoid), "forecast.voided"); } catch (exception) { error(exception); }
      });
      container.querySelectorAll("[data-forecast-accept]").forEach(button => button.onclick = () => {
        if (!confirm(C.t("forecast.confirmConflict"))) return;
        try { report(C.Storage.acceptForecastConflict(button.dataset.forecastAccept), "forecast.reviewed"); } catch (exception) { error(exception); }
      });
    }
  };
  C.define("forecasting", "calibration", { defaultProbability: p(50, 0, 100), defaultDeadlineDays: p(7, 0, 3650),
    calibrationBins: p(10, 2, 20), pageSize: p(25, 10, 100, 5), claimMaxLength: p(500, 100, 2000, 100) }, task);
})();

(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p } = C.parameter;
  const PRACTICE_TRIALS = 8;
  const TWO_KEYS = ["a", "l"];
  const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const SWITCH_DIGITS = [1, 2, 3, 4, 6, 7, 8, 9];
  const FIXATION_MS = 250;
  const isFiniteNumber = Number.isFinite;
  const finiteMean = values => S.mean(values.filter(isFiniteNumber));
  const response0 = row => Array.isArray(row.response) ? row.response[0] : undefined;
  const omitted = row => !Array.isArray(row.response) || row.response.length === 0;
  const normalizedRows = rows => rows.some(row => row && typeof row === "object" && "excluded" in row) ? rows : S.exclude(rows);
  const stackScenes = (top, bottom, gap = 12, width = Math.max(top.width || 420, bottom.width || 420, 420)) => ({
    width,
    height: (top.height || 0) + gap + (bottom.height || 0),
    layers: [
      { scene: top, x: (width - (top.width || width)) / 2, y: 0, width: top.width || width, height: top.height || 0 },
      { scene: bottom, x: (width - (bottom.width || width)) / 2, y: (top.height || 0) + gap,
        width: bottom.width || width, height: bottom.height || 0 }
    ]
  });
  const hashText = text => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `m${(hash >>> 0).toString(36)}`;
  };
  const allocateWeighted = (total, weights) => {
    const rows = weights.map(entry => {
      const raw = total * entry.weight;
      const count = Math.floor(raw);
      return { ...entry, raw, count, remainder: raw - count };
    });
    let remaining = total - rows.reduce((sum, row) => sum + row.count, 0);
    rows.sort((a, b) => b.remainder - a.remainder || String(a.key).localeCompare(String(b.key)));
    for (let i = 0; i < remaining; i++) rows[i % rows.length].count++;
    return Object.fromEntries(rows.map(row => [row.key, row.count]));
  };
  const shuffledFlags = (count, share) => C.shuffle(Array.from({ length: count }, (_, i) => i < Math.round(count * share)));
  const cycleValues = (count, values) => {
    const out = [];
    while (out.length < count) out.push(...C.shuffle(values));
    return out.slice(0, count);
  };
  const accuracyScore = C.accuracyScore;
  const fixedOrAdaptiveDeadline = (ctx, practice, fixed, state, remaining = Infinity) =>
    Math.min(practice || ctx.mode === "assessment" ? fixed : state.state.value, remaining);

  function drawArrow(g, w, h, direction, stop = false) {
    const sign = direction === 0 ? -1 : 1;
    g.save();
    g.strokeStyle = D.palette["task-fg"];
    g.fillStyle = D.palette["task-fg"];
    g.lineWidth = 10;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(w / 2 - sign * 110, h / 2);
    g.lineTo(w / 2 + sign * 40, h / 2);
    g.stroke();
    g.beginPath();
    g.moveTo(w / 2 + sign * 92, h / 2);
    g.lineTo(w / 2 + sign * 34, h / 2 - 38);
    g.lineTo(w / 2 + sign * 34, h / 2 + 38);
    g.closePath();
    g.fill();
    if (stop) {
      g.strokeStyle = D.palette["stim-red"];
      g.lineWidth = 8;
      g.beginPath();
      g.arc(w / 2, h / 2, 64, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(w / 2 - 45, h / 2 - 45);
      g.lineTo(w / 2 + 45, h / 2 + 45);
      g.stroke();
    }
    g.restore();
  }
  const arrowScene = (direction, stop = false) => D.scene((g, w, h) => drawArrow(g, w, h, direction, stop), 420, 160);
  const centeredTextScene = (key, size = 30, color) => D.text(C.t(key), size, color);

  const stopPlan = (count, stopShare) => {
    const directions = C.shuffle(Array.from({ length: count }, (_, i) => i < Math.ceil(count / 2) ? 0 : 1));
    const stopFlags = shuffledFlags(count, stopShare);
    return directions.map((direction, index) => ({ direction, stopTrial: stopFlags[index] }));
  };
  const axPlan = (count, axShare) => {
    const counts = allocateWeighted(count, [
      { key: "AX", weight: axShare },
      { key: "AY", weight: (1 - axShare) / 3 },
      { key: "BX", weight: (1 - axShare) / 3 },
      { key: "BY", weight: (1 - axShare) / 3 }
    ]);
    return C.shuffle(Object.entries(counts).flatMap(([condition, n]) => Array.from({ length: n }, () => condition)))
      .map(condition => ({ condition, cue: condition[0], probe: condition[1], isTarget: condition === "AX" }));
  };
  const switchRules = (count, switchProbability) => {
    if (!count) return [];
    const switches = C.shuffle(Array.from({ length: count - 1 }, (_, i) => i < Math.round((count - 1) * switchProbability)));
    const rules = [Math.random() < .5 ? "parity" : "magnitude"];
    for (const change of switches) rules.push(change ? (rules.at(-1) === "parity" ? "magnitude" : "parity") : rules.at(-1));
    return rules;
  };
  const switchAnswer = (rule, digit) => rule === "parity" ? digit % 2 ? 0 : 1 : digit < 5 ? 0 : 1;
  const ruleCondition = rule => rule === "parity" ? "parity" : "magnitude";
  const switchPracticeItems = () => {
    const rules = ["parity", "parity", "magnitude", "magnitude", "parity", "magnitude", "parity", "magnitude"];
    const digits = [1, 8, 3, 6, 7, 2, 9, 4];
    return rules.map((rule, index) => ({
      rule, digit: digits[index], previousRule: index ? rules[index - 1] : null,
      switch: index ? rules[index] !== rules[index - 1] : null, answer: switchAnswer(rule, digits[index])
    }));
  };
  const mappingCode = pairs => pairs.map(({ digit, glyphId }) => `${digit}:${glyphId}`).join("|");
  const glyphs = [
    { id: "hook", strokes: [[[.2,.2],[.75,.2],[.75,.62],[.42,.82]]], dots: [[.24,.72]] },
    { id: "fork", strokes: [[[.2,.78],[.5,.2],[.8,.78]], [[.5,.2],[.5,.84]]], dots: [[.76,.32]] },
    { id: "kite", strokes: [[[.5,.16],[.82,.46],[.5,.84],[.18,.46],[.5,.16]], [[.18,.46],[.82,.46]]], dots: [[.26,.24]] },
    { id: "step", strokes: [[[.2,.26],[.62,.26],[.62,.5],[.38,.5],[.38,.74],[.8,.74]]], dots: [[.18,.7]] },
    { id: "spear", strokes: [[[.22,.78],[.74,.26],[.54,.26],[.78,.18],[.7,.42]]], dots: [[.3,.26]] },
    { id: "arch", strokes: [[[.18,.74],[.18,.42],[.5,.18],[.82,.42],[.82,.74]], [[.34,.74],[.66,.74]]], dots: [[.72,.28]] },
    { id: "loop", strokes: [[[.3,.22],[.7,.22],[.7,.58],[.46,.58],[.46,.82],[.82,.82]]], dots: [[.24,.5]] },
    { id: "rake", strokes: [[[.24,.18],[.24,.82]], [[.24,.26],[.76,.26]], [[.24,.5],[.64,.5]], [[.24,.74],[.84,.74]]], dots: [[.76,.12]] },
    { id: "zig", strokes: [[[.18,.24],[.58,.24],[.34,.52],[.76,.52],[.42,.82]]], dots: [[.16,.7]] }
  ];
  const glyphById = new Map(glyphs.map(glyph => [glyph.id, glyph]));
  function drawGlyph(g, glyph, x, y, size, color = D.palette["task-fg"]) {
    const unit = size;
    g.save();
    g.translate(x, y);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = Math.max(2, size * .08);
    for (const stroke of glyph.strokes) {
      g.beginPath();
      stroke.forEach(([px, py], index) => {
        const xx = (px - .5) * unit;
        const yy = (py - .5) * unit;
        if (!index) g.moveTo(xx, yy);
        else g.lineTo(xx, yy);
      });
      g.stroke();
    }
    for (const [px, py] of glyph.dots || []) {
      g.beginPath();
      g.arc((px - .5) * unit, (py - .5) * unit, Math.max(3, unit * .06), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  const makeDigitSymbolMapping = () => {
    const glyphOrder = C.shuffle(glyphs.map(glyph => glyph.id));
    const pairs = DIGITS.map((digit, index) => ({ digit, glyphId: glyphOrder[index] }));
    const code = mappingCode(pairs);
    return {
      pairs,
      code,
      hash: hashText(code),
      digitToGlyph: new Map(pairs.map(pair => [pair.digit, glyphById.get(pair.glyphId)]))
    };
  };
  const digitSymbolLookupScene = mapping => D.scene((g, w, h) => {
    g.fillStyle = D.palette["task-fg"];
    g.font = '600 22px "Segoe UI", Aptos, Calibri, sans-serif';
    g.fillText(C.t("stim.digitSymbol.lookup"), w / 2, 18, w - 24);
    const top = 34, cell = 112, startX = (w - cell * 3) / 2;
    mapping.pairs.forEach((pair, index) => {
      const col = index % 3, row = Math.floor(index / 3);
      const x = startX + col * cell, y = top + row * 54;
      g.fillStyle = D.palette["task-panel"];
      g.strokeStyle = D.palette["stim-gray"];
      g.lineWidth = 1.5;
      g.fillRect(x + 3, y + 3, cell - 6, 48);
      g.strokeRect(x + 3, y + 3, cell - 6, 48);
      g.fillStyle = D.palette["task-fg"];
      g.font = '600 16px "Segoe UI", Aptos, Calibri, sans-serif';
      g.fillText(C.number(pair.digit, 0), x + 22, y + 24);
      drawGlyph(g, glyphById.get(pair.glyphId), x + 72, y + 26, 34);
    });
  }, 420, 205);
  const digitSymbolTargetScene = (mapping, digit) => D.scene((g, w, h) => {
    g.fillStyle = D.palette["task-fg"];
    g.font = '600 22px "Segoe UI", Aptos, Calibri, sans-serif';
    g.fillText(C.t("stim.digitSymbol.target"), w / 2, 20, w - 24);
    g.strokeStyle = D.palette["stim-blue"];
    g.lineWidth = 2;
    g.strokeRect(w / 2 - 70, 36, 140, 88);
    drawGlyph(g, mapping.digitToGlyph.get(digit), w / 2, 82, 78, D.palette["stim-blue"]);
  }, 420, 132);

  S.ssrt = (rows, params = {}) => {
    const valid = S.eligible(normalizedRows(rows));
    const go = valid.filter(row => !row.stopTrial);
    const stop = valid.filter(row => row.stopTrial);
    const goOmissions = go.filter(row => !isFiniteNumber(row.rtMs)).length;
    const goAccuracy = go.length ? go.filter(row => row.correct).length / go.length : null;
    const stopAccuracy = stop.length ? stop.filter(row => omitted(row)).length / stop.length : null;
    const stopResponseRate = stop.length ? stop.filter(row => !omitted(row)).length / stop.length : null;
    const goMeanRT = finiteMean(go.filter(row => row.correct).map(row => row.rtMs));
    const failedStopMeanRT = finiteMean(stop.filter(row => !omitted(row)).map(row => row.rtMs));
    const meanSSD = stop.length && stop.every(row => isFiniteNumber(row.actualSsdMs)) ?
      finiteMean(stop.map(row => row.actualSsdMs)) : null;
    let ssrt = null;
    let reasonKey = null;
    if (go.length < 20) reasonKey = "score.ssrtReason.minGo";
    else if (stop.length < 8) reasonKey = "score.ssrtReason.minStop";
    else if (goOmissions / go.length > .25) reasonKey = "score.ssrtReason.goOmissions";
    else if (!(stopResponseRate >= .25 && stopResponseRate <= .75)) reasonKey = "score.ssrtReason.stopRate";
    else if (!isFiniteNumber(goMeanRT) || !isFiniteNumber(failedStopMeanRT) || failedStopMeanRT >= goMeanRT) {
      reasonKey = "score.ssrtReason.race";
    } else if (!isFiniteNumber(meanSSD)) reasonKey = "score.ssrtReason.ssd";
    else {
      const goDistribution = go.map(row => isFiniteNumber(row.rtMs) ? row.rtMs :
        isFiniteNumber(row.deadlineMs) ? row.deadlineMs : params.responseMs).filter(isFiniteNumber).sort((a, b) => a - b);
      if (goDistribution.length !== go.length) reasonKey = "score.ssrtReason.distribution";
      else {
        const quantileIndex = C.clamp(Math.ceil(stopResponseRate * goDistribution.length) - 1, 0, goDistribution.length - 1);
        ssrt = goDistribution[quantileIndex] - meanSSD;
        if (!(ssrt > 0)) {
          ssrt = null;
          reasonKey = "score.ssrtReason.nonpositive";
        }
      }
    }
    return {
      ssrt,
      ssrtEstimable: Number(ssrt !== null),
      ssrtReasonKey: reasonKey,
      goAccuracy,
      stopAccuracy,
      stopResponseRate,
      meanSSD,
      goOmissions,
      meanGoRT: goMeanRT,
      failedStopMeanRT
    };
  };

  C.Tier2Attention = {
    PRACTICE_TRIALS,
    stopPlan,
    axPlan,
    switchRules,
    switchPracticeItems,
    switchAnswer,
    makeDigitSymbolMapping,
    mappingCode,
    hashText
  };

  C.define("stop-signal", "attention", {
    trials: p(64, 32, 240, 4),
    stopProbability: p(.25, .1, .5, .05),
    responseMs: p(1000, 300, 2500, 50),
    itiMs: p(800, 100, 3000, 50),
    ssdStartMs: p(250, 50, 900, 25),
    ssdMinMs: p(50, 0, 900, 25),
    ssdMaxMs: p(450, 100, 950, 25),
    ssdStepMs: p(50, 25, 200, 25)
  }, {
    tier: 2, primaryMetric: "ssrt",
    metrics: ["ssrt", "goAccuracy", "stopAccuracy", "stopResponseRate", "meanSSD", "accuracy"],
    staircase: "stopDelay",
    validateParams(q) {
      const cappedMax = Math.min(q.ssdMaxMs, q.responseMs - 25);
      return q.ssdMinMs > q.ssdStartMs || q.ssdStartMs > q.ssdMaxMs || cappedMax <= q.ssdMinMs || q.ssdMaxMs >= q.responseMs ?
        "stopSignal.invalidSsdRange" : null;
    },
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const title = centeredTextScene("stim.stopSignal.block");
      const fixation = D.text("+", 34);
      const panel = ctx.prepareOptions(D.options([C.t("response.left"), C.t("response.right")], TWO_KEYS));
      const goScenes = [arrowScene(0, false), arrowScene(1, false)];
      const stopScenes = [arrowScene(0, true), arrowScene(1, true)];
      const state = ctx.state("ssd", "stopDelay", {
        start: q.ssdStartMs,
        min: q.ssdMinMs,
        max: Math.min(q.ssdMaxMs, q.responseMs - 25),
        step: q.ssdStepMs
      });
      const items = practice ? stopPlan(PRACTICE_TRIALS, .25) : stopPlan(q.trials, q.stopProbability);
      await ctx.show(title, 1200);
      await ctx.countdown();
      for (const item of items) {
        const requestedSsdMs = item.stopTrial ? C.clamp(practice || ctx.mode === "assessment" ? q.ssdStartMs : state.state.value,
          q.ssdMinMs, Math.min(q.ssdMaxMs, q.responseMs - 25)) : null;
        const row = await ctx.trial({
          phases: [{ scene: fixation, ms: FIXATION_MS }],
          scene: goScenes[item.direction],
          panel,
          deadline: q.responseMs,
          waitFullWindow: !!item.stopTrial,
          meta: {
            condition: `${item.stopTrial ? "stop" : "go"}-${item.direction ? "right" : "left"}`,
            stopTrial: item.stopTrial,
            direction: item.direction,
            requestedSsdMs,
            deadlineMs: q.responseMs
          },
          answer: item.direction,
          evaluate: response => item.stopTrial ? response.length === 0 : response[0] === item.direction,
          onset: trial => { trial.goOnset = trial.responseWindowOnset; },
          timeline: item.stopTrial ? [{
            atMs: requestedSsdMs,
            scene: stopScenes[item.direction],
            onset: (trial, actualFrameTime) => {
              trial.stopSignalOnset = actualFrameTime;
              trial.actualSsdMs = actualFrameTime - trial.responseWindowOnset;
            }
          }] : [],
          enrich: trial => {
            trial.stopSuccess = item.stopTrial && omitted(trial);
            trial.failedStopRtMs = item.stopTrial && !omitted(trial) ? trial.rtMs : null;
            trial.goOmission = !item.stopTrial && !isFiniteNumber(trial.rtMs);
          }
        });
        if (item.stopTrial && !practice && ctx.mode === "training" && !(isFiniteNumber(row.rtMs) && row.rtMs < 150)) {
          ctx.adapt(state, { correct: row.stopSuccess });
        }
        if (q.itiMs > 0) await ctx.show(ctx.blank, q.itiMs);
      }
      return {};
    },
    score(rows, q) {
      return { ...accuracyScore(rows), ...S.ssrt(rows, q) };
    }
  });

  C.define("ax-cpt", "attention", {
    trials: p(80, 40, 240, 4),
    axShare: p(.7, .4, .9, .05),
    cueDurationMs: p(500, 200, 2000, 50),
    cueProbeDelayMs: p(900, 200, 3000, 50),
    probeDurationMs: p(250, 50, 1200, 25),
    responseMs: p(1500, 400, 5000, 50),
    itiMs: p(600, 100, 3000, 50)
  }, {
    tier: 2, primaryMetric: "dPrime",
    metrics: ["dPrime", "accuracy", "ayErrorRate", "bxErrorRate", "meanRT"],
    staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const state = ctx.state("probe-deadline", "deadline", { start: q.responseMs, min: 400, max: 5000 });
      const title = centeredTextScene("stim.axCpt.block");
      const panel = ctx.prepareOptions(D.options([C.t("response.target"), C.t("response.nonTarget")], TWO_KEYS));
      const cueScenes = {
        A: D.text(C.t("stim.axCpt.cueA"), 66, D.palette["stim-blue"]),
        B: D.text(C.t("stim.axCpt.cueB"), 66, D.palette["stim-blue"])
      };
      const probeScenes = {
        X: D.text(C.t("stim.axCpt.probeX"), 74, D.palette["stim-green"]),
        Y: D.text(C.t("stim.axCpt.probeY"), 74, D.palette["stim-yellow"])
      };
      const items = practice ? C.shuffle(["AX", "AY", "BX", "BY", "AX", "AY", "BX", "BY"])
        .map(condition => ({ condition, cue: condition[0], probe: condition[1], isTarget: condition === "AX" }))
        : axPlan(q.trials, q.axShare);
      await ctx.show(title, 1200);
      await ctx.countdown();
      const recent = [];
      for (const item of items) {
        const deadline = fixedOrAdaptiveDeadline(ctx, practice, q.responseMs, state);
        const row = await ctx.trial({
          phases: [{ scene: cueScenes[item.cue], ms: q.cueDurationMs }, { scene: ctx.blank, ms: q.cueProbeDelayMs }],
          scene: probeScenes[item.probe],
          panel,
          visibleMs: q.probeDurationMs,
          deadline,
          answer: item.isTarget ? 0 : 1,
          meta: {
            condition: item.condition,
            cue: item.cue,
            probe: item.probe,
            isTarget: item.isTarget,
            deadlineMs: deadline
          }
        });
        recent.push(row);
        if (!practice && ctx.mode === "training" && recent.length === 10) {
          ctx.adapt(state, {
            accuracy: S.accuracy(S.exclude(recent)),
            fast: (S.median(recent.map(entry => entry.rtMs).filter(isFiniteNumber)) ?? Infinity) < deadline * .75
          });
          recent.length = 0;
        }
        if (q.itiMs > 0) await ctx.show(ctx.blank, q.itiMs);
      }
      return { stimulusSet: "letters" };
    },
    score(rows) {
      const valid = S.eligible(rows);
      const hits = valid.filter(row => row.isTarget && response0(row) === 0).length;
      const misses = valid.filter(row => row.isTarget && response0(row) !== 0).length;
      const falseAlarms = valid.filter(row => !row.isTarget && response0(row) === 0).length;
      const correctRejections = valid.filter(row => !row.isTarget && response0(row) === 1).length;
      const ay = valid.filter(row => row.condition === "AY");
      const bx = valid.filter(row => row.condition === "BX");
      return {
        ...accuracyScore(rows),
        hits,
        misses,
        falseAlarms,
        correctRejections,
        omissions: valid.filter(omitted).length,
        nonTargetOmissions: valid.filter(row => !row.isTarget && omitted(row)).length,
        ayErrors: ay.filter(row => !row.correct).length,
        bxErrors: bx.filter(row => !row.correct).length,
        ayErrorRate: ay.length ? ay.filter(row => !row.correct).length / ay.length : null,
        bxErrorRate: bx.length ? bx.filter(row => !row.correct).length / bx.length : null,
        dPrime: hits + misses && falseAlarms + correctRejections ? S.dPrime(hits, misses, falseAlarms, correctRejections) : null,
        meanRT: finiteMean(valid.filter(row => row.correct).map(row => row.rtMs))
      };
    }
  });

  C.define("task-switching", "attention", {
    blocks: p(2, 1, 6),
    trialsPerBlock: p(40, 16, 80, 4),
    switchProbability: p(.35, .1, .9, .05),
    cueTargetIntervalMs: p(800, 200, 2500, 50),
    responseMs: p(1800, 500, 5000, 50),
    itiMs: p(500, 100, 2500, 50)
  }, {
    tier: 2, languageDependent: true, primaryMetric: "accuracy",
    metrics: ["accuracy", "switchAccuracy", "repeatAccuracy", "meanRT"],
    staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const title = centeredTextScene("stim.taskSwitching.block");
      const state = ctx.state("switch-deadline", "deadline", { start: q.responseMs, min: 500, max: 5000 });
      const panels = {
        parity: ctx.prepareOptions(D.options([C.t("response.odd"), C.t("response.even")], TWO_KEYS)),
        magnitude: ctx.prepareOptions(D.options([C.t("response.low"), C.t("response.high")], TWO_KEYS))
      };
      const cueScenes = {
        parity: D.scene((g, w, h) => {
          g.fillStyle = D.palette["stim-blue"];
          g.font = '600 34px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.parityCue"), w / 2, 46, w - 24);
          g.fillStyle = D.palette["task-fg"];
          g.font = '500 20px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.parityLegend"), w / 2, 100, w - 30);
        }, 420, 145),
        magnitude: D.scene((g, w, h) => {
          g.fillStyle = D.palette["stim-yellow"];
          g.font = '600 34px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.magnitudeCue"), w / 2, 46, w - 24);
          g.fillStyle = D.palette["task-fg"];
          g.font = '500 20px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.magnitudeLegend"), w / 2, 100, w - 30);
        }, 420, 145)
      };
      const digitScenes = new Map();
      const itemScene = (rule, digit) => {
        const key = `${rule}:${digit}`;
        if (!digitScenes.has(key)) digitScenes.set(key, D.scene((g, w, h) => {
          g.fillStyle = D.palette[rule === "parity" ? "stim-blue" : "stim-yellow"];
          g.font = '600 26px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t(rule === "parity" ? "stim.taskSwitching.parityCue" : "stim.taskSwitching.magnitudeCue"), w / 2, 30, w - 24);
          g.fillStyle = D.palette["task-fg"];
          g.font = '600 74px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.number(digit, 0), w / 2, 102, w - 24);
        }, 420, 150));
        return digitScenes.get(key);
      };
      const blocks = practice ? 1 : q.blocks;
      const recent = [];
      for (let block = 0; block < blocks; block++) {
        const items = practice ? switchPracticeItems() : (() => {
          const rules = switchRules(q.trialsPerBlock, q.switchProbability);
          const digits = cycleValues(q.trialsPerBlock, SWITCH_DIGITS);
          return rules.map((rule, index) => ({
            rule,
            digit: digits[index],
            previousRule: index ? rules[index - 1] : null,
            switch: index ? rules[index] !== rules[index - 1] : null,
            answer: switchAnswer(rule, digits[index])
          }));
        })();
        const prepared = items.map(item => ({
          ...item,
          cueScene: cueScenes[item.rule],
          panel: panels[item.rule],
          scene: itemScene(item.rule, item.digit)
        }));
        await ctx.show(title, 1000);
        await ctx.countdown();
        for (const item of prepared) {
          const deadline = fixedOrAdaptiveDeadline(ctx, practice, q.responseMs, state);
          const row = await ctx.trial({
            phases: [{ scene: item.cueScene, ms: q.cueTargetIntervalMs }],
            scene: item.scene,
            panel: item.panel,
            deadline,
            answer: item.answer,
            meta: {
              block,
              digit: item.digit,
              rule: item.rule,
              previousRule: item.previousRule,
              switch: item.switch,
              condition: `${ruleCondition(item.rule)}-${item.switch === null ? "first" : item.switch ? "switch" : "repeat"}`,
              deadlineMs: deadline
            }
          });
          recent.push(row);
          if (!practice && ctx.mode === "training" && recent.length === 10) {
            ctx.adapt(state, {
              accuracy: S.accuracy(S.exclude(recent)),
              fast: (S.median(recent.map(entry => entry.rtMs).filter(isFiniteNumber)) ?? Infinity) < deadline * .75
            });
            recent.length = 0;
          }
          if (q.itiMs > 0) await ctx.show(ctx.blank, q.itiMs);
        }
      }
      return { stimulusSet: "mixed" };
    },
    score(rows) {
      const valid = S.eligible(rows);
      const switches = valid.filter(row => row.switch === true);
      const repeats = valid.filter(row => row.switch === false);
      const parity = valid.filter(row => row.rule === "parity");
      const magnitude = valid.filter(row => row.rule === "magnitude");
      return {
        ...accuracyScore(rows),
        switchAccuracy: S.mean(switches.map(row => Number(row.correct))),
        repeatAccuracy: S.mean(repeats.map(row => Number(row.correct))),
        parityAccuracy: S.mean(parity.map(row => Number(row.correct))),
        magnitudeAccuracy: S.mean(magnitude.map(row => Number(row.correct))),
        meanRT: finiteMean(valid.filter(row => row.correct).map(row => row.rtMs))
      };
    }
  });

  C.define("digit-symbol", "processing-speed", {
    durationSeconds: p(90, 30, 240, 5),
    deadlineMs: p(2000, 400, 5000, 50)
  }, {
    tier: 2, primaryMetric: "correctPerMinute",
    metrics: ["correctPerMinute", "accuracy", "meanRT"],
    staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const title = centeredTextScene("stim.digitSymbol.block");
      const panel = ctx.prepareOptions(DIGITS.map(digit => ({ value: digit, label: C.number(digit, 0), key: String(digit) })));
      const state = ctx.state("symbol-deadline", "deadline", { start: q.deadlineMs, min: 400, max: 5000 });
      const mapping = makeDigitSymbolMapping();
      const lookup = digitSymbolLookupScene(mapping);
      const targetScenes = Object.fromEntries(DIGITS.map(digit => [digit, digitSymbolTargetScene(mapping, digit)]));
      const fullScenes = Object.fromEntries(DIGITS.map(digit => [digit, stackScenes(lookup, targetScenes[digit])]));
      const recent = [];
      await ctx.show(title, 1200);
      await ctx.countdown();
      if (practice) {
        const practiceDigits = C.shuffle(DIGITS).slice(0, PRACTICE_TRIALS);
        for (const digit of practiceDigits) {
          const row = await ctx.trial({
            scene: fullScenes[digit],
            panel,
            deadline: q.deadlineMs,
            answer: digit,
            noFeedback: true,
            meta: {
              digit,
              glyphId: mapping.digitToGlyph.get(digit).id,
              mappingCode: mapping.code,
              mappingHash: mapping.hash,
              condition: `digit-${digit}`,
              deadlineMs: q.deadlineMs
            }
          });
          const feedbackMs = 150;
          if (feedbackMs > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackMs);
        }
      } else {
        const plannedDigits = cycleValues(90, DIGITS);
        const start = C.now();
        let index = 0;
        while (true) {
          const remaining = q.durationSeconds * 1000 - (C.now() - start);
          if (remaining <= 0) break;
          const digit = plannedDigits[index++ % plannedDigits.length];
          const deadline = fixedOrAdaptiveDeadline(ctx, false, q.deadlineMs, state, remaining);
          const row = await ctx.trial({
            scene: fullScenes[digit],
            panel,
            deadline,
            answer: digit,
            noFeedback: true,
            meta: {
              digit,
              glyphId: mapping.digitToGlyph.get(digit).id,
              mappingCode: mapping.code,
              mappingHash: mapping.hash,
              condition: `digit-${digit}`,
              deadlineMs: deadline
            }
          });
          recent.push(row);
          if (ctx.mode === "training" && recent.length === 10) {
            ctx.adapt(state, {
              accuracy: S.accuracy(S.exclude(recent)),
              fast: (S.median(recent.map(entry => entry.rtMs).filter(isFiniteNumber)) ?? Infinity) < deadline * .75
            });
            recent.length = 0;
          }
          if (ctx.mode === "training") {
            const feedbackMs = Math.min(150, Math.max(0, q.durationSeconds * 1000 - (C.now() - start)));
            if (feedbackMs > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackMs);
          }
        }
      }
      return { stimulusSet: "symbols" };
    },
    score(rows, q) {
      const valid = S.eligible(rows);
      return {
        ...accuracyScore(rows),
        correctPerMinute: valid.filter(row => row.correct).length * 60 / q.durationSeconds,
        meanRT: finiteMean(valid.filter(row => row.correct).map(row => row.rtMs))
      };
    }
  });
})();

(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p } = C.parameter;
  const PRACTICE_TRIALS = 8;
  const IS_FINITE = Number.isFinite;
  const asRows = rows => rows.some(row => row && typeof row === "object" && "excluded" in row) ? rows : S.exclude(rows);
  const meanFinite = values => S.mean(values.filter(IS_FINITE));
  const cloneCells = cells => cells.map(([x, y, z]) => [x, y, z]);
  const cloneState = state => state.map(peg => peg.slice());
  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const shuffle = (values, rng = Math.random) => {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const pick = (values, rng = Math.random) => values[Math.floor(rng() * values.length)];
  const normalizeRows = rows => asRows(rows);

  function makeCanvas(width, height, paint, opaque = false) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");
    if (opaque) {
      g.fillStyle = D.palette["task-bg"];
      g.fillRect(0, 0, width, height);
    }
    paint(g, width, height);
    return canvas;
  }

  function permutationParity(perm) {
    let inversions = 0;
    for (let i = 0; i < perm.length; i++) {
      for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) inversions++;
    }
    return inversions % 2 ? -1 : 1;
  }

  const permutations = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2],
    [1, 2, 0], [2, 0, 1], [2, 1, 0]
  ];
  const signTriples = [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1]
  ];

  const rotations = [];
  for (const perm of permutations) {
    const parity = permutationParity(perm);
    for (const signs of signTriples) {
      if (parity * signs[0] * signs[1] * signs[2] !== 1) continue;
      const matrix = Array.from({ length: 3 }, () => [0, 0, 0]);
      for (let row = 0; row < 3; row++) matrix[row][perm[row]] = signs[row];
      rotations.push(matrix);
    }
  }

  const matrixId = matrix => matrix.flat().join(",");
  const uniqueRotationIds = new Set(rotations.map(matrixId));
  if (rotations.length !== 24 || uniqueRotationIds.size !== 24) throw new Error("Rotation group generation failed");

  const transpose = matrix => [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]]
  ];
  const multiplyMatrix = (a, b) => Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => a[row][0] * b[0][col] + a[row][1] * b[1][col] + a[row][2] * b[2][col]));
  const applyMatrix = (matrix, [x, y, z]) => [
    matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z,
    matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z,
    matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z
  ];
  const pointKey = ([x, y, z]) => `${x},${y},${z}`;
  const comparePoints = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const normalizeCellsInternal = cells => {
    const mins = [0, 1, 2].map(axis => Math.min(...cells.map(cell => cell[axis])));
    return cells.map(([x, y, z]) => [x - mins[0], y - mins[1], z - mins[2]]).sort(comparePoints);
  };
  const serializeCells = cells => normalizeCellsInternal(cells).map(pointKey).join(";");
  const rotateCells = (cells, matrix) => normalizeCellsInternal(cells.map(cell => applyMatrix(matrix, cell)));
  const extents = cells => [0, 1, 2].map(axis => Math.max(...cells.map(cell => cell[axis])) - Math.min(...cells.map(cell => cell[axis])) + 1);
  const reflectCells = cells => cells.map(([x, y, z]) => [-x, y, z]);
  const canonicalCells = cells => {
    let best = null;
    for (const matrix of rotations) {
      const key = serializeCells(cells.map(cell => applyMatrix(matrix, cell)));
      if (best === null || key < best) best = key;
    }
    return best;
  };
  const connectedCells = cells => {
    const keys = new Set(cells.map(pointKey));
    const queue = [cells[0]];
    const seen = new Set([pointKey(cells[0])]);
    const deltas = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y, z] = queue[i];
      for (const [dx, dy, dz] of deltas) {
        const next = `${x + dx},${y + dy},${z + dz}`;
        if (keys.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next.split(",").map(Number));
        }
      }
    }
    return seen.size === cells.length;
  };
  const degreeHistogram = cells => {
    const set = new Set(cells.map(pointKey));
    const deltas = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    return cells.map(([x, y, z]) => deltas.filter(([dx, dy, dz]) => set.has(`${x + dx},${y + dy},${z + dz}`)).length);
  };
  const rotationAngleDeg = matrix => {
    const trace = matrix[0][0] + matrix[1][1] + matrix[2][2];
    if (trace === 3) return 0;
    if (trace === 1) return 90;
    if (trace === 0) return 120;
    return 180;
  };
  const projectVertex = ([x, y, z]) => ({
    x: (x - y) * Math.sqrt(3) / 2,
    y: (x + y) * .5 - z
  });
  const visibleFaces = cells => {
    const set = new Set(cells.map(pointKey));
    const faces = [];
    const faceDefs = [
      {
        type: "x",
        offset: [1, 0, 0],
        corners: ([x, y, z]) => [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]],
        order: 1
      },
      {
        type: "y",
        offset: [0, 1, 0],
        corners: ([x, y, z]) => [[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
        order: 2
      },
      {
        type: "z",
        offset: [0, 0, 1],
        corners: ([x, y, z]) => [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
        order: 3
      }
    ];
    for (const cell of cells) {
      const [x, y, z] = cell;
      for (const face of faceDefs) {
        const neighbor = `${x + face.offset[0]},${y + face.offset[1]},${z + face.offset[2]}`;
        if (set.has(neighbor)) continue;
        faces.push({
          type: face.type,
          depth: x + y + z + face.order * .01,
          vertices: face.corners(cell).map(projectVertex)
        });
      }
    }
    faces.sort((a, b) => a.depth - b.depth);
    return faces;
  };
  const round3 = value => Math.round(value * 1000) / 1000;
  const projectionSignature = cells => visibleFaces(cells).map(face =>
    `${face.type}:${face.vertices.map(vertex => `${round3(vertex.x)},${round3(vertex.y)}`).join("|")}`).join(";");
  const orientationKeys = cells => rotations.map(matrix => serializeCells(cells.map(cell => applyMatrix(matrix, cell))));
  const projectionKeys = cells => rotations.map(matrix => projectionSignature(rotateCells(cells, matrix)));
  const baseFigures = [
    [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 0, 1]],
    [[0, 0, 1], [0, 1, 1], [1, 0, 0], [1, 0, 1]]
  ];
  const summarizeFigure = cells => {
    const normalized = normalizeCellsInternal(cells);
    const reflected = reflectCells(normalized);
    return {
      cells: normalized,
      canonical: canonicalCells(normalized),
      reflectedCanonical: canonicalCells(reflected),
      extents: extents(normalized),
      orientationCount: new Set(orientationKeys(normalized)).size,
      projectionCount: new Set(projectionKeys(normalized)).size
    };
  };

  function randomFigure(blockCount, rng = Math.random, maxAttempts = 4096) {
    if (!Number.isInteger(blockCount) || blockCount < 4 || blockCount > 10) {
      throw new RangeError("Rotation figures require 4 to 10 blocks");
    }
    const deltas = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    if (blockCount === 4) {
      const seedRotation = rotations[Math.floor(rng() * rotations.length)];
      const seeded = baseFigures[Math.floor(rng() * baseFigures.length)]
        .map(cell => applyMatrix(seedRotation, cell));
      return summarizeFigure(seeded);
    }
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const seedRotation = rotations[Math.floor(rng() * rotations.length)];
      const seed = normalizeCellsInternal(baseFigures[Math.floor(rng() * baseFigures.length)]
        .map(cell => applyMatrix(seedRotation, cell)));
      const cells = cloneCells(seed);
      const occupied = new Set(cells.map(pointKey));
      while (cells.length < blockCount) {
        const frontier = [];
        const frontierKeys = new Set();
        for (const [x, y, z] of cells) for (const [dx, dy, dz] of deltas) {
          const candidate = [x + dx, y + dy, z + dz];
          const key = pointKey(candidate);
          if (occupied.has(key) || frontierKeys.has(key)) continue;
          frontierKeys.add(key);
          const trial = cells.concat([candidate]);
          const dims = extents(trial).filter(size => size > 1).length;
          const centered = Math.abs(candidate[0]) + Math.abs(candidate[1]) + Math.abs(candidate[2]);
          frontier.push({ candidate, weight: 1 + dims * 2 + Math.max(0, 4 - centered) * .2 + rng() });
        }
        const total = frontier.reduce((sum, entry) => sum + entry.weight, 0);
        let cursor = rng() * total;
        let chosen = frontier[0].candidate;
        for (const entry of frontier) {
          cursor -= entry.weight;
          if (cursor <= 0) { chosen = entry.candidate; break; }
        }
        cells.push(chosen);
        occupied.add(pointKey(chosen));
      }
      const normalized = normalizeCellsInternal(cells);
      const sizes = extents(normalized);
      if (sizes.some(size => size < 2) || !connectedCells(normalized)) continue;
      const reflected = reflectCells(normalized);
      if (canonicalCells(normalized) === canonicalCells(reflected)) continue;
      const degrees = degreeHistogram(normalized);
      if (Math.max(...degrees) < 3 || degrees.filter(value => value === 1).length < 2) continue;
      const oriented = new Set(orientationKeys(normalized));
      const projected = new Set(projectionKeys(normalized));
      if (oriented.size < 12 || projected.size < 8) continue;
      return summarizeFigure(normalized);
    }
    throw new RangeError(`Unable to generate an asymmetric ${blockCount}-block figure`);
  }

  const rotationPairCache = new Map();
  const rotationPairsByAngle = angle => {
    if (!rotationPairCache.has(angle)) {
      const pairs = [];
      for (let i = 0; i < rotations.length; i++) {
        for (let j = 0; j < rotations.length; j++) {
          const relative = multiplyMatrix(transpose(rotations[i]), rotations[j]);
          if (rotationAngleDeg(relative) === angle) pairs.push([i, j]);
        }
      }
      rotationPairCache.set(angle, pairs);
    }
    return rotationPairCache.get(angle);
  };
  const allowedAngles = (minAngle, maxAngle) => [90, 120, 180].filter(angle => angle >= minAngle && angle <= maxAngle);

  function generateRotationPair({ blockCount, same, angleDeg, rng = Math.random, maxAttempts = 1024 }) {
    const pairs = rotationPairsByAngle(angleDeg);
    if (!pairs.length) throw new RangeError(`Unsupported mental-rotation angle ${angleDeg}`);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const figure = randomFigure(blockCount, rng);
      const originalProjectionSet = new Set(projectionKeys(figure.cells));
      const [leftIndex, rightIndex] = pick(pairs, rng);
      const leftCells = rotateCells(figure.cells, rotations[leftIndex]);
      const rightSource = same ? figure.cells : reflectCells(figure.cells);
      const rightCells = rotateCells(rightSource, rotations[rightIndex]);
      const leftProjection = projectionSignature(leftCells);
      const rightProjection = projectionSignature(rightCells);
      if (leftProjection === rightProjection) continue;
      if (!same && originalProjectionSet.has(rightProjection)) continue;
      return {
        blockCount,
        same,
        answer: same ? 0 : 1,
        angleDeg,
        cells: figure.cells,
        mirroredCells: normalizeCellsInternal(reflectCells(figure.cells)),
        canonical: figure.canonical,
        leftRotationIndex: leftIndex,
        rightRotationIndex: rightIndex,
        leftRotation: rotations[leftIndex],
        rightRotation: rotations[rightIndex],
        leftCells,
        rightCells,
        leftProjection,
        rightProjection
      };
    }
    throw new RangeError("Unable to generate a discriminable mental-rotation pair");
  }

  function renderRotationFigure(cells, resolution) {
    const width = Math.ceil(330 * resolution), height = Math.ceil(280 * resolution);
    const faces = visibleFaces(cells);
    const vertices = faces.flatMap(face => face.vertices);
    const minX = Math.min(...vertices.map(vertex => vertex.x));
    const maxX = Math.max(...vertices.map(vertex => vertex.x));
    const minY = Math.min(...vertices.map(vertex => vertex.y));
    const maxY = Math.max(...vertices.map(vertex => vertex.y));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((width - 36 * resolution) / spanX, (height - 36 * resolution) / spanY);
    const offsetX = (width - spanX * scale) / 2 - minX * scale;
    const offsetY = (height - spanY * scale) / 2 - minY * scale;
    const fills = {
      x: D.palette["stim-blue"],
      y: D.palette["stim-gray"],
      z: D.palette["stim-yellow"]
    };
    return makeCanvas(width, height, g => {
      g.lineJoin = "round";
      g.lineCap = "round";
      g.lineWidth = 1.5 * resolution;
      for (const face of faces) {
        g.beginPath();
        face.vertices.forEach((vertex, index) => {
          const x = vertex.x * scale + offsetX;
          const y = vertex.y * scale + offsetY;
          if (!index) g.moveTo(x, y);
          else g.lineTo(x, y);
        });
        g.closePath();
        g.fillStyle = fills[face.type];
        g.strokeStyle = D.palette["task-fg"];
        g.fill();
        g.stroke();
      }
    });
  }

  function rotationFrameCanvas() {
    return makeCanvas(700, 310, (g, w, h) => {
      g.fillStyle = D.palette["task-bg"];
      g.fillRect(0, 0, w, h);
      g.fillStyle = D.palette["task-panel"];
      g.strokeStyle = D.palette["stim-gray"];
      g.lineWidth = 2;
      g.fillRect(5, 5, 335, 300);
      g.strokeRect(5, 5, 335, 300);
      g.fillRect(360, 5, 335, 300);
      g.strokeRect(360, 5, 335, 300);
    }, true);
  }

  function makeRotationScene(frame, leftFigure, rightFigure) {
    return {
      width: 700,
      height: 310,
      layers: [
        { scene: frame, x: 0, y: 0, width: 700, height: 310 },
        { scene: leftFigure, x: 8, y: 15, width: 330, height: 280 },
        { scene: rightFigure, x: 362, y: 15, width: 330, height: 280 }
      ]
    };
  }

  const TOWER_CAPACITIES = [3, 2, 1];
  const TOWER_BALLS = ["red", "green", "blue"];
  const serializeState = state => state.map(peg => peg.join("")).join("|");
  const parseState = key => key.split("|").map(peg => peg ? peg.split("").map(Number) : []);
  const moveBall = (state, from, to) => {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 2 || to < 0 || to > 2 ||
      from === to || !state[from]?.length || state[to].length >= TOWER_CAPACITIES[to]) return null;
    const next = cloneState(state);
    const ball = next[from].pop();
    next[to].push(ball);
    return { state: next, key: serializeState(next), from, to, ball, ballColor: TOWER_BALLS[ball] };
  };
  const towerNeighbors = state => {
    const next = [];
    for (let from = 0; from < 3; from++) {
      if (!state[from].length) continue;
      for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        const move = moveBall(state, from, to);
        if (move) next.push(move);
      }
    }
    return next;
  };

  const towerStart = [[0, 1, 2], [], []];
  const towerStateMap = new Map([[serializeState(towerStart), cloneState(towerStart)]]);
  const towerQueue = [cloneState(towerStart)];
  for (let i = 0; i < towerQueue.length; i++) {
    for (const neighbor of towerNeighbors(towerQueue[i])) {
      if (!towerStateMap.has(neighbor.key)) {
        towerStateMap.set(neighbor.key, cloneState(neighbor.state));
        towerQueue.push(cloneState(neighbor.state));
      }
    }
  }
  const towerStates = [...towerStateMap.values()].map(cloneState);
  const towerAdjacency = new Map(towerStates.map(state => [serializeState(state), towerNeighbors(state)]));

  function solveTower(start, goal) {
    const startKey = typeof start === "string" ? start : serializeState(start);
    const goalKey = typeof goal === "string" ? goal : serializeState(goal);
    if (!towerStateMap.has(startKey) || !towerStateMap.has(goalKey)) throw new RangeError("Unknown Tower state");
    if (startKey === goalKey) return { distance: 0, path: [], states: [cloneState(parseState(startKey))] };
    const queue = [startKey];
    const seen = new Set([startKey]);
    const parent = new Map();
    while (queue.length) {
      const key = queue.shift();
      for (const move of towerAdjacency.get(key)) {
        if (seen.has(move.key)) continue;
        seen.add(move.key);
        parent.set(move.key, { key, move });
        if (move.key === goalKey) {
          const path = [];
          let cursor = goalKey;
          while (cursor !== startKey) {
            const step = parent.get(cursor);
            path.push({
              from: step.move.from,
              to: step.move.to,
              ball: step.move.ball,
              ballColor: step.move.ballColor,
              key: step.move.key,
              state: cloneState(step.move.state)
            });
            cursor = step.key;
          }
          path.reverse();
          return {
            distance: path.length,
            path,
            states: [cloneState(parseState(startKey)), ...path.map(step => cloneState(step.state))]
          };
        }
        queue.push(move.key);
      }
    }
    throw new Error("Tower state graph is disconnected");
  }

  const towerDistances = new Map();
  const towerPairsByDistance = new Map();
  let towerDiameter = 0;
  for (const startState of towerStates) {
    const startKey = serializeState(startState);
    for (const goalState of towerStates) {
      const goalKey = serializeState(goalState);
      const solution = solveTower(startKey, goalKey);
      towerDistances.set(`${startKey}>${goalKey}`, solution.distance);
      if (solution.distance > towerDiameter) towerDiameter = solution.distance;
      if (!towerPairsByDistance.has(solution.distance)) towerPairsByDistance.set(solution.distance, []);
      towerPairsByDistance.get(solution.distance).push({ startKey, goalKey });
    }
  }

  function generateTowerPair({ minMoves, maxMoves, rng = Math.random, used = null }) {
    const distances = range(minMoves, maxMoves).filter(distance => distance > 0 && towerPairsByDistance.has(distance));
    if (!distances.length) throw new RangeError("Requested Tower difficulty is not available");
    const pool = shuffle(distances, rng).flatMap(distance =>
      shuffle(towerPairsByDistance.get(distance), rng).map(pair => ({ ...pair, distance })));
    for (const pair of pool) {
      const key = `${pair.startKey}>${pair.goalKey}`;
      if (used?.has(key)) continue;
      used?.add(key);
      const solution = solveTower(pair.startKey, pair.goalKey);
      return {
        initialKey: pair.startKey,
        goalKey: pair.goalKey,
        initialState: cloneState(parseState(pair.startKey)),
        goalState: cloneState(parseState(pair.goalKey)),
        optimalMoves: solution.distance,
        path: solution.path.map(step => ({ from: step.from + 1, to: step.to + 1, ball: step.ball, ballColor: step.ballColor }))
      };
    }
    const fallback = pick(pool, rng);
    const solution = solveTower(fallback.startKey, fallback.goalKey);
    return {
      initialKey: fallback.startKey,
      goalKey: fallback.goalKey,
      initialState: cloneState(parseState(fallback.startKey)),
      goalState: cloneState(parseState(fallback.goalKey)),
      optimalMoves: solution.distance,
      path: solution.path.map(step => ({ from: step.from + 1, to: step.to + 1, ball: step.ball, ballColor: step.ballColor }))
    };
  }

  function renderTowerBoard(state, selectedPeg = -1) {
    const width = 320, height = 220;
    const pegX = [70, 160, 250];
    const baseY = 176;
    const slotGap = 34;
    const pegHeights = [105, 70, 35];
    return makeCanvas(width, height, g => {
      g.strokeStyle = D.palette["task-fg"];
      g.fillStyle = D.palette["task-fg"];
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(25, baseY + 14);
      g.lineTo(width - 25, baseY + 14);
      g.stroke();
      for (let peg = 0; peg < 3; peg++) {
        g.strokeStyle = selectedPeg === peg ? D.palette["stim-yellow"] : D.palette["task-fg"];
        g.lineWidth = selectedPeg === peg ? 8 : 4;
        g.beginPath();
        g.moveTo(pegX[peg], baseY + 14);
        g.lineTo(pegX[peg], baseY - pegHeights[peg]);
        g.stroke();
        g.fillStyle = D.palette["task-fg"];
        g.font = '600 18px "Segoe UI", Aptos, Calibri, sans-serif';
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(String(peg + 1), pegX[peg], 204);
      }
      for (let peg = 0; peg < 3; peg++) {
        state[peg].forEach((ball, index) => {
          const y = baseY - index * slotGap;
          g.beginPath();
          g.fillStyle = D.palette[TOWER_BALLS[ball] === "red" ? "stim-red" : TOWER_BALLS[ball] === "green" ? "stim-green" : "stim-blue"];
          g.strokeStyle = D.palette["task-fg"];
          g.lineWidth = 2;
          g.arc(pegX[peg], y, 15, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        });
      }
    });
  }

  function towerFrameCanvas(moveCap) {
    return makeCanvas(700, 300, (g, w, h) => {
      g.fillStyle = D.palette["task-bg"];
      g.fillRect(0, 0, w, h);
      g.fillStyle = D.palette["task-fg"];
      g.font = '600 26px "Segoe UI", Aptos, Calibri, sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(C.t("tower.goal"), 175, 22);
      g.fillText(C.t("tower.current"), 525, 22);
      g.font = '500 20px "Segoe UI", Aptos, Calibri, sans-serif';
      g.fillText(C.t("tower.moveLimit", { count: C.number(moveCap, 0) }), w / 2, 289);
      g.fillStyle = D.palette["task-panel"];
      g.strokeStyle = D.palette["stim-gray"];
      g.lineWidth = 2;
      g.fillRect(5, 44, 335, 232);
      g.strokeRect(5, 44, 335, 232);
      g.fillRect(360, 44, 335, 232);
      g.strokeRect(360, 44, 335, 232);
    }, true);
  }

  function makeTowerSceneFactory(goalKey, boardCache, frame) {
    const goalBoard = boardCache.get(`${goalKey}|-1`);
    const sceneCache = new Map();
    for (const state of towerStates) {
      const key = serializeState(state);
      for (const selectedPeg of [-1, 0, 1, 2]) {
        const currentBoard = boardCache.get(`${key}|${selectedPeg}`);
        sceneCache.set(`${key}|${selectedPeg}`, {
          width: 700,
          height: 300,
          layers: [
            { scene: frame, x: 0, y: 0, width: 700, height: 300 },
            { scene: goalBoard, x: 12, y: 50, width: goalBoard.width, height: goalBoard.height },
            { scene: currentBoard, x: 368, y: 50, width: currentBoard.width, height: currentBoard.height }
          ]
        });
      }
    }
    return (stateKey, selectedPeg = -1) => sceneCache.get(`${stateKey}|${selectedPeg}`);
  }

  const rotationMetric = (rows, angle) => {
    const valid = S.eligible(normalizeRows(rows)).filter(row => row.angleDeg === angle);
    return valid.length ? S.mean(valid.map(row => Number(row.correct))) : null;
  };
  const towerScore = rows => {
    const valid = S.eligible(normalizeRows(rows));
    const solved = valid.filter(row => row.solved);
    return {
      ...C.accuracyScore(rows),
      optimalSolutions: solved.filter(row => row.actualLegalMoves === row.optimalMoves).length,
      meanExcessMoves: solved.length ? S.mean(solved.map(row => row.actualLegalMoves - row.optimalMoves)) : null,
      optimalMoveEfficiency: valid.length ? S.mean(valid.map(row =>
        row.solved && row.actualLegalMoves ? row.optimalMoves / row.actualLegalMoves : 0)) : null,
      meanFirstMoveLatency: meanFinite(valid.map(row => row.firstMoveLatencyMs))
    };
  };
  const rotationScore = rows => ({
    ...C.accuracyScore(rows),
    angle90Accuracy: rotationMetric(rows, 90),
    angle120Accuracy: rotationMetric(rows, 120),
    angle180Accuracy: rotationMetric(rows, 180)
  });

  C.Rotation = {
    rotations: rotations.map(matrix => matrix.map(row => row.slice())),
    apply: (matrix, cell) => applyMatrix(matrix, cell),
    rotate: (cells, matrix) => rotateCells(cells, matrix),
    reflect: cells => normalizeCellsInternal(reflectCells(cells)),
    canonical: canonicalCells,
    serialize: serializeCells,
    connected: connectedCells,
    extents,
    projectionSignature,
    angle: rotationAngleDeg,
    allowedAngles,
    generate: (blockCount, rng = Math.random) => randomFigure(blockCount, rng),
    generatePair: options => generateRotationPair(options)
  };

  C.Tower = {
    capacities: TOWER_CAPACITIES.slice(),
    balls: TOWER_BALLS.slice(),
    states: towerStates.map(cloneState),
    serialize: serializeState,
    parse: parseState,
    move: (state, from, to) => {
      const moved = moveBall(typeof state === "string" ? parseState(state) : cloneState(state), from, to);
      return moved ? { ...moved, state: cloneState(moved.state) } : null;
    },
    neighbors: state => towerNeighbors(typeof state === "string" ? parseState(state) : state)
      .map(move => ({ ...move, state: cloneState(move.state) })),
    solve: (start, goal) => solveTower(start, goal),
    distance: (start, goal) => towerDistances.get(`${typeof start === "string" ? start : serializeState(start)}>${typeof goal === "string" ? goal : serializeState(goal)}`),
    generate: options => generateTowerPair(options),
    diameter: towerDiameter
  };

  C.define("mental-rotation", "reasoning", {
    trials: p(24, 6, 72, 6),
    blockCount: p(5, 4, 10),
    minAngleDeg: p(90, 90, 180, 30),
    maxAngleDeg: p(180, 90, 180, 30),
    responseMs: p(8000, 2000, 20000, 500)
  }, {
    tier: 2,
    landscape: true,
    primaryMetric: "accuracy",
    metrics: ["accuracy", "correct", "angle90Accuracy", "angle120Accuracy", "angle180Accuracy"],
    staircase: "stepwise",
    validateParams: q => q.minAngleDeg > q.maxAngleDeg || !allowedAngles(q.minAngleDeg, q.maxAngleDeg).length ? "rotation.invalidAngles" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const count = practice ? PRACTICE_TRIALS : q.trials;
      if (!count) return { stimulusSet: "spatial" };
      const panel = ctx.prepareOptions(D.options([C.t("response.same"), C.t("response.different")], ["a", "l"]));
      const mainAngles = allowedAngles(q.minAngleDeg, q.maxAngleDeg);
      const state = ctx.state("rotation-angle-index", "stepwise", { start: 0, min: 0, max: mainAngles.length - 1 });
      const frame = rotationFrameCanvas();
      const figureCache = new Map();
      const rasterScale = Math.min(1, (ctx.w - 24) / 700, ctx.stimulusHeight / 310);
      const figureScene = cells => {
        const key = serializeCells(cells);
        if (!figureCache.has(key)) figureCache.set(key, renderRotationFigure(cells, rasterScale));
        return figureCache.get(key);
      };
      const itemScene = item => makeRotationScene(frame, figureScene(item.leftCells), figureScene(item.rightCells));
      const makeRotationItem = spec => {
        const item = generateRotationPair(spec);
        return { ...item, scene: itemScene(item) };
      };
      const practicePlan = [
        { blockCount: 4, angleDeg: 90, same: true },
        { blockCount: 4, angleDeg: 90, same: false },
        { blockCount: 4, angleDeg: 120, same: true },
        { blockCount: 4, angleDeg: 120, same: false },
        { blockCount: 5, angleDeg: 90, same: true },
        { blockCount: 5, angleDeg: 90, same: false },
        { blockCount: 5, angleDeg: 120, same: true },
        { blockCount: 5, angleDeg: 120, same: false }
      ];
      const mainBanks = new Map();
      if (!practice) {
        const perCondition = ctx.mode === "training" ? Math.ceil(q.trials / 2) :
          Math.ceil(q.trials / (mainAngles.length * 2)) + 1;
        for (const angleDeg of mainAngles) {
          for (const same of [true, false]) {
            const key = `${angleDeg}|${same}`;
            mainBanks.set(key, Array.from({ length: perCondition }, () => makeRotationItem({ blockCount: q.blockCount, same, angleDeg })));
          }
        }
      }
      const practiceItems = practice ? practicePlan.map(makeRotationItem) : [];
      const assessmentItems = !practice && ctx.mode === "assessment" ? shuffle(Array.from({ length: q.trials }, (_, i) => ({
        angleDeg: mainAngles[i % mainAngles.length],
        same: i < Math.ceil(q.trials / 2)
      }))).map(spec => {
        const key = `${spec.angleDeg}|${spec.same}`;
        return mainBanks.get(key).pop();
      }) : [];
      const trainingFlags = !practice ? shuffle(Array.from({ length: q.trials }, (_, i) => i < Math.ceil(q.trials / 2))) : [];
      await ctx.countdown();
      const recent = [];
      for (let index = 0; index < count; index++) {
        const item = practice ? practiceItems[index] : ctx.mode === "assessment" ? assessmentItems[index] : (() => {
          const angleDeg = mainAngles[Math.round(state.state.value)];
          const same = trainingFlags[index];
          const bank = mainBanks.get(`${angleDeg}|${same}`);
          return bank.pop();
        })();
        if (!item) throw new Error("Pre-rendered rotation bank exhausted");
        const row = await ctx.trial({
          scene: item.scene,
          panel,
          deadline: q.responseMs,
          answer: item.answer,
          noFeedback: !practice && ctx.mode === "assessment",
          meta: {
            blockCount: item.blockCount,
            figure: cloneCells(item.cells),
            mirroredFigure: cloneCells(item.mirroredCells),
            canonical: item.canonical,
            same: item.same,
            angleDeg: item.angleDeg,
            leftRotationIndex: item.leftRotationIndex,
            rightRotationIndex: item.rightRotationIndex,
            leftRotation: item.leftRotation.map(row => row.slice()),
            rightRotation: item.rightRotation.map(row => row.slice()),
            leftFigure: cloneCells(item.leftCells),
            rightFigure: cloneCells(item.rightCells),
            reflectionFlag: !item.same,
            condition: item.angleDeg
          }
        });
        recent.push(row);
        if (!practice && ctx.mode === "training" && recent.length === 4) {
          ctx.adapt(state, {
            accuracy: S.accuracy(normalizeRows(recent)),
            errors: recent.filter(entry => !entry.correct).length,
            up: .85,
            down: .55,
            downErrors: 2
          });
          recent.length = 0;
        }
      }
      return { stimulusSet: "spatial" };
    },
    score: rotationScore
  });

  C.define("tower-london", "reasoning", {
    trials: p(18, 3, 60, 3),
    startMoves: p(2, 1, towerDiameter),
    minMoves: p(1, 1, towerDiameter),
    maxMoves: p(6, 1, towerDiameter),
    maxExtraMoves: p(3, 0, 10),
    responseMs: p(30000, 5000, 120000, 1000)
  }, {
    tier: 2,
    landscape: true,
    primaryMetric: "accuracy",
    metrics: ["accuracy", "optimalSolutions", "meanExcessMoves", "optimalMoveEfficiency", "meanFirstMoveLatency"],
    staircase: "stepwise",
    validateParams: q => q.minMoves > q.startMoves || q.startMoves > q.maxMoves || q.maxMoves > towerDiameter ? "tower.invalidRange" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const count = practice ? PRACTICE_TRIALS : q.trials;
      if (!count) return { stimulusSet: "spatial" };
      const panel = ctx.prepareOptions(D.options(["1", "2", "3"], ["1", "2", "3"]));
      const state = ctx.state("tower-distance", "stepwise", { start: q.startMoves, min: q.minMoves, max: q.maxMoves });
      const boardCache = new Map();
      for (const boardState of towerStates) {
        const key = serializeState(boardState);
        for (const selectedPeg of [-1, 0, 1, 2]) boardCache.set(`${key}|${selectedPeg}`, renderTowerBoard(boardState, selectedPeg));
      }
      const frames = new Map(range(1, towerDiameter).map(distance =>
        [distance, towerFrameCanvas(distance + q.maxExtraMoves)]));
      const sceneFactories = new Map();
      const usedPairs = new Set();
      const practiceDistances = [1, 1, 2, 2, 3, 3, 2, 3];
      const makeItem = distance => {
        const generated = generateTowerPair({ minMoves: distance, maxMoves: distance, used: usedPairs });
        const sceneKey = `${generated.goalKey}|${distance}`;
        if (!sceneFactories.has(sceneKey)) sceneFactories.set(sceneKey,
          makeTowerSceneFactory(generated.goalKey, boardCache, frames.get(distance)));
        return {
          ...generated,
          moveCap: generated.optimalMoves + q.maxExtraMoves,
          sceneFor: sceneFactories.get(sceneKey)
        };
      };
      const practiceItems = practice ? practiceDistances.map(makeItem) : [];
      const mainDistances = range(q.minMoves, q.maxMoves);
      const mainBanks = new Map();
      if (!practice) {
        const perDistance = Math.ceil(Math.max(1, q.trials) / mainDistances.length) + 2;
        for (const distance of mainDistances) mainBanks.set(distance, Array.from({ length: perDistance }, () => makeItem(distance)));
      }
      const assessmentDistances = !practice ? shuffle(Array.from({ length: q.trials }, (_, i) => mainDistances[i % mainDistances.length])) : [];
      await ctx.countdown();
      const recent = [];
      for (let index = 0; index < count; index++) {
        const item = practice ? practiceItems[index] : ctx.mode === "assessment" ? (mainBanks.get(assessmentDistances[index]).pop() || makeItem(assessmentDistances[index])) :
          (mainBanks.get(Math.round(state.state.value)).pop() || makeItem(Math.round(state.state.value)));
        let currentKey = item.initialKey;
        let selectedPeg = -1;
        let endReason = null;
        const invalidAttempts = [];
        const row = await ctx.trial({
          scene: item.sceneFor(currentKey, selectedPeg),
          panel,
          deadline: q.responseMs,
          noFeedback: !practice && ctx.mode === "assessment",
          evaluate: () => currentKey === item.goalKey,
          interact(value, time, current) {
            const peg = value;
            const offset = time - current.startedAt;
            if (selectedPeg === -1) {
              if (!parseState(currentKey)[peg].length) {
                invalidAttempts.push({ peg: peg + 1, type: "empty-source", timeOffsetMs: offset });
                return { accepted: false, scene: item.sceneFor(currentKey, -1), entered: [peg + 1, "∅"] };
              }
              selectedPeg = peg;
              return { accepted: false, scene: item.sceneFor(currentKey, selectedPeg), entered: [peg + 1, "→", "?"] };
            }
            if (peg === selectedPeg) {
              selectedPeg = -1;
              return { accepted: false, scene: item.sceneFor(currentKey, -1), entered: [peg + 1, "×"] };
            }
            const move = moveBall(parseState(currentKey), selectedPeg, peg);
            if (!move) {
              invalidAttempts.push({ from: selectedPeg + 1, to: peg + 1, type: "illegal-destination", timeOffsetMs: offset });
              return { accepted: false, scene: item.sceneFor(currentKey, selectedPeg), entered: [selectedPeg + 1, "→", peg + 1, "×"] };
            }
            const from = selectedPeg;
            selectedPeg = -1;
            currentKey = move.key;
            const actualMoves = current.responses.length + 1;
            const solved = currentKey === item.goalKey;
            if (solved) endReason = "solved";
            else if (actualMoves >= item.moveCap) endReason = "move-cap";
            return {
              accepted: true,
              recordValue: { from: from + 1, to: peg + 1, ball: move.ball, ballColor: move.ballColor },
              scene: item.sceneFor(currentKey, -1),
              done: solved || actualMoves >= item.moveCap,
              entered: [from + 1, "→", peg + 1]
            };
          },
          meta: {
            initialState: cloneState(item.initialState),
            goalState: cloneState(item.goalState),
            optimalMoves: item.optimalMoves,
            optimalPath: item.path.map(step => ({ ...step })),
            moveCap: item.moveCap,
            condition: item.optimalMoves
          },
          enrich(result) {
            result.initialState = cloneState(item.initialState);
            result.goalState = cloneState(item.goalState);
            result.finalState = cloneState(parseState(currentKey));
            result.actualLegalMoves = result.responses.length;
            result.moveLog = result.response.map(step => ({ ...step }));
            result.invalidAttempts = invalidAttempts.map(entry => ({ ...entry }));
            result.solved = currentKey === item.goalKey;
            result.firstMoveLatencyMs = result.rtMs;
            result.endReason = result.solved ? "solved" :
              result.actualLegalMoves >= item.moveCap ? "move-cap" : endReason || "timeout";
            result.excessMoves = result.solved ? result.actualLegalMoves - item.optimalMoves : null;
          }
        });
        recent.push(row);
        if (!practice && ctx.mode === "training" && recent.length === 2) {
          ctx.adapt(state, {
            accuracy: S.mean(recent.map(entry => entry.solved && entry.actualLegalMoves ? entry.optimalMoves / entry.actualLegalMoves : 0)),
            errors: recent.filter(entry => !entry.solved).length,
            up: .92,
            down: .6,
            downErrors: 1
          });
          recent.length = 0;
        }
      }
      return { stimulusSet: "spatial" };
    },
    score: towerScore
  });
})();
