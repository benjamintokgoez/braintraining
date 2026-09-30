"use strict";

(() => {
  const C = window.Cortex, S = C.Stats;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  C.escape = esc;
  const text = (key, vars) => esc(C.t(key, vars));
  const app = () => document.getElementById("app");
  const settings = () => C.Storage.getSettings();
  const taskById = id => C.Tasks.find(task => task.id === id);
  const sessionRoute = id => `session/${encodeURIComponent(id)}`;
  let selectedTask = C.Storage.getSessions(null, {}, 1)[0]?.taskId || "dual-nback";
  let filterDevice = C.device(), filterInput = C.input, overlay = false, historyMode = "training", historyPage = 0;
  let libraryDomain = "all", librarySearch = "", favoritesOnly = false, startVersion = 0;
  const dialogOpeners = new WeakMap();
  function showDialog(dialog, opener) {
    if (dialog.open) return;
    dialogOpeners.set(dialog, opener);
    dialog.showModal();
  }
  function restoreDialogFocus(event) {
    const dialog = event.currentTarget, opener = dialogOpeners.get(dialog);
    dialogOpeners.delete(dialog);
    const target = opener?.isConnected ? opener : opener?.id ? document.getElementById(opener.id) : null;
    target?.focus({ preventScroll: true });
  }
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${{
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  }[name] || ""}</svg>`;
  const domainLabel = task => `<span class="task-domain">${text(`domain.${task.domain}`)}</span>`;
  const taskTitle = (task, params) => task.id === "dual-nback" && params ?
    C.t(`nback.name.${params.variant}`) : C.t(task.nameKey);
  const taskParams = task => {
    const saved = settings().taskParams[task.id] || {};
    return Object.fromEntries(Object.entries(task.paramSchema).map(([key, schema]) => {
      const value = saved[key] ?? schema.value;
      if (schema.type === "text") return [key, typeof value === "string" ? value.slice(0, schema.maxLength) : schema.value];
      return [key, schema.choices ? schema.choices.includes(value) ? value : schema.value :
        Number.isFinite(value) ? Number(C.clamp(schema.min + Math.round((value - schema.min) / schema.step) * schema.step,
          schema.min, schema.max).toFixed(10)) : schema.value];
    }));
  };
  C.taskParams = taskParams;
  C.notice = (key, details = "") => {
    const container = document.getElementById("notifications");
    if (!container || container.querySelector(`[data-notice="${key}"]`)) return;
    const item = document.createElement("div");
    item.className = /quota|unavailable|corrupt|otherTab|failure|invalid|pending/.test(key) ? "notice warning" : "notice";
    item.dataset.notice = key;
    const message = document.createElement("span");
    message.dataset.i18n = key; message.textContent = C.t(key);
    if (details) { const detail = document.createElement("small"); detail.textContent = details; message.append(" ", detail); }
    const close = document.createElement("button");
    close.type = "button"; close.className = "secondary"; close.dataset.i18n = "common.dismiss"; close.textContent = C.t("common.dismiss");
    close.addEventListener("click", () => item.remove());
    item.append(message, close); container.append(item);
  };
  const cooldown = taskId => {
    const latest = C.Storage.getSessions(taskId, { mode: "assessment" }).find(session => !session.invalid && !session.practiceOnly);
    if (!latest) return null;
    const next = Date.parse(latest.startedAt) + 14 * 86400000;
    return next > performance.timeOrigin + C.now() ? next : null;
  };
  const taskSelect = (id, current = selectedTask, includeJournals = false) => `<select id="${id}">${C.Tasks
    .filter(task => includeJournals || task.kind !== "journal").map(task =>
      `<option value="${task.id}" ${task.id === current ? "selected" : ""}>${text(task.nameKey)}</option>`).join("")}</select>`;
  const modeButtons = (mode = settings().mode, attribute = "data-mode") =>
    `<div class="mode-toggle" role="group" aria-label="${text("results.mode")}">${["training", "assessment"].map(value =>
      `<button type="button" ${attribute}="${value}" class="${mode === value ? "selected" : ""}"
        aria-pressed="${mode === value}">${text(`mode.${value}`)}</button>`).join("")}</div>`;
  const minutes = count => text("routine.minutes", { count: C.number(count, 0) });
  const durationLabel = ms => ms < 60000 ? text("routine.seconds", { count: C.number(Math.round(ms / 1000), 0) }) :
    minutes(Math.round(ms / 60000));
  function applyTheme() {
    const param = new URLSearchParams(location.search).get("scoutTheme");
    const preference = settings().theme;
    const theme = ["light", "dark"].includes(param) ? param : preference === "system" ?
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : preference;
    document.documentElement.dataset.theme = theme;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--cp-bg").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
    C.Draw.init();
  }
  function syncPreferences() {
    const value = settings();
    C.language = value.language;
    C.input = value.inputMethod === "auto" ? matchMedia("(pointer: coarse)").matches ? "touch" : "keyboard" : value.inputMethod;
    filterInput = C.input;
    applyTheme();
  }
  function header() {
    document.documentElement.lang = C.language;
    document.title = C.t("app.title");
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = C.t(node.dataset.i18n); });
    document.querySelectorAll("[data-i18n-aria]").forEach(node => node.setAttribute("aria-label", C.t(node.dataset.i18nAria)));
    const route = (location.hash.slice(1) || "home").split("/")[0];
    const section = ["routine", "home"].includes(route) ? "home" : ["task", "library"].includes(route) ? "library" :
      ["session", "results", "reliability"].includes(route) ? "results" : route;
    document.querySelectorAll("nav a").forEach(link => {
      if (link.hash === `#${section}` || link.hash === `#${route}`) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  function weeklyActivity(sessions) {
    const valid = sessions.filter(C.completedRound);
    const dates = new Set(valid.map(session => {
      const date = new Date(session.startedAt);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }));
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(`${C.today()}T12:00:00`);
      date.setDate(date.getDate() - 6 + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { date, key, done: dates.has(key) };
    });
    return { days, count: days.filter(day => day.done).length };
  }
  const weekHTML = activity => `<ol class="week-strip" aria-label="${text("home.weekLabel")}">${activity.days.map(day =>
    `<li class="${day.done ? "practiced" : ""} ${day.key === C.today() ? "today" : ""}">
      <span>${esc(new Intl.DateTimeFormat(C.language, { weekday: "short" }).format(day.date))}</span>
      <span class="day-dot" aria-label="${esc(new Intl.DateTimeFormat(C.language, { dateStyle: "full" }).format(day.date))}:
        ${text(day.done ? "home.practiced" : "home.notPracticed")}">${day.done ? icon("check") : '<span aria-hidden="true"></span>'}</span></li>`).join("")}</ol>`;
  const planHTML = routine => `<ol class="routine-list">${routine.steps.map((step, index) => {
    const task = taskById(step.taskId);
    return `<li class="${step.sessionId ? "completed" : step.skipped ? "skipped" : ""}">
      <span class="step-number" aria-hidden="true">${step.sessionId ? icon("check") : index + 1}</span>
      <div><strong>${esc(taskTitle(task, step.params))}</strong><span class="muted">${text(`domain.${task.domain}`)}</span></div>
      <span class="step-meta">${step.sessionId ? text("routine.done") : step.skipped ? text("routine.skipped") :
        text("routine.approxMinutes", { count: C.number(Math.ceil(step.estimatedMinutes), 0) })}</span></li>`;
  }).join("")}</ol>`;
  function home() {
    const sessions = C.Storage.getSessions(), activity = weeklyActivity(sessions), routine = C.Routine.preview();
    const saved = C.Routine.current(), done = saved && C.Routine.isDone(saved);
    const completed = routine.steps.filter(step => step.sessionId).length;
    app().innerHTML = `<section class="hero morning-hero"><span class="eyebrow">${esc(new Intl.DateTimeFormat(C.language,
      { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${C.today()}T12:00:00`)))}</span>
      <h1>${text(done ? "home.finishedTitle" : "home.title")}</h1><p>${text(done ? "home.finishedHelp" : "home.subtitle")}</p></section>
      <div class="morning-grid"><section class="card routine-card"><div class="section-heading"><div>
      <span class="eyebrow">${text("routine.eyebrow")}</span><h2>${text("routine.title")}</h2></div>
      <span class="tag">${icon("clock")}${minutes(routine.minutes)}</span></div>
      <p class="muted">${text(done ? "routine.finishedCount" : saved ? "routine.resumeHelp" : "routine.intro",
        { done: C.number(completed), total: C.number(routine.steps.length) })}</p>${planHTML(routine)}
      <div class="actions"><button class="primary" id="start-routine">${text(done ? "routine.review" :
        saved ? "routine.resume" : "routine.start")}${icon("arrow")}</button>
      ${!saved ? `<button id="routine-preferences" class="secondary">${text("routine.adjust")}</button>` : ""}</div>
      <p class="fine-print">${text("routine.estimateNote")}</p></section>
      <aside class="stack"><section class="card consistency-card"><span class="eyebrow">${text("home.week")}</span>
      <h2>${text("home.practiceDays", { count: C.number(activity.count) })}</h2>${weekHTML(activity)}
      <p class="muted">${text("home.consistency")}</p></section>
      <section class="card quiet-card"><h3>${text("home.pickTitle")}</h3><p class="muted">${text("home.pickHelp")}</p>
      <a href="#library" class="button secondary">${text("home.explore")}</a></section></aside></div>
      <p class="home-perspective">${text("home.perspective")} <a href="#about">${text("home.evidenceLink")}</a></p>`;
    document.getElementById("start-routine").onclick = () => { C.Routine.start(); location.hash = "routine"; };
    document.getElementById("routine-preferences")?.addEventListener("click", openPreferences);
  }
  const category = task => ["processing-speed", "vigilance", "attention"].includes(task.domain) ? "attention" : task.domain;
  function taskCard(task, counts) {
    const q = taskParams(task), favorite = settings().favorites.includes(task.id);
    const next = settings().mode === "assessment" && task.supportsAssessment ? cooldown(task.id) : null;
    const estimate = C.Routine.estimateMinutes(task, q);
    return `<article class="card task-card"><div class="task-card-heading">${domainLabel(task)}
      <button class="favorite-button secondary" data-favorite="${task.id}" aria-pressed="${favorite}"
        aria-label="${text(favorite ? "library.unsave" : "library.save", { name: C.t(task.nameKey) })}">${icon("star")}</button></div>
      <h3 class="task-title">${esc(taskTitle(task, q))}</h3><p class="task-desc">${text(task.descKey)}</p>
      <div class="task-tags"><span class="tag">${estimate === null ? text("library.untimed") :
        text("routine.approxMinutes", { count: C.number(estimate) })}</span>${task.touchSupport === "degraded" ?
        `<span class="tag">${text("library.timingSensitive")}</span>` : ""}</div>
      <div class="task-actions"><span class="muted">${task.kind === "journal" ? text("forecast.count",
        { count: C.number(task.exposureCount()) }) : text("library.roundCount", { count: C.number(counts[task.id] || 0) })}</span>
      <a class="button secondary" href="#task/${task.id}">${text(next ? "common.view" : task.startKey || "common.start")}</a></div>
      ${next ? `<small class="muted">${text("home.assessmentWait", { date: C.date(next) })}</small>` : ""}</article>`;
  }
  function libraryList() {
    const query = librarySearch.trim().toLocaleLowerCase(C.language), counts = C.Storage.sessionCounts();
    const tasks = C.Tasks.filter(task => (libraryDomain === "all" || category(task) === libraryDomain) &&
      (!favoritesOnly || settings().favorites.includes(task.id)) &&
      (!query || `${C.t(task.nameKey)} ${C.t(task.descKey)} ${C.t(`domain.${task.domain}`)}`
        .toLocaleLowerCase(C.language).includes(query)));
    document.getElementById("task-list").innerHTML = tasks.length ? tasks.map(task => taskCard(task, counts)).join("") :
      `<div class="empty library-empty"><h2>${text("library.emptyTitle")}</h2><p>${text("library.emptyHelp")}</p>
      <button id="clear-library" class="secondary">${text("library.clear")}</button></div>`;
    document.getElementById("library-count").textContent = C.t("library.count", { count: C.number(tasks.length) });
    document.getElementById("clear-library")?.addEventListener("click", () => {
      libraryDomain = "all"; librarySearch = ""; favoritesOnly = false; library();
      document.getElementById("task-search").focus();
    });
  }
  function library() {
    app().innerHTML = `<section class="hero"><span class="eyebrow">${text("nav.library")}</span><h1>${text("library.title")}</h1>
      <p>${text("library.subtitle")}</p></section><div class="library-toolbar">
      <label class="field search-field"><span class="visually-hidden">${text("library.search")}</span>
      <input id="task-search" type="search" placeholder="${text("library.search")}" value="${esc(librarySearch)}"></label>
      ${modeButtons()}<button id="favorites-only" class="secondary" aria-pressed="${favoritesOnly}">${icon("star")}${text("library.saved")}</button></div>
      <div class="domain-filters" role="group" aria-label="${text("library.filter")}">${["all", "working-memory", "attention", "reasoning", "learning", "calibration"]
        .map(domain => `<button class="secondary ${domain === libraryDomain ? "selected" : ""}" data-domain="${domain}"
          aria-pressed="${domain === libraryDomain}">${text(domain === "all" ? "common.all" : `domain.${domain}`)}</button>`).join("")}</div>
      <div class="section-heading library-heading"><p class="muted">${text(`mode.${settings().mode}Help`)}</p>
      <span id="library-count" class="muted" role="status"></span></div><section class="cards" id="task-list"></section>`;
    libraryList();
    document.getElementById("task-search").oninput = event => { librarySearch = event.target.value; libraryList(); };
    document.getElementById("favorites-only").onclick = () => {
      favoritesOnly = !favoritesOnly; library(); document.getElementById("favorites-only").focus();
    };
  }
  function instructions(task, context = null) {
    selectedTask = task.id;
    if (task.renderView) { task.renderView(app()); return; }
    const q = context ? context.step.params : taskParams(task);
    const mode = context ? "training" : settings().mode;
    const next = mode === "assessment" ? cooldown(task.id) : null;
    const familiar = C.Routine.canSkipPractice(task, q, mode);
    const guide = task.id === "dual-nback" ? `guide.nback.${q.variant}` : `guide.${task.id}`;
    app().innerHTML = `${context ? `<div class="routine-banner"><a href="#home">${text("routine.title")}</a>
      <span>${text("routine.round", { current: C.number(context.index + 1), total: C.number(context.routine.steps.length) })}</span>
      <span>${text("mode.training")}</span></div>` : `<a class="back-link" href="#library">${text("runner.backLibrary")}</a>`}
      <section class="hero task-hero">${domainLabel(task)}<h1>${esc(taskTitle(task, q))}</h1><p>${text(task.descKey)}</p>
      ${!context ? modeButtons(mode) : ""}</section><section class="card instruction-card stack">
      <div class="section-heading"><h2>${text("runner.instructions")}</h2><span class="tag">${text("routine.approxMinutes",
        { count: C.number(C.Routine.estimateMinutes(task, q)) })}</span></div>
      <p class="guide">${text(guide, { n: C.number(q.n), operand: C.number(q.operand) })}</p>
      <div class="input-picker"><span>${text("results.input")}</span><div role="group" aria-label="${text("results.input")}">
      ${["keyboard", "touch", "mouse"].map(method => `<button class="secondary ${method === C.input ? "selected" : ""}" data-input="${method}"
        aria-pressed="${method === C.input}">${text(`input.${method}`)}</button>`).join("")}</div></div>
      <p class="key-map">${text(C.input === "keyboard" ? task.keyMapKey : `runner.${C.input}`)}</p>
      <p class="muted">${text(familiar ? "runner.familiar" : "runner.practiceIntro")}</p>
      ${mode === "assessment" ? `<p class="notice">${text("runner.noFeedback")}</p>` : ""}
      ${context ? `<p class="fine-print">${text("routine.profileNote")}</p>` : ""}
      ${task.id === "dual-nback" && ["dual", "audio"].includes(q.variant) ? `<div class="audio-check"><button type="button" id="preview-audio"
        class="secondary">${text("runner.previewAudio")}</button><p id="audio-preview-status" role="status">${text("runner.audioCheckHelp")}</p></div>` : ""}
      ${task.touchSupport === "degraded" && C.device() !== "desktop" ? `<details class="mobile-note"><summary>${text("runner.mobileNote")}</summary>
        <p>${text(`mobile.${task.id}`)}</p></details>` : ""}
      <details><summary>${text("runner.fullInstructions")}</summary><p class="prose">${text(task.instructionKey, task.instructionVars?.(q))}</p>
      <p class="muted">${text("runner.escape")}</p>${task.id === "dual-nback" && ["dual", "audio"].includes(q.variant) ?
        `<p>${text("runner.audioNote")}</p>` : ""}</details>
      <div class="actions"><button class="primary" id="${familiar ? "start-round" : "start-practice"}" ${next ? "disabled" : ""}>
      ${text(familiar ? "runner.startRound" : "runner.practice")}${icon("arrow")}</button>
      ${familiar ? `<button id="optional-practice" class="secondary">${text("runner.optionalPractice")}</button>` : ""}
      ${!context ? `<button class="secondary" id="task-settings">${text("settings.title")}</button>` :
        `<button class="secondary" id="skip-round">${text("routine.skip")}</button>`}</div>
      ${next ? `<p class="warning">${text("home.assessmentWait", { date: C.date(next) })}</p>` : ""}</section>`;
    const options = { mode, params: q, context };
    document.getElementById(familiar ? "start-round" : "start-practice").onclick = () => startPractice(task, { ...options, skip: familiar });
    document.getElementById("optional-practice")?.addEventListener("click", () => startPractice(task, options));
    document.getElementById("task-settings")?.addEventListener("click", () => openSettings(task.id));
    document.getElementById("skip-round")?.addEventListener("click", skipRound);
    document.getElementById("preview-audio")?.addEventListener("click", event => previewAudio(event, q));
  }
  function routineView() {
    const routine = C.Routine.current();
    if (!routine) { home(); return; }
    const next = C.Routine.next(routine);
    if (next) instructions(next.task, next);
    else {
      const sessions = C.Storage.getSessions().filter(session => session.routineId === routine.id && C.completedRound(session));
      app().innerHTML = `<section class="hero"><span class="eyebrow">${text("routine.finishedEyebrow")}</span><h1>${text("routine.finishedTitle")}</h1>
        <p>${text("routine.finishedHelp")}</p></section><section class="card routine-card">
        <div class="metrics"><div class="metric"><strong>${C.number(routine.steps.filter(step => step.sessionId).length)}</strong>
        <span>${text("routine.completedRounds")}</span></div><div class="metric"><strong>${durationLabel(sessions.reduce((sum, session) =>
          sum + session.durationMs, 0))}</strong><span>${text("routine.timePracticed")}</span></div></div>${planHTML(routine)}
        <div class="actions"><a href="#results" class="button primary">${text("routine.viewProgress")}</a>
        <a href="#home" class="button secondary">${text("routine.returnHome")}</a></div></section>`;
    }
  }
  function skipRound() {
    C.Routine.skip(); routineView(); app().focus({ preventScroll: true });
  }
  function running(on) {
    document.getElementById("runner").hidden = !on;
    document.documentElement.classList.toggle("running", on);
    document.body.classList.toggle("running", on);
    if (on) document.getElementById("stage").focus({ preventScroll: true });
  }
  async function previewAudio(event, q) {
    if (C.starting || C.active) return;
    C.starting = true;
    const button = event.currentTarget, status = document.getElementById("audio-preview-status");
    button.disabled = true; status.textContent = C.t("runner.audioLoading");
    try {
      if (!await C.Audio.unlock(C.language, q.audioStimuli)) throw new Error("runner.unsupportedAudio");
      await C.Audio.play(C.Audio.prepare([5], C.language, q.audioStimuli)[0], {});
      status.textContent = C.t("runner.audioPreviewDone");
    } catch (error) {
      if (error.name !== "AbortError") {
        console.warn("Audio preview failed:", error);
        status.textContent = C.t(error.message === "runner.unsupportedAudio" ? error.message : "audio.failed");
      }
    } finally { C.starting = false; button.disabled = false; }
  }
  async function acquireScreen(ctx) {
    if (ctx.signal.aborted) return;
    if (settings().fullscreen && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen(); ctx.fullscreenEntered = true; }
      catch (error) { console.info("Fullscreen unavailable:", error.name); }
    }
    if (!ctx.signal.aborted && "wakeLock" in navigator) {
      try { ctx.wakeLock = await navigator.wakeLock.request("screen"); }
      catch (error) { console.info("Wake lock unavailable:", error.name); }
    }
    if (ctx.signal.aborted) await releaseScreen(ctx);
  }
  async function releaseScreen(ctx) {
    const lock = ctx.wakeLock;
    ctx.wakeLock = null;
    if (lock && !lock.released) await lock.release().catch(error => console.warn("Wake lock release failed:", error));
    if (ctx.fullscreenEntered && document.fullscreenElement) {
      await document.exitFullscreen().catch(error => console.warn("Fullscreen exit failed:", error));
    }
    ctx.fullscreenEntered = false;
  }
  function updateRunner(ctx) {
    document.getElementById("runner-task-label").textContent = taskTitle(ctx.task, ctx.params);
    document.getElementById("stage").setAttribute("aria-label", C.t("runner.exerciseCanvas", { name: taskTitle(ctx.task, ctx.params) }));
    const count = ctx.phase === "practice" ? C.practiceCount(ctx.practiceTrials) + 1 : ctx.trials.length + 1;
    document.getElementById("runner-phase").textContent = ctx.phase === "practice" ? C.t("runner.practiceProgress", { count: C.number(count) }) :
      ctx.routineId ? C.t("routine.round", { current: C.number(ctx.routineStep + 1), total: C.number(C.Routine.current()?.steps.length || 0) }) :
        C.t(`mode.${ctx.mode}`);
  }
  async function startPractice(task, options = {}) {
    if (C.active || C.starting) return;
    if (task.kind === "journal") { instructions(task); return; }
    const mode = options.mode || settings().mode, q = C.clone(options.params || taskParams(task));
    if (mode === "assessment" && (!task.supportsAssessment || cooldown(task.id))) { instructions(task); return; }
    const error = C.parameterError(task, q);
    if (error) { C.notice(error); return; }
    const version = startVersion;
    const skip = Boolean(options.skip) && C.Routine.canSkipPractice(task, q, mode);
    let ctx;
    C.starting = true;
    try {
      if (!C.Timing.refreshHz) await (C.Timing.ready || C.Timing.measure());
      if (version !== startVersion) return;
      if (task.id === "dual-nback" && ["dual", "audio"].includes(q.variant) &&
        !await C.Audio.unlock(C.language, q.audioStimuli)) { C.notice("runner.unsupportedAudio"); return; }
      if (version !== startVersion) return;
      running(true);
      document.getElementById("runner-message").textContent = "";
      ctx = new C.Runner(task, q, mode, C.language, C.input);
      C.active = ctx;
      ctx.phase = skip ? "between" : "practice";
      ctx.practiceSkipped = skip;
      if (options.context) { ctx.routineId = options.context.routine.id; ctx.routineStep = options.context.index; }
      document.getElementById("runner-description").textContent =
        `${C.t(task.instructionKey, task.instructionVars?.(q))} ${C.t(task.keyMapKey)}`;
      updateRunner(ctx);
      C.starting = false;
      if (skip) { await runMain(ctx); return; }
      await acquireScreen(ctx);
      ctx.check();
      await task.run(ctx);
      ctx.check(); ctx.phase = "between"; ctx.states.clear();
      C.Routine.recordPractice(ctx);
      await releaseScreen(ctx); running(false);
      const accuracy = S.accuracy(S.exclude(ctx.practiceTrials));
      app().innerHTML = `<section class="card practice-complete stack"><span class="eyebrow">${esc(taskTitle(task, q))}</span>
        <h1>${text("runner.practiceDone")}</h1><p>${text("runner.practiceCount", { count: C.number(C.practiceCount(ctx.practiceTrials)) })}</p>
        <p class="muted">${text("runner.practiceScore", { value: C.metric("accuracy", accuracy) })}</p>
        <p>${text(mode === "assessment" ? "runner.noFeedback" : "runner.readyHelp")}</p>
        <div class="actions"><button class="primary" id="start-main">${text("runner.startBlock")}${icon("arrow")}</button>
        <button class="secondary" id="review-instructions">${text("runner.reviewInstructions")}</button></div></section>`;
      app().focus({ preventScroll: true });
      document.getElementById("start-main").onclick = () => runMain(ctx);
      document.getElementById("review-instructions").onclick = async () => {
        ctx.navigateTo = options.context ? "routine" : `task/${task.id}`; ctx.abort(); await finish(ctx);
      };
    } catch (exception) {
      if (ctx) await handleRunError(ctx, exception);
      else { console.error("Task setup failed:", exception); running(false); C.notice("runner.failure"); }
    } finally { C.starting = false; }
  }
  async function runMain(ctx) {
    if (ctx.phase !== "between" || C.starting || ctx.signal.aborted) return;
    if (ctx.mode === "assessment" && C.practiceCount(ctx.practiceTrials) < 8) {
      C.notice("runner.practiceRequired"); return;
    }
    C.starting = true;
    try {
      if (ctx.task.id === "dual-nback" && ["dual", "audio"].includes(ctx.params.variant) &&
        !await C.Audio.unlock(ctx.language, ctx.params.audioStimuli, true)) { C.notice("runner.unsupportedAudio"); return; }
      if (ctx.signal.aborted) return;
      running(true); await acquireScreen(ctx);
      if (ctx.signal.aborted || ctx.finished) return;
      ctx.resize();
      ctx.orientation = screen.orientation?.type || (innerWidth > innerHeight ? "landscape" : "portrait");
      ctx.phase = "block"; ctx.mainStartTime = C.now(); ctx.mainStartedAt = C.iso();
      ctx.invalid = false; ctx.reasons = []; ctx.frameCount = 0; ctx.frameDuration = 0; ctx.minimumRefreshHz = ctx.refreshHz;
      document.getElementById("runner-message").textContent = "";
      if (ctx.refreshHz < 50) ctx.invalidate("runner.refresh");
      updateRunner(ctx); C.starting = false;
      ctx.extra = await ctx.task.run(ctx);
      ctx.completedMain = true;
      await finish(ctx);
    } catch (error) { await handleRunError(ctx, error); }
    finally { C.starting = false; }
  }
  async function handleRunError(ctx, error) {
    if (error.name !== "AbortError") {
      console.error("Task failed:", error);
      ctx.invalidate("runner.failure");
    }
    await finish(ctx);
  }
  function finish(ctx) {
    if (ctx.finishPromise) return ctx.finishPromise;
    ctx.finished = true; ctx.phase = "finished"; ctx.controller.abort();
    ctx.finishPromise = (async () => {
      const trials = S.exclude(ctx.trials), practiceOnly = ctx.mainStartTime === undefined;
      let score;
      try { score = { ...ctx.task.score(trials, ctx.params), ...ctx.extra?.score }; }
      catch (error) { console.error("Task scoring failed:", error); ctx.invalidate("runner.failure"); score = {}; }
      score.excluded = trials.filter(trial => trial.excluded).length;
      const summary = {
        id: C.uid(), taskId: ctx.task.id, mode: ctx.mode, startedAt: ctx.mainStartedAt || ctx.startedAt,
        durationMs: C.now() - (ctx.mainStartTime ?? ctx.startTime), params: ctx.params, language: ctx.language,
        deviceClass: ctx.deviceClass, inputMethod: ctx.input, refreshHz: ctx.refreshHz, viewport: ctx.viewport,
        invalid: ctx.invalid || practiceOnly || !ctx.completedMain, invalidReasons: ctx.reasons, score,
        practiceOnly, practiceCompleted: Boolean(ctx.practiceCompleted), practiceSkipped: Boolean(ctx.practiceSkipped),
        completedMain: Boolean(ctx.completedMain),
        practiceCount: C.practiceCount(ctx.practiceTrials), splitHalf: S.splitHalf(trials),
        stimulusSet: ctx.extra?.stimulusSet || (ctx.task.id === "dual-nback" && ["dual", "audio"].includes(ctx.params.variant) ?
          C.Audio.stimulusSet : "visual"),
        mobileLimitations: ctx.deviceClass !== "desktop" && ctx.task.touchSupport === "degraded" ? [`mobile.${ctx.task.id}`] : [],
        minimumRefreshHz: ctx.minimumRefreshHz ?? ctx.refreshHz,
        processingDeadlineMs: ctx.extra?.processingDeadlineMs ?? null, protocolVersion: 2,
        ...(ctx.routineId ? { routineId: ctx.routineId, routineStep: ctx.routineStep } : {})
      };
      const nextSettings = settings();
      if (!summary.invalid && ctx.mode === "training") for (const entry of ctx.states.values()) nextSettings.staircases[entry.key] = entry.state;
      C.Storage.appendSession(summary, [
        ...ctx.practiceTrials.map(row => ({ ...row, phase: "practice" })), ...trials.map(row => ({ ...row, phase: "main" }))
      ], { settings: nextSettings, routine: C.Routine.withSession(summary), itemHashes: ctx.itemHashes });
      try { await ctx.close(); await releaseScreen(ctx); }
      finally { if (C.active === ctx) C.active = null; running(false); }
      selectedTask = ctx.task.id; filterDevice = ctx.deviceClass; filterInput = ctx.input; historyMode = ctx.mode;
      const route = ctx.navigateTo || sessionRoute(summary.id);
      if (location.hash !== `#${route}`) location.hash = route;
      else render(true);
      return summary;
    })();
    return ctx.finishPromise;
  }
  const metricsHTML = (score, keys = Object.keys(score)) => `<div class="metrics">${keys.filter(key =>
    key !== "ssrtReasonKey" && (typeof score[key] === "number" || score[key] === null)).map(key =>
      `<div class="metric"><strong>${esc(C.metric(key, score[key]))}</strong><span>${text(`score.${key}`)}</span></div>`).join("")}</div>
      ${score.ssrtReasonKey ? `<p class="notice">${text(score.ssrtReasonKey)}</p>` : ""}`;
  function sessionView(id) {
    const session = C.Storage.getSessions().find(row => row.id === id);
    if (!session) { notFound(); return; }
    const task = taskById(session.taskId);
    const routine = C.Routine.current(), inRoutine = routine?.id === session.routineId;
    const next = inRoutine ? C.Routine.next(routine) : null;
    const primary = task?.primaryMetric, mainKeys = [...new Set([primary, "accuracy", "correct"].filter(key => key in session.score))];
    const completed = C.completedRound(session);
    const title = session.practiceOnly ? "runner.practiceSaved" : !completed ? "runner.interruptedTitle" : "runner.complete";
    app().innerHTML = `<section class="hero completion-hero"><span class="eyebrow">${task ? esc(taskTitle(task, session.params)) : esc(session.taskId)}</span>
      <h1>${text(title)}</h1><p>${text(session.practiceOnly ? "runner.practiceSavedHelp" : !completed ?
        "runner.interruptedHelp" : "runner.completeHelp")}</p></section><section class="card completion-card">
      ${(session.invalid && completed ? ["runner.completedWithTiming"] : session.invalidReasons || [])
        .map(key => `<p class="notice warning">${text(key)}</p>`).join("")}
      ${!session.practiceOnly ? metricsHTML(session.score, mainKeys) : ""}
      <p class="muted">${esc(C.date(session.startedAt))} · ${text(`mode.${session.mode}`)} · ${durationLabel(session.durationMs)}</p>
      <p class="fine-print">${text(C.Storage.pending ? "data.pending" : "runner.recorded")}</p>
      <div class="actions">${inRoutine ? !completed ? `<a class="button primary" href="#routine">${text("runner.retry")}</a>
        <button class="secondary" id="skip-round">${text("routine.skip")}</button>` :
        `<a class="button primary" href="#routine">${text(next ? "routine.next" : "routine.finish")}${icon("arrow")}</a>` :
        task ? `<a class="button primary" href="#task/${task.id}">${text(!completed ? "runner.retry" : "runner.again")}</a>` : ""}
      <a class="button secondary" href="#${inRoutine ? "home" : "results"}">${text(inRoutine ? "routine.saveExit" : "routine.viewProgress")}</a></div>
      <details class="result-detail"><summary>${text("results.details")}</summary>${metricsHTML(session.score)}
      <p class="muted">${text("results.excluded", { count: C.number(session.score.excluded || 0) })}</p>
      <p>${text(C.Storage.getTrials(id).length ? "results.retained" : "results.noTrials")}</p>
      <pre>${esc(JSON.stringify(session, null, 2))}</pre></details></section>`;
    document.getElementById("skip-round")?.addEventListener("click", () => { C.Routine.skip(); location.hash = "routine"; });
  }
  const seriesKey = (task, session) => C.canonical({
    params: session.params, device: session.deviceClass, input: session.inputMethod,
    language: task.languageDependent ? session.language : "neutral", stimulusSet: session.stimulusSet,
    protocol: session.protocolVersion || 1, orientation: C.layoutOrientation(session.viewport)
  });
  C.seriesKey = seriesKey;
  function chart(task, mode, metric) {
    const metrics = Array.isArray(metric) ? metric : [metric];
    const all = C.Storage.getSessions(task.id).filter(session => !session.practiceOnly);
    const rows = all.filter(session => session.mode === mode && !session.invalid &&
      (overlay || session.deviceClass === filterDevice && session.inputMethod === filterInput)).slice(0, 240).reverse()
      .flatMap(row => metrics.filter(key => Number.isFinite(row.score[key]))
        .map(key => ({ ...row, plottedMetric: key, plottedValue: row.score[key] })));
    const title = metrics.map(key => C.t(`score.${key}`)).join(" / ");
    if (!rows.length) return `<article class="card chart-card"><h3>${esc(title)}</h3><p class="muted">${text("results.empty")}</p></article>`;
    const groups = new Map();
    for (const row of rows) {
      const key = `${row.plottedMetric}|${seriesKey(task, row)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const values = rows.map(row => row.plottedValue), min = Math.min(...values), max = Math.max(...values);
    const pad = max === min ? Math.max(Math.abs(min) * .1, .5) : (max - min) * .12;
    const ratio = C.metric(metrics[0], 1) === "100%";
    const yMin = ratio ? 0 : min - pad, yMax = ratio ? 1 : max + pad;
    const width = Math.max(240, Math.min(640, innerWidth - (innerWidth < 680 ? 72 : 128)));
    const plotW = width - 88, plotH = 168;
    const times = rows.map(row => Date.parse(row.startedAt)), xMin = Math.min(...times), xMax = Math.max(...times);
    const x = row => 64 + (xMax === xMin ? .5 : (Date.parse(row.startedAt) - xMin) / (xMax - xMin)) * plotW;
    const y = value => 20 + plotH - (value - yMin) / (yMax - yMin) * plotH;
    let svg = `<svg viewBox="0 0 ${width} 240" role="img" aria-label="${esc(title)}">`;
    for (let index = 0; index < 5; index++) {
      const value = yMin + (yMax - yMin) * index / 4;
      svg += `<line x1="64" x2="${width - 24}" y1="${y(value)}" y2="${y(value)}" stroke="var(--cp-border)"/>
        <text x="54" y="${y(value) + 4}" text-anchor="end">${esc(C.metric(metrics[0], value))}</text>`;
    }
    const legend = [];
    let index = 0;
    for (const group of groups.values()) {
      const sample = group[0], other = sample.deviceClass !== filterDevice || sample.inputMethod !== filterInput;
      const color = ["--cp-accent", "--cp-link", "--cp-success", "--cp-text-soft"][index % 4];
      const label = `${C.t("results.series")} ${++index} · ${C.t(`score.${sample.plottedMetric}`)} · ${C.t(`device.${sample.deviceClass}`)} /
        ${C.t(`input.${sample.inputMethod}`)} · ${C.t(`layout.${C.layoutOrientation(sample.viewport)}`)}${task.languageDependent ? ` · ${sample.language.toUpperCase()}` : ""}`;
      svg += `<polyline fill="none" stroke="var(${color})" opacity="${other ? .45 : 1}" stroke-width="2"
        points="${group.map(row => `${x(row)},${y(row.plottedValue)}`).join(" ")}"/>`;
      for (const row of group) svg += `<circle cx="${x(row)}" cy="${y(row.plottedValue)}" r="4" fill="var(${color})">
        <title>${esc(`${C.date(row.startedAt)} · ${label} · ${C.metric(row.plottedMetric, row.plottedValue)}`)}</title></circle>`;
      legend.push(`<li><span class="series-key" style="--cp-series-color:var(${color})">${esc(label)}</span><details><summary>${text("results.parameters")}</summary>
        <code>${esc(C.canonical(sample.params))}</code><p>${text("results.stimulusSet")}: ${text(`stimulus.${sample.stimulusSet}`)}</p>
        <p>${text("results.protocolVersion", { count: C.number(sample.protocolVersion || 1) })}</p></details></li>`);
    }
    svg += `<text x="64" y="216">${esc(C.dayLabel(xMin))}</text><text x="${width - 24}" y="216" text-anchor="end">${esc(C.dayLabel(xMax))}</text></svg>`;
    return `<article class="card chart-card"><h3>${esc(title)}</h3><div class="chart-scroll">${svg}</div>
      <ul class="chart-legend">${legend.join("")}</ul></article>`;
  }
  function filterBar(includeOverlay = true) {
    return `<div class="toolbar"><label class="field">${text("results.task")}${taskSelect("result-task")}</label>
      <details class="comparison-filters"><summary>${text("results.setup")}</summary><div class="settings-grid">
      <label class="field">${text("results.device")}<select id="filter-device">${["desktop", "tablet", "phone"].map(value =>
        `<option value="${value}" ${value === filterDevice ? "selected" : ""}>${text(`device.${value}`)}</option>`).join("")}</select></label>
      <label class="field">${text("results.input")}<select id="filter-input">${["keyboard", "touch", "mouse"].map(value =>
        `<option value="${value}" ${value === filterInput ? "selected" : ""}>${text(`input.${value}`)}</option>`).join("")}</select></label></div>
      ${includeOverlay ? `<label class="inline"><input id="overlay" type="checkbox" ${overlay ? "checked" : ""}>${text("results.overlay")}</label>` : ""}
      <p class="fine-print">${text("results.parameterNote")}</p></details></div>`;
  }
  function bindFilters(fn) {
    for (const [id, update] of [["result-task", value => { selectedTask = value; historyPage = 0; }],
      ["filter-device", value => { filterDevice = value; historyPage = 0; }], ["filter-input", value => { filterInput = value; historyPage = 0; }]]) {
      document.getElementById(id).onchange = event => { update(event.target.value); fn(); document.getElementById(id).focus(); };
    }
    document.getElementById("overlay")?.addEventListener("change", event => { overlay = event.target.checked; historyPage = 0; fn(); });
  }
  function results() {
    const sessions = C.Storage.getSessions(), activity = weeklyActivity(sessions);
    const task = taskById(selectedTask)?.kind !== "journal" && taskById(selectedTask) || C.Tasks.find(entry => entry.kind !== "journal");
    selectedTask = task.id;
    const rows = sessions.filter(session => session.taskId === task.id && session.mode === historyMode &&
      (overlay || session.deviceClass === filterDevice && session.inputMethod === filterInput));
    const pageSize = 20;
    historyPage = Math.min(historyPage, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
    const page = rows.slice(historyPage * pageSize, (historyPage + 1) * pageSize);
    const metrics = task.metrics || [task.primaryMetric];
    const charts = task.combineMetrics ? chart(task, historyMode, metrics) : metrics.map(metric => chart(task, historyMode, metric)).join("");
    app().innerHTML = `<section class="hero"><span class="eyebrow">${text("nav.results")}</span><h1>${text("results.title")}</h1>
      <p>${text("results.subtitle")}</p></section><section class="card progress-overview"><div>
      <h2>${text("home.practiceDays", { count: C.number(activity.count) })}</h2><p class="muted">${text("home.week")}</p></div>${weekHTML(activity)}</section>
      ${!sessions.length ? `<section class="empty"><h2>${text("results.firstTitle")}</h2><p>${text("results.firstHelp")}</p>
        <a href="#home" class="button primary">${text("routine.start")}</a></section>` : `${filterBar()}${modeButtons(historyMode, "data-history-mode")}
      ${task.languageDependent ? `<p class="fine-print">${text("results.languageNote")}</p>` : ""}
      ${overlay ? `<p class="notice warning">${text("results.notComparable")}</p>` : ""}
      ${task.id === "ufov" ? `<details><summary>${text("results.thresholdHelp")}</summary><p>${text("results.thresholdNote")}</p></details>` : ""}
      <div class="stack">${charts}</div><p class="fine-print">${text("results.chartLimit")}</p>
      <section class="card history-card"><div class="section-heading"><h2 id="history-heading" tabindex="-1">${text("results.history")}</h2><span class="muted">${text("library.roundCount",
        { count: C.number(rows.length) })}</span></div><div class="table-scroll"><table class="responsive-table" role="table"><thead><tr>
      ${["results.date", "results.mode", "results.score", "results.duration", "results.validity", "results.details"]
        .map(key => `<th scope="col">${text(key)}</th>`).join("")}</tr></thead><tbody>${page.map(row => `<tr>
      <td data-label="${text("results.date")}">${esc(C.date(row.startedAt))}</td>
      <td data-label="${text("results.mode")}">${text(`mode.${row.mode}`)}</td>
      <td data-label="${text("results.score")}">${esc(row.practiceOnly ? C.t("common.noValue") : C.metric(task.primaryMetric, row.score[task.primaryMetric]))}</td>
      <td data-label="${text("results.duration")}">${durationLabel(row.durationMs)}</td>
      <td data-label="${text("results.validity")}"><span class="tag">${text(row.practiceOnly ? "results.practice" : row.invalid ? "results.invalid" : "results.valid")}</span></td>
      <td data-label="${text("results.details")}"><a class="button secondary" href="#${sessionRoute(row.id)}">${text("results.details")}</a></td></tr>`).join("")}
      </tbody></table></div>${!rows.length ? `<p class="muted">${text("results.empty")}</p>` : ""}
      ${rows.length > pageSize ? `<div class="actions"><button id="history-prev" class="secondary" ${historyPage === 0 ? "disabled" : ""}>${text("forecast.previous")}</button>
      <span>${text("forecast.pagination", { from: C.number(historyPage * pageSize + 1), to: C.number(Math.min(rows.length, (historyPage + 1) * pageSize)),
        total: C.number(rows.length) })}</span><button id="history-next" class="secondary" ${(historyPage + 1) * pageSize >= rows.length ? "disabled" : ""}>${text("forecast.next")}</button></div>` : ""}</section>`}`;
    if (sessions.length) bindFilters(results);
    document.getElementById("history-prev")?.addEventListener("click", () => { historyPage--; results(); document.getElementById("history-heading").focus(); });
    document.getElementById("history-next")?.addEventListener("click", () => { historyPage++; results(); document.getElementById("history-heading").focus(); });
  }
  function reliability() {
    const task = taskById(selectedTask)?.kind !== "journal" && taskById(selectedTask) || C.Tasks.find(entry => entry.kind !== "journal");
    selectedTask = task.id;
    const rows = C.Storage.getSessions(task.id).filter(session => !session.invalid && !session.practiceOnly &&
      session.deviceClass === filterDevice && session.inputMethod === filterInput).reverse(), groups = new Map();
    for (const row of rows) {
      const key = `${row.mode}|${seriesKey(task, row)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const cards = [...groups.values()].map((group, index) => {
      const halves = group.map(session => session.splitHalf).filter(Number.isFinite), last = group.at(-1);
      const assessments = group.filter(session => session.mode === "assessment" && Number.isFinite(session.score[task.primaryMetric]));
      const retest = assessments.length >= 4 ? S.correlation(assessments.slice(0, -1).map(session => session.score[task.primaryMetric]),
        assessments.slice(1).map(session => session.score[task.primaryMetric])) : null;
      const values = [last.splitHalf, S.median(halves), retest], low = values.some(value => Number.isFinite(value) && value < .7);
      return `<article class="card"><h3>${text("results.series")} ${index + 1} · ${text(`mode.${last.mode}`)} · ${last.language.toUpperCase()}</h3>
        <div class="metrics">${["reliability.splitHalf", "reliability.runningMedian", "reliability.retest"].map((key, position) =>
          `<div class="metric"><strong>${esc(C.number(values[position]))}</strong><span>${text(key)}</span></div>`).join("")}</div>
        ${low ? `<p class="notice warning">${text("reliability.warning")}</p>` : ""}${values.some(value => !Number.isFinite(value)) ?
          `<p class="muted">${text("reliability.needData")}</p>` : ""}
        <details><summary>${text("results.parameters")}</summary><code>${esc(C.canonical(last.params))}</code></details></article>`;
    });
    app().innerHTML = `<section class="hero"><h1>${text("reliability.title")}</h1><p>${text("reliability.subtitle")}</p></section>
      ${filterBar(false)}<p class="notice">${text("reliability.deviceNote")}</p><div class="stack">${cards.join("") ||
        `<p class="empty">${text("reliability.needData")}</p>`}</div><section class="card prose"><h2>${text("about.reliability")}</h2>
      <p>${text("reliability.method")}</p></section>`;
    bindFilters(reliability);
  }
  function exportCSV() {
    const keys = ["id", "taskId", "mode", "startedAt", "durationMs", "language", "deviceClass", "inputMethod", "refreshHz", "viewport",
      "invalid", "invalidReasons", "practiceOnly", "completedMain", "practiceCount", "protocolVersion", "routineId", "params", "score"];
    C.download(`cortex-${C.iso().slice(0, 10)}.csv`, "\ufeff" + [keys.map(C.csvCell).join(","),
      ...C.Storage.getSessions().map(row => keys.map(key => C.csvCell(row[key])).join(","))].join("\r\n"), "text/csv;charset=utf-8");
  }
  function dataView() {
    const snapshot = C.Storage.snapshot(), count = Object.values(snapshot.trials).reduce((sum, rows) => sum + rows.length, 0);
    app().innerHTML = `<section class="hero"><h1>${text("data.title")}</h1><p>${text("data.subtitle")}</p></section>
      <section class="card stack"><h2>${text("data.backupTitle")}</h2><div class="metrics"><div class="metric"><strong>${C.number(snapshot.sessions.length)}</strong>
      <span>${text("data.sessions")}</span></div><div class="metric"><strong>${C.number(count)}</strong><span>${text("data.rawRows")}</span></div>
      <div class="metric"><strong>${C.number(new Blob([JSON.stringify(snapshot)]).size / 1024)} KB</strong><span>${text("data.size")}</span></div></div>
      ${C.Storage.pending ? `<p class="notice warning">${text("data.pending")}</p>` : ""}
      <div class="actions"><button id="export-json" class="primary">${text("data.exportJSON")}</button><button id="export-csv" class="secondary">${text("data.exportCSV")}</button>
      ${C.Storage.hasUnreadableOriginal ? `<button id="export-original">${text("data.exportOriginal")}</button>` : ""}</div>
      <p class="fine-print">${text("data.backupHelp")}</p></section>
      <section class="card stack"><h2>${text("data.import")}</h2><p class="muted">${text("data.importHelp")}</p>
      <label class="field">${text("data.import")}<input id="import-file" type="file" accept=".json,application/json"></label>
      <p id="import-status" role="status" tabindex="-1"></p></section>
      <details class="data-management"><summary>${text("data.manage")}</summary><div class="stack">
      <section class="stack"><h2>${text("data.prune")}</h2><p>${text("data.pruneHelp")}</p><button id="prune-data" class="secondary">${text("data.prune")}</button></section>
      <form id="wipe-form" class="stack"><h2>${text("data.wipe")}</h2><p>${text("data.wipeHelp")}</p>
      <label class="field">${text("data.confirmLabel")}<input id="wipe-confirm" autocomplete="off" spellcheck="false" required></label>
      <button class="danger" type="submit">${text("data.wipe")}</button><p id="wipe-error" role="alert"></p></form></div></details>`;
    document.getElementById("export-json").onclick = () => C.Storage.exportAll();
    document.getElementById("export-csv").onclick = exportCSV;
    document.getElementById("export-original")?.addEventListener("click", () => C.Storage.exportOriginal());
    document.getElementById("import-file").onchange = async event => {
      const file = event.target.files[0]; if (!file) return;
      event.target.disabled = true;
      try {
        const report = await C.Storage.importAll(file);
        if (!report.localSettingsKept) {
          const latest = C.Storage.getSessions(null, {}, 1)[0];
          if (latest) { selectedTask = latest.taskId; historyMode = latest.mode; }
          historyPage = 0;
        }
        syncPreferences(); header(); dataView();
        document.getElementById("import-status").textContent = C.t("data.imported", report) + " " + C.t("forecast.imported", report);
        document.getElementById("import-status").focus();
        if (!report.saved) C.notice("data.pending");
      } catch (error) {
        console.warn("Import rejected:", error);
        document.getElementById("import-status").textContent = C.t(/^(data|forecast)\./.test(error.message) ? error.message : "data.invalid");
        event.target.disabled = false; event.target.value = "";
      }
    };
    document.getElementById("prune-data").onclick = () => {
      if (!confirm(C.t("data.pruneConfirm"))) return;
      const saved = C.Storage.prune(); dataView(); C.notice(saved ? "data.pruned" : "data.pending");
    };
    document.getElementById("wipe-form").onsubmit = event => {
      event.preventDefault();
      try {
        const saved = C.Storage.wipe(document.getElementById("wipe-confirm").value);
        C.Tasks.forEach(task => task.onWipe?.()); selectedTask = "dual-nback"; historyPage = 0;
        syncPreferences(); render(); C.notice(saved ? "data.wiped" : "data.pending");
      } catch (error) { document.getElementById("wipe-error").textContent = C.t(error.message); }
    };
  }
  function about() {
    app().innerHTML = `<section class="hero"><h1>${text("about.title")}</h1><p>${text("app.localOnly")}</p></section>
      <section class="card prose">${["evidence", "ufov", "measurement", "modes", "reliability", "devices", "limitations", "privacy", "tierTwo"].map(key =>
        `<h2>${text(`about.${key}`)}</h2><p>${text(`about.${key}Text`)}</p>`).join("")}</section>`;
  }
  function openPreferences(event) {
    if (C.active || C.starting) return;
    const dialog = document.getElementById("preferences-dialog"), form = document.getElementById("preferences-form"), value = settings();
    form.innerHTML = `<fieldset class="stack"><legend>${text("routine.title")}</legend><div class="settings-grid">
      <label class="field">${text("preferences.budget")}<select name="routineMinutes">${[10, 15, 20].map(count =>
        `<option value="${count}" ${count === value.routineMinutes ? "selected" : ""}>${minutes(count)}</option>`).join("")}</select></label>
      <label class="field">${text("preferences.warmup")}<select name="warmupPolicy">${["familiar", "always"].map(policy =>
        `<option value="${policy}" ${value.warmupPolicy === policy ? "selected" : ""}>${text(`preferences.warmup.${policy}`)}</option>`).join("")}</select></label>
      </div><p class="fine-print">${text("preferences.protocolNote")}</p></fieldset>
      <div class="settings-grid"><label class="field">${text("settings.language")}<select id="language" name="language">
      ${["en", "de"].map(language => `<option value="${language}" ${C.language === language ? "selected" : ""}>
        ${text(language === "en" ? "settings.english" : "settings.german")}</option>`).join("")}</select></label>
      <label class="field">${text("preferences.theme")}<select name="theme">${["system", "light", "dark"].map(theme =>
        `<option value="${theme}" ${value.theme === theme ? "selected" : ""}>${text(`preferences.theme.${theme}`)}</option>`).join("")}</select></label>
      <label class="field">${text("preferences.input")}<select name="inputMethod">${["auto", "keyboard", "touch", "mouse"].map(method =>
        `<option value="${method}" ${(value.inputMethod || "auto") === method ? "selected" : ""}>
        ${text(method === "auto" ? "preferences.input.auto" : `input.${method}`)}</option>`).join("")}</select></label></div>
      <label class="inline"><input name="fullscreen" type="checkbox" ${value.fullscreen ? "checked" : ""}>${text("preferences.fullscreen")}</label>
      <label class="inline"><input name="vibration" type="checkbox" ${value.vibration ? "checked" : ""}>${text("settings.vibration")}</label>
      <details><summary>${text("pwa.title")}</summary><p>${text("pwa.installHelp")}</p>
      ${C.PWA.installable && !C.PWA.standalone ? `<button type="button" id="install-app" class="secondary">${text("pwa.install")}</button>` : ""}
      <p class="fine-print">${text("pwa.originNote")}</p></details><div class="actions">
      <button class="primary" type="submit">${text("preferences.save")}</button>
      <a class="button secondary" id="preferences-data" href="#data">${text("data.backupLink")}</a></div>`;
    document.getElementById("preferences-data").onclick = () => { dialogOpeners.delete(dialog); dialog.close(); };
    document.getElementById("install-app")?.addEventListener("click", async () => {
      try { await C.PWA.install(); } catch (error) { console.warn("Install prompt failed:", error); C.notice("pwa.failed"); }
    });
    form.onsubmit = event => {
      event.preventDefault();
      const next = Object.fromEntries(["language", "theme", "warmupPolicy", "inputMethod"].map(key => [key, form.elements.namedItem(key).value]));
      next.routineMinutes = Number(form.elements.namedItem("routineMinutes").value);
      next.fullscreen = form.elements.namedItem("fullscreen").checked; next.vibration = form.elements.namedItem("vibration").checked;
      C.language = next.language;
      const saved = C.Storage.setSettings(next);
      syncPreferences(); dialog.close(); render(); C.notice(saved ? "settings.saved" : "data.pending");
    };
    showDialog(dialog, event?.currentTarget || document.getElementById("open-settings"));
  }
  function closeSettings() {
    const form = document.getElementById("settings-form");
    if (form.dataset.dirty === "true" && !confirm(C.t("settings.discard"))) return false;
    document.getElementById("settings-dialog").close(); return true;
  }
  function openSettings(taskId = selectedTask) {
    if (C.active || C.starting) return;
    const dialog = document.getElementById("settings-dialog"), form = document.getElementById("settings-form");
    const task = taskById(taskId) || C.Tasks[0], values = taskParams(task);
    form.dataset.dirty = "false";
    form.innerHTML = `<p class="muted">${text("settings.seriesBreak")}</p><label class="field">${text("settings.task")}
      ${taskSelect("settings-task", task.id, true)}</label><div class="settings-grid">${Object.entries(task.paramSchema).map(([key, schema]) =>
      `<label class="field parameter">${text(`param.${key}`)}${schema.type === "text" ?
        `<textarea name="${key}" rows="${schema.rows || 3}" maxlength="${schema.maxLength}">${esc(values[key])}</textarea>` :
        schema.choices ? `<select name="${key}">${schema.choices.map(value =>
          `<option value="${value}" ${values[key] === value ? "selected" : ""}>${text(`choice.${value}`)}</option>`).join("")}</select>` :
          `<input name="${key}" type="number" value="${values[key]}" min="${schema.min}" max="${schema.max}" step="${schema.step}" required>`}
      <small>${text("settings.defaults", { value: schema.type === "text" ? schema.value || C.t("common.none") :
        schema.choices ? C.t(`choice.${schema.value}`) : C.number(schema.value) })}</small></label>`).join("")}</div>
      <p id="settings-error" class="notice warning" role="alert" tabindex="-1" hidden></p><div class="actions">
      <button class="primary" type="submit">${text("common.save")}</button><button id="reset-params" type="button" class="secondary">${text("settings.reset")}</button></div>`;
    document.getElementById("settings-task").onchange = event => {
      if (form.dataset.dirty === "true" && !confirm(C.t("settings.discard"))) { event.target.value = task.id; return; }
      openSettings(event.target.value);
      document.getElementById("settings-task").focus();
    };
    form.oninput = () => { form.dataset.dirty = "true"; document.getElementById("settings-error").hidden = true; };
    document.getElementById("reset-params").onclick = () => {
      for (const [key, schema] of Object.entries(task.paramSchema)) form.elements.namedItem(key).value = schema.value;
      form.dataset.dirty = "true"; document.getElementById("settings-error").hidden = true;
    };
    form.onsubmit = event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const next = Object.fromEntries(Object.entries(task.paramSchema).map(([key, schema]) =>
        [key, schema.choices || schema.type === "text" ? form.elements.namedItem(key).value : Number(form.elements.namedItem(key).value)]));
      const validationError = C.parameterError(task, next);
      if (validationError) {
        const error = document.getElementById("settings-error"); error.hidden = false; error.textContent = C.t(validationError); error.focus(); return;
      }
      const value = settings(); value.taskParams[task.id] = next;
      const saved = C.Storage.setSettings({ taskParams: value.taskParams });
      form.dataset.dirty = "false"; dialog.close(); render();
      (document.getElementById("task-settings") || document.getElementById("forecast-settings"))?.focus();
      C.notice(saved ? "settings.saved" : "data.pending");
    };
    showDialog(dialog, document.getElementById("task-settings") || document.getElementById("forecast-settings"));
  }
  function notFound() {
    app().innerHTML = `<section class="empty"><h1>${text("nav.notFound")}</h1><p>${text("nav.notFoundHelp")}</p>
      <a class="button primary" href="#home">${text("routine.returnHome")}</a></section>`;
  }
  function render(focus = false) {
    if (C.active) return;
    applyTheme();
    header();
    const [route, ...parts] = (location.hash.slice(1) || "home").split("/");
    let id;
    try { id = decodeURIComponent(parts.join("/")); }
    catch (error) { console.warn("Route could not be decoded:", error); notFound(); if (focus) app().focus(); return; }
    if (route === "task") { const task = taskById(id); if (task) instructions(task); else notFound(); }
    else if (route === "session") sessionView(id);
    else if (route === "app") home();
    else ({ home, library, routine: routineView, results, reliability, data: dataView, about }[route] || notFound)();
    if (focus) { app().focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); }
  }
  function init() {
    const order = ["dual-nback", "flanker-squared", "digit-span", "number-series", "mental-arithmetic", "corsi", "running-span",
      "visual-arrays", "symmetry-span", "ufov", "stroop-squared", "simon-squared", "antisaccade", "pvt-b"];
    C.Tasks.sort((a, b) => (order.includes(a.id) ? order.indexOf(a.id) : order.length) -
      (order.includes(b.id) ? order.indexOf(b.id) : order.length));
    syncPreferences();
    C.Storage.onWarning(warning => {
      document.getElementById("storage-warning")?.remove();
      if (warning) {
        C.notice(warning.key);
        const node = document.querySelector(`[data-notice="${warning.key}"]`);
        if (node) node.id = "storage-warning";
      }
    });
    document.getElementById("open-settings").onclick = openPreferences;
    document.getElementById("close-preferences").onclick = () => document.getElementById("preferences-dialog").close();
    document.getElementById("close-settings").onclick = closeSettings;
    document.getElementById("preferences-dialog").addEventListener("close", restoreDialogFocus);
    document.getElementById("settings-dialog").addEventListener("close", restoreDialogFocus);
    document.getElementById("settings-dialog").addEventListener("cancel", event => { if (!closeSettings()) event.preventDefault(); });
    document.getElementById("abort").onclick = () => C.active?.abort();
    document.getElementById("abort").onpointerdown = event => { event.preventDefault(); C.active?.abort(); };
    app().addEventListener("click", event => {
      const mode = event.target.closest("[data-mode]"), input = event.target.closest("[data-input]");
      const domain = event.target.closest("[data-domain]"), favorite = event.target.closest("[data-favorite]");
      const history = event.target.closest("[data-history-mode]");
      if (mode) {
        C.Storage.setSettings({ mode: mode.dataset.mode }); render();
        app().querySelector(`[data-mode="${mode.dataset.mode}"]`)?.focus();
      }
      if (input) {
        C.input = input.dataset.input; filterInput = C.input; C.Storage.setSettings({ inputMethod: C.input });
        render(); app().querySelector(`[data-input="${C.input}"]`)?.focus();
      }
      if (domain) { libraryDomain = domain.dataset.domain; library(); app().querySelector(`[data-domain="${libraryDomain}"]`).focus(); }
      if (favorite) {
        const ids = settings().favorites, id = favorite.dataset.favorite;
        C.Storage.setSettings({ favorites: ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id] });
        libraryList(); (app().querySelector(`[data-favorite="${id}"]`) || document.getElementById("favorites-only")).focus();
      }
      if (history) { historyMode = history.dataset.historyMode; historyPage = 0; results(); app().querySelector(`[data-history-mode="${historyMode}"]`).focus(); }
    });
    document.querySelector(".skip-link").onclick = event => { event.preventDefault(); app().focus(); };
    addEventListener("hashchange", async () => {
      startVersion++;
      if (C.active) { const ctx = C.active; ctx.navigateTo = location.hash.slice(1) || "home"; ctx.abort(); await finish(ctx); }
      else render(true);
    });
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
      if (!C.active && settings().theme === "system") applyTheme();
    });
    render();
    C.Timing.ready = C.Timing.measure();
  }
  C.UI = { init, render, home, library, instructions, routineView, results, startPractice, runMain, finish, cooldown,
    chart, openSettings, openPreferences, updateRunner, applyTheme, syncPreferences };
})();
