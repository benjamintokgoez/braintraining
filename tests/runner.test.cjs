"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");

const warmup = () => Array.from({ length: 8 }, (_, index) => ({ stimulusOnset: index * 1000, correct: true, rtMs: 300 }));
const flanker = f => f.C.Tasks.find(task => task.id === "flanker-squared");

test("both decimal keys work in both languages, including corrections and explicit submission", async () => {
  for (const language of ["en", "de"]) for (const decimal of [".", ","]) {
    const f = fixture({ language }), task = f.C.Tasks.find(entry => entry.id === "mental-arithmetic");
    const ctx = f.runner("training", "keyboard", task), panel = f.C.keypad(ctx);
    f.env.onFrame = () => {
      if (!ctx.current || f.C.now() - ctx.current.startedAt < 208 || ctx.current.responses.length) return;
      for (const key of ["-", "2", decimal, "6", "Backspace", "5", "Enter"]) f.key(ctx, key);
    };
    const row = await ctx.trial({ panel, deadline: 1000, sequence: true, rtOnSubmit: true, noFeedback: true,
      evaluate: values => Number(values.join("")) === -2.5 });
    assert.equal(row.correct, true);
    assert.equal(row.rtMs, 208);
    await ctx.close();
  }
});

test("pointer input maps through the rendered canvas bounds instead of raw viewport coordinates", async () => {
  const f = fixture({ touch: true, width: 390, height: 844 }), ctx = f.runner("training", "touch", flanker(f));
  const panel = ctx.prepareOptions([{ value: 0, label: "Left", key: "a" }, { value: 1, label: "Right", key: "l" }]);
  ctx.canvas.getBoundingClientRect = () => ({ left: 20, top: 30, width: 195, height: 422 });
  f.env.onFrame = () => {
    if (!ctx.current || f.C.now() - ctx.current.startedAt < 208) return;
    const zone = panel.zones[1];
    ctx.pointerHandler({ preventDefault() {}, pointerId: 1, pointerType: "touch",
      clientX: 20 + (zone.x + zone.w / 2) / 2, clientY: 30 + (zone.y + zone.h / 2) / 2 });
  };
  const row = await ctx.trial({ panel, deadline: 1000, answer: 1, noFeedback: true });
  assert.equal(row.correct, true);
  assert.equal(ctx.invalid, false);
  await ctx.close();
});

test("response layouts fit small portrait and common landscape phones with usable targets", async () => {
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [568, 320]]) {
    const f = fixture({ touch: true, width, height }), ctx = f.runner("training", "touch", flanker(f));
    for (const [layout, count] of [["standard", 16], ["grid", 16], ["words", 16], ["pictures", 8], ["matches", 2], ["corsi", 9], ["radial", 8]]) {
      const panel = ctx.prepareOptions(Array.from({ length: count }, (_, index) => ({
        value: index, label: layout === "words" ? "Landmark" : String(index + 1), key: String(index + 1)
      })), layout);
      for (const zone of panel.zones) {
        assert.ok(zone.w >= 48 && zone.h >= 48, `${width}x${height} ${layout}: minimum target`);
        assert.ok(zone.x >= 0 && zone.y >= 64, `${width}x${height} ${layout}: HUD clearance`);
        assert.ok(zone.x + zone.w <= width + .01 && zone.y + zone.h <= height, `${layout}: in viewport`);
      }
      for (let left = 0; left < count; left++) for (let right = left + 1; right < count; right++) {
        const a = panel.zones[left], b = panel.zones[right];
        assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y,
          `${width}x${height} ${layout}: no overlapping hit regions`);
      }
      if (layout === "grid") {
        assert.equal(new Set(panel.zones.map(zone => zone.x)).size, 4);
        assert.equal(new Set(panel.zones.map(zone => zone.y)).size, 4);
      }
    }
    assert.equal(ctx.canvas.width, width, "Fixture uses DPR 1");
    await ctx.close();
  }
});

test("main canvas is high-DPI, bounded, and matrix SVG dimensions update between practice and main", async () => {
  const f = fixture({ width: 390, height: 844, dpr: 3 }), task = f.C.Tasks.find(entry => entry.id === "matrix-reasoning");
  const ctx = f.runner("training", "touch", task);
  assert.equal(ctx.canvas.width, 780);
  const options = () => ctx.prepareOptions(f.C.Draw.options(Array.from({ length: 8 }, (_, index) => String(index + 1))), "pictures");
  const item = f.C.Generators.matrix(1);
  const first = ctx.prepareMatrix(item, options());
  f.env.innerWidth = 844; f.env.innerHeight = 390; ctx.resize();
  const second = ctx.prepareMatrix(item, options());
  assert.equal(first.svg, second.svg);
  assert.equal(second.svg.getAttribute("viewBox"), "0 0 844 390");
  assert.equal(ctx.svgScenes.length, 1);
  await ctx.close();
});

test("native button activation is not consumed by arithmetic submit or PVT response shortcuts", async () => {
  const f = fixture(), task = flanker(f), ctx = f.runner("training", "keyboard", task);
  ctx.current = { options: [{ key: "Enter", value: "done" }], responses: [], anywhere: true };
  let prevented = false;
  const target = { closest: () => ({}) };
  ctx.keyHandler({ key: "Enter", code: "Enter", target, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.equal(ctx.current.responses.length, 0);
  await ctx.close();
});

test("timing warnings are announced once and actual errors take precedence without repeated alerts", async () => {
  const f = fixture(), ctx = f.runner(), message = f.nodes.get("runner-message");
  let value = "", changes = 0;
  Object.defineProperty(message, "textContent", { get: () => value, set(next) { value = next; changes++; } });
  ctx.invalidate("runner.refresh");
  ctx.invalidate("runner.refresh");
  assert.equal(changes, 1);
  assert.equal(value, f.C.t("runner.timingWarning"));
  ctx.invalidate("runner.inputChanged");
  ctx.invalidate("runner.refresh");
  ctx.invalidate("runner.failure");
  assert.equal(changes, 2);
  assert.equal(value, f.C.t("runner.inputChanged"));
  assert.equal(message.title, value);
  assert.deepEqual([...ctx.reasons], ["runner.refresh", "runner.inputChanged", "runner.failure"]);
  await ctx.close();
});

test("a low-refresh warning raised during setup remains visible throughout practice", async () => {
  const f = fixture(), task = flanker(f);
  f.C.Timing.refreshHz = 30;
  task.run = async ctx => {
    assert.equal(f.nodes.get("runner-message").textContent, f.C.t("runner.timingWarning"));
    ctx.practiceTrials.push(...warmup());
    return {};
  };
  await f.C.UI.startPractice(task);
  const ctx = f.C.active;
  assert.equal(ctx.phase, "between");
  assert.equal(f.nodes.get("runner-message").textContent, f.C.t("runner.timingWarning"));
  ctx.abort(); await ctx.finishPromise;
});

test("time-truncated omissions are unscored, ordinary timeouts are incorrect, and late input is never accepted", async () => {
  const f = fixture(), ctx = f.runner("assessment", "keyboard", flanker(f));
  const panel = ctx.prepareOptions([{ value: 0, label: "Yes", key: "a" }]);
  const incomplete = await ctx.trial({ panel, deadline: 32, fullDeadline: 1000, answer: 0 });
  assert.equal(incomplete.unscored, true);
  assert.equal(incomplete.truncated, true);
  assert.equal(f.C.Stats.accuracy([incomplete]), null);
  const timeout = await ctx.trial({ panel, deadline: 32, answer: 0 });
  assert.equal(timeout.correct, false);
  assert.equal(f.C.Stats.accuracy([timeout]), 0);
  await assert.rejects(ctx.trial({ deadline: 0 }), /deadline/);
  await assert.rejects(ctx.trial({ deadline: 100, fullDeadline: 50 }), /deadline/);
  await assert.rejects(ctx.trial({ deadline: 100, timeline: [{ atMs: 101 }] }), /timeline/);
  await ctx.close();
});

test("assessments always perform eight practice presentations even when skip is requested", async () => {
  const f = fixture(), task = flanker(f);
  task.run = async ctx => { ctx.practiceTrials.push(...warmup()); return {}; };
  await f.C.UI.startPractice(task, { mode: "assessment", skip: true });
  const ctx = f.C.active;
  assert.equal(ctx.phase, "between");
  assert.equal(ctx.practiceSkipped, false);
  assert.equal(f.C.practiceCount(ctx.practiceTrials), 8);
  ctx.abort(); await ctx.finishPromise;
});

test("an assessment cannot start with false-start rows or fewer than eight stimulus presentations", async () => {
  const f = fixture(), ctx = f.runner("assessment", "keyboard", flanker(f));
  ctx.phase = "between";
  ctx.practiceTrials = [...warmup().slice(0, 7), { falseStart: true, stimulusOnset: null }];
  await f.C.UI.runMain(ctx);
  assert.equal(ctx.phase, "between");
  assert.equal(ctx.mainStartTime, undefined);
  assert.equal(f.C.starting, undefined);
  await ctx.close();
});

test("familiar training skips directly to a scored round and does not manufacture practice data", async () => {
  const f = fixture(), task = flanker(f), phases = [];
  f.C.Storage.setSettings({ practiceReady: { [f.C.Routine.practiceKey(task, task.params)]: f.C.iso() } });
  task.run = async ctx => {
    phases.push(ctx.phase);
    ctx.trials.push({ stimulusOnset: 16, rtMs: 300, correct: true, response: [0] });
    return {};
  };
  await f.C.UI.startPractice(task, { skip: true });
  const saved = f.C.Storage.getSessions()[0];
  assert.deepEqual(phases, ["block"]);
  assert.equal(saved.practiceSkipped, true);
  assert.equal(saved.practiceCount, 0);
  assert.equal(saved.practiceOnly, false);
  assert.equal(saved.invalid, false);
  assert.equal(f.C.active, null);
});

test("interruption during wake-lock acquisition cannot restart a finished runner or leak the acquired lock", async () => {
  const f = fixture(), task = flanker(f), ctx = f.runner("training", "keyboard", task);
  let resolveLock, releases = 0, runs = 0;
  f.env.navigator.wakeLock = { request: () => new Promise(resolve => { resolveLock = resolve; }) };
  task.run = async () => { runs++; return {}; };
  ctx.phase = "between"; ctx.practiceTrials = warmup(); f.C.active = ctx;
  const starting = f.C.UI.runMain(ctx);
  assert.equal(typeof resolveLock, "function");
  ctx.abort("runner.focus"); await ctx.finishPromise;
  resolveLock({ released: false, async release() { releases++; } });
  await starting;
  assert.equal(ctx.phase, "finished");
  assert.equal(ctx.mainStartTime, undefined);
  assert.equal(runs, 0);
  assert.equal(releases, 1);
  assert.equal(ctx.wakeLock, null);
  assert.equal(f.C.Storage.getSessions().length, 1);
  assert.equal(f.C.starting, false);
});

test("finishing is idempotent, saves before asynchronous cleanup, and releases resources once", async () => {
  const f = fixture(), task = flanker(f), ctx = f.runner("training", "keyboard", task);
  ctx.mainStartTime = 0; ctx.mainStartedAt = f.C.iso(); ctx.completedMain = true; f.C.active = ctx;
  ctx.practiceTrials = warmup();
  ctx.trials.push({ stimulusOnset: 16, rtMs: 300, correct: true, response: [0] });
  let release, releases = 0;
  ctx.wakeLock = { released: false, release: () => { releases++; return new Promise(resolve => { release = resolve; }); } };
  const first = f.C.UI.finish(ctx), second = f.C.UI.finish(ctx);
  assert.equal(first, second);
  assert.equal(f.C.Storage.getSessions().length, 1);
  assert.equal(f.writes, 1, "Summary, rows and adaptive settings are one write");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(releases, 1);
  release(); await first;
  assert.equal(f.C.active, null);
  assert.equal(ctx.phase, "finished");
});

test("visibility and physical orientation interruptions are saved promptly; browser chrome resizing is not a rotation", async () => {
  for (const reason of ["runner.focus", "runner.rotation"]) {
    const f = fixture({ width: 390, height: 844, touch: true }), ctx = f.runner("training", "touch", flanker(f));
    ctx.mainStartTime = 0; ctx.mainStartedAt = f.C.iso(); f.C.active = ctx;
    f.env.innerHeight = 760; ctx.orientationHandler();
    assert.equal(ctx.signal.aborted, false);
    if (reason === "runner.focus") { f.document.hidden = true; ctx.visibilityHandler(); }
    else { f.env.screen.orientation.type = "landscape-primary"; f.env.innerWidth = 844; f.env.innerHeight = 390; ctx.orientationHandler(); }
    assert.equal(f.C.Storage.getSessions().length, 1, "No extra animation frame is needed to save cancellation");
    const summary = await ctx.finishPromise;
    assert.equal(summary.invalid, true);
    assert.ok(summary.invalidReasons.includes(reason));
    assert.equal(summary.practiceOnly, false);
  }
});
