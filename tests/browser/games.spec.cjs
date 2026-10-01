"use strict";

const { test, expect } = require("@playwright/test");
const { fixture } = require("../helpers/fixture.cjs");
const { open, enableClock, playPhase, capture } = require("./helpers.cjs");

const timedIds = fixture().C.Tasks.filter(task => task.kind !== "journal").map(task => task.id);

async function localSpeech(page, available = true) {
  await page.addInitScript(available => {
    window.browserSpeechCalls = 0;
    window.browserSpeechTexts = [];
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class {
      constructor(text) { this.text = text; }
    } });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: new class extends EventTarget {
      getVoices() {
        return ["en-US", "de-DE"].map(lang => ({ lang, localService: available }));
      }
      speak(utterance) {
        if (!available) throw new Error("Remote speech must never be used");
        window.browserSpeechCalls++;
        window.browserSpeechTexts.push(utterance.text);
        queueMicrotask(() => { utterance.onstart?.(); utterance.onend?.(); });
      }
      cancel() {}
    } });
  }, available);
}

async function configure(page, id, { mode = "training", input, language = "en", minimum = false } = {}) {
  await page.evaluate(({ id, mode, input, language, minimum }) => {
    const C = window.Cortex, task = C.Tasks.find(task => task.id === id), params = { ...task.params };
    if (minimum) {
      for (const key of ["trials", "trialsPerSubtest", "trialsPerBlock", "repetitions", "durationSeconds"]) {
        if (task.paramSchema[key]) params[key] = task.paramSchema[key].min;
      }
      if (["corsi", "digit-span"].includes(id)) params.maxLength = 5;
      if (id === "dual-nback") params.blocks = 1;
    }
    const settings = C.Storage.getSettings();
    settings.taskParams[id] = params;
    C.Storage.setSettings({ ...settings, mode, inputMethod: input, language, warmupPolicy: "always" });
    C.UI.syncPreferences();
    C.UI.render();
  }, { id, mode, input, language, minimum });
  await open(page, `task/${id}`);
}

async function firstResponse(page) {
  for (let step = 0; step < 200; step++) {
    const ready = await page.evaluate(() => Boolean(window.Cortex.active?.current));
    if (ready) return;
    await page.clock.runFor(250);
  }
  throw new Error("The warm-up never presented its first response phase");
}

test.beforeEach(async ({ page }) => {
  page.appErrors = [];
  page.on("pageerror", error => page.appErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") page.appErrors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(page.appErrors).toEqual([]); });

for (const [index, id] of timedIds.entries()) {
  test(`${id}: instructions, eight warm-ups, native responses, complete main round and persisted score`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await localSpeech(page);
    await enableClock(page);
    const mode = testInfo.project.name === "mobile-safari" ? "assessment" : "training";
    const input = testInfo.project.name === "desktop" ? "keyboard" : "touch";
    await configure(page, id, { mode, input, language: index % 2 ? "de" : "en", minimum: true });
    await expect(page.locator(".guide")).not.toBeEmpty();
    await page.locator("#start-practice").click();
    await firstResponse(page);
    await capture(page, testInfo, `${id}-warm-up`);
    await playPhase(page, "practice");
    await expect(page.locator("#start-main")).toBeVisible();
    const practice = await page.evaluate(() => {
      const C = window.Cortex, ctx = C.active;
      return { count: C.practiceCount(ctx.practiceTrials), correct: C.Stats.eligible(C.Stats.exclude(ctx.practiceTrials)).every(row => row.correct) };
    });
    expect(practice).toEqual({ count: 8, correct: true });
    await page.locator("#start-main").click();
    await playPhase(page, "block");
    await expect(page.locator(".completion-card")).toBeVisible();
    const result = await page.evaluate(() => {
      const C = window.Cortex, summary = C.Storage.getSessions()[0];
      const rows = C.Storage.getTrials(summary.id).filter(row => row.phase === "main");
      return {
        summary, rows: rows.length, eligible: C.Stats.eligible(rows).length,
        correct: C.Stats.eligible(rows).every(row => row.correct),
        persisted: JSON.parse(localStorage.getItem("cortex.v1")).sessions.some(row => row.id === summary.id),
        cooldown: C.UI.cooldown(summary.taskId), pending: C.Storage.pending, active: Boolean(C.active)
      };
    });
    expect(result.summary.taskId).toBe(id);
    expect(result.summary.mode).toBe(mode);
    expect(result.summary.inputMethod).toBe(input);
    expect(result.summary.completedMain).toBe(true);
    expect(result.summary.practiceCount).toBe(8);
    expect(result.summary.invalidReasons).toEqual([]);
    expect(result.summary.invalid).toBe(false);
    expect(result.rows).toBeGreaterThan(0);
    expect(result.eligible).toBeGreaterThan(0);
    expect(result.correct).toBe(true);
    expect(result.persisted).toBe(true);
    expect(result.pending).toBe(false);
    expect(result.active).toBe(false);
    expect(Boolean(result.cooldown)).toBe(mode === "assessment");
    if (id === "stroop-squared") {
      const rules = await page.evaluate(() => {
        const C = window.Cortex, rows = C.Storage.getTrials(C.Storage.getSessions()[0].id);
        return [...new Set(rows.filter(row => row.phase === "practice").map(row => row.rule))];
      });
      expect(rules).toEqual(["word", "ink"]);
    }
    await page.reload();
    await expect(page.locator(".completion-card")).toBeVisible();
    expect(await page.evaluate(() => window.Cortex.Storage.getSessions()[0].completedMain)).toBe(true);
  });
}

test("mouse input completes numeric, spatial, dual-stream, planning and vigilance warm-ups", async ({ page }) => {
  test.setTimeout(120000);
  await localSpeech(page);
  await enableClock(page);
  for (const id of ["mental-arithmetic", "corsi", "dual-nback", "tower-london", "pvt-b"]) {
    await configure(page, id, { input: "mouse" });
    await page.locator("#start-practice").click();
    await playPhase(page, "practice");
    const result = await page.evaluate(() => {
      const C = window.Cortex, ctx = C.active;
      return { count: C.practiceCount(ctx.practiceTrials), invalid: ctx.invalid,
        correct: C.Stats.eligible(C.Stats.exclude(ctx.practiceTrials)).every(row => row.correct) };
    });
    expect(result).toEqual({ count: 8, invalid: false, correct: true });
    await page.locator("#review-instructions").click();
    await expect(page.locator("#start-practice")).toBeVisible();
  }
});

test("all n-back variants and speech sets accept their enabled native controls in both languages", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await localSpeech(page);
  await enableClock(page);
  const input = testInfo.project.name === "desktop" ? "keyboard" : "touch";
  for (const language of ["en", "de"]) for (const variant of ["dual", "position", "audio", "arithmetic"]) {
    await configure(page, "dual-nback", { input, language });
    const audioStimuli = language === "de" ? "words" : "letters";
    await page.locator("#task-settings").click();
    await page.locator('[name="variant"]').selectOption(variant);
    await page.locator('[name="audioStimuli"]').selectOption(audioStimuli);
    await page.locator("#settings-form button[type='submit']").click();
    await expect(page.locator("#task-settings")).toBeFocused();
    const previousSpeech = await page.evaluate(() => window.browserSpeechTexts.length);
    await page.locator("#start-practice").click();
    await playPhase(page, "practice");
    const result = await page.evaluate(previousSpeech => {
      const C = window.Cortex, ctx = C.active, rows = C.Stats.eligible(C.Stats.exclude(ctx.practiceTrials));
      const audible = ["dual", "audio"].includes(ctx.params.variant);
      return {
        count: C.practiceCount(ctx.practiceTrials), correct: rows.every(row => row.correct), invalid: ctx.invalid,
        variant: ctx.params.variant, language: ctx.language, audioStimuli: ctx.params.audioStimuli,
        streams: ctx.practiceTrials.map(row => [row.usePosition, row.useAudio]),
        speech: window.browserSpeechTexts.slice(previousSpeech).filter(text => text.trim()),
        expectedSpeech: audible ? ctx.practiceTrials.map(row => C.Audio.stimuli[ctx.language][ctx.params.audioStimuli][row.audio]) : []
      };
    }, previousSpeech);
    expect(result.count).toBe(8);
    expect(result.correct).toBe(true);
    expect(result.invalid).toBe(false);
    expect(result.variant).toBe(variant);
    expect(result.language).toBe(language);
    expect(result.audioStimuli).toBe(audioStimuli);
    const audible = ["dual", "audio"].includes(variant);
    expect(result.streams).toEqual(Array.from({ length: 8 }, () => [variant !== "audio", audible]));
    expect(result.speech).toEqual(result.expectedSpeech);
    expect(result.speech).toHaveLength(audible ? 8 : 0);
    await page.locator("#review-instructions").click();
    await expect(page.locator("#start-practice")).toBeVisible();
  }
});

test("arithmetic training ceiling validates, persists and resets through native settings controls", async ({ page }) => {
  await open(page, "task/mental-arithmetic");
  await page.locator("#task-settings").click();
  await page.locator('[name="minOperand"]').fill("5");
  await page.locator('[name="maxOperand"]').fill("20");
  await page.locator('[name="operandCeiling"]').fill("10");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#settings-error")).toHaveText(await page.evaluate(() => window.Cortex.t("settings.rangeError")));
  await expect(page.locator("#settings-error")).toBeFocused();
  expect(await page.evaluate(() => {
    const C = window.Cortex;
    return C.taskParams(C.Tasks.find(task => task.id === "mental-arithmetic")).operandCeiling;
  })).toBe(1000);
  await page.locator('[name="maxOperand"]').fill("10");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#task-settings")).toBeFocused();
  await page.reload();
  const saved = await page.evaluate(() => window.Cortex.Storage.getSettings().taskParams["mental-arithmetic"]);
  expect([saved.minOperand, saved.maxOperand, saved.operandCeiling]).toEqual([5, 10, 10]);
  await page.locator("#task-settings").click();
  await expect(page.locator('[name="operandCeiling"]')).toHaveValue("10");
  await page.locator("#reset-params").click();
  await expect(page.locator('[name="operandCeiling"]')).toHaveValue("1000");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#task-settings")).toBeFocused();
  await page.reload();
  expect(await page.evaluate(() => window.Cortex.Storage.getSettings().taskParams["mental-arithmetic"].operandCeiling)).toBe(1000);
});

test("audio preview and practice are explicitly blocked when only remote voices exist", async ({ page }) => {
  await localSpeech(page, false);
  await enableClock(page);
  await configure(page, "dual-nback", { input: "keyboard" });
  await page.locator("#preview-audio").click();
  await page.clock.runFor(2000);
  const message = await page.evaluate(() => window.Cortex.t("runner.unsupportedAudio"));
  await expect(page.locator("#audio-preview-status")).toHaveText(message);
  await page.locator("#start-practice").click();
  await page.clock.runFor(2000);
  await expect(page.locator('[data-notice="runner.unsupportedAudio"]')).toBeVisible();
  expect(await page.evaluate(() => Boolean(window.Cortex.active) || Boolean(window.Cortex.starting))).toBe(false);
  expect(await page.evaluate(() => window.browserSpeechCalls)).toBe(0);
});
