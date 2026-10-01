"use strict";

window.Cortex = {};

/* Wall-clock dates are derived from the same monotonic clock as trial timestamps. */
(() => {
  const C = window.Cortex;
  C.now = () => performance.now();
  C.practiceCount = trials => trials.filter(trial => Number.isFinite(trial.stimulusOnset)).length;
  C.onlyTimingWarning = reasons => Array.isArray(reasons) && reasons.length > 0 && reasons.every(reason => reason === "runner.refresh");
  C.completedRound = session => !session.practiceOnly && (!session.invalid ||
    session.mode === "training" && session.completedMain === true && C.onlyTimingWarning(session.invalidReasons));
  C.layoutOrientation = viewport => Number.isFinite(viewport?.width) && Number.isFinite(viewport?.height) ?
    viewport.width > viewport.height ? "landscape" : "portrait" : "unknown";
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
    if (typeof value !== "number" && /^\s*[=+\-@]|^[\t\r\n]/.test(text)) text = "'" + text;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const empty = () => ({
    schemaVersion: 1,
    settings: { language: navigator.language.toLowerCase().startsWith("de") ? "de" : "en",
      mode: "training", vibration: false, fullscreen: false, theme: "system", routineMinutes: 10,
      warmupPolicy: "familiar", inputMethod: "auto", favorites: [], practiceReady: {}, taskParams: {}, staircases: {}, notices: {} },
    sessions: [], trials: {}, itemHashes: {}, forecasts: [], routine: null
  });
  let root = empty();
  let storageWarning = null;
  let dirty = false;
  let corrupt = false;
  let unreadableOriginal = null;
  let externalChange = false;
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
      (entry.outcome === null) !== (entry.resolvedAt === null) ||
      entry.resolvedAt !== null && !C.validTimestamp(entry.resolvedAt) ||
      entry.resolvedAt !== null && Date.parse(entry.resolvedAt) < Date.parse(entry.createdAt) ||
      entry.status === "resolved" && (entry.outcome === null || entry.resolvedAt === null) ||
      entry.status === "open" && (entry.outcome !== null || entry.resolvedAt !== null) ||
      entry.conflictOf !== undefined && (typeof entry.conflictOf !== "string" || entry.conflictOf === entry.id) ||
      entry.status === "conflict" && !entry.conflictOf) throw new Error("forecast.invalid");
    return entry;
  };
  const validateRoutine = (routine, ids) => {
    if (routine === null || routine === undefined) return null;
    if (!validObject(routine) || typeof routine.id !== "string" || !routine.id ||
      !C.validDate(routine.date) || !C.validTimestamp(routine.createdAt) ||
      ![10, 15, 20].includes(routine.minutes) || !Array.isArray(routine.steps) ||
      routine.steps.length < 1 || routine.steps.length > 6 ||
      routine.completedAt !== null && !C.validTimestamp(routine.completedAt)) throw new Error("data.invalid");
    for (const step of routine.steps) {
      if (!validObject(step) || typeof step.taskId !== "string" || !step.taskId ||
        !validObject(step.params) || typeof step.skipped !== "boolean" ||
        !Number.isFinite(step.estimatedMinutes) || step.estimatedMinutes <= 0 ||
        step.sessionId !== null && (typeof step.sessionId !== "string" || ids && !ids.has(step.sessionId))) {
        throw new Error("data.invalid");
      }
    }
    return routine;
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
      preferences.fullscreen !== undefined && typeof preferences.fullscreen !== "boolean" ||
      preferences.theme !== undefined && !["system", "light", "dark"].includes(preferences.theme) ||
      preferences.routineMinutes !== undefined && ![10, 15, 20].includes(preferences.routineMinutes) ||
      preferences.warmupPolicy !== undefined && !["familiar", "always"].includes(preferences.warmupPolicy) ||
      preferences.inputMethod !== undefined && !["auto", "keyboard", "touch", "mouse"].includes(preferences.inputMethod) ||
      preferences.favorites !== undefined && (!Array.isArray(preferences.favorites) ||
        preferences.favorites.length > 64 || preferences.favorites.some(id => typeof id !== "string" || id.length > 80)) ||
      ["taskParams", "staircases", "notices", "practiceReady"].some(key =>
        preferences[key] !== undefined && !validObject(preferences[key]))) {
      throw new Error("data.invalid");
    }
    const ids = new Set();
    value.sessions.forEach(session => {
      if (!validObject(session) || typeof session.id !== "string" || !session.id || ids.has(session.id) ||
        ["__proto__", "constructor", "prototype"].includes(session.id) ||
        typeof session.taskId !== "string" || !session.taskId || !["training", "assessment"].includes(session.mode) ||
        !C.validTimestamp(session.startedAt) || !Number.isFinite(session.durationMs) ||
        session.durationMs < 0 || !validObject(session.params) || !validObject(session.score) ||
        !["en", "de"].includes(session.language) ||
        !["desktop", "tablet", "phone"].includes(session.deviceClass) ||
        !["keyboard", "touch", "mouse"].includes(session.inputMethod) ||
        !Number.isFinite(session.refreshHz) || !validObject(session.viewport) ||
        typeof session.invalid !== "boolean" ||
        session.invalidReasons !== undefined && (!Array.isArray(session.invalidReasons) ||
          session.invalidReasons.some(reason => typeof reason !== "string")) ||
        ["practiceOnly", "practiceCompleted", "practiceSkipped", "completedMain"].some(key =>
          session[key] !== undefined && typeof session[key] !== "boolean") ||
        session.practiceCount !== undefined && (!Number.isInteger(session.practiceCount) || session.practiceCount < 0)) throw new Error("data.invalid");
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
    return sanitize({ ...value, forecasts: value.forecasts || [], routine: validateRoutine(value.routine, ids) });
  };
  const pruneExpired = () => {
    const cutoff = performance.timeOrigin + C.now() - 90 * 86400000;
    const keep = new Set(root.sessions.filter(s => Date.parse(s.startedAt) >= cutoff).map(s => s.id));
    let removed = 0;
    for (const id of Object.keys(root.trials)) if (!keep.has(id)) { delete root.trials[id]; removed++; }
    return removed;
  };
  const persist = () => {
    dirty = true;
    if (corrupt) { warn("data.corrupt"); return false; }
    if (externalChange) { warn("data.otherTab"); return false; }
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
      if (pruneExpired()) persist();
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
      C.download(`bennys-brain-gym-recovery-${C.iso().slice(0, 10)}.json`, unreadableOriginal, "application/json");
    },
    getSettings: () => C.clone(root.settings),
    setSettings(settings) { root.settings = { ...root.settings, ...sanitize(C.clone(settings)) }; return persist(); },
    appendSession(summary, rows, options = {}) {
      if (root.sessions.some(s => s.id === summary.id)) throw new Error("data.duplicate");
      root.sessions.push(C.clone(summary));
      if (rows) root.trials[summary.id] = C.clone(rows);
      if (options.settings) root.settings = { ...root.settings, ...sanitize(C.clone(options.settings)) };
      if (options.routine !== undefined) root.routine = sanitize(C.clone(validateRoutine(options.routine)));
      for (const [task, hashes] of Object.entries(options.itemHashes || {})) {
        root.itemHashes[task] = [...new Set([...(root.itemHashes[task] || []), ...hashes])];
      }
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
    getRoutine: () => C.clone(root.routine),
    setRoutine(routine) { root.routine = sanitize(C.clone(validateRoutine(routine))); return persist(); },
    sessionCounts() {
      const counts = {};
      for (const session of root.sessions) if (!session.practiceOnly) counts[session.taskId] = (counts[session.taskId] || 0) + 1;
      return counts;
    },
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
      C.download(`bennys-brain-gym-${C.iso().slice(0, 10)}.json`, text, "application/json");
      return text;
    },
    async importAll(file) {
      const incoming = validate(JSON.parse(await file.text()));
      const wasEmpty = root.sessions.length === 0 && root.forecasts.length === 0;
      let added = 0, conflicts = 0, forecastsAdded = 0, forecastsUpdated = 0, forecastConflicts = 0;
      const mappings = new Map();
      const sessionIdentity = session => C.canonical(Object.fromEntries(Object.entries(session)
        .filter(([key]) => !["id", "importSourceId"].includes(key))));
      for (const session of incoming.sessions) {
        const existing = root.sessions.find(s => s.id === session.id);
        if (existing && C.canonical(existing) === C.canonical(session)) {
          mappings.set(session.id, session.id);
          continue;
        }
        const next = C.clone(session);
        if (existing) {
          const imported = root.sessions.find(row => row.importSourceId === session.id &&
            sessionIdentity(row) === sessionIdentity(session));
          if (imported) { mappings.set(session.id, imported.id); continue; }
          next.id = C.uid(); next.importSourceId = session.id; conflicts++;
        }
        mappings.set(session.id, next.id);
        root.sessions.push(next);
        added++;
      }
      for (const [id, rows] of Object.entries(incoming.trials)) {
        const mapped = mappings.get(id);
        const existing = root.trials[mapped] || [];
        const keys = new Set(existing.map(C.canonical));
        const merged = [...existing];
        for (const row of rows) {
          const key = C.canonical(row);
          if (!keys.has(key)) { keys.add(key); merged.push(row); }
        }
        root.trials[mapped] = merged;
      }
      // Local preferences and existing staircases win; the import report makes this explicit.
      const fresh = wasEmpty;
      if (fresh) {
        root.settings = { ...empty().settings, ...incoming.settings };
        root.routine = incoming.routine ? C.clone(incoming.routine) : null;
      }
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
      externalChange = false;
      return persist();
    }
  };
  addEventListener("storage", event => {
    if (event.key !== "cortex.v1") return;
    if (dirty || C.active || C.starting) {
      externalChange = true; warn("data.otherTab"); return;
    }
    try {
      const next = event.newValue ? validate(JSON.parse(event.newValue)) : empty();
      root = { ...empty(), ...next, settings: { ...empty().settings, ...next.settings } };
      C.language = root.settings.language;
      C.UI?.syncPreferences();
      C.UI?.render();
    } catch (error) {
      console.warn("Changed storage could not be read:", error);
      unreadableOriginal = event.newValue; corrupt = true; warn("data.corrupt");
    }
  });
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
      // Slow vigilance lapses are measured outcomes, not removable RT outliers.
      return trials.map(row => ({ ...row, excluded: !!row.forcedExclusion || (row.unscored || row.falseStart ? false :
        Number.isFinite(row.rtMs) && (row.rtMs < 150 || row.lapse !== true && center !== null && row.rtMs > 3 * center)) }));
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
        if (Number.isFinite(result.accuracy) && result.accuracy >= (result.up ?? 0.9) && (result.errors ?? 0) <= 3) direction = 1;
        else if ((result.errors ?? 0) >= (result.downErrors ?? 5) ||
          Number.isFinite(result.accuracy) && result.accuracy <= (result.down ?? 0.6)) direction = -1;
        next.value = C.clamp(state.value + direction, state.min, state.max);
      } else if (state.type === "deadline") {
        if (Number.isFinite(result.accuracy) && result.accuracy >= 0.9 && result.fast) direction = -1;
        else if (Number.isFinite(result.accuracy) && result.accuracy < 0.75) direction = 1;
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
    C.Tasks.push({ supportsAssessment: true, touchSupport: "full", languageDependent: false, protocolVersion: 2,
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
  const inputPreference = C.Storage.getSettings().inputMethod;
  if (["keyboard", "touch", "mouse"].includes(inputPreference)) C.input = inputPreference;
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
  C.metric = (key, value) => {
    if (!Number.isFinite(value)) return C.t("common.noValue");
    const ratio = key === "accuracy" || /Accuracy$|ErrorRate$/.test(key) ||
      ["partialCreditLoad", "lureFalseAlarmRate", "stopResponseRate", "optimalMoveEfficiency"].includes(key);
    return ratio ? `${C.number(value * 100, 1)}%` : C.number(value);
  };
  C.dayLabel = value => new Intl.DateTimeFormat(C.language, { month: "short", day: "numeric" }).format(new Date(value));
})();
