"use strict";

const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const { createStaticServer } = require("../../scripts/serve.cjs");
const { open, noOverflow, seedSessions, capture, enableClock, playPhase } = require("./helpers.cjs");

test.beforeEach(async ({ page }) => {
  page.appErrors = [];
  page.on("pageerror", error => page.appErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") page.appErrors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(page.appErrors).toEqual([]); });

test("all exercises and supporting pages fit desktop and phone viewports in both languages and themes", async ({ page }, testInfo) => {
  await open(page);
  const ids = await page.evaluate(() => window.Cortex.Tasks.map(task => task.id));
  expect(ids).toHaveLength(26);
  const viewport = page.viewportSize();
  for (const language of ["en", "de"]) {
    for (const theme of ["light", "dark"]) {
      await page.evaluate(({ language, theme }) => {
        window.Cortex.Storage.setSettings({ language, theme });
        window.Cortex.UI.syncPreferences(); window.Cortex.UI.render();
      }, { language, theme });
      for (const route of ["home", "library", "results", "data", "about", "reliability", ...ids.map(id => `task/${id}`)]) {
        await open(page, route);
        await expect(page).toHaveTitle("BBG");
        await expect(page.locator("body")).not.toContainText("Cortex");
        await noOverflow(page);
      }
      await open(page);
      await capture(page, testInfo, `today-${language}-${theme}`);
    }
  }
  await page.setViewportSize({ width: 320, height: 568 });
  for (const route of ["home", "library", "results", "data", "task/forecasting", "task/mental-rotation", "task/tower-london"]) {
    await open(page, route); await noOverflow(page);
    await expect(page.locator(".brand small")).toHaveText("Benny's Brain Gym");
    await expect(page.locator(".brand small")).toBeVisible();
  }
  await open(page);
  await capture(page, testInfo, "today-320");
  await page.setViewportSize({ width: 844, height: 390 });
  await noOverflow(page);
  await page.setViewportSize(viewport);
  await open(page, "unknown");
  await expect(page.locator("#app a[href='#home']")).toBeVisible();
});

test("BBG branding and Benny's Brain Gym subheadline preserve the existing app identity and data", async ({ page }) => {
  await open(page);
  await seedSessions(page, 1);
  await page.evaluate(() => window.Cortex.Storage.setSettings({ favorites: ["number-series"] }));
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("BBG");
  expect(manifest.short_name).toBe("BBG");
  expect(manifest.id).toBe("./");
  expect(manifest.scope).toBe("./");
  expect(manifest.start_url).toBe("./#home");
  expect(manifest.description).toContain("not easy-win games");
  expect(manifest.description).toContain("Benny's Brain Gym");
  expect(await (await page.request.get("/icons/icon.svg")).text()).toContain("<title>BBG</title>");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "BBG");
  for (const language of ["en", "de"]) {
    await page.evaluate(language => {
      window.Cortex.Storage.setSettings({ language });
      window.Cortex.UI.syncPreferences(); window.Cortex.UI.render();
    }, language);
    await page.reload();
    await expect(page).toHaveTitle("BBG");
    await expect(page.locator(".brand")).toHaveAccessibleName("BBG");
    await expect(page.locator(".brand-name")).toHaveText("BBG");
    await expect(page.locator(".brand small")).toHaveText("Benny's Brain Gym");
    await expect(page.locator(".brand small")).toBeVisible();
    const copy = await page.evaluate(() => {
      const C = window.Cortex, stored = JSON.parse(localStorage.getItem("cortex.v1"));
      return {
        description: document.querySelector('meta[name="description"]').content,
        expectedDescription: C.t("app.description"),
        home: C.t("home.subtitle"), library: C.t("library.subtitle"),
        records: stored.sessions.length, favorites: stored.settings.favorites, schema: stored.schemaVersion,
        dictionaries: Object.values(window.CortexI18n.dictionaries[C.language])
      };
    });
    expect(copy.description).toBe(copy.expectedDescription);
    expect(copy.description).toContain("BBG - Benny's Brain Gym");
    expect(copy.records).toBe(2);
    expect(copy.favorites).toContain("number-series");
    expect(copy.schema).toBe(1);
    expect(copy.home).toMatch(language === "en" ? /not easy-win games.*Adaptive exercises/ : /statt einfacher Spielsiege.*Adaptive Übungen/);
    expect(copy.library).toMatch(language === "en" ? /no reward loops/ : /keine Belohnungsschleifen/);
    for (const value of copy.dictionaries) expect(value).not.toMatch(/\b(?:Cortex|Bennys Brain Gym|Bennys Gym)\b/);
    await open(page, "about");
    await expect(page.locator(".prose")).toContainText(language === "en" ? "not manufactured wins" : "statt künstliche Siege");
    await expect(page.locator(".prose")).toContainText(language === "en" ? "Non-adaptive tasks and assessments" : "Nicht adaptive Aufgaben und Messungen");
  }
});

test.describe("static BBG branding", () => {
  test.use({ javaScriptEnabled: false });

  test("the app name and subheadline are visible without JavaScript", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("BBG");
    await expect(page.locator(".brand-name")).toHaveText("BBG");
    await expect(page.locator(".brand small")).toHaveText("Benny's Brain Gym");
    await expect(page.locator(".brand small")).toBeVisible();
    await expect(page.locator("noscript p")).toContainText("BBG (Benny's Brain Gym) needs JavaScript");
    await noOverflow(page);
  });
});

test("search, categories, favorites and training/assessment mode keep clear keyboard focus", async ({ page }) => {
  await open(page, "library");
  await page.locator("#task-search").fill("flanker");
  await expect(page.locator(".task-card")).toHaveCount(1);
  const favorite = page.locator('[data-favorite="flanker-squared"]');
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await expect(favorite).toBeFocused();
  await page.locator("#favorites-only").click();
  await page.locator('[data-mode="assessment"]').click();
  await expect(page.locator('[data-mode="assessment"]')).toBeFocused();
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.reload();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().favorites)).toContain("flanker-squared");
  await page.locator("#task-search").fill("flanker");
  await page.locator("#favorites-only").click();
  await page.locator('[data-favorite="flanker-squared"]').click();
  await expect(page.locator("#favorites-only")).toBeFocused();
  await expect(page.locator("#clear-library")).toBeVisible();
  await page.locator("#clear-library").click();
  await expect(page.locator(".task-card")).toHaveCount(26);
  await expect(page.locator("#task-search")).toBeFocused();
});

test("decorative category cues do not act as filters or interfere with exercise controls", async ({ page }) => {
  await open(page);
  await page.locator(".hero-domains span").first().click();
  await expect(page.locator("#start-routine")).toBeVisible();
  await page.locator(".routine-list strong").first().click();
  await expect(page.locator("#start-routine")).toBeVisible();
  await open(page, "library");
  await page.locator(".task-card .task-domain").first().click();
  await expect(page.locator(".task-card")).toHaveCount(26);
  await page.locator(".task-card .task-title").first().click();
  await expect(page.locator(".task-card")).toHaveCount(26);
  await page.locator('.domain-filters [data-domain="reasoning"]').click();
  await expect(page.locator('.domain-filters [data-domain="reasoning"]')).toBeFocused();
  await expect(page.locator('.task-card:not([data-domain="reasoning"])')).toHaveCount(0);
  await page.locator(".task-card .button").first().click();
  await expect(page.locator("#start-practice")).toBeVisible();
  await page.locator(".task-hero .task-domain").click();
  await expect(page.locator("#start-practice")).toBeVisible();
  await page.locator('[data-input="mouse"]').click();
  await expect(page.locator('[data-input="mouse"]')).toBeFocused();
  await expect(page.locator("#start-practice")).toBeVisible();
});

test("general and exercise settings persist, validate ranges, and restore focus", async ({ page }) => {
  await open(page);
  await page.locator("#open-settings").click();
  await expect(page.locator("#preferences-dialog")).toBeVisible();
  await page.locator('[name="routineMinutes"]').selectOption("15");
  await page.locator('[name="theme"]').selectOption("dark");
  await page.locator("#language").selectOption("de");
  await page.locator("#preferences-form button[type='submit']").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().routineMinutes)).toBe(15);
  await page.locator("#open-settings").click();
  await page.locator("#preferences-data").click();
  await expect(page.locator("#preferences-dialog")).not.toBeVisible();
  await expect(page.locator("#import-file")).toBeVisible();
  await open(page, "task/number-series");
  await page.locator("#task-settings").click();
  await page.locator('[name="minLevel"]').fill("5");
  await page.locator('[name="maxLevel"]').fill("1");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#settings-error")).toBeVisible();
  await expect(page.locator("#settings-error")).toBeFocused();
  await page.locator("#reset-params").click();
  await page.locator('[name="trials"]').fill("15");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#task-settings")).toBeFocused();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().taskParams["number-series"].trials)).toBe(15);
});

test("history pagination and mode filters start at the correct page; saved links support legacy IDs", async ({ page }) => {
  await open(page);
  await seedSessions(page);
  await open(page, "results");
  await page.locator("#result-task").selectOption("flanker-squared");
  await page.locator("#history-next").click();
  await expect(page.locator("#history-heading")).toBeFocused();
  await expect(page.locator(".history-card")).toContainText("21–40");
  await page.locator('[data-history-mode="assessment"]').click();
  await expect(page.locator(".history-card")).toContainText("1–20");
  await expect(page.locator('[data-history-mode="assessment"]')).toBeFocused();
  await page.locator('[data-history-mode="training"]').click();
  await page.locator(".history-card tbody a").first().click();
  await expect(page).toHaveURL(/#session\/saved%20%2F%20round%3F$/);
  await expect(page.locator(".completion-card")).toBeVisible();
  await page.locator(".result-detail summary").click();
  await expect(page.locator(".result-detail")).toContainText("saved / round?");
  await noOverflow(page);
});

test("forecast drafts survive reload; immutable entries resolve, filter, calibrate and void", async ({ page }, testInfo) => {
  await open(page, "task/forecasting");
  await page.locator('[name="claim"]').fill("I will finish my planned practice before breakfast.");
  await page.locator('[name="topic"]').fill("Morning practice");
  await page.locator('[name="probability"]').fill("75");
  await page.reload();
  await expect(page.locator('[name="claim"]')).toHaveValue("I will finish my planned practice before breakfast.");
  await page.locator("#forecast-form button[type='submit']").click();
  await expect(page.locator("#forecast-status")).toBeFocused();
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(1);
  expect(await page.evaluate(() => sessionStorage.getItem("cortex.forecastDraft.v1"))).toBeNull();
  page.once("dialog", dialog => dialog.accept());
  await page.locator('[data-forecast-resolve][data-outcome="1"]').click();
  await expect(page.locator(".forecast-table tbody tr")).toBeFocused();
  expect(await page.evaluate(() => window.Cortex.Stats.forecasting(window.Cortex.Storage.getForecasts()).meanBrier)).toBe(.0625);
  await page.locator("#forecast-filter").selectOption("resolved");
  await expect(page.locator("#forecast-filter")).toBeFocused();
  await noOverflow(page);
  await capture(page, testInfo, "forecast-resolved");
  const csvDownload = page.waitForEvent("download");
  await page.locator("#forecast-csv").click();
  expect((await csvDownload).suggestedFilename()).toMatch(/^bbg-forecasts-\d{4}-\d{2}-\d{2}\.csv$/);
  page.once("dialog", dialog => dialog.accept());
  await page.locator("[data-forecast-void]").click();
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(0);
  await expect(page.locator("#forecast-entries-heading")).toBeFocused();
  await page.locator("#forecast-filter").selectOption("void");
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(1);
});

test("forecast pagination, topic filters and imported conflicts preserve focus and need explicit review", async ({ page }) => {
  await open(page, "task/forecasting");
  await page.evaluate(async () => {
    const C = window.Cortex, root = C.Storage.snapshot();
    root.settings.taskParams.forecasting = { ...C.taskParams(C.Tasks.find(task => task.id === "forecasting")), pageSize: 10 };
    root.forecasts = Array.from({ length: 22 }, (_, index) => ({
      id: `forecast-${index}`, claim: `Practice plan ${index + 1}`, topic: index % 2 ? "Weekday" : "Weekend",
      probability: .7, resolveBy: C.today(), createdAt: C.iso(), language: "en",
      status: "open", outcome: null, resolvedAt: null
    }));
    await C.Storage.importAll({ text: async () => JSON.stringify(root) });
    C.UI.render();
  });
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(10);
  await page.locator("#forecast-next").click();
  await expect(page.locator("#forecast-entries-heading")).toBeFocused();
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(10);
  await page.locator("#forecast-topic").selectOption("Weekend");
  await expect(page.locator("#forecast-topic")).toBeFocused();
  await page.locator("#forecast-next").click();
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(1);
  await page.evaluate(async () => {
    const C = window.Cortex, backup = C.Storage.snapshot();
    backup.forecasts = [{ ...backup.forecasts.find(entry => entry.id === "forecast-0"), probability: .4 }];
    await C.Storage.importAll({ text: async () => JSON.stringify(backup) });
    C.UI.render();
  });
  await page.locator("#forecast-filter").selectOption("conflict");
  await expect(page.locator("#forecast-filter")).toBeFocused();
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(1);
  expect(await page.evaluate(() => window.Cortex.Stats.forecasting(window.Cortex.Storage.getForecasts()).resolved)).toBe(0);
  page.once("dialog", dialog => dialog.dismiss());
  await page.locator("[data-forecast-accept]").click();
  await expect(page.locator("[data-forecast-accept]")).toBeVisible();
  page.once("dialog", dialog => dialog.accept());
  await page.locator("[data-forecast-accept]").click();
  await expect(page.locator("#forecast-entries-heading")).toBeFocused();
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(0);
  expect(await page.evaluate(() => {
    const entries = window.Cortex.Storage.getForecasts();
    return { original: entries.find(entry => entry.id === "forecast-0").status,
      accepted: entries.find(entry => entry.conflictOf === "forecast-0").status };
  })).toEqual({ original: "void", accepted: "open" });
  await page.locator("#forecast-filter").selectOption("open");
  await expect(page.locator(".forecast-table tbody tr")).toHaveCount(10);
  await noOverflow(page);
});

test("JSON backup, repeated restore and confirmed deletion preserve data and avoid duplicates", async ({ page }) => {
  await open(page);
  await seedSessions(page, 1);
  await open(page, "data");
  const download = page.waitForEvent("download");
  await page.locator("#export-json").click();
  const backup = await download, buffer = await readFile(await backup.path());
  expect(backup.suggestedFilename()).toMatch(/^bbg-\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(buffer).sessions).toHaveLength(2);
  const csvDownload = page.waitForEvent("download");
  await page.locator("#export-csv").click();
  expect((await csvDownload).suggestedFilename()).toMatch(/^bbg-\d{4}-\d{2}-\d{2}\.csv$/);
  const payload = { name: "cortex-legacy-backup.json", mimeType: "application/json", buffer };
  for (const name of ["bennys-brain-gym-legacy-backup.json", payload.name]) {
    await page.locator("#import-status").evaluate(node => { node.textContent = ""; });
    await page.locator("#import-file").setInputFiles({ ...payload, name });
    await expect(page.locator("#import-status")).toContainText(await page.evaluate(() =>
      window.Cortex.t("data.imported", { added: 0, conflicts: 0 })));
    expect(await page.evaluate(() => window.Cortex.Storage.getSessions().length)).toBe(2);
  }
  await page.locator(".data-management summary").click();
  await page.locator("#wipe-confirm").fill("delete");
  await page.locator("#wipe-form button").click();
  await expect(page.locator("#wipe-error")).not.toBeEmpty();
  await page.locator("#wipe-confirm").fill("DELETE");
  await page.locator("#wipe-form button").click();
  expect(await page.evaluate(() => window.Cortex.Storage.getSessions().length)).toBe(0);
  await page.locator("#import-file").setInputFiles(payload);
  await expect(page.locator("#import-status")).not.toBeEmpty();
  expect(await page.evaluate(() => window.Cortex.Storage.getSessions().length)).toBe(2);
  await page.reload();
  expect(await page.evaluate(() => window.Cortex.Storage.getTrials("saved / round?").length)).toBe(1);
});

test("a complete daily routine keeps its actual task protocols, warm-ups, responses and resume state", async ({ page }, testInfo) => {
  test.setTimeout(180000);
  await enableClock(page);
  await page.locator("#start-routine").click();
  await expect(page.locator(".routine-banner")).toBeVisible();
  const planned = await page.evaluate(() => window.Cortex.Routine.current().steps.length);
  expect(planned).toBe(3);
  for (let index = 0; index < planned; index++) {
    await page.locator("#start-practice").click();
    await playPhase(page, "practice");
    await expect(page.locator("#start-main")).toBeVisible();
    expect(await page.evaluate(() => window.Cortex.practiceCount(window.Cortex.active.practiceTrials))).toBe(8);
    await page.locator("#start-main").click();
    await playPhase(page, "block");
    await expect(page.locator(".completion-card")).toBeVisible();
    const summary = await page.evaluate(() => window.Cortex.Storage.getSessions()[0]);
    expect(summary.completedMain).toBe(true);
    expect(summary.practiceCount).toBe(8);
    expect(summary.invalidReasons).toEqual([]);
    await page.locator(".completion-card .primary").click();
    if (index === 0) {
      await page.reload();
      await page.clock.runFor(600);
      expect(await page.evaluate(() => window.Cortex.Routine.next().index)).toBe(1);
      await page.evaluate(() => {
        const original = window.Cortex.Runner.prototype.trial;
        window.Cortex.Runner.prototype.trial = function (spec) { this.browserSpec = spec; return original.call(this, spec); };
      });
    }
  }
  expect(await page.evaluate(() => window.Cortex.Routine.isDone(window.Cortex.Routine.current()))).toBe(true);
  expect(await page.evaluate(() => window.Cortex.Storage.getSessions().length)).toBe(3);
  await capture(page, testInfo, "routine-complete");
  await open(page);
  await expect(page.locator(".consistency-card h2")).toHaveText("1 day of practice");
});

test("interrupted practice offers recovery without advancing; skipping persists after reload", async ({ page }) => {
  await enableClock(page);
  await page.locator("#start-routine").click();
  await page.locator("#start-practice").click();
  await page.clock.runFor(3200);
  await page.locator("#abort").click({ force: true });
  await expect(page.locator(".completion-card")).toBeVisible();
  expect(await page.evaluate(() => window.Cortex.Routine.next().index)).toBe(0);
  expect(await page.evaluate(() => window.Cortex.Storage.getSessions()[0].invalid)).toBe(true);
  await page.locator("#skip-round").click();
  expect(await page.evaluate(() => window.Cortex.Routine.next().index)).toBe(1);
  await page.reload();
  await expect(page.locator(".routine-banner")).toBeVisible();
  expect(await page.evaluate(() => window.Cortex.Routine.next().index)).toBe(1);
});

for (const timezoneId of ["Asia/Tokyo", "Pacific/Honolulu"]) test.describe(`local calendar in ${timezoneId}`, () => {
  test.use({ timezoneId });
  test("weekly activity includes the first local morning and excludes dates outside the window", async ({ page }) => {
    await enableClock(page);
    await page.evaluate(async () => {
      const C = window.Cortex, task = C.Tasks.find(task => task.id === "flanker-squared");
      const first = new Date(`${C.today()}T00:00:00`);
      first.setDate(first.getDate() - 6);
      const morning = new Date(first); morning.setHours(8);
      const future = new Date(`${C.today()}T08:00:00`); future.setDate(future.getDate() + 1);
      const root = C.Storage.snapshot();
      root.sessions = [morning, new Date(first.getTime() - 60000), future].map((date, index) => ({
        id: `calendar-${index}`, taskId: task.id, mode: "training", startedAt: date.toISOString(),
        durationMs: 90000, params: { ...task.params }, language: C.language,
        deviceClass: C.device(), inputMethod: C.input, refreshHz: 60,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        invalid: false, invalidReasons: [], completedMain: true, practiceOnly: false, practiceCount: 8,
        protocolVersion: 2, stimulusSet: "visual", splitHalf: null, score: { correctPer90: 60, accuracy: .9, correct: 60 }
      }));
      await C.Storage.importAll({ text: async () => JSON.stringify(root) });
      C.UI.render();
    });
    await expect(page.locator(".consistency-card h2")).toHaveText("1 day of practice");
    await expect(page.locator(".week-strip .practiced")).toHaveCount(1);
    await expect(page.locator(".week-strip li").first()).toHaveClass(/practiced/);
    await open(page, "results");
    await expect(page.locator(".progress-overview h2")).toHaveText("1 day of practice");
    await expect(page.locator(".week-strip .practiced")).toHaveCount(1);
  });
});

test("an installed app shell, exercises, preferences and saved records reopen offline", async ({ page, context, browserName }) => {
  test.setTimeout(120000);
  const server = createStaticServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const stop = () => new Promise((resolve, reject) => {
    if (!server.listening) return resolve();
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  });
  try {
    await open(page, "home", origin);
    await seedSessions(page, 1);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
    });
    await expect(page.locator('[data-notice="pwa.updateReady"]')).toHaveCount(0);
    await page.evaluate(() => {
      const C = window.Cortex;
      C.Storage.setSettings({ theme: "dark", colorTheme: "graphite" }); C.UI.syncPreferences(); C.UI.render();
    });
    // WebKit's offline flag rejects even literal worker responses: microsoft/playwright#42775.
    // Stopping this test-owned origin verifies the real cached path without that emulation bug.
    if (browserName === "webkit") await stop();
    else await context.setOffline(true);
    await page.clock.install();
    const response = await page.reload();
    await page.clock.runFor(600);
    await page.waitForFunction(() => window.Cortex.Timing.refreshHz >= 50);
    expect(response.fromServiceWorker()).toBe(true);
    await expect(page.locator("#start-routine")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
    expect(await page.evaluate(() => typeof window.Cortex.Reminders.check)).toBe("function");
    await page.locator("#open-settings").click();
    await page.locator('[name="routineTime"]').fill("18:30");
    await page.locator("#save-preferences").click();
    await expect(page.locator(".routine-card h2")).toHaveText("Evening practice");
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
    await page.locator("#share-app").click();
    await expect(page.locator("#share-link")).toHaveValue(`${origin}/#home`);
    await page.locator("#close-share").click();
    await open(page, "task/number-series", origin);
    await expect(page.locator("#start-practice")).toBeVisible();
    await open(page, "task/method-loci", origin);
    await expect(page.locator("#loci-lesson")).toContainText("Learn the memory-palace technique");
    await page.locator("#task-settings").click();
    await page.locator('[name="itemSet"]').selectOption("cards");
    await page.locator('[name="trials"]').fill("2");
    await page.locator("#settings-form button[type='submit']").click();
    await expect(page.locator("#loci-lesson")).toContainText("All 52 standard cards");
    await page.locator("#start-practice").click();
    await playPhase(page, "practice");
    await expect(page.locator("#start-main")).toBeVisible();
    await page.locator("#start-main").click();
    await playPhase(page, "block");
    await expect(page.locator(".completion-card")).toBeVisible();
    expect(await page.evaluate(() => {
      const C = window.Cortex, summary = C.Storage.getSessions("method-loci")[0];
      return { complete: summary.completedMain, valid: !summary.invalid, score: summary.score.partialCreditLoad,
        catalogue: C.Storage.getTrials(summary.id).find(row => row.phase === "main").choices.length };
    })).toEqual({ complete: true, valid: true, score: 1, catalogue: 52 });
    await open(page, "results", origin);
    await page.locator("#result-task").selectOption("flanker-squared");
    await expect(page.locator(".history-card tbody tr")).toHaveCount(1);
    await noOverflow(page);
  } finally { await context.setOffline(false); await stop(); }
});
