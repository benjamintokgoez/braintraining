"use strict";

const { expect } = require("@playwright/test");

async function open(page, hash = "home", origin = "", { mockReading = true } = {}) {
  if (mockReading && !page.readingMockInstalled) {
    page.readingMockInstalled = true;
    await page.addInitScript(() => {
      const original = window.fetch.bind(window);
      window.fetch = (resource, options) => {
        const url = new URL(resource instanceof Request ? resource.url : resource, location.href);
        if (["en.wikipedia.org", "de.wikipedia.org"].includes(url.hostname) && url.pathname === "/w/api.php") {
          const extract = "This deterministic encyclopedia excerpt is used only in browser tests. " +
            "It lets the homepage display the enabled daily reading feature without relying on a public service. " +
            "Separate reading tests exercise anonymous API requests, source attribution, illustrations, errors and the offline cache.";
          return Promise.resolve(new Response(JSON.stringify({ query: { pages: Array.from({ length: 8 }, (_, index) => ({
            pageid: 12345 + index, lastrevid: 98765, ns: 0, title: "A daily discovery", extract
          })) } }), { headers: { "Content-Type": "application/json" } }));
        }
        return original(resource, options);
      };
    });
  }
  await page.goto(`${origin}/#${hash}`);
  await expect(page.locator("#app h1")).toBeVisible();
}

async function noOverflow(page) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  expect(sizes.content, "The page must fit its viewport").toBeLessThanOrEqual(sizes.width + 1);
}

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

async function enableClock(page, options = {}) {
  await page.addInitScript(() => {
    Object.defineProperty(performance, "timeOrigin", { value: Date.UTC(2026, 0, 9, 8) });
  });
  await page.clock.install();
  await open(page, "home", "", options);
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
      if (current.deadline !== null && elapsed >= current.deadline - 16) return { wait: 32 };
      let values;
      if (current.trial.stage === "loci-study") {
        if (!current.trial.selfPaced) return { wait: current.deadline - elapsed + 32 };
        values = [current.trial.studyIndex + 1 < current.trial.studyLength ? "next" : "ready"];
      } else if (current.trial.stage === "loci-recall") {
        const expected = current.trial.expected;
        let value = current.responses.length < expected.length ? expected[current.responses.length] : "done";
        if (typeof value === "number" && !current.options.some(option => option.value === value)) {
          value = value < current.options[0].value ? "prev" : "next";
        }
        values = [value];
      } else if (current.multi) {
        values = [current.trial.usePosition && current.trial.positionTarget ? 0 : null,
          current.trial.useAudio && current.trial.audioTarget ? 1 : null]
          .filter(value => value !== null && !current.responses.some(response => response.value === value));
        if (!values.length) return { wait: current.deadline - elapsed + 32 };
      } else if (current.interact) {
        if (ctx.browserTower !== current) { ctx.browserTower = current; ctx.browserSource = true; }
        const move = current.trial.optimalPath[current.responses.length];
        if (!move && current.trial.planningMode === "mental") values = ["done"];
        else {
          if (!move) throw new Error("Missing optimal move");
          values = [(ctx.browserSource ? move.from : move.to) - 1];
          ctx.browserSource = !ctx.browserSource;
        }
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
        const key = current.options[index]?.key || "Space";
        return { index: current.anywhere && !current.zones.length ? -1 : index, key: key === "space" ? "Space" : key };
      }) };
    }, phase);
    if (action.finished) return;
    if (action.wait) await page.clock.runFor(Math.ceil(action.wait));
    else {
      for (const control of action.controls) {
        if (action.input === "keyboard") await page.keyboard.press(control.key);
        else {
          const target = control.index < 0 ? page.locator("#stage") : page.locator("#response-controls button").nth(control.index);
          if (action.input === "mouse") await target.click({ force: true });
          else await target.tap({ force: true });
        }
      }
      await page.clock.runFor(32);
    }
  }
  throw new Error(`Browser response budget exceeded in ${phase}`);
}

module.exports = { open, noOverflow, contrastFailures, seedSessions, capture, enableClock, playPhase };
