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
  let statusFilter = "all", topicFilter = "", pageIndex = 0, draft = null, draftLoaded = false, draftPending = false;
  const draftKey = "cortex.forecastDraft.v1";
  function loadDraft() {
    if (draftLoaded) return;
    draftLoaded = true;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const value = JSON.parse(raw), fields = ["claim", "topic", "probability", "resolveBy"];
      if (!value || typeof value !== "object" || fields.some(key => typeof value[key] !== "string" || value[key].length > 2000)) {
        throw new Error("Invalid forecast draft");
      }
      draft = Object.fromEntries(fields.map(key => [key, value[key]]));
    } catch (error) {
      console.warn("Forecast draft could not be restored:", error);
      C.notice("forecast.draftUnavailable");
    }
  }
  function saveDraft() {
    try {
      if (draft) sessionStorage.setItem(draftKey, JSON.stringify(draft));
      else sessionStorage.removeItem(draftKey);
      draftPending = false;
    } catch (error) {
      draftPending = Boolean(draft);
      console.warn("Forecast draft could not be saved:", error);
      C.notice("forecast.draftUnavailable");
    }
  }
  addEventListener("beforeunload", event => {
    if (draftPending) { event.preventDefault(); event.returnValue = ""; }
  });
  C.Forecasting = { get pendingDraft() { return draftPending; } };
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
    const width = Math.max(240, Math.min(640, innerWidth - (innerWidth < 680 ? 72 : 128)));
    const x = value => 64 + value * (width - 88), y = value => 210 - value * 166;
    let svg = `<svg viewBox="0 0 ${width} 286" role="img" aria-label="${text("forecast.calibration")}">`;
    for (let i = 0; i <= 4; i++) {
      const value = i / 4;
      svg += `<path d="M64 ${y(value)}H${width - 24}M${x(value)} 44V210" stroke="var(--cp-border)" fill="none"/>
        <text x="54" y="${y(value) + 4}" text-anchor="end">${C.escape(percent(value))}</text>
        <text x="${x(value)}" y="236" text-anchor="middle">${C.escape(percent(value))}</text>`;
    }
    svg += `<path d="M64 210L${width - 24} 44" stroke="var(--cp-border-strong)" stroke-dasharray="5 5" fill="none"/>`;
    const points = stats.calibration.filter(bin => bin.count);
    svg += `<polyline points="${points.map(bin => `${x(bin.meanProbability)},${y(bin.observedFrequency)}`).join(" ")}"
      stroke="var(--cp-accent)" stroke-width="2" fill="none"/>`;
    for (const bin of points) svg += `<circle cx="${x(bin.meanProbability)}" cy="${y(bin.observedFrequency)}"
      r="${Math.min(12, 3 + Math.sqrt(bin.count))}" fill="var(--cp-accent)"><title>${text("forecast.binTooltip",
        { count: C.number(bin.count), predicted: percent(bin.meanProbability), observed: percent(bin.observedFrequency) })}</title></circle>`;
    svg += `<text x="${width / 2}" y="272" text-anchor="middle">${text("forecast.predicted")}</text>
      <text x="64" y="23">${text("forecast.observed")}</text></svg>`;
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
    onWipe() { draft = null; draftLoaded = true; saveDraft(); statusFilter = "all"; topicFilter = ""; pageIndex = 0; },
    renderView(container) {
      loadDraft();
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
        <button type="submit" class="primary">${text("forecast.add")}</button></form><p id="forecast-status" role="status" tabindex="-1"></p></section>
        <div class="toolbar"><label class="field">${text("forecast.topic")}<select id="forecast-topic"><option value="">${text("common.all")}</option>
          ${topics.map(topic => `<option value="${C.escape(topic)}" ${topic === topicFilter ? "selected" : ""}>${C.escape(topic)}</option>`).join("")}</select></label>
        <label class="field">${text("forecast.status")}<select id="forecast-filter">${["all","open","resolved","void","conflict"].map(status =>
          `<option value="${status}" ${status === statusFilter ? "selected" : ""}>${text(status === "all" ? "common.all" : `forecast.status.${status}`)}</option>`).join("")}</select></label></div>
        <section class="card"><div class="metrics"><div class="metric"><strong>${C.number(stats.resolved)}</strong><span>${text("forecast.resolvedCount")}</span></div>
        <div class="metric"><strong>${C.number(stats.meanBrier, 4)}</strong><span>${text("forecast.brier")}</span></div>
        <div class="metric"><strong>${C.number(open.length)}</strong><span>${text("forecast.status.open")}</span></div></div>
        <h2>${text("forecast.calibration")}</h2><p class="muted">${text("forecast.calibrationNote")}</p>${calibrationChart(stats)}</section>
        <section class="card stack"><h2 id="forecast-entries-heading" tabindex="-1">${text("forecast.entries")}</h2><p class="muted">${text("forecast.pagination",
          { from: C.number(visible.length ? pageIndex * q.pageSize + 1 : 0), to: C.number(Math.min(visible.length, (pageIndex + 1) * q.pageSize)), total: C.number(visible.length) })}</p>
        <div class="table-scroll"><table class="forecast-table responsive-table" role="table"><thead><tr>${["forecast.claim","forecast.probability","forecast.resolveBy","forecast.status","forecast.outcome","forecast.brier","forecast.actions"]
          .map(key => `<th scope="col">${text(key)}</th>`).join("")}</tr></thead><tbody>${page.map(entry => {
            const outcome = entry.outcome === null ? C.t("common.unknown") : C.t(entry.outcome ? "forecast.yes" : "forecast.no");
            const overdue = entry.status === "open" && entry.resolveBy < C.today();
            return `<tr tabindex="-1" data-forecast-entry="${C.escape(entry.id)}"><td class="forecast-claim" data-label="${text("forecast.claim")}">${C.escape(entry.claim)}${entry.topic ? `<br><small class="muted">${C.escape(entry.topic)}</small>` : ""}</td>
              <td data-label="${text("forecast.probability")}">${C.escape(percent(entry.probability))}</td><td data-label="${text("forecast.resolveBy")}">${C.escape(dateLabel(entry.resolveBy))}
              ${overdue ? `<br><span class="warning">${text("forecast.overdue")}</span>` : ""}</td>
              <td data-label="${text("forecast.status")}">${text(`forecast.status.${entry.status}`)}</td><td data-label="${text("forecast.outcome")}">${C.escape(outcome)}</td>
              <td data-label="${text("forecast.brier")}">${C.number(entry.status === "resolved" ? (entry.probability - entry.outcome) ** 2 : null, 4)}</td>
              <td data-label="${text("forecast.actions")}"><div class="actions">${entry.status === "open" ? `<button data-forecast-resolve="${C.escape(entry.id)}" data-outcome="1">${text("forecast.resolveYes")}</button>
              <button data-forecast-resolve="${C.escape(entry.id)}" data-outcome="0">${text("forecast.resolveNo")}</button>` : ""}
              ${entry.status === "conflict" ? `<button data-forecast-accept="${C.escape(entry.id)}">${text("forecast.acceptConflict")}</button>` : ""}
              ${entry.status !== "void" ? `<button data-forecast-void="${C.escape(entry.id)}">${text("forecast.void")}</button>` : ""}</div></td></tr>`;
          }).join("")}</tbody></table></div>${!visible.length ? `<p class="empty">${text("forecast.noEntries")}</p>` : ""}
        <div class="actions"><button id="forecast-prev" ${pageIndex === 0 ? "disabled" : ""}>${text("forecast.previous")}</button>
          <button id="forecast-next" ${(pageIndex + 1) * q.pageSize >= visible.length ? "disabled" : ""}>${text("forecast.next")}</button></div></section>`;
      const redraw = focusId => {
        task.renderView(container);
        if (focusId) document.getElementById(focusId).focus();
      };
      const report = (saved, key, id) => {
        redraw();
        document.getElementById("forecast-status").textContent = C.t(saved ? key : "data.pending");
        const row = [...container.querySelectorAll("[data-forecast-entry]")].find(item => item.dataset.forecastEntry === id);
        (row || document.getElementById(id ? "forecast-entries-heading" : "forecast-status")).focus();
      };
      const error = exception => {
        console.warn("Forecast action rejected:", exception);
        document.getElementById("forecast-status").textContent = C.t(
          String(exception.message).startsWith("forecast.") ? exception.message : "forecast.invalid");
      };
      document.getElementById("forecast-form").oninput = event => {
        const form = event.currentTarget;
        draft = Object.fromEntries(["claim","topic","probability","resolveBy"].map(key => [key, form.elements[key].value]));
        saveDraft();
      };
      document.getElementById("forecast-form").onsubmit = event => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        try {
          const result = C.Storage.createForecast({ claim: form.elements.claim.value, topic: form.elements.topic.value,
            probability: Number(form.elements.probability.value) / 100, resolveBy: form.elements.resolveBy.value, language: C.language });
          draft = null; saveDraft(); statusFilter = "all"; topicFilter = ""; pageIndex = 0; report(result.saved, "forecast.saved");
        } catch (exception) { error(exception); }
      };
      document.getElementById("forecast-settings").onclick = () => C.UI.openSettings("forecasting");
      document.getElementById("forecast-json").onclick = () => C.Storage.exportAll();
      document.getElementById("forecast-csv").onclick = exportForecasts;
      document.getElementById("forecast-topic").onchange = event => { topicFilter = event.target.value; pageIndex = 0; redraw("forecast-topic"); };
      document.getElementById("forecast-filter").onchange = event => { statusFilter = event.target.value; pageIndex = 0; redraw("forecast-filter"); };
      document.getElementById("forecast-prev").onclick = () => { pageIndex--; redraw("forecast-entries-heading"); };
      document.getElementById("forecast-next").onclick = () => { pageIndex++; redraw("forecast-entries-heading"); };
      container.querySelectorAll("[data-forecast-resolve]").forEach(button => button.onclick = () => {
        const entry = entries.find(item => item.id === button.dataset.forecastResolve), outcome = Number(button.dataset.outcome);
        const message = C.t("forecast.confirmResolve", { claim: entry.claim, outcome: C.t(outcome ? "forecast.yes" : "forecast.no") }) +
          (entry.resolveBy > C.today() ? "\n\n" + C.t("forecast.earlyResolution") : "");
        if (!confirm(message)) return;
        try { report(C.Storage.resolveForecast(entry.id, outcome), "forecast.resolved", entry.id); } catch (exception) { error(exception); }
      });
      container.querySelectorAll("[data-forecast-void]").forEach(button => button.onclick = () => {
        if (!confirm(C.t("forecast.confirmVoid"))) return;
        try { report(C.Storage.voidForecast(button.dataset.forecastVoid), "forecast.voided", button.dataset.forecastVoid); } catch (exception) { error(exception); }
      });
      container.querySelectorAll("[data-forecast-accept]").forEach(button => button.onclick = () => {
        if (!confirm(C.t("forecast.confirmConflict"))) return;
        try { report(C.Storage.acceptForecastConflict(button.dataset.forecastAccept), "forecast.reviewed", button.dataset.forecastAccept); } catch (exception) { error(exception); }
      });
    }
  };
  C.define("forecasting", "calibration", { defaultProbability: p(50, 0, 100), defaultDeadlineDays: p(7, 0, 3650),
    calibrationBins: p(10, 2, 20), pageSize: p(25, 10, 100, 5), claimMaxLength: p(500, 100, 2000, 100) }, task);
})();
