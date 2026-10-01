"use strict";

const { test, expect } = require("@playwright/test");
const { open, seedSessions, noOverflow, capture } = require("./helpers.cjs");

test.beforeEach(async ({ page }) => {
  page.appErrors = [];
  page.on("pageerror", error => page.appErrors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(page.appErrors).toEqual([]); });

test("numerical journey uses one setup and mode even with chart overlays, and saved rounds stop at their own date", async ({ page }) => {
  await open(page);
  await seedSessions(page, 6);
  await open(page, "results");
  await page.locator("#result-task").selectOption("flanker-squared");
  const journey = page.locator(".journey-card");
  await expect(journey).toHaveAttribute("data-journey-status", "review");
  await expect(journey).toContainText("Usable scores: 6 · valid rounds in this setup: 6");
  await expect(journey.locator(".metric strong")).toHaveText(["60", "64", "61", "Lower by 3"]);
  await expect(page.locator(".research-card")).toContainText("No validated reference yet");
  await page.evaluate(async () => {
    const C = window.Cortex, root = C.Storage.snapshot(), original = root.sessions[0];
    root.sessions.push({ ...original, id: "different-settings", params: { ...original.params, deadlineMs: 1200 },
      score: { ...original.score, correctPer90: 999 } });
    root.sessions.push({ ...original, id: "different-device", deviceClass: original.deviceClass === "phone" ? "desktop" : "phone",
      score: { ...original.score, correctPer90: 999 } });
    await C.Storage.importAll({ text: async () => JSON.stringify(root) });
    C.UI.results();
  });
  await expect(page.locator("#journey-setup option")).toHaveCount(2);
  await page.locator(".comparison-filters summary").click();
  await page.locator("#overlay").check();
  await expect(journey).toContainText("Usable scores: 6 · valid rounds in this setup: 6");
  await expect(journey.locator(".metric strong")).toHaveText(["60", "64", "61", "Lower by 3"]);
  await page.locator("#journey-setup").selectOption("different-settings");
  await expect(page.locator("#journey-setup")).toBeFocused();
  await expect(journey).toHaveAttribute("data-journey-status", "baseline");
  await expect(journey).toContainText("Usable scores: 1 · valid rounds in this setup: 1");
  await page.locator('[data-history-mode="assessment"]').click();
  await expect(journey).toContainText("Usable scores: 6 · valid rounds in this setup: 6");
  await expect(journey.locator(".metric strong")).toHaveText(["66", "70", "67", "Lower by 3"]);
  await open(page, "session/round-4");
  await expect(journey).toContainText("Usable scores: 2 · valid rounds in this setup: 2");
  await expect(journey).toHaveAttribute("data-journey-status", "baseline");
});

test("guarded thresholds stay unavailable and other threshold metrics can be selected without mixing estimators", async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    const C = window.Cortex, root = C.Storage.snapshot(), task = C.Tasks.find(task => task.id === "ufov");
    root.sessions = Array.from({ length: 6 }, (_, index) => ({
      id: `ufov-${index}`, taskId: task.id, mode: "assessment",
      startedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), durationMs: 90000,
      params: { ...task.params }, language: C.language, deviceClass: C.device(), inputMethod: C.input,
      refreshHz: 60, viewport: { width: innerWidth, height: innerHeight, dpr: 1 },
      invalid: false, invalidReasons: [], completedMain: true, practiceOnly: false, practiceCount: 8,
      protocolVersion: 2, stimulusSet: "visual", splitHalf: null,
      score: { centralThreshold: null, dividedThreshold: 200 - index * 10, selectiveThreshold: null }
    }));
    await C.Storage.importAll({ text: async () => JSON.stringify(root) });
  });
  await open(page, "results");
  await page.locator("#result-task").selectOption("ufov");
  await page.locator('[data-history-mode="assessment"]').click();
  const journey = page.locator(".journey-card");
  await expect(journey).toContainText("Usable scores: 0 · valid rounds in this setup: 6");
  await expect(journey).toContainText("Missing or guarded estimates are not zero");
  await expect(journey.locator(".metric strong")).toHaveText(["—", "—", "—", "—"]);
  await page.locator("#journey-metric").selectOption("dividedThreshold");
  await expect(page.locator("#journey-metric")).toBeFocused();
  await expect(journey).toHaveAttribute("data-journey-status", "review");
  await expect(journey.locator(".metric strong")).toHaveText(["150 ms", "190 ms", "160 ms", "Lower by 30 ms"]);
  await expect(journey).toContainText("Lower is the preferred direction");
  await page.locator('[data-history-mode="training"]').click();
  await expect(journey).toContainText("Usable scores: 0 · valid rounds in this setup: 0");
});

test("percentage-point changes, method details and research stay readable in both themes and languages at 320px", async ({ page }, testInfo) => {
  await open(page);
  // Full-page Chromium screenshots can change emulated pointer media; keep the recorded input explicit.
  await page.evaluate(() => window.Cortex.Storage.setSettings({ inputMethod: window.Cortex.input }));
  await seedSessions(page, 6);
  await page.evaluate(async () => {
    const C = window.Cortex, root = C.Storage.snapshot(), task = C.Tasks.find(task => task.id === "running-span");
    root.sessions = root.sessions.slice(0, 6).map((row, index) => ({ ...row, id: `running-${index}`, taskId: task.id, params: { ...task.params },
      stimulusSet: "digits", score: { partialCreditLoad: (6 - index) / 10, span: 3 } }));
    root.trials = {};
    await C.Storage.importAll({ text: async () => JSON.stringify(root) });
  });
  await open(page, "results");
  await page.locator("#result-task").selectOption("running-span");
  await page.setViewportSize({ width: 320, height: 568 });
  for (const language of ["en", "de"]) for (const theme of ["light", "dark"]) {
    await page.evaluate(({ language, theme }) => {
      const C = window.Cortex;
      C.Storage.setSettings({ language, theme }); C.UI.syncPreferences(); C.UI.results();
    }, { language, theme });
    await expect(page.locator(".journey-change")).toContainText(language === "en" ? "Higher by 30 percentage points" : "Um 30 Prozentpunkte höher");
    await page.locator(".journey-card details").last().locator("summary").click();
    await page.locator(".research-card summary").click();
    await noOverflow(page);
    await capture(page, testInfo, `journey-${language}-${theme}-320`);
    const links = await page.locator(".research-links a").evaluateAll(nodes => nodes.map(node => ({ href: node.href, rel: node.rel })));
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link.href).toMatch(/^https:\/\/doi\.org\/10\./);
      expect(link.rel).toContain("noopener");
    }
  }
  await open(page, "task/forecasting");
  await expect(page.locator(".research-card")).toContainText("Brier");
  await noOverflow(page);
  expect(await page.evaluate(() => "age" in window.Cortex.Storage.getSettings())).toBe(false);
});

test("accuracy declines remain visible next to an increased speed score", async ({ page }) => {
  await open(page);
  await seedSessions(page, 6);
  await page.evaluate(async () => {
    const C = window.Cortex, root = C.Storage.snapshot();
    root.sessions = root.sessions.slice(0, 6).map((row, index) => ({ ...row, id: `accuracy-${index}`,
      params: { ...row.params, deadlineMs: 1200 }, score: { correctPer90: 120 - index, accuracy: index < 3 ? .7 : .9 } }));
    root.trials = {};
    await C.Storage.importAll({ text: async () => JSON.stringify(root) });
  });
  await open(page, "results");
  await page.locator("#result-task").selectOption("flanker-squared");
  await page.locator("#journey-setup").selectOption("accuracy-0");
  await expect(page.locator(".journey-change")).toContainText("Higher by 3");
  await expect(page.locator(".journey-accuracy")).toContainText("Accuracy also decreased from 90% to 70%");
});
