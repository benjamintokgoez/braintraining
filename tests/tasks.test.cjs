"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { playTask } = require("./helpers/play-task.cjs");

const taskIds = fixture().C.Tasks.filter(task => task.kind !== "journal").map(task => task.id);

for (const id of taskIds) {
  test(`${id}: all eight warm-up trials and complete training/assessment blocks`, async () => {
    for (const mode of ["training", "assessment"]) {
      const f = fixture({ autoSpeech: true, seed: 21, width: 390, height: 844, touch: true });
      const task = f.C.Tasks.find(entry => entry.id === id);
      if (id === "dual-nback") assert.equal(await f.C.Audio.unlock("en", "letters"), true);
      const ctx = f.runner(mode, "touch", task);
      await playTask(f, ctx, { practice: true });
      assert.equal(f.C.practiceCount(ctx.practiceTrials), 8, `${mode}: eight stimulus presentations`);
      assert.equal(ctx.trials.length, 0, "Warm-up must never enter main rows");
      assert.ok(ctx.practiceTrials.every(row => row.correct), "Correct scripted answers must score correctly");
      ctx.states.clear();
      const extra = await playTask(f, ctx);
      const rows = f.C.Stats.exclude(ctx.trials);
      const score = { ...task.score(rows, ctx.params), ...extra?.score };
      assert.ok(rows.length > 0, `${mode}: main block is nonempty`);
      assert.ok(f.C.Stats.eligible(rows).every(row => row.correct), `${mode}: scoring and interaction agree`);
      assert.ok(rows.filter(row => !row.correct).every(row => row.unscored && row.truncated),
        "A block-ending incomplete window is not an ordinary incorrect answer");
      assert.equal(ctx.invalid, false, `${mode}: steady virtual frames and consistent touch input`);
      for (const [key, value] of Object.entries(score)) {
        assert.ok(value === null || typeof value === "string" || Number.isFinite(value), `${id}: ${key} must not be NaN/Infinity`);
        const translationKey = key === "ssrtReasonKey" ? value : `score.${key}`;
        if (translationKey) assert.notEqual(f.C.t(translationKey), translationKey, `${id}: localized metric ${key}`);
      }
      if (mode === "assessment") for (const entry of ctx.states.values()) assert.equal(entry.state.updates, 0, "Assessments never adapt");
      for (const row of [...ctx.practiceTrials, ...rows]) {
        assert.ok(Number.isFinite(row.stimulusOnset));
        assert.ok(Number.isFinite(row.responseWindowOnset));
      }
      assert.deepEqual(f.errors, []);
      assert.deepEqual(f.warnings, []);
      await ctx.close();
    }
  });
}

test("PVT records waiting-period false starts without reducing the eight actual warm-ups", async () => {
  const f = fixture();
  const task = f.C.Tasks.find(entry => entry.id === "pvt-b"), ctx = f.runner("assessment", "keyboard", task);
  await playTask(f, ctx, { practice: true, falseStarts: true });
  assert.equal(f.C.practiceCount(ctx.practiceTrials), 8);
  assert.equal(ctx.practiceTrials.filter(row => row.falseStart).length, 8);
  assert.equal(task.score(f.C.Stats.exclude(ctx.practiceTrials)).falseStarts, 8);
  assert.equal(f.C.Stats.accuracy(f.C.Stats.exclude(ctx.practiceTrials)), 1);
  await ctx.close();
});

test("arithmetic generates only used items and adapts magnitude within its training ceiling", async () => {
  const f = fixture(), task = f.C.Tasks.find(entry => entry.id === "mental-arithmetic");
  const ctx = f.runner("training", "keyboard", task, { ...task.params, durationSeconds: 30 });
  let scenes = 0;
  const text = f.C.Draw.text.bind(f.C.Draw);
  f.C.Draw.text = (...args) => { scenes++; return text(...args); };
  await playTask(f, ctx);
  assert.ok(ctx.trials.length > 5);
  assert.equal(scenes, ctx.trials.length, "No hundreds-item raster bank");
  assert.ok(ctx.trials.at(-1).magnitude > ctx.trials[0].magnitude);
  assert.ok(ctx.trials.every(row => row.magnitude <= ctx.params.operandCeiling));
  await ctx.close();
});

test("matrix and series items are held until the completed attempt is saved", async () => {
  for (const id of ["matrix-reasoning", "number-series"]) {
    const f = fixture(), task = f.C.Tasks.find(entry => entry.id === id), ctx = f.runner("training", "keyboard", task);
    await playTask(f, ctx, { practice: true });
    assert.equal(f.C.Storage.getItemHashes(id).length, 0);
    assert.equal(ctx.itemHashes[id].length, 8);
    assert.equal(f.writes, 0);
    assert.ok(id !== "matrix-reasoning" || ctx.svgScenes.length === 1, "One shared matrix SVG");
    await ctx.close();
  }
});
