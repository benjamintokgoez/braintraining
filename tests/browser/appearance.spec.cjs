"use strict";

const { test, expect } = require("@playwright/test");
const { open, noOverflow, contrastFailures, seedSessions, enableClock } = require("./helpers.cjs");

test("appearance previews are reversible through Close, Cancel and Escape without saving other edits", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page);
  const original = await page.evaluate(() => window.Cortex.Storage.snapshot());
  for (const close of ["close", "cancel", "escape"]) {
    await page.locator("#open-settings").click();
    await page.locator('[name="theme"]').selectOption("dark");
    await page.locator('[name="colorTheme"]').selectOption("graphite");
    await page.locator('[name="routineMinutes"]').selectOption("20");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
    expect(await page.evaluate(() => window.Cortex.Storage.snapshot())).toEqual(original);
    if (close === "escape") await page.keyboard.press("Escape");
    else await page.locator(close === "close" ? "#close-preferences" : "#cancel-preferences").click();
    await expect(page.locator("#preferences-dialog")).not.toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", "rose");
    await expect(page.locator("#open-settings")).toBeFocused();
    expect(await page.evaluate(() => window.Cortex.Storage.snapshot())).toEqual(original);
  }
  await page.locator("#open-settings").click();
  await page.locator('[name="colorTheme"]').selectOption("amber");
  await page.locator("#preferences-share").click();
  await expect(page.locator("#share-dialog")).toBeVisible();
  await page.locator("#close-share").click();
  await expect(page.locator("#preferences-share")).toBeFocused();
  await expect(page.locator('[name="colorTheme"]')).toHaveValue("amber");
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "amber");
  await page.locator("#cancel-preferences").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "rose");
});

test("every color and brightness choice saves, reloads and preserves the started routine", async ({ page }) => {
  await open(page);
  const routine = await page.evaluate(() => window.Cortex.Routine.start());
  for (const colorTheme of ["rose", "graphite", "amber"]) for (const theme of ["light", "dark"]) {
    await page.locator("#open-settings").click();
    await page.locator('[name="theme"]').selectOption(theme);
    await page.locator('[name="colorTheme"]').selectOption(colorTheme);
    await page.locator("#save-preferences").click();
    await expect(page.locator("#preferences-dialog")).not.toBeVisible();
    await page.reload();
    await expect(page.locator("#app h1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", colorTheme);
    const stored = await page.evaluate(() => ({
      settings: window.Cortex.Storage.getSettings(), routine: window.Cortex.Routine.current()
    }));
    expect(stored.settings.theme).toBe(theme);
    expect(stored.settings.colorTheme).toBe(colorTheme);
    expect(stored.routine).toEqual(routine);
  }
});

test("device brightness is live, respects explicit previews and returns to the current device choice on cancel", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page);
  await page.evaluate(() => {
    const C = window.Cortex;
    C.Storage.setSettings({ theme: "system", colorTheme: "amber" }); C.UI.syncPreferences(); C.UI.render();
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "amber");
  await page.locator("#open-settings").click();
  await page.locator('[name="theme"]').selectOption("light");
  await page.locator('[name="colorTheme"]').selectOption("graphite");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
  await page.locator("#close-preferences").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "amber");
  await page.locator("#open-settings").click();
  await page.locator('[name="theme"]').selectOption("light");
  await page.locator("#save-preferences").click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("saved colors and brightness apply before deferred application scripts run", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("cortex.v1", JSON.stringify({
    schemaVersion: 1, settings: { language: "en", theme: "dark", colorTheme: "graphite" },
    sessions: [], trials: {}, itemHashes: {}, forecasts: [], routine: null
  })));
  let release;
  const scriptsReady = new Promise(resolve => { release = resolve; });
  await page.route("**/js/core.js", async route => { await scriptsReady; await route.continue(); });
  try {
    await page.goto("/#home", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
    expect(await page.evaluate(() => typeof window.Cortex)).toBe("undefined");
  } finally { release(); }
  await expect(page.locator("#app h1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/?scoutTheme=light#home");
  await expect(page.locator("#app h1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().theme)).toBe("dark");
});

test("Graphite stays monochrome and settings stay readable in both languages at 320 pixels", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await open(page);
  for (const language of ["en", "de"]) for (const theme of ["light", "dark"]) {
    await page.evaluate(value => {
      const C = window.Cortex;
      C.Storage.setSettings({ ...value, colorTheme: "graphite" }); C.UI.syncPreferences(); C.UI.render();
    }, { language, theme });
    await open(page, "library");
    const colors = await page.locator(".task-domain, .main-nav a[aria-current='page']").evaluateAll(elements =>
      elements.map(element => getComputedStyle(element).color.match(/\d+/g).slice(0, 3).map(Number)));
    for (const channels of colors) expect(Math.max(...channels) - Math.min(...channels)).toBe(0);
    await page.locator("#open-settings").click();
    await expect(page.locator('[name="colorTheme"]')).toHaveValue("graphite");
    await expect(page.locator("#appearance-help")).toContainText(language === "de" ? "Graphit" : "Graphite");
    expect(await contrastFailures(page)).toEqual([]);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`appearance-320-${language}-${theme}.png`), animations: "disabled" });
    await page.locator("#close-preferences").click();
  }
});

test("canceling a preview adopts an idle-tab appearance update instead of restoring stale preferences", async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await open(page);
  await page.locator("#open-settings").click();
  await page.locator('[name="colorTheme"]').selectOption("graphite");
  const other = await context.newPage();
  await open(other);
  await other.evaluate(() => {
    const C = window.Cortex;
    C.Storage.setSettings({ theme: "dark", colorTheme: "amber" }); C.UI.syncPreferences(); C.UI.render();
  });
  await expect.poll(() => page.evaluate(() => window.Cortex.Storage.getSettings().colorTheme)).toBe("amber");
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "graphite");
  await page.locator("#close-preferences").click();
  await expect(page.locator("html")).toHaveAttribute("data-color-theme", "amber");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await other.close();
});

test("system brightness changes wait for a running round and never alter its task palette", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await enableClock(page);
  await page.evaluate(() => {
    const C = window.Cortex;
    C.Storage.setSettings({ theme: "system", colorTheme: "graphite" }); C.UI.syncPreferences(); C.UI.render();
  });
  await open(page, "task/number-series");
  await page.locator("#start-practice").click();
  await page.clock.runFor(3500);
  await page.waitForFunction(() => Boolean(window.Cortex.active?.current));
  const palette = await page.evaluate(() => window.Cortex.Draw.palette);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => Boolean(window.Cortex.active?.current))).toBe(true);
  expect(await page.evaluate(() => window.Cortex.Draw.palette)).toEqual(palette);
  await page.locator("#abort").click({ force: true });
  await expect(page.locator(".completion-card")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const taskColors = value => Object.fromEntries(Object.entries(value).filter(([key]) =>
    key.startsWith("task-") || key.startsWith("stim-") || key.startsWith("accent")));
  expect(taskColors(await page.evaluate(() => window.Cortex.Draw.palette))).toEqual(taskColors(palette));
});

test("monochrome progress charts match distinct line patterns and point shapes to their legends", async ({ page }) => {
  await open(page);
  await seedSessions(page, 2);
  await page.evaluate(async () => {
    const C = window.Cortex, root = C.Storage.snapshot(), sample = root.sessions.find(row => row.mode === "training");
    root.sessions.push(...Array.from({ length: 8 }, (_, index) => ({ ...sample, id: `style-${index}`,
      params: { ...sample.params, deadlineMs: 1000 + Math.floor(index / 2) * 100 },
      score: { ...sample.score, correctPer90: 40 + index * 3 } })));
    await C.Storage.importAll({ text: async () => JSON.stringify(root) });
    C.Storage.setSettings({ colorTheme: "graphite" }); C.UI.syncPreferences(); C.UI.render();
  });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => {
      const C = window.Cortex;
      C.Storage.setSettings({ theme }); C.UI.syncPreferences(); C.UI.render();
    }, theme);
    await open(page, "results");
    await page.locator("#result-task").selectOption("flanker-squared");
    const chart = page.locator(".chart-card").first();
    const lines = await chart.locator("polyline").evaluateAll(nodes => nodes.map(node => node.getAttribute("stroke-dasharray")));
    const legend = await chart.locator(".series-symbol line").evaluateAll(nodes => nodes.map(node => node.getAttribute("stroke-dasharray")));
    expect(lines).toEqual(["none", "8 4", "2 3", "8 3 2 3"]);
    expect(legend).toEqual(lines);
    const markers = await chart.locator(".series-point").evaluateAll(nodes => nodes.map(node => node.dataset.marker));
    expect(new Set(markers)).toEqual(new Set(["0", "1", "2", "3"]));
    for (const shape of ["circle", "rect", "path"]) await expect(chart.locator(`.series-symbol ${shape}`).first()).toBeVisible();
    expect(await contrastFailures(page)).toEqual([]);
    await noOverflow(page);
  }
});
