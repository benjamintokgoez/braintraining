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
  let selectedJourneyKey = null, journeyMetric = null;
  let libraryDomain = "all", librarySearch = "", favoritesOnly = false, startVersion = 0;
  let appearancePreview = null;
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
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    memory: '<rect x="3" y="4" width="7" height="7" rx="2"/><rect x="14" y="13" width="7" height="7" rx="2"/><path d="M14 7h4v3M10 17H6v-3"/>',
    attention: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
    reasoning: '<path d="m12 3 9 5v8l-9 5-9-5V8Zm0 10 9-5M12 13 3 8m9 5v8"/>',
    learning: '<path d="M12 21V11M12 15C5 15 3 10 3 5c6 0 9 3 9 10Zm0-4c0-5 3-8 9-8 0 5-3 8-9 8Z"/>',
    calibration: '<path d="M4 18a9 9 0 1 1 16 0M12 13l5-6M5 12h2m10 0h2M12 3v2"/><circle cx="12" cy="13" r="2"/>'
  }[name] || ""}</svg>`;
  const category = task => ["processing-speed", "vigilance", "attention"].includes(task.domain) ? "attention" : task.domain;
  const domainIcon = domain => icon(domain === "working-memory" ? "memory" : domain);
  const domainLabel = task => `<span class="task-domain">${domainIcon(category(task))}${text(`domain.${task.domain}`)}</span>`;
  const orbitArt = () => `<svg class="orbit-art" viewBox="0 0 320 320" aria-hidden="true">
    <circle class="orbit-field" cx="160" cy="160" r="124"/>
    <circle cx="160" cy="160" r="144" stroke-dasharray="2 8"/>
    <path d="M16 160h20m248 0h20M160 16v20m0 248v20M38 38h12m-6-6v12m226 232h12m-6-6v12"/>
    <circle cx="160" cy="160" r="108"/><circle cx="160" cy="160" r="84"/>
    <g class="orbit-reasoning">
      <ellipse cx="160" cy="160" rx="52" ry="108"/>
      <ellipse cx="160" cy="160" rx="24" ry="108"/>
      <path d="M52 160h216M65 110h190M65 210h190"/>
    </g>
    <ellipse class="orbit-memory" cx="160" cy="160" rx="116" ry="48" transform="rotate(-38 160 160)" stroke-width="2"/>
    <ellipse class="orbit-attention" cx="160" cy="160" rx="116" ry="48" transform="rotate(38 160 160)" stroke-width="2"/>
    <path d="m82 224 78-64 78 64M82 96l78 64 78-64" stroke-dasharray="3 5"/>
    <circle class="orbit-node" cx="160" cy="52" r="7"/>
    <circle class="orbit-node memory" cx="82" cy="224" r="8"/>
    <circle class="orbit-node memory" cx="238" cy="96" r="6"/>
    <circle class="orbit-node attention" cx="82" cy="96" r="6"/>
    <circle class="orbit-node attention" cx="238" cy="224" r="8"/>
    <circle class="orbit-node" cx="160" cy="160" r="10"/>
    <circle class="orbit-node" cx="160" cy="268" r="5"/>
  </svg>`;
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
  function scheduleHTML(planned) {
    const preferred = planned.time ? new Intl.DateTimeFormat(C.language, { hour: "numeric", minute: "2-digit" })
      .format(new Date(2000, 0, 3, planned.hour, planned.minute)) : "";
    const label = !planned.days.length ? "routine.unscheduled" : !planned.scheduledToday ? "routine.restDay" :
      planned.time ? "routine.preferredToday" : "routine.preferredDays";
    const next = planned.next && (!planned.scheduledToday || C.today(planned.next) !== planned.date) ?
      `<p class="fine-print">${text("routine.nextPreferred", { date: new Intl.DateTimeFormat(C.language,
        { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(planned.next) })}</p>` : "";
    return `<div class="routine-schedule"><p class="muted">${text(label, { time: preferred })}</p>${next}</div>`;
  }
  function applyTheme(value = appearancePreview || settings()) {
    const param = new URLSearchParams(location.search).get("scoutTheme");
    const preference = value.theme;
    const theme = ["light", "dark"].includes(param) ? param : preference === "system" ?
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorTheme = value.colorTheme;
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
    document.querySelector('meta[name="description"]')?.setAttribute("content", C.t("app.description"));
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
    return `<li data-domain="${esc(category(task))}" class="${step.sessionId ? "completed" : step.skipped ? "skipped" : ""}">
      <span class="step-number" aria-hidden="true">${step.sessionId ? icon("check") : index + 1}</span>
      <div><strong>${esc(taskTitle(task, step.params))}</strong><span class="muted">${text(`domain.${task.domain}`)}</span></div>
      <span class="step-meta">${step.sessionId ? text("routine.done") : step.skipped ? text("routine.skipped") :
        text("routine.approxMinutes", { count: C.number(Math.ceil(step.estimatedMinutes), 0) })}</span></li>`;
  }).join("")}</ol>`;
  function home() {
    const sessions = C.Storage.getSessions(), activity = weeklyActivity(sessions), routine = C.Routine.preview();
    const saved = C.Routine.current(), done = saved && C.Routine.isDone(saved);
    const planned = C.Routine.schedule();
    const completed = routine.steps.filter(step => step.sessionId).length;
    app().innerHTML = `<section class="hero morning-hero"><div class="hero-copy"><span class="eyebrow">${esc(new Intl.DateTimeFormat(C.language,
      { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${C.today()}T12:00:00`)))}</span>
      <h1>${text(done ? "home.finishedTitle" : "home.title")}</h1><p>${text(done ? "home.finishedHelp" : "home.subtitle")}</p>
      <div class="hero-domains">${["working-memory", "attention", "reasoning"].map(domain =>
        `<span data-domain="${domain}">${domainIcon(domain)}${text(`domain.${domain}`)}</span>`).join("")}</div>
      </div>${orbitArt()}</section>
      <div class="morning-grid"><section class="card routine-card"><div class="section-heading"><div>
      <span class="eyebrow">${text("routine.eyebrow")}</span><h2>${text(planned.titleKey)}</h2></div>
      <span class="tag">${icon("clock")}${minutes(routine.minutes)}</span></div>
      ${scheduleHTML(planned)}
      <p class="muted">${text(done ? "routine.finishedCount" : saved ? "routine.resumeHelp" : "routine.intro",
        { done: C.number(completed), total: C.number(routine.steps.length) })}</p>${planHTML(routine)}
      <div class="actions"><button class="primary" id="start-routine">${text(done ? "routine.review" :
        saved ? "routine.resume" : planned.days.length && !planned.scheduledToday ? "routine.optionalStart" :
          "routine.start")}${icon("arrow")}</button>
      ${!saved ? `<button id="routine-preferences" class="secondary">${text("routine.adjust")}</button>` : ""}</div>
      <p class="fine-print">${text("routine.estimateNote")}</p></section>
      <aside class="stack"><section class="card consistency-card"><span class="eyebrow">${text("home.week")}</span>
      <h2>${text("home.practiceDays", { count: C.number(activity.count) })}</h2>${weekHTML(activity)}
      <p class="muted">${text("home.consistency")}</p></section>
      <section class="card quiet-card"><div class="library-symbol" aria-hidden="true">${["working-memory", "attention", "learning"].map(domain =>
        `<span data-domain="${domain}">${domainIcon(domain)}</span>`).join("")}</div>
      <h3>${text("home.pickTitle")}</h3><p class="muted">${text("home.pickHelp")}</p>
      <a href="#library" class="button secondary">${text("home.explore")}</a></section></aside></div>
      <p class="home-perspective">${text("home.perspective")} <a href="#about">${text("home.evidenceLink")}</a></p>`;
    document.getElementById("start-routine").onclick = () => { C.Routine.start(); location.hash = "routine"; };
    document.getElementById("routine-preferences")?.addEventListener("click", openPreferences);
  }
  function taskCard(task, counts) {
    const q = taskParams(task), favorite = settings().favorites.includes(task.id);
    const next = settings().mode === "assessment" && task.supportsAssessment ? cooldown(task.id) : null;
    const estimate = C.Routine.estimateMinutes(task, q);
    return `<article class="card task-card" data-domain="${esc(category(task))}"><div class="task-card-heading">${domainLabel(task)}
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
    app().innerHTML = `${context ? `<div class="routine-banner"><a href="#home">${text(C.Routine.titleKey())}</a>
      <span>${text("routine.round", { current: C.number(context.index + 1), total: C.number(context.routine.steps.length) })}</span>
      <span>${text("mode.training")}</span></div>` : `<a class="back-link" href="#library">${text("runner.backLibrary")}</a>`}
      <section class="hero task-hero" data-domain="${esc(category(task))}">${domainLabel(task)}<h1>${esc(taskTitle(task, q))}</h1><p>${text(task.descKey)}</p>
      ${!context ? modeButtons(mode) : ""}</section><section class="card instruction-card stack" data-domain="${esc(category(task))}">
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
      ${next ? `<p class="warning">${text("home.assessmentWait", { date: C.date(next) })}</p>` : ""}</section>${researchCard(task)}`;
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
        processingDeadlineMs: ctx.extra?.processingDeadlineMs ?? null, protocolVersion: ctx.task.protocolVersion,
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
      <pre>${esc(JSON.stringify(session, null, 2))}</pre></details></section>
      ${task && !session.practiceOnly ? journeyCard(task, session) : ""}${task ? researchCard(task) : ""}`;
    document.getElementById("skip-round")?.addEventListener("click", () => { C.Routine.skip(); location.hash = "routine"; });
  }
  const seriesKey = C.seriesKey;
  const progressValue = (metric, value) => {
    const label = C.metric(metric, value);
    return Number.isFinite(value) && (metric === "ssrt" || metric === "meanRT" || /Threshold$/.test(metric) &&
      metric !== "estimatedThreshold") ? C.t("journey.milliseconds", { value: label }) : label;
  };
  const processingDeadline = row => Number.isFinite(row.processingDeadlineMs) ?
    `<p>${text("journey.processingDeadline", { value: C.number(row.processingDeadlineMs) })}</p>` : "";
  function researchCard(task) {
    const [family, studies] = C.Evidence.families[task.id];
    const refs = [...new Set([...studies, "reliability", ...(task.kind === "journal" ? [] : ["timing", "transfer"])])];
    return `<section class="card research-card stack"><div class="section-heading"><h2>${text("evidence.title")}</h2>
      <span class="tag">${text("evidence.unavailable")}</span></div><p>${text("evidence.noRanking")}</p>
      <p class="muted">${text(`evidence.${family}`)}</p><details><summary>${text("evidence.sources")}</summary>
      <div class="stack"><p>${text("evidence.scope")}</p><ul class="research-links">${refs.map(id => {
        const [authors, title, doi] = C.Evidence.sources[id];
        return `<li><a href="https://doi.org/${esc(doi)}" target="_blank" rel="noopener noreferrer">${esc(authors)}:
          ${esc(title)}</a></li>`;
      }).join("")}</ul><h3>${text("evidence.futureTitle")}</h3><p>${text("evidence.future")}</p>
      <p>${text("evidence.agePrivacy")}</p></div></details></section>`;
  }
  function journeyCard(task, anchor, controls = "", metric = task.primaryMetric) {
    const summary = C.Progress.summarize(task, C.Storage.getSessions(), anchor, metric);
    const value = number => esc(progressValue(metric, number));
    const dateRange = dates => dates.length ? esc(`${C.dayLabel(Date.parse(dates[0]))} – ${C.dayLabel(Date.parse(dates.at(-1)))}`) : "";
    const difference = C.metric(metric, 1).endsWith("%") ?
      C.t("journey.points", { value: C.number(Math.abs(summary.delta) * 100, 1) }) : progressValue(metric, Math.abs(summary.delta));
    const change = summary.delta === null ? C.t("common.noValue") : summary.movement === "unchanged" ?
      C.t("journey.unchanged") : C.t(`journey.${summary.movement}`, { value: difference });
    const missing = anchor && (!Number.isFinite(anchor.score?.[metric]) || summary.total > summary.count);
    const accuracy = summary.context.find(row => row.metric === "accuracy");
    return `<section class="card journey-card stack" data-journey-status="${summary.status}">
      <div class="section-heading"><div><span class="eyebrow">${text("journey.eyebrow")}</span>
      <h2>${text(`journey.${summary.status}Title`)}</h2></div><span class="tag">${text(`mode.${anchor?.mode || historyMode}`)}</span></div>
      ${controls}<p>${text(`journey.${summary.status}Help`, { remaining: C.number(summary.remaining) })}</p>
      <p class="muted">${text("journey.count", { count: C.number(summary.count), total: C.number(summary.total) })}</p>
      ${anchor?.invalid || anchor?.completedMain === false || anchor?.importSourceId ? `<p class="notice warning">${text("journey.excluded")}</p>` : ""}
      ${missing ? `<p class="fine-print">${text("journey.missing")}</p>` : ""}
      <div class="metrics"><div class="metric"><strong>${value(summary.latest)}</strong><span>${text("journey.latest")}</span></div>
      <div class="metric"><strong>${value(summary.baseline)}</strong><span>${text("journey.baselineLabel")}</span>
      <small class="muted">${dateRange(summary.baselineDates)}</small></div>
      <div class="metric"><strong>${value(summary.recent)}</strong><span>${text("journey.recentLabel")}</span>
      <small class="muted">${dateRange(summary.recentDates)}</small></div>
      <div class="metric journey-change"><strong>${esc(change)}</strong><span>${text("journey.change")}</span></div></div>
      <p class="fine-print">${text(`journey.direction.${summary.direction}`)} · ${text(`score.${metric}`)}</p>
      ${accuracy && Number.isFinite(accuracy.baseline) && Number.isFinite(accuracy.recent) && accuracy.recent < accuracy.baseline ?
        `<p class="notice journey-accuracy">${text("journey.accuracyDrop", { baseline: C.metric("accuracy", accuracy.baseline),
          recent: C.metric("accuracy", accuracy.recent) })}</p>` : ""}
      ${summary.range ? `<p class="muted">${text("journey.range", { low: progressValue(metric, summary.range[0]),
        high: progressValue(metric, summary.range[1]) })}</p>` : ""}
      ${summary.context.length ? `<details><summary>${text("journey.context")}</summary><p>${text("journey.contextHelp")}</p>
      <div class="table-scroll"><table><thead><tr><th scope="col">${text("results.score")}</th>
      <th scope="col">${text("journey.baselineLabel")}</th><th scope="col">${text("journey.recentLabel")}</th></tr></thead>
      <tbody>${summary.context.map(row => `<tr><th scope="row">${text(`score.${row.metric}`)}</th>
        <td>${esc(progressValue(row.metric, row.baseline))}</td><td>${esc(progressValue(row.metric, row.recent))}</td></tr>`).join("")}
      </tbody></table></div></details>` : ""}
      <details><summary>${text("journey.method")}</summary><div class="stack"><p>${text("journey.methodHelp")}</p>
      <p>${text(anchor?.mode === "assessment" ? "journey.assessmentNote" : "journey.adaptiveNote")}</p>
      ${anchor ? `<p>${text("results.device")}: ${text(`device.${anchor.deviceClass}`)} · ${text("results.input")}:
      ${text(`input.${anchor.inputMethod}`)} · ${text(`layout.${C.layoutOrientation(anchor.viewport)}`)}</p>
      <p>${text("results.protocolVersion", { count: C.number(anchor.protocolVersion || 1) })} · ${text("results.stimulusSet")}:
      ${text(`stimulus.${anchor.stimulusSet}`)}${task.languageDependent ? ` · ${esc(anchor.language.toUpperCase())}` : ""}</p>
      <code>${esc(C.canonical(anchor.params))}</code>${processingDeadline(anchor)}` : ""}
      <p>${text("journey.limits")}</p></div></details></section>`;
  }
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
    const marker = (variant, cx, cy) => [
      `<circle cx="${cx}" cy="${cy}" r="4"/>`,
      `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8"/>`,
      `<path d="M${cx} ${cy - 5}l5 5-5 5-5-5Z"/>`,
      `<path d="M${cx} ${cy - 5}l5 9H${cx - 5}Z"/>`
    ][variant];
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
      const variant = index % 4, dash = ["none", "8 4", "2 3", "8 3 2 3"][variant];
      const color = ["--cp-accent", "--cp-link", "--cp-success", "--cp-text-soft"][variant];
      const label = `${C.t("results.series")} ${++index} · ${C.t(`score.${sample.plottedMetric}`)} · ${C.t(`device.${sample.deviceClass}`)} /
        ${C.t(`input.${sample.inputMethod}`)} · ${C.t(`layout.${C.layoutOrientation(sample.viewport)}`)}${task.languageDependent ? ` · ${sample.language.toUpperCase()}` : ""}`;
      svg += `<polyline fill="none" stroke="var(${color})" opacity="${other ? .45 : 1}" stroke-width="2" stroke-dasharray="${dash}"
        points="${group.map(row => `${x(row)},${y(row.plottedValue)}`).join(" ")}"/>`;
      for (const row of group) svg += `<g class="series-point" data-marker="${variant}" fill="var(${color})">
        <title>${esc(`${C.date(row.startedAt)} · ${label} · ${C.metric(row.plottedMetric, row.plottedValue)}`)}</title>
        ${marker(variant, x(row), y(row.plottedValue))}</g>`;
      legend.push(`<li><span class="series-key"><svg class="series-symbol" viewBox="0 0 32 16" aria-hidden="true">
        <line x1="0" x2="32" y1="8" y2="8" stroke="var(${color})" stroke-width="2" stroke-dasharray="${dash}"/>
        <g fill="var(${color})">${marker(variant, 16, 8)}</g></svg>${esc(label)}</span><details><summary>${text("results.parameters")}</summary>
        <code>${esc(C.canonical(sample.params))}</code><p>${text("results.stimulusSet")}: ${text(`stimulus.${sample.stimulusSet}`)}</p>
        <p>${text("results.protocolVersion", { count: C.number(sample.protocolVersion || 1) })}</p>${processingDeadline(sample)}</details></li>`);
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
    const setups = C.Progress.groups(task, sessions, historyMode, filterDevice, filterInput);
    const setup = setups.find(group => group.key === selectedJourneyKey) || setups[0];
    selectedJourneyKey = setup?.key || null;
    const journeyMetrics = metrics.filter(metric => C.Progress.directions[metric]);
    if (!journeyMetrics.includes(journeyMetric)) journeyMetric = task.primaryMetric;
    const journeyControls = `<div class="settings-grid">${setups.length ? `<label class="field">${text("journey.setup")}
      <select id="journey-setup">${setups.map((group, index) => `<option value="${esc(group.anchor.id)}"
        ${group === setup ? "selected" : ""}>${text("journey.setupOption", { index: C.number(index + 1),
          date: C.date(group.anchor.startedAt), count: C.number(group.rows.length) })}</option>`).join("")}</select></label>` : ""}
      <label class="field">${text("results.score")}<select id="journey-metric">${journeyMetrics.map(metric =>
        `<option value="${metric}" ${metric === journeyMetric ? "selected" : ""}>${text(`score.${metric}`)}</option>`).join("")}</select></label></div>`;
    app().innerHTML = `<section class="hero"><span class="eyebrow">${text("nav.results")}</span><h1>${text("results.title")}</h1>
      <p>${text("results.subtitle")}</p></section><section class="card progress-overview"><div>
      <h2>${text("home.practiceDays", { count: C.number(activity.count) })}</h2><p class="muted">${text("home.week")}</p></div>${weekHTML(activity)}</section>
      ${filterBar()}${modeButtons(historyMode, "data-history-mode")}
      ${journeyCard(task, setup?.anchor, journeyControls, journeyMetric)}${researchCard(task)}
      ${!sessions.length ? `<section class="empty"><h2>${text("results.firstTitle")}</h2><p>${text("results.firstHelp")}</p>
        <a href="#home" class="button primary">${text("routine.start")}</a></section>` : `
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
    bindFilters(results);
    document.getElementById("journey-setup")?.addEventListener("change", event => {
      selectedJourneyKey = setups.find(group => group.anchor.id === event.target.value).key;
      results(); document.getElementById("journey-setup").focus();
    });
    document.getElementById("journey-metric").onchange = event => {
      journeyMetric = event.target.value; results(); document.getElementById("journey-metric").focus();
    };
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
        <details><summary>${text("results.parameters")}</summary><code>${esc(C.canonical(last.params))}</code>${processingDeadline(last)}</details></article>`;
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
    C.download(`bbg-${C.iso().slice(0, 10)}.csv`, "\ufeff" + [keys.map(C.csvCell).join(","),
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
      <section class="card prose">${["purpose", "evidence", "design", "ufov", "measurement", "modes", "reliability", "devices", "limitations", "privacy", "tierTwo"].map(key =>
        `<h2>${text(`about.${key}`)}</h2><p>${text(`about.${key}Text`)}</p>`).join("")}
      <h2>${text("about.designSources")}</h2><ul>
      <li><a href="https://doi.org/10.3389/fpsyg.2015.00368">Elliot (2015): Color and psychological functioning</a></li>
      <li><a href="https://doi.org/10.3389/fpsyg.2016.00784">Xia et al. (2016): Exploring the effect of red and blue on cognitive task performances</a></li>
      <li><a href="https://www.w3.org/TR/WCAG22/">${text("about.accessibilitySource")}</a></li></ul></section>`;
  }
  function openPreferences(event) {
    if (C.active || C.starting) return;
    const dialog = document.getElementById("preferences-dialog"), form = document.getElementById("preferences-form"), value = settings();
    let permissionPending = false;
    form.innerHTML = `<fieldset class="stack"><legend>${text("preferences.appearance")}</legend><div class="settings-grid">
      <label class="field">${text("preferences.theme")}<select name="theme" aria-describedby="appearance-help">
      ${["system", "light", "dark"].map(theme => `<option value="${theme}" ${value.theme === theme ? "selected" : ""}>
        ${text(`preferences.theme.${theme}`)}</option>`).join("")}</select></label>
      <label class="field">${text("preferences.colorTheme")}<select name="colorTheme" aria-describedby="appearance-help">
      ${["rose", "graphite", "amber"].map(colorTheme => `<option value="${colorTheme}" ${value.colorTheme === colorTheme ? "selected" : ""}>
        ${text(`preferences.colorTheme.${colorTheme}`)}</option>`).join("")}</select></label></div>
      <span class="appearance-sample" aria-hidden="true">${text("preferences.accentPreview")}</span>
      <p id="appearance-help" class="fine-print">${text("preferences.appearanceHelp")}</p></fieldset>
      <fieldset class="stack"><legend>${text("routine.title")}</legend><div class="settings-grid">
      <label class="field">${text("preferences.budget")}<select name="routineMinutes">${[10, 15, 20].map(count =>
        `<option value="${count}" ${count === value.routineMinutes ? "selected" : ""}>${minutes(count)}</option>`).join("")}</select></label>
      <label class="field">${text("preferences.practiceTime")}<input name="routineTime" type="time" value="${esc(value.routineTime)}"
        aria-describedby="practice-schedule-help"></label></div>
      <fieldset class="practice-days"><legend>${text("preferences.practiceDays")}</legend><div class="weekday-grid">
      ${C.Routine.weekdays.map(day => `<label><input name="routineDays" type="checkbox" value="${day}"
        ${value.routineDays.includes(day) ? "checked" : ""}>${esc(new Intl.DateTimeFormat(C.language,
          { weekday: "long" }).format(new Date(2026, 0, 4 + day, 12)))}</label>`).join("")}</div></fieldset>
      <p id="practice-schedule-help" class="fine-print">${text("preferences.scheduleHelp")}</p>
      <label class="field">${text("preferences.warmup")}<select name="warmupPolicy">${["familiar", "always"].map(policy =>
        `<option value="${policy}" ${value.warmupPolicy === policy ? "selected" : ""}>${text(`preferences.warmup.${policy}`)}</option>`).join("")}</select></label>
      <p class="fine-print">${text("preferences.protocolNote")}</p></fieldset>
      <details id="practice-reminders"><summary>${text("preferences.reminders")}</summary><div class="stack">
      <label><input name="routineReminders" type="checkbox" ${value.routineReminders ? "checked" : ""}
        aria-describedby="reminder-help reminder-support">${text("reminders.title")}</label>
      <p id="reminder-help" class="fine-print">${text("reminders.help")}</p>
      <p id="reminder-support" role="status" aria-live="polite"></p>
      <button id="export-calendar" class="secondary" type="button">${text("preferences.calendar")}</button>
      <p id="calendar-schedule-error" class="fine-print" hidden>${text("preferences.reminderScheduleRequired")}</p>
      <p class="fine-print">${text("preferences.calendarHelp")}</p></div></details>
      <div class="settings-grid"><label class="field">${text("settings.language")}<select id="language" name="language">
      ${["en", "de"].map(language => `<option value="${language}" ${C.language === language ? "selected" : ""}>
        ${text(language === "en" ? "settings.english" : "settings.german")}</option>`).join("")}</select></label>
      <label class="field">${text("preferences.input")}<select name="inputMethod">${["auto", "keyboard", "touch", "mouse"].map(method =>
        `<option value="${method}" ${(value.inputMethod || "auto") === method ? "selected" : ""}>
        ${text(method === "auto" ? "preferences.input.auto" : `input.${method}`)}</option>`).join("")}</select></label></div>
      <label class="inline"><input name="fullscreen" type="checkbox" ${value.fullscreen ? "checked" : ""}>${text("preferences.fullscreen")}</label>
      <label class="inline"><input name="vibration" type="checkbox" ${value.vibration ? "checked" : ""}>${text("settings.vibration")}</label>
      <details><summary>${text("pwa.title")}</summary><p>${text("pwa.installHelp")}</p>
      ${C.PWA.installable && !C.PWA.standalone ? `<button type="button" id="install-app" class="secondary">${text("pwa.install")}</button>` : ""}
      <p class="fine-print">${text("pwa.originNote")}</p></details><div class="actions">
      <button id="save-preferences" class="primary" type="submit">${text("preferences.save")}</button>
      <button id="cancel-preferences" class="secondary" type="button">${text("common.cancel")}</button>
      <button id="preferences-share" class="secondary" type="button">${text("share.open")}</button>
      <p id="preferences-error" class="notice warning" role="alert" tabindex="-1" hidden></p>
      <a class="button secondary" id="preferences-data" href="#data">${text("data.backupLink")}</a></div>`;
    const reminder = form.elements.namedItem("routineReminders"), save = document.getElementById("save-preferences");
    const error = document.getElementById("preferences-error"), support = document.getElementById("reminder-support");
    const scheduleValues = () => ({
      routineMinutes: Number(form.elements.namedItem("routineMinutes").value),
      routineTime: form.elements.namedItem("routineTime").value,
      routineDays: [...form.querySelectorAll('[name="routineDays"]:checked')].map(input => Number(input.value)),
      routineReminders: reminder.checked
    });
    const showError = key => { error.hidden = false; error.textContent = C.t(key); error.focus(); };
    const updateReminders = () => {
      const state = C.Reminders.status(), schedule = scheduleValues();
      const available = Boolean(schedule.routineTime && schedule.routineDays.length);
      reminder.disabled = permissionPending || (!reminder.checked && (!available || !["default", "granted"].includes(state)));
      support.textContent = C.t(permissionPending ? "reminders.pending" : `reminders.${state}`);
      save.disabled = permissionPending;
      document.getElementById("export-calendar").disabled = !available;
      document.getElementById("calendar-schedule-error").hidden = available;
    };
    form.oninput = event => {
      const time = form.elements.namedItem("routineTime");
      // Safari can retain an invalid editor state after an optional time is cleared.
      if (event.target === time && time.value === "" && !time.validity.badInput) time.value = "";
      error.hidden = true; updateReminders();
      if (["theme", "colorTheme"].includes(event.target.name)) {
        appearancePreview = Object.fromEntries(["theme", "colorTheme"].map(key => [key, form.elements.namedItem(key).value]));
        applyTheme();
      }
    };
    reminder.onchange = async () => {
      if (!reminder.checked) { updateReminders(); return; }
      const validation = C.practiceScheduleError(scheduleValues());
      if (validation) { reminder.checked = false; updateReminders(); showError(validation); return; }
      permissionPending = true; updateReminders();
      try {
        const allowed = await C.Reminders.requestPermission();
        if (!reminder.isConnected) return;
        reminder.checked = allowed;
        if (!allowed) showError("reminders.notGranted");
      } catch (failure) {
        console.warn("Notification permission could not be enabled:", failure);
        if (!reminder.isConnected) return;
        reminder.checked = false;
        showError(/^reminders\./.test(failure.message) ? failure.message : "reminders.failure");
      } finally {
        permissionPending = false;
        if (reminder.isConnected) updateReminders();
      }
    };
    document.getElementById("export-calendar").onclick = () => {
      try { C.download("bbg-practice-reminders.ics", C.Routine.calendar(scheduleValues()), "text/calendar;charset=utf-8"); }
      catch (failure) { console.warn("Calendar export failed:", failure); showError(
        /^preferences\./.test(failure.message) ? failure.message : "preferences.calendarFailure"); }
    };
    document.getElementById("cancel-preferences").onclick = () => dialog.close();
    document.getElementById("preferences-share").onclick = openShare;
    document.getElementById("preferences-data").onclick = () => { dialogOpeners.delete(dialog); dialog.close(); };
    document.getElementById("install-app")?.addEventListener("click", async () => {
      try { await C.PWA.install(); } catch (failure) { console.warn("Install prompt failed:", failure); showError("pwa.failed"); }
    });
    form.onsubmit = event => {
      event.preventDefault();
      if (permissionPending || C.Reminders.pending) { showError("reminders.pending"); return; }
      if (!form.reportValidity()) return;
      const next = { ...scheduleValues(), ...Object.fromEntries(["language", "theme", "colorTheme", "warmupPolicy", "inputMethod"]
        .map(key => [key, form.elements.namedItem(key).value])) };
      const validation = C.appearanceError(next) || C.practiceScheduleError(next);
      if (validation) { showError(validation); return; }
      if (next.routineReminders && C.Reminders.status() !== "granted") { showError("reminders.permissionRequired"); return; }
      next.fullscreen = form.elements.namedItem("fullscreen").checked; next.vibration = form.elements.namedItem("vibration").checked;
      const saved = C.Storage.setSettings(next);
      syncPreferences(); dialog.close(); render(); C.notice(saved ? "settings.saved" : "data.pending");
      void C.Reminders.refresh();
    };
    updateReminders();
    showDialog(dialog, event?.currentTarget || document.getElementById("open-settings"));
  }
  const shareData = () => ({ title: C.t("app.title"), text: C.t("share.message"),
    url: new URL("./#home", location.href).href });
  function openShare(event) {
    if (C.active || C.starting) { C.notice("share.busy"); return; }
    const dialog = document.getElementById("share-dialog"), link = document.getElementById("share-link");
    const status = document.getElementById("share-status"), native = document.getElementById("native-share");
    const data = shareData(), address = new URL(data.url);
    link.value = data.url; status.textContent = ""; native.disabled = false;
    document.getElementById("share-local-warning").hidden = !(
      address.hostname === "[::1]" || /^127(?:\.\d{1,3}){3}$/.test(address.hostname) ||
      /(^|\.)localhost$/.test(address.hostname) || !["https:", "http:"].includes(address.protocol));
    native.hidden = !window.isSecureContext || typeof navigator.share !== "function";
    if (!native.hidden && typeof navigator.canShare === "function") {
      try { native.hidden = !navigator.canShare(data); }
      catch (error) { console.warn("Device sharing is unavailable:", error); native.hidden = true; status.textContent = C.t("share.unavailable"); }
    }
    const social = [["Facebook", "https://www.facebook.com/sharer/sharer.php", { u: data.url }],
      ["X", "https://twitter.com/intent/tweet", { text: data.text, url: data.url }],
      ["WhatsApp", "https://wa.me/", { text: `${data.text} ${data.url}` }]];
    document.getElementById("social-share-links").innerHTML = social.map(([name, base, params]) => {
      const url = new URL(base); url.search = new URLSearchParams(params).toString();
      return `<a class="button secondary" href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(name)}</a>`;
    }).join("");
    document.getElementById("copy-share-link").onclick = async () => {
      try {
        if (typeof navigator.clipboard?.writeText !== "function") throw new Error("Clipboard API is unavailable");
        await navigator.clipboard.writeText(data.url);
        status.textContent = C.t("share.copied");
      } catch (error) {
        console.warn("App link could not be copied automatically:", error);
        link.focus(); link.select(); status.textContent = C.t("share.manualCopy");
      }
    };
    native.onclick = async () => {
      native.disabled = true; status.textContent = "";
      try { await navigator.share(data); }
      catch (error) {
        if (error.name !== "AbortError") { console.warn("Device sharing failed:", error); status.textContent = C.t("share.unavailable"); }
      } finally { native.disabled = false; }
    };
    showDialog(dialog, event?.currentTarget || document.getElementById("share-app"));
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
    document.getElementById("preferences-dialog").addEventListener("close", event => {
      appearancePreview = null; applyTheme(); restoreDialogFocus(event);
    });
    document.getElementById("settings-dialog").addEventListener("close", restoreDialogFocus);
    document.getElementById("share-app").onclick = openShare;
    document.getElementById("close-share").onclick = () => document.getElementById("share-dialog").close();
    document.getElementById("share-dialog").addEventListener("close", restoreDialogFocus);
    document.getElementById("settings-dialog").addEventListener("cancel", event => { if (!closeSettings()) event.preventDefault(); });
    document.getElementById("abort").onclick = () => C.active?.abort();
    document.getElementById("abort").onpointerdown = event => { event.preventDefault(); C.active?.abort(); };
    app().addEventListener("click", event => {
      const mode = event.target.closest("[data-mode]"), input = event.target.closest("[data-input]");
      const domain = event.target.closest(".domain-filters button[data-domain]"), favorite = event.target.closest("[data-favorite]");
      const history = event.target.closest("[data-history-mode]");
      if (mode) {
        C.Storage.setSettings({ mode: mode.dataset.mode }); render();
        app().querySelector(`[data-mode="${mode.dataset.mode}"]`)?.focus();
      }
      if (input) {
        C.input = input.dataset.input; filterInput = C.input; C.Storage.setSettings({ inputMethod: C.input });
        render(); app().querySelector(`[data-input="${C.input}"]`)?.focus();
      }
      if (domain) {
        libraryDomain = domain.dataset.domain; library();
        app().querySelector(`.domain-filters button[data-domain="${libraryDomain}"]`).focus();
      }
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
      if (!C.active && !C.starting && (appearancePreview || settings()).theme === "system") applyTheme();
    });
    render();
    C.Timing.ready = C.Timing.measure();
    C.Reminders.init();
  }
  C.UI = { init, render, home, library, instructions, routineView, results, startPractice, runMain, finish, cooldown,
    chart, researchCard, openSettings, openPreferences, openShare, shareData, updateRunner, applyTheme, syncPreferences };
})();
