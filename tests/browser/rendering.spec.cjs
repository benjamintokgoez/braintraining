"use strict";

const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const { open, noOverflow, seedSessions, capture, enableClock, playPhase } = require("./helpers.cjs");

async function contrastFailures(page) {
  return page.evaluate(() => {
    const parse = value => {
      const parts = value.match(/[\d.]+/g)?.map(Number);
      return parts?.length >= 3 ? [...parts.slice(0, 3), parts[3] ?? 1] : null;
    };
    const mix = (foreground, background) => foreground.slice(0, 3).map((value, index) =>
      value * foreground[3] + background[index] * (1 - foreground[3]));
    const luminance = rgb => rgb.map(value => value / 255).map(value =>
      value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
      .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), failures = [];
    let node;
    while ((node = walker.nextNode())) {
      const element = node.parentElement;
      if (!node.textContent.trim() || !element || element.closest("script, style, .visually-hidden, [aria-hidden='true'], :disabled")) continue;
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || style.visibility !== "visible") continue;
      const foreground = parse(element instanceof SVGElement ? style.fill : style.color);
      if (!foreground) continue;
      const layers = [];
      for (let parent = element; parent; parent = parent.parentElement) {
        const color = parse(getComputedStyle(parent).backgroundColor);
        if (color?.[3]) layers.unshift(color);
      }
      let background = [255, 255, 255];
      for (const layer of layers) background = mix(layer, background);
      const a = luminance(mix(foreground, background)), b = luminance(background);
      const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const size = parseFloat(style.fontSize), large = size >= 24 || size >= 18.66 && Number(style.fontWeight) >= 700;
      if (ratio + .015 < (large ? 3 : 4.5)) failures.push({
        text: node.textContent.trim().slice(0, 80), ratio: Number(ratio.toFixed(2)), tag: element.tagName, className: element.getAttribute("class")
      });
    }
    return failures;
  });
}

test("rendered interface text meets contrast thresholds in both themes, including charts and mobile tables", async ({ page }) => {
  await open(page);
  await seedSessions(page, 2);
  await page.evaluate(() => {
    const C = window.Cortex;
    const entry = C.Storage.createForecast({ claim: "Finish practice before breakfast.", probability: .75, resolveBy: C.today(), language: "en" }).entry;
    C.Storage.resolveForecast(entry.id, 1);
  });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => { window.Cortex.Storage.setSettings({ theme }); window.Cortex.UI.render(); }, theme);
    for (const route of ["home", "library", "results", "data", "task/forecasting", "task/number-series"]) {
      await open(page, route);
      if (route === "results") await page.locator("#result-task").selectOption("flanker-squared");
      expect(await contrastFailures(page), `${theme} ${route}`).toEqual([]);
      await noOverflow(page);
    }
  }
});

test("actual spatial and matrix exercises have readable portrait/landscape scenes and 44-pixel native controls", async ({ page }, testInfo) => {
  await enableClock(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const id of ["mental-rotation", "tower-london", "matrix-reasoning"]) {
      await open(page, `task/${id}`);
      await page.locator("#start-practice").click();
      await page.clock.runFor(3500);
      await page.waitForFunction(() => Boolean(window.Cortex.active?.current));
      await expect(page.locator("#stage")).toHaveAttribute("aria-label", /Visual exercise:/);
      const controls = await page.locator("#response-controls button").evaluateAll(buttons => buttons.map(button => ({
        width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height,
        name: button.getAttribute("aria-label")
      })));
      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) {
        expect(control.width).toBeGreaterThanOrEqual(44);
        expect(control.height).toBeGreaterThanOrEqual(44);
        expect(control.name).toBeTruthy();
      }
      const scene = await page.evaluate(() => {
        const ctx = window.Cortex.active;
        return { width: ctx.current.scene.width, height: ctx.current.scene.height, matrix: Boolean(ctx.current.scene.svg) };
      });
      if (id !== "matrix-reasoning") expect(scene.width).toBe(viewport.width === 320 ? id === "mental-rotation" ? 350 : 340 : 700);
      else expect(scene.matrix).toBe(true);
      await capture(page, testInfo, `${id}-${viewport.width}`);
      await page.evaluate(() => window.Cortex.active.invalidate("runner.refresh"));
      const warning = await page.evaluate(() => {
        const rect = document.getElementById("runner-message").getBoundingClientRect();
        const abort = document.getElementById("abort").getBoundingClientRect(), ctx = window.Cortex.active;
        return { bottom: rect.bottom, right: rect.right, abortLeft: abort.left, stimulusTop: Math.max(72, ctx.safeTop + 64) };
      });
      expect(warning.bottom).toBeLessThanOrEqual(warning.stimulusTop);
      expect(warning.right).toBeLessThanOrEqual(warning.abortLeft);
      await capture(page, testInfo, `${id}-${viewport.width}-timing-warning`);
      await page.locator("#abort").click({ force: true });
      await expect(page.locator(".completion-card")).toBeVisible();
    }
  }
});

test("phone and tablet layouts keep both settings dialogs within the viewport and restore focus", async ({ page }, testInfo) => {
  await open(page, "task/mental-rotation");
  for (const viewport of [{ width: 320, height: 568 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    const labels = await page.locator(".input-picker button").evaluateAll(buttons => buttons.map(button => {
      const range = document.createRange();
      range.selectNodeContents(button);
      return { textHeight: range.getBoundingClientRect().height, lineHeight: parseFloat(getComputedStyle(button).lineHeight) };
    }));
    for (const label of labels) expect(label.textHeight).toBeLessThanOrEqual(label.lineHeight + 1);
    for (const settings of [
      { opener: "#open-settings", dialog: "#preferences-dialog", close: "#close-preferences" },
      { opener: "#task-settings", dialog: "#settings-dialog", close: "#close-settings" }
    ]) {
      await page.locator(settings.opener).click();
      await expect(page.locator(settings.dialog)).toBeVisible();
      const bounds = await page.locator(settings.dialog).evaluate(dialog => {
        const rect = dialog.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(viewport.width);
      expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
      const targets = await page.locator(`${settings.dialog} :is(button, select, textarea, input:not([type="checkbox"]))`).evaluateAll(elements =>
        elements.map(element => element.getBoundingClientRect().height));
      for (const height of targets) expect(height).toBeGreaterThanOrEqual(44);
      await noOverflow(page);
      await capture(page, testInfo, `${settings.dialog.slice(1)}-${viewport.width}`);
      await page.locator(settings.close).click();
      await expect(page.locator(settings.opener)).toBeFocused();
    }
  }
});

test("familiar practice can skip its warm-up, but assessment always requires all eight presentations", async ({ page }) => {
  await enableClock(page);
  await page.evaluate(() => {
    const C = window.Cortex, task = C.Tasks.find(task => task.id === "number-series");
    C.Storage.setSettings({ practiceReady: { [C.Routine.practiceKey(task, task.params)]: C.iso() } });
  });
  await open(page, "task/number-series");
  await expect(page.locator("#start-round")).toBeVisible();
  await page.locator("#start-round").click();
  await page.waitForFunction(() => window.Cortex.active?.phase === "block" && !window.Cortex.starting);
  await page.clock.runFor(3500);
  expect(await page.evaluate(() => window.Cortex.active.phase)).toBe("block");
  expect(await page.evaluate(() => window.Cortex.active.practiceTrials.length)).toBe(0);
  await page.locator("#abort").click({ force: true });
  await expect(page.locator(".completion-card")).toBeVisible();
  await open(page, "task/number-series");
  await page.locator('[data-mode="assessment"]').click();
  await expect(page.locator("#start-round")).toHaveCount(0);
  await page.locator("#start-practice").click();
  await playPhase(page, "practice");
  expect(await page.evaluate(() => window.Cortex.practiceCount(window.Cortex.active.practiceTrials))).toBe(8);
  await page.locator("#review-instructions").click();
  await expect(page.locator("#start-practice")).toBeVisible();
  expect(await page.evaluate(() => window.Cortex.UI.cooldown("number-series"))).toBeNull();
});

test("unreadable originals and quota-limited pending work remain exportable with explicit notices", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("cortex.v1", "{broken"));
  await open(page, "data");
  await expect(page.locator('[data-notice="data.corrupt"]')).toBeVisible();
  const originalDownload = page.waitForEvent("download");
  await page.locator("#export-original").click();
  const original = await originalDownload;
  expect(await readFile(await original.path(), "utf8")).toBe("{broken");
  await page.evaluate(() => {
    window.Cortex.Storage.wipe("DELETE");
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "cortex.v1") throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await open(page, "task/forecasting");
  await page.locator('[name="claim"]').fill("Finish practice before breakfast.");
  await page.locator("#forecast-form button[type='submit']").click();
  await expect(page.locator('[data-notice="data.quota"]')).toBeVisible();
  expect(await page.evaluate(() => window.Cortex.Storage.pending)).toBe(true);
  const pendingDownload = page.waitForEvent("download");
  await page.locator("#forecast-json").click();
  const pending = await pendingDownload, backup = JSON.parse(await readFile(await pending.path(), "utf8"));
  expect(backup.forecasts).toHaveLength(1);
});
