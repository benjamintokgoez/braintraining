"use strict";

const { test, expect } = require("@playwright/test");
const { readFile } = require("node:fs/promises");
const { open, noOverflow, contrastFailures, seedSessions, capture, enableClock, playPhase } = require("./helpers.cjs");

test("rendered interface text meets contrast thresholds in every color and brightness theme, including charts and mobile tables", async ({ page }) => {
  test.setTimeout(120000);
  await open(page);
  await seedSessions(page, 2);
  await page.evaluate(() => {
    const C = window.Cortex;
    const entry = C.Storage.createForecast({ claim: "Finish practice before breakfast.", probability: .75, resolveBy: C.today(), language: "en" }).entry;
    C.Storage.resolveForecast(entry.id, 1);
  });
  for (const colorTheme of ["rose", "graphite", "amber"]) for (const theme of ["light", "dark"]) {
    const appearance = `${colorTheme} ${theme}`;
    await page.evaluate(value => {
      window.Cortex.Storage.setSettings(value); window.Cortex.UI.syncPreferences(); window.Cortex.UI.render();
    }, { theme, colorTheme });
    for (const route of ["home", "library", "results", "data", "about", "task/forecasting", "task/number-series"]) {
      await open(page, route);
      if (route === "results") await page.locator("#result-task").selectOption("flanker-squared");
      expect(await contrastFailures(page), `${appearance} ${route}`).toEqual([]);
      await noOverflow(page);
    }
    await page.locator("#open-settings").click();
    await page.locator("#practice-reminders summary").click();
    expect(await contrastFailures(page), `${appearance} practice settings`).toEqual([]);
    await page.locator("#close-preferences").click();
    await page.locator("#share-app").click();
    expect(await contrastFailures(page), `${appearance} sharing`).toEqual([]);
    await page.locator("#close-share").click();
  }
});

test("category colors, focus and exercise palettes remain accessible and consistent across appearances", async ({ page }) => {
  await open(page);
  let exercisePalette;
  for (const colorTheme of ["rose", "graphite", "amber"]) for (const theme of ["light", "dark"]) {
    const appearance = `${colorTheme} ${theme}`;
    await page.evaluate(value => {
      window.Cortex.Storage.setSettings(value); window.Cortex.UI.syncPreferences(); window.Cortex.UI.render();
    }, { theme, colorTheme });
    const palette = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const color = name => style.getPropertyValue(`--cp-${name}`).trim();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const rgba = value => {
        if (!CSS.supports("color", value)) throw new Error(`Invalid theme color: ${value}`);
        context.clearRect(0, 0, 1, 1); context.fillStyle = value; context.fillRect(0, 0, 1, 1);
        const channels = [...context.getImageData(0, 0, 1, 1).data];
        return [...channels.slice(0, 3), channels[3] / 255];
      };
      const composite = (foreground, background) => foreground.slice(0, 3)
        .map((channel, index) => channel * foreground[3] + background[index] * (1 - foreground[3]));
      const luminance = rgb => rgb.map(channel => channel / 255)
          .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
          .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      const ratio = (foreground, background) => {
        const base = composite(rgba(color(background)), rgba(color("bg")));
        const a = luminance(composite(rgba(color(foreground)), base)), b = luminance(base);
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      };
      const text = ["memory", "attention", "reasoning", "learning", "calibration"]
        .map(name => ({ name, ratio: ratio(name, `${name}-soft`) }));
      text.push({ name: "selected accent", ratio: ratio("accent", "selected-bg") });
      text.push({ name: "primary button", ratio: ratio("accent-fg", "accent") });
      for (const name of ["hero-text", "hero-muted", "hero-accent", "hero-memory", "hero-attention"]) {
        text.push({ name, ratio: ratio(name, "hero-bg") });
      }
      const nonText = ["bg", "surface", "bg-elevated", "surface-soft", "memory-soft", "reasoning-soft"]
        .flatMap(background => ["accent", "control-border"].map(foreground =>
          ({ name: `${foreground} on ${background}`, ratio: ratio(foreground, background) })));
      nonText.push({ name: "exercise focus", ratio: ratio("task-accent", "task-bg") });
      return {
        text, nonText,
        exercise: Object.fromEntries(["task-bg", "task-fg", "task-panel", "task-accent", "task-accent-fg",
          "stim-red", "stim-green", "stim-blue", "stim-yellow", "stim-gray"].map(name => [name, color(name)])),
        renderedAccent: window.Cortex.Draw.palette.accent,
        background: color("bg"),
        themeColor: document.querySelector('meta[name="theme-color"]').content
      };
    });
    for (const color of palette.text) expect(color.ratio, `${appearance}: ${color.name}`).toBeGreaterThanOrEqual(4.5);
    for (const color of palette.nonText) expect(color.ratio, `${appearance}: ${color.name}`).toBeGreaterThanOrEqual(3);
    expect(palette.themeColor).toBe(palette.background);
    expect(palette.renderedAccent).toBe(palette.exercise["task-accent"]);
    if (exercisePalette) expect(palette.exercise).toEqual(exercisePalette);
    else exercisePalette = palette.exercise;
    await open(page, "library");
    const categories = await page.locator(".task-card").evaluateAll(cards => cards.map(card => ({
      domain: card.dataset.domain,
      label: card.querySelector(".task-domain").textContent.trim(),
      icons: card.querySelectorAll(".task-domain svg[aria-hidden='true']").length
    })));
    expect(new Set(categories.map(card => card.domain))).toEqual(new Set(["working-memory", "attention", "reasoning", "learning", "calibration"]));
    for (const card of categories) {
      expect(card.label).toBeTruthy();
      expect(card.icons).toBe(1);
    }
    await page.locator(".task-card .button").first().focus();
    const focus = await page.locator(".task-card .button").first().evaluate(button => {
      const style = getComputedStyle(button);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(focus).toEqual({ width: "3px", style: "solid" });
    await page.locator(".task-card").first().hover();
    expect(await contrastFailures(page), `${appearance}: hovered library`).toEqual([]);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  expect(await page.locator(".orbit-art").getAttribute("aria-hidden")).toBe("true");
  expect(await page.locator("#start-routine").evaluate(button => getComputedStyle(button).transitionDuration)).toBe("0s");
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
      if (settings.dialog === "#preferences-dialog") await page.locator("#practice-reminders summary").click();
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
  expect(original.suggestedFilename()).toMatch(/^bbg-recovery-\d{4}-\d{2}-\d{2}\.json$/);
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
