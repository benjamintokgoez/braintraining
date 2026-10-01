"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { session } = require("./helpers/session.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
function history(f, values, taskId = "flanker-squared") {
  const task = f.C.Tasks.find(task => task.id === taskId);
  return values.map((value, index) => session(f, {
    id: `round-${String(index).padStart(2, "0")}`, taskId,
    startedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    completedMain: true, score: { [task.primaryMetric]: value, accuracy: .9, meanRT: 300 }
  }));
}

test("journey states require three baseline scores and six nonoverlapping scores for recent change", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "flanker-squared");
  const all = history(f, [10, 14, 20, 18, 22, 24, 30]);
  for (let count = 0; count <= all.length; count++) {
    const rows = all.slice(0, count), summary = f.C.Progress.summarize(task, rows, rows.at(-1));
    assert.equal(summary.status, count < 3 ? "baseline" : count < 6 ? "established" : "review");
    assert.equal(summary.remaining, Math.max(0, (count < 3 ? 3 : 6) - count));
    assert.equal(summary.baseline, count >= 3 ? 14 : null);
    assert.equal(summary.recent, count >= 6 ? count === 6 ? 22 : 24 : null);
    assert.equal(summary.delta, count >= 6 ? count === 6 ? 8 : 10 : null);
    assert.equal(summary.baselineIds.some(id => summary.recentIds.includes(id)), false);
  }
});

test("windows follow chronological order, are stable for timestamp ties and stop at the selected round", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "flanker-squared");
  const rows = history(f, [10, 14, 20, 18, 22, 24, 999]);
  const original = JSON.stringify(rows);
  const summary = f.C.Progress.summarize(task, rows.slice().reverse(), rows[5]);
  assert.equal(summary.count, 6); assert.equal(summary.latest, 24); assert.equal(summary.recent, 22);
  assert.equal(JSON.stringify(rows), original);
  rows.forEach(row => { row.startedAt = rows[0].startedAt; });
  assert.deepEqual(plain(f.C.Progress.summarize(task, rows.slice().reverse(), rows[5]).recentIds),
    ["round-03", "round-04", "round-05"]);
});

test("direction, zero baselines, discrete ties and negative discrimination scores do not create relative gains or ranks", () => {
  const f = fixture();
  for (const [taskId, values, baseline, recent, movement, direction] of [
    ["flanker-squared", [0, 0, 0, 10, 20, 30], 0, 20, "higher", "higher"],
    ["stop-signal", [200, 220, 240, 150, 160, 170], 220, 160, "lower", "lower"],
    ["corsi", [5, 5, 5, 5, 5, 5], 5, 5, "unchanged", "higher"],
    ["paired-associates", [-2, -1, -.5, 0, .5, 1], -1, .5, "higher", "higher"]
  ]) {
    const task = f.C.Tasks.find(task => task.id === taskId), rows = history(f, values, taskId);
    const summary = f.C.Progress.summarize(task, rows, rows.at(-1));
    assert.equal(summary.baseline, baseline); assert.equal(summary.recent, recent);
    assert.equal(summary.direction, direction); assert.equal(summary.movement, movement);
    assert.equal("percentile" in summary, false); assert.equal("relativeGain" in summary, false);
  }
});

test("null, absent, nonfinite and guarded threshold estimates never become zero or fill a window", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "ufov");
  const rows = history(f, [null, undefined, NaN, Infinity, 0, 100, 200], task.id);
  const summary = f.C.Progress.summarize(task, rows, rows.at(-1));
  assert.equal(summary.total, 7); assert.equal(summary.count, 3); assert.equal(summary.baseline, 100);
  assert.equal(summary.recent, null); assert.equal(summary.status, "established");
  assert.throws(() => f.C.Progress.summarize(task, rows, rows.at(-1), "inventedScore"), /Unsupported progress metric/);
  assert.throws(() => f.C.Progress.summarize(task, rows, { ...rows.at(-1), startedAt: "invalid" }), /Invalid progress anchor date/);
});

test("journeys exclude invalid, warm-up, interrupted, malformed dates and ambiguous backup variants", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "flanker-squared");
  const rows = history(f, [10, 20, 30, 40, 50, 60]);
  const extras = [
    { id: "invalid", invalid: true }, { id: "warmup", practiceOnly: true },
    { id: "interrupted", completedMain: false }, { id: "bad-date", startedAt: "invalid" },
    { id: "practice-mode", mode: "practice" },
    { id: "variant", importSourceId: rows[1].id }
  ].map(overrides => ({ ...rows[5], ...overrides }));
  const summary = f.C.Progress.summarize(task, [...rows, ...extras], rows[5]);
  assert.equal(summary.count, 5); assert.equal(summary.total, 5);
  assert.equal(summary.status, "established");
  assert.ok(!summary.baselineIds.includes(rows[1].id));
});

test("every recorded comparison dimension remains separate, including mode and calibrated processing deadlines", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "dual-nback");
  const rows = history(f, [1, 1, 1, 2, 2, 2], task.id), anchor = rows.at(-1);
  const variations = [
    { taskId: "corsi" }, { mode: "assessment" }, { deviceClass: "phone" }, { inputMethod: "touch" },
    { language: "de" }, { stimulusSet: "speech-words-en" }, { protocolVersion: 1 },
    { viewport: { width: 390, height: 844 } }, { params: { ...task.params, n: 4 } },
    { processingDeadlineMs: 1000 }
  ].map((override, index) => ({ ...anchor, ...override, id: `other-${index}`, score: { nLevelMean: 99 } }));
  const summary = f.C.Progress.summarize(task, [...rows, ...variations], anchor);
  assert.equal(summary.count, 6); assert.equal(summary.baseline, 1); assert.equal(summary.recent, 2);
  for (const row of variations.slice(1)) assert.notEqual(f.C.Progress.key(task, row), f.C.Progress.key(task, anchor));
  const calibrated = f.C.Tasks.find(task => task.id === "operation-span");
  assert.notEqual(f.C.seriesKey(calibrated, { ...anchor, processingDeadlineMs: 1000 }),
    f.C.seriesKey(calibrated, { ...anchor, processingDeadlineMs: 1001 }));
});

test("neutral language, same orientation and legacy completion flags retain eligible historical behavior", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "corsi");
  const rows = history(f, [4, 4, 4, 5, 5, 5], task.id);
  rows.forEach((row, index) => {
    delete row.completedMain;
    delete row.protocolVersion;
    row.language = index % 2 ? "de" : "en";
    row.viewport = { width: index % 2 ? 1280 : 1024, height: 800 };
  });
  const summary = f.C.Progress.summarize(task, rows, rows.at(-1));
  assert.equal(summary.count, 6); assert.equal(summary.delta, 1);
  assert.equal(f.C.Progress.groups(task, rows, "training", "desktop", "keyboard").length, 1);
});

test("context medians require all three observations and recent spread is observed rather than inferred uncertainty", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "flanker-squared");
  const rows = history(f, [50, 60, 70, 80, 90, 100]);
  rows[0].score.meanRT = null;
  rows[3].score.accuracy = .6; rows[4].score.accuracy = .7; rows[5].score.accuracy = .8;
  const summary = f.C.Progress.summarize(task, rows, rows.at(-1));
  assert.deepEqual(plain(summary.range), [80, 100]);
  assert.equal(summary.context.find(row => row.metric === "meanRT").baseline, null);
  assert.equal(summary.context.find(row => row.metric === "meanRT").recent, 300);
  assert.equal(summary.context.find(row => row.metric === "accuracy").recent, .7);
});

test("all task families have research context and every selectable metric has an explicit direction", () => {
  const f = fixture();
  assert.equal(Object.keys(f.C.Evidence.families).length, 26);
  for (const task of f.C.Tasks) {
    const [family, sources] = f.C.Evidence.families[task.id];
    for (const language of ["en", "de"]) {
      assert.notEqual(f.env.CortexI18n.t(`evidence.${family}`, {}, language), `evidence.${family}`);
    }
    for (const source of sources) {
      assert.equal(f.C.Evidence.sources[source].length, 3);
      assert.match(f.C.Evidence.sources[source][2], /^10\.\d+\//);
    }
    assert.ok(f.C.Progress.directions[task.primaryMetric], task.primaryMetric);
    for (const metric of (task.metrics || [task.primaryMetric]).filter(metric => f.C.Progress.directions[metric])) {
      assert.match(f.C.Progress.directions[metric], /^(higher|lower)$/);
    }
    assert.match(f.C.UI.researchCard(task), /https:\/\/doi\.org\//);
  }
  assert.equal(f.writes, 0);
  assert.equal("age" in f.C.Storage.getSettings(), false);
  assert.equal(f.C.Progress.directions.stopResponseRate, undefined);
  assert.equal(f.C.Progress.directions.stopAccuracy, undefined);
  assert.equal(f.C.Progress.directions.meanSSD, undefined);
});
