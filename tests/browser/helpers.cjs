"use strict";

const { expect } = require("@playwright/test");

async function open(page, hash = "home", origin = "") {
  await page.goto(`${origin}/#${hash}`);
  await expect(page.locator("#app h1")).toBeVisible();
}

async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(sizes.content, "The page must fit its viewport").toBeLessThanOrEqual(sizes.width + 1);
}

async function seedSessions(page, count = 45) {
  await page.evaluate(async count => {
    const C = window.Cortex, task = C.Tasks.find(task => task.id === "flanker-squared");
    const root = C.Storage.snapshot();
    root.sessions = Array.from({ length: count * 2 }, (_, index) => ({
      id: index === 0 ? "saved / round?" : `round-${index}`, taskId: task.id,
      mode: index < count ? "training" : "assessment",
      startedAt: new Date(performance.timeOrigin + C.now() - index * 60000).toISOString(),
      durationMs: 90000, params: { ...task.params }, language: C.language,
      deviceClass: C.device(), inputMethod: C.input, refreshHz: 60,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      invalid: false, invalidReasons: [], completedMain: true, practiceOnly: false, practiceCount: 8,
      protocolVersion: 2, stimulusSet: "visual", splitHalf: null,
      score: { correctPer90: 60 + index % 12, accuracy: .9, correct: 60 }
    }));
    root.trials = { "saved / round?": [{ stimulusOnset: 100, rtMs: 300, correct: true, phase: "main" }] };
    await C.Storage.importAll({ text: async () => JSON.stringify(root) });
    C.UI.render();
  }, count);
}

async function capture(page, testInfo, name) {
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true, animations: "disabled" });
}

async function enableClock(page) {
  await page.addInitScript(() => {
    Object.defineProperty(performance, "timeOrigin", { value: Date.UTC(2026, 0, 9, 8) });
  });
  await page.clock.install();
  await open(page);
  await page.clock.runFor(600);
  await page.waitForFunction(() => window.Cortex.Timing.refreshHz > 0);
  await page.evaluate(() => {
    const original = window.Cortex.Runner.prototype.trial;
    window.Cortex.Runner.prototype.trial = function (spec) {
      this.browserSpec = spec;
      return original.call(this, spec);
    };
  });
}

// Browser clocks shorten fixed-duration rounds, not the production protocols.
// All responses still go through native keyboard/touch event handlers.
async function playPhase(page, phase) {
  for (let turn = 0; turn < 2200; turn++) {
    const action = await page.evaluate(phase => {
      const C = window.Cortex, ctx = C.active, current = ctx?.current;
      if (C.starting) return { wait: 16 };
      if (!ctx || ctx.phase !== phase) return { finished: true };
      if (!current || current.done || current.falseStartPhase || current.responseEnabled === false) return { wait: 250 };
      const elapsed = C.now() - current.startedAt;
      if (elapsed < 208) return { wait: 208 - elapsed };
      if (elapsed >= current.deadline - 16) return { wait: 32 };
      let values;
      if (current.multi) {
        values = [current.trial.usePosition && current.trial.positionTarget ? 0 : null,
          current.trial.useAudio && current.trial.audioTarget ? 1 : null]
          .filter(value => value !== null && !current.responses.some(response => response.value === value));
        if (!values.length) return { wait: current.deadline - elapsed + 32 };
      } else if (current.interact) {
        if (ctx.browserTower !== current) { ctx.browserTower = current; ctx.browserSource = true; }
        const move = current.trial.optimalPath[current.responses.length];
        if (!move) throw new Error("Missing optimal move");
        values = [(ctx.browserSource ? move.from : move.to) - 1];
        ctx.browserSource = !ctx.browserSource;
      } else if (current.sequence) {
        const expected = current.trial.expected || current.trial.sequence ||
          String(current.trial.answer).split("").map(value => /^\d$/.test(value) ? Number(value) : value);
        values = [current.responses.length < expected.length ? expected[current.responses.length] : "done"];
      } else {
        if (current.trial.stopTrial) return { wait: current.deadline - elapsed + 32 };
        if (ctx.browserSpec.answer === undefined && !current.anywhere) throw new Error(`Missing answer for ${ctx.task.id}`);
        values = [ctx.browserSpec.answer ?? 0];
      }
      return { input: ctx.input, controls: values.map(value => {
        const index = current.options.findIndex(option => option.value === value);
        if (index < 0 && !current.anywhere) throw new Error(`Missing control for ${String(value)}`);
        return { index, key: current.options[index]?.key || "Space" };
      }) };
    }, phase);
    if (action.finished) return;
    if (action.wait) await page.clock.runFor(Math.ceil(action.wait));
    else {
      for (const control of action.controls) {
        if (action.input === "keyboard") await page.keyboard.press(control.key);
        else if (control.index < 0) await page.locator("#stage").tap({ force: true });
        else await page.locator("#response-controls button").nth(control.index).tap({ force: true });
      }
      await page.clock.runFor(32);
    }
  }
  throw new Error(`Browser response budget exceeded in ${phase}`);
}

module.exports = { open, noOverflow, seedSessions, capture, enableClock, playPhase };
